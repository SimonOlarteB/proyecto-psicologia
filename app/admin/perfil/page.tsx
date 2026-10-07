"use client";

import { useEffect, useState } from "react";
import AdminNav from "../../components/AdminNav";

type Perfil = {
    id?: number;
    nombre_profesional: string;
    profesion: string;
    descripcion: string;
    foto_url: string;
    logo_url: string;
    whatsapp: string;
    correo: string;
    direccion: string;
};

type Trayectoria = {
    id: number;
    tipo: "TITULO" | "CURSO" | "DIPLOMADO" | "CERTIFICACION";
    titulo: string;
    institucion: string | null;
    descripcion: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    imagen_url: string | null;
    orden: number;
    activo: number;
};

const perfilInicial: Perfil = {
    nombre_profesional: "",
    profesion: "",
    descripcion: "",
    foto_url: "",
    logo_url: "",
    whatsapp: "",
    correo: "",
    direccion: "",
};

const trayectoriaInicial = {
    tipo: "TITULO" as Trayectoria["tipo"],
    titulo: "",
    institucion: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    imagen_url: "",
    orden: 0,
    activo: 1,
};

function obtenerFechaInput(fecha: string | null) {
    if (!fecha) return "";

    return fecha.substring(0, 10);
}

function formatearTipo(tipo: Trayectoria["tipo"]) {
    switch (tipo) {
        case "TITULO":
            return "Título";
        case "CURSO":
            return "Curso";
        case "DIPLOMADO":
            return "Diplomado";
        case "CERTIFICACION":
            return "Certificación";
        default:
            return tipo;
    }
}

