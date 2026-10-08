"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function CambiarPasswordPage() {
    const [passwordActual, setPasswordActual] = useState("");
    const [nuevaPassword, setNuevaPassword] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");

    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [exito, setExito] = useState("");

    async function cambiarPassword(
        evento: FormEvent<HTMLFormElement>
    ) {
        evento.preventDefault();

        setError("");
        setExito("");

        if (
            !passwordActual ||
            !nuevaPassword ||
            !confirmarPassword
        ) {
            setError("Completa todos los campos.");
            return;
        }

        if (nuevaPassword.length < 8) {
            setError(
                "La nueva contraseña debe tener mínimo 8 caracteres."
            );
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            setError("Las nuevas contraseñas no coinciden.");
            return;
        }

        if (passwordActual === nuevaPassword) {
            setError(
                "La nueva contraseña debe ser diferente a la actual."
            );
            return;
        }

        setCargando(true);

        try {
            const respuesta = await fetch(
                "/api/auth/cambiar-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        passwordActual,
                        nuevaPassword,
                    }),
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(
                    datos.error ||
                        "No fue posible cambiar la contraseña."
                );
                return;
            }

            setExito(
                "Tu contraseña fue actualizada correctamente."
            );

            setPasswordActual("");
            setNuevaPassword("");
            setConfirmarPassword("");

            setTimeout(() => {
                window.location.href = "/admin";
            }, 1200);
        } catch (error) {
            console.error(
                "Error cambiando contraseña:",
                error
            );

            setError(
                "No fue posible conectar con el servidor. Intenta nuevamente."
            );
        } finally {
            setCargando(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#F7F1E9] text-[#3F4635]">
            <div className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-6">
                <section className="w-full max-w-md">
                    {/* ENCABEZADO */}
                    <div className="mb-8 text-center">
                        <p className="text-sm font-medium tracking-wide text-[#C56835]">
                            Aura Elisa Sánchez
                        </p>

                        <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
                            Actualiza tu contraseña
                        </h1>

                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#707469]">
                            Por seguridad, debes crear una nueva
                            contraseña antes de continuar al panel
                            administrativo.
                        </p>
                    </div>

                    {/* TARJETA */}
                    <div className="rounded-3xl border border-[#E1DBD2] bg-white p-6 shadow-sm sm:p-8">
                        <form
                            onSubmit={cambiarPassword}
                            className="space-y-5"
                        >
                            {/* CONTRASEÑA ACTUAL */}
                            <div>
                                <label
                                    htmlFor="passwordActual"
                                    className="mb-2 block text-sm font-medium text-[#3F4635]"
                                >
                                    Contraseña actual
                                </label>

                                <div className="relative">
                                    <input
                                        id="passwordActual"
                                        type={
                                            mostrarActual
                                                ? "text"
                                                : "password"
                                        }
                                        value={passwordActual}
                                        onChange={(e) =>
                                            setPasswordActual(
                                                e.target.value
                                            )
                                        }
                                        autoComplete="current-password"
                                        disabled={cargando}
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FDFBF8] px-4 py-3.5 pr-20 text-sm outline-none transition placeholder:text-[#A3A39D] focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        placeholder="Contraseña actual"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMostrarActual(
                                                !mostrarActual
                                            )
                                        }
                                        disabled={cargando}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-medium text-[#707469] transition hover:bg-[#F7F1E9] hover:text-[#C56835]"
                                    >
                                        {mostrarActual
                                            ? "Ocultar"
                                            : "Mostrar"}
                                    </button>
                                </div>
                            </div>

                            {/* NUEVA CONTRASEÑA */}
                            <div>
                                <label
                                    htmlFor="nuevaPassword"
                                    className="mb-2 block text-sm font-medium text-[#3F4635]"
                                >
                                    Nueva contraseña
                                </label>

                                <div className="relative">
                                    <input
                                        id="nuevaPassword"
                                        type={
                                            mostrarNueva
                                                ? "text"
                                                : "password"
                                        }
                                        value={nuevaPassword}
                                        onChange={(e) =>
                                            setNuevaPassword(
                                                e.target.value
                                            )
                                        }
                                        autoComplete="new-password"
                                        disabled={cargando}
                                        placeholder="Mínimo 8 caracteres"
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FDFBF8] px-4 py-3.5 pr-20 text-sm outline-none transition placeholder:text-[#A3A39D] focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMostrarNueva(
                                                !mostrarNueva
                                            )
                                        }
                                        disabled={cargando}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-medium text-[#707469] transition hover:bg-[#F7F1E9] hover:text-[#C56835]"
                                    >
                                        {mostrarNueva
                                            ? "Ocultar"
                                            : "Mostrar"}
                                    </button>
                                </div>
                            </div>

                            {/* CONFIRMAR CONTRASEÑA */}
                            <div>
                                <label
                                    htmlFor="confirmarPassword"
                                    className="mb-2 block text-sm font-medium text-[#3F4635]"
                                >
                                    Confirmar nueva contraseña
                                </label>

                                <div className="relative">
                                    <input
                                        id="confirmarPassword"
                                        type={
                                            mostrarConfirmacion
                                                ? "text"
                                                : "password"
                                        }
                                        value={confirmarPassword}
                                        onChange={(e) =>
                                            setConfirmarPassword(
                                                e.target.value
                                            )
                                        }
                                        autoComplete="new-password"
                                        disabled={cargando}
                                        placeholder="Repite la nueva contraseña"
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FDFBF8] px-4 py-3.5 pr-20 text-sm outline-none transition placeholder:text-[#A3A39D] focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMostrarConfirmacion(
                                                !mostrarConfirmacion
                                            )
                                        }
                                        disabled={cargando}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-medium text-[#707469] transition hover:bg-[#F7F1E9] hover:text-[#C56835]"
                                    >
                                        {mostrarConfirmacion
                                            ? "Ocultar"
                                            : "Mostrar"}
                                    </button>
                                </div>
                            </div>

                            {/* REQUISITOS */}
                            <div className="rounded-2xl bg-[#F7F1E9] px-4 py-3">
                                <p className="text-xs leading-5 text-[#707469]">
                                    La contraseña debe tener mínimo 8
                                    caracteres y ser diferente de la
                                    contraseña actual.
                                </p>
                            </div>

                            {/* ERROR */}
                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                                >
                                    {error}
                                </div>
                            )}

                            {/* ÉXITO */}
                            {exito && (
                                <div
                                    role="status"
                                    className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm leading-5 text-green-700"
                                >
                                    {exito}
                                </div>
                            )}

                            {/* BOTÓN */}
                            <button
                                type="submit"
                                disabled={cargando}
                                className="w-full rounded-full bg-[#C56835] px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {cargando
                                    ? "Actualizando..."
                                    : "Cambiar contraseña"}
                            </button>
                        </form>
                    </div>

                    {/* VOLVER */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="text-sm text-[#707469] transition hover:text-[#C56835]"
                        >
                            ← Volver al sitio web
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}