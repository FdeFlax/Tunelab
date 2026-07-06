import { useState } from "react";
import { Power } from "lucide-react";
import { InformeMedicionComun } from "../ResumenMedicion";

const estilosRecap = {
  tarjeta: "cont2recaptarjeta",
  tarjetaEtiqueta: "cont2recaptarjetaetiqueta",
  tarjetaValor: "cont2recaptarjetavalor",
  tarjetaApoyo: "cont2recaptarjetaapoyo",
  grafica: "cont2recapgrafica",
  graficaCabecera: "cont2recapgraficacabecera",
  graficaEtiqueta: "cont2recapgraficaetiqueta",
  graficaValor: "cont2recapgraficavalor",
  graficaObjetivo: "cont2recapgraficaobjetivo",
  graficaSvg: "cont2recapgraficasvg",
  graficaBase: "cont2recapgraficabase",
  graficaPie: "cont2recapgraficapie",
  prefijoGradiente: "cont2recap",
};

function Indicador({ etiqueta, valor, ok = false }) {
  let clase = "cont2indicador";

  if (ok) {
    clase = "cont2indicador cont2indicadorcorrecto";
  }

  return (
    <article className={clase}>
      <span className="cont2indicadoretiqueta">{etiqueta}</span>
      <strong className="cont2indicadorvalor">{valor}</strong>
    </article>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <article className="cont2campoestado">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </article>
  );
}

function CabeceraPanel({ titulo, accion = null }) {
  return (
    <header className="cont2panelcabecera">
      <div>
        <h3>{titulo}</h3>
      </div>
      {accion}
    </header>
  );
}

function Alerta({ alerta }) {
  const claseNivel = "lista-alarmas-nivel lista-alarmas-nivel--" + alerta.nivel;

  return (
    <article className="cont2alerta">
      <div>
        <span className="cont2alertahora">{alerta.hora}</span>
        <strong>{alerta.mensaje}</strong>
      </div>
      <span className={claseNivel}>{alerta.etiqueta}</span>
    </article>
  );
}

export function CabeceraControl2({ estadoTunel: tunel, ensayoActivo: ensayo, etiquetaFuente }) {
  let textoMedicion = "Detenida";
  let medicionOk = false;
  let nombreEnsayo = tunel.etiquetaEnsayo;
  const tunelOk = tunel.estadoTunel === "RUNNING";

  if (tunel.medActiva) {
    textoMedicion = "Activa";
    medicionOk = true;
  }

  if (ensayo) {
    nombreEnsayo = ensayo.nombre;
  }

  return (
    <section className="cont2cabecera">
      <div className="cont2cabeceratexto">
        <h2>Control tecnico del tunel</h2>
        <p>
          Vista alternativa para operar la instalacion, preparar mediciones y revisar
          la telemetria inmediata sin perder trazabilidad del ensayo activo.
        </p>
      </div>

      <div className="cont2cabecerapanel">
        <Indicador etiqueta="Tunel" valor={tunel.estadoTunel} ok={tunelOk} />
        <Indicador etiqueta="Medicion" valor={textoMedicion} ok={medicionOk} />
        <Indicador etiqueta="Ensayo" valor={nombreEnsayo} />
        <Indicador etiqueta="Fuente" valor={etiquetaFuente} />
      </div>
    </section>
  );
}

