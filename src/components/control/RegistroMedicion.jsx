import { useState } from "react";
import { formatearTiempoFuncionamiento as fmtTiempo, motivoBloqueoMedicion, validarMedicion } from "../../servicios/tunel/estadoTunel";

const MEDICION_INICIAL = { nombre: "", consigna: 25, duracion_segundos: 20 };

export function BotonMedicion({ tunel, puedeOperar, ocupado = "", bloqueado = true, onIniciar, onDetener, motivo }) {
  const midiendo = Boolean(tunel.medActiva);
  const texto = ocupado === "deteniendo" ? "Deteniendo…" : ocupado === "iniciando" ? "Iniciando…"
    : midiendo ? "Detener medición" : "Iniciar medición";
  return <button type="button"
    className={`cont2boton cont2accionmedicion ${midiendo ? "cont2botonmedicionparar" : "cont2botonmedicioniniciar"}`}
    disabled={Boolean(ocupado) || (midiendo ? !puedeOperar : bloqueado)}
    aria-busy={Boolean(ocupado)}
    title={midiendo ? "Detener y conservar lo registrado hasta ahora" : motivo || undefined}
    onClick={midiendo ? onDetener : onIniciar}>{texto}</button>;
}

function SelectorEnsayo({ ensayo, tunel, acciones, bloqueado = false, motivo }) {
  const ensayos = (tunel.ensayos || []).filter(e => e.apiId);
  const deshabilitado = bloqueado || Boolean(tunel.medActiva) || !ensayos.length;
  return <label className="cont2campo">
    <span>Ensayo asociado</span>
    <select value={ensayo?.id ?? ""} disabled={deshabilitado} title={motivo || undefined}
      onChange={e => {
        const seleccionado = ensayos.find(ensayo => String(ensayo.id) === e.target.value);
        if (!deshabilitado && seleccionado) acciones.activarEnsayo(seleccionado.id);
      }}>
      {!ensayo && <option value="" disabled>{ensayos.length ? "Selecciona un ensayo" : "Sin ensayos"}</option>}
      {ensayos.map(ensayo => <option key={ensayo.id} value={ensayo.id}>{ensayo.nombre}</option>)}
    </select>
  </label>;
}

export default function RegistroMedicion(props) {
  return <FormularioMedicion key={props.ensayo?.apiId ?? "sin-ensayo"} {...props} />;
}

function FormularioMedicion({ ensayo, tunel, acciones, puedeOperar, onSolicitarInicio, comprobacionPendiente }) {
  const [formulario, setFormulario] = useState(MEDICION_INICIAL);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const activo = Boolean(tunel.medActiva);
  const captura = tunel.capturaApi;
  const bloqueado = activo || Boolean(ocupado) || comprobacionPendiente || !ensayo;
  const datos = activo && captura ? {
    nombre: captura.nombre, consigna: captura.potencia_objetivo,
    duracion_segundos: captura.duracion_prevista_segundos,
  } : formulario;
  const motivo = motivoBloqueoMedicion(tunel, ensayo, puedeOperar) || validarMedicion(formulario);

  function cambiar(campo, valor) {
    setFormulario(actual => ({ ...actual, [campo]: campo === "nombre" || valor === "" ? valor : Number(valor) }));
    setError("");
  }

  function iniciar() {
    if (bloqueado || motivo) return;
    const normalizar = nombre => String(nombre || "").trim().replace(/\s+/g, " ").toLowerCase();
    if (ensayo.mediciones?.some(m => normalizar(m.nombre) === normalizar(formulario.nombre))) {
      setError("Ya existe una medición con ese nombre en este ensayo. Elige otro nombre.");
      return;
    }
    setError("");
    onSolicitarInicio({ ensayo_id: ensayo.apiId, ...formulario, nombre: formulario.nombre.trim() });
  }

  async function detener() {
    setOcupado("deteniendo");
    setError("");
    try { await acciones.detenerMedicion(); }
    catch (error) { setError(typeof error.detalle === "string" ? error.detalle : "No se pudo detener la medición. Revisa la conexión."); }
    finally { setOcupado(""); }
  }

  return <section className="cont2panel cont2registro" aria-labelledby="registro-titulo">
    <header className="cont2panelcabecera">
      <h3 id="registro-titulo">Registrar medición</h3>
    </header>
    <form className="cont2registroform" onSubmit={e => { e.preventDefault(); iniciar(); }}>
      <div className="cont2registrocampos">
        <SelectorEnsayo {...{ ensayo, tunel, acciones }} bloqueado={Boolean(ocupado) || comprobacionPendiente} />
        <label className="cont2campo"><span>Nombre de medición</span>
          <input value={datos.nombre} required maxLength={40} placeholder="Nombre de medición"
            disabled={bloqueado} onChange={e => cambiar("nombre", e.target.value)} />
        </label>
        <label className="cont2campo"><span>Consigna (%)</span>
          <input type="number" min="1" max="100" step="0.1" required value={datos.consigna ?? ""}
            disabled={bloqueado} onChange={e => cambiar("consigna", e.target.value)} />
        </label>
        <label className="cont2campo"><span>Duración (segundos)</span>
          <input type="number" min="1" max="300" step="1" required value={datos.duracion_segundos ?? ""}
            disabled={bloqueado} onChange={e => cambiar("duracion_segundos", e.target.value)} />
        </label>
      </div>
      {activo && <div className="cont2registroprogreso" role="status">
        <progress max={datos.duracion_segundos || 1} value={Math.min(tunel.medSeg || 0, datos.duracion_segundos || 1)} aria-label="Progreso de la medición" />
        <span>{fmtTiempo(tunel.medSeg || 0)} / {fmtTiempo(datos.duracion_segundos || 0)}</span>
      </div>}
      {error && <p role="alert">{error}</p>}
      <BotonMedicion {...{ tunel, puedeOperar, ocupado, motivo }}
        bloqueado={bloqueado || Boolean(motivo)} onIniciar={iniciar} onDetener={detener} />
    </form>
  </section>;
}
