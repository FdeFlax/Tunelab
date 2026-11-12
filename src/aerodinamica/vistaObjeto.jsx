import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { ArrowHelper, DoubleSide, NoToneMapping, Sphere, Vector3 } from 'three';
import Visor3D from '../components/visor/Visor3D';

const DIRECCION_CAMARA = [0.18, 0.12, 1];

function Objeto({ geometria, controlesRef }) {
  const copia = useMemo(() => geometria.clone(), [geometria]);
  const { flecha, encuadre } = useMemo(() => {
    copia.computeBoundingBox();
    copia.computeBoundingSphere();
    const radio = copia.boundingSphere.radius;
    const origen = new Vector3(copia.boundingBox.min.x - radio, 0, 0);
    const flecha = new ArrowHelper(new Vector3(1, 0, 0), origen, radio * 0.8, '#1e506d', radio * 0.2, radio * 0.14);
    const encuadre = copia.boundingBox.clone().expandByPoint(origen).getBoundingSphere(new Sphere());
    return { flecha, encuadre };
  }, [copia]);
  const obtenerEscena = useThree(state => state.get);
  const ancho = useThree(state => state.size.width);
  const alto = useThree(state => state.size.height);
  useEffect(() => () => copia.dispose(), [copia]);
  useEffect(() => () => flecha.dispose(), [flecha]);
  useEffect(() => {
    const { camera, invalidate } = obtenerEscena();
    const controles = controlesRef.current;
    const { radius: radio, center: centro } = encuadre;
    const aspecto = ancho / (alto || 1) || 1;
    const angulo = Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.min(1, aspecto));
    const distancia = 1.2 * radio / Math.sin(angulo);
    const direccion = new Vector3(...DIRECCION_CAMARA).normalize();
    camera.position.copy(direccion.multiplyScalar(distancia).add(centro));
    controles.target.copy(centro);
    controles.minDistance = radio * 1.1;
    controles.maxDistance = distancia * 4;
    camera.near = Math.max(radio / 100, 0.001);
    camera.far = distancia * 10;
    camera.updateProjectionMatrix();
    controles.update();
    invalidate();
  }, [encuadre, obtenerEscena, controlesRef, ancho, alto]);
  return (
    <group>
      <mesh>
        <primitive object={copia} attach="geometry" />
        <meshStandardMaterial color="#728fa3" roughness={0.65} metalness={0.05} side={DoubleSide} />
      </mesh>
      <primitive object={flecha} />
    </group>
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
      descripcion="Vista frontal del plano X–Y con una ligera perspectiva. La flecha indica el viento hacia el eje X positivo. Rueda para acercar."
    >
      <hemisphereLight args={['#ffffff', '#75808a', 2]} />
      <directionalLight position={[2, 3, 4]} intensity={2.8} />
      {geometria && <Objeto geometria={geometria} controlesRef={controlesRef} />}
    </Visor3D>
  );
}
