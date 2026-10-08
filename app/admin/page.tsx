"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "../components/AdminNav";

type DisponibilidadSemanal = {
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
};

type DisponibilidadEspecial = {
    fecha: string;
    hora_inicio: string | null;
    hora_fin: string | null;
};

type CitaOcupada = {
    hora: string;
};

type Cita = {
    id: number;
    fecha: string;
    hora: string;
    modalidad: string;
    estado: string;
    origen_reserva: string | null;
    nombre_completo: string;
    email: string;
    telefono: string;
    servicio_nombre: string;
    cedula?: string | null;
};

export default function AdminPage() {
    const [citas, setCitas] = useState<Cita[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState("TODAS");
    const [busqueda, setBusqueda] = useState("");

    // Quita tildes/acentos y pasa a minúsculas, para que buscar
    // "simon" encuentre "Simón" sin importar mayúsculas ni tildes.
    function normalizarTexto(texto: string): string {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }
    const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);

    const [accionPendiente, setAccionPendiente] = useState<{
        cita: Cita;
        estado: string;
    } | null>(null);

    const [procesandoAccion, setProcesandoAccion] = useState(false);

    const [enviandoTestimonioId, setEnviandoTestimonioId] = useState<
        number | null
    >(null);

    const [mostrarAlerta, setMostrarAlerta] = useState(false);
    const [datosAlerta, setDatosAlerta] = useState<{
        tipo: "exito" | "error" | "advertencia";
        titulo: string;
        mensaje: string;
    }>({
        tipo: "error",
        titulo: "",
        mensaje: "",
    });

    // ================================
    // REPROGRAMACIÓN
    // ================================

    const [citaReprogramar, setCitaReprogramar] = useState<Cita | null>(null);
    const [nuevaFecha, setNuevaFecha] = useState("");
    const [nuevaHora, setNuevaHora] = useState("");
    const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
    const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
    const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
    const [errorDisponibilidad, setErrorDisponibilidad] = useState("");
    const [procesandoReprogramacion, setProcesandoReprogramacion] =
        useState(false);

    useEffect(() => {
        let activa = true;

        void fetch("/api/citas")
            .then(async (respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar las citas");
                }

                const datos = await respuesta.json();
                if (activa) setCitas(datos);
            })
            .catch((error: unknown) => {
                if (activa) console.error("Error cargando citas:", error);
            })
            .finally(() => {
                if (activa) setCargando(false);
            });

        return () => {
            activa = false;
        };
    }, []);

    const citasFiltradas = citas.filter((cita) => {
        const ahora = new Date();
        const fechaCita = convertirFechaParaComparacion(cita.fecha);
        if (!fechaCita) return false;

        if (filtro === "HOY") {
            return (
                ahora.getFullYear() === fechaCita.getFullYear() &&
                ahora.getMonth() === fechaCita.getMonth() &&
                ahora.getDate() === fechaCita.getDate()
            );
        }

        if (filtro === "PROXIMAS") {
            const fechaHoraCita = convertirFechaHoraParaComparacion(cita.fecha, cita.hora);
            return !!fechaHoraCita && fechaHoraCita >= ahora && cita.estado !== "CANCELADA";
        }
        if (filtro === "PENDIENTES") return cita.estado === "PENDIENTE";
        if (filtro === "CONFIRMADAS") return cita.estado === "CONFIRMADA";
        if (filtro === "CANCELADAS") return cita.estado === "CANCELADA";
        if (filtro === "COMPLETADAS") return cita.estado === "COMPLETADA";
        return true;
    }).filter((cita) => {
        const termino = normalizarTexto(busqueda.trim());
        if (!termino) return true;

        // Busca por nombre del cliente, sin importar mayúsculas,
        // minúsculas ni tildes. Si más adelante se agrega la cédula
        // a la base de datos, esta misma búsqueda la incluirá
        // automáticamente (cita.cedula), sin tener que tocar esto.
        const nombre = normalizarTexto(String(cita.nombre_completo || ""));
        const cedula = normalizarTexto(String(cita.cedula || ""));

        return nombre.includes(termino) || cedula.includes(termino);
    }).sort((a, b) => {
        // "Todas" se deja en el orden que ya trae del servidor
        // (más recién agendada primero). Con cualquier filtro
        // activo, se ordena por la fecha de la CITA, de la más
        // cercana a hoy hacia adelante — más útil para trabajar
        // el día a día.
        if (filtro === "TODAS") return 0;

        const fechaHoraA = convertirFechaHoraParaComparacion(a.fecha, a.hora);
        const fechaHoraB = convertirFechaHoraParaComparacion(b.fecha, b.hora);

        if (!fechaHoraA || !fechaHoraB) return 0;

        return fechaHoraA.getTime() - fechaHoraB.getTime();
    });

    async function actualizarEstadoCita(id: number, estado: string) {
        try {
            setProcesandoAccion(true);

            const respuesta = await fetch("/api/citas", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id,
                    estado,
                }),
            });

            if (!respuesta.ok) {
                throw new Error("No se pudo actualizar la cita");
            }

            setCitas((citasActuales) =>
    citasActuales.map((cita) =>
        String(cita.id) === String(id)
            ? { ...cita, estado }
            : cita
    )
);
            setDatosAlerta({
                tipo: "exito",
                titulo:
                    estado === "CONFIRMADA"
                        ? "Cita confirmada"
                        : estado === "CANCELADA"
                            ? "Cita cancelada"
                            : "Cita completada",
                mensaje:
                    estado === "CONFIRMADA"
                        ? "La cita fue confirmada correctamente."
                        : estado === "CANCELADA"
                            ? "La cita fue cancelada correctamente."
                            : "La cita fue marcada como completada.",
            });

            setMostrarAlerta(true);
        } catch (error) {
            console.error("Error actualizando cita:", error);

            setDatosAlerta({
                tipo: "error",
                titulo: "No se pudo actualizar",
                mensaje: "No se pudo actualizar la cita.",
            });

            setMostrarAlerta(true);
        } finally {
            setProcesandoAccion(false);
        }
    }

    // ================================
    // ENVIAR INVITACIÓN A TESTIMONIO (MANUAL)
    // ================================
    // El proceso automático (cron) también puede enviarla solo;
    // esta función es para cuando la psicóloga quiere avisarle
    // al cliente antes de que pase la hora programada de la cita.

    async function enviarTestimonioManual(citaId: number) {
        try {
            setEnviandoTestimonioId(citaId);

            const respuesta = await fetch("/api/testimonios/invitar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ citaId }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error || "No se pudo enviar la invitación."
                );
            }

            setDatosAlerta({
                tipo: "exito",
                titulo: "Invitación enviada",
                mensaje:
                    "Se envió al cliente la invitación para dejar su testimonio.",
            });

            setMostrarAlerta(true);
        } catch (error) {
            console.error("Error enviando invitación de testimonio:", error);

            setDatosAlerta({
                tipo: "error",
                titulo: "No se pudo enviar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "No se pudo enviar la invitación.",
            });

            setMostrarAlerta(true);
        } finally {
            setEnviandoTestimonioId(null);
        }
    }
    // ================================
    // FORMATEAR FECHAS Y HORAS
    // ================================

    function obtenerFechaISO(fecha: string) {
        if (!fecha) return "";
        const texto = String(fecha);
        const coincidencia = texto.match(/^(\d{4}-\d{2}-\d{2})/);
        return coincidencia ? coincidencia[1] : "";
    }

    function formatearFecha(fecha: string) {
        const fechaISO = obtenerFechaISO(fecha);
        if (!fechaISO) return "Fecha no disponible";
        const [año, mes, dia] = fechaISO.split("-").map(Number);
        if (!año || !mes || !dia) return "Fecha no disponible";
        return new Date(año, mes - 1, dia).toLocaleDateString("es-CO", {
            day: "numeric", month: "long", year: "numeric",
        });
    }

    function formatearFechaCorta(fecha: string) {
        const fechaISO = obtenerFechaISO(fecha);
        if (!fechaISO) return "Fecha no disponible";
        const [año, mes, dia] = fechaISO.split("-").map(Number);
        if (!año || !mes || !dia) return "Fecha no disponible";
        return new Date(año, mes - 1, dia).toLocaleDateString("es-CO", {
            day: "numeric", month: "short",
        });
    }

    function convertirFechaParaComparacion(fecha: string) {
        const fechaISO = obtenerFechaISO(fecha);
        if (!fechaISO) return null;
        const [año, mes, dia] = fechaISO.split("-").map(Number);
        if (!año || !mes || !dia) return null;
        return new Date(año, mes - 1, dia);
    }

    function convertirFechaHoraParaComparacion(fecha: string, hora: string) {
        const fechaISO = obtenerFechaISO(fecha);
        if (!fechaISO || !hora) return null;
        const [año, mes, dia] = fechaISO.split("-").map(Number);
        const [horas, minutos] = String(hora).split(":").map(Number);
        if (!año || !mes || !dia || Number.isNaN(horas) || Number.isNaN(minutos)) return null;
        return new Date(año, mes - 1, dia, horas, minutos);
    }

    function formatearHora(hora: string) {
        if (!hora) return "";
        const [horas, minutos] = String(hora).split(":").map(Number);
        if (Number.isNaN(horas) || Number.isNaN(minutos)) return "";
        const periodo = horas >= 12 ? "PM" : "AM";
        const hora12 = horas === 0 ? 12 : horas > 12 ? horas - 12 : horas;
        return `${hora12}:${String(minutos).padStart(2, "0")} ${periodo}`;
    }

    function generarHoras(horaInicio: string, horaFin: string) {
        const horas: string[] = [];
        let horaActual = Number(horaInicio.split(":")[0]);
        const horaFinal = Number(horaFin.split(":")[0]);

        while (horaActual < horaFinal) {
            horas.push(`${String(horaActual).padStart(2, "0")}:00`);
            horaActual++;
        }

        return horas;
    }

    // ================================
    // FECHA MÍNIMA PARA REPROGRAMAR
    // ================================

    function obtenerFechaMinima() {
        const hoy = new Date();

        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const dia = String(hoy.getDate()).padStart(2, "0");

        return `${año}-${mes}-${dia}`;
    }

    async function cargarDisponibilidadReprogramacion(fecha: string) {
        setNuevaFecha(fecha);
        setNuevaHora("");
        setHorasDisponibles([]);
        setHorasOcupadas([]);
        setErrorDisponibilidad("");

        if (!fecha || !citaReprogramar) return;

        setCargandoDisponibilidad(true);

        try {
            const [respuestaSemanal, respuestaEspecial, respuestaCitas] =
                await Promise.all([
                    fetch("/api/disponibilidad", { cache: "no-store" }),
                    fetch("/api/disponibilidad-especial", { cache: "no-store" }),
                    fetch(`/api/citas?fecha=${encodeURIComponent(fecha)}`, {
                        cache: "no-store",
                    }),
                ]);

            if (!respuestaSemanal.ok || !respuestaEspecial.ok || !respuestaCitas.ok) {
                throw new Error("No se pudo consultar la disponibilidad.");
            }

            const [semanal, especiales, citasDelDia] = (await Promise.all([
                respuestaSemanal.json(),
                respuestaEspecial.json(),
                respuestaCitas.json(),
            ])) as [
                DisponibilidadSemanal[],
                DisponibilidadEspecial[],
                CitaOcupada[],
            ];

            const fechaEspecial = especiales.find(
                (item) => item.fecha.slice(0, 10) === fecha
            );

            let horas: string[] = [];

            if (fechaEspecial) {
                if (fechaEspecial.hora_inicio && fechaEspecial.hora_fin) {
                    horas = generarHoras(
                        fechaEspecial.hora_inicio,
                        fechaEspecial.hora_fin
                    );
                }
            } else {
                const diaSemana = new Date(`${fecha}T12:00:00`).getDay();
                const disponibilidadDia = semanal.find(
                    (item) => Number(item.dia_semana) === diaSemana
                );

                if (disponibilidadDia) {
                    horas = generarHoras(
                        disponibilidadDia.hora_inicio,
                        disponibilidadDia.hora_fin
                    );
                }
            }

            const ocupadas = citasDelDia.map((cita) =>
                String(cita.hora).substring(0, 5)
            );
            const fechaActual = obtenerFechaISO(
                String(citaReprogramar.fecha ?? "")
            );
            const horaActual = String(citaReprogramar.hora ?? "").substring(0, 5);

            if (fecha === fechaActual) {
                const indiceHoraActual = ocupadas.indexOf(horaActual);
                if (indiceHoraActual >= 0) ocupadas.splice(indiceHoraActual, 1);
            }

            setHorasDisponibles(horas);
            setHorasOcupadas(ocupadas);
        } catch (error) {
            console.error("Error cargando disponibilidad de reprogramación:", error);
            setErrorDisponibilidad("No fue posible cargar los horarios disponibles.");
        } finally {
            setCargandoDisponibilidad(false);
        }
    }

    // ================================
    // ABRIR REPROGRAMACIÓN
    // ================================

    function abrirReprogramacion(cita: Cita) {
        setCitaReprogramar(cita);
        setNuevaFecha("");
        setNuevaHora("");
        setHorasDisponibles([]);
        setHorasOcupadas([]);
        setErrorDisponibilidad("");
    }

    // ================================
    // REPROGRAMAR CITA
    // ================================

    async function reprogramarCita() {
        if (!citaReprogramar) return;

        if (!nuevaFecha || !nuevaHora) {
            setDatosAlerta({
                tipo: "advertencia",
                titulo: "Faltan datos",
                mensaje:
                    "Selecciona la nueva fecha y la nueva hora para reprogramar la cita.",
            });

            setMostrarAlerta(true);
            return;
        }

        const horaFinal = nuevaHora;

        setProcesandoReprogramacion(true);

        try {
            const respuesta = await fetch("/api/citas", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: citaReprogramar.id,
                    estado: "REPROGRAMAR",
                    fecha: nuevaFecha,
                    hora: horaFinal,
                }),
            });

            const datos = await respuesta.json().catch(() => null);

            if (!respuesta.ok) {
                if (respuesta.status === 409) {
                    setDatosAlerta({
                        tipo: "advertencia",
                        titulo: "Horario ocupado",
                        mensaje:
                            datos?.error ||
                            "Ese horario ya está ocupado. Selecciona otra fecha u hora.",
                    });

                    setMostrarAlerta(true);
                    return;
                }

                throw new Error(
                    datos?.error ||
                    "No se pudo reprogramar la cita."
                );
            }

            setCitas((citasActuales) =>
                citasActuales.map((cita) =>
                    cita.id === citaReprogramar.id
                        ? {
                            ...cita,
                            fecha: nuevaFecha,
                            hora: horaFinal,
                            estado: "CONFIRMADA",
                        }
                        : cita
                )
            );

            setCitaReprogramar(null);
            setNuevaFecha("");
            setNuevaHora("");
            setHorasDisponibles([]);
            setHorasOcupadas([]);

            setDatosAlerta({
                tipo: "exito",
                titulo: "Cita reprogramada",
                mensaje:
                    "La cita fue reprogramada correctamente. Se notificará al paciente por correo electrónico.",
            });

            setMostrarAlerta(true);
        } catch (error) {
            console.error("Error reprogramando cita:", error);

            setDatosAlerta({
                tipo: "error",
                titulo: "No se pudo reprogramar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error al reprogramar la cita.",
            });

            setMostrarAlerta(true);
        } finally {
            setProcesandoReprogramacion(false);
        }
    }

    return (
        <>
            <AdminNav />

            <main className="min-h-screen bg-[#F7F1E9] text-[#3F4635] lg:ml-[280px]">

                {/* ENCABEZADO */}
                <header className="border-b border-[#D8D0C5] bg-[#F7F1E9]">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

                        <div>
                            <h1 className="font-serif text-2xl">
                                Panel administrativo
                            </h1>

                            <p className="mt-1 text-sm text-[#707469]">
                                Gestión de tu consulta psicológica
                            </p>
                        </div>

                        <Link
                            href="/"
                            className="text-sm text-[#707469] transition hover:text-[#C56835]"
                        >
                            Volver al sitio
                        </Link>

                    </div>
                </header>

                {/* CONTENIDO */}
                <section className="mx-auto max-w-6xl px-6 py-10">

                    {/* BIENVENIDA */}
                    <div className="mb-8">

                        <p className="text-sm text-[#C56835]">
                            Administración
                        </p>

                        <h2 className="mt-1 font-serif text-3xl">
                            Citas
                        </h2>

                        {/* RESUMEN DE CITAS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

                            {/* Citas de hoy */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#E1DBD2]">

                                <p className="text-sm text-[#707469]">
                                    Citas de hoy
                                </p>

                                <p className="mt-2 font-serif text-3xl text-[#3F4635]">
                                    {citas.filter((cita) => {
                                        const hoy = new Date();
                                        const fechaCita = convertirFechaParaComparacion(cita.fecha);

                                        if (!fechaCita) return false;

                                        return (
                                            hoy.getFullYear() === fechaCita.getFullYear() &&
                                            hoy.getMonth() === fechaCita.getMonth() &&
                                            hoy.getDate() === fechaCita.getDate()
                                        );
                                    }).length}
                                </p>

                            </div>

                            {/* Citas pendientes */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#E1DBD2]">

                                <p className="text-sm text-[#707469]">
                                    Citas pendientes
                                </p>

                                <p className="mt-2 font-serif text-3xl text-[#C56835]">
                                    {citas.filter(
                                        (cita) => cita.estado === "PENDIENTE"
                                    ).length}
                                </p>

                            </div>

                            {/* Próxima cita */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#E1DBD2]">

                                <p className="text-sm text-[#707469]">
                                    Próxima cita
                                </p>

                                <p className="mt-2 font-serif text-xl text-[#3F4635]">

                                    {citas.length > 0
                                        ? (() => {

                                            const proxima = [...citas]
                                                .filter((cita) => {
                                                    if (cita.estado === "CANCELADA") return false;
                                                    const fechaHora = convertirFechaHoraParaComparacion(cita.fecha, cita.hora);
                                                    return !!fechaHora && fechaHora >= new Date();
                                                })
                                                .sort((a, b) => {
                                                    const fechaA = convertirFechaHoraParaComparacion(a.fecha, a.hora);
                                                    const fechaB = convertirFechaHoraParaComparacion(b.fecha, b.hora);
                                                    if (!fechaA || !fechaB) return 0;
                                                    return fechaA.getTime() - fechaB.getTime();
                                                })[0];

                                            if (!proxima) return "Sin citas";

                                            return `${formatearFechaCorta(proxima.fecha)} · ${formatearHora(proxima.hora)}`;
                                        })()
                                        : "Sin citas"}

                                </p>

                            </div>

                        </div>
                    </div>

                    {/* BUSCADOR */}
                    <div className="mb-4">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre del cliente..."
                            className="w-full max-w-md rounded-xl border border-[#E1DBD2] bg-white px-4 py-2.5 text-sm text-[#3F4635] focus:border-[#59614D] focus:outline-none sm:w-80"
                        />
                    </div>

                    {/* FILTROS */}
                    <div className="mb-4 flex flex-wrap gap-2">

                        {[
                            { valor: "TODAS", texto: "Todas" },
                            { valor: "HOY", texto: "Hoy" },
                            { valor: "PROXIMAS", texto: "Próximas" },
                            { valor: "PENDIENTES", texto: "Pendientes" },
                            { valor: "CONFIRMADAS", texto: "Confirmadas" },
                            { valor: "CANCELADAS", texto: "Canceladas" },
                            { valor: "COMPLETADAS", texto: "Completadas" },
                        ].map((opcion) => (

                            <button
                                key={opcion.valor}
                                type="button"
                                onClick={() => setFiltro(opcion.valor)}
                                className={`rounded-full px-4 py-2 text-sm transition ${filtro === opcion.valor
                                        ? "bg-[#3F4635] text-white"
                                        : "bg-white text-[#707469] border border-[#E1DBD2] hover:border-[#C56835] hover:text-[#C56835]"
                                    }`}
                            >
                                {opcion.texto}
                            </button>

                        ))}

                    </div>

                    {/* TARJETA DE CITAS */}
                    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">

                        {cargando ? (

                            <div className="p-8 text-center text-[#707469]">
                                Cargando citas...
                            </div>

                        ) : citas.length === 0 ? (

                            <div className="p-8 text-center text-[#707469]">
                                No hay citas registradas.
                            </div>

                        ) : (

                            <div className="overflow-x-auto">

                                <table className="w-full text-left text-sm">

                                    <thead className="border-b border-[#E1DBD2] bg-[#F7F1E9]">

                                        <tr>

                                            <th className="px-6 py-4 font-medium">
                                                Paciente
                                            </th>

                                            <th className="px-6 py-4 font-medium">
                                                Fecha
                                            </th>

                                            <th className="px-6 py-4 font-medium">
                                                Hora
                                            </th>

                                            <th className="px-6 py-4 font-medium">
                                                Modalidad
                                            </th>

                                            <th className="px-6 py-4 font-medium">
                                                Estado
                                            </th>

                                            <th className="px-6 py-4 font-medium">
                                                Acción
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {citasFiltradas.map((cita) => (

                                            <tr
                                                key={cita.id}
                                                className="border-b border-[#E1DBD2] last:border-0"
                                            >

                                                <td className="px-6 py-4">
                                                    {cita.nombre_completo || "Sin nombre"}
                                                </td>

                                                <td className="px-6 py-4">

                                                    {formatearFecha(cita.fecha)}

                                                </td>

                                                <td className="px-6 py-4">

                                                    {formatearHora(cita.hora)}

                                                </td>

                                                <td className="px-6 py-4">

                                                    <span
                                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cita.modalidad === "VIRTUAL"
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "bg-orange-50 text-orange-700"
                                                            }`}
                                                    >

                                                        <span>
                                                            {cita.modalidad === "VIRTUAL"
                                                                ? "💻"
                                                                : "🏢"}
                                                        </span>

                                                        {cita.modalidad === "VIRTUAL"
                                                            ? "Virtual"
                                                            : "Presencial"}

                                                    </span>

                                                </td>

                                                <td className="px-6 py-4">

                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${cita.estado === "CONFIRMADA"
                                                                ? "bg-green-50 text-green-700"
                                                                : cita.estado === "CANCELADA"
                                                                    ? "bg-red-50 text-red-700"
                                                                    : cita.estado === "COMPLETADA"
                                                                        ? "bg-blue-50 text-blue-700"
                                                                        : "bg-yellow-50 text-yellow-700"
                                                            }`}
                                                    >

                                                        {cita.estado === "CONFIRMADA"
                                                            ? "Confirmada"
                                                            : cita.estado === "CANCELADA"
                                                                ? "Cancelada"
                                                                : cita.estado === "COMPLETADA"
                                                                    ? "Completada"
                                                                    : "Pendiente"}

                                                    </span>

                                                </td>

                                                <td className="px-6 py-4">

                                                    <div className="flex flex-wrap gap-2">

                                                        {/* Ver detalles */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setCitaSeleccionada(cita)
                                                            }
                                                            className="rounded-full border border-[#D8D0C5] px-4 py-2 text-xs font-medium text-[#3F4635] transition hover:border-[#C56835] hover:text-[#C56835]"
                                                        >
                                                            Ver detalles
                                                        </button>

                                                        {/* Confirmar y cancelar */}
                                                        {cita.estado === "PENDIENTE" && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setAccionPendiente({
                                                                            cita,
                                                                            estado: "CONFIRMADA",
                                                                        })
                                                                    }
                                                                    className="text-sm font-medium text-green-700 hover:text-green-800"
                                                                >
                                                                    Confirmar
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setAccionPendiente({
                                                                            cita,
                                                                            estado: "CANCELADA",
                                                                        })
                                                                    }
                                                                    className="text-sm font-medium text-red-700 hover:text-red-800"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* REPROGRAMAR */}
                                                        {cita.estado === "CONFIRMADA" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    abrirReprogramacion(cita)
                                                                }
                                                                className="rounded-full bg-[#C56835] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
                                                            >
                                                                🔄 Reprogramar
                                                            </button>
                                                        )}
                                                        {/* COMPLETAR CITA */}
                                                        {cita.estado === "CONFIRMADA" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setAccionPendiente({
                                                                        cita,
                                                                        estado: "COMPLETADA",
                                                                    })
                                                                }
                                                                className="rounded-full bg-[#59614D] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
                                                            >
                                                                Completar cita
                                                            </button>
                                                        )}

                                                        {/* ENVIAR INVITACIÓN A TESTIMONIO (MANUAL) */}
                                                        {cita.estado === "COMPLETADA" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    enviarTestimonioManual(cita.id)
                                                                }
                                                                disabled={
                                                                    enviandoTestimonioId === cita.id
                                                                }
                                                                className="rounded-full border border-[#59614D] px-4 py-2 text-xs font-medium text-[#59614D] transition hover:bg-[#59614D] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {enviandoTestimonioId === cita.id
                                                                    ? "Enviando..."
                                                                    : "✉️ Pedir testimonio"}
                                                            </button>
                                                        )}

                                                    </div>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </section>

                {/* ========================================= */}
                {/* MODAL DETALLES */}
                {/* ========================================= */}

                {citaSeleccionada && (

                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

                        <div className="my-auto w-full max-w-md rounded-3xl bg-[#F7F1E9] p-5 shadow-2xl sm:p-6">

                            <div className="mb-6 flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-[#C56835]">
                                        Detalle de la cita
                                    </p>

                                    <h3 className="mt-1 font-serif text-2xl text-[#3F4635]">
                                        Información del paciente
                                    </h3>

                                </div>

                                <button
                                    type="button"
                                    onClick={() => setCitaSeleccionada(null)}
                                    className="text-2xl text-[#707469] transition hover:text-[#C56835]"
                                >
                                    ×
                                </button>

                            </div>

                            <div className="space-y-4 rounded-2xl bg-white/70 p-5 text-sm">

                                <div className="flex justify-between gap-4">
                                    <span className="text-[#707469]">
                                        Paciente
                                    </span>

                                    <strong className="text-right text-[#3F4635]">
                                        {citaSeleccionada.nombre_completo ||
                                            "Sin nombre"}
                                    </strong>
                                </div>

                                <div className="flex justify-between gap-4">
                                    <span className="text-[#707469]">
                                        Fecha
                                    </span>

                                    <strong className="text-right text-[#3F4635]">

                                        {formatearFecha(citaSeleccionada.fecha)}

                                    </strong>
                                </div>

                                <div className="flex justify-between gap-4">

                                    <span className="text-[#707469]">
                                        Hora
                                    </span>

                                    <strong className="text-right text-[#3F4635]">

                                        {formatearHora(citaSeleccionada.hora)}

                                    </strong>

                                </div>

                                <div className="flex justify-between gap-4">

                                    <span className="text-[#707469]">
                                        Modalidad
                                    </span>

                                    <strong className="text-right text-[#3F4635]">
                                        {citaSeleccionada.modalidad === "VIRTUAL"
                                            ? "Virtual"
                                            : "Presencial"}
                                    </strong>

                                </div>

                                <div className="flex justify-between gap-4">

                                    <span className="text-[#707469]">
                                        Estado
                                    </span>

                                    <strong className="text-right text-[#3F4635]">

                                        {citaSeleccionada.estado === "CONFIRMADA"
                                            ? "Confirmada"
                                            : citaSeleccionada.estado === "CANCELADA"
                                                ? "Cancelada"
                                                : citaSeleccionada.estado === "COMPLETADA"
                                                    ? "Completada"
                                                    : "Pendiente"}

                                    </strong>

                                </div>

                                <div className="flex justify-between gap-4">

                                    <span className="text-[#707469]">
                                        Correo
                                    </span>

                                    <strong className="break-all text-right text-[#3F4635]">
                                        {citaSeleccionada.email ||
                                            "No registrado"}
                                    </strong>

                                </div>

                                <div className="flex justify-between gap-4">

                                    <span className="text-[#707469]">
                                        Teléfono
                                    </span>

                                    <strong className="text-right text-[#3F4635]">
                                        {citaSeleccionada.telefono ||
                                            "No registrado"}
                                    </strong>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() => setCitaSeleccionada(null)}
                                className="mt-6 w-full rounded-full bg-[#C56835] px-6 py-3 font-medium text-white transition hover:opacity-90"
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                )}

                {/* ========================================= */}
                {/* MODAL CONFIRMAR / CANCELAR */}
                {/* ========================================= */}

                {accionPendiente && (

                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">

                        <div className="w-full max-w-md rounded-2xl bg-[#F7F1E9] p-7 shadow-2xl">

                            <p className="mb-2 text-sm font-medium text-[#C56835]">
                                Gestión de cita
                            </p>

                            <h3 className="font-serif text-2xl text-[#3F4635]">
                                {accionPendiente.estado === "CONFIRMADA"
                                    ? "La cita quedará confirmada."
                                    : accionPendiente.estado === "CANCELADA"
                                        ? "La cita quedará cancelada."
                                        : "La cita quedará marcada como completada."}
                            </h3>

                            <p className="mt-3 text-sm leading-6 text-[#707469]">

                                {accionPendiente.estado === "CONFIRMADA"
                                    ? "La cita quedará confirmada y aparecerá como disponible para la atención."
                                    : "La cita quedará cancelada y dejará de aparecer como pendiente."}

                            </p>

                            <div className="mt-6 flex justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() => setAccionPendiente(null)}
                                    className="rounded-full border border-[#D8D0C5] px-5 py-2 text-sm font-medium text-[#3F4635] transition hover:bg-white"
                                >
                                    Volver
                                </button>

                                <button
                                    type="button"
                                    disabled={procesandoAccion}
                                    onClick={async () => {

                                        await actualizarEstadoCita(
                                            accionPendiente.cita.id,
                                            accionPendiente.estado
                                        );

                                        setAccionPendiente(null);

                                    }}
                                    className={`rounded-full px-5 py-2 text-sm font-medium text-white transition ${accionPendiente.estado === "CONFIRMADA"
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-red-600 hover:bg-red-700"
                                        } ${procesandoAccion
                                            ? "cursor-not-allowed opacity-60"
                                            : ""
                                        }`}
                                >
                                    {procesandoAccion
                                        ? "Procesando..."
                                        : accionPendiente.estado === "CONFIRMADA"
                                            ? "Sí, confirmar"
                                            : accionPendiente.estado === "CANCELADA"
                                                ? "Sí, cancelar"
                                                : "Sí, completar"}

                                </button>

                            </div>

                        </div>

                    </div>

                )}

                {/* ========================================= */}
                {/* MODAL REPROGRAMAR */}
                {/* ========================================= */}

                {citaReprogramar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">

                        <div className="my-auto w-full max-w-md rounded-3xl bg-[#F7F1E9] p-5 shadow-2xl sm:p-6">

                            {/* ENCABEZADO */}

                            <div className="mb-6 flex items-start justify-between gap-4">

                                <div>

                                    <p className="text-sm text-[#C56835]">
                                        Gestión de cita
                                    </p>

                                    <h3 className="mt-1 font-serif text-2xl text-[#3F4635]">
                                        Reprogramar cita
                                    </h3>

                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!procesandoReprogramacion) {
                                            setCitaReprogramar(null);
                                        }
                                    }}
                                    disabled={procesandoReprogramacion}
                                    className="text-2xl leading-none text-[#707469] transition hover:text-[#C56835] disabled:opacity-40"
                                >
                                    ×
                                </button>

                            </div>

                            {/* PACIENTE */}

                            <div className="mb-6 rounded-2xl bg-white/70 p-4">

                                <p className="text-xs text-[#707469]">
                                    Paciente
                                </p>

                                <p className="mt-1 font-medium text-[#3F4635]">
                                    {citaReprogramar.nombre_completo ||
                                        "Sin nombre"}
                                </p>

                                <p className="mt-1 text-xs text-[#707469]">
                                    Cita actual:{" "}
                                    {formatearFecha(citaReprogramar.fecha)}{" "}
                                    · {formatearHora(citaReprogramar.hora)}
                                </p>

                            </div>

                            {/* NUEVA FECHA */}

                            <div className="space-y-5">

                                <div>

                                    <label
                                        htmlFor="nueva-fecha"
                                        className="mb-2 block text-sm font-medium text-[#3F4635]"
                                    >
                                        Nueva fecha
                                    </label>

                                    <input
                                        id="nueva-fecha"
                                        type="date"
                                        min={obtenerFechaMinima()}
                                        value={nuevaFecha}
                                        onChange={(e) => {
                                            void cargarDisponibilidadReprogramacion(
                                                e.target.value
                                            );
                                        }}
                                        disabled={procesandoReprogramacion}
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none transition focus:border-[#C56835]"
                                    />

                                </div>

                                {/* NUEVA HORA */}

                                <div>

                                    <label
                                        htmlFor="nueva-hora"
                                        className="mb-2 block text-sm font-medium text-[#3F4635]"
                                    >
                                        Nueva hora
                                    </label>

                                    <select
                                        value={nuevaHora}
                                        onChange={(e) => setNuevaHora(e.target.value)}
                                        disabled={
                                            !nuevaFecha ||
                                            cargandoDisponibilidad ||
                                            procesandoReprogramacion
                                        }
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm text-[#3F4635] outline-none transition focus:border-[#C56835] disabled:bg-[#F7F1E9] disabled:text-[#999]"
                                    >
                                        <option value="">
                                            {cargandoDisponibilidad
                                                ? "Consultando disponibilidad..."
                                                : !nuevaFecha
                                                    ? "Primero selecciona una fecha"
                                                    : horasDisponibles.length
                                                        ? "Selecciona una hora"
                                                        : "No hay horarios disponibles"}
                                        </option>
                                        {horasDisponibles.map((hora) => (
                                            <option
                                                key={hora}
                                                value={hora}
                                                disabled={horasOcupadas.includes(hora)}
                                            >
                                                {formatearHora(hora)}
                                                {horasOcupadas.includes(hora)
                                                    ? " — Ocupada 🔒"
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>

                                    {errorDisponibilidad && (
                                        <p className="mt-2 text-xs text-red-600">
                                            {errorDisponibilidad}
                                        </p>
                                    )}

                                </div>

                            </div>

                            {/* AVISO */}

                            <div className="mt-5 rounded-2xl bg-[#E1DBD2]/50 p-4">

                                <p className="text-xs leading-5 text-[#707469]">
                                    El sistema verificará que el nuevo horario
                                    esté disponible. Si está ocupado, podrás
                                    seleccionar otro horario.
                                </p>

                            </div>

                            {/* BOTONES */}

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!procesandoReprogramacion) {
                                            setCitaReprogramar(null);
                                        }
                                    }}
                                    disabled={procesandoReprogramacion}
                                    className="w-full rounded-full border border-[#D8D0C5] px-5 py-3 text-sm font-medium text-[#3F4635] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={reprogramarCita}
                                    disabled={procesandoReprogramacion}
                                    className="w-full rounded-full bg-[#C56835] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {procesandoReprogramacion
                                        ? "Reprogramando..."
                                        : "Confirmar reprogramación"}
                                </button>

                            </div>

                        </div>

                    </div>

                )}

                {/* ========================================= */}
                {/* MODAL ALERTA */}
                {/* ========================================= */}

                {mostrarAlerta && (

                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">

                        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">

                            <div className="flex items-start gap-4">

                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${datosAlerta.tipo === "error"
                                            ? "bg-red-50 text-red-600"
                                            : datosAlerta.tipo === "advertencia"
                                                ? "bg-yellow-50 text-yellow-600"
                                                : "bg-green-50 text-green-600"
                                        }`}
                                >
                                    {datosAlerta.tipo === "error"
                                        ? "!"
                                        : datosAlerta.tipo === "advertencia"
                                            ? "⚠"
                                            : "✓"}
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
                                    onClick={() => setMostrarAlerta(false)}
                                    className="text-2xl leading-none text-[#707469] transition hover:text-[#C56835]"
                                    aria-label="Cerrar alerta"
                                >
                                    ×
                                </button>

                            </div>

                            <button
                                type="button"
                                onClick={() => setMostrarAlerta(false)}
                                className="mt-6 w-full rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                            >
                                Aceptar
                            </button>

                        </div>

                    </div>

                )}

            </main>
        </>
    );
}
