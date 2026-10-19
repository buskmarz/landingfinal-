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
