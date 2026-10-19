# Coffee Lab dentro de LANDING BETTER

## Actualización sensorial preparada · 18 de octubre de 2026 · SIN PUBLICAR

Integración local aislada basada en `34c771408997475de50e840e3e47ff5086a4304a` (main público del 16 de octubre). Solo se actualiza `apps/coffee-lab/` y este documento. Portada, FREAK, encuestas, menú, funciones y configuración de Netlify se conservan. El checkout canónico de iCloud mantiene intacto su trabajo previo; esta copia es preparación de lanzamiento, no otra fuente de desarrollo.

- Catación educativa y guía descriptiva basada en SCA 102-2024: dosis por capacidad, relojes por taza, fragancia/aroma, costra, limpieza, tres rondas y cata a ciegas. No es formulario CVA completo ni certificación.
- Notas e historial locales, recuperación tras recarga, copias compatibles y deduplicación. IndexedDB `ritual-coffee-lab` y esquema 1 conservados. Catación no descuenta inventario. Errores de cuota conservan la última versión y permiten reintentar el borrador visible.
- Discrepancias entre reloj civil y monotónico muestran aviso y bloquean avance hasta revisar la hora. Acciones repetidas no saltan fases. Un cambio de hora con la app cerrada puede no detectarse; no se prometen avisos fiables en segundo plano.
- Recetas documentadas de Tetsu Kasuya (4:6 publicada por HARIO) y Ole Kristian Bøen (Switch); equipo y procedencia visibles. Florentino León permanece como ficha histórica: su fuente no proporciona todos los pasos para una receta ejecutable.
- Atlas de procesos, variedades, especies y capas de la cereza; profundidad CSS ligera. Historias y 3D de métodos anteriores conservados. Pantallas compactas y detalles técnicos desplegables.

