import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { CargadorGLB } from '../../servicios/modelos3d.js';
import { Vector3 } from 'three';
import CONFIGURACION_TUNEL from '../../../shared/tunel.json';
import { VISTAS_TUNEL } from './ajustesTunel.js';

const MODELO_GLB = CONFIGURACION_TUNEL.modeloGlb;
const VISTA = VISTAS_TUNEL.visor;
useLoader.preload(CargadorGLB, MODELO_GLB);

function Etiqueta3D({ posicion, children }) {
  const grupo = useRef(null);
  const raiz = useRef(null);
  const etiqueta = useRef(null);
  const { gl } = useThree();
  const [mundo, pantalla, camara] = useMemo(() => [new Vector3(), new Vector3(), new Vector3()], []);

  useLayoutEffect(() => {
    const elemento = document.createElement('div');
    const contenido = createRoot(elemento);
    etiqueta.current = elemento;
    raiz.current = contenido;
    elemento.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;display:none;';
    gl.domElement.parentElement.appendChild(elemento);
    return () => {
      elemento.remove();
      etiqueta.current = null;
      raiz.current = null;
      // La raíz HTML se desmonta después de terminar el renderizador 3D.
      queueMicrotask(() => contenido.unmount());
    };
  }, [gl]);
  useLayoutEffect(() => { raiz.current.render(children); }, [children]);

  useFrame(({ camera, size }) => {
    const elemento = etiqueta.current;
    if (!grupo.current || !elemento) return;
    camera.updateMatrixWorld();
    grupo.current.getWorldPosition(mundo);
    camera.getWorldPosition(camara);
    pantalla.copy(mundo).applyMatrix4(camera.matrixWorldInverse);
    const delante = pantalla.z < 0;
    pantalla.copy(mundo).project(camera);
    elemento.style.display = delante && Math.abs(pantalla.z) <= 1 ? 'block' : 'none';
    const distancia = mundo.distanceTo(camara);
    const escala = 5 / (2 * Math.tan(camera.fov * Math.PI / 360) * distancia);
    const x = (pantalla.x + 1) * size.width / 2;
    const y = (1 - pantalla.y) * size.height / 2;
    elemento.style.transform = `translate3d(${x}px,${y}px,0) scale(${escala})`;
    elemento.style.zIndex = String(Math.round(1000 * (camera.far - distancia) / (camera.far - camera.near)));
  });
  return <group ref={grupo} position={posicion} />;
}

const PuntosInteres = memo(function PuntosInteres({ puntos, puntoActivoId, onSeleccionarPunto }) {
  function detenerEventoEtiqueta(evento) {
    evento.stopPropagation();
    evento.nativeEvent?.stopImmediatePropagation?.();
  }

  function seleccionarEtiqueta(evento, puntoId) {
    evento.preventDefault();
    detenerEventoEtiqueta(evento);
    onSeleccionarPunto?.(puntoId);
  }

  return puntos.map((punto) => (
    <Etiqueta3D key={punto.id} posicion={punto.posicion}>
      <div className="visorpuntowrapper">
        <button
          type="button"
          className={`visorpuntoboton ${
            puntoActivoId === punto.id ? "visorpuntobotonactivo" : ""
          }`}
          style={{
            "--desplazamiento-etiqueta-x": punto.desplazamientoEtiqueta?.x || "0px",
            "--desplazamiento-etiqueta-y": punto.desplazamientoEtiqueta?.y || "0px",
          }}
          onPointerDown={detenerEventoEtiqueta}
          onClick={(evento) => seleccionarEtiqueta(evento, punto.id)}
        >
          <span>{punto.etiqueta}</span>
        </button>
      </div>
    </Etiqueta3D>
  ));
});

function tieneSuperficieUv(geometria) {
  const uv = geometria.attributes.uv;
  if (!uv) return false;
  const indices = geometria.index;
  const cantidad = indices ? indices.count : uv.count;
  for (let i = 0; i + 2 < cantidad; i += 3) {
    const a = indices ? indices.getX(i) : i;
    const b = indices ? indices.getX(i + 1) : i + 1;
    const c = indices ? indices.getX(i + 2) : i + 2;
    const area = (uv.getX(b) - uv.getX(a)) * (uv.getY(c) - uv.getY(a)) -
      (uv.getX(c) - uv.getX(a)) * (uv.getY(b) - uv.getY(a));
    if (Math.abs(area) > 1e-10) return true;
  }
  return false;
}

