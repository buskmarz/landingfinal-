(function () {
  const COLS = 10;
  const ROWS = 20;

  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  };

  const THEMES = {
    I: {
      name: "Cold Brew",
      fill: "#92d5df",
      edge: "#dffcff",
      glow: "rgba(146, 213, 223, 0.42)",
      icon: "wave",
    },
    O: {
      name: "Golden Milk",
      fill: "#ffd667",
      edge: "#fff4c4",
      glow: "rgba(255, 214, 103, 0.38)",
      icon: "sun",
    },
    T: {
      name: "Lavender",
      fill: "#d8b6ff",
      edge: "#f4e8ff",
      glow: "rgba(216, 182, 255, 0.38)",
      icon: "petal",
    },
    J: {
      name: "Reishi",
      fill: "#eb8d67",
      edge: "#ffe2d6",
      glow: "rgba(235, 141, 103, 0.36)",
      icon: "cap",
    },
    L: {
      name: "Cordyceps",
      fill: "#f3a95f",
      edge: "#ffe8ca",
      glow: "rgba(243, 169, 95, 0.34)",
      icon: "spark",
    },
    S: {
      name: "Matcha",
      fill: "#9fd681",
      edge: "#eefbd7",
      glow: "rgba(159, 214, 129, 0.38)",
      icon: "leaf",
    },
    Z: {
      name: "Dragon Berry",
      fill: "#ff7fa6",
      edge: "#ffe0eb",
      glow: "rgba(255, 127, 166, 0.36)",
      icon: "berry",
    },
  };

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        rotated[x][rows - 1 - y] = matrix[y][x];
      }
    }
    return rotated;
  }

  function matrixToCells(matrix, offsetX = 0, offsetY = 0) {
    const cells = [];
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        cells.push({ x: x + offsetX, y: y + offsetY });
      }
    }
    return cells;
  }

  function shuffle(list, random) {
    const output = list.slice();
    for (let i = output.length - 1; i > 0; i -= 1) {
      const j = Math.floor((typeof random === "function" ? random() : Math.random()) * (i + 1));
      [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
  }

  function createBag(random) {
    let bag = [];
    return function nextPiece() {
      if (!bag.length) {
        bag = shuffle(Object.keys(SHAPES), random);
      }
      const key = bag.pop();
      return {
        key,
        theme: THEMES[key],
        matrix: cloneMatrix(SHAPES[key]),
      };
    };
  }

  window.DROPPY_ARCADE_PIECES = {
    COLS,
    ROWS,
    SHAPES,
    THEMES,
    cloneMatrix,
    rotateMatrix,
    matrixToCells,
    createBag,
  };
})();
