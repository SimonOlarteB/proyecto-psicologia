"use client";

import { useEffect, useState } from "react";

export default function ResultadoPagoPage() {
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setCargando(false);
    }, 1000);

    return () => clearTimeout(temporizador);
  }, []);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F1E9] px-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#D8D0C5] border-t-[#C56835]" />

          <p className="mt-5 text-sm text-[#707469]">
            Estamos verificando tu pago...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F1E9] px-6 py-12 text-[#3F4635]">
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 text-center shadow-sm md:p-10">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#59614D] text-4xl text-white">
            ✓
          </div>

          <p className="mt-7 font-serif text-lg italic text-[#C56835]">
            Proceso de pago
          </p>

          <h1 className="mt-2 font-serif text-3xl text-[#3F4635] md:text-4xl">
            Hemos recibido tu solicitud
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#707469]">
            Estamos verificando el estado de tu pago.
            Recibirás la confirmación de tu cita una vez
            que la transacción haya sido procesada.
          </p>

          <div className="mt-8 rounded-2xl bg-[#F7F1E9] p-5 text-left">
            <p className="text-sm leading-6 text-[#707469]">
              Si el pago fue aprobado, tu cita quedará
              confirmada automáticamente.
            </p>

            <p className="mt-3 text-sm leading-6 text-[#707469]">
              Si tienes alguna duda sobre tu reserva,
              puedes comunicarte directamente con la
              psicóloga.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-8 w-full rounded-full bg-[#C56835] px-6 py-4 font-medium text-white transition hover:bg-[#B5572A]"
          >
            Volver al inicio
          </button>

        </div>
      </div>
    </main>
  );
}