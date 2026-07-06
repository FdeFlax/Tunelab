import { useEffect, useState } from "react";
import {
  PanelEstadoSistemaControl2,
  PanelManiobraControl2,
  PanelMedicionControl2,
  PanelSeguridadControl2,
  RecapMedicionControl2,
} from "../components/control/PanelesControl2";
import {
  formatearSegundosDesdeActualizacion as fmtAct,
  formatearTiempoFuncionamiento as fmtTiempo,
  obtenerEnsayoActivo as getEnsayoActivo,
  resumirAlarmas as resumenAlarmas,
} from "../servicios/tunel/estadoTunel";
import { avisoLimMed, esErrorLim } from "../servicios/tunel/avisosLimite";
import { descargarArchivoMed } from "../servicios/archivos/medicionArchivo";
import { useTunel } from "../servicios/tunel/useTunel";
import { obtenerIdEnsayoApi as getIdEnsayoApi } from "../servicios/api/ensayosApi";
import { crearMedApi, guardarEventoApi, guardarMuestrasApi } from "../servicios/api/medicionesApi";
import { conectarTunelApi, desconectarTunelApi, verConexionTunelApi } from "../servicios/api/tunelConexionApi";
import { escucharEventosTunel } from "../servicios/api/tunelEventosApi";

const POT_RAPIDAS = [10, 25, 50, 100];

function limpiar(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function datosSistema(tunel, fuente) {
  return [
    { etiqueta: "Estado del tunel", valor: tunel.estadoTunel },
    { etiqueta: "Conexion DAQ", valor: tunel.daq },
    { etiqueta: "Conexion variador", valor: tunel.conVariador },
    { etiqueta: "Fuente activa", valor: fuente },
    { etiqueta: "Ultima actualizacion", valor: fmtAct(tunel.marcaAct) },
    { etiqueta: "Tiempo de funcionamiento", valor: fmtTiempo(tunel.tiempoSeg) },
  ];
}

function lecturas(tunel) {
  return [
    {
      etiqueta: "Velocidad actual",
      valor: `${tunel.velMs} m/s`,
    },
    {
      etiqueta: "Temperatura",
      valor: `${tunel.tempC} C`,
    },
    {
      etiqueta: "Potencia",
      valor: `${tunel.potPct}%`,
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
      etiqueta: "Temperatura media",
      valor: `${resumen.temperatura.media} C`,
      apoyo: `Min ${resumen.temperatura.minima} C`,
    },
    {
      etiqueta: "Potencia media",
      valor: `${resumen.potencia.media}%`,
      apoyo: `Objetivo ${resumen.potencia.objetivo}%`,
    },
    {
      etiqueta: "Tiempo en rango",
      valor: `${resumen.velocidad.porcentajeEnRango}%`,
      apoyo: "Velocidad dentro del objetivo",
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
      frecuencia_hz: null,
      corriente_a: null,
      rpm: null,
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
  const [avisoOcupado, setAvisoOcupado] = useState("");

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
  const puedeMed = puedeOperar && tunel.estadoTunel === "RUNNING";
  const medExport = ensayo?.mediciones?.[0] || null;
  const medRep = nombreNorm
    ? ensayo?.mediciones?.find((med) => limpiar(med.nombre) === nombreNorm) || null
    : null;

  const consigna = {
    etiqueta: "Potencia",
    valor: tunel.objPotPct,
    unidad: "%",
    min: 0,
    max: 100,
    paso: 1,
    atajos: POT_RAPIDAS,
    onChange: (valor) => acciones.actualizarPotencia?.(valor),
  };


  async function cargarConexion(silencioso = false) {
    try {
      const respuesta = await verConexionTunelApi();
      setConexion(respuesta);

      if (!silencioso) {
        setAvisoConexion(respuesta.mensaje || "");
      }
    } catch {
      if (!silencioso) {
        setAvisoConexion("No se ha podido comprobar la conexion del tunel");
      }
    }
  }

  useEffect(() => {
    void cargarConexion();

    return escucharEventosTunel(() => {
      void cargarConexion(true);
    });
  }, []);

  async function conectarTunel() {
    try {
      const respuesta = await conectarTunelApi();
      setConexion(respuesta);
      setAvisoConexion(respuesta.mensaje || "");

      if (respuesta.ocupado) {
        const usuario = respuesta.usuario?.nombre || "otro usuario";
        setAvisoOcupado(
          `El tunel esta ocupado por ${usuario}. Debe desconectarse antes de que puedas tomar el control.`
        );
      }
    } catch {
      setAvisoConexion("No se ha podido conectar con el tunel");
    }
  }

  async function desconectarTunel() {
    if (tunel.estadoTunel === "RUNNING" || tunel.medActiva) {
      setAvisoConexion("Apaga el tunel antes de desconectar");
      return;
    }

    try {
      const respuesta = await desconectarTunelApi();
      setConexion(respuesta);
      setAvisoConexion(respuesta.mensaje || "Tunel desconectado");
    } catch {
      setAvisoConexion("No se ha podido desconectar el tunel");
    }
  }

  async function apagarTunelYDesconectar() {
    await acciones.apagarTunel?.();

    try {
      const respuesta = await desconectarTunelApi();
      setConexion(respuesta);
      setAvisoConexion(respuesta.mensaje || "Tunel apagado y desconectado");
    } catch {
      setAvisoConexion("Tunel apagado, pero no se ha podido liberar la conexion");
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
    const resultado = acciones.detenerMedicion?.();
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
        <div>
          <span>Conexion del tunel</span>
          <strong>{tieneConexion ? "Conectado" : conexion?.ocupado ? "Ocupado" : "Sin conectar"}</strong>
      
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
        <PanelEstadoSistemaControl2 datosSistema={datosSistema(tunel, fuente)} />
      </div>

      <RecapMedicionControl2
        resumenUlt={hayInformeMedicion ? resumen : null}
        tarjetas={hayInformeMedicion ? tarjetas(resumen) : []}
        onDescargarMed={descargarUlt}
        onBorrarMed={borrarUlt}
      />

      {avisoOcupado ? (
        <div
          className="cont2modalfondo"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setAvisoOcupado("");
          }}
        >
          <section
            className="cont2modal cont2modalocupado"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cont2modalocupadotitulo"
          >
            <p className="cont2sobretitulo">Tunel ocupado</p>
            <h3 id="cont2modalocupadotitulo">No se puede conectar ahora</h3>
            <p>{avisoOcupado}</p>
            <div className="cont2modalacciones">
              <button
                type="button"
                className="cont2boton cont2botonprimario"
                onClick={() => setAvisoOcupado("")}
              >
                Entendido
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



















