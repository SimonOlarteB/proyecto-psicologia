"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Disponibilidad {
  id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: number;
}

interface DisponibilidadEspecial {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  activo: number;
}

interface BloqueoAgenda {
  id: number;
  inicio: string;
  fin: string;
}

interface SeleccionFechaHora {
  fecha: string;
  hora: string;
  minuto: string;
  periodo: "AM" | "PM";
}

const seleccionFechaHoraInicial: SeleccionFechaHora = {
  fecha: "",
  hora: "12",
  minuto: "00",
  periodo: "AM",
};

const diasSemana = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export default function DisponibilidadPage() {
  const [disponibilidades, setDisponibilidades] = useState<
    Disponibilidad[]
  >([]);

  const [cargando, setCargando] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [editando, setEditando] = useState<Disponibilidad | null>(null);

  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  const [procesando, setProcesando] = useState(false);
  const [disponibilidadesEspeciales, setDisponibilidadesEspeciales] = useState<
  DisponibilidadEspecial[]
>([]);

const [mostrarFormularioEspecial, setMostrarFormularioEspecial] =
  useState(false);

const [editandoEspecial, setEditandoEspecial] =
  useState<DisponibilidadEspecial | null>(null);

const [fechaEspecial, setFechaEspecial] = useState("");
const [horaInicioEspecial, setHoraInicioEspecial] = useState("");
const [horaFinEspecial, setHoraFinEspecial] = useState("");
const [bloqueosAgenda, setBloqueosAgenda] = useState<BloqueoAgenda[]>([]);
const [mostrarFormularioBloqueo, setMostrarFormularioBloqueo] = useState(false);
const [inicioBloqueo, setInicioBloqueo] = useState(seleccionFechaHoraInicial);
const [finBloqueo, setFinBloqueo] = useState(seleccionFechaHoraInicial);

  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [datosAlerta, setDatosAlerta] = useState<{
    tipo: "exito" | "error" | "advertencia" | "confirmacion";
    titulo: string;
    mensaje: string;
  }>({
    tipo: "exito",
    titulo: "",
    mensaje: "",
  });

  const [accionConfirmacion, setAccionConfirmacion] = useState<{
    tipo: "disponibilidad" | "especial" | "bloqueo";
    id: number;
  } | null>(null);

  const formularioRef = useRef<HTMLDivElement | null>(null);

  function mostrarMensaje(
    tipo: "exito" | "error" | "advertencia",
    titulo: string,
    mensaje: string
  ) {
    setDatosAlerta({ tipo, titulo, mensaje });
    setMostrarAlerta(true);
  }

  function mostrarConfirmacion(
    tipo: "disponibilidad" | "especial" | "bloqueo",
    id: number,
    titulo: string,
    mensaje: string
  ) {
    setAccionConfirmacion({ tipo, id });
    setDatosAlerta({ tipo: "confirmacion", titulo, mensaje });
    setMostrarAlerta(true);
  }

  function cerrarAlerta() {
    setMostrarAlerta(false);
    setAccionConfirmacion(null);
  }

  function desplazarAlFormulario() {
    setTimeout(() => {
      formularioRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  // =========================
  // CARGAR DISPONIBILIDADES
  // =========================

 useEffect(() => {
  cargarDisponibilidades();
  cargarDisponibilidadesEspeciales();
  cargarBloqueosAgenda();
}, []);

  async function cargarDisponibilidades() {
    try {
      setCargando(true);

      const respuesta = await fetch("/api/disponibilidad");

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar las disponibilidades");
      }

      const datos = await respuesta.json();

      setDisponibilidades(datos);
    } catch (error) {
      console.error("Error cargando disponibilidad:", error);
      mostrarMensaje("error", "No se pudieron cargar", "No se pudieron cargar las disponibilidades.");
    } finally {
      setCargando(false);
    }
  }
  async function cargarDisponibilidadesEspeciales() {
  try {
    const respuesta = await fetch("/api/disponibilidad-especial");

    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar las fechas especiales");
    }

    const datos = await respuesta.json();

    setDisponibilidadesEspeciales(datos);
  } catch (error) {
    console.error("Error cargando fechas especiales:", error);
    mostrarMensaje("error", "No se pudieron cargar", "No se pudieron cargar las fechas especiales.");
  }
}


  // =========================
  // ABRIR FORMULARIO NUEVO
  // =========================

  function abrirNuevo() {
    setEditando(null);
    setDiaSemana(1);
    setHoraInicio("");
    setHoraFin("");
    setMostrarFormulario(true);
  }

function abrirNuevaEspecial() {
  setEditandoEspecial(null);
  setFechaEspecial("");
  setHoraInicioEspecial("");
  setHoraFinEspecial("");
  setMostrarFormularioEspecial(true);
}
  // =========================
  // ABRIR FORMULARIO EDITAR
  // =========================

  function abrirEditar(disponibilidad: Disponibilidad) {
    setEditando(disponibilidad);

    setDiaSemana(disponibilidad.dia_semana);
    setHoraInicio(disponibilidad.hora_inicio.slice(0, 5));
    setHoraFin(disponibilidad.hora_fin.slice(0, 5));

    setMostrarFormulario(true);
    desplazarAlFormulario();
  }
  function abrirEditarEspecial(
  disponibilidad: DisponibilidadEspecial
) {
  setEditandoEspecial(disponibilidad);
  setFechaEspecial(disponibilidad.fecha);
  setHoraInicioEspecial(
    disponibilidad.hora_inicio.slice(0, 5)
  );
  setHoraFinEspecial(
    disponibilidad.hora_fin.slice(0, 5)
  );
  setMostrarFormularioEspecial(true);
}

  // =========================
  // CERRAR FORMULARIO
  // =========================

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setEditando(null);
    setHoraInicio("");
    setHoraFin("");
  }
function cerrarFormularioEspecial() {
  setMostrarFormularioEspecial(false);
  setEditandoEspecial(null);
  setFechaEspecial("");
  setHoraInicioEspecial("");
  setHoraFinEspecial("");
}
  // =========================
  // GUARDAR
  // =========================

  async function guardarDisponibilidad() {
    if (!horaInicio || !horaFin) {
      mostrarMensaje("advertencia", "Faltan datos", "Debes seleccionar la hora de inicio y la hora de fin.");
      return;
    }

    if (horaInicio >= horaFin) {
      mostrarMensaje("advertencia", "Horario no válido", "La hora de inicio debe ser menor que la hora de fin.");
      return;
    }

    try {
      setProcesando(true);

      const datos = {
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        ...(editando ? { id: editando.id } : {}),
      };

      const respuesta = await fetch("/api/disponibilidad", {
        method: editando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo guardar la disponibilidad"
        );
      }

      mostrarMensaje(
        "exito",
        editando ? "Disponibilidad actualizada" : "Disponibilidad creada",
        editando
          ? "La disponibilidad se actualizó correctamente."
          : "La disponibilidad se creó correctamente."
      );

      cerrarFormulario();
      await cargarDisponibilidades();
    } catch (error) {
      console.error("Error guardando disponibilidad:", error);

      mostrarMensaje(
        "error",
        "No se pudo guardar",
        error instanceof Error
          ? error.message
          : "No se pudo guardar la disponibilidad."
      );
    } finally {
      setProcesando(false);
    }
  }
  async function guardarDisponibilidadEspecial() {
  if (!fechaEspecial || !horaInicioEspecial || !horaFinEspecial) {
    mostrarMensaje(
      "advertencia",
      "Faltan datos",
      "Debes seleccionar la fecha, hora de inicio y hora de fin."
    );
    return;
  }

  if (horaInicioEspecial >= horaFinEspecial) {
    mostrarMensaje(
      "advertencia",
      "Horario no válido",
      "La hora de inicio debe ser menor que la hora de fin."
    );
    return;
  }

  try {
    setProcesando(true);

    const datos = {
      ...(editandoEspecial
        ? { id: editandoEspecial.id }
        : {}),
      fecha: fechaEspecial,
      hora_inicio: horaInicioEspecial,
      hora_fin: horaFinEspecial,
    };

    const respuesta = await fetch(
      "/api/disponibilidad-especial",
      {
        method: editandoEspecial ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
          "No se pudo guardar la disponibilidad especial"
      );
    }

    mostrarMensaje(
      "exito",
      editandoEspecial ? "Fecha especial actualizada" : "Fecha especial creada",
      editandoEspecial
        ? "La fecha especial se actualizó correctamente."
        : "La fecha especial se creó correctamente."
    );

    cerrarFormularioEspecial();
    await cargarDisponibilidadesEspeciales();
  } catch (error) {
    console.error(
      "Error guardando fecha especial:",
      error
    );

    mostrarMensaje(
      "error",
      "No se pudo guardar",
      error instanceof Error
        ? error.message
        : "No se pudo guardar la fecha especial."
    );
  } finally {
    setProcesando(false);
  }
}

  // =========================
  // DESACTIVAR
  // =========================

  async function desactivarDisponibilidad(id: number) {
    try {
      setProcesando(true);

      const respuesta = await fetch("/api/disponibilidad", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo desactivar la disponibilidad"
        );
      }

      mostrarMensaje("exito", "Disponibilidad desactivada", "La disponibilidad se desactivó correctamente.");

      await cargarDisponibilidades();
    } catch (error) {
      console.error("Error desactivando disponibilidad:", error);

      mostrarMensaje(
        "error",
        "No se pudo desactivar",
        error instanceof Error
          ? error.message
          : "No se pudo desactivar la disponibilidad."
      );
    } finally {
      setProcesando(false);
    }
  }
