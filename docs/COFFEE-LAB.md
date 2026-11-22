# Coffee Lab dentro de LANDING BETTER

## Coffee Lab 1.2.0 · 21 de noviembre de 2026

La guía puede narrar los vertidos y los tiempos. La preparación permite seleccionar una bolsa de Mis cafés y descuenta la dosis al guardar. El panel de Luna permanece en la app. Su función acepta los orígenes de Capacitor de iOS y Android para la consulta de disponibilidad y el envío del mensaje, con el presupuesto compartido existente. El texto y el resumen opcional de la receta llegan al proveedor únicamente al enviar la pregunta.

Se reprodujo en producción el fallo del iPhone antes del cambio: la consulta de disponibilidad carecía del encabezado de origen y la petición previa al envío devolvía 405. El candidato pasó 102 pruebas del app y cuatro de la función. El build integral conserva los 236 archivos públicos de la landing autorizada. La prueba física de inventario usó una bolsa aislada de 200 g que quedó en 185 g tras guardar una taza de 15 g.
## Ajustes de la portada horizontal · 18 de noviembre de 2026 · Vista local

El arte de lanzamiento se recompuso en horizontal a partir del póster original.
Se sirve como un fondo continuo en WebP. El titular, el distintivo de App Store
y el enlace a la aplicación web siguen siendo elementos de HTML. La ficha
`/coffee-lab/acerca` permanece accesible desde el pie.

