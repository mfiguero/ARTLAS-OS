# AR.T.L.A.S. OS — Documento de traspaso (handoff) · v7.6

**Versión visible:** v7.6 · **iteración interna:** 86 · **paquetes:** `ARTLAS-OS-v76-web-only.zip`, `ARTLAS-OS-v76-fullstack.zip` y `ARTLAS-OS-v76-fuente.zip`. Las imágenes del sistema se construyen desde la fuente (`imagen/`). Licencia vigente: v7.4. Lo nuevo está al final («Versión v7.6»).

---

# AR.T.L.A.S. — Documento de traspaso (handoff) · v6.8

**Versión visible:** v6.8 · **iteración interna:** 70 · **paquetes:** `ARTLAS-v68-*.zip`. La v6.7.2 queda como respaldo. Lo nuevo está al final ('Actualización v6.8'); lo anterior se conserva como historia.

---

# AR.T.L.A.S. — Documento de traspaso (handoff) · v6.7

**Versión visible:** v6.7 · **iteración interna:** 67 · **paquetes:** `ARTLAS-v67-*.zip`.

Parte de la v6.6, que queda como respaldo. Desde esta versión la fuente vive en **`artlas-src/`**, en el paquete `ARTLAS-v67-fuente.zip`. Las carpetas `srcNN/` y la concatenación manual quedan obsoletas.

## 1. Ingeniería

- **Módulos.** El código se dividió en 13 módulos numerados (`src/modulos/00-base.js` … `99-arranque.js`). Siguen siendo scripts globales que se concatenan en orden. Las funciones de la base se envuelven, nunca se redeclaran.
- **Recursos aparte.** El ícono, los archivos del RAG local y el manual se movieron a `src/recursos/` y se publican como `app-recursos.js`, que se carga después de la app.
  - `buildDesktop()` ahora descarga también `app-recursos.js` y lo incluye en el paquete de escritorio.
- **Compilación (`node build.mjs`).**
  - Une los módulos y minifica el JS con esbuild, sin renombrar las funciones globales que usa el HTML.
  - En `app.html`, minifica el CSS y quita los comentarios. En el sitio publicado ya no quedan rastros de iteraciones.
  - Reemplaza `__ARTLAS_VER__`, `__ARTLAS_NUM__` y `__ARTLAS_FECHA__` por los valores de `artlas.config.json`. La versión se cambia solo ahí.
  - Genera `dist/fullstack` y `dist/web-only`.
- **Resultado.**
  - `app.js` pasa de 1,33 MB a **404 KB** (fuente de 462 KB minificada).
  - `app-recursos.js` (891 KB) llega después, sin frenar el arranque.
- **Pruebas automáticas (`tests/suite.py`).**
  - 71 pruebas con verificaciones, agrupadas en 10 conjuntos: ingreso y compilación, router, chat, búsqueda, herramientas, Python, bóveda, Analytics, registro de errores y paquetes (Web only, escritorio y portada).
  - Simulan los modelos y la búsqueda, y bloquean Supabase: no gastan cuota ni tocan producción.
  - Escriben `tests/ultimo-reporte.json`, que la siguiente compilación incluye en la Salud de la plataforma.
  - En GitHub, `.github/workflows/pruebas.yml` compila y prueba en cada `push`. Ahí suma una prueba extra de numpy y matplotlib, que no se puede correr sin internet.
- **Registro de errores.**
  - Captura `error` y `unhandledrejection`.
  - Oculta claves (`sk-`, `gsk_`, `AIza`, `hf_`, `tvly-`, `jina_`) y correos. Ignora ruido de extensiones y `ResizeObserver`.
  - Guarda los últimos 50 en el navegador (`atlas_errlog`).
  - Envía como máximo 15 por sesión a `public.atlas_errors`, si la tabla existe.
- **Salud de la plataforma** (Control Center).
  - Muestra: versión y fecha de compilación, resultado de las pruebas, errores de los últimos 7 días, tamaño de app.js, módulos, registro de errores de todos los usuarios y de este navegador.
  - Visible solo si la función SQL `atlas_is_admin()` devuelve `true`. El mail del administrador vive solo en el SQL, no en el código público.

**Pendiente de Mario:** ejecutar una vez `supabase/registro-errores.sql` en el SQL Editor de Supabase. Sin la tabla, la app funciona igual y guarda los errores solo en cada navegador.

## 2. Python en el navegador (módulo 85)

- Pyodide `314.0.7` desde jsDelivr, cargado recién la primera vez que se usa.
- **Aislamiento.** Corre en un Web Worker tipo módulo: sin DOM ni `localStorage`, así las claves quedan fuera de su alcance. También se anulan `indexedDB` y `caches`.
- **Botón.** Los bloques ```python de cualquier respuesta (chat, Workflows, informes) traen «▶ Ejecutar».
- **Salida.** Muestra print(), el valor final, los errores legibles (sin las líneas internas de Pyodide) y los gráficos de matplotlib como imagen.
- **Paquetes.** Se cargan solos según los `import` del código.
- **Límite de tiempo.** 60 s por ejecución. Si se excede, el worker se reinicia. El estado de las variables se conserva entre ejecuciones, como en un notebook.

## 3. Herramientas para agentes (módulo 86)

- **Agent Studio.** Nuevo campo «🛠️ Herramientas reales» con tres opciones: 🧮 Calculadora exacta, 🐍 Python en el navegador y 🌐 Lector de páginas web.
  - Se guardan en `agent.tools` y se incluyen al exportar e importar agentes.
  - El agente de demostración «Tutor de Redes» trae calculadora y Python.
- **Protocolo.** No depende del proveedor:
  1. El modelo pide la herramienta con un bloque ```` ```tool:calc ````, ```` ```tool:python ```` o ```` ```tool:web ````.
  2. AR.T.L.A.S. la ejecuta, le devuelve el resultado y el modelo continúa.
  - Hasta 4 herramientas por respuesta.
  - Solo en modo de un modelo. En Consenso o Simultáneo responde como antes.
- **Calculadora.** Usa descenso recursivo, sin `eval`.
  - Funciones: log10, ln, raíces, trigonometría, `fspl(d_km,f_mhz)`, `fresnel(d1,d2,f_ghz)`, dBm↔W, dB↔lineal.
  - Constantes: pi, e, c y k.
  - La coma funciona como decimal fuera de las funciones.
- **Respuesta.** Arranca con «🛠️ Pasos del agente»: herramienta, dato y tiempo. Los gráficos de Python se muestran y se guardan con el mensaje (hasta 2, de 260 KB cada uno). «Copiar» no incluye los pasos.
- **Fallos.** Si el modelo falla en el primer paso, se usa el flujo normal con fallback.

## Verificación

- **Suite completa: 71/71.** Se corrió con las librerías y Pyodide servidos localmente.
- **Python:** la ejecución, el error legible, el aislamiento (sin `localStorage` ni IndexedDB), el corte de un bucle infinito con reinicio y el botón en el chat funcionan.
- **Agentes:** el uso de calculadora y de Python como herramientas funciona.
- **Escritorio:** abierto desde `file://` con los recursos incluidos.
- **Sin probar acá:** numpy y matplotlib reales, por falta de acceso a jsDelivr. Los cubre la prueba extra de GitHub Actions.

*Handoff generado el 2026-10-02 · versión v6.7 (iteración interna 67).*

---

# Actualización v6.7.1 (iteración interna 68)

**Problema reportado por Mario (Web only).** Al tocar «▶ Ejecutar» aparecía «No se pudo iniciar Python en el navegador», sin más detalle. El código del ejemplo usaba TensorFlow/Keras.

**Cambios:**

- **Arranque de Python más robusto.** Ahora se prueban tres estrategias en orden; si una no arranca en 10 s, se pasa a la siguiente con el mismo pedido:
  1. Worker desde el archivo del propio sitio (`python-worker.js`, que genera la compilación a partir de `84-python-worker.js`).
  2. Worker tipo módulo desde un blob (el método de la v6.7, que se sigue usando en la versión de escritorio).
  3. Worker clásico con `importScripts`.
- **Diagnóstico.**
  - El worker avisa apenas carga («alive»).
  - Si Pyodide no descarga, se muestra el motivo real («Detalle técnico: …»), con la sugerencia de permitir `cdn.jsdelivr.net` si hay bloqueador o filtro de red.
  - La falla queda en el registro de errores, visible en la Salud de la plataforma.
- **TensorFlow, Keras, PyTorch, JAX, Transformers, XGBoost, LightGBM y CuPy.** No existen para Python en el navegador.
  - En lugar de intentar ejecutarlos, se explica el motivo y se ofrece «Copiar el código y abrir Google Colab».
  - Las herramientas de los agentes le indican al modelo que use numpy, scikit-learn, etc.
