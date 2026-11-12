import { cortarCampo, limitesPlano, ORIENTACIONES } from './campo.js';
import { pintarPlano } from './mapas.js';
const cm = value => `${value > 0 ? '+' : ''}${value} cm`;
export function conectarPlanos(root) {
  const $ = id => root.querySelector(`#${id}`);
  const lifetime = new AbortController();
  let field = null,
    scheduled = 0;
  const pending = new Set();
  const planes = Object.keys(ORIENTACIONES).map(orientation => ({
    orientation,
    position: 0,
    slider: $(`posicion-${orientation}`),
    output: $(`valor-${orientation}`),
    canvas: $(`mapa-${orientation}`)
  }));
  function updateControl(plane) {
    const limits = limitesPlano(field, plane.orientation);
    const posicion = Math.max(limits.min, Math.min(limits.max, plane.position));
    plane.position = Number((limits.min + Math.round((posicion - limits.min) / limits.step) * limits.step).toFixed(8));
    const {
      slider,
      position
    } = plane;
    slider.min = limits.min;
    slider.max = limits.max;
    slider.step = limits.step;
    slider.value = position;
    slider.setAttribute('aria-valuetext', cm(position));
    plane.output.textContent = cm(position);
  }
  function draw() {
    scheduled = 0;
    if (!field) return;
    for (const {
      orientation,
      position,
      canvas
    } of pending) {
      pintarPlano(canvas, cortarCampo(field, orientation, position));
      canvas.setAttribute('aria-label', `Mapa de rapidez relativa: plano ${orientation}, ${ORIENTACIONES[orientation].eje} ${cm(position)}`);
    }
    pending.clear();
  }
  for (const plane of planes) {
    plane.slider.addEventListener('input', () => {
      if (!field) return;
      plane.position = Number(plane.slider.value);
      updateControl(plane);
      pending.add(plane);
      if (!scheduled) scheduled = requestAnimationFrame(draw);
    }, {
      signal: lifetime.signal
    });
  }
  function clear() {
    cancelAnimationFrame(scheduled);
    scheduled = 0;
    field = null;
    pending.clear();
    for (const {
      canvas
    } of planes) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    $('mapas-flujo').hidden = true;
    $('vacio').hidden = false;
  }
  return {
    clear,
    mostrar(data) {
      field = data;
      cancelAnimationFrame(scheduled);
      for (const plane of planes) {
        updateControl(plane);
        pending.add(plane);
      }
      draw();
      $('mapas-flujo').hidden = false;
      $('vacio').hidden = true;
    },
    dispose() {
      lifetime.abort();
      clear();
    }
  };
}
