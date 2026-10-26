import Link from "next/link";
import { formatearDuracion } from "../lib/duracion";
import type { PromocionPublica } from "../lib/contenido-publico";
import RichText from "./RichText";

export default function PromocionCard({
  promocion,
}: {
  promocion: PromocionPublica;
}) {
  const precioFinal = Number(promocion.precio) || 0;
  const precioOriginal = Number(promocion.precio_original) || 0;
  const porcentaje = Number(promocion.porcentaje_descuento) || 0;

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-dashed border-[#BC5A32] bg-white p-6 sm:flex-row sm:items-center md:px-8 md:py-7">
      {porcentaje > 0 && (
        <div className="flex shrink-0 items-center justify-center self-start rounded-xl bg-[#BC5A32] px-5 py-3 text-2xl font-bold text-white sm:self-center">
          -{porcentaje} %
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 break-words text-xl font-bold leading-snug text-[#20231F]">
          {promocion.nombre}
        </h3>

        {promocion.descripcion && (
          <RichText
            value={promocion.descripcion}
            className="mt-2 line-clamp-2 break-words text-base font-medium leading-6 text-[#3F4635]"
          />
        )}

        {promocion.incluye && (
          <div className="mt-3 rounded-xl border border-[#E8C9B8] bg-[#FBF1EA] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#BC5A32]">
              Incluye
            </p>

            <p className="mt-0.5 line-clamp-2 break-words text-sm font-medium leading-5 text-[#2F3329]">
              {promocion.incluye}
            </p>
          </div>
        )}

        <p className="mt-3 flex flex-wrap items-baseline gap-2">
          {precioOriginal > precioFinal && (
            <span className="text-sm text-[#8A8D84] line-through">
              ${precioOriginal.toLocaleString("es-CO")}
            </span>
          )}

          <span className="text-2xl font-bold text-[#20231F]">
            ${precioFinal.toLocaleString("es-CO")}
          </span>

          <span className="text-xs text-[#707469]">
            · {formatearDuracion(promocion.duracion_minutos)}
          </span>
        </p>
      </div>

      <Link
        href={`/servicios/${promocion.id}`}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#59614D] px-6 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#59614D] hover:text-white"
      >
        Ver servicio
      </Link>
    </article>
  );
}