Se incorporaron las formas de marca de Uber Eats, Rappi y WhatsApp a los enlaces
existentes. Las referencias son la [guía de Uber Eats](https://merchants.ubereats.com/us/en/resources/learning-center/co-marketing-tools/),
el [kit de Rappi para aliados](https://images.rappi.com/web/Aliados/123/REDESALIADOS/materiales-redes-links1.pdf)
y el [kit de WhatsApp de Meta](https://www.meta.com/brand/resources/whatsapp/whatsapp-brand/).
La galería muestra sus tres fotos en una sola pasada al entrar en vista y
termina en la fachada. Con movimiento reducido muestra la fachada de inmediato.
Los horarios se presentan por grupos de días y los enlaces públicos revisados
prescinden de flechas decorativas.

## Pago de mesa desde el menú · 21 de noviembre de 2026 · Vista local

`/menu/` muestra Mercado Pago en **Mi pedido** cuando caja de UPAEP habilita el
cobro sobre una cuenta presentada. `/api/table-order` usa el POS como fuente del
importe y del estado. El retorno de Checkout Pro pide al servidor el estado de
la misma referencia y caja registra el pago en la cuenta original.

El lanzamiento abarca la landing y el POS. Las credenciales y el webhook de
Mercado Pago para el menú se configuran en Functions del POS. La activación
requiere una prueba integral en un sandbox propio de pedidos de mesa.

## Venta de café y pedidos para recoger · Vista local

- El menú permite pagar para recoger en UPAEP sin QR. Al entrar con un QR se
  puede elegir entre **En mesa** y **Para recoger**. El POS habilita pedidos
  durante el horario publicado y con caja abierta, hasta 30 minutos antes
  del cierre. El retorno muestra el estado y código de recogida verificables.
- La bandeja del POS muestra solo pedidos pagados o con un pago en revisión.
  **Registrar y preparar** guarda la venta con su precio confirmado y descuenta
  inventario una vez. **Marcar listo** y **Marcar entregado** actualizan el estado.
- El café natural de Finca Santa Cruz tiene precio base de MXN 350 por 250 g.
  `/api/coffee-natural-checkout` guarda la orden antes de abrir Mercado Pago y
  conserva la identidad en reintentos. La compra conserva recogida en La Paz y
  entrega en Puebla. El equipo opera desde `/nuestro-cafe/pedidos/` con su clave.
- En Functions del POS configura `MENU_MP_PICKUP_ENABLED=true` junto con
  `MENU_MP_MODE`, `MENU_MP_ORIGIN`, `MENU_MP_APP_ID`, `MENU_MP_ACCESS_TOKEN`
  y `MENU_MP_WEBHOOK_SECRET`. El evento Order de Mercado Pago va al webhook
  `/.netlify/functions/table-payment-webhook` del POS.
- En Functions de la landing configura las variables de Orders descritas en
  «Nuestro café», `COFFEE_NATURAL_SALES_ENABLED=true` y `ADMIN_SECRET` para la
  bandeja. Usa la aplicación de Mercado Pago de café natural y su webhook
  `/.netlify/functions/coffee-mercadopago-orders-webhook`.
- Antes de abrir cobros reales, verifica disponibilidad de bolsas, acceso del
  equipo, correspondencia de los dos webhooks y un ciclo completo de pago,
  preparación y entrega en sandbox. Los dos cambios de código se publican
  en la landing y en el POS siguiendo sus rutas de lanzamiento.

El 21 de noviembre se ejecutó Checkout Pro para un pedido de recogida de
MXN 45 sin sesión de mesa en el sandbox de Better Mood. El proceso usó
`startPickup` y `reconcilePickup` con catálogo y datos aislados. Mercado Pago
acreditó el pedido de prueba `EA0857F8`. Reenviar el mismo intento devolvió
el mismo pedido pagado sin abrir un segundo checkout. El sandbox conservó
disponible la compra del café natural de MXN 350 en el deploy
`6b0254c6830e212e922a2eba`. Este ensayo verificó el retorno y la consulta del
estado a Mercado Pago. La bandeja y el webhook del menú se verificaron con
pruebas locales. La activación de credenciales de producción de Better Mood
Coffee Web requiere la aceptación del titular en Mercado Pago.

El titular activó Better Mood Coffee Web. Se guardó el Access Token de café
natural como secreto exclusivo de Functions en producción de la landing y
Mercado Pago respondió correctamente a una consulta de medios de pago. Los
orígenes y modos del café y del menú quedaron registrados en producción de
sus respectivos sitios. Better Mood Coffee Web tiene el webhook de café
configurado para `Order (Mercado Pago)` y su firma guardada como secreto de
Functions en producción de la landing. Se creó Better Mood Menu UPAEP con
Checkout Pro mediante Orders y se registró su identificador en el POS. El
titular activó producción. La consulta de medios de pago confirmó el Access
Token del menú y se guardó junto con su firma exclusivamente en Functions
de producción del POS. El webhook del menú quedó guardado para el evento
`Order (Mercado Pago)`. En escritorio y WebKit móvil se verificó el formulario
para recoger sin mesa, el importe, el código y la recarga con datos aislados.

## Lanzamiento de Coffee Lab en portada · 18 de noviembre de 2026 · Vista local

La propuesta de lanzamiento pone Coffee Lab y la imagen promocional del usuario
en el primer bloque. El recorte muestra el teléfono y conserva intacto el archivo
original. El distintivo oficial de App Store México y la entrada web tienen
eventos de clic independientes. La ficha `/coffee-lab/acerca` describe la app
con datos estructurados y conserva un enlace secundario a «Métodos de
preparación». La aplicación abre sus propios métodos desde su inicio.

La portada presenta Uber Eats, Rappi y WhatsApp en una fila seguida de la
sección de visita a UPAEP. La galería de latte, barista y entrada se activa al
entrar en vista y tiene controles de avance, retroceso y pausa. Los productos
destacados abren sus fichas vigentes en el menú. Eventos conserva la captura
auxiliar en Netlify Forms, el folio y la ruta `/api/catering`. La prueba de
cotización intercepta esas solicitudes localmente.

Pasaron la compilación, la validación SEO y 77 pruebas de Coffee Lab. Chromium
y WebKit verificaron los enlaces, los tres productos y los dos canales de
cotización. Se comprobó la reproducción, la pausa y el movimiento reducido.

La vista de lanzamiento se compila con `npm run build` en una copia local y se
sirve en el puerto 5204. Corresponde a la iteración previa a publicación. El
sitio público conserva la portada de UPAEP.

## Café en casa y Coffee Lab · 18 de noviembre de 2026 · Vista local

La portada enlaza directamente a `/como-preparar-cafe-en-casa/`. V60,
AeroPress y Chemex conservan sus instrucciones y abren el ajuste correspondiente
en `/coffee-lab/#method=…`. El laboratorio y su ficha enlazan de vuelta a la
guía. Se unificó el nombre Coffee Lab y se añadió a su ficha el distintivo
negro oficial de Apple para español de México, enlazado a la app publicada.

La propuesta de portada usa la foto existente del latte. Se conserva el
titular autorizado y la guía de adaptógenos se enlaza desde su propia sección.
La compilación integral, SEO y 77 pruebas del laboratorio pasaron. Chromium
y WebKit verificaron navegación, los tres métodos, el regreso, el distintivo y
el ancho entre 320 y 1440 px. El service worker y las páginas de menú, eventos y
recompensas coinciden con el build anterior. Vista local en el puerto 5204.
Sin publicación.

## Descubrimiento de Coffee Lab · 18 de noviembre de 2026

La ficha pública `/coffee-lab/acerca` incorpora su URL canónica, aparece en el
sitemap y se enlaza desde la navegación y el pie de la portada. Ofrece el
[App Store de México](https://apps.apple.com/mx/app/better-mood-coffee-lab/id6834851686)
y la entrada web `/coffee-lab/`. Apple reportó la versión iOS 1.1.0. La ficha
utiliza el build web estable de main, con el mismo bundle y el service worker
limitado a `/coffee-lab/`. Las variantes locales de cuentas y sincronización
requieren una publicación web separada.

Verificación previa: compilación integral, SEO, 77 pruebas de Coffee Lab y tres
de Barista Luna. Chromium y WebKit comprobaron los enlaces, la apertura del
laboratorio y una cotización simulada. El titular «Tu pausa de café. Cerca de
UPAEP.» se conserva en la portada pública.

## Rewards alta simple · 13 noviembre 2026

Cambio exclusivo de Rewards sobre main dc95ad5. Alta nueva con nombre, celular,
privacidad y cumpleaños opcional, sin correo ni código. Requiere backend con
`quickRegistrationAvailable`; conserva compatibilidad con el flujo anterior.
No modifica Coffee Lab, menú ni portada. Recuperación de cuentas existentes sigue
protegida. Prueba `node scripts/verify-rewards-quick.mjs`: Chromium/WebKit en
375, 390, 820 y 1440 px, registro, destino Wallet aislado y rechazo de duplicados.
No equivale a instalación física de Wallet. Publicación GitHub/main y Netlify.

## Rewards autoservicio · 2 noviembre 2026

Cambio aislado de Rewards sobre main f95244a, sin cambios de Coffee Lab ni la
portada. Registro por correo, cumpleaños plegado opcional y recuperación de
tarjeta antigua mediante .pkpass autenticado por el backend. Ver
`docs/REWARDS_SELF_SERVICE_2026-11-02.md` para límites, pruebas y publicación
coordinada. No se agregan servicios de pago ni se amplían cuotas.

## Coffee Lab móvil y reto A/B · 23 octubre 2026

Actualización autorizada para GitHub → Netlify, preparada sobre main `377a0db7ffedddec14de5646017d56ddb4d7007e` (21 octubre). Solo cambia Coffee Lab y esta documentación. Se conserva la portada pública «Tu pausa de café. Cerca de UPAEP.», junto con menú, FREAK, recompensas, encuesta, funciones y configuración. El árbol canónico iCloud contiene otro rediseño pendiente: no publicarlo incidentalmente. El desarrollo continúa exclusivamente en `apps/coffee-lab/` dentro de la landing canónica.

- Métodos en dos columnas, lista de equipo más compacta y acciones accesibles. En 360×740 los ocho métodos caben sobre la navegación. Historias, fuentes, atlas y recetas se conservan.
- Nuevo «Reto de dos tazas» desde Inicio y Explorar: V60, prensa francesa, Chemex o Kalita. Mantiene café, dosis, temperatura, molienda y pasos; B aumenta el ratio en dos partes de agua. Verifica capacidad e inventario para ambas dosis. Confirma cada paso, guarda tiempos reales y permite elegir A, B o sin diferencia.
- Planes y registros vinculados recuperables tras recargar. Archivar conserva tazas y reto; cancelar permite reintentar sin duplicar consumos. Una taza incompleta o receta modificada impide guardar una nueva comparación válida. El resultado conservado avisa si sus registros posteriormente cambian o desaparecen.
- Datos locales gratuitos y sin cuenta: IndexedDB `ritual-coffee-lab`, esquema 1. `duels` es un campo opcional; las copias versión 1 anteriores siguen siendo compatibles. Importación validada, vista previa con conteo de retos, duplicados omitidos y protección frente a conflictos de bolsa. El café se descuenta una vez por preparación guardada. No hay migraciones, nuevas dependencias ni servicios.
- Vasos decorativos con profundidad CSS y cantidades textuales; no requieren WebGL. Preparación consecutiva, no prueba ciega. Se explica comparar a temperatura parecida y revisar tiempos/pesos; una preferencia no demuestra una causa ni predice sabor. Las recetas son puntos de partida, no nuevas recetas ganadoras ni validaciones de baristas.

Validación previa: instalación limpia y build con Node 22.20.0; 77 pruebas del app (10 nuevas del reto), más 3 comprobaciones de integración adaptadas a la portada pública vigente, build integral y SEO. La prueba local que esperaba una sección del rediseño pendiente no aplica a producción; no se cambió la portada para satisfacerla. Recorrido A → recarga → B → recarga → elección persistida en Chrome a 320, 360, 393, 430 y 1280 px, con emulación táctil móvil y revisión clara/oscura. Regresión de métodos, favoritos, guía, cata/notas, historias y atlas aprobada. Restauración real por archivo, segunda importación duplicada bloqueada, archivo sin pérdida y recarga offline comprobados. Sin errores JS ni desbordamiento en los tamaños revisados. Contextos aislados con datos QA; no se modifica el almacenamiento de usuarios. Quedan pruebas con café/baristas, iPhone/Safari físico y VoiceOver.

La publicación se realiza mediante PR, revisión del build remoto, merge y despliegue automático del sitio existente betterland. El estado final debe verificarse en GitHub/Netlify y en https://bmoodcoffee.com/coffee-lab/; la existencia de un build local no demuestra publicación. No enviar la raíz del repositorio ni una copia con el rediseño pendiente; el directorio público sigue siendo `dist/`. Confirmar por hashes los archivos ajenos a Coffee Lab antes y después.

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

### FREAK · publicación administrativa 20 octubre 2026
Lanzamiento preparado desde main público `3c90794` en checkout aislado `Documents/Codex/2026-10-20/freak-admin-release`. Solo FREAK, su API/migraciones y hosts de imágenes del mapa en CSP. Portada, menú, fuente y build Coffee Lab se conservan. Panel amarillo, conteo por fuentes, historial completo y PIN secreto; no se rota la clave administrativa existente. Compilación íntegra mediante `npm run build` → `dist`; publicación por Git CD para aplicar migraciones versionadas.

Preview de PR #23: portada, menú y Coffee Lab coinciden con el HTTPS público al quitar la barra de revisión Netlify exclusiva del preview. No cambia la fuente del app ni se publican builds locales con otra versión de herramientas. El lanzamiento usa Git CD.
Producción FREAK confirmada en deploy `6ad7f3cf28295ef5a698048b`: SHA256 de portada, menú y Coffee Lab exactamente iguales a los anteriores. La administración conserva credencial y datos previos; prueba de telemetría aislada en campaña `prueba`.

## Barista Luna · lanzamiento 28 octubre 2026

Chat de preguntas abiertas y cuatro sugerencias; no tiene cuota diaria. Modelo `gpt-6-luna`, razonamiento desactivado, 600 tokens máximos de salida y entrada validada <=12 KB. Contexto limitado a las últimas dos parejas de mensajes, recortado por bytes. Sin imágenes, búsquedas, herramientas ni acciones automáticas. Solo envía mensajes escritos a OpenAI con store:false. Historial de chat temporal; IndexedDB de café y copias conservadas.

Usa la base Netlify Database existente, sin nuevos planes, servicios ni dependencias. Migración aditiva crea únicamente `coffee_lab_ai_budget`; reserva atómica UPDATE … WHERE … RETURNING antes de cada llamada. Tope TOTAL 100 centavos; inicio 8 centavos/4 intentos reservados de pruebas locales. Reserva conservadora 2 centavos/consulta; no se devuelve reserva tras errores o timeouts. Un redeploy no reinicia saldo. RLS activada y permisos públicos revocados. No persiste conversaciones ni datos personales. El único secreto `COFFEE_LAB_OPENAI_KEY` debe configurarse en functions/production; jamás en build ni frontend. Sin clave el endpoint cierra el acceso; previews no consumen. GET no despierta la base; el saldo se verifica al enviar. El límite aplica a esta función, no a uso externo de la clave. No aumentar saldo ni cambiar identificador de campaña sin autorización.

Tarifas verificadas de Luna: $0.10/$0.50 por millón de tokens entrada/salida (https://developers.openai.com/api/docs/models/gpt-6-luna). El tope API no cubre créditos Netlify; se conservan recargas desactivadas. Servidor local detenido para impedir consumo en un segundo ledger después del traspaso.

Pruebas: build integral, SEO, 77 pruebas Coffee Lab, regresión FREAK y tres pruebas servidor (70 solicitudes concurrentes con saldo previo, fallos sin reembolso, rechazo de origen/roles/tamaño/previews). Prueba SQL con SQLite para lógica; Netlify aplica sintaxis PostgreSQL de la migración en preview antes de producción. Pendiente verificación de deploy y llamada pública real; no declarar publicado solo por este documento. Preparado sobre main 75cd3c948e5979ddbcd369c645a69d9645db022c, no sobre el rediseño pendiente del checkout iCloud.

## Rewards · 30 octubre 2026
Publicación coordinada con TAREASCONTROL PR84: acceso por correo, cumpleaños opcional, selector internacional y Wallet. Portada aprobada conservada; solo se retira promoción FREAK finalizada y se nombra Rewards. No cambia Coffee Lab ni se incluyen diseños pendientes del checkout iCloud. Build integral a dist, SEO y flujos aislados Chromium/WebKit; ver docs/RECOMPENSAS-ACCESO.md.

## Vista local · Guía Better Mood y movimiento · 18 noviembre 2026

La portada mantiene Coffee Lab primero. La galería de visita rota cada seis segundos mientras es visible; movimiento reducido muestra la fachada. Menú, ingredientes y guía usan entradas progresivas. La guía está en /#guia y en Explorar. Las consultas frecuentes usan data/guia-better-mood.json y los productos, menu/catalog.json. Las preguntas abiertas envían el contexto temporal al endpoint coffee-chat con surface=landing. El servidor incorpora la ficha del negocio y la carta al contexto, con el mismo límite de entrada y presupuesto compartido de Barista Luna. Coffee Lab mantiene sus instrucciones previas. En localhost solo se consultan las fuentes locales.

Verificados build, SEO, cuatro pruebas de la función con proveedor simulado, respuesta y error de presupuesto desde navegador, ciclo completo y FAQ en Chromium y WebKit, 320–1440 px. El endpoint existente respondió HTTP 200 a GET; esto no comprueba saldo ni generación en producción. Revisión local antes de publicar.

## Revisión local de sitio y guía de la casa · 18 noviembre 2026

La guía de portada y Coffee Lab consultan menu/catalog.json (51 artículos) y data/guia-better-mood.json (12 temas); data/guia-respuestas.mjs resuelve consultas concretas en ambas interfaces antes de contactar al proveedor. El app empaqueta estos datos con su módulo de chat. Preguntas de recetas abiertas conservan las instrucciones de preparación y reciben también el contexto de Better Mood. El servidor recorta parejas antiguas de la conversación si hace falta para respetar 12 KB. No guarda historial ni cambia el presupuesto. Para capacitar a Luna, actualizar la carta o la ficha temática y agregar la pregunta real y el resultado esperado a scripts/coffee-chat-production.test.mjs.

En la vista local se revisaron 52 rutas de cliente con Chromium y WebKit. Se compactaron Recompensas, páginas locales, negocios y ubicación; el recomendador y las páginas informativas de Coffee Lab usan los colores y controles de la portada. Los enlaces rotulados Menú abren la carta y Pedir lleva a los canales de pedido. Los juegos conservan su identidad. Se verificaron fuentes, recursos internos, navegación, carrusel y productos, 77 pruebas del app y 5 de la guía/función, además de los recorridos de registro rápido y portal Rewards con datos simulados. La validación de la API generativa utilizó un proveedor simulado. Sin despliegue ni transacciones reales.

## Finca Santa Cruz · Vista local

La portada recupera Finca Santa Cruz entre el menú y el V60. La sección enlaza
a `/cafe-lavado/` y usa la foto de José Argüello conservada en el repositorio.
El historial `4292e3a` conserva el diseño anterior y su recorrido ilustrado.
La ficha y la reproducción de la etiqueta se basan en `etiqueta cafe lavado.png`
del archivo Better Mood. El puntaje y las notas corresponden a la edición
anterior. El perfil y la disponibilidad del lote de regreso quedan por confirmar.
La compra existente conserva sus rutas. La vista previa usa datos simulados.

Verificados la compilación, SEO, enlaces e imágenes de portada y ficha en
Chromium y WebKit, incluyendo una pantalla de 320 px. Sin publicación.

## Nuestro café · Finca Santa Cruz natural · Vista local

La ruta `/nuestro-cafe/` integra la introducción, ficha y recorrido originales
de [Natural Better](https://naturalbetter.netlify.app/) dentro del encabezado y
pie de la web. Se reutilizan los archivos de imagen y audio idénticos del
repositorio. El fondo del inicio referencia un archivo ausente en el original.
La integración conserva el fondo liso que se ve en la página publicada.
La publicación original conserva sus enlaces y sus QR.

El checkout `/nuestro-cafe/comprar/` usa Checkout Pro con la API de Orders
para `product=natural` y el SKU `BMC-NATURAL`. El flujo anterior de café lavado
conserva sus preferencias de pago, configuración y rutas de retorno.
La página `/nuestro-cafe/pago/` consulta el estado guardado por el servidor.

La compra pide nombre, WhatsApp, cantidad y modalidad, con dirección para
entrega. El servidor valida el total mostrado. Crea una orden en la aplicación
Better Mood Coffee Web y verifica la aplicación, moneda, importe y entorno
antes de redirigir. La entrega en Puebla se añade como un ítem de la orden.

Configuración del natural en Netlify Functions:

- `COFFEE_NATURAL_PRICE=350` y `COFFEE_NATURAL_WEIGHT=250 g` fijan el precio y
  el peso. `MERCADOPAGO_ORDERS_APP_ID` debe coincidir con
  `integration_data.application_id` de la orden. En el ensayo separado,
  la API devuelve `5035738452605691` para la app `3491657351828631` del panel.
- `COFFEE_NATURAL_PAYMENT_MODE=sandbox` está guardado para Deploy Previews.
  El entorno de ensayo requiere `COFFEE_NATURAL_SITE_URL` con su origen HTTPS.
- `MERCADOPAGO_ORDERS_ACCESS_TOKEN` y `MERCADOPAGO_ORDERS_WEBHOOK_SECRET`
  deben corresponder al entorno seleccionado. Configurarlos como secretos
  exclusivos de Functions con los valores apropiados para cada contexto.
- En Mercado Pago, configurar las notificaciones de órdenes hacia
  `/.netlify/functions/coffee-mercadopago-orders-webhook` en el origen de
  cada entorno. El ensayo guarda pedidos en `coffee_orders_sandbox`.
  El webhook exige firma, vuelve a consultar Orders y confirma únicamente
  la referencia y el monto acreditados. El entorno productivo requiere
  `COFFEE_NATURAL_PAYMENT_MODE=production` y el origen `https://bmoodcoffee.com`.

Se verificó en local la preferencia previa de café lavado y el flujo nuevo
con Mercado Pago simulado, incluyendo recogida de $350, entrega de $410,
notificaciones de aprobación y rechazo, y actualización concurrente del
pedido.

Con autorización se desplegó el checkout de prueba por separado en
`https://better-mood-coffee-checkout-test.netlify.app` (sitio Netlify
`907140af-82bb-4e7d-b2e4-062b955c1889`). Incluye únicamente compra, retorno
y sus funciones. El Access Token y la firma del webhook de prueba se
guardaron como secretos de Functions exclusivamente en ese sitio. Mercado
Pago notificó un pago acreditado de $350 y otro rechazado de $410 ($350 de
café y $60 de entrega). El retorno y la API de estado mostraron ambos resultados.
El rechazo puede llegar como orden `action_required` con `waiting_retry` y
un intento fallido. Las lecturas consistentes de Netlify Blobs usan el
formato de Functions basado en `Request` y `Response`. El checkout solicita
WhatsApp como dato de contacto. El resultado del pago se muestra en la página
de retorno. Falta configurar y validar el entorno para cobros reales.

Antes de habilitar la venta, el botón de «Nuestro café» y el inicio de la
compra muestran «Próximamente». La API de disponibilidad mantiene el
formulario cerrado hasta tener precio, peso y configuración válida de Orders.
La vista recuperada vive en el worktree `codex/landing-preview-recovered`
y se construye con `npm run build`. La revisión es local.

La revisión móvil integró el contenido de Finca Santa Cruz directamente en
`/nuestro-cafe/`. Abre en «Un recorrido por el corazón del café» y muestra
la foto del productor, el perfil en taza y la ficha técnica. Los pasos usan
variantes WebP ligeras de los materiales originales. Las rutas antiguas de
la integración redirigen en Netlify al recorrido nuevo. El sitio original
de Natural Better y su QR siguen disponibles.

## Café para eventos · Vista local

`/eventos/` comparte la paleta y controles de la portada. La tarjeta de
cotización describe los dos formatos, agrupa los datos del evento y muestra
el campo del canal de respuesta elegido. Conserva el registro `/api/catering`
y la notificación de Netlify Forms `cafe-eventos`. Tras guardar, el folio y
el enlace para continuar quedan en la página, sin apertura automática.
Verificados ambos canales, validación, error de envío y reinicio con datos
de prueba en Chromium y WebKit, incluidos 390 y 320 px. Sin publicación ni
solicitudes reales.

La siguiente iteración redujo la cotización a un formato opcional y un
botón que abre WhatsApp con un mensaje preparado. También se puede abrir
un correo. El visitante inicia la conversación desde su aplicación y los
pormenores se reúnen ahí. Esta vista no crea folios ni usa el registro ni
la notificación anteriores. La API `/api/catering` sigue disponible para
quien ya la utilice. Se comprobó la vista local y el mensaje preparado para
cada formato sin enviar mensajes ni publicar cambios.

## Menú UPAEP · Vista local

`/menu/` abre con la carta completa y usa `menu/glass.css` para los controles
translúcidos, la ficha de producto y el pedido. La guía de mesa se resume en
un párrafo sin numeración. El catálogo, precios base, enlaces de cada
producto y la API de pedidos siguen conectados a las fuentes existentes.
La hoja nueva se incluye en la compilación de la landing y se carga solo en
la carta UPAEP. Pruebas en escritorio y iPhone emulado con catálogo y pedido
simulados, sin publicar.
