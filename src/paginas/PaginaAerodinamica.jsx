import { useEffect, useRef, useState } from 'react';

export default function PaginaAerodinamica() {
  const contenedor = useRef(null);
  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cerrado = false;
    let desmontar;
    // El laboratorio se carga solo al abrir esta sección.
    import('../aerodinamica/laboratorio.js').then(({ montarLaboratorio }) => {
      if (cerrado) return;
      desmontar = montarLaboratorio(contenedor.current);
      setEstado('listo');
    }).catch(() => {
      if (!cerrado) setEstado('error');
    });
    return () => {
      cerrado = true;
      desmontar?.();
    };
  }, [intento]);

  return (
    <section aria-label="Laboratorio de aerodinámica">
      {estado === 'cargando' && <p role="status">Cargando Aerodinámica…</p>}
      {estado === 'error' && (
        <div role="alert">
          <p>No se ha podido cargar Aerodinámica.</p>
          <button type="button" onClick={() => { setEstado('cargando'); setIntento(n => n + 1); }}>
            Volver a intentar
          </button>
        </div>
      )}
      <div ref={contenedor} className="aerodinamica-lab" />
    </section>
  );
}
