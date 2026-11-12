import { Box3, BufferAttribute, BufferGeometry, Euler, LoadingManager, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const LIMITES_GLB = {
  bytes: 20 * 1024 * 1024,
  bytesEntrada: 100 * 1024 * 1024,
  triangulos: 200000,
  vertices: 600000,
  nodos: 512
};

export function optimizarGLB(buffer) {
  const resultado = prepararGLB(buffer, LIMITES_GLB.bytesEntrada);
  return { ...resultado, bytesOriginales: buffer.byteLength, bytesPreparados: resultado.buffer.byteLength };
}

const entero = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
const exigir = (condicion, texto) => {
  if (!condicion) throw new Error(texto);
};

export function comprobarGLB(buffer, limiteEntrada = LIMITES_GLB.bytesEntrada) {
  exigir(buffer instanceof ArrayBuffer && buffer.byteLength >= 28 && buffer.byteLength <= limiteEntrada, `El GLB debe ocupar como máximo ${limiteEntrada / (1024 * 1024)} MB y contener una geometría.`);
  const view = new DataView(buffer);
  exigir(view.getUint32(0, true) === 0x46546c67 && view.getUint32(4, true) === 2, 'Selecciona un archivo GLB versión 2. No se admiten GLTF ni archivos renombrados.');
  exigir(view.getUint32(8, true) === buffer.byteLength, 'El GLB está incompleto o tiene una longitud incorrecta.');
}

// Lee el modelo completo; solo optimizarGLB descarta su apariencia.
export class CargadorGLB extends GLTFLoader {
  parse(data, path, onLoad, onError) {
    try {
      comprobarGLB(data);
    } catch (error) {
      if (onError) return onError(error);
      throw error;
    }
    return super.parse(data, path, onLoad, onError);
  }
}

export function empaquetarGLB(json, bin) {
  const texto = new TextEncoder().encode(JSON.stringify(json));
  const n = Math.ceil(texto.byteLength / 4) * 4,
    b = Math.ceil(bin.byteLength / 4) * 4;
  const salida = new ArrayBuffer(28 + n + b),
    view = new DataView(salida);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, salida.byteLength, true);
  view.setUint32(12, n, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(salida, 20, n).fill(32);
  new Uint8Array(salida, 20, texto.length).set(texto);
  view.setUint32(20 + n, b, true);
  view.setUint32(24 + n, 0x004e4942, true);
  new Uint8Array(salida, 28 + n, bin.byteLength).set(bin instanceof Uint8Array ? bin : new Uint8Array(bin));
  return salida;
}
export function prepararGLB(buffer, limiteEntrada = LIMITES_GLB.bytes) {
  comprobarGLB(buffer, limiteEntrada);
  const view = new DataView(buffer);
  let offset = 12,
    json,
    bin;
  while (offset < buffer.byteLength) {
    exigir(offset + 8 <= buffer.byteLength, 'Cabecera de bloque GLB incompleta.');
    const size = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true);
    exigir(size % 4 === 0 && offset + 8 + size <= buffer.byteLength, 'Bloque GLB inválido.');
    if (type === 0x4e4f534a) {
      exigir(!json && offset === 12 && size <= 2 * 1024 * 1024, 'La descripción del GLB es demasiado grande o inválida.');
      try {
        json = JSON.parse(new TextDecoder('utf-8', {
          fatal: true
        }).decode(new Uint8Array(buffer, offset + 8, size)));
      } catch {
        throw new Error('No se puede leer la descripción del GLB.');
      }
    } else if (type === 0x004e4942) {
      exigir(json && !bin, 'El GLB contiene bloques binarios no admitidos.');
      bin = new Uint8Array(buffer, offset + 8, size);
    } else throw new Error('El GLB contiene un bloque no admitido. Exporta como GLB estándar.');
    offset += size + 8;
  }
  exigir(json?.asset?.version === '2.0' && bin, 'Falta la geometría binaria del GLB.');
  exigir(json.buffers?.length === 1 && json.buffers[0].uri === undefined, 'Usa un GLB autónomo, con la geometría incluida en el archivo.');
  exigir(entero(json.buffers[0].byteLength, 1, bin.byteLength), 'Tamaño del buffer GLB inválido.');
  bin = bin.subarray(0, json.buffers[0].byteLength);
  const extensiones = new Set([...(json.extensionsUsed || []), ...(json.extensionsRequired || [])]);
  exigir(![...extensiones].some(e => /draco|meshopt|instancing/i.test(e)), 'Exporta el GLB sin compresión Draco/Meshopt ni instancias GPU.');
  const extensionesTextura = ['KHR_texture_transform', 'EXT_texture_webp', 'EXT_texture_avif', 'KHR_texture_basisu'];
  exigir((json.extensionsRequired || []).every(e => e === 'KHR_mesh_quantization' || e.startsWith('KHR_materials_') || extensionesTextura.includes(e)), 'El GLB requiere una extensión no admitida. Exporta una malla GLB estándar.');
  exigir(!json.skins?.length, 'Exporta el objeto como una malla estática, sin esqueleto.');
  const sourceNodes = json.nodes || [],
    sourceMeshes = json.meshes || [];
  exigir(sourceNodes.length > 0 && sourceNodes.length <= LIMITES_GLB.nodos && sourceMeshes.length <= 128, 'El archivo tiene demasiadas piezas. Exporta solo el objeto que quieras estudiar.');
  const scene = json.scenes?.[json.scene ?? 0];
  exigir(scene && Array.isArray(scene.nodes) && scene.nodes.length > 0, 'El GLB no tiene una escena visible.');
  const safe = {
    asset: {
      version: '2.0'
    },
    scene: 0,
    scenes: [{
      nodes: [...scene.nodes]
    }],
    buffers: [{
      byteLength: bin.byteLength
    }],
    bufferViews: [],
    accessors: [],
    meshes: [],
    nodes: []
  };
  if (extensiones.has('KHR_mesh_quantization')) {
    safe.extensionsUsed = ['KHR_mesh_quantization'];
    safe.extensionsRequired = ['KHR_mesh_quantization'];
  }
  const views = new Map(),
    accessors = new Map();
  function accesor(index, position) {
    const clave = `${index}/${position}`;
    if (accessors.has(clave)) return accessors.get(clave);
    const a = json.accessors?.[index],
      bv = json.bufferViews?.[a?.bufferView];
    exigir(entero(index, 0, (json.accessors?.length || 0) - 1) && a && bv && !a.sparse, 'La geometría tiene datos incompletos o dispersos. Exporta una malla estándar.');
    const bytes = {
      5120: 1,
      5121: 1,
      5122: 2,
      5123: 2,
      5125: 4,
      5126: 4
    }[a.componentType];
    exigir(bytes && a.type === (position ? 'VEC3' : 'SCALAR') && entero(a.count, 1, LIMITES_GLB.vertices), 'La geometría tiene un tamaño o formato no admitido.');
    exigir(position || [5121, 5123, 5125].includes(a.componentType) && !a.normalized, 'Índices de triángulos inválidos.');
    const start = bv.byteOffset ?? 0,
      local = a.byteOffset ?? 0;
    const item = bytes * (position ? 3 : 1),
      stride = bv.byteStride ?? item;
    exigir(bv.buffer === 0 && !bv.extensions && entero(start, 0, bin.byteLength) && entero(bv.byteLength, 1, bin.byteLength - start) && entero(local, 0, bv.byteLength) && entero(stride, item, 252) && stride % bytes === 0 && (start + local) % bytes === 0 && local + (a.count - 1) * stride + item <= bv.byteLength, 'Los datos de la malla exceden el archivo.');
    if (!views.has(a.bufferView)) {
      views.set(a.bufferView, safe.bufferViews.length);
      safe.bufferViews.push({
        buffer: 0,
        byteOffset: start,
        byteLength: bv.byteLength,
        ...(bv.byteStride ? {
          byteStride: stride
        } : {})
      });
    }
    const clean = {
      bufferView: views.get(a.bufferView),
      byteOffset: local,
      componentType: a.componentType,
      count: a.count,
      type: a.type,
      normalized: Boolean(a.normalized)
    };
    for (const key of ['min', 'max']) if (position && Array.isArray(a[key]) && a[key].length === 3 && a[key].every(Number.isFinite)) clean[key] = a[key];
    const result = safe.accessors.length;
    safe.accessors.push(clean);
    accessors.set(clave, result);
    return result;
  }
  const counts = [];
  for (const mesh of sourceMeshes) {
    exigir(Array.isArray(mesh.primitives) && mesh.primitives.length <= 128, 'La malla no tiene superficies válidas.');
    let triangles = 0;
    const primitives = mesh.primitives.map(p => {
      exigir((p.mode ?? 4) === 4 && !p.targets && !p.extensions, 'Exporta superficies trianguladas, estáticas y sin compresión.');
      const pos = accesor(p.attributes?.POSITION, true);
      const out = {
        attributes: {
          POSITION: pos
        },
        mode: 4
      };
      if (p.indices !== undefined) out.indices = accesor(p.indices, false);
      const count = safe.accessors[out.indices ?? pos].count;
      exigir(count % 3 === 0, 'Hay un triángulo incompleto en la malla.');
      triangles += count / 3;
      return out;
    });
    counts.push(triangles);
    safe.meshes.push({
      primitives
    });
  }
  for (const node of sourceNodes) {
    exigir(node.skin === undefined && !node.extensions, 'Exporta los nodos como mallas estáticas sin extensiones.');
    exigir(!node.matrix || node.translation === undefined && node.rotation === undefined && node.scale === undefined, 'El nodo mezcla dos formatos de transformación.');
    const clean = {};
    if (node.mesh !== undefined) {
      exigir(entero(node.mesh, 0, sourceMeshes.length - 1), 'Referencia a una pieza inexistente.');
      clean.mesh = node.mesh;
    }
    if (node.children !== undefined) {
      exigir(Array.isArray(node.children), 'Jerarquía de piezas inválida.');
      clean.children = [...node.children];
    }
    for (const [key, size] of [['matrix', 16], ['translation', 3], ['rotation', 4], ['scale', 3]]) {
      if (node[key] !== undefined) {
        exigir(Array.isArray(node[key]) && node[key].length === size && node[key].every(v => Number.isFinite(v) && Math.abs(v) <= 1e12), 'Transformación del objeto inválida.');
        clean[key] = [...node[key]];
      }
    }
    if (clean.rotation) exigir(Math.abs(Math.hypot(...clean.rotation) - 1) < 0.001, 'La rotación de una pieza no es válida.');
    if (clean.matrix) exigir(clean.matrix[3] === 0 && clean.matrix[7] === 0 && clean.matrix[11] === 0 && clean.matrix[15] === 1, 'La matriz de una pieza no es una transformación afín.');
    safe.nodes.push(clean);
  }
  let triangles = 0,
    pieces = 0;
  const seen = new Set();
  function visitar(id, depth) {
    exigir(entero(id, 0, safe.nodes.length - 1) && !seen.has(id) && depth < 64, 'La jerarquía contiene ciclos o piezas repetidas.');
    seen.add(id);
    const node = safe.nodes[id];
    if (node.mesh !== undefined) {
      triangles += counts[node.mesh];
      pieces++;
    }
    exigir(triangles <= LIMITES_GLB.triangulos, 'El modelo supera 200.000 triángulos. Simplifica la malla antes de importarla.');
    for (const child of node.children || []) visitar(child, depth + 1);
  }
  for (const root of scene.nodes) visitar(root, 0);
  exigir(triangles > 0, 'La escena no contiene superficies trianguladas.');

  // Copiar solo posiciones e índices, incluso cuando comparten buffer con otros atributos.
  let longitud = 0;
  const bloques = safe.accessors.map(a => {
    const origen = safe.bufferViews[a.bufferView];
    const bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    const elemento = bytes * (a.type === 'VEC3' ? 3 : 1);
    const paso = a.type === 'VEC3' ? Math.ceil(elemento / 4) * 4 : elemento;
    const inicio = longitud;
    longitud += Math.ceil(a.count * paso / 4) * 4;
    exigir(longitud <= LIMITES_GLB.bytes, 'La geometría preparada supera 20 MB. Simplifica la malla antes de importarla.');
    return { origen: origen.byteOffset + a.byteOffset, pasoOrigen: origen.byteStride || elemento, inicio, elemento, paso };
  });
  const geometria = new Uint8Array(longitud);
  safe.bufferViews = bloques.map((bloque, i) => {
    const a = safe.accessors[i], { origen, pasoOrigen, inicio, elemento, paso } = bloque;
    if (pasoOrigen === elemento && paso === elemento) {
      geometria.set(bin.subarray(origen, origen + a.count * elemento), inicio);
    } else {
      for (let k = 0; k < a.count; k++) {
        const desde = origen + k * pasoOrigen;
        geometria.set(bin.subarray(desde, desde + elemento), inicio + k * paso);
      }
    }
    a.bufferView = i;
    a.byteOffset = 0;
    return { buffer: 0, byteOffset: inicio, byteLength: a.count * paso, ...(paso !== elemento ? { byteStride: paso } : {}) };
  });
  safe.buffers[0].byteLength = geometria.byteLength;
  const resultado = empaquetarGLB(safe, geometria);
  exigir(resultado.byteLength <= LIMITES_GLB.bytes, 'La geometría preparada supera 20 MB. Simplifica la malla antes de importarla.');
  return {
    buffer: resultado,
    triangles,
    pieces,
    animationsIgnored: Boolean(json.animations?.length)
  };
}

