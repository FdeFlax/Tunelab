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
import { formatearNumero } from "../servicios/formato";
import { useTunel, useConexionTunel } from "../logicaPantallas/useTunel";
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

  function solicitarInicioMedicion(datos) {
    if (!puedeOperar) return;

    setConfirmacionEncendido(datos);
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

      <table className="cont2datos" aria-label="Datos actuales del túnel">
        <thead>
          <tr><th scope="col">Consigna aplicada</th><th scope="col">Velocidad del aire</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{formatearNumero(tunel.permiteCtrl ? tunel.consignaVariadorPct : null, 2)} %</td>
            <td>{formatearNumero(tunel.permiteCtrl ? tunel.velMs : null, 2)} m/s</td>
          </tr>
        </tbody>
      </table>

      <div className="cont2grid">
        <RegistroMedicion {...{ ensayo, tunel, acciones, puedeOperar, comprobacionPendiente }}
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

      <RecapMedicionControl
        resumenUlt={hayInformeMedicion ? resumen : null}
        onDescargarMed={descargarUlt}
        onBorrarMed={borrarUlt}
      />

      {confirmacionEncendido && puedeOperar && <ComprobacionPrevia
        potencia={confirmacionEncendido.consigna} medicion
        onCancelar={() => setConfirmacionEncendido(null)}
        onConfirmar={() => acciones.iniciarMedicion(confirmacionEncendido)} />}

    </div>
  );
}

export default PaginaControl;
