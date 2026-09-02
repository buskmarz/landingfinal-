(function () {
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function roundedPath(ctx, x, y, width, height, radius) {
    if (width <= 0 || height <= 0) return false;
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

  function fillRound(ctx, x, y, width, height, radius, fill) {
    if (!roundedPath(ctx, x, y, width, height, radius)) return;
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function strokeRound(ctx, x, y, width, height, radius, stroke, lineWidth = 1) {
    if (!roundedPath(ctx, x, y, width, height, radius)) return;
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
    effects,
    droppyImage,
  }) {
    const font = 'Metropolis, Montserrat, "Arial Black", sans-serif';

    function drawCabinet(world) {
      ctx.fillStyle = "#131011";
      ctx.fillRect(0, 0, world.width, world.height);

      const glow = ctx.createRadialGradient(world.width * 0.5, world.height * 0.34, 10, world.width * 0.5, world.height * 0.34, world.width * 0.72);
      glow.addColorStop(0, "rgba(255,222,0,.16)");
      glow.addColorStop(1, "rgba(255,222,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, world.width, world.height);

      fillRound(ctx, 8, 8, world.width - 16, world.height - 16, 28, "#231f20");
      strokeRound(ctx, 8, 8, world.width - 16, world.height - 16, 28, "#ffde00", 4);

      const playfield = ctx.createLinearGradient(0, world.height * 0.14, 0, world.height);
      playfield.addColorStop(0, "#fff9e9");
      playfield.addColorStop(0.58, "#f5ead1");
      playfield.addColorStop(1, "#e7d8b9");
      fillRound(ctx, 22, world.height * 0.135, world.width - 44, world.height * 0.83, 22, playfield);
      strokeRound(ctx, 22, world.height * 0.135, world.width - 44, world.height * 0.83, 22, "rgba(255,222,0,.88)", 3);

    }

    function drawPlayfieldArt(world, snapshot) {
      ctx.save();
      roundedPath(ctx, 24, world.height * 0.14, world.width - 48, world.height * 0.815, 20);
      ctx.clip();

      ctx.globalAlpha = 0.13;
      ctx.strokeStyle = "#231f20";
      ctx.lineWidth = 1;
      for (let y = world.height * 0.22; y < world.height * 0.92; y += world.height * 0.07) {
        ctx.beginPath();
        ctx.moveTo(world.width * 0.1, y);
        ctx.lineTo(world.width * 0.9, y);
        ctx.stroke();
      }

      if (droppyImage?.complete && droppyImage.naturalWidth) {
        const size = world.width * 0.34;
        const ratio = droppyImage.naturalHeight / droppyImage.naturalWidth;
        ctx.globalAlpha = 0.52;
        ctx.drawImage(droppyImage, world.width * 0.33, world.height * 0.49, size, size * ratio);
      }

      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#ffde00";
      ctx.font = `900 ${world.width * 0.11}px ${font}`;
      ctx.translate(world.width * 0.15, world.height * 0.58);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("FOCUS", 0, 0);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#231f20";
      ctx.font = `900 ${world.width * 0.095}px ${font}`;
      ctx.translate(world.width * 0.83, world.height * 0.57);
      ctx.rotate(Math.PI / 2);
      ctx.fillText("CHILL", 0, 0);
      ctx.restore();
    }

    function drawShooter(world, snapshot) {
      const x = world.width * 0.885;
      ctx.save();
      ctx.strokeStyle = "rgba(35,31,32,.32)";
      ctx.lineWidth = Math.max(2, world.width * 0.008);
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(x, world.height * 0.25);
      ctx.lineTo(x, world.height * 0.87);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let index = 0; index < 3; index += 1) {
        const y = world.height * (0.72 - index * 0.095);
        ctx.fillStyle = index === 0 ? "#ffba00" : "rgba(35,31,32,.3)";
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 7, y + 2);
        ctx.lineTo(x + 7, y + 2);
        ctx.closePath();
        ctx.fill();
      }

      fillRound(ctx, x - world.width * 0.035, world.height * 0.89, world.width * 0.07, world.height * 0.035, 999, snapshot.waitingLaunch ? "#ffde00" : "#231f20");
      ctx.restore();
    }

    function drawTargets(targets) {
      targets.forEach((target) => {
        const width = target.width;
        const height = target.height;
        const lit = !target.active;
        const scale = 1 + (target.pulse || 0) * 0.8;
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.scale(scale, scale);
        ctx.shadowColor = lit ? "rgba(255,222,0,.72)" : "transparent";
        ctx.shadowBlur = lit ? 18 : 0;
        fillRound(ctx, -width / 2, -height / 2, width, height, 8, lit ? "#ffde00" : "#fffdf4");
        strokeRound(ctx, -width / 2, -height / 2, width, height, 8, "#231f20", Math.max(1.5, width * 0.035));
        ctx.fillStyle = "#231f20";
        ctx.font = `900 ${Math.max(12, width * 0.38)}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(target.label, 0, 1);
        ctx.restore();
      });
    }

    function drawBumper(bumper) {
      const pulse = 1 + clamp(bumper.pulse || 0, 0, 0.35) * 0.9;
      ctx.save();
      ctx.translate(bumper.x, bumper.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = bumper.glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = bumper.fill;
      ctx.beginPath();
      ctx.arc(0, 0, bumper.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#231f20";
      ctx.lineWidth = Math.max(3, bumper.r * 0.12);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.88)";
      ctx.lineWidth = Math.max(2, bumper.r * 0.07);
      ctx.beginPath();
      ctx.arc(0, 0, bumper.r * 0.67, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#231f20";
      ctx.font = `900 ${Math.max(14, bumper.r * 0.55)}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bumper.label, 0, 1);
      ctx.font = `800 ${Math.max(7, bumper.r * 0.19)}px ${font}`;
      ctx.fillText(bumper.name.toUpperCase(), 0, bumper.r * 0.43);
      ctx.restore();
    }

    function drawPost(post) {
      ctx.save();
      ctx.shadowColor = "rgba(255,186,0,.5)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#fffdf4";
      ctx.beginPath();
      ctx.arc(post.x, post.y, post.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#231f20";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function drawSlings(world) {
      const items = [
        [[0.16, 0.64], [0.3, 0.78], [0.23, 0.78]],
        [[0.82, 0.64], [0.7, 0.78], [0.77, 0.78]],
      ];
      items.forEach((points) => {
        ctx.fillStyle = "rgba(255,186,0,.28)";
        ctx.strokeStyle = "#ffba00";
        ctx.lineWidth = Math.max(3, world.width * 0.01);
        ctx.beginPath();
        points.forEach(([x, y], index) => {
          if (index === 0) ctx.moveTo(world.width * x, world.height * y);
          else ctx.lineTo(world.width * x, world.height * y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }

    function drawFlipper(flipper) {
      drawSegment(ctx, flipper.segment, flipper.width * 1.45, "#231f20");
      drawSegment(ctx, flipper.segment, flipper.width, "#ffde00");
      drawSegment(ctx, flipper.segment, flipper.width * 0.3, "rgba(255,255,255,.72)");
      ctx.fillStyle = "#231f20";
      ctx.beginPath();
      ctx.arc(flipper.pivot.x, flipper.pivot.y, flipper.width * 0.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffde00";
      ctx.beginPath();
      ctx.arc(flipper.pivot.x, flipper.pivot.y, flipper.width * 0.28, 0, TAU);
      ctx.fill();
    }

    function drawDrain(world) {
      const x = world.width * 0.405;
      const width = world.width * 0.19;
      const gradient = ctx.createLinearGradient(0, world.height * 0.9, 0, world.height);
      gradient.addColorStop(0, "rgba(35,31,32,0)");
      gradient.addColorStop(1, "rgba(35,31,32,.82)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x, world.height * 0.9);
      ctx.lineTo(x + width, world.height * 0.9);
      ctx.lineTo(x + width * 0.82, world.height * 0.96);
      ctx.lineTo(x + width * 0.18, world.height * 0.96);
      ctx.closePath();
      ctx.fill();
    }

    function drawBall(ball, trail) {
      (trail || []).forEach((point, index, points) => {
        const alpha = ((index + 1) / Math.max(1, points.length)) * 0.18;
        ctx.fillStyle = `rgba(255,186,0,${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, ball.r * (0.28 + index / points.length * 0.4), 0, TAU);
        ctx.fill();
      });
      ctx.save();
      ctx.shadowColor = "rgba(255,186,0,.9)";
      ctx.shadowBlur = ball.r * 1.8;
      const metal = ctx.createRadialGradient(ball.x - ball.r * 0.35, ball.y - ball.r * 0.4, 1, ball.x, ball.y, ball.r);
      metal.addColorStop(0, "#ffffff");
      metal.addColorStop(0.42, "#f5ead1");
      metal.addColorStop(1, "#ffba00");
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#231f20";
      ctx.lineWidth = Math.max(2, ball.r * 0.18);
      ctx.stroke();
      ctx.restore();
    }

    function drawStatus(world, snapshot) {
      if (snapshot.ballSaveTime > 0) {
        const seconds = Math.ceil(snapshot.ballSaveTime);
        fillRound(ctx, world.width * 0.31, world.height * 0.91, world.width * 0.38, 28, 999, "#231f20");
        ctx.fillStyle = "#ffde00";
        ctx.font = `900 ${Math.max(10, world.width * 0.024)}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`BOLA PROTEGIDA · ${seconds}s`, world.width * 0.5, world.height * 0.91 + 15);
      }

      if (snapshot.combo > 1 && snapshot.comboTimer > 0) {
        fillRound(ctx, world.width * 0.37, world.height * 0.56, world.width * 0.26, 34, 999, "#ffde00");
        strokeRound(ctx, world.width * 0.37, world.height * 0.56, world.width * 0.26, 34, 999, "#231f20", 2);
        ctx.fillStyle = "#231f20";
        ctx.font = `900 ${Math.max(12, world.width * 0.03)}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`COMBO ×${snapshot.combo}`, world.width * 0.5, world.height * 0.56 + 18);
      }

      (snapshot.popups || []).forEach((popup) => {
        const progress = clamp(popup.ttl / popup.maxTtl, 0, 1);
        ctx.save();
        ctx.globalAlpha = Math.min(1, progress * 1.8);
        ctx.fillStyle = "#231f20";
        ctx.font = `900 ${Math.max(10, world.width * 0.023)}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(popup.text, popup.x, popup.y);
        ctx.restore();
      });
    }

    function drawTable(world, snapshot) {
      drawCabinet(world);
      drawPlayfieldArt(world, snapshot);
      drawShooter(world, snapshot);
      drawDrain(world);

      snapshot.walls.forEach((segment) => {
        const isRail = segment.kind === "wall" || segment.kind === "lane";
        drawSegment(ctx, segment, segment.width * (isRail ? 1.55 : 1.15), isRail ? "rgba(255,255,255,.85)" : segment.color);
        drawSegment(ctx, segment, segment.width, segment.color);
      });
      drawSlings(world);
      drawTargets(snapshot.targets);
      snapshot.bumpers.forEach(drawBumper);
      snapshot.posts.forEach(drawPost);
      snapshot.flippers.forEach(drawFlipper);
      drawBall(snapshot.ball, snapshot.trail);
      drawStatus(world, snapshot);
    }

    function draw(world, snapshot) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const amount = snapshot.shake || 0;
      const shakeX = amount ? Math.sin(snapshot.visualTime * 91) * amount : 0;
      const shakeY = amount ? Math.cos(snapshot.visualTime * 73) * amount * 0.55 : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      drawTable(world, snapshot);
      ctx.restore();
    }

    return { draw };
  };
})();
