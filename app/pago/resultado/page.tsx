"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type EstadoPago =
  | "APROBADO"
  | "RECHAZADO"
  | "CANCELADO"
  | "PENDIENTE";

const estadosFinales: EstadoPago[] = [
  "APROBADO",
  "RECHAZADO",
  "CANCELADO",
];

function esEstadoPago(valor: unknown): valor is EstadoPago {
  return (
    typeof valor === "string" &&
    ["APROBADO", "RECHAZADO", "CANCELADO", "PENDIENTE"].includes(
      valor
    )
  );
}

function ResultadoPago() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idTransaccion = searchParams.get("id");
  const [estado, setEstado] = useState<EstadoPago | "ERROR">("PENDIENTE");
  const estadoActual = idTransaccion ? estado : "SIN_ID";

  useEffect(() => {
    if (!idTransaccion) return;

    const transaccionId = idTransaccion;

    let cancelado = false;
    let intentos = 0;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let ultimoError: unknown;

    async function consultarEstado() {
      try {
        const respuesta = await fetch(
          `/api/pagos/estado?id=${encodeURIComponent(transaccionId)}`,
          { cache: "no-store" }
        );

        if (!respuesta.ok) {
          throw new Error("No fue posible consultar el estado del pago.");
        }

        const resultado: { estado?: unknown } = await respuesta.json();

        if (!esEstadoPago(resultado.estado)) {
          throw new Error("La respuesta del estado del pago no es válida.");
        }

        if (cancelado) return;
        ultimoError = undefined;

        if (estadosFinales.includes(resultado.estado)) {
          setEstado(resultado.estado);
          return;
        }
      } catch (error) {
        ultimoError = error;
      }

      if (cancelado) return;

      intentos++;
      if (intentos >= 30) {
        if (ultimoError) {
          console.error(
            "No se pudo verificar el pago después de varios intentos:",
            ultimoError
          );
          setEstado("ERROR");
        } else {
          setEstado("PENDIENTE");
        }
        return;
      }

      temporizador = setTimeout(consultarEstado, 2000);
    }

    void consultarEstado();

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [idTransaccion]);

  useEffect(() => {
    if (estado !== "APROBADO") return;

    const temporizador = setTimeout(
      () => router.replace("/?pago=aprobado"),
      7000
    );
    return () => clearTimeout(temporizador);
  }, [estado, router]);

  const aprobado = estadoActual === "APROBADO";
  const rechazado = estadoActual === "RECHAZADO";
  const cancelado = estadoActual === "CANCELADO";

  return (
    <main className="min-h-screen bg-[#F7F1E9] px-6 py-12 text-[#3F4635]">
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 text-center shadow-sm md:p-10">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl text-white ${
              aprobado
                ? "bg-[#59614D]"
                  : rechazado || cancelado || estadoActual === "ERROR"
                  ? "bg-red-700"
                  : "bg-[#C56835]"
            }`}
          >
            {aprobado ? "✓" : rechazado || cancelado ? "!" : "…"}
          </div>

          <p className="mt-7 font-serif text-lg italic text-[#C56835]">
            Proceso de pago
          </p>

          <h1 className="mt-2 font-serif text-3xl text-[#3F4635] md:text-4xl">
            {aprobado
              ? "¡Pago aprobado!"
              : rechazado
                ? "Pago no aprobado"
                : cancelado
                  ? "Pago cancelado"
                  : estadoActual === "ERROR"
                    ? "No pudimos verificar el pago"
                    : "Estamos verificando tu pago"}
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#707469]">
            {aprobado
              ? "La confirmación de tu cita te llegará al correo electrónico."
              : rechazado
                ? "El pago no fue aprobado. Puedes volver a intentarlo o comunicarte con la psicóloga."
                : cancelado
                  ? "El pago fue cancelado y la cita no quedó confirmada."
                  : estadoActual === "ERROR"
                    ? "No pudimos consultar el estado en este momento. Si el pago fue aprobado, la confirmación de la cita llegará a tu correo electrónico."
                    : "Estamos esperando la confirmación segura de Wompi. Si el pago es aprobado, la confirmación de tu cita llegará al correo electrónico."}
          </p>

          <Link
            href={rechazado || cancelado ? "/agendar" : "/"}
            className="mt-8 inline-block w-full rounded-full bg-[#C56835] px-6 py-4 font-medium text-white transition hover:bg-[#B5572A]"
          >
            {rechazado || cancelado ? "Volver a intentar" : "Volver al inicio"}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResultadoPagoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7F1E9] px-6">
          <p className="text-sm text-[#707469]">
            Estamos verificando tu pago...
          </p>
        </main>
      }
    >
      <ResultadoPago />
    </Suspense>
  );
}
