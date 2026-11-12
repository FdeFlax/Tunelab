// Los cálculos usan las muestras originales; los huecos y valores ausentes no son ceros.
export const esNumero = valor => typeof valor === "number" && Number.isFinite(valor);
export const numeroInforme = (valor, decimales = 3) => esNumero(valor)
  ? valor.toLocaleString("es-ES", { maximumFractionDigits: decimales }) : "—";

export function resumirValores(valores = []) {
  let n = 0, media = 0, m2 = 0, minima = Infinity, maxima = -Infinity;
  for (const valor of valores) {
    if (!esNumero(valor)) continue;
    n++;
    const delta = valor - media;
    media += delta / n;
    m2 += delta * (valor - media);
    minima = Math.min(minima, valor);
    maxima = Math.max(maxima, valor);
  }
  return { n, media: n ? media : null, minima: n ? minima : null, maxima: n ? maxima : null,
    desviacion: n > 1 ? Math.sqrt(m2 / (n - 1)) : null };
}

export function analizarEtapas(medicion) {
  const continua = medicion.programa?.version === 2;
  return (medicion.programa?.etapas || []).map((etapa, indice) => {
    const inicio = continua ? etapa.cambio_segundo : etapa.inicio_segundo;
    const fin = etapa.fin_segundo;
    const muestras = esNumero(inicio) ? (medicion.muestras || []).filter(m =>
      (continua && indice > 0 ? m.segundo > inicio : m.segundo >= inicio) && (!esNumero(fin) || m.segundo <= fin)) : [];
    const muestrasEstables = continua ? muestras.filter(m => m.flujoEstable === true) : muestras;
    return { ...etapa, indice, muestras, muestrasEstables,
      registroSeg: continua ? (etapa.tramos_estables || []).reduce((s, t) => s + (esNumero(t.fin) ? t.fin - t.inicio : 0), 0)
        : esNumero(inicio) && esNumero(fin) ? Math.max(0, fin - inicio) : null,
      velocidad: resumirValores(muestrasEstables.map(m => m.velMs)),
      caudal: resumirValores(muestrasEstables.map(m => m.caudalM3s)),
    };
  });
}

export function crearTrazas(muestras = [], etapas = []) {
  return Object.fromEntries([
    ["velocidad", "velMs"], ["caudal", "caudalM3s"], ["temperatura", "tempC"],
    ["potencia", "potPct"], ["presion", "presionPa"],
  ].map(([nombre, campo]) => [nombre, muestras.map(m => ({
    segundo: m.segundo, valor: m[campo] ?? null,
    ...(etapas.length && !("cambio_segundo" in etapas[0]) ? { segmento: etapas.findIndex(e => esNumero(e.inicio_segundo) && m.segundo >= e.inicio_segundo &&
      (!esNumero(e.fin_segundo) || m.segundo <= e.fin_segundo)) } : {}),
  }))]));
}

export function tramosEstables(muestras = []) {
  const tramos = [];
  // No colorear huecos de comunicación como si fueran lecturas estables.
  for (const segmento of prepararSerie(muestras.map(m => ({ segundo: m.segundo, valor: m.velMs, estable: m.flujoEstable })), Infinity)) {
    let tramo = null;
    for (const m of segmento) {
      if (m.estable === true) {
        if (!tramo) { tramo = { inicio: m.segundo, fin: m.segundo }; tramos.push(tramo); }
        tramo.fin = m.segundo;
      } else tramo = null;
    }
  }
  return tramos;
}

export function cambiosConsigna(muestras = []) {
  return muestras.filter((m, i) => esNumero(m.consignaObjetivoPct) &&
    (!i || m.consignaObjetivoPct !== muestras[i - 1].consignaObjetivoPct))
    .map(m => ({ segundo: m.segundo, texto: `${numeroInforme(m.consignaObjetivoPct, 1)} %` }));
}

