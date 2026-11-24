"use client";

import { useEffect, useRef, useState } from "react";

type HoraInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
};

function separarHora(hora: string) {
  const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!coincidencia) return null;

  const horas24 = Number(coincidencia[1]);
  const periodo: "AM" | "PM" = horas24 >= 12 ? "PM" : "AM";

  return {
    hora: String(horas24 % 12 || 12),
    minuto: coincidencia[2],
    periodo,
  };
}

export default function HoraInput({
  value,
  onChange,
  label,
  disabled = false,
  className = "",
  invalid = false,
  describedBy,
}: HoraInputProps) {
  const [hora, setHora] = useState("");
  const [minuto, setMinuto] = useState("");
  const [periodo, setPeriodo] = useState<"AM" | "PM">("AM");
  const ultimoValorEmitido = useRef<string | null>(null);

  useEffect(() => {
    if (ultimoValorEmitido.current === value) {
      ultimoValorEmitido.current = null;
      return;
    }

    const partes = separarHora(value);
    setHora(partes?.hora ?? "");
    setMinuto(partes?.minuto ?? "");
    setPeriodo(partes?.periodo ?? "AM");
  }, [value]);

  function emitirHora(
    nuevaHora: string,
    nuevoMinuto: string,
    nuevoPeriodo: "AM" | "PM"
  ) {
    const horaNumero = Number(nuevaHora);
    const minutoNumero = Number(nuevoMinuto);

    if (
      !/^\d{1,2}$/.test(nuevaHora) ||
      horaNumero < 1 ||
      horaNumero > 12 ||
      !/^\d{1,2}$/.test(nuevoMinuto) ||
      minutoNumero < 0 ||
      minutoNumero > 59
    ) {
      ultimoValorEmitido.current = "";
      onChange("");
      return;
    }

    const hora24 = (horaNumero % 12) + (nuevoPeriodo === "PM" ? 12 : 0);
    const horaFormateada = `${String(hora24).padStart(2, "0")}:${String(
      minutoNumero
    ).padStart(2, "0")}`;
    ultimoValorEmitido.current = horaFormateada;
    onChange(horaFormateada);
  }

  function cambiarHora(nuevaHora: string) {
    const valor = nuevaHora.replace(/\D/g, "").slice(0, 2);
    setHora(valor);
    emitirHora(valor, minuto, periodo);
  }

  function cambiarMinuto(nuevoMinuto: string) {
    const valor = nuevoMinuto.replace(/\D/g, "").slice(0, 2);
    setMinuto(valor);
    emitirHora(hora, valor, periodo);
  }

  function cambiarPeriodo(nuevoPeriodo: "AM" | "PM") {
    setPeriodo(nuevoPeriodo);
    emitirHora(hora, minuto, nuevoPeriodo);
  }

  const horaInvalida =
    Boolean(hora) && (Number(hora) < 1 || Number(hora) > 12);
  const minutoInvalido =
    Boolean(minuto) && (Number(minuto) < 0 || Number(minuto) > 59);

  return (
    <div
      role="group"
      aria-label={label}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-1 rounded-xl border border-[#D8D0C5] px-2 py-2 outline-none focus-within:border-[#C56835] ${disabled ? "bg-[#F7F1E9]" : "bg-white"} ${className}`}
    >
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={2}
        placeholder="hh"
        aria-label={`${label}, hora de 1 a 12`}
        aria-invalid={horaInvalida}
        value={hora}
        onChange={(event) => cambiarHora(event.target.value)}
        disabled={disabled}
        className="w-full min-w-0 rounded-md bg-transparent px-1 py-2 text-center text-sm text-[#3F4635] outline-none placeholder:text-[#999] disabled:text-[#999]"
      />
      <span aria-hidden="true" className="text-sm text-[#707469]">
        :
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={2}
        placeholder="mm"
        aria-label={`${label}, minutos`}
        aria-invalid={minutoInvalido}
        value={minuto}
        onChange={(event) => cambiarMinuto(event.target.value)}
        disabled={disabled}
        className="w-full min-w-0 rounded-md bg-transparent px-1 py-2 text-center text-sm text-[#3F4635] outline-none placeholder:text-[#999] disabled:text-[#999]"
      />
      <select
        aria-label={`${label}, AM o PM`}
        value={periodo}
        onChange={(event) =>
          cambiarPeriodo(event.target.value as "AM" | "PM")
        }
        disabled={disabled}
        className="w-full min-w-0 rounded-md bg-transparent px-1 py-2 text-center text-sm text-[#3F4635] outline-none disabled:text-[#999]"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
