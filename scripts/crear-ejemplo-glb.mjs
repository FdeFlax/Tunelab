import { mkdir, writeFile } from 'node:fs/promises';
import { SphereGeometry } from 'three';
import { glbFixture } from '../tests/helpers/glbFixture.mjs';

const directory = new URL('../public/models/aerodinamica/', import.meta.url);
await mkdir(directory, { recursive: true });
const geometry = new SphereGeometry(1, 48, 24).scale(1.8, 0.7, 0.7);
await writeFile(new URL('ejemplo.glb', directory), new Uint8Array(glbFixture(geometry)));
geometry.dispose();
console.log('GLB propio de ejemplo generado: elipsoide estático sin texturas.');
