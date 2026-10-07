import { NextResponse } from "next/server";
import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

import pool from "../../../lib/db";
import { enviarCorreo } from "../../../lib/email";

export const runtime = "nodejs";

// ======================================================
// AUTORIZACIÓN DEL PROCESO AUTOMÁTICO
// ======================================================

function validarCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const autorizacion = request.headers.get("authorization");

  if (!secret || !autorizacion?.startsWith("Bearer ")) {
    return false;
  }

  const token = autorizacion.slice(7);
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);

  if (tokenBuffer.length !== secretBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, secretBuffer);
}

// ======================================================
// FECHA Y HORA ACTUAL EN COLOMBIA
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
// UTILIDADES
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

function generarHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ======================================================
// GET — PROCESAR INVITACIONES A DEJAR UN TESTIMONIO
// ======================================================

export async function GET(request: Request) {
  if (!validarCronSecret(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  const dryRun =
    new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

    if (!appUrl) {
      return NextResponse.json(
        {
          error: "La URL de la aplicación no está configurada.",
        },
        { status: 500 }
      );
    }

    const ahoraBogota = obtenerFechaHoraBogota(new Date());

    // Buscar citas completadas cuya duración ya terminó.
    // La solicitud única por cita evita duplicar invitaciones.

    const [citas]: any = await pool.query(
      `
        SELECT
          c.id AS cita_id,
          c.fecha,
          c.hora,
          COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS cliente_nombre,
          cl.email AS cliente_email,
          s.nombre AS servicio_nombre,
          s.duracion_minutos AS servicio_duracion

        FROM citas c

        INNER JOIN clientes cl
          ON cl.id = c.cliente_id

        INNER JOIN servicios s
          ON s.id = c.servicio_id

        LEFT JOIN solicitudes_testimonio st
          ON st.cita_id = c.id

        WHERE c.estado = 'COMPLETADA'

          AND TIMESTAMP(c.fecha, c.hora)
              + INTERVAL s.duracion_minutos MINUTE <= ?

          AND st.id IS NULL

        ORDER BY c.fecha ASC, c.hora ASC
      `,
      [ahoraBogota]
    );

    // ==================================================
    // MODO DE PRUEBA: NO ENVÍA NI MODIFICA
    // ==================================================

    if (dryRun) {
      return NextResponse.json({
        modo: "prueba",
        mensaje:
          "Consulta completada. No se enviaron correos ni se modificó la base de datos.",
        encontradas: citas.length,
        correosEnviados: 0,
        registrosCreados: 0,
        citas: citas.map((cita: any) => ({
          cita_id: cita.cita_id,
          fecha: formatearFecha(cita.fecha),
          hora: String(cita.hora).slice(0, 5),
          servicio: cita.servicio_nombre,
          tieneCorreo: Boolean(cita.cliente_email),
        })),
      });
    }

    if (citas.length === 0) {
      return NextResponse.json({
        mensaje: "No hay invitaciones a testimonios pendientes.",
        encontradas: 0,
        enviadas: 0,
        errores: 0,
      });
    }

    let enviadas = 0;
    let errores = 0;
    let omitidas = 0;

    // ==================================================
    // PROCESAR CADA CITA
    // ==================================================

    for (const cita of citas) {
      let solicitudCreada = false;

      try {
        if (!cita.cliente_email) {
          console.error(
            `La cita ${cita.cita_id} no tiene correo del cliente.`
          );

          errores++;
          continue;
        }

        // El token original solo se envía por correo.
        // En la base de datos guardamos únicamente su hash.

        const token = randomBytes(32).toString("hex");
        const tokenHash = generarHash(token);

        // La restricción UNIQUE de cita_id protege contra
        // solicitudes duplicadas, incluso si se ejecuta
        // el proceso más de una vez.

        let resultadoInsert: any;

        try {
          const [resultado]: any = await pool.query(
            `
              INSERT INTO solicitudes_testimonio (
                cita_id,
                token_hash,
                estado,
                intentos,
                token_expira_en
              )
              VALUES (
                ?,
                ?,
                'PENDIENTE',
                0,
                DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 14 DAY)
              )
            `,
            [cita.cita_id, tokenHash]
          );

          resultadoInsert = resultado;
          solicitudCreada = true;
        } catch (error: any) {
          // Error MySQL 1062 = entrada duplicada.
          if (error?.code === "ER_DUP_ENTRY") {
            omitidas++;
            continue;
          }

          throw error;
        }

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
          String(cita.hora).slice(0, 5)
        );

        const urlTestimonio =
          `${appUrl}/testimonio/${encodeURIComponent(token)}`;

        const html = `
          <div style="
            max-width:600px;
            margin:0 auto;
            padding:30px 20px;
            font-family:Arial,Helvetica,sans-serif;
            color:#3F4635;
            line-height:1.7;
          ">
            <div style="
              padding:35px;
              background:#ffffff;
              border:1px solid #E1DBD2;
              border-radius:18px;
            ">
              <p style="
                margin:0 0 8px;
                color:#C56835;
                text-align:center;
                font-size:14px;
              ">
                Aura Elisa Sánchez · Psicología
              </p>

              <h1 style="
                margin:0 0 24px;
                color:#59614D;
                text-align:center;
                font-family:Georgia,serif;
                font-size:28px;
                font-weight:normal;
              ">
                Nos gustaría conocer tu experiencia
              </h1>

              <p>Hola ${nombreCliente},</p>

              <p>
                Gracias por confiar en nuestro espacio de
                acompañamiento psicológico.
              </p>

              <p>
                Nos gustaría conocer cómo fue tu experiencia
                en la sesión de
                <strong>${nombreServicio}</strong>.
                Tu opinión es valiosa y puede ayudar a otras
                personas a conocer nuestros servicios.
              </p>

              <div style="
                margin:24px 0;
                padding:18px;
                background:#F7F1E9;
                border-radius:12px;
              ">
                <p style="margin:4px 0;">
                  <strong>Fecha:</strong> ${fechaFormateada}
                </p>
                <p style="margin:4px 0;">
                  <strong>Hora:</strong> ${horaFormateada}
                </p>
              </div>

              <p>
                Si deseas compartir tu opinión, puedes hacerlo
                desde el siguiente botón:
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a
                  href="${urlTestimonio}"
                  style="
                    display:inline-block;
                    padding:14px 28px;
                    background:#59614D;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:30px;
                    font-weight:bold;
                  "
                >
                  Compartir mi experiencia
                </a>
              </div>

              <p style="font-size:14px;color:#707469;">
                Este enlace estará disponible durante 14 días.
                Compartir tu opinión es completamente voluntario.
              </p>

              <p style="
                margin-top:30px;
                font-size:13px;
                color:#707469;
                text-align:center;
              ">
                Gracias por tu confianza.
              </p>
            </div>
          </div>
        `;

        await enviarCorreo({
          para: cita.cliente_email,
          asunto: "Nos gustaría conocer tu experiencia",
          html,
        });

        // Marcar como enviada únicamente después de que
        // Resend confirme el envío.

        await pool.query(
          `
            UPDATE solicitudes_testimonio
            SET
              estado = 'ENVIADA',
              enviado_en = CURRENT_TIMESTAMP,
              intentos = intentos + 1,
              ultimo_error = NULL
            WHERE cita_id = ?
              AND token_hash = ?
              AND estado = 'PENDIENTE'
          `,
          [cita.cita_id, tokenHash]
        );

        enviadas++;
      } catch (error: any) {
        console.error(
          `Error procesando el testimonio de la cita ${cita.cita_id}:`,
          error
        );

        errores++;

        // Si alcanzamos a crear la solicitud, registrar
        // el fallo para que quede visible en la base de datos.

        if (solicitudCreada) {
          try {
            await pool.query(
              `
                UPDATE solicitudes_testimonio
                SET
                  estado = 'ERROR',
                  intentos = intentos + 1,
                  ultimo_error = ?
                WHERE cita_id = ?
                  AND estado = 'PENDIENTE'
              `,
              [
                String(error?.message || "Error al enviar el correo.")
                  .slice(0, 1000),
                cita.cita_id,
              ]
            );
          } catch (errorRegistro) {
            console.error(
              `No se pudo registrar el error de la cita ${cita.cita_id}:`,
              errorRegistro
            );
          }
        }
      }
    }

    return NextResponse.json({
      mensaje: "Proceso de invitaciones ejecutado.",
      encontradas: citas.length,
      enviadas,
      errores,
      omitidas,
    });
  } catch (error) {
    console.error(
      "Error ejecutando invitaciones a testimonios:",
      error
    );

    return NextResponse.json(
      { error: "No fue posible procesar las invitaciones." },
      { status: 500 }
    );
  }
}