// Conserva extremos por grupo al aligerar curvas largas. Nunca enlaza segmentos separados.
export function prepararSerie(datos = [], maxPuntos = 800) {
  const intervalos = datos.slice(1).map((p, i) => p.segundo - datos[i].segundo)
    .filter(d => esNumero(d) && d > 0).sort((a, b) => a - b);
  const intervalo = intervalos[Math.floor((intervalos.length - 1) / 2)] ?? 1;
  const segmentos = [];
  let actual = [], anterior = null;
  for (const punto of datos) {
    if (!esNumero(punto.segundo) || !esNumero(punto.valor)) {
      if (actual.length) segmentos.push(actual);
      actual = []; anterior = null; continue;
    }
    if (anterior && (punto.segmento !== anterior.segmento || punto.segundo < anterior.segundo ||
        punto.segundo - anterior.segundo > Math.max(intervalo * 3, 3))) {
      segmentos.push(actual); actual = [];
    }
    actual.push(punto); anterior = punto;
  }
  if (actual.length) segmentos.push(actual);
  const paso = Math.max(1, Math.ceil(datos.length / (maxPuntos / 4)));
  return segmentos.map(segmento => {
    if (paso === 1) return segmento;
    const salida = [];
    for (let i = 0; i < segmento.length; i += paso) {
      const bloque = segmento.slice(i, i + paso);
      let min = 0, max = 0;
      bloque.forEach((p, j) => { if (p.valor < bloque[min].valor) min = j; if (p.valor > bloque[max].valor) max = j; });
      for (const j of [...new Set([0, min, max, bloque.length - 1])].sort((a, b) => a - b)) salida.push(bloque[j]);
    }
    return salida;
  });
}

// Consulta la muestra original más cercana; no interpola valores entre lecturas.
export function indiceMuestraCercana(puntos, segundo) {
  if (!puntos.length || !esNumero(segundo)) return -1;
  let inicio = 0, fin = puntos.length - 1;
  while (inicio < fin) {
    const medio = Math.floor((inicio + fin) / 2);
    if (puntos[medio].segundo < segundo) inicio = medio + 1;
    else fin = medio;
  }
  return inicio > 0 && segundo - puntos[inicio - 1].segundo <= puntos[inicio].segundo - segundo
    ? inicio - 1 : inicio;
}

function escala(minimo, maximo, divisiones = 4) {
  const base = Math.max(maximo - minimo, 0.1) / divisiones;
  const unidad = 10 ** Math.floor(Math.log10(base));
  const paso = [1, 2, 5, 10].find(v => v * unidad >= base) * unidad;
  const min = Math.floor(minimo / paso) * paso;
  const max = Math.ceil((maximo === minimo ? maximo + paso : maximo) / paso) * paso;
  const ticks = [];
  for (let v = min; v <= max + paso / 2; v += paso) ticks.push(Number(v.toFixed(6)));
  return { min, max, ticks };
}

export function construirGrafica(series, { ancho = 640, alto = 240, desdeCero = true } = {}) {
  const izquierda = 58, derecha = ancho - 22, arriba = 18, abajo = alto - 36;
  const valores = resumirValores(series.flatMap(s => s.datos.map(p => p.valor)));
  let tiempoMax = 1;
  for (const serie of series) for (const p of serie.datos) if (esNumero(p.segundo)) tiempoMax = Math.max(tiempoMax, p.segundo);
  const y = escala(desdeCero ? Math.min(0, valores.minima ?? 0) : valores.minima ?? 0, valores.maxima ?? 1);
  const x = escala(0, tiempoMax, Math.max(2, Math.min(4, Math.floor((derecha - izquierda) / 90))));
  const calcularX = t => izquierda + (t / x.max) * (derecha - izquierda);
  const calcularY = v => abajo - ((v - y.min) / (y.max - y.min)) * (abajo - arriba);
  return { ancho, alto, izquierda, derecha, arriba, abajo, x, y, calcularX, calcularY,
    series: series.map(s => ({ ...s, resumen: resumirValores(s.datos.map(p => p.valor)),
      segmentos: prepararSerie(s.datos).map(segmento => ({
        puntos: segmento.map(p => ({ ...p, x: calcularX(p.segundo), y: calcularY(p.valor) })),
        linea: segmento.map((p, i) => `${i ? "L" : "M"} ${calcularX(p.segundo).toFixed(2)} ${calcularY(p.valor).toFixed(2)}`).join(" "),
      })),
    })),
  };
}
