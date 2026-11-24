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
  generarHorasDisponibles,
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

// Forma de las respuestas JSON de las rutas
// que consulta obtenerHorasDisponibles.
type DisponibilidadSemanal = {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};

type DisponibilidadEspecial = {
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
};

type CitaAgenda = {
  id: number;
  hora: string;
  duracion_minutos?: number | null;
};
 
function generarHoras(horaInicio: string, horaFin: string): string[] {
  return generarHorasDisponibles(horaInicio, horaFin, 1);
}
 
async function leerJson(url: string): Promise<unknown> {
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
 
  const listaSemanal: DisponibilidadSemanal[] =
    Array.isArray(semanal) ? semanal : [];
  const listaEspeciales: DisponibilidadEspecial[] =
    Array.isArray(especiales) ? especiales : [];
  const listaCitas: CitaAgenda[] =
    Array.isArray(citas) ? citas : [];
  const listaBloqueos: { inicio: string; fin: string }[] =
    Array.isArray(bloqueos) ? bloqueos : [];
 
  const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const horariosEspeciales = listaEspeciales.filter(
    (item) => String(item.fecha ?? "").slice(0, 10) === fecha
  );
  const horarios = horariosEspeciales.length > 0
    ? horariosEspeciales.flatMap((item) =>
        item.hora_inicio && item.hora_fin
          ? [{ hora_inicio: item.hora_inicio, hora_fin: item.hora_fin }]
          : []
      )
    : listaSemanal
        .filter((item) => Number(item.dia_semana) === diaSemana)
        .map((item) => ({
          hora_inicio: item.hora_inicio,
          hora_fin: item.hora_fin,
        }));
  const duracionMinutos = Number(contexto.duracionMinutos) || 60;
  const horas = [
    ...new Set(
      horarios.flatMap((horario) =>
        generarHoras(horario.hora_inicio, horario.hora_fin)
      )
    ),
  ];
 
  return horas.filter((hora) => {
    const dentroDelHorario = horarios.some(
      (horario) =>
        minutosDesdeHora(hora) >= minutosDesdeHora(horario.hora_inicio) &&
        minutosDesdeHora(hora) + duracionMinutos <=
          minutosDesdeHora(horario.hora_fin)
    );

    if (!dentroDelHorario) {
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
 