export function PanelManiobraControl2({
  estadoTunel: tunel,
  accionesTunel: acciones,
  consigna,
  lecturasMed,
  puedeOperar = false,
  onApagarTunel,
}) {
  const [valorPot, setValorPot] = useState(consigna.valor);

  let objetivo = Number(valorPot);
  if (!Number.isFinite(objetivo)) {
    objetivo = Number(consigna.valor || 0);
  }

  let aplicada = Number(tunel.potPct || 0);
  let progresoBarra = aplicada;

  if (progresoBarra < 0) {
    progresoBarra = 0;
  }

  if (progresoBarra > 100) {
    progresoBarra = 100;
  }

  const estiloBarra = { "--cont2progresopotencia": progresoBarra + "%" };
  const textoConsigna = objetivo + "%";
  const textoAplicada = aplicada + "% aplicada";
  const bloqueoEncender = !puedeOperar || tunel.estadoTunel === "RUNNING";
  const bloqueoApagar = !puedeOperar || tunel.estadoTunel !== "RUNNING";
  const accionApagar = onApagarTunel || acciones.apagarTunel;
  let textoControl = "Bloqueado";
  if (puedeOperar) {
    textoControl = "Habilitado";
  } else if (tunel.permiteCtrl) {
    textoControl = "Conectar primero";
  }


  const listaLecturas = lecturasMed.map((lectura) => (
    <article key={lectura.etiqueta} className="cont2lectura">
      <span>{lectura.etiqueta}</span>
      <strong>{lectura.valor}</strong>
      <small>{lectura.apoyo}</small>
    </article>
  ));

  function limitarPotencia(valor) {
    let numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
      numero = consigna.min;
    }

    if (numero < consigna.min) {
      numero = consigna.min;
    }

    if (numero > consigna.max) {
      numero = consigna.max;
    }

    return Math.round(numero);
  }

  function cambiarPotencia(evento) {
    setValorPot(evento.target.value);
  }

  function aplicarPotencia() {
    const potenciaFinal = limitarPotencia(valorPot);
    setValorPot(potenciaFinal);

    if (potenciaFinal !== Number(consigna.valor)) {
      consigna.onChange(potenciaFinal);
    }
  }

  function comprobarTecla(evento) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      aplicarPotencia();
    }
  }

  return (
    <section className="cont2panel cont2panelmaniobra">
      <CabeceraPanel
        titulo="Encender tunel"
        accion={
        <div className="cont2accionespower">
          <button
            type="button"
            className={"cont2botonpower " + (tunel.estadoTunel === "RUNNING" ? "cont2botonpowerapagado" : "cont2botonpowerencendido")}
            onClick={tunel.estadoTunel === "RUNNING" ? accionApagar : acciones.encenderTunel}
            disabled={tunel.estadoTunel === "RUNNING" ? bloqueoApagar : bloqueoEncender}
            aria-label={tunel.estadoTunel === "RUNNING" ? "Apagar tunel" : "Encender tunel"}
            title={tunel.estadoTunel === "RUNNING" ? "Apagar tunel" : "Encender tunel"}
          >
            <Power size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        }
      />

      <div className="cont2lecturas cont2lecturasmaniobra">
        {listaLecturas}
      </div>

      <div className="cont2potencia">

        <div className="cont2potenciacontrol">
          <label className="cont2potenciaentrada">
            <span>{consigna.etiqueta}</span>
            <div className="cont2potenciainputfila">
              <input
                type="number"
                min={consigna.min}
                max={consigna.max}
                step={consigna.paso}
                value={valorPot}
                onChange={cambiarPotencia}
                onKeyDown={comprobarTecla}
                onBlur={aplicarPotencia}
              />
              <small>{consigna.unidad}</small>
            </div>
          </label>

          <button
            type="button"
            className="cont2boton cont2botonsecundario"
            onClick={aplicarPotencia}
            disabled={!puedeOperar}
          >
            Aplicar
          </button>
        </div>

        <div className="cont2barrapotencia" style={estiloBarra}>
          <div className="cont2barrarelleno" />
        </div>

        <div className="cont2barraescala">
          <span>0%</span>
          <span>{textoAplicada}</span>
          <span>100%</span>
        </div>
      </div>
    </section>
  );
}
export function PanelMedicionControl2({
  estadoTunel: tunel,
  ensayoActivo: ensayo,
  puedeMed,
  puedeOperar = false,
  nombreMed,
  onCambiarNombreMed,
  onIniciarMed,
  onDetenerMed,
  iniciandoMed,
}) {
  let disponibilidad = "Esperando arranque";
  let estadoLectura = "Sin captura";
  let ensayoTexto = tunel.etiquetaEnsayo;

  if (!ensayo) {
    disponibilidad = "Prepara una ficha en Ensayo";
  }

  if (!puedeOperar) {
    disponibilidad = "Conecta el tunel antes de medir";
  }

  if (puedeMed) {
    disponibilidad = "Lista para medir";
  }

  if (tunel.medActiva) {
    estadoLectura = "Capturando datos";
  }

  if (ensayo) {
    ensayoTexto = ensayo.nombre + " (" + ensayo.codigo + ")";
  }

  const medicionEnCurso = Boolean(tunel.medActiva);
  const bloqueoInicio = !puedeMed || tunel.medActiva || iniciandoMed;
  const bloqueoParada = !puedeOperar || !tunel.medActiva;
  const bloqueoBotonMed = medicionEnCurso ? bloqueoParada : bloqueoInicio;
  let textoBotonMed = medicionEnCurso ? "Detener medicion" : "Iniciar medicion";

  if (iniciandoMed) {
    textoBotonMed = "Iniciando...";
  }

  return (
    <section className="cont2panel cont2panelmedicion">
      <CabeceraPanel titulo="Registrar medicion" />

      <div className="cont2formulariomedicion">
        <div className="cont2medicionfila">
          <label className="cont2campo">
            <span>Nombre de medicion</span>
            <input
              type="text"
              maxLength={200}
              value={nombreMed}
              placeholder="Ej. Barrido 70%"
              onChange={(evento) => onCambiarNombreMed(evento.target.value)}
              disabled={bloqueoInicio}
            />
          </label>

          <button
            type="button"
            className={"cont2boton cont2botonmedicion " + (medicionEnCurso ? "cont2botonmedicionparar" : "cont2botonmedicioniniciar")}
            onClick={medicionEnCurso ? onDetenerMed : onIniciarMed}
            disabled={bloqueoBotonMed}
          >
            {textoBotonMed}
          </button>
        </div>
      </div>

      <div className="cont2lineasestado">
        <Dato etiqueta="Estado de lectura" valor={estadoLectura} />
        <Dato etiqueta="Disponibilidad" valor={disponibilidad} />
        <Dato etiqueta="Ensayo asociado" valor={ensayoTexto} />
      </div>
    </section>
  );
}

