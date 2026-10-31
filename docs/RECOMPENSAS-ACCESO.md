# Recompensas: revisión 2026-10-30

La portada deja de anunciar FREAK. Se conservan los enlaces impresos y el historial; no se incluye el rediseño pendiente de otros checkouts ni se modifica Coffee Lab.

## Acceso

- **Únete gratis** abre el registro en esta página; **Inicia sesión** pide celular y correo.
- El código del correo verifica ese correo. Si el celular pertenece a una cuenta anterior sin correo confirmado, **Activar mi acceso** solicita la vinculación y caja/administración confirma al titular; no crea una copia de su saldo.
- El acceso se conserva al recargar la misma pestaña, dentro de la vigencia del servidor. Se guarda solo en sessionStorage y se elimina al cerrar consulta. Los datos no se transmiten en enlaces.
- Solicitudes y sesión usan `/sistema/api/` en el mismo dominio. Los botones Apple/Google Wallet conservan la emisión autenticada existente.

## Comprobación

Build completo y validación SEO. Flujo aislado en Chromium y WebKit en 1440×1000, 820×1180 y 390×844: registro, error de código, activación asistida sin mostrar saldo antes de autorización, reintento después de confirmación, restauración al recargar y cierre de sesión. Sin correos ni cuentas reales de prueba.

El servidor tiene un cupo de 40 códigos por cada 24 horas, con controles por correo y conexión. La sesión real del titular y la instalación en un dispositivo físico no quedan demostradas por estas pruebas; el usuario pospuso la revisión desde administración.

## Dirección Rewards
Tesis visual: amarillo Better Mood, crema e ilustraciones de línea negras; una experiencia cálida y clara.
Contenido: Rewards y acciones → acceso → tres beneficios ilustrados → condiciones y ayuda.
Interacción: entrada suave, navegación anclada y cambio de formulario, respuesta visual al foco/hover; respetar movimiento reducido.
Referencia de experiencia: rewards.starbucks.mx y /register. Iconos originales, sin activos ni promesas de Starbucks. Cumpleaños opcional (día y mes), sin prometer un regalo nuevo.

México (+52) viene seleccionado; se escriben diez dígitos y puede elegirse otro país o código internacional. Se acepta pegar el número completo con el prefijo seleccionado sin duplicarlo. Cumpleaños opcional en UI y servidor; la autenticación antigua conserva su requisito.

Tras registro verificado se abre el resumen con ambos botones Wallet. Los errores/reintentos aparecen junto al botón. Pruebas de navegador: México, EE. UU. y código personalizado; nacimiento vacío/parcial/válido; ambos destinos de Wallet con proveedor simulado. La instalación física y credenciales reales de Google siguen pendientes, como pidió el usuario.
