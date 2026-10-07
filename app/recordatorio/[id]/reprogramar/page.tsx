"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function hoyBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatearHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

function ReprogramarCita() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id;
  const token = searchParams.get("token");

  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState<string[]>([]);
  const [hora, setHora] = useState("");
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState(false);
  const [reprogramada, setReprogramada] = useState(false);

  useEffect(() => {
    if (!reprogramada) return;
    const temporizador = setTimeout(() => router.replace("/"), 6000);
    return () => clearTimeout(temporizador);
  }, [reprogramada, router]);

  // Cargar horas disponibles cuando cambia la fecha
  useEffect(() => {
    if (!fecha || !token) return;

    let cancelado = false;

    async function cargarHoras() {
      setCargandoHoras(true);
      setHoras([]);
      setHora("");
      setMensaje("");
      setError(false);

      try {
        const respuesta = await fetch(
          `/api/recordatorio/${id}/disponibilidad?fecha=${fecha}&token=${encodeURIComponent(
            token as string
          )}`
        );
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.error || "No fue posible consultar los horarios."
          );
        }

        if (!cancelado) setHoras(resultado.horas ?? []);
      } catch (e) {
        if (!cancelado) {
          setError(true);
          setMensaje(
            e instanceof Error ? e.message : "Ocurrió un error inesperado."
          );
        }
      } finally {
        if (!cancelado) setCargandoHoras(false);
      }
    }

    cargarHoras();

    return () => {
      cancelado = true;
    };
  }, [fecha, id, token]);

  async function reprogramar() {
    if (!token || !fecha || !hora || guardando || reprogramada) return;

    setGuardando(true);
    setMensaje("");
    setError(false);

    try {
      const respuesta = await fetch(`/api/recordatorio/${id}/reprogramar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fecha, hora }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No fue posible reprogramar tu cita."
        );
      }

      setReprogramada(true);
      setMensaje(resultado.mensaje);
    } catch (e) {
      setError(true);
      setMensaje(
        e instanceof Error ? e.message : "Ocurrió un error inesperado."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F1E9] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-lg sm:p-12">
        <p className="mb-3 text-sm tracking-widest text-[#C56835]">
          AURA ELISA SÁNCHEZ
        </p>

        {reprogramada ? (
          <>
            <div className="mb-5 text-5xl">✓</div>

            <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
              ¡Cita reprogramada!
            </h1>

            <p className="mb-2 leading-7 text-gray-600">{mensaje}</p>
            <p className="mb-8 text-sm leading-6 text-gray-500">
              Te enviamos un correo con los detalles.
            </p>

            <p className="mb-4 text-sm text-gray-500">
              Te llevaremos al inicio en unos segundos…
            </p>

            <Link
              href="/"
              className="inline-block rounded-full bg-[#59614D] px-8 py-3 font-medium text-white transition hover:bg-[#454C3B]"
            >
              Ir al inicio ahora
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
              Reprograma tu cita
            </h1>

            <p className="mb-6 leading-7 text-gray-600">
              Elige la nueva fecha y la hora que prefieras entre los horarios
              disponibles.
            </p>

            {!token && (
              <div
                role="alert"
                className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                El enlace está incompleto. Por favor, abre esta página desde el
                botón del correo de recordatorio.
              </div>
            )}

            <div className="mb-6 text-left">
              <label
                htmlFor="fecha"
                className="mb-2 block text-sm font-medium text-[#3F4635]"
              >
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                min={hoyBogota()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={!token}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-700 focus:border-[#59614D] focus:outline-none disabled:opacity-50"
              />
            </div>

            {fecha && (
              <div className="mb-6 text-left">
                <p className="mb-2 text-sm font-medium text-[#3F4635]">Hora</p>

                {cargandoHoras ? (
                  <p className="text-sm text-gray-500">
                    Consultando horarios disponibles…
                  </p>
                ) : horas.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay horarios disponibles para esta fecha. Prueba con otro
                    día.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {horas.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHora(h)}
                        className={`rounded-xl border px-2 py-3 text-sm transition ${
                          hora === h
                            ? "border-[#59614D] bg-[#59614D] text-white"
                            : "border-gray-300 text-gray-700 hover:border-[#59614D]"
                        }`}
                      >
                        {formatearHora(h)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mensaje && (
              <div
                role="status"
                className={`mb-6 rounded-xl p-4 text-sm ${
                  error
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-800"
                }`}
              >
                {mensaje}
              </div>
            )}

            <button
              type="button"
              onClick={reprogramar}
              disabled={guardando || !token || !fecha || !hora}
              className="w-full rounded-full bg-[#C56835] px-6 py-4 font-medium text-white transition hover:bg-[#a95628] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? "Reprogramando..." : "Confirmar reprogramación"}
            </button>

            <Link
              href="/"
              className="mt-4 inline-block text-sm text-gray-500 underline"
            >
              Volver al inicio
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function ReprogramarCitaPage() {
  return (
    <Suspense fallback={null}>
      <ReprogramarCita />
    </Suspense>
  );
}
