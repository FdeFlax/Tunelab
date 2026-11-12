import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const env = { ...loadEnv('development', raiz, 'VITE_'), ...process.env };
const api = env.VITE_API_URL || 'http://127.0.0.1:8010/api';
const errores = [];

if (api !== 'http://127.0.0.1:8010/api') {
  errores.push('El arranque local necesita VITE_API_URL=http://127.0.0.1:8010/api en .env.');
}
console.log(JSON.stringify({ estado: errores.length ? 'error' : 'ok', detalle: errores.join(' ') }));
process.exitCode = errores.length ? 1 : 0;
