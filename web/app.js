const GRID_WIDTH = 64;
const GRID_HEIGHT = 64;
const DEFAULT_AUTO_ROTATE_MS = 20000;
const TARGET_FPS = 30;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min = 0, max = 1) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));
const wrap = (value, max) => {
  let result = value % max;
  if (result < 0) result += max;
  return result;
};

function hsvToRgb(h, s, v) {
  const hue = wrap(h, 1) * 6;
  const sector = Math.floor(hue);
  const fraction = hue - sector;
  const p = v * (1 - s);
  const q = v * (1 - fraction * s);
  const t = v * (1 - (1 - fraction) * s);
  const table = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][sector % 6];
  return table.map((channel) => Math.round(channel * 255));
}

class Matrix {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Float32Array(width * height * 4);
  }

  clear() {
    this.buffer.fill(0);
  }

  fade(amount) {
    const factor = clamp(1 - amount, 0, 1);
    for (let i = 0; i < this.buffer.length; i += 4) {
      this.buffer[i] *= factor;
      this.buffer[i + 1] *= factor;
      this.buffer[i + 2] *= factor;
      this.buffer[i + 3] = 255;
    }
  }

  setPixel(x, y, color) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const index = (iy * this.width + ix) * 4;
    this.buffer[index] = color[0];
    this.buffer[index + 1] = color[1];
    this.buffer[index + 2] = color[2];
    this.buffer[index + 3] = 255;
  }

  addPixel(x, y, color, alpha = 1) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const index = (iy * this.width + ix) * 4;
    this.buffer[index] = clamp(this.buffer[index] + color[0] * alpha, 0, 255);
    this.buffer[index + 1] = clamp(this.buffer[index + 1] + color[1] * alpha, 0, 255);
    this.buffer[index + 2] = clamp(this.buffer[index + 2] + color[2] * alpha, 0, 255);
    this.buffer[index + 3] = 255;
  }

  getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return [0, 0, 0];
    const index = (y * this.width + x) * 4;
    return [this.buffer[index], this.buffer[index + 1], this.buffer[index + 2]];
  }

  drawLine(x0, y0, x1, y1, color, alpha = 1) {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let error = dx + dy;

    while (true) {
      this.addPixel(ax, ay, color, alpha);
      if (ax === bx && ay === by) break;
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        error += dx;
        ay += sy;
      }
    }
  }

  drawCircle(cx, cy, radius, color, alpha = 1) {
    const steps = Math.max(16, Math.ceil(radius * 10));
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      this.addPixel(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, color, alpha);
    }
  }

  render(imageData) {
    const target = imageData.data;
    for (let i = 0; i < this.buffer.length; i += 4) {
      target[i] = this.buffer[i];
      target[i + 1] = this.buffer[i + 1];
      target[i + 2] = this.buffer[i + 2];
      target[i + 3] = 255;
    }
  }
}

class PaletteManager {
  constructor() {
    this.palettes = [
      { name: "Solar", stops: [[0, 12, 28], [16, 102, 170], [255, 190, 82], [255, 241, 195]] },
      { name: "Ocean", stops: [[1, 21, 43], [18, 82, 136], [70, 176, 178], [210, 248, 255]] },
      { name: "Forest", stops: [[7, 22, 12], [39, 98, 48], [120, 177, 91], [244, 231, 166]] },
      { name: "Lava", stops: [[18, 2, 2], [121, 24, 7], [228, 87, 30], [255, 221, 132]] },
      { name: "Ice", stops: [[0, 13, 28], [40, 93, 140], [143, 219, 241], [245, 254, 255]] },
      { name: "Neon", stops: [[8, 7, 24], [17, 87, 148], [255, 89, 94], [255, 202, 58]] },
    ];
    this.index = 0;
  }

  setByName(name) {
    const index = this.palettes.findIndex((palette) => palette.name === name);
    if (index >= 0) this.index = index;
  }

  setIndex(index) {
    this.index = wrap(index, this.palettes.length);
  }

  get current() {
    return this.palettes[this.index];
  }

  sample(t, brightness = 1) {
    const stops = this.current.stops;
    const scaled = clamp(t, 0, 1) * (stops.length - 1);
    const index = Math.floor(scaled);
    const amount = scaled - index;
    const a = stops[index];
    const b = stops[Math.min(index + 1, stops.length - 1)];
    return [
      Math.round(lerp(a[0], b[0], amount) * brightness),
      Math.round(lerp(a[1], b[1], amount) * brightness),
      Math.round(lerp(a[2], b[2], amount) * brightness),
    ];
  }
}

function noise2d(x, y) {
  return 0.5 + 0.25 * Math.sin(x * 1.31 + y * 0.74) + 0.25 * Math.cos(x * 0.87 - y * 1.19);
}

function smearBuffer(matrix, shiftX, shiftY, alpha = 0.4) {
  const copy = new Float32Array(matrix.buffer);
  for (let y = 0; y < matrix.height; y += 1) {
    for (let x = 0; x < matrix.width; x += 1) {
      const sourceX = x - shiftX;
      const sourceY = y - shiftY;
      if (sourceX < 0 || sourceY < 0 || sourceX >= matrix.width || sourceY >= matrix.height) continue;
      const sourceIndex = (Math.round(sourceY) * matrix.width + Math.round(sourceX)) * 4;
      matrix.addPixel(
        x,
        y,
        [copy[sourceIndex], copy[sourceIndex + 1], copy[sourceIndex + 2]],
        alpha,
      );
    }
  }
}

