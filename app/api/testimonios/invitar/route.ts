import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarSesion } from "@/app/lib/auth";
import { enviarInvitacionTestimonio } from "@/app/lib/invitacion-testimonio";
 
export const runtime = "nodejs";
 
async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return verificarSesion(token);
}
 
export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();
 
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
 
    const datos = await request.json().catch(() => null);
    const citaId = Number(datos?.citaId);
 
    if (!citaId || !Number.isInteger(citaId)) {
      return NextResponse.json(
        { error: "El ID de la cita es obligatorio." },
        { status: 400 }
      );
    }
 
    const resultado = await enviarInvitacionTestimonio(citaId);
 
    if (!resultado.enviada) {
      const mensajes: Record<string, string> = {
        ya_existe:
          "Ya existe una invitación para esta cita (enviada antes, manual o automáticamente).",
        sin_correo: "Esta cita no tiene un correo de cliente registrado.",
        cita_no_valida:
          resultado.detalle ||
          "La cita no es válida para enviar un testimonio.",
        error: resultado.detalle || "No fue posible enviar la invitación.",
      };
 
      return NextResponse.json(
        { error: mensajes[resultado.motivo] },
        { status: resultado.motivo === "ya_existe" ? 409 : 400 }
      );
    }
 
    return NextResponse.json({
      mensaje: "Invitación a testimonio enviada correctamente.",
    });
  } catch (error) {
    console.error("Error enviando invitación manual de testimonio:", error);
 
    return NextResponse.json(
      { error: "No fue posible enviar la invitación." },
      { status: 500 }
    );
  }
}
 