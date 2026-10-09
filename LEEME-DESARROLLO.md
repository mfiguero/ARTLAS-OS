# AR.T.L.A.S. OS — Fuente modular

Esta carpeta es la **fuente** de AR.T.L.A.S. No se publica tal cual. La compilación genera las dos carpetas que sí se suben al sitio.

## Estructura

| Carpeta / archivo | Contenido |
|---|---|
| `artlas.config.json` | Versión visible (`ver`: `v7.0`) y número (`num`: `7.0`, para la caché y el sitio), dominios autorizados (`dominios`) y datos de la licencia (`licencia`: versión, fecha, marca y contacto). Para una versión nueva se cambia **solo acá**. |
| `src/modulos/` | El código de la app, en módulos numerados que se unen en orden en un único `app.js`. |
| `src/recursos/` | Recursos pesados (ícono, RAG local, manual). Van a `app-recursos.js`, que se carga después de la app. El worker de Python se publica como `python-worker.js`. |
| `src/sitio/` | `app.html`, portada, imágenes, `netlify.toml`, `_headers`, funciones de Netlify y plantillas. App instalable: `manifest.webmanifest`, `sw.js` (con la versión) e íconos `icono-*.png` / `apple-touch-icon.png`. |
| `src/LEEME-web-only.txt` | LEEME del paquete Web only. |
| `build.mjs` | Compilación: une los módulos, minifica JS y CSS, quita comentarios y genera `dist/`. |
| `tests/suite.py` | Pruebas automáticas (Playwright). Simulan los modelos y la búsqueda: no gastan cuota. |
| `supabase/registro-errores.sql` | Tabla y permisos del registro de errores. Se ejecuta una sola vez. |
| `supabase/consentimientos.sql` | Registro de aceptaciones de la licencia (fecha/hora e IP del servidor). Se ejecuta una vez, después del anterior. |
| `src/licencia/licencia.py` | Texto de la Política de Privacidad, Términos de Uso y Licencia. Genera `licencia-artlas.pdf` y `src/recursos/40-licencia.js`. |
| `src/nucleo/` | **Núcleo local de AR.T.L.A.S. OS** (`artlas-nucleo.mjs`, Node 18+, sin dependencias) con sus lanzadores y LÉAME. La compilación lo embebe en `app-recursos.js` (`window.ARTLAS_NUCLEO`) para descargarlo desde la app, también sin red. |
| `imagen/` | **AR.T.L.A.S. OS como sistema propio**: recetas de la ISO amd64 (live-build) y de la imagen para Raspberry Pi (pi-gen), archivos comunes y `LEEME-IMAGEN.md`. Se construyen con `.github/workflows/imagenes.yml` o con `imagen/*/construir.sh`. |
| `tests/os_pruebas.py` | Pruebas del OS: núcleo real, Ollama simulado, LibreOffice, asistente con aprobación. Corre dentro de `suite.py` o sola: `python3 tests/os_pruebas.py`. |
| `.github/workflows/pruebas.yml` | GitHub Actions: compila y prueba en cada cambio. |

### Módulos

