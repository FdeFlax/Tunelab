export async function finalizarCaptura(acciones, { apagar = false } = {}) {
  const resultado = apagar ? await acciones.apagarTunel() : await acciones.detenerMedicion();
  const captura = resultado?.captura;
  const guardada = captura?.estado === "finalizada";
  if (guardada) window.dispatchEvent(new CustomEvent("tunelab:registro-actualizado"));
  return {
    resultado,
    guardada,
    errorGuardado: captura && !guardada
      ? new Error("Captura interrumpida; consulta las muestras confirmadas en Registro")
      : null,
  };
}
