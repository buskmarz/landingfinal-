(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const value = normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;
    const int = Number.parseInt(value, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }

  function mixColor(a, b, t, alpha = 1) {
    const start = hexToRgb(a);
    const end = hexToRgb(b);
    const r = Math.round(lerp(start.r, end.r, t));
    const g = Math.round(lerp(start.g, end.g, t));
    const bValue = Math.round(lerp(start.b, end.b, t));
    return `rgba(${r}, ${g}, ${bValue}, ${alpha})`;
  }

  window.createDroppyBackgroundSystem = function createDroppyBackgroundSystem({ random }) {
    const rand = typeof random === "function" ? random : Math.random;
    const clouds = [];
    const leaves = [];
    const motes = [];
    const flowers = [];

    const palettes = {
      morning: {
        skyTop: "#dff9e7",
        skyMid: "#f6f8d1",
        skyBottom: "#fff2dc",
        meadowA: "#b7e3a0",
        meadowB: "#85c881",
        hillA: "#8dc7a0",
        hillB: "#6fa78f",
        glow: "#fff4b4",
        haze: "#fef5dc",
      },
      afternoon: {
        skyTop: "#ccefd6",
        skyMid: "#f7e2a6",
        skyBottom: "#ffd7b8",
        meadowA: "#9ad398",
        meadowB: "#71b97c",
        hillA: "#7db197",
        hillB: "#5f937e",
        glow: "#ffd890",
        haze: "#ffe5c4",
      },
    };

    let wind = 0;
    let time = 0;

    function randomBetween(min, max) {
      return min + (max - min) * rand();
    }

    function reseedDecor(world) {
      clouds.length = 0;
      leaves.length = 0;
      motes.length = 0;
      flowers.length = 0;

      const cloudCount = Math.max(4, Math.round(world.width / 120));
      const leafCount = Math.max(10, Math.round(world.width / 34));
      const moteCount = Math.max(20, Math.round(world.width / 18));
      const flowerCount = Math.max(12, Math.round(world.width / 24));

      for (let i = 0; i < cloudCount; i += 1) {
        clouds.push({
          x: randomBetween(0, world.width),
          y: randomBetween(world.height * 0.08, world.height * 0.34),
          scale: randomBetween(0.58, 1.18),
          speed: randomBetween(4, 12),
        });
      }

      for (let i = 0; i < leafCount; i += 1) {
        leaves.push({
          x: randomBetween(0, world.width),
          y: randomBetween(world.height * 0.1, world.height * 0.78),
          width: randomBetween(10, 18),
          height: randomBetween(5, 9),
          driftX: randomBetween(12, 26),
          driftY: randomBetween(8, 22),
          rotation: randomBetween(0, Math.PI * 2),
          spin: randomBetween(-1.2, 1.2),
          sway: randomBetween(0.4, 1.1),
          tint: rand() > 0.5 ? "#99cf87" : "#d8ee95",
        });
      }

      for (let i = 0; i < moteCount; i += 1) {
        motes.push({
          x: randomBetween(0, world.width),
          y: randomBetween(0, world.height),
          r: randomBetween(1, 2.8),
          speed: randomBetween(6, 18),
          alpha: randomBetween(0.12, 0.38),
          phase: randomBetween(0, Math.PI * 2),
        });
      }

      for (let i = 0; i < flowerCount; i += 1) {
        flowers.push({
          x: ((i + rand() * 0.6) / flowerCount) * world.width,
          stem: randomBetween(10, 24),
          bloom: randomBetween(3, 6.5),
          tilt: randomBetween(-0.18, 0.18),
          hue: rand() > 0.4 ? "#fff6c7" : "#fff1e1",
        });
      }
    }

    function resize(world) {
      reseedDecor(world);
    }

    function reset(world) {
      time = 0;
      wind = 0;
      reseedDecor(world);
    }

    function respawnLeaf(leaf, world, fromRight) {
      leaf.x = fromRight ? world.width + randomBetween(12, 60) : randomBetween(0, world.width);
      leaf.y = randomBetween(world.height * 0.1, world.height * 0.72);
      leaf.rotation = randomBetween(0, Math.PI * 2);
      leaf.spin = randomBetween(-1.1, 1.1);
      leaf.sway = randomBetween(0.4, 1.1);
    }

    function update(dt, snapshot, world) {
      time += dt;
      const flowIntensity = snapshot?.flowIntensity || 0;
      const speed = snapshot?.speed || 0;
      wind = lerp(wind, 0.45 + flowIntensity * 0.55 + clamp(speed / 700, 0, 0.45), 0.04);

      clouds.forEach((cloud) => {
        cloud.x -= (cloud.speed + speed * 0.02) * dt;
        if (cloud.x < -80) {
          cloud.x = world.width + randomBetween(30, 100);
          cloud.y = randomBetween(world.height * 0.08, world.height * 0.34);
        }
      });

      leaves.forEach((leaf) => {
        leaf.x -= (leaf.driftX + wind * 14) * dt;
        leaf.y += Math.sin(time * leaf.sway + leaf.x * 0.01) * leaf.driftY * dt * 0.4;
        leaf.rotation += leaf.spin * dt;
        if (leaf.x < -40 || leaf.y > world.height + 24) {
          respawnLeaf(leaf, world, true);
        }
      });

      motes.forEach((mote) => {
        mote.x -= (mote.speed + speed * 0.015) * dt;
        mote.y += Math.sin(time * 0.6 + mote.phase) * dt * 4;
        if (mote.x < -8) {
          mote.x = world.width + randomBetween(2, 20);
          mote.y = randomBetween(0, world.height);
        }
      });
    }

    function drawSky(ctx, world, progress) {
      const sky = ctx.createLinearGradient(0, 0, 0, world.height);
      sky.addColorStop(0, mixColor(palettes.morning.skyTop, palettes.afternoon.skyTop, progress));
      sky.addColorStop(0.54, mixColor(palettes.morning.skyMid, palettes.afternoon.skyMid, progress));
      sky.addColorStop(1, mixColor(palettes.morning.skyBottom, palettes.afternoon.skyBottom, progress));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, world.width, world.height);

      ctx.fillStyle = mixColor("#fcffe5", "#ffe2b5", progress, 0.28);
      ctx.fillRect(0, world.height * 0.52, world.width, world.height * 0.3);
    }

    function drawSun(ctx, world, progress) {
      const x = lerp(world.width * 0.78, world.width * 0.72, progress);
      const y = lerp(world.height * 0.16, world.height * 0.22, progress);
      const radius = lerp(world.width * 0.11, world.width * 0.09, progress);
      const glow = ctx.createRadialGradient(x, y, radius * 0.16, x, y, radius * 2.8);
      glow.addColorStop(0, mixColor(palettes.morning.glow, palettes.afternoon.glow, progress, 0.88));
      glow.addColorStop(0.55, mixColor("#fff2ad", "#ffd499", progress, 0.36));
      glow.addColorStop(1, "rgba(255, 237, 170, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 0.08) * 0.06);
      ctx.fillStyle = mixColor("#fff9d5", "#ffe0af", progress, 0.14);
      const rayLength = world.height * 0.42;
      const rayWidth = world.width * 0.08;
      for (let i = 0; i < 7; i += 1) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 7);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-rayWidth * 0.36, rayLength);
        ctx.lineTo(rayWidth * 0.36, rayLength);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawClouds(ctx) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
      clouds.forEach((cloud) => {
        const size = 22 * cloud.scale;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, size, 0, Math.PI * 2);
        ctx.arc(cloud.x + size * 0.9, cloud.y + size * 0.16, size * 0.82, 0, Math.PI * 2);
        ctx.arc(cloud.x + size * 1.6, cloud.y, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawMotes(ctx) {
      motes.forEach((mote) => {
        const alpha = mote.alpha + Math.sin(time * 1.6 + mote.phase) * 0.08;
        ctx.fillStyle = `rgba(255,255,255,${clamp(alpha, 0.08, 0.45)})`;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawHills(ctx, world, progress) {
      const baseY = world.height * 0.7;
      const far = ctx.createLinearGradient(0, baseY - 50, 0, baseY + 40);
      far.addColorStop(0, mixColor(palettes.morning.hillA, palettes.afternoon.hillA, progress));
      far.addColorStop(1, mixColor(palettes.morning.hillB, palettes.afternoon.hillB, progress));
      ctx.fillStyle = far;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= world.width + 50; x += 50) {
        const wave = Math.sin(x * 0.012 + time * 0.1) * 16;
        ctx.quadraticCurveTo(x + 26, baseY - 42 + wave, x + 50, baseY + wave * 0.2);
      }
      ctx.lineTo(world.width, world.height);
      ctx.lineTo(0, world.height);
      ctx.closePath();
      ctx.fill();

      const meadowTop = world.height * 0.78;
      const meadow = ctx.createLinearGradient(0, meadowTop, 0, world.height);
      meadow.addColorStop(0, mixColor(palettes.morning.meadowA, palettes.afternoon.meadowA, progress));
      meadow.addColorStop(1, mixColor(palettes.morning.meadowB, palettes.afternoon.meadowB, progress));
      ctx.fillStyle = meadow;
      ctx.fillRect(0, meadowTop, world.width, world.height - meadowTop);

      const haze = ctx.createLinearGradient(0, world.height * 0.45, 0, world.height * 0.78);
      haze.addColorStop(0, "rgba(255,255,255,0)");
      haze.addColorStop(1, mixColor(palettes.morning.haze, palettes.afternoon.haze, progress, 0.4));
      ctx.fillStyle = haze;
      ctx.fillRect(0, world.height * 0.45, world.width, world.height * 0.33);
    }

    function drawFlowers(ctx, world, progress) {
      const groundY = world.groundY;
      flowers.forEach((flower, index) => {
        const x = flower.x;
        const sway = Math.sin(time * 1.8 + index * 0.6) * 2.4;
        const stemHeight = flower.stem;
        ctx.strokeStyle = mixColor("#6fa360", "#7cad5f", progress, 0.9);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.quadraticCurveTo(x + flower.tilt * 18, groundY - stemHeight * 0.46, x + sway, groundY - stemHeight);
        ctx.stroke();

        const blossomX = x + sway;
        const blossomY = groundY - stemHeight;
        ctx.fillStyle = flower.hue;
        for (let petal = 0; petal < 5; petal += 1) {
          const angle = (Math.PI * 2 * petal) / 5 + time * 0.08;
          ctx.beginPath();
          ctx.ellipse(
            blossomX + Math.cos(angle) * flower.bloom * 0.8,
            blossomY + Math.sin(angle) * flower.bloom * 0.8,
            flower.bloom * 0.9,
            flower.bloom * 0.56,
            angle,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = mixColor("#f6da7a", "#ffcd7d", progress, 0.95);
        ctx.beginPath();
        ctx.arc(blossomX, blossomY, flower.bloom * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawLeaves(ctx) {
      leaves.forEach((leaf) => {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        ctx.fillStyle = leaf.tint;
        ctx.beginPath();
        ctx.ellipse(0, 0, leaf.width, leaf.height, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-leaf.width * 0.46, 0);
        ctx.quadraticCurveTo(0, -leaf.height * 0.12, leaf.width * 0.46, 0);
        ctx.stroke();
        ctx.restore();
      });
    }

    function draw(ctx, world, snapshot) {
      const progress = clamp(snapshot?.environmentProgress || 0, 0, 1);
      drawSky(ctx, world, progress);
      drawSun(ctx, world, progress);
      drawMotes(ctx);
      drawClouds(ctx);
      drawHills(ctx, world, progress);
      drawLeaves(ctx);
      drawFlowers(ctx, world, progress);
    }

    return {
      resize,
      reset,
      update,
      draw,
    };
  };
})();