async function desactivarDisponibilidadEspecial(id: number) {
  try {
    setProcesando(true);

    const respuesta = await fetch(
      "/api/disponibilidad-especial",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
          "No se pudo desactivar la fecha especial"
      );
    }

    mostrarMensaje(
      "exito",
      "Fecha especial desactivada",
      "La fecha especial se desactivó correctamente."
    );

    await cargarDisponibilidadesEspeciales();
  } catch (error) {
    console.error(
      "Error desactivando fecha especial:",
      error
    );

    mostrarMensaje(
      "error",
      "No se pudo desactivar",
      error instanceof Error
        ? error.message
        : "No se pudo desactivar la fecha especial."
    );
  } finally {
    setProcesando(false);
  }
}

async function cargarBloqueosAgenda() {
  try {
    const respuesta = await fetch("/api/bloqueos-agenda", { cache: "no-store" });

    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar los bloqueos de agenda.");
    }

    setBloqueosAgenda(await respuesta.json());
  } catch (error) {
    console.error("Error cargando bloqueos de agenda:", error);
    mostrarMensaje("error", "No se pudieron cargar", "No se pudieron cargar los bloqueos de agenda.");
  }
}

function abrirNuevoBloqueo() {
  setInicioBloqueo(seleccionFechaHoraInicial);
  setFinBloqueo(seleccionFechaHoraInicial);
  setMostrarFormularioBloqueo(true);
}

