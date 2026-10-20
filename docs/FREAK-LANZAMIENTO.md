# FREAK · revisión de lanzamiento, sin publicar

## Una dinámica en todas las piezas

**Busca. Junta. Elige.** Personajes: 1 punto. Carpa o boleto dorado: 2 puntos. Meta: 10 puntos físicos. Registro con nombre/celular antes de validar en barra; el equipo marca los stickers y entrega el código. El participante escanea un cartel y confirma un premio disponible. La confirmación reserva, el escaneo no. Un premio por celular es la restricción implementada; no prueba una persona única.

| Pieza | Mensaje y acción | Revisión |
| --- | --- | --- |
| Landing `/freak/` | Tres pasos, meta visible, valores, registro, validación, cartel y confirmación | Coherente; saldo solo de servidor |
| Boleto revisado | Frente para pegar; reverso explica registro, validación y confirmar | Sin QR; cuatro por carta, doble cara |
| Seis tabloides de stickers | Cuatro personajes normales + carpa y boleto dorado especiales | 1,188 piezas, sin QR, una cara |
| Cinco carteles | FREAK · ESCANEA Y ELIGE | Texto mínimo pedido por usuario; QR existentes conservados y comprobados |
| Panel de barra | Revisar cantidades, marcar, emitir código, registrar entrega | Umbral real; no suma por tocar imágenes |
| Guion del equipo | “Personajes uno; carpa y boleto dos. Junta diez. Entra con tu celular, validamos y te damos un código. Escanea un cartel y confirma.” | Mismas reglas, sin prometer reserva al escanear |

Los archivos de impresión correctos están reunidos en `output/freak-lanzamiento/impresion/`. No usar los PDF históricos de reversos con QR, premios por sticker ni QR que solo contienen texto. No se borraron originales.

## Decisiones pendientes, sin condiciones inventadas

La revisión de `docs/FREAK.md`, backend vigente y mensajes recientes del chat FREAK no encontró un procedimiento aprobado de recuperación del código de barra, horario definitivo ni condiciones completas de entrega. Los cinco premios y el umbral de puntos sí están aprobados; ver IDs de mensajes en FREAK.md. Las opciones siguientes son propuestas internas, no reglas publicadas ni funciones ya disponibles.

| Decisión | Opción para evaluar | Efecto / estado actual |
| --- | --- | --- |
| Código perdido o respuesta perdida al emitirlo | Mantener el proceso actual y entregar el código escrito en el boleto, además de permitir copiarlo | Previene pérdidas; no recupera uno ya extraviado. Se requiere definir cómo atiende el responsable ese caso. |
| Código perdido | Implementar reemisión administrativa después de verificar la misma cuenta, invalidar el anterior y registrar auditoría; solo antes de canjear | Requiere decisión e implementación posterior. Hoy solo hay hash y no existe este botón. No agregar recuperación pública por celular. |
| Horario y fin de búsqueda | Confirmar hora de inicio/fin del evento y momento de cierre de los canjes | Hasta confirmarlo, piezas solo indican 28 octubre 2026, sin hora ni cuenta regresiva. |
| Entrega | Confirmar responsable, lugar, stock y cómo se acuerda cada entrega | El panel puede registrar una entrega; no prueba por sí solo que el premio físico esté disponible. |
| Americano diario durante 2026 | Precisar desde cuándo inicia, presentación y operación de entrega | No se amplió el premio, no se agregaron consumos, compras, descuentos ni costo. |
| Otros cuatro premios | Precisar presentación y disponibilidad exacta del vape, kit Necte, chilaquiles y maitake | Se conservan los títulos del usuario; no añadir beneficios ni garantías. |

## Comprobaciones de esta ronda

- Axe WCAG 2 A/AA y 2.1 AA: sin infracciones detectadas en portada a 360 y 1440 px y panel a 360 px. No equivale a auditoría de lector de pantalla completa.
- Teclado: enlace de salto visible al enfocar y navegación al contenido. Foco con contorno perceptible; movimiento reducido respetado.
- Texto al 200% en ancho 320 px: sin desplazamiento horizontal. Todos los enlaces/controles medidos tienen altura táctil de al menos 44 px; se excluye el enlace de salto mientras está oculto.
- Cuatro imágenes cargadas correctamente; no cambiaron sus diseños. Fuente ornamental renombrada y reducida conforme a OFL: 178,076 a 60,792 bytes. Se verificaron caracteres latinos y métricas; original conservado.
- Simulación móvil 360 px, latencia 150 ms, bajada 200 KiB/s y CPU x4: carga local aproximadamente 2.5 s frente a 3.0 s de referencia. Recursos bajan aproximadamente de 546 KB a 429 KB. Son mediciones de laboratorio local, no resultados en teléfonos ni red pública.
- Capturas finales: `output/freak-review/FREAK-revision-movil.png` y `FREAK-revision-escritorio.png`. Solo muestran datos de prueba y campos vacíos, sin clientes ni claves.