- **Versión:** `artlas.config.json` → `v6.7.1`.
- **Pruebas:** 76/76 locales. La prueba del worker clásico y la de numpy y matplotlib corren solo en GitHub Actions, con internet.

---

# Actualización v6.7.2 (iteración interna 69)

**Diagnóstico del caso de Mario.**
- Abrió la Web only **desde el disco** (`D:/…/app.html`, `file://`).
- En `file://`, Chrome no deja que un Web Worker descargue Python:
  - el worker de módulo falla sin mensaje;
  - el clásico falla con `importScripts … failed to load`.
- Lo reproduje exactamente igual en las pruebas. Afecta también a la versión de escritorio.

**Cambios:**

- **Modo compatible (iframe aislado).**
  - Cuarta estrategia, con `sandbox="allow-scripts"` y sin `allow-same-origin`, así que el código no puede leer `localStorage` (claves), IndexedDB ni la página.
  - Carga Pyodide con `<script>`, que sí funciona en `file://`.
  - En `file://` se usa directamente. En la web es el último respaldo.
- **Límite de tiempo en el iframe.** No se puede cortar desde afuera, así que Python se corta a sí mismo con `sys.settrace` (`TiempoExcedido`, 20 s).
- **Cambio de estrategia ante fallas de descarga.** Si un modo arranca pero no puede descargar Python, se pasa al siguiente con el mismo pedido.
- **Botón «Colab ↗» en todos los bloques Python**, junto a «▶ Ejecutar», a pedido de Mario: copia el código y abre un cuaderno nuevo de Google Colab.
- **`input()`.**
  - Si el código pide datos, primero aparece un cuadro para cargarlos, uno por línea.
  - La salida respeta el orden, como en una terminal: «Distancia: 12.5».
  - Si faltan datos, se explica.
- **Programas «de verdad».**
  - `sys.exit(0)` ya no aparece como error.
  - `sys.exit("mensaje")` muestra el mensaje.
  - `argparse` usa los valores por defecto.
  - `if __name__ == "__main__":` se ejecuta.
- **Errores más claros.** Solo se muestran las líneas del código del usuario («tu código», línea N y el texto de esa línea), sin el interior de Pyodide.
- **Versión:** `v6.7.2`.
- **Pruebas:** 85/85 locales. Las nuevas cubren: Web only abierta desde el disco, escritorio con Python, aislamiento y corte de bucles en el iframe, paso al modo siguiente, `input()`, `sys.exit`, y el botón de Colab en todos los bloques.

---

# Actualización v6.8 (iteración interna 70) · App instalable y protección contra copia

**Pedido de Mario:** una app instalable desde Chrome o Edge en la PC, que quede como ícono en el celular y se actualice sola. Al ver la pantalla de prueba agregó dos condiciones: que la app exija registro, como el zip de Escritorio, y que esté protegida contra copia.

## 1. App instalable (módulo 88)

- **Archivos nuevos del sitio:**
  - `manifest.webmanifest`: nombre AR.T.L.A.S., ventana propia y abre en `app.html?app=1`;
  - `sw.js`: service worker con la versión;
  - íconos `icono-192.png`, `icono-512.png`, `icono-maskable-512.png` y `apple-touch-icon.png`, hechos con el emblema;
  - `_headers`.
  - Van en Fullstack y en Web only.
- **Registro obligatorio:**
  - El manifiesto y el service worker se agregan solo con la sesión iniciada. Para un invitado, el navegador no ofrece instalar.
  - En Descargas aparece primero «📲 Instalar la app» con la etiqueta IDEAL. Para invitados va difuminado y con candado, igual que Escritorio y RAG.
  - La app instalada no tiene «Ingresar como invitado» y muestra el aviso «La app instalada es para usuarios registrados». Tampoco se puede entrar con `#demo`. Al cerrar sesión vuelve a la pantalla de ingreso.
- **Instalar:**
  - Si el navegador lo permite, el botón abre la instalación nativa.
  - Si no, muestra los pasos para PC (Chrome/Edge), Android o iPhone.
  - Los usuarios registrados ven además una tarjeta «Instalá AR.T.L.A.S.» al pie de la barra lateral, que se puede cerrar.
- **Actualización automática:**
  - `sw.js` lleva la versión, así que cada publicación lo cambia.
  - La app consulta si hay una versión nueva al abrirse, al volver a la ventana y cada hora. Si la hay, muestra «✨ Hay una versión nueva de AR.T.L.A.S. (vX)» con «Actualizar ahora» o «Más tarde».
  - La página se pide primero a la red, así que con conexión siempre llega la última.
  - Sin conexión, la app abre desde la copia guardada.
- **Escritorio** sigue igual (zip, para quien lo prefiera).

## 2. Protección contra copia (módulo 89 + build.mjs)

- **`app.js` se publica codificado.** Es una rotación de caracteres con una clave que cambia en cada compilación. Al abrirlo o descargarlo solo se ve un aviso de copyright y texto ilegible; el navegador lo decodifica al cargar. Pesa 438 KB, contra 428 KB sin proteger.
- **Dominios autorizados.** Se configuran en `artlas.config.json` → `dominios`: `artlas.ar` (y `www`), `artlas.netlify.app`, `artlas-ai-arg.netlify.app` y sus vistas previas de Netlify (`xxxx--artlas.netlify.app`, `xxxx--artlas-ai-arg.netlify.app`), más `localhost` y `127.0.0.1` para pruebas. El resto de `*.netlify.app` queda bloqueado. También funciona desde el disco (Escritorio y Web only local).
  - En cualquier otro sitio aparece «Copia no autorizada de AR.T.L.A.S.», que no se puede quitar, y el intento queda en el registro de errores (tipo `copia`).
- **En la app instalada**, igual que en Escritorio, se bloquean:
  - el menú contextual, salvo en campos de texto o con texto seleccionado, para poder copiar respuestas;
  - F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S y el arrastre de imágenes.
- **Escritorio:** `buildDesktop` decodifica `app.js` antes de cifrarlo con su propio método.
- **Límite:** ninguna página web puede ocultar su código por completo. Esto disuade la copia; no la hace imposible.

## Verificación

- **Suite: 113/113.** Las 28 pruebas nuevas cubren:
  - manifiesto, service worker e íconos publicados;
  - invitado sin instalación y con candado;
  - usuario registrado con instalación, pasos e instalación nativa;
  - apertura sin conexión;
  - aviso de versión nueva y «Actualizar ahora» con un `sw.js` modificado de verdad;
  - app instalada sin invitado, ni con `#demo`, entrada con cuenta y vuelta al ingreso al cerrar sesión;
  - bloqueos de teclado y menú, con el menú y la copia que sí deben funcionar;
  - `app.js` ilegible pero recuperable para Escritorio;
  - dominios, y copia en otro dominio bloqueada y registrada.
- **Para hacer a mano en artlas.ar:** instalar desde Chrome en la PC y desde Android. Las pruebas automáticas usan un navegador sin interfaz, que no muestra el diálogo real de instalación.

**Dominios confirmados por Mario:** https://artlas.ar/, https://artlas.netlify.app/ y https://artlas-ai-arg.netlify.app/. Para sumar otro sitio, se agrega a `dominios` y se compila.

---

# Actualización v6.8.1 (iteración interna 71)

**Pedido de Mario.** El saludo del chat debe depender del horario y decir «¿en qué te puedo ayudar?»:

| Saludo | Horario |
|---|---|
| Buen día | 6:00 a 12:00 |
| Buenas tardes | 12:01 a 20:00 |
| Buenas noches | 20:01 a 5:59 |

**Problema anterior.** El saludo solo miraba la hora, no los minutos. Por eso decía «Buen día» de 0:00 a 11:59, incluida la madrugada.

**Cambios:**
- Nueva función `v60Saludo()` en el módulo 30. La usan el chat (módulo 60) y el Command Center.
- El chat muestra «Buenas tardes · ¿en qué te puedo ayudar?», con el saludo que corresponda a la hora.
- El saludo se revisa cada minuto. Si la pantalla queda abierta al cambiar de franja, se actualiza solo.
- Versión: v6.8.1. Al publicarla, quien tenga la app instalada verá el aviso «Hay una versión nueva de AR.T.L.A.S. (v6.8.1)».

**Pruebas:** 115/115. Las dos nuevas verifican los límites de horario (5:59, 6:00, 12:00, 12:01, 20:00, 20:01 y 0:30) y el texto del chat.

---

# Actualización v6.8.2 (iteración interna 72) · Licencia, términos de uso y privacidad

**Pedido de Mario:**
- una casilla de aceptación al registrarse, para evitar que Escritorio, RAG o la app se clonen o se repartan;
- un PDF que explique que AR.T.L.A.S. es de uso libre y gratuito, pero sin permiso para copiarlo, clonarlo, reutilizar su código ni cambiar sus nombres o autores.

