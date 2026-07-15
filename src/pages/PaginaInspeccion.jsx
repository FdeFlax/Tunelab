import { useEffect, useMemo, useRef, useState } from "react";
import VisorTunel from "../components/TunnelViewer";

const GIRO_ADICIONAL_MODELO = Math.PI / 4;
const ROTACION_MODELO_INSPECCION = -0.35 + GIRO_ADICIONAL_MODELO;
const POSICION_CAMARA_INSPECCION = [7.35, 2.2, 10.95];
const OBJETIVO_CAMARA_INSPECCION = [0.65, 0.2, 0];

function rotarCoordenadaY([x, y, z], angulo) {
  const coseno = Math.cos(angulo);
  const seno = Math.sin(angulo);

  return [
    Number((x * coseno + z * seno).toFixed(2)),
    y,
    Number((-x * seno + z * coseno).toFixed(2)),
  ];
}

function rotarCamaraAlrededorDeObjetivo(camara, objetivo, angulo) {
  const [camaraX, camaraY, camaraZ] = camara;
  const [objetivoX, , objetivoZ] = objetivo;
  const coseno = Math.cos(angulo);
  const seno = Math.sin(angulo);
  const deltaX = camaraX - objetivoX;
  const deltaZ = camaraZ - objetivoZ;

  return [
    Number((objetivoX + deltaX * coseno + deltaZ * seno).toFixed(2)),
    camaraY,
    Number((objetivoZ - deltaX * seno + deltaZ * coseno).toFixed(2)),
  ];
}

const PUNTOS_TUNEL = [
  {
    id: "embocadura",
    etiqueta: "Embocadura",
    resumen: "Permite la entrada inicial del aire y lo canaliza hacia el resto del túnel.",
    descripcion:
      "Es el primer elemento de la línea aerodinámica. Su función es recoger el aire de entrada y guiarlo de forma ordenada hacia las siguientes zonas del túnel.",
    magnitudes: [],
    posicion: [-2.1, 0.7, 0],
    vista: {
      camara: [5.6, 0.66, 7.65],
      objetivo: [-2.2, 0, 0.82],
    },
    escalaVista: [1.34, 1.1, 1.42],
    giroVistaExtra: -(Math.PI / 4 + Math.PI / 18),
    desplazamientoEtiqueta: { x: "0px", y: "0px" },
  },
  {
    id: "camara-estabilizacion",
    etiqueta: "Cámara de estabilización",
    resumen: "Homogeneiza y suaviza el flujo antes de que entre en la contracción.",
    descripcion:
      "Esta zona reduce irregularidades del flujo y ayuda a que el aire llegue más uniforme a la contracción, mejorando la calidad de las mediciones posteriores.",
    magnitudes: [],
    posicion: [-1.42, 0.5, 0],
    vista: {
      camara: [1.8, 0.9, 7.2],
      objetivo: [-1.35, 0, 0.5],
    },
    desplazamientoEtiqueta: { x: "0px", y: "0px" },
  },
  {
    id: "contraccion",
    etiqueta: "Contracción",
    resumen: "Acelera progresivamente el flujo de aire y lo conduce hacia la sección de ensayo.",
    descripcion:
      "La contracción disminuye la sección de paso para aumentar la velocidad del aire de manera progresiva antes de llegar a la zona de ensayo.",
    magnitudes: [],
    posicion: [-1.25, 0.9, 0.04],
    vista: {
      camara: [3.8, 0.95, 6.4],
      objetivo: [-0.55, 0, 0.08],
    },
    desplazamientoEtiqueta: { x: "0px", y: "0px" },
  },
  {
    id: "seccion-ensayo",
    etiqueta: "Sección de ensayo",
    resumen: "Zona donde se colocan los modelos o equipos de medida y donde se realizan las pruebas.",
    descripcion:
      "Es la zona principal de trabajo del túnel. Aquí se sitúan los modelos, sensores o equipos de medida para realizar el ensayo y registrar los resultados.",
    magnitudes: [],
    posicion: [-0.08, 0.5, -0.02],
    vista: {
      camara: [4.4, 0.9, 5.7],
      objetivo: [0.82, 0, -0.02],
    },
  },
  {
    id: "difusor-adaptador",
    etiqueta: "Difusor",
    resumen: "Conecta la sección de ensayo con la zona circular de la turbomáquina, reduciendo pérdidas y adaptando la geometría.",
    descripcion:
      "Este elemento realiza la transición entre la sección rectangular de ensayo y la zona circular final, ayudando a recuperar presión y a reducir pérdidas del flujo.",
    magnitudes: [],
    posicion: [1.08, 0.58, 0.0],
    vista: {
      camara: [4.85, 2.15, 5.1],
      objetivo: [1.38, -0.15, -0.28],
    },
  },
  {
    id: "brida-conexion",
    etiqueta: "Brida",
    resumen: "Une el difusor con la turbomáquina y contribuye a reducir la transmisión de vibraciones.",
    descripcion:
      "La brida actúa como punto de unión entre el difusor-adaptador y la turbomáquina. También ayuda a mantener la alineación y a limitar vibraciones hacia el resto del conjunto.",
    magnitudes: [],
    posicion: [1.78, 0.62, -0.08],
    vista: {
      camara: [4.95, 1.35, 5.75],
      objetivo: [1.78, 0, -0.12],
    },
    desplazamientoEtiqueta: { x: "0px", y: "0px" },
  },
  {
    id: "turbomaquina",
    etiqueta: "Turbomáquina",
    resumen: "Genera el flujo de aire necesario para el funcionamiento del túnel.",
    descripcion:
      "Es el conjunto encargado de impulsar el aire por el circuito. Su funcionamiento se regula mediante el sistema de control y el variador asociado.",
    magnitudes: [],
    posicion: [2.18, 0.52, 0.02],
    vista: {
      camara: [4.9, 0.9,3.35],
      objetivo: [2.2, 0, 0.82],
    },
    giroVistaExtra: Math.PI / 4,
    desplazamientoEtiqueta: { x: "0px", y: "0px" },
  },
];

