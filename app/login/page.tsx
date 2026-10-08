"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginPageContent() {
    const searchParams = useSearchParams();
    const destino = searchParams.get("next") || "/admin";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setError("");

    if (!email.trim() || !password) {
        setError("Por favor, completa tu correo y contraseña.");
        return;
    }

    setCargando(true);

    try {
        const respuesta = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            setError(
                datos.error || "No fue posible iniciar sesión."
            );
            return;
        }

        /*
         * Por ahora mostramos el resultado.
         * En el siguiente paso redirigiremos al panel
         * y obligaremos a cambiar la contraseña cuando corresponda.
         */
        if (datos.debeCambiarPassword) {
            window.location.href = "/cambiar-password";
            return;
        }

        const destinoFinal = destino.startsWith("/") ? destino : "/admin";
        window.location.href = destinoFinal;
    } catch (error) {
        console.error("Error iniciando sesión:", error);
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
                    {/* MARCA */}
                    <div className="mb-8 text-center">
                        <p className="text-sm font-medium tracking-wide text-[#C56835]">
                            Aura Elisa Sánchez
                        </p>

                        <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
                            Panel administrativo
                        </h1>

                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#707469]">
                            Ingresa para gestionar tus citas, disponibilidad
                            y contenido de tu consulta.
                        </p>
                    </div>

                    {/* TARJETA */}
                    <div className="rounded-3xl border border-[#E1DBD2] bg-white p-6 shadow-sm sm:p-8">
                        <div className="mb-7">
                            <h2 className="font-serif text-2xl text-[#3F4635]">
                                Iniciar sesión
                            </h2>

                            <p className="mt-2 text-sm text-[#707469]">
                                Acceso exclusivo para la administradora.
                            </p>
                        </div>

                        <form onSubmit={iniciarSesion} className="space-y-5">
                            {/* CORREO */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-medium text-[#3F4635]"
                                >
                                    Correo electrónico
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    autoComplete="email"
                                    disabled={cargando}
                                    className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FDFBF8] px-4 py-3.5 text-sm text-[#3F4635] outline-none transition placeholder:text-[#A3A39D] focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>

                            {/* CONTRASEÑA */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-medium text-[#3F4635]"
                                >
                                    Contraseña
                                </label>

                                <div className="relative">
                                    <input
                                        id="password"
                                        type={
                                            mostrarPassword
                                                ? "text"
                                                : "password"
                                        }
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="Ingresa tu contraseña"
                                        autoComplete="current-password"
                                        disabled={cargando}
                                        className="w-full rounded-2xl border border-[#D8D0C5] bg-[#FDFBF8] px-4 py-3.5 pr-20 text-sm text-[#3F4635] outline-none transition placeholder:text-[#A3A39D] focus:border-[#C56835] focus:ring-2 focus:ring-[#C56835]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMostrarPassword(
                                                !mostrarPassword
                                            )
                                        }
                                        disabled={cargando}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-medium text-[#707469] transition hover:bg-[#F7F1E9] hover:text-[#C56835] disabled:opacity-50"
                                    >
                                        {mostrarPassword
                                            ? "Ocultar"
                                            : "Mostrar"}
                                    </button>
                                </div>
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

                            {/* BOTÓN */}
                            <button
                                type="submit"
                                disabled={cargando}
                                className="w-full rounded-full bg-[#C56835] px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {cargando
                                    ? "Ingresando..."
                                    : "Iniciar sesión"}
                            </button>
                        </form>
                    </div>

                    {/* VOLVER AL SITIO */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="text-sm text-[#707469] transition hover:text-[#C56835]"
                        >
                            ← Volver al sitio web
                        </Link>
                    </div>

                    <p className="mt-8 text-center text-xs leading-5 text-[#92948D]">
                        Acceso privado para la administración de la consulta
                        psicológica.
                    </p>
                </section>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#3F4635]">Cargando...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}