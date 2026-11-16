import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITES_GLB, geometriaAjustada, maximoTamano, evaluarObjeto } from '../servicios/modelos3d.js';
import { ORIENTACIONES, cortarCampo, limitesPlano } from './campo.js';
import { pintarPlano } from './mapas.js';
import { useFlujo } from './flujo.js';
import VistaObjeto from './vistaObjeto.jsx';
import './estilo.css';

const numero = n => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(n);
const cm = n => `${n > 0 ? '+' : ''}${numero(n)} cm`;
const etiquetas = { vertical: 'Posición en el ancho (cm)', horizontal: 'Altura (cm)', transversal: 'Posición a lo largo (cm)' };

function Plano({ campo, orientacion }) {
  const lienzo = useRef(null);
  const [posicion, setPosicion] = useState(0);
  const limites = limitesPlano(campo, orientacion);
  const posicionAcotada = Math.max(limites.min, Math.min(limites.max, posicion));
  const celda = Math.round((posicionAcotada - limites.min) / limites.step);
  const actual = Number((limites.min + celda * limites.step).toFixed(8));
  useEffect(() => {
    const frame = requestAnimationFrame(() => pintarPlano(lienzo.current, cortarCampo(campo, orientacion, actual)));
    return () => cancelAnimationFrame(frame);
  }, [campo, orientacion, actual]);
  const direccion = orientacion === 'transversal' ? 'Viento hacia el fondo del plano' : 'Viento de izquierda a derecha';
  return <section className="plano-flujo" aria-labelledby={`titulo-${orientacion}`}>
    <h3 id={`titulo-${orientacion}`}>{ORIENTACIONES[orientacion].nombre}<span className="direccion-viento" role="img" aria-label={direccion} title={direccion}>{orientacion === 'transversal' ? '⊗' : '→'}</span></h3>
    <figure className="mapa"><div className="superficie-mapa"><canvas ref={lienzo} id={`mapa-${orientacion}`} role="img" aria-label={`Mapa de rapidez relativa: plano ${orientacion}, ${cm(actual)}`} /></div></figure>
    <div className="control">
      <label htmlFor={`posicion-${orientacion}`}>{etiquetas[orientacion]}</label>
      <div className="rango-con-valor">
        <input id={`posicion-${orientacion}`} type="range" {...limites} value={actual} aria-valuetext={cm(actual)} onChange={e => setPosicion(Number(e.target.value))} />
        <output htmlFor={`posicion-${orientacion}`}>{cm(actual)}</output>
      </div>
    </div>
  </section>;
}

