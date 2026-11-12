import { useState } from "react";
import { Plug, Power } from "lucide-react";
import RegistroMedicion from "../components/control/RegistroMedicion";
import {
  PanelEstadoSistemaControl,
  PanelSeguridadControl,
  RecapMedicionControl,
} from "../components/control/PanelesControl";
import {
  formatearSegundosDesdeActualizacion as fmtAct,
  formatearTiempoFuncionamiento as fmtTiempo,
  obtenerEnsayoActivo as getEnsayoActivo,
  obtenerEstadoOperativoTunel,
  resumirAlarmas as resumenAlarmas,
} from "../servicios/tunel/estadoTunel";
import { descargarArchivoMed } from "../servicios/archivos/medicionArchivo";
import { useTunel, useConexionTunel } from "../logicaPantallas/useTunel";
import { finalizarCaptura } from "../servicios/tunel/finalizarCaptura";
import ComprobacionPrevia from "../components/control/ComprobacionPrevia";
import useBorradorSincronizado from "../logicaPantallas/useBorradorSincronizado";

function construirMensajeTunelOcupado(conexion) {
  if (!conexion?.ocupado || conexion?.conectado) return "";
  return "Túnel ocupado";
}

function datosSistema(tunel, fuente) {
  return [
    { etiqueta: "Estado operativo", valor: obtenerEstadoOperativoTunel(tunel).etiqueta },
    { etiqueta: "Estado técnico", valor: tunel.estadoTunel },
    { etiqueta: "Conexión variador", valor: tunel.conVariador },
    { etiqueta: "Fuente activa", valor: fuente },
    { etiqueta: "Última actualización", valor: fmtAct(tunel.marcaAct) },
    { etiqueta: "Tiempo de funcionamiento", valor: fmtTiempo(tunel.tiempoSeg) },
  ];
}

function PaginaControl() {
  const { estadoTunel: tunel, accionesTunel: acciones } = useTunel();
  const { conexion, avisoConexion, setAvisoConexion, conectar, desconectar } = useConexionTunel();
  const [avisoGuardado, setAvisoGuardado] = useState(null);

  const ensayo = getEnsayoActivo(tunel);
  const resumen = tunel.resumenUltMed;
  const hayInformeMedicion = Boolean(resumen && Number(resumen.totalMuestras || 0) > 0);
  const fuente = "Simulador del servidor";
  const tieneConexion = Boolean(conexion?.conectado);
  const puedeOperar = tieneConexion && tunel.permiteCtrl;
  const [confirmacionEncendido, setConfirmacionEncendido] = useBorradorSincronizado(`${puedeOperar}-${ensayo?.id}`, null);
  const comprobacionPendiente = Boolean(confirmacionEncendido);
  const estadoOperativo = obtenerEstadoOperativoTunel(tunel, {
    conectado: tieneConexion,
    comprobacionPendiente,
  });
  const mensajeTunelOcupado = construirMensajeTunelOcupado(conexion);
  const mensajeConexionVisible = mensajeTunelOcupado || avisoConexion;
  const estadoConexionBarra = conexion?.ocupado && !tieneConexion
    ? "ocupado"
    : tieneConexion
      ? "conectado"
      : "sinconectar";
  const medExport = ensayo?.mediciones?.[0] || null;

  async function conectarTunel() {
    setConfirmacionEncendido(null);

    await conectar();
  }

  async function desconectarTunel() {
    if (tunel.estadoTunel === "RUNNING" || tunel.medActiva) {
      setAvisoConexion("Apaga el túnel antes de desconectar");
      return;
    }

    await desconectar();
  }

  async function apagarTunelYDesconectar() {
    try {
      const fin = await finalizarCaptura(acciones, { apagar: true });
      mostrarResultadoGuardado(fin);
      if (fin.resultado === false || fin.resultado === null) {
        setAvisoConexion("No se ha podido confirmar el apagado del túnel");
        return;
      }
    } catch {
      setAvisoConexion("No se ha podido apagar el túnel");
      return;
    }

    await desconectar({
      mensaje: "Túnel apagado y desconectado",
      error: "Túnel apagado, pero no se ha podido liberar la conexión",
    });
  }

  function solicitarInicioMedicion({ ensayoId, potencia }) {
    if (!puedeOperar || tunel.estadoTunel === "RUNNING") return;

    setConfirmacionEncendido({ ensayoId, potencia });
  }

  function mostrarResultadoGuardado(fin) {
    if (fin.errorGuardado) {
      setAvisoGuardado({
        error: true,
        texto: "Captura interrumpida. Consulta las muestras confirmadas en Registro.",
      });
    } else if (fin.guardada) {
      setAvisoGuardado({ error: false, texto: "Medición guardada en Registro." });
    }
  }

  function descargarUlt() {
    if (!ensayo || !medExport) return;
    descargarArchivoMed({ ensayo, medicion: medExport, estadoTunel: tunel });
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
      {tunel.errorCaptura && <p role="alert">{tunel.errorCaptura}</p>}
      <section className={`cont2conexion ${estadoConexionBarra === "ocupado" ? "cont2conexionocupada" : ""}`}>
        <div className="cont2conexionestado">
          <div className="cont2conexionestadofila">
            <span>Estado del sistema</span>
            <strong>{conexion?.ocupado && !tieneConexion ? "Ocupado" : estadoOperativo.etiqueta}</strong>
          </div>
          {mensajeConexionVisible && !["Tunel libre", "Conectado a tu sesion"].includes(mensajeConexionVisible) ? (
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
          {!tieneConexion ? <button
            type="button"
            className="cont2boton cont2botonprimario"
            onClick={conectarTunel}
            disabled={tieneConexion || conexion?.ocupado}
          >
            <Plug size={18} strokeWidth={2.4} aria-hidden="true" />
            Conectar
          </button> : <button
            type="button"
            className="cont2boton cont2botonsecundario"
            onClick={desconectarTunel}
            disabled={!tieneConexion || tunel.estadoTunel === "RUNNING" || tunel.medActiva}
          >
            <Power size={18} strokeWidth={2.4} aria-hidden="true" />
            Desconectar
          </button>}
        </div>
      </section>

      <div className="cont2grid">
        <RegistroMedicion {...{ ensayo, tunel, acciones, puedeOperar, comprobacionPendiente }}
          onApagarTunel={apagarTunelYDesconectar}
          onSolicitarInicio={solicitarInicioMedicion} />
        <PanelSeguridadControl
          estadoTunel={tunel}
          resumenAlarmas={resumenAlarmas(tunel.alarmas)}
          alertasRec={tunel.alarmas
            .filter((evento) => evento.nivel === "advertencia" || evento.nivel === "critica")
            .slice(0, 4)}
        />
        <PanelEstadoSistemaControl datosSistema={datosSistema(tunel, fuente)} />
      </div>

      {avisoGuardado ? (
        <p role={avisoGuardado.error ? "alert" : "status"}>
          {avisoGuardado.texto}
        </p>
      ) : null}
      <RecapMedicionControl
        resumenUlt={hayInformeMedicion ? resumen : null}
        onDescargarMed={descargarUlt}
        onBorrarMed={borrarUlt}
      />

      {confirmacionEncendido && puedeOperar && <ComprobacionPrevia
        potencia={confirmacionEncendido.potencia} medicion
        onCancelar={() => setConfirmacionEncendido(null)}
        onConfirmar={() => acciones.iniciarPrograma(confirmacionEncendido.ensayoId, { encender: true })} />}

    </div>
  );
}

export default PaginaControl;