## Library

La consulta de Library funcionó. El flujo preparado de carga de las dos imágenes no pudo iniciarse: el entorno de transferencia informa que `prepare_uploads` no está disponible. No hay archivos creados ni IDs de Library. La habilidad vigente exige el flujo preparado para varias imágenes y no permite sustituirlo por cargas directas tras iniciar ese flujo. Imágenes locales conservadas. El primer intento, antes de usar red autorizada, falló por DNS; tampoco transfirió archivos.

## Operación aún física

Probar un boleto a doble cara, un sticker y un cartel con la impresora final. Leer el cartel desde el sitio y distancia reales, sin exigir acercarse a una zona inaccesible. Validar con el equipo el marcado de stickers y registrar una entrega de prueba fuera de producción. Safari/iPhone físico, impresora, luz y distancia no quedan certificados por Chromium emulado ni por decodificar el PDF.


## Cuarta ronda en el chat FREAK original

Se verificó funcionalmente el checkpoint 6970bb7: registro nuevo, celular duplicado, entrada existente, selección/cancelación, rechazo sin código, validación de 8 normales + 1 especial, confirmación que ocupa el premio y entrega visible en panel y cuenta. Datos exclusivamente de la base temporal. Se repitieron 32 pruebas backend (27 de API/premios y 5 de orden/scanner/share), todas aprobadas. Los diálogos de entrega provocaron demoras del control del navegador, pero el panel confirmó Entrega registrada y la cuenta mostró Entrega registrada; no se atribuye a fallo de la aplicación.

Correcciones: retirar todas las flechas y contadores decorativos; mantener 1/2/10 como datos de la dinámica. No invitar a confirmar antes de validar los puntos. Mostrar los teléfonos del panel con diez dígitos, manteniendo su normalización interna. Revisados tres PDFs del paquete contra sus SHA256; boleto carta de dos páginas, sin instrucciones de escanear estampillas.

Capturas actuales: FREAK-cuarta-ronda-movil.png y FREAK-cuarta-ronda-escritorio.png. No contienen clientes ni claves. Vista móvil de 390 px sin desbordamiento horizontal, sin flechas y sin contador de pasos; cero errores JS observados en la portada recargada. El servidor se reinició después de cerrarse el proceso heredado; nueva base temporal independiente. La ventana hasta 14:02 no se declara cumplida en este punto de control. No hubo push, merge ni despliegue.


## Revisión adicional de integración

Defecto corregido: al expirar la sesión pública, la selección y el código permanecían ocultos en el DOM. Ahora se borran al recibir del servidor una sesión terminada y se pide entrar de nuevo. Salir voluntariamente conserva su mensaje normal. Comprobado con dos pestañas y cuenta temporal; formulario oculto, código vacío y cero premios seleccionados. No cambia cuentas, autorización, reglas ni recuperación de código.

Nueva comprobación local `scripts/freak-integration-reload-qa.mjs`: cuatro condiciones aprobadas (reserva persistida, reintento idempotente, solo un premio ocupado y rechazo de un segundo premio por cuenta). En navegador, volver a entrar y recargar mostró el mismo premio confirmado con todos los botones de elección deshabilitados. Evidencias integration-session-ui.json, integration-reload.json y canje-conservado-tras-recarga.png.

El servidor QA rechazaba su propia ruta raíz antes de resolver index.html. Corrección limitada al servidor local; enlaces de inicio, FREAK, panel, privacidad y ubicación responden 200. Fuentes públicas ajenas a FREAK y Coffee Lab no cambiaron. Servidor reiniciado en http://127.0.0.1:5196/freak/, sesión 22405, con base temporal nueva. El material de impresión sigue intacto.

Pendientes solicitados al usuario: horario y cierre de canjes; responsable, disponibilidad y condiciones de entrega; tamaño e inicio del americano diario; decisión entre reemisión administrativa del código perdido (invalidando el anterior) o atención manual. No se implementó ninguna política sin respuesta. Sin publicación ni despliegue; la ventana hasta 14:02 no se declara concluida.


