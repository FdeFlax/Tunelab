import { Download, Trash2 } from "lucide-react";

function formatearNumero(valor, unidad = "", decimales = 1) {
  const numero = Number(valor || 0);
  return numero.toFixed(decimales) + unidad;
}

function redondearTick(valor) {
  return Number(Number(valor).toFixed(6));
}

function pasoBonito(rango, divisiones) {
  const pasoBase = rango / Math.max(divisiones, 1);
  const exponente = Math.floor(Math.log10(pasoBase));
  const escala = 10 ** exponente;
  const normalizado = pasoBase / escala;

  if (normalizado <= 1) {
    return escala;
  }

  if (normalizado <= 2) {
    return 2 * escala;
  }

  if (normalizado <= 5) {
    return 5 * escala;
  }

  return 10 * escala;
}

function crearEscalaRedonda(minimo, maximo, divisiones = 4) {
  let min = Number(minimo);
  let max = Number(maximo);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const rango = Math.max(max - min, 0.1);
  const paso = pasoBonito(rango, divisiones);
  const inicio = Math.floor(min / paso) * paso;
  const fin = Math.ceil(max / paso) * paso;
  const ticks = [];

  for (let valor = inicio; valor <= fin + paso / 2; valor += paso) {
    ticks.push(redondearTick(valor));
  }

  return {
    inicio: redondearTick(inicio),
    fin: redondearTick(fin),
    ticks,
  };
}

function crearTicks(minimo, maximo, cantidad = 4) {
  return crearEscalaRedonda(minimo, maximo, cantidad - 1).ticks;
}

function calcularMedia(datos) {
  if (!Array.isArray(datos) || datos.length === 0) {
    return 0;
  }

  let suma = 0;
  datos.forEach((dato) => {
    suma += Number(dato.valor || 0);
  });

  return suma / datos.length;
}


function formatearTick(valor) {
  const numero = Number(valor);

  if (Math.abs(numero - Math.round(numero)) < 0.001) {
    return String(Math.round(numero));
  }

  if (Math.abs(numero * 10 - Math.round(numero * 10)) < 0.001) {
    return numero.toFixed(1);
  }

  return numero.toFixed(2);
}

function prepararDatosGraficaDesdeCero(datos) {
  if (!Array.isArray(datos) || datos.length === 0) {
    return [];
  }

  return [
    { segundo: 0, valor: 0 },
    ...datos.map((dato, indice) => {
      const segundoOriginal = Number(dato.segundo ?? indice + 1);
      const segundo = Number.isFinite(segundoOriginal) && segundoOriginal > 0 ? segundoOriginal : indice + 1;

      return {
        ...dato,
        segundo,
      };
    }),
  ];
}

function construirPuntosGrafica(datos, ancho, alto, margen, objetivo, yDesdeCero = false) {
  const valores = datos.map((dato) => Number(dato.valor || 0));

  if (!valores.length) {
    return {
      puntos: [],
      linea: "",
      minimo: 0,
      maximo: 0,
      yMin: 0,
      yMax: 1,
      xMin: 0,
      xMax: 1,
      yTicks: crearTicks(0, 1, 4),
      xTicks: crearTicks(0, 1, 3),
    };
  }

  const tiempos = datos.map((dato, indice) => Number(dato.segundo ?? indice));
  const valoresConObjetivo = [...valores];
  if (objetivo !== null && objetivo !== undefined) {
    valoresConObjetivo.push(Number(objetivo));
  }

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const brutoMin = Math.min(...valoresConObjetivo);
  const brutoMax = Math.max(...valoresConObjetivo);
  const rangoBruto = Math.max(brutoMax - brutoMin, 0.1);
  const margenY = rangoBruto * 0.12;
  const inicioEscalaY = yDesdeCero ? 0 : brutoMin - margenY;
  const escalaY = crearEscalaRedonda(inicioEscalaY, brutoMax + margenY, 3);
  const yMin = yDesdeCero ? 0 : escalaY.inicio;
  const yMax = escalaY.fin;
  const xMin = 0;
  const xMax = Math.max(...tiempos, 1);
  const rangoX = Math.max(xMax - xMin, 1);
  const rangoY = Math.max(yMax - yMin, 0.1);
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;

  function calcularX(segundo) {
    return margen.izquierda + ((segundo - xMin) / rangoX) * anchoUtil;
  }

  function calcularY(valor) {
    return margen.arriba + (1 - (valor - yMin) / rangoY) * altoUtil;
  }

  const puntos = datos.map((dato, indice) => {
    const segundo = Number(dato.segundo ?? indice);
    const valor = Number(dato.valor || 0);

    return {
      x: Number(calcularX(segundo).toFixed(2)),
      y: Number(calcularY(valor).toFixed(2)),
      segundo,
      valor,
    };
  });

  const linea = puntos
    .map((punto, indice) => {
      const orden = indice === 0 ? "M" : "L";
      return orden + " " + punto.x + " " + punto.y;
    })
    .join(" ");

  return {
    puntos,
    linea,
    minimo,
    maximo,
    yMin,
    yMax,
    xMin,
    xMax,
    yTicks: escalaY.ticks,
    xTicks: crearTicks(xMin, xMax, 3),
    calcularX,
    calcularY,
  };
}

