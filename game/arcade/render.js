(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function roundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawLeaf(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.28, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(35,31,32,${alpha * 0.26})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, 0);
    ctx.quadraticCurveTo(0, -size * 0.08, size * 0.2, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawSun(ctx, x, y, size, alpha) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
    ctx.lineWidth = Math.max(1, size * 0.06);
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size * 0.34, y + Math.sin(angle) * size * 0.34);
      ctx.lineTo(x + Math.cos(angle) * size * 0.54, y + Math.sin(angle) * size * 0.54);
      ctx.stroke();
    }
  }

  function drawPetal(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI / 2) * i);
      ctx.beginPath();
      ctx.ellipse(0, size * 0.22, size * 0.16, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = `rgba(255, 232, 166, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBerry(ctx, x, y, size, alpha) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - size * 0.18, y + size * 0.12, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size * 0.18, y + size * 0.12, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCap(ctx, x, y, size, alpha) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.04, size * 0.3, size * 0.18, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - size * 0.07, y + size * 0.02, size * 0.14, size * 0.24);
  }

  function drawSpark(ctx, x, y, size, alpha) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.28, y);
    ctx.lineTo(x + size * 0.28, y);
    ctx.moveTo(x, y - size * 0.28);
    ctx.lineTo(x, y + size * 0.28);
    ctx.stroke();
  }

  function drawWave(ctx, x, y, size, alpha) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.28, y + size * 0.04);
    ctx.bezierCurveTo(
      x - size * 0.12,
      y - size * 0.16,
      x + size * 0.02,
      y + size * 0.22,
      x + size * 0.22,
      y
    );
    ctx.stroke();
  }

  function drawIcon(ctx, icon, x, y, size, alpha) {
    switch (icon) {
      case "leaf":
        drawLeaf(ctx, x, y, size, alpha);
        break;
      case "sun":
        drawSun(ctx, x, y, size, alpha);
        break;
      case "petal":
        drawPetal(ctx, x, y, size, alpha);
        break;
      case "berry":
        drawBerry(ctx, x, y, size, alpha);
        break;
      case "cap":
        drawCap(ctx, x, y, size, alpha);
        break;
      case "spark":
        drawSpark(ctx, x, y, size, alpha);
        break;
      default:
        drawWave(ctx, x, y, size, alpha);
        break;
    }
  }

  window.createDroppyArcadeRenderer = function createDroppyArcadeRenderer({
    ctx,
    canvas,
    background,
    effects,
    droppyImage,
  }) {
    function computeLayout(world) {
      const padding = clamp(world.width * 0.05, 18, 28);
      const sideWidth = clamp(world.width * 0.27, 102, 144);
      const boardHeight = world.height - padding * 2 - 70;
      const boardWidth = world.width - sideWidth - padding * 3;
      const cell = Math.floor(Math.min(boardWidth / 10, boardHeight / 20));
      const boardW = cell * 10;
      const boardH = cell * 20;
      const boardX = padding;
      const boardY = Math.round((world.height - boardH) * 0.5 + 14);
      const sideX = boardX + boardW + padding;
      const sideY = boardY;
      return {
        padding,
        cell,
        boardX,
        boardY,
        boardW,
        boardH,
        sideX,
        sideY,
        sideW: sideWidth,
      };
    }

    function drawPanel(layout) {
      fillRoundedRect(
        ctx,
        layout.boardX - 12,
        layout.boardY - 18,
        layout.boardW + 24,
        layout.boardH + 36,
        26,
        "rgba(255,255,255,0.18)"
      );
      strokeRoundedRect(
        ctx,
        layout.boardX - 12,
        layout.boardY - 18,
        layout.boardW + 24,
        layout.boardH + 36,
        26,
        "rgba(255,255,255,0.32)",
        1
      );
      fillRoundedRect(
        ctx,
        layout.boardX,
        layout.boardY,
        layout.boardW,
        layout.boardH,
        22,
        "rgba(32, 29, 35, 0.42)"
      );
      strokeRoundedRect(
        ctx,
        layout.boardX,
        layout.boardY,
        layout.boardW,
        layout.boardH,
        22,
        "rgba(255,255,255,0.14)",
        1
      );
    }

    function drawSideCard(layout, snapshot) {
      const sideH = layout.boardH;
      fillRoundedRect(
        ctx,
        layout.sideX,
        layout.sideY,
        layout.sideW,
        sideH,
        24,
        "rgba(255,255,255,0.72)"
      );
      strokeRoundedRect(
        ctx,
        layout.sideX,
        layout.sideY,
        layout.sideW,
        sideH,
        24,
        "rgba(255,255,255,0.92)",
        1
      );

      ctx.fillStyle = "rgba(35,31,32,0.56)";
      ctx.font = "700 11px Metropolis, Montserrat, sans-serif";
      ctx.textTransform = "uppercase";
      ctx.fillText("Next Blend", layout.sideX + 16, layout.sideY + 28);

      fillRoundedRect(
        ctx,
        layout.sideX + 14,
        layout.sideY + 38,
        layout.sideW - 28,
        108,
        18,
        "rgba(255,255,255,0.8)"
      );
      strokeRoundedRect(
        ctx,
        layout.sideX + 14,
        layout.sideY + 38,
        layout.sideW - 28,
        108,
        18,
        "rgba(35,31,32,0.08)",
        1
      );

      if (snapshot.next) {
        const previewCell = Math.min(22, Math.floor((layout.sideW - 58) / 4));
        const cells = snapshot.next.cells;
        const maxX = Math.max(...cells.map((cell) => cell.x));
        const maxY = Math.max(...cells.map((cell) => cell.y));
        const offsetX =
          layout.sideX + 24 + Math.round(((layout.sideW - 48) - (maxX + 1) * previewCell) * 0.5);
        const offsetY =
          layout.sideY + 56 + Math.round((80 - (maxY + 1) * previewCell) * 0.5);
        cells.forEach((cell) => {
          drawCell(
            offsetX + cell.x * previewCell,
            offsetY + cell.y * previewCell,
            previewCell,
            snapshot.next.theme,
            false,
            false
          );
        });
      }

      if (droppyImage && droppyImage.complete) {
        ctx.save();
        ctx.globalAlpha = 0.92;
        const mascotWidth = layout.sideW - 34;
        const mascotHeight = mascotWidth * 1.12;
        ctx.drawImage(
          droppyImage,
          layout.sideX + 17,
          layout.sideY + 164,
          mascotWidth,
          mascotHeight
        );
        ctx.restore();
      }

      fillRoundedRect(
        ctx,
        layout.sideX + 14,
        layout.sideY + layout.boardH - 112,
        layout.sideW - 28,
        96,
        18,
        "rgba(245,255,221,0.92)"
      );
      ctx.fillStyle = "rgba(35,31,32,0.7)";
      ctx.font = "700 11px Metropolis, Montserrat, sans-serif";
      ctx.fillText("Flow", layout.sideX + 26, layout.sideY + layout.boardH - 86);
      ctx.font = "800 24px Metropolis, Montserrat, sans-serif";
      ctx.fillStyle = "#587f36";
      ctx.fillText(snapshot.flowLabel, layout.sideX + 26, layout.sideY + layout.boardH - 54);
      ctx.font = "600 12px Metropolis, Montserrat, sans-serif";
      ctx.fillStyle = "rgba(35,31,32,0.66)";
      ctx.fillText(snapshot.nextLabel, layout.sideX + 26, layout.sideY + layout.boardH - 26);
    }

    function drawGrid(layout) {
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, layout.boardX, layout.boardY, layout.boardW, layout.boardH, 22);
      ctx.clip();
      for (let y = 0; y <= 20; y += 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(layout.boardX, layout.boardY + y * layout.cell);
        ctx.lineTo(layout.boardX + layout.boardW, layout.boardY + y * layout.cell);
        ctx.stroke();
      }
      for (let x = 0; x <= 10; x += 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(layout.boardX + x * layout.cell, layout.boardY);
        ctx.lineTo(layout.boardX + x * layout.cell, layout.boardY + layout.boardH);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCell(x, y, size, theme, locked, ghost) {
      if (ghost) {
        fillRoundedRect(ctx, x + 1, y + 1, size - 2, size - 2, Math.max(6, size * 0.2), "rgba(255,255,255,0.1)");
        strokeRoundedRect(ctx, x + 1, y + 1, size - 2, size - 2, Math.max(6, size * 0.2), theme.edge, 1);
        return;
      }

      const glow = ctx.createRadialGradient(
        x + size * 0.45,
        y + size * 0.4,
        2,
        x + size * 0.5,
        y + size * 0.5,
        size
      );
      glow.addColorStop(0, theme.edge);
      glow.addColorStop(1, theme.fill);
      fillRoundedRect(ctx, x + 1, y + 1, size - 2, size - 2, Math.max(6, size * 0.22), glow);
      strokeRoundedRect(
        ctx,
        x + 1,
        y + 1,
        size - 2,
        size - 2,
        Math.max(6, size * 0.22),
        locked ? "rgba(35,31,32,0.16)" : "rgba(255,255,255,0.55)",
        1
      );
      ctx.fillStyle = locked ? "rgba(255,255,255,0.08)" : theme.glow;
      ctx.beginPath();
      ctx.arc(x + size * 0.35, y + size * 0.35, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, theme.icon, x + size * 0.5, y + size * 0.54, size, locked ? 0.5 : 0.78);
    }

    function drawBoardCells(layout, snapshot) {
      snapshot.board.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (!cell) return;
          drawCell(
            layout.boardX + x * layout.cell,
            layout.boardY + y * layout.cell,
            layout.cell,
            cell.theme,
            true,
            false
          );
        });
      });
    }

    function drawPiece(layout, piece, ghost = false) {
      if (!piece) return;
      piece.cells.forEach((cell) => {
        if (cell.y < 0) return;
        drawCell(
          layout.boardX + cell.x * layout.cell,
          layout.boardY + cell.y * layout.cell,
          layout.cell,
          piece.theme,
          false,
          ghost
        );
      });
    }

    function drawTopBar(world, snapshot) {
      fillRoundedRect(
        ctx,
        world.width * 0.08,
        18,
        world.width * 0.48,
        40,
        18,
        "rgba(255,255,255,0.18)"
      );
      ctx.fillStyle = "rgba(35,31,32,0.88)";
      ctx.font = "700 14px Metropolis, Montserrat, sans-serif";
      ctx.fillText("Droppy Stacks", world.width * 0.12, 44);
      ctx.fillStyle = "rgba(35,31,32,0.62)";
      ctx.font = "600 11px Metropolis, Montserrat, sans-serif";
      ctx.fillText(snapshot.modeLabel, world.width * 0.12, 59);
    }

    function draw(ctxWorld, snapshot) {
      const world = {
        width: canvas.clientWidth || canvas.width,
        height: canvas.clientHeight || canvas.height,
        groundY: (canvas.clientHeight || canvas.height) * 0.9,
      };
      background.draw(ctx, world, {
        environmentProgress: snapshot.environmentProgress,
        flowIntensity: snapshot.flowIntensity,
      });
      effects.drawLayer(ctx, "back");

      const layout = computeLayout(world);
      drawTopBar(world, snapshot);
      drawPanel(layout);
      drawGrid(layout);
      drawBoardCells(layout, snapshot);
      drawPiece(layout, snapshot.ghost, true);
      drawPiece(layout, snapshot.active, false);

      if (snapshot.flashRows.length) {
        snapshot.flashRows.forEach((row) => {
          fillRoundedRect(
            ctx,
            layout.boardX + 6,
            layout.boardY + row * layout.cell + 4,
            layout.boardW - 12,
            layout.cell - 8,
            12,
            "rgba(255,255,255,0.12)"
          );
        });
      }

      drawSideCard(layout, snapshot);
      effects.drawLayer(ctx, "front");
      return layout;
    }

    return {
      computeLayout,
      draw,
    };
  };
})();