export default function PerfilAdminPage() {
    const [perfil, setPerfil] = useState<Perfil>(perfilInicial);
    const [trayectoria, setTrayectoria] = useState<Trayectoria[]>([]);

    const [cargando, setCargando] = useState(true);
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [guardandoTrayectoria, setGuardandoTrayectoria] = useState(false);

    const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
    const [vistaPreviaFoto, setVistaPreviaFoto] = useState("");
    const [quitarFoto, setQuitarFoto] = useState(false);

    const [archivoLogo, setArchivoLogo] = useState<File | null>(null);
    const [vistaPreviaLogo, setVistaPreviaLogo] = useState("");
    const [quitarLogo, setQuitarLogo] = useState(false);

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [elementoEditando, setElementoEditando] =
        useState<Trayectoria | null>(null);

    const [formTrayectoria, setFormTrayectoria] = useState(
        trayectoriaInicial
    );

    const [alerta, setAlerta] = useState<{
        tipo: "exito" | "error";
        titulo: string;
        mensaje: string;
    } | null>(null);

    useEffect(() => {
        cargarDatos();
    }, []);

    async function cargarDatos() {
        try {
            setCargando(true);

            const [respuestaPerfil, respuestaTrayectoria] =
                await Promise.all([
                    fetch("/api/perfil"),
                    fetch("/api/trayectoria"),
                ]);

            if (!respuestaPerfil.ok) {
                throw new Error("No se pudo cargar el perfil.");
            }

            if (!respuestaTrayectoria.ok) {
                throw new Error("No se pudo cargar la trayectoria.");
            }

            const datosPerfil = await respuestaPerfil.json();
            const datosTrayectoria = await respuestaTrayectoria.json();

            if (datosPerfil) {
                setPerfil({
                    id: datosPerfil.id,
                    nombre_profesional:
                        datosPerfil.nombre_profesional || "",
                    profesion: datosPerfil.profesion || "",
                    descripcion: datosPerfil.descripcion || "",
                    foto_url: datosPerfil.foto_url || "",
                    logo_url: datosPerfil.logo_url || "",
                    whatsapp: datosPerfil.whatsapp || "",
                    correo: datosPerfil.correo || "",
                    direccion: datosPerfil.direccion || "",
                });

                setVistaPreviaFoto(datosPerfil.foto_url || "");
                setArchivoFoto(null);
                setQuitarFoto(false);

                setVistaPreviaLogo(datosPerfil.logo_url || "");
                setArchivoLogo(null);
                setQuitarLogo(false);
            }

            setTrayectoria(datosTrayectoria);
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudieron cargar los datos",
                mensaje:
                    "Ocurrió un problema al cargar el perfil y la trayectoria.",
            });
        } finally {
            setCargando(false);
        }
    }

    async function guardarPerfil() {
        if (!perfil.nombre_profesional.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "El nombre profesional es obligatorio.",
            });
            return;
        }

        if (!perfil.profesion.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "La profesión es obligatoria.",
            });
            return;
        }

        try {
            setGuardandoPerfil(true);

            let fotoUrl = perfil.foto_url || "";

            if (archivoFoto) {
                const datosImagen = new FormData();
                datosImagen.append("file", archivoFoto);

                const respuestaImagen = await fetch(
                    "/api/perfil/upload",
                    {
                        method: "POST",
                        body: datosImagen,
                    }
                );

                const resultadoImagen =
                    await respuestaImagen.json();

                if (!respuestaImagen.ok) {
                    throw new Error(
                        resultadoImagen.error ||
                            "No se pudo subir la fotografía."
                    );
                }

                fotoUrl = resultadoImagen.url;
            } else if (quitarFoto) {
                fotoUrl = "";
            }

            let logoUrl = perfil.logo_url || "";

            if (archivoLogo) {
                const datosLogo = new FormData();
                datosLogo.append("file", archivoLogo);

                const respuestaLogo = await fetch(
                    "/api/perfil/logo/upload",
                    {
                        method: "POST",
                        body: datosLogo,
                    }
                );

                const resultadoLogo = await respuestaLogo.json();

                if (!respuestaLogo.ok) {
                    throw new Error(
                        resultadoLogo.error ||
                            "No se pudo subir el logo."
                    );
                }

                logoUrl = resultadoLogo.url;
            } else if (quitarLogo) {
                logoUrl = "";
            }

            const respuesta = await fetch("/api/perfil", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...perfil,
                    foto_url: fotoUrl,
                    logo_url: logoUrl,
                    whatsapp: perfil.whatsapp,
                    correo: perfil.correo,
                    direccion: perfil.direccion,
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error || "No se pudo guardar el perfil."
                );
            }

            setPerfil((actual) => ({
                ...actual,
                foto_url: fotoUrl,
            }));

            setArchivoFoto(null);
            setVistaPreviaFoto(fotoUrl);
            setQuitarFoto(false);

            setPerfil((actual) => ({
                ...actual,
                foto_url: fotoUrl,
                logo_url: logoUrl,
            }));

            setArchivoLogo(null);
            setVistaPreviaLogo(logoUrl);
            setQuitarLogo(false);

            setAlerta({
                tipo: "exito",
                titulo: "Perfil actualizado",
                mensaje:
                    "La información profesional se guardó correctamente.",
            });

            await cargarDatos();
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo guardar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error al guardar el perfil.",
            });
        } finally {
            setGuardandoPerfil(false);
        }
    }

    function abrirNuevo() {
        setElementoEditando(null);
        setFormTrayectoria(trayectoriaInicial);
        setMostrarFormulario(true);
    }

    function abrirEditar(elemento: Trayectoria) {
        setElementoEditando(elemento);

        setFormTrayectoria({
            tipo: elemento.tipo,
            titulo: elemento.titulo || "",
            institucion: elemento.institucion || "",
            descripcion: elemento.descripcion || "",
            fecha_inicio: obtenerFechaInput(elemento.fecha_inicio),
            fecha_fin: obtenerFechaInput(elemento.fecha_fin),
            imagen_url: elemento.imagen_url || "",
            orden: elemento.orden || 0,
            activo: elemento.activo ? 1 : 0,
        });

        setMostrarFormulario(true);
    }

    function cerrarFormulario() {
        if (guardandoTrayectoria) return;

        setMostrarFormulario(false);
        setElementoEditando(null);
        setFormTrayectoria(trayectoriaInicial);
    }

    async function guardarTrayectoria() {
        if (!formTrayectoria.titulo.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "El título es obligatorio.",
            });
            return;
        }

        try {
            setGuardandoTrayectoria(true);

            const respuesta = await fetch("/api/trayectoria", {
                method: elementoEditando ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...(elementoEditando
                        ? { id: elementoEditando.id }
                        : {}),
                    ...formTrayectoria,
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error || "No se pudo guardar el elemento."
                );
            }

            cerrarFormulario();

            await cargarDatos();

            setAlerta({
                tipo: "exito",
                titulo: elementoEditando
                    ? "Elemento actualizado"
                    : "Elemento agregado",
                mensaje: elementoEditando
                    ? "La información se actualizó correctamente."
                    : "El elemento se agregó correctamente.",
            });
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo guardar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error al guardar.",
            });
        } finally {
            setGuardandoTrayectoria(false);
        }
    }

    async function desactivarTrayectoria(id: number) {
        try {
            const respuesta = await fetch("/api/trayectoria", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error || "No se pudo desactivar el elemento."
                );
            }

            await cargarDatos();

            setAlerta({
                tipo: "exito",
                titulo: "Elemento desactivado",
                mensaje:
                    "El elemento fue retirado de la información pública.",
            });
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo desactivar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error.",
            });
        }
    }

    return (
        <>
            <AdminNav />

            <main className="min-h-screen bg-[#F7F1E9] text-[#3F4635] lg:ml-[280px]">
                <header className="border-b border-[#D8D0C5] bg-[#F7F1E9]">
                    <div className="mx-auto max-w-6xl px-5 py-7 sm:px-6">
                        <p className="text-sm font-medium text-[#C56835]">
                            Administración
                        </p>

                        <h1 className="mt-1 font-serif text-3xl sm:text-4xl">
                            Perfil y trayectoria
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707469]">
                            Administra la información profesional que se
                            mostrará en el sitio web.
                        </p>
                    </div>
                </header>

                <section className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-6 sm:py-10">
                    {cargando ? (
                        <div className="rounded-3xl bg-white p-10 text-center text-sm text-[#707469] shadow-sm">
                            Cargando información...
                        </div>
                    ) : (
                        <>
                            {/* PERFIL */}
                            <section className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm sm:p-7">
                                <div className="mb-6">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C56835]">
                                        Información principal
                                    </p>

                                    <h2 className="mt-1 font-serif text-2xl">
                                        Perfil profesional
                                    </h2>

                                    <p className="mt-1 text-sm text-[#707469]">
                                        Esta información aparecerá en
                                        diferentes secciones del sitio.
                                    </p>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            Nombre profesional
                                        </label>

                                        <input
                                            type="text"
                                            value={perfil.nombre_profesional}
                                            onChange={(e) =>
                                                setPerfil({
                                                    ...perfil,
                                                    nombre_profesional:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="Ej. Aura Elisa Sánchez"
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            Profesión
                                        </label>

                                        <input
                                            type="text"
                                            value={perfil.profesion}
                                            onChange={(e) =>
                                                setPerfil({
                                                    ...perfil,
                                                    profesion: e.target.value,
                                                })
                                            }
                                            placeholder="Ej. Psicóloga Humanista"
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-medium">
                                            Descripción profesional
                                        </label>

                                        <textarea
                                            rows={6}
                                            value={perfil.descripcion}
                                            onChange={(e) =>
                                                setPerfil({
                                                    ...perfil,
                                                    descripcion:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="Escribe una descripción profesional..."
                                            className="w-full resize-y rounded-2xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            WhatsApp
                                        </label>

                                        <input
                                            type="tel"
                                            value={perfil.whatsapp}
                                            onChange={(e) =>
                                                setPerfil({
                                                    ...perfil,
                                                    whatsapp: e.target.value,
                                                })
                                            }
                                            placeholder="Ej. 3337054670"
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                        />

                                        <p className="mt-2 text-xs text-[#8A8D84]">
                                            Número que aparecerá en el sitio web y en los botones de WhatsApp.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            Correo electrónico
                                        </label>

                                        <input
                                            type="email"
                                            value={perfil.correo}
                                            onChange={(e) =>
                                                setPerfil({
                                                    ...perfil,
                                                    correo: e.target.value,
                                                })
                                            }
                                            placeholder="Ej. contacto@tudominio.com"
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                        />

                                        <p className="mt-2 text-xs text-[#8A8D84]">
                                            Correo de contacto que aparecerá en el sitio web.
                                        </p>
                                    </div>

                                    {/* DIRECCIÓN */}
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-medium">
                                            Dirección
                                        </label>

                                        <input
                                            type="text"
                                            value={perfil.direccion}
                                            onChange={(e) =>
                                                setPerfil({
                                                    ...perfil,
                                                    direccion:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="Ej. Calle 123 #45-67, Medellín"
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                        />

                                        <p className="mt-2 text-xs text-[#8A8D84]">
                                            Dirección que aparecerá en la información de contacto del sitio web.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            Fotografía profesional
                                            <span className="ml-1 text-xs text-[#8A8D84]">
                                                (opcional)
                                            </span>
                                        </label>

                                        <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-[#FCFAF7] p-4">
                                            {vistaPreviaFoto ? (
                                                <div className="space-y-3">
                                                    <div className="flex justify-center overflow-hidden rounded-2xl border border-[#E1DBD2] bg-white p-3">
                                                        <img
                                                            src={vistaPreviaFoto}
                                                            alt="Fotografía profesional"
                                                            className="h-52 w-full max-w-xs rounded-xl object-cover"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-2 sm:flex-row">
                                                        <label className="cursor-pointer rounded-full border border-[#D8D0C5] px-5 py-2.5 text-center text-xs font-medium transition hover:border-[#C56835] hover:text-[#C56835]">
                                                            Cambiar fotografía
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const archivo =
                                                                        e.target.files?.[0];

                                                                    if (!archivo) return;

                                                                    if (
                                                                        ![
                                                                            "image/jpeg",
                                                                            "image/png",
                                                                            "image/webp",
                                                                        ].includes(
                                                                            archivo.type
                                                                        )
                                                                    ) {
                                                                        setAlerta({
                                                                            tipo: "error",
                                                                            titulo: "Formato no válido",
                                                                            mensaje:
                                                                                "Solo puedes subir imágenes JPG, PNG o WEBP.",
                                                                        });
                                                                        e.target.value = "";
                                                                        return;
                                                                    }

                                                                    if (
                                                                        archivo.size >
                                                                        5 *
                                                                            1024 *
                                                                            1024
                                                                    ) {
                                                                        setAlerta({
                                                                            tipo: "error",
                                                                            titulo: "Imagen demasiado grande",
                                                                            mensaje:
                                                                                "La fotografía no puede superar los 5 MB.",
                                                                        });
                                                                        e.target.value = "";
                                                                        return;
                                                                    }

                                                                    setArchivoFoto(
                                                                        archivo
                                                                    );
                                                                    setVistaPreviaFoto(
                                                                        URL.createObjectURL(
                                                                            archivo
                                                                        )
                                                                    );
                                                                    setQuitarFoto(
                                                                        false
                                                                    );
                                                                }}
                                                            />
                                                        </label>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setArchivoFoto(
                                                                    null
                                                                );
                                                                setVistaPreviaFoto(
                                                                    ""
                                                                );
                                                                setQuitarFoto(
                                                                    true
                                                                );
                                                                setPerfil({
                                                                    ...perfil,
                                                                    foto_url:
                                                                        "",
                                                                });
                                                            }}
                                                            className="rounded-full border border-red-200 px-5 py-2.5 text-center text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                        >
                                                            Quitar fotografía
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#E1DBD2] bg-white px-5 py-8 text-center transition hover:border-[#C56835]">
                                                    <span className="text-3xl">
                                                        📷
                                                    </span>
                                                    <span className="mt-3 text-sm font-medium text-[#3F4635]">
                                                        Seleccionar fotografía
                                                    </span>
                                                    <span className="mt-1 text-xs text-[#8A8D84]">
                                                        JPG, PNG o WEBP · máximo 5 MB
                                                    </span>

                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const archivo =
                                                                e.target.files?.[0];

                                                            if (!archivo) return;

                                                            if (
                                                                ![
                                                                    "image/jpeg",
                                                                    "image/png",
                                                                    "image/webp",
                                                                ].includes(
                                                                    archivo.type
                                                                )
                                                            ) {
                                                                setAlerta({
                                                                    tipo: "error",
                                                                    titulo: "Formato no válido",
                                                                    mensaje:
                                                                        "Solo puedes subir imágenes JPG, PNG o WEBP.",
                                                                });
                                                                e.target.value = "";
                                                                return;
                                                            }

                                                            if (
                                                                archivo.size >
                                                                5 *
                                                                    1024 *
                                                                    1024
                                                            ) {
                                                                setAlerta({
                                                                    tipo: "error",
                                                                    titulo: "Imagen demasiado grande",
                                                                    mensaje:
                                                                        "La fotografía no puede superar los 5 MB.",
                                                                });
                                                                e.target.value = "";
                                                                return;
                                                            }

                                                            setArchivoFoto(
                                                                archivo
                                                            );
                                                            setVistaPreviaFoto(
                                                                URL.createObjectURL(
                                                                    archivo
                                                                )
                                                            );
                                                            setQuitarFoto(false);
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            Logo
                                            <span className="ml-1 text-xs text-[#8A8D84]">
                                                (opcional)
                                            </span>
                                        </label>

                                        <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-[#FCFAF7] p-4">
                                            {vistaPreviaLogo ? (
                                                <div className="space-y-3">
                                                    <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-2xl border border-[#E1DBD2] bg-white p-5">
                                                        <img
                                                            src={vistaPreviaLogo}
                                                            alt={`Logo ${perfil.nombre_profesional || "profesional"}`}
                                                            className="max-h-32 w-auto max-w-full object-contain"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-2 sm:flex-row">
                                                        <label className="cursor-pointer rounded-full border border-[#D8D0C5] px-5 py-2.5 text-center text-xs font-medium transition hover:border-[#C56835] hover:text-[#C56835]">
                                                            Cambiar logo
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const archivo =
                                                                        e.target.files?.[0];

                                                                    if (!archivo) return;

                                                                    if (
                                                                        ![
                                                                            "image/jpeg",
                                                                            "image/png",
                                                                            "image/webp",
                                                                        ].includes(
                                                                            archivo.type
                                                                        )
                                                                    ) {
                                                                        setAlerta({
                                                                            tipo: "error",
                                                                            titulo: "Formato no válido",
                                                                            mensaje:
                                                                                "Solo puedes subir imágenes JPG, PNG o WEBP.",
                                                                        });
                                                                        e.target.value = "";
                                                                        return;
                                                                    }

                                                                    if (
                                                                        archivo.size >
                                                                        5 *
                                                                            1024 *
                                                                            1024
                                                                    ) {
                                                                        setAlerta({
                                                                            tipo: "error",
                                                                            titulo: "Imagen demasiado grande",
                                                                            mensaje:
                                                                                "El logo no puede superar los 5 MB.",
                                                                        });
                                                                        e.target.value = "";
                                                                        return;
                                                                    }

                                                                    setArchivoLogo(
                                                                        archivo
                                                                    );
                                                                    setVistaPreviaLogo(
                                                                        URL.createObjectURL(
                                                                            archivo
                                                                        )
                                                                    );
                                                                    setQuitarLogo(
                                                                        false
                                                                    );
                                                                }}
                                                            />
                                                        </label>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setArchivoLogo(
                                                                    null
                                                                );
                                                                setVistaPreviaLogo(
                                                                    ""
                                                                );
                                                                setQuitarLogo(
                                                                    true
                                                                );
                                                                setPerfil({
                                                                    ...perfil,
                                                                    logo_url:
                                                                        "",
                                                                });
                                                            }}
                                                            className="rounded-full border border-red-200 px-5 py-2.5 text-center text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                        >
                                                            Quitar logo
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#E1DBD2] bg-white px-5 py-8 text-center transition hover:border-[#C56835]">
                                                    <span className="text-3xl">
                                                        🏷️
                                                    </span>
                                                    <span className="mt-3 text-sm font-medium text-[#3F4635]">
                                                        Seleccionar logo
                                                    </span>
                                                    <span className="mt-1 text-xs text-[#8A8D84]">
                                                        JPG, PNG o WEBP · máximo 5 MB
                                                    </span>

                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const archivo =
                                                                e.target.files?.[0];

                                                            if (!archivo) return;

                                                            if (
                                                                ![
                                                                    "image/jpeg",
                                                                    "image/png",
                                                                    "image/webp",
                                                                ].includes(
                                                                    archivo.type
                                                                )
                                                            ) {
                                                                setAlerta({
                                                                    tipo: "error",
                                                                    titulo: "Formato no válido",
                                                                    mensaje:
                                                                        "Solo puedes subir imágenes JPG, PNG o WEBP.",
                                                                });
                                                                e.target.value = "";
                                                                return;
                                                            }

                                                            if (
                                                                archivo.size >
                                                                5 *
                                                                    1024 *
                                                                    1024
                                                            ) {
                                                                setAlerta({
                                                                    tipo: "error",
                                                                    titulo: "Imagen demasiado grande",
                                                                    mensaje:
                                                                        "El logo no puede superar los 5 MB.",
                                                                });
                                                                e.target.value = "";
                                                                return;
                                                            }

                                                            setArchivoLogo(
                                                                archivo
                                                            );
                                                            setVistaPreviaLogo(
                                                                URL.createObjectURL(
                                                                    archivo
                                                                )
                                                            );
                                                            setQuitarLogo(false);
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={guardarPerfil}
                                        disabled={guardandoPerfil}
                                        className="w-full rounded-full bg-[#C56835] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                    >
                                        {guardandoPerfil
                                            ? "Guardando..."
                                            : "Guardar perfil"}
                                    </button>
                                </div>
                            </section>

                            {/* TRAYECTORIA */}
                            <section className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm sm:p-7">
                                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C56835]">
                                            Formación profesional
                                        </p>

                                        <h2 className="mt-1 font-serif text-2xl">
                                            Trayectoria
                                        </h2>

                                        <p className="mt-1 text-sm text-[#707469]">
                                            Gestiona títulos, cursos,
                                            diplomados y certificaciones.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={abrirNuevo}
                                        className="w-full rounded-full bg-[#59614D] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 sm:w-auto"
                                    >
                                        + Agregar
                                    </button>
                                </div>

                                {trayectoria.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-[#FCFAF7] p-8 text-center">
                                        <p className="font-medium">
                                            Aún no hay elementos registrados.
                                        </p>

                                        <p className="mt-1 text-sm text-[#707469]">
                                            Agrega el primer título, curso,
                                            diplomado o certificación.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {trayectoria.map((elemento) => (
                                            <article
                                                key={elemento.id}
                                                className="rounded-2xl border border-[#E1DBD2] bg-[#FCFAF7] p-5"
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="rounded-full bg-[#E1DBD2] px-3 py-1 text-xs font-medium text-[#59614D]">
                                                                {formatearTipo(
                                                                    elemento.tipo
                                                                )}
                                                            </span>

                                                            {!elemento.activo && (
                                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                                                    Inactivo
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h3 className="mt-3 font-serif text-xl">
                                                            {elemento.titulo}
                                                        </h3>

                                                        {elemento.institucion && (
                                                            <p className="mt-1 text-sm font-medium text-[#C56835]">
                                                                {
                                                                    elemento.institucion
                                                                }
                                                            </p>
                                                        )}

                                                        {elemento.descripcion && (
                                                            <p className="mt-3 text-sm leading-6 text-[#707469]">
                                                                {
                                                                    elemento.descripcion
                                                                }
                                                            </p>
                                                        )}

                                                        {(elemento.fecha_inicio ||
                                                            elemento.fecha_fin) && (
                                                            <p className="mt-3 text-xs text-[#707469]">
                                                                {obtenerFechaInput(
                                                                    elemento.fecha_inicio
                                                                ) || "Sin fecha"}{" "}
                                                                —{" "}
                                                                {obtenerFechaInput(
                                                                    elemento.fecha_fin
                                                                ) || "Actualidad"}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex shrink-0 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirEditar(
                                                                    elemento
                                                                )
                                                            }
                                                            className="rounded-full border border-[#D8D0C5] px-4 py-2 text-xs font-medium transition hover:border-[#C56835] hover:text-[#C56835]"
                                                        >
                                                            Editar
                                                        </button>

                                                        {elemento.activo ===
                                                            1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    desactivarTrayectoria(
                                                                        elemento.id
                                                                    )
                                                                }
                                                                className="rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                            >
                                                                Desactivar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </section>

                {/* MODAL TRAYECTORIA */}
                {mostrarFormulario && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">
                        <div className="my-auto w-full max-w-2xl rounded-3xl bg-[#F7F1E9] p-5 shadow-2xl sm:p-7">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-[#C56835]">
                                        Formación profesional
                                    </p>

                                    <h2 className="mt-1 font-serif text-2xl">
                                        {elementoEditando
                                            ? "Editar elemento"
                                            : "Agregar elemento"}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={cerrarFormulario}
                                    className="text-2xl leading-none text-[#707469] transition hover:text-[#C56835]"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Tipo
                                    </label>

                                    <select
                                        value={formTrayectoria.tipo}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                tipo: e.target
                                                    .value as Trayectoria["tipo"],
                                            })
                                        }
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    >
                                        <option value="TITULO">
                                            Título
                                        </option>
                                        <option value="CURSO">
                                            Curso
                                        </option>
                                        <option value="DIPLOMADO">
                                            Diplomado
                                        </option>
                                        <option value="CERTIFICACION">
                                            Certificación
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Orden
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={formTrayectoria.orden}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                orden: Number(e.target.value),
                                            })
                                        }
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium">
                                        Título / nombre
                                    </label>

                                    <input
                                        type="text"
                                        value={formTrayectoria.titulo}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                titulo: e.target.value,
                                            })
                                        }
                                        placeholder="Ej. Psicología"
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium">
                                        Institución
                                    </label>

                                    <input
                                        type="text"
                                        value={formTrayectoria.institucion}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                institucion: e.target.value,
                                            })
                                        }
                                        placeholder="Ej. Universidad..."
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Fecha de inicio
                                    </label>

                                    <input
                                        type="date"
                                        value={formTrayectoria.fecha_inicio}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                fecha_inicio: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Fecha de finalización
                                    </label>

                                    <input
                                        type="date"
                                        value={formTrayectoria.fecha_fin}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                fecha_fin: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium">
                                        Descripción
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={formTrayectoria.descripcion}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                descripcion: e.target.value,
                                            })
                                        }
                                        placeholder="Descripción del estudio o certificación..."
                                        className="w-full resize-y rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium">
                                        URL de imagen
                                    </label>

                                    <input
                                        type="url"
                                        value={formTrayectoria.imagen_url}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                imagen_url: e.target.value,
                                            })
                                        }
                                        placeholder="https://..."
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                    />
                                </div>

                                <label className="flex cursor-pointer items-center gap-3 text-sm sm:col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={formTrayectoria.activo === 1}
                                        onChange={(e) =>
                                            setFormTrayectoria({
                                                ...formTrayectoria,
                                                activo: e.target.checked
                                                    ? 1
                                                    : 0,
                                            })
                                        }
                                        className="h-4 w-4 accent-[#C56835]"
                                    />

                                    Mostrar este elemento en el sitio web
                                </label>
                            </div>

                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={cerrarFormulario}
                                    disabled={guardandoTrayectoria}
                                    className="rounded-full border border-[#D8D0C5] px-6 py-3 text-sm font-medium transition hover:bg-white disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={guardarTrayectoria}
                                    disabled={guardandoTrayectoria}
                                    className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {guardandoTrayectoria
                                        ? "Guardando..."
                                        : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ALERTA */}
                {alerta && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                                        alerta.tipo === "error"
                                            ? "bg-red-50 text-red-600"
                                            : "bg-green-50 text-green-600"
                                    }`}
                                >
                                    {alerta.tipo === "error" ? "!" : "✓"}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="font-serif text-xl text-[#3F4635]">
                                        {alerta.titulo}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-[#707469]">
                                        {alerta.mensaje}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setAlerta(null)}
                                    className="text-2xl leading-none text-[#707469] hover:text-[#C56835]"
                                    aria-label="Cerrar alerta"
                                >
                                    ×
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setAlerta(null)}
                                className="mt-6 w-full rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white"
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