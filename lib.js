class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("width", width);
    this.canvas.setAttribute("height", height);
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.buffer = this.ctx.createImageData(width, height);
  }

  draw() {
    this.ctx.putImageData(this.buffer, 0, 0);
  }

  setPixel(x, y, { r, g, b }) {
    let offset = (y * this.width + x) * 4;
    this.buffer.data[offset] = r;
    this.buffer.data[offset + 1] = g;
    this.buffer.data[offset + 2] = b;
    this.buffer.data[offset + 3] = 255;
  }
}

class Line {
  constructor(x1, z1, x2, z2) {
    this.x1 = x1;
    this.z1 = z1;
    this.x2 = x2;
    this.z2 = z2;
    this.m = (z1 - z2) / (x1 - x2);
    this.c = (z2 * x1 - z1 * x2) / (x1 - x2);
  }

  intersect(other) {
    if (this.m == other.m) {
      return null;
    }

    let x;
    let z;
    if (this.x1 == this.x2) {
      if (other.x1 == other.x2) {
        return null;
      }
      x = this.x1;
      z = other.m * x + other.c;
    } else if (other.x1 == other.x2) {
      x = other.x1;
      z = this.m * x + this.c;
    } else {
      x = (other.c - this.c) / (this.m - other.m);
      z = (this.m * other.c - other.m * this.c) / (this.m - other.m);
    }

    return { x, z };
  }
}

class Wall extends Line {
  constructor(x1, z1, x2, z2, color) {
    super(x1, z1, x2, z2);
    this.minx = Math.min(x1, x2);
    this.maxx = Math.max(x1, x2);
    this.minz = Math.min(z1, z2);
    this.maxz = Math.max(z1, z2);
    this.color = color;
  }

  intersect(other) {
    const intersection = super.intersect(other);
    if (!intersection) {
      return null;
    }

    const { x, z } = intersection;
    const epsilon = 1e-9;
    if (
      x < this.minx - epsilon ||
      x > this.maxx + epsilon ||
      z < this.minz - epsilon ||
      z > this.maxz + epsilon
    ) {
      return null;
    }

    return intersection;
  }
}

class Camera {
  constructor(distance) {
    this.distance = distance;
    this.x = 0;
    this.z = -distance;
  }

  generateRay(x) {
    return new Line(this.x, this.z, this.x + x, this.z + this.distance);
  }
}

class Scene {
  constructor({ width, height, fov, floor, ceiling, attenuation, speed }) {
    this.canvas = new Canvas(width, height);
    this.camera = new Camera(
      width / (2 * Math.tan(((fov / 2) * Math.PI) / 180))
    );
    this.walls = [];
    this.floor = floor;
    this.ceiling = ceiling;
    this.attenuation = attenuation;
    this.speed = speed;
  }

  addWall(x1, z1, x2, z2, color) {
    this.walls.push(new Wall(x1, z1, x2, z2, color));
  }

  render() {
    for (let sx = 0; sx < this.canvas.width; sx++) {
      const x = sx - this.canvas.width / 2;
      const ray = this.camera.generateRay(x);

      // Find nearest wall
      let wall = null;
      let minZ = 1e12;
      this.walls.forEach(w => {
        const intersection = w.intersect(ray);
        if (
          intersection &&
          intersection.z > this.camera.z &&
          intersection.z < minZ
        ) {
          minZ = intersection.z;
          wall = w;
        }
      });

      // Draw the sliver
      let wallColor = this.ceiling;
      if (wall) {
        wallColor = wall.color;
      }

      for (let sy = 0; sy < this.canvas.height; sy++) {
        const y = sy - this.canvas.height / 2;
        const ceilingZ = Math.abs(
          (2 * this.canvas.height) / (this.camera.distance * y)
        );

        let z = minZ;
        let color = wallColor;
        let dist = z - this.camera.z;
        if (ceilingZ < minZ) {
          color = y < 0 ? this.ceiling : this.floor;
          z = ceilingZ;
          dist = z;
        }


        const attenutation = Math.exp(-dist / this.attenuation);
        this.canvas.setPixel(sx, sy, {
          r: color.r * attenutation,
          g: color.g * attenutation,
          b: color.b * attenutation
        });
      }
    }

    this.canvas.draw();
  }

  moveLeft() {
    this.camera.x -= this.speed.x;
  }

  moveRight() {
    this.camera.x += this.speed.x;
  }

  moveForward() {
    this.camera.z += this.speed.z;
  }

  moveBackward() {
    this.camera.z -= this.speed.z;
  }
}

window.demo = function() {
  const scene = new Scene({
    width: 800,
    height: 600,
    fov: 135,
    ceiling: { r: 50, g: 140, b: 180 },
    floor: { r: 25, g: 40, b: 10 },
    attenuation: 100,
    speed: { x: 10, z: 5 }
  });

  for (i = 0; i <= 10; i++) {
    scene.addWall(-(i + 1) * 40, 1 - i / 10, -i * 40, 1.1 - i / 10, { r: i * 20, g: 0, b: 200 });
    scene.addWall((i + 1) * 40, 1 - i / 10, i * 40, 1.1 - i / 10, { r: i * 20, g: 0, b: 200 });
  }
  scene.render();

  window.addEventListener("keydown", e => {
    switch (e.keyCode) {
      case 38:
        scene.moveForward();
        break;
      case 40:
        scene.moveBackward();
        break;
      case 37:
        scene.moveLeft();
        break;
      case 39:
        scene.moveRight();
        break;
      default:
        return;
    }
    scene.render();
  });
};

window.test = function() {
  const canvas = new Canvas(600, 400);

  let tick = 0;

  function drawFrame() {
    tick++;
    for (x = 0; x < canvas.width; x++) {
      for (y = 0; y < canvas.height; y++) {
        const r = (256 * x) / canvas.width;
        const g = (256 * y) / canvas.height;
        const b = Math.sin(tick / 100) * 256;
        canvas.setPixel(x, y, { r, g, b });
      }
    }
    canvas.draw();
    window.requestAnimationFrame(drawFrame);
  }

  drawFrame();
};