## Inventario agotado y cierre de preparación independiente

En la base temporal se ocuparon las cinco opciones y se revisó la portada: mensaje exacto «Todos los premios ya fueron elegidos», cero botones de elección habilitados. No se afectaron premios reales. Se conserva captura inventario-agotado-final.png y prueba local scripts/freak-exhaustion-local-qa.mjs. La base de prueba se reiniciará para que el preview vuelva a abrir con cinco opciones libres.

Preservación repetida contra e8e83c9: 196 archivos públicos ajenos a freak/ idénticos, sin cambios en Coffee Lab; evidencia preservation-final.json. Guía de equipo preparada en output/freak-lanzamiento/GUIA-EQUIPO.md con los cinco títulos/cantidades aprobados, reglas comprobadas y decisiones todavía abiertas. No se repitieron suites completas ni se añadieron cambios cosméticos. Pendientes de decisión ya preguntados al usuario; no se repiten ni se implementan políticas nuevas. La preparación independiente queda comprobada; no equivale a haber cumplido la ventana hasta 14:02 ni a aprobación o despliegue.


## Sesión prolongada del preview

Observación local de siete minutos: borrador de acceso conservado (nombre ficticio intacto, celular aún lleno). Se registraron seis consultas consecutivas de disponibilidad con intervalos reales de 20.0 segundos entre ellas en el servidor QA; no se usó reloj acelerado. La disponibilidad cambió de cinco a cuatro premios sin recargar, manteniendo el borrador. Después se entró a una cuenta temporal con premio confirmado: mismo premio, cero botones de elección habilitados y estado conservado tras otros 42 segundos de inactividad. Cero errores JavaScript observados. El servidor QA se reinició mientras la página seguía abierta y retomó consultas; no se cambiaron ajustes de red de la Mac ni producción. No se simula una red móvil real ni se certifica una interrupción prolongada del transporte.

Instrumentación mínima solo en scripts/freak-qa-server.mjs: registra fecha/op de lecturas de disponibilidad en output/freak-review/poll-observation.jsonl, sin nombres, celulares, códigos, cookies ni tokens. Evidencias soak-results.json, borrador-tras-ciclos-reales.png y premio-confirmado-tras-inactividad.png. No se repitieron suites completas ni se cambió la interfaz para llenar tiempo.

Concluida esta observación, no se identificó otro defecto independiente que justifique una implementación. Siguen pendientes las decisiones operativas ya preguntadas. La ventana hasta 14:02 permanece abierta y no se declara cumplida por terminar esta prueba. Revisión local, sin push, merge, despliegue ni lanzamiento.


## Aprobación posterior: reemitir código desde administración

El usuario eligió «Reemitir desde administración». Esta decisión sustituye los pendientes históricos sobre recuperación de código de este documento. Implementado localmente: botón Reemitir código en Personas validadas, confirmación explícita que avisa que el anterior dejará de funcionar, nuevo código mostrado una sola vez y copiable. Se conserva la validación de puntos. Se bloquea si la cuenta ya confirmó un premio.

Migración aditiva 20261019201500_freak_code_reissues.sql: auditoría con persona, campaña, administrador, hashes anterior/nuevo y fecha; sin guardar el código en texto. Operación transaccional con bloqueo de la persona y validación. Permisos y CSRF existentes se conservan. Se actualizó la guía del equipo.

Verificación: ocho pruebas de premios/reemisión y 21 pruebas FREAK anteriores aprobadas. UI local: cancelar y confirmar; API tras pulsar el botón: código anterior 403, código nuevo 200, reemisión posterior al canje 409. Evidencia reissue-tests.txt, reissue-existing-tests.txt y reissue-ui-proof.json. Sin clientes ni premios reales afectados. Sin publicación ni despliegue. Siguen pendientes horario/cierre y condiciones/responsable/stock de entrega y presentación/inicio del americano.

## Cartel de circo actualizado

Referencia recuperada del chat «Calcula precio de latte en botella»: PET transparente, tapa negra y FREAK vertical. Cartel nuevo amarillo/crema/negro con cuatro personajes, botella plástica de latte naranjoso y la misma fuente Rye real incrustada en título, botella y textos. QR informativo real a https://bmoodcoffee.com/freak/, con logo, decodificado desde el archivo final. No sustituye los cinco enlaces privados de carteles de premios ni está asignado a un premio. Archivos de revisión en output/freak-cartel-amarillo/. Ilustración generada y tipografía/QR vectoriales maquetados como PDF tabloide. No se modificaron estampillas ni boletos aprobados.

