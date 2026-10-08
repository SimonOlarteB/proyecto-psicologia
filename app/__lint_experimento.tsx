import { useEffect, useState } from "react";

// Variante 4: IIFE que await a la función nombrada
export function Variante4() {
  const [datos, setDatos] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      const respuesta = await fetch("/api/datos");
      const json = await respuesta.json();
      setDatos(json);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await cargar();
    })();
  }, []);

  return <div>{cargando ? "..." : datos.length}</div>;
}

// Variante 5: IIFE que NO await (fire and forget dentro del IIFE)
export function Variante5() {
  const [datos, setDatos] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      const respuesta = await fetch("/api/datos");
      const json = await respuesta.json();
      setDatos(json);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void (async () => {
      cargar();
    })();
  }, []);

  return <div>{cargando ? "..." : datos.length}</div>;
}

// Variante 6: función declarada DESPUÉS del effect (orden original)
export function Variante6() {
  const [datos, setDatos] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      const respuesta = await fetch("/api/datos");
      const json = await respuesta.json();
      setDatos(json);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  return <div>{cargando ? "..." : datos.length}</div>;
}