export const ModeloTunel = memo(function ModeloTunel({
  puntosInteres,
  puntoActivoId,
  onSeleccionarPunto,
  rotacionModeloY = VISTA.rotacionModeloY,
  escalaModelo = VISTA.escalaModelo,
  desplazamientoModelo = VISTA.desplazamientoModelo,
  mostrarPuntosInteres = true,
}) {
  const { scene } = useLoader(CargadorGLB, MODELO_GLB);
  const { gl } = useThree();
  const { escenaVisor, materialesVisor, materialesSinRelieve, texturasVisor, geometriasVisor } = useMemo(() => {
    const escenaVisor = scene.clone(true);
    const materialesVisor = new Map();
    const materialesSinRelieve = new Map();
    const texturasVisor = new Map();
    const geometriasVisor = [];
    const anisotropia = Math.min(8, gl.capabilities.getMaxAnisotropy());

    function prepararMaterial(material, admiteRelieve) {
      // Los aros comparten material con la carcasa, pero sus UV no tienen área.
      // Usan una copia propia: la carcasa mantiene su mapa de normales válido.
      const sinRelieve = material.normalMap && !admiteRelieve;
      const cacheMaterial = sinRelieve ? materialesSinRelieve : materialesVisor;
      if (!cacheMaterial.has(material)) {
        const copia = material.clone();
        if (sinRelieve) copia.normalMap = null;
        const esCristal = material.name === "VIDRIO";
        // Estos dos materiales sin nombre descriptivo también son rótulos del GLB.
        const esPegatina = /pegatina/i.test(material.name) ||
          ["Material.004", "Material.006"].includes(material.name);

        if (esCristal) {
          // Láminas de policarbonato: una sola transparencia, sin la segunda
          // pasada de refracción que no incluye otras ventanas transparentes.
          copia.transmission = 0;
          copia.transparent = true;
          copia.depthWrite = false;
          copia.forceSinglePass = true;
        } else if (esPegatina) {
          copia.polygonOffset = true;
          copia.polygonOffsetFactor = -1;
          copia.polygonOffsetUnits = -1;
          // Los huecos del rótulo se recortan; el resto conserva profundidad.
          // Así no cambia de orden con las ventanas al girar la cámara.
          if (copia.transparent) {
            copia.transparent = false;
            copia.alphaTest = 0.1;
            copia.alphaToCoverage = true;
            copia.depthWrite = true;
          }
        }

        for (const propiedad of ["map", "normalMap", "roughnessMap", "metalnessMap"]) {
          const textura = copia[propiedad];
          if (!textura) continue;
          if (!texturasVisor.has(textura)) {
            const texturaCopia = textura.clone();
            texturaCopia.anisotropy = anisotropia;
            texturaCopia.needsUpdate = true;
            texturasVisor.set(textura, texturaCopia);
          }
          copia[propiedad] = texturasVisor.get(textura);
        }
        cacheMaterial.set(material, copia);
      }
      return cacheMaterial.get(material);
    }

    escenaVisor.updateMatrixWorld(true);
    escenaVisor.traverse((objeto) => {
      if (!objeto.isMesh) return;
      const admiteRelieve = tieneSuperficieUv(objeto.geometry);
      objeto.material = Array.isArray(objeto.material)
        ? objeto.material.map((material) => prepararMaterial(material, admiteRelieve))
        : prepararMaterial(objeto.material, admiteRelieve);
      if (!Array.isArray(objeto.material) && objeto.material.name === "VIDRIO") {
        // Three ordena transparencias por el origen de cada malla. En el GLB
        // el origen está en la bisagra; usamos el centro real de la ventana.
        const geometria = objeto.geometry.clone();
        geometria.computeBoundingBox();
        const centro = geometria.boundingBox.getCenter(new Vector3());
        geometria.translate(-centro.x, -centro.y, -centro.z);
        objeto.position.add(centro.multiply(objeto.scale).applyQuaternion(objeto.quaternion));
        objeto.geometry = geometria;
        geometriasVisor.push(geometria);
      }
    });
    return { escenaVisor, materialesVisor, materialesSinRelieve, texturasVisor, geometriasVisor };
  }, [scene, gl]);

  useEffect(() => () => {
    materialesVisor.forEach((material) => material.dispose());
    materialesSinRelieve.forEach((material) => material.dispose());
    texturasVisor.forEach((textura) => textura.dispose());
    geometriasVisor.forEach((geometria) => geometria.dispose());
  }, [materialesVisor, materialesSinRelieve, texturasVisor, geometriasVisor]);

  return (
    <group
      position={desplazamientoModelo}
      rotation={[0, rotacionModeloY, 0]}
      scale={escalaModelo}
    >
      <primitive object={escenaVisor} />
      {mostrarPuntosInteres && puntosInteres?.length ? (
        <PuntosInteres
          puntos={puntosInteres}
          puntoActivoId={puntoActivoId}
          onSeleccionarPunto={onSeleccionarPunto}
        />
      ) : null}
    </group>
  );
});