export function PanelSeguridadControl2({ estadoTunel: tunel, resumenAlarmas, alertasRec }) {
  let textoInterbloqueo = "Libre para operar";
  let contenidoAlertas = (
    <article className="cont2alerta cont2alertavacia">
      <strong>No hay advertencias ni errores criticos activos.</strong>
    </article>
  );

  if (tunel.bloqSeg) {
    textoInterbloqueo = "Revisar sistema";
  }

  if (alertasRec.length > 0) {
    contenidoAlertas = alertasRec.map((alerta) => (
      <Alerta key={alerta.id} alerta={alerta} />
    ));
  }

  return (
    <section className="cont2panel cont2panelseguridad">
      <CabeceraPanel titulo="Seguridad" />

      <div className="cont2seguridadresumen">
        <Dato etiqueta="Resumen general" valor={resumenAlarmas} />
        <Dato etiqueta="Interbloqueo" valor={textoInterbloqueo} />
      </div>

      <div className="cont2alertas">{contenidoAlertas}</div>
    </section>
  );
}

export function PanelEstadoSistemaControl2({ datosSistema }) {
  const listaDatos = datosSistema.map((dato) => (
    <Dato key={dato.etiqueta} etiqueta={dato.etiqueta} valor={dato.valor} />
  ));

  return (
    <section className="cont2panel cont2panelestado">
      <CabeceraPanel titulo="Diagnostico" />

      <div className="cont2tablasistema">{listaDatos}</div>
    </section>
  );
}

export function RecapMedicionControl2({ resumenUlt: resumen, tarjetas, onDescargarMed, onBorrarMed }) {
  const totalMuestras = Number(resumen?.totalMuestras || resumen?.muestras?.length || 0);

  if (!resumen || totalMuestras <= 0) {
    return null;
  }

  const medicionInforme = {
    ...resumen,
    nombre: resumen.nombre || "Ultima medicion",
    objVelMs: resumen.velocidad?.objetivo,
    objPotPct: resumen.potencia?.objetivo,
  };

  return (
    <section className="cont2panel cont2panelrecap">
      <InformeMedicionComun
        medicion={medicionInforme}
        tarjetas={tarjetas}
        estilos={estilosRecap}
        titulo="Informe de medicion"
        subtitulo={resumen.nombre ? `${resumen.nombre} - ${resumen.horaFin}` : `Finalizada ${resumen.horaFin}`}
        onDescargar={onDescargarMed}
        onBorrar={onBorrarMed}
        nombreEnsayo={resumen.ensayoNombre || resumen.nombreEnsayo || "Ensayo activo"}
      />
    </section>
  );
}








