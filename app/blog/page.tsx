"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Publicacion {
  id: number;
  titulo: string;
  resumen: string | null;
  contenido: string;
  imagen_url: string | null;
  estado: "BORRADOR" | "PUBLICADO";
  fecha_publicacion: string | null;
}

export default function BlogPublico() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarPublicaciones() {
      try {
        const respuesta = await fetch("/api/publicaciones", {
          cache: "no-store",
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudieron cargar las publicaciones."
          );
        }

        setPublicaciones(datos);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las publicaciones."
        );
      } finally {
        setCargando(false);
      }
    }

    cargarPublicaciones();
  }, []);

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

  function obtenerExtracto(
    contenido: string,
    resumen: string | null
  ) {
    if (resumen?.trim()) {
      return resumen;
    }

    const texto = contenido
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (texto.length <= 180) {
      return texto;
    }

    return `${texto.substring(0, 180)}...`;
  }

  return (
    <main className="min-h-screen bg-[#F7F1E9]">

      {/* ==================================================
          ENCABEZADO
      ================================================== */}

      <section className="relative overflow-hidden bg-[#59614D] px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">

          <div className="mb-8 flex justify-end">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white hover:bg-white hover:text-[#59614D]"
            >
              ← Volver al inicio
            </Link>
          </div>

          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-[#E1DBD2]">
            Bienestar emocional
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Blog
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            Un espacio para reflexionar, aprender y encontrar
            herramientas para cuidar tu bienestar emocional.
          </p>
        </div>
      </section>

      {/* ==================================================
          CONTENIDO
      ================================================== */}

      <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-6xl">

          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20">

              <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[#E1DBD2] border-t-[#C56835]" />

              <p className="text-sm text-[#59614D]/60">
                Cargando artículos...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
                !
              </div>

              <h2 className="text-lg font-semibold text-red-700">
                No pudimos cargar el Blog
              </h2>

              <p className="mt-2 text-sm text-red-600/80">
                {error}
              </p>
            </div>
          ) : publicaciones.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#D8D2C9] bg-white px-6 py-16 text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F1E9] text-3xl">
                📝
              </div>

              <h2 className="text-xl font-semibold text-[#59614D]">
                Próximamente
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#59614D]/60">
                En este espacio encontrarás artículos y
                contenidos sobre bienestar emocional,
                psicología y desarrollo personal.
              </p>

              <Link
                href="/agendar"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#C56835] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ad572c]"
              >
                Agendar una cita
              </Link>
            </div>
          ) : (
            <>
              {/* ==================================================
                  TÍTULO
              ================================================== */}

              <div className="mb-8">
                <p className="text-sm font-medium text-[#C56835]">
                  Artículos recientes
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-[#59614D] sm:text-3xl">
                  Recursos para tu bienestar
                </h2>
              </div>

              {/* ==================================================
                  ARTÍCULOS
              ================================================== */}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {publicaciones.map((publicacion) => (
                  <article
                    key={publicacion.id}
                    className="group overflow-hidden rounded-3xl border border-[#E1DBD2] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >

                    {/* IMAGEN */}

                    <div className="relative aspect-[16/10] overflow-hidden bg-[#E1DBD2]">

                      {publicacion.imagen_url ? (
                        <img
                          src={publicacion.imagen_url}
                          alt={publicacion.titulo}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#59614D]">
                          <div className="text-center text-white">
                            <div className="text-4xl">
                              ✦
                            </div>

                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/60">
                              Bienestar
                            </p>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* INFORMACIÓN */}

                    <div className="p-6">

                      {publicacion.fecha_publicacion && (
                        <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-[#C56835]">
                          {formatearFecha(
                            publicacion.fecha_publicacion
                          )}
                        </p>
                      )}

                      <h3 className="text-xl font-semibold leading-tight text-[#59614D]">
                        {publicacion.titulo}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#59614D]/65">
                        {obtenerExtracto(
                          publicacion.contenido,
                          publicacion.resumen
                        )}
                      </p>

                     <Link
  href={`/blog/${publicacion.id}`}
  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#C56835] transition group-hover:gap-3"
>
  Leer artículo
  <span>→</span>
</Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

        </div>
      </section>

      {/* ==================================================
          CTA
      ================================================== */}

      <section className="px-5 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#E1DBD2] px-6 py-10 text-center sm:px-10 sm:py-12">

          <p className="text-sm font-medium text-[#C56835]">
            ¿Quieres dar el siguiente paso?
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-[#59614D] sm:text-3xl">
            Agenda un espacio para ti
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#59614D]/65">
            Si sientes que necesitas acompañamiento,
            puedes agendar una consulta presencial o virtual.
          </p>

          <Link
            href="/agendar"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#C56835] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad572c]"
          >
            Agendar cita
          </Link>
        </div>
      </section>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <footer className="border-t border-[#E1DBD2] bg-white px-5 py-8 text-center sm:px-8">
        <p className="text-sm text-[#59614D]/60">
          © {new Date().getFullYear()} Psicología. Todos los derechos reservados.
        </p>
      </footer>

    </main>
  );
}