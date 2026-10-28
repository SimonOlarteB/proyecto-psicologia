import Link from "next/link";
import { Building2, Monitor } from "lucide-react";
import { formatearDuracion } from "../lib/duracion";
import type { ServicioPublico } from "../lib/contenido-publico";
import RichText from "./RichText";

function aTextoPlano(html: string) {
  return html
    .replace(/<\/(p|li|div|h[1-6])>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ServicioCard({
  servicio,
}: {
  servicio: ServicioPublico;
}) {
  const esEspecial = servicio.tipo_servicio === "ESPECIAL";
  const porcentajeDescuento = Number(servicio.porcentaje_descuento) || 0;
  const precioOriginal = Number(servicio.precio_original) || 0;
  const esPromocion =
    servicio.tipo_servicio === "PROMOCION" &&
    porcentajeDescuento > 0 &&
    precioOriginal > Number(servicio.precio);

  const etiquetaModalidad =
    servicio.modalidad === "VIRTUAL"
      ? "Virtual"
      : servicio.modalidad === "PRESENCIAL"
        ? "Presencial"
        : "Presencial y virtual";

  const IconoModalidad =
    servicio.modalidad === "PRESENCIAL" ? Building2 : Monitor;

  return (
    <article className="flex h-full min-h-[420px] flex-col rounded-[32px] border border-[#E7E0D7] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-8">
      {!esEspecial && (
        <div className="flex items-center justify-between gap-2 text-sm font-medium text-[#59614D]">
          <span className="flex items-center gap-2">
            <IconoModalidad className="h-4 w-4" aria-hidden="true" />
            <span>{etiquetaModalidad}</span>
          </span>

          {esPromocion && (
            <span className="rounded-full bg-[#BC5A32] px-3 py-1 text-xs font-semibold text-white">
              -{porcentajeDescuento} %
            </span>
          )}
        </div>
      )}

      <h3
        className={`line-clamp-2 font-serif text-2xl font-bold leading-snug text-[#20231F] md:text-[28px] ${
          esEspecial ? "" : "mt-4"
        }`}
      >
        {servicio.nombre}
      </h3>

      {servicio.descripcion ? (
        <p className="mt-4 line-clamp-4 text-base leading-7 text-[#5F6358]">
          {aTextoPlano(servicio.descripcion)}
        </p>
      ) : (
        <p className="mt-4 text-base leading-7 text-[#5F6358]">
          Conoce los detalles de este servicio.
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-[#E7E0D7] pt-6">
        {esEspecial ? (
          <p className="text-sm font-medium text-[#707469]">
            Atención personalizada · Cotización previa
          </p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-2">
            {esPromocion && (
              <span className="text-sm text-[#8A8D84] line-through">
                ${precioOriginal.toLocaleString("es-CO")}
              </span>
            )}
            <span className="text-3xl font-bold text-[#20231F]">
              ${Number(servicio.precio).toLocaleString("es-CO")}
            </span>
            <span className="text-sm text-[#707469]">
              · {formatearDuracion(servicio.duracion_minutos)}
            </span>
          </p>
        )}

        <Link
          href={`/servicios/${servicio.id}`}
          className="inline-flex rounded-full bg-[#BC5A32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#A84E2A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC5A32]"
        >
          Ver servicio
        </Link>
      </div>
    </article>
  );
}