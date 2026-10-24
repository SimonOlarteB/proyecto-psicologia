"use client";

import { useEffect, useState } from "react";
import RichText from "./RichText";

export type ElementoTrayectoria = {
  id: number;
  tipo: string;
  titulo: string;
  institucion: string;
  descripcion: string;
  logo: string;
  fechaInicio: string;
  fechaFin: string;
};

const CANTIDAD_INICIAL = 4;

function etiquetasDelTipo(tipo: string) {
  switch (tipo) {
    case "TITULO":
      return { nombre: "Título", boton: "Ver título" };
    case "CURSO":
      return { nombre: "Curso", boton: "Ver curso" };
    case "DIPLOMADO":
      return { nombre: "Diplomado", boton: "Ver diplomado" };
    default:
      return { nombre: "Certificación", boton: "Ver certificación" };
  }
}

function claseInsignia(tipo: string) {
  return tipo === "TITULO"
    ? "bg-[#59614D] text-white"
    : "bg-[#E3DCD0] text-[#4A5040]";
}

function textoFechas(elemento: ElementoTrayectoria) {
  if (elemento.fechaInicio && elemento.fechaFin) {
    return `${elemento.fechaInicio} — ${elemento.fechaFin}`;
  }

  if (elemento.fechaInicio) {
    return `${elemento.fechaInicio} — Actualidad`;
  }

  return elemento.fechaFin;
}

function Logo({
  elemento,
  grande = false,
}: {
  elemento: ElementoTrayectoria;
  grande?: boolean;
}) {
  const altura = grande ? "h-14" : "h-10";

  if (elemento.logo) {
    return (
      <img
        src={elemento.logo}
        alt={`Logo de ${elemento.institucion || elemento.titulo}`}
        className={`${altura} max-w-full object-contain object-left`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex ${altura} ${grande ? "w-14" : "w-10"} items-center justify-center rounded-xl bg-[#F7F1E9] text-lg text-[#A6AA9A]`}
    >
      ✦
    </span>
  );
}

export default function TrayectoriaLista({
  elementos,
}: {
  elementos: ElementoTrayectoria[];
}) {
  const [expandido, setExpandido] = useState(false);
  const [seleccionado, setSeleccionado] =
    useState<ElementoTrayectoria | null>(null);

  // Cerrar la ventana de detalle con la tecla Escape
  useEffect(() => {
    if (!seleccionado) return;

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setSeleccionado(null);
      }
    }

    window.addEventListener("keydown", alPresionarTecla);

    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [seleccionado]);

  const visibles = expandido
    ? elementos
    : elementos.slice(0, CANTIDAD_INICIAL);

  return (
    <>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibles.map((elemento) => {
          const etiquetas = etiquetasDelTipo(elemento.tipo);
          const fechaTarjeta = elemento.fechaFin || elemento.fechaInicio;

          return (
            <article
              key={elemento.id}
              className="flex h-full flex-col rounded-[24px] bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Logo elemento={elemento} />
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${claseInsignia(elemento.tipo)}`}
                >
                  {etiquetas.nombre}
                </span>
              </div>

              <h3 className="mt-5 font-serif text-lg font-bold leading-snug text-[#20231F]">
                {elemento.titulo}
              </h3>

              {elemento.institucion && (
                <p className="mt-3 text-xs font-semibold leading-5 text-[#4A5040]">
                  {elemento.institucion}
                </p>
              )}

              {elemento.descripcion && (
                <RichText
                  value={elemento.descripcion}
                  className="mt-3 line-clamp-4 text-xs leading-5 text-[#707469]"
                />
              )}

              <div className="mt-auto pt-5">
                {fechaTarjeta && (
                  <p className="text-xs font-semibold text-[#B95B32]">
                    {fechaTarjeta}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setSeleccionado(elemento)}
                  className="mt-3 inline-flex rounded-full border border-[#59614D] px-4 py-2 text-xs font-medium text-[#3F4635] transition hover:bg-[#59614D] hover:text-white"
                >
                  {etiquetas.boton}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {elementos.length > CANTIDAD_INICIAL && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setExpandido((actual) => !actual)}
            aria-expanded={expandido}
            className="inline-flex rounded-full border border-[#59614D] px-7 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#59614D] hover:text-white"
          >
            {expandido ? "Ver menos" : "Ver más"}
          </button>
        </div>
      )}

      {/* VENTANA DE DETALLE */}
      {seleccionado && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={seleccionado.titulo}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F241B]/80 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setSeleccionado(null)}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F1E9] text-xl text-[#3F4635] transition hover:bg-[#E3DCD0]"
            >
              ×
            </button>

            <div className="flex items-center gap-3 pr-10">
              <div className="min-w-0">
                <Logo elemento={seleccionado} grande />
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${claseInsignia(seleccionado.tipo)}`}
              >
                {etiquetasDelTipo(seleccionado.tipo).nombre}
              </span>
            </div>

            <h3 className="mt-5 font-serif text-2xl font-bold leading-snug text-[#20231F]">
              {seleccionado.titulo}
            </h3>

            {seleccionado.institucion && (
              <p className="mt-2 text-sm font-semibold text-[#4A5040]">
                {seleccionado.institucion}
              </p>
            )}

            {textoFechas(seleccionado) && (
              <p className="mt-2 text-xs font-semibold text-[#B95B32]">
                {textoFechas(seleccionado)}
              </p>
            )}

            {seleccionado.descripcion && (
              <RichText
                value={seleccionado.descripcion}
                className="mt-4 text-sm leading-6 text-[#62675B]"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