| Módulo | Función |
|---|---|
| `00-base` | Núcleo original. |
| `10-plataforma` | Command Center, router y fallback. |
| `20-seguridad` | Bóveda y modos de claves. |
| `30-vistas` | Router, Control Center y Arquitectura. |
| `40-skills` | Skills, agentes de demostración, exportación e importación. |
| `50-ingreso-descargas` | Pantalla de ingreso, descargas, Analytics y recuperación de clave. |
| `60-chat-inicio` | Chat centrado. |
| `70-busqueda-web` | Búsqueda web a pedido y 👁. |
| `80-chat-formato` | Identidad, Markdown y acciones por mensaje. |
| `84-python-worker` | Código del worker de Python. También se publica como `python-worker.js`. |
| `85-python` | Python en el navegador. |
| `86-herramientas` | Herramientas de agentes. |
| `88-app-instalable` | App instalable (PWA): instalación solo con cuenta, app instalada sin modo invitado, aviso de actualización. |
| `89-proteccion` | Protección contra copia: dominios autorizados, bloqueos en la app instalada y decodificación para Escritorio. |
| `90-registro-salud` | Registro de errores y Salud de la plataforma. |
| `91-licencia` | Casilla de aceptación, lectura del documento, aceptación obligatoria para descargas, instalación y app instalada, y registro del consentimiento. |
| `92-os-escritorio` | AR.T.L.A.S. OS: escritorio, ventanas, barra de tareas, lanzador y registro de apps (`aosRegister`). Entrada: botón lateral o `app.html?os=1`. |
| `93-os-nucleo` | Cliente del núcleo local (emparejamiento por código, RPC, puente a Ollama). |
| `94-os-archivos` | Sistema de archivos unificado `pc:` (núcleo) · `fsa:` (carpetas conectadas en el navegador) · `opfs:` (unidad privada), papelera, Archivos, Editor y Visor. |
| `95-os-ia-local` | Modelos IA: WebLLM (WebGPU) y Ollama vía núcleo; motor del asistente (router, local primero, solo local, fijo) y privacidad de archivos. |
| `96-os-asistente` | Asistente del sistema: protocolo `tool:os`, lecturas automáticas, aprobación de cambios, atajos sin modelo. |
| `97-os-sistema` | Configuración, Terminal, Monitor, Aplicaciones; modelos locales en el router (estrategia «Local primero»). |
| `98-os-navegador` | Navegador: búsqueda (buscadores del módulo 70), modo Lectura (núcleo `web.leer` o Jina Reader), Original (iframe), YouTube, «Abrir en Chrome»; herramientas `web.*` del asistente y oferta de buscar cuando no tiene el dato. |
| `98-os-oficina` | Oficina: LibreOffice/OpenOffice vía núcleo (crear, convertir, abrir) y respaldo en el navegador (.docx con JSZip, .xlsx/.ods/.csv con SheetJS); herramientas `office.*` del asistente. |
| `99-arranque` | Arranque. |

Regla de oro: los módulos nuevos **no redeclaran** funciones existentes. Las envuelven: `const X_f=f; f=function(){…}`.

## Compilar

Requiere Node 18 o superior.

```
npm install
node build.mjs            # → dist/fullstack y dist/web-only (minificado)
node build.mjs --sin-min  # sin minificar ni proteger, para depurar
node build.mjs --sin-proteccion  # minificado, con app.js legible
```

## Probar

Requiere Python 3 y Playwright.

```
pip install playwright && python -m playwright install chromium
python tests/suite.py     # escribe tests/ultimo-reporte.json
node build.mjs            # vuelve a compilar incluyendo el reporte
```

Las pruebas del OS levantan el núcleo real con Node y, si LibreOffice está instalado, prueban la Oficina con él (si no está, esas pruebas se omiten).

Sin internet se pueden servir las librerías localmente con las variables `ARTLAS_LIBS` y `ARTLAS_PYODIDE` (ver el encabezado de `tests/suite.py`).

## Publicar

- **Netlify (fullstack):** subí el contenido de `dist/fullstack`.
- **Web only:** subí el contenido de `dist/web-only`.

En GitHub, cada `push` ejecuta las pruebas. El paquete listo queda como artefacto `artlas-dist` del workflow.

## App instalable y protección (v6.8)

- **Instalación.** El manifiesto y el service worker se agregan recién cuando el usuario inicia sesión, así el navegador ofrece instalar solo a usuarios registrados. La app instalada (`app.html?app=1` o ventana propia) no tiene modo invitado.
- **Actualización.** Cada compilación cambia la versión dentro de `sw.js`. El navegador detecta el cambio, la app muestra «Hay una versión nueva» y «Actualizar ahora» recarga con la nueva.
- **Protección.** `app.js` se publica codificado (cambia en cada compilación) y solo funciona en los dominios de `artlas.config.json`, en Escritorio y desde el disco. Hoy: artlas.ar, artlas.netlify.app y artlas-ai-arg.netlify.app (con sus vistas previas `xxxx--sitio.netlify.app`). Para agregar un dominio, sumarlo a `dominios` y compilar. `*` reemplaza un tramo sin puntos; `*.dominio` incluye el dominio y sus subdominios.

## Licencia (v6.8.2)

- El texto vive en `src/licencia/licencia.py`. Después de editarlo: `python3 src/licencia/licencia.py` y `node build.mjs`.
- Si cambia el contenido, subir `licencia.ver` en `artlas.config.json`: todos los usuarios vuelven a aceptar la versión nueva en su próxima descarga, instalación o ingreso a la app instalada. Si solo cambia la app, no hace falta.
