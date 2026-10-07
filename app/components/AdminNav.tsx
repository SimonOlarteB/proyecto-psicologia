"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const opciones = [
  {
    nombre: "Inicio",
    ruta: "/admin",
    icono: "⌂",
  },

  {
    nombre: "Disponibilidad",
    ruta: "/admin/disponibilidad",
    icono: "◫",
  },
  {
    nombre: "Perfil",
    ruta: "/admin/perfil",
    icono: "♙",
  },
  {
    nombre: "Servicios",
    ruta: "/admin/servicios",
    icono: "✦",
  },
 {
    nombre: "Cursos y diplomas",
    ruta: "/admin/cursos-diplomas",
    icono: "▣",
},
  {
    nombre: "Testimonios",
    ruta: "/admin/testimonios",
    icono: "☆",
  },
  {
    nombre: "Blog",
    ruta: "/admin/blog",
    icono: "✎",
  },
  {
    nombre: "Pagos",
    ruta: "/admin/pagos",
    icono: "$",
  },
 
];

export default function AdminNav() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const cerrarSesion = async () => {
    setCerrandoSesion(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <>
      {/* BOTÓN MÓVIL */}
      <button
        type="button"
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        className="fixed right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-[#59614D] text-xl text-white shadow-lg transition hover:scale-105 lg:hidden"
      >
        {menuAbierto ? "×" : "☰"}
      </button>

      {/* FONDO MÓVIL */}
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={cerrarMenu}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col bg-[#59614D] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ENCABEZADO */}
        <div className="border-b border-white/15 px-6 py-7">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/60">
            Panel administrativo
          </p>

          <h1 className="mt-2 text-xl font-semibold">
            Aura Elisa Sánchez
          </h1>

          <p className="mt-1 text-sm text-white/65">
            Psicóloga Humanista
          </p>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Administración
          </p>

          <div className="space-y-1">
            {opciones.map((opcion) => {
              const activo =
                opcion.ruta === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(opcion.ruta);

              return (
                <Link
                  key={opcion.ruta}
                  href={opcion.ruta}
                  onClick={cerrarMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    activo
                      ? "bg-white text-[#59614D] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                      activo
                        ? "bg-[#F7F1E9] text-[#59614D]"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {opcion.icono}
                  </span>

                  <span className="font-medium">
                    {opcion.nombre}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* PARTE INFERIOR */}
        <div className="border-t border-white/15 p-4">
          <Link
            href="/"
            target="_blank"
            onClick={cerrarMenu}
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              ↗
            </span>

            <span className="font-medium">
              Ver sitio web
            </span>
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            disabled={cerrandoSesion}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              ←
            </span>

            <span className="font-medium">
              {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}