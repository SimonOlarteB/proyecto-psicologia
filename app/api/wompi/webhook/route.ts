import { NextResponse } from "next/server";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";

import pool from "../../../lib/db";
import { enviarCorreo } from "../../../lib/email";
import { crearEventoGoogleCalendar } from "../../../lib/google-calendar";

// El proceso es largo (Calendar + correos).
// En un VPS con `next start` este límite aplica
// por request; ajusta según el host.
export const runtime = "nodejs";
export const maxDuration = 60;

// ======================================================
// TIPOS WOMPI
// ======================================================

type WompiEvent = {
  event?: string;

  data?: {
    transaction?: {
      id?: string;
      reference?: string;
      status?: string;
      amount_in_cents?: number;
      currency?: string;
      payment_method_type?: string;
    };
  };

  environment?: string;

  signature?: {
    properties?: string[];
    checksum?: string;
  };

  timestamp?: number;
};

// ======================================================
// OBTENER VALOR POR RUTA
// ======================================================

function obtenerValorPorRuta(
  objeto: Record<string, unknown>,
  ruta: string
): unknown {
  const partes = ruta.split(".");

  let valor: unknown = objeto;

  for (const parte of partes) {
    if (valor === null || valor === undefined) {
      return undefined;
    }

    valor = (valor as Record<string, unknown>)[parte];
  }

  return valor;
}

// ======================================================
// COMPARAR FIRMAS
// ======================================================

function compararFirmas(
  firmaCalculada: string,
  firmaRecibida: string
): boolean {
  const calculada = Buffer.from(
    firmaCalculada.toLowerCase(),
    "utf8"
  );

  const recibida = Buffer.from(
    firmaRecibida.toLowerCase(),
    "utf8"
  );

  if (calculada.length !== recibida.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    calculada,
    recibida
  );
}

// ======================================================
// FORMATEAR FECHA
// ======================================================

function formatearFecha(fecha: string | Date): string {
  try {
    const fechaObjeto =
      fecha instanceof Date
        ? fecha
        : new Date(fecha);

    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "full",
      timeZone: "America/Bogota",
    }).format(fechaObjeto);
  } catch {
    return String(fecha);
  }
}

// ======================================================
// FORMATEAR HORA
// ======================================================

function formatearHora(hora: string): string {
  if (!hora) {
    return "";
  }

  const texto = String(hora).slice(0, 5);

  const [horas, minutos] =
    texto.split(":").map(Number);

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos)
  ) {
    return texto;
  }

  const periodo = horas >= 12 ? "PM" : "AM";

  const hora12 =
    horas % 12 === 0
      ? 12
      : horas % 12;

  return `${hora12}:${String(minutos).padStart(
    2,
    "0"
  )} ${periodo}`;
}

// ======================================================
// GENERAR ENLACE DE GOOGLE MAPS
// ======================================================

function generarEnlaceGoogleMaps(
  direccion: string | null
): string | null {
  if (!direccion) {
    return null;
  }

  const direccionLimpia =
    direccion.trim();

  if (!direccionLimpia) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(direccionLimpia)
  );
}

// ======================================================
// CORREO DE CONFIRMACIÓN
// ======================================================

