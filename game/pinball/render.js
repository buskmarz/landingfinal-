(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function roundRect(ctx, x, y, width, height, radius) {
    if (width <= 0 || height <= 0) {
      return false;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
    return true;
  }

  function fillRoundRect(ctx, x, y, width, height, radius, fill) {
    if (!roundRect(ctx, x, y, width, height, radius)) return;
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function strokeRoundRect(ctx, x, y, width, height, radius, stroke, lineWidth = 1) {
    if (!roundRect(ctx, x, y, width, height, radius)) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawSegment(ctx, segment, width, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(segment.a.x, segment.a.y);
    ctx.lineTo(segment.b.x, segment.b.y);
    ctx.stroke();
    ctx.restore();
  }

  window.createDroppyPinballRenderer = function createDroppyPinballRenderer({
    ctx,
    canvas,
    background,
    effects,
    droppyImage,
  }) {
    function drawBall(ball) {
      const glow = ctx.createRadialGradient(ball.x, ball.y, 3, ball.x, ball.y, ball.r * 3);
      glow.addColorStop(0, "rgba(255,255,255,0.96)");
      glow.addColorStop(0.45, "rgba(255, 246, 196, 0.9)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * 3, 0, Math.PI * 2);
      ctx.fill();

      const fill = ctx.createRadialGradient(
        ball.x - ball.r * 0.3,
        ball.y - ball.r * 0.4,
        1,
        ball.x,
        ball.y,
        ball.r
      );
      fill.addColorStop(0, "#fffef2");
      fill.addColorStop(0.5, "#ffe8a9");
      fill.addColorStop(1, "#ffba00");
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(35, 31, 32, 0.22)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    function drawBumper(bumper, scorePulse) {
      const pulse = 1 + scorePulse * 0.16;
      const outer = ctx.createRadialGradient(bumper.x, bumper.y, bumper.r * 0.2, bumper.x, bumper.y, bumper.r * 1.7);
      outer.addColorStop(0, `${bumper.glow}`);
      outer.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.r * 1.7 * pulse, 0, Math.PI * 2);
      ctx.fill();

      const ring = ctx.createLinearGradient(bumper.x - bumper.r, bumper.y - bumper.r, bumper.x + bumper.r, bumper.y + bumper.r);
      ring.addColorStop(0, bumper.fill);
      ring.addColorStop(1, "#fff6d1");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.r * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.r * 0.76 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(35,31,32,0.68)";
      ctx.font = `700 ${Math.max(12, bumper.r * 0.44)}px Montserrat, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bumper.label, bumper.x, bumper.y + 1);
    }

    function drawFlipper(flipper) {
      drawSegment(ctx, flipper.segment, flipper.width * 1.3, "rgba(255,255,255,0.22)", 1);
      drawSegment(ctx, flipper.segment, flipper.width, flipper.fill, 1);
      drawSegment(ctx, flipper.segment, flipper.width * 0.54, "#fff7d9", 0.78);
      ctx.fillStyle = "#231f20";
      ctx.beginPath();
      ctx.arc(flipper.pivot.x, flipper.pivot.y, flipper.width * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffde00";
      ctx.beginPath();
      ctx.arc(flipper.pivot.x, flipper.pivot.y, flipper.width * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawTargets(targets) {
      targets.forEach((target) => {
        const alpha = target.active ? 0.92 : 0.36;
        fillRoundRect(
          ctx,
          target.x - target.width / 2,
          target.y - target.height / 2,
          target.width,
          target.height,
          target.width * 0.48,
          target.active ? "rgba(255, 250, 231, 0.98)" : "rgba(255,255,255,0.32)"
        );
        strokeRoundRect(
          ctx,
          target.x - target.width / 2,
          target.y - target.height / 2,
          target.width,
          target.height,
          target.width * 0.48,
          `rgba(255,255,255,${alpha})`,
          1
        );
        ctx.fillStyle = `rgba(35,31,32,${target.active ? 0.72 : 0.4})`;
        ctx.font = `700 ${Math.max(10, target.width * 0.3)}px Montserrat, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(target.label, target.x, target.y + 1);
      });
    }

    function drawTable(world, snapshot) {
      fillRoundRect(ctx, 14, 14, world.width - 28, world.height - 28, 28, "rgba(255,255,255,0.18)");
      strokeRoundRect(ctx, 14, 14, world.width - 28, world.height - 28, 28, "rgba(255,255,255,0.42)", 1);

      const board = ctx.createLinearGradient(0, 0, 0, world.height);
      board.addColorStop(0, "rgba(24, 30, 34, 0.74)");
      board.addColorStop(0.38, "rgba(42, 52, 40, 0.72)");
      board.addColorStop(1, "rgba(28, 24, 18, 0.86)");
      fillRoundRect(ctx, 28, 28, world.width - 56, world.height - 56, 24, board);

      ctx.save();
      ctx.globalAlpha = 0.18;
      const beam = ctx.createLinearGradient(world.width * 0.15, 0, world.width * 0.75, world.height);
      beam.addColorStop(0, "rgba(255,255,255,0.7)");
      beam.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(world.width * 0.2, 32);
      ctx.lineTo(world.width * 0.42, 32);
      ctx.lineTo(world.width * 0.78, world.height - 36);
      ctx.lineTo(world.width * 0.56, world.height - 36);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (droppyImage && droppyImage.complete) {
        const size = world.width * 0.18;
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.drawImage(droppyImage, world.width * 0.41, world.height * 0.12, size, size * 1.2);
        ctx.restore();
      }

      snapshot.walls.forEach((segment) => drawSegment(ctx, segment, segment.width, segment.color, 0.95));
      drawTargets(snapshot.targets);
      snapshot.bumpers.forEach((bumper) => drawBumper(bumper, snapshot.bumpPulse));
      snapshot.flippers.forEach(drawFlipper);
      drawBall(snapshot.ball);
    }

    function draw(world, snapshot) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      background.draw(ctx, world, snapshot.environmentProgress);
      drawTable(world, snapshot);

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "700 12px Montserrat, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(snapshot.modeLabel, 40, world.height - 34);
      ctx.textAlign = "right";
      ctx.fillText(snapshot.controlsLabel, world.width - 40, world.height - 34);
      ctx.restore();

      effects.drawLayer(ctx, "back");
      effects.drawLayer(ctx, "front");

      if (snapshot.waitingLaunch) {
        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `700 ${Math.max(16, world.width * 0.038)}px Montserrat, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("Launch", world.width * 0.82, world.height * 0.78);
        ctx.restore();
      }
    }

    return { draw };
  };
})();
