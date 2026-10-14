export function minutosDesdeHora(hora: string): number {
  const [horas, minutos] = hora.slice(0, 5).split(":").map(Number);
  return horas * 60 + minutos;
}

export function obtenerFechasHabiles(fechaInicio: string, cantidadDias: number): string[] {
  const fechaActual = new Date(`${fechaInicio}T12:00:00Z`);

  if (
    Number.isNaN(fechaActual.getTime()) ||
    !Number.isInteger(cantidadDias) ||
    cantidadDias <= 0
  ) {
    throw new Error("La fecha inicial o la cantidad de días hábiles no son válidas.");
  }

  const fechas: string[] = [];

  while (fechas.length < cantidadDias) {
    const diaSemana = fechaActual.getUTCDay();

    if (diaSemana !== 0 && diaSemana !== 6) {
      fechas.push(fechaActual.toISOString().slice(0, 10));
    }

    fechaActual.setUTCDate(fechaActual.getUTCDate() + 1);
  }

  return fechas;
}

export function horariosSeCruzan(
  horaInicioPrimera: string,
  duracionPrimera: number,
  horaInicioSegunda: string,
  duracionSegunda: number
): boolean {
  const inicioPrimera = minutosDesdeHora(horaInicioPrimera);
  const inicioSegunda = minutosDesdeHora(horaInicioSegunda);

  return (
    inicioPrimera < inicioSegunda + Number(duracionSegunda) &&
    inicioSegunda < inicioPrimera + Number(duracionPrimera)
  );
}

export function agregarMinutosAFechaHora(
  fecha: string,
  hora: string,
  minutos: number
): string {
  const instante = Date.parse(`${fecha}T${hora.slice(0, 5)}:00Z`);

  return new Date(instante + Number(minutos) * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function intervalosFechaHoraSeCruzan(
  inicioPrimero: string,
  finPrimero: string,
  inicioSegundo: string,
  finSegundo: string
): boolean {
  return inicioPrimero < finSegundo && inicioSegundo < finPrimero;
}