import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useBounds } from '@react-three/drei';
import { DoubleSide, NoToneMapping, Vector3 } from 'three';
import Visor3D from '../components/visor/Visor3D';

const DIRECCION_CAMARA = [0.18, 0.12, 1];

function Objeto({ geometria, controlesRef }) {
  const bounds = useBounds();
  const copia = useMemo(() => geometria.clone(), [geometria]);
  const encuadre = useMemo(() => {
    copia.computeBoundingBox();
    return copia.boundingBox;
  }, [copia]);
  const obtenerEscena = useThree(state => state.get);
  const ancho = useThree(state => state.size.width);
  const alto = useThree(state => state.size.height);
  useEffect(() => () => copia.dispose(), [copia]);
  useEffect(() => {
    const { camera, invalidate } = obtenerEscena();
    const controles = controlesRef.current;
    bounds.refresh(encuadre);
    const { center: centro, distance: distancia, size } = bounds.getSize();
    camera.position.copy(new Vector3(...DIRECCION_CAMARA).normalize().multiplyScalar(distancia).add(centro));
    controles.target.copy(centro);
    bounds.refresh(encuadre).clip();
    controles.minDistance = size.length() * 0.55;
    controles.maxDistance = distancia * 4;
    controles.update();
    invalidate();
  }, [bounds, encuadre, obtenerEscena, controlesRef, ancho, alto]);
  return (
    <mesh>
      <primitive object={copia} attach="geometry" />
      <meshStandardMaterial color="#728fa3" roughness={0.65} metalness={0.05} side={DoubleSide} />
    </mesh>
  );
}

export default function VistaObjeto({ geometria }) {
  const controlesRef = useRef(null);
  return (
    <Visor3D
      camera={{ position: DIRECCION_CAMARA, fov: 40, near: 0.01, far: 10000 }}
      controlesRef={controlesRef}
      controles={{ enableDamping: false, enableRotate: false }}
      gl={{ toneMapping: NoToneMapping, toneMappingExposure: 1 }}
      descripcion="Vista frontal del plano X–Y con una ligera perspectiva. Viento de izquierda a derecha. Rueda para acercar."
    >
      <hemisphereLight args={['#ffffff', '#75808a', 2]} />
      <directionalLight position={[2, 3, 4]} intensity={2.8} />
      {geometria && <Objeto geometria={geometria} controlesRef={controlesRef} />}
    </Visor3D>
  );
}
