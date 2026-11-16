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
  for (const segmento of prepararSerie(muestras.map(m => ({ segundo: m.segundo, valor: m.velMs, estable: m.flujoEstable })))) {
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

// Los cortes corresponden a ausencias, pausas o cambios de etapa; no se interpolan.
export function prepararSerie(datos = []) {
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
  return segmentos;
}

export function prepararGrafica(series) {
  const datasets = series.flatMap(s => prepararSerie(s.datos).map(segmento => ({
    label: s.nombre, borderColor: s.color, pointRadius: segmento.length === 1 ? 3 : 0,
    data: segmento.map(p => ({ x: p.segundo, y: p.valor })),
  })));
  return {
    datasets,
    resumenes: series.map(s => resumirValores(s.datos.filter(p => esNumero(p.segundo)).map(p => p.valor))),
    consultas: datasets.flatMap((d, datasetIndex) => d.data.map((p, index) => ({ ...p, datasetIndex, index }))).sort((a, b) => a.x - b.x),
  };
}
