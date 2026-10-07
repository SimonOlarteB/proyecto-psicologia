"use client";

import { useEffect } from "react";

interface AlertaProps {
  abierto: boolean;
  tipo?: "exito" | "error" | "advertencia" | "confirmacion";
  titulo: string;
  mensaje: string;
  textoBoton?: string;
  textoCancelar?: string;
  onCerrar: () => void;
  onConfirmar?: () => void;
}

export default function Alerta({
  abierto,
  tipo = "exito",
  titulo,
  mensaje,
  textoBoton = "Aceptar",
  textoCancelar,
  onCerrar,
  onConfirmar,
}: AlertaProps) {
  useEffect(() => {
    if (!abierto) return;

    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onCerrar();
      }
    };

    document.addEventListener("keydown", manejarTecla);

    return () => {
      document.removeEventListener("keydown", manejarTecla);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const estilos = {
    exito: {
      icono: "✓",
      fondoIcono: "bg-green-100",
      colorIcono: "text-green-600",
    },
    error: {
      icono: "✕",
      fondoIcono: "bg-red-100",
      colorIcono: "text-red-600",
    },
    advertencia: {
      icono: "!",
      fondoIcono: "bg-yellow-100",
      colorIcono: "text-yellow-600",
    },
    confirmacion: {
      icono: "?",
      fondoIcono: "bg-blue-100",
      colorIcono: "text-blue-600",
    },
  };

  const estilo = estilos[tipo];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget && !onConfirmar) {
          onCerrar();
        }
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerta-titulo"
        aria-describedby="alerta-mensaje"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${estilo.fondoIcono} ${estilo.colorIcono}`}
            aria-hidden="true"
          >
            {estilo.icono}
          </div>

          <h2 id="alerta-titulo" className="text-xl font-bold text-gray-800">
            {titulo}
          </h2>

          <p
            id="alerta-mensaje"
            className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600"
          >
            {mensaje}
          </p>

          {onConfirmar ? (
            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCerrar}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-5 py-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-[0.98]"
              >
                {textoCancelar || "Cancelar"}
              </button>

              <button
                type="button"
                onClick={onConfirmar}
                className="w-full rounded-xl bg-[#59614D] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4d5542] active:scale-[0.98]"
              >
                {textoBoton}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className="mt-6 w-full rounded-xl bg-[#59614D] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4d5542] active:scale-[0.98]"
            >
              {textoBoton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
