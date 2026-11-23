import * as T from "./vendor/three.js";
// A pose encodes staging, wrist attitude, prop travel and articulation independently.
const channels = [
  "inward",
  "lift",
  "roll",
  "turn",
  "tilt",
  "spin",
  "toss",
  "open",
  "hinge",
  "support",
];
const poses = {
  rest: [],
  show: [0.23, 0.17, 0.23, -0.58, 0.17, 0, 0, 0.12, 0, 0.28],
  reverse: [0.18, 0.19, -0.18, 0.91, -0.24, 0, 0, 0.08, 0, 0.43],
  balance: [0.25, 0.22, 0.45, -0.12, 0.43, 0, 0.018, 0.26, 0, 0.52],
  low: [0.02, -0.08, -0.43, 0.3, -0.27, 0, 0, 0, 0, -0.15],
  curl: [0.12, 0.12, 0.63, -0.48, -0.26, -1.55, 0, 0.66, 0.97, 0.13],
  fan: [0.16, 0.22, -0.36, 0.35, 0.11, -3.42, 0, 0.82, 0.1, 0.26],
  catch: [0.07, 0.04, 0.24, -0.13, -0.12, -6.28, 0, 0.06, 0, 0.15],
  orbit: [0.17, 0.18, -0.55, -0.22, 0.18, -4.75, 0, 0.78, 0, 0.33],
  loft: [0.1, 0.08, -0.4, 0.22, -0.18, -2.6, 0.32, 0.94, 0, 0.55],
  float: [0.14, 0.13, 0.22, -0.49, 0.19, -4.65, 0.28, 1, 0, 0.64],
  shut: [0.09, 0.08, 0.44, 0.26, 0.22, 0, 0, 0.31, 1, 0.25],
  snap: [0.17, 0.18, -0.48, -0.33, 0.06, 0, 0, 0.52, 0.43, 0.41],
  reach: [0.22, 0.07, 0.61, 0.35, 0.32, 0, 0, 0.18, 0, 0.9],
  cross: [0.28, 0.21, -0.71, -0.31, 0.07, 0, 0, 0.11, 0, 1],
  point: [0.1, 0.17, 0.82, 0.43, -0.15, 0, 0, 0.09, 0, -0.3],
  flat: [0.24, 0.14, -0.14, -1.19, 0.38, 0, 0, 0.07, 0, 0.54],
  dip: [0.04, -0.04, 0.47, 0.17, -0.35, 0, 0, 0.11, 0, 0.21],
};
const scripts = {
  butterfly: [
    "shut snap show reverse",
    "shut curl fan orbit catch",
    "curl fan orbit catch shut snap",
  ],
  ring: [
    "balance show flat reverse",
    "balance curl orbit catch",
    "reach curl fan orbit catch",
  ],
  m9: [
    "reach flat show balance",
    "dip loft float catch",
    "reach balance loft float catch",
  ],
  bayonet: [
    "point show reverse",
    "reach loft catch",
    "flat dip loft float catch",
  ],
  skeleton: [
    "flat balance reach",
    "point curl fan catch",
    "balance curl orbit catch",
  ],
  talon: ["reverse flat point", "dip curl orbit catch", "flat fan orbit catch"],
  flip: ["shut snap flat", "dip shut snap point", "reverse shut snap reach"],
  gut: ["point flat reach", "low reach point dip", "reach reverse point flat"],
  huntsman: [
    "reach point reverse",
    "dip cross flat",
    "low balance cross reverse",
  ],
  bowie: [
    "low reach flat balance",
    "reach dip loft catch",
    "dip reach loft float catch",
  ],
  stiletto: [
    "shut point flat",
    "shut snap point reverse",
    "reach shut point balance",
  ],
  ursus: [
    "flat reverse balance",
    "low loft catch",
    "reverse dip loft float catch",
  ],
  navaja: [
    "shut show reverse",
    "reach shut snap flat",
    "balance shut snap reverse",
  ],
  pair: [
    "cross reverse reach",
    "dip cross point reach",
    "reach cross low balance cross",
  ],
  classic: [
    "balance flat reverse",
    "point dip cross flat",
    "reverse reach loft catch",
  ],
  kukri: [
    "low flat balance point",
    "dip reach cross low",
    "balance dip cross reverse reach",
  ],
};
function clip(name, words, duration) {
  const frames = ["rest", ...words.split(" "), "rest"],
    times = frames.map((_, i) => (duration * i) / (frames.length - 1));
  const tracks = channels.map((c, j) => {
    const values = frames.map((p) => poses[p][j] || 0);
    // A complete revolution returns to the same orientation. Continue on that branch.
    if (c === "spin")
      for (let i = 1; i < values.length; i++)
        if (values[i] === 0 && values[i - 1] < -5) values[i] = -Math.PI * 2;
    return new T.NumberKeyframeTrack(
      "." + c,
      times,
      values,
      T.InterpolateSmooth,
    );
  });
  return new T.AnimationClip(name, duration, tracks);
}
export class Animator {
  constructor(type) {
    this.node = new T.Object3D();
    channels.forEach((k) => (this.node[k] = 0));
    this.mixer = new T.AnimationMixer(this.node);
    const [inspect, trick, rare] = scripts[type];
    this.clips = {
      Equip: clip("Equip", "low dip", 0.57),
      Inspect: clip("Inspect", inspect, 2.65),
      "Inspect Rare": clip("Inspect Rare", rare, 3.4),
      Trick: clip("Trick", trick, 1.83),
      "Idle Variant": clip("Idle Variant", "show", 3.1),
    };
    this.clips["Inspect Alternate"] = clip(
      "Inspect Alternate",
      inspect.split(" ").reverse().join(" "),
      3.05,
    );
    this.clips["Idle Drift"] = clip(
      "Idle Drift",
      type === "bayonet" ? "reverse" : type === "m9" ? "balance" : "dip",
      2.9,
    );
    this.clips.Slash = clip("Slash", "low cross", 0.52);
    this.idles = 0;
    this.time = 0;
    this.count = 0;
    this.play("Equip");
  }
  play(name) {
    if (
      this.action?.isRunning() &&
      !this.action.getClip().name.startsWith("Idle")
    )
      return;
    if (name === "Inspect") {
      this.count++;
      if (this.count % 5 === 0) name = "Inspect Rare";
      else if (this.count % 2 === 0) name = "Inspect Alternate";
    }
    const a = this.mixer.clipAction(this.clips[name]);
    a.reset().setLoop(T.LoopOnce, 1);
    a.clampWhenFinished = true;
    if (this.action && this.action !== a && this.action.isRunning())
      a.crossFadeFrom(this.action, 0.19, false);
    else if (this.action && this.action !== a) this.action.stop();
    a.play();
    this.action = a;
    this.time = 0;
  }
  update(dt, idle, enabled) {
    this.mixer.update(dt);
    this.time = idle ? this.time + dt : 0;
    if (enabled && this.time > 8 && !this.action.isRunning())
      this.play(++this.idles % 2 ? "Idle Variant" : "Idle Drift");
    return this.node;
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.node);
  }
}

