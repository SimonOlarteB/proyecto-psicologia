"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function TestimonioPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [cargando, setCargando] = useState(true);
  const [valido, setValido] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  const [clienteNombre, setClienteNombre] = useState("");
  const [servicioNombre, setServicioNombre] = useState("");

  const [nombre, setNombre] = useState("");
  const [comentario, setComentario] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function cargar() {
      try {
        const respuesta = await fetch(`/api/testimonio/${token}`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "Este enlace no está disponible."
          );
        }

        setClienteNombre(datos.clienteNombre || "");
        setServicioNombre(datos.servicioNombre || "");
        setNombre(
          String(datos.clienteNombre || "").split(" ")[0] || ""
        );
        setValido(true);
      } catch (e) {
        setErrorCarga(
          e instanceof Error ? e.message : "Ocurrió un error inesperado."
        );
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [token]);

  async function enviarTestimonio() {
    if (enviando || enviado) return;

    if (nombre.trim().length < 2) {
      setError(true);
      setMensaje("Escribe tu nombre (mínimo 2 caracteres).");
      return;
    }

    if (comentario.trim().length < 5) {
      setError(true);
      setMensaje("Cuéntanos un poco más sobre tu experiencia.");
      return;
    }

    setEnviando(true);
    setMensaje("");
    setError(false);

    try {
      const respuesta = await fetch(`/api/testimonio/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, comentario }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No fue posible enviar tu testimonio."
        );
      }

      setEnviado(true);
      setMensaje(datos.mensaje);
    } catch (e) {
      setError(true);
      setMensaje(
        e instanceof Error ? e.message : "Ocurrió un error inesperado."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F1E9] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-lg sm:p-12">
        <p className="mb-3 text-sm tracking-widest text-[#C56835]">
          AURA ELISA SÁNCHEZ
        </p>

        {cargando ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : !valido ? (
          <>
            <div className="mb-5 text-5xl">⚠️</div>
            <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
              Enlace no disponible
            </h1>
            <p className="leading-7 text-gray-600">{errorCarga}</p>
          </>
        ) : enviado ? (
          <>
            <div className="mb-5 text-5xl">✓</div>
            <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
              ¡Gracias por tu testimonio!
            </h1>
            <p className="leading-7 text-gray-600">{mensaje}</p>
          </>
        ) : (
          <>
            <div className="mb-5 text-5xl">♡</div>

            <h1 className="mb-4 font-serif text-3xl text-[#3F4635]">
              Cuéntanos tu experiencia
            </h1>

            <p className="mb-8 leading-7 text-gray-600">
              {clienteNombre && `Hola ${clienteNombre}, `}
              nos encantaría conocer cómo fue tu sesión de{" "}
              <strong>{servicioNombre}</strong>. Tu opinión es muy
              valiosa.
            </p>

            <div className="mb-5 text-left">
              <label
                htmlFor="nombre"
                className="mb-2 block text-sm font-medium text-[#3F4635]"
              >
                Tu nombre (como quieres que aparezca)
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. María"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-700 focus:border-[#59614D] focus:outline-none"
              />
            </div>

            <div className="mb-6 text-left">
              <label
                htmlFor="comentario"
                className="mb-2 block text-sm font-medium text-[#3F4635]"
              >
                Tu experiencia
              </label>
              <textarea
                id="comentario"
                rows={6}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe aquí cómo fue tu experiencia..."
                className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-700 focus:border-[#59614D] focus:outline-none"
              />
            </div>

            {mensaje && (
              <div
                role="status"
                className={`mb-6 rounded-xl p-4 text-sm ${
                  error
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-800"
                }`}
              >
                {mensaje}
              </div>
            )}

            <button
              type="button"
              onClick={enviarTestimonio}
              disabled={enviando}
              className="w-full rounded-full bg-[#59614D] px-6 py-4 font-medium text-white transition hover:bg-[#454C3B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar mi testimonio"}
            </button>

            <p className="mt-8 text-sm text-gray-500">
              Compartir tu opinión es completamente voluntario. Tu
              testimonio será revisado antes de publicarse.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