function convertirFechaHoraA24Horas(seleccion: SeleccionFechaHora) {
  const hora12 = Number(seleccion.hora) % 12;
  const hora24 = hora12 + (seleccion.periodo === "PM" ? 12 : 0);

  return `${seleccion.fecha}T${String(hora24).padStart(2, "0")}:${seleccion.minuto}`;
}

async function guardarBloqueoAgenda() {
  if (!inicioBloqueo.fecha || !finBloqueo.fecha) {
    mostrarMensaje("advertencia", "Faltan datos", "Selecciona la fecha de inicio y la fecha final.");
    return;
  }

  const inicio = convertirFechaHoraA24Horas(inicioBloqueo);
  const fin = convertirFechaHoraA24Horas(finBloqueo);

  if (inicio >= fin) {
    mostrarMensaje(
      "advertencia",
      "Intervalo no válido",
      "La fecha y hora final deben ser posteriores al inicio."
    );
    return;
  }

  try {
    setProcesando(true);
    const respuesta = await fetch("/api/bloqueos-agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inicio, fin }),
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(resultado.error || "No se pudo guardar el bloqueo.");
    }

    setMostrarFormularioBloqueo(false);
    setInicioBloqueo(seleccionFechaHoraInicial);
    setFinBloqueo(seleccionFechaHoraInicial);
    mostrarMensaje("exito", "Bloqueo creado", "El intervalo ya no estará disponible para nuevas citas.");
    await cargarBloqueosAgenda();
  } catch (error) {
    console.error("Error guardando bloqueo:", error);
    mostrarMensaje(
      "error",
      "No se pudo guardar",
      error instanceof Error ? error.message : "No se pudo guardar el bloqueo."
    );
  } finally {
    setProcesando(false);
  }
}

