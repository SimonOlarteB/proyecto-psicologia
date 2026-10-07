"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function CancelarCita() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id;
  const token = searchParams.get("token");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState(false);
  const [cancelada, setCancelada] = useState(false);

  useEffect(() => {
    if (!cancelada) return;
    const temporizador = setTimeout(() => router.replace("/"), 6000);
    return () => clearTimeout(temporizador);
  }, [cancelada, router]);

  async function cancelarCita() {
    if (!token || cargando || cancelada) return;

    setCargando(true);
    setMensaje("");
    setError(false);

    try {
      const respuesta = await fetch(`/api/recordatorio/${id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || "No fue posible cancelar tu cita.");
      }

      setCancelada(true);
    } catch (e) {
      setError(true);
      setMensaje(
        e instanceof Error ? e.message : "Ocurrió un error inesperado."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F1E9] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-lg sm:p-12">
        <p className="mb-3 text-sm tracking-widest text-[#C56835]">
          AURA ELISA SÁNCHEZ
        </p>

        {cancelada ? (
          <>
            <div className="mb-5 text-5xl">✓</div>

            <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
              Tu cita fue cancelada
            </h1>

            <p className="mb-8 leading-7 text-gray-600">
              En breve la psicóloga se comunicará contigo. También te enviamos
              un correo con el resumen de la cancelación.
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
              Cancelar mi cita
            </h1>

            <div className="mb-6 rounded-xl bg-amber-50 p-5 text-left text-sm leading-6 text-amber-900">
              <p className="mb-2 font-semibold">Aviso importante</p>
              <p>
                Si cancelas tu cita, el reembolso no corresponderá al valor
                total que pagaste, ya que la pasarela de pago Wompi genera
                costos de transacción en el momento del pago.
              </p>
              <p className="mt-2">
                En breve la psicóloga se comunicará contigo para coordinar los
                detalles.
              </p>
            </div>

            {!token && (
              <div
                role="alert"
                className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                El enlace está incompleto. Por favor, abre esta página desde el
                botón del correo de recordatorio.
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

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={cancelarCita}
                disabled={cargando || !token}
                className="w-full rounded-full bg-[#777777] px-6 py-4 font-medium text-white transition hover:bg-[#5f5f5f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cargando ? "Cancelando..." : "Sí, cancelar mi cita"}
              </button>

              <Link
                href="/"
                className="w-full rounded-full border border-[#59614D] px-6 py-4 font-medium text-[#59614D] transition hover:bg-[#F7F1E9]"
              >
                No, mantener mi cita
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function CancelarCitaPage() {
  return (
    <Suspense fallback={null}>
      <CancelarCita />
    </Suspense>
  );
}
