import { pedirApi } from '../servicios/api/clienteApi.js';
import { leerCampo } from './campo.js';
import { conectarPlanos } from './planos.js';
import { evaluarObjeto } from '../servicios/modelos3d.js';
export function conectarFlujo(contenedor, alRecibirConfiguracion) {
  const $ = id => contenedor.querySelector(`#${id}`);
  const numero = n => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(n);
  $('condiciones-aire').title = 'Referencia GUST medida en la sección. Simulación transitoria con entrada uniforme, pendiente de validación.';
  const cicloVida = new AbortController();
  const solicitar = (ruta, opciones = {}) => pedirApi(ruta, {
    ...opciones,
    signal: AbortSignal.any([cicloVida.signal, AbortSignal.timeout(opciones.method === 'POST' ? 25000 : 10000)])
  });
  let objeto,
    revision = 0,
    activo = false,
    id,
    temporizador,
    configurado = false,
    modelo, parametros,
    desmontado = false;
  let cancelacionEnviada = false;
  const planos = conectarPlanos(contenedor);
  function mostrarEstado(text, kind = '') {
    if (desmontado) return;
    $('estado-flujo').textContent = text;
    $('estado-flujo').className = `ayuda ${kind}`;
  }

  function motivoBloqueo() {
    const revisionObjeto = evaluarObjeto(objeto, parametros);
    return revisionObjeto.titulo ? `${revisionObjeto.titulo}. Revisa el aviso junto al botón.` : revisionObjeto.motivo;
  }

  function actualizarControles() {
    if (desmontado) return;
    const revisionObjeto = evaluarObjeto(objeto, parametros);
    $('calcular-flujo').disabled = !configurado || activo || Boolean(revisionObjeto.motivo);
    $('calcular-flujo').setAttribute('aria-busy', String(activo));
    $('indicador-calculo').hidden = !activo;
    $('texto-calcular').textContent = activo ? 'Calculando…' : 'Calcular flujo';
    $('vacio').querySelector('p').textContent = activo ? 'El mapa aparecerá aquí al terminar.' : 'Carga un objeto y calcula para ver el flujo.';
    $('bloqueo-flujo').hidden = !revisionObjeto.titulo;
    $('titulo-bloqueo-flujo').textContent = revisionObjeto.titulo || '';
    $('detalle-bloqueo-flujo').textContent = revisionObjeto.titulo ? revisionObjeto.motivo : '';
    $('detalle-limites-flujo').hidden = !revisionObjeto.detalles;
    $('detalle-limites-flujo').textContent = revisionObjeto.detalles || '';
    $('cancelar-flujo').hidden = !activo;
    $('cancelar-flujo').disabled = cancelacionEnviada;
  }

  function limpiarMapas() {
    planos.clear();
  }

  async function cancelar() {
    if (!id || cancelacionEnviada) return;
    cancelacionEnviada = true;
    actualizarControles();
    mostrarEstado('Deteniendo el cálculo anterior…');
    try {
      await solicitar(`/flujo3d/calculos/${id}`, {
        method: 'DELETE'
      });
    } catch {
      cancelacionEnviada = false;
      actualizarControles();
      mostrarEstado('No se ha podido confirmar la cancelación. El servidor tiene un límite de tiempo; puedes volver a intentarlo.', 'aviso');
    }
  }

  function invalidarResultado() {
    revision++;
    limpiarMapas();
    if (activo) {
      cancelar();
      mostrarEstado('Han cambiado las condiciones. El cálculo anterior ya no se mostrará.');
    } else if (configurado) mostrarEstado('');
    actualizarControles();
  }

  function terminar() {
    activo = false;
    id = null;
    clearTimeout(temporizador);
    cancelacionEnviada = false;
    actualizarControles();
  }

  function mostrarTrabajo(trabajo, revisionSolicitada) {
    if (desmontado) return;
    const mismaRevision = revisionSolicitada === revision;
    if (trabajo.estado === 'completado') {
      if (mismaRevision) {
        const data = trabajo.resultado;
        if (data.modelo !== modelo) throw new Error('El mapa corresponde a otra configuración.');
        planos.mostrar(leerCampo(data.volumen, parametros));
        mostrarEstado('');
      } else mostrarEstado('Las condiciones han cambiado. Puedes calcular el nuevo caso.');
      terminar();
      return;
    }
    if (['error', 'cancelado'].includes(trabajo.estado)) {
      terminar();
      mostrarEstado(mismaRevision ? trabajo.mensaje : motivoBloqueo() || 'Puedes calcular el objeto con los nuevos ajustes.', trabajo.estado === 'error' && mismaRevision ? 'error' : '');
      return;
    }
    if (!mismaRevision) cancelar();else if (!cancelacionEnviada) mostrarEstado('');
    temporizador = setTimeout(() => consultarTrabajo(revisionSolicitada), 800);
  }

  async function consultarTrabajo(revisionSolicitada) {
    if (desmontado || !id) return;
    let trabajo;
    try {
      trabajo = await solicitar(`/flujo3d/calculos/${id}`);
    } catch (error) {
      if (desmontado) return;
      if (error.respuesta?.status === 404 || error.respuesta?.status === 401) {
        terminar();
        mostrarEstado(error.detalle || 'El cálculo ya no está disponible.', 'error');
      } else {
        mostrarEstado('Se ha perdido la conexión. Intentando recuperar el estado del cálculo…', 'aviso');
        temporizador = setTimeout(() => consultarTrabajo(revisionSolicitada), 2500);
      }
      return;
    }
    try {
      mostrarTrabajo(trabajo, revisionSolicitada);
    } catch {
      terminar();
      limpiarMapas();
      mostrarEstado('No se ha podido representar el resultado recibido. Vuelve a calcular para recuperarlo.', 'error');
    }
  }
  $('calcular-flujo').addEventListener('click', async () => {
    if (activo || motivoBloqueo() || !configurado) return;
    const revisionSolicitada = revision;
    activo = true;
    id = null;
    cancelacionEnviada = false;
    limpiarMapas();
    actualizarControles();
    mostrarEstado('');
    try {
      const trabajo = await solicitar(`/flujo3d/calculos?modelo=${encodeURIComponent(modelo)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: objeto.posiciones
      });
      if (desmontado) return;
      id = trabajo.id;
      mostrarTrabajo(trabajo, revisionSolicitada);
    } catch (error) {
      terminar();
      mostrarEstado(error.detalle || 'No se pudo confirmar el inicio. Comprueba el servidor antes de volver a intentarlo.', 'error');
    }
  });
  $('cancelar-flujo').addEventListener('click', () => {
    if (id) cancelar();else {
      revision++;
      mostrarEstado('Se cancelará en cuanto el servidor confirme la recepción.');
    }
  });
  async function consultarCapacidad() {
    try {
      const info = await solicitar('/flujo3d/capacidad');
      if (desmontado) return;
      modelo = info.modelo;
      parametros = info.parametros;
      configurado = info.configurado;
      const aire = parametros.aire;
      $('condiciones-aire').textContent = `Entrada: ${numero(aire.velocidadMs)} m/s · ${numero(aire.temperaturaC)} °C · ${numero(aire.presionAbsolutaPa / 100)} hPa · ${numero(aire.humedadRelativaPct)} % HR`;
      alRecibirConfiguracion(parametros);
      mostrarEstado(!configurado ? 'El motor de cálculo no está configurado.' : info.ocupado ? 'El servidor está calculando otro caso.' : '');
      $('acceso-flujo').hidden = true;
    } catch (error) {
      if (desmontado) return;
      configurado = false;
      const login = error.respuesta?.status === 401;
      $('acceso-flujo').hidden = !login;
      mostrarEstado(login ? 'Inicia sesión para calcular.' : 'No se puede conectar con el servidor.', 'aviso');
    }
    $('reintentar-flujo').hidden = configurado;
    actualizarControles();
  }
  $('reintentar-flujo').addEventListener('click', consultarCapacidad);
  consultarCapacidad();
  return {
    cambiar(data) {
      objeto = data;
      invalidarResultado();
    },
    dispose() {
      desmontado = true;
      cicloVida.abort();
      clearTimeout(temporizador);
      objeto = null;
      planos.dispose();
    }
  };
}
