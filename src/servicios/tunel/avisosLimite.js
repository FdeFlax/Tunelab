export function esErrorLim(error) {
  return error?.codigo === 409 && /limite/i.test(error.message || "");
}

export function avisoLimMed({ mensaje, limite }) {
  const mensajeApi = String(mensaje || "").trim();
  const limiteTexto = Number.isFinite(Number(limite)) ? `${limite}` : "el limite permitido";

  return {
    titulo: "No se puede iniciar otra medicion",
    detalle:
      mensajeApi ||
      `Este ensayo ya tiene ${limiteTexto} mediciones. Borra una medicion anterior desde Registro, crea otro ensayo o reutiliza un nombre existente si quieres sobrescribir esa medicion.`,
  };
}
