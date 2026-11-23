import * as T from "./vendor/three.js";
import { hand } from "./hands.js";
import { weapon } from "./models.js";
import { Animator, Locomotion } from "./motion.js";
function reflections(renderer) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  ["#fff3dd", "#a2c2d3", "#394047", "#a89578", "#6c5649"].forEach((v, i) =>
    g.addColorStop(i / 4, v),
  );
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#fff";
  ctx.fillRect(35, 35, 95, 76);
  ctx.fillRect(320, 55, 43, 68);
  const tex = new T.CanvasTexture(c);
  tex.mapping = T.EquirectangularReflectionMapping;
  tex.colorSpace = T.SRGBColorSpace;
  const gen = new T.PMREMGenerator(renderer),
    target = gen.fromEquirectangular(tex);
  tex.dispose();
  gen.dispose();
  return target;
}
export class View {
  constructor(renderer) {
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(54, 1, 0.025, 12);
    this.env = reflections(renderer);
    this.scene.environment = this.env.texture;
    this.scene.add(new T.HemisphereLight(0xffeed9, 0x778991, 1.7));
    const key = new T.DirectionalLight(0xffedcd, 2.5);
    key.position.set(-2, 4, 3);
    this.scene.add(key);
    this.right = hand(this.scene, -1);
    this.left = hand(this.scene, 1);
    this.locomotion = new Locomotion();
    this.cache = new Map();
    this.clock =
      this.phase =
      this.swayX =
      this.swayY =
      this.dip =
      this.dipV =
      this.bob =
      this.lean =
        0;
    this.lastGround = true;
    this.offset = 0;
    this.pending = null;
  }
  select(d) {
    if (!this.model) {
      this.swap(d);
      return;
    }
    this.pending = d;
  }
  swap(d) {
    this.anim?.dispose();
    if (this.model) this.model.prop.visible = false;
    if (this.twin) this.twin.prop.visible = false;
    this.data = d;
    const reverseGrip =
      d.type === "ring" || d.type === "talon" || d.type === "skeleton";
    this.right.palm.rotation.y = reverseGrip ? Math.PI : 0;
    if (!this.cache.has(d.type))
      this.cache.set(d.type, weapon(this.right.socket, d));
    this.model = this.cache.get(d.type);
    this.model.prop.visible = true;
    if (d.type === "pair") {
      this.twin ??= weapon(this.left.socket, d);
      this.twin.prop.visible = true;
    }
    this.anim = new Animator(d.type);
  }
  play(name) {
    if (!this.pending) this.anim.play(name);
  }
  update(
    dt,
    { speed, ground, vY, crouch, sprint, dx, dy, motion, fov, aspect },
  ) {
    this.clock += dt;
    this.phase += dt * speed * 1.65;
    const smooth = 1 - Math.exp(-dt * 10),
      smoothFast = 1 - Math.exp(-dt * 18);
    if (this.pending === this.data) this.pending = null;
    this.offset +=
      ((this.pending ? 1 : 0) - this.offset) * (1 - Math.exp(-dt * 22));
    if (this.pending && this.offset > 0.92) {
      this.swap(this.pending);
      this.pending = null;
    }
    if (ground && !this.lastGround) this.dipV -= 1.45;
    this.lastGround = ground;
    // Exact critically damped spring. Euler overshoots on long mobile frames.
    const decay = Math.exp(-13 * dt),
      impulse = this.dipV + 13 * this.dip;
    this.dip = (this.dip + impulse * dt) * decay;
    this.dipV = (this.dipV - 13 * impulse * dt) * decay;
    this.swayX +=
      (T.MathUtils.clamp(dx * 1.5, -0.1, 0.1) - this.swayX) * smoothFast;
    this.swayY +=
      (T.MathUtils.clamp(dy, -0.07, 0.07) - this.swayY) * smoothFast;
    this.bob += ((ground ? Math.min(1, speed / 8) : 0) - this.bob) * smooth;
    this.lean += ((sprint && speed > 5 ? 1 : 0) - this.lean) * smooth;
    const loc = this.locomotion.update(dt, ground, vY, crouch, sprint, speed);
    const p = this.anim.update(dt, speed < 0.3, motion),
      paired = this.data.type === "pair";
    const breathing = motion ? Math.sin(this.clock * 1.65) * 0.009 : 0;
    const camAspect = Math.max(0.7, aspect);
    this.camera.aspect = aspect;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    const z =
      (-1.22 * Math.max(1, 1.46 / camAspect) * Math.tan((54 * Math.PI) / 360)) /
      Math.tan((fov * Math.PI) / 360);
    for (const [h, sign] of [
      [this.right, 1],
      [this.left, -1],
    ]) {
      const main = sign === 1,
        k = main ? 1 : paired ? 0.78 : 0.21,
        shift = main ? p.inward : paired ? p.inward * 0.76 : p.support * 0.095;
      h.mount.position.set(
        sign * ((main ? 0.56 : 0.51) - shift) +
          this.swayX +
          Math.sin(this.phase) * this.bob * 0.019,
        (main ? -0.31 : paired ? -0.36 : -0.43) +
          p.lift * k +
          breathing +
          Math.cos(this.phase * 2) * this.bob * 0.014 +
          loc.drop +
          this.dip +
          this.swayY -
          this.offset * 0.39 +
          (crouch ? 0.025 : 0),
        z + (main ? 0 : -0.06),
      );
      h.mount.rotation.set(
        -0.12 +
          loc.pitch +
          p.tilt * k +
          T.MathUtils.clamp(vY * 0.014, -0.14, 0.12),
        sign * (main ? -0.98 : 0.88) + p.turn * k * sign,
        sign * (-0.32 + p.roll * k - loc.bank - this.lean * 0.15) +
          (main ? 0 : p.support * 0.26),
      );
      h.pose(main ? p.open : paired ? p.open * 0.84 : 0.52 + p.support * 0.24);
    }
    const spin = p.spin,
      model = this.model,
      t = this.data.type;
    const anchor =
      t === "ring" || t === "talon"
        ? [-0.27, 0.115]
        : t === "skeleton"
          ? [-0.16, 0]
          : [0, 0];
    model.prop.rotation.z = spin;
    const ringGrip = t === "ring" || t === "talon",
      skeleton = t === "skeleton";
    const seatX = ringGrip ? 0.15 : skeleton ? 0.04 : 0,
      seatY = ringGrip ? -0.08 : 0;
    model.prop.position.set(
      anchor[0] + seatX,
      anchor[1] + seatY + p.toss,
      ringGrip || skeleton ? 0.08 : 0,
    );
    model.body.position.set(-anchor[0], -anchor[1], 0);
    if (t === "butterfly") {
      const fold = p.hinge * 2.85;
      model.arms[0].rotation.z = fold;
      model.body.rotation.z = -fold;
      // Rotate the blade and loose handle about the held handle's pin.
      const x = model.pivot.position.x,
        y = model.arms[0].position.y;
      model.body.position.set(
        x - x * Math.cos(fold) - y * Math.sin(fold),
        y + x * Math.sin(fold) - y * Math.cos(fold),
        0,
      );
      model.arms[1].rotation.z = -p.hinge * 2.81 + 0.34 * Math.sin(spin);
    }
    if (["navaja", "flip", "stiletto"].includes(t))
      model.pivot.rotation.z = p.hinge * 2.9;
    if (paired) {
      this.twin.prop.rotation.y = -p.support * 0.48;
      this.twin.prop.rotation.z = p.roll * 0.45;
    }
  }
  render(renderer) {
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
