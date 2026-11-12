import { useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { GraficaMedicion } from "./InformeMedicion.jsx";
import { crearTrazas, numeroInforme, resumirValores } from "../../servicios/mediciones/analisisMedicion.js";

const variables = {
  velocidad: { nombre: "Velocidad del aire", campo: "velMs", unidad: "m/s" },
  caudal: { nombre: "Caudal", campo: "caudalM3s", unidad: "m³/s" },
  potencia: { nombre: "Consigna variador", campo: "potPct", unidad: "%" },
  presion: { nombre: "Presión dinámica", campo: "presionPa", unidad: "Pa" },
  temperatura: { nombre: "Temperatura", campo: "tempC", unidad: "°C" },
};
const colores = ["#075985", "#9a4510", "#73529b", "#237259"];

export default function ComparadorMediciones({ mediciones, onQuitar, onLimpiar }) {
  const [variable, setVariable] = useState("velocidad");
  const id = useId();
  const { nombre, campo, unidad } = variables[variable];
  const series = useMemo(() => mediciones.map((item, i) => ({
    id: item.clave, nombre: `${item.ensayoNombre} · ${item.medicion.nombre}`, color: colores[i],
    datos: crearTrazas(item.medicion.muestras, item.medicion.programa?.etapas)[variable],
  })), [mediciones, variable]);
  return <section className="reg2panel analisis-ui comparador-mediciones" aria-labelledby={id}>
    <div className="analisis-cabecera">
      <div className="analisis-titulo">
        <h3 id={id}>Comparador de mediciones</h3>
      </div>
      <button type="button" className="reg2boton reg2botonsecundario" onClick={onLimpiar}>Limpiar comparación</button>
    </div>
    <div className="analisis-comparador-controles">
      <div className="analisis-seccion">
        <div className="analisis-cabecera analisis-seleccion-cabecera">
          <h4>Mediciones seleccionadas</h4>
          <span className="analisis-contador">{mediciones.length} de 4</span>
        </div>
        <div className="analisis-leyenda">
          {mediciones.map((item, i) => (
            <div key={item.clave} className="analisis-serie">
              <span className="analisis-color" style={{ background: colores[i] }} aria-hidden="true" />
              <div className="analisis-serie-nombre">
                <strong>{item.medicion.nombre}</strong>
                <span>{item.ensayoNombre}</span>
              </div>
              <button type="button" className="analisis-quitar"
                onClick={() => onQuitar(item.clave)} aria-label={`Quitar ${item.medicion.nombre} del comparador`}
                title={`Quitar ${item.medicion.nombre}`}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <label className="analisis-selector">Magnitud
        <select value={variable} onChange={e => setVariable(e.target.value)}>
          {Object.entries(variables).map(([clave, v]) => <option key={clave} value={clave}>{v.nombre} ({v.unidad})</option>)}
        </select>
      </label>
    </div>
    <GraficaMedicion titulo={nombre} unidad={` ${unidad}`} series={series}
      descripcionAria="desde el inicio de cada medición, en una escala común" yDesdeCero={variable !== "temperatura"} />
    <section className="analisis-seccion" aria-label="Resumen comparativo">
      <div className="analisis-cabecera">
        <h4>Resumen comparativo</h4>
        <span className="analisis-contador">{nombre} · {unidad}</span>
      </div>
      <div className="analisis-tabla" tabIndex={0} role="region" aria-label="Estadísticas comparadas">
        <table>
          <thead>
            <tr>
              <th>Medición</th><th>Origen</th><th>Tiempo (s)</th><th>Valores válidos</th>
              <th>Media ({unidad})</th><th>Mín. ({unidad})</th><th>Máx. ({unidad})</th><th title="Desviación muestral; requiere al menos dos valores válidos">Desv. ({unidad})</th>
            </tr>
          </thead>
          <tbody>{mediciones.map((item, i) => {
            const m = item.medicion;
            const resumen = resumirValores(m.muestras.map(p => p[campo]));
            return (
              <tr key={item.clave}>
                <th scope="row">
                  <span className="analisis-fila-nombre">
                    <span className="analisis-color" style={{ background: colores[i] }} aria-hidden="true" />
                    <span>{m.nombre}<small>{item.ensayoNombre}</small></span>
                  </span>
                </th>
                <td>{m.fuente === "simulado" ? "Simulación" : m.fuente === "real" ? "Túnel físico" : "Sin documentar"}</td>
                <td>{numeroInforme(m.durSeg, 1)}</td><td>{resumen.n}</td><td>{numeroInforme(resumen.media)}</td>
                <td>{numeroInforme(resumen.minima)}</td><td>{numeroInforme(resumen.maxima)}</td><td>{numeroInforme(resumen.desviacion)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </section>
  </section>;
}
