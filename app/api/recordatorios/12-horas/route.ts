import { NextResponse } from "next/server";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "../../../lib/db";
import { enviarCorreo } from "../../../lib/email";

// ======================================================
// CONFIGURACIÓN
// ======================================================

export const runtime = "nodejs";
// Envío de hasta N correos por ejecución; el host
// debe respetar el límite (VPS con `next start`).
export const maxDuration = 300;

// ======================================================
// VALIDAR CLAVE DEL PROCESO AUTOMÁTICO
// ======================================================

function validarCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const autorizacion = request.headers.get("authorization");

  if (!autorizacion?.startsWith("Bearer ")) {
    return false;
  }

  const token = autorizacion.slice(7);

  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);

  if (tokenBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    tokenBuffer,
    secretBuffer
  );
}

// ======================================================
// FORMATEAR FECHA Y HORA EN ZONA HORARIA DE BOGOTÁ
// ======================================================

function obtenerFechaHoraBogota(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);

  const valores: Record<string, string> = {};

  for (const parte of partes) {
    if (parte.type !== "literal") {
      valores[parte.type] = parte.value;
    }
  }

  return (
    `${valores.year}-${valores.month}-${valores.day} ` +
    `${valores.hour}:${valores.minute}:${valores.second}`
  );
}

// ======================================================
// ESCAPAR TEXTO PARA EL HTML DEL CORREO
// ======================================================

function escaparHtml(valor: unknown): string {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caracter) => {
      const entidades: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entidades[caracter];
    }
  );
}

// ======================================================
// FORMATEAR FECHA DE LA CITA
// ======================================================

function formatearFecha(fecha: string | Date): string {
  const texto =
    fecha instanceof Date
      ? obtenerFechaHoraBogota(fecha).slice(0, 10)
      : String(fecha).slice(0, 10);

  const [anio, mes, dia] = texto.split("-");

  if (!anio || !mes || !dia) {
    return texto;
  }

  return `${dia}/${mes}/${anio}`;
}

// ======================================================
// FORMATEAR HORA DE LA CITA
// ======================================================

function formatearHora(hora: string | Date): string {
  if (hora instanceof Date) {
    return obtenerFechaHoraBogota(hora).slice(11, 16);
  }

  const texto = String(hora);

  // Formato HH:mm:ss o HH:mm
  const coincidencia = texto.match(/^(\d{2}):(\d{2})/);

  if (coincidencia) {
    return `${coincidencia[1]}:${coincidencia[2]}`;
  }

  return texto;
}

// ======================================================
// GET — PROCESAR RECORDATORIOS DE 12 HORAS
// ======================================================

