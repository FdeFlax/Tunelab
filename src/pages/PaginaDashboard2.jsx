import { useEffect, useState } from "react";
import VisorTunel from "../components/TunnelViewer";
import {
  MAX_EVENTOS_ALERTA,
  MAX_EVENTOS_INFO,
  contarAlarmasActivas,
  formatearTiempoFuncionamiento,
  obtenerEnsayoActivo,
  resumirAlarmas,
} from "../servicios/tunel/estadoTunel";
import { verConexionTunelApi } from "../servicios/api/tunelConexionApi";
import { escucharEventosTunel } from "../servicios/api/tunelEventosApi";
import { useTunel } from "../servicios/tunel/useTunel";

const ARCO_MEDIDOR = "M 20 96 A 76 76 0 0 1 172 96";

const PESTANAS_SUPERVISION = [
  { id: "resumen", texto: "Resumen" },
  { id: "advertencias", texto: "Advertencias" },
  { id: "info", texto: "Info" },
];

function limitarPorcentaje(valor, maximo) {
  if (!maximo) {
    return 0;
  }

  return Math.max(0, Math.min(100, (Number(valor) / maximo) * 100));
}


function obtenerEventosDePestana(pestanaActiva, alarmas) {
  if (pestanaActiva === "advertencias") {
    return alarmas
      .filter((evento) => evento.nivel === "advertencia" || evento.nivel === "critica")
      .slice(0, MAX_EVENTOS_ALERTA);
  }

  if (pestanaActiva === "info") {
    return alarmas.filter((evento) => evento.nivel === "info").slice(0, MAX_EVENTOS_INFO);
  }

  return [];
}

function obtenerEstadoOperativo(estadoTunel, avisosActivos) {
  if (estadoTunel.bloqSeg) {
    return {
      etiqueta: "Bloqueado",
      detalle: "Revisar seguridad antes de operar",
      tono: "rojo",
    };
  }

  if (avisosActivos > 0) {
    return {
      etiqueta: "Atencion",
      detalle: resumirAlarmas(estadoTunel.alarmas),
      tono: "ambar",
    };
  }

  if (estadoTunel.medActiva) {
    return {
      etiqueta: "Midiendo",
      detalle: "Captura de datos en curso",
      tono: "verde",
    };
  }

  return {
    etiqueta: "Preparado",
    detalle: "Listo para iniciar una medicion",
    tono: "verde",
  };
}

function TarjetaPanel({ titulo, valor, detalle, tono = "azul", conAviso = false }) {
  return (
    <article className={`dash2tarjeta dash2tarjeta--${tono}`}>
      {conAviso ? <span className="dash2alertamini">!</span> : null}
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </article>
  );
}

function MedidorPanel({ titulo, valor, maximo, unidad, objetivo, tono = "azul" }) {
  const porcentaje = limitarPorcentaje(valor, maximo);

  return (
    <article className={`dash2tarjeta dash2tarjetamedidor dash2tarjeta--${tono}`}>
      <span>{titulo}</span>
      <div className="dash2medidor">
        <svg viewBox="0 -6 192 116" aria-hidden="true">
          <path className="dash2medidorfondo" d={ARCO_MEDIDOR} pathLength="100" />
          <path
            className="dash2medidorrelleno"
            d={ARCO_MEDIDOR}
            pathLength="100"
            style={{ "--dash2medidor": porcentaje }}
          />
        </svg>
        <strong>
          {valor}
          <small>{unidad}</small>
        </strong>
      </div>
      {objetivo ? <small>{objetivo}</small> : null}
    </article>
  );
}