export function TarjetaResumenMedicion({ etiqueta, valor, apoyo, estilos }) {
  return (
    <article className={estilos.tarjeta}>
      <span className={estilos.tarjetaEtiqueta}>{etiqueta}</span>
      <strong className={estilos.tarjetaValor}>{valor}</strong>
      <span className={estilos.tarjetaApoyo}>{apoyo}</span>
    </article>
  );
}

export function GraficaMedicion({
  titulo,
  color,
  unidad,
  objetivo,
  datos,
  estilos,
  descripcionAria = "durante la medicion",
  yDesdeCero = false,
}) {
  const ancho = 420;
  const alto = 220;
  const margen = { izquierda: 46, derecha: 18, arriba: 18, abajo: 34 };

  let datosGrafica = [];
  if (Array.isArray(datos)) {
    datosGrafica = datos;
  }

  const datosLinea = prepararDatosGraficaDesdeCero(datosGrafica);
  const puntosGrafica = construirPuntosGrafica(datosLinea, ancho, alto, margen, objetivo, yDesdeCero);
  const minimo = puntosGrafica.minimo;
  const maximo = puntosGrafica.maximo;
  const yTicks = puntosGrafica.yTicks;
  const xTicks = puntosGrafica.xTicks;
  const puntos = puntosGrafica.puntos;

  const valorMedio = calcularMedia(datosGrafica);

  const idTitulo = String(titulo || "grafica").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const vistaSvg = "0 0 " + ancho + " " + alto;
  const etiquetaAria = titulo + " " + descripcionAria;
  const xEje = margen.izquierda;
  const yEje = alto - margen.abajo;
  const xFinal = ancho - margen.derecha;
  const yFinal = margen.arriba;
  const valorActual = formatearNumero(valorMedio, unidad);
  const textoMinimo = formatearNumero(minimo, unidad);
  const textoMaximo = formatearNumero(maximo, unidad);
  const textoMuestras = datosGrafica.length + " muestras";
  const lineaMedicion = puntosGrafica.linea;
  const puntoUnico = puntos.length === 1 ? puntos[0] : null;

  const bloqueObjetivo = null;
  const lineaObjetivo = null;

  return (
    <article className={estilos.grafica + " grafmed"}>
      <div className={estilos.graficaCabecera}>
        <div>
          <span className={estilos.graficaEtiqueta}>{titulo}</span>
          <strong className={estilos.graficaValor}>{valorActual}</strong>
        </div>
        {bloqueObjetivo}
      </div>

      <svg
        className={estilos.graficaSvg + " grafmedsvg"}
        viewBox={vistaSvg}
        role="img"
        aria-label={etiquetaAria}
      >
<g className="grafmedejes">
          <line x1={xEje} x2={xEje} y1={yFinal} y2={yEje} />
          <line x1={xEje} x2={xFinal} y1={yEje} y2={yEje} />
        </g>

        <g className="grafmedticks">
          {yTicks.map((tick) => {
            const y = puntosGrafica.calcularY ? puntosGrafica.calcularY(tick) : yEje;
            return (
              <text key={idTitulo + "-yt-" + tick} x={xEje - 8} y={y + 4} textAnchor="end">
                {formatearTick(tick)}
              </text>
            );
          })}
          {xTicks.map((tick) => {
            const x = puntosGrafica.calcularX ? puntosGrafica.calcularX(tick) : xEje;
            return (
              <text key={idTitulo + "-xt-" + tick} x={x} y={alto - 10} textAnchor="middle">
                {Number(tick).toFixed(0)}s
              </text>
            );
          })}
        </g>

        {lineaObjetivo}
        {lineaMedicion ? (
          <path className="grafmedlinea" d={lineaMedicion} stroke={color}>
            <title>{titulo + " | media " + valorActual}</title>
          </path>
        ) : null}
        {puntoUnico ? (
          <line
            className="grafmedlinea grafmedlineaunica"
            x1={Math.max(xEje, puntoUnico.x - 8)}
            x2={Math.min(xFinal, puntoUnico.x + 8)}
            y1={puntoUnico.y}
            y2={puntoUnico.y}
            stroke={color}
          >
            <title>{puntoUnico.segundo + " s | " + formatearNumero(puntoUnico.valor, unidad)}</title>
          </line>
        ) : null}
      </svg>

      <div className={estilos.graficaPie}>
        <span>
          Min {textoMinimo} | Max {textoMaximo}
        </span>
        <span>{textoMuestras}</span>
      </div>
    </article>
  );
}