export async function importarGLB(data) {
  let result;
  try {
    const prepared = optimizarGLB(data);
    const manager = new LoadingManager();
    manager.setURLModifier(() => {
      throw new Error('El modelo intenta cargar un recurso externo.');
    });
    result = await new CargadorGLB(manager).parseAsync(prepared.buffer, '');
    result.scene.updateMatrixWorld(true);
    const triangles = [],
      v = new Vector3();
    let count = 0;
    result.scene.traverse(node => {
      if (!node.isMesh) return;
      const geometry = node.geometry,
        pos = geometry.getAttribute('position'),
        indices = geometry.index;
      const total = indices ? indices.count : pos.count;
      const flip = node.matrixWorld.determinant() < 0;
      if (Math.abs(node.matrixWorld.determinant()) < 1e-20) throw new Error('Una pieza tiene escala cero o una transformación singular.');
      count += total / 3;
      if (count > LIMITES_GLB.triangulos) throw new Error('El modelo supera 200.000 triángulos.');
      const points = new Float32Array(total * 3);
      for (let i = 0; i < total; i++) {
        const corner = i % 3,
          slot = flip && corner ? i + (corner === 1 ? 1 : -1) : i;
        const index = indices ? indices.getX(slot) : slot;
        if (!Number.isInteger(index) || index < 0 || index >= pos.count) throw new Error('El modelo contiene un índice de vértice inválido.');
        v.fromBufferAttribute(pos, index).applyMatrix4(node.matrixWorld).toArray(points, i * 3);
      }
      triangles.push(points);
    });
    const positions = new Float32Array(count * 9);
    let offset = 0;
    for (const piece of triangles) {
      positions.set(piece, offset);
      offset += piece.length;
    }
    const analysis = analizarTriangulos(positions);
    return {
      ...analysis,
      pieces: prepared.pieces,
      bytesOriginales: prepared.bytesOriginales,
      bytesPreparados: prepared.bytesPreparados,
      animationsIgnored: prepared.animationsIgnored
    };
  } finally {
    result?.scene.traverse(node => {
      node.geometry?.dispose();
      if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());else node.material?.dispose();
    });
  }
}

