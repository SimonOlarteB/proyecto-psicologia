"use client";

import { useEffect } from "react";

export default function ScrollToTop() {
  useEffect(() => {
    // Evitar que el navegador restaure
    // la posición anterior del scroll.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const irAlInicio = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    };

    // Al cargar la página.
    irAlInicio();

    // Después de que el navegador restaure la página.
    window.addEventListener("pageshow", irAlInicio);

    // Refuerzo para móviles.
    requestAnimationFrame(() => {
      irAlInicio();

      requestAnimationFrame(() => {
        irAlInicio();
      });
    });

    return () => {
      window.removeEventListener("pageshow", irAlInicio);
    };
  }, []);

  return null;
}