## Documento

- **Fuente única:** `src/licencia/licencia.py`, con el texto de Mario del 5/10/2026. Genera:
  - `licencia-artlas.pdf`: 6 páginas, A4, con el estilo navy/cian;
  - `src/recursos/40-licencia.js`: el texto para leerlo dentro de la app.
- **Correcciones sobre el original:**
  - se quitaron dos marcas de citas que habían quedado del borrador («cite turn0search…») en las secciones 3 y 12;
  - se ordenó el encabezado: versión del documento, fecha de vigencia, titular, ecosistema y contacto;
  - las enumeraciones de las secciones 4 y 5 se pasaron a listas.
- **Agregados para revisar:**
  - la **sección 16** describe lo que la app hace realmente;
  - el **Anexo I** detalla los datos que trata esta versión, sus finalidades, los servicios de terceros, la conservación y los derechos del titular, con el aviso de la AAIP (Ley 25.326, art. 14 inc. 3);
  - la **sección 18** indica el canal de contacto: mfiguero@gmail.com.
- **Configuración** (`artlas.config.json` → `licencia`): `{ver: "v6.8.2", fecha: "5 de octubre de 2026", marca: "®", contacto: "mfiguero@gmail.com"}`.

## App (módulo 91)

- **Cuenta AR.T.L.A.S.**
  - Casilla **sin marcar**: «He leído y acepto la Política de Privacidad, los Términos de Uso y la Licencia AR.T.L.A.S. v6.8.2». El nombre del documento abre el texto completo.
  - Sin marcarla, «Crear cuenta» no avanza: la casilla se marca en rojo y aparece el motivo.
  - Si un usuario existente la marca al ingresar, también queda registrada.
- **Aceptación obligatoria**, una vez por versión del documento, para:
  - descargar Escritorio y descargar RAG;
  - instalar la app;
  - entrar a la app instalada.
  - Muestra un resumen («uso libre y gratuito, pero…»), el documento completo, la descarga del PDF y la casilla. «Aceptar y continuar» se habilita recién al marcarla y retoma la acción.
- **Registro del consentimiento:**
  - en la cuenta (`user_metadata.artlas_lic`: versión, fecha y hora, versión de la app y origen);
  - en el navegador;
  - en la tabla `atlas_consents`, si existe, con fecha y hora del servidor, IP y navegador.
- **El PDF va dentro de los paquetes:** `licencia-artlas.pdf` en el zip de Escritorio (también se abre desde la app de escritorio) y `ARTLAS_RAG/LICENCIA-AR.T.L.A.S.pdf` en el de RAG. También se publica en el sitio.
- **Enlaces al documento:** en la pantalla de ingreso («Política de privacidad · Términos de uso · Licencia») y al pie de la barra lateral («Licencia y privacidad»).
- **Nueva versión del documento:** se sube `licencia.ver` en la configuración. Los usuarios vuelven a aceptar en su próxima descarga, instalación o ingreso a la app.

## Pendiente de Mario

- Ejecutar `supabase/consentimientos.sql` en Supabase, después de `registro-errores.sql`.
  - Sin la tabla, la aceptación igual queda en la cuenta y en el navegador.
  - Con la tabla, queda además un registro que nadie puede modificar desde la app, con fecha, hora e IP del servidor.
- Revisar el documento con un abogado:
  - la sección 17 (competencia territorial) sigue diciendo que se definirá con asesoramiento jurídico;
  - confirmar que la marca está concedida en el INPI para usar ®. Si no, cambiar `marca` a «™».

**Pruebas:** 129/129. Las nuevas cubren:
- la casilla sin marcar y su texto exacto;
- el bloqueo del registro sin la casilla;
- la aceptación guardada al registrarse;
- el documento completo en la app;
- los enlaces;
- la aceptación antes de descargar Escritorio, con el PDF en el zip;
- RAG con el PDF;
- la aceptación antes de instalar y de entrar a la app instalada.

---

# Actualización v6.8.3 (iteración interna 73) · La aceptación también al ingresar

**Reporte de Mario.** Al ingresar con usuario y clave sin tildar la casilla, igual entraba a la plataforma y podía descargar RAG desde la versión Escritorio.

**Causa:**
- En la v6.8.2 la casilla solo era obligatoria para crear la cuenta. Al ingresar se pedía recién al descargar o instalar.
- Si la cuenta ya había aceptado esa versión del documento (por ejemplo, al descargar Escritorio desde la web), la descarga de RAG quedaba habilitada sin volver a preguntar, que era lo previsto.
- Las copias de Escritorio descargadas antes de la v6.8.2 no tienen la verificación.

**Cambios (módulo 91):**
- **«Ingresar» exige la casilla** si la cuenta todavía no aceptó la versión vigente del documento.
  - La verificación se hace apenas Supabase valida usuario y clave: si falta la aceptación, esa sesión se cierra en el acto y aparece el motivo.
  - Si la cuenta ya aceptó esa versión, entra sin volver a tildar.
- **Sesión recuperada sin aceptación** (al volver a abrir, o al ingresar con el código de recuperación de clave):
  - si la pantalla de ingreso está visible, se pide aceptar al tocar «INICIAR SESIÓN»;
  - si la sesión aparece cuando el usuario ya está adentro, se pide en ese momento;
  - en ambos casos, «Cancelar y cerrar sesión» cierra la sesión y vuelve al ingreso.
  - Vale para la web, Escritorio y la app instalada.
- **Sin cambios:** las descargas y la instalación siguen exigiendo la aceptación vigente, y el documento sigue siendo la versión v6.8.2.
- **Versión:** v6.8.3.

**Pruebas:** 136/136. Las nuevas cubren:
- ingreso sin tildar, que se rechaza y cierra la sesión;
- ingreso tildando, que se registra con origen «ingreso»;
- cuenta que ya había aceptado;
- sesión recuperada, con cancelación que cierra la sesión;
- sesión que aparece cuando el usuario ya está adentro;
- descarga de RAG en Escritorio sin aceptación.

## Documento actualizado a v6.8.3 (mismo paquete v6.8.3)

- **Pedido de Mario:** actualizar el documento de licencia y privacidad para la v6.8.3.
- **Configuración:** `licencia.ver` → v6.8.3. La casilla, el PDF y el texto de la app dicen «Licencia AR.T.L.A.S. v6.8.3».
- **Sección 16:**
  - la aceptación se exige también para ingresar con la cuenta;
  - si falta, la sesión se cierra en el acto;
  - las sesiones recuperadas, sola o con el código de recuperación de clave, deben aceptar antes de continuar;
  - se pide una vez por versión del documento.
- **Nuevo apartado «Historial de versiones del documento»:** v6.8.2 (versión inicial) y v6.8.3.
- **Efecto:** como cambió la versión del documento, quienes aceptaron la v6.8.2 la aceptan de nuevo en su próximo ingreso, descarga o instalación.
- **Identificador de compilación (`__ARTLAS_BID__`):**
  - se agrega a `app.js?v=…`, `app-recursos.js?v=…` y al nombre de la caché de `sw.js`;
  - así, cada publicación se descarga de nuevo y la app instalada se actualiza aunque la versión visible no cambie.
- **Pruebas:** 136/136.

## Documento en español e inglés (misma versión v6.8.3)

- **Pedido de Mario:** el documento de licencia y privacidad en español e inglés, en la misma versión v6.8.3.
- **Traducción:** `src/licencia/licencia_en.py` contiene la traducción completa al inglés, con las mismas 18 secciones, la declaración final, el Anexo I con el aviso de la AAIP y el historial de versiones.
  - Si la estructura no coincide con la española (cantidad de secciones o de ítems), `licencia.py` se detiene con un error.
  - Ambas versiones aclaran: «Ante cualquier discrepancia, prevalece la versión en español».
- **PDF (`licencia-artlas.pdf`, 12 páginas):** español (versión original) en las páginas 1 a 6 e inglés (traducción de cortesía) en las páginas 7 a 12. El pie de página es bilingüe.
- **En la app:** el documento tiene un selector «Español / English».
  - Arranca en el idioma de la app; cambia el texto y la fecha de vigencia («effective October 5, 2026»).
  - El enlace al PDF dice «Descargar el documento en PDF (español e inglés)».
- **Configuración:** `licencia.fecha_en` = «October 5, 2026».
- **Historial:** en la entrada v6.8.3 dice «Se agrega la versión en inglés».
- **Sin nueva aceptación:** la versión del documento sigue siendo v6.8.3, así que nadie tiene que volver a aceptar por este cambio.
- **Pruebas:** 138/138. Las nuevas verifican el selector de idioma con el texto en inglés y que el PDF trae los dos idiomas.


