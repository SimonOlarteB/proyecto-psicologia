type Cubeta = {
  intentos: number;
  reinicio: number;
};

const cubetas = new Map<string, Cubeta>();

const LIMPIEZA_MS = 60_000;
let ultimaLimpieza = Date.now();

function limpiarExpiradas(ahora: number) {
  if (ahora - ultimaLimpieza < LIMPIEZA_MS) {
    return;
  }

  ultimaLimpieza = ahora;

  for (const [clave, cubeta] of cubetas) {
    if (cubeta.reinicio <= ahora) {
      cubetas.delete(clave);
    }
  }
}

export function ipDelCliente(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function permitirIntento(
  clave: string,
  maximo: number,
  ventanaMs: number
): boolean {
  const ahora = Date.now();
  limpiarExpiradas(ahora);

  const existente = cubetas.get(clave);

  if (!existente || existente.reinicio <= ahora) {
    cubetas.set(clave, {
      intentos: 1,
      reinicio: ahora + ventanaMs,
    });
    return true;
  }

  if (existente.intentos >= maximo) {
    return false;
  }

  existente.intentos += 1;
  return true;
}