Fuentes enlazadas en la interfaz: [SCA 102-2024](https://sca.coffee/s/AW_SCA-102_Sample-Preparation_281024_Secured.pdf), [Tetsu/HARIO](https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-tetsu-kasuya), [Ole/HARIO](https://www.hario-europe.com/blogs/hario-community/ole-kristian-boens-switch-recipe), [WCR](https://varieties.worldcoffeeresearch.org/arabica) y [Cafe Imports](https://www.cafeimports.com/north-america/fermentation).

Validación de desarrollo: 67 pruebas del app, más 13 de integración/editorial/preview en el entorno canónico; recorridos de cata, recarga, cuotas, importación inválida/repetida, recetas, atlas y tiempo controlado en navegador aislado. Tamaños 360–1440 px. Axe sobre las pantallas comprobadas sin infracciones detectadas; no sustituye una auditoría integral.

Preparación de lanzamiento: instalación limpia y build con Node 22.20.0, pruebas del app, SEO, comparación de hashes de los 215 archivos públicos ajenos a Coffee Lab y comprobación de la versión integrada. Resultado confirmado: los 215 archivos públicos fuera de `/coffee-lab/` coinciden byte por byte con el build base. Instalación limpia: 134 paquetes; 67 pruebas aprobadas; SEO: 9 páginas. Se corrigió el lock conservando todo el grafo original y añadiendo únicamente `fake-indexeddb`; la primera instalación detectó entradas opcionales ausentes. Vista local integrada en http://127.0.0.1:5192/coffee-lab/; cata, recarga, receta y atlas comprobados en tres tamaños, portada conservada visualmente. Evidencias fuera del repositorio en `/tmp/bm-coffee-release-qa/`; no incluir archivos de prueba en el sitio público. `fake-indexeddb` es dependencia solo de desarrollo.

Pendientes antes de declarar validación completa: baristas con café real, Safari/iPhone físico y lector de pantalla. No se añadieron APIs de pago, credenciales, permisos ni servicios. No se hizo push ni publicación en esta preparación.

Vía existente: Git CD de main en Netlify **betterland** (`3e5fbb47-ea01-4fae-b8d5-d3edd4a7118a`), `npm run build` → `dist`. Antes de publicar, revalidar main y revisar el diff aprobado; no desplegar el snapshot de la landing antigua ni reconstruir funciones desde ese checkout. Referencia pública de reversión al preparar: deploy `6ad16baa5dc1de73503bdece`. El costo marginal de hosting/build no está verificado; no se cambió el plan.


Estado vigente al 15 octubre: fuente canónica integrada en main mediante PR #6 para preservar el app al volver a Git CD. FREAK se publicó en deploy 6ad129fce451efb5f3b2185d (main e8b0bf3); portada, menú y entrada Coffee Lab quedaron idénticos byte por byte a las versiones HTTPS anteriores. SW, manifiesto y coffee-product responden 200. No se publicó el rediseño local ni se modificaron datos de usuarios. Ver docs/FREAK.md y evidencia local output/freak-qa/production-http.json.

Actualizado: 15 de octubre de 2026. Coffee Lab publicado y verificado en https://bmoodcoffee.com/coffee-lab/.

## Lanzamiento sobre la portada pública actual

Deploy histórico del lanzamiento `6acaf29090d71f2aa07c5e98`, publicado el 10 de octubre (02:21 UTC del día 11). Se conservó “Tu pausa de café. Cerca de UPAEP.” y se corrigió el 404 en el dominio principal.

Base: commit público `46d099b43d9e7fe98e8d3094f527f73c6989eed1`, deploy anterior `6ab06bb6d3a27d0008aa8244`. Sus 196 archivos públicos coincidían por SHA con la compilación recuperada. Se conservaron 195; index.html recibió accesos a Coffee Lab en el hero, Explorar y pie. Se añadieron el app canónico compilado y sus cabeceras/redirección. El menú conserva sus bytes. Netlify transforma automáticamente el enlace de privacidad a su URL limpia.

Se conservaron 39 funciones Node.js 22 y una edge function. No se publicó el rediseño local ni el cambio local de recompensas-consulta. Para fijar Node 22 se empaquetó el backend del commit público con zip-it-and-ship-it, nodeVersion=nodejs22.x, manifiesto .netlify/functions/manifest.json y comentario de ZIP que impide reutilizar paquetes de prueba Node 24. Código del backend sin cambios. El manifiesto caduca en dos minutos; regenerarlo antes de desplegar. Deno 2.4.2 en PATH permite empaquetar la edge function.

Preparación: /tmp/bm-coffee-production-20261010. Evidencia durable: output/coffee-lab-production-20261010/, con fuente del commit público, parches de index.html y netlify.toml, comparación de hashes, manifiesto de funciones y publicación/HTTP. No publicar esa carpeta. El único app editable sigue en apps/coffee-lab/.

Continuidad: no hubo commit masivo ni push de los cambios previos. Una actualización automática de main puede reemplazar este deploy manual. Antes de hacer push, integrar la compilación de Coffee Lab en la versión de landing autorizada; no publicar incidentalmente el rediseño pendiente. npm run build local ya incluye el laboratorio. Los parches y fuente pública se conservan como referencia del alcance publicado.

Verificado HTTP 200 para portada, Coffee Lab, menú, SW y manifiesto; API de lectura coffee-product respondió igual que la versión previa. No se crearon pedidos ni pagos. Siguen pendientes las pruebas heredadas con baristas e iPhone físico.

## Una sola fuente para continuar

Todo el desarrollo futuro de Coffee Lab debe hacerse en `apps/coffee-lab/` dentro de este repositorio. La landing conserva su arquitectura estática. No hay iframe ni dependencia del dominio de Sites. No copiar cambios de regreso al proyecto anterior.

Origen preservado: `/Users/macbookair2020/Documents/Codex/2026-10-02/https-apps-apple-com-mx-app/ritual-coffee-lab`. Se copiaron los cambios locales de esa aplicación, no solo su último commit (82e18c7f747e80709b10d7b26ea1d1f834bd48a1). No se copiaron credenciales, servicios ni autenticación de Sites.

Ruta publicada: `https://bmoodcoffee.com/coffee-lab/`. Proyecto Netlify existente `betterland`, id `3e5fbb47-ea01-4fae-b8d5-d3edd4a7118a`. No crear otro sitio para producción.

## Mapa del código

| Parte | Fuente editable |
|---|---|
| Lógica, cantidades y datos | `apps/coffee-lab/lib/coffee/` |
| Interfaz, preparación y aprendizaje | `apps/coffee-lab/app/` y `components/` |
| Marca, instalación y sin conexión | `apps/coffee-lab/public/` |
| Acceso en portada | `scripts/render-editorial-pages.mjs`, variable `coffeeLab` |
| Acceso en pie compartido | `scripts/site-shell.mjs` |
| Compilación del sitio completo | `package.json` y `scripts/build-public.mjs` |
| Rutas y cabeceras de alojamiento | `netlify.toml` |
| Regresiones entre landing y app | `scripts/coffee-lab.test.mjs` |

No editar `dist/`. El renderizador vuelve a generar `index.html` y páginas editoriales: cambiar sus plantillas. Las fuentes del app se guardan en Git junto con el resto del sitio; las salidas compiladas y node_modules se ignoran.

## Comandos desde la raíz de LANDING PAGE

```sh
npm ci
npm run dev:coffee-lab
npm run build
npm run test:coffee-lab
npm run lint
npm test
npm run test:editorial
npm run test:preview
npm run preview:local
```

`npm ci` instala también el paquete del laboratorio por postinstall, usando su propio package-lock. Node 22.13 o posterior; Netlify se fija en Node 24, usado para la validación local. `npm run build` compila ambos y publica únicamente los archivos permitidos de la landing y la salida estática del laboratorio. Un error impide completar el build. Desarrollo independiente con React/TypeScript/Vite; no requiere servidor de café ni cuenta.

Vista integrada de esta revisión: `http://127.0.0.1:4198/coffee-lab/`; portada `http://127.0.0.1:4198/#coffee-lab`. Esta vista local bloquea conexiones externas y operaciones reales. La barra de pruebas no se publica.

## Aislamiento y conservación

- La landing no carga React, Three.js ni CSS del laboratorio. El 3D sigue siendo bajo demanda.
- Recursos y manifiesto se resuelven bajo `/coffee-lab/`.
- Service worker registrado con scope `/coffee-lab/`; rechaza rutas de menú, API y recursos externos a la aplicación. Su caché usa `bm-coffee-lab-shell-`; no borra cachés ajenas.
- IndexedDB conserva `ritual-coffee-lab`, esquema 1. No se borran registros ni se inventa sincronización.
- Se preservan copias de recetas, inventario derivado y formatos de exportación/importación.
- Un enlace visible regresa a la cafetería; menú y ubicación usan rutas locales del mismo sitio.
- La integración no cambia funciones de pedidos, pagos ni API de la cafetería.

## Migración de Sites: pasos para la persona

1. En el navegador y dominio donde están tus tazas, abre Preferencias y exporta tu copia.
2. Guarda el JSON antes de cerrar o borrar datos del navegador.
3. En la versión definitiva, abre Preferencias → importar/restaurar y selecciona esa copia.
4. Revisa la vista previa y confirma la importación. Verifica historial, bolsas y recetas.
5. Conserva la copia hasta comprobar el resultado. No borrar automáticamente los datos del origen.

Los dominios y perfiles de navegador tienen almacenamiento separado. El traslado no es automático. Las importaciones validadas evitan volver a descontar café por registros duplicados. La sesión activa local no se sobreescribe con una importación.

## Verificación de esta integración

- Compilación conjunta y TypeScript: correctos.
- 48 pruebas de café: correctas; incluyen copias antiguas, importación repetida, inventario, temporizadores y exclusión de landing/API por service worker.
- 3 pruebas de integración: correctas; activos publicados, manifiesto y separación del runtime.
- 3 pruebas editoriales y 7 pruebas de vista previa/pedidos: correctas.
- Validador SEO: 9 páginas y sitemap correctos.
- Navegador Chrome: portada → Coffee Lab, favorito conservado tras recarga y sesión de preparación recuperada en la nueva ruta.
- Emulación iPhone 16 (393 × 852): inicio, cantidades, acceso a historia y botón de preparar visibles; prueba de interfaz, no iPhone físico.
- Evidencia: `output/coffee-lab-integration-20261010/` (logs y capturas; no publicar).

Pendientes heredados del pre-lanzamiento: validación con baristas, iPhone/Safari real, revisión completa de accesibilidad. Las reglas de sabor y el modo A mi ritmo siguen identificados como orientativos/piloto. Vite avisa de chunks de más de 500 kB; no afecta la carga inicial de la landing.

## Estado de Git y publicación

Al empezar existían muchos cambios locales previos: portada, menú, páginas editoriales, estilos y scripts. Se conservaron; no hubo reset, commit masivo ni push. Copias antes de editar en `output/coffee-lab-integration-20261010/before/`, estado de Git y hashes de archivos registrados en la misma carpeta. Los HTML editoriales se regeneraron desde sus fuentes y recibieron el enlace en el pie; no se eliminó su contenido anterior.

Publicar el dist de esta carpeta publicaría también ese trabajo anterior. Antes del lanzamiento, revisar la versión conjunta y conservar en Git tanto fuentes previas aprobadas como integración. No desplegar únicamente el app y dejar Git con una compilación antigua que lo borre en el siguiente push. Un deploy manual puede ser sustituido por la siguiente publicación de la rama principal.

Para retirar la integración si se decide: crear un cambio nuevo que quite el acceso de portada/pie y el paso de build de Coffee Lab, compilar/probar y desplegar hacia adelante. No resetear el repositorio ni borrar bases de datos del navegador. Los respaldos locales son referencia para comparar, no para sobrescribir cambios posteriores.

## Historial: vista completa antes del lanzamiento

Vista completa: https://6acaeee821f9d07907a82518--betterland.netlify.app/coffee-lab/
Portada integrada: https://6acaeee821f9d07907a82518--betterland.netlify.app/#coffee-lab
Deploy borrador: `6acaeee821f9d07907a82518`, estado `ready`, `published_at: null`. Netlify confirmó 39 funciones y 1 edge function empaquetadas, 70 redirecciones y 5 reglas de cabeceras. No se realizaron pedidos, pagos ni pruebas de escritura en el backend real.

Se verificaron HTTP 200 en app y menú, manifiesto con MIME application/manifest+json y redirección /sistema → /sistema/. Las pruebas de pedidos se realizaron en el servidor local aislado. Esto confirma empaquetado y navegación; no equivale a probar cada función comercial.

La primera publicación de prueba falló al arrancar el Deno almacenado por Netlify: Unknown system error -88. Se resolvió usando Deno 2.4.2 de npm en una instalación temporal, sin modificar funciones ni cambiar el ejecutable global. El snapshot completo para despliegue se preparó fuera de iCloud y sin archivos privados. No necesita cambios al código de la edge function `system-slash`.

Si vuelve a ocurrir en este Mac, usar una instalación compatible de Deno en PATH durante el CLI. Referencia reproducible desde una copia de despliegue revisada:

```sh
npm exec --yes --package=deno@2.4.2 --package=netlify-cli@23.11.0 -- netlify deploy --site 3e5fbb47-ea01-4fae-b8d5-d3edd4a7118a --dir dist --no-build
```

El comando crea un borrador. No añadir --prod sin decidir primero el alcance de los cambios previos de la landing y conservarlos en Git. El proceso cloud normal sigue siendo npm ci → npm run build. Se corrigió el lock del app regenerándolo sin node_modules y se verificó npm ci desde cero: 133 paquetes, build y pruebas correctos. El app compilado después de esa instalación es idéntico al del borrador completo.

También existe una vista estática para revisión sin operaciones: https://6acaedf61c6d680903b9c1c6--betterland.netlify.app/coffee-lab/ . Solo esa vista bloquea API y formularios; no usar su configuración temporal para producción.

Decisión del usuario el 10 de octubre: conservar la portada pública actual y corregir el 404 de /coffee-lab/. Preparación del lanzamiento en /tmp/bm-coffee-production-20261010, basada en el commit público 46d099b43d9e7fe98e8d3094f527f73c6989eed1. No publicar el rediseño local como parte de este arreglo. Ver el estado de lanzamiento al principio de este documento.

Prueba local dejó un favorito V60 y una sesión activa de QA sin bolsa en Chrome, origen 127.0.0.1:4198. No hay consumo de inventario real ni registros agregados al dominio público.

## Preservación al integrar FREAK · 15 octubre 2026

FREAK necesita volver al despliegue Git → main → Netlify. `origin/main` sigue en 46d099b y no incluye Coffee Lab; publicar desde ese commit sin integración borraría la aplicación que está en producción. Por ello se recuperó la fuente canónica dentro de un clon limpio fuera de iCloud y se añadieron únicamente el build del app, su copia a `dist/`, cabeceras/redirección y los tres enlaces de portada del lanzamiento autorizado. No se incorporan renderizadores editoriales ni el rediseño local. El checkout original queda intacto.

Antes de publicar, la nueva entrada compilada de Coffee Lab y el menú coinciden byte por byte con el dominio HTTPS; la portada difiere exclusivamente por la normalización de privacidad de Netlify. Mantener `/coffee-lab/`, IndexedDB y service worker con su scope. Este trabajo es preservación estrictamente necesaria del despliegue existente. Estado de publicación y pruebas finales se registra en `docs/FREAK.md`.

### Actualización administrativa de FREAK

Panel aislado en `/freak/admin/`, migración aditiva de tablas freak_ y telemetría de aperturas. No modifica fuentes Coffee Lab, portada ni menú. Conserva root build → dist → GitHub main → Netlify. Checkout iCloud con rediseño pendiente permanece intacto.

FREAK: lanzamiento de colección simplificada, código visible corto, recepción física y cuatro artes con QR integrado. Modificaciones limitadas a FREAK y migración freak_; portada, menú y Coffee Lab se conservan. Publicación por Git main y build completo dist.

Simplificación móvil FREAK: cambios exclusivamente en /freak, allowlist y documentación. Se conserva build completo y despliegue Git; no se modifica Coffee Lab ni la portada autorizada.

Cierre comunitario FREAK: álbum de cuatro personajes, invitación y registro abreviado. Solo fuentes FREAK y pruebas/documentación; mismo build integral y Git CD. Portada y Coffee Lab siguen fuera del alcance de edición.

Corrección de nombres de artistas FREAK: catálogo compartido, copias públicas y arte impreso actualizados; conserva nombre FREAK y QR existentes. Sin cambios de landing, menú o Coffee Lab.

FREAK: migración aditiva para numeración visible y claves cortas; build completo y despliegue Git conservados. Sin cambios en portada, menú, Coffee Lab o datos de esas aplicaciones.

FREAK teléfono/comunidad: cambios aislados a FREAK, migración aditiva freak_ y apartado específico en aviso de privacidad. Portada, menú, fuentes y datos Coffee Lab sin cambios. Build conjunto dist y publicación por Git main → Netlify; checkout iCloud intacto.

FREAK inventario/nombres/reinicio: panel y API aislados, migración aditiva y privacidad específica. La limpieza solicitada afecta exclusivamente tablas freak_ después de publicación, con archivo privado; Coffee Lab, portada y menú se conservan y se verifica el build completo.

### Continuidad FREAK: acceso por celular y GPS voluntario

Revisión aislada en `codex/freak-phone-pin-gps`: cambios exclusivos FREAK y su aviso de privacidad, migración aditiva para hallazgos GPS. Se compila el sitio completo mediante `npm run build`; Coffee Lab, menú y portada autorizada siguen intactos. No se publica el rediseño del checkout iCloud ni se reinicia la campaña otra vez. Ver docs/FREAK.md para contrato de acceso y pruebas.

### Portada simplificada y conexión FREAK — 15 octubre

El usuario autoriza ahora ajustes específicos de la portada pública existente: menú breve sin flechas/numeración decorativa; quitar Cinco bebidas de bloque y enlaces; FREAK con arte aprobado; caritas SVG y encuesta compacta. Se conserva el hero aprobado, precios y datos operativos, menú completo y Coffee Lab. Se trabaja sobre main publicado en copia limpia, sin incorporar el rediseño iCloud pendiente.

Encuesta: faltaban RESEND_API_KEY/SURVEY_FROM_EMAIL/SURVEY_NOTIFY_EMAIL tanto en proyecto como la clave Resend del equipo. Netlify Forms ya tiene detección y notificación global a bettermoodcoffee@gmail.com. Se añade esquema estático encuesta-servicio y entrega URL-encoded desde la función cuando no hay Resend; solo origen productivo, nunca previews. Se distingue submitted de entrega real. IDs qa-notification- se marcan técnicos y excluyen de satisfacción. Validación de recepción exige evidencia de Gmail tras publicación, no solo HTTP 200.


## 19 octubre 2026 — FREAK físico y premios

La campaña usa estampillas sin QR: normales 1 punto, especiales 2. Barra valida 10 puntos físicos, marca o retiene las estampillas y entrega un código privado de 12 caracteres. Solo los cinco carteles llevan QR. Cualquier cartel permite elegir un premio disponible; la confirmación atómica determina el orden. Máximo un premio por cuenta/celular. Nombre y teléfono se muestran únicamente en administración privada `/freak/admin/rewards.html`; sin SMS no se garantiza una persona física distinta por cada teléfono.

Migración aditiva `20261019120000_freak_physical_rewards.sql`: tablas de validaciones y premios, restricciones únicas y tokens de carteles guardados como hashes. Conserva usuarios e inventario anteriores. Los códigos se entregan una sola vez; no publicar el archivo privado de tokens. Los carteles anteriores con texto no abren la landing: reimprimir los QR vinculados.

Verificación: 21 pruebas FREAK existentes y 5 nuevas de puntos, permisos, privacidad, concurrencia y entrega; build completo desde origin/main, preservando portada, menú y Coffee Lab canónico. No se siembran ganadores ni pruebas en producción.