function PanelEventos({ eventos, tipo }) {
  return (
    <section className="dash2paneleventos">
      <div className="dash2paneleventoscabecera">
        <div>
          <h4>{tipo === "advertencias" ? "Advertencias y errores criticos" : "Eventos informativos"}</h4>
        </div>
      </div>

      <div className="dash2eventoslista">
        {eventos.length ? (
          eventos.map((evento) => (
            <article className={`dash2evento dash2evento--${evento.nivel}`} key={evento.id}>
              <div>
                <strong>{evento.etiqueta}</strong>
                <span>{evento.hora}</span>
              </div>
              <p>{evento.mensaje}</p>
            </article>
          ))
        ) : (
          <div className="dash2vacio">
            <strong>Sin eventos en esta categoria</strong>
            <span>No hay registros recientes para mostrar.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function TarjetaTecnica({ titulo, valor }) {
  return (
    <article className="dash2tecnicaitem">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </article>
  );
}

function PaginaDashboard2({ onAbrirControl, onAbrirRegistro }) {
  const [mostrarVisor3d, setMostrarVisor3d] = useState(false);
  const [pestanaSupervision, setPestanaSupervision] = useState("resumen");
  const [conexionTunel, setConexionTunel] = useState(null);
  const { estadoTunel, fuenteTunel } = useTunel();
  const ensayoActivo = obtenerEnsayoActivo(estadoTunel);
  const avisosActivos = contarAlarmasActivas(estadoTunel.alarmas);
  const estadoOperativo = obtenerEstadoOperativo(estadoTunel, avisosActivos);
  const eventosVisibles = obtenerEventosDePestana(pestanaSupervision, estadoTunel.alarmas);

  useEffect(() => {
    let activo = true;

    async function cargarConexionTunel() {
      try {
        const respuesta = await verConexionTunelApi();
        if (activo) {
          setConexionTunel(respuesta);
        }
      } catch {
        if (activo) {
          setConexionTunel(null);
        }
      }
    }

    cargarConexionTunel();
    const cerrarEventosTunel = escucharEventosTunel(cargarConexionTunel);

    return () => {
      activo = false;
      cerrarEventosTunel();
    };
  }, []);
  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setMostrarVisor3d(true);
    }, 120);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, []);

  const datosContexto = [
    {
      titulo: "Modo",
      valor: estadoTunel.fuente ? estadoTunel.fuente : "Desconocido",
      tono: "azul",
    },
    {
      titulo: "Ensayo",
      valor: ensayoActivo ? ensayoActivo.nombre : "Sin ensayo activo",
      detalle: ensayoActivo ? ensayoActivo.codigo : estadoTunel.etiquetaEnsayo,
      tono: "cian",
    },
    {
      titulo: "Tiempo de funcionamiento",
      valor: formatearTiempoFuncionamiento(estadoTunel.tiempoSeg),
      tono: "azul",
    },
  ];

  const medidores = [
    {
      titulo: "Temperatura",
      valor: estadoTunel.tempC,
      maximo: 40,
      unidad: "C",
      tono: "ambar",
    },
    {
      titulo: "Velocidad del aire",
      valor: estadoTunel.velMs,
      maximo: 25,
      unidad: "m/s",
      tono: "cian",
    },
    {
      titulo: "Potencia",
      valor: estadoTunel.potPct,
      maximo: 100,
      unidad: "%",
      tono: "azul",
    },
  ];

  const datosEstado = [
    {
      titulo: "Uso del tunel",
      valor: conexionTunel?.usuario ? "Ocupado" : "Libre",
      tono: conexionTunel?.usuario ? "ambar" : "verde",
    },
    {
      titulo: "Medicion activa",
      valor: estadoTunel.medActiva ? "SI" : "NO",
      tono: estadoTunel.medActiva ? "verde" : "azul",
    },
    {
      titulo: "Alarma general",
      valor: avisosActivos ? `${avisosActivos} avisos` : "Sin avisos",
      tono: avisosActivos ? "ambar" : "verde",
      conAviso: avisosActivos > 0,
    },
  ];

  const parametrosTecnicos = [
    {
      titulo: "Frecuencia",
      valor: `${estadoTunel.frecHz} Hz`,
    },
    {
      titulo: "Corriente",
      valor: `${estadoTunel.corrA} A`,
    },
    {
      titulo: "Potencia motor",
      valor: `${estadoTunel.motorKw} kW`,
    },
    {
      titulo: "RPM",
      valor: `${estadoTunel.rpm}`,
    },
    {
      titulo: "Tiempo de funcionamiento",
      valor: formatearTiempoFuncionamiento(estadoTunel.tiempoSeg),
    },
  ];

  return (
    <div className="page page--dashboard2">
      <section className="dash2operacion">
        <article className="dash2card dash2visorcard">
          <div className="dash2seccioncabecera">
            <div>
              <h2>Dashboard del tunel de viento</h2>
            </div>
          </div>

          <div className="dash2visor">
            <div className={`dash2estadoflotante dash2estadoflotante--${estadoOperativo.tono}`}>
              <span>Estado del tunel</span>
              <strong>{estadoTunel.estadoTunel}</strong>
              <small>{estadoOperativo.detalle}</small>
            </div>

            {mostrarVisor3d ? (
              <VisorTunel className="dash2visorcanvas" modoRendimiento="ligero" />
            ) : (
              <div className="dash2visorcanvas dash2visorcanvasplaceholder" />
            )}
          </div>
        </article>

        <aside className="dash2card dash2panelprincipal">
          <div className="dash2seccioncabecera">
            <div>
              <h3>Panel principal</h3>
            </div>
          </div>

          <div className="dash2tabs">
            {PESTANAS_SUPERVISION.map((pestana) => (
              <button
                key={pestana.id}
                className={pestanaSupervision === pestana.id ? "dash2tabactivo" : ""}
                type="button"
                onClick={() => setPestanaSupervision(pestana.id)}
              >
                {pestana.texto}
                {pestana.id === "advertencias" && avisosActivos > 0 ? (
                  <span className="dash2alertamini">!</span>
                ) : null}
              </button>
            ))}
          </div>

          {pestanaSupervision === "resumen" ? (
            <div className="dash2rejillapanel">
              {datosContexto.map((dato) => (
                <TarjetaPanel key={dato.titulo} {...dato} />
              ))}

              {medidores.map((medidor) => (
                <MedidorPanel key={medidor.titulo} {...medidor} />
              ))}

              {datosEstado.map((dato) => (
                <TarjetaPanel key={dato.titulo} {...dato} />
              ))}
            </div>
          ) : (
            <PanelEventos eventos={eventosVisibles} tipo={pestanaSupervision} />
          )}

          <div className="dash2panelacciones">
            <button className="dash2boton dash2botonprimario" onClick={onAbrirControl}>
              Ir a control
            </button>
            <button className="dash2boton" onClick={onAbrirRegistro}>
              Ver registro
            </button>
          </div>
        </aside>
      </section>

      <section className="dash2card dash2tecnica">
        <div className="dash2tecnicagrid">
          {parametrosTecnicos.map((dato) => (
            <TarjetaTecnica key={dato.titulo} {...dato} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default PaginaDashboard2;















