// ======================================================
// HORAS DISPONIBLES PARA REPROGRAMAR
// ======================================================
//
// Replica exactamente la lógica de la página de agendar:
//   1. Si la fecha tiene disponibilidad ESPECIAL, esa manda
//      (si no trae hora_inicio/hora_fin, ese día no hay horarios).
//   2. Si no, se usa la disponibilidad SEMANAL del día.
//   3. Se bloquean los horarios que se cruzan con citas existentes.
//
import {
  agregarMinutosAFechaHora,
  intervalosFechaHoraSeCruzan,
  horariosSeCruzan,
  minutosDesdeHora,
} from "./horarios";

// Para no duplicar consultas a la base de datos, se leen las mismas
// rutas que ya usa la página de agendar. Requiere APP_URL en .env
// (la misma variable que ya usa el recordatorio).
 
type ContextoDisponibilidad = {
  citaId: number;
  servicioId: number;
  duracionMinutos: number | null;
};
 
function generarHoras(horaInicio: string, horaFin: string): string[] {
  const horas: string[] = [];
  let actual = Number(horaInicio.split(":")[0]);
  const final = Number(horaFin.split(":")[0]);
 
  while (actual < final) {
    horas.push(`${String(actual).padStart(2, "0")}:00`);
    actual++;
  }
 
  return horas;
}
 
async function leerJson(url: string): Promise<any> {
  const respuesta = await fetch(url, { cache: "no-store" });
 
  if (!respuesta.ok) {
    throw new Error(`Fallo al consultar ${url} (${respuesta.status})`);
  }
 
  return respuesta.json();
}
 
export async function obtenerHorasDisponibles(
  fecha: string, // "YYYY-MM-DD"
  contexto: ContextoDisponibilidad
): Promise<string[]> {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
 
  if (!appUrl) {
    throw new Error("Falta configurar APP_URL.");
  }
 
  const [semanal, especiales, citas, bloqueos] = await Promise.all([
    leerJson(`${appUrl}/api/disponibilidad`),
    leerJson(`${appUrl}/api/disponibilidad-especial`),
    leerJson(`${appUrl}/api/citas?fecha=${encodeURIComponent(fecha)}`),
    leerJson(`${appUrl}/api/bloqueos-agenda?fecha=${encodeURIComponent(fecha)}`),
  ]);
 
  const listaSemanal: any[] = Array.isArray(semanal) ? semanal : [];
  const listaEspeciales: any[] = Array.isArray(especiales) ? especiales : [];
  const listaCitas: any[] = Array.isArray(citas) ? citas : [];
  const listaBloqueos: { inicio: string; fin: string }[] =
    Array.isArray(bloqueos) ? bloqueos : [];
 
  const diaSemana = new Date(`${fecha}T12:00:00`).getDay();
 
  let horas: string[] = [];
  let horaFin = "";
 
  const especial = listaEspeciales.find(
    (item) => String(item.fecha ?? "").slice(0, 10) === fecha
  );
 
  if (especial) {
    if (especial.hora_inicio && especial.hora_fin) {
      horas = generarHoras(especial.hora_inicio, especial.hora_fin);
      horaFin = especial.hora_fin;
    }
  } else {
    const dia = listaSemanal.find(
      (item) => Number(item.dia_semana) === diaSemana
    );
 
    if (dia) {
      horas = generarHoras(dia.hora_inicio, dia.hora_fin);
      horaFin = dia.hora_fin;
    }
  }
 
  const duracionMinutos = Number(contexto.duracionMinutos) || 60;
 
  return horas.filter((hora) => {
    if (
      minutosDesdeHora(hora) + duracionMinutos >
      minutosDesdeHora(horaFin)
    ) {
      return false;
    }

    const finHora = agregarMinutosAFechaHora(fecha, hora, duracionMinutos);
    const seCruzaConBloqueo = listaBloqueos.some((bloqueo) =>
      intervalosFechaHoraSeCruzan(
        `${fecha}T${hora}`,
        finHora,
        bloqueo.inicio,
        bloqueo.fin
      )
    );

    return !seCruzaConBloqueo && !listaCitas.some((cita) =>
      Number(cita.id) !== contexto.citaId &&
      horariosSeCruzan(
        hora,
        duracionMinutos,
        String(cita.hora),
        Number(cita.duracion_minutos) || 60
      )
    );
  });
}
 