---

# Actualización v6.9 (iteración interna 74) · AR.T.L.A.S. OS

**Pedido de Mario:** convertir AR.T.L.A.S. en un sistema operativo de IA, para la web y Escritorio, que lea carpetas, gestione aplicaciones e interactúe con la PC. Además: un LLM local, aunque sea pequeño, junto a las APIs del router, e integración con OpenOffice/LibreOffice. Mario aprobó el mockup y el plan antes de implementar.

**Enfoque.** No es un SO con kernel sino un entorno operativo de IA sobre Windows, macOS o Linux. Lo que el navegador no puede hacer (disco completo, apps, procesos, terminal, Ollama, LibreOffice) lo resuelve un **núcleo local** que el usuario corre en su PC. La base no se tocó: módulos 92 a 98 que envuelven funciones.

## 1. Escritorio (módulo 92)
- Entrada: botón lateral «🖥️ AR.T.L.A.S. OS» o `app.html?os=1` (abre después del ingreso).
- Escritorio con íconos, ventanas (mover, maximizar, minimizar), barra de tareas, lanzador con búsqueda y barra «Pedile algo a AR.T.L.A.S.».
- Barra superior: motor de IA en uso, estado del núcleo, reloj y «Salir» a la plataforma clásica.
- Apps: Asistente, Archivos, Oficina, Aplicaciones, Terminal, Monitor del sistema, Modelos IA, Configuración, Plataforma, más Editor y Visor.
- En el móvil las ventanas se abren maximizadas.

## 2. Núcleo local (`src/nucleo/`, cliente en el módulo 93)
- `artlas-nucleo.mjs`: Node 18+, sin dependencias, escucha solo en `127.0.0.1:8770`. Lanzadores `Iniciar-Nucleo.bat` e `iniciar-nucleo.sh`, y `LEEME-NUCLEO.txt`.
- Se descarga desde Configuración → Núcleo local, solo con cuenta y licencia aceptada. El paquete viaja en `app-recursos.js`, así que funciona también en Escritorio sin red.
- **Seguridad:**
  - emparejamiento con un código de 6 dígitos que se muestra en la consola y se renueva tras cada uso o tras 5 errores;
  - solo orígenes de AR.T.L.A.S. y control del Host contra DNS rebinding;
  - las raíces y los permisos se cambian solo en `~/.artlas-nucleo/config.json`, nunca desde la web; también rechaza enlaces simbólicos que salen de las raíces;
  - borrar mueve a una papelera restaurable y sobrescribir guarda antes una copia;
  - no cierra procesos del sistema ni hay elevación de administrador;
  - registro de actividad en `registro.jsonl`.
- **Terminal con lista blanca** (ping, ipconfig, tracert, nslookup, netstat, systeminfo, git status…):
  - se valida cada argumento: bloquea `python -c`, `node -e`, `curl -o`, `git --output` y los comandos que modifican la red (`ip/route/arp add|del…`);
  - la «terminal libre» existe, pero solo se activa en `config.json` y siempre con confirmación.

## 3. Archivos (módulo 94)
Rutas unificadas:
- `pc:` disco de la PC, a través del núcleo;
- `fsa:` carpetas conectadas en el navegador (Chrome/Edge);
- `opfs:` unidad privada «Unidad AR.T.L.A.S.».

Explorador con renombrar, mover, duplicar, descargar, papelera, búsqueda, Editor (texto y código) y Visor.

## 4. IA local y router (módulos 95 y 97)
- **Modelos IA:**
  - WebLLM (WebGPU) en el navegador: Qwen 2.5 0,5B/1,5B/3B, Llama 3.2 1B y Phi 3.5 mini;
  - Ollama a través del núcleo, que hace de puente y evita configurar CORS: detecta, descarga con progreso, usa y borra modelos.
- **Motor del asistente:** Automático (router), Local primero, Solo local o Proveedor fijo.
- **Privacidad:** con la casilla «el contenido de mis archivos solo lo procesa un modelo local», ningún archivo se envía a una API externa.
- **Router de la plataforma:**
  - Ollama se suma a Simultáneo y Consenso;
  - estrategia nueva «🔒 Local primero» (métrica privacidad);
  - el modelo local reemplaza al Básico gratis cuando está cargado;
  - sin internet, todo pasa al modelo local.

## 5. Asistente del sistema (módulo 96)
- Protocolo `tool:os` (JSON, una operación o un plan). Las lecturas se ejecutan solas. Lo que modifica algo muestra una tarjeta de aprobación donde cada acción se puede destildar.
- Hasta 10 pasos por pedido. Para modelos pequeños usa instrucciones breves.
- Atajos sin modelo: «abrí la calculadora», «ping 8.8.8.8», «estado del sistema».

## 6. Oficina (módulo 98) · LibreOffice / OpenOffice
- **Con el núcleo y LibreOffice:**
  - crea Word, ODT y PDF desde Markdown (títulos, listas y tablas, con el estilo azul marino de AR.T.L.A.S.);
  - crea Excel y ODS desde CSV, con las fórmulas evaluadas (`=AVERAGE(B2:D2)`) y punto decimal forzado (en-US) para que funcione igual en Windows en español;
  - convierte docx↔pdf↔odt, xlsx↔ods↔csv y pptx→pdf;
  - abre Writer, Calc e Impress.
- **Apache OpenOffice** se detecta, pero solo abre documentos: no admite `--convert-to`. La app recomienda instalar LibreOffice; pueden convivir.
- **Sin LibreOffice o sin núcleo:** .docx (generador propio con JSZip) y .xlsx, .ods y .csv (SheetJS) en el navegador, guardados en cualquier carpeta del OS.
- **App Oficina:** abrir en blanco, «Crear con AR.T.L.A.S.» (borrador editable en Markdown o CSV y guardado) y «Convertir un archivo».
- **En Archivos**, los documentos suman los botones «PDF», «Convertir…» y «LibreOffice».
- **Asistente:** `office.crear`, `office.convertir` y `office.abrir` piden aprobación; `office.estado` es lectura. Atajo: «abrí una planilla» abre Calc.
- **Fuera de alcance por ahora:** generar presentaciones automáticamente. Impress se abre en blanco y los .pptx se convierten.
- Si LibreOffice está en una ruta no estándar, se indica con `"office"` en `config.json`.

## Verificación
- `tests/os_pruebas.py` corre dentro de `suite.py` o solo (`python3 tests/os_pruebas.py`). Levanta el núcleo real con una carpeta temporal, simula Ollama y usa el LibreOffice del sistema; si no está instalado, esas pruebas se omiten.
- Cubre:
  - la seguridad del núcleo: tokens, orígenes, Host, traversal, symlinks y lista blanca;
  - papelera y registro de actividad;
  - Word/ODT/PDF/Excel con LibreOffice y .docx/.xlsx en el navegador;
  - el router con el modelo local y sin internet;
  - un plan del asistente con una acción destildada que no se ejecuta;
  - privacidad, Terminal y Monitor;
  - el móvil y la descarga del núcleo para invitados y registrados.
- **Total: 213/213** (138 de la plataforma + 34 del núcleo + 41 del OS en el navegador).

## Pendiente
- Probar en la PC de Mario: Windows 11, LibreOffice y Ollama reales, y Chrome/Edge para WebGPU.
- Mejoras posibles:
  - presentaciones automáticas (Impress);
  - empaquetar Escritorio con el núcleo incluido (Tauri o Electron);
  - lectura de PDF y Word por el asistente con el modelo local en documentos largos.


---

# Actualización v6.9.1 (iteración interna 75) · Nuevo escritorio de AR.T.L.A.S. OS

**Pedido de Mario:** reemplazar la pantalla del OS por su diseño «Escritorio futurista» con los íconos ilustrados, y usar su logo para AR.T.L.A.S.

**Cambios (módulo 92 y `src/recursos/50-os-imagenes.js`):**
- **Fondo:** degradé radial azul profundo con los meridianos del globo y un resplandor cian en el horizonte.
- **Portada central:** el logo de AR.T.L.A.S., «AR.T.L.A.S. OS» con «OS» en cian y el lema «INTELIGENCIA · DATOS · CONECTIVIDAD» (en inglés: «INTELLIGENCE · DATA · CONNECTIVITY»). El texto es HTML, no imagen: se ve nítido y se traduce.
- **Íconos ilustrados** para Terminal, Plataforma, Archivos, Monitor del sistema, Aplicaciones, Modelos IA, Oficina y Configuración, recortados del diseño de Mario con esquinas redondeadas transparentes.
  - El de AR.T.L.A.S. usa el logo que envió Mario, con el fondo quitado, sobre una baldosa con borde cian.
  - También se usan en el lanzador, la barra de tareas y la barra de título de cada ventana.
