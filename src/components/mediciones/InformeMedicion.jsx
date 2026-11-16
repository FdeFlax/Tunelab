import { useEffect, useMemo, useRef, useState } from "react";
import {
  analizarEtapas,
  crearTrazas,
  numeroInforme,
  tramosEstables,
  cambiosConsigna,
  prepararGrafica,
} from "../../servicios/mediciones/analisisMedicion.js";

import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, annotationPlugin);
const VACIO = [];

const estados = {
  pendiente: "No ejecutada",
  estabilizando: "Estabilizando",
  registrando: "En registro",
  completada: "Completada",
  parcial: "Parcial"
};
function AnalisisEtapas({
  medicion,
  etapas,
}) {
  if (!etapas.length) {
    const antiguo = medicion.eventos?.some(e => /Etapa \d+\//.test(e.mensaje));
    return antiguo ? <p className="analisis-nota">Desglose por etapas no disponible en esta medición.</p> : null;
  }
  return <section className="analisis-seccion" aria-label="Resultados por etapa">
    <div className="analisis-cabecera">
      <h4>{medicion.programa?.version === 2 ? "Tramos estables por etapa" : "Resultados por etapa"}</h4>
    </div>
    <div className="analisis-tabla" tabIndex={0} role="region" aria-label="Estadísticas por etapa"><table>
      <thead><tr><th>Etapa</th><th>Consigna</th><th>Estado</th><th>{medicion.programa?.version === 2 ? "Tiempo estable / previsto" : "Registro / previsto"}</th><th>Muestras</th><th>Media (m/s)</th><th>Mín. (m/s)</th><th>Máx. (m/s)</th><th title="Desviación muestral; requiere al menos dos valores válidos">Desv. (m/s)</th></tr></thead>
      <tbody>{etapas.map(e => <tr key={e.indice}>
        <th scope="row">{e.indice + 1}</th><td>{e.consigna}%</td><td>{estados[e.estado] || "Sin documentar"}</td>
        <td>{numeroInforme(e.registroSeg, 1)} / {e.duracion_segundos} s</td><td>{e.muestrasEstables.length}</td>
        <td>{numeroInforme(e.velocidad.media)}</td><td>{numeroInforme(e.velocidad.minima)}</td>
        <td>{numeroInforme(e.velocidad.maxima)}</td><td>{numeroInforme(e.velocidad.desviacion)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

const magnitudes = {
  velocidad: { titulo: "Velocidad del aire", unidad: "m/s" },
  caudal: { titulo: "Caudal", unidad: "m³/s" },
  potencia: { titulo: "Consigna variador", unidad: "%" },
  presion: { titulo: "Presión dinámica", unidad: "Pa" },
  temperatura: { titulo: "Temperatura", unidad: "°C" },
};

export function GraficaMedicion({ titulo, color, unidad = "", datos = VACIO, series,
  descripcionAria = "durante la medición", yDesdeCero = false, tramos = VACIO, marcas = VACIO, mostrarResumen = true, estado, alto = 220, interactiva = false }) {
  const lienzo = useRef(null);
  const instancia = useRef(null);
  const consulta = useRef(-1);
  const [lectura, setLectura] = useState(null);
  const grafica = useMemo(() => prepararGrafica(series || [{ nombre: titulo, color, datos }]), [series, titulo, color, datos]);
  const resumen = grafica.resumenes[0];
  const total = grafica.resumenes.reduce((n, r) => n + r.n, 0);

  useEffect(() => {
    const estilos = getComputedStyle(lienzo.current);
    const resolverColor = valor => valor?.startsWith('var(')
      ? estilos.getPropertyValue(valor.slice(4, -1)).trim() : valor || '#1e506d';
    const chart = new Chart(lienzo.current, {
      type: 'line',
      data: { datasets: grafica.datasets.map(d => ({ ...d, borderColor: resolverColor(d.borderColor), backgroundColor: resolverColor(d.borderColor) })) },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
        color: estilos.color, font: { family: estilos.fontFamily, size: 13 },
        elements: { line: { borderWidth: 2, tension: 0 }, point: { radius: 0, hoverRadius: 4 } },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        events: interactiva ? ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'] : [],
        scales: {
          x: { type: 'linear', min: 0, grid: { display: false }, ticks: { maxTicksLimit: 6, callback: v => `${numeroInforme(v)} s` } },
          y: { beginAtZero: yDesdeCero, grid: { display: false }, ticks: { maxTicksLimit: 5, callback: v => numeroInforme(v) } },
        },
        plugins: {
          tooltip: { enabled: interactiva, callbacks: {
            title: items => `${numeroInforme(items[0].parsed.x, 2)} s`,
            label: item => `${item.dataset.label}: ${numeroInforme(item.parsed.y)} ${unidad.trim()}`,
          } },
          annotation: { annotations: [
            ...tramos.map(t => ({ type: 'box', xMin: t.inicio, xMax: t.fin, backgroundColor: '#e4f1e8', borderWidth: 0, drawTime: 'beforeDatasetsDraw', adjustScaleRange: false })),
            ...marcas.map((m, i) => ({ type: 'line', xMin: m.segundo, xMax: m.segundo, borderColor: '#8799aa', borderWidth: 1, borderDash: [4, 4], adjustScaleRange: false,
              label: { content: m.texto, position: 'end', color: '#53677a', backgroundColor: 'transparent', font: { size: 12 },
                display: ({ chart }) => i === 0 || chart.scales.x.getPixelForValue(m.segundo) - chart.scales.x.getPixelForValue(marcas[i - 1].segundo) >= 65 } })),
          ] },
        },
      },
    });
    instancia.current = chart;
    consulta.current = -1;
    return () => { chart.destroy(); instancia.current = null; };
  }, [grafica, yDesdeCero, tramos, marcas, interactiva, unidad]);

  function consultarConTeclado(evento) {
    const chart = instancia.current;
    const puntos = grafica.consultas;
    if (!chart || !puntos.length) return;
    const actual = Math.max(0, consulta.current);
    const teclas = { ArrowLeft: Math.max(0, actual - 1), ArrowRight: Math.min(puntos.length - 1, actual + 1), Home: 0, End: puntos.length - 1, Escape: -1 };
    if (!(evento.key in teclas)) return;
    evento.preventDefault();
    consulta.current = teclas[evento.key];
    const punto = puntos[consulta.current];
    const seleccion = punto ? [{ datasetIndex: punto.datasetIndex, index: punto.index }] : [];
    chart.setActiveElements(seleccion);
    chart.tooltip.setActiveElements(seleccion, punto ? { x: chart.scales.x.getPixelForValue(punto.x), y: chart.scales.y.getPixelForValue(punto.y) } : { x: 0, y: 0 });
    chart.update('none');
    setLectura({ grafica, texto: punto ? `${numeroInforme(punto.x, 2)} s: ${numeroInforme(punto.y)} ${unidad.trim()}` : '' });
  }

  return <article className="analisis-grafica">
    <header className="analisis-grafica-cabecera">
      <h4>{titulo}</h4>
      <span className="analisis-grafica-unidad">{estado && `${estado} · `}{unidad.trim()}{series && ' · tiempo desde el inicio (s)'}</span>
    </header>
    {(tramos.length > 0 || marcas.length > 0) && <div className="analisis-leyenda-flujo">
      {tramos.length > 0 && <span className="analisis-leyenda-estable">Flujo estable</span>}
      {marcas.length > 0 && <span className="analisis-leyenda-consigna">Consigna</span>}
    </div>}
    <div className="analisis-grafica-lienzo" style={{ height: series ? 260 : alto }}>
      <canvas ref={lienzo} role="img" tabIndex={interactiva ? 0 : undefined}
        aria-label={`${titulo} ${descripcionAria}. ${total} valores válidos. Los huecos no se interpolan. ${interactiva ? "Flechas, Inicio y Fin para consultar muestras." : ""}`}
        onKeyDown={interactiva ? consultarConTeclado : undefined} />
    </div>
    <span className="solo-lector" aria-live="polite">{lectura?.grafica === grafica ? lectura.texto : ""}</span>
    {!series && mostrarResumen && <footer className="analisis-grafica-pie">
      <table aria-label={`Estadísticas de ${titulo.toLowerCase()}`}>
        <thead><tr><th scope="col">Media</th><th scope="col">Mínimo</th><th scope="col">Máximo</th></tr></thead>
        <tbody><tr><td>{numeroInforme(resumen?.media)}{unidad}</td><td>{numeroInforme(resumen?.minima)}{unidad}</td><td>{numeroInforme(resumen?.maxima)}{unidad}</td></tr></tbody>
      </table>
      {total < datos.length && <span className="analisis-nota">{datos.length - total} sin dato</span>}
    </footer>}
  </article>;
}

function TablaMuestrasComun({ muestras }) {
  const [pagina, setPagina] = useState(0);
  const paginas = Math.max(1, Math.ceil(muestras.length / 100));
  const actual = Math.min(pagina, paginas - 1);
  return (<>
    <div className="analisis-tabla analisis-muestras" tabIndex={0} role="region" aria-label="Tabla de muestras">
      <table aria-label="Muestras de la medición">
        <thead>
          <tr>
            <th>T (s)</th>
            <th>Velocidad (m/s)</th>
            <th>Caudal (m³/s)</th>
            <th>Consigna (%)</th>
            <th>Objetivo (%)</th>
            <th>Flujo</th>
            <th>Presión dinámica (Pa)</th>
            <th>Hz</th>
            <th>A</th>
            <th>RPM</th>
          </tr>
        </thead>
        <tbody>
          {muestras.slice(actual * 100, (actual + 1) * 100).map((muestra, indice) => (
            <tr key={muestra.id || indice}>
              <td>{numeroInforme(muestra.segundo)}</td>
              <td>{numeroInforme(muestra.velMs)}</td>
              <td>{numeroInforme(muestra.caudalM3s)}</td>
              <td>{numeroInforme(muestra.potPct)}</td>
              <td>{numeroInforme(muestra.consignaObjetivoPct)}</td>
              <td>{muestra.flujoEstable === true ? "Estable" : muestra.flujoEstable === false ? "Transición" : "—"}</td>
              <td>{numeroInforme(muestra.presionPa)}</td>
              <td>{numeroInforme(muestra.frecHz)}</td>
              <td>{numeroInforme(muestra.corrA)}</td>
              <td>{numeroInforme(muestra.rpm)}</td>
            </tr>
          ))}
          {!muestras.length && <tr><td colSpan={10} className="analisis-vacio">No hay muestras en esta selección.</td></tr>}
        </tbody>
      </table>
    </div>
    {paginas > 1 && <div className="analisis-paginacion">
      <button type="button" className="reg2boton reg2botonsecundario" disabled={!actual} onClick={() => setPagina(actual - 1)}>Anterior</button>
      <span>Página {actual + 1} de {paginas}</span>
      <button type="button" className="reg2boton reg2botonsecundario" disabled={actual === paginas - 1} onClick={() => setPagina(actual + 1)}>Siguiente</button>
    </div>}
  </>);
}

function ContenidoInforme({
  medicion,
  titulo = "Informe de medición",
  onDescargar,
  onComparar,
  puedeComparar = true,
  textoComparar = "Añadir al comparador",
  onBorrar,
  onCerrar,
  nombreEnsayo = "",
}) {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState("");
  const [vista, setVista] = useState("grafica");
  const [magnitud, setMagnitud] = useState("velocidad");
  const variable = magnitudes[magnitud];
  const etapas = useMemo(() => analizarEtapas(medicion), [medicion]);
  const etapa = etapaSeleccionada === "" ? null : etapas[Number(etapaSeleccionada)];
  const muestras = useMemo(() => etapa ? etapa.muestras : medicion.muestras || [], [etapa, medicion]);
  const trazas = useMemo(() => crearTrazas(muestras, medicion.programa?.etapas), [muestras, medicion.programa]);
  const tramos = useMemo(() => tramosEstables(muestras), [muestras]);
  const marcas = useMemo(() => cambiosConsigna(muestras), [muestras]);

  return (
    <section className="analisis-ui analisis-informe">
      <header className="analisis-cabecera">
        <div className="analisis-titulo">
          <h3>{titulo}</h3>
        </div>
        <div className="analisis-acciones">
          {onComparar && <button type="button" className="reg2boton reg2botonsecundario" onClick={onComparar} disabled={!puedeComparar}>{textoComparar}</button>}
          {onDescargar ? (
            <button type="button" className="reg2boton reg2botonsecundario" onClick={onDescargar}>Descargar medición</button>
          ) : null}
          {onBorrar ? (
            <button type="button" className="reg2boton reg2botonsecundario" onClick={onBorrar}>Borrar medición</button>
          ) : null}
          {onCerrar ? (
            <button type="button" className="reg2boton reg2botonsecundario" onClick={onCerrar}>
              Ocultar
            </button>
          ) : null}
        </div>
      </header>

      <div className="analisis-resumen" tabIndex={0} role="region" aria-label="Resumen de la medición">
        <table>
          <thead><tr><th scope="col">Ensayo asociado</th><th scope="col">Nombre de la medición</th><th scope="col">Número de etapas</th><th scope="col">Duración</th><th scope="col">Muestras</th></tr></thead>
          <tbody><tr>
            <td>{nombreEnsayo || "—"}</td>
            <td>{medicion.nombre || "—"}</td>
            <td>{etapas.length}</td>
            <td>{medicion.duracion || medicion.duracionTexto || (medicion.durSeg !== undefined ? numeroInforme(medicion.durSeg, 1) + " s" : "—")}</td>
            <td>{medicion.muestras?.length || 0}</td>
          </tr></tbody>
        </table>
      </div>
      <div className="analisis-vistas" role="group" aria-label="Contenido del informe">
        <button type="button" aria-pressed={vista === "grafica"} onClick={() => setVista("grafica")}>Gráfica</button>
        {etapas.length > 0 && <button type="button" aria-pressed={vista === "etapas"} onClick={() => setVista("etapas")}>Etapas</button>}
        <button type="button" aria-pressed={vista === "muestras"} onClick={() => setVista("muestras")}>Muestras</button>
      </div>
      {vista !== "etapas" && <div className="analisis-filtros">
        {vista === "grafica" && <label className="analisis-selector">Magnitud
          <select value={magnitud} onChange={e => setMagnitud(e.target.value)}>
            {Object.entries(magnitudes).map(([clave, v]) => <option key={clave} value={clave}>{v.titulo} ({v.unidad})</option>)}
          </select>
        </label>}
        {etapas.length > 1 && <label className="analisis-selector">Intervalo
          <select value={etapaSeleccionada} onChange={e => setEtapaSeleccionada(e.target.value)}>
            <option value="">Medición completa</option>
            {etapas.map(e => <option key={e.indice} value={e.indice}>Etapa {e.indice + 1} · {numeroInforme(e.consigna, 1)}%</option>)}
          </select>
        </label>}
      </div>}
      {vista === "grafica" && <section className="analisis-seccion" aria-label="Evolución de la medición">
        <GraficaMedicion key={`${magnitud}-${etapaSeleccionada}`} titulo={variable.titulo} color="var(--primary)" unidad={` ${variable.unidad}`}
          datos={trazas[magnitud] || []} tramos={tramos} marcas={marcas} alto={280} yDesdeCero={magnitud !== "temperatura"} interactiva />
      </section>}
      {vista === "etapas" && <AnalisisEtapas medicion={medicion} etapas={etapas} />}
      {vista === "muestras" && <TablaMuestrasComun key={etapaSeleccionada} muestras={muestras} />}

    </section>
  );
}

export function InformeMedicionComun({ medicion, cargando = false, textoCargando = "Cargando datos de la medición…",
  textoVacio = "Selecciona una medición para ver el informe.", ...props }) {
  if (cargando || !medicion) return <section className="analisis-ui analisis-informe"><p className="analisis-vacio">{cargando ? textoCargando : textoVacio}</p></section>;
  return <ContenidoInforme key={medicion.id} medicion={medicion} {...props} />;
}