export function analizarTriangulos(positions) {
  if (!(positions instanceof Float32Array) || !positions.length || positions.length % 9) throw new Error('Geometría de triángulos no válida.');
  const box = new Box3();
  const v = new Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    v.fromArray(positions, i);
    if (![v.x, v.y, v.z].every(Number.isFinite)) throw new Error('El modelo tiene coordenadas no válidas.');
    box.expandByPoint(v);
  }
  const dimensions = box.getSize(new Vector3()),
    center = box.getCenter(new Vector3());
  const longest = Math.max(...dimensions.toArray());
  if (!(longest > 1e-12) || longest > 1e12) throw new Error('El objeto no tiene un tamaño utilizable.');
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - center.x) / longest;
    positions[i + 1] = (positions[i + 1] - center.y) / longest;
    positions[i + 2] = (positions[i + 2] - center.z) / longest;
  }
  const vertices = new Map(),
    edges = new Map(),
    faces = new Set();
  let degenerate = 0,
    duplicate = 0;
  const ids = new Uint32Array(positions.length / 3);
  for (let i = 0; i < ids.length; i++) {
    const key = [0, 1, 2].map(j => Math.round(positions[i * 3 + j] * 1e6)).join(',');
    if (!vertices.has(key)) vertices.set(key, vertices.size);
    ids[i] = vertices.get(key);
  }
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  for (let i = 0; i < ids.length; i += 3) {
    const tri = [ids[i], ids[i + 1], ids[i + 2]];
    a.fromArray(positions, i * 3);
    b.fromArray(positions, (i + 1) * 3);
    c.fromArray(positions, (i + 2) * 3);
    if (new Set(tri).size < 3 || b.sub(a).cross(c.sub(a)).lengthSq() < 1e-20) {
      degenerate++;
      continue;
    }
    const face = [...tri].sort((x, y) => x - y).join('/');
    if (faces.has(face)) duplicate++;
    faces.add(face);
    for (let j = 0; j < 3; j++) {
      const from = tri[j],
        to = tri[(j + 1) % 3],
        key = `${Math.min(from, to)}/${Math.max(from, to)}`;
      const edge = edges.get(key) || {
        count: 0,
        direction: 0
      };
      edge.count++;
      edge.direction += from < to ? 1 : -1;
      edges.set(key, edge);
    }
  }
  let open = 0,
    nonManifold = 0,
    inconsistent = 0;
  for (const edge of edges.values()) {
    if (edge.count === 1) open++;else if (edge.count !== 2) nonManifold++;else if (edge.direction !== 0) inconsistent++;
  }
  return {
    positions,
    dimensions: dimensions.toArray(),
    triangles: positions.length / 9,
    open,
    nonManifold,
    inconsistent,
    degenerate,
    duplicate,
    basicClosed: !(open || nonManifold || inconsistent || degenerate || duplicate)
  };
}
export function geometriaAjustada(positions, sizeCm, angles) {
  if (!Number.isFinite(sizeCm) || sizeCm <= 0 || angles.length !== 3 || angles.some(v => !Number.isFinite(v) || Math.abs(v) > 180)) throw new Error('Tamaño u orientación fuera del intervalo permitido.');
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions.slice(), 3));
  const rotation = new Matrix4().makeRotationFromEuler(new Euler(...angles.map(v => v * Math.PI / 180), 'XYZ'));
  geometry.applyMatrix4(rotation).scale(sizeCm, sizeCm, sizeCm);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  const dimensions = geometry.boundingBox.getSize(new Vector3()).toArray();
  return {
    geometry,
    dimensions
  };
}

