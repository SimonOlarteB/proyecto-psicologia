export function formatearDuracion(duracionMinutos: number) {
  const dias = Math.floor(duracionMinutos / 1440);
  const horas = Math.floor((duracionMinutos % 1440) / 60);
  const minutos = duracionMinutos % 60;
  const partes: string[] = [];

  if (dias > 0) {
    partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  }

  if (horas > 0) {
    partes.push(`${horas} ${horas === 1 ? "hora" : "horas"}`);
  }

  if (minutos > 0) {
    partes.push(
      `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`
    );
  }

  return partes.join(" y ") || "0 minutos";
}
