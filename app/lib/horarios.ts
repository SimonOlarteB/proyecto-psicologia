export function minutosDesdeHora(hora: string): number {
  const [horas, minutos] = hora.slice(0, 5).split(":").map(Number);
  return horas * 60 + minutos;
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