- **Disposición:** en 4 filas por columna, como el diseño: AR.T.L.A.S., Archivos, Aplicaciones y Oficina; luego Terminal, Monitor del sistema, Modelos IA y Configuración; y Plataforma. En pantallas bajas y en el móvil los íconos se reacomodan solos.
- **Barra superior:** logo y «AR.T.L.A.S. OS» con la versión en cian; separadores entre router, núcleo y reloj; «Salir» con el logo. En el móvil el reloj muestra solo la hora.
- **Barra inferior:** botón de inicio azul más grande y buscador con lupa.
- **Imágenes:** 69 KB en `app-recursos.js` (`window.ARTLAS_OS_IMG`). Si todavía no cargaron, el escritorio muestra los íconos de trazo y los reemplaza al llegar.
- **Sin cambios funcionales.**

**Pruebas:** 4 nuevas sobre el tema (imágenes por app, íconos ilustrados, portada y logos, disposición en columnas). Total: 217/217.


---

# Actualización v6.9.2 (iteración interna 76) · Correcciones de la prueba de Mario

**Reporte de Mario**, probando la copia web-only abierta desde el disco (`file://`) en una ventana de Chrome de 1361×582:
1. Los íconos eran demasiado grandes.
2. Al abrir un .doc aparecía «Sin visor para .doc», aunque LibreOffice está instalado.
3. Quiere usar en el OS los LLM que ya funcionan en AR.T.L.A.S. Web.

Además, «Exit» y el buscador quedaban en inglés con la app en español.

**1. Íconos proporcionales a la pantalla (módulo 92).**
- El tamaño sale de la ventana: `--ti = clamp(40px, min(4vw, 8.6vh), 80px)`. Las filas, columnas, letra y márgenes se calculan desde ese valor.
- Con 1361×582 quedan íconos de unos 50 px; a pantalla completa, de unos 70 a 80 px.
- Las 4 filas del diseño se mantienen desde 520 px de alto.
- La portada también escala según el alto.

**2. Abrir documentos de oficina (módulo 98 y núcleo).**
- **Disco de la PC (`pc:`):** abre con LibreOffice; si no está, con la app predeterminada del sistema.
- **Carpeta conectada en el navegador (`fsa:`) o Unidad AR.T.L.A.S. (`opfs:`)** — era el caso del reporte: el núcleo no ve esas carpetas, así que recibe el archivo y abre una **copia** en `~/.artlas-nucleo/abiertos/<id>/`.
  - Al volver al navegador (foco o visibilidad), si la copia cambió, AR.T.L.A.S. pregunta si pasa los cambios al original; la versión anterior va a la papelera.
  - Operaciones nuevas del núcleo: `fs.abrirCopia`, `fs.estadoCopia` y `fs.leerCopia`. El id se valida, no se aceptan rutas.
  - Las copias se borran a los 7 días.
- **Sin núcleo:** vista previa de solo lectura de .docx (mammoth) y de .xlsx, .xls, .ods y .csv (SheetJS). Para los demás formatos se explica qué hace falta.
- En Archivos, el botón «LibreOffice» aparece para cualquier documento si hay núcleo, y «Vista previa» si no lo hay.
- **Detección de LibreOffice ampliada:** instalación por usuario (`%LOCALAPPDATA%\Programs`), `C:`, `D:` y `E:` (incluida la versión Portable) y `soffice` en el PATH.
- **Núcleo de una versión anterior:** se avisa que hay que descargarlo de nuevo y se muestra la vista previa. **Mario tiene que volver a descargar el núcleo.**

**3. APIs de AR.T.L.A.S. Web en el OS (módulo 97).**
- El OS ya usa las mismas claves y el mismo router. La causa del reporte es que la copia abierta desde el disco (`file://`) tiene un almacenamiento del navegador distinto del sitio web, así que no ve sus claves.
- Modelos IA suma la sección «APIs de AR.T.L.A.S. Web» con:
  - el estado de cada proveedor;
  - «Conectar o editar claves» (abre el diálogo de la plataforma encima del OS);
  - «Desbloquear bóveda» si las claves están cifradas;
  - «Traer mi configuración de la cuenta» o «Ingresar con mi cuenta»;
  - para las copias `file://`, la explicación y el camino: activar en la web la sincronización de claves con la cuenta e ingresar en la copia.
- Para que el asistente use las APIs, el motor tiene que estar en «Automático»; el modelo local queda de respaldo sin internet.

**Idioma (módulo 92).** El placeholder, «Salir», el lema y los íconos siguen al botón ES/EN (envoltura de `toggleLang`) y se revisan cada vez que se abre el OS.

**Descargar o actualizar el núcleo.** Antes, con el núcleo conectado, Configuración → Núcleo local ocultaba el botón de descarga, y Mario no lo encontraba. Ahora siempre está: «Descargar el núcleo de nuevo», o «Actualizar el núcleo (hay versión nueva)» resaltado si el núcleo instalado es de una versión anterior a la app. En ese caso también aparece un aviso al abrir el OS.

**Otros.**
- Los diálogos de la plataforma (`#overlay`) se ven encima del OS (`body.aos-on`).
- El tope de `app.js` minificado pasa de 600 a 650 KB: el OS completo dejó la compilación en 599 KB.

**Pruebas:** 9 nuevas, entre ellas copia abierta y cambios devueltos al original, id inválido, `pc:` sin copia, sección de APIs, diálogo encima del OS, idioma, tamaño de íconos, ventana de 1361×582 y vista previa sin núcleo. Total: 228/228.


---

# Actualización v6.9.3 (iteración interna 77) · Navegador y «buscar en la web» desde el asistente

**Pedido de Mario:** un navegador como Chrome dentro del OS o, si AR.T.L.A.S. no tiene la respuesta, que ofrezca navegar para consultarla. Se hicieron las dos cosas.

**Límite técnico.** Una página web no puede contener un Chrome completo, y muchos sitios (Google, bancos, redes sociales) prohíben mostrarse dentro de otra página. Por eso el Navegador combina tres modos:
- **Lectura**, el modo por defecto, que funciona con cualquier sitio;
- **Original**, la página dentro de la ventana, cuando el sitio lo permite;
- **«Abrir en Chrome»**, que abre la página en el navegador real de la PC.

## 1. App Navegador (módulo `98-os-navegador`, ícono ilustrado en el mismo estilo)
- Barra con atrás, adelante, recargar, inicio y dirección o búsqueda. Si se escribe una dirección, la abre; si no, busca.
- **Inicio:** buscador y accesos a Google, Wikipedia, Google Académico, arXiv, YouTube y Hugging Face.
- **Búsqueda:** usa los buscadores de la plataforma (Tavily, si hay clave, o DuckDuckGo y Wikipedia, con Google Noticias de respaldo). Ofrece «Responder con AR.T.L.A.S.», que resume los resultados citando las fuentes, y «Ver en Google (Chrome)».
- **Lectura:** la página se muestra limpia y con enlaces que navegan dentro del OS. La lee el núcleo (`web.leer`) o, sin núcleo, Jina Reader.
- **Original:** iframe con sandbox y un aviso si el sitio no permite mostrarse.
- **YouTube:** se reproduce embebido.
- **«Preguntar a AR.T.L.A.S.»:** adjunta la página o la búsqueda al asistente.
- **«Abrir en Chrome»:** con núcleo usa `web.abrir` (el navegador predeterminado de la PC); sin núcleo, una pestaña nueva.

## 2. Núcleo
- `web.leer {url}` descarga la página y la convierte en texto con títulos, listas, negritas y enlaces absolutos. Descarta scripts, menús y pie.
- `web.abrir {url}` la abre en el navegador de la PC.
- Seguridad:
  - solo http y https;
  - bloquea direcciones de la red local (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, IPv6 locales), también después de cada redirección;
  - máximo 4 MB, 15 segundos y 6 redirecciones;
  - permiso nuevo `web`; `web_red_local: true` lo habilita para pruebas.

## 3. Asistente
- **Herramientas nuevas:** `web.buscar {q}` y `web.leer {url}` son lecturas y se ejecutan sin aprobación. `web.navegar {url|q}` abre el Navegador. Las instrucciones le piden buscar en lugar de decir «no sé» y citar las URLs.
- **Respuesta sin el dato o pregunta de actualidad** (mismos detectores del módulo 70), cuando no hubo búsqueda en ese turno: aparecen los botones **«🔎 Buscar en la web y responder»** (busca, lee las 2 primeras páginas y vuelve a preguntar con las fuentes) y **«🌐 Abrir en el Navegador»**.
- **Modo «Solo local»:** el asistente no sale a internet.
- **Atajos sin modelo:** «buscá en la web …», «abrí wikipedia.org» y «abrí el navegador».