function TablaMuestrasComun({ muestras }) {
  return (
    <div className="reg2tablamuestras informemedtabla">
      <table>
        <thead>
          <tr>
            <th>T (s)</th>
            <th>Velocidad (m/s)</th>
            <th>Caudal (m³/s)</th>
            <th>Consigna (%)</th>
            <th>Presion dinamica (Pa)</th>
            <th>Hz</th>
            <th>A</th>
            <th>RPM</th>
          </tr>
        </thead>
        <tbody>
          {muestras.map((muestra, indice) => (
            <tr key={muestra.id || indice}>
              <td>{muestra.segundo ?? indice}</td>
              <td>{muestra.velMs}</td>
              <td>{muestra.caudalM3s ?? "-"}</td>
              <td>{muestra.potPct}</td>
              <td>{muestra.presionPa ?? "-"}</td>
              <td>{muestra.frecHz ?? "-"}</td>
              <td>{muestra.corrA ?? "-"}</td>
              <td>{muestra.rpm ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventoMedicionComun({ evento }) {
  const etiqueta = evento.etiqueta || evento.tipo || evento.nivel || "Info";
  const hora = evento.hora || evento.creado_en || "--";
  const mensaje = evento.mensaje || "Evento registrado";

  return (
    <article className="reg2evento">
      <div>
        <span>{hora}</span>
        <strong>{mensaje}</strong>
      </div>
      <span className={`lista-alarmas-nivel lista-alarmas-nivel--${evento.nivel || "info"}`}>
        {etiqueta}
      </span>
    </article>
  );
}

export function InformeMedicionComun({
  medicion,
  estilos,
  titulo = "Informe de medicion",
  subtitulo = "",
  cargando = false,
  textoCargando = "Cargando datos de la medicion...",
  textoVacio = "Selecciona una medicion para ver resumen, graficas, tabla y eventos.",
  onDescargar,
  onBorrar,
  onCerrar,
  nombreEnsayo = "",
}) {
  if (cargando) {
    return (
      <section className="reg2detalle informemed">
        <article className="reg2evento reg2eventovacio">
          <strong>{textoCargando}</strong>
        </article>
      </section>
    );
  }

  if (!medicion) {
    return (
      <section className="reg2detalle informemed">
        <article className="reg2evento reg2eventovacio">
          <strong>{textoVacio}</strong>
        </article>
      </section>
    );
  }

  const muestras = medicion.muestras || [];
  const eventos = medicion.eventos || [];
  const trazas = medicion.trazas || {};
  const textoEventos = eventos.length ? `${eventos.length} eventos` : "Sin incidencias";

  return (
    <section className="reg2detalle informemed">
      <header className="informemedcabecera">
        <div>
          <h3>{titulo}</h3>
          {subtitulo ? <p>{subtitulo}</p> : null}
        </div>
        <div className="informemedacciones">
          {onDescargar ? (
            <button type="button" className="reg2boton reg2botonprimario botondescargar" onClick={onDescargar} aria-label="Descargar medicion" title="Descargar medicion">
              <Download size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
          {onBorrar ? (
            <button type="button" className="reg2boton reg2botonpeligro botonborrar" onClick={onBorrar} aria-label="Borrar medicion" title="Borrar medicion">
              <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
          {onCerrar ? (
            <button type="button" className="reg2boton reg2botonsecundario" onClick={onCerrar}>
              Ocultar
            </button>
          ) : null}
        </div>
      </header>

      <table className="informemedresumentabla">
        <thead>
          <tr>
            <th>Nombre de ensayo</th>
            <th>Nombre de medicion</th>
            <th>Duracion</th>
            <th>Numero de muestras</th>
            <th>Numero de incidencias</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{nombreEnsayo || "--"}</td>
            <td>{medicion.nombre || subtitulo || "--"}</td>
            <td>{medicion.duracion || medicion.duracionTexto || (medicion.durSeg !== undefined ? medicion.durSeg + " s" : "--")}</td>
            <td>{muestras.length}</td>
            <td>{eventos.length}</td>
          </tr>
        </tbody>
      </table>

      <div className="reg2graficasgrid">
        <GraficaMedicion
          titulo="Velocidad del aire"
          color="var(--primary)"
          unidad=" m/s"
          objetivo={medicion.objVelMs}
          datos={trazas.velocidad || []}
          estilos={estilos}
          yDesdeCero
        />
        <GraficaMedicion
          titulo="Caudal"
          color="#0f6b8d"
          unidad=" m³/s"
          objetivo={null}
          datos={trazas.caudal || []}
          estilos={estilos}
          yDesdeCero
        />
        <GraficaMedicion
          titulo="Consigna variador"
          color="#82d15f"
          unidad="%"
          objetivo={medicion.objPotPct}
          datos={trazas.potencia || []}
          estilos={estilos}
          yDesdeCero
        />
      </div>

      <div className="reg2eventos">
        <div className="reg2bloquetitulo">
          <span>Tabla de muestras</span>
          <small>{muestras.length} filas</small>
        </div>
        <TablaMuestrasComun muestras={muestras} />
      </div>

      <div className="reg2eventos">
        <div className="reg2bloquetitulo">
          <span>Incidencias de la medicion</span>
          <small>{textoEventos}</small>
        </div>
        <div className="reg2eventoslista">
          {eventos.length ? (
            eventos.map((evento, indice) => <EventoMedicionComun key={evento.id || indice} evento={evento} />)
          ) : (
            <article className="reg2evento reg2eventovacio">
              <strong>Esta medicion termino sin incidencias registradas.</strong>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}



















