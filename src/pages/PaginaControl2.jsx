import { useEffect, useState } from "react";
import {
  PanelEstadoSistemaControl2,
  PanelManiobraControl2,
  PanelMedicionControl2,
  PanelRangosOperacionControl2,
  PanelSeguridadControl2,
  RecapMedicionControl2,
} from "../components/control/PanelesControl2";
import {
  SEGUNDOS_ESTABILIDAD_REQUERIDOS,
  TOLERANCIA_ESTABILIDAD_MS,
  VELOCIDAD_MAXIMA_SIMULADA_MS,
  formatearSegundosDesdeActualizacion as fmtAct,
  formatearTiempoFuncionamiento as fmtTiempo,
  obtenerEnsayoActivo as getEnsayoActivo,
  obtenerEstadoOperativoTunel,
  resumirAlarmas as resumenAlarmas,
} from "../servicios/tunel/estadoTunel";
import { avisoLimMed, esErrorLim } from "../servicios/tunel/avisosLimite";
import { descargarArchivoMed } from "../servicios/archivos/medicionArchivo";
import { useTunel } from "../servicios/tunel/useTunel";
import { obtenerIdEnsayoApi as getIdEnsayoApi } from "../servicios/api/ensayosApi";
import { crearMedApi, guardarEventoApi, guardarMuestrasApi } from "../servicios/api/medicionesApi";
import {
  conectarTunelApi,
  desconectarTunelApi,
  verConexionTunelApi,
} from "../servicios/api/tunelConexionApi";
import { escucharEventosTunel } from "../servicios/api/tunelEventosApi";

const POT_RAPIDAS = [10, 25, 50, 100];
const VELOCIDAD_MAXIMA_REFERENCIA_MS = VELOCIDAD_MAXIMA_SIMULADA_MS;

const COMPROBACIONES_ENCENDIDO = [
  { id: "interior", texto: "Interior del túnel despejado." },
  { id: "modelo", texto: "Modelo correctamente fijado." },
  { id: "puertas", texto: "Puertas cerradas." },
  { id: "pitot", texto: "Tubo de Pitot alineado y sin obstrucciones." },
  { id: "conexiones", texto: "Conexiones revisadas." },
  { id: "emergencia", texto: "Parada de emergencia accesible." },
  { id: "epis", texto: "Personal con los EPIs necesarios." },
];

function crearEstadoComprobaciones() {
  return Object.fromEntries(COMPROBACIONES_ENCENDIDO.map(({ id }) => [id, false]));
}

