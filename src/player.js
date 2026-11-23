import { Vector3, MathUtils } from "./vendor/three.js";
export class Player {
  constructor(solids) {
    this.solids = solids;
    this.p = new Vector3(0, 0, 29);
    this.v = new Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.ground = true;
    this.height = 1.78;
    this.wish = new Vector3();
    this.step = 0;
    this.impact = 0;
  }
  overlap(s, x, z) {
    return (
      Math.abs(x - s.x) < s.w / 2 + 0.37 && Math.abs(z - s.z) < s.d / 2 + 0.37
    );
  }
  blocked(x, y, z, h) {
    return this.solids.some(
      (s) =>
        this.overlap(s, x, z) &&
        y < s.y + s.h / 2 - 0.001 &&
        y + h > s.y - s.h / 2 + 0.001,
    );
  }
  tick(dt, input) {
    const { v, p } = this;
    const target = input.duck ? 1.12 : 1.78,
      next = MathUtils.damp(this.height, target, 15, dt);
    if (next < this.height || !this.blocked(p.x, p.y, p.z, next))
      this.height = next;
    const forward = input.forward,
      side = input.side;
    const dir = this.wish.set(
      -Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side,
      0,
      -Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side,
    );
    const magnitude = Math.min(1, dir.length());
    dir.normalize();
    if (this.ground && input.jump) {
      v.y = 7.35;
      this.ground = false;
    }
    if (this.ground) {
      const speed = Math.hypot(v.x, v.z);
      const k = speed
        ? Math.max(0, 1 - (Math.max(2.5, speed) * 6.6 * dt) / speed)
        : 0;
      v.x *= k;
      v.z *= k;
    }
    const speed =
      (this.ground
        ? input.duck
          ? 2.8
          : input.walk
            ? 3.2
            : input.run
              ? 10.5
              : 7.5
        : 3.2) * magnitude;
    const a = Math.max(
      0,
      Math.min(speed - v.dot(dir), (this.ground ? 12 : 7) * speed * dt),
    );
    v.addScaledVector(dir, a);
    const hs = Math.hypot(v.x, v.z);
    if (hs > 19) {
      v.x *= 19 / hs;
      v.z *= 19 / hs;
    }
    for (const axis of ["x", "z"]) {
      const old = p[axis];
      p[axis] += v[axis] * dt;
      if (this.blocked(p.x, p.y, p.z, this.height)) {
        if (this.ground && !this.blocked(p.x, p.y + 0.46, p.z, this.height))
          p.y += 0.46;
        else {
          p[axis] = old;
          v[axis] = 0;
        }
      }
    }
    let floor = 0,
      ceiling = Infinity;
    for (const s of this.solids) {
      if (!this.overlap(s, p.x, p.z)) continue;
      const top = s.y + s.h / 2,
        bottom = s.y - s.h / 2;
      if (top <= p.y + 0.001) floor = Math.max(floor, top);
      if (bottom >= p.y + this.height - 0.001)
        ceiling = Math.min(ceiling, bottom);
    }
    v.y -= 22 * dt;
    p.y += v.y * dt;
    if (p.y + this.height > ceiling) {
      p.y = ceiling - this.height;
      v.y = Math.min(0, v.y);
    }
    if (p.y <= floor) {
      if (!this.ground) this.impact = Math.min(0.12, -v.y * 0.01);
      p.y = floor;
      v.y = 0;
      this.ground = true;
    } else this.ground = false;
    this.speed = Math.hypot(v.x, v.z);
    this.step += this.speed * dt;
    this.impact *= Math.exp(-dt * 13);
  }
}
