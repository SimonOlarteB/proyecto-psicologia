import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  titulo: string;
  actualizado: string;
  children: ReactNode;
};

/**
 * Contenedor simple para páginas legales.
 * Usa estilos en línea para no depender de Tailwind;
 * ajusta colores/tipografía a los del sitio si quieres.
 */
export default function DocumentoLegal({
  titulo,
  actualizado,
  children,
}: Props) {
  return (
    <main
      style={{
        maxWidth: "46rem",
        margin: "0 auto",
        padding: "3rem 1.25rem 5rem",
        color: "#2f3326",
        lineHeight: 1.75,
        fontSize: "1.0625rem",
      }}
    >
      <p style={{ margin: 0 }}>
        <Link href="/" style={{ color: "#565c47" }}>
          Volver al sitio
        </Link>
      </p>
      <h1
        style={{
          fontSize: "2rem",
          lineHeight: 1.2,
          margin: "1.5rem 0 0.25rem",
        }}
      >
        {titulo}
      </h1>
      <p style={{ margin: "0 0 2rem", color: "#6b705f" }}>
        Última actualización: {actualizado}
      </p>
      {children}
    </main>
  );
}
