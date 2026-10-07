import crypto from "crypto";
import pool from "@/app/lib/db";

// ======================================================
// TEXTO / HTML
// ======================================================

export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// FECHAS Y HORAS
// ======================================================

// Devuelve "YYYY-MM-DD" tanto si mysql2 entrega Date como string
export function fechaATexto(fecha: string | Date): string {
  if (fecha instanceof Date) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(fecha).slice(0, 10);
}

export function formatearFecha(fecha: string | Date): string {
  const [anio, mes, dia] = fechaATexto(fecha).split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// "14:30:00" -> "2:30 p. m."
export function formatearHora(hora: string): string {
  const [h, m] = String(hora).slice(0, 5).split(":").map(Number);
  const sufijo = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

// Fecha y hora actuales en Bogotá: { fecha: "YYYY-MM-DD", hora: "HH:mm" }
export function ahoraBogota(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const v: Record<string, string> = {};
  for (const p of partes) if (p.type !== "literal") v[p.type] = p.value;

  return {
    fecha: `${v.year}-${v.month}-${v.day}`,
    hora: `${v.hour}:${v.minute}`,
  };
}

// ======================================================
// TOKEN + CITA
// ======================================================

function compararTokens(recibido: string, guardado: string): boolean {
  const a = Buffer.from(recibido, "utf8");
  const b = Buffer.from(guardado, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type CitaRecordatorio = {
  id: number;
  fecha: string | Date;
  hora: string;
  estado: string;
  modalidad: string | null;
  servicio_id: number;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  servicio_nombre: string;
  servicio_duracion: number | null;
  correo_psicologa: string | null;
  direccion_consultorio: string | null;
  google_event_id: string | null;
  meet_link: string | null;
};

type Resultado =
  | { ok: true; cita: CitaRecordatorio }
  | { ok: false; error: string; status: number };

// Valida id + token y que la cita siga en estado CONFIRMADA.
export async function obtenerCitaValidada(
  id: string,
  token: unknown
): Promise<Resultado> {
  if (!/^\d+$/.test(id)) {
    return { ok: false, error: "Identificador de cita no válido.", status: 400 };
  }

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return { ok: false, error: "El enlace no es válido.", status: 400 };
  }

  const [filas]: any = await pool.query(
    `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.modalidad,
        c.servicio_id,
        c.token_confirmacion,
        c.google_event_id,
        c.meet_link,

        COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS cliente_nombre,
        cl.email AS cliente_email,
        COALESCE(c.cliente_telefono_registro, cl.telefono) AS cliente_telefono,

        s.nombre AS servicio_nombre,
        s.duracion_minutos AS servicio_duracion,

        cg.correo AS correo_psicologa,
        cg.direccion AS direccion_consultorio

      FROM citas c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN servicios s ON c.servicio_id = s.id
      LEFT JOIN configuracion_general cg ON cg.id = 1

      WHERE c.id = ?
      LIMIT 1
    `,
    [id]
  );

  if (filas.length === 0) {
    return { ok: false, error: "No encontramos esta cita.", status: 404 };
  }

  const fila = filas[0];

  if (
    !fila.token_confirmacion ||
    !compararTokens(token, fila.token_confirmacion)
  ) {
    return {
      ok: false,
      error: "El enlace no es válido o ha expirado.",
      status: 403,
    };
  }

  if (fila.estado !== "CONFIRMADA") {
    return {
      ok: false,
      error: "Esta cita ya no está disponible para esta acción.",
      status: 409,
    };
  }

  const { token_confirmacion: _omitido, ...cita } = fila;
  return { ok: true, cita: cita as CitaRecordatorio };
}

// ======================================================
// PLANTILLAS DE CORREO
// ======================================================

export function layoutCorreo(titulo: string, cuerpoHtml: string): string {
  return `
    <div style="margin:0;padding:35px 15px;background:#F7F1E9;font-family:Arial,sans-serif;color:#3F4635;">
      <div style="max-width:600px;margin:0 auto;padding:35px;background:#ffffff;border-radius:16px;">
        <p style="color:#C56835;text-align:center;font-size:14px;">Aura Elisa Sánchez</p>
        <h1 style="text-align:center;font-size:26px;font-weight:400;">${escaparHtml(titulo)}</h1>
        ${cuerpoHtml}
      </div>
    </div>
  `;
}

// filas: [etiqueta, valor]. Los valores se escapan aquí.
export function cajaDetalles(filas: [string, string][]): string {
  const contenido = filas
    .map(
      ([etiqueta, valor]) =>
        `<strong>${escaparHtml(etiqueta)}:</strong> ${escaparHtml(valor)}<br>`
    )
    .join("");

  return `
    <div style="padding:20px;background:#F7F1E9;border-radius:12px;line-height:1.9;">
      ${contenido}
    </div>
  `;
}

export const parrafo = (html: string) =>
  `<p style="font-size:16px;line-height:1.7;">${html}</p>`;

// Bloque de "Modalidad: virtual (con enlace de Meet) o presencial (con dirección)"
// Se usa en los correos de reprogramación (a la psicóloga y al paciente).
export function bloqueModalidad(cita: {
  modalidad: string | null;
  meet_link: string | null;
  direccion_consultorio: string | null;
}): string {
  const esVirtual = cita.modalidad === "VIRTUAL";

  if (esVirtual) {
    const enlace = cita.meet_link
      ? `<a href="${escaparHtml(cita.meet_link)}" style="color:#ffffff;text-decoration:underline;">${escaparHtml(cita.meet_link)}</a>`
      : "El enlace se confirmará posteriormente.";

    return `
      <div style="margin-top:16px;padding:16px;background:#59614D;border-radius:12px;color:#ffffff;">
        <strong>Modalidad:</strong> Virtual (Google Meet)<br>
        ${enlace}
      </div>
    `;
  }

  const direccion = cita.direccion_consultorio
    ? escaparHtml(cita.direccion_consultorio)
    : "La dirección será confirmada posteriormente.";

  return `
    <div style="margin-top:16px;padding:16px;background:#59614D;border-radius:12px;color:#ffffff;">
      <strong>Modalidad:</strong> Presencial<br>
      ${direccion}
    </div>
  `;
}