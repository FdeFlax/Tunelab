import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { leerProgramaEtapasApi, guardarProgramaEtapasApi } from "../../servicios/api/controlApi";
import { obtenerIdEnsayoApi } from "../../servicios/api/registroApi";
import { formatearTiempoFuncionamiento as fmtTiempo, motivoBloqueoMedicion } from "../../servicios/tunel/estadoTunel";
import { crearAutoguardadoPrograma, validarPrograma } from "../../servicios/tunel/autoguardadoPrograma";

const PROGRAMA_INICIAL = {
  nombre: "",
  etapas: [{ consigna: 25, duracion_segundos: 20 }],
};
const ESTADOS = {
  borrador: "Preparado", estabilizando: "Registrando · estabilizando", registrando: "Registrando · estable",
  completado: "Completado", detenido: "Detenido", error: "Interrumpido",
};
const configuracion = programa => ({ nombre: programa.nombre.trim(), etapas: programa.etapas });
const mensajeError = error => typeof error.detalle === "string" && error.detalle
  ? error.detalle : "No se pudo completar la operación. Revisa los datos y la conexión con el servidor.";

export function BotonMedicion({ tunel, puedeOperar, ocupado = "", bloqueado = true, onIniciar, onDetener, motivo }) {
  const midiendo = Boolean(tunel.programa?.activo || tunel.medActiva);
  const texto = ocupado === "deteniendo" ? "Deteniendo…" : ocupado === "iniciando" ? "Iniciando…"
    : midiendo ? "Detener medición" : "Iniciar medición";
  return <button type="button"
    className={`cont2boton cont2accionmedicion ${midiendo ? "cont2botonmedicionparar" : "cont2botonmedicioniniciar"}`}
    disabled={Boolean(ocupado) || (midiendo ? !puedeOperar : bloqueado)}
    aria-busy={Boolean(ocupado)}
    title={midiendo ? "Detener y conservar lo registrado hasta ahora" : motivo || undefined}
    onClick={midiendo ? onDetener : onIniciar}>{texto}</button>;
}

export default function RegistroMedicion({ ensayo, tunel, acciones, puedeOperar, onSolicitarInicio, onApagarTunel, comprobacionPendiente }) {
  const ensayoId = ensayo?.apiId ?? obtenerIdEnsayoApi(ensayo?.codigo);
  return (
    <section className="cont2panel cont2programa" aria-labelledby="programa-titulo">
      {!ensayoId ? <>
        <header className="cont2panelcabecera cont2programacabecera">
          <h3 id="programa-titulo">Registrar medición</h3>
          <BotonMedicion {...{ tunel, puedeOperar }} onDetener={onApagarTunel} />
        </header>
        <p>Crea o selecciona un ensayo para registrar una medición.</p>
      </> : <EditorPrograma key={ensayoId} {...{ ensayoId, ensayo, tunel, acciones, puedeOperar, onSolicitarInicio, onApagarTunel, comprobacionPendiente }} />}
    </section>
  );
}