async function desactivarBloqueoAgenda(id: number) {
  try {
    setProcesando(true);
    const respuesta = await fetch("/api/bloqueos-agenda", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(resultado.error || "No se pudo quitar el bloqueo.");
    }

    mostrarMensaje("exito", "Bloqueo desactivado", "El horario volvió a estar disponible según los horarios de atención.");
    await cargarBloqueosAgenda();
  } catch (error) {
    console.error("Error desactivando bloqueo:", error);
    mostrarMensaje(
      "error",
      "No se pudo desactivar",
      error instanceof Error ? error.message : "No se pudo quitar el bloqueo."
    );
  } finally {
    setProcesando(false);
  }
}

function formatearFechaHoraLocal(valor: string) {
  const fecha = new Date(valor);
  return fecha.toLocaleString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

  // =========================
  // FORMATEAR HORA
  // =========================

  function formatearHora(hora: string) {
    const [horas, minutos] = hora.split(":");

    const horaNumero = Number(horas);

    const periodo = horaNumero >= 12 ? "PM" : "AM";

    const hora12 = horaNumero % 12 || 12;

    return `${hora12}:${minutos} ${periodo}`;
  }

  // =========================
  // RENDER
  // =========================

  return (
    <main className="min-h-screen bg-[#F7F1E9] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* ENCABEZADO */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#C56835]">
              Administración
            </p>

            <h1 className="mt-1 font-serif text-3xl text-[#3F4635]">
              Disponibilidad
            </h1>

            <p className="mt-2 text-sm text-[#707469]">
              Configura los días y horarios en los que estarán disponibles
              las consultas.
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
              onClick={abrirNuevo}
              className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a95429]"
            >
              + Agregar horario
            </button>
          </div>
        </div>

        {/* FORMULARIO */}

        {mostrarFormulario && (
          <div
            ref={formularioRef}
            className="mb-8 scroll-mt-6 rounded-2xl border border-[#E1DBD2] bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-[#3F4635]">
                  {editando
                    ? "Editar disponibilidad"
                    : "Agregar disponibilidad"}
                </h2>

                <p className="mt-1 text-sm text-[#707469]">
                  Define el día y horario de atención.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                className="text-2xl text-[#707469] transition hover:text-[#C56835]"
              >
                ×
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-3">

              {/* DÍA */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#3F4635]">
                  Día de la semana
                </label>

                <select
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
                >
                  {diasSemana.map((dia, index) => (
                    <option key={index} value={index}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

            {/* HORA INICIO */}

<div>
  <label className="mb-2 block text-sm font-medium text-[#3F4635]">
    Hora de inicio
  </label>

  <select
    value={horaInicio}
    onChange={(e) => setHoraInicio(e.target.value)}
    className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
  >
    <option value="">Selecciona una hora</option>
    <option value="08:00">8:00 AM</option>
    <option value="09:00">9:00 AM</option>
    <option value="10:00">10:00 AM</option>
    <option value="11:00">11:00 AM</option>
    <option value="12:00">12:00 PM</option>
    <option value="13:00">1:00 PM</option>
    <option value="14:00">2:00 PM</option>
    <option value="15:00">3:00 PM</option>
    <option value="16:00">4:00 PM</option>
    <option value="17:00">5:00 PM</option>
    <option value="18:00">6:00 PM</option>
    <option value="19:00">7:00 PM</option>
    <option value="20:00">8:00 PM</option>
  </select>
</div>

{/* HORA FIN */}

<div>
  <label className="mb-2 block text-sm font-medium text-[#3F4635]">
    Hora de fin
  </label>

  <select
    value={horaFin}
    onChange={(e) => setHoraFin(e.target.value)}
    className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
  >
    <option value="">Selecciona una hora</option>
    <option value="08:00">8:00 AM</option>
    <option value="09:00">9:00 AM</option>
    <option value="10:00">10:00 AM</option>
    <option value="11:00">11:00 AM</option>
    <option value="12:00">12:00 PM</option>
    <option value="13:00">1:00 PM</option>
    <option value="14:00">2:00 PM</option>
    <option value="15:00">3:00 PM</option>
    <option value="16:00">4:00 PM</option>
    <option value="17:00">5:00 PM</option>
    <option value="18:00">6:00 PM</option>
    <option value="19:00">7:00 PM</option>
    <option value="20:00">8:00 PM</option>
  </select>
</div>
            </div>

            {/* BOTONES */}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={procesando}
                className="rounded-full border border-[#D8D2C9] px-6 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#F7F1E9]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarDisponibilidad}
                disabled={procesando}
                className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a95429] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {procesando
                  ? "Guardando..."
                  : editando
                  ? "Guardar cambios"
                  : "Guardar horario"}
              </button>
            </div>
          </div>
        )}

        {/* CONTENIDO */}

        {cargando ? (
          <div className="rounded-2xl border border-[#E1DBD2] bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-[#707469]">
              Cargando disponibilidades...
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {diasSemana.map((dia, index) => {
              const horariosDelDia = disponibilidades.filter(
                (disponibilidad) =>
                  disponibilidad.dia_semana === index &&
                  Number(disponibilidad.activo) === 1
              );

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-[#E1DBD2] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    {/* NOMBRE DEL DÍA */}

                    <div className="min-w-[150px]">
                      <h2 className="font-serif text-xl text-[#3F4635]">
                        {dia}
                      </h2>
                    </div>

                    {/* HORARIOS */}

                    <div className="flex flex-1 flex-wrap gap-3">
                      {horariosDelDia.length === 0 ? (
                        <span className="rounded-full bg-[#F7F1E9] px-4 py-2 text-sm text-[#707469]">
                          Sin disponibilidad
                        </span>
                      ) : (
                        horariosDelDia.map((horario) => (
                          <div
                            key={horario.id}
                            className="flex items-center gap-3 rounded-full bg-[#EEF2EA] px-4 py-2"
                          >
                            <span className="text-sm font-medium text-[#3F4635]">
                              {formatearHora(horario.hora_inicio)} -{" "}
                              {formatearHora(horario.hora_fin)}
                            </span>

                            <button
                              type="button"
                              onClick={() => abrirEditar(horario)}
                              disabled={procesando}
                              className="text-xs font-medium text-[#C56835] hover:underline"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                mostrarConfirmacion(
                                  "disponibilidad",
                                  horario.id,
                                  "¿Desactivar disponibilidad?",
                                  "Esta disponibilidad dejará de estar disponible para nuevas reservas."
                                )
                              }
                              disabled={procesando}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Desactivar
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* AGREGAR */}

                    <button
                      type="button"
                      onClick={() => {
                        setDiaSemana(index);
                        setEditando(null);
                        setHoraInicio("");
                        setHoraFin("");
                        setMostrarFormulario(true);
                        desplazarAlFormulario();
                      }}
                      className="text-sm font-medium text-[#C56835] hover:underline"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* DISPONIBILIDAD ESPECIAL */}

<div className="mt-10">

  <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

    <div>
      <p className="text-sm font-medium text-[#C56835]">
        Fechas especiales
      </p>

      <h2 className="mt-1 font-serif text-2xl text-[#3F4635]">
        Disponibilidad por fecha
      </h2>

      <p className="mt-1 text-sm text-[#707469]">
        Agrega horarios específicos para una fecha determinada,
        incluyendo sábados, domingos o días en los que quieras
        trabajar de manera excepcional.
      </p>
    </div>

    <button
      type="button"
      onClick={abrirNuevaEspecial}
      className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a95429]"
    >
      + Agregar fecha especial
    </button>

  </div>

  {/* FORMULARIO ESPECIAL */}

  {mostrarFormularioEspecial && (
    <div className="mb-6 rounded-2xl border border-[#E1DBD2] bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-center justify-between">

        <div>
          <h3 className="font-serif text-xl text-[#3F4635]">
            {editandoEspecial
              ? "Editar fecha especial"
              : "Agregar fecha especial"}
          </h3>

          <p className="mt-1 text-sm text-[#707469]">
            Define un horario específico para una fecha.
          </p>
        </div>

        <button
          type="button"
          onClick={cerrarFormularioEspecial}
          className="text-2xl text-[#707469] transition hover:text-[#C56835]"
        >
          ×
        </button>

      </div>

      <div className="grid gap-5 md:grid-cols-3">

        {/* FECHA */}

        <div>
          <label className="mb-2 block text-sm font-medium text-[#3F4635]">
            Fecha
          </label>

          <input
            type="date"
            value={fechaEspecial}
            onChange={(e) =>
              setFechaEspecial(e.target.value)
            }
            className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
          />
        </div>

        {/* HORA INICIO */}

        <div>
          <label className="mb-2 block text-sm font-medium text-[#3F4635]">
            Hora de inicio
          </label>

          <select
            value={horaInicioEspecial}
            onChange={(e) =>
              setHoraInicioEspecial(e.target.value)
            }
            className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
          >
            <option value="">
              Selecciona una hora
            </option>

            <option value="08:00">8:00 AM</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
            <option value="17:00">5:00 PM</option>
            <option value="18:00">6:00 PM</option>
            <option value="19:00">7:00 PM</option>
            <option value="20:00">8:00 PM</option>
          </select>
        </div>

        {/* HORA FIN */}

        <div>
          <label className="mb-2 block text-sm font-medium text-[#3F4635]">
            Hora de fin
          </label>

          <select
            value={horaFinEspecial}
            onChange={(e) =>
              setHoraFinEspecial(e.target.value)
            }
            className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
          >
            <option value="">
              Selecciona una hora
            </option>

            <option value="08:00">8:00 AM</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
            <option value="17:00">5:00 PM</option>
            <option value="18:00">6:00 PM</option>
            <option value="19:00">7:00 PM</option>
            <option value="20:00">8:00 PM</option>
          </select>
        </div>

      </div>

      <div className="mt-6 flex justify-end gap-3">

        <button
          type="button"
          onClick={cerrarFormularioEspecial}
          disabled={procesando}
          className="rounded-full border border-[#D8D2C9] px-6 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#F7F1E9]"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={guardarDisponibilidadEspecial}
          disabled={procesando}
          className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a95429] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {procesando
            ? "Guardando..."
            : editandoEspecial
            ? "Guardar cambios"
            : "Guardar fecha"}
        </button>

      </div>

    </div>
  )}

  {/* LISTA DE FECHAS ESPECIALES */}

  <div className="space-y-3">

    {disponibilidadesEspeciales.length === 0 ? (
      <div className="rounded-2xl border border-[#E1DBD2] bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-[#707469]">
          No hay fechas especiales configuradas.
        </p>
      </div>
    ) : (
      disponibilidadesEspeciales
        .filter(
          (especial) =>
            Number(especial.activo) === 1
        )
        .map((especial) => (
          <div
            key={especial.id}
            className="rounded-2xl border border-[#E1DBD2] bg-white p-5 shadow-sm"
          >

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>
                <p className="text-sm font-medium text-[#C56835]">
                  Fecha especial
                </p>

                <h3 className="mt-1 font-serif text-xl text-[#3F4635]">
                  {new Date(
                    `${especial.fecha}T00:00:00`
                  ).toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">

                <span className="rounded-full bg-[#EEF2EA] px-4 py-2 text-sm font-medium text-[#3F4635]">
                  {formatearHora(especial.hora_inicio)} -{" "}
                  {formatearHora(especial.hora_fin)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    abrirEditarEspecial(especial)
                  }
                  disabled={procesando}
                  className="text-sm font-medium text-[#C56835] hover:underline"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    mostrarConfirmacion(
                      "especial",
                      especial.id,
                      "¿Desactivar fecha especial?",
                      "Esta fecha especial dejará de estar disponible para nuevas reservas."
                    )
                  }
                  disabled={procesando}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Desactivar
                </button>

              </div>

            </div>

          </div>
        ))
    )}

  </div>

</div>

        {/* BLOQUEOS DE AGENDA */}

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#C56835]">Bloqueos</p>
              <h2 className="mt-1 font-serif text-2xl text-[#3F4635]">
                Bloqueos de agenda
              </h2>
              <p className="mt-1 text-sm text-[#707469]">
                Cierra un intervalo para que no se puedan reservar citas durante ese tiempo.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirNuevoBloqueo}
              className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a95429]"
            >
              + Agregar bloqueo
            </button>
          </div>

          {mostrarFormularioBloqueo && (
            <div className="mb-5 rounded-2xl border border-[#E1DBD2] bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl text-[#3F4635]">
                Nuevo bloqueo
              </h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3F4635]">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={inicioBloqueo.fecha}
                    onChange={(e) =>
                      setInicioBloqueo((actual) => ({ ...actual, fecha: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-[#3F4635]">
                    Hora de inicio
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      aria-label="Hora de inicio"
                      value={inicioBloqueo.hora}
                      onChange={(e) =>
                        setInicioBloqueo((actual) => ({ ...actual, hora: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[#D8D2C9] bg-white px-3 py-3 text-sm text-[#3F4635]"
                    >
                      {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hora) => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Minutos de inicio"
                      value={inicioBloqueo.minuto}
                      onChange={(e) =>
                        setInicioBloqueo((actual) => ({ ...actual, minuto: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[#D8D2C9] bg-white px-3 py-3 text-sm text-[#3F4635]"
                    >
                      {Array.from({ length: 60 }, (_, minuto) => String(minuto).padStart(2, "0")).map((minuto) => (
                        <option key={minuto} value={minuto}>{minuto}</option>
                      ))}
                    </select>
                    <select
                      aria-label="AM o PM para inicio"
                      value={inicioBloqueo.periodo}
                      onChange={(e) =>
                        setInicioBloqueo((actual) => ({ ...actual, periodo: e.target.value as "AM" | "PM" }))
                      }
                      className="w-full rounded-xl border border-[#D8D2C9] bg-white px-3 py-3 text-sm text-[#3F4635]"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#3F4635]">
                    Fecha final
                  </label>
                  <input
                    type="date"
                    value={finBloqueo.fecha}
                    min={inicioBloqueo.fecha || undefined}
                    onChange={(e) =>
                      setFinBloqueo((actual) => ({ ...actual, fecha: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#D8D2C9] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none focus:border-[#C56835]"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-[#3F4635]">
                    Hora final
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      aria-label="Hora final"
                      value={finBloqueo.hora}
                      onChange={(e) =>
                        setFinBloqueo((actual) => ({ ...actual, hora: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[#D8D2C9] bg-white px-3 py-3 text-sm text-[#3F4635]"
                    >
                      {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hora) => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Minutos finales"
                      value={finBloqueo.minuto}
                      onChange={(e) =>
                        setFinBloqueo((actual) => ({ ...actual, minuto: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[#D8D2C9] bg-white px-3 py-3 text-sm text-[#3F4635]"
                    >
                      {Array.from({ length: 60 }, (_, minuto) => String(minuto).padStart(2, "0")).map((minuto) => (
                        <option key={minuto} value={minuto}>{minuto}</option>
                      ))}
                    </select>
                    <select
                      aria-label="AM o PM para fin"
                      value={finBloqueo.periodo}
                      onChange={(e) =>
                        setFinBloqueo((actual) => ({ ...actual, periodo: e.target.value as "AM" | "PM" }))
                      }
                      className="w-full rounded-xl border border-[#D8D2C9] bg-white px-3 py-3 text-sm text-[#3F4635]"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarFormularioBloqueo(false)}
                  disabled={procesando}
                  className="rounded-full border border-[#D8D2C9] px-6 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#F7F1E9]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarBloqueoAgenda}
                  disabled={procesando}
                  className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a95429] disabled:opacity-60"
                >
                  {procesando ? "Guardando..." : "Guardar bloqueo"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {bloqueosAgenda.length === 0 ? (
              <div className="rounded-2xl border border-[#E1DBD2] bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-[#707469]">No hay bloqueos activos.</p>
              </div>
            ) : (
              bloqueosAgenda.map((bloqueo) => (
                <div
                  key={bloqueo.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#E1DBD2] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[#C56835]">No disponible</p>
                    <p className="mt-1 text-sm text-[#3F4635]">
                      {formatearFechaHoraLocal(bloqueo.inicio)} — {formatearFechaHoraLocal(bloqueo.fin)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      mostrarConfirmacion(
                        "bloqueo",
                        bloqueo.id,
                        "¿Quitar este bloqueo?",
                        "El intervalo volverá a estar disponible según los horarios de atención."
                      )
                    }
                    disabled={procesando}
                    className="self-start text-sm font-medium text-red-600 hover:underline sm:self-auto"
                  >
                    Quitar bloqueo
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ALERTA PERSONALIZADA */}

        {mostrarAlerta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="p-6">
                <div className="mb-5 flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                      datosAlerta.tipo === "exito"
                        ? "bg-[#EEF2EA] text-[#59614D]"
                        : datosAlerta.tipo === "error"
                        ? "bg-red-50 text-red-600"
                        : datosAlerta.tipo === "advertencia"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-[#F7F1E9] text-[#C56835]"
                    }`}
                  >
                    {datosAlerta.tipo === "exito"
                      ? "✓"
                      : datosAlerta.tipo === "error"
                      ? "!"
                      : datosAlerta.tipo === "advertencia"
                      ? "⚠"
                      : "?"}
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
                    onClick={cerrarAlerta}
                    className="text-2xl leading-none text-[#A19B92] transition hover:text-[#C56835]"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  {datosAlerta.tipo === "confirmacion" ? (
                    <>
                      <button
                        type="button"
                        onClick={cerrarAlerta}
                        className="w-full rounded-full border border-[#D8D2C9] px-5 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-[#F7F1E9] sm:w-auto"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const accion = accionConfirmacion;
                          cerrarAlerta();

                          if (accion?.tipo === "disponibilidad") {
                            desactivarDisponibilidad(accion.id);
                          }

                          if (accion?.tipo === "especial") {
                            desactivarDisponibilidadEspecial(accion.id);
                          }

                          if (accion?.tipo === "bloqueo") {
                            desactivarBloqueoAgenda(accion.id);
                          }
                        }}
                        className="w-full rounded-full bg-[#C56835] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#A95429] sm:w-auto"
                      >
                        Sí, desactivar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={cerrarAlerta}
                      className="w-full rounded-full bg-[#C56835] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#A95429] sm:w-auto"
                    >
                      Entendido
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INFORMACIÓN */}

        <div className="mt-8 rounded-2xl border border-[#E1DBD2] bg-[#E1DBD2]/40 p-5">
          <p className="text-sm leading-6 text-[#3F4635]">
            <strong>Importante:</strong> estos horarios serán utilizados
            posteriormente por el sistema de agendamiento para mostrar a
            los pacientes únicamente los espacios disponibles.
          </p>
        </div>
      </div>
    </main>
  );
}
