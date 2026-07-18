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
    resumen: "Entrada inicial del túnel: recoge el aire y lo dirige de forma ordenada hacia la línea aerodinámica.",
    descripcion:
      "La embocadura incorpora curvas de entrada pensadas para reducir perturbaciones y turbulencias desde el inicio. Su geometría ayuda a que el flujo entre de manera uniforme antes de pasar a la cámara de estabilización.",
    datosClave: ["Entrada de aire", "Reduce perturbaciones", "Inicio del flujo"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Canaliza el aire exterior hacia el resto del túnel evitando entradas bruscas o desordenadas.",
      },
      {
        etiqueta: "Diseño",
        texto: "El perímetro está optimizado con curvas de entrada para mejorar el rendimiento aerodinámico.",
      },
      {
        etiqueta: "En inspección",
        texto: "Conviene comprobar que no haya objetos, polvo acumulado u obstrucciones en la zona de admisión.",
      },
    ],
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
      "En esta zona se estabiliza el aire que viene de la embocadura. El manual indica la presencia de un panel honeycomb, formado por celdas hexagonales, cuya función es laminar el flujo y reducir componentes transversales o turbulencias residuales.",
    datosClave: ["Honeycomb", "Flujo uniforme", "Antes de la contracción"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Suaviza el flujo para que llegue a la contracción de forma más estable y repetible.",
      },
      {
        etiqueta: "Impacto en ensayo",
        texto: "Mejora la precisión de las mediciones al reducir irregularidades antes de la sección de ensayo.",
      },
      {
        etiqueta: "En inspección",
        texto: "Debe mantenerse limpia y sin elementos que alteren el paso del aire.",
      },
    ],
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
    resumen: "Reduce progresivamente la sección de paso para acelerar el aire hacia la zona de ensayo.",
    descripcion:
      "La contracción utiliza una geometría decreciente y una curva optimizada para acelerar el flujo de forma controlada. Su objetivo es conseguir una transición eficiente hacia la sección de ensayo manteniendo un flujo homogéneo.",
    datosClave: ["Aceleración progresiva", "Transición controlada", "Menos pérdidas"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Incrementa la velocidad del aire sin introducir cambios bruscos en el flujo.",
      },
      {
        etiqueta: "Diseño",
        texto: "La curva está pensada para evitar separaciones del flujo y mantener una aceleración uniforme.",
      },
      {
        etiqueta: "En inspección",
        texto: "Es importante que sus superficies no presenten deformaciones ni obstáculos internos.",
      },
    ],
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
    resumen: "Zona principal de pruebas: aquí se colocan los modelos, sensores o equipos de medida.",
    descripcion:
      "Es el tramo donde se realizan los ensayos. Según el manual, la sección es cuadrada, de 0.6 m x 0.6 m y 1.0 m de longitud, con ventanas de policarbonato para observar el ensayo de forma clara y segura.",
    datosClave: ["0.6 x 0.6 m", "Longitud 1.0 m", "20-25 m/s aprox."],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Permite colocar el modelo de ensayo y registrar la velocidad del flujo con el sistema de medida.",
      },
      {
        etiqueta: "Velocidad",
        texto: "El manual sitúa la velocidad de trabajo de esta zona aproximadamente entre 20 y 25 m/s.",
      },
      {
        etiqueta: "Seguridad",
        texto: "Antes de medir hay que comprobar que el modelo está fijado, las puertas cerradas y el tubo de Pitot alineado.",
      },
    ],
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
    resumen: "Adapta la sección cuadrada de ensayo a la sección circular de la turbomáquina.",
    descripcion:
      "El difusor actúa como transición geométrica y como difusor del flujo. Aumenta progresivamente el área de paso para reducir la velocidad, recuperar presión y minimizar pérdidas por separación del flujo.",
    datosClave: ["Cuadrado a circular", "Recupera presión", "Reduce pérdidas"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Conecta la sección de ensayo con la brida y la turbomáquina en un único módulo compacto.",
      },
      {
        etiqueta: "Diseño",
        texto: "Su geometría evoluciona gradualmente desde una forma troncopiramidal hacia una troncocónica.",
      },
      {
        etiqueta: "En inspección",
        texto: "Debe revisarse que no haya daños, piezas sueltas o zonas que puedan alterar la transición del flujo.",
      },
    ],
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
    resumen: "Une el difusor con la turbomáquina y ayuda a mantener la integridad estructural del conjunto.",
    descripcion:
      "La brida asegura la unión entre el difusor-adaptador y la turbomáquina. También contribuye a amortiguar vibraciones generadas por la turbomáquina para que no se transmitan al resto de la instalación.",
    datosClave: ["Unión estructural", "Alineación", "Amortigua vibraciones"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Mantiene conectados y alineados los dos módulos finales del túnel.",
      },
      {
        etiqueta: "Estabilidad",
        texto: "Ayuda a que el funcionamiento sea estable y continuo durante los ensayos.",
      },
      {
        etiqueta: "En inspección",
        texto: "Conviene revisar fijaciones, alineación y ausencia de vibraciones anómalas.",
      },
    ],
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
    resumen: "Genera el caudal de aire necesario para que el túnel funcione.",
    descripcion:
      "La turbomáquina impulsa el flujo de aire y su régimen se ajusta mediante el variador de frecuencia. Esto permite modificar la velocidad del flujo de forma precisa y adaptarla al ensayo.",
    datosClave: ["Genera el flujo", "Control por variador", "Velocidad regulable"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Aporta la energía necesaria para mantener el flujo dentro de los parámetros previstos.",
      },
      {
        etiqueta: "Control",
        texto: "El variador de frecuencia regula la potencia suministrada y, con ello, la velocidad del aire.",
      },
      {
        etiqueta: "Seguridad",
        texto: "No deben manipularse sus protecciones ni introducir objetos en su entrada o salida.",
      },
    ],
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
    "Desde la vista general puedes explorar el modelo libremente y elegir una zona para centrar la cámara. La información inferior resume la función, el diseño y las comprobaciones más relevantes de cada componente.",
  datosClave: ["7 elementos", "Sección de ensayo 0.6 x 0.6 m", "Velocidad aprox. 20-25 m/s"],
  detalles: [
    {
      etiqueta: "Cómo usar esta vista",
      texto: "Pulsa una etiqueta del modelo o un punto de la lista para enfocar la cámara sobre esa parte del túnel.",
    },
    {
      etiqueta: "Objetivo",
      texto: "Relacionar visualmente cada componente con su función real dentro del flujo de aire.",
    },
  ],
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

            <div className="inspactivocuerpo">
              <p className="inspactivoresumen">{puntoActivo.resumen}</p>
              <p className="inspactivotexto">{puntoActivo.descripcion}</p>

              {puntoActivo.datosClave?.length ? (
                <div className="inspchips" aria-label="Datos clave">
                  {puntoActivo.datosClave.map((dato) => (
                    <span key={dato} className="inspchip">{dato}</span>
                  ))}
                </div>
              ) : null}

              {puntoActivo.detalles?.length ? (
                <div className="inspdetalles">
                  {puntoActivo.detalles.map((detalle) => (
                    <section key={detalle.etiqueta} className="inspdetalle">
                      <span>{detalle.etiqueta}</span>
                      <p>{detalle.texto}</p>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
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




