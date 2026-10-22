import type { PromocionPublica } from "../lib/contenido-publico";
import RichText from "./RichText";

export default function PromocionCard({
  promocion,
  whatsappLink,
}: {
  promocion: PromocionPublica;
  whatsappLink: string;
}) {
  const enlacePersonalizado = promocion.enlace?.trim();
  const esAgendar = promocion.accion === "AGENDAR";

  const mensajeWhatsapp = `Hola, me interesa la promoción "${promocion.titulo}" y quisiera cotizar.`;

  let href: string;

  if (enlacePersonalizado) {
    href = enlacePersonalizado;
  } else if (esAgendar) {
    href = promocion.servicio_id
      ? `/agendar?servicio_id=${promocion.servicio_id}&promocion_id=${promocion.id}`
      : "/agendar";
  } else if (whatsappLink) {
    href = `https://wa.me/${whatsappLink}?text=${encodeURIComponent(mensajeWhatsapp)}`;
  } else {
    href = "#contacto";
  }

  const esExterno = /^https?:\/\//.test(href);

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-dashed border-[#BC5A32] bg-white p-6 sm:flex-row sm:items-center md:px-8 md:py-7">
      {promocion.porcentaje_descuento > 0 && (
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-[#BC5A32] px-5 py-3 text-2xl font-bold text-white">
          -{promocion.porcentaje_descuento} %
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold leading-snug text-[#20231F]">
          {promocion.titulo}
        </h3>

        <RichText
          value={promocion.descripcion}
          className="mt-1 text-sm leading-6 text-[#5F6358]"
        />

        {!esAgendar && (
          <p className="mt-1 text-xs text-[#707469]">
            Atención personalizada · Cotización previa
          </p>
        )}
      </div>

      <a
        href={href}
        target={esExterno ? "_blank" : undefined}
        rel={esExterno ? "noopener noreferrer" : undefined}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#59614D] px-6 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#59614D] hover:text-white"
      >
        {esAgendar ? "Agendar" : "Cotizar"}
      </a>
    </article>
  );
}