function limpiar(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function construirMensajeTunelOcupado(conexion) {
  if (!conexion?.ocupado || conexion?.conectado) return "";
  return "Túnel ocupado";
}

function datosSistema(tunel, fuente, estadoOperativo) {
  return [
    { etiqueta: "Estado operativo", valor: estadoOperativo.etiqueta },
    { etiqueta: "Estado tecnico", valor: tunel.estadoTunel },
    { etiqueta: "Conexion DAQ", valor: tunel.daq },
    { etiqueta: "Conexion variador", valor: tunel.conVariador },
    { etiqueta: "Fuente activa", valor: fuente },
    { etiqueta: "Ultima actualizacion", valor: fmtAct(tunel.marcaAct) },
    { etiqueta: "Tiempo de funcionamiento", valor: fmtTiempo(tunel.tiempoSeg) },
  ];
}

function rangosOperacion(tunel) {
  const estabilidadActual = tunel.estadoTunel !== "RUNNING"
    ? "Sin flujo"
    : tunel.flujoEstable
      ? `Estable (${SEGUNDOS_ESTABILIDAD_REQUERIDOS} s)`
      : `${tunel.estabilidadFlujoSeg || 0} s / ${SEGUNDOS_ESTABILIDAD_REQUERIDOS} s`;

  return [
    { parametro: "Velocidad aire", minimo: "0 m/s", maximo: `${VELOCIDAD_MAXIMA_REFERENCIA_MS} m/s`, actual: `${tunel.velMs} m/s` },
    { parametro: "Consigna variador", minimo: "0%", maximo: "100%", actual: `${tunel.potPct}%` },
    { parametro: "Estabilidad", minimo: "-", maximo: `+/- ${TOLERANCIA_ESTABILIDAD_MS} m/s`, actual: estabilidadActual },
  ];
}

function lecturas(tunel) {
  return [
    {
      etiqueta: "Velocidad actual",
      valor: `${tunel.velMs} m/s`,
    },
    {
      etiqueta: "Presion dinamica",
      valor: `${tunel.presionDinamicaPa ?? tunel.presionPa ?? 0} Pa`,
    },
    {
      etiqueta: "Caudal",
      valor: `${tunel.caudalM3s ?? 0} m³/s`,
    },
    {
      etiqueta: "Consigna variador",
      valor: `${tunel.potPct}%`,
    },
    {
      etiqueta: "Carga aerodinamica",
      valor: `${tunel.cargaAerodinamicaRelativaPct ?? 0}%`,
    },
    {
      etiqueta: "Tiempo de medicion",
      valor: fmtTiempo(tunel.medSeg),
    },
  ];
}

function tarjetas(resumen) {
  if (!resumen) return [];

  return [
    {
      etiqueta: "Duracion",
      valor: fmtTiempo(resumen.durSeg),
      apoyo: `${resumen.totalMuestras} muestras registradas`,
    },
    {
      etiqueta: "Velocidad media",
      valor: `${resumen.velocidad.media} m/s`,
      apoyo: `Max ${resumen.velocidad.maxima} m/s`,
    },
    {
      etiqueta: "Estabilidad",
      valor: `${resumen.velocidad.estabilidad} m/s`,
      apoyo: "Diferencia entre maximo y minimo",
    },
    {
      etiqueta: "Presion media",
      valor: `${resumen.tecnicos?.presionMediaPa ?? 0} Pa`,
      apoyo: "Presion dinamica Pitot",
    },
    {
      etiqueta: "Consigna media",
      valor: `${resumen.potencia.media}%`,
      apoyo: `Objetivo ${resumen.potencia.objetivo}%`,
    },
    {
      etiqueta: "Tiempo en rango",
      valor: `${resumen.velocidad.porcentajeEnRango}%`,
      apoyo: "Velocidad dentro del objetivo",
    },
    {
      etiqueta: "Caudal medio",
      valor: `${resumen.tecnicos?.caudalMedioM3s ?? 0} m³/s`,
      apoyo: "Calculado con la seccion de ensayo",
    },
    {
      etiqueta: "Fuente",
      valor: resumen.muestras?.[0]?.fuente || "simulado",
      apoyo: "Origen de la captura",
    },
    {
      etiqueta: "Incidencias",
      valor: `${resumen.eventos.length}`,
      apoyo: resumen.eventos.length ? "Eventos durante la medicion" : "Sin incidencias registradas",
    },
  ];
}

function muestrasApi(med) {
  return (med?.muestras || []).map((muestra) => {
    const duracion = Number(med?.durSeg || 0);
    const segundo = Number(muestra?.segundo || 0);
    const retrasoMs = Math.max(0, duracion - segundo) * 1000;

    return {
      instante: new Date(Date.now() - retrasoMs).toISOString(),
      velocidad_ms: muestra.velMs,
      temperatura_c: muestra.tempC,
      potencia_porcentaje: muestra.potPct,
      frecuencia_hz: muestra.frecHz ?? null,
      corriente_a: muestra.corrA ?? null,
      rpm: muestra.rpm ?? null,
    };
  });
}

function PaginaControl2() {
  const { estadoTunel: tunel, accionesTunel: acciones, fuenteTunel } = useTunel();
  const [nombreMed, setNombreMed] = useState("");
  const [medDup, setMedDup] = useState(null);
  const [avisoLim, setAvisoLim] = useState(null);
  const [iniciando, setIniciando] = useState(false);
  const [conexion, setConexion] = useState(null);
  const [avisoConexion, setAvisoConexion] = useState("");
  const [confirmacionEncendido, setConfirmacionEncendido] = useState(null);
  const [comprobacionesEncendido, setComprobacionesEncendido] = useState(
    crearEstadoComprobaciones
  );
  const [encendiendoTunel, setEncendiendoTunel] = useState(false);
  const [errorEncendido, setErrorEncendido] = useState("");

  const ensayo = getEnsayoActivo(tunel);
  const resumen = tunel.resumenUltMed;
  const hayInformeMedicion = Boolean(resumen && Number(resumen.totalMuestras || 0) > 0);
  const fuente = fuenteTunel === "simulado" ? "Simulado" : "Real";
  const nombreOk = nombreMed.trim();
  const nombreNorm = limpiar(nombreOk);
  const totalMed = ensayo?.mediciones?.length || 0;
  const limiteMed = Number(tunel.limitesUso?.medicionesPorEnsayo || 0);
  const hayLimite = Number.isFinite(limiteMed) && limiteMed > 0;
  const tieneConexion = Boolean(conexion?.conectado);
  const puedeOperar = tieneConexion && tunel.permiteCtrl;
  const puedeMed = puedeOperar && tunel.estadoTunel === "RUNNING" && tunel.flujoEstable;
  const comprobacionPendiente = Boolean(confirmacionEncendido);
  const estadoOperativo = obtenerEstadoOperativoTunel(tunel, {
    conectado: tieneConexion,
    comprobacionPendiente,
  });
  const mensajeTunelOcupado = construirMensajeTunelOcupado(conexion);
  const mensajeConexionVisible = mensajeTunelOcupado || avisoConexion;
  const comprobacionesCompletas = COMPROBACIONES_ENCENDIDO.every(
    ({ id }) => comprobacionesEncendido[id]
  );
  const medExport = ensayo?.mediciones?.[0] || null;
  const medRep = nombreNorm
    ? ensayo?.mediciones?.find((med) => limpiar(med.nombre) === nombreNorm) || null
    : null;

  const consigna = {
    etiqueta: "Consigna variador",
    valor: tunel.objPotPct,
    unidad: "%",
    min: 0,
    max: 100,
    paso: 1,
    atajos: POT_RAPIDAS,
    onChange: (valor) => (acciones.actualizarConsigna || acciones.actualizarPotencia)?.(valor),
  };


  async function cargarConexion(silencioso = false) {
    try {
      const respuesta = await verConexionTunelApi();
      setConexion(respuesta);

      if (respuesta.ocupado) {
        setAvisoConexion("");
      } else if (silencioso) {
        setAvisoConexion("");
      } else {
        setAvisoConexion(respuesta.mensaje || "");
      }
    } catch {
      if (!silencioso) {
        setAvisoConexion("No se ha podido comprobar la conexión del túnel");
      }
    }
  }

  useEffect(() => {
    void cargarConexion(true);

    return escucharEventosTunel(() => {
      void cargarConexion(true);
    });
  }, []);

  useEffect(() => {
    if (!puedeOperar || tunel.estadoTunel === "RUNNING") {
      setConfirmacionEncendido(null);
      setComprobacionesEncendido(crearEstadoComprobaciones());
      setEncendiendoTunel(false);
      setErrorEncendido("");
    }
  }, [puedeOperar, tunel.estadoTunel]);

  async function conectarTunel() {
    setConfirmacionEncendido(null);
    setComprobacionesEncendido(crearEstadoComprobaciones());
    setEncendiendoTunel(false);
    setErrorEncendido("");

    try {
      const respuesta = await conectarTunelApi();
      setConexion(respuesta);
      setAvisoConexion(respuesta.mensaje || "");
    } catch {
      setAvisoConexion("No se ha podido conectar con el túnel");
    }
  }

  async function desconectarTunel() {
    if (tunel.estadoTunel === "RUNNING" || tunel.medActiva) {
      setAvisoConexion("Apaga el túnel antes de desconectar");
      return;
    }

    try {
      const respuesta = await desconectarTunelApi();
      setConexion(respuesta);
      await cargarConexion(true);
      setAvisoConexion(respuesta.ocupado ? "" : respuesta.mensaje || "Túnel desconectado");
    } catch {
      setAvisoConexion("No se ha podido desconectar el túnel");
    }
  }

  async function apagarTunelYDesconectar() {
    await acciones.apagarTunel?.();

    try {
      const respuesta = await desconectarTunelApi();
      setConexion(respuesta);
      await cargarConexion(true);
      setAvisoConexion(respuesta.ocupado ? "" : respuesta.mensaje || "Túnel apagado y desconectado");
    } catch {
      setAvisoConexion("Túnel apagado, pero no se ha podido liberar la conexión");
    }
  }

  function solicitarEncendido(potencia) {
    if (!puedeOperar || tunel.estadoTunel === "RUNNING") return;

    const potenciaNormalizada = Math.min(
      100,
      Math.max(0, Math.round(Number(potencia) || 0))
    );
    setComprobacionesEncendido(crearEstadoComprobaciones());
    setErrorEncendido("");
    setConfirmacionEncendido({ potencia: potenciaNormalizada });
  }

  function cerrarConfirmacionEncendido() {
    if (encendiendoTunel) return;
    setConfirmacionEncendido(null);
    setErrorEncendido("");
  }

  function cambiarComprobacionEncendido(id) {
    setComprobacionesEncendido((actuales) => ({
      ...actuales,
      [id]: !actuales[id],
    }));
  }

  async function confirmarYEncender() {
    if (!confirmacionEncendido || !comprobacionesCompletas || encendiendoTunel) return;

    setEncendiendoTunel(true);
    setErrorEncendido("");

    try {
      (acciones.actualizarConsigna || acciones.actualizarPotencia)?.(confirmacionEncendido.potencia);
      const resultado = await acciones.encenderTunel?.();

      if (resultado === false) {
        setErrorEncendido("No se ha podido confirmar el encendido del túnel.");
        return;
      }

      setConfirmacionEncendido(null);
      setComprobacionesEncendido(crearEstadoComprobaciones());
    } catch {
      setErrorEncendido("No se ha podido enviar la orden de encendido.");
    } finally {
      setEncendiendoTunel(false);
    }
  }

  async function iniciarMed() {
    if (medRep) {
      setMedDup(medRep);
      return;
    }

    if (hayLimite && totalMed >= limiteMed) {
      setAvisoLim(avisoLimMed({ limite: limiteMed }));
      return;
    }

    await iniciarNuevaMed(false);
  }

  async function guardarFinApi(ensayoActual, med) {
    const ensayoId = getIdEnsayoApi(ensayoActual?.codigo);
    if (!ensayoId || !med) return;

    const medApi = await crearMedApi({
      ensayoId,
      nombre: med.nombre || nombreOk || "Medicion sin nombre",
      objetivos: {
        velocidad: med.objVelMs,
        potencia: med.objPotPct,
        temperatura: tunel.objTempC,
      },
      resumen: {
        durSeg: med.durSeg,
        velocidadMedia: med.velocidad?.media,
        velocidadMaxima: med.velocidad?.maxima,
        velocidadMinima: med.velocidad?.minima,
        temperaturaMedia: med.temperatura?.media,
        potenciaMedia: med.potencia?.media,
      },
    });

    const muestras = muestrasApi(med);
    if (muestras.length) {
      await guardarMuestrasApi({ medicionId: medApi.id, muestras });
    }

    await guardarEventoApi({
      ensayo_id: ensayoId,
      medicion_id: medApi.id,
      tipo: "sistema",
      mensaje: `Medicion ${med.nombre || medApi.nombre} finalizada y registrada.`,
    });

    window.dispatchEvent(new CustomEvent("tunelab:registro-actualizado"));
  }

  async function detenerMed() {
    const resultado = await acciones.detenerMedicion?.();
    if (resultado === false) return;

    const estadoNuevo = acciones.obtenerEstado?.() || tunel;
    const ensayoNuevo = getEnsayoActivo(estadoNuevo);
    const medFin = resultado && resultado !== true ? resultado : ensayoNuevo?.mediciones?.[0] || null;

    try {
      await guardarFinApi(ensayoNuevo, medFin);
    } catch (error) {
      console.warn("La medicion queda temporal porque la API no esta disponible.", error);
    }
  }

  async function iniciarNuevaMed(confirmarSobreesc) {
    setIniciando(true);

    try {
      const resultado = await acciones.iniciarMedicion?.({
        nombreMed: nombreOk || undefined,
        confirmarSobreesc,
      });

      if (resultado !== false) {
        setMedDup(null);
        setNombreMed("");
      }
    } catch (error) {
      if (esErrorLim(error)) {
        setAvisoLim(avisoLimMed({ mensaje: error.message, limite: limiteMed }));
      }
    } finally {
      setIniciando(false);
    }
  }

  function descargarUlt() {
    if (!ensayo || !medExport) return;
    descargarArchivoMed({ ensayo, medicion: medExport, fuenteTunel, estadoTunel: tunel });
  }

  function borrarUlt() {
    if (!ensayo || !medExport) return;

    const confirmado = window.confirm(
      `Vas a borrar la medicion "${medExport.nombre}" del ensayo activo. Esta accion no se puede deshacer.`
    );

    if (!confirmado) return;

    acciones.eliminarMedicion?.(ensayo.id, medExport.id);
  }

  return (
    <div className="page page--control2">
      <section className={`cont2conexion ${conexion?.ocupado ? "cont2conexionocupada" : ""}`}>
        <div className="cont2conexionestado">
          <span>Conexión del túnel</span>
          <strong>{conexion?.ocupado && !tieneConexion ? "Ocupado" : estadoOperativo.etiqueta}</strong>
          {mensajeConexionVisible ? (
            <p
              className={
                mensajeTunelOcupado
                  ? "cont2conexionmensaje cont2conexionmensajeocupado"
                  : "cont2conexionmensaje"
              }
            >
              {mensajeConexionVisible}
            </p>
          ) : null}
        </div>
        <div className="cont2conexionacciones">
          <button
            type="button"
            className="cont2boton cont2botonprimario"
            onClick={conectarTunel}
            disabled={tieneConexion || conexion?.ocupado}
          >
            Conectar
          </button>
          <button
            type="button"
            className="cont2boton cont2botonsecundario"
            onClick={desconectarTunel}
            disabled={!tieneConexion || tunel.estadoTunel === "RUNNING" || tunel.medActiva}
          >
            Desconectar
          </button>
        </div>
      </section>

      <div className="cont2grid">
        <PanelManiobraControl2
          estadoTunel={tunel}
          accionesTunel={acciones}
          consigna={consigna}
          lecturasMed={lecturas(tunel)}
          puedeOperar={puedeOperar}
          onApagarTunel={apagarTunelYDesconectar}
          onSolicitarEncendido={solicitarEncendido}
        />
        <PanelMedicionControl2
          estadoTunel={tunel}
          ensayoActivo={ensayo}
          puedeMed={puedeMed}
                    puedeOperar={puedeOperar}
          nombreMed={nombreMed}
          onCambiarNombreMed={setNombreMed}
          onIniciarMed={iniciarMed}
          onDetenerMed={detenerMed}
          iniciandoMed={iniciando}
        />
        <PanelSeguridadControl2
          estadoTunel={tunel}
          resumenAlarmas={resumenAlarmas(tunel.alarmas)}
          alertasRec={tunel.alarmas
            .filter((evento) => evento.nivel === "advertencia" || evento.nivel === "critica")
            .slice(0, 4)}
        />
        <PanelEstadoSistemaControl2 datosSistema={datosSistema(tunel, fuente, estadoOperativo)} />
      </div>

      <PanelRangosOperacionControl2 rangos={rangosOperacion(tunel)} />

      <RecapMedicionControl2
        resumenUlt={hayInformeMedicion ? resumen : null}
        tarjetas={hayInformeMedicion ? tarjetas(resumen) : []}
        onDescargarMed={descargarUlt}
        onBorrarMed={borrarUlt}
      />

      {confirmacionEncendido ? (
        <div className="cont2popupfondo" role="presentation">
          <section
            className="cont2modal cont2modalcomprobaciones"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cont2modalcomprobacionestitulo"
            aria-describedby="cont2modalcomprobacionesdescripcion"
          >
            <div>
              <h3 id="cont2modalcomprobacionestitulo">Comprobación previa</h3>
              <p
                id="cont2modalcomprobacionesdescripcion"
                className="cont2modalintroduccion"
              >
                Confirma presencialmente cada punto de seguridad. Ninguna comprobación
                sustituye a los dispositivos físicos de protección.
              </p>
            </div>

            <fieldset className="cont2checklist">
              <legend>Lista de comprobación</legend>
              {COMPROBACIONES_ENCENDIDO.map((comprobacion) => (
                <label key={comprobacion.id} className="cont2checkitem">
                  <input
                    type="checkbox"
                    checked={comprobacionesEncendido[comprobacion.id]}
                    onChange={() => cambiarComprobacionEncendido(comprobacion.id)}
                    disabled={encendiendoTunel}
                  />
                  <span>{comprobacion.texto}</span>
                </label>
              ))}
            </fieldset>

            <div className="cont2potenciaconfirmacion">
              <span>Consigna que se aplicara</span>
              <strong>{confirmacionEncendido.potencia}%</strong>
            </div>

            {errorEncendido ? (
              <p className="cont2modalerror" role="alert">
                {errorEncendido}
              </p>
            ) : null}

            <div className="cont2modalacciones">
              <button
                type="button"
                className="cont2boton cont2botonsecundario"
                onClick={cerrarConfirmacionEncendido}
                disabled={encendiendoTunel}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cont2boton cont2botonprimario"
                onClick={() => void confirmarYEncender()}
                disabled={!comprobacionesCompletas || encendiendoTunel}
              >
                {encendiendoTunel ? "Encendiendo..." : "Confirmar y encender"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {medDup ? (
        <div
          className="cont2modalfondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget && !iniciando) setMedDup(null);
          }}
        >
          <section
            className="cont2modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cont2modalsobrescrituramediciontitulo"
          >
            <p className="cont2sobretitulo">Nombre repetido</p>
            <h3 id="cont2modalsobrescrituramediciontitulo">
              Ya existe una medicion llamada {medDup.nombre}
            </h3>
            <p>
              Si aceptas, se borrara la medicion anterior con ese nombre y se iniciara
              una nueva captura usando <strong>{nombreOk}</strong>.
            </p>
            <div className="cont2modalacciones">
              <button
                type="button"
                className="cont2boton cont2botonsecundario"
                onClick={() => setMedDup(null)}
                disabled={iniciando}
              >
                Denegar
              </button>
              <button
                type="button"
                className="cont2boton cont2botonparada"
                onClick={() => void iniciarNuevaMed(true)}
                disabled={iniciando}
              >
                {iniciando ? "Iniciando..." : "Aceptar y sobrescribir"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {avisoLim ? (
        <div
          className="cont2modalfondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setAvisoLim(null);
          }}
        >
          <section
            className="cont2modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cont2modallimitemedicionestitulo"
          >
            <p className="cont2sobretitulo">Limite alcanzado</p>
            <h3 id="cont2modallimitemedicionestitulo">{avisoLim.titulo}</h3>
            <p>{avisoLim.detalle}</p>
            <div className="cont2modalacciones">
              <button
                type="button"
                className="cont2boton cont2botonprimario"
                onClick={() => setAvisoLim(null)}
              >
                Entendido
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default PaginaControl2;





















