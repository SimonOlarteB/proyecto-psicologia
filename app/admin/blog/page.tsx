"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminNav from "../../components/AdminNav";

type EstadoPublicacion = "BORRADOR" | "PUBLICADO";

interface Publicacion {
  id: number;
  titulo: string;
  resumen: string | null;
  contenido: string;
  imagen_url: string | null;
  estado: EstadoPublicacion;
  fecha_publicacion: string | null;
  creado_en: string;
  actualizado_en: string;
}

const publicacionInicial = {
  titulo: "",
  resumen: "",
  contenido: "",
  imagen_url: "",
  estado: "BORRADOR" as EstadoPublicacion,
  fecha_publicacion: "",
};

export default function BlogAdmin() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [formulario, setFormulario] = useState(publicacionInicial);
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [vistaPreviaImagen, setVistaPreviaImagen] = useState("");

  const [filtro, setFiltro] = useState<
    "TODAS" | "PUBLICADO" | "BORRADOR"
  >("TODAS");

  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"exito" | "error">(
    "exito"
  );

  const [confirmacion, setConfirmacion] = useState<{
    mostrar: boolean;
    id: number | null;
  }>({
    mostrar: false,
    id: null,
  });

  // ======================================================
  // CARGAR PUBLICACIONES
  // ======================================================

  async function cargarPublicaciones() {
    try {
      const respuesta = await fetch(
        "/api/publicaciones?admin=true",
        {
          cache: "no-store",
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudieron cargar las publicaciones."
        );
      }

      setPublicaciones(datos);
    } catch (error) {
      console.error(error);

      mostrarMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las publicaciones.",
        "error"
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let activa = true;

    void fetch("/api/publicaciones?admin=true", {
      cache: "no-store",
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudieron cargar las publicaciones."
          );
        }

        if (activa) setPublicaciones(datos);
      })
      .catch((error: unknown) => {
        if (!activa) return;

        console.error(error);
        mostrarMensaje(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las publicaciones.",
          "error"
        );
      })
      .finally(() => {
        if (activa) setCargando(false);
      });

    return () => {
      activa = false;
    };
  }, []);

  // ======================================================
  // MENSAJES
  // ======================================================

  function mostrarMensaje(
    texto: string,
    tipo: "exito" | "error"
  ) {
    setMensaje(texto);
    setTipoMensaje(tipo);

    setTimeout(() => {
      setMensaje("");
    }, 3500);
  }

  // ======================================================
  // FORMULARIO
  // ======================================================

  function abrirNuevaPublicacion() {
    setEditandoId(null);

    setFormulario({
      ...publicacionInicial,
    });
    setArchivoImagen(null);
    setVistaPreviaImagen("");

    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editarPublicacion(publicacion: Publicacion) {
    setEditandoId(publicacion.id);

    let fecha = "";

    if (publicacion.fecha_publicacion) {
      const fechaObjeto = new Date(publicacion.fecha_publicacion);

      if (!isNaN(fechaObjeto.getTime())) {
        const year = fechaObjeto.getFullYear();
        const month = String(
          fechaObjeto.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
          fechaObjeto.getDate()
        ).padStart(2, "0");

        fecha = `${year}-${month}-${day}`;
      }
    }

    setFormulario({
      titulo: publicacion.titulo || "",
      resumen: publicacion.resumen || "",
      contenido: publicacion.contenido || "",
      imagen_url: publicacion.imagen_url || "",
      estado: publicacion.estado,
      fecha_publicacion: fecha,
    });
    setArchivoImagen(null);
    setVistaPreviaImagen(publicacion.imagen_url || "");

    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cerrarFormulario() {
    if (guardando) return;

    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario({
      ...publicacionInicial,
    });
    setArchivoImagen(null);
    setVistaPreviaImagen("");
  }

  function cambiarCampo(
    campo: keyof typeof formulario,
    valor: string
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function seleccionarImagen(archivo?: File) {
    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      mostrarMensaje("Solo puedes subir imágenes JPG, PNG o WEBP.", "error");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      mostrarMensaje("La imagen no puede superar los 5 MB.", "error");
      return;
    }

    setArchivoImagen(archivo);
    setVistaPreviaImagen(URL.createObjectURL(archivo));
  }

  // ======================================================
  // GUARDAR
  // ======================================================

  async function guardarPublicacion() {
    if (!formulario.titulo.trim()) {
      mostrarMensaje(
        "El título es obligatorio.",
        "error"
      );
      return;
    }

    if (!formulario.contenido.trim()) {
      mostrarMensaje(
        "El contenido es obligatorio.",
        "error"
      );
      return;
    }

    try {
      setGuardando(true);

      let imagenUrl = formulario.imagen_url.trim() || null;

      if (archivoImagen) {
        const datosImagen = new FormData();
        datosImagen.append("file", archivoImagen);

        const respuestaImagen = await fetch("/api/publicaciones/upload", {
          method: "POST",
          body: datosImagen,
        });

        const resultadoImagen = await respuestaImagen.json();

        if (!respuestaImagen.ok) {
          throw new Error(
            resultadoImagen.error || "No se pudo subir la imagen."
          );
        }

        imagenUrl = resultadoImagen.url;
      }

      const datos = {
        titulo: formulario.titulo.trim(),
        resumen: formulario.resumen.trim() || null,
        contenido: formulario.contenido.trim(),
        imagen_url: imagenUrl,
        estado: formulario.estado,
        fecha_publicacion:
          formulario.fecha_publicacion || null,
      };

      const respuesta = await fetch(
        "/api/publicaciones",
        {
          method: editandoId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            editandoId
              ? {
                  id: editandoId,
                  ...datos,
                }
              : datos
          ),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo guardar la publicación."
        );
      }

      mostrarMensaje(
        editandoId
          ? "Publicación actualizada correctamente."
          : "Publicación creada correctamente.",
        "exito"
      );

      setMostrarFormulario(false);
      setEditandoId(null);
      setFormulario({ ...publicacionInicial });
      setArchivoImagen(null);
      setVistaPreviaImagen("");

      setCargando(true);

      await cargarPublicaciones();
    } catch (error) {
      console.error(error);

      mostrarMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la publicación.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  // ======================================================
  // ELIMINAR
  // ======================================================

  function solicitarEliminar(id: number) {
    setConfirmacion({
      mostrar: true,
      id,
    });
  }

  function cancelarEliminacion() {
    setConfirmacion({
      mostrar: false,
      id: null,
    });
  }

  async function eliminarPublicacion() {
    if (!confirmacion.id) return;

    try {
      setEliminandoId(confirmacion.id);

      const respuesta = await fetch(
        "/api/publicaciones",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: confirmacion.id,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo eliminar la publicación."
        );
      }

      mostrarMensaje(
        "Publicación eliminada correctamente.",
        "exito"
      );

      cancelarEliminacion();

      setCargando(true);

      await cargarPublicaciones();
    } catch (error) {
      console.error(error);

      mostrarMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la publicación.",
        "error"
      );
    } finally {
      setEliminandoId(null);
    }
  }

  // ======================================================
  // PUBLICAR / BORRADOR
  // ======================================================

  async function cambiarEstado(
    publicacion: Publicacion,
    nuevoEstado: EstadoPublicacion
  ) {
    try {
      const respuesta = await fetch(
        "/api/publicaciones",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: publicacion.id,
            titulo: publicacion.titulo,
            resumen: publicacion.resumen,
            contenido: publicacion.contenido,
            imagen_url: publicacion.imagen_url,
            estado: nuevoEstado,
            fecha_publicacion:
              nuevoEstado === "PUBLICADO"
                ? publicacion.fecha_publicacion
                : null,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
            "No se pudo cambiar el estado."
        );
      }

      mostrarMensaje(
        nuevoEstado === "PUBLICADO"
          ? "Publicación publicada correctamente."
          : "Publicación guardada como borrador.",
        "exito"
      );

      setCargando(true);

      await cargarPublicaciones();
    } catch (error) {
      console.error(error);

      mostrarMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado.",
        "error"
      );
    }
  }

  // ======================================================
  // FILTRO
  // ======================================================

  const publicacionesFiltradas =
    publicaciones.filter((publicacion) => {
      if (filtro === "TODAS") return true;

      return publicacion.estado === filtro;
    });

  const totalPublicadas = publicaciones.filter(
    (p) => p.estado === "PUBLICADO"
  ).length;

  const totalBorradores = publicaciones.filter(
    (p) => p.estado === "BORRADOR"
  ).length;

  // ======================================================
  // FECHA
  // ======================================================

  function formatearFecha(
    fecha: string | null
  ) {
    if (!fecha) return "Sin fecha";

    const fechaObjeto = new Date(fecha);

    if (isNaN(fechaObjeto.getTime())) {
      return "Sin fecha";
    }

    return fechaObjeto.toLocaleDateString(
      "es-CO",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-[#F7F1E9]">
      <AdminNav />

      <main className="lg:ml-72 px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">

          {/* ==================================================
              ENCABEZADO
          ================================================== */}

          <div className="mb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="mb-1 text-sm font-medium text-[#C56835]">
                  Contenido del sitio
                </p>

                <h1 className="text-3xl font-semibold tracking-tight text-[#59614D] sm:text-4xl">
                  Blog
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59614D]/70">
                  Crea y administra los artículos que aparecerán
                  en el sitio web.
                </p>
              </div>

              <button
                type="button"
                onClick={abrirNuevaPublicacion}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad572c] active:scale-[0.98]"
              >
                <span className="text-lg">+</span>
                Nueva publicación
              </button>
            </div>
          </div>

          {/* ==================================================
              MENSAJE
          ================================================== */}

          {mensaje && (
            <div
              className={`mb-6 rounded-2xl border px-4 py-4 text-sm font-medium ${
                tipoMensaje === "exito"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {mensaje}
            </div>
          )}

          {/* ==================================================
              FORMULARIO
          ================================================== */}

          {mostrarFormulario && (
            <section className="mb-8 overflow-hidden rounded-3xl border border-[#E1DBD2] bg-white shadow-sm">

              <div className="border-b border-[#E1DBD2] bg-[#59614D] px-5 py-5 text-white sm:px-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {editandoId
                        ? "Editar publicación"
                        : "Nueva publicación"}
                    </h2>

                    <p className="mt-1 text-sm text-white/70">
                      Completa la información del artículo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20 disabled:opacity-50"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-7">

                <div className="grid gap-6 lg:grid-cols-2">

                  {/* TÍTULO */}

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#59614D]">
                      Título *
                    </label>

                    <input
                      type="text"
                      value={formulario.titulo}
                      onChange={(e) =>
                        cambiarCampo(
                          "titulo",
                          e.target.value
                        )
                      }
                      placeholder="Ej. Cómo manejar la ansiedad en el día a día"
                      className="w-full rounded-2xl border border-[#D8D2C9] bg-[#FDFCFA] px-4 py-3.5 text-sm text-[#59614D] outline-none transition placeholder:text-[#59614D]/40 focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                    />
                  </div>

                  {/* RESUMEN */}

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#59614D]">
                      Resumen
                    </label>

                    <textarea
                      value={formulario.resumen}
                      onChange={(e) =>
                        cambiarCampo(
                          "resumen",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Escribe una breve descripción del artículo..."
                      className="w-full resize-none rounded-2xl border border-[#D8D2C9] bg-[#FDFCFA] px-4 py-3.5 text-sm leading-6 text-[#59614D] outline-none transition placeholder:text-[#59614D]/40 focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                    />
                  </div>

                  {/* IMAGEN */}

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#59614D]">
                      Imagen del artículo
                      <span className="ml-1 text-xs font-normal text-[#8A8D84]">
                        (opcional)
                      </span>
                    </label>

                    <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FDFCFA] p-4">
                      {vistaPreviaImagen ? (
                        <div className="space-y-3">
                          <div className="relative h-72 overflow-hidden rounded-xl border border-[#E1DBD2] bg-white">
                            <Image
                              src={vistaPreviaImagen}
                              alt="Vista previa de la imagen del artículo"
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <label className="cursor-pointer rounded-full border border-[#D8D2C9] px-5 py-2.5 text-center text-xs font-medium text-[#59614D] transition hover:border-[#C56835] hover:text-[#C56835]">
                              Cambiar imagen
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  seleccionarImagen(e.target.files?.[0]);
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setArchivoImagen(null);
                                setVistaPreviaImagen("");
                                cambiarCampo("imagen_url", "");
                              }}
                              className="rounded-full border border-red-200 px-5 py-2.5 text-center text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              Quitar imagen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-[#E1DBD2] bg-white px-5 py-8 text-center transition hover:border-[#C56835]">
                          <span className="text-3xl">🖼️</span>
                          <span className="mt-3 text-sm font-medium text-[#59614D]">
                            Seleccionar imagen
                          </span>
                          <span className="mt-1 text-xs text-[#8A8D84]">
                            JPG, PNG o WEBP · máximo 5 MB
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              seleccionarImagen(e.target.files?.[0]);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* ESTADO */}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#59614D]">
                      Estado
                    </label>

                    <select
                      value={formulario.estado}
                      onChange={(e) =>
                        cambiarCampo(
                          "estado",
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-[#D8D2C9] bg-[#FDFCFA] px-4 py-3.5 text-sm text-[#59614D] outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                    >
                      <option value="BORRADOR">
                        Borrador
                      </option>

                      <option value="PUBLICADO">
                        Publicado
                      </option>
                    </select>
                  </div>

                  {/* FECHA */}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#59614D]">
                      Fecha de publicación
                    </label>

                    <input
                      type="date"
                      value={formulario.fecha_publicacion}
                      onChange={(e) =>
                        cambiarCampo(
                          "fecha_publicacion",
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-[#D8D2C9] bg-[#FDFCFA] px-4 py-3.5 text-sm text-[#59614D] outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                    />
                  </div>

                  {/* CONTENIDO */}

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#59614D]">
                      Contenido *
                    </label>

                    <textarea
                      value={formulario.contenido}
                      onChange={(e) =>
                        cambiarCampo(
                          "contenido",
                          e.target.value
                        )
                      }
                      rows={12}
                      placeholder="Escribe aquí el contenido completo del artículo..."
                      className="w-full resize-y rounded-2xl border border-[#D8D2C9] bg-[#FDFCFA] px-4 py-3.5 text-sm leading-7 text-[#59614D] outline-none transition placeholder:text-[#59614D]/40 focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                    />

                    <p className="mt-2 text-xs text-[#59614D]/50">
                      Puedes utilizar varios párrafos. Más adelante
                      podemos agregar un editor de texto enriquecido.
                    </p>
                  </div>
                </div>

                {/* BOTONES */}

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#E1DBD2] pt-6 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                    className="min-h-12 rounded-2xl border border-[#D8D2C9] px-5 py-3 text-sm font-semibold text-[#59614D] transition hover:bg-[#F7F1E9] disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={guardarPublicacion}
                    disabled={guardando}
                    className="min-h-12 rounded-2xl bg-[#C56835] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad572c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardando
                      ? "Guardando..."
                      : editandoId
                      ? "Guardar cambios"
                      : "Crear publicación"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ==================================================
              RESUMEN
          ================================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm">
              <p className="text-sm text-[#59614D]/60">
                Total
              </p>

              <p className="mt-1 text-3xl font-semibold text-[#59614D]">
                {publicaciones.length}
              </p>
            </div>

            <div className="rounded-3xl border border-green-100 bg-green-50 p-5 shadow-sm">
              <p className="text-sm text-green-700/70">
                Publicadas
              </p>

              <p className="mt-1 text-3xl font-semibold text-green-700">
                {totalPublicadas}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm text-amber-700/70">
                Borradores
              </p>

              <p className="mt-1 text-3xl font-semibold text-amber-700">
                {totalBorradores}
              </p>
            </div>
          </div>

          {/* ==================================================
              FILTROS
          ================================================== */}

          <div className="mb-6 flex flex-wrap gap-2">

            {[
              {
                valor: "TODAS",
                texto: "Todas",
              },
              {
                valor: "PUBLICADO",
                texto: "Publicadas",
              },
              {
                valor: "BORRADOR",
                texto: "Borradores",
              },
            ].map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() =>
                  setFiltro(
                    opcion.valor as
                      | "TODAS"
                      | "PUBLICADO"
                      | "BORRADOR"
                  )
                }
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  filtro === opcion.valor
                    ? "bg-[#59614D] text-white"
                    : "border border-[#D8D2C9] bg-white text-[#59614D] hover:bg-[#F7F1E9]"
                }`}
              >
                {opcion.texto}
              </button>
            ))}
          </div>

          {/* ==================================================
              LISTA
          ================================================== */}

          {cargando ? (
            <div className="rounded-3xl border border-[#E1DBD2] bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#E1DBD2] border-t-[#C56835]" />

              <p className="text-sm text-[#59614D]/60">
                Cargando publicaciones...
              </p>
            </div>
          ) : publicacionesFiltradas.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#D8D2C9] bg-white p-10 text-center shadow-sm">

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F1E9] text-3xl">
                📝
              </div>

              <h3 className="text-lg font-semibold text-[#59614D]">
                No hay publicaciones
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#59614D]/60">
                {filtro === "TODAS"
                  ? "Todavía no has creado ningún artículo."
                  : filtro === "PUBLICADO"
                  ? "No tienes publicaciones publicadas."
                  : "No tienes publicaciones guardadas como borrador."}
              </p>

              {filtro === "TODAS" && (
                <button
                  type="button"
                  onClick={abrirNuevaPublicacion}
                  className="mt-5 rounded-2xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ad572c]"
                >
                  Crear primera publicación
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {publicacionesFiltradas.map(
                (publicacion) => (
                  <article
                    key={publicacion.id}
                    className="overflow-hidden rounded-3xl border border-[#E1DBD2] bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="p-5 sm:p-6">

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="mb-3 flex flex-wrap items-center gap-2">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                publicacion.estado ===
                                "PUBLICADO"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {publicacion.estado ===
                              "PUBLICADO"
                                ? "Publicado"
                                : "Borrador"}
                            </span>

                            <span className="text-xs text-[#59614D]/45">
                              {formatearFecha(
                                publicacion.fecha_publicacion
                              )}
                            </span>
                          </div>

                          <h2 className="text-xl font-semibold leading-tight text-[#59614D]">
                            {publicacion.titulo}
                          </h2>

                          {publicacion.resumen && (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#59614D]/65">
                              {publicacion.resumen}
                            </p>
                          )}

                          <div className="mt-4 text-xs text-[#59614D]/40">
                            Creado el{" "}
                            {formatearFecha(
                              publicacion.creado_en
                            )}
                          </div>
                        </div>

                        {/* BOTONES */}

                        <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">

                          <button
                            type="button"
                            onClick={() =>
                              editarPublicacion(
                                publicacion
                              )
                            }
                            className="min-h-10 rounded-xl border border-[#D8D2C9] px-4 py-2 text-xs font-semibold text-[#59614D] transition hover:bg-[#F7F1E9]"
                          >
                            Editar
                          </button>

                          {publicacion.estado ===
                          "BORRADOR" ? (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(
                                  publicacion,
                                  "PUBLICADO"
                                )
                              }
                              className="min-h-10 rounded-xl bg-[#59614D] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4d5442]"
                            >
                              Publicar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(
                                  publicacion,
                                  "BORRADOR"
                                )
                              }
                              className="min-h-10 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                            >
                              Borrador
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              solicitarEliminar(
                                publicacion.id
                              )
                            }
                            disabled={
                              eliminandoId ===
                              publicacion.id
                            }
                            className="min-h-10 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {eliminandoId ===
                            publicacion.id
                              ? "Eliminando..."
                              : "Eliminar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </main>

      {/* ======================================================
          MODAL DE CONFIRMACIÓN
      ====================================================== */}

      {confirmacion.mostrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
              🗑️
            </div>

            <h3 className="text-center text-xl font-semibold text-[#59614D]">
              ¿Eliminar publicación?
            </h3>

            <p className="mt-3 text-center text-sm leading-6 text-[#59614D]/65">
              Esta acción eliminará la publicación de forma
              permanente.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">

              <button
                type="button"
                onClick={cancelarEliminacion}
                disabled={eliminandoId !== null}
                className="min-h-12 rounded-2xl border border-[#D8D2C9] px-5 py-3 text-sm font-semibold text-[#59614D] transition hover:bg-[#F7F1E9]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={eliminarPublicacion}
                disabled={eliminandoId !== null}
                className="min-h-12 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {eliminandoId !== null
                  ? "Eliminando..."
                  : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}