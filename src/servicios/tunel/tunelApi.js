import { crearEstadoTunelBase, limitarAlarmasPorCategoria } from "./estadoTunel";
import { crearGestorEnsayos } from "./gestorEnsayos";
import { calcularMagnitudesDerivadas, calcularCargaAerodinamicaRelativaPct } from "./fichaTunel";
import { crearMedicionDesdeApi, instanteApiMs } from "../mediciones/adaptarRegistros";
import { leerIdentidadApi } from "../api/clienteApi";
import { apagarTunelApi, leerMuestrasCapturaApi, verEstadoTunelApi, iniciarMedicionApi, detenerMedicionApi } from "../api/controlApi";
function estadoInicial() {
  return {
    ...crearEstadoTunelBase(),
    modoControl: "Control por API",
    estadoTunel: "DESCONECTADO",
    permiteCtrl: false,
    bloqSeg: true,
    capturaApi: null,
    errorCaptura: null,
    lecturasEnVivo: [],
    ultimaOrden: "Esperando al servidor",
    daq: "Pendiente de servidor",
    conVariador: "Pendiente de servidor"
  };
}
export function crearTunelApi() {
  let estado = estadoInicial();
  let temporizador = null;
  let sincronizando = null;
  let generacion = 0;
  let muestrasApi = [];
  let ultimaRespuesta = null;
  let colaOrdenes = Promise.resolve();
  let ordenEnCurso = false;
  const suscriptores = new Set();
  const identidad = () => leerIdentidadApi()?.identificador;
  function publicar(cambios) {
    estado = {
      ...estado,
      ...cambios,
      marcaAct: Date.now()
    };
    suscriptores.forEach(suscriptor => suscriptor());
  }
  function registrarEvento(mensaje, cambios = {}) {
    const hora = new Date().toLocaleTimeString("es-ES");
    publicar({
      ...cambios,
      ultimaOrden: mensaje,
      horaUltimaOrden: hora,
      alarmas: limitarAlarmasPorCategoria([{
        id: `api-${Date.now()}`,
        hora,
        nivel: "info",
        etiqueta: "API",
        mensaje
      }, ...estado.alarmas])
    });
  }
  function integrarCaptura() {
    const captura = ultimaRespuesta?.captura;
    if (!captura) {
      publicar({
        capturaApi: null,
        medActiva: false,
        muestrasMedicion: [],
        resumenUltMed: null
      });
      return;
    }
    const registro = crearMedicionDesdeApi(captura, muestrasApi);
    const ensayo = estado.ensayos.find(e => e.apiId === captura.ensayo_id);
    const activa = captura.estado === "en_curso";
    publicar({
      capturaApi: captura,
      medActiva: activa,
      medSeg: registro.durSeg,
      nombreMedicionActiva: activa ? captura.nombre : null,
      muestrasMedicion: activa ? registro.muestras : [],
      resumenUltMed: activa ? null : {
        ...registro,
        ensayoNombre: ensayo?.nombre || "",
        horaFin: registro.hora
      },
      ...(ensayo ? {
        ensayos: estado.ensayos.map(e => e.id === ensayo.id ? {
          ...e,
          mediciones: [registro, ...e.mediciones.filter(m => m.id !== registro.id)]
        } : e),
        ...(activa ? {
          ensayoActivoId: ensayo.id,
        } : {})
      } : {})
    });
  }
  async function aplicarRespuesta(datos, version, usuario) {
    const vigente = () => generacion === version && identidad() === usuario;
    const captura = datos.captura;
    let muestras = captura?.id === ultimaRespuesta?.captura?.id ? muestrasApi : [];
    while (captura && muestras.length < datos.total_muestras) {
      const pagina = await leerMuestrasCapturaApi(captura.id, muestras.at(-1)?.id || 0);
      if (!vigente()) return false;
      if (!pagina.length) break;
      muestras = [...muestras, ...pagina];
    }
    if (!vigente()) return false;
    const anterior = ultimaRespuesta;
    muestrasApi = muestras;
    ultimaRespuesta = datos;
    const magnitudes = calcularMagnitudesDerivadas({
      velocidadMs: datos.velocidad_ms
    });
    const instante = instanteApiMs(datos.actualizado_en);
    const nuevaMarcha = !anterior?.encendido ||
      datos.tiempo_funcionamiento_segundos < anterior.tiempo_funcionamiento_segundos;
    let lecturasEnVivo = datos.encendido && !nuevaMarcha ? estado.lecturasEnVivo : [];
    if (datos.encendido && Number.isFinite(instante) && Number.isFinite(datos.velocidad_ms)) {
      if (instante < (lecturasEnVivo.at(-1)?.instante ?? 0)) lecturasEnVivo = [];
      if (instante !== lecturasEnVivo.at(-1)?.instante) lecturasEnVivo = [...lecturasEnVivo, {
        instante, velMs: datos.velocidad_ms, flujoEstable: datos.flujo_estable,
        consignaObjetivoPct: datos.potencia_objetivo,
      }].slice(-300);
    }
    publicar({
      lecturasEnVivo,
      estadoTunel: datos.encendido ? "RUNNING" : "READY",
      permiteCtrl: true,
      bloqSeg: false,
      daq: "Simulador del servidor",
      conVariador: "Servidor conectado",
      estadoVar: datos.encendido ? "En marcha" : "Disponible",
      objPotPct: datos.potencia_objetivo,
      consignaObjetivoPct: datos.potencia_objetivo,
      objVelMs: datos.velocidad_objetivo_ms,
      velocidadObjetivoMs: datos.velocidad_objetivo_ms,
      potPct: datos.potencia_aplicada,
      consignaPct: datos.potencia_aplicada,
      consignaVariadorPct: datos.potencia_aplicada,
      tiempoSeg: datos.tiempo_funcionamiento_segundos ?? 0,
      velMs: datos.velocidad_ms,
      tempC: datos.temperatura_c,
      frecHz: datos.frecuencia_hz,
      corrA: datos.corriente_a,
      rpm: datos.rpm,
      presionPa: magnitudes.presionDinamicaPa,
      caudalM3s: magnitudes.caudalM3s,
      fuenteDatos: datos.fuente,
      fuente: "Simulador del servidor",
      cargaAerodinamicaRelativaPct: calcularCargaAerodinamicaRelativaPct(datos.velocidad_ms),
      estabilidadFlujoSeg: datos.estabilidad_segundos,
      flujoEstable: datos.flujo_estable,
      errorCaptura: datos.error_captura || (captura?.estado === "error" ? "Captura interrumpida. Las muestras confirmadas se conservan en Registro." : null)
    });
    integrarCaptura();
    if (anterior?.captura?.estado === "en_curso" && (captura?.estado !== "en_curso" || captura?.id !== anterior.captura.id)) {
      window.dispatchEvent(new CustomEvent("tunelab:registro-actualizado"));
    }
    return true;
  }
  function sincronizar() {
    if (sincronizando || ordenEnCurso || !identidad()) return sincronizando;
    const version = generacion;
    const usuario = identidad();
    const tarea = (async () => {
      try {
        return await aplicarRespuesta(await verEstadoTunelApi(), version, usuario);
      } catch {
        if (version === generacion && usuario === identidad()) {
          // La perdida de enlace no equivale a una parada confirmada.
          publicar({
            permiteCtrl: false,
            bloqSeg: true,
            daq: "Servidor no disponible",
            errorCaptura: "Sin enlace con el servidor. Reconectando para recuperar la captura."
          });
        }
        return false;
      }
    })();
    sincronizando = tarea;
    void tarea.finally(() => {
      if (sincronizando === tarea) sincronizando = null;
    });
    return tarea;
  }
  function iniciar() {
    if (temporizador || !identidad()) return;
    void sincronizar();
    temporizador = window.setInterval(sincronizar, 1000);
  }
  function detener() {
    window.clearInterval(temporizador);
    temporizador = null;
    generacion++;
    sincronizando = null;
  }
  function ordenar(accion) {
    const usuario = identidad();
    const tarea = colaOrdenes.catch(() => {}).then(async () => {
      if (!usuario || identidad() !== usuario) throw new Error("La sesion ha cambiado");
      const version = ++generacion;
      ordenEnCurso = true;
      try {
        const datos = await accion();
        await aplicarRespuesta(datos, version, usuario);
        return datos;
      } finally {
        ordenEnCurso = false;
      }
    });
    colaOrdenes = tarea;
    return tarea;
  }
  const gestorEnsayos = crearGestorEnsayos({
    obtenerEstado: () => estado,
    registrarEvento,
  });
  return {
    modo: "api",
    iniciar,
    detener,
    sincronizar,
    reiniciar() {
      detener();
      muestrasApi = [];
      ultimaRespuesta = null;
      publicar(estadoInicial());
    },
    suscribirse(suscriptor) {
      suscriptores.add(suscriptor);
      iniciar();
      return () => {
        suscriptores.delete(suscriptor);
        if (!suscriptores.size) detener();
      };
    },
    obtenerEstado: () => estado,
    crearEnsayo: gestorEnsayos.crearNuevoEnsayo,
    cargarEnsayosPersistidos(ensayos) {
      gestorEnsayos.cargarEnsayosPersistidos(ensayos);
      integrarCaptura();
    },
    activarEnsayo(id) {
      if (!estado.medActiva) gestorEnsayos.activarEnsayo(id);
    },
    actualizarEnsayo: gestorEnsayos.actualizarEnsayo,
    eliminarMedicion: gestorEnsayos.eliminarMedicion,
    apagarTunel: () => ordenar(apagarTunelApi),
    async iniciarMedicion(datos) {
      const clave = `tunelab_inicio_medicion_${identidad()}_${datos.ensayo_id}`;
      const solicitud = JSON.stringify(datos);
      const pendiente = JSON.parse(window.sessionStorage.getItem(clave) || "null");
      const intento = pendiente?.solicitud === solicitud ? pendiente.clave : crypto.randomUUID();
      window.sessionStorage.setItem(clave, JSON.stringify({ solicitud, clave: intento }));
      const respuesta = await ordenar(() => iniciarMedicionApi({ ...datos, clave: intento }));
      window.sessionStorage.removeItem(clave);
      return respuesta;
    },
    detenerMedicion() {
      const captura = estado.capturaApi;
      if (!captura || captura.estado !== "en_curso") return Promise.reject(new Error("No hay una medición que detener"));
      return ordenar(() => detenerMedicionApi(captura.id));
    },
  };
}
export default crearTunelApi();