**Verificación.** Pruebas nuevas con un sitio web local de prueba:
- lectura, redirección y limpieza;
- bloqueo de la red local y de esquemas que no son http/https;
- lectura, enlaces y «Atrás» en el Navegador;
- resultados de búsqueda y modo Original;
- atajos;
- `web.leer` desde el asistente;
- la oferta de buscar y la respuesta con fuentes;
- «Solo local».

Total: 241/241.

**Para Mario:** hay que volver a descargar el núcleo (Configuración → Núcleo local → «Actualizar el núcleo»). Sin núcleo nuevo, el Navegador lee las páginas con Jina Reader.


---

# Actualización v6.9.4 (iteración interna 78) · Íconos de las aplicaciones y de Oficina, y error al renombrar

**Pedido de Mario:**
- que se vean los íconos de las aplicaciones;
- que se vean también los íconos en Oficina;
- corregir el error en inglés al renombrar una imagen de una carpeta conectada (Pictures): «It was determined that certain files are unsafe for access within a Web application, or that too many calls are being made on file resources».

**1. Aplicaciones con su ícono real (núcleo `app.iconos` y módulo 97).**
- **Windows:** un script de PowerShell con System.Drawing toma el ícono del `IconLocation` del acceso directo (.lnk), del `IconFile` de los .url o del ejecutable de destino.
- **Linux:** el `Icon=` del .desktop, en hicolor o pixmaps.
- **macOS:** el .icns del paquete, convertido con `sips`.
- **Caché y seguridad:**
  - los íconos se guardan en `~/.artlas-nucleo/iconos/`; los que no tienen ícono quedan marcados para no reintentarlos;
  - el script de PowerShell corre una sola vez por tanda de 40;
  - solo se aceptan ids de la lista de apps, nunca rutas arbitrarias.
- **Ventana:** cuadrícula tipo lanzador, con ícono de 40 px, nombre en dos líneas y carpeta. Mientras carga, o si no hay ícono, muestra la inicial sobre un fondo azul. Con un núcleo anterior quedan las iniciales.

**2. Oficina.**
- Documento, Hoja de cálculo y Presentación pasan a ser tarjetas con el ícono de **Writer, Calc e Impress** que entrega el núcleo (`office.iconos`, tomados de los ejecutables o los temas de LibreOffice). Sin núcleo se usan íconos propios.
- Los títulos de las secciones también llevan ícono.

**3. Error al renombrar.**
- **Causa:** en las carpetas conectadas desde el navegador, renombrar se hacía copiando el archivo con otro nombre y borrando el original, y Chrome puede bloquear esa escritura con un `SecurityError`.
- **Arreglo:**
  - se usa el renombrado nativo de Chrome (`FileSystemHandle.move`), que no reescribe el archivo, y la copia queda solo como respaldo;
  - si Chrome igual lo bloquea, el mensaje se explica en castellano y propone hacerlo desde «Esta PC (núcleo)»;
  - al renombrar se conserva la extensión si no se escribe («Clau y Mario» pasa a ser «Clau y Mario.png») y se quitan los puntos o espacios finales.
- **Núcleo:** Imágenes, Música y Videos se suman una vez a las carpetas permitidas, también en configuraciones existentes (`raices_v: 2`). Así las fotos se manejan desde el núcleo, sin las limitaciones de Chrome.

**Pruebas nuevas:**
- `app.iconos` (con ids ajenos rechazados);
- `office.iconos`;
- migración de carpetas;
- cuadrícula de aplicaciones con íconos;
- tarjetas de Oficina;
- renombrar conservando la extensión;
- mensaje del error de Chrome.

Total: 248/248.

**Para Mario:** volver a descargar el núcleo (Configuración → Núcleo local → «Actualizar el núcleo»).


---

# Versión v7.0 (iteración interna 79) · AR.T.L.A.S. OS

**Decisión de Mario:** la versión nueva se llama **AR.T.L.A.S. OS v7.0** y se publica como **Web only** y **Fullstack**.

- **Versión visible** (`artlas.config.json → ver`): v7.0. Aparece en la barra del OS, en la plataforma, en `sw.js`, en `app.js` y en el núcleo descargable.
- **Paquetes:** `ARTLAS-OS-v70-web-only.zip`, `ARTLAS-OS-v70-fullstack.zip` y `ARTLAS-OS-v70-fuente.zip`.
- **LÉAME del paquete web-only:** encabezado «AR.T.L.A.S. OS v7.0 · Web only».
- **Licencia:** el documento sigue en v6.8.3, así que nadie tiene que volver a aceptarla.
- **Núcleo:** los núcleos instalados (v6.9.x) se detectan como anteriores y el OS ofrece «Actualizar el núcleo».
- **Roadmap:** la v7.0 era la reservada para AR.T.L.A.S. Edu, que pasa a una versión posterior.
- **Sin cambios de funcionamiento** respecto de la v6.9.4.
- **Pruebas:** 248/248.


---

# Versión v7.1 (iteración interna 80) · Íconos sin espera y licencia v7.1

**Pedidos de Mario:**
1. Que los íconos de las aplicaciones no tarden tanto: la primera carga lo había asustado.
2. Actualizar la licencia como «Licencia AR.T.L.A.S. v6.8.3 original» y, abajo, «Versión nueva 7.1».

**1. Íconos (módulo 97).**
- **Precarga en segundo plano:** 2,5 segundos después de conectar el núcleo, el OS pide la lista de aplicaciones y sus íconos (`aosIcoPrefetch`). Cuando se abre Aplicaciones, ya están en la caché.
- **Progreso visible:** si todavía faltan íconos, la ventana muestra «Cargando íconos… 80 de 160» con una barra y el aviso «la primera vez tarda; después quedan guardados».
- Los pedidos al núcleo no se duplican si la precarga y la ventana coinciden (`AOS._icoPend`).

**2. Licencia v7.1 (`src/licencia/`, `artlas.config.json → licencia`).**
- **Configuración:** `ver: v7.1`, `original: v6.8.3` y sus fechas; vigencia desde el 7 de octubre de 2026.
- **Encabezado del documento (PDF y app):** «Versión del documento: Licencia AR.T.L.A.S. v6.8.3 (original, 5 de octubre de 2026)» y, debajo y a todo el ancho, «Versión nueva: Licencia AR.T.L.A.S. v7.1 · AR.T.L.A.S. OS». En el diálogo de aceptación de la app se ven las dos líneas.
- **Contenido nuevo**, en español e inglés con la misma estructura:
  - el alcance incluye AR.T.L.A.S. OS;
  - la aceptación electrónica (sección 16) incluye la descarga del núcleo local;
  - **sección 19 nueva**, «AR.T.L.A.S. OS: núcleo local, archivos, aplicaciones y navegación»: qué es el núcleo y que lo controla el usuario; qué puede hacer con su autorización; aprobación previa de las acciones del asistente; registro local de actividad; responsabilidad sobre carpetas y permisos; contenido de archivos y modelos locales o externos; navegación sin acceso a la red local; el núcleo queda alcanzado por la licencia;
  - un punto nuevo en el Anexo I sobre los datos que se procesan en el equipo (`.artlas-nucleo`);
  - una entrada nueva en el historial.
- Se agregó al final para no cambiar la numeración: la sección 16 (aceptación) y la 17 (legislación, pendiente de revisión legal) siguen igual.
- **El PDF pasa de 12 a 14 páginas.**
- **Requiere una nueva aceptación:** al cambiar la versión del documento, cada cuenta vuelve a aceptar una vez (al ingresar, descargar o instalar). Así funciona el consentimiento por versión.
- **Revisión legal:** conviene que un abogado revise también la sección 19 junto con la 17.

**Pruebas:** 251/251. Las pruebas del documento ahora esperan 19 secciones.


---

# Versión v7.2 (iteración interna 81) · AR.T.L.A.S. WEB con íconos, AI Navigator Hub y resaltado en Archivos

**Contexto:** el proyecto de imagen Linux booteable (Buildroot o Debian en modo kiosco) quedó en pausa a pedido de Mario, que prefirió hacer antes estos cambios.

**1. Inicio de AR.T.L.A.S. WEB (Navegador, módulo `98-os-navegador`), según el mockup de Mario.**
- Logo de AR.T.L.A.S. junto al título.
- Accesos en una fila, con el ícono a la izquierda y el nombre a la derecha.
- Cada acceso usa el **ícono oficial del sitio (favicon)**, cargado en el momento como en cualquier navegador (servicio de favicons de Google, `aosnFav`). Sin conexión se muestra la inicial.

**2. App nueva: AI Navigator Hub (`hub`).**
- Abre https://ainavigatorhub-v2.netlify.app/ dentro de una ventana.
- El iframe tiene sandbox con popups permitidos, así que los enlaces del hub abren pestañas reales.
- Tiene «Recargar» y «Abrir en Chrome».
- El ícono del escritorio se armó con el centro de la brújula «AI» de la imagen que envió Mario, en el estilo de las demás baldosas (`ARTLAS_OS_IMG.hub`). Queda en la tercera columna, debajo de Navegador.

