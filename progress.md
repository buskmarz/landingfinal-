Original prompt: Refactorizar y mejorar el juego Droppy Dash implementando una nueva temática visual de primavera wellness-premium, agregando un sistema de fondo dinámico con degradados suaves verde-menta y amarillo cálido, elementos animados como flores minimalistas, hojas flotando lentamente, rayos de sol difusos y partículas ligeras que transmitan frescura y enfoque; optimizar sprites y físicas para mantener alto rendimiento en móvil, añadir power-ups estacionales como “Spring Flow” que otorgue velocidad progresiva y multiplicador visual con aura luminosa alrededor de Droppy, mejorar feedback UX con micro-animaciones suaves al recolectar granos y adaptógenos, implementar transición ambiental día-tarde según puntaje, integrar sonido ambiente natural relajante y asegurar arquitectura modular del código (componentes separados para background, efectos, físicas y scoring) para facilitar futuras campañas visuales sin afectar la jugabilidad existente. tu piensa en 5 mejoras para mejorar nuestro juego y hacerlo ver com algo profesional.

## Estado inicial
- `game/droppy-dash.js` concentra render, físicas, scoring, partículas, eventos y red en un solo archivo.
- El juego ya usa canvas y overlays, pero no expone `window.render_game_to_text` ni `window.advanceTime`.
- No hay dependencia local de `playwright`; validaré si `npx` puede ejecutar el cliente del skill o si hará falta escalar.

## Plan de trabajo
- Modularizar internamente el archivo en sistemas: background, FX, físicas/juego, power-ups, scoring y render de HUD.
- Cambiar la dirección visual a primavera wellness-premium con transición día-tarde y motion más pulido.
- Añadir un power-up estacional con feedback fuerte pero ligero para móvil.
- Integrar audio ambiente natural con fallback seguro y activación tras interacción.
- Probar con el cliente Playwright del skill y revisar screenshots/resultados después de cada cambio importante.

## TODO
- Confirmar flujo de prueba local del juego con servidor y cliente Playwright.

## Avance 1
- Se movio la arquitectura del juego a modulos separados: `game/droppy/background.js`, `game/droppy/effects.js`, `game/droppy/physics.js`, `game/droppy/scoring.js` y `game/droppy/audio.js`.
- `game/droppy-dash.js` ahora orquesta HUD, red, loop, render, fullscreen, overlays y hooks de prueba.
- Se agregaron `window.render_game_to_text` y `window.advanceTime(ms)` para automatizacion deterministica.
- Se implemento la tematica spring wellness-premium con fondo dinamico, flores, hojas, particulas suaves y transicion ambiental por score.
- Se agregaron pickups `adaptogen` y `spring`, con power-up `Spring Flow`, aura luminosa y multiplicador visual.
- Se integro audio ambiente sintetizado con Web Audio para evitar depender de assets externos.
- Validacion estatica completada con `node --check` en todos los modulos JS.

## Bloqueos actuales
- El sandbox no permite abrir un puerto local para servir la pagina.
- El cliente Playwright del skill no puede correr todavia porque no esta instalado el paquete `playwright`.

## Avance 2
- Se instalo `playwright` tanto en el proyecto como en el skill `develop-web-game`.
- Se descargo Chromium para Playwright y se valido el juego desde `http://127.0.0.1:4173`.
- Artefactos de prueba generados en `output/web-game/`.
- Screenshot validado visualmente: el canvas muestra la nueva direccion de arte, hojas flotando, sol difuso, flores y pickups visibles.
- `render_game_to_text` confirmo juego en estado `playing` con runner, obstaculos y pickups visibles despues del refactor.
- Se elimino el error 404 del favicon y se agrego modo `localhost` sin leaderboard/session para previews locales.
- Se suavizo el onboarding del juego para dar mas espacio antes del primer obstaculo y acercar la ventana de `Spring Flow`.

## Riesgos / notas
- El harness Playwright del skill presenta un timeout intermitente al hacer click en `[data-play]`; hubo corridas exitosas y otras con timeout sin cambios de codigo entre medias.
- La validacion local usa `python3 -m http.server`, por lo que `session`, `score` y `leaderboard` reales no se prueban ahi.
- No se logro capturar una corrida con `Spring Flow` ya activado en screenshot final, aunque el power-up y su pipeline de spawn/render/score ya estan integrados.

## Siguiente agente
- Si hace falta validar `Spring Flow` de forma visual, ejecutar otra corrida Playwright o agregar una ruta/debug flag temporal para forzar spawn en entorno local.
- Si el timeout del click del harness sigue apareciendo, probar un payload con click por coordenadas o revisar el cliente del skill.
