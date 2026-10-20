import Link from "next/link";
import ServicioCard from "../components/ServicioCard";
import {
  obtenerServiciosPublicos,
  type CategoriaServicio,
} from "../lib/contenido-publico";

export const dynamic = "force-dynamic";

export default async function ListaServicios({
  categoria,
}: {
  categoria: CategoriaServicio;
}) {
  const servicios = await obtenerServiciosPublicos(categoria);
  const paraPersonas = categoria === "PERSONAS";
  const titulo = paraPersonas ? "Servicios para personas" : "Servicios para empresas";
  const descripcion = paraPersonas
    ? "Explora el acompañamiento psicológico y personal disponible para ti."
    : "Conoce las soluciones de bienestar y desarrollo para tu organización.";

  return (
    <main className="min-h-screen bg-[#F7F1E9] px-6 py-16 text-[#20231F] md:py-24">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/#servicios"
          className="text-sm font-medium text-[#B95B32] hover:underline"
        >
          ← Volver a servicios
        </Link>

        <header className="mx-auto mt-10 max-w-2xl text-center">
          <p className="font-serif text-lg italic text-[#C56835]">Servicios</p>
          <h1 className="mt-3 font-serif text-4xl text-[#3F4635] md:text-5xl">
            {titulo}
          </h1>
          <p className="mt-5 text-base leading-7 text-[#707469]">{descripcion}</p>
        </header>

        {servicios.length > 0 ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {servicios.map((servicio) => (
              <ServicioCard key={servicio.id} servicio={servicio} />
            ))}
          </div>
        ) : (
          <p className="mt-14 rounded-2xl border border-[#E7E0D7] bg-[#FBF9F5] p-8 text-center text-[#707469]">
            Pronto encontrarás aquí los servicios para {paraPersonas ? "personas" : "empresas"}.
          </p>
        )}
      </div>
    </main>
  );
}
