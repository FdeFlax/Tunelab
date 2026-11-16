import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { leerIdentidadApi, pedirApi } from '../servicios/api/clienteApi.js';
import { leerCampo } from './campo.js';

const finalizado = estado => ['completado', 'error', 'cancelado'].includes(estado);
const errorDefinitivo = error => [401, 404].includes(error?.respuesta?.status);

export function useFlujo(objeto) {
  const usuario = leerIdentidadApi()?.identificador;
  const montado = useRef(false);
  const ocupado = useRef(false);
  const cancelando = useRef(false);
  const cancelacionAutomatica = useRef(null);
  const [trabajo, setTrabajo] = useState(null);
  const [campo, setCampo] = useState(null);
  const [aviso, setAviso] = useState('');
  const [cancelacionPedida, setCancelacionPedida] = useState(false);
  const capacidad = useQuery({
    queryKey: ['capacidad-flujo', usuario],
    queryFn: ({ signal }) => pedirApi('/flujo3d/capacidad', { signal }),
    staleTime: Infinity, gcTime: 0, refetchOnWindowFocus: false,
  });
  const inicio = useMutation({
    mutationFn: datos => pedirApi(`/flujo3d/calculos?modelo=${encodeURIComponent(datos.modelo)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' },
      body: datos.objeto.posiciones, signal: AbortSignal.timeout(25000),
    }),
    onSuccess: (respuesta, datos) => { if (montado.current) setTrabajo({ ...datos, id: respuesta.id }); },
    onError: error => {
      ocupado.current = false;
      if (montado.current) setAviso(error.detalle || 'No se pudo confirmar el inicio. Comprueba el servidor antes de volver a intentarlo.');
    },
  });
  const cancelacion = useMutation({
    mutationFn: id => pedirApi(`/flujo3d/calculos/${id}`, { method: 'DELETE' }),
    onError: () => {
      if (!montado.current) return;
      cancelando.current = false;
      setCancelacionPedida(false);
      setAviso('No se ha podido confirmar la cancelación. Puedes volver a intentarlo.');
    },
  });
  const consulta = useQuery({
    queryKey: ['calculo-flujo', usuario, trabajo?.id],
    queryFn: ({ signal }) => pedirApi(`/flujo3d/calculos/${trabajo.id}`, { signal }),
    enabled: Boolean(trabajo), gcTime: 0,
    refetchInterval: q => errorDefinitivo(q.state.error) || finalizado(q.state.data?.estado) ? false : q.state.error ? 2500 : 800,
    refetchIntervalInBackground: true, refetchOnWindowFocus: false,
  });

  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useEffect(() => { setCampo(null); setAviso(''); }, [objeto]);
  const cancelarTrabajo = cancelacion.mutate;
  useEffect(() => {
    if (!trabajo || !(cancelacionPedida || trabajo.objeto !== objeto) || cancelacionAutomatica.current === trabajo.id) return;
    cancelacionAutomatica.current = trabajo.id;
    cancelando.current = true;
    setCancelacionPedida(true);
    cancelarTrabajo(trabajo.id);
  }, [trabajo, objeto, cancelacionPedida, cancelarTrabajo]);

  useEffect(() => {
    if (!trabajo) return;
    if (errorDefinitivo(consulta.error)) {
      setAviso(consulta.error.detalle || 'El cálculo ya no está disponible.');
      ocupado.current = false;
      setTrabajo(null);
      return;
    }
    const resultado = consulta.data;
    if (!resultado || !finalizado(resultado.estado)) return;
    if (resultado.estado === 'completado' && trabajo.objeto === objeto && !cancelacionPedida) {
      try {
        if (resultado.resultado.modelo !== trabajo.modelo) throw new Error('Configuración diferente.');
        setCampo(leerCampo(resultado.resultado.volumen, trabajo.parametros));
        setAviso('');
      } catch { setAviso('No se ha podido representar el resultado recibido. Vuelve a calcular para recuperarlo.'); }
    } else setAviso(trabajo.objeto !== objeto ? 'Puedes calcular el nuevo objeto.' : resultado.mensaje || 'Cálculo cancelado.');
    ocupado.current = false;
    setTrabajo(null);
  }, [consulta.data, consulta.error, trabajo, objeto, cancelacionPedida]);

  function calcular() {
    if (!objeto || ocupado.current || inicio.isPending || trabajo || !capacidad.data?.configurado) return;
    ocupado.current = true; cancelando.current = false;
    setCampo(null); setAviso(''); setCancelacionPedida(false);
    cancelacionAutomatica.current = null;
    inicio.mutate({ objeto, modelo: capacidad.data.modelo, parametros: capacidad.data.parametros });
  }
  function cancelar() {
    if (cancelando.current) return;
    cancelando.current = true;
    setCancelacionPedida(true);
    setAviso('Deteniendo el cálculo…');
    if (trabajo) {
      cancelacionAutomatica.current = trabajo.id;
      cancelarTrabajo(trabajo.id);
    }
  }
  return { capacidad, campo, calcular, cancelar, activo: inicio.isPending || Boolean(trabajo), cancelacionPedida,
    aviso: consulta.isError && !errorDefinitivo(consulta.error) ? 'Se ha perdido la conexión. Intentando recuperar el cálculo…' : aviso };
}
