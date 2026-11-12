import { useState } from "react";

const COMPROBACIONES = [
  "Interior del túnel despejado.",
  "Modelo correctamente fijado.",
  "Puertas cerradas.",
  "Tubo de Pitot alineado y sin obstrucciones.",
  "Conexiones revisadas.",
  "Parada de emergencia accesible.",
  "Personal con los EPIs necesarios.",
];

export default function ComprobacionPrevia({ potencia = 0, medicion = false, onConfirmar, onCancelar }) {
  const [comprobaciones, setComprobaciones] = useState(() => COMPROBACIONES.map(() => false));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const completas = comprobaciones.every(Boolean);

  async function confirmar() {
    if (!completas || ocupado) return;
    setOcupado(true);
    setError("");
    try {
      const resultado = await onConfirmar();
      if (resultado === false) throw new Error("No se ha podido confirmar el encendido. Revisa la conexión.");
      onCancelar();
    } catch (error) {
      setError(typeof error.detalle === "string" ? error.detalle : error.message || "No se ha podido encender el túnel.");
    } finally {
      setOcupado(false);
    }
  }

  return <div className="cont2popupfondo" role="presentation">
    <section className="cont2modal cont2modalcomprobaciones" role="dialog" aria-modal="true"
      aria-labelledby="comprobacion-titulo" aria-describedby="comprobacion-descripcion">
      <div>
        <h3 id="comprobacion-titulo">Comprobación previa</h3>
        <p id="comprobacion-descripcion" className="cont2modalintroduccion">
          Confirma presencialmente cada punto de seguridad. Ninguna comprobación sustituye a los dispositivos físicos de protección.
        </p>
      </div>
      <fieldset className="cont2checklist" disabled={ocupado}>
        <legend>Lista de comprobación</legend>
        {COMPROBACIONES.map((texto, i) => <label className="cont2checkitem" key={texto}>
          <input type="checkbox" checked={comprobaciones[i]}
            onChange={() => setComprobaciones(actual => actual.map((valor, j) => j === i ? !valor : valor))} />
          <span>{texto}</span>
        </label>)}
      </fieldset>
      <div className="cont2potenciaconfirmacion">
        <span>{medicion ? "Consigna de la primera etapa" : "Consigna al encender"}</span>
        <strong>{potencia}%</strong>
      </div>
      {error && <p className="cont2modalerror" role="alert">{error}</p>}
      <div className="cont2modalacciones">
        <button type="button" className="cont2boton cont2botonsecundario" disabled={ocupado} onClick={onCancelar}>Cancelar</button>
        <button type="button" className="cont2boton cont2botonmedicioniniciar" disabled={!completas || ocupado} onClick={confirmar}>
          {ocupado ? "Iniciando…" : medicion ? "Confirmar e iniciar medición" : "Confirmar y encender"}
        </button>
      </div>
    </section>
  </div>;
}