## Entrada desde QR: vista local pendiente de aprobación
- El fragmento de cartel muestra «Encontraste un premio» y la meta de 10 puntos en la portada, sin saltar directamente al listado.
- Acción principal: ver premios disponibles. Se mantienen validación en barra y confirmación con código; escanear no reserva.
- Se conserva amarillo principal; azul sustituye turquesa en acentos. Sin publicar.
- Verificación: sintaxis JS, 8 pruebas de premios y build completos; entrada desde QR y portada normal comprobadas en navegador local.

### Regla confirmada: dos tipos de QR
El usuario confirmó 10 puntos + uno de los cinco QR escondidos. QR común en boleto: información y acceso; no habilita canje. Cinco QR con tokens existentes: elección y confirmación de premio. Un premio por celular. Texto reducido en portada, instrucciones y acceso. Vista local, sin deploy.

### Hallazgo y boleto gratis
Entrada QR: «¡Encontraste 1 de los 5 QR!» y «Solo faltan tus stickers: junta 10 puntos y valida en barra». Boleto gratis en Better Mood, para pegar stickers. Confeti decorativo breve, sin bloquear clics, con limpieza y respeto a movimiento reducido; no aparece en acceso común. No cambia reserva ni validación. Sin publicar.

### Especial único y entrega a imprenta
Solo carpa: 2 puntos. Cuatro personajes: 1 punto. Boleto especial retirado de landing. Entrega de cinco originales individuales a 21.17 mm, un diseño por tabloide armado por imprenta. No se presupone cantidad final ni se envía mensaje al proveedor.

### Guardado exclusivo antes de juntar puntos
Guardar QR requiere sesión de celular y operación explícita; registro desde QR intenta guardarlo después de crear la cuenta. Reserva por campaña/QR y campaña/persona con restricciones únicas y transacción; carrera comprobada: uno guarda y otro recibe conflicto. No se consume al abrir. Cuenta puede volver sin enlace. Tras comprobar 10 puntos físicos, puede confirmar premio sin introducir código. 9 pruebas de premios aprobadas, incluida nueva exclusividad; verificación de registro y guardado en navegador local. Sin publicar.

### Coherencia landing general y entrada QR
Ambas vistas muestran cuatro personajes (1 punto) y únicamente carpa (2 puntos), meta 10. Boleto gratis como soporte opcional para pegar; se comprueban stickers físicos. QR guardado en cuenta antes de juntar puntos, exclusivo por celular, y confirmación de premio tras comprobación. Panel muestra titulares de QR y conteo de carpas. Código de barra ya no se exige ni muestra en el flujo nuevo. Pruebas de premios 9/9 y build completos; ambas vistas comprobadas localmente. Pendiente aprobación del usuario para publicar.

### Prioridad celular
Botón principal adelantado antes de ejemplos; ancho completo y 54 px de alto. Cabecera, tipografía y colección compactadas; carpa especial en fila clara; formularios a 16 px y botones grandes. Revisión visual en viewport de 320 y 390 px mediante iframe local; no sustituye prueba con teléfono físico. Vista móvil disponible localmente en puerto 5197, no incluida en build ni deploy. Sin publicar.

### Compactación y premio sorpresa
Instrucciones y premios desplegables; acceso separado siempre visible. Mensaje: QR guardado requiere 10 puntos comprobados para hacer válido el premio. Usuario añadió premio sorpresa al cartón con más stickers. No se inventó regalo, desempate ni fecha de conteo; quedan por definir antes de adjudicar ese premio. Sin publicar.

### Diseño compacto y control de impresión
«Cómo ganar» y «Premios» pasan a filas minimalistas desplegables, sin flechas decorativas; listado de premios sin tarjetas pesadas. Evento: horario tentativo 6:00–9:00 p. m. Cinco QR del PDF verificados por decodificador con logo, páginas 11x17 y tokens coincidentes con hashes de migraciones. Web pública aún devuelve contrato anterior; no se ha desplegado esta revisión. Pedir aprobación sobre vista local antes de publicar y colocar carteles.

