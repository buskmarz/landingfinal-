(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  window.createDroppyEffectsSystem = function createDroppyEffectsSystem({ random }) {
    const rand = typeof random === "function" ? random : Math.random;
    const particles = [];
    const pulses = [];
    let trailCooldown = 0;

    function randomBetween(min, max) {
      return min + (max - min) * rand();
    }

    function reset() {
      particles.length = 0;
      pulses.length = 0;
      trailCooldown = 0;
    }

    function emitParticle(config) {
      if (particles.length > 220) {
        particles.shift();
      }
      particles.push(config);
    }

    function spawnCollectBurst(x, y, kind, combo, flowBoost) {
      const baseCount = kind === "spring" ? 16 : kind === "adaptogen" ? 12 : 8;
      const tint = kind === "spring"
        ? ["#ffffff", "#ffe68f", "#f7ffce"]
        : kind === "adaptogen"
          ? ["#f8ffe1", "#d7ffbf", "#f7d785"]
          : ["#fff7d4", "#ffd59d", "#ffffff"];
      for (let i = 0; i < baseCount; i += 1) {
        const angle = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(28, 96) + combo * 4 + flowBoost * 26;
        emitParticle({
          type: "spark",
          layer: i % 2 === 0 ? "front" : "back",
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.75,
          size: randomBetween(2, kind === "spring" ? 4.6 : 3.5),
          life: randomBetween(0.32, 0.6),
          age: 0,
          color: tint[i % tint.length],
        });
      }
      pulses.push({
        x,
        y,
        radius: 12,
        growth: kind === "spring" ? 82 : kind === "adaptogen" ? 68 : 54,
        life: kind === "spring" ? 0.55 : 0.42,
        age: 0,
        color: kind === "spring" ? "#f8ffb6" : kind === "adaptogen" ? "#e5ffd1" : "#ffe7b8",
      });
    }

    function spawnLandingDust(x, y, intensity) {
      for (let i = 0; i < 6; i += 1) {
        emitParticle({
          type: "dust",
          layer: "back",
          x: x + randomBetween(-14, 14),
          y: y + randomBetween(-5, 2),
          vx: randomBetween(-24, 24),
          vy: randomBetween(-32, -6) - intensity * 6,
          size: randomBetween(7, 13),
          life: randomBetween(0.34, 0.62),
          age: 0,
          color: "#d7c89a",
        });
      }
    }

    function maybeSpawnFlowTrail(runner, flowIntensity, dt) {
      if (!runner || flowIntensity <= 0.08) return;
      trailCooldown -= dt;
      if (trailCooldown > 0) return;
      trailCooldown = Math.max(0.04, 0.1 - flowIntensity * 0.05);
      emitParticle({
        type: "trail",
        layer: "front",
        x: runner.x + runner.width * randomBetween(0.2, 0.85),
        y: runner.y + runner.height * randomBetween(0.2, 0.85),
        vx: randomBetween(-18, -4),
        vy: randomBetween(-8, 8),
        size: randomBetween(6, 12) + flowIntensity * 6,
        life: randomBetween(0.28, 0.44),
        age: 0,
        color: rand() > 0.5 ? "#fbffd5" : "#fff0b3",
      });
    }

    function update(dt, state) {
      maybeSpawnFlowTrail(state?.runner, state?.flowIntensity || 0, dt);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.age += dt;
        if (particle.age >= particle.life) {
          particles.splice(i, 1);
          continue;
        }
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        if (particle.type === "dust") {
          particle.vy += 44 * dt;
        }
      }

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.age += dt;
        if (pulse.age >= pulse.life) {
          pulses.splice(i, 1);
          continue;
        }
        pulse.radius += pulse.growth * dt;
      }
    }

    function drawLayer(ctx, layer) {
      particles.forEach((particle) => {
        if (particle.layer !== layer) return;
        const progress = 1 - particle.age / particle.life;
        ctx.save();
        if (particle.type === "spark") {
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = clamp(progress * 0.95, 0, 1);
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * progress, 0, Math.PI * 2);
          ctx.fill();
        } else if (particle.type === "dust") {
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = progress * 0.24;
          ctx.beginPath();
          ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.44, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (particle.type === "trail") {
          const grad = ctx.createRadialGradient(
            particle.x,
            particle.y,
            1,
            particle.x,
            particle.y,
            particle.size
          );
          grad.addColorStop(0, particle.color);
          grad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = grad;
          ctx.globalAlpha = progress * 0.72;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (layer !== "front") return;
      pulses.forEach((pulse) => {
        const progress = 1 - pulse.age / pulse.life;
        ctx.save();
        ctx.strokeStyle = pulse.color;
        ctx.globalAlpha = progress * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }

    return {
      reset,
      spawnCollectBurst,
      spawnLandingDust,
      update,
      drawLayer,
    };
  };
})();
