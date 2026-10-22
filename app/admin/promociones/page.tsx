"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RichText from "../../components/RichText";
import RichTextEditor from "../../components/admin/RichTextEditor";
import { hasRichTextContent } from "../../lib/rich-text";

type Promocion = {
  id: number;
  titulo: string;
  descripcion: string;
  porcentaje_descuento: number;
  accion: "COTIZAR" | "AGENDAR";
  servicio_id: number | null;
  enlace: string | null;
  activo: number;
  orden: number;
};

type ServicioOpcion = {
  id: number;
  nombre: string;
  tipo_servicio: "NORMAL" | "ESPECIAL";
};

type FormularioPromocion = {
  titulo: string;
  descripcion: string;
  porcentaje_descuento: string;
  accion: "COTIZAR" | "AGENDAR";
  servicio_id: string;
  enlace: string;
  orden: string;
  activo: boolean;
};

const formularioInicial: FormularioPromocion = {
  titulo: "",
  descripcion: "",
  porcentaje_descuento: "",
  accion: "COTIZAR",
  servicio_id: "",
  enlace: "",
  orden: "0",
  activo: true,
};

export default function PromocionesAdminPage() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [servicios, setServicios] = useState<ServicioOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [promocionEditando, setPromocionEditando] =
    useState<Promocion | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioPromocion>(formularioInicial);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const [respuestaPromociones, respuestaServicios] = await Promise.all([
        fetch("/api/promociones"),
        fetch("/api/servicios"),
      ]);

      if (!respuestaPromociones.ok) {
        throw new Error("No se pudieron cargar las promociones.");
      }

      setPromociones(await respuestaPromociones.json());

      if (respuestaServicios.ok) {
        const datosServicios: ServicioOpcion[] =
          await respuestaServicios.json();

        // /agendar solo muestra servicios normales (con agenda y pago)
        setServicios(
          datosServicios.filter(
            (servicio) => servicio.tipo_servicio === "NORMAL"
          )
        );
      }
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las promociones."
      );
    } finally {
      setCargando(false);
    }
  }

  function abrirNuevaPromocion() {
    setPromocionEditando(null);
    setFormulario(formularioInicial);
    setMensaje("");
    setError("");
    setModalAbierto(true);
  }

  function abrirEditarPromocion(promocion: Promocion) {
    setPromocionEditando(promocion);

    setFormulario({
      titulo: promocion.titulo,
      descripcion: promocion.descripcion || "",
      porcentaje_descuento: String(promocion.porcentaje_descuento),
      accion: promocion.accion,
      servicio_id: promocion.servicio_id ? String(promocion.servicio_id) : "",
      enlace: promocion.enlace || "",
      orden: String(promocion.orden),
      activo: promocion.activo === 1,
    });

    setMensaje("");
    setError("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setPromocionEditando(null);
    setFormulario(formularioInicial);
    setError("");
  }

  function actualizarCampo(
    campo: keyof FormularioPromocion,
    valor: string | boolean
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardarPromocion(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (!formulario.titulo.trim()) {
      setError("El título de la promoción es obligatorio.");
      return;
    }

    if (!hasRichTextContent(formulario.descripcion)) {
      setError("La descripción de la promoción es obligatoria.");
      return;
    }

    const porcentaje = Number(formulario.porcentaje_descuento || 0);

    if (!Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      setError("El porcentaje debe ser un número entero entre 0 y 100.");
      return;
    }

    if (
      formulario.accion === "AGENDAR" &&
      porcentaje > 0 &&
      !formulario.servicio_id &&
      !formulario.enlace.trim()
    ) {
      setError(
        "Para aplicar el descuento en el pago, selecciona el servicio a agendar."
      );
      return;
    }

    const orden = Number(formulario.orden || 0);

    if (!Number.isInteger(orden)) {
      setError("El orden debe ser un número entero.");
      return;
    }

    try {
      setGuardando(true);

      const cuerpo = {
        ...(promocionEditando ? { id: promocionEditando.id } : {}),
        titulo: formulario.titulo,
        descripcion: formulario.descripcion,
        porcentaje_descuento: porcentaje,
        accion: formulario.accion,
        servicio_id:
          formulario.accion === "AGENDAR" && formulario.servicio_id
            ? Number(formulario.servicio_id)
            : null,
        enlace: formulario.enlace.trim(),
        orden,
        activo: formulario.activo,
      };

      const respuesta = await fetch("/api/promociones", {
        method: promocionEditando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpo),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo guardar la promoción.");
      }

      setMensaje(
        promocionEditando
          ? "Promoción actualizada correctamente."
          : "Promoción creada correctamente."
      );

      setModalAbierto(false);
      setPromocionEditando(null);
      setFormulario(formularioInicial);

      await cargarDatos();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la promoción."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(promocion: Promocion) {
    try {
      setError("");
      setMensaje("");

      const respuesta = await fetch("/api/promociones", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: promocion.id,
          titulo: promocion.titulo,
          descripcion: promocion.descripcion,
          porcentaje_descuento: promocion.porcentaje_descuento,
          accion: promocion.accion,
          servicio_id: promocion.servicio_id,
          enlace: promocion.enlace || "",
          orden: promocion.orden,
          activo: promocion.activo !== 1,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo cambiar el estado.");
      }

      setMensaje(
        promocion.activo === 1
          ? "Promoción desactivada correctamente."
          : "Promoción activada correctamente."
      );

      await cargarDatos();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado."
      );
    }
  }

  async function eliminarPromocion(id: number) {
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar esta promoción? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    try {
      setError("");
      setMensaje("");

      const respuesta = await fetch("/api/promociones", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo eliminar la promoción.");
      }

      setMensaje("Promoción eliminada correctamente.");

      await cargarDatos();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la promoción."
      );
    }
  }

  function nombreServicio(id: number | null) {
    if (!id) return null;

    return servicios.find((servicio) => servicio.id === id)?.nombre ?? null;
  }

  return (
    <main className="min-h-screen bg-[#F7F1E9] px-4 py-6 text-[#59614D] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-[#C56835]">
              Administración
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[#59614D]">
              Promociones
            </h1>

            <p className="mt-1 text-sm text-[#59614D]/70">
              Administra las promociones que aparecen debajo de los servicios
              para personas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="rounded-full border border-[#59614D] px-6 py-3 text-center text-sm font-medium text-[#59614D] transition hover:bg-[#59614D] hover:text-white"
            >
              ← Volver al inicio
            </Link>

            <button
              type="button"
              onClick={abrirNuevaPromocion}
              className="w-full rounded-xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad5629] sm:w-auto"
            >
              + Nueva promoción
            </button>
          </div>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {mensaje}
          </div>
        )}

        {error && !modalAbierto && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Contenido */}
        {cargando ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#59614D]/70">
              Cargando promociones...
            </p>
          </div>
        ) : promociones.length === 0 ? (
          <div className="rounded-2xl border border-[#59614D]/10 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E1DBD2] text-2xl">
              %
            </div>

            <h2 className="text-lg font-semibold text-[#59614D]">
              No hay promociones registradas
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-[#59614D]/70">
              Crea tu primera promoción para mostrarla en la página web.
            </p>

            <button
              type="button"
              onClick={abrirNuevaPromocion}
              className="mt-5 rounded-xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white"
            >
              Crear primera promoción
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {promociones.map((promocion) => (
              <article
                key={promocion.id}
                className="overflow-hidden rounded-2xl border border-[#59614D]/10 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#59614D]">
                        {promocion.titulo}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {promocion.porcentaje_descuento > 0 && (
                          <span className="inline-flex rounded-full bg-[#C56835] px-3 py-1 text-xs font-semibold text-white">
                            -{promocion.porcentaje_descuento} %
                          </span>
                        )}

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            promocion.accion === "AGENDAR"
                              ? "bg-[#E8E9DF] text-[#59614D]"
                              : "bg-[#FCE8DC] text-[#A94F24]"
                          }`}
                        >
                          {promocion.accion === "AGENDAR"
                            ? "Agendar con pago"
                            : "Cotizar por WhatsApp"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        promocion.activo === 1
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {promocion.activo === 1 ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  <RichText
                    value={promocion.descripcion}
                    className="line-clamp-4 min-h-[48px] text-sm leading-6 text-[#59614D]/70"
                  />

                  <div className="mt-4 space-y-1 text-xs text-[#59614D]/60">
                    {promocion.accion === "AGENDAR" && (
                      <p>
                        Servicio:{" "}
                        {nombreServicio(promocion.servicio_id) ??
                          "Sin servicio asignado"}
                      </p>
                    )}

                    {promocion.enlace && (
                      <p className="truncate">Enlace: {promocion.enlace}</p>
                    )}

                    <p>Orden: {promocion.orden}</p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEditarPromocion(promocion)}
                      className="rounded-xl border border-[#59614D]/20 px-3 py-2.5 text-sm font-medium text-[#59614D] transition hover:bg-[#F7F1E9]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => cambiarEstado(promocion)}
                      className="rounded-xl border border-[#59614D]/20 px-3 py-2.5 text-sm font-medium text-[#59614D] transition hover:bg-[#F7F1E9]"
                    >
                      {promocion.activo === 1 ? "Desactivar" : "Activar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarPromocion(promocion.id)}
                      className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#59614D]/10 bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-[#59614D]">
                  {promocionEditando
                    ? "Editar promoción"
                    : "Nueva promoción"}
                </h2>

                <p className="mt-1 text-xs text-[#59614D]/60">
                  Completa la información de la promoción.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F1E9] text-lg text-[#59614D]"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarPromocion} className="space-y-5 p-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Título
                </label>

                <input
                  type="text"
                  value={formulario.titulo}
                  onChange={(e) => actualizarCampo("titulo", e.target.value)}
                  placeholder="Ej. Sesión para estudiantes"
                  maxLength={200}
                  className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Descripción
                </label>

                <RichTextEditor
                  value={formulario.descripcion}
                  required
                  onChange={(descripcion) =>
                    actualizarCampo("descripcion", descripcion)
                  }
                  label="Descripción de la promoción"
                  placeholder="Describe brevemente la promoción..."
                  minHeight="7rem"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#59614D]">
                    Descuento (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formulario.porcentaje_descuento}
                    onChange={(e) =>
                      actualizarCampo("porcentaje_descuento", e.target.value)
                    }
                    placeholder="30"
                    className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#59614D]">
                    Orden
                  </label>

                  <input
                    type="number"
                    step="1"
                    value={formulario.orden}
                    onChange={(e) => actualizarCampo("orden", e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Al hacer clic en el botón
                </label>

                <select
                  value={formulario.accion}
                  onChange={(e) =>
                    actualizarCampo(
                      "accion",
                      e.target.value as FormularioPromocion["accion"]
                    )
                  }
                  className="w-full rounded-xl border border-[#59614D]/20 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                >
                  <option value="COTIZAR">Cotizar por WhatsApp</option>
                  <option value="AGENDAR">
                    Agendar (pasarela de pagos)
                  </option>
                </select>
              </div>

              {formulario.accion === "AGENDAR" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#59614D]">
                    Servicio a agendar
                  </label>

                  <select
                    value={formulario.servicio_id}
                    onChange={(e) =>
                      actualizarCampo("servicio_id", e.target.value)
                    }
                    className="w-full rounded-xl border border-[#59614D]/20 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                  >
                    <option value="">Sin servicio (el cliente elige)</option>

                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-[#59614D]/60">
                    Solo aparecen servicios con agenda y pago. El descuento
                    se cobra en la pasarela únicamente para este servicio.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Enlace personalizado (opcional)
                </label>

                <input
                  type="text"
                  value={formulario.enlace}
                  onChange={(e) => actualizarCampo("enlace", e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                  className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                />

                <p className="mt-2 text-xs text-[#59614D]/60">
                  Si lo llenas, el botón irá a este enlace en lugar de
                  WhatsApp o la agenda.
                </p>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#F7F1E9] p-4">
                <div>
                  <p className="text-sm font-medium text-[#59614D]">
                    Promoción activa
                  </p>

                  <p className="mt-1 text-xs text-[#59614D]/60">
                    Las promociones activas aparecen en la página web.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={formulario.activo}
                  onChange={(e) => actualizarCampo("activo", e.target.checked)}
                  className="h-5 w-5 accent-[#C56835]"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="w-full rounded-xl border border-[#59614D]/20 px-5 py-3 text-sm font-medium text-[#59614D] sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full rounded-xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ad5629] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {guardando
                    ? "Guardando..."
                    : promocionEditando
                      ? "Guardar cambios"
                      : "Crear promoción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
