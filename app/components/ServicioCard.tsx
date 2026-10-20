import Link from "next/link";
import { formatearDuracion } from "../lib/duracion";
import type { ServicioPublico } from "../lib/contenido-publico";
import RichText from "./RichText";

export default function ServicioCard({
  servicio,
}: {
  servicio: ServicioPublico;
}) {
  return (
    <article className="flex h-full min-h-[340px] flex-col rounded-2xl border border-[#E7E0D7] bg-[#FBF9F5] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-7">
      <h3 className="line-clamp-2 min-h-[3.5rem] font-serif text-2xl text-[#3F4635]">
        {servicio.nombre}
      </h3>

      {servicio.descripcion ? (
        <RichText
          value={servicio.descripcion}
          className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#707469]"
        />
      ) : (
        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#707469]">
          Conoce los detalles de este servicio.
        </p>
      )}

      {servicio.tipo_servicio === "ESPECIAL" ? (
        <p className="mt-5 text-sm font-medium text-[#707469]">
          Atención personalizada · Cotización previa
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#707469]">
          <span>⏱️ {formatearDuracion(servicio.duracion_minutos)}</span>
          <span>💰 ${Number(servicio.precio).toLocaleString("es-CO")}</span>
          <span>
            {servicio.modalidad === "VIRTUAL"
              ? "💻 Virtual"
              : servicio.modalidad === "PRESENCIAL"
                ? "🏢 Presencial"
                : "🏢💻 Presencial y virtual"}
          </span>
        </div>
      )}

      <Link
        href={`/servicios/${servicio.id}`}
        className="mt-auto inline-flex w-fit rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#B5572A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C56835]"
      >
        Ver servicio
      </Link>
    </article>
  );
}
