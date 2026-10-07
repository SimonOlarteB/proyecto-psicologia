"use client";

import { useEffect, useMemo, useState } from "react";
import AdminNav from "@/app/components/AdminNav";

interface Pago {
  id: number;
  cita_id: number;
  referencia: string;
  transaccion_id: string | null;
  monto: number;
  moneda: string;
  metodo_pago: string | null;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CANCELADO";
  fecha_pago: string | null;
  creado_en: string;
  actualizado_en: string;

  cita_fecha: string;
  cita_hora: string;
  cita_modalidad: "PRESENCIAL" | "VIRTUAL";
  cita_estado: string;

  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;

  servicio_nombre: string;
}

type FiltroEstado =
  | "TODOS"
  | "PENDIENTE"
  | "APROBADO"
  | "RECHAZADO"
  | "CANCELADO";

function formatearMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda || "COP",
    maximumFractionDigits: 0,
  }).format(Number(monto));
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";

  const fechaObjeto = new Date(fecha);

  if (isNaN(fechaObjeto.getTime())) {
    return "—";
  }

  return fechaObjeto.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatearFechaCita(fecha: string) {
  if (!fecha) return "—";

  const fechaObjeto = new Date(`${fecha}T00:00:00`);

  if (isNaN(fechaObjeto.getTime())) {
    return fecha;
  }

  return fechaObjeto.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatearHora(hora: string) {
  if (!hora) return "—";

  const partes = hora.split(":");

  if (partes.length < 2) {
    return hora;
  }

  const horas = Number(partes[0]);
  const minutos = partes[1];

  if (isNaN(horas)) {
    return hora;
  }

  const periodo = horas >= 12 ? "PM" : "AM";
  const horas12 = horas % 12 || 12;

  return `${horas12}:${minutos} ${periodo}`;
}

function obtenerClaseEstado(estado: Pago["estado"]) {
  switch (estado) {
    case "APROBADO":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "PENDIENTE":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "RECHAZADO":
      return "bg-red-50 text-red-700 border-red-200";

    case "CANCELADO":
      return "bg-gray-100 text-gray-600 border-gray-200";

    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export default function PagosAdmin() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("TODOS");
  const [busquedaNombre, setBusquedaNombre] = useState("");

  const [pagoSeleccionado, setPagoSeleccionado] =
    useState<Pago | null>(null);

  async function cargarPagos() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch("/api/pagos", {
        cache: "no-store",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos?.error || "No se pudieron cargar los pagos."
        );
      }

      setPagos(datos);
    } catch (error) {
      console.error("Error cargando pagos:", error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los pagos."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPagos();
  }, []);

  const pagosFiltrados = useMemo(() => {
    const nombreBuscado = normalizarTexto(busquedaNombre.trim());

    return pagos.filter((pago) => {
      const coincideEstado =
        filtroEstado === "TODOS" || pago.estado === filtroEstado;
      const coincideNombre =
        !nombreBuscado ||
        normalizarTexto(pago.cliente_nombre).includes(nombreBuscado);

      return coincideEstado && coincideNombre;
    });
  }, [pagos, filtroEstado, busquedaNombre]);

  const resumen = useMemo(() => {
    const aprobados = pagos.filter(
      (pago) => pago.estado === "APROBADO"
    );

    const pendientes = pagos.filter(
      (pago) => pago.estado === "PENDIENTE"
    );

    const rechazados = pagos.filter(
      (pago) => pago.estado === "RECHAZADO"
    );

    const totalRecaudado = aprobados.reduce(
      (total, pago) => total + Number(pago.monto),
      0
    );

    return {
      total: pagos.length,
      aprobados: aprobados.length,
      pendientes: pendientes.length,
      rechazados: rechazados.length,
      totalRecaudado,
    };
  }, [pagos]);

  return (
    <div className="min-h-screen bg-[#F7F1E9] text-[#3F4635]">
      <AdminNav />

      <main className="lg:ml-72">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-10 lg:pt-10">

          {/* ==================================================
              ENCABEZADO
          ================================================== */}

          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-serif text-base italic text-[#C56835]">
                Administración
              </p>

              <h1 className="mt-1 font-serif text-3xl text-[#3F4635] sm:text-4xl">
                Pagos
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707469]">
                Consulta y controla los pagos asociados a las
                citas de tus pacientes.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarPagos}
              disabled={cargando}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#59614D] px-5 py-2.5 text-sm font-medium text-[#59614D] transition hover:bg-[#59614D] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ==================================================
              RESUMEN
          ================================================== */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Total de pagos
              </p>

              <p className="mt-3 font-serif text-3xl text-[#3F4635]">
                {resumen.total}
              </p>

              <p className="mt-1 text-sm text-[#8A8D84]">
                Registrados en el sistema
              </p>
            </div>

            <div className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Aprobados
              </p>

              <p className="mt-3 font-serif text-3xl text-emerald-700">
                {resumen.aprobados}
              </p>

              <p className="mt-1 text-sm text-[#8A8D84]">
                Pagos confirmados
              </p>
            </div>

            <div className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Pendientes
              </p>

              <p className="mt-3 font-serif text-3xl text-amber-700">
                {resumen.pendientes}
              </p>

              <p className="mt-1 text-sm text-[#8A8D84]">
                Esperando confirmación
              </p>
            </div>

            <div className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Recaudado
              </p>

              <p className="mt-3 font-serif text-2xl text-[#C56835] sm:text-3xl">
                {formatearMonto(
                  resumen.totalRecaudado,
                  "COP"
                )}
              </p>

              <p className="mt-1 text-sm text-[#8A8D84]">
                Pagos aprobados
              </p>
            </div>

          </section>

          {/* ==================================================
              FILTROS
          ================================================== */}

          <section className="mt-8 rounded-3xl border border-[#E1DBD2] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-sm font-semibold text-[#3F4635]">
                  Filtrar pagos
                </p>

                <p className="mt-1 text-xs text-[#8A8D84]">
                  Visualiza los pagos según su estado.
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <input
                  type="search"
                  value={busquedaNombre}
                  onChange={(e) => setBusquedaNombre(e.target.value)}
                  placeholder="Buscar persona por nombre"
                  aria-label="Buscar pagos por nombre de la persona"
                  className="w-full rounded-xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-2.5 text-sm text-[#3F4635] outline-none transition placeholder:text-[#8A8D84] focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                />

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "TODOS",
                      "PENDIENTE",
                      "APROBADO",
                      "RECHAZADO",
                      "CANCELADO",
                    ] as FiltroEstado[]
                  ).map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => setFiltroEstado(estado)}
                      className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                        filtroEstado === estado
                          ? "bg-[#59614D] text-white"
                          : "bg-[#F7F1E9] text-[#59614D] hover:bg-[#E1DBD2]"
                      }`}
                    >
                      {estado === "TODOS"
                        ? "Todos"
                        : estado.charAt(0) +
                          estado.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ==================================================
              LISTADO
          ================================================== */}

          <section className="mt-6">

            {cargando ? (
              <div className="rounded-3xl border border-[#E1DBD2] bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E1DBD2] border-t-[#C56835]" />

                <p className="mt-4 text-sm text-[#707469]">
                  Cargando pagos...
                </p>
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="rounded-3xl border border-[#E1DBD2] bg-white px-6 py-16 text-center shadow-sm">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F1E9] text-2xl">
                  $
                </div>

                <h2 className="mt-5 font-serif text-2xl text-[#3F4635]">
                  No hay pagos
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#707469]">
                  {busquedaNombre.trim()
                    ? `No hay pagos que coincidan con "${busquedaNombre.trim()}".`
                    : filtroEstado === "TODOS"
                      ? "Todavía no existen pagos registrados en el sistema."
                      : `No existen pagos con estado ${filtroEstado.toLowerCase()}.`}
                </p>

              </div>
            ) : (
              <div className="space-y-4">

                {pagosFiltrados.map((pago) => (
                  <article
                    key={pago.id}
                    className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                  >

                    <div className="flex flex-col gap-5">

                      {/* CABECERA */}

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-xs font-medium text-[#8A8D84]">
                              Pago #{pago.id}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${obtenerClaseEstado(
                                pago.estado
                              )}`}
                            >
                              {pago.estado}
                            </span>

                          </div>

                          <h2 className="mt-2 truncate font-serif text-xl text-[#3F4635]">
                            {pago.cliente_nombre}
                          </h2>

                          <p className="mt-1 text-sm text-[#707469]">
                            {pago.servicio_nombre}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="font-serif text-2xl text-[#C56835]">
                            {formatearMonto(
                              pago.monto,
                              pago.moneda
                            )}
                          </p>

                          <p className="mt-1 text-xs text-[#8A8D84]">
                            {pago.moneda}
                          </p>
                        </div>

                      </div>

                      {/* INFORMACIÓN */}

                      <div className="grid gap-4 border-t border-[#EEE8E0] pt-5 sm:grid-cols-2 xl:grid-cols-4">

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9C95]">
                            Cita
                          </p>

                          <p className="mt-1 text-sm font-medium text-[#59614D]">
                            {formatearFechaCita(
                              pago.cita_fecha
                            )}
                          </p>

                          <p className="text-sm text-[#707469]">
                            {formatearHora(pago.cita_hora)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9C95]">
                            Modalidad
                          </p>

                          <p className="mt-1 text-sm font-medium text-[#59614D]">
                            {pago.cita_modalidad ===
                            "VIRTUAL"
                              ? "Virtual"
                              : "Presencial"}
                          </p>

                          <p className="text-sm text-[#707469]">
                            Cita #{pago.cita_id}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9C95]">
                            Referencia
                          </p>

                          <p className="mt-1 break-all text-sm font-medium text-[#59614D]">
                            {pago.referencia}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9C95]">
                            Método
                          </p>

                          <p className="mt-1 text-sm font-medium text-[#59614D]">
                            {pago.metodo_pago || "Pendiente"}
                          </p>

                          <p className="text-xs text-[#8A8D84]">
                            {formatearFecha(
                              pago.fecha_pago
                            )}
                          </p>
                        </div>

                      </div>

                      {/* ACCIONES */}

                      <div className="flex flex-col gap-3 border-t border-[#EEE8E0] pt-5 sm:flex-row sm:items-center sm:justify-between">

                        <div className="text-xs text-[#8A8D84]">
                          {pago.transaccion_id ? (
                            <>
                              Transacción:{" "}
                              <span className="font-medium text-[#59614D]">
                                {pago.transaccion_id}
                              </span>
                            </>
                          ) : (
                            "Sin transacción registrada"
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPagoSeleccionado(pago)
                          }
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#59614D] px-5 py-2.5 text-sm font-medium text-[#59614D] transition hover:bg-[#59614D] hover:text-white"
                        >
                          Ver detalles
                        </button>

                      </div>

                    </div>
                  </article>
                ))}

              </div>
            )}

          </section>

        </div>
      </main>

      {/* ==================================================
          MODAL DETALLES
      ================================================== */}

      {pagoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">

          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-start justify-between border-b border-[#E1DBD2] px-5 py-5 sm:px-7">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#C56835]">
                  Información del pago
                </p>

                <h2 className="mt-1 font-serif text-2xl text-[#3F4635]">
                  Pago #{pagoSeleccionado.id}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPagoSeleccionado(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F1E9] text-xl text-[#59614D] transition hover:bg-[#E1DBD2]"
                aria-label="Cerrar"
              >
                ×
              </button>

            </div>

            {/* CONTENIDO */}

            <div className="overflow-y-auto px-5 py-6 sm:px-7">

              <div className="rounded-2xl bg-[#F7F1E9] p-5 text-center">

                <p className="text-xs uppercase tracking-wider text-[#8A8D84]">
                  Valor del pago
                </p>

                <p className="mt-2 font-serif text-3xl text-[#C56835]">
                  {formatearMonto(
                    pagoSeleccionado.monto,
                    pagoSeleccionado.moneda
                  )}
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(
                    pagoSeleccionado.estado
                  )}`}
                >
                  {pagoSeleccionado.estado}
                </span>

              </div>

              <div className="mt-6 space-y-6">

                {/* CLIENTE */}

                <div>
                  <h3 className="font-serif text-lg text-[#3F4635]">
                    Cliente
                  </h3>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Nombre
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {pagoSeleccionado.cliente_nombre}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Teléfono
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {pagoSeleccionado.cliente_telefono}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-[#9A9C95]">
                        Correo electrónico
                      </p>

                      <p className="mt-1 break-all text-sm text-[#59614D]">
                        {pagoSeleccionado.cliente_email}
                      </p>
                    </div>

                  </div>
                </div>

                {/* CITA */}

                <div className="border-t border-[#EEE8E0] pt-6">
                  <h3 className="font-serif text-lg text-[#3F4635]">
                    Cita asociada
                  </h3>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Servicio
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {pagoSeleccionado.servicio_nombre}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Estado de la cita
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {pagoSeleccionado.cita_estado}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Fecha
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {formatearFechaCita(
                          pagoSeleccionado.cita_fecha
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Hora
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {formatearHora(
                          pagoSeleccionado.cita_hora
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Modalidad
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {pagoSeleccionado.cita_modalidad ===
                        "VIRTUAL"
                          ? "Virtual"
                          : "Presencial"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        ID de cita
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        #{pagoSeleccionado.cita_id}
                      </p>
                    </div>

                  </div>
                </div>

                {/* TRANSACCIÓN */}

                <div className="border-t border-[#EEE8E0] pt-6">
                  <h3 className="font-serif text-lg text-[#3F4635]">
                    Información de transacción
                  </h3>

                  <div className="mt-3 space-y-4">

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Referencia
                      </p>

                      <p className="mt-1 break-all text-sm text-[#59614D]">
                        {pagoSeleccionado.referencia}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        ID de transacción
                      </p>

                      <p className="mt-1 break-all text-sm text-[#59614D]">
                        {pagoSeleccionado.transaccion_id ||
                          "Pendiente"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Método de pago
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {pagoSeleccionado.metodo_pago ||
                          "Pendiente"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#9A9C95]">
                        Fecha de pago
                      </p>

                      <p className="mt-1 text-sm text-[#59614D]">
                        {formatearFecha(
                          pagoSeleccionado.fecha_pago
                        )}
                      </p>
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="border-t border-[#E1DBD2] px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={() => setPagoSeleccionado(null)}
                className="w-full rounded-full bg-[#59614D] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#4D5543]"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}