function EditorPrograma({ ensayoId, ensayo, tunel, acciones, puedeOperar, onSolicitarInicio, onApagarTunel, comprobacionPendiente }) {
  const [formulario, setFormulario] = useState(PROGRAMA_INICIAL);
  const [guardado, setGuardado] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const [errorGuardado, setErrorGuardado] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const autoguardado = useRef(null);

  useEffect(() => {
    let vigente = true;
    const guardador = crearAutoguardadoPrograma({
      guardar: datos => guardarProgramaEtapasApi(ensayoId, datos),
      onGuardado: respuesta => {
        setGuardado(respuesta);
        setErrorGuardado("");
        setError("");
        void acciones.sincronizar();
      },
      onError: error => setErrorGuardado(mensajeError(error)),
      onGuardando: setGuardando,
    });
    autoguardado.current = guardador;
    leerProgramaEtapasApi(ensayoId).then(programa => {
      if (!vigente) return;
      setGuardado(programa);
      setFormulario(programa ? configuracion(programa) : PROGRAMA_INICIAL);
      setCargado(true);
      setError("");
    }).catch(error => {
      if (vigente) setError(mensajeError(error));
    });
    return () => { vigente = false; void guardador.cerrar(); };
  }, [ensayoId, recarga, acciones]);

  const programa = tunel.programa?.ensayo_id === ensayoId ? tunel.programa : guardado;
  const activo = Boolean(programa?.activo);
  const capturaManual = tunel.medActiva && !tunel.programa?.activo;
  const bloqueado = !cargado || Boolean(ocupado) || comprobacionPendiente || activo || Boolean(tunel.programa?.activo) || tunel.medActiva;
  const cambios = !guardado || JSON.stringify(configuracion(formulario)) !== JSON.stringify(configuracion(guardado));
  const etapas = activo ? programa.etapas : formulario.etapas;
  const errorFormulario = validarPrograma(formulario);
  const motivoInicio = !cargado ? "Cargando las etapas guardadas…"
    : errorFormulario || motivoBloqueoMedicion(tunel, ensayo, puedeOperar);
  const indice = programa?.indice_etapa ?? 0;
  const duracionEtapa = programa?.etapas[indice]?.duracion_segundos || 0;
  const segundosRegistro = programa?.estado === "registrando"
    ? Math.min(duracionEtapa, programa.segundos_etapa) : 0;

  useEffect(() => {
    autoguardado.current?.programar(cargado && cambios && !bloqueado && !errorFormulario
      ? configuracion(formulario) : null);
  }, [cargado, cambios, bloqueado, errorFormulario, formulario]);

  function cambiarEtapa(indice, campo, valor) {
    setFormulario(actual => ({ ...actual, etapas: actual.etapas.map((etapa, i) =>
      i === indice ? { ...etapa, [campo]: valor === "" ? "" : Number(valor) } : etapa) }));
  }

  function moverEtapa(indice, desplazamiento) {
    setFormulario(actual => {
      const etapas = [...actual.etapas];
      const destino = indice + desplazamiento;
      [etapas[indice], etapas[destino]] = [etapas[destino], etapas[indice]];
      return { ...actual, etapas };
    });
  }

  async function ejecutar(operacion, tarea) {
    setOcupado(operacion);
    setError("");
    try { await tarea(); }
    catch (error) { setError(mensajeError(error)); }
    finally { setOcupado(""); }
  }

  function iniciar() {
    if (bloqueado || cambios || guardando || errorGuardado || motivoInicio) return;
    const normalizar = nombre => String(nombre || "").trim().replace(/\s+/g, " ").toLowerCase();
    const repetida = ensayo.mediciones?.some(m => normalizar(m.nombre) === normalizar(formulario.nombre));
    if (repetida) {
      setError("Ya existe una medición con ese nombre en este ensayo. Elige otro nombre.");
      return;
    }
    if (tunel.estadoTunel !== "RUNNING") {
      onSolicitarInicio({ ensayoId, potencia: formulario.etapas[0].consigna });
    } else {
      void ejecutar("iniciando", () => acciones.iniciarPrograma(ensayoId));
    }
  }

  function estadoEtapa(i) {
    if (!programa?.clave || cambios) return "";
    if (programa.estado === "completado" || i < indice) return "Guardada";
    if (activo && i === indice) return ESTADOS[programa.estado];
    if (!activo && i === indice && programa.mediciones.length) return "Registro parcial";
    return activo ? "Pendiente" : "Sin ejecutar";
  }

  return (
    <>
    <header className="cont2panelcabecera cont2programacabecera">
      <h3 id="programa-titulo">Registrar medición</h3>
      <BotonMedicion {...{ tunel, puedeOperar, ocupado }}
        bloqueado={bloqueado || cambios || guardando || Boolean(errorGuardado) || Boolean(motivoInicio)}
        motivo={(cambios || guardando) && !errorFormulario && !errorGuardado ? "Guardando cambios…" : motivoInicio}
        onIniciar={iniciar}
        onDetener={() => ejecutar("deteniendo", () => tunel.programa?.activo ? acciones.detenerPrograma() : onApagarTunel())} />
    </header>
    <form className="cont2programaform" aria-busy={guardando} onSubmit={e => { e.preventDefault(); void autoguardado.current?.guardarAhora(); }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) void autoguardado.current?.guardarAhora(); }}>
      <div className="cont2programaresumen">
        <div className="cont2programaensayo">
          <span>Ensayo asociado</span>
          <strong>{ensayo.nombre}</strong>
        </div>
        <label className="cont2campo">
          <span>Nombre de medición</span>
          <input value={activo ? programa.nombre : formulario.nombre} required maxLength={40} pattern={".*\\S.*"}
            placeholder="Nombre de medición"
            disabled={bloqueado} onChange={e => setFormulario(actual => ({ ...actual, nombre: e.target.value }))} />
        </label>
      </div>

      <fieldset className="cont2programaetapas" disabled={bloqueado}>
        <legend>Etapas en orden de ejecución</legend>
        <div className="cont2programatablaenvoltura">
          <table className="cont2programatabla">
            <thead><tr><th scope="col">#</th><th scope="col">Estado</th><th scope="col">Consigna (%)</th>
              <th scope="col">Tiempo estable (segundos)</th><th scope="col">Acciones</th></tr></thead>
            <tbody>{etapas.map((etapa, i) => (
              <tr className={activo && i === indice ? "cont2programaetapa--activa" : ""} key={i}>
                <th scope="row">{i + 1}</th>
                <td>{estadoEtapa(i) || (guardado && !cambios ? "Preparada" : "Sin guardar")}</td>
                <td><input type="number" aria-label={`Consigna etapa ${i + 1}`} min="1" max="100" step="0.1" required
                  value={etapa.consigna} onChange={e => cambiarEtapa(i, "consigna", e.target.value)} /></td>
                <td><input type="number" aria-label={`Duración etapa ${i + 1}`} min="1" max="3600" step="1" required
                  value={etapa.duracion_segundos} onChange={e => cambiarEtapa(i, "duracion_segundos", e.target.value)} /></td>
                <td><div className="cont2programaaccionesfila">
                  <button type="button" className="cont2boton cont2botonsecundario" disabled={i === 0}
                    aria-label={`Subir etapa ${i + 1}`} onClick={() => moverEtapa(i, -1)}><ArrowUp size={16} /></button>
                  <button type="button" className="cont2boton cont2botonsecundario" disabled={i === etapas.length - 1}
                    aria-label={`Bajar etapa ${i + 1}`} onClick={() => moverEtapa(i, 1)}><ArrowDown size={16} /></button>
                  <button type="button" className="cont2boton cont2botonsecundario" disabled={etapas.length === 1}
                    aria-label={`Eliminar etapa ${i + 1}`} onClick={() => setFormulario(actual => ({
                      ...actual, etapas: actual.etapas.filter((_, j) => i !== j),
                    }))}><Trash2 size={16} /></button>
                </div></td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={5} className="cont2programaanadir">
              <button type="button" disabled={bloqueado || etapas.length >= 15}
                onClick={() => setFormulario(actual => ({ ...actual, etapas: [...actual.etapas, { consigna: 50, duracion_segundos: 20 }] }))}>
                <Plus size={16} aria-hidden="true" /> Añadir etapa
              </button>
            </td></tr></tfoot>
          </table>
        </div>
      </fieldset>

      {activo && (
        <div className="cont2programaprogreso">
          <strong role="status">Etapa {indice + 1} de {etapas.length} · {ESTADOS[programa.estado]}</strong>
          {programa.estado === "registrando" ? <>
            <progress max={duracionEtapa} value={segundosRegistro} aria-label="Registro de la etapa actual" />
            <span>{fmtTiempo(segundosRegistro)} / {fmtTiempo(duracionEtapa)}</span>
          </> : <span>Registrando la transición · {programa.segundos_etapa} s</span>}
        </div>
      )}
      {!activo && programa?.clave && programa.estado !== "completado" && !cambios && <p role="status">{ESTADOS[programa.estado]}: {programa.mensaje}</p>}

      {capturaManual ? <p role="status">Medición en curso.</p> : !activo && motivoInicio && <p>{motivoInicio}</p>}
      {errorGuardado && <div role="alert">
        <p>No se han guardado los cambios. {errorGuardado}</p>
        <button type="button" className="cont2boton cont2botonsecundario" disabled={bloqueado || guardando || Boolean(errorFormulario)}
          onClick={() => {
            autoguardado.current.programar(configuracion(formulario));
            void autoguardado.current.guardarAhora();
          }}>Reintentar</button>
      </div>}
      {error && <p role="alert">{error}</p>}
      {!cargado && error && <button type="button" className="cont2boton cont2botonsecundario"
        onClick={() => setRecarga(actual => actual + 1)}>Reintentar carga</button>}
    </form>
    </>
  );
}
