"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function ConfirmarAsistencia() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id;
  const token = searchParams.get("token");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState(false);
  const [confirmada, setConfirmada] = useState(false);

  // Después de confirmar, llevar al inicio automáticamente
  useEffect(() => {
    if (!confirmada) return;
    const temporizador = setTimeout(() => router.replace("/"), 4000);
    return () => clearTimeout(temporizador);
  }, [confirmada, router]);

  async function confirmarAsistencia() {
    if (!token || cargando || confirmada) return;

    setCargando(true);
    setMensaje("");
    setError(false);

    try {
      const respuesta = await fetch(`/api/recordatorio/${id}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No fue posible confirmar tu asistencia."
        );
      }

      setConfirmada(true);
      setMensaje(resultado.mensaje);
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

        <div className="mb-5 text-5xl">{confirmada ? "✓" : "♡"}</div>

        <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
          {confirmada ? "¡Asistencia confirmada!" : "Confirma tu asistencia"}
        </h1>

        <p className="mb-8 leading-7 text-gray-600">
          {confirmada
            ? "Gracias por confirmar. Te esperamos en tu cita."
            : "Por favor, confirma que asistirás a tu próxima cita."}
        </p>

        {!token && !confirmada && (
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
              error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
            }`}
          >
            {mensaje}
          </div>
        )}

        {confirmada ? (
          <>
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
          <button
            type="button"
            onClick={confirmarAsistencia}
            disabled={cargando || !token}
            className="w-full rounded-full bg-[#59614D] px-6 py-4 font-medium text-white transition hover:bg-[#454C3B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? "Confirmando..." : "Confirmar asistencia"}
          </button>
        )}

        <p className="mt-8 text-sm text-gray-500">
          Si necesitas modificar tu cita, comunícate directamente con la
          psicóloga.
        </p>
      </section>
    </main>
  );
}

// useSearchParams necesita Suspense para que el build de Next no falle
export default function ConfirmarAsistenciaPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarAsistencia />
    </Suspense>
  );
}
