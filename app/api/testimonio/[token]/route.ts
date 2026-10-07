import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { obtenerSolicitudValidada } from "@/app/lib/testimonio";
 
export const runtime = "nodejs";
 
// =====================================================
// GET — Validar el enlace y traer datos para mostrar
//        en la página (nombre del cliente, servicio).
// =====================================================
 
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
 
    const resultado = await obtenerSolicitudValidada(token);
 
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
 
    const { solicitud } = resultado;
 
    return NextResponse.json({
      clienteNombre: solicitud.cliente_nombre,
      servicioNombre: solicitud.servicio_nombre,
    });
  } catch (error) {
    console.error("Error validando invitación a testimonio:", error);
 
    return NextResponse.json(
      { error: "No fue posible validar este enlace." },
      { status: 500 }
    );
  }
}
 
// =====================================================
// POST — Guardar el testimonio que escribió el cliente.
// =====================================================
 
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
 
    const resultado = await obtenerSolicitudValidada(token);
 
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
 
    const { solicitud } = resultado;
 
    const body = await request.json().catch(() => null);
 
    const nombre =
      typeof body?.nombre === "string" ? body.nombre.trim() : "";
 
    const comentario =
      typeof body?.comentario === "string"
        ? body.comentario.trim()
        : "";
 
    if (nombre.length < 2) {
      return NextResponse.json(
        { error: "Escribe tu nombre (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }
 
    if (comentario.length < 5) {
      return NextResponse.json(
        {
          error:
            "Cuéntanos un poco más sobre tu experiencia (mínimo 5 caracteres).",
        },
        { status: 400 }
      );
    }
 
    // "Reclamamos" la solicitud primero, de forma atómica.
    // Si dos pestañas envían el formulario al mismo tiempo,
    // solo una va a lograr este UPDATE — evita testimonios
    // duplicados por una misma invitación.
    const [actualizacion]: any = await pool.query(
      `
        UPDATE solicitudes_testimonio
        SET estado = 'RESPONDIDA',
            respondido_en = CURRENT_TIMESTAMP
        WHERE id = ?
          AND estado = 'ENVIADA'
      `,
      [solicitud.id]
    );
 
    if (actualizacion.affectedRows === 0) {
      return NextResponse.json(
        {
          error:
            "Ya enviaste tu testimonio anteriormente. ¡Muchas gracias!",
        },
        { status: 409 }
      );
    }
 
    // El testimonio nace SIN publicar; la psicóloga decide
    // desde su panel si lo muestra públicamente o no.
    await pool.query(
      `
        INSERT INTO testimonios (nombre, comentario, publicado, cita_id)
        VALUES (?, ?, 0, ?)
      `,
      [nombre, comentario, solicitud.cita_id]
    );
 
    return NextResponse.json({
      mensaje: "¡Gracias por compartir tu experiencia!",
    });
  } catch (error) {
    console.error("Error guardando el testimonio:", error);
 
    return NextResponse.json(
      { error: "No fue posible guardar tu testimonio." },
      { status: 500 }
    );
  }
}
 