export default function Laboratorio() {
  const archivo = useRef(null);
  const importacion = useRef({ version: 0 });
  const [cargando, setCargando] = useState(false);
  const [avisoCarga, setAvisoCarga] = useState('');
  const [modelo, setModelo] = useState(null);
  const [parametros, setParametros] = useState(null);
  const objeto = useMemo(() => {
    if (!modelo) return null;
    let tamano = 20;
    let ajuste = geometriaAjustada(modelo.positions, tamano, [0, 0, 0]);
    const maximo = parametros ? maximoTamano(ajuste.dimensions, tamano, parametros) : null;
    if (maximo !== null && tamano > maximo) {
      tamano = maximo;
      ajuste.geometry.dispose();
      ajuste = geometriaAjustada(modelo.positions, tamano, [0, 0, 0]);
    }
    return { geometria: ajuste.geometry, posiciones: ajuste.geometry.attributes.position.array, medidas: ajuste.dimensions,
      cerrado: modelo.basicClosed, nombre: modelo.nombre, tamano,
      revision: Object.fromEntries(['open', 'nonManifold', 'inconsistent', 'degenerate', 'duplicate'].map(k => [k, modelo[k]])) };
  }, [modelo, parametros]);
  useEffect(() => () => objeto?.geometria.dispose(), [objeto]);
  const flujo = useFlujo(cargando ? null : objeto);
  useEffect(() => { if (flujo.capacidad.data) setParametros(flujo.capacidad.data.parametros); }, [flujo.capacidad.data]);
  const revision = evaluarObjeto(objeto, parametros);
  const aire = parametros?.aire;

  function detenerImportacion() {
    importacion.current.worker?.terminate();
    clearTimeout(importacion.current.temporizador);
  }
  useEffect(() => () => { importacion.current.version++; detenerImportacion(); }, []);

  async function cargarArchivo(file) {
    detenerImportacion();
    const version = ++importacion.current.version;
    setCargando(true); setAvisoCarga('Leyendo y revisando el objeto…');
    const terminar = (mensaje = '') => {
      if (version !== importacion.current.version) return;
      detenerImportacion(); setCargando(false); setAvisoCarga(mensaje);
    };
    try {
      if (!/\.glb$/i.test(file.name)) throw new Error('Selecciona un archivo con extensión .glb.');
      if (!file.size || file.size > LIMITES_GLB.bytesEntrada) throw new Error(`El archivo debe ocupar entre 1 byte y ${LIMITES_GLB.bytesEntrada / 1048576} MB.`);
      const buffer = await file.arrayBuffer();
      if (version !== importacion.current.version) return;
      const worker = new Worker(new URL('./importar.worker.js', import.meta.url), { type: 'module' });
      importacion.current.worker = worker;
      worker.onerror = () => terminar('No se pudo abrir el lector del modelo. Recarga la página e inténtalo otra vez.');
      worker.onmessage = ({ data }) => {
        if (version !== importacion.current.version) return;
        if (data.error) return terminar(data.error);
        setModelo({ ...data, nombre: file.name });
        terminar(data.animationsIgnored ? 'Posición estática; animaciones omitidas.' : '');
      };
      importacion.current.temporizador = setTimeout(() => terminar('La revisión ha superado 30 segundos. Exporta una malla más sencilla.'), 30000);
      worker.postMessage(buffer, [buffer]);
    } catch (error) { terminar(error.message); }
  }
  const capacidad = flujo.capacidad;
  const aviso = flujo.aviso || (capacidad.isLoading ? 'Conectando…' : capacidad.isError ? 'No se puede conectar con el servidor.' : !capacidad.data?.configurado ? 'El motor de cálculo no está configurado.' : '');
  return <div className="laboratorio">
    <section className="configuracion" aria-label="Configuración del cálculo">
      <input ref={archivo} type="file" accept=".glb,model/gltf-binary" hidden onChange={e => { if (e.target.files[0]) cargarArchivo(e.target.files[0]); e.target.value = ''; }} />
      <div className="acciones-laboratorio" role="group" aria-label="Acciones de aerodinámica">
        <button type="button" disabled={cargando} title={`Archivo GLB, máximo ${LIMITES_GLB.bytesEntrada / 1048576} MB`} onClick={() => archivo.current.click()}>Importar GLB</button>
        <div className="acciones-calculo">
          <button className="primario" type="button" aria-describedby="detalle-bloqueo-flujo estado-flujo" aria-busy={flujo.activo} disabled={!capacidad.data?.configurado || cargando || flujo.activo || Boolean(revision.motivo)} onClick={flujo.calcular}>
            {flujo.activo && <span className="indicador-calculo" aria-hidden="true" />}<span>{flujo.activo ? 'Calculando…' : 'Calcular flujo'}</span>
          </button>
          {flujo.activo && <button type="button" disabled={flujo.cancelacionPedida} onClick={flujo.cancelar}>Cancelar</button>}
          {!capacidad.data?.configurado && <button type="button" onClick={() => capacidad.refetch()}>Reintentar conexión</button>}
        </div>
      </div>
      <p className="archivo-info" aria-busy={cargando}>{modelo?.nombre || 'Ningún objeto cargado'}</p>
      {aire && <p className="archivo-info" title="Referencia GUST medida en la sección. Simulación transitoria con entrada uniforme, pendiente de validación.">Entrada: {numero(aire.velocidadMs)} m/s · {numero(aire.temperaturaC)} °C · {numero(aire.presionAbsolutaPa / 100)} hPa · {numero(aire.humedadRelativaPct)} % HR</p>}
      <p id="estado-carga" role="status" className="ayuda">{avisoCarga || (objeto?.tamano < 20 ? `Tamaño reducido a ${numero(objeto.tamano)} cm para que el objeto quepa en la sección.` : '')}</p>
      {revision.titulo && <div className="bloqueo-flujo" role="status"><strong>{revision.titulo}</strong><p id="detalle-bloqueo-flujo">{revision.motivo}</p>{revision.detalles && <p id="detalle-limites-flujo">{revision.detalles}</p>}</div>}
      <div className="estado-calculo" hidden={!aviso}><p id="estado-flujo" className="ayuda" role="status">{aviso}</p></div>
    </section>
    <section className="resultados" aria-label="Objeto y mapas de flujo">
      {flujo.campo ? <div className="planos-flujo">{Object.keys(ORIENTACIONES).map(o => <Plano key={o} campo={flujo.campo} orientacion={o} />)}</div>
        : <div className="vacio">{objeto && !cargando ? <div className="vista-objeto"><VistaObjeto geometria={objeto.geometria} /></div> : <p>{flujo.activo ? 'El mapa aparecerá aquí al terminar.' : 'Carga un objeto y calcula para ver el flujo.'}</p>}</div>}
    </section>
  </div>;
}
