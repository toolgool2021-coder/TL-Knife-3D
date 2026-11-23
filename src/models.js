import * as T from "./vendor/three.js";
export const mat = (color, roughness = 0.55, metalness = 0.1) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
const steel = mat("#cedde3", 0.23, 0.9),
  edge = mat("#f1f5f5", 0.14, 0.92),
  hardware = mat("#333d41", 0.33, 0.78),
  pin = mat("#c0a876", 0.3, 0.72);
export function group(parent, x = 0, y = 0, z = 0) {
  const g = new T.Group();
  parent.add(g);
  g.position.set(x, y, z);
  return g;
}
export function mesh(parent, geo, m) {
  const o = new T.Mesh(geo, m);
  parent.add(o);
  return o;
}
function plate(parent, outline, depth, m, holes = []) {
  const s = new T.Shape(outline.map(([x, y]) => new T.Vector2(x, y)));
  for (const [x, y, r] of holes) {
    const p = new T.Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  const geo = new T.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.translate(0, 0, -depth / 2);
  return mesh(parent, geo, m);
}
function ring(g, x, y, r, m) {
  const o = mesh(g, new T.TorusGeometry(r, 0.022, 10, 32), m);
  o.position.set(x, y, 0);
}
function rivet(g, x, y, z) {
  const o = mesh(g, new T.CylinderGeometry(0.019, 0.019, 0.013, 12), pin);
  o.rotation.x = Math.PI / 2;
  o.position.set(x, y, z);
}
function blade(g, stations) {
  const vertices = [],
    indices = [],
    geo = new T.BufferGeometry();
  for (const [x, top, low] of stations) {
    const ridge = low + (top - low) * 0.37;
    const bevel = Math.min(0.03, (top - low) * 0.21);
    vertices.push(x, top, 0, x, ridge, bevel, x, low, 0, x, ridge, -bevel);
  }
  for (const [material, faces] of [
    [0, [0, 3]],
    [1, [1, 2]],
  ]) {
    const start = indices.length;
    for (const j of faces)
      for (let i = 1; i < stations.length; i++) {
        const a = (i - 1) * 4 + j,
          b = (i - 1) * 4 + ((j + 1) % 4);
        indices.push(a, b, a + 4, b, b + 4, a + 4);
      }
    geo.addGroup(start, indices.length - start, material);
  }
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  geo.dispose();
  steel.side = edge.side = T.DoubleSide;
  mesh(g, flat, [steel, edge]);
}
export function weapon(parent, d) {
  const prop = group(parent),
    body = group(prop),
    pivot = group(body, 0.255, 0, 0),
    arms = [];
  const tint = mat(d.color, 0.46, 0.32),
    t = d.type;
  blade(pivot, d.stations);
  if (t === "butterfly") {
    for (const side of [-1, 1]) {
      const h = group(pivot, 0, side * 0.035, side * 0.035);
      arms.push(h);
      plate(
        h,
        [
          [0.015, 0.023],
          [-0.19, 0.036],
          [-0.48, 0.08],
          [-0.56, 0.067],
          [-0.55, 0.015],
          [-0.24, -0.023],
          [0.012, -0.024],
        ].map(([x, y]) => [x, side * y]),
        0.039,
        tint,
        [
          [-0.32, side * 0.028, 0.016],
          [-0.44, side * 0.044, 0.018],
        ],
      );
      rivet(h, 0, 0, 0.028);
      rivet(h, -0.51, side * 0.043, 0.027);
    }
  } else if (t === "pair") {
    pivot.rotation.z = Math.PI / 2;
    pivot.position.set(0, 0.055, 0);
    plate(
      body,
      [
        [-0.22, 0.025],
        [-0.09, 0.07],
        [0, 0.04],
        [0.09, 0.07],
        [0.22, 0.025],
        [0.2, -0.067],
        [-0.2, -0.067],
      ],
      0.11,
      tint,
    );
  } else {
    const hooked = ["ring", "talon"].includes(t),
      holed = t === "skeleton",
      fold = ["navaja", "flip", "stiletto"].includes(t);
    const tail = hooked
      ? 0.18
      : t === "bowie"
        ? 0.11
        : t === "navaja"
          ? 0.09
          : 0;
    const profiles = {
      bayonet: [
        [-0.31, 0.057],
        [-0.27, 0.082],
        [-0.23, 0.06],
        [0.19, 0.06],
        [0.23, 0.075],
        [0.25, -0.07],
        [0.19, -0.057],
        [-0.24, -0.058],
        [-0.27, -0.079],
        [-0.31, -0.055],
      ],
      m9: [
        [-0.31, 0.072],
        [-0.23, 0.1],
        [-0.15, 0.079],
        [0.19, 0.081],
        [0.25, 0.11],
        [0.25, -0.09],
        [0.12, -0.079],
        [0.08, -0.058],
        [-0.13, -0.081],
        [-0.27, -0.098],
        [-0.31, -0.067],
      ],
      stiletto: [
        [-0.31, 0.008],
        [-0.25, 0.045],
        [0.19, 0.047],
        [0.24, 0.031],
        [0.24, -0.039],
        [0.14, -0.046],
        [-0.22, -0.051],
        [-0.3, -0.03],
      ],
      navaja: [
        [-0.3, 0.005],
        [-0.28, 0.054],
        [-0.15, 0.089],
        [-0.027, 0.078],
        [0.14, 0.052],
        [0.22, 0.064],
        [0.26, 0.035],
        [0.26, -0.039],
        [0.11, -0.059],
        [-0.045, -0.039],
        [-0.18, -0.058],
        [-0.26, -0.042],
      ],
      bowie: [
        [-0.34, 0.086],
        [-0.29, 0.13],
        [-0.22, 0.108],
        [-0.1, 0.079],
        [0.16, 0.068],
        [0.24, 0.084],
        [0.25, -0.079],
        [0.1, -0.06],
        [-0.025, -0.079],
        [-0.15, -0.067],
        [-0.25, -0.035],
        [-0.31, -0.054],
      ],
      gut: [
        [-0.3, 0.075],
        [-0.21, 0.091],
        [0.07, 0.07],
        [0.22, 0.11],
        [0.26, 0.057],
        [0.25, -0.098],
        [0.17, -0.077],
        [0.12, -0.04],
        [0.052, -0.063],
        [-0.012, -0.05],
        [-0.095, -0.075],
        [-0.16, -0.059],
        [-0.24, -0.09],
        [-0.29, -0.065],
      ],
      huntsman: [
        [-0.32, 0.03],
        [-0.26, 0.077],
        [0.14, 0.084],
        [0.24, 0.107],
        [0.25, -0.113],
        [0.19, -0.094],
        [0.115, -0.04],
        [0.047, -0.067],
        [-0.05, -0.042],
        [-0.15, -0.071],
        [-0.27, -0.066],
      ],
      flip: [
        [-0.29, -0.007],
        [-0.23, 0.067],
        [-0.085, 0.084],
        [0.16, 0.078],
        [0.26, 0.05],
        [0.26, -0.048],
        [0.18, -0.077],
        [0.1, -0.043],
        [-0.045, -0.057],
        [-0.16, -0.084],
        [-0.24, -0.077],
      ],
      kukri: [
        [-0.32, 0.117],
        [-0.24, 0.116],
        [-0.16, 0.073],
        [0.05, 0.058],
        [0.21, 0.097],
        [0.26, 0.045],
        [0.25, -0.076],
        [0.15, -0.073],
        [-0.02, -0.048],
        [-0.16, -0.027],
        [-0.27, 0.01],
        [-0.33, -0.012],
      ],
      ursus: [
        [-0.28, 0.034],
        [-0.24, 0.068],
        [0.15, 0.069],
        [0.24, 0.058],
        [0.24, -0.065],
        [0.13, -0.071],
        [-0.22, -0.071],
        [-0.28, -0.034],
      ],
    };
    const points =
      profiles[t] ??
      (hooked
        ? [
            [-0.25, 0.12],
            [-0.16, 0.13],
            [0.1, 0.075],
            [0.27, 0.028],
            [0.25, -0.077],
            [0.14, -0.04],
            [0.08, -0.08],
            [0, -0.05],
            [-0.08, -0.04],
            [-0.2, 0.018],
          ]
        : [
            [-0.28, tail + 0.03],
            [-0.21, tail + 0.074],
            [-0.06, 0.07],
            [0.14, 0.064],
            [0.24, 0.082],
            [0.26, -0.055],
            [0.16, -0.054],
            [0.085, -0.069],
            [-0.085, -0.07],
            [-0.21, tail - 0.08],
            [-0.29, tail - 0.051],
          ]);
    plate(
      body,
      points,
      holed ? 0.05 : 0.09,
      holed ? steel : tint,
      holed
        ? [
            [-0.16, 0, 0.042],
            [0, 0, 0.05],
            [0.15, 0, 0.034],
          ]
        : [],
    );
    if (hooked) ring(body, -0.27, 0.115, 0.091, t === "talon" ? pin : hardware);
    if (!holed) {
      rivet(body, -0.19, tail, 0.056);
      rivet(body, 0.19, 0.005, 0.056);
    }
    if (
      ["bayonet", "m9", "bowie", "classic", "stiletto", "huntsman"].includes(t)
    ) {
      const span = t === "stiletto" ? 0.11 : t === "bowie" ? 0.19 : 0.145;
      plate(
        body,
        [
          [0.195, -span],
          [0.254, -span],
          [0.27, span],
          [0.214, span],
        ],
        0.09,
        hardware,
      );
      if (t === "m9" || t === "bayonet")
        ring(body, 0.233, 0.196, 0.052, hardware);
    }
    if (["m9", "bayonet", "ursus", "huntsman"].includes(t))
      for (let i = 0; i < 6; i++) {
        const x = -0.16 + i * 0.058;
        plate(
          body,
          [
            [x, -0.056],
            [x + 0.015, -0.06],
            [x + 0.04, 0.055],
            [x + 0.024, 0.06],
          ],
          0.098,
          hardware,
        );
      }
    if (t === "stiletto" || t === "navaja") {
      plate(
        body,
        [
          [-0.23, 0.021],
          [-0.18, 0.037],
          [0.11, 0.031],
          [0.15, 0.012],
          [0.12, -0.028],
          [-0.17, -0.025],
        ],
        0.101,
        t === "stiletto" ? pin : tint,
      );
    }
    if (t === "bowie" || t === "gut" || t === "kukri") {
      for (const x of [-0.11, 0.08]) {
        const y = x < 0 && t === "kukri" ? 0.027 : 0;
        rivet(body, x, y, 0.064);
      }
    }
    if (t === "flip") {
      const clip = plate(
        body,
        [
          [-0.22, 0.01],
          [-0.15, 0.036],
          [0.04, 0.018],
          [0.066, 0.001],
          [-0.12, 0.002],
          [-0.2, -0.017],
        ],
        0.016,
        hardware,
      );
      clip.position.z = 0.068;
    }
    if (fold) rivet(body, 0.248, 0.003, 0.062);
  }
  return { prop, body, pivot, arms };
}
