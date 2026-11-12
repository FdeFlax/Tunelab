import { useState } from "react";

// Conserva las ediciones locales mientras no cambie su origen.
export default function useBorradorSincronizado(clave, valorInicial) {
  const [borrador, setBorrador] = useState(() => ({ clave, valor: valorInicial }));

  // React repite este render antes de actualizar los controles de la pantalla.
  if (!Object.is(borrador.clave, clave)) {
    setBorrador({ clave, valor: valorInicial });
  }

  function cambiarValor(valor) {
    setBorrador(actual => ({
      ...actual,
      valor: typeof valor === "function" ? valor(actual.valor) : valor,
    }));
  }

  return [borrador.valor, cambiarValor];
}