const PUNTO_VISTA_GENERAL = {
  id: "",
  etiqueta: "Vista general del túnel",
  resumen: "Selecciona una etiqueta para enfocar una zona concreta del túnel.",
  descripcion:
    "Desde la vista general puedes explorar el modelo libremente y después elegir una zona para centrar la cámara y consultar su información asociada.",
  magnitudes: [],
};

function crearVistaInspeccion(punto) {
  if (!punto?.vista) {
    return null;
  }

  const [x, y, z] = punto.vista.camara;
  const [escalaX, escalaY, escalaZ] = punto.escalaVista || [1.22, 1.1, 1.25];
  const objetivoGirado = rotarCoordenadaY(punto.vista.objetivo, GIRO_ADICIONAL_MODELO);
  const camaraEscalada = [
    Number((x * escalaX).toFixed(2)),
    Number((y * escalaY).toFixed(2)),
    Number((z * escalaZ).toFixed(2)),
  ];
  const camaraAjustada = punto.giroVistaExtra
    ? rotarCamaraAlrededorDeObjetivo(camaraEscalada, objetivoGirado, punto.giroVistaExtra)
    : camaraEscalada;

  return {
    camara: camaraAjustada,
    objetivo: objetivoGirado,
  };
}

function PaginaInspeccion() {
  const [puntoActivoId, setPuntoActivoId] = useState("");
  const [contadorReinicioVista, setContadorReinicioVista] = useState(0);
  const [mostrarReinicioVista, setMostrarReinicioVista] = useState(false);
  const [vistaCamaraActiva, setVistaCamaraActiva] = useState(null);
  const [nivelZoom, setNivelZoom] = useState(50);
  const [desplegableEtiquetasAbierto, setDesplegableEtiquetasAbierto] = useState(false);
  const selectorEtiquetasRef = useRef(null);

  const puntoActivo = useMemo(
    () =>
      PUNTOS_TUNEL.find((punto) => punto.id === puntoActivoId) || PUNTO_VISTA_GENERAL,
    [puntoActivoId]
  );
  const vistaPuntoActivo = useMemo(() => crearVistaInspeccion(puntoActivo), [puntoActivo]);

  useEffect(() => {
    function cerrarSiSeHaceClickFuera(evento) {
      if (!selectorEtiquetasRef.current?.contains(evento.target)) {
        setDesplegableEtiquetasAbierto(false);
      }
    }

    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        setDesplegableEtiquetasAbierto(false);
      }
    }

    document.addEventListener("mousedown", cerrarSiSeHaceClickFuera);
    document.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.removeEventListener("mousedown", cerrarSiSeHaceClickFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);

  function seleccionarPunto(puntoId) {
    const puntoSeleccionado = PUNTOS_TUNEL.find((punto) => punto.id === puntoId);

    setPuntoActivoId(puntoId);
    setVistaCamaraActiva(crearVistaInspeccion(puntoSeleccionado));
    setDesplegableEtiquetasAbierto(false);
  }

  function gestionarInteraccionManualModelo() {
    setMostrarReinicioVista(true);
    setPuntoActivoId("");
    setDesplegableEtiquetasAbierto(false);
  }

  function volverAVistaInicial() {
    setPuntoActivoId("");
    setVistaCamaraActiva(null);
    setNivelZoom(50);
    setMostrarReinicioVista(false);
    setContadorReinicioVista((valorActual) => valorActual + 1);
    setDesplegableEtiquetasAbierto(false);
  }

  return (
    <div className="page page--inspeccion">
      <section className="inspescena">
        <div className="inspescenafondo">
          <VisorTunel
            className="inspescenacanvas"
            vistaActiva={vistaCamaraActiva || vistaPuntoActivo}
            puntosInteres={PUNTOS_TUNEL}
            puntoActivoId={puntoActivoId}
            onSeleccionarPunto={seleccionarPunto}
            posicionCamaraInicial={POSICION_CAMARA_INSPECCION}
            objetivoCamaraInicial={OBJETIVO_CAMARA_INSPECCION}
            campoVision={42}
            distanciaMinima={7.2}
            distanciaMaxima={16.5}
            nivelZoom={nivelZoom}
            zoomHabilitado={false}
            solicitudReinicio={contadorReinicioVista}
            onCambioVistaAlterada={setMostrarReinicioVista}
            onInteraccionUsuario={gestionarInteraccionManualModelo}
            anguloPolarMinimo={0.58}
            anguloPolarMaximo={1.95}
            factorFrenado={0.22}
            dprLigeroMaximo={1}
            escalaModelo={1.58}
            rotacionModeloY={ROTACION_MODELO_INSPECCION}
            modoRendimiento="ligero"
            ocultarEtiquetasDuranteInteraccion
          />
        </div>

        <div className="inspescenazoom">
          <span className="inspescenazoometiqueta">Zoom</span>
          <span className="inspescenazoomsigno">+</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={nivelZoom}
            className="inspescenazoomslider"
            onChange={(evento) => setNivelZoom(Number(evento.target.value))}
            aria-label="Control de zoom del túnel"
          />
          <span className="inspescenazoomsigno">-</span>
        </div>

        <div className="inspescenalateral">
          <div ref={selectorEtiquetasRef} className="inspselector">
            <span className="inspselectoretiqueta">Etiquetas del túnel</span>
            <button
              type="button"
              className="inspselectorcontrol"
              onClick={() =>
                setDesplegableEtiquetasAbierto((valorActual) => !valorActual)
              }
              aria-haspopup="listbox"
              aria-expanded={desplegableEtiquetasAbierto}
            >
              <span className="inspselectorvalor">
                {puntoActivoId ? puntoActivo.etiqueta : "Selecciona una etiqueta"}
              </span>
              <span
                className={`inspselectorflecha ${
                  desplegableEtiquetasAbierto ? "inspselectorflechaabierta" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {desplegableEtiquetasAbierto ? (
              <div className="inspselectorlista" role="listbox">
                {PUNTOS_TUNEL.map((punto) => (
                  <button
                    key={punto.id}
                    type="button"
                    className={`inspselectoritem ${
                      punto.id === puntoActivoId ? "inspselectoritemactivo" : ""
                    }`}
                    onClick={() => seleccionarPunto(punto.id)}
                  >
                    {punto.etiqueta}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className={`inspreset ${
            mostrarReinicioVista ? "inspresetvisible" : ""
          }`}
          onClick={volverAVistaInicial}
        >
          Volver a la posición inicial
        </button>

        <div className="inspescenainferior">
          <article className="inspactivo">
            <div className="inspactivocabecera">
              <div>
                <h3 className="inspactivotitulo">{puntoActivo.etiqueta}</h3>
              </div>
            </div>

            <p className="inspactivoresumen">{puntoActivo.resumen}</p>
            <p className="inspactivotexto">{puntoActivo.descripcion}</p>

          </article>

          <aside className="insppuntos">
            <div className="insppuntoscabecera">
              <div>
                <h3 className="inspactivotitulo">Puntos de interés</h3>
              </div>
            </div>

            <div className="insplista">
              {PUNTOS_TUNEL.map((punto) => (
                <button
                  key={punto.id}
                  type="button"
                  className={`inspitem ${
                    punto.id === puntoActivoId ? "inspitemactivo" : ""
                  }`}
                  onClick={() => seleccionarPunto(punto.id)}
                >
                  <strong>{punto.etiqueta}</strong>
                  <span>{punto.resumen}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default PaginaInspeccion;




