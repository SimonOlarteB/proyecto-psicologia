import { createHash } from "crypto";
import pool from "./db";

// Debe coincidir EXACTAMENTE con la función generarHash()
// que ya usa app/api/recordatorios/testimonios/route.ts
export function generarHashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SolicitudTestimonio = {
  id: number;
  cita_id: number;
  estado: string;
  token_expira_en: string | Date;
  cliente_nombre: string;
  servicio_nombre: string;
  fecha: string | Date;
  hora: string;
};

type Resultado =
  | { ok: true; solicitud: SolicitudTestimonio }
  | { ok: false; error: string; status: number };

// Valida que el token (sin procesar, tal como llega en la URL)
// corresponda a una invitación válida, enviada, no respondida
// todavía y no vencida.
export async function obtenerSolicitudValidada(
  token: unknown
): Promise<Resultado> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return {
      ok: false,
      error: "El enlace no es válido.",
      status: 400,
    };
  }

  const tokenHash = generarHashToken(token);

  const [filas]: any = await pool.query(
    `
      SELECT
        st.id,
        st.cita_id,
        st.estado,
        st.token_expira_en,

        COALESCE(c.cliente_nombre_registro, cl.nombre_completo) AS cliente_nombre,
        s.nombre AS servicio_nombre,

        c.fecha,
        c.hora

      FROM solicitudes_testimonio st
      INNER JOIN citas c ON c.id = st.cita_id
      INNER JOIN clientes cl ON cl.id = c.cliente_id
      INNER JOIN servicios s ON s.id = c.servicio_id

      WHERE st.token_hash = ?
      LIMIT 1
    `,
    [tokenHash]
  );

  if (filas.length === 0) {
    return {
      ok: false,
      error: "No encontramos esta invitación a dejar un testimonio.",
      status: 404,
    };
  }

  const solicitud = filas[0] as SolicitudTestimonio;

  if (solicitud.estado === "RESPONDIDA") {
    return {
      ok: false,
      error: "Ya enviaste tu testimonio anteriormente. ¡Muchas gracias!",
      status: 409,
    };
  }

  if (solicitud.estado !== "ENVIADA") {
    return {
      ok: false,
      error: "Este enlace ya no está disponible.",
      status: 409,
    };
  }

  const expira = new Date(solicitud.token_expira_en);

  if (Number.isNaN(expira.getTime()) || expira.getTime() < Date.now()) {
    return {
      ok: false,
      error: "Este enlace de invitación ha expirado.",
      status: 410,
    };
  }

  return { ok: true, solicitud };
}