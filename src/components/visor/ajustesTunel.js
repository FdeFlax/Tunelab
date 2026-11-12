// Ajustes del dibujo GLB: no representan dimensiones físicas del túnel.
export const VISUAL = {
  "visor": {
    "posicionCamaraInicial": [5.8, 1.9, 8.2],
    "objetivoCamaraInicial": [0, 0.2, 0],
    "campoVision": 34,
    "distanciaMinima": 4.5,
    "distanciaMaxima": 11,
    "anguloPolarMinimo": 0.85,
    "anguloPolarMaximo": 1.6,
    "velocidadRotacion": 0.85,
    "factorFrenado": 0.08,
    "rotacionModeloY": -0.35,
    "escalaModelo": 1.15,
    "desplazamientoModelo": [0, -0.55, 0]
  },
  "dashboard": {
    "escalaModelo": 1.28
  },
  "inspeccion": {
    "posicionCamaraInicial": [6, 1.8, 8.75],
    "objetivoCamaraInicial": [0.65, 0.2, 0],
    "campoVision": 42,
    "distanciaMinima": 6.2,
    "distanciaMaxima": 16.5,
    "anguloPolarMinimo": 0.58,
    "anguloPolarMaximo": 1.95,
    "factorFrenado": 0.1,
    "escalaModelo": 1.76,
    "giroAdicionalModelo": 0.7853981633974483,
    "escalaVistaPorDefecto": [1.22, 1.1, 1.25]
  },
  "puntosInspeccion": {
    "embocadura": {
      "posicion": [-2.1, 0.7, 0],
      "vista": {
        "camara": [5.6, 0.66, 7.65],
        "objetivo": [-2.2, 0, 0.82]
      },
      "escalaVista": [1.34, 1.1, 1.42],
      "giroVistaExtra": -0.9599310885968813
    },
    "camara-estabilizacion": {
      "posicion": [-1.42, 0.5, 0],
      "vista": {
        "camara": [1.8, 0.9, 7.2],
        "objetivo": [-1.35, 0, 0.5]
      }
    },
    "contraccion": {
      "posicion": [-1.25, 0.9, 0.04],
      "vista": {
        "camara": [3.8, 0.95, 6.4],
        "objetivo": [-0.55, 0, 0.08]
      }
    },
    "seccion-ensayo": {
      "posicion": [-0.08, 0.5, -0.02],
      "vista": {
        "camara": [4.4, 0.9, 5.7],
        "objetivo": [0.82, 0, -0.02]
      }
    },
    "difusor-adaptador": {
      "posicion": [1.08, 0.58, 0],
      "vista": {
        "camara": [4.85, 2.15, 5.1],
        "objetivo": [1.38, -0.15, -0.28]
      }
    },
    "brida-conexion": {
      "posicion": [1.78, 0.62, -0.08],
      "vista": {
        "camara": [4.95, 1.35, 5.75],
        "objetivo": [1.78, 0, -0.12]
      }
    },
    "turbomaquina": {
      "posicion": [2.18, 0.52, 0.02],
      "vista": {
        "camara": [4.9, 0.9, 3.35],
        "objetivo": [2.2, 0, 0.82]
      },
      "giroVistaExtra": 0.7853981633974483
    }
  }
};

export function parametrosVisor(visual, vista = 'visor') {
  const { giroAdicionalModelo = 0, escalaVistaPorDefecto: _escala, ...opciones } = {
    ...visual.visor, ...visual[vista],
  };
  return { ...opciones, rotacionModeloY: opciones.rotacionModeloY + giroAdicionalModelo };
}

export const VISTAS_TUNEL = Object.fromEntries(
  ['visor', 'dashboard', 'inspeccion'].map(vista => [vista, parametrosVisor(VISUAL, vista)])
);
