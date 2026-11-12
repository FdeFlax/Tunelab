import './estilo.css';
import { LIMITES_GLB, geometriaAjustada, maximoTamano } from '../servicios/modelos3d.js';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import VistaObjeto from './vistaObjeto.jsx';
import { conectarFlujo } from './flujo.js';
import contenido from './contenido.html?raw';

function crearVistaObjeto(contenedor) {
  const raiz = createRoot(contenedor);
  return {
    mostrar(geometria) { raiz.render(createElement(VistaObjeto, { geometria })); },
    limpiar() { raiz.render(createElement(VistaObjeto, { geometria: null })); },
    // Espera a que termine el desmontaje de la página que contiene el laboratorio.
    dispose() { queueMicrotask(() => raiz.unmount()); }
  };
}
export function montarLaboratorio(contenedor) {
  contenedor.innerHTML = contenido;
  const $ = id => contenedor.querySelector('#' + id);
  $('importar').title = `Archivo GLB, máximo ${LIMITES_GLB.bytesEntrada / (1024 * 1024)} MB`;
  const formato = new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1
  });
  let posiciones,
    worker,
    limiteImportacion,
    revisionGeometria,
    version = 0,
    tamano = 20,
    cerrado = false,
    nombreObjeto = '';
  let vistaObjeto, configuracion;
  const flujo = conectarFlujo(contenedor, parametros => {
    configuracion = parametros;
    actualizarGeometria();
  });
  function limpiarVista() {
    vistaObjeto?.limpiar();
    $('vista-objeto').hidden = true;
    $('vacio').querySelector('p').hidden = false;
  }
  function detenerImportacion() {
    worker?.terminate();
    worker = null;
    clearTimeout(limiteImportacion);
  }

  function mostrarCarga(value) {
    $('importar').disabled = value;
    $('archivo-info').setAttribute('aria-busy', String(value));
  }

  function mostrarEstado(message, kind = '') {
    $('estado-carga').textContent = message;
    $('estado-carga').className = `ayuda ${kind}`;
  }

  function actualizarGeometria() {
    if (!posiciones) return;
    let ajustada = geometriaAjustada(posiciones, tamano, [0, 0, 0]);
    const maximo = configuracion ? maximoTamano(ajustada.dimensions, tamano, configuracion) : null;
    if (maximo !== null && tamano > maximo) {
      tamano = maximo;
      ajustada.geometry.dispose();
      ajustada = geometriaAjustada(posiciones, tamano, [0, 0, 0]);
      mostrarEstado(`Tamaño reducido a ${formato.format(tamano)} cm para que el objeto quepa en la sección.`);
    } else mostrarEstado('');
    flujo.cambiar({
      posiciones: ajustada.geometry.attributes.position.array,
      medidas: ajustada.dimensions,
      cerrado,
      nombre: nombreObjeto,
      tamano,
      revision: revisionGeometria
    });
    $('vista-objeto').hidden = false;
    $('vacio').querySelector('p').hidden = true;
    vistaObjeto ??= crearVistaObjeto($('vista-objeto'));
    vistaObjeto.mostrar(ajustada.geometry);
    ajustada.geometry.dispose();
  }

  async function cargarArchivo(file) {
    flujo.cambiar(null);
    limpiarVista();
    const versionSolicitada = ++version;
    detenerImportacion();
    mostrarCarga(true);
    mostrarEstado('Leyendo y revisando el objeto…');
    function mostrarErrorImportacion(message) {
      if (versionSolicitada !== version) return;
      detenerImportacion();
      if (posiciones) actualizarGeometria();
      mostrarCarga(false);
      mostrarEstado(message, 'error');
    }
    try {
      if (!/\.glb$/i.test(file.name)) throw new Error('Selecciona un archivo con extensión .glb.');
      if (!file.size || file.size > LIMITES_GLB.bytesEntrada) throw new Error(`El archivo debe ocupar entre 1 byte y ${LIMITES_GLB.bytesEntrada / (1024 * 1024)} MB.`);
      const buffer = await file.arrayBuffer();
      if (versionSolicitada !== version) return;
      worker = new Worker(new URL('./importar.worker.js', import.meta.url), {
        type: 'module'
      });
      worker.onerror = () => mostrarErrorImportacion('No se pudo abrir el lector del modelo. Recarga la página e inténtalo otra vez.');
      worker.onmessage = ({
        data
      }) => {
        if (versionSolicitada !== version) return;
        if (data.error) {
          mostrarErrorImportacion(data.error);
          return;
        }
        detenerImportacion();
        posiciones = data.positions;
        cerrado = data.basicClosed;
        nombreObjeto = file.name;
        revisionGeometria = Object.fromEntries(['open', 'nonManifold', 'inconsistent', 'degenerate', 'duplicate'].map(key => [key, data[key]]));
        tamano = 20;
        actualizarGeometria();
        $('nombre-archivo').textContent = file.name;
        $('archivo-info').hidden = false;
        mostrarCarga(false);
        mostrarEstado(data.animationsIgnored ? 'Posición estática; animaciones omitidas.' : '', 'correcto');
      };
      limiteImportacion = setTimeout(() => mostrarErrorImportacion('La revisión ha superado 30 segundos. Exporta una malla más sencilla e inténtalo otra vez.'), 30000);
      worker.postMessage(buffer, [buffer]);
    } catch (error) {
      mostrarErrorImportacion(error.message);
    }
  }
  $('importar').addEventListener('click', () => $('archivo-glb').click());
  $('archivo-glb').addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) cargarArchivo(file);
    event.target.value = '';
  });
  return () => {
    ++version;
    detenerImportacion();
    flujo.dispose();
    vistaObjeto?.dispose();
    contenedor.replaceChildren();
  };
}
