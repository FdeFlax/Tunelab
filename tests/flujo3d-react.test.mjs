import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import * as React from 'react';
const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const query = await import('@tanstack/react-query');
after(() => window.happyDOM.close());
const settle = async () => { for (let i = 0; i < 3; i++) await React.act(async () => { await new Promise(r => setTimeout(r, 10)); }); };

async function montar(t, iniciar = async () => ({id: 'caso-1'})) {
  const llamadas = [];
  let trabajo = {estado: 'calculando'};
  const pedirApi = async (ruta, opciones = {}) => {
    llamadas.push({ruta, ...opciones});
    if (ruta.includes('/capacidad')) {
      const consigna = Number(new URL(ruta, 'http://localhost').searchParams.get('consigna') ?? 100);
      return {configurado:true,modelo:consigna === 100 ? 'modelo-prueba' : `modelo-${consigna}`,
        parametros:{consignaPct:consigna,aire:{velocidadMs:consigna === 0 ? 0 : 11.32}}};
    }
    if (opciones.method === 'POST') return iniciar();
    if (opciones.method === 'DELETE') return null;
    if (trabajo instanceof Error) throw trabajo;
    return trabajo;
  };
  const contexto = vm.createContext({ AbortSignal, console });
  const fuente = new vm.SourceTextModule(readFileSync(new URL('../src/aerodinamica/flujo.js', import.meta.url), 'utf8'), {context:contexto});
  const dependencias = {react:React, '@tanstack/react-query':query,
    '../servicios/api/clienteApi.js':{pedirApi,leerIdentidadApi:()=>({identificador:'prueba'})},
    './campo.js':{leerCampo:(volumen,parametros)=>({volumen,parametros})}};
  await fuente.link(nombre => new vm.SyntheticModule(Object.keys(dependencias[nombre]), function () {
    for (const [key, value] of Object.entries(dependencias[nombre])) this.setExport(key,value);
  }, {context:contexto}));
  await fuente.evaluate();
  const cliente = new query.QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}}});
  const contenedor = document.createElement('div'); document.body.append(contenedor);
  const raiz = createRoot(contenedor);
  let flujo;
  function Prueba({objeto, consigna}) { flujo = fuente.namespace.useFlujo(objeto, consigna); return null; }
  let objetoActual;
  const render = async (objeto, consigna = null) => { objetoActual = objeto; await React.act(async () => raiz.render(React.createElement(query.QueryClientProvider,{client:cliente}, React.createElement(Prueba,{objeto,consigna})))); await settle(); };
  t.after(async () => { await React.act(async () => raiz.unmount()); cliente.clear(); contenedor.remove(); });
  await render({posiciones:new Float32Array(36)});
  return {leer:()=>flujo,llamadas,render,cliente, cambiarConsigna:consigna=>render(objetoActual, consigna),
    terminar:async estado => { trabajo=estado; await React.act(async () => { await cliente.refetchQueries({queryKey:['calculo-flujo']}); }); await settle(); }};
}

test('cancelar antes de recibir el id envía una sola orden y descarta un resultado tardío', async t => {
  let resolver;
  const vista=await montar(t,()=>new Promise(r=>{resolver=r;}));
  await React.act(async ()=>{ vista.leer().calcular(); vista.leer().calcular(); }); await settle();
  await React.act(async ()=>{ vista.leer().cancelar(); vista.leer().cancelar(); });
  await React.act(async ()=>resolver({id:'caso-1'})); await settle();
  assert.equal(vista.llamadas.filter(p=>p.method==='POST').length,1);
  assert.equal(vista.llamadas.filter(p=>p.method==='DELETE').length,1);
  await vista.terminar({estado:'completado',resultado:{modelo:'modelo-prueba',volumen:'antiguo'}});
  assert.equal(vista.leer().campo,null);
  assert.equal(vista.leer().activo,false);
});

test('cambiar consigna retira el mapa y envía la nueva velocidad con su configuración', async t => {
  const vista = await montar(t);
  await React.act(async () => vista.leer().calcular()); await settle();
  await vista.terminar({estado:'completado',resultado:{modelo:'modelo-prueba',volumen:'actual'}});
  await vista.cambiarConsigna(60);
  assert.equal(vista.leer().campo, null);
  assert.equal(vista.leer().capacidad.data.parametros.aire.velocidadMs, 11.32);
  await React.act(async () => vista.leer().calcular()); await settle();
  assert.match(vista.llamadas.filter(p => p.method === 'POST').at(-1).ruta, /modelo=modelo-60&consigna=60$/);
});

