"use client";

import { useEffect, useState } from "react";
import AdminNav from "../../components/AdminNav";

type Testimonio = {
    id: number;
    nombre: string;
    comentario: string;
    publicado: number;
    creado_en: string;
    actualizado_en: string;
};

const formularioInicial = {
    nombre: "",
    comentario: "",
    publicado: 0,
};

export default function TestimoniosAdminPage() {
    const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
    const [cargando, setCargando] = useState(true);

    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

    const [editando, setEditando] =
        useState<Testimonio | null>(null);

    const [formulario, setFormulario] =
        useState(formularioInicial);

    const [guardando, setGuardando] = useState(false);

    const [alerta, setAlerta] = useState<{
        tipo: "exito" | "error";
        titulo: string;
        mensaje: string;
    } | null>(null);

    useEffect(() => {
        cargarTestimonios();
    }, []);

    async function cargarTestimonios() {
        try {
            setCargando(true);

const respuesta = await fetch(
    "/api/testimonios?admin=true"
);
            if (!respuesta.ok) {
                throw new Error(
                    "No se pudieron cargar los testimonios."
                );
            }

            const datos = await respuesta.json();

            setTestimonios(datos);
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "Error",
                mensaje:
                    "No se pudieron cargar los testimonios.",
            });
        } finally {
            setCargando(false);
        }
    }

    function abrirNuevo() {
        setEditando(null);
        setFormulario(formularioInicial);
        setMostrarFormulario(true);
    }

    function abrirEditar(testimonio: Testimonio) {
        setEditando(testimonio);

        setFormulario({
            nombre: testimonio.nombre,
            comentario: testimonio.comentario,
            publicado: testimonio.publicado ? 1 : 0,
        });

        setMostrarFormulario(true);
    }

    function cerrarFormulario() {
        if (guardando) return;

        setMostrarFormulario(false);
        setEditando(null);
        setFormulario(formularioInicial);
    }

    async function guardarTestimonio() {
        if (!formulario.nombre.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "El nombre es obligatorio.",
            });

            return;
        }

        if (!formulario.comentario.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "El comentario es obligatorio.",
            });

            return;
        }

        try {
            setGuardando(true);

            const respuesta = await fetch(
                "/api/testimonios",
                {
                    method: editando ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        editando
                            ? {
                                  id: editando.id,
                                  ...formulario,
                              }
                            : formulario
                    ),
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error ||
                        "No se pudo guardar el testimonio."
                );
            }

            cerrarFormulario();

            await cargarTestimonios();

            setAlerta({
                tipo: "exito",
                titulo: editando
                    ? "Testimonio actualizado"
                    : "Testimonio creado",
                mensaje: editando
                    ? "El testimonio se actualizó correctamente."
                    : "El testimonio se creó correctamente.",
            });
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo guardar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error.",
            });
        } finally {
            setGuardando(false);
        }
    }

    async function publicarTestimonio(testimonio: Testimonio) {
        try {
            const respuesta = await fetch("/api/testimonios", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: testimonio.id,
                    nombre: testimonio.nombre,
                    comentario: testimonio.comentario,
                    publicado: true,
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error || "No se pudo publicar el testimonio."
                );
            }

            await cargarTestimonios();

            setAlerta({
                tipo: "exito",
                titulo: "Testimonio publicado",
                mensaje: "Ya aparece en la página pública.",
            });
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo publicar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error.",
            });
        }
    }

    async function despublicarTestimonio(
        id: number
    ) {
        try {
            const respuesta = await fetch(
                "/api/testimonios",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ id }),
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error ||
                        "No se pudo retirar el testimonio."
                );
            }

            await cargarTestimonios();

            setAlerta({
                tipo: "exito",
                titulo: "Testimonio retirado",
                mensaje:
                    "El testimonio ya no aparecerá públicamente.",
            });
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo retirar",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error.",
            });
        }
    }

    async function eliminarTestimonioPermanente(
        id: number
    ) {
        const confirmado = window.confirm(
            "Esto elimina el testimonio para siempre, no se puede deshacer. ¿Quieres continuar?"
        );

        if (!confirmado) {
            return;
        }

        try {
            const respuesta = await fetch(
                "/api/testimonios",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id,
                        accion: "borrar",
                    }),
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error ||
                        "No se pudo eliminar el testimonio."
                );
            }

            await cargarTestimonios();

            setAlerta({
                tipo: "exito",
                titulo: "Testimonio eliminado",
                mensaje:
                    "El testimonio se eliminó permanentemente.",
            });
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "No se pudo eliminar",
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

                {/* HEADER */}
                <header className="border-b border-[#D8D0C5]">
                    <div className="mx-auto max-w-6xl px-5 py-7 sm:px-6">

                        <p className="text-sm font-medium text-[#C56835]">
                            Administración
                        </p>

                        <h1 className="mt-1 font-serif text-3xl sm:text-4xl">
                            Testimonios
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707469]">
                            Administra las opiniones que aparecerán
                            en el sitio web.
                        </p>

                    </div>
                </header>


                {/* CONTENIDO */}
                <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">

                    <div className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm sm:p-7">

                        {/* ENCABEZADO */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C56835]">
                                    Opiniones
                                </p>

                                <h2 className="mt-1 font-serif text-2xl">
                                    Testimonios publicados
                                </h2>

                                <p className="mt-1 text-sm text-[#707469]">
                                    Solo los testimonios publicados
                                    aparecerán en la página pública.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={abrirNuevo}
                                className="w-full rounded-full bg-[#59614D] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 sm:w-auto"
                            >
                                + Agregar testimonio
                            </button>

                        </div>


                        {/* LISTA */}
                        <div className="mt-8">

                            {cargando ? (

                                <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-[#FCFAF7] p-8 text-center text-sm text-[#707469]">
                                    Cargando testimonios...
                                </div>

                            ) : testimonios.length === 0 ? (

                                <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-[#FCFAF7] p-8 text-center">

                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E1DBD2] text-2xl">
                                        ★
                                    </div>

                                    <p className="mt-4 font-medium">
                                        Aún no hay testimonios.
                                    </p>

                                    <p className="mt-1 text-sm text-[#707469]">
                                        Agrega el primer testimonio
                                        para mostrarlo en el sitio.
                                    </p>

                                </div>

                            ) : (

                                <div className="space-y-4">

                                    {testimonios.map(
                                        (testimonio) => (

                                            <article
                                                key={
                                                    testimonio.id
                                                }
                                                className="rounded-2xl border border-[#E1DBD2] bg-[#FCFAF7] p-5"
                                            >

                                                <div className="flex flex-col gap-5">

                                                    <div className="flex items-start gap-4">

                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59614D] text-lg text-white">
                                                            ★
                                                        </div>

                                                        <div className="min-w-0 flex-1">

                                                            <div className="flex flex-wrap items-center gap-2">

                                                                <h3 className="font-serif text-xl">
                                                                    {
                                                                        testimonio.nombre
                                                                    }
                                                                </h3>

                                                                {testimonio.publicado ? (
                                                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                                                        Publicado
                                                                    </span>
                                                                ) : (
                                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                                                        No publicado
                                                                    </span>
                                                                )}

                                                            </div>

                                                            <p className="mt-3 text-sm leading-7 text-[#707469]">
                                                                “
                                                                {
                                                                    testimonio.comentario
                                                                }
                                                                ”
                                                            </p>

                                                        </div>

                                                    </div>


                                                    {/* ACCIONES */}
                                                    <div className="flex flex-col gap-2 border-t border-[#E1DBD2] pt-4 sm:flex-row sm:justify-end">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirEditar(
                                                                    testimonio
                                                                )
                                                            }
                                                            className="rounded-full border border-[#D8D0C5] px-5 py-2.5 text-xs font-medium transition hover:border-[#C56835] hover:text-[#C56835]"
                                                        >
                                                            Editar
                                                        </button>

                                                        {testimonio.publicado !==
                                                            1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    publicarTestimonio(
                                                                        testimonio
                                                                    )
                                                                }
                                                                className="rounded-full border border-green-300 bg-green-50 px-5 py-2.5 text-xs font-medium text-green-800 transition hover:bg-green-100"
                                                            >
                                                                Publicar
                                                            </button>
                                                        )}

                                                        {testimonio.publicado ===
                                                            1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    despublicarTestimonio(
                                                                        testimonio.id
                                                                    )
                                                                }
                                                                className="rounded-full border border-red-200 px-5 py-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                            >
                                                                Retirar
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                eliminarTestimonioPermanente(
                                                                    testimonio.id
                                                                )
                                                            }
                                                            className="rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-xs font-medium text-red-800 transition hover:bg-red-100"
                                                        >
                                                            Eliminar permanentemente
                                                        </button>

                                                    </div>

                                                </div>

                                            </article>

                                        )
                                    )}

                                </div>

                            )}

                        </div>

                    </div>

                </section>


                {/* MODAL */}
                {mostrarFormulario && (

                    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">

                        <div className="my-auto w-full max-w-xl rounded-3xl bg-[#F7F1E9] p-5 shadow-2xl sm:p-7">

                            <div className="mb-6 flex items-start justify-between gap-4">

                                <div>

                                    <p className="text-sm text-[#C56835]">
                                        Testimonio
                                    </p>

                                    <h2 className="mt-1 font-serif text-2xl">
                                        {editando
                                            ? "Editar testimonio"
                                            : "Agregar testimonio"}
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


                            <div className="space-y-5">

                                {/* NOMBRE */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium">
                                        Nombre
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            formulario.nombre
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                nombre: e
                                                    .target
                                                    .value,
                                            })
                                        }
                                        placeholder="Ej. María"
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                    />

                                </div>


                                {/* COMENTARIO */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium">
                                        Comentario
                                    </label>

                                    <textarea
                                        rows={6}
                                        value={
                                            formulario.comentario
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                comentario:
                                                    e
                                                        .target
                                                        .value,
                                            })
                                        }
                                        placeholder="Escribe el testimonio..."
                                        className="w-full resize-y rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                    />

                                </div>


                                {/* PUBLICADO */}
                                <label className="flex cursor-pointer items-center gap-3 text-sm">

                                    <input
                                        type="checkbox"
                                        checked={
                                            formulario.publicado ===
                                            1
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                publicado: e
                                                    .target
                                                    .checked
                                                    ? 1
                                                    : 0,
                                            })
                                        }
                                        className="h-4 w-4 accent-[#C56835]"
                                    />

                                    Mostrar este testimonio
                                    públicamente

                                </label>

                            </div>


                            {/* BOTONES */}
                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                                <button
                                    type="button"
                                    onClick={
                                        cerrarFormulario
                                    }
                                    disabled={guardando}
                                    className="rounded-full border border-[#D8D0C5] px-6 py-3 text-sm font-medium transition hover:bg-white disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        guardarTestimonio
                                    }
                                    disabled={guardando}
                                    className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {guardando
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
                                        alerta.tipo ===
                                        "error"
                                            ? "bg-red-50 text-red-600"
                                            : "bg-green-50 text-green-600"
                                    }`}
                                >
                                    {alerta.tipo ===
                                    "error"
                                        ? "!"
                                        : "✓"}
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
                                    onClick={() =>
                                        setAlerta(null)
                                    }
                                    className="text-2xl leading-none text-[#707469] hover:text-[#C56835]"
                                    aria-label="Cerrar alerta"
                                >
                                    ×
                                </button>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setAlerta(null)
                                }
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
