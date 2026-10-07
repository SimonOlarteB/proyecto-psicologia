import { NextResponse } from "next/server";
import { obtenerCitaValidada, ahoraBogota } from "@/app/lib/recordatorio";
import { obtenerHorasDisponibles } from "@/app/lib/disponibilidad";
 
export const runtime = "nodejs";
 
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const fecha = url.searchParams.get("fecha") ?? "";
 
    const resultado = await obtenerCitaValidada(id, token);
 
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
 
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });
    }
 
    const ahora = ahoraBogota();
 
    if (fecha < ahora.fecha) {
      return NextResponse.json({ horas: [] });
    }
 
    const { cita } = resultado;
 
    let horas = await obtenerHorasDisponibles(fecha, {
      citaId: cita.id,
      servicioId: cita.servicio_id,
      duracionMinutos: cita.servicio_duracion,
    });
 
    // Si es hoy, quitar las horas que ya pasaron
    if (fecha === ahora.fecha) {
      horas = horas.filter((h) => h > ahora.hora);
    }
 
    return NextResponse.json({ horas });
  } catch (error) {
    console.error("Error consultando disponibilidad:", error);
 
    return NextResponse.json(
      { error: "No fue posible consultar los horarios disponibles." },
      { status: 500 }
    );
  }
}
 