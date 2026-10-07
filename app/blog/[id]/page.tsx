import Link from "next/link";

interface Publicacion {
  id: number;
  titulo: string;
  resumen: string | null;
  contenido: string;
  imagen_url: string | null;
  estado: "BORRADOR" | "PUBLICADO";
  fecha_publicacion: string | null;
  creado_en: string;
  actualizado_en: string;
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

async function obtenerPublicacion(
  id: string
): Promise<Publicacion | null> {
  try {
    const respuesta = await fetch(
      `http://localhost:3000/api/publicaciones`,
      {
        cache: "no-store",
      }
    );

    if (!respuesta.ok) {
      return null;
    }

    const publicaciones: Publicacion[] =
      await respuesta.json();

    const publicacion = publicaciones.find(
      (item) => String(item.id) === id
    );

    return publicacion || null;
  } catch (error) {
    console.error(
      "Error obteniendo publicación:",
      error
    );

    return null;
  }
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "";

  const fechaObjeto = new Date(fecha);

  if (isNaN(fechaObjeto.getTime())) {
    return "";
  }

  return fechaObjeto.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArticuloBlog({
  params,
}: Props) {
  const { id } = await params;

  const publicacion = await obtenerPublicacion(id);

  // ======================================================
  // PUBLICACIÓN NO ENCONTRADA
  // ======================================================

  if (!publicacion) {
    return (
      <main className="min-h-screen bg-[#F7F1E9] text-[#3F4635]">

        <section className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-xl text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#59614D] text-3xl text-white">
              ?
            </div>

            <p className="mt-7 font-serif text-lg italic text-[#C56835]">
              Blog
            </p>

            <h1 className="mt-3 font-serif text-4xl text-[#3F4635] md:text-5xl">
              Artículo no encontrado
            </h1>

            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#707469]">
              El artículo que estás buscando no existe o
              ya no está disponible.
            </p>

            <Link
              href="/blog"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#C56835] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#AD542B]"
            >
              ← Volver al Blog
            </Link>

          </div>
        </section>

      </main>
    );
  }

  // ======================================================
  // ARTÍCULO
  // ======================================================

  return (
    <main className="min-h-screen bg-[#F7F1E9] text-[#3F4635]">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="border-b border-[#D8D0C5] bg-[#F7F1E9]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">

          <Link
            href="/"
            className="font-serif text-xl text-[#59614D] transition hover:text-[#C56835]"
          >
            Psicología
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">

            <Link
              href="/blog"
              className="rounded-full border border-[#59614D] px-4 py-2 text-xs font-medium text-[#59614D] transition hover:bg-[#59614D] hover:text-white sm:px-5 sm:py-2.5 sm:text-sm"
            >
              ← Blog
            </Link>

            <Link
              href="/agendar"
              className="rounded-full bg-[#C56835] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#AD542B] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Agendar
            </Link>

          </div>

        </div>
      </header>

      {/* ==================================================
          HERO DEL ARTÍCULO
      ================================================== */}

      <section className="px-5 pb-10 pt-12 sm:px-8 sm:pb-14 sm:pt-16 lg:px-12">
        <div className="mx-auto max-w-5xl">

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#C56835] transition hover:text-[#AD542B]"
          >
            ← Volver a todos los artículos
          </Link>

          <div className="mt-8 max-w-4xl">

            {publicacion.fecha_publicacion && (
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#C56835] sm:text-sm">
                {formatearFecha(
                  publicacion.fecha_publicacion
                )}
              </p>
            )}

            <h1 className="mt-4 font-serif text-4xl leading-tight text-[#3F4635] sm:text-5xl md:text-6xl">
              {publicacion.titulo}
            </h1>

            {publicacion.resumen && (
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#62675B] sm:text-xl">
                {publicacion.resumen}
              </p>
            )}

          </div>
        </div>
      </section>

      {/* ==================================================
          IMAGEN PRINCIPAL
      ================================================== */}

      {publicacion.imagen_url && (
        <section className="px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] shadow-lg sm:rounded-[40px]">

            <img
              src={publicacion.imagen_url}
              alt={publicacion.titulo}
              className="max-h-[600px] w-full object-cover"
            />

          </div>
        </section>
      )}

      {/* ==================================================
          CONTENIDO
      ================================================== */}

      <article className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-[32px] bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12 md:px-14">

            <div className="whitespace-pre-line text-base leading-8 text-[#59614D] sm:text-lg sm:leading-9">
              {publicacion.contenido}
            </div>

          </div>

        </div>
      </article>

      {/* ==================================================
          CTA
      ================================================== */}

      <section className="px-5 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[#59614D] px-6 py-12 text-center text-white sm:px-10 sm:py-14">

          <p className="font-serif text-lg italic text-[#E8A67F]">
            ¿Necesitas acompañamiento?
          </p>

          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
            Da el primer paso hacia tu bienestar
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Si deseas comenzar un proceso de acompañamiento
            psicológico, puedes agendar una sesión presencial
            o virtual.
          </p>

          <Link
            href="/agendar"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#C56835] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#AD542B]"
          >
            Agendar una sesión
          </Link>

        </div>
      </section>

      {/* ==================================================
          NAVEGACIÓN FINAL
      ================================================== */}

      <section className="border-t border-[#D8D0C5] bg-white px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">

          <Link
            href="/blog"
            className="text-sm font-medium text-[#59614D] transition hover:text-[#C56835]"
          >
            ← Volver al Blog
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-[#59614D] transition hover:text-[#C56835]"
          >
            Ir al inicio →
          </Link>

        </div>
      </section>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <footer className="bg-[#3F4635] px-5 py-8 text-center text-white sm:px-8">
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} Psicología. Todos los
          derechos reservados.
        </p>
      </footer>

    </main>
  );
}