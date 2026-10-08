import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { enviarCorreo } from "@/app/lib/email";
import {
  cajaDetalles,
  formatearFecha,
  formatearHora,
  layoutCorreo,
  obtenerCitaValidada,
  parrafo,
  escaparHtml,
} from "@/app/lib/recordatorio";
 
export const runtime = "nodejs";
 
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const token = body?.token;
 
    const resultado = await obtenerCitaValidada(id, token);
 
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
 
    const { cita } = resultado;
 
    // Cancelar solo si sigue CONFIRMADA (evita doble cancelación).
    // Se invalida el token para que el enlace no se pueda reutilizar.
    const [actualizacion] = await pool.query<ResultSetHeader>(
      `
        UPDATE citas
        SET estado = 'CANCELADA',
            token_confirmacion = NULL
        WHERE id = ?
          AND estado = 'CONFIRMADA'
          AND asistencia_confirmada = 0
          AND token_confirmacion = ?
      `,
      [id, token]
    );
 
    if (actualizacion.affectedRows === 0) {
      return NextResponse.json(
        { error: "Esta cita ya no está disponible para cancelar." },
        { status: 409 }
      );
    }
 
    // ---- Correos (si fallan, la cancelación ya quedó guardada) ----
    const detalles = cajaDetalles([
      ["Servicio", cita.servicio_nombre],
      ["Fecha", formatearFecha(cita.fecha)],
      ["Hora", formatearHora(cita.hora)],
    ]);
 
    const envios: Promise<unknown>[] = [
      enviarCorreo({
        para: cita.cliente_email,
        asunto: "Tu cita fue cancelada",
        html: layoutCorreo(
          "Cita cancelada",
          `
            ${parrafo(`Hola ${escaparHtml(cita.cliente_nombre)},`)}
            ${parrafo("Hemos registrado la cancelación de tu cita:")}
            ${detalles}
            ${parrafo(
              "Recuerda que el reembolso no corresponderá al valor total pagado, debido a los costos de transacción generados por la pasarela de pago Wompi al momento del pago. En breve la psicóloga se comunicará contigo para coordinar los detalles."
            )}
          `
        ),
      }),
    ];
 
    if (cita.correo_psicologa) {
      envios.push(
        enviarCorreo({
          para: cita.correo_psicologa,
          asunto: "Un paciente canceló su cita",
          html: layoutCorreo(
            "Cita cancelada",
            `
              ${parrafo("Hola Aura Elisa,")}
              ${parrafo(
                `<strong>${escaparHtml(cita.cliente_nombre)}</strong> canceló la siguiente cita:`
              )}
              ${cajaDetalles([
                ["Servicio", cita.servicio_nombre],
                ["Fecha", formatearFecha(cita.fecha)],
                ["Hora", formatearHora(cita.hora)],
                ["Correo del paciente", cita.cliente_email],
                ["Teléfono del paciente", cita.cliente_telefono || "No registrado"],
              ])}
              ${parrafo(
                "El paciente fue informado de que el reembolso no será por el valor total pagado, debido a los costos de la pasarela Wompi."
              )}
              ${parrafo(
                "<strong>Por favor, comunícate con el paciente</strong> para coordinar los detalles del reembolso."
              )}
            `
          ),
        })
      );
    } else {
      console.error("No hay correo configurado para la psicóloga.");
    }
 
    const resultados = await Promise.allSettled(envios);
    resultados.forEach((r) => {
      if (r.status === "rejected") {
        console.error("Error enviando correo de cancelación:", r.reason);
      }
    });
 
    return NextResponse.json({
      mensaje: "Tu cita fue cancelada.",
      cancelada: true,
    });
  } catch (error) {
    console.error("Error al cancelar la cita:", error);
 
    return NextResponse.json(
      { error: "Ocurrió un error al procesar la cancelación." },
      { status: 500 }
    );
  }
}