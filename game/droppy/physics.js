(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  window.createDroppyPhysicsSystem = function createDroppyPhysicsSystem({ random }) {
    const rand = typeof random === "function" ? random : Math.random;

    const DISTANCE_SCALE = 12;
    const BASE_SPEED = 250;
    const SPEED_RAMP = 6.2;
    const MAX_SPEED = 555;

    const world = {
      width: 0,
      height: 0,
      groundY: 0,
    };

    const runner = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      velY: 0,
      gravity: 0,
      jumpStrength: 0,
      jumpCount: 0,
      isGrounded: true,
    };

    let speed = BASE_SPEED;
    let distance = 0;
    let elapsed = 0;
    let obstacleTimer = 1.45;
    let beanTimer = 0.9;
    let adaptogenTimer = 2.4;
    let springTimer = 5.2;
    let spawnLaneToggle = false;

    let obstacles = [];
    let pickups = [];

    function randomBetween(min, max) {
      return min + (max - min) * rand();
    }

    function resize(width, height) {
      world.width = width;
      world.height = height;
      world.groundY = height * 0.9;

      const runnerWidth = clamp(width * 0.12, 34, 56);
      runner.width = runnerWidth;
      runner.height = runnerWidth * 1.26;
      runner.x = width * 0.22;
      runner.y = world.groundY - runner.height;
      runner.velY = 0;
      runner.jumpCount = 0;
      runner.gravity = height * 1.95;
      runner.jumpStrength = height * 0.95;
      runner.isGrounded = true;
    }

    function reset() {
      speed = BASE_SPEED;
      distance = 0;
      elapsed = 0;
      obstacleTimer = 1.45;
      beanTimer = 0.8;
      adaptogenTimer = 2.2;
      springTimer = 5.2;
      obstacles = [];
      pickups = [];
      runner.y = world.groundY - runner.height;
      runner.velY = 0;
      runner.jumpCount = 0;
      runner.isGrounded = true;
    }

    function jump() {
      if (runner.jumpCount >= 2) return false;
      const jumpScale = runner.jumpCount === 0 ? 1 : 0.88;
      runner.velY = -runner.jumpStrength * jumpScale;
      runner.jumpCount += 1;
      runner.isGrounded = false;
      return true;
    }

    function spawnObstacle() {
      const size = clamp(world.width * 0.12, 34, 58);
      const type = rand() > 0.5 ? "mushroom" : "stone";
      const width = size * randomBetween(type === "stone" ? 0.95 : 0.9, type === "stone" ? 1.28 : 1.16);
      const height = size * randomBetween(type === "stone" ? 0.8 : 0.95, type === "stone" ? 1 : 1.34);
      obstacles.push({
        type,
        x: world.width + randomBetween(world.width * 0.08, world.width * 0.36),
        y: world.groundY - height,
        width,
        height,
        hue: rand() > 0.5 ? "#f48361" : "#ff8f73",
        tilt: randomBetween(-0.08, 0.08),
        spots: Array.from({ length: type === "mushroom" ? Math.round(randomBetween(2, 5)) : 0 }).map(() => ({
          x: randomBetween(0.24, 0.78),
          y: randomBetween(0.14, 0.42),
          r: randomBetween(0.06, 0.12),
        })),
      });

      const minGap = clamp(1.1 - elapsed * 0.015, 0.72, 1.1);
      const maxGap = clamp(1.86 - elapsed * 0.02, 1.05, 1.86);
      obstacleTimer = randomBetween(minGap, maxGap);
    }

    function makePickup(kind) {
      const lane = spawnLaneToggle ? 128 : 168;
      spawnLaneToggle = !spawnLaneToggle;
      const baseY = world.groundY - lane - randomBetween(-10, 24);
      if (kind === "bean") {
        const r = clamp(world.width * 0.03, 10, 14);
        return {
          kind,
          x: world.width + randomBetween(44, world.width * 0.38),
          y: baseY,
          baseY,
          bob: randomBetween(8, 13),
          phase: randomBetween(0, Math.PI * 2),
          radius: r,
          tilt: randomBetween(-0.28, 0.28),
        };
      }
      if (kind === "adaptogen") {
        const r = clamp(world.width * 0.036, 12, 16);
        return {
          kind,
          x: world.width + randomBetween(50, world.width * 0.42),
          y: baseY - 12,
          baseY: baseY - 12,
          bob: randomBetween(10, 16),
          phase: randomBetween(0, Math.PI * 2),
          radius: r,
          tilt: randomBetween(-0.2, 0.2),
        };
      }
      const r = clamp(world.width * 0.045, 14, 18);
      return {
        kind,
        x: world.width + randomBetween(72, world.width * 0.48),
        y: baseY - 18,
        baseY: baseY - 18,
        bob: randomBetween(12, 20),
        phase: randomBetween(0, Math.PI * 2),
        radius: r,
        tilt: randomBetween(-0.16, 0.16),
      };
    }

    function spawnPickup(kind) {
      pickups.push(makePickup(kind));
      if (kind === "bean") {
        const minGap = clamp(0.95 - elapsed * 0.01, 0.55, 0.95);
        const maxGap = clamp(1.62 - elapsed * 0.02, 0.95, 1.62);
        beanTimer = randomBetween(minGap, maxGap);
      } else if (kind === "adaptogen") {
        const minGap = clamp(3.3 - elapsed * 0.02, 2.2, 3.3);
        const maxGap = clamp(5.2 - elapsed * 0.03, 3.4, 5.2);
        adaptogenTimer = randomBetween(minGap, maxGap);
      } else {
        springTimer = randomBetween(5.8, 8.6);
      }
    }

    function rectsOverlap(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    }

    function update(dt, modifiers) {
      const events = [];
      elapsed += dt;
      speed = Math.min(BASE_SPEED + elapsed * SPEED_RAMP, MAX_SPEED);
      speed *= 1 + (modifiers?.speedBonus || 0);
      distance += (speed * dt) / DISTANCE_SCALE;

      const wasGrounded = runner.isGrounded;
      runner.velY += runner.gravity * dt;
      runner.y += runner.velY * dt;
      if (runner.y >= world.groundY - runner.height) {
        runner.y = world.groundY - runner.height;
        if (!wasGrounded && runner.velY > 100) {
          events.push({
            type: "landed",
            x: runner.x + runner.width * 0.5,
            y: world.groundY + 1,
            impact: clamp(runner.velY / 180, 0.6, 2),
          });
        }
        runner.velY = 0;
        runner.jumpCount = 0;
        runner.isGrounded = true;
      } else {
        runner.isGrounded = false;
      }

      obstacleTimer -= dt;
      beanTimer -= dt;
      adaptogenTimer -= dt;
      springTimer -= dt;

      if (obstacleTimer <= 0) spawnObstacle();
      if (beanTimer <= 0) spawnPickup("bean");
      if (adaptogenTimer <= 0) spawnPickup("adaptogen");
      if (springTimer <= 0) spawnPickup("spring");

      obstacles.forEach((obstacle) => {
        obstacle.x -= speed * dt;
      });
      pickups.forEach((pickup) => {
        pickup.x -= speed * dt;
        pickup.y = pickup.baseY + Math.sin(elapsed * 3 + pickup.phase) * pickup.bob;
      });

      obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -80);
      pickups = pickups.filter((pickup) => pickup.x + pickup.radius > -40);

      const hitbox = {
        x: runner.x + runner.width * 0.16,
        y: runner.y + runner.height * 0.12,
        w: runner.width * 0.68,
        h: runner.height * 0.8,
      };

      for (const obstacle of obstacles) {
        const obstacleRect = {
          x: obstacle.x + obstacle.width * 0.08,
          y: obstacle.y + obstacle.height * 0.08,
          w: obstacle.width * 0.84,
          h: obstacle.height * 0.92,
        };
        if (rectsOverlap(hitbox, obstacleRect)) {
          events.push({ type: "hit-obstacle" });
          break;
        }
      }

      for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const pickup = pickups[i];
        const nearestX = clamp(pickup.x, hitbox.x, hitbox.x + hitbox.w);
        const nearestY = clamp(pickup.y, hitbox.y, hitbox.y + hitbox.h);
        const dx = pickup.x - nearestX;
        const dy = pickup.y - nearestY;
        if (dx * dx + dy * dy < pickup.radius * pickup.radius) {
          pickups.splice(i, 1);
          events.push({
            type: "collect",
            kind: pickup.kind,
            x: pickup.x,
            y: pickup.y,
          });
        }
      }

      return events;
    }

    function getSnapshot() {
      return {
        world: { ...world },
        runner: { ...runner },
        obstacles: obstacles.map((obstacle) => ({ ...obstacle })),
        pickups: pickups.map((pickup) => ({ ...pickup })),
        speed,
        distance,
        elapsed,
      };
    }

    return {
      resize,
      reset,
      jump,
      update,
      getSnapshot,
    };
  };
})();
