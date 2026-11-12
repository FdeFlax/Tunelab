# Licencias de terceros

Se conservan los avisos originales de las bibliotecas utilizadas por la integración:

| Biblioteca | Uso | Aviso conservado |
| --- | --- | --- |
| Three.js | Visor, importación GLB y planos | [Three.txt](Three.txt), MIT |
| XLB 0.3.1 | Cálculo de flujo | [XLB.txt](XLB.txt), Apache-2.0 |
| NVIDIA Warp 1.10.0 | Ejecución del motor | [Warp.txt](Warp.txt), Apache-2.0 y avisos de componentes |
| Trimesh 5.1.1 | Revisión y voxelización de la geometría | [Trimesh.txt](Trimesh.txt), MIT |

Las versiones del entorno de cálculo se fijan en [requirements-flujo3d.lock.txt](../../backend/requirements-flujo3d.lock.txt), separadas de la API. Incluye dependencias transitivas requeridas por XLB, aunque la aplicación no las importe directamente. Las licencias del resto de paquetes se conservan en sus distribuciones instaladas; esta carpeta no sustituye los avisos que deban acompañar a esas distribuciones.

El texto completo de [Apache-2.0](Apache-2.0.txt) acompaña al aviso breve de XLB. La [revisión de licencias](../REVISION_LICENCIAS_Y_GRAFICAS.md) incluye el inventario de dependencias y los puntos pendientes para una distribución.

El GLB de ejemplo es propio y se regenera con `node scripts/crear-ejemplo-glb.mjs`.

El prototipo 2D basado en Kutta ya no se distribuye con la web. Su licencia MIT, código de referencia y revisión original acompañan al código retirado en el archivo recuperable descrito en [la revisión](../REVISION_AERODINAMICA_2026-10-18.md).