async function enviarCorreosConfirmacion({
  nombreCliente,
  emailCliente,
  emailAdministradora,
  servicio,
  fecha,
  hora,
  modalidad,
  monto,
  referencia,
  meetLink,
  direccion,
}: {
  nombreCliente: string;
  emailCliente: string;
  emailAdministradora: string | null;
  servicio: string;
  fecha: string | Date;
  hora: string;
  modalidad: string;
  monto: number;
  referencia: string;
  meetLink: string | null;
  direccion: string | null;
}) {
  const fechaFormateada =
    formatearFecha(fecha);

  const horaFormateada =
    formatearHora(hora);

  const montoFormateado =
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(monto);

  const modalidadTexto =
    modalidad === "VIRTUAL"
      ? "Virtual"
      : "Presencial";

  const googleMapsLink =
    generarEnlaceGoogleMaps(
      direccion
    );

  // ====================================================
  // CORREO PARA EL PACIENTE
  // ====================================================

  const htmlPaciente = `
    <div style="
      margin:0;
      padding:40px 20px;
      background:#F7F1E9;
      font-family:Arial,sans-serif;
      color:#3F4635;
    ">
      <div style="
        max-width:600px;
        margin:0 auto;
        background:#ffffff;
        border-radius:20px;
        padding:40px;
        box-shadow:0 10px 30px rgba(0,0,0,0.08);
      ">

        <div style="
          text-align:center;
          margin-bottom:30px;
        ">
          <h1 style="
            margin:0;
            color:#59614D;
            font-size:28px;
          ">
            ¡Cita confirmada!
          </h1>
        </div>

        <p style="font-size:16px;">
          Hola <strong>${nombreCliente}</strong>,
        </p>

        <p style="
          font-size:16px;
          line-height:1.7;
        ">
          Tu pago fue aprobado correctamente y
          tu cita ha quedado confirmada.
        </p>

        <div style="
          margin:30px 0;
          padding:25px;
          background:#F7F1E9;
          border-radius:16px;
        ">

          <h2 style="
            margin-top:0;
            color:#59614D;
            font-size:20px;
          ">
            Detalles de tu cita
          </h2>

          <p>
            <strong>Servicio:</strong>
            ${servicio}
          </p>

          <p>
            <strong>Fecha:</strong>
            ${fechaFormateada}
          </p>

          <p>
            <strong>Hora:</strong>
            ${horaFormateada}
          </p>

          <p>
            <strong>Modalidad:</strong>
            ${modalidadTexto}
          </p>

          <p>
            <strong>Valor pagado:</strong>
            ${montoFormateado}
          </p>

          ${modalidad === "VIRTUAL" &&
      meetLink
      ? `
                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#59614D;
                  border-radius:14px;
                  text-align:center;
                ">

                  <p style="
                    margin:0 0 15px 0;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:bold;
                  ">
                    Tu sesión será por Google Meet
                  </p>

                  <a
                    href="${meetLink}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      display:inline-block;
                      padding:12px 22px;
                      background:#ffffff;
                      color:#59614D;
                      text-decoration:none;
                      border-radius:10px;
                      font-weight:bold;
                      font-size:15px;
                    "
                  >
                    Unirse a Google Meet
                  </a>

                  <p style="
                    margin:15px 0 0 0;
                    color:#E1DBD2;
                    font-size:12px;
                    word-break:break-all;
                  ">
                    ${meetLink}
                  </p>

                </div>
              `
      : ""
    }

          ${modalidad === "PRESENCIAL" &&
      direccion
      ? `
                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#59614D;
                  border-radius:14px;
                  text-align:center;
                ">

                  <p style="
                    margin:0 0 15px 0;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:bold;
                  ">
                    Tu sesión será presencial
                  </p>

                 <p style="
  margin:0 0 18px 0;
  color:#ffffff;
  font-size:15px;
  line-height:1.6;
">
  <strong>Dirección de atención:</strong><br>
  ${direccion}<br>
  Segundo piso, frente a Unicentro Medellín.
</p>

                  ${googleMapsLink
        ? `
                        <a
                          href="${googleMapsLink}"
                          target="_blank"
                          rel="noopener noreferrer"
                          style="
                            display:inline-block;
                            padding:12px 22px;
                            background:#ffffff;
                            color:#59614D;
                            text-decoration:none;
                            border-radius:10px;
                            font-weight:bold;
                            font-size:15px;
                          "
                        >
                          Ver ubicación en Google Maps
                        </a>
                      `
        : ""
      }

                </div>
              `
      : ""
    }

          ${modalidad === "PRESENCIAL" &&
      !direccion
      ? `
                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#59614D;
                  border-radius:14px;
                  text-align:center;
                ">

                  <p style="
                    margin:0;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:bold;
                  ">
                    Tu sesión será presencial
                  </p>

                  <p style="
                    margin:12px 0 0 0;
                    color:#E1DBE2;
                    font-size:14px;
                  ">
                    La dirección será confirmada
                    posteriormente.
                  </p>

                </div>
              `
      : ""
    }

        </div>

        <p style="
          font-size:14px;
          color:#707469;
          line-height:1.6;
        ">
          Referencia de pago:
          <strong>${referencia}</strong>
        </p>

        <p style="
          margin-top:30px;
          font-size:16px;
          line-height:1.7;
        ">
          Gracias por confiar en este espacio.
          Te esperamos en tu cita.
        </p>

        <div style="
          margin-top:35px;
          padding-top:20px;
          border-top:1px solid #E1DBE2;
          text-align:center;
          color:#707469;
          font-size:13px;
        ">
          Este correo fue generado automáticamente.
        </div>

      </div>
    </div>
  `;

  // ====================================================
  // CORREO PARA LA PSICÓLOGA
  // ====================================================

  const htmlAdministradora = `
    <div style="
      margin:0;
      padding:40px 20px;
      background:#F7F1E9;
      font-family:Arial,sans-serif;
      color:#3F4635;
    ">
      <div style="
        max-width:600px;
        margin:0 auto;
        background:#ffffff;
        border-radius:20px;
        padding:40px;
        box-shadow:0 10px 30px rgba(0,0,0,0.08);
      ">

        <h1 style="
          color:#59614D;
          font-size:26px;
        ">
          Nueva cita pagada
        </h1>

        <p style="font-size:16px;">
          Se ha confirmado una nueva cita mediante
          pago en línea.
        </p>

        <div style="
          margin:25px 0;
          padding:25px;
          background:#F7F1E9;
          border-radius:16px;
        ">

          <p>
            <strong>Paciente:</strong>
            ${nombreCliente}
          </p>

          <p>
            <strong>Correo:</strong>
            ${emailCliente}
          </p>

          <p>
            <strong>Servicio:</strong>
            ${servicio}
          </p>

          <p>
            <strong>Fecha:</strong>
            ${fechaFormateada}
          </p>

          <p>
            <strong>Hora:</strong>
            ${horaFormateada}
          </p>

          <p>
            <strong>Modalidad:</strong>
            ${modalidadTexto}
          </p>

          <p>
            <strong>Valor:</strong>
            ${montoFormateado}
          </p>

          <p>
            <strong>Referencia:</strong>
            ${referencia}
          </p>

          ${modalidad === "VIRTUAL" &&
      meetLink
      ? `
                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#59614D;
                  border-radius:14px;
                  text-align:center;
                ">

                  <p style="
                    margin:0 0 15px 0;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:bold;
                  ">
                    Enlace de la sesión virtual
                  </p>

                  <a
                    href="${meetLink}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      display:inline-block;
                      padding:12px 22px;
                      background:#ffffff;
                      color:#59614D;
                      text-decoration:none;
                      border-radius:10px;
                      font-weight:bold;
                      font-size:15px;
                    "
                  >
                    Abrir Google Meet
                  </a>

                  <p style="
                    margin:15px 0 0 0;
                    color:#E1DBE2;
                    font-size:12px;
                    word-break:break-all;
                  ">
                    ${meetLink}
                  </p>

                </div>
              `
      : ""
    }

          ${modalidad === "PRESENCIAL" &&
      direccion
      ? `
                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#59614D;
                  border-radius:14px;
                  text-align:center;
                ">

                  <p style="
                    margin:0 0 15px 0;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:bold;
                  ">
                    Sesión presencial
                  </p>

                 <p style="
  margin:0 0 18px 0;
  color:#ffffff;
  font-size:15px;
  line-height:1.6;
">
  <strong>Dirección:</strong><br>
  ${direccion}<br>
  Segundo piso, frente a Unicentro Medellín.
</p>

                  ${googleMapsLink
        ? `
                        <a
                          href="${googleMapsLink}"
                          target="_blank"
                          rel="noopener noreferrer"
                          style="
                            display:inline-block;
                            padding:12px 22px;
                            background:#ffffff;
                            color:#59614D;
                            text-decoration:none;
                            border-radius:10px;
                            font-weight:bold;
                            font-size:15px;
                          "
                        >
                          Ver ubicación en Google Maps
                        </a>
                      `
        : ""
      }

                </div>
              `
      : ""
    }

          ${modalidad === "PRESENCIAL" &&
      !direccion
      ? `
                <div style="
                  margin-top:25px;
                  padding:20px;
                  background:#59614D;
                  border-radius:14px;
                  text-align:center;
                ">

                  <p style="
                    margin:0;
                    color:#ffffff;
                    font-size:16px;
                    font-weight:bold;
                  ">
                    Sesión presencial
                  </p>

                  <p style="
                    margin:12px 0 0 0;
                    color:#E1DBE2;
                    font-size:14px;
                  ">
                    La dirección no está configurada.
                  </p>

                </div>
              `
      : ""
    }

        </div>

        <p style="
          color:#707469;
          font-size:14px;
        ">
          La cita quedó registrada como
          <strong>CONFIRMADA</strong>.
        </p>

      </div>
    </div>
  `;

  // ====================================================
  // ENVIAR AL PACIENTE
  // ====================================================

  try {
    await enviarCorreo({
      para: emailCliente,
      asunto:
        "Cita confirmada - Psicología",
      html: htmlPaciente,
    });

    console.log(
      "Correo de confirmación enviado al paciente."
    );
  } catch (error) {
    console.error(
      "No fue posible enviar el correo al paciente:",
      error
    );
  }

  // ====================================================
  // ENVIAR A LA ADMINISTRADORA
  // ====================================================

  if (emailAdministradora) {
    try {
      await enviarCorreo({
        para: emailAdministradora,
        asunto:
          "Nueva cita pagada - Psicología",
        html: htmlAdministradora,
      });

      console.log(
        "Correo de nueva cita enviado a la administradora."
      );
    } catch (error) {
      console.error(
        "No fue posible enviar el correo a la administradora:",
        error
      );
    }
  }
}

