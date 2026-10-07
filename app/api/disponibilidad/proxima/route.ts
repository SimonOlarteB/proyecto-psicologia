import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "../../../lib/db";
import {
  agregarMinutosAFechaHora,
  intervalosFechaHoraSeCruzan,
  horariosSeCruzan,
  minutosDesdeHora,
} from "../../../lib/horarios";

type ServicioRow = RowDataPacket & { duracion_minutos: number };
type HorarioRow = RowDataPacket & {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};
type EspecialRow = RowDataPacket & {
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
};
type CitaRow = RowDataPacket & {
  fecha: string;
  hora: string;
  duracion_minutos: number;
};
type BloqueoRow = RowDataPacket & { inicio: string; fin: string };

function generarHoras(horaInicio: string, horaFin: string) {
  const horas: string[] = [];
  const final = Number(horaFin.slice(0, 2));

  for (let hora = Number(horaInicio.slice(0, 2)); hora < final; hora += 1) {
    horas.push(`${String(hora).padStart(2, "0")}:00`);
  }

  return horas;
}

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const desde = parametros.get("desde") ?? "";
    const servicioId = Number(parametros.get("servicio_id"));

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(desde) ||
      Number.isNaN(Date.parse(`${desde}T12:00:00Z`)) ||
      !Number.isInteger(servicioId) ||
      servicioId <= 0
    ) {
      return NextResponse.json(
        { error: "La fecha o el servicio no son válidos." },
        { status: 400 }
      );
    }

    const [servicios] = await pool.query<ServicioRow[]>(
      `
      SELECT duracion_minutos
      FROM servicios
      WHERE id = ? AND activo = 1 AND tipo_servicio = 'NORMAL'
      LIMIT 1
      `,
      [servicioId]
    );

    if (servicios.length === 0) {
      return NextResponse.json({ error: "El servicio no está disponible." }, { status: 404 });
    }

    const [semanales, especiales, citas, bloqueos] = await Promise.all([
      pool.query<HorarioRow[]>(`
        SELECT dia_semana, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
          TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
        FROM disponibilidad
        WHERE activo = 1
        ORDER BY hora_inicio
      `),
      pool.query<EspecialRow[]>(
        `
        SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
          TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
          TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
        FROM disponibilidad_especial
        WHERE activo = 1
          AND fecha > ?
          AND fecha <= DATE_ADD(?, INTERVAL 365 DAY)
        ORDER BY fecha, hora_inicio
        `,
        [desde, desde]
      ),
      pool.query<CitaRow[]>(
        `
        SELECT DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
          TIME_FORMAT(c.hora, '%H:%i') AS hora,
          s.duracion_minutos
        FROM citas c
        INNER JOIN servicios s ON c.servicio_id = s.id
        WHERE c.fecha > ?
          AND c.fecha <= DATE_ADD(?, INTERVAL 365 DAY)
          AND c.estado IN ('PENDIENTE', 'CONFIRMADA')
        ORDER BY c.fecha, c.hora
        `,
        [desde, desde]
      ),
      pool.query<BloqueoRow[]>(
        `
        SELECT DATE_FORMAT(inicio, '%Y-%m-%dT%H:%i') AS inicio,
          DATE_FORMAT(fin, '%Y-%m-%dT%H:%i') AS fin
        FROM bloqueos_agenda
        WHERE activo = 1
          AND inicio < DATE_ADD(CONCAT(?, ' 00:00:00'), INTERVAL 366 DAY)
          AND fin > CONCAT(?, ' 00:00:00')
        ORDER BY inicio
        `,
        [desde, desde]
      ),
    ]);

    const horariosSemanales = semanales[0];
    const fechasEspeciales = especiales[0];
    const citasExistentes = citas[0];
    const bloqueosActivos = bloqueos[0];
    const duracion = Number(servicios[0].duracion_minutos) || 60;
    const fechaBase = new Date(`${desde}T12:00:00Z`);

    for (let desplazamiento = 1; desplazamiento <= 365; desplazamiento += 1) {
      const fechaCandidata = new Date(fechaBase);
      fechaCandidata.setUTCDate(fechaBase.getUTCDate() + desplazamiento);
      const fecha = fechaCandidata.toISOString().slice(0, 10);
      const especial = fechasEspeciales.find((item) => item.fecha === fecha);
      const horarios = especial
        ? especial.hora_inicio && especial.hora_fin
          ? [especial]
          : []
        : horariosSemanales.filter(
            (item) => Number(item.dia_semana) === fechaCandidata.getUTCDay()
          );
      const citasDelDia = citasExistentes.filter((cita) => cita.fecha === fecha);

      for (const horario of horarios) {
        if (!horario.hora_inicio || !horario.hora_fin) continue;

        for (const hora of generarHoras(horario.hora_inicio, horario.hora_fin)) {
          if (minutosDesdeHora(hora) + duracion > minutosDesdeHora(horario.hora_fin)) {
            continue;
          }

          const finCandidata = agregarMinutosAFechaHora(fecha, hora, duracion);
          const inicioCandidata = `${fecha}T${hora}`;
          const cruzaCita = citasDelDia.some((cita) =>
            horariosSeCruzan(hora, duracion, cita.hora, Number(cita.duracion_minutos) || 60)
          );
          const cruzaBloqueo = bloqueosActivos.some((bloqueo) =>
            intervalosFechaHoraSeCruzan(
              inicioCandidata,
              finCandidata,
              bloqueo.inicio,
              bloqueo.fin
            )
          );

          if (!cruzaCita && !cruzaBloqueo) {
            return NextResponse.json({ proxima: { fecha, hora } });
          }
        }
      }
    }

    return NextResponse.json({ proxima: null });
  } catch (error) {
    console.error("Error buscando la próxima disponibilidad:", error);
    return NextResponse.json(
      { error: "No se pudo buscar la próxima fecha disponible." },
      { status: 500 }
    );
  }
}