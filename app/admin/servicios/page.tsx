"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatearDuracion } from "../../lib/duracion";

type Servicio = {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo_servicio: "NORMAL" | "ESPECIAL";
  precio: number;
  duracion_minutos: number;
modalidad: "PRESENCIAL" | "VIRTUAL" | "AMBAS";
  activo: number;
};

type FormularioServicio = {
  nombre: string;
  descripcion: string;
  tipo_servicio: "NORMAL" | "ESPECIAL";
  precio: string;
  duracion_minutos: string;
  unidad_duracion: "MINUTOS" | "HORAS" | "HORAS_MINUTOS" | "DIAS";
  minutos_adicionales: string;
  modalidad: "PRESENCIAL" | "VIRTUAL" | "AMBAS";
  activo: boolean;
};

const formularioInicial: FormularioServicio = {
  nombre: "",
  descripcion: "",
  tipo_servicio: "NORMAL",
  precio: "",
  duracion_minutos: "",
  unidad_duracion: "MINUTOS",
  minutos_adicionales: "0",
  modalidad: "VIRTUAL",
  activo: true,
};

export default function ServiciosAdminPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] =
    useState<Servicio | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioServicio>(formularioInicial);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch("/api/servicios");

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los servicios.");
      }

      const datos = await respuesta.json();
      setServicios(datos);
    } catch (error) {
      console.error(error);
      setError("No se pudieron cargar los servicios.");
    } finally {
      setCargando(false);
    }
  }

  function abrirNuevoServicio() {
    setServicioEditando(null);
    setFormulario(formularioInicial);
    setMensaje("");
    setError("");
    setModalAbierto(true);
  }

  function abrirEditarServicio(servicio: Servicio) {
    setServicioEditando(servicio);

    const unidadDuracion =
      servicio.duracion_minutos % 1440 === 0
        ? "DIAS"
        : servicio.duracion_minutos % 60 === 0
          ? "HORAS"
          : servicio.duracion_minutos >= 60
            ? "HORAS_MINUTOS"
            : "MINUTOS";

    const cantidadDuracion =
      unidadDuracion === "DIAS"
        ? servicio.duracion_minutos / 1440
        : unidadDuracion === "HORAS"
          ? servicio.duracion_minutos / 60
          : unidadDuracion === "HORAS_MINUTOS"
            ? Math.floor(servicio.duracion_minutos / 60)
          : servicio.duracion_minutos;

    setFormulario({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || "",
      tipo_servicio: servicio.tipo_servicio || "NORMAL",
      precio: String(servicio.precio),
      duracion_minutos: String(cantidadDuracion),
      unidad_duracion: unidadDuracion,
      minutos_adicionales:
        unidadDuracion === "HORAS_MINUTOS"
          ? String(servicio.duracion_minutos % 60)
          : "0",
      modalidad: servicio.modalidad,
      activo: servicio.activo === 1,
    });

    setMensaje("");
    setError("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setServicioEditando(null);
    setFormulario(formularioInicial);
    setError("");
  }

  function actualizarCampo(
    campo: keyof FormularioServicio,
    valor: string | boolean
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function cambiarUnidadDuracion(
    unidad: FormularioServicio["unidad_duracion"]
  ) {
    setFormulario((actual) => {
      if (unidad !== "HORAS_MINUTOS") {
        return { ...actual, unidad_duracion: unidad };
      }

      const cantidad = Number(actual.duracion_minutos);
      const cantidadValida =
        actual.duracion_minutos !== "" &&
        Number.isInteger(cantidad) &&
        cantidad >= 0;
      const minutosTotales = cantidadValida
        ? actual.unidad_duracion === "HORAS"
          ? cantidad * 60
          : actual.unidad_duracion === "DIAS"
            ? cantidad * 1440
            : actual.unidad_duracion === "HORAS_MINUTOS"
              ? cantidad * 60 + Number(actual.minutos_adicionales || 0)
              : cantidad
        : 60;

      return {
        ...actual,
        duracion_minutos: String(Math.floor(minutosTotales / 60)),
        unidad_duracion: unidad,
        minutos_adicionales: String(minutosTotales % 60),
      };
    });
  }

  async function guardarServicio(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (!formulario.nombre.trim()) {
      setError("El nombre del servicio es obligatorio.");
      return;
    }

    const esEspecial =
      formulario.tipo_servicio === "ESPECIAL";

    if (esEspecial && !formulario.descripcion.trim()) {
      setError("La descripción del servicio es obligatoria.");
      return;
    }

    if (
      !esEspecial &&
      (!formulario.precio || Number(formulario.precio) < 0)
    ) {
      setError("Ingresa un precio válido.");
      return;
    }

    const cantidadDuracion = Number(formulario.duracion_minutos);
    const minutosAdicionales = Number(formulario.minutos_adicionales || 0);
    const duracionCombinadaValida =
      Number.isInteger(cantidadDuracion) &&
      cantidadDuracion >= 0 &&
      Number.isInteger(minutosAdicionales) &&
      minutosAdicionales >= 0 &&
      minutosAdicionales < 60 &&
      cantidadDuracion * 60 + minutosAdicionales > 0;

    if (
      !esEspecial &&
      (formulario.unidad_duracion === "HORAS_MINUTOS"
        ? !duracionCombinadaValida
        : (!formulario.duracion_minutos ||
          !Number.isInteger(cantidadDuracion) ||
          cantidadDuracion <= 0))
    ) {
      setError("Ingresa una duración válida.");
      return;
    }

    const duracionEnMinutos = esEspecial
      ? 1
      : formulario.unidad_duracion === "DIAS"
        ? cantidadDuracion * 1440
        : formulario.unidad_duracion === "HORAS"
          ? cantidadDuracion * 60
          : formulario.unidad_duracion === "HORAS_MINUTOS"
            ? cantidadDuracion * 60 + minutosAdicionales
            : cantidadDuracion;

    if (
      !esEspecial &&
      (!Number.isSafeInteger(duracionEnMinutos) ||
        duracionEnMinutos <= 0)
    ) {
      setError("La duración seleccionada es demasiado larga.");
      return;
    }

    try {
      setGuardando(true);

      const metodo = servicioEditando ? "PUT" : "POST";

      const cuerpo = servicioEditando
        ? {
            id: servicioEditando.id,
            nombre: formulario.nombre,
            descripcion: formulario.descripcion,
            tipo_servicio: formulario.tipo_servicio,
            precio: esEspecial ? 0 : Number(formulario.precio),
            duracion_minutos: duracionEnMinutos,
            modalidad: formulario.modalidad,
            activo: formulario.activo,
          }
        : {
            nombre: formulario.nombre,
            descripcion: formulario.descripcion,
            tipo_servicio: formulario.tipo_servicio,
            precio: esEspecial ? 0 : Number(formulario.precio),
            duracion_minutos: duracionEnMinutos,
            modalidad: formulario.modalidad,
            activo: formulario.activo,
          };

      const respuesta = await fetch("/api/servicios", {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpo),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo guardar el servicio."
        );
      }

      setMensaje(
        servicioEditando
          ? "Servicio actualizado correctamente."
          : "Servicio creado correctamente."
      );

      setModalAbierto(false);
      setServicioEditando(null);
      setFormulario(formularioInicial);

      await cargarServicios();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el servicio."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function desactivarServicio(id: number) {
    const confirmar = window.confirm(
      "¿Seguro que deseas desactivar este servicio?"
    );

    if (!confirmar) return;

    try {
      setError("");
      setMensaje("");

      const respuesta = await fetch("/api/servicios", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo desactivar el servicio."
        );
      }

      setMensaje("Servicio desactivado correctamente.");

      await cargarServicios();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo desactivar el servicio."
      );
    }
  }

  function formatearPrecio(precio: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(precio));
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
              Servicios
            </h1>

            <p className="mt-1 text-sm text-[#59614D]/70">
              Administra los servicios que aparecen en tu sitio web.
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
              onClick={abrirNuevoServicio}
              className="w-full rounded-xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad5629] sm:w-auto"
            >
              + Nuevo servicio
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
              Cargando servicios...
            </p>
          </div>
        ) : servicios.length === 0 ? (
          <div className="rounded-2xl border border-[#59614D]/10 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E1DBD2] text-2xl">
              ✦
            </div>

            <h2 className="text-lg font-semibold text-[#59614D]">
              No hay servicios registrados
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-[#59614D]/70">
              Crea tu primer servicio para comenzar a mostrarlo
              en la página web.
            </p>

            <button
              type="button"
              onClick={abrirNuevoServicio}
              className="mt-5 rounded-xl bg-[#C56835] px-5 py-3 text-sm font-semibold text-white"
            >
              Crear primer servicio
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {servicios.map((servicio) => (
              <article
                key={servicio.id}
                className="overflow-hidden rounded-2xl border border-[#59614D]/10 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#59614D]">
                        {servicio.nombre}
                      </h2>

                      {servicio.tipo_servicio === "ESPECIAL" && (
                        <span className="mt-2 inline-flex rounded-full bg-[#FCE8DC] px-3 py-1 text-xs font-medium text-[#A94F24]">
                          Cotizar por WhatsApp
                        </span>
                      )}

                      {servicio.tipo_servicio !== "ESPECIAL" && (
                        <span className="mt-2 inline-flex rounded-full bg-[#E1DBD2] px-3 py-1 text-xs font-medium text-[#59614D]">
                          {servicio.modalidad === "AMBAS"
                            ? "Presencial y virtual"
                            : servicio.modalidad === "VIRTUAL"
                              ? "Virtual"
                              : "Presencial"}
                        </span>
                      )}
                    </div>

                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      Activo
                    </span>
                  </div>

                  <p className="min-h-[48px] text-sm leading-6 text-[#59614D]/70">
                    {servicio.descripcion ||
                      "Sin descripción registrada."}
                  </p>

                  {servicio.tipo_servicio !== "ESPECIAL" && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#F7F1E9] p-3">
                      <p className="text-xs text-[#59614D]/60">
                        Precio
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#59614D]">
                        {formatearPrecio(servicio.precio)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F7F1E9] p-3">
                      <p className="text-xs text-[#59614D]/60">
                        Duración
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#59614D]">
                        {formatearDuracion(servicio.duracion_minutos)}
                      </p>
                    </div>
                  </div>
                  )}

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        abrirEditarServicio(servicio)
                      }
                      className="flex-1 rounded-xl border border-[#59614D]/20 px-4 py-2.5 text-sm font-medium text-[#59614D] transition hover:bg-[#F7F1E9]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        desactivarServicio(servicio.id)
                      }
                      className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Desactivar
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
                  {servicioEditando
                    ? "Editar servicio"
                    : "Nuevo servicio"}
                </h2>

                <p className="mt-1 text-xs text-[#59614D]/60">
                  Completa la información del servicio.
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

            <form
              onSubmit={guardarServicio}
              className="space-y-5 p-5"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Tipo de servicio
                </label>

                <select
                  value={formulario.tipo_servicio}
                  onChange={(e) =>
                    actualizarCampo(
                      "tipo_servicio",
                      e.target.value as "NORMAL" | "ESPECIAL"
                    )
                  }
                  className="w-full rounded-xl border border-[#59614D]/20 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                >
                  <option value="NORMAL">Servicio con agenda y pago</option>
                  <option value="ESPECIAL">Servicio especial para cotizar</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Nombre del servicio
                </label>

                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) =>
                    actualizarCampo(
                      "nombre",
                      e.target.value
                    )
                  }
                  placeholder="Ej. Consulta psicológica"
                  maxLength={150}
                  className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Descripción
                </label>

                <textarea
                  value={formulario.descripcion}
                  required={formulario.tipo_servicio === "ESPECIAL"}
                  onChange={(e) =>
                    actualizarCampo(
                      "descripcion",
                      e.target.value
                    )
                  }
                  placeholder="Describe brevemente el servicio..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                />
              </div>

              {formulario.tipo_servicio === "NORMAL" && (
                <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#59614D]">
                    Precio
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formulario.precio}
                    onChange={(e) =>
                      actualizarCampo(
                        "precio",
                        e.target.value
                      )
                    }
                    placeholder="150000"
                    className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#59614D]">
                    Duración
                  </label>

                  {formulario.unidad_duracion === "HORAS_MINUTOS" ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                      <div>
                        <label className="mb-1 block px-1 text-xs text-[#59614D]/70">
                          Horas
                        </label>
                        <select
                          aria-label="Horas de duración"
                          value={formulario.duracion_minutos}
                          onChange={(e) =>
                            actualizarCampo("duracion_minutos", e.target.value)
                          }
                          className="w-full min-w-[3.25rem] rounded-xl border border-[#59614D]/20 bg-white px-0 py-3 text-center text-xs text-[#59614D] outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                        >
                          {Array.from({ length: 100 }, (_, hora) => (
                            <option key={hora} value={String(hora)}>
                              {hora}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block px-1 text-xs text-[#59614D]/70">
                          Minutos
                        </label>
                        <select
                          aria-label="Minutos de duración"
                          value={formulario.minutos_adicionales}
                          onChange={(e) =>
                            actualizarCampo("minutos_adicionales", e.target.value)
                          }
                          className="w-full min-w-[3.25rem] rounded-xl border border-[#59614D]/20 bg-white px-0 py-3 text-center text-xs text-[#59614D] outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                        >
                          {Array.from({ length: 60 }, (_, minuto) => (
                            <option key={minuto} value={String(minuto)}>
                              {minuto}
                            </option>
                          ))}
                        </select>
                      </div>

                      <select
                        aria-label="Unidad de duración"
                        value={formulario.unidad_duracion}
                        onChange={(e) =>
                          cambiarUnidadDuracion(
                            e.target.value as FormularioServicio["unidad_duracion"]
                          )
                        }
                        className="max-w-24 rounded-xl border border-[#59614D]/20 bg-white px-1 py-3 text-xs text-[#59614D] outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                      >
                        <option value="MINUTOS">minutos</option>
                        <option value="HORAS">horas</option>
                        <option value="HORAS_MINUTOS">hora y min</option>
                        <option value="DIAS">días</option>
                      </select>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formulario.duracion_minutos}
                        onChange={(e) =>
                          actualizarCampo("duracion_minutos", e.target.value)
                        }
                        placeholder="60"
                        className="w-full rounded-xl border border-[#59614D]/20 px-4 py-3 pr-24 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                      />

                      <select
                        aria-label="Unidad de duración"
                        value={formulario.unidad_duracion}
                        onChange={(e) =>
                          cambiarUnidadDuracion(
                            e.target.value as FormularioServicio["unidad_duracion"]
                          )
                        }
                        className="absolute right-2 top-1/2 max-w-24 -translate-y-1/2 rounded-md bg-white px-2 py-1 text-xs text-[#59614D] outline-none"
                      >
                        <option value="MINUTOS">min</option>
                        <option value="HORAS">h</option>
                        <option value="HORAS_MINUTOS">h + min</option>
                        <option value="DIAS">días</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#59614D]">
                  Modalidad
                </label>

                <select
                  value={formulario.modalidad}
                  onChange={(e) =>
                    actualizarCampo(
                      "modalidad",
                      e.target.value as
                        | "PRESENCIAL"
                        | "VIRTUAL"
                    )
                  }
                  className="w-full rounded-xl border border-[#59614D]/20 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                >
                 <option value="VIRTUAL">
  Virtual
</option>

<option value="PRESENCIAL">
  Presencial
</option>

<option value="AMBAS">
  Presencial y Virtual
</option>
                </select>
              </div>
                </>
              )}

              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#F7F1E9] p-4">
                <div>
                  <p className="text-sm font-medium text-[#59614D]">
                    Servicio activo
                  </p>

                  <p className="mt-1 text-xs text-[#59614D]/60">
                    Los servicios activos pueden aparecer
                    públicamente.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={formulario.activo}
                  onChange={(e) =>
                    actualizarCampo(
                      "activo",
                      e.target.checked
                    )
                  }
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
                    : servicioEditando
                      ? "Guardar cambios"
                      : "Crear servicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}