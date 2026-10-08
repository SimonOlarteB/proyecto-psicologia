import { randomBytes, createHash } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "./db";
import { enviarCorreo } from "./email";

// ======================================================
// Replica exactamente la misma lógica y el mismo correo
// que ya usa app/api/recordatorios/testimonios/route.ts
// (el proceso automático), pero para UNA sola cita,
// disparada a mano por la psicóloga desde su panel.
//
// La restricción UNIQUE de cita_id en solicitudes_testimonio
// hace que, si ya se envió manualmente, el proceso
// automático la salte después (no se duplica el envío).
// ======================================================

function escaparHtml(valor: unknown): string {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => {
    const entidades: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entidades[caracter];
  });
}

function formatearFecha(fecha: string | Date): string {
  const texto =
    fecha instanceof Date
      ? fecha.toISOString().slice(0, 10)
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

export type ResultadoInvitacion =
  | { enviada: true }
  | {
      enviada: false;
      motivo: "ya_existe" | "sin_correo" | "cita_no_valida" | "error";
      detalle?: string;
    };

export async function enviarInvitacionTestimonio(
  citaId: number
): Promise<ResultadoInvitacion> {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

  if (!appUrl) {
    return {
      enviada: false,
      motivo: "error",
      detalle: "Falta configurar APP_URL.",
    };
  }

  const [filas] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        c.id AS cita_id,
        c.fecha,
        c.hora,
        c.estado,
        COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS cliente_nombre,
        cl.email AS cliente_email,
        s.nombre AS servicio_nombre
      FROM citas c
      INNER JOIN clientes cl ON cl.id = c.cliente_id
      INNER JOIN servicios s ON s.id = c.servicio_id
      WHERE c.id = ?
      LIMIT 1
    `,
    [citaId]
  );

  if (filas.length === 0) {
    return {
      enviada: false,
      motivo: "cita_no_valida",
      detalle: "La cita no existe.",
    };
  }

  const cita = filas[0];

  if (cita.estado !== "COMPLETADA") {
    return {
      enviada: false,
      motivo: "cita_no_valida",
      detalle:
        "Solo se puede invitar a testimonio en citas ya completadas.",
    };
  }

  if (!cita.cliente_email) {
    return { enviada: false, motivo: "sin_correo" };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = generarHash(token);

  // La restricción UNIQUE de cita_id evita duplicados:
  // si el cron automático (o ya se había mandado antes)
  // ya creó una solicitud, este INSERT falla y avisamos.
  try {
    await pool.query(
      `
        INSERT INTO solicitudes_testimonio (
          cita_id, token_hash, estado, intentos, token_expira_en
        )
        VALUES (?, ?, 'PENDIENTE', 0, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 14 DAY))
      `,
      [cita.cita_id, tokenHash]
    );
  } catch (error: unknown) {
    if (
      (error as { code?: string })?.code ===
      "ER_DUP_ENTRY"
    ) {
      return { enviada: false, motivo: "ya_existe" };
    }
    throw error;
  }

  const nombreCliente = escaparHtml(cita.cliente_nombre);
  const nombreServicio = escaparHtml(cita.servicio_nombre);
  const fechaFormateada = escaparHtml(formatearFecha(cita.fecha));
  const horaFormateada = escaparHtml(String(cita.hora).slice(0, 5));
  const urlTestimonio = `${appUrl}/testimonio/${encodeURIComponent(token)}`;

  const html = `
    <div style="max-width:600px;margin:0 auto;padding:30px 20px;font-family:Arial,Helvetica,sans-serif;color:#3F4635;line-height:1.7;">
      <div style="padding:35px;background:#ffffff;border:1px solid #E1DBD2;border-radius:18px;">
        <p style="margin:0 0 8px;color:#C56835;text-align:center;font-size:14px;">
          Aura Elisa Sánchez · Psicología
        </p>

        <h1 style="margin:0 0 24px;color:#59614D;text-align:center;font-family:Georgia,serif;font-size:28px;font-weight:normal;">
          Nos gustaría conocer tu experiencia
        </h1>

        <p>Hola ${nombreCliente},</p>

        <p>Gracias por confiar en nuestro espacio de acompañamiento psicológico.</p>

        <p>
          Nos gustaría conocer cómo fue tu experiencia en la sesión de
          <strong>${nombreServicio}</strong>. Tu opinión es valiosa y puede
          ayudar a otras personas a conocer nuestros servicios.
        </p>

        <div style="margin:24px 0;padding:18px;background:#F7F1E9;border-radius:12px;">
          <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaFormateada}</p>
          <p style="margin:4px 0;"><strong>Hora:</strong> ${horaFormateada}</p>
        </div>

        <p>Si deseas compartir tu opinión, puedes hacerlo desde el siguiente botón:</p>

        <div style="text-align:center;margin:30px 0;">
          <a href="${urlTestimonio}" style="display:inline-block;padding:14px 28px;background:#59614D;color:#ffffff;text-decoration:none;border-radius:30px;font-weight:bold;">
            Compartir mi experiencia
          </a>
        </div>

        <p style="font-size:14px;color:#707469;">
          Este enlace estará disponible durante 14 días. Compartir tu opinión
          es completamente voluntario.
        </p>

        <p style="margin-top:30px;font-size:13px;color:#707469;text-align:center;">
          Gracias por tu confianza.
        </p>
      </div>
    </div>
  `;

  try {
    await enviarCorreo({
      para: cita.cliente_email,
      asunto: "Nos gustaría conocer tu experiencia",
      html,
    });
  } catch (error: unknown) {
    await pool.query(
      `
        UPDATE solicitudes_testimonio
        SET estado = 'ERROR', intentos = intentos + 1, ultimo_error = ?
        WHERE cita_id = ? AND estado = 'PENDIENTE'
      `,
      [
        String(
          (error as { message?: string })?.message ||
            "Error al enviar el correo."
        ).slice(0, 1000),
        cita.cita_id,
      ]
    );

    return {
      enviada: false,
      motivo: "error",
      detalle: "No fue posible enviar el correo.",
    };
  }

  await pool.query(
    `
      UPDATE solicitudes_testimonio
      SET estado = 'ENVIADA', enviado_en = CURRENT_TIMESTAMP,
          intentos = intentos + 1, ultimo_error = NULL
      WHERE cita_id = ? AND token_hash = ? AND estado = 'PENDIENTE'
    `,
    [cita.cita_id, tokenHash]
  );

  return { enviada: true };
}