// ======================================================
// WEBHOOK WOMPI
// ======================================================

export async function POST(request: Request) {
  try {
    const secretoEventos =
      process.env.WOMPI_EVENTS_SECRET;

    if (!secretoEventos) {
      console.error(
        "Falta WOMPI_EVENTS_SECRET en las variables de entorno."
      );

      return NextResponse.json(
        {
          error:
            "Configuración de eventos incompleta.",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // LEER EVENTO
    // ==================================================

    const evento: WompiEvent =
      await request.json();

    // ==================================================
    // VALIDAR ESTRUCTURA
    // ==================================================

    const transaction =
      evento.data?.transaction;

    const propiedades =
      evento.signature?.properties;

    const checksumRecibido =
      request.headers.get("X-Event-Checksum") ||
      evento.signature?.checksum;

    if (
      !evento.event ||
      !transaction ||
      !propiedades ||
      propiedades.length === 0 ||
      !checksumRecibido ||
      evento.timestamp === undefined
    ) {
      console.error(
        "Evento Wompi incompleto:",
        evento
      );

      return NextResponse.json(
        {
          error: "Evento inválido.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // VALIDAR FIRMA
    // ==================================================

    let cadenaFirma = "";

    for (const propiedad of propiedades) {
      const valor =
        obtenerValorPorRuta(
          evento.data as Record<string, unknown>,
          propiedad
        );

      if (
        valor === undefined ||
        valor === null
      ) {
        console.error(
          `No se encontró la propiedad ${propiedad} en el evento Wompi.`
        );

        return NextResponse.json(
          {
            error: "Firma inválida.",
          },
          {
            status: 400,
          }
        );
      }

      cadenaFirma += String(valor);
    }

    cadenaFirma += String(
      evento.timestamp
    );

    cadenaFirma += secretoEventos;

    const firmaCalculada =
      crypto
        .createHash("sha256")
        .update(cadenaFirma)
        .digest("hex");

    if (
      !compararFirmas(
        firmaCalculada,
        checksumRecibido
      )
    ) {
      console.error(
        "Firma de evento Wompi inválida."
      );

      return NextResponse.json(
        {
          error: "Firma inválida.",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // SOLO TRANSACTION.UPDATED
    // ==================================================

    if (
      evento.event !==
      "transaction.updated"
    ) {
      console.log(
        `Evento Wompi recibido y no procesado: ${evento.event}`
      );

      return NextResponse.json({
        recibido: true,
        procesado: false,
      });
    }

    // ==================================================
    // DATOS TRANSACCIÓN
    // ==================================================

    const {
      id: transaccionId,
      reference: referencia,
      status,
      amount_in_cents,
      currency,
      payment_method_type,
    } = transaction;

    if (
      !transaccionId ||
      !referencia ||
      !status ||
      amount_in_cents === undefined ||
      !currency
    ) {
      console.error(
        "La transacción recibida por Wompi no tiene todos los datos necesarios."
      );

      return NextResponse.json(
        {
          error:
            "Datos de transacción incompletos.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CONEXIÓN
    // ==================================================

    const conexion =
      await pool.getConnection();

    let datosCorreo:
      | {
        nombreCliente: string;
        emailCliente: string;
        emailAdministradora:
        | string
        | null;
        servicio: string;
        fecha: string | Date;
        hora: string;
        modalidad: string;
        monto: number;
        referencia: string;
        meetLink: string | null;
        direccion: string | null;
      }
      | null = null;

    let enviarNotificaciones = false;

    let datosGoogleMeet:
      | {
        citaId: number;
        fecha: string;
        hora: string;
        duracionMinutos: number;
        nombreCliente: string;
        emailCliente: string;
        nombreServicio: string;
        modalidad: "VIRTUAL";
      }
      | null = null;

    try {
      await conexion.beginTransaction();

      // =================================================
      // BUSCAR PAGO + CITA + CLIENTE + SERVICIO
      // =================================================

      const [pagos] =
        await conexion.query<RowDataPacket[]>(
          `
          SELECT
            p.id,
            p.cita_id,
            p.referencia,
            p.monto,
            p.moneda,
            p.estado,

            c.fecha AS cita_fecha,
            c.hora AS cita_hora,
            c.modalidad AS cita_modalidad,
            c.google_event_id,
            c.meet_link,

            cl.nombre_completo AS cliente_nombre,
            cl.email AS cliente_email,

            s.nombre AS servicio_nombre,
            s.duracion_minutos

          FROM pagos p

          INNER JOIN citas c
            ON p.cita_id = c.id

          INNER JOIN clientes cl
            ON c.cliente_id = cl.id

          INNER JOIN servicios s
            ON c.servicio_id = s.id

          WHERE p.referencia = ?

          LIMIT 1

          FOR UPDATE
          `,
          [referencia]
        );

      // =================================================
      // REFERENCIA NO ENCONTRADA
      // =================================================

      if (pagos.length === 0) {
        await conexion.rollback();

        console.warn(
          `Wompi notificó una referencia que no existe en nuestra BD: ${referencia}`
        );

        return NextResponse.json({
          recibido: true,
          procesado: false,
          mensaje:
            "Referencia no encontrada.",
        });
      }

      const pago = pagos[0];

      // =================================================
      // IDEMPOTENCIA POR TRANSACCION_ID
      // =================================================
      // Wompi reenvía eventos. Si esta transacción ya fue
      // procesada para el mismo pago, respondemos idempotente
      // sin re-procesar (evita Meet y correos duplicados).
      if (
        pago.transaccion_id === transaccionId &&
        pago.estado === "APROBADO"
      ) {
        await conexion.rollback();

        console.log(
          `Webhook Wompi idempotente: transacción ${transaccionId} ya procesada.`
        );

        return NextResponse.json({
          recibido: true,
          procesado: true,
          idempotente: true,
          referencia,
          estado_wompi: status,
          estado_pago: "APROBADO",
          estado_cita: "CONFIRMADA",
          notificaciones_enviadas: false,
        });
      }

      // La transacción no puede estar asociada a otro pago.
      const [transaccionesExistentes] =
        await conexion.query<RowDataPacket[]>(
          `
          SELECT id
          FROM pagos
          WHERE transaccion_id = ?
            AND id <> ?
          LIMIT 1
          `,
          [transaccionId, pago.id]
        );

      if (transaccionesExistentes.length > 0) {
        await conexion.rollback();

        console.warn(
          "Wompi envió una transacción que ya está asociada a otro pago.",
          { referencia }
        );

        return NextResponse.json(
          {
            error: "La transacción ya está asociada a otro pago.",
          },
          { status: 409 }
        );
      }

      // =================================================
      // VALIDAR MONTO Y MONEDA
      // =================================================

      const montoEsperadoEnCentavos =
        Math.round(
          Number(pago.monto) * 100
        );

      if (
        montoEsperadoEnCentavos !==
        Number(amount_in_cents) ||
        pago.moneda !== currency
      ) {
        await conexion.rollback();

        console.error(
          "El monto o moneda recibidos de Wompi no coinciden con nuestra BD.",
          {
            referencia,
            montoEsperadoEnCentavos,
            montoRecibido:
              amount_in_cents,
            monedaEsperada:
              pago.moneda,
            monedaRecibida: currency,
          }
        );

        return NextResponse.json(
          {
            error:
              "Monto o moneda no coinciden.",
          },
          {
            status: 400,
          }
        );
      }

      // =================================================
      // EVITAR CORREOS DUPLICADOS
      // =================================================

      const pagoYaAprobado =
        pago.estado === "APROBADO";

      // =================================================
      // DETERMINAR ESTADOS
      // =================================================

      let nuevoEstadoPago:
        | "PENDIENTE"
        | "APROBADO"
        | "RECHAZADO"
        | "CANCELADO";

      let nuevoEstadoCita:
        | "PENDIENTE"
        | "CONFIRMADA"
        | "CANCELADA"
        | null = null;

      switch (status) {
        case "APPROVED":
          nuevoEstadoPago =
            "APROBADO";

          nuevoEstadoCita =
            "CONFIRMADA";

          break;

        case "DECLINED":
        case "ERROR":
          nuevoEstadoPago =
            "RECHAZADO";

          nuevoEstadoCita =
            "CANCELADA";

          break;

        case "VOIDED":
          nuevoEstadoPago =
            "CANCELADO";

          nuevoEstadoCita =
            "CANCELADA";

          break;

        case "PENDING":
        default:
          nuevoEstadoPago =
            "PENDIENTE";

          break;
      }

      // =================================================
      // ACTUALIZAR PAGO
      // =================================================

      if (
        nuevoEstadoPago ===
        "APROBADO"
      ) {
        await conexion.query(
          `
          UPDATE pagos
          SET
            transaccion_id = ?,
            metodo_pago = ?,
            estado = 'APROBADO',
            fecha_pago = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            transaccionId,
            payment_method_type ||
            null,
            pago.id,
          ]
        );
      } else {
        await conexion.query(
          `
          UPDATE pagos
          SET
            transaccion_id = ?,
            metodo_pago = ?,
            estado = ?,
            fecha_pago = CASE
              WHEN ? = 'APROBADO'
              THEN CURRENT_TIMESTAMP
              ELSE fecha_pago
            END
          WHERE id = ?
          `,
          [
            transaccionId,
            payment_method_type ||
            null,
            nuevoEstadoPago,
            nuevoEstadoPago,
            pago.id,
          ]
        );
      }

      // =================================================
      // ACTUALIZAR CITA
      // =================================================

      if (nuevoEstadoCita) {
        await conexion.query(
          `
          UPDATE citas
          SET estado = ?
          WHERE id = ?
          `,
          [
            nuevoEstadoCita,
            pago.cita_id,
          ]
        );
      }

      // =================================================
      // PREPARAR DATOS DEL CORREO
      // =================================================

      if (
        nuevoEstadoPago ===
        "APROBADO" &&
        !pagoYaAprobado
      ) {
        // ===============================================
        // OBTENER EMAIL DE LA ADMINISTRADORA
        // ===============================================

        const [administradores] =
          await conexion.query<RowDataPacket[]>(
            `
            SELECT email
            FROM administradores
            ORDER BY id ASC
            LIMIT 1
            `
          );

        // ===============================================
        // OBTENER DIRECCIÓN
        // ===============================================

        const [configuraciones] =
          await conexion.query<RowDataPacket[]>(
            `
            SELECT direccion
            FROM configuracion_general
            ORDER BY id ASC
            LIMIT 1
            `
          );

        const direccion =
          configuraciones.length > 0 &&
            configuraciones[0].direccion
            ? String(
              configuraciones[0].direccion
            ).trim()
            : null;

        datosCorreo = {
          nombreCliente:
            pago.cliente_nombre,

          emailCliente:
            pago.cliente_email,

          emailAdministradora:
            administradores.length > 0
              ? administradores[0].email
              : null,

          servicio:
            pago.servicio_nombre,

          fecha:
            pago.cita_fecha,

          hora:
            pago.cita_hora,

          modalidad:
            pago.cita_modalidad,

          monto:
            Number(pago.monto),

          referencia:
            pago.referencia,

          meetLink:
            pago.meet_link || null,

          direccion,
        };

        if (
          pago.cita_modalidad === "VIRTUAL" &&
          !pago.google_event_id &&
          !pago.meet_link
        ) {
          datosGoogleMeet = {
            citaId:
              Number(pago.cita_id),

            fecha:
              String(pago.cita_fecha),

            hora:
              String(pago.cita_hora),

            duracionMinutos:
              Number(
                pago.duracion_minutos
              ),

            nombreCliente:
              String(
                pago.cliente_nombre
              ),

            emailCliente:
              String(
                pago.cliente_email
              ),

            nombreServicio:
              String(
                pago.servicio_nombre
              ),

            modalidad:
              "VIRTUAL",
          };
        }

        enviarNotificaciones =
          true;
      }

      // =================================================
      // COMMIT
      // =================================================

      await conexion.commit();

      // =================================================
      // CREAR GOOGLE CALENDAR + GOOGLE MEET
      // =================================================

      if (datosGoogleMeet) {
        try {
          const eventoGoogle =
            await crearEventoGoogleCalendar(
              datosGoogleMeet
            );

          await pool.query(
            `
            UPDATE citas
            SET
              google_event_id = ?,
              meet_link = ?
            WHERE id = ?
            `,
            [
              eventoGoogle.eventId,
              eventoGoogle.meetLink,
              datosGoogleMeet.citaId,
            ]
          );

          if (datosCorreo) {
            datosCorreo.meetLink =
              eventoGoogle.meetLink;
          }

          console.log(
            "Google Calendar creado correctamente:",
            {
              citaId:
                datosGoogleMeet.citaId,

              eventId:
                eventoGoogle.eventId,

              meetLink:
                eventoGoogle.meetLink,
            }
          );
        } catch (error) {
          console.error(
            "No fue posible crear Google Calendar/Meet:",
            error
          );
        }
      }

      // =================================================
      // LOG
      // =================================================

      console.log(
        "Webhook Wompi procesado correctamente:",
        {
          referencia,
          transaccionId,
          status,
          nuevoEstadoPago,
          nuevoEstadoCita,
        }
      );

    } catch (error) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error(
          "Error haciendo rollback del webhook:",
          rollbackError
        );
      }

      throw error;

    } finally {
      conexion.release();
    }

    // ==================================================
    // ENVIAR CORREOS DESPUÉS DEL COMMIT
    // ==================================================

    if (
      enviarNotificaciones &&
      datosCorreo
    ) {
      await enviarCorreosConfirmacion(
        datosCorreo
      );
    }

    // ==================================================
    // RESPUESTA
    // ==================================================

    return NextResponse.json({
      recibido: true,
      procesado: true,
      referencia,
      estado_wompi: status,
      estado_pago:
        status === "APPROVED"
          ? "APROBADO"
          : status === "DECLINED" ||
            status === "ERROR"
            ? "RECHAZADO"
            : status === "VOIDED"
              ? "CANCELADO"
              : "PENDIENTE",

      estado_cita:
        status === "APPROVED"
          ? "CONFIRMADA"
          : status === "DECLINED" ||
            status === "ERROR" ||
            status === "VOIDED"
            ? "CANCELADA"
            : null,

      notificaciones_enviadas:
        enviarNotificaciones,
    });

  } catch (error) {
    console.error(
      "Error procesando webhook de Wompi:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error interno procesando el evento.",
      },
      {
        status: 500,
      }
    );
  }
}