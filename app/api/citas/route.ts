import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "./../../lib/db";
import { verificarSesion } from "./../../lib/auth";
import { enviarCorreo } from "./../../lib/email";
import { actualizarEventoGoogleCalendar } from "./../../lib/google-calendar";
import { horariosSeCruzan } from "./../../lib/horarios";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

export async function POST(request: Request) {
  try {
    const datos = await request.json();

    const {
      nombre_completo,
      email,
      telefono,
      acepta_tratamiento_datos,
      servicio_id,
      fecha,
      hora,
      modalidad,
    } = datos;

    if (
      !nombre_completo ||
      !email ||
      !telefono ||
      !servicio_id ||
      !fecha ||
      !hora ||
      !modalidad ||
      !acepta_tratamiento_datos
    ) {
      return NextResponse.json(
        {
          error: "Todos los campos son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (!["PRESENCIAL", "VIRTUAL"].includes(modalidad)) {
      return NextResponse.json(
        {
          error: "Modalidad no válida.",
        },
        { status: 400 }
      );
    }

    const [servicios]: any = await pool.query(
      `
      SELECT
        id,
        modalidad,
        duracion_minutos
      FROM servicios
      WHERE id = ? AND activo = 1
      `,
      [servicio_id]
    );

    if (servicios.length === 0) {
      return NextResponse.json(
        {
          error: "El servicio seleccionado no existe o está inactivo.",
        },
        { status: 400 }
      );
    }

    const modalidadServicio = servicios[0].modalidad;

    const modalidadPermitida =
      modalidadServicio === "AMBAS" ||
      modalidadServicio === modalidad;

    if (!modalidadPermitida) {
      return NextResponse.json(
        {
          error:
            "La modalidad seleccionada no está disponible para este servicio.",
        },
        { status: 400 }
      );
    }

    const [citasExistentes]: any = await pool.query(
      `
      SELECT c.hora, s.duracion_minutos
      FROM citas c
      INNER JOIN servicios s ON c.servicio_id = s.id
      WHERE c.fecha = ?
        AND c.estado IN ('PENDIENTE', 'CONFIRMADA')
      `,
      [fecha]
    );

    const hayCruce = citasExistentes.some((cita: {
      hora: string;
      duracion_minutos: number;
    }) =>
      horariosSeCruzan(
        hora,
        Number(servicios[0].duracion_minutos),
        String(cita.hora),
        Number(cita.duracion_minutos)
      )
    );

    if (hayCruce) {
      return NextResponse.json(
        {
          error: "El horario seleccionado se cruza con otra cita.",
        },
        { status: 409 }
      );
    }

    const [bloqueos]: any = await pool.query(
      `
      SELECT id
      FROM bloqueos_agenda
      WHERE activo = 1
        AND inicio < DATE_ADD(CONCAT(?, ' ', ?, ':00'), INTERVAL ? MINUTE)
        AND fin > CONCAT(?, ' ', ?, ':00')
      LIMIT 1
      `,
      [
        fecha,
        hora,
        Number(servicios[0].duracion_minutos),
        fecha,
        hora,
      ]
    );

    if (bloqueos.length > 0) {
      return NextResponse.json(
        { error: "El horario seleccionado está dentro de un bloqueo de agenda." },
        { status: 409 }
      );
    }

    const [clientes]: any = await pool.query(
      `
      SELECT id
      FROM clientes
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    let clienteId: number;

    if (clientes.length > 0) {
      clienteId = clientes[0].id;

      await pool.query(
        `
        UPDATE clientes
        SET
          nombre_completo = ?,
          telefono = ?,
          acepta_tratamiento_datos = 1,
          fecha_aceptacion_datos = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [nombre_completo, telefono, clienteId]
      );
    } else {
      const [resultadoCliente]: any = await pool.query(
        `
        INSERT INTO clientes (
          nombre_completo,
          email,
          telefono,
          acepta_tratamiento_datos,
          fecha_aceptacion_datos
        )
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        `,
        [nombre_completo, email, telefono]
      );

      clienteId = resultadoCliente.insertId;
    }

    const [resultadoCita]: any = await pool.query(
      `
      INSERT INTO citas (
        cliente_id,
        servicio_id,
        fecha,
        hora,
        modalidad,
        estado,
        cliente_nombre_registro,
        cliente_telefono_registro
      )
      VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?, ?)
      `,
      [
        clienteId,
        servicio_id,
        fecha,
        hora,
        modalidad,
        nombre_completo,
        telefono,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Cita creada correctamente.",
        cita_id: resultadoCita.insertId,
        cliente_id: clienteId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando cita:", error);

    return NextResponse.json(
      {
        error: "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    // =====================================================
    // CONSULTA PÚBLICA DEL CALENDARIO
    // =====================================================

    if (fecha) {
      const [citas]: any = await pool.query(
        `
        SELECT c.id, c.hora, s.duracion_minutos
        FROM citas c
        INNER JOIN servicios s ON c.servicio_id = s.id
        WHERE c.fecha = ?
          AND c.estado IN ('PENDIENTE', 'CONFIRMADA')
        `,
        [fecha]
      );

      return NextResponse.json(citas);
    }

    // =====================================================
    // CONSULTA ADMINISTRATIVA
    // =====================================================

    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const [citas]: any = await pool.query(
      `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.modalidad,
        c.estado,
        c.origen_reserva,
        c.creado_en,
        COALESCE(
          NULLIF(TRIM(c.cliente_nombre_registro), ''),
          'Nombre por confirmar'
        ) AS nombre_completo,
        cl.email,
        COALESCE(c.cliente_telefono_registro, cl.telefono) AS telefono,
        s.nombre AS servicio_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN servicios s ON c.servicio_id = s.id
      ORDER BY c.creado_en DESC
      `
    );

    return NextResponse.json(citas);
  } catch (error) {
    console.error("Error consultando citas:", error);

    return NextResponse.json(
      {
        error: "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}
export async function PATCH(request: Request) {
  try {
    // =====================================================
    // PROTECCIÓN ADMINISTRATIVA
    // =====================================================

    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const datos = await request.json();
    const { id, estado, fecha, hora } = datos;

    if (!id || !estado) {
      return NextResponse.json(
        {
          error: "El ID y el estado son obligatorios.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // ESTADOS PERMITIDOS
    // =====================================================

    if (
      ![
        "CONFIRMADA",
        "CANCELADA",
        "REPROGRAMAR",
        "COMPLETADA",
      ].includes(estado)
    ) {
      return NextResponse.json(
        {
          error: "Estado no válido.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // OBTENER INFORMACIÓN DE LA CITA
    // =====================================================

    const [citas]: any = await pool.query(
      `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.modalidad,
        c.estado,
        COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS nombre_completo,
        cl.email,
        s.nombre AS servicio_nombre
      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN servicios s ON c.servicio_id = s.id
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (citas.length === 0) {
      return NextResponse.json(
        {
          error: "La cita no existe.",
        },
        { status: 404 }
      );
    }

    const cita = citas[0];

    // =====================================================
    // MARCAR CITA COMO COMPLETADA
    // =====================================================

    if (estado === "COMPLETADA") {
      // Solo se pueden completar citas confirmadas.
      if (cita.estado !== "CONFIRMADA") {
        return NextResponse.json(
          {
            error:
              "Solo se pueden completar citas confirmadas.",
          },
          { status: 409 }
        );
      }

      const [resultado]: any = await pool.query(
        `
        UPDATE citas
        SET
          estado = 'COMPLETADA',
          actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
          AND estado = 'CONFIRMADA'
        `,
        [id]
      );

      // Comprobar que MySQL realmente actualizó la cita.
      if (resultado.affectedRows !== 1) {
        return NextResponse.json(
          {
            error:
              "No se pudo completar la cita. Actualiza la página e inténtalo nuevamente.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        mensaje: "Cita marcada como completada correctamente.",
        cita: {
          id,
          estado: "COMPLETADA",
        },
      });
    }

    // =====================================================
    // REPROGRAMAR
    // =====================================================

    if (estado === "REPROGRAMAR") {
      if (!fecha || !hora) {
        return NextResponse.json(
          {
            error:
              "La nueva fecha y hora son obligatorias.",
          },
          { status: 400 }
        );
      }

      // Solo permitimos reprogramar citas confirmadas.
      if (cita.estado !== "CONFIRMADA") {
        return NextResponse.json(
          {
            error:
              "Solo se pueden reprogramar citas confirmadas.",
          },
          { status: 409 }
        );
      }

            // ===================================================
      // VERIFICAR DISPONIBILIDAD
      // ===================================================

      const [citasOcupadas]: any = await pool.query(
        `
        SELECT id
        FROM citas
        WHERE fecha = ?
          AND hora = ?
          AND estado IN ('PENDIENTE', 'CONFIRMADA')
          AND id <> ?
        LIMIT 1
        `,
        [fecha, hora, id]
      );

      if (citasOcupadas.length > 0) {
        return NextResponse.json(
          {
            error:
              "La nueva fecha y hora ya están ocupadas.",
          },
          { status: 409 }
        );
      }

      // ===================================================
      // GUARDAR NUEVA FECHA Y HORA
      // ===================================================

      await pool.query(
        `
        UPDATE citas
        SET
          fecha = ?,
          hora = ?,
          actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [fecha, hora, id]
      );

      // ===================================================
      // OBTENER LA CITA ACTUALIZADA
      // ===================================================

      const [citaActualizadaRows]: any =
        await pool.query(
          `
          SELECT
            c.id,
            DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
            TIME_FORMAT(c.hora, '%H:%i') AS hora,
            c.modalidad,
            c.google_event_id,
            c.meet_link,
            COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS nombre_completo,
            cl.email,
            s.nombre AS servicio_nombre,
            s.duracion_minutos AS servicio_duracion
          FROM citas c
          INNER JOIN clientes cl
            ON c.cliente_id = cl.id
          INNER JOIN servicios s
            ON c.servicio_id = s.id
          WHERE c.id = ?
          LIMIT 1
          `,
          [id]
        );

      const citaActualizada =
        citaActualizadaRows[0];

      // ===================================================
      // ACTUALIZAR EL EVENTO DE GOOGLE CALENDAR
      // (misma cita, mismo Meet, solo cambia fecha/hora)
      // ===================================================

      if (
        citaActualizada?.modalidad === "VIRTUAL" &&
        citaActualizada?.google_event_id
      ) {
        try {
          await actualizarEventoGoogleCalendar({
            eventId: citaActualizada.google_event_id,
            fecha: citaActualizada.fecha,
            hora: `${citaActualizada.hora}:00`,
            duracionMinutos:
              citaActualizada.servicio_duracion ?? 60,
          });
        } catch (errorCalendar) {
          console.error(
            "No fue posible actualizar el evento de Google Calendar al reprogramar desde el admin:",
            errorCalendar
          );
        }
      }

      // ===================================================
      // CORREO DE REPROGRAMACIÓN
      // ===================================================

      if (citaActualizada?.email) {
        try {
          const [año, mes, dia] = String(
            citaActualizada.fecha
          )
            .slice(0, 10)
            .split("-")
            .map(Number);

          const nuevaFechaFormateada =
            new Date(
              año,
              mes - 1,
              dia
            ).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

          const nuevaHoraFormateada =
            new Date(
              `1970-01-01T${citaActualizada.hora}`
            ).toLocaleTimeString("es-CO", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

          await enviarCorreo({
            para: citaActualizada.email,
            asunto: "Tu cita ha sido reprogramada",
            html: `
              <div style="margin:0;padding:40px 20px;background:#F7F1E9;font-family:Arial,sans-serif;color:#3F4635;">
                <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

                  <div style="text-align:center;margin-bottom:30px;">
                    <div style="font-size:14px;color:#C56835;margin-bottom:8px;">
                      Aura Elisa Sánchez
                    </div>

                    <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;margin:0;color:#3F4635;">
                      Cita reprogramada
                    </h1>
                  </div>

                  <p style="font-size:16px;line-height:1.7;">
                    Hola <strong>${citaActualizada.nombre_completo}</strong>,
                  </p>

                  <p style="font-size:16px;line-height:1.7;">
                    Te informamos que tu cita de
                    <strong>${citaActualizada.servicio_nombre}</strong>
                    ha sido reprogramada.
                  </p>

                  <div style="margin:30px 0;padding:22px;background:#F7F1E9;border-radius:16px;">

                    <p style="margin:0 0 10px;">
                      <strong>Nueva fecha:</strong>
                      ${nuevaFechaFormateada}
                    </p>

                    <p style="margin:0 0 10px;">
                      <strong>Nueva hora:</strong>
                      ${nuevaHoraFormateada}
                    </p>

                    <p style="margin:0;">
                      <strong>Modalidad:</strong>
                      ${
                        citaActualizada.modalidad === "VIRTUAL"
                          ? "Virtual"
                          : "Presencial"
                      }
                    </p>

                  </div>

                  ${
                    citaActualizada.modalidad === "VIRTUAL"
                      ? `
                        <div style="margin:0 0 30px;padding:18px;background:#59614D;border-radius:12px;color:#ffffff;">
                          <strong>Enlace de la sesión:</strong><br>
                          ${
                            citaActualizada.meet_link
                              ? `<a href="${citaActualizada.meet_link}" style="color:#ffffff;text-decoration:underline;">${citaActualizada.meet_link}</a>`
                              : "El enlace se confirmará posteriormente."
                          }
                        </div>
                      `
                      : ""
                  }

                  <p style="font-size:16px;line-height:1.7;">
                    Tu cita continúa confirmada y queda reservada para la nueva fecha y hora.
                  </p>

                  <p style="font-size:16px;line-height:1.7;">
                    Si tienes alguna inquietud o deseas comunicarte directamente con la psicóloga, puedes hacerlo al:
                  </p>

                  <p style="font-size:18px;line-height:1.7;font-weight:bold;color:#C56835;text-align:center;">
                    📞 333 705 4670
                  </p>

                  <p style="margin-top:35px;font-size:13px;line-height:1.6;color:#707469;text-align:center;">
                    Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.
                  </p>

                </div>
              </div>
            `,
          });

          console.log(
            `Correo de reprogramación enviado al paciente: ${citaActualizada.email}`
          );
        } catch (errorCorreo) {
          console.error(
            "No fue posible enviar el correo de reprogramación:",
            errorCorreo
          );
        }
      }

      return NextResponse.json({
        mensaje: "Cita reprogramada correctamente.",
        cita: {
          id,
          fecha,
          hora,
          estado: "CONFIRMADA",
        },
      });
    }
        // =====================================================
    // CONFIRMAR / CANCELAR
    // =====================================================

    if (cita.estado !== "PENDIENTE") {
      return NextResponse.json(
        {
          error:
            "Solo se pueden modificar citas pendientes.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // ACTUALIZAR ESTADO
    // =====================================================

    const [resultadoActualizacion]: any = await pool.query(
      `
      UPDATE citas
      SET
        estado = ?,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?
        AND estado = 'PENDIENTE'
      `,
      [estado, id]
    );

    if (resultadoActualizacion.affectedRows !== 1) {
      return NextResponse.json(
        {
          error:
            "No se pudo actualizar la cita. Actualiza la página e inténtalo nuevamente.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // CORREO DE CANCELACIÓN
    // =====================================================

    if (estado === "CANCELADA" && cita.email) {
      try {
        const fechaFormateada = new Date(
          `${cita.fecha}T00:00:00`
        ).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        const horaFormateada = new Date(
          `1970-01-01T${cita.hora}`
        ).toLocaleTimeString("es-CO", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        await enviarCorreo({
          para: cita.email,
          asunto: "Tu cita ha sido cancelada",
          html: `
            <div style="margin:0;padding:40px 20px;background:#F7F1E9;font-family:Arial,sans-serif;color:#3F4635;">
              <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

                <div style="text-align:center;margin-bottom:30px;">
                  <div style="font-size:14px;color:#C56835;margin-bottom:8px;">
                    Aura Elisa Sánchez
                  </div>

                  <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;margin:0;color:#3F4635;">
                    Cita cancelada
                  </h1>
                </div>

                <p style="font-size:16px;line-height:1.7;">
                  Hola <strong>${cita.nombre_completo}</strong>,
                </p>

                <p style="font-size:16px;line-height:1.7;">
                  Te informamos que tu cita de
                  <strong>${cita.servicio_nombre}</strong>
                  ha sido cancelada.
                </p>

                <div style="margin:30px 0;padding:22px;background:#F7F1E9;border-radius:16px;">

                  <p style="margin:0 0 10px;">
                    <strong>Fecha:</strong>
                    ${fechaFormateada}
                  </p>

                  <p style="margin:0 0 10px;">
                    <strong>Hora:</strong>
                    ${horaFormateada}
                  </p>

                  <p style="margin:0;">
                    <strong>Modalidad:</strong>
                    ${
                      cita.modalidad === "VIRTUAL"
                        ? "Virtual"
                        : "Presencial"
                    }
                  </p>

                </div>

                <p style="font-size:16px;line-height:1.7;">
                  Si deseas solicitar una nueva cita, puedes hacerlo nuevamente desde nuestro sitio web.
                </p>

                <div style="text-align:center;margin-top:30px;">
                  <a
                    href="${
                      process.env.APP_URL ||
                      "http://localhost:3000"
                    }/agendar"
                    style="display:inline-block;background:#C56835;color:white;text-decoration:none;padding:14px 26px;border-radius:30px;font-weight:bold;"
                  >
                    Agendar nueva cita
                  </a>
                </div>

                <p style="margin-top:35px;font-size:13px;line-height:1.6;color:#707469;text-align:center;">
                  Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.
                </p>

              </div>
            </div>
          `,
        });

        console.log(
          `Correo de cancelación enviado al paciente: ${cita.email}`
        );
      } catch (errorCorreo) {
        console.error(
          "No fue posible enviar el correo de cancelación:",
          errorCorreo
        );
      }
    }

    return NextResponse.json({
      mensaje:
        estado === "CONFIRMADA"
          ? "Cita confirmada correctamente."
          : "Cita cancelada correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando cita:", error);

    return NextResponse.json(
      {
        error: "No se pudo actualizar la cita.",
      },
      { status: 500 }
    );
  }
}