## Publicación autorizada y panel de seguimiento · 19 octubre 2026
El usuario autorizó publicar la versión revisada manteniendo cinco enlaces de QR permanentes. Los cambios futuros de contenido usan las mismas URLs y tokens; no regenerar reward-posters.json ni poster_hash de producción. El panel /freak/admin/rewards.html permite ubicación o coordenadas por QR, visitas por sesión, titular que lo guardó y premios confirmados/entregados. Contadores de visitas no equivalen a personas únicas. Migraciones aditivas de reservas y seguimiento, sin borrado de producción. Horario tentativo 18–21 h. Único especial: carpa. Imprenta recibe cinco originales individuales. Portada/menú/Coffee Lab se conservan al publicar.

## Publicado y comprobado · 19 octubre 2026
PR #20 fusionado en main: 63e633a0be73edc6adc03d181d697af8ddbe087f. Deploy producción Netlify 6ad6a9b026f9b3b14ac75138, estado READY. HTTPS comprobado en /freak/, JS, carpa y panel. API pública incluye reservation/validation, cinco premios disponibles; sin celular/sesión, reservar devuelve 401 sin consumir QR. No se registraron ganadores ni cuentas de prueba en producción. Portada, /menu/ y /coffee-lab/ idénticos por SHA256 antes y después. Evidencia: output/freak-publicacion/VERIFICACION.json y FREAK-PUBLICADO.png; guía corta ADMINISTRACION.txt. Los cinco tokens de los PDF permanecen iguales; contenido y diseño se pueden modificar sin reimprimir QR. Contadores: visitas por sesión, no personas únicas ni intentos de cámara sin apertura. Las pruebas de concurrencia/canje se ejecutaron con datos aislados: 31 aprobadas.

## Dos páginas y estadísticas ampliadas · 19 octubre 2026
/freak/ queda como landing de campaña. /freak/qr/ es el registro/consulta exclusivo. Enlaces antiguos /freak/#premio=TOKEN redirigen con replace y preservan el fragmento: no reimprimir ni regenerar QR. Se registra visita solo en destino, una sesión por navegador/QR; nueva apertura con UUID propio distingue recargas y deduplica reintentos de red. Sin QR válido no se registra apertura; abrir no consume. La reserva sigue requiriendo celular.
Migración aditiva de aperturas y resultados de intentos autenticados (guardado, ocupado, repetido, otro QR, error). Panel: aperturas, sesiones, guardados, intentos/ocupado, 10 puntos, confirmados/entregados, porcentajes y desgloses fecha/QR y hora de Puebla. Nuevos eventos se miden desde publicación, sin inventar histórico; las visitas por sesión existentes se conservan. Datos personales y ubicación solo con administración. No cuenta intentos de cámara que no abren web ni personas verificadas.
Verificación local: 11 pruebas de premios/estadísticas y 21 pruebas generales aprobadas por separado; build completo. Recorrido con QR local: enlace antiguo redirige, nombre/celular guarda y el panel refleja 1 apertura, 1 sesión, 1 guardado y su titular; no usa tokens ni cuentas de producción.

### Dos páginas publicadas
PR #21 fusionado: dcd65b7abb52c08b81796a2ddd5439872c5ddc0a. Netlify producción 6ad6ae11b53d94c248d8e8e8 READY. /freak/ y /freak/qr/ responden 200; enlace antiguo con fragmento redirige correctamente en navegador público. Panel no autenticado devuelve 401. API pública no expone analytics. Portada, menú y Coffee Lab conservan hashes. No se consumió QR real: demostración usa fragmento inválido preview-local, que no registra eventos ni reservas. Evidencia en output/freak-publicacion/DOS-PAGINAS-VERIFICACION.json y QR-PAGINA-EXCLUSIVA.png. Las estadísticas nuevas no son retrospectivas.

## QR con colección visible y amarillo continuo · 20 octubre 2026
A petición del usuario, /freak/qr/ recupera los cuatro personajes, la carpa especial, valores 1/2/meta10 y «Así ganas» en tres pasos, antes del formulario. Fondo amarillo #FFDE00 continuo en portada, instrucciones y registro, sin franja crema que separaba la página. Botón principal temprano para acceso móvil; cartón gratis visible. Confeti de 12.5 segundos, guardado/consulta, estadísticas y cinco tokens se conservan. Cambios de HTML/CSS exclusivos de QR, build completo aprobado y revisión visual a 390 px. No se consumieron QR reales en revisión.
