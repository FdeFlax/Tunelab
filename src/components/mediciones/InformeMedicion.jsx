import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  analizarEtapas,
  crearTrazas,
  numeroInforme,
  tramosEstables,
  cambiosConsigna,
  esNumero,
  construirGrafica,
  indiceMuestraCercana,
} from "../../servicios/mediciones/analisisMedicion.js";

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

export function GraficaMedicion({ titulo, color, unidad = "", datos = [], series,
  descripcionAria = "durante la medición", yDesdeCero = false, tramos = [], marcas = [], mostrarResumen = true, estado, alto = 220, interactiva = false }) {
  const id = useId();
  const contenedor = useRef(null);
  const [ancho, setAncho] = useState(400);
  const [indiceConsulta, setIndiceConsulta] = useState(null);
  const puntosConsulta = useMemo(() => interactiva
    ? datos.filter(p => esNumero(p.segundo) && esNumero(p.valor)).sort((a, b) => a.segundo - b.segundo) : [], [datos, interactiva]);
  const puntoConsulta = puntosConsulta[indiceConsulta];

  // Reorganiza el dibujo al cambiar de tamaño sin encoger los textos del eje.
  useEffect(() => {
    const observador = new ResizeObserver(([entrada]) => {
      setAncho(Math.max(180, Math.round(entrada.contentRect.width)));
    });
    observador.observe(contenedor.current);
    return () => observador.disconnect();
  }, []);

  const grafica = useMemo(() => construirGrafica(series || [{ id: "medicion", nombre: titulo, color, datos }],
    { desdeCero: yDesdeCero, ancho, alto: series ? 260 : alto }), [series, titulo, color, datos, yDesdeCero, ancho, alto]);
  const resumen = grafica.series[0]?.resumen;
  const total = grafica.series.reduce((n, serie) => n + serie.resumen.n, 0);
  const etiquetas = marcas.reduce((lista, m) => {
    const anterior = lista.at(-1);
    return !anterior || grafica.calcularX(m.segundo) - grafica.calcularX(anterior.segundo) >= 65 ? [...lista, m] : lista;
  }, []);

  function consultarPunto(evento) {
    const rect = evento.currentTarget.getBoundingClientRect();
    const x = (evento.clientX - rect.left) * grafica.ancho / rect.width;
    const y = (evento.clientY - rect.top) * grafica.alto / rect.height;
    setIndiceConsulta(x < grafica.izquierda || x > grafica.derecha || y < grafica.arriba || y > grafica.abajo
      ? null : indiceMuestraCercana(puntosConsulta, (x - grafica.izquierda) / (grafica.derecha - grafica.izquierda) * grafica.x.max));
  }

  function consultarConTeclado(evento) {
    if (!puntosConsulta.length) return;
    const ultimo = puntosConsulta.length - 1;
    const actual = indiceConsulta ?? 0;
    const teclas = { ArrowLeft: Math.max(0, actual - 1), ArrowRight: Math.min(ultimo, actual + 1), Home: 0, End: ultimo, Escape: null };
    if (evento.key in teclas) { evento.preventDefault(); setIndiceConsulta(teclas[evento.key]); }
  }
  return (
    <article className="analisis-grafica">
      <header className="analisis-grafica-cabecera">
        <h4>{titulo}</h4>
        {!series && <span className="analisis-grafica-unidad">{estado && `${estado} · `}{unidad.trim()}</span>}
        {series && <span className="analisis-nota">{unidad.trim()} · tiempo desde el inicio (s)</span>}
      </header>
      {(tramos.length > 0 || marcas.length > 0) && <div className="analisis-leyenda-flujo">
        {tramos.length > 0 && <span className="analisis-leyenda-estable">Flujo estable</span>}
        {marcas.length > 0 && <span className="analisis-leyenda-consigna">Consigna</span>}
      </div>}
      <div ref={contenedor} className="analisis-grafica-lienzo">
        <svg className="analisis-grafica-svg" viewBox={`0 0 ${grafica.ancho} ${grafica.alto}`} role="img" aria-labelledby={id}
          tabIndex={interactiva && puntosConsulta.length ? 0 : undefined} aria-describedby={puntoConsulta ? `${id}-consulta` : undefined}
          onPointerMove={interactiva ? consultarPunto : undefined} onPointerDown={interactiva ? consultarPunto : undefined}
          onPointerLeave={() => setIndiceConsulta(null)} onPointerCancel={() => setIndiceConsulta(null)}
          onFocus={() => interactiva && puntosConsulta.length && setIndiceConsulta(actual => actual ?? 0)} onBlur={() => setIndiceConsulta(null)}
          onKeyDown={interactiva ? consultarConTeclado : undefined}>
          <title id={id}>{titulo} {descripcionAria}. {total} valores válidos. Los huecos no se interpolan.</title>
          <g className="analisis-grafica-estable">
            {tramos.map((t, i) => <rect key={i} x={grafica.calcularX(t.inicio)} y={grafica.arriba}
              width={Math.max(0, grafica.calcularX(t.fin) - grafica.calcularX(t.inicio))} height={grafica.abajo - grafica.arriba}>
              <title>Tramo estable: {numeroInforme(t.inicio, 1)}–{numeroInforme(t.fin, 1)} s</title>
            </rect>)}
          </g>
          <g className="analisis-grafica-ejes">
            <line x1={grafica.izquierda} x2={grafica.izquierda} y1={grafica.arriba} y2={grafica.abajo} />
            <line x1={grafica.izquierda} x2={grafica.derecha} y1={grafica.abajo} y2={grafica.abajo} />
          </g>
          <g className="analisis-grafica-marcas">
            {grafica.y.ticks.map(v => <text key={`y${v}`} x={grafica.izquierda - 8} y={grafica.calcularY(v) + 4} textAnchor="end">{numeroInforme(v)}</text>)}
            {grafica.x.ticks.map((t, i) => <text key={`x${t}`} x={grafica.calcularX(t)} y={grafica.alto - 10}
              textAnchor={i === 0 ? "start" : i === grafica.x.ticks.length - 1 ? "end" : "middle"}>{numeroInforme(t)} s</text>)}
          </g>
          <g className="analisis-grafica-consignas">
            {marcas.map((m, i) => <line key={i} x1={grafica.calcularX(m.segundo)} x2={grafica.calcularX(m.segundo)} y1={grafica.arriba} y2={grafica.abajo}><title>Consigna {m.texto}</title></line>)}
            {etiquetas.map((m, i) => <text key={i} x={Math.min(grafica.calcularX(m.segundo) + 5, grafica.derecha - 40)} y={grafica.arriba + 12}>{m.texto}</text>)}
          </g>
          {grafica.series.map(serie => <g key={serie.id}>
            {serie.segmentos.map((segmento, i) => segmento.puntos.length === 1
              ? <circle key={i} cx={segmento.puntos[0].x} cy={segmento.puntos[0].y} r="3" fill={serie.color}><title>{serie.nombre}: {numeroInforme(segmento.puntos[0].valor)}{unidad}</title></circle>
              : <path key={i} className="analisis-grafica-linea" d={segmento.linea} stroke={serie.color} fill="none"><title>{serie.nombre}</title></path>)}
          </g>)}
          {puntoConsulta && <g className="analisis-grafica-cursor" aria-hidden="true">
            <line x1={grafica.calcularX(puntoConsulta.segundo)} x2={grafica.calcularX(puntoConsulta.segundo)} y1={grafica.arriba} y2={grafica.abajo} />
            <circle cx={grafica.calcularX(puntoConsulta.segundo)} cy={grafica.calcularY(puntoConsulta.valor)} r="4" fill={color} />
          </g>}
        </svg>
        {puntoConsulta && <div id={`${id}-consulta`} role="tooltip" className="analisis-grafica-tooltip"
          style={{ "--consulta-x": `${grafica.calcularX(puntoConsulta.segundo) / grafica.ancho * 100}%` }}>
          <span>{numeroInforme(puntoConsulta.segundo, 2)} s</span>
          <strong>{titulo}: {numeroInforme(puntoConsulta.valor)}{unidad}</strong>
        </div>}
      </div>
      {!series && mostrarResumen && <footer className="analisis-grafica-pie">
        <table aria-label={`Estadísticas de ${titulo.toLowerCase()}`}>
          <thead><tr><th scope="col">Media</th><th scope="col">Mínimo</th><th scope="col">Máximo</th></tr></thead>
          <tbody><tr>
            <td>{numeroInforme(resumen?.media)}{unidad}</td>
            <td>{numeroInforme(resumen?.minima)}{unidad}</td>
            <td>{numeroInforme(resumen?.maxima)}{unidad}</td>
          </tr></tbody>
        </table>
        {total < datos.length && <span className="analisis-nota">{datos.length - total} sin dato</span>}
      </footer>}
    </article>
  );
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