**3. Archivos con resaltado en color (módulos 92 y 94).**
- **Al pasar el mouse:** celeste (`#e3f1ff`) con una barra cian a la izquierda.
- **Archivo elegido:** azul (`#cfe5ff`), barra azul y nombre en negrita. Antes era un gris casi imperceptible.
- **Barra lateral:** la carpeta activa queda marcada y el ícono se ilumina al pasar el mouse.

**Pruebas:** 255/255.


---

# Versión v7.3 (iteración interna 82) · Iniciar el núcleo desde AR.T.L.A.S. OS

**Pedido de Mario:** en la versión Escritorio (y en la web, si se puede), un botón que inicie el núcleo cuando ya fue emparejado, sin tener que abrirlo por separado.

**Límite técnico:** una página web, sea `file://` o un sitio, no puede ejecutar programas. La solución estándar, la misma que usan Zoom o Teams, es un **protocolo propio** registrado en el sistema. **Funciona igual en Escritorio y en web.**

**Núcleo:**
- **Al arrancar, registra `artlas-nucleo://` para el usuario actual**, sin permisos de administrador. Se repite en cada inicio, así se actualiza si la carpeta cambia de lugar.
  - **Windows:** crea `HKCU\Software\Classes\artlas-nucleo`, que apunta a `wscript.exe ~/.artlas-nucleo/iniciar-nucleo.vbs`. El VBS se genera en UTF-16 para que las rutas con acentos funcionen y abre `node artlas-nucleo.mjs` (con los mismos argumentos) en una ventana minimizada.
  - **Linux:** crea `~/.local/share/applications/artlas-nucleo.desktop` con `x-scheme-handler/artlas-nucleo` y ejecuta `xdg-mime default`.
  - **macOS:** no registra el protocolo, porque exige un paquete .app.
- **Operaciones nuevas:**
  - `nucleo.estado`: protocolo, inicio automático, plataforma y script;
  - `nucleo.autoinicio {activar}`: en Windows, `iniciar-nucleo.vbs` en la carpeta Inicio del menú; en Linux, `~/.config/autostart`;
  - `nucleo.detener`.
  - Las dos últimas quedan en el registro de actividad.
- **Para no registrar el protocolo:** `"protocolo": false` en `config.json`.

**AR.T.L.A.S. OS (módulos 92 y 97):**
- **Núcleo no detectado pero emparejado antes** (hay token guardado): Configuración → Núcleo local muestra **«▶ Iniciar el núcleo»**. El botón abre `artlas-nucleo://iniciar`; Chrome pregunta y se puede tildar «Permitir siempre». El OS consulta el núcleo durante 30 segundos y, al conectar, repinta todo.
- **El indicador «Sin núcleo» de la barra superior** hace lo mismo cuando ya hubo emparejamiento.
- **Mensajes claros si no arranca:** la primera vez hay que abrir `Iniciar-Nucleo.bat` a mano, y Chrome puede bloquear la apertura. Si el núcleo pide emparejar de nuevo, también se avisa.
- **Con el núcleo conectado:** casilla «Iniciar el núcleo automáticamente al prender la PC», estado «Botón Iniciar habilitado» y «Detener el núcleo».

**Para Mario:**
1. Descargar el núcleo v7.3.
2. Abrir `Iniciar-Nucleo.bat` una vez (así registra el protocolo).
3. Desde ahí, usar el botón o el inicio automático.

**Pruebas:** 261/261 (las del núcleo corren con un HOME temporal).


---

# Versión v7.4 (iteración interna 83) · Cambios bloqueados por Chrome y «Mover a…» con selector

**Resultado de la prueba de Mario:** el botón «Iniciar el núcleo» de la v7.3 funciona en Windows.

**Reporte 1.** En algunas carpetas no se puede borrar ni renombrar (por ejemplo, en «Facturas UCASAL», conectada desde el navegador, con «DESCUENTOS EN EL RIO.doc»). En Imágenes, que está en el núcleo, funciona bien.

**Causa:** Chrome no permite que una página borre, renombre o mueva ciertos tipos de archivo, como los documentos con macros (.doc, .xls), los ejecutables o los accesos directos. El bloqueo se da en las carpetas conectadas con la File System Access API, aunque tengan permiso de escritura. Desde la web no se puede evitar.

**Solución (módulo 94 y núcleo):**
- **Plan A, automático:** `AOSFS.remove` y `AOSFS.move` (que incluye renombrar) prueban primero de forma directa. Si Chrome los bloquea, el OS ubica la misma carpeta dentro de las carpetas del núcleo (`aosFsaPcRoot`): busca por nombre con `fs.buscar` y compara el contenido (al menos 80 % de nombres en común). Si la encuentra, hace la operación por el disco y avisa «Hecho a través del núcleo». La asociación se recuerda en `AOSF.pcMap`.
- **Plan B, si la carpeta no está en el núcleo:** el OS ofrece sumarla. La operación nueva del núcleo, `fs.agregarRaiz`, abre el **selector de carpetas nativo del sistema** en la PC (FolderBrowserDialog en Windows, osascript en macOS, zenity en Linux). Así la ruta la elige el usuario en su equipo y la web nunca la indica, que es el mismo criterio de seguridad que el resto. Rechaza las raíces de disco y las carpetas del sistema, guarda en `config.json` y queda en el registro de actividad.
- **Lo que Chrome sí permite** (por ejemplo, .pdf o imágenes) se sigue haciendo directo.
- **Papelera:** si Chrome bloquea un borrado, ya no queda una copia fantasma.

**Reporte 2.** «Mover a…» pedía escribir la ruta completa. Ahora abre un **selector dentro de la ventana**:
- desplegable con todas las ubicaciones, agrupadas en «Esta PC (núcleo)», «Carpetas conectadas» y «En el navegador»;
- navegación por subcarpetas, con un botón para subir y la ruta visible;
- botón «Mover aquí».

Se puede mover entre ubicaciones distintas, por ejemplo de una carpeta conectada al disco.

**Pruebas:** 267/267. Simulan el bloqueo de Chrome sobre .doc en una carpeta conectada (OPFS como carpeta conectada), con la misma carpeta en el núcleo: el borrado y el renombrado pasan por el núcleo, el .pdf va directo, la carpeta queda asociada y el selector permite navegar y elegir.

**Para Mario:** actualizar el núcleo a la v7.4 desde Configuración → Núcleo local.


---

# v7.4 · Sitios autorizados y licencia v7.4 (misma versión de la app; iteración 84)

**Pedido de Mario:** que no aparezca el error de copia en https://artlas-os.netlify.app/ ni en https://artlas-ucasal.netlify.app/, y actualizar la licencia a la versión nueva.

**1. Dominios autorizados** (`artlas.config.json → dominios`, protección contra copia del módulo 89).
- Se suman `artlas-os.netlify.app` y `artlas-ucasal.netlify.app`.
- También sus vistas previas de Netlify (`*--artlas-os.netlify.app` y `*--artlas-ucasal.netlify.app`), con el mismo criterio que los otros sitios.
- La prueba de dominios ahora verifica 13 direcciones aceptadas y 10 rechazadas, entre ellas `artlas-os2.netlify.app`, `x.artlas-ucasal.netlify.app` y `artlas-ucasal.netlify.app.copia.com`.
- **Hay que volver a publicar en los cuatro sitios** con estos paquetes: la lista de dominios va dentro de `app.js`.

**2. Licencia v7.4** (vigente desde el 8 de octubre de 2026).
- **Encabezado:** «Licencia AR.T.L.A.S. v6.8.3 (original…)» y, abajo, «Versión nueva: Licencia AR.T.L.A.S. v7.4 · AR.T.L.A.S. OS».
- **Sección 8, Distribución:** enumera los sitios oficiales de distribución y uso y aclara que una copia en otra dirección no está autorizada y la app puede negarse a funcionar.
- **Sección 19:** dos párrafos nuevos:
  - el acceso `artlas-nucleo://` que el núcleo registra solo para el usuario, el inicio automático opcional y cómo desactivarlos;
  - las operaciones por el núcleo cuando el navegador bloquea cambios, y que las carpetas nuevas las elige el usuario con el selector del sistema operativo.
- **Historial:** entrada v7.4.
- **Formato:** español e inglés con la misma estructura. El PDF tiene 15 páginas.
- **Requiere una nueva aceptación**, una vez por cuenta.

**Pruebas:** 267/267.


---

# Versión v7.5 (iteración interna 85) · El núcleo reconoce los sitios oficiales nuevos

