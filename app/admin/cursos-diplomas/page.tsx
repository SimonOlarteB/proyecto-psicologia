"use client";

import { useEffect, useMemo, useState } from "react";
import AdminNav from "../../components/AdminNav";

type TipoFormacion =
    | "CURSO"
    | "DIPLOMADO"
    | "CERTIFICACION";

type Trayectoria = {
    id: number;
    tipo: string;
    titulo: string;
    institucion: string | null;
    descripcion: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    imagen_url: string | null;
};

type Formulario = {
    tipo: TipoFormacion;
    titulo: string;
    institucion: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    imagen_url: string;
};

const formularioInicial: Formulario = {
    tipo: "CURSO",
    titulo: "",
    institucion: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    imagen_url: "",
};

export default function CursosDiplomasPage() {
    const [elementos, setElementos] = useState<Trayectoria[]>([]);
    const [cargando, setCargando] = useState(true);

    const [mostrarFormulario, setMostrarFormulario] =
        useState(false);

    const [editando, setEditando] =
        useState<Trayectoria | null>(null);

    const [formulario, setFormulario] =
        useState<Formulario>(formularioInicial);

    const [guardando, setGuardando] = useState(false);
    const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
    const [vistaPreviaImagen, setVistaPreviaImagen] = useState("");
    const [quitarImagen, setQuitarImagen] = useState(false);

    const [alerta, setAlerta] = useState<{
        tipo: "exito" | "error";
        titulo: string;
        mensaje: string;
    } | null>(null);

    useEffect(() => {
        cargarElementos();
    }, []);

    async function cargarElementos() {
        try {
            setCargando(true);

            const respuesta = await fetch(
                "/api/trayectoria",
                {
                    cache: "no-store",
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error ||
                        "No se pudo cargar la información."
                );
            }

            const formacion = datos.filter(
                (elemento: Trayectoria) =>
                    elemento.tipo === "CURSO" ||
                    elemento.tipo === "DIPLOMADO" ||
                    elemento.tipo === "CERTIFICACION"
            );

            setElementos(formacion);
        } catch (error) {
            console.error(error);

            setAlerta({
                tipo: "error",
                titulo: "Error",
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "No se pudo cargar la información.",
            });
        } finally {
            setCargando(false);
        }
    }

    const cursos = useMemo(
        () =>
            elementos.filter(
                (elemento) => elemento.tipo === "CURSO"
            ),
        [elementos]
    );

    const diplomados = useMemo(
        () =>
            elementos.filter(
                (elemento) =>
                    elemento.tipo === "DIPLOMADO"
            ),
        [elementos]
    );

    const certificaciones = useMemo(
        () =>
            elementos.filter(
                (elemento) =>
                    elemento.tipo === "CERTIFICACION"
            ),
        [elementos]
    );

    function abrirNuevo() {
        setEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setVistaPreviaImagen("");
        setQuitarImagen(false);
        setMostrarFormulario(true);
    }

    function abrirEditar(elemento: Trayectoria) {
        setEditando(elemento);

        setFormulario({
            tipo:
                elemento.tipo === "DIPLOMADO"
                    ? "DIPLOMADO"
                    : elemento.tipo === "CERTIFICACION"
                        ? "CERTIFICACION"
                        : "CURSO",
            titulo: elemento.titulo || "",
            institucion: elemento.institucion || "",
            descripcion: elemento.descripcion || "",
            fecha_inicio:
                elemento.fecha_inicio
                    ? elemento.fecha_inicio.substring(0, 10)
                    : "",
            fecha_fin:
                elemento.fecha_fin
                    ? elemento.fecha_fin.substring(0, 10)
                    : "",
            imagen_url: elemento.imagen_url || "",
        });

        setArchivoImagen(null);
        setVistaPreviaImagen(elemento.imagen_url || "");
        setQuitarImagen(false);
        setMostrarFormulario(true);
    }

    function cerrarFormulario() {
        if (guardando) return;

        setMostrarFormulario(false);
        setEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setVistaPreviaImagen("");
        setQuitarImagen(false);
    }

    async function guardar() {
        if (!formulario.titulo.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "El título es obligatorio.",
            });

            return;
        }

        if (!formulario.institucion.trim()) {
            setAlerta({
                tipo: "error",
                titulo: "Falta información",
                mensaje: "La institución es obligatoria.",
            });

            return;
        }

        try {
            setGuardando(true);

            let imagenUrl = formulario.imagen_url || null;

            if (archivoImagen) {
                const datosImagen = new FormData();
                datosImagen.append("file", archivoImagen);

                const respuestaImagen = await fetch(
                    "/api/trayectoria/upload",
                    {
                        method: "POST",
                        body: datosImagen,
                    }
                );

                const resultadoImagen = await respuestaImagen.json();

                if (!respuestaImagen.ok) {
                    throw new Error(
                        resultadoImagen.error ||
                            "No se pudo subir la imagen."
                    );
                }

                imagenUrl = resultadoImagen.url;
            } else if (quitarImagen) {
                imagenUrl = null;
            }

            const datos = {
                ...(editando
                    ? { id: editando.id }
                    : {}),
                tipo: formulario.tipo,
                titulo: formulario.titulo.trim(),
                institucion:
                    formulario.institucion.trim(),
                descripcion:
                    formulario.descripcion.trim() || null,
                fecha_inicio:
                    formulario.fecha_inicio || null,
                fecha_fin:
                    formulario.fecha_fin || null,
                imagen_url: imagenUrl,
            };

            const respuesta = await fetch(
                "/api/trayectoria",
                {
                    method: editando ? "PUT" : "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify(datos),
                }
            );

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.error ||
                        "No se pudo guardar la información."
                );
            }

            cerrarFormulario();

            await cargarElementos();

            setAlerta({
                tipo: "exito",
                titulo: editando
                    ? "Información actualizada"
                    : "Información agregada",
                mensaje: editando
                    ? "El registro se actualizó correctamente."
                    : "El registro se creó correctamente.",
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

    async function eliminar(id: number) {
        const confirmado = window.confirm(
            "¿Deseas eliminar este registro? Esta acción no se puede deshacer."
        );

        if (!confirmado) return;

        try {
            const respuesta = await fetch(
                "/api/trayectoria",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({ id }),
                }
            );

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.error ||
                        "No se pudo eliminar el registro."
                );
            }

            await cargarElementos();

            setAlerta({
                tipo: "exito",
                titulo: "Registro eliminado",
                mensaje:
                    "La información se eliminó correctamente.",
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

    function etiquetaTipo(tipo: string) {
        if (tipo === "CURSO") return "Curso";
        if (tipo === "DIPLOMADO") return "Diplomado";
        if (tipo === "CERTIFICACION")
            return "Certificación";

        return tipo;
    }

    function colorTipo(tipo: string) {
        if (tipo === "CURSO") {
            return "bg-[#59614D] text-white";
        }

        if (tipo === "DIPLOMADO") {
            return "bg-[#C56835] text-white";
        }

        return "bg-[#E1DBD2] text-[#59614D]";
    }

    function ListaFormacion({
        titulo,
        subtitulo,
        items,
    }: {
        titulo: string;
        subtitulo: string;
        items: Trayectoria[];
    }) {
        return (
            <section className="rounded-3xl border border-[#E1DBD2] bg-white p-5 shadow-sm sm:p-7">

                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C56835]">
                        Formación
                    </p>

                    <h2 className="mt-1 font-serif text-2xl">
                        {titulo}
                    </h2>

                    <p className="mt-1 text-sm text-[#707469]">
                        {subtitulo}
                    </p>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-[#FCFAF7] p-7 text-center">

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E1DBD2] text-lg">
                            +
                        </div>

                        <p className="mt-3 text-sm text-[#707469]">
                            Aún no hay registros en esta categoría.
                        </p>

                    </div>
                ) : (
                    <div className="space-y-4">

                        {items.map((elemento) => (
                            <article
                                key={elemento.id}
                                className="rounded-2xl border border-[#E1DBD2] bg-[#FCFAF7] p-5"
                            >

                                <div className="flex flex-col gap-5">

                                    <div>

                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colorTipo(
                                                elemento.tipo
                                            )}`}
                                        >
                                            {etiquetaTipo(
                                                elemento.tipo
                                            )}
                                        </span>

                                        <h3 className="mt-3 font-serif text-xl text-[#3F4635]">
                                            {elemento.titulo}
                                        </h3>

                                        {elemento.institucion && (
                                            <p className="mt-1 text-sm font-medium text-[#59614D]">
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
                                            <p className="mt-3 text-xs text-[#8A8D84]">
                                                {elemento.fecha_inicio
                                                    ? new Date(
                                                          elemento.fecha_inicio
                                                      ).toLocaleDateString(
                                                          "es-CO",
                                                          {
                                                              month: "long",
                                                              year: "numeric",
                                                          }
                                                      )
                                                    : "Sin fecha"}

                                                {" — "}

                                                {elemento.fecha_fin
                                                    ? new Date(
                                                          elemento.fecha_fin
                                                      ).toLocaleDateString(
                                                          "es-CO",
                                                          {
                                                              month: "long",
                                                              year: "numeric",
                                                          }
                                                      )
                                                    : "Actualidad"}
                                            </p>
                                        )}

                                        {elemento.imagen_url && (
                                            <div className="mt-4 overflow-hidden rounded-2xl border border-[#E1DBD2] bg-white">
                                                <img
                                                    src={elemento.imagen_url}
                                                    alt={`Imagen de ${elemento.titulo}`}
                                                    className="h-48 w-full object-contain bg-[#F7F1E9]"
                                                />
                                            </div>
                                        )}

                                    </div>


                                    <div className="flex flex-col gap-2 border-t border-[#E1DBD2] pt-4 sm:flex-row sm:justify-end">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                abrirEditar(
                                                    elemento
                                                )
                                            }
                                            className="rounded-full border border-[#D8D0C5] px-5 py-2.5 text-xs font-medium transition hover:border-[#C56835] hover:text-[#C56835]"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                eliminar(
                                                    elemento.id
                                                )
                                            }
                                            className="rounded-full border border-red-200 px-5 py-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                                        >
                                            Eliminar
                                        </button>

                                    </div>

                                </div>

                            </article>
                        ))}

                    </div>
                )}

            </section>
        );
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
                            Cursos y diplomas
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707469]">
                            Gestiona los cursos, diplomados y
                            certificaciones que forman parte de la
                            trayectoria profesional.
                        </p>

                    </div>
                </header>


                {/* CONTENIDO */}
                <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">

                    <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-[#59614D] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">

                        <div>

                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                                Formación profesional
                            </p>

                            <h2 className="mt-2 font-serif text-2xl sm:text-3xl">
                                Agrega nuevos logros
                            </h2>

                            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                                Esta información podrá mostrarse
                                posteriormente en la página pública.
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={abrirNuevo}
                            className="w-full shrink-0 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#59614D] transition hover:bg-[#F7F1E9] sm:w-auto"
                        >
                            + Agregar
                        </button>

                    </div>


                    {cargando ? (

                        <div className="rounded-3xl border border-dashed border-[#D8D0C5] bg-white p-10 text-center text-sm text-[#707469]">
                            Cargando información...
                        </div>

                    ) : (

                        <div className="space-y-6">

                            <ListaFormacion
                                titulo="Cursos"
                                subtitulo="Cursos y formaciones complementarias."
                                items={cursos}
                            />

                            <ListaFormacion
                                titulo="Diplomados"
                                subtitulo="Diplomados y programas de especialización."
                                items={diplomados}
                            />

                            <ListaFormacion
                                titulo="Certificaciones"
                                subtitulo="Certificaciones y acreditaciones profesionales."
                                items={certificaciones}
                            />

                        </div>

                    )}

                </section>


                {/* MODAL */}
                {mostrarFormulario && (

                    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">

                        <div className="my-auto w-full max-w-xl rounded-3xl bg-[#F7F1E9] p-5 shadow-2xl sm:p-7">

                            <div className="mb-6 flex items-start justify-between gap-4">

                                <div>

                                    <p className="text-sm text-[#C56835]">
                                        Formación profesional
                                    </p>

                                    <h2 className="mt-1 font-serif text-2xl">
                                        {editando
                                            ? "Editar registro"
                                            : "Agregar registro"}
                                    </h2>

                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        cerrarFormulario
                                    }
                                    className="text-2xl leading-none text-[#707469] transition hover:text-[#C56835]"
                                    aria-label="Cerrar"
                                >
                                    ×
                                </button>

                            </div>


                            <div className="space-y-5">

                                {/* TIPO */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium">
                                        Tipo
                                    </label>

                                    <select
                                        value={
                                            formulario.tipo
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                tipo: e
                                                    .target
                                                    .value as TipoFormacion,
                                            })
                                        }
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                    >

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


                                {/* TITULO */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium">
                                        Nombre / título
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            formulario.titulo
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                titulo: e
                                                    .target
                                                    .value,
                                            })
                                        }
                                        placeholder="Ej. Diplomado en Psicología Clínica"
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                    />

                                </div>


                                {/* INSTITUCION */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium">
                                        Institución
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            formulario.institucion
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                institucion:
                                                    e
                                                        .target
                                                        .value,
                                            })
                                        }
                                        placeholder="Ej. Universidad..."
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                    />

                                </div>


                                {/* DESCRIPCION */}
                                <div>

                                    <label className="mb-2 block text-sm font-medium">
                                        Descripción
                                        <span className="ml-1 text-xs text-[#8A8D84]">
                                            (opcional)
                                        </span>
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={
                                            formulario.descripcion
                                        }
                                        onChange={(e) =>
                                            setFormulario({
                                                ...formulario,
                                                descripcion:
                                                    e
                                                        .target
                                                        .value,
                                            })
                                        }
                                        placeholder="Información adicional..."
                                        className="w-full resize-y rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10"
                                    />

                                </div>


                                {/* IMAGEN */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Imagen del diploma / certificado
                                        <span className="ml-1 text-xs text-[#8A8D84]">
                                            (opcional)
                                        </span>
                                    </label>

                                    <div className="rounded-2xl border border-dashed border-[#D8D0C5] bg-white p-4">
                                        {vistaPreviaImagen ? (
                                            <div className="space-y-3">
                                                <div className="overflow-hidden rounded-2xl border border-[#E1DBD2] bg-[#F7F1E9]">
                                                    <img
                                                        src={vistaPreviaImagen}
                                                        alt="Vista previa"
                                                        className="max-h-72 w-full object-contain"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <label className="cursor-pointer rounded-full border border-[#D8D0C5] px-5 py-2.5 text-center text-xs font-medium transition hover:border-[#C56835] hover:text-[#C56835]">
                                                        Cambiar imagen
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
                                                                    5 * 1024 * 1024
                                                                ) {
                                                                    setAlerta({
                                                                        tipo: "error",
                                                                        titulo: "Imagen demasiado grande",
                                                                        mensaje:
                                                                            "La imagen no puede superar los 5 MB.",
                                                                    });
                                                                    e.target.value = "";
                                                                    return;
                                                                }

                                                                setArchivoImagen(
                                                                    archivo
                                                                );
                                                                setVistaPreviaImagen(
                                                                    URL.createObjectURL(
                                                                        archivo
                                                                    )
                                                                );
                                                                setQuitarImagen(
                                                                    false
                                                                );
                                                            }}
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setArchivoImagen(
                                                                null
                                                            );
                                                            setVistaPreviaImagen(
                                                                ""
                                                            );
                                                            setQuitarImagen(
                                                                true
                                                            );
                                                            setFormulario({
                                                                ...formulario,
                                                                imagen_url: "",
                                                            });
                                                        }}
                                                        className="rounded-full border border-red-200 px-5 py-2.5 text-center text-xs font-medium text-red-700 transition hover:bg-red-50"
                                                    >
                                                        Quitar imagen
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#E1DBD2] bg-[#FCFAF7] px-5 py-8 text-center transition hover:border-[#C56835]">
                                                <span className="text-3xl">🖼️</span>
                                                <span className="mt-3 text-sm font-medium text-[#3F4635]">
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
                                                            5 * 1024 * 1024
                                                        ) {
                                                            setAlerta({
                                                                tipo: "error",
                                                                titulo: "Imagen demasiado grande",
                                                                mensaje:
                                                                    "La imagen no puede superar los 5 MB.",
                                                            });
                                                            e.target.value = "";
                                                            return;
                                                        }

                                                        setArchivoImagen(
                                                            archivo
                                                        );
                                                        setVistaPreviaImagen(
                                                            URL.createObjectURL(
                                                                archivo
                                                            )
                                                        );
                                                        setQuitarImagen(false);
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>


                                {/* FECHAS */}
                                <div className="grid gap-4 sm:grid-cols-2">

                                    <div>

                                        <label className="mb-2 block text-sm font-medium">
                                            Fecha de inicio
                                            <span className="ml-1 text-xs text-[#8A8D84]">
                                                (opcional)
                                            </span>
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                formulario.fecha_inicio
                                            }
                                            onChange={(e) =>
                                                setFormulario({
                                                    ...formulario,
                                                    fecha_inicio:
                                                        e
                                                            .target
                                                            .value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                        />

                                    </div>


                                    <div>

                                        <label className="mb-2 block text-sm font-medium">
                                            Fecha de finalización
                                            <span className="ml-1 text-xs text-[#8A8D84]">
                                                (opcional)
                                            </span>
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                formulario.fecha_fin
                                            }
                                            onChange={(e) =>
                                                setFormulario({
                                                    ...formulario,
                                                    fecha_fin:
                                                        e
                                                            .target
                                                            .value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#C56835]"
                                        />

                                    </div>

                                </div>

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
                                    onClick={guardar}
                                    disabled={guardando}
                                    className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : editando
                                            ? "Guardar cambios"
                                            : "Agregar"}
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
