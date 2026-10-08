import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { enviarCorreo } from "@/app/lib/email";
import { obtenerHorasDisponibles } from "@/app/lib/disponibilidad";
import { actualizarEventoGoogleCalendar } from "@/app/lib/google-calendar";
import {
  ahoraBogota,
  bloqueModalidad,
  cajaDetalles,
  escaparHtml,
  formatearFecha,
  formatearHora,
  layoutCorreo,
  obtenerCitaValidada,
  parrafo,
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
    const fecha = body?.fecha;
    const hora = body?.hora;
 
    const resultado = await obtenerCitaValidada(id, token);
 
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
 
    const { cita } = resultado;
 
    if (
      typeof fecha !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      typeof hora !== "string" ||
      !/^\d{2}:\d{2}$/.test(hora)
    ) {
      return NextResponse.json(
        { error: "Selecciona una fecha y una hora válidas." },
        { status: 400 }
      );
    }
 
    const ahora = ahoraBogota();
 
    if (`${fecha} ${hora}` <= `${ahora.fecha} ${ahora.hora}`) {
      return NextResponse.json(
        { error: "La nueva fecha y hora deben ser posteriores a este momento." },
        { status: 400 }
      );
    }
 
    // Revalidar que la hora siga disponible
    const disponibles = await obtenerHorasDisponibles(fecha, {
      citaId: cita.id,
      servicioId: cita.servicio_id,
      duracionMinutos: cita.servicio_duracion,
    });
 
    if (!disponibles.includes(hora)) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible. Elige otro." },
        { status: 409 }
      );
    }
 
    // Datos anteriores (para los correos)
    const fechaAnterior = formatearFecha(cita.fecha);
    const horaAnterior = formatearHora(cita.hora);
 
    // Se reinician confirmación y recordatorio para la nueva fecha,
    // y se invalida el token del correo anterior.
    const [actualizacion] = await pool.query<ResultSetHeader>(
      `
        UPDATE citas
        SET fecha = ?,
            hora = ?,
            recordatorio_12h_enviado = 0,
            asistencia_confirmada = 0,
            token_confirmacion = NULL
        WHERE id = ?
          AND estado = 'CONFIRMADA'
          AND token_confirmacion = ?
      `,
      [fecha, `${hora}:00`, id, token]
    );
 
    if (actualizacion.affectedRows === 0) {
      return NextResponse.json(
        { error: "Esta cita ya no está disponible para reprogramar." },
        { status: 409 }
      );
    }
 
    const fechaNueva = formatearFecha(fecha);
    const horaNueva = formatearHora(hora);
 
    // Si la cita es virtual y ya tiene un evento de Google Calendar,
    // se actualiza la fecha/hora de ESE MISMO evento — el enlace de
    // Meet no cambia, solo el horario del evento en el calendario.
    if (cita.modalidad === "VIRTUAL" && cita.google_event_id) {
      try {
        await actualizarEventoGoogleCalendar({
          eventId: cita.google_event_id,
          fecha,
          hora: `${hora}:00`,
          duracionMinutos: cita.servicio_duracion ?? 60,
        });
      } catch (errorCalendar) {
        // No se bloquea la reprogramación si Calendar falla;
        // solo queda registrado para revisarlo manualmente.
        console.error(
          "No fue posible actualizar el evento de Google Calendar al reprogramar:",
          errorCalendar
        );
      }
    }
 
    const detalles = cajaDetalles([
      ["Servicio", cita.servicio_nombre],
      ["Fecha anterior", `${fechaAnterior}, ${horaAnterior}`],
      ["Nueva fecha", `${fechaNueva}, ${horaNueva}`],
    ]);
 
    const modalidadHtml = bloqueModalidad(cita);
 
    const envios: Promise<unknown>[] = [
      enviarCorreo({
        para: cita.cliente_email,
        asunto: "Tu cita fue reprogramada",
        html: layoutCorreo(
          "Cita reprogramada",
          `
            ${parrafo(`Hola ${escaparHtml(cita.cliente_nombre)},`)}
            ${parrafo("Tu cita fue reprogramada correctamente:")}
            ${detalles}
            ${modalidadHtml}
            ${parrafo(
              "Recibirás un recordatorio 12 horas antes de tu nueva cita."
            )}
          `
        ),
      }),
    ];
 
    if (cita.correo_psicologa) {
      envios.push(
        enviarCorreo({
          para: cita.correo_psicologa,
          asunto: "Un paciente reprogramó su cita",
          html: layoutCorreo(
            "Cita reprogramada",
            `
              ${parrafo("Hola Aura Elisa,")}
              ${parrafo(
                `<strong>${escaparHtml(cita.cliente_nombre)}</strong> reprogramó su cita:`
              )}
              ${cajaDetalles([
                ["Servicio", cita.servicio_nombre],
                ["Fecha anterior", `${fechaAnterior}, ${horaAnterior}`],
                ["Nueva fecha", `${fechaNueva}, ${horaNueva}`],
                ["Correo del paciente", cita.cliente_email],
                ["Teléfono del paciente", cita.cliente_telefono || "No registrado"],
              ])}
              ${modalidadHtml}
            `
          ),
        })
      );
    } else {
      console.error("No hay correo configurado para la psicóloga.");
    }
 
    const enviados = await Promise.allSettled(envios);
    enviados.forEach((r) => {
      if (r.status === "rejected") {
        console.error("Error enviando correo de reprogramación:", r.reason);
      }
    });
 
    return NextResponse.json({
      mensaje: `Tu cita fue reprogramada para el ${fechaNueva} a las ${horaNueva}.`,
      reprogramada: true,
    });
  } catch (error) {
    console.error("Error al reprogramar la cita:", error);
 
    return NextResponse.json(
      { error: "Ocurrió un error al reprogramar la cita." },
      { status: 500 }
    );
  }
}
 