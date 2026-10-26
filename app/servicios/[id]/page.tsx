import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearDuracion } from "../../lib/duracion";
import {
  obtenerPerfilPublico,
  obtenerServicioPublico,
} from "../../lib/contenido-publico";
import RichText from "../../components/RichText";

export const dynamic = "force-dynamic";

export default async function ServicioDetallePage({
  params,
}: PageProps<"/servicios/[id]">) {
  const { id } = await params;

  const servicioId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(servicioId) || servicioId <= 0) {
    notFound();
  }

  const [servicio, perfil] = await Promise.all([
    obtenerServicioPublico(servicioId),
    obtenerPerfilPublico(),
  ]);

  if (!servicio) notFound();

  const whatsapp = String(perfil?.whatsapp ?? "").replace(/\D/g, "");
  const whatsappLink =
    whatsapp.length === 10 ? `57${whatsapp}` : whatsapp;
  const esCotizable = servicio.tipo_servicio === "ESPECIAL";
  const enlaceWhatsApp = `https://wa.me/${whatsappLink}?text=${encodeURIComponent(
    `Hola, quisiera cotizar el servicio ${servicio.nombre}.`
  )}`;

  return (
    <main className="min-h-screen bg-[#F7F1E9] px-6 py-16 text-[#20231F] md:py-24">
      <article className="mx-auto max-w-3xl">
        <Link
          href={servicio.categoria === "EMPRESAS" ? "/servicios/empresas" : "/servicios/personas"}
          className="text-sm font-medium text-[#B95B32] hover:underline"
        >
          ← Ver servicios de {servicio.categoria === "EMPRESAS" ? "empresas" : "personas"}
        </Link>

        <div className="mt-8 rounded-3xl border border-[#E7E0D7] bg-[#FBF9F5] p-7 shadow-sm md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#B95B32]">
            {servicio.categoria === "EMPRESAS" ? "Para empresas" : "Para personas"}
          </p>
<h1 className="mt-3 font-serif text-3xl text-[#3F4635] md:text-4xl [overflow-wrap:anywhere]">            {servicio.nombre}
          </h1>
          {servicio.descripcion ? (
           <RichText
  value={servicio.descripcion}
  className="mt-5 text-base leading-7 text-[#707469] [overflow-wrap:anywhere]"
/>
          ) : (
            <p className="mt-5 text-base leading-7 text-[#707469]">
              Consulta con nosotros los detalles de este servicio.
            </p>
          )}

          {esCotizable ? (
            <div className="mt-8">
              {whatsappLink ? (
                <a
                  href={enlaceWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#B5572A]"
                >
                  Cotizar por WhatsApp
                </a>
              ) : (
                <p className="text-sm text-[#A94F24]">
                  WhatsApp no está configurado actualmente.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#707469]">
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
              <Link
                href={`/agendar?servicio_id=${servicio.id}`}
                className="mt-8 inline-flex rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#B5572A]"
              >
                Agendar sesión
              </Link>
            </>
          )}
        </div>
      </article>
    </main>
  );
}