test('una respuesta tardía de otra consigna no se muestra', async t => {
  let resolver;
  const vista = await montar(t, () => new Promise(r => { resolver = r; }));
  await React.act(async () => vista.leer().calcular()); await settle();
  await vista.cambiarConsigna(60);
  await React.act(async () => resolver({id:'caso-1'})); await settle();
  assert.equal(vista.llamadas.filter(p => p.method === 'DELETE').length, 1);
  await vista.terminar({estado:'completado',resultado:{modelo:'modelo-prueba',volumen:'viejo'}});
  assert.equal(vista.leer().campo, null);
});

test('reposo y consignas inválidas no lanzan cálculos', async t => {
  const vista = await montar(t);
  for (const consigna of [0, '', -1, 101, NaN]) {
    await vista.cambiarConsigna(consigna);
    await React.act(async () => vista.leer().calcular()); await settle();
  }
  assert.equal(vista.llamadas.filter(p => p.method === 'POST').length, 0);
});

test('cambiar de GLB cancela el trabajo anterior y no muestra su mapa', async t => {
  const vista=await montar(t);
  await React.act(async ()=>vista.leer().calcular()); await settle();
  await vista.render({posiciones:new Float32Array(72)});
  assert.equal(vista.llamadas.filter(p=>p.method==='DELETE').length,1);
  await vista.terminar({estado:'completado',resultado:{modelo:'modelo-prueba',volumen:'antiguo'}});
  assert.equal(vista.leer().campo,null);
});

test('muestra el resultado vigente y lo invalida cuando cambia el objeto', async t => {
  const vista=await montar(t);
  await React.act(async ()=>vista.leer().calcular()); await settle();
  await vista.terminar({estado:'completado',resultado:{modelo:'modelo-prueba',volumen:'actual'}});
  assert.equal(vista.leer().campo.volumen,'actual');
  assert.equal(vista.leer().activo,false);
  await vista.render({posiciones:new Float32Array(72)});
  assert.equal(vista.leer().campo,null);
});

test('un error al iniciar no repite automáticamente una orden de cálculo', async t => {
  const vista=await montar(t,async()=>{throw new Error('Respuesta perdida');});
  await React.act(async ()=>vista.leer().calcular()); await settle();
  assert.equal(vista.llamadas.filter(p=>p.method==='POST').length,1);
  assert.equal(vista.leer().activo,false);
  assert.match(vista.leer().aviso,/No se pudo confirmar/);
});

test('el polling se detiene después de finalizar o confirmar una cancelación', async t => {
  for (const estado of ['completado', 'cancelado']) {
    const vista = await montar(t);
    await React.act(async () => vista.leer().calcular());
    await settle();
    await vista.terminar({ estado, resultado: { modelo: 'modelo-prueba', volumen: 'actual' } });
    const consultas = vista.llamadas.length;
    await React.act(async () => { await new Promise(r => setTimeout(r, 900)); });
    assert.equal(vista.llamadas.length, consultas);
    assert.equal(vista.leer().activo, false);
  }
});

test('un trabajo desaparecido deja de consultarse y permite volver a calcular', async t => {
  const vista = await montar(t);
  await React.act(async () => vista.leer().calcular());
  await settle();
  await vista.terminar(Object.assign(new Error('No existe'), { respuesta: { status: 404 } }));
  assert.equal(vista.leer().activo, false);
  assert.match(vista.leer().aviso, /no está disponible/);
  const consultas = vista.llamadas.length;
  await React.act(async () => { await new Promise(r => setTimeout(r, 900)); });
  assert.equal(vista.llamadas.length, consultas);
});

test('cargar otro objeto retira el mensaje de error del cálculo anterior', async t => {
  const vista = await montar(t);
  await React.act(async () => vista.leer().calcular());
  await settle();
  await vista.terminar({ estado: 'error', mensaje: 'El cálculo no es estable (paso 5200).' });
  assert.match(vista.leer().aviso, /5200/);
  await vista.render({ posiciones: new Float32Array(72) });
  assert.equal(vista.leer().aviso, '');
  assert.equal(vista.leer().campo, null);
  assert.equal(vista.leer().activo, false);
});
