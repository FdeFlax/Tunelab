import { importarGLB } from '../servicios/modelos3d.js';
self.onmessage = async ({
  data
}) => {
  try {
    const result = await importarGLB(data);
    self.postMessage(result, [result.positions.buffer]);
  } catch (error) {
    self.postMessage({
      error: error.message || 'No se ha podido leer el GLB.'
    });
  }
};
