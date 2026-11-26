import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITES_GLB, geometriaAjustada, maximoTamano, evaluarObjeto } from '../servicios/modelos3d.js';
import { ORIENTACIONES, cortarCampo, limitesPlano } from './campo.js';
import { pintarPlano, gradienteRapidez } from './mapas.js';
import { useFlujo } from './flujo.js';
import VistaObjeto from './vistaObjeto.jsx';
import './estilo.css';

const numero = n => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n);
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
  return <section className="plano-flujo" aria-labelledby={`titulo-${orientacion}`}>
    <h3 id={`titulo-${orientacion}`}>{ORIENTACIONES[orientacion].nombre}</h3>
    <figure className="mapa"><div className="superficie-mapa"><canvas ref={lienzo} id={`mapa-${orientacion}`} role="img" aria-label={`Velocidad en m/s: plano ${orientacion}, ${cm(actual)}, escala de 0 a ${numero(campo.escalaMaxMs)} m/s`} /></div></figure>
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
  const [consigna, setConsigna] = useState(null);
  const [tamanoElegido, setTamanoElegido] = useState(null);
  const tamanoValido = tamanoElegido === null || (Number.isFinite(tamanoElegido) && tamanoElegido > 0);
  const objeto = useMemo(() => {
    if (!modelo || !tamanoValido) return null;
    let tamano = tamanoElegido ?? 20;
    let ajuste = geometriaAjustada(modelo.positions, tamano, [0, 0, 0]);
    const maximo = parametros ? maximoTamano(ajuste.dimensions, tamano, parametros) : null;
    if (tamanoElegido === null && maximo !== null && tamano > maximo) {
      tamano = maximo;
      ajuste.geometry.dispose();
      ajuste = geometriaAjustada(modelo.positions, tamano, [0, 0, 0]);
    }
    return { geometria: ajuste.geometry, posiciones: ajuste.geometry.attributes.position.array, medidas: ajuste.dimensions,
      cerrado: modelo.basicClosed, nombre: modelo.nombre, tamano,
      revision: Object.fromEntries(['open', 'nonManifold', 'inconsistent', 'degenerate', 'duplicate'].map(k => [k, modelo[k]])) };
  }, [modelo, parametros, tamanoElegido, tamanoValido]);
  useEffect(() => () => objeto?.geometria.dispose(), [objeto]);
  const flujo = useFlujo(cargando ? null : objeto, consigna);
  useEffect(() => { if (flujo.capacidad.data) setParametros(flujo.capacidad.data.parametros); }, [flujo.capacidad.data]);
  const revision = tamanoValido ? evaluarObjeto(objeto, parametros)
    : { titulo: 'Revisa el tamaño', motivo: 'Introduce un tamaño mayor que cero.' };
  const aire = flujo.capacidad.data?.parametros.aire;

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
        setTamanoElegido(null);
        terminar(data.animationsIgnored ? 'Posición estática; animaciones omitidas.' : '');
      };
      importacion.current.temporizador = setTimeout(() => terminar('La revisión ha superado 30 segundos. Exporta una malla más sencilla.'), 30000);
      worker.postMessage(buffer, [buffer]);
    } catch (error) { terminar(error.message); }
  }
  const capacidad = flujo.capacidad;
  const aviso = flujo.aviso || (!flujo.consignaValida ? 'Introduce una consigna entre 0 y 100 %.' : capacidad.isLoading ? 'Actualizando condiciones…'
    : capacidad.isError ? capacidad.error?.detalle || 'No se puede conectar con el servidor.' : !capacidad.data?.configurado ? 'El motor de cálculo no está configurado.'
      : aire?.velocidadMs === 0 ? 'Túnel en reposo. Aumenta la consigna para calcular el flujo.' : '');
  return <div className="laboratorio">
    <section className="configuracion" aria-label="Configuración del cálculo">
      <input ref={archivo} type="file" accept=".glb,model/gltf-binary" hidden onChange={e => { if (e.target.files[0]) cargarArchivo(e.target.files[0]); e.target.value = ''; }} />
      <div className="acciones-laboratorio" role="group" aria-label="Acciones de aerodinámica">
        <button type="button" disabled={cargando} title={`Archivo GLB, máximo ${LIMITES_GLB.bytesEntrada / 1048576} MB`} onClick={() => archivo.current.click()}>Importar GLB</button>
        <div className="acciones-calculo">
          <button className="primario" type="button" aria-describedby="detalle-bloqueo-flujo estado-flujo" aria-busy={flujo.activo} disabled={!capacidad.data?.configurado || capacidad.isFetching || !flujo.consignaValida || !(aire?.velocidadMs > 0) || cargando || flujo.activo || Boolean(revision.motivo)} onClick={flujo.calcular}>
            {flujo.activo && <span className="indicador-calculo" aria-hidden="true" />}<span>{flujo.activo ? 'Calculando…' : 'Calcular flujo'}</span>
          </button>
          {flujo.activo && <button type="button" disabled={flujo.cancelacionPedida} onClick={flujo.cancelar}>Cancelar</button>}
          {!capacidad.data?.configurado && <button type="button" onClick={() => capacidad.refetch()}>Reintentar conexión</button>}
        </div>
      </div>
      <p className="archivo-info" aria-busy={cargando}>{modelo?.nombre || 'Ningún objeto cargado'}</p>
      <div className="entrada-flujo">
        <label htmlFor="consigna-flujo">Consigna del variador (%)</label>
        <input id="consigna-flujo" type="number" min="0" max="100" step="any" value={consigna ?? parametros?.consignaPct ?? ''}
          disabled={flujo.activo || !parametros} aria-invalid={!flujo.consignaValida} aria-describedby="velocidad-flujo estado-flujo"
          onChange={e => setConsigna(e.target.value === '' ? '' : Number(e.target.value))} />
        <span id="velocidad-flujo" aria-live="polite">Velocidad estimada: <strong>{aire ? `${numero(aire.velocidadMs)} m/s` : '—'}</strong></span>
      </div>
      {modelo && <div className="entrada-flujo">
        <label htmlFor="tamano-objeto">Tamaño del objeto (cm)</label>
        <input id="tamano-objeto" type="number" min={parametros?.minimoObjetoCm} max={parametros ? Math.max(...parametros.maximosObjetoCm) : undefined} step="any"
          value={tamanoElegido ?? objeto?.tamano ?? 20} disabled={cargando || flujo.activo || !parametros}
          aria-invalid={!tamanoValido || revision.titulo === 'Revisa el tamaño'} aria-describedby="ayuda-tamano detalle-bloqueo-flujo detalle-limites-flujo"
          onChange={e => setTamanoElegido(e.target.value === '' ? '' : Number(e.target.value))} />
        <span id="ayuda-tamano">Longitud del lado mayor. Se mantienen las proporciones.</span>
        {objeto && <p className="medidas-objeto ayuda" aria-live="polite">Longitud: {numero(objeto.medidas[0])} cm · Altura: {numero(objeto.medidas[1])} cm · Ancho: {numero(objeto.medidas[2])} cm</p>}
      </div>}
      <p id="estado-carga" role="status" className="ayuda">{avisoCarga || (tamanoElegido === null && objeto?.tamano < 20 ? `Tamaño reducido a ${numero(objeto.tamano)} cm para que el objeto quepa en la sección.` : '')}</p>
      {revision.titulo && <div className="bloqueo-flujo" role="status"><strong>{revision.titulo}</strong><p id="detalle-bloqueo-flujo">{revision.motivo}</p>{revision.detalles && <p id="detalle-limites-flujo">{revision.detalles}</p>}</div>}
      <div className="estado-calculo" hidden={!aviso}><p id="estado-flujo" className="ayuda" role="status">{aviso}</p></div>
    </section>
    <section className="resultados" aria-label="Objeto y mapas de flujo">
      {flujo.campo && <div className="escala-flujo" aria-label={`Escala común de velocidad: de 0 a ${numero(flujo.campo.escalaMaxMs)} m/s o más`}>
        <span>Velocidad (m/s)</span><span>0</span>
        <span className="barra-escala" style={{ background: gradienteRapidez }} aria-hidden="true" />
        <span>≥ {numero(flujo.campo.escalaMaxMs)}</span>
      </div>}
      {flujo.campo ? <div className="planos-flujo">{Object.keys(ORIENTACIONES).map(o => <Plano key={o} campo={flujo.campo} orientacion={o} />)}</div>
        : <div className="vacio">{objeto && !cargando ? <div className="vista-objeto"><VistaObjeto geometria={objeto.geometria} /></div> : <p>{flujo.activo ? 'El mapa aparecerá aquí al terminar.' : 'Carga un objeto y calcula para ver el flujo.'}</p>}</div>}
    </section>
  </div>;
}