function createPatterns(matrix, palettes) {
  const createLifeState = () => {
    const cells = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);
    const next = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);
    const hue = new Float32Array(GRID_WIDTH * GRID_HEIGHT);
    const brightness = new Float32Array(GRID_WIDTH * GRID_HEIGHT);
    for (let i = 0; i < cells.length; i += 1) {
      cells[i] = Math.random() > 0.55 ? 1 : 0;
      hue[i] = Math.random();
      brightness[i] = cells[i] ? 1 : 0;
    }
    return { cells, next, hue, brightness, stepTimer: 0 };
  };

  const buildMazeState = () => {
    const cellsWide = 32;
    const cellsHigh = 32;
    const visited = Array.from({ length: cellsHigh }, () => Array(cellsWide).fill(false));
    const walls = Array.from({ length: cellsHigh }, () =>
      Array.from({ length: cellsWide }, () => ({ n: true, s: true, e: true, w: true })),
    );
    const stack = [{ x: 0, y: 0 }];
    visited[0][0] = true;
    return { cellsWide, cellsHigh, visited, walls, stack, hue: 0 };
  };

  const createSnakeState = () => {
    const segments = [{ x: 32, y: 32 }];
    return {
      segments,
      direction: { x: 1, y: 0 },
      timer: 0,
      hue: 0,
      targetLength: 24,
    };
  };

  const buildFlockState = () => ({
    boids: Array.from({ length: 42 }, () => ({
      x: rand(0, GRID_WIDTH),
      y: rand(0, GRID_HEIGHT),
      vx: rand(-0.6, 0.6),
      vy: rand(-0.6, 0.6),
    })),
    hue: 0,
  });

  const buildFlowFieldState = () => ({
    particles: Array.from({ length: 220 }, () => ({
      x: rand(0, GRID_WIDTH),
      y: rand(0, GRID_HEIGHT),
      vx: 0,
      vy: 0,
    })),
    z: 0,
  });

  const buildAttractState = () => ({
    particles: Array.from({ length: 280 }, () => ({
      x: rand(0, GRID_WIDTH),
      y: rand(0, GRID_HEIGHT),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
    })),
  });

  const buildFireState = (columnCenterBias = false) => ({
    heat: new Float32Array(GRID_WIDTH * GRID_HEIGHT),
    cooling: columnCenterBias ? 0.11 : 0.09,
    sparking: columnCenterBias ? 0.08 : 0.2,
    drift: 0,
  });

  const buildPulseState = () => ({
    centerX: randInt(8, GRID_WIDTH - 8),
    centerY: randInt(8, GRID_HEIGHT - 8),
    hue: Math.random(),
    step: -1,
    maxSteps: 16,
    fadeRate: 0.8,
  });

  const buildBounceState = () => ({
    particles: Array.from({ length: 32 }, (_, index) => ({
      x: index * ((GRID_WIDTH - 1) / 31),
      y: 0,
      vx: 0,
      vy: index * -0.06,
      hue: index / 32,
    })),
  });

  const buildInvadersState = () => ({
    variantIndex: 0,
    x: 1,
    y: 1,
    timer: 0,
  });

  const buildCubeState = () => ({
    focal: 30,
    cubeWidth: 20,
    angX: 20,
    angY: 10,
    angXSpeed: 0.05,
    angYSpeed: 0.05,
    zCamera: 110,
    hue: 0,
    local: [
      [-20, 20, 20],
      [20, 20, 20],
      [20, -20, 20],
      [-20, -20, 20],
      [-20, 20, -20],
      [20, 20, -20],
      [20, -20, -20],
      [-20, -20, -20],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ],
    faces: [
      [1, 0, 3, 2],
      [0, 4, 7, 3],
      [4, 0, 1, 5],
      [4, 5, 6, 7],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
    ],
  });

  const buildMultipleStreamState = () => ({
    hue: 0,
  });

  return [
    {
      id: "spiro",
      name: "Spiro",
      init: () => ({ theta: 0 }),
      update(state, dt, elapsed) {
        matrix.fade(0.08);
        for (let i = 0; i < 6; i += 1) {
          const base = state.theta + i * 0.78;
          const x = 32 + Math.sin(base * 0.9) * 18 + Math.sin(base * 3.1) * 10;
          const y = 32 + Math.cos(base * 1.2) * 18 + Math.cos(base * 2.7) * 10;
          matrix.addPixel(x, y, palettes.sample((i / 6 + elapsed * 0.00006) % 1), 0.95);
        }
        state.theta += dt * 0.0016;
      },
    },
    {
      id: "radar",
      name: "Radar",
      init: () => ({ theta: 0, hue: 0 }),
      update(state, dt) {
        matrix.fade(0.03);
        const maxRadius = Math.floor(Math.min(GRID_WIDTH, GRID_HEIGHT) / 2);
        for (let radius = 0; radius < maxRadius; radius += 1) {
          const angle = state.theta + radius * 0.035;
          const x = 32 + Math.cos(angle) * radius;
          const y = 32 + Math.sin(angle) * radius;
          matrix.addPixel(x, y, palettes.sample(wrap(state.hue - radius / maxRadius, 1)), 0.9);
        }
        state.theta += dt * 0.0032;
        state.hue = wrap(state.hue + dt * 0.00016, 1);
      },
    },
    {
      id: "life",
      name: "Life",
      init: createLifeState,
      update(state, dt) {
        state.stepTimer += dt;
        matrix.clear();
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          for (let x = 0; x < GRID_WIDTH; x += 1) {
            const index = y * GRID_WIDTH + x;
            const brightness = state.brightness[index];
            if (brightness > 0.02) {
              matrix.setPixel(x, y, palettes.sample(state.hue[index], brightness));
            }
          }
        }
        if (state.stepTimer < 90) return;
        state.stepTimer = 0;
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          for (let x = 0; x < GRID_WIDTH; x += 1) {
            const index = y * GRID_WIDTH + x;
            let neighbors = 0;
            for (let oy = -1; oy <= 1; oy += 1) {
              for (let ox = -1; ox <= 1; ox += 1) {
                if (!ox && !oy) continue;
                const nx = wrap(x + ox, GRID_WIDTH);
                const ny = wrap(y + oy, GRID_HEIGHT);
                neighbors += state.cells[ny * GRID_WIDTH + nx];
              }
            }
            const alive = state.cells[index] === 1;
            const born = !alive && neighbors === 3;
            const survive = alive && (neighbors === 2 || neighbors === 3);
            state.next[index] = born || survive ? 1 : 0;
            if (born) {
              state.hue[index] = wrap(state.hue[index] + 0.04, 1);
              state.brightness[index] = 1;
            } else if (!survive) {
              state.brightness[index] *= 0.72;
            }
          }
        }
        state.cells.set(state.next);
      },
    },
    {
      id: "flow-field",
      name: "Flow Field",
      init: buildFlowFieldState,
      update(state, dt) {
        matrix.fade(0.12);
        state.z += dt * 0.00018;
        state.particles.forEach((particle, index) => {
          const angle = noise2d(particle.x * 0.06 + state.z, particle.y * 0.06 - state.z) * Math.PI * 2;
          particle.vx = Math.cos(angle) * 0.8;
          particle.vy = Math.sin(angle) * 0.8;
          particle.x = wrap(particle.x + particle.vx, GRID_WIDTH);
          particle.y = wrap(particle.y + particle.vy, GRID_HEIGHT);
          matrix.addPixel(particle.x, particle.y, palettes.sample((index / state.particles.length + state.z) % 1), 0.5);
        });
      },
    },
    {
      id: "pendulum-wave",
      name: "Pendulum Wave",
      init: () => ({}),
      update(state, dt, elapsed) {
        matrix.fade(0.16);
        for (let x = 0; x < GRID_WIDTH; x += 2) {
          const phase = elapsed * 0.0012 * (1 + x / GRID_WIDTH);
          const y = 32 + Math.sin(phase) * 26;
          matrix.addPixel(x, y, palettes.sample(x / GRID_WIDTH), 0.95);
          matrix.addPixel(x + 1, y, palettes.sample(x / GRID_WIDTH, 0.85), 0.95);
        }
      },
    },
    {
      id: "incremental-drift",
      name: "Incremental Drift",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        matrix.fade(0.08);
        for (let i = 0; i < 18; i += 1) {
          const radius = 4 + i * 1.2;
          const speed = 0.001 + i * 0.00008;
          const x = 32 + Math.cos(state.phase * speed * 1000 + i) * radius;
          const y = 32 + Math.sin(state.phase * speed * 1450 + i * 1.3) * radius;
          matrix.addPixel(x, y, palettes.sample(i / 18), 0.85);
        }
        state.phase += dt;
      },
    },
    {
      id: "incremental-drift-2",
      name: "Incremental Drift 2",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        matrix.fade(0.14 + 0.1 * (0.5 + 0.5 * Math.sin(state.phase * 0.05)));
        for (let i = 0; i < 32; i += 1) {
          let x = 0;
          let y = 0;
          let hue = 0;
          if (i < 16) {
            x = lerp(i, GRID_WIDTH - i, 0.5 + 0.5 * Math.cos(state.phase * 0.002 * (i + 1) * 2));
            y = lerp(i, GRID_HEIGHT - i, 0.5 + 0.5 * Math.sin(state.phase * 0.002 * (i + 1) * 2));
            hue = (i * 14) / 255;
          } else {
            x = lerp(GRID_WIDTH - i, i + 1, 0.5 + 0.5 * Math.sin(state.phase * 0.002 * (32 - i) * 2));
            y = lerp(GRID_HEIGHT - i, i + 1, 0.5 + 0.5 * Math.cos(state.phase * 0.002 * (32 - i) * 2));
            hue = ((31 - i) * 14) / 255;
          }
          matrix.addPixel(x, y, palettes.sample(hue), 0.85);
        }
        state.phase += dt;
      },
    },
    {
      id: "spin",
      name: "Spin",
      init: () => ({
        degrees: 0,
        radius: 16,
        speedStart: 1,
        velocityStart: 0.6,
        maxSpeed: 30,
        speed: 1,
        velocity: 0.6,
      }),
      update(state, dt) {
        matrix.fade(0.14);
        const advance = (state.speed * dt) / 16;
        const targetDegrees = state.degrees + advance;
        const color = palettes.sample(clamp(state.speed / state.maxSpeed, 0, 1));
        for (let degree = state.degrees; degree <= targetDegrees; degree += 1) {
          const radians = (degree * Math.PI) / 180;
          const x = 32 + Math.cos(radians) * state.radius;
          const y = 32 - Math.sin(radians) * state.radius;
          matrix.addPixel(x, y, color, 0.85);
          matrix.addPixel(y, x, color, 0.7);
        }
        state.degrees = targetDegrees;
        if (state.degrees >= 360) {
          state.degrees -= 360;
          state.speed += state.velocity;
          if (state.speed <= state.speedStart) {
            state.speed = state.speedStart;
            state.velocity *= -1;
          } else if (state.speed > state.maxSpeed) {
            state.speed = state.maxSpeed - state.velocity;
            state.velocity *= -1;
          }
        }
      },
    },
    {
      id: "munch",
      name: "Munch",
      init: () => ({ count: 0, generation: 0, flip: 0 }),
      update(state, dt) {
        state.count += dt * 0.04;
        if (state.count >= GRID_WIDTH) {
          state.count = 0;
          state.generation += 1;
          state.flip = state.flip ? 0 : 1;
        }
        matrix.clear();
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          for (let y = 0; y < GRID_HEIGHT; y += 1) {
            if (((x ^ y ^ state.flip) % GRID_WIDTH) < state.count) {
              matrix.setPixel(x, y, palettes.sample(wrap(((x ^ y) / GRID_WIDTH) + state.generation * 0.01, 1)));
            }
          }
        }
      },
    },
    {
      id: "electric-mandala",
      name: "Electric Mandala",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        matrix.clear();
        for (let y = 0; y < 32; y += 1) {
          for (let x = 0; x <= y; x += 1) {
            const nx = x - 15.5;
            const ny = y - 15.5;
            const angle = Math.atan2(ny, nx);
            const radius = Math.hypot(nx, ny);
            const value = 0.5 + 0.5 * Math.sin(radius * 0.6 - state.phase + Math.cos(angle * 6));
            const color = palettes.sample(value);
            const points = [
              [x, y],
              [y, x],
              [63 - x, y],
              [x, 63 - y],
              [63 - x, 63 - y],
              [63 - y, 63 - x],
              [63 - y, x],
              [y, 63 - x],
            ];
            points.forEach(([px, py]) => matrix.addPixel(px, py, color, 0.8));
          }
        }
        state.phase += dt * 0.004;
      },
    },
    {
      id: "fire",
      name: "Fire",
      init: () => buildFireState(false),
      update(state, dt, elapsed) {
        const { heat, cooling, sparking } = state;
        state.drift += dt * 0.0015;
        matrix.clear();
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          for (let y = 0; y < GRID_HEIGHT; y += 1) {
            const index = y * GRID_WIDTH + x;
            heat[index] = Math.max(0, heat[index] - Math.random() * cooling * 255);
          }
          for (let y = 0; y < GRID_HEIGHT - 2; y += 1) {
            const index = y * GRID_WIDTH + x;
            heat[index] = (
              heat[(y + 1) * GRID_WIDTH + x] +
              heat[(y + 2) * GRID_WIDTH + x] +
              heat[(y + 2) * GRID_WIDTH + x]
            ) / 3;
          }
          if (Math.random() < sparking) {
            const index = (GRID_HEIGHT - 1) * GRID_WIDTH + x;
            heat[index] = clamp(heat[index] + rand(160, 255), 0, 255);
          }
        }
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          const rowDrift = Math.sin(state.drift + y * 0.18 + elapsed * 0.0003) * 2.4;
          for (let x = 0; x < GRID_WIDTH; x += 1) {
            const heatValue = clamp(heat[y * GRID_WIDTH + x] / 255, 0, 1);
            if (heatValue < 0.03) continue;
            matrix.addPixel(x + rowDrift, y, palettes.sample(heatValue, 0.55 + heatValue * 0.75), 0.9);
          }
        }
      },
    },
    {
      id: "pulse",
      name: "Pulse",
      init: buildPulseState,
      update(state) {
        matrix.fade(0.08);
        if (state.step === -1) {
          state.centerX = randInt(8, GRID_WIDTH - 8);
          state.centerY = randInt(8, GRID_HEIGHT - 8);
          state.hue = Math.random();
          state.step = 0;
        }
        const primaryAlpha = state.step <= 1 ? 1 : state.fadeRate ** (state.step - 2);
        matrix.drawCircle(state.centerX, state.centerY, state.step, palettes.sample(state.hue), primaryAlpha);
        if (state.step > 3) {
          const secondaryAlpha = state.fadeRate ** (state.step - 2);
          matrix.drawCircle(state.centerX, state.centerY, state.step - 3, palettes.sample(wrap(state.hue + 0.08, 1)), secondaryAlpha);
        }
        state.step += 1;
        if (state.step >= state.maxSteps) state.step = -1;
      },
    },
    {
      id: "simplex-noise",
      name: "Simplex Noise",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        state.phase += dt * 0.00055;
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          for (let x = 0; x < GRID_WIDTH; x += 1) {
            const n = noise2d(x * 0.12 + state.phase * 12, y * 0.12 - state.phase * 7);
            matrix.setPixel(x, y, palettes.sample(n));
          }
        }
      },
    },
    {
      id: "wave",
      name: "Wave",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        matrix.fade(0.24);
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          const y = 32 + Math.sin(state.phase + x * 0.18) * 13 + Math.sin(state.phase * 0.6 + x * 0.07) * 9;
          for (let offset = -2; offset <= 2; offset += 1) {
            matrix.addPixel(x, y + offset, palettes.sample(wrap(x / GRID_WIDTH + state.phase * 0.04, 1)), 0.32);
          }
        }
        state.phase += dt * 0.0034;
      },
    },
    {
      id: "attract",
      name: "Attract",
      init: buildAttractState,
      update(state, dt, elapsed) {
        matrix.fade(0.1);
        const attractors = [
          { x: 32 + Math.sin(elapsed * 0.0011) * 17, y: 32 + Math.cos(elapsed * 0.0017) * 12 },
          { x: 32 + Math.cos(elapsed * 0.0015) * 14, y: 32 + Math.sin(elapsed * 0.0013) * 18 },
        ];
        state.particles.forEach((particle, index) => {
          let ax = 0;
          let ay = 0;
          attractors.forEach((attractor) => {
            const dx = attractor.x - particle.x;
            const dy = attractor.y - particle.y;
            const distance = Math.max(10, dx * dx + dy * dy);
            ax += (dx / distance) * 18;
            ay += (dy / distance) * 18;
          });
          particle.vx = clamp(particle.vx + ax * dt * 0.0004, -1.2, 1.2);
          particle.vy = clamp(particle.vy + ay * dt * 0.0004, -1.2, 1.2);
          particle.x = wrap(particle.x + particle.vx, GRID_WIDTH);
          particle.y = wrap(particle.y + particle.vy, GRID_HEIGHT);
          matrix.addPixel(particle.x, particle.y, palettes.sample(index / state.particles.length), 0.42);
        });
      },
    },
    {
      id: "bounce",
      name: "Bounce",
      init: buildBounceState,
      update(state, dt) {
        matrix.fade(0.18);
        state.particles.forEach((particle) => {
          particle.vy += dt * 0.0008;
          particle.x = wrap(particle.x + particle.vx * dt * 0.05, GRID_WIDTH);
          particle.y += particle.vy * dt * 0.05;
          if (particle.y >= GRID_HEIGHT - 1) {
            particle.y = GRID_HEIGHT - 1;
            particle.vy *= -1;
          }
          matrix.addPixel(particle.x, particle.y, palettes.sample(particle.hue), 0.8);
        });
      },
    },
    {
      id: "swirl",
      name: "Swirl",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        matrix.fade(0.07);
        for (let i = 0; i < 8; i += 1) {
          const angle = state.phase + i * (Math.PI / 4);
          const radius = 10 + 12 * Math.sin(state.phase * 0.7 + i);
          const x = 32 + Math.cos(angle * 1.3) * radius;
          const y = 32 + Math.sin(angle * 1.7) * radius;
          const color = palettes.sample(i / 8);
          const points = [
            [x, y],
            [63 - x, y],
            [x, 63 - y],
            [63 - x, 63 - y],
          ];
          points.forEach(([px, py]) => matrix.addPixel(px, py, color, 0.55));
        }
        state.phase += dt * 0.003;
      },
    },
    {
      id: "flock",
      name: "Flock",
      init: buildFlockState,
      update(state, dt) {
        matrix.fade(0.12);
        const boids = state.boids;
        boids.forEach((boid, index) => {
          let alignX = 0;
          let alignY = 0;
          let cohX = 0;
          let cohY = 0;
          let sepX = 0;
          let sepY = 0;
          let count = 0;
          boids.forEach((other) => {
            if (other === boid) return;
            const dx = other.x - boid.x;
            const dy = other.y - boid.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 13) {
              alignX += other.vx;
              alignY += other.vy;
              cohX += other.x;
              cohY += other.y;
              count += 1;
              if (distance < 4 && distance > 0) {
                sepX -= dx / distance;
                sepY -= dy / distance;
              }
            }
          });
          if (count) {
            boid.vx += ((alignX / count) - boid.vx) * 0.03;
            boid.vy += ((alignY / count) - boid.vy) * 0.03;
            boid.vx += ((cohX / count) - boid.x) * 0.0015;
            boid.vy += ((cohY / count) - boid.y) * 0.0015;
            boid.vx += sepX * 0.025;
            boid.vy += sepY * 0.025;
          }
          const speed = Math.hypot(boid.vx, boid.vy);
          if (speed > 1.2) {
            boid.vx = (boid.vx / speed) * 1.2;
            boid.vy = (boid.vy / speed) * 1.2;
          }
          boid.x = wrap(boid.x + boid.vx * dt * 0.06, GRID_WIDTH);
          boid.y = wrap(boid.y + boid.vy * dt * 0.06, GRID_HEIGHT);
          matrix.addPixel(boid.x, boid.y, palettes.sample(index / boids.length), 0.7);
        });
      },
    },
    {
      id: "infinity",
      name: "Infinity",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        matrix.fade(0.11);
        for (let i = 0; i < 5; i += 1) {
          const t = state.phase + i * 0.55;
          const denom = 1 + Math.sin(t) ** 2;
          const x = 32 + (18 * Math.cos(t)) / denom;
          const y = 32 + (14 * Math.sin(t) * Math.cos(t)) / denom * 2;
          matrix.addPixel(x, y, palettes.sample(wrap(0.15 * i + state.phase * 0.03, 1)), 0.9);
        }
        state.phase += dt * 0.0036;
      },
    },
    {
      id: "plasma",
      name: "Plasma",
      init: () => ({ phase: 0 }),
      update(state, dt) {
        state.phase += dt * 0.0019;
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          for (let x = 0; x < GRID_WIDTH; x += 1) {
            const value =
              0.25 * Math.sin(x * 0.18 + state.phase) +
              0.25 * Math.sin(y * 0.16 - state.phase * 1.2) +
              0.25 * Math.sin((x + y) * 0.12 + state.phase * 0.8) +
              0.25 * Math.sin(Math.hypot(x - 32, y - 32) * 0.25 - state.phase * 1.7);
            matrix.setPixel(x, y, palettes.sample(value * 0.5 + 0.5));
          }
        }
      },
    },
    {
      id: "spark",
      name: "Spark",
      init: () => buildFireState(true),
      update(state, dt, elapsed) {
        const { heat, cooling, sparking } = state;
        state.drift += dt * 0.0019;
        matrix.clear();
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          for (let y = 0; y < GRID_HEIGHT; y += 1) {
            const index = y * GRID_WIDTH + x;
            heat[index] = Math.max(0, heat[index] - Math.random() * cooling * 255);
          }
          for (let y = 0; y < GRID_HEIGHT - 2; y += 1) {
            const index = y * GRID_WIDTH + x;
            heat[index] = (
              heat[(y + 1) * GRID_WIDTH + x] +
              heat[(y + 2) * GRID_WIDTH + x] +
              heat[(y + 2) * GRID_WIDTH + x]
            ) / 3;
          }
        }
        if (Math.random() < sparking) {
          const sparkX = randInt(Math.max(0, 32 - 2), Math.min(GRID_WIDTH, 32 + 3));
          const sparkIndex = (GRID_HEIGHT - 1) * GRID_WIDTH + sparkX;
          heat[sparkIndex] = clamp(heat[sparkIndex] + rand(180, 255), 0, 255);
        }
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          const rowDrift = Math.sin(state.drift + y * 0.22 + elapsed * 0.0005) * 3.5;
          for (let x = 0; x < GRID_WIDTH; x += 1) {
            const heatValue = clamp(heat[y * GRID_WIDTH + x] / 255, 0, 1);
            if (heatValue < 0.04) continue;
            matrix.addPixel(x + rowDrift, y, palettes.sample(heatValue, 0.5 + heatValue * 0.9), 0.95);
          }
        }
      },
    },
    {
      id: "invaders",
      name: "Invaders",
      init: buildInvadersState,
      update(state, dt) {
        const variants = [
          { scale: 1, gap: 1, margin: 1, frameMs: 125 },
          { scale: 2, gap: 1, margin: 0, frameMs: 350 },
          { scale: 6, gap: 2, margin: 1, frameMs: 900 },
        ];
        const variant = variants[state.variantIndex];
        const spriteWidth = 5 * variant.scale;
        const spriteHeight = 5 * variant.scale;
        const stepX = spriteWidth + variant.gap;
        const stepY = spriteHeight + variant.gap;
        const startX = variant.margin;
        const startY = variant.margin;
        const limitX = GRID_WIDTH - variant.margin - spriteWidth;
        const limitY = GRID_HEIGHT - variant.margin - spriteHeight;
        state.timer += dt;
        if (state.timer < variant.frameMs) return;
        state.timer = 0;

        if (state.x === startX && state.y === startY) {
          matrix.clear();
        }

        const color = palettes.sample(Math.random(), 0.95);
        for (let ix = 0; ix < 3; ix += 1) {
          for (let iy = 0; iy < 5; iy += 1) {
            if (Math.random() < 0.5) continue;
            for (let dx = 0; dx < variant.scale; dx += 1) {
              for (let dy = 0; dy < variant.scale; dy += 1) {
                matrix.setPixel(state.x + ix * variant.scale + dx, state.y + iy * variant.scale + dy, color);
                if (ix < 2) {
                  matrix.setPixel(
                    state.x + (4 - ix) * variant.scale + dx,
                    state.y + iy * variant.scale + dy,
                    color,
                  );
                }
              }
            }
          }
        }

        state.x += stepX;
        if (state.x > limitX) {
          state.x = startX;
          state.y += stepY;
        }

        if (state.y > limitY) {
          state.variantIndex = wrap(state.variantIndex + 1, variants.length);
          state.x = variants[state.variantIndex].margin;
          state.y = variants[state.variantIndex].margin;
        }
      },
    },
    {
      id: "cube",
      name: "Cube",
      init: buildCubeState,
      update(state, dt) {
        matrix.fade(0.08 + 0.5 * (0.5 + 0.5 * Math.sin(state.hue * Math.PI * 2)));
        state.zCamera = 100 + (0.5 + 0.5 * Math.sin(state.hue * Math.PI * 4)) * 40;
        state.angXSpeed = 0.01 + (0.5 + 0.5 * Math.sin(state.hue * Math.PI * 6)) * 0.09;
        state.angYSpeed = 0.01 + (0.5 + 0.5 * Math.cos(state.hue * Math.PI * 10)) * 0.09;
        state.angX = wrap(state.angX + state.angXSpeed * dt * 0.02, Math.PI * 2);
        state.angY = wrap(state.angY + state.angYSpeed * dt * 0.02, Math.PI * 2);

        const cx = Math.cos(state.angX);
        const sx = Math.sin(state.angX);
        const cy = Math.cos(state.angY);
        const sy = Math.sin(state.angY);
        const screen = state.local.map(([x, y, z]) => {
          const ax = cy * x - sy * z;
          const ay = sx * sy * x + cx * y + sx * cy * z;
          const az = cx * sy * x - sx * y + cx * cy * z + state.zCamera;
          return {
            x: Math.floor(32 + (state.focal * ax) / az),
            y: Math.floor(32 - (state.focal * ay) / az),
          };
        });

        const visibleEdges = new Set();
        state.faces.forEach((face) => {
          const a = screen[face[0]];
          const b = screen[face[1]];
          const c = screen[face[2]];
          const backFace = ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 0;
          if (!backFace) {
            for (let i = 0; i < face.length; i += 1) {
              const p0 = face[i];
              const p1 = face[i ? i - 1 : face.length - 1];
              visibleEdges.add([p0, p1].sort((m, n) => m - n).join("-"));
            }
          }
        });

        const backColor = palettes.sample(state.hue, 0.45);
        const frontColor = palettes.sample(wrap(state.hue + 0.08, 1), 1);
        state.edges.forEach(([a, b]) => {
          const key = [a, b].sort((m, n) => m - n).join("-");
          const color = visibleEdges.has(key) ? frontColor : backColor;
          const alpha = visibleEdges.has(key) ? 0.95 : 0.5;
          matrix.drawLine(screen[a].x, screen[a].y, screen[b].x, screen[b].y, color, alpha);
        });
        state.hue = wrap(state.hue + dt * 0.0005, 1);
      },
    },
    {
      id: "multiple-stream",
      name: "MultipleStream",
      init: buildMultipleStreamState,
      update(state, dt, elapsed) {
        matrix.fade(0.1);
        const counter = elapsed / 10;
        const x1 = 8 + Math.sin(counter * 0.2) * 12;
        const y1 = 12 + Math.sin(counter * 0.2 + Math.PI * 0.5) * 12;
        const x2 = 16 + Math.sin(counter * 0.125) * 14;
        const y2 = 16 + Math.cos(counter * 0.0833) * 14;
        matrix.addPixel(x1, y1, palettes.sample(state.hue), 1);
        matrix.addPixel(x2, y2, palettes.sample(wrap(state.hue + 0.5, 1)), 1);
        smearBuffer(matrix, 2, 0, 0.18);
        smearBuffer(matrix, 0, 2, 0.18);
        smearBuffer(matrix, 1 + Math.round(Math.sin(elapsed * 0.0012)), 1, 0.12);
        state.hue = wrap(state.hue + dt * 0.00025, 1);
      },
    },
    {
      id: "snake",
      name: "Snake",
      init: createSnakeState,
      update(state, dt) {
        state.timer += dt;
        if (state.timer >= 75) {
          state.timer = 0;
          const head = state.segments[0];
          const options = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ].filter((direction) => direction.x !== -state.direction.x || direction.y !== -state.direction.y);
          if (Math.random() > 0.7) {
            state.direction = options[randInt(0, options.length)];
          }
          const next = {
            x: wrap(head.x + state.direction.x, GRID_WIDTH),
            y: wrap(head.y + state.direction.y, GRID_HEIGHT),
          };
          state.segments.unshift(next);
          if (state.segments.length > state.targetLength) state.segments.pop();
          state.hue = wrap(state.hue + 0.015, 1);
        }
        matrix.clear();
        state.segments.forEach((segment, index) => {
          const brightness = 1 - index / state.segments.length;
          matrix.setPixel(segment.x, segment.y, palettes.sample(wrap(state.hue + index * 0.02, 1), brightness));
        });
      },
    },
    {
      id: "maze",
      name: "Maze",
      init: buildMazeState,
      update(state, dt) {
        state.hue = wrap(state.hue + dt * 0.0001, 1);
        if (state.stack.length) {
          for (let iteration = 0; iteration < 8; iteration += 1) {
            const current = state.stack[state.stack.length - 1];
            const neighbors = [
              { x: current.x, y: current.y - 1, wall: "n", opposite: "s" },
              { x: current.x, y: current.y + 1, wall: "s", opposite: "n" },
              { x: current.x - 1, y: current.y, wall: "w", opposite: "e" },
              { x: current.x + 1, y: current.y, wall: "e", opposite: "w" },
            ].filter(
              (neighbor) =>
                neighbor.x >= 0 &&
                neighbor.y >= 0 &&
                neighbor.x < state.cellsWide &&
                neighbor.y < state.cellsHigh &&
                !state.visited[neighbor.y][neighbor.x],
            );
            if (!neighbors.length) {
              state.stack.pop();
              break;
            }
            const next = neighbors[randInt(0, neighbors.length)];
            state.walls[current.y][current.x][next.wall] = false;
            state.walls[next.y][next.x][next.opposite] = false;
            state.visited[next.y][next.x] = true;
            state.stack.push({ x: next.x, y: next.y });
          }
        }
        matrix.clear();
        for (let y = 0; y < state.cellsHigh; y += 1) {
          for (let x = 0; x < state.cellsWide; x += 1) {
            const color = palettes.sample(wrap(state.hue + (x + y) * 0.01, 1));
            const cellX = x * 2;
            const cellY = y * 2;
            matrix.setPixel(cellX, cellY, color);
            if (!state.walls[y][x].e) matrix.setPixel(cellX + 1, cellY, color);
            if (!state.walls[y][x].s) matrix.setPixel(cellX, cellY + 1, color);
          }
        }
      },
    },
    {
      id: "spiral",
      name: "Spiral",
      init: () => ({ a: 0, b: 0, c: 0, d: 0, hue: 0 }),
      update(state, dt) {
        matrix.fade(0.05);
        state.a = wrap(state.a + dt * 0.021, GRID_WIDTH);
        state.b = wrap(state.b + dt * 0.015, GRID_HEIGHT);
        state.c = wrap(state.c + dt * 0.009, GRID_WIDTH);
        state.d = wrap(state.d + dt * 0.012, GRID_HEIGHT);
        state.hue = wrap(state.hue + dt * 0.0004, 1);
        const color = palettes.sample(state.hue);
        matrix.drawLine(state.a, state.b, state.c, state.d, color, 0.9);
        for (let radius = 30; radius > 1; radius -= 1) {
          const angle = state.hue * Math.PI * 2 + radius * 0.16;
          matrix.addPixel(32 + Math.cos(angle) * radius * 0.42, 32 + Math.sin(angle) * radius * 0.42, color, 0.18);
        }
      },
    },
  ];
}

