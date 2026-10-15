# FREAK · La colección imposible

Trabajo del 15 octubre 2026. Ruta aislada `/freak/`, API `/api/freak`. Better Mood UPAEP, 28 octubre 2026, DJ en vivo, Pumpkin Spice Latte + Maracuyá. Horario, precio, premio y cierre pendientes; no se afirman.

## Colección confirmada

Cambio solicitado durante desarrollo: cuatro retratos originales en pixel art monocromo. Tirada exacta de 100: 30 Espiridiona Cenda · Chiquita, 30 Annie Jones, 30 Lobster Boy, 10 Schlitzie. Schlitzie fue confirmado por el usuario como cuarta serie. La rareza describe la tirada, nunca la condición física de una persona. Las ilustraciones son interpretaciones gráficas, no fotografías ni retratos documentales exactos; no se publican biografías inventadas.

Referencias de identidad suministradas en coordinación: [Espiridiona Cenda](https://diariodecuba.com/cultura/1624188025_31926.html), [Annie Jones, Smithsonian](https://npg.si.edu/object/npg_NPG.81.M283), [Schlitzie](https://en.wikipedia.org/wiki/Schlitzie). Lobster Boy corresponde al nombre escénico de Grady Stiles Jr.; no se usa su historia criminal como narrativa de promoción.

## Backend

Postgres de Netlify mediante `@netlify/database`. Migraciones nuevas `netlify/database/migrations/20261015193000_freak.sql` y `20261015193100_freak_inventory.sql`; solo tablas con prefijo `freak_`. Se instalan y aplican mediante el despliegue, no con DDL manual a producción. No modifica POS, compras, pagos ni inventarios de cafetería.

Cada QR lleva 256 bits aleatorios y solo su SHA-256 vive en la base. Los tokens reales no están en Git, HTML, JS ni manifiestos públicos. Los enlaces usan fragmento `#boleto=...`; el navegador no envía ese fragmento al servidor web. La inspección GET usa cabecera `X-Freak-Ticket`, nunca consume y no pone el token en el URL de la API. No compartir URLs de QR reales fuera del equipo: quien encuentre un boleto disponible puede confirmarlo.

POST `claim` actualiza una fila con `owner IS NULL`, campaña activa y fecha liberada. Postgres resuelve la concurrencia; una transacción bloquea la fila del participante para ordenar sus capturas y la actualización condicional del boleto admite solo un dueño. Repetir devuelve `owned` al mismo usuario y `occupied` a los demás. La clasificación se deriva de las filas confirmadas: total DESC, raros DESC, fecha de la última captura ASC, ID solo como desempate estable en coincidencia exacta. No hay contadores locales ni localStorage como fuente de verdad.

Alias único por campaña, clave aleatoria de recuperación de 144 bits, scrypt con sal única. Clave mostrada una sola vez; descarga privada opcional. Cookie de sesión opaca de 256 bits, hash en servidor, Secure, HttpOnly, SameSite=Strict, Path=/api/freak, 30 días. La clave no se envía al ranking. POST valida Origin y JSON; consultas parametrizadas; límites atómicos por IP (30 escrituras y 120 lecturas/minuto), sin guardar IP en claro. CSP y permisos de cámara limitados a FREAK. El lector usa BarcodeDetector cuando existe y jsQR local como alternativa. Cámara física pendiente de comprobación en dispositivos reales.

## Campañas e inventario

`prueba` tiene 100 QR propios, ranking y alias separados. Una ficha permanece no liberada hasta 2099 para comprobar ese estado. `freak-2026` tiene los 100 QR reales y está **INACTIVA**. No hay endpoint público de activación, siembra o lista de tokens. Abrir la colección real requiere una migración DML revisada después de cerrar nombres, premio/reglas, calendario y hora de liberación. El esquema actual propone 80 antes y 20 desde inicio del 28 en hora de México (incluye 8 raros antes y 2 el día del evento); esa hora es una configuración pendiente de confirmar, no una promesa pública.

Inventario privado fuera del repositorio: `/Users/macbookair2020/Documents/Codex/FREAK-PRIVATE-20261015/`. Se generó una vez; al cambiar las series se conservaron exactamente los mismos 200 tokens. No regenerar un inventario ya impreso. `scripts/generate-freak-inventory.mjs` rechaza reemplazar un archivo existente y exige destino absoluto privado.

## Continuidad de la web

Origen limpio `origin/main` SHA 46d099b43d9e7fe98e8d3094f527f73c6989eed1. Clon fuera de iCloud en `/Users/macbookair2020/Documents/Codex/freak-clean-20261015`, rama `codex/freak-collection`. El worktree gestionado falló con `mmap failed: Operation canceled`; los cambios del checkout original permanecen intactos.

Dependencia estricta de preservación: Coffee Lab ya estaba publicado mediante deploy manual, pero no existía en `main`. Se integra exclusivamente su fuente canónica `apps/coffee-lab/`, la compilación y los tres enlaces de portada que ya están en producción. La entrada generada de Coffee Lab y menú coinciden exactamente con HTTPS antes del lanzamiento; portada coincide salvo la reescritura de privacidad de Netlify. Se usa el build estático original de la landing, sin los renderizadores, estilos ni rediseño local pendientes. Ver `COFFEE-LAB.md`.

## Verificación

Pruebas automatizadas locales con Postgres aislado: inspección no consume, inválido/no liberado, alias duplicado, sesión, dos usuarios/un QR, reintento del dueño, edición rara, ranking, recuperación desde otra sesión, aislamiento de campaña, CSRF, GET no reclama, logout y rate limiting. `npm run test:freak`. No usan base real.

Preview Netlify 6ad127873d18bde6bf0da1b2, SHA 7adcf757b5c22b7b7b9ec464030d5a0f198ef356: READY. Las dos migraciones aplicadas en la rama aislada codex/freak-collection; 40 funciones Node 22 y una edge function conservadas. Prueba HTTP real: dos usuarios/un QR, reintento, raro, inválido/no liberado, recuperación en tercera sesión, CSRF y aislamiento pasaron. La campaña real sigue inactiva y su ranking vacío. Evidencia local output/freak-qa/preview-smoke.json. Pendiente antes del cierre: SHA de main y dominio tras merge.

Pruebas previas al PR: build conjunto correcto; el compilador conserva los avisos heredados de fuentes referenciadas por URL y chunks >500 kB de Coffee Lab. No impiden el build; su HTML publicado coincide. La instalación se verifica con el lock; todos los assets públicos están en un manifiesto explícito. `.netlify/` permanece ignorado al vincular el sitio existente.


## Impresión y QA visual

100 stickers reales preparados en PDF A4, nueve por página, doce páginas, 62 × 85 mm cada sticker; QR vectorial de 25 mm con cuatro módulos blancos de margen. Distribución comprobada 30/30/30/10, tokens originales conservados. Los 100 QR se renderizaron a 300 DPI y se decodificaron uno por uno con jsQR: 100/100 URLs exactas. Archivo privado FREAK-100-STICKERS-REALES-PRIVADO.pdf; no distribuir antes de activación. También FREAK-STICKERS-PRUEBA.pdf y FREAK-CUATRO-DISENOS-PRUEBA.pdf, con QR independientes de prueba. Scripts reproducibles export-freak-print.mjs y export-freak-print.py. No se publica ningún PDF de inventario.

Browser/IAB a 393 × 852: registro desde QR, clave de recuperación, confirmación, colección y recarga correctos. Comparación con view_image del concepto y captura: jerarquía tipográfica, paleta, cortes de boleto, botones amarillos y navegación inferior verificados. Cambio intencional solicitado: cuatro retratos pixel art monocromos sustituyen grabados de cinco actos ficticios; los textos y tiradas se actualizaron conforme a esa decisión. El contenido visible inicial conserva FREAK, título, fecha, DJ, bebida y CTA. Lector físico de cámara y Safari/iPhone reales aún no comprobados; los QR impresos se validaron por software. Capturas en output/freak-qa/.

Preservación de archivos previos: 195 assets del baseline coinciden por SHA-1, index.html solo recibe los tres enlaces ya publicados de Coffee Lab. netlify.toml es configuración de servidor y se excluye de dist. El menú y la entrada de Coffee Lab coinciden byte por byte con el dominio. Verificación de secretos en dist: ninguno de los 100 tokens reales aparece en archivos públicos.
