import { InformeMedicionComun } from "../mediciones/InformeMedicion";


function Dato({ etiqueta, valor }) {
  return (
    <article className="cont2campoestado">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </article>
  );
}

function CabeceraPanel({ titulo }) {
  return (
    <header className="cont2panelcabecera">
      <div className="cont2paneltitulo">
        <div>
          <h3>{titulo}</h3>
        </div>
      </div>
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

export function PanelSeguridadControl({ estadoTunel: tunel, resumenAlarmas, alertasRec }) {
  let textoInterbloqueo = "Libre para operar";
  let contenidoAlertas = null;

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
      <CabeceraPanel
        titulo="Seguridad"
      />

      <div className="cont2seguridadresumen">
        <Dato etiqueta="Seguridad general" valor={resumenAlarmas} />
        <Dato etiqueta="Interbloqueo" valor={textoInterbloqueo} />
      </div>

      {contenidoAlertas && <div className="cont2alertas">{contenidoAlertas}</div>}
    </section>
  );
}

export function PanelEstadoSistemaControl({ datosSistema }) {
  const listaDatos = datosSistema.map((dato) => (
    <Dato key={dato.etiqueta} etiqueta={dato.etiqueta} valor={dato.valor} />
  ));

  return (
    <section className="cont2panel cont2panelestado">
      <CabeceraPanel
        titulo="Diagnóstico"
      />

      <div className="cont2tablasistema">{listaDatos}</div>
    </section>
  );
}

export function RecapMedicionControl({ resumenUlt: resumen, onDescargarMed, onBorrarMed }) {
  const totalMuestras = Number(resumen?.totalMuestras || resumen?.muestras?.length || 0);

  if (!resumen || totalMuestras <= 0) {
    return null;
  }

  const medicionInforme = {
    ...resumen,
    nombre: resumen.nombre || "Ultima medicion",
    objVelMs: resumen.objVelMs ?? resumen.velocidad?.objetivo,
    objPotPct: resumen.objPotPct ?? resumen.potencia?.objetivo,
  };

  return (
    <section className="cont2panel cont2panelrecap">
      <InformeMedicionComun
        medicion={medicionInforme}
        titulo="Informe de medición"
        onDescargar={onDescargarMed}
        onBorrar={onBorrarMed}
        nombreEnsayo={resumen.ensayoNombre || resumen.nombreEnsayo || ""}
      />
    </section>
  );
}