class AuroraApp {
  constructor() {
    this.canvas = document.getElementById("matrix");
    this.context = this.canvas.getContext("2d");
    this.context.imageSmoothingEnabled = false;
    this.imageData = this.context.createImageData(GRID_WIDTH, GRID_HEIGHT);
    this.matrix = new Matrix(GRID_WIDTH, GRID_HEIGHT);
    this.palettes = new PaletteManager();
    this.patterns = createPatterns(this.matrix, this.palettes);
    this.patternIndex = 0;
    this.state = this.patterns[0].init();
    this.autoplay = true;
    this.autoRotateMs = DEFAULT_AUTO_ROTATE_MS;
    this.elapsed = 0;
    this.lastTimestamp = 0;
    this.lastSwitchAt = 0;
    this.fpsSample = [];

    this.patternSelect = document.getElementById("pattern-select");
    this.paletteSelect = document.getElementById("palette-select");
    this.durationInput = document.getElementById("duration-input");
    this.autoplayToggle = document.getElementById("autoplay-toggle");
    this.currentPattern = document.getElementById("current-pattern");
    this.currentPalette = document.getElementById("current-palette");
    this.fpsElement = document.getElementById("fps");

    this.setupControls();
    this.setupFullscreen();
    this.syncStatus();
    window.requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  setupControls() {
    this.patterns.forEach((pattern, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = pattern.name;
      this.patternSelect.append(option);
    });

    this.palettes.palettes.forEach((palette, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = palette.name;
      this.paletteSelect.append(option);
    });

    this.patternSelect.addEventListener("change", (event) => {
      this.selectPattern(Number(event.target.value));
    });

    this.paletteSelect.addEventListener("change", (event) => {
      this.palettes.setIndex(Number(event.target.value));
      this.syncStatus();
    });

    this.durationInput.addEventListener("change", (event) => {
      const seconds = clamp(Number(event.target.value) || 20, 1, 3600);
      event.target.value = String(seconds);
      this.autoRotateMs = seconds * 1000;
      this.lastSwitchAt = this.elapsed;
    });

    this.autoplayToggle.addEventListener("change", (event) => {
      this.autoplay = event.target.checked;
    });

    document.getElementById("prev-button").addEventListener("click", () => this.stepPattern(-1));
    document.getElementById("next-button").addEventListener("click", () => this.stepPattern(1));
    document.getElementById("shuffle-button").addEventListener("click", () => {
      const next = randInt(0, this.patterns.length);
      this.palettes.setIndex(randInt(0, this.palettes.palettes.length));
      this.selectPattern(next);
    });
  }

  setupFullscreen() {
    const IDLE_MS = 3000;
    let idleTimer = null;

    const setIdle = () => this.canvas.classList.add("fs-idle");

    const resetIdle = () => {
      this.canvas.classList.remove("fs-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(setIdle, IDLE_MS);
    };

    const onEnterFullscreen = () => {
      resetIdle();
      document.addEventListener("mousemove", resetIdle);
      document.addEventListener("keydown", resetIdle);
    };

    const onExitFullscreen = () => {
      this.canvas.classList.remove("fs-idle");
      clearTimeout(idleTimer);
      document.removeEventListener("mousemove", resetIdle);
      document.removeEventListener("keydown", resetIdle);
    };

    this.canvas.addEventListener("click", () => {
      if (document.fullscreenElement === this.canvas) {
        this.stepPattern(1);
      } else {
        this.canvas.requestFullscreen().catch(() => {});
      }
    });

    this.canvas.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (document.fullscreenElement === this.canvas) {
          this.stepPattern(1);
        } else {
          this.canvas.requestFullscreen().catch(() => {});
        }
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement === this.canvas) {
        onEnterFullscreen();
      } else {
        onExitFullscreen();
      }
    });
  }

  syncStatus() {
    this.patternSelect.value = String(this.patternIndex);
    this.paletteSelect.value = String(this.palettes.index);
    this.durationInput.value = String(Math.round(this.autoRotateMs / 1000));
    this.currentPattern.textContent = this.patterns[this.patternIndex].name;
    this.currentPalette.textContent = this.palettes.current.name;
  }

  selectPattern(index) {
    this.patternIndex = wrap(index, this.patterns.length);
    this.state = this.patterns[this.patternIndex].init();
    this.matrix.clear();
    this.lastSwitchAt = this.elapsed;
    this.syncStatus();
  }

  stepPattern(step) {
    this.selectPattern(this.patternIndex + step);
  }

  loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min(48, timestamp - this.lastTimestamp);
    if (dt < 1000 / TARGET_FPS - 1) {
      window.requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
      return;
    }

    this.lastTimestamp = timestamp;
    this.elapsed += dt;

    if (this.autoplay && this.elapsed - this.lastSwitchAt >= this.autoRotateMs) {
      this.stepPattern(1);
    }

    const pattern = this.patterns[this.patternIndex];
    pattern.update(this.state, dt, this.elapsed);
    this.matrix.render(this.imageData);
    this.context.putImageData(this.imageData, 0, 0);

    this.fpsSample.push(1000 / dt);
    if (this.fpsSample.length > 24) this.fpsSample.shift();
    const fps = this.fpsSample.reduce((total, value) => total + value, 0) / this.fpsSample.length;
    this.fpsElement.textContent = fps.toFixed(0);

    window.requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new AuroraApp();
});