// Locomotion and gestures use separate mixers so a landing can overlap an inspect.
export class Locomotion {
  constructor() {
    this.node = new T.Object3D();
    this.node.drop = 0;
    this.node.bank = 0;
    this.node.pitch = 0;
    this.mixer = new T.AnimationMixer(this.node);
    this.actions = {};
    const profiles = {
      Idle: [0, 0, 0],
      Walk: [-0.012, 0.035, 0.025],
      Sprint: [-0.045, 0.27, 0.1],
      Jump: [0.052, -0.09, -0.12],
      Airborne: [0.028, -0.045, -0.06],
      Landing: [-0.054, 0.06, 0.11],
      Crouch: [0.035, -0.06, 0.08],
    };
    for (const [name, v] of Object.entries(profiles)) {
      const tracks = ["drop", "bank", "pitch"].map(
        (k, j) => new T.NumberKeyframeTrack("." + k, [0, 1], [v[j], v[j]]),
      );
      this.actions[name] = this.mixer.clipAction(
        new T.AnimationClip(name, 1, tracks),
      );
    }
    this.name = "Idle";
    this.actions.Idle.play();
    this.hold = 0;
    this.grounded = true;
  }
  update(dt, ground, vy, crouch, sprint, speed) {
    if (ground && !this.grounded) this.hold = 0.18;
    this.grounded = ground;
    this.hold = Math.max(0, this.hold - dt);
    const name = !ground
      ? vy > 3
        ? "Jump"
        : "Airborne"
      : this.hold
        ? "Landing"
        : crouch
          ? "Crouch"
          : speed < 0.2
            ? "Idle"
            : sprint
              ? "Sprint"
              : "Walk";
    if (name !== this.name) {
      const prev = this.actions[this.name],
        next = this.actions[name];
      next.reset().play().crossFadeFrom(prev, 0.16, false);
      this.name = name;
    }
    this.mixer.update(dt);
    return this.node;
  }
}
