"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatearDuracion } from "../lib/duracion";
import {
  agregarMinutosAFechaHora,
  intervalosFechaHoraSeCruzan,
  horariosSeCruzan,
  minutosDesdeHora,
} from "../lib/horarios";

type Servicio = {
  id: number;
  nombre: string;
  descripcion: string;
  tipo_servicio: "NORMAL" | "ESPECIAL";
  precio: number;
  duracion_minutos: number;
  modalidad: "PRESENCIAL" | "VIRTUAL" | "AMBAS";
  activo: number;
};

type BloqueoAgenda = {
  inicio: string;
  fin: string;
};

type ResultadoProximaDisponibilidad = {
  desde: string;
  proxima: { fecha: string; hora: string } | null;
};

type Disponibilidad = {
  id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: number;
};

type DisponibilidadEspecial = {
  id: number;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  activo: number;
};

type CitaCreada = {
  cita_id: number;
  fecha: string;
  hora: string;
  modalidad: string;
  servicio: string;
  referencia: string;
  monto: number;
};

export default function AgendarPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [disponibilidadesEspeciales, setDisponibilidadesEspeciales] =
    useState<DisponibilidadEspecial[]>([]);

  const [horasOcupadas, setHorasOcupadas] = useState<
    { hora: string; duracion_minutos: number }[]
  >([]);
  const [bloqueosAgenda, setBloqueosAgenda] = useState<BloqueoAgenda[]>([]);
  const [resultadoProximaDisponibilidad, setResultadoProximaDisponibilidad] =
    useState<ResultadoProximaDisponibilidad | null>(null);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [mostrarConfirmacion] = useState(false);
  const [citaCreada, setCitaCreada] = useState<CitaCreada | null>(null);

  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [datosAlerta, setDatosAlerta] = useState<{
    tipo: "error" | "advertencia";
    titulo: string;
    mensaje: string;
  }>({
    tipo: "error",
    titulo: "",
    mensaje: "",
  });

  function mostrarMensaje(
    tipo: "error" | "advertencia",
    titulo: string,
    mensaje: string
  ) {
    setDatosAlerta({ tipo, titulo, mensaje });
    setMostrarAlerta(true);
  }

  useEffect(() => {
    async function cargarServicios() {
      try {
        const respuesta = await fetch("/api/servicios");

        console.log("STATUS:", respuesta.status);
        console.log("URL:", respuesta.url);
        console.log(
          "CONTENT-TYPE:",
          respuesta.headers.get("content-type")
        );

        const datos = await respuesta.json();

        setServicios(
          datos.filter(
            (servicio: Servicio) =>
              servicio.activo === 1 &&
              servicio.tipo_servicio !== "ESPECIAL"
          )
        );
      } catch (error) {
        console.error("Error cargando servicios:", error);
      }
    }

    cargarServicios();

    async function cargarDisponibilidad() {
      try {
        const respuesta = await fetch("/api/disponibilidad");
        const datos = await respuesta.json();

        setDisponibilidad(datos);
      } catch (error) {
        console.error(
          "Error cargando disponibilidad:",
          error
        );
      }
    }

    cargarDisponibilidad();

    async function cargarDisponibilidadesEspeciales() {
      try {
        const respuesta = await fetch(
          "/api/disponibilidad-especial"
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudieron cargar las disponibilidades especiales."
          );
        }

        const datos = await respuesta.json();

        setDisponibilidadesEspeciales(datos);
      } catch (error) {
        console.error(
          "Error cargando disponibilidades especiales:",
          error
        );
      }
    }

    cargarDisponibilidadesEspeciales();
  }, []);

  const servicioActual = servicios.find(
    (servicio) =>
      String(servicio.id) === servicioSeleccionado
  );

  const modalidadesPermitidas:
    ("PRESENCIAL" | "VIRTUAL")[] = servicioActual
    ? servicioActual.modalidad === "AMBAS"
      ? ["PRESENCIAL", "VIRTUAL"]
      : [servicioActual.modalidad]
    : [];

  function obtenerEstadoHora(horaDisponible: string) {
    const duracionSeleccionada =
      Number(servicioActual?.duracion_minutos) || 60;
    const inicioDisponible = minutosDesdeHora(horaDisponible);
    const finServicio = inicioDisponible + duracionSeleccionada;
    const excedeDisponibilidad =
      finServicio > minutosDesdeHora(horaFinDisponibilidad);
    const seCruzaConCita = horasOcupadas.some((cita) => {
      const inicioCita = minutosDesdeHora(cita.hora);

      return (
        (inicioCita >= inicioDisponible && inicioCita < finServicio) ||
        horariosSeCruzan(
          horaDisponible,
          duracionSeleccionada,
          cita.hora,
          cita.duracion_minutos
        )
      );
    });
    const inicioIntervalo = `${fecha}T${horaDisponible}`;
    const finIntervalo = agregarMinutosAFechaHora(
      fecha,
      horaDisponible,
      duracionSeleccionada
    );
    const seCruzaConBloqueo = bloqueosAgenda.some((bloqueo) =>
      intervalosFechaHoraSeCruzan(
        inicioIntervalo,
        finIntervalo,
        bloqueo.inicio,
        bloqueo.fin
      )
    );

    return {
      disponible: !excedeDisponibilidad && !seCruzaConCita && !seCruzaConBloqueo,
      excedeDisponibilidad,
    };
  }

  function generarHoras(
    horaInicio: string,
    horaFin: string
  ) {
    const horas: string[] = [];

    let horaActual = Number(
      horaInicio.split(":")[0]
    );

    const horaFinal = Number(
      horaFin.split(":")[0]
    );

    while (horaActual < horaFinal) {
      horas.push(
        `${String(horaActual).padStart(2, "0")}:00`
      );

      horaActual++;
    }

    return horas;
  }

  function formatearHora(hora24: string) {
    if (!hora24) return "";

    const [hora, minutos] = hora24
      .substring(0, 5)
      .split(":");

    const horaNumero = Number(hora);

    const periodo =
      horaNumero >= 12 ? "PM" : "AM";

    const hora12 =
      horaNumero > 12
        ? horaNumero - 12
        : horaNumero === 0
        ? 12
        : horaNumero;

    return `${hora12}:${minutos} ${periodo}`;
  }

  const { horasDisponibles, horaFinDisponibilidad } = useMemo(() => {
    if (!fecha) {
      return { horasDisponibles: [] as string[], horaFinDisponibilidad: "" };
    }

    const fechaSeleccionada =
      new Date(`${fecha}T12:00:00`);

    const diaSemana =
      fechaSeleccionada.getDay();

    // Buscar si existe una disponibilidad especial
    // para esta fecha
    const disponibilidadEspecial =
      disponibilidadesEspeciales.find(
        (item) =>
          item.fecha?.slice(0, 10) === fecha
      );

    // ==========================================
    // SI EXISTE FECHA ESPECIAL, TIENE PRIORIDAD
    // ==========================================

    if (disponibilidadEspecial) {
      // Si la fecha especial no tiene horario,
      // significa que ese día no hay disponibilidad.
      if (
        !disponibilidadEspecial.hora_inicio ||
        !disponibilidadEspecial.hora_fin
      ) {
        return { horasDisponibles: [] as string[], horaFinDisponibilidad: "" };
      }

      return {
        horasDisponibles: generarHoras(
          disponibilidadEspecial.hora_inicio,
          disponibilidadEspecial.hora_fin
        ),
        horaFinDisponibilidad: disponibilidadEspecial.hora_fin,
      };
    }

    // ==========================================
    // SI NO HAY FECHA ESPECIAL,
    // USAR DISPONIBILIDAD SEMANAL
    // ==========================================

    const disponibilidadDia =
      disponibilidad.find(
        (item) =>
          Number(item.dia_semana) === diaSemana
      );

    if (!disponibilidadDia) {
      return { horasDisponibles: [] as string[], horaFinDisponibilidad: "" };
    }

    return {
      horasDisponibles: generarHoras(
        disponibilidadDia.hora_inicio,
        disponibilidadDia.hora_fin
      ),
      horaFinDisponibilidad: disponibilidadDia.hora_fin,
    };
  }, [
    fecha,
    disponibilidad,
    disponibilidadesEspeciales,
  ]);

  const hayHoraDisponible = horasDisponibles.some(
    (horaDisponible) => obtenerEstadoHora(horaDisponible).disponible
  );

  useEffect(() => {
    if (!fecha || !servicioActual || hayHoraDisponible) return;

    let cancelada = false;
    const fechaBusqueda = fecha;
    const servicioId = servicioActual.id;

    async function buscarProximaFecha() {
      try {
        const respuesta = await fetch(
          `/api/disponibilidad/proxima?desde=${encodeURIComponent(fechaBusqueda)}&servicio_id=${servicioId}`
        );
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudo buscar disponibilidad.");
        }

        if (!cancelada) {
          setResultadoProximaDisponibilidad({ desde: fechaBusqueda, proxima: datos.proxima });
        }
      } catch (error) {
        console.error("Error buscando la próxima fecha disponible:", error);
        if (!cancelada) {
          setResultadoProximaDisponibilidad({ desde: fechaBusqueda, proxima: null });
        }
      }
    }

    buscarProximaFecha();

    return () => {
      cancelada = true;
    };
  }, [
    fecha,
    servicioActual?.id,
    servicioActual?.duracion_minutos,
    hayHoraDisponible,
    horasDisponibles,
    horasOcupadas,
    bloqueosAgenda,
    horaFinDisponibilidad,
  ]);

  async function cargarFecha(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setHora("");
    setHorasOcupadas([]);
    setBloqueosAgenda([]);

    if (!nuevaFecha) return;

    try {
      const [respuestaCitas, respuestaBloqueos] = await Promise.all([
        fetch(`/api/citas?fecha=${nuevaFecha}`),
        fetch(`/api/bloqueos-agenda?fecha=${nuevaFecha}`),
      ]);
      const citas = await respuestaCitas.json();

      if (!respuestaCitas.ok) {
        console.error("Error consultando citas:", citas);
      } else {
        setHorasOcupadas(
          citas.map((cita: { hora: string; duracion_minutos: number }) => ({
            hora: cita.hora.substring(0, 5),
            duracion_minutos: Number(cita.duracion_minutos) || 60,
          }))
        );
      }

      if (respuestaBloqueos.ok) {
        setBloqueosAgenda(await respuestaBloqueos.json());
      }
    } catch (error) {
      console.error("Error cargando ocupación de la fecha:", error);
    }
  }

  async function continuar() {
    if (!servicioSeleccionado) {
      mostrarMensaje(
        "advertencia",
        "Falta seleccionar el servicio",
        "Selecciona un servicio para continuar."
      );
      return;
    }

    if (!modalidad) {
      mostrarMensaje(
        "advertencia",
        "Falta seleccionar la modalidad",
        "Selecciona una modalidad para continuar."
      );
      return;
    }

    if (!fecha) {
      mostrarMensaje(
        "advertencia",
        "Falta seleccionar la fecha",
        "Selecciona una fecha para continuar."
      );
      return;
    }

    if (!hora) {
      mostrarMensaje(
        "advertencia",
        "Falta seleccionar la hora",
        "Selecciona una hora para continuar."
      );
      return;
    }

    if (!nombre || !email || !telefono) {
      mostrarMensaje(
        "advertencia",
        "Datos incompletos",
        "Completa tu nombre, correo electrónico y número de contacto."
      );
      return;
    }

    if (!aceptaDatos) {
      mostrarMensaje(
        "advertencia",
        "Autorización requerida",
        "Debes aceptar el tratamiento de datos personales para continuar."
      );
      return;
    }

    try {
      // ==================================================
      // CREAR CITA + PAGO Y OBTENER CHECKOUT DE WOMPI
      // ==================================================

      const respuesta = await fetch("/api/pagos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_completo: nombre,
          email,
          telefono,
          acepta_tratamiento_datos: aceptaDatos,
          servicio_id: Number(
            servicioSeleccionado
          ),
          fecha,
          hora,
          modalidad,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        mostrarMensaje(
          "error",
          "No se pudo iniciar el pago",
          resultado.error ||
            "No fue posible iniciar el proceso de pago."
        );
        return;
      }

      if (!resultado.checkout_url) {
        mostrarMensaje(
          "error",
          "Error de pago",
          "No se recibió la dirección de pago de Wompi."
        );
        return;
      }

      // Guardar temporalmente los datos de la cita
      setCitaCreada({
        cita_id: resultado.cita_id,
        fecha: fecha,
        hora: hora,
        modalidad: modalidad,
        servicio: servicioSeleccionado,
        referencia: resultado.referencia,
        monto: resultado.monto,
      });

      // ==================================================
      // ENVIAR AL PACIENTE A WOMPI SANDBOX
      // ==================================================

      window.location.href =
        resultado.checkout_url;
    } catch (error) {
      console.error(
        "Error al iniciar el pago:",
        error
      );

      mostrarMensaje(
        "error",
        "Error de conexión",
        "No fue posible conectar con el servidor. Inténtalo nuevamente."
      );
    }
  }

  return (
    <>
      {/* ==================================================
          MODAL DE CONFIRMACIÓN
      ================================================== */}

      {mostrarConfirmacion && citaCreada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-[#F7F1E9] p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#59614D] text-3xl text-white">
                ✓
              </div>

              <h2 className="font-serif text-2xl text-[#3F4635]">
                ¡Hola, {nombre}! 👋
              </h2>

              <p className="mt-2 text-sm text-[#707469]">
                Tu cita fue reservada correctamente.
              </p>

              <p className="mt-1 text-sm text-[#707469]">
                Hemos registrado tu cita. Estos son
                los detalles:
              </p>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/60 p-5 text-sm">
              <div className="flex justify-between">
                <span>📅 Fecha</span>
                <strong>
                  {citaCreada.fecha}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>🕐 Hora</span>

                <strong>
                  {formatearHora(
                    citaCreada.hora
                  )}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>🏥 Modalidad</span>

                <strong>
                  {citaCreada.modalidad?.toLowerCase() ===
                  "presencial"
                    ? "Presencial"
                    : "Virtual"}
                </strong>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="w-full rounded-full bg-[#C56835] px-6 py-4 font-medium text-white transition hover:opacity-90"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          ALERTA
      ================================================== */}

      {mostrarAlerta && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                  datosAlerta.tipo === "error"
                    ? "bg-red-50 text-red-600"
                    : "bg-yellow-50 text-yellow-600"
                }`}
              >
                {datosAlerta.tipo === "error"
                  ? "!"
                  : "⚠"}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-xl text-[#3F4635]">
                  {datosAlerta.titulo}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#707469]">
                  {datosAlerta.mensaje}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarAlerta(false)
                }
                className="text-2xl leading-none text-[#707469] transition hover:text-[#C56835]"
                aria-label="Cerrar alerta"
              >
                ×
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarAlerta(false)
              }
              className="mt-6 w-full rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ==================================================
          PÁGINA
      ================================================== */}

      <main className="min-h-screen bg-[#F7F1E9] text-[#3F4635]">
        {/* ENCABEZADO */}

        <header className="border-b border-[#D8D0C5] bg-[#F7F1E9]/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link
              href="/"
              className="font-serif text-xl text-[#3F4635]"
            >
              Aura Elisa Sánchez
            </Link>

            <Link
              href="/"
              className="text-sm text-[#707469] hover:text-[#C56835]"
            >
              Volver al inicio
            </Link>
          </div>
        </header>

        {/* CONTENIDO */}

        <section className="px-6 py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <p className="font-serif text-lg italic text-[#C56835]">
                Agendamiento
              </p>

              <h1 className="mt-3 font-serif text-4xl text-[#3F4635] md:text-5xl">
                Agenda tu sesión
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-[#707469]">
                Selecciona el servicio, la modalidad,
                la fecha y el horario que prefieras.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm md:p-10">
              {/* SERVICIO */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Servicio
                </label>

                <select
                  value={servicioSeleccionado}
                  onChange={(e) => {
                    setServicioSeleccionado(e.target.value);
                    setModalidad("");
                    setHora("");
                  }}
                  className="w-full rounded-xl border border-[#D8D0C5] bg-white px-4 py-3 outline-none focus:border-[#C56835]"
                >
                  <option value="">
                    Selecciona un servicio
                  </option>

                  {servicios.map((servicio) => (
                    <option
                      key={servicio.id}
                      value={servicio.id}
                    >
                      {servicio.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* INFORMACIÓN DEL SERVICIO */}

              {servicioActual && (
                <div className="mt-4 rounded-2xl bg-[#F7F1E9] p-5">
                  <h2 className="font-serif text-xl">
                    {servicioActual.nombre}
                  </h2>

                  <p className="mt-2 text-sm text-[#707469]">
                    {servicioActual.descripcion}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#707469]">
                    <span>
                      ⏱{" "}
                      {formatearDuracion(
                        servicioActual.duracion_minutos
                      )}
                    </span>

                    <span>
                      💰 $
                      {Number(
                        servicioActual.precio
                      ).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              )}

              {/* MODALIDAD */}

              <div className="mt-8">
                <label className="mb-3 block text-sm font-medium">
                  Modalidad
                </label>

                {modalidadesPermitidas.length ===
                0 ? (
                  <div className="rounded-2xl bg-[#F7F1E9] p-5 text-sm text-[#707469]">
                    Primero selecciona un servicio
                    para elegir la modalidad.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {modalidadesPermitidas.includes(
                      "PRESENCIAL"
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalidad(
                            "PRESENCIAL"
                          )
                        }
                        className={`rounded-2xl border p-5 text-left transition ${
                          modalidad === "PRESENCIAL"
                            ? "border-[#C56835] bg-[#F7F1E9]"
                            : "border-[#D8D0C5] bg-white hover:border-[#C56835]"
                        }`}
                      >
                        <div className="text-2xl">
                          🏢
                        </div>

                        <h3 className="mt-2 font-serif text-xl">
                          Presencial
                        </h3>

                        <p className="mt-1 text-sm text-[#707469]">
                          Sesión en el consultorio.
                        </p>
                      </button>
                    )}

                    {modalidadesPermitidas.includes(
                      "VIRTUAL"
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalidad("VIRTUAL")
                        }
                        className={`rounded-2xl border p-5 text-left transition ${
                          modalidad === "VIRTUAL"
                            ? "border-[#C56835] bg-[#F7F1E9]"
                            : "border-[#D8D0C5] bg-white hover:border-[#C56835]"
                        }`}
                      >
                        <div className="text-2xl">
                          💻
                        </div>

                        <h3 className="mt-2 font-serif text-xl">
                          Virtual
                        </h3>

                        <p className="mt-1 text-sm text-[#707469]">
                          Sesión por videollamada.
                        </p>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* FECHA Y HORA */}

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Fecha
                  </label>

                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => void cargarFecha(e.target.value)}
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    className="w-full rounded-xl border border-[#D8D0C5] bg-white px-4 py-3 outline-none focus:border-[#C56835]"
                  />

                  {fecha && !hayHoraDisponible && (
                    <div className="mt-3 rounded-xl bg-[#F7F1E9] p-4 text-sm text-[#59614D]">
                      {!servicioActual ? (
                        <p>
                          No hay horarios disponibles este día. Selecciona un servicio para buscar el próximo espacio según su duración.
                        </p>
                      ) : resultadoProximaDisponibilidad?.desde !== fecha ? (
                        <p>Buscando el próximo horario disponible...</p>
                      ) : resultadoProximaDisponibilidad.proxima ? (
                        <div className="flex flex-col gap-3">
                          <p>
                            No hay horarios disponibles este día. El próximo es el{" "}
                            <strong>
                              {new Date(`${resultadoProximaDisponibilidad.proxima.fecha}T12:00:00`).toLocaleDateString("es-CO", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })}
                            </strong>{" "}
                            a las <strong>{formatearHora(resultadoProximaDisponibilidad.proxima.hora)}</strong>.
                          </p>
                          <button
                            type="button"
                            onClick={() => void cargarFecha(resultadoProximaDisponibilidad.proxima!.fecha)}
                            className="self-start font-medium text-[#C56835] underline"
                          >
                            Ver ese día
                          </button>
                        </div>
                      ) : (
                        <p>No encontramos otro horario disponible en los próximos 12 meses.</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Hora
                  </label>

                  <select
                    value={hora}
                    onChange={(e) =>
                      setHora(e.target.value)
                    }
                    disabled={!fecha}
                    className="w-full rounded-xl border border-[#D8D0C5] bg-white px-4 py-3 outline-none focus:border-[#C56835] disabled:bg-[#F7F1E9] disabled:text-[#999]"
                  >
                    <option value="">
                      {fecha
                        ? hayHoraDisponible
                          ? "Selecciona una hora"
                          : "No hay horarios disponibles"
                        : "Primero selecciona una fecha"}
                    </option>

                    {horasDisponibles.map(
                      (horaDisponible) => {
                        const estadoHora = obtenerEstadoHora(horaDisponible);

                        if (!estadoHora.disponible) {
                          return (
                            <option
                              key={horaDisponible}
                              value={horaDisponible}
                              disabled
                            >
                              {formatearHora(
                                horaDisponible
                              )}{" "}
                              — {estadoHora.excedeDisponibilidad ? "Fuera del horario" : "Ocupada"} 🔒
                            </option>
                          );
                        }

                        return (
                          <option
                            key={horaDisponible}
                            value={horaDisponible}
                          >
                            {formatearHora(
                              horaDisponible
                            )}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>
              </div>

              {/* DATOS DEL CLIENTE */}

              <div className="mt-8 border-t border-[#E5DED5] pt-8">
                <h2 className="font-serif text-2xl">
                  Tus datos
                </h2>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) =>
                        setNombre(e.target.value)
                      }
                      placeholder="Tu nombre completo"
                      className="w-full rounded-xl border border-[#D8D0C5] px-4 py-3 outline-none focus:border-[#C56835]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Correo electrónico
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="correo@ejemplo.com"
                      className="w-full rounded-xl border border-[#D8D0C5] px-4 py-3 outline-none focus:border-[#C56835]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Número de contacto
                    </label>

                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) =>
                        setTelefono(e.target.value)
                      }
                      placeholder="300 000 0000"
                      className="w-full rounded-xl border border-[#D8D0C5] px-4 py-3 outline-none focus:border-[#C56835]"
                    />
                  </div>
                </div>
              </div>

              {/* TRATAMIENTO DE DATOS */}

              <div className="mt-8 rounded-2xl bg-[#F7F1E9] p-5">
                <label className="flex items-start gap-3 text-sm text-[#707469]">
                  <input
                    type="checkbox"
                    checked={aceptaDatos}
                    onChange={(e) =>
                      setAceptaDatos(
                        e.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#C56835]"
                  />

                  <span>
                    Autorizo el tratamiento de mis
                    datos personales para gestionar mi
                    solicitud de cita y recibir la
                    información relacionada con ella.
                  </span>
                </label>
              </div>

              {/* BOTÓN */}

              <button
                type="button"
                onClick={continuar}
                className="mt-8 w-full rounded-full bg-[#C56835] px-6 py-4 font-medium text-white transition hover:bg-[#B5572A]"
              >
                Continuar con la reserva
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}