const numero = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2
});
const EJES = ['longitud', 'altura', 'ancho'];
export function maximoTamano(medidas, tamano, config) {
  if (!Number.isFinite(tamano) || tamano <= 0 || !Array.isArray(medidas) || medidas.length !== 3 || medidas.some(d => !Number.isFinite(d) || d < 0) || !medidas.some(d => d > 0)) return null;
  const paso = Math.min(0.5, config.pasoCm / 2), margen = Math.min(0.01, config.pasoCm / 100);
  const limite = Math.min(...medidas.map((d, i) => d === 0 ? Infinity : tamano * (config.maximosObjetoCm[i] - margen) / d));
  return Number((Math.floor(limite / paso) * paso).toFixed(8));
}
export function evaluarObjeto(objeto, config) {
  if (!objeto) return {
    motivo: 'Importa un objeto para calcular el flujo.'
  };
  if (!config) return { motivo: 'Esperando la configuración del servidor.' };
  const MINIMO_CM = config.minimoObjetoCm, maximos = config.maximosObjetoCm;
  const MARGEN_CM = Math.min(0.01, config.pasoCm / 100), paso = Math.min(0.5, config.pasoCm / 2);
  if (!objeto.cerrado) {
    const incidencias = [['open', 'bordes abiertos'], ['nonManifold', 'bordes compartidos por más de dos caras'], ['inconsistent', 'bordes con caras mal orientadas'], ['degenerate', 'triángulos sin superficie'], ['duplicate', 'caras duplicadas']].filter(([key]) => objeto.revision?.[key]).map(([key, label]) => `${numero.format(objeto.revision[key])} ${label}`);
    return {
      titulo: 'La geometría necesita revisión',
      motivo: `El archivo no supera la revisión para calcular el flujo${incidencias.length ? ': ' + incidencias.join(', ') : ''}. Exporta un sólido cerrado, sin caras repetidas y con las caras orientadas hacia fuera.`
    };
  }
  const medidas = objeto.medidas;
  if (!Array.isArray(medidas) || medidas.length !== 3 || medidas.some(d => !Number.isFinite(d) || d <= 0)) {
    return {
      titulo: 'El objeto no tiene volumen utilizable',
      motivo: 'Las tres dimensiones deben ser mayores que cero. Importa una malla con volumen.'
    };
  }
  const fuera = medidas.flatMap((d, i) => d < MINIMO_CM || d > maximos[i] ? [`${EJES[i]}: ${numero.format(d)} cm (${d < MINIMO_CM ? `mínimo ${numero.format(MINIMO_CM)}` : `máximo ${numero.format(maximos[i])}`} cm)`] : []);
  if (!fuera.length) return {
    motivo: ''
  };

  // Proponer una escala explícita, sin modificar el archivo ni deformar el objeto.
  // Un pequeño margen evita recomendar valores que float32 redondee fuera del límite.
  let ajuste = null;
  if (Number.isFinite(objeto.tamano) && objeto.tamano > 0) {
    const maximo = maximoTamano(medidas, objeto.tamano, config);
    for (let size = paso; size <= maximo; size += paso) {
      if (medidas.every((d, i) => d * size / objeto.tamano >= MINIMO_CM + MARGEN_CM && d * size / objeto.tamano <= maximos[i] - MARGEN_CM) && (ajuste === null || Math.abs(size - objeto.tamano) < Math.abs(ajuste - objeto.tamano))) ajuste = Number(size.toFixed(8));
    }
  }
  const ampliar = ajuste !== null && ajuste > objeto.tamano;
  return {
    titulo: 'Revisa el tamaño',
    motivo: ajuste === null ? 'Con estas proporciones, no hay un tamaño compatible con el cálculo actual.' : `El objeto es demasiado ${ampliar ? 'pequeño' : 'grande'} para este cálculo.`,
    detalles: `${fuera.join('; ')}. Separación entre puntos: ${numero.format(config.pasoCm)} cm. Son límites de esta configuración; cumplirlos no garantiza la precisión del resultado.`,
    notaAjuste: ajuste === null ? '' : 'Cambiará el tamaño del objeto completo, manteniendo sus proporciones.',
    accionAjuste: ajuste === null ? '' : `${ampliar ? 'Ampliar' : 'Reducir'} a ${numero.format(ajuste)} cm`,
    ajuste
  };
}
