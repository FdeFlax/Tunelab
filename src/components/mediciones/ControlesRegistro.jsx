import { Download, Trash2 } from "lucide-react";

export function EstadoVacioRegistro2({ texto }) {
  return (
    <article className="reg2vacio">
      <p>{texto}</p>
    </article>
  );
}

export function BusquedaRegistro({ etiqueta, valor, onBuscar, importando, hayArchivos, onCargar, onLimpiar }) {
  return (
    <div className="reg2importador">
      <input
        className="reg2buscar"
        type="search"
        value={valor}
        onChange={(evento) => onBuscar(evento.target.value)}
        placeholder={`${etiqueta}...`}
        aria-label={etiqueta}
      />
      <button type="button" className="reg2boton reg2botonsecundario" onClick={onCargar} disabled={importando}>
        {importando ? "Importando..." : "Cargar archivo"}
      </button>
      {hayArchivos ? (
        <button type="button" className="reg2boton reg2botonsecundario" onClick={onLimpiar}>
          Limpiar archivos
        </button>
      ) : null}
      <small className="reg2importadorayuda">Cargar mediciones descargadas</small>
    </div>
  );
}

export function AccionesRegistro({ nombre, etiqueta, mostrarTitulo = false, onDescargar, onBorrar }) {
  return (
    <div className="reg2itemacciones" aria-label={etiqueta}>
      <button
        type="button"
        className="reg2boton reg2botonsecundario botondescargar"
        onClick={onDescargar}
        aria-label={`Descargar ${nombre}`}
        title={mostrarTitulo ? `Descargar ${nombre}` : undefined}
      >
        <Download size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="reg2boton reg2botonpeligro botonborrar"
        onClick={onBorrar}
        aria-label={`Borrar ${nombre}`}
        title={mostrarTitulo ? `Borrar ${nombre}` : undefined}
      >
        <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
