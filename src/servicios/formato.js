export function redondear(valor, decimales = 1) {
  return Number((Number(valor) || 0).toFixed(decimales));
}

export function formatearNumero(valor, decimales = 3) {
  if (valor == null || !Number.isFinite(Number(valor))) return "—";
  return Number(valor).toLocaleString("es-ES", { maximumFractionDigits: decimales, useGrouping: false });
}

export function calcularMedia(valores = []) {
  if (!valores.length) return 0;
  return valores.reduce((acumulado, valor) => acumulado + valor, 0) / valores.length;
}

// Las fechas ISO antiguas de la API son UTC aunque no incluyan el sufijo Z.
export function fechaApi(fecha) {
  if (typeof fecha !== "string") return new Date(fecha);
  return new Date(/^\d{4}-\d{2}-\d{2}T/.test(fecha) && !/(?:Z|[+-]\d{2}:\d{2})$/.test(fecha) ? `${fecha}Z` : fecha);
}

export function formatearFecha(fecha) {
  if (!fecha) return "--";
  return fechaApi(fecha).toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function formatearHora(fecha) {
  if (!fecha) return "--";
  return fechaApi(fecha).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatearFechaHora(fecha) {
  if (!fecha) return "--";
  return fechaApi(fecha).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
