import * as T from "./vendor/three.js";
import { group, mesh, mat } from "./models.js";
const leather = mat("#30363a", 0.79),
  suede = mat("#675e4b", 0.94),
  shell = mat("#242b2c", 0.43),
  cloth = mat("#575e55", 0.95),
  thread = mat("#b5a58a", 0.83);
function fabric(material) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#aaa";
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 3)
    for (let x = 0; x < 64; x += 4) {
      ctx.fillStyle = (x + y) % 2 ? "#666" : "#ccc";
      ctx.fillRect(x + (y % 2), y, 2, 1);
    }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(3, 3);
  material.bumpMap = tex;
  material.bumpScale = 0.002;
}
fabric(leather);
fabric(cloth);
// Elliptical cross sections follow the local tangent, including the bent fingertips.
// Neighbouring joints share vertices through skin weights.
function loft(parent, rows, m, bones = null) {
  const pos = [],
    uv = [],
    ix = [],
    weights = [],
    skin = [],
    N = 16;
  rows.forEach(([x, y, z, rx, rz, j = 0, w = 0], i) => {
    const a = rows[Math.max(i - 1, 0)],
      b = rows[Math.min(i + 1, rows.length - 1)],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      len = Math.hypot(dy, dz) || 1;
    for (let k = 0; k <= N; k++) {
      const th = (k * 2 * Math.PI) / N,
        c = Math.cos(th),
        s = Math.sin(th);
      pos.push(x + rx * c, y - (rz * s * dz) / len, z + (rz * s * dy) / len);
      uv.push(k / N, i / (rows.length - 1));
      skin.push(j, Math.min(j + 1, (bones?.length || 1) - 1), 0, 0);
      weights.push(1 - w, w, 0, 0);
      if (i && k) {
        const v = i * (N + 1) + k;
        ix.push(v - N - 2, v, v - 1, v - N - 2, v - N - 1, v);
      }
    }
  });
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(ix);
  geo.computeVertexNormals();
  m.side = T.DoubleSide;
  if (!bones) return mesh(parent, geo, m);
  geo.setAttribute("skinIndex", new T.Uint16BufferAttribute(skin, 4));
  geo.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
  const o = new T.SkinnedMesh(geo, m);
  o.add(bones[0]);
  parent.add(o);
  o.updateMatrixWorld(true);
  o.bind(new T.Skeleton(bones));
  o.frustumCulled = false;
  return o;
}
function seam(parent, pts) {
  const c = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p)));
  mesh(parent, new T.TubeGeometry(c, 14, 0.0022, 5, false), thread);
}
export function hand(scene, side) {
  const mount = group(scene),
    wrist = group(mount);
  wrist.scale.x = side;
  const socket = group(wrist, 0, 0.12, -0.043);
  loft(
    wrist,
    [
      [-0.55, -0.77, 0.52, 0.19, 0.15],
      [-0.38, -0.56, 0.37, 0.17, 0.14],
      [-0.22, -0.4, 0.25, 0.148, 0.12],
      [-0.16, -0.33, 0.2, 0.16, 0.13],
      [-0.12, -0.28, 0.15, 0.14, 0.115],
      [-0.07, -0.23, 0.1, 0.145, 0.109],
      [-0.035, -0.17, 0.06, 0.115, 0.091],
    ],
    cloth,
  );
  loft(
    wrist,
    [
      [-0.065, -0.235, 0.1, 0.124, 0.102],
      [-0.048, -0.215, 0.08, 0.14, 0.103],
      [-0.018, -0.145, 0.037, 0.13, 0.097],
      [0, -0.13, 0.03, 0.115, 0.082],
    ],
    shell,
  );
  const palm = group(wrist);
  loft(
    palm,
    [
      [0, -0.168, 0.04, 0.104, 0.071],
      [0.006, -0.116, 0.018, 0.119, 0.075],
      [0.006, -0.025, 0, 0.15, 0.082],
      [0.004, 0.046, 0.001, 0.172, 0.077],
      [0, 0.113, 0.003, 0.164, 0.064],
      [0, 0.137, 0.005, 0.14, 0.045],
    ],
    leather,
  );
  seam(palm, [
    [-0.092, -0.12, 0.073],
    [-0.13, -0.015, 0.055],
    [-0.135, 0.065, 0.053],
    [-0.09, 0.1, 0.063],
  ]);
  seam(palm, [
    [0.08, -0.12, 0.074],
    [0.115, -0.025, 0.065],
    [0.132, 0.057, 0.057],
  ]);
  const fingers = [];
  for (let i = 0; i < 5; i++) {
    const thumb = i === 4,
      x = thumb ? 0.138 : 0.119 - i * 0.078,
      L = thumb ? 0.87 : [1, 1.07, 1, 0.82][i];
    const path = thumb
      ? [
          [x, -0.045, 0.017],
          [0.183, 0.016, 0.004],
          [0.182, 0.075, -0.055],
          [0.135, 0.103, -0.086],
          [0.09, 0.105, -0.085],
        ]
      : [
          [x, 0.06, 0.023],
          [x, 0.123, 0.043],
          [x, 0.174 * L, 0.004],
          [x, 0.168 * L, -0.066],
          [x, 0.12 * L, -0.103],
          [x, 0.087 * L, -0.085],
        ];
    const bones = [new T.Bone(), new T.Bone(), new T.Bone()];
    const breaks = thumb ? [0, 1, 2] : [0, 2, 3];
    bones.forEach((bone, j) => {
      bone.position.fromArray(path[breaks[j]]);
      if (j) {
        bone.position.sub(new T.Vector3(...path[breaks[j - 1]]));
        bones[j - 1].add(bone);
      }
    });
    const rows = path.map(([px, y, z], k) => {
      const j = k >= breaks[2] ? 2 : k >= breaks[1] ? 1 : 0;
      const radius = (thumb ? 0.045 : 0.038) * L * (1 - k * 0.056);
      return [
        px,
        y,
        z,
        k === path.length - 1 ? 0.009 : radius,
        k === path.length - 1 ? 0.009 : radius * 0.91,
        j,
        k === 1 ? 0.27 : 0,
      ];
    });
    loft(palm, rows, i === 4 ? suede : leather, bones);
    fingers.push(bones);
    if (!thumb) {
      const o = mesh(palm, new T.SphereGeometry(1, 12, 8), shell);
      o.position.set(x, 0.083, 0.065);
      o.scale.set(0.034, 0.033, 0.012);
    }
  }
  const patch = mesh(palm, new T.SphereGeometry(1, 20, 12), suede);
  patch.position.set(-0.012, -0.026, 0.078);
  patch.scale.set(0.091, 0.06, 0.012);
  for (const y of [-0.044, -0.025, -0.006])
    seam(palm, [
      [-0.057, y, 0.087],
      [-0.012, y + 0.005, 0.091],
      [0.041, y, 0.086],
    ]);
  return { mount, wrist, palm, socket, fingers };
}