**Reporte de Mario:** en https://artlas-ucasal.netlify.app el OS no detecta el núcleo descargado («No detectado»).

**Causa:** el núcleo tenía su propia lista fija de sitios web habilitados, sin artlas-os ni artlas-ucasal. Por eso rechazaba con 403 a esos orígenes, y el OS lo mostraba como no detectado. En la v7.4 solo se había actualizado la lista de la app (la protección contra copia).

**Arreglo:**
- **Una sola lista para la app y el núcleo.** La compilación ahora pone en el núcleo la misma lista de `artlas.config.json → dominios` (placeholder `__ARTLAS_DOMINIOS__`). Un sitio oficial nuevo queda habilitado en los dos con un solo cambio.
- **Respaldo:** si se ejecuta la fuente sin compilar, se usa una lista incorporada que ya incluye los sitios nuevos.
- **Sitios sin emparejar todavía:** en un sitio donde el navegador todavía no se emparejó (cada sitio guarda su propio emparejamiento), Configuración muestra un botón secundario «▶ Iniciar el núcleo» con la indicación de emparejarlo con el código de 6 dígitos. Si el núcleo arranca y pide emparejar, el aviso lo explica.
- **Aviso de actualización:** la versión pasa a v7.5, así el OS de cada sitio marca los núcleos v7.4 como anteriores y ofrece «Actualizar el núcleo».
- **Arreglo inmediato sin actualizar:** en `~/.artlas-nucleo/config.json`, agregar `"origenes_extra": ["artlas-ucasal.netlify.app", "artlas-os.netlify.app"]` y reiniciar el núcleo. Está documentado en el LÉAME del núcleo.

**Pruebas:** 269/269. Hay una nueva para los orígenes nuevos y sus vistas previas, con rechazo de imitaciones, y otra que verifica que el núcleo descargable trae la lista de la compilación.


---

# Versión v7.6 (iteración interna 86) · AR.T.L.A.S. OS como sistema propio (ISO y Raspberry Pi)

**Decisión de Mario:**
- construir las dos imágenes, ISO x86_64 para máquinas virtuales o PC y Raspberry Pi;
- LibreOffice no viene incluido: queda el ícono de Oficina para instalarlo después;
- la imagen trae las interfaces y funciones existentes: Navegador, AR.T.L.A.S. Escritorio, RAG, AI Navigator Hub y la descarga de un LLM para usarlo internamente;
- se compila en GitHub Actions (recomendado; Mario no definió otra cosa).

## 1. Modo appliance (`"appliance": true` en la config del núcleo)
- **El núcleo sirve la app:** `GET /app/*` desde `app_dir`, con tipos MIME y bloqueo de rutas fuera de la carpeta. `/` redirige a `/app/app.html?os=1&appliance=1`.
- **Token automático:** `POST /appliance/token` lo entrega solo si el origen es exactamente `http://127.0.0.1:<puerto>`, es decir, la app servida por el mismo núcleo. Así no hay código de 6 dígitos.
- **Operaciones de sistema** (solo en appliance), a través del ayudante `/usr/local/sbin/artlas-sistema` por `sudo -n`, con lista cerrada de subcomandos y argumentos validados:
  - `sistema.estado`;
  - `sistema.wifi` (listar y conectar, con nmcli);
  - `sistema.volumen` (wpctl);
  - `sistema.zona` (timedatectl, valida la zona);
  - `sistema.energia` (apagar y reiniciar);
  - `sistema.instalar` (solo `libreoffice`, como trabajo en segundo plano consultado con `sistema.trabajo`).
- **RAG:** `rag.estado` y `rag.iniciar` lanzan AR.T.L.A.S. RAG (Flask y llama.cpp en `127.0.0.1:8760`, con `RAG_AUTOLOAD=0`) desde `rag_dir`. Esto también sirve en Windows si se configura `rag_dir`.
- **Compilación:** `build.mjs` genera también `dist/nucleo` (el núcleo con los dominios y la versión) y `dist/rag` (los archivos de AR.T.L.A.S. RAG), que se copian a las imágenes.

## 2. AR.T.L.A.S. OS (módulos 92 y 97)
- **Detección del appliance** (`AOS_APPL`) por `appliance=1` o por ser servido en `127.0.0.1/app/`. En ese caso fija la URL del núcleo y pide el token solo.
- **«Plataforma»** se presenta como **AR.T.L.A.S. Escritorio**.
- **La esquina superior derecha** («Salir») abre el menú de energía: AR.T.L.A.S. Escritorio, Reiniciar y Apagar.
- **Configuración → Sistema:** Wi-Fi (buscar, elegir y conectar), volumen, zona horaria, reiniciar y apagar.
- **Oficina sin LibreOffice:** botón «Instalar LibreOffice» con el tiempo transcurrido; al terminar, se repinta con LibreOffice disponible.
- **App nueva «AR.T.L.A.S. RAG»** (ícono propio, tercera columna). También funciona fuera del appliance:
  - si está activo, se abre dentro de una ventana;
  - si está instalado, ofrece «Iniciar»;
  - si no, ofrece «Descargar AR.T.L.A.S. RAG» y «Ya lo abrí: conectar» (por ejemplo, desde INICIAR.bat en Windows).

## 3. Recetas de imagen (`imagen/`)
- **`comun/`:** lista de paquetes, `instalar-artlas.sh` (corre dentro de la imagen: locale, servicios, Ollama y el entorno Python de RAG con llama-cpp-python) y `raiz/`, que contiene:
  - los servicios `artlas-nucleo` y `artlas-primer-arranque`;
  - el ingreso automático en tty1;
  - el permiso de sudo limitado al ayudante;
  - las políticas de Chromium;
  - `artlas-kiosco` (cage + Chromium `--kiosk`);
  - `artlas-sistema` y `artlas-primer-arranque` (usuario, carpetas, config del núcleo, kiosco en `.bash_profile` y nombre de equipo único).
- **`iso/`:** live-build (trixie amd64, ISO híbrida con arranque en vivo e instalador `--debian-installer live`), firmware y herramientas para máquinas virtuales, hook y respuestas del instalador. El particionado se confirma a mano. `construir.sh` usa live-build en Debian 13 o Docker en cualquier otro sistema.
- **`rpi/`:** pi-gen (arm64, trixie) con la etapa `stage-artlas`. `construir.sh` clona pi-gen (`PIGEN_RAMA`, por defecto `arm64`) y usa `build-docker.sh`.
- **`.github/workflows/imagenes.yml`:** compila la app y construye la ISO y la imagen para Raspberry Pi en runners de GitHub, con los artefactos para descargar.
- **`LEEME-IMAGEN.md`:** construir, probar en VirtualBox, grabar la Raspberry Pi y la arquitectura de arranque.

## Verificación
- **Modo appliance** (con un ayudante de sistema y un RAG falsos en `tests/datos/appliance/`), 13 pruebas:
  - el token solo para el mismo origen;
  - la app servida sin acceso fuera de su carpeta;
  - la conexión automática;
  - los nombres de las apps;
  - Wi-Fi, volumen y zona (con rechazo de una zona maliciosa);
  - el menú de energía y apagar;
  - instalar LibreOffice (otros paquetes se rechazan);
  - RAG iniciado y abierto;
  - sin errores de JavaScript.
- **Scripts:** todos los de shell pasan `bash -n`. El ayudante rechaza zonas, volúmenes, paquetes y subcomandos inválidos. El YAML y el JSON se validaron.
- **No verificado:** la construcción real de las imágenes. Este entorno no tiene acceso a los repositorios de Debian ni de Raspberry Pi, así que la primera corrida en GitHub Actions es la prueba real.

**Pruebas:** 282/282. El tope de `app.js` minificado sube de 650 a 720 KB, porque el OS completo dejó la compilación en 657 KB.

**Ajuste para máquinas virtuales** (antes de la primera prueba de Mario en VirtualBox):
- `artlas-kiosco` exporta `WLR_NO_HARDWARE_CURSORS=1` cuando detecta una máquina virtual (`systemd-detect-virt`), porque el puntero del mouse suele quedar invisible.
- Sin nodo de render (`/dev/dri/renderD*`, es decir, sin 3D) usa `WLR_RENDERER=pixman` y Chromium con `--disable-gpu`.

## Pendiente o a ajustar tras la primera construcción
- Corregir los nombres de paquetes si algún paquete de trixie o de Raspberry Pi OS cambió.
- Probar el arranque en VirtualBox (aceleración 3D y VMSVGA) y en una Raspberry Pi 5.
- Asistente de primer arranque (idioma, red, cambio de contraseña) y actualizaciones A/B en una versión posterior.
- En el appliance, «Abrir en Chrome» abre otra ventana de Chromium encima del kiosco; conviene evaluarlo.
