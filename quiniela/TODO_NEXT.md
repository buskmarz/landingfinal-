# TODO siguientes fases (post-MVP)

## Integraciones y plataforma
- TODO: Conectar `quinielaService` a backend real (Supabase/Firebase/Airtable/API propia).
- TODO: Sustituir `localStorage` por persistencia transaccional y control de concurrencia.
- TODO: Agregar autenticación real y autorización por rol para `/quiniela/admin/`.

## Comercial / operación
- TODO: Integrar pagos (Stripe/Conekta) solo si la dinámica comercial lo requiere.
- TODO: Generar QR único por folio para validación rápida en cafetería.

## Datos deportivos
- TODO: Cargar calendario completo de partidos desde fuente confiable y versionada.
- TODO: Automatizar carga de resultados reales por API o proceso batch validado.

## UX / negocio
- TODO: Panel admin completo con filtros, exportación y auditoría de cambios.
- TODO: Flujos de recuperación de folio por WhatsApp/email con validación segura.
