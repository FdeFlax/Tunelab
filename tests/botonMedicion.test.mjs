import assert from "node:assert/strict";
import test from "node:test";
import { runnerImport } from "vite";

const { module: { BotonMedicion } } = await runnerImport("/src/components/control/RegistroMedicion.jsx", { configFile: false });
const preparado = { estadoTunel: "READY", medActiva: false, programa: null };

test("el mismo botón inicia y después detiene, incluso durante la estabilización sin muestras", () => {
  const llamadas = [];
  const props = { tunel: preparado, puedeOperar: true, bloqueado: false,
    onIniciar: () => llamadas.push("iniciar"), onDetener: () => llamadas.push("detener") };
  const inicio = BotonMedicion(props);
  assert.equal(inicio.props.children, "Iniciar medición");
  assert.equal(inicio.props.disabled, false);
  inicio.props.onClick();
  const marcha = BotonMedicion({ ...props, bloqueado: true,
    tunel: { ...preparado, programa: { activo: true, estado: "estabilizando" } } });
  assert.equal(marcha.props.children, "Detener medición");
  assert.equal(marcha.props.disabled, false);
  marcha.props.onClick();
  assert.deepEqual(llamadas, ["iniciar", "detener"]);
});

test("la parada respeta la propiedad del túnel y espera la respuesta de la orden", () => {
  const tunel = { ...preparado, medActiva: true };
  assert.equal(BotonMedicion({ tunel, puedeOperar: false }).props.disabled, true);
  const pendiente = BotonMedicion({ tunel, puedeOperar: true, ocupado: "deteniendo" });
  assert.equal(pendiente.props.disabled, true);
  assert.equal(pendiente.props.children, "Deteniendo…");
  assert.equal(pendiente.props["aria-busy"], true);
  assert.equal(BotonMedicion({ tunel: preparado, puedeOperar: true }).props.disabled, true);
});

test("permite comenzar una medición después del encendido manual desde Dashboard", () => {
  const iniciar = () => {};
  const boton = BotonMedicion({ tunel: { ...preparado, estadoTunel: "RUNNING" }, puedeOperar: true, bloqueado: false, onIniciar: iniciar });
  assert.equal(boton.props.children, "Iniciar medición");
  assert.equal(boton.props.onClick, iniciar);
  assert.equal(boton.props.disabled, false);
});
