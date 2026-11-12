import ComparadorMediciones from "../components/mediciones/ComparadorMediciones.jsx";
import { InformeMedicionComun } from "../components/mediciones/InformeMedicion";
import { AccionesRegistro, BusquedaRegistro, EstadoVacioRegistro2 } from "../components/mediciones/ControlesRegistro.jsx";
import useRegistro from "../logicaPantallas/useRegistro.js";
import { numeroInforme } from "../servicios/mediciones/analisisMedicion.js";
import { formatearTiempoFuncionamiento } from "../servicios/tunel/estadoTunel";
import { formatearFecha, formatearHora } from "../servicios/formato";

function PaginaRegistro() {
  const {
    medicionesApi, conteoMedicionesApi, setMedicionApiSeleccionadaId,
    setRevision, errorDetalle, cargandoDetalle,
    comparadas, setComparadas, puedeComparar, textoComparar,
    errorApi, archivosCargados,
    setArchivoSeleccionadoId, errorImportacion, importando,
    busquedaEnsayos, setBusquedaEnsayos, busquedaMediciones,
    setBusquedaMediciones, inputArchivoRef, ensayosApiFiltrados,
    ensayosImportadosFiltrados, medicionesApiFiltradas, apiDisponible,
    usaApi, hayEnsayosGuardados, hayEnsayosVisibles,
    ensayoApiSeleccionado, medicionApiSeleccionada, archivoSeleccionado,
    grupoArchivoSeleccionado, medicionesArchivoFiltradas, ensayoArchivoSeleccionado,
    medicionSeleccionada, seleccionarEnsayoApi, seleccionarEnsayoImportado,
    importarArchivos, limpiarArchivos, abrirSelectorArchivo,
    descargarMedicionRegistro, descargarMedicionApiRegistro, descargarMedicionImportadaRegistro,
    borrarMedicionApiRegistro, borrarMedicionImportadaRegistro, borrarMedicionRegistro,
    descargarEnsayoApiRegistro, descargarEnsayoImportadoRegistro, borrarEnsayoApiRegistro,
    borrarEnsayoImportadoRegistro, anadirAlComparador,
  } = useRegistro();

  return (
    <div className="page page--registro2">
      <section className="reg2navegador reg2navegadorarchivos">
        <input
          ref={inputArchivoRef}
          className="reg2archivooculto"
          type="file"
          accept=".json,.tunelab.json,application/json"
          multiple
          onChange={importarArchivos}
          disabled={importando}
        />

        <div className="reg2panel reg2panelensayos">
          <header className="reg2panelcabecera">
            <h3>Ensayos guardados</h3>
          </header>

          <BusquedaRegistro
            etiqueta="Buscar ensayos"
            valor={busquedaEnsayos}
            onBuscar={setBusquedaEnsayos}
            importando={importando}
            hayArchivos={archivosCargados.length > 0}
            onCargar={abrirSelectorArchivo}
            onLimpiar={limpiarArchivos}
          />

          {errorApi ? (
            <p className="reg2errorlinea">No se ha podido conectar con la base de datos.</p>
          ) : null}

          {errorImportacion ? (
            <article className="reg2evento reg2eventoerror">
              <strong>{errorImportacion}</strong>
            </article>
          ) : null}

          {hayEnsayosVisibles ? (
            <div className="reg2lista reg2listaensayos">
              <div className="lista-scroll-contenido">
                {ensayosImportadosFiltrados.map((grupo) => {
                  const esSeleccionado = !usaApi && grupo.id === grupoArchivoSeleccionado?.id;

                  return (
                    <article
                      key={"archivo-" + grupo.id}
                      className={"reg2item reg2itemensayo " + (esSeleccionado ? "reg2itemseleccionado" : "")}
                      onClick={() => seleccionarEnsayoImportado(grupo)}
                    >
                      <strong>{grupo.ensayo.nombre}</strong>
                      <span className="reg2itemfecha">
                        {grupo.ensayo.fecha || "—"} · {grupo.ensayo.hora || "—"}
                      </span>
                      <span className="reg2itemcodigo">
                        {grupo.archivos.length} {grupo.archivos.length === 1 ? "medición" : "mediciones"}
                      </span>
                      <AccionesRegistro
                        nombre="ensayo"
                        mostrarTitulo
                        onDescargar={(evento) => descargarEnsayoImportadoRegistro(evento, grupo)}
                        onBorrar={(evento) => borrarEnsayoImportadoRegistro(evento, grupo)}
                      />
                    </article>
                  );
                })}

                {apiDisponible && ensayosApiFiltrados.map((ensayo) => {
                  const esSeleccionado = usaApi && ensayo.id === ensayoApiSeleccionado?.id;
                  const totalMediciones = conteoMedicionesApi[ensayo.id] ?? ensayo.total_mediciones ?? 0;

                  return (
                    <article
                      key={"api-" + ensayo.id}
                      className={"reg2item reg2itemensayo " + (esSeleccionado ? "reg2itemseleccionado" : "")}
                      onClick={() => seleccionarEnsayoApi(ensayo.id)}
                    >
                      <strong>{ensayo.nombre}</strong>
                      <span className="reg2itemfecha">
                        {formatearFecha(ensayo.creado_en)} · {formatearHora(ensayo.creado_en)}
                      </span>
                      <span className="reg2itemcodigo">
                        {totalMediciones} {totalMediciones === 1 ? "medición" : "mediciones"}
                      </span>
                      <AccionesRegistro
                        nombre="ensayo"
                        mostrarTitulo
                        onDescargar={(evento) => descargarEnsayoApiRegistro(evento, ensayo)}
                        onBorrar={(evento) => borrarEnsayoApiRegistro(evento, ensayo)}
                      />
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <EstadoVacioRegistro2
              texto={hayEnsayosGuardados ? "No hay ensayos que coincidan con la busqueda." : "Todavia no hay ensayos guardados."}
            />
          )}
        </div>

        <div className="reg2panel reg2panelmediciones">
          <header className="reg2panelcabecera">
            <h3>Mediciones del ensayo</h3>
            {usaApi && ensayoApiSeleccionado ? (
              <span className="reg2panelcontador">
                {busquedaMediciones.trim()
                  ? `${medicionesApiFiltradas.length} de ${medicionesApi.length} mediciones`
                  : `${medicionesApi.length} mediciones`}
              </span>
            ) : null}
            {!usaApi && grupoArchivoSeleccionado ? (
              <span className="reg2panelcontador">
                {busquedaMediciones.trim()
                  ? `${medicionesArchivoFiltradas.length} de ${grupoArchivoSeleccionado.archivos.length} mediciones`
                  : `${grupoArchivoSeleccionado.archivos.length} mediciones`}
              </span>
            ) : null}
          </header>

          <BusquedaRegistro
            etiqueta="Buscar mediciones"
            valor={busquedaMediciones}
            onBuscar={setBusquedaMediciones}
            importando={importando}
            hayArchivos={archivosCargados.length > 0}
            onCargar={abrirSelectorArchivo}
            onLimpiar={limpiarArchivos}
          />

          {usaApi ? (
            ensayoApiSeleccionado ? (
              <>
                {medicionesApiFiltradas.length ? (
                  <div className="reg2lista reg2listamediciones">
                    <div className="lista-scroll-contenido">
                      {medicionesApiFiltradas.map((medicion) => {
                        const estaSeleccionada = medicion.id === medicionApiSeleccionada?.id;

                        return (
                          <article
                            key={medicion.id}
                            className={`reg2item reg2itemmedicion ${estaSeleccionada ? "reg2itemseleccionado" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setMedicionApiSeleccionadaId(medicion.id)}
                            onKeyDown={(evento) => {
                              if (evento.key === "Enter" || evento.key === " ") {
                                setMedicionApiSeleccionadaId(medicion.id);
                              }
                            }}
                          >
                            <strong>{medicion.nombre}</strong>
                            <span>{formatearFecha(medicion.creado_en)} - {formatearHora(medicion.creado_en)}</span>
                            <span>Duracion {formatearTiempoFuncionamiento(medicion.duracion_segundos || 0)}</span>
                            <span>Velocidad media {numeroInforme(medicion.velocidad_media)} m/s</span>
                            <AccionesRegistro
                              nombre={medicion.nombre}
                              etiqueta="Acciones de la medicion"
                              onDescargar={(evento) => descargarMedicionApiRegistro(evento, medicion)}
                              onBorrar={(evento) => borrarMedicionApiRegistro(evento, medicion)}
                            />
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EstadoVacioRegistro2 texto={busquedaMediciones.trim()
                    ? "No hay mediciones que coincidan con la busqueda."
                    : "Este ensayo existe, pero aun no tiene mediciones guardadas."} />
                )}
              </>
            ) : (
              <EstadoVacioRegistro2 texto="Todavia no hay mediciones guardadas en este ensayo." />
            )
          ) : grupoArchivoSeleccionado ? (
            <>
              {medicionesArchivoFiltradas.length ? (
                <div className="reg2lista reg2listamediciones">
                  <div className="lista-scroll-contenido">
                    {medicionesArchivoFiltradas.map((archivo) => {
                    const estaSeleccionada = archivo.id === archivoSeleccionado?.id;

                    return (
                      <article
                        key={archivo.id}
                        className={`reg2item reg2itemmedicion ${estaSeleccionada ? "reg2itemseleccionado" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setArchivoSeleccionadoId(archivo.id)}
                        onKeyDown={(evento) => {
                          if (evento.key === "Enter" || evento.key === " ") {
                            setArchivoSeleccionadoId(archivo.id);
                          }
                        }}
                      >
                        <strong>{archivo.medicion.nombre}</strong>
                        <span>{archivo.medicion.fecha} - {archivo.medicion.hora}</span>
                        <span>{archivo.nombreArchivo}</span>
                        <span>{archivo.medicion.totalMuestras} muestras</span>
                        <AccionesRegistro
                          nombre={archivo.medicion.nombre}
                          etiqueta="Acciones de la medicion importada"
                          onDescargar={(evento) => descargarMedicionImportadaRegistro(evento, archivo)}
                          onBorrar={(evento) => borrarMedicionImportadaRegistro(evento, archivo)}
                        />
                      </article>
                    );
                    })}
                  </div>
                </div>
              ) : (
                <EstadoVacioRegistro2 texto="No hay mediciones que coincidan con la busqueda." />
              )}
            </>
          ) : (
            <EstadoVacioRegistro2 texto="Carga archivos generados desde Control para ver sus mediciones." />
          )}
        </div>
      </section>

      <section className="reg2panel reg2paneldetalle">
        {errorDetalle && usaApi && medicionApiSeleccionada && <div role="alert">
          <p>{errorDetalle}</p>
          <button type="button" className="reg2boton reg2botonsecundario" onClick={() => setRevision(actual => actual + 1)}>Reintentar carga</button>
        </div>}
        <InformeMedicionComun
          cargando={usaApi && Boolean(medicionApiSeleccionada) && cargandoDetalle}
          onComparar={medicionSeleccionada ? anadirAlComparador : null}
          puedeComparar={puedeComparar}
          textoComparar={textoComparar}
          medicion={medicionSeleccionada}
          titulo="Informe de medición"
          onDescargar={medicionSeleccionada ? descargarMedicionRegistro : null}
          onBorrar={medicionSeleccionada ? borrarMedicionRegistro : null}
          nombreEnsayo={(usaApi ? ensayoApiSeleccionado?.nombre : ensayoArchivoSeleccionado?.nombre) || ""}
        />
      </section>
      {comparadas.length > 0 && <ComparadorMediciones mediciones={comparadas}
        onQuitar={clave => setComparadas(actual => actual.filter(item => item.clave !== clave))}
        onLimpiar={() => setComparadas([])} />}
    </div>
  );
}

export default PaginaRegistro;