export async function GET(request: Request) {
  // ----------------------------------------------------
  // AUTORIZACIÓN
  // ----------------------------------------------------

  if (!validarCronSecret(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }
  const dryRun =
  new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    // ----------------------------------------------------
    // VALIDAR URL BASE
    // ----------------------------------------------------

    const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

    if (!appUrl) {
      console.error("Falta configurar APP_URL.");

      return NextResponse.json(
        { error: "La URL de la aplicación no está configurada." },
        { status: 500 }
      );
    }

    // ----------------------------------------------------
    // CALCULAR INTERVALO DE 11 A 13 HORAS
    // EN LA ZONA HORARIA DE BOGOTÁ
    // ----------------------------------------------------

    const ahora = Date.now();

    const desde = obtenerFechaHoraBogota(
      new Date(ahora + 11 * 60 * 60 * 1000)
    );

    const hasta = obtenerFechaHoraBogota(
      new Date(ahora + 13 * 60 * 60 * 1000)
    );

    // ----------------------------------------------------
    // BUSCAR CITAS CONFIRMADAS
    // ----------------------------------------------------

    const [citas] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          c.id,
          c.fecha,
          c.hora,
          c.modalidad,
          c.meet_link,
          c.recordatorio_12h_enviado,

          COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS cliente_nombre,
          cl.email AS cliente_email,

          s.nombre AS servicio_nombre,
          s.duracion_minutos AS servicio_duracion,

          cg.direccion

        FROM citas c

        INNER JOIN clientes cl
          ON c.cliente_id = cl.id

        INNER JOIN servicios s
          ON c.servicio_id = s.id

        LEFT JOIN configuracion_general cg
          ON cg.id = 1

        WHERE c.estado = 'CONFIRMADA'
          AND c.recordatorio_12h_enviado = 0

          AND TIMESTAMP(c.fecha, c.hora)
              BETWEEN ? AND ?

        ORDER BY
          c.fecha ASC,
          c.hora ASC
      `,
      [desde, hasta]
    );
    // ----------------------------------------------------
// MODO DE PRUEBA: NO ENVÍA CORREOS NI MODIFICA DATOS
// ----------------------------------------------------

if (dryRun) {
  return NextResponse.json({
    modo: "prueba",
    mensaje: "Consulta de prueba completada. No se enviaron correos ni se modificó la base de datos.",
    encontradas: citas.length,
    correosEnviados: 0,
    registrosModificados: 0,
    citas: citas.map((cita: RowDataPacket) => ({
      id: cita.id,
      fecha: formatearFecha(cita.fecha),
      hora: formatearHora(cita.hora),
      modalidad: cita.modalidad,
      servicio: cita.servicio_nombre,
    })),
  });
}

    // ----------------------------------------------------
    // SI NO HAY CITAS
    // ----------------------------------------------------

    if (citas.length === 0) {
      return NextResponse.json({
        mensaje: "No hay recordatorios pendientes.",
        encontradas: 0,
        enviadas: 0,
        errores: 0,
      });
    }

    let enviadas = 0;
    let errores = 0;

    // ----------------------------------------------------
    // PROCESAR CITAS
    // ----------------------------------------------------

    for (const cita of citas) {
      try {
        if (!cita.cliente_email) {
          console.error(
            `La cita ${cita.id} no tiene correo del cliente.`
          );

          errores++;
          continue;
        }

        // --------------------------------------------------
        // DATOS DEL CLIENTE Y LA CITA
        // --------------------------------------------------

        const nombreCliente = escaparHtml(
          cita.cliente_nombre
        );

        const nombreServicio = escaparHtml(
          cita.servicio_nombre
        );

        const fechaFormateada = escaparHtml(
          formatearFecha(cita.fecha)
        );

        const horaFormateada = escaparHtml(
          formatearHora(cita.hora)
        );

        const modalidad = escaparHtml(
          cita.modalidad
        );

        const direccion = escaparHtml(
          cita.direccion
        );

        // --------------------------------------------------
        // CONTENIDO SEGÚN LA MODALIDAD
        // --------------------------------------------------

        let contenidoModalidad = "";

        if (cita.modalidad === "VIRTUAL") {
          const meetLink = cita.meet_link
            ? escaparHtml(cita.meet_link)
            : null;

          contenidoModalidad = `
            <div style="
              margin-top:20px;
              padding:20px;
              background:#F7F1E9;
              border-radius:12px;
            ">
              <p style="
                margin:0 0 10px;
                font-size:16px;
                font-weight:bold;
                color:#59614D;
              ">
                Tu sesión será por Google Meet
              </p>

              ${
                meetLink
                  ? `
                    <a
                      href="${meetLink}"
                      style="
                        display:inline-block;
                        margin-top:10px;
                        padding:12px 20px;
                        background:#59614D;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:8px;
                        font-weight:bold;
                      "
                    >
                      Unirse a Google Meet
                    </a>
                  `
                  : `
                    <p style="
                      margin:10px 0 0;
                      color:#555555;
                    ">
                      El enlace de Google Meet será enviado
                      cuando corresponda.
                    </p>
                  `
              }
            </div>
          `;
        } else {
          const urlMaps = cita.direccion
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                String(cita.direccion)
              )}`
            : null;

          contenidoModalidad = `
            <div style="
              margin-top:20px;
              padding:20px;
              background:#F7F1E9;
              border-radius:12px;
            ">
              <p style="
                margin:0 0 10px;
                font-size:16px;
                font-weight:bold;
                color:#59614D;
              ">
                Tu sesión será presencial
              </p>

              ${
                direccion
                  ? `
                    <p style="
                      margin:0;
                      color:#555555;
                    ">
                      ${direccion}
                    </p>

                    <p style="
                      margin:8px 0 0;
                      color:#555555;
                    ">
                      Segundo piso, frente a Unicentro Medellín.
                    </p>

                    <a
                      href="${urlMaps}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display:inline-block;
                        margin-top:12px;
                        padding:12px 20px;
                        background:#59614D;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:8px;
                        font-weight:bold;
                      "
                    >
                      Ver ubicación en Google Maps
                    </a>
                  `
                  : `
                    <p style="
                      margin:0;
                      color:#555555;
                    ">
                      La dirección será confirmada por la psicóloga.
                    </p>
                  `
              }
            </div>
          `;
        }

        // --------------------------------------------------
        // TOKEN SEGURO Y ENLACES DE ACCIÓN
        // --------------------------------------------------

        // Cada recordatorio utiliza un token aleatorio de 256 bits.
        // El token se guarda en la cita y se valida al recibir la acción.
        const tokenConfirmacion = crypto.randomBytes(32).toString("hex");

        await pool.query(
          `
            UPDATE citas
            SET token_confirmacion = ?
            WHERE id = ?
              AND estado = 'CONFIRMADA'
          `,
          [tokenConfirmacion, cita.id]
        );

        const tokenQuery = `token=${encodeURIComponent(tokenConfirmacion)}`;

        const urlConfirmar =
          `${appUrl}/recordatorio/${cita.id}/confirmar?${tokenQuery}`;

        const urlReprogramar =
          `${appUrl}/recordatorio/${cita.id}/reprogramar?${tokenQuery}`;

        const urlCancelar =
          `${appUrl}/recordatorio/${cita.id}/cancelar?${tokenQuery}`;

        // --------------------------------------------------
        // HTML DEL CORREO
        // --------------------------------------------------

        const html = `
          <div style="
            max-width:600px;
            margin:0 auto;
            font-family:Arial,Helvetica,sans-serif;
            color:#333333;
          ">

            <h2 style="
              color:#59614D;
              margin-bottom:20px;
            ">
              Tu cita es en 12 horas
            </h2>

            <p>
              Hola ${nombreCliente},
            </p>

            <p>
              Te recordamos que tu cita de
              <strong>${nombreServicio}</strong>
              está programada para dentro de aproximadamente
              <strong>12 horas</strong>.
            </p>

            <div style="
              margin:20px 0;
              padding:20px;
              background:#F7F1E9;
              border-radius:12px;
            ">
              <p style="margin:6px 0;">
                <strong>Fecha:</strong>
                ${fechaFormateada}
              </p>

              <p style="margin:6px 0;">
                <strong>Hora:</strong>
                ${horaFormateada}
              </p>

              <p style="margin:6px 0;">
                <strong>Modalidad:</strong>
                ${modalidad}
              </p>
            </div>

            ${contenidoModalidad}

            <p style="margin-top:25px;">
              Por favor, selecciona una de las siguientes opciones:
            </p>

            <div style="margin-top:20px;">

              <a
                href="${urlConfirmar}"
                style="
                  display:block;
                  margin-bottom:12px;
                  padding:14px 20px;
                  background:#59614D;
                  color:#ffffff;
                  text-align:center;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                Confirmar asistencia
              </a>

              <a
                href="${urlReprogramar}"
                style="
                  display:block;
                  margin-bottom:12px;
                  padding:14px 20px;
                  background:#C56835;
                  color:#ffffff;
                  text-align:center;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                Reprogramar cita
              </a>

              <a
                href="${urlCancelar}"
                style="
                  display:block;
                  padding:14px 20px;
                  background:#777777;
                  color:#ffffff;
                  text-align:center;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                Cancelar cita
              </a>

            </div>

            <p style="
              margin-top:30px;
              font-size:13px;
              color:#777777;
            ">
              Si ya confirmaste, reprogramaste o cancelaste tu cita,
              puedes ignorar este mensaje.
            </p>

          </div>
        `;

        // --------------------------------------------------
        // ENVIAR CORREO
        // --------------------------------------------------

        await enviarCorreo({
          para: cita.cliente_email,
          asunto: "Recordatorio: tu cita es en 12 horas",
          html,
        });

        // --------------------------------------------------
        // MARCAR COMO ENVIADO
        // SOLO DESPUÉS DEL ENVÍO EXITOSO
        // --------------------------------------------------

        await pool.query(
          `
            UPDATE citas
            SET recordatorio_12h_enviado = 1
            WHERE id = ?
              AND recordatorio_12h_enviado = 0
          `,
          [cita.id]
        );

        enviadas++;
      } catch (error) {
        console.error(
          `Error procesando el recordatorio de la cita ${cita.id}:`,
          error
        );

        errores++;
      }
    }

    // ----------------------------------------------------
    // RESPUESTA
    // ----------------------------------------------------

    return NextResponse.json({
      mensaje: "Proceso de recordatorios ejecutado.",
      encontradas: citas.length,
      enviadas,
      errores,
    });
  } catch (error) {
    console.error(
      "Error ejecutando recordatorios de 12 horas:",
      error
    );

    return NextResponse.json(
      {
        error: "No fue posible procesar los recordatorios.",
      },
      { status: 500 }
    );
  }
}