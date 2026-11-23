import * as T from "./vendor/three.js";
import { group, mesh, mat } from "./models.js";

const url = (name) => new URL("./assets/" + name, import.meta.url);
const [data, bytes] = await Promise.all([
  fetch(url("glove.json")).then((r) => r.json()),
  fetch(url("glove.bin")).then((r) => r.arrayBuffer()),
]);
const rest = data.joints.map((v) => new T.Vector3(...v));
const geometry = new T.BufferGeometry();
let offset = 0;
function attribute(name, ArrayType, width, count = data.vertices) {
  const buffer = new ArrayType(bytes, offset, count * width);
  offset += buffer.byteLength;
  const attr = new T.BufferAttribute(buffer, width);
  if (name) geometry.setAttribute(name, attr);
  else geometry.setIndex(attr);
}
attribute("position", Float32Array, 3);
attribute("normal", Float32Array, 3);
attribute("uv", Float32Array, 2);
attribute("skinIndex", Uint8Array, 4);
attribute("skinWeight", Float32Array, 4);
attribute(null, Uint16Array, 1, data.triangles * 3);

function textile() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const weave = (((x + y) >> 1) % 3 === 0 ? 18 : 0) + ((x ^ y) & 3) * 3;
      pixels.data.set(
        [172 + weave, 172 + weave, 172 + weave, 255],
        (y * 256 + x) * 4,
      );
    }
  ctx.putImageData(pixels, 0, 0);
  const map = new T.CanvasTexture(c);
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = 4;
  return map;
}
const weave = textile(),
  glove = mat("#555a53", 0.88, 0.02);
glove.map = weave;
glove.bumpMap = weave;
glove.bumpScale = 0.0012;
const patch = new T.Color("#575f5a"),
  palmColor = new T.Color("#252c2c"),
  colors = [];
for (let i = 0; i < data.vertices; i++) {
  const z = geometry.attributes.normal.getZ(i),
    y = geometry.attributes.position.getY(i);
  const blend =
    T.MathUtils.smoothstep(z, -0.2, 0.65) *
    T.MathUtils.smoothstep(y, -0.15, -0.08);
  colors.push(...palmColor.clone().lerp(patch, blend).toArray());
}
geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
glove.color.set("#ddddda");
glove.vertexColors = true;
// The stitched panels use bind-pose coordinates, so their edges deform with the glove.
glove.onBeforeCompile = (shader) => {
  shader.vertexShader =
    "varying vec3 glovePoint; varying float backFacing;\n" +
    shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n glovePoint=position;backFacing=normal.z;",
    );
  shader.fragmentShader =
    "varying vec3 glovePoint; varying float backFacing;\n" +
    shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
 vec2 panelPoint=glovePoint.xy;
 float seam=panelPoint.y-(.045-.32*abs(panelPoint.x)+.009*cos(panelPoint.x*39.));
 float back=smoothstep(-.1,.6,backFacing);
 float reinforcement=smoothstep(-.002,.002,seam)*(1.-smoothstep(.18,.25,panelPoint.y));
 diffuseColor.rgb*=mix(vec3(1.),vec3(.42,.49,.50),reinforcement*back);
 float stitches=(1.-smoothstep(.0009,.0025,abs(seam+.004)))*smoothstep(-.18,.22,cos(panelPoint.x*780.));
 diffuseColor.rgb+=vec3(.065,.058,.048)*stitches*back;
 float strap=1.-smoothstep(.019,.024,abs(panelPoint.y+.115+.09*panelPoint.x));
 diffuseColor.rgb*=1.-.53*strap;
 `,
    );
};

const canvas = mat("#555d54", 0.96),
  cuff = mat("#262f2c", 0.9);
canvas.map = weave;
canvas.bumpMap = weave;
canvas.bumpScale = 0.003;
function sleeve(parent) {
  const sections = [
    [-0.57, -0.8, 0.56, 0.19, 0.18],
    [-0.35, -0.54, 0.36, 0.155, 0.14],
    [-0.21, -0.38, 0.23, 0.141, 0.122],
    [-0.16, -0.32, 0.17, 0.15, 0.129],
    [-0.12, -0.285, 0.14, 0.124, 0.108],
    [-0.085, -0.245, 0.105, 0.139, 0.116],
    [-0.057, -0.218, 0.084, 0.13, 0.107],
    [-0.03, -0.195, 0.064, 0.107, 0.088],
    [0.008, -0.149, 0.033, 0.101, 0.078],
  ];
  const p = [],
    uv = [],
    idx = [],
    geo = new T.BufferGeometry(),
    n = 32;
  sections.forEach(([x, y, z, w, h], i) => {
    for (let j = 0; j <= n; j++) {
      const a = (2 * Math.PI * j) / n,
        fold = 1 + 0.035 * Math.cos(5 * a + i * 0.65);
      p.push(
        x + w * Math.cos(a) * fold,
        y + 0.45 * h * Math.sin(a),
        z + h * Math.sin(a) * fold,
      );
      uv.push(j / n, i * 0.4);
      if (i && j) {
        const v = i * (n + 1) + j;
        idx.push(v - n - 2, v - 1, v, v - n - 2, v, v - n - 1);
      }
    }
    if (i) geo.addGroup((i - 1) * n * 6, n * 6, i >= 7 ? 1 : 0);
  });
  geo.setIndex(idx);
  geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  mesh(parent, geo, [canvas, cuff]);
}
const chains = [
  [6, 7, 8, 9],
  [11, 12, 13, 14],
  [16, 17, 18, 19],
  [21, 22, 23, 24],
  [1, 2, 3, 4],
];
export function hand(scene, side) {
  const mount = group(scene),
    wrist = group(mount),
    palm = group(wrist),
    socket = group(wrist, 0, 0.123, -0.087);
  sleeve(wrist);
  const bones = rest.map(() => new T.Bone());
  for (let i = 0; i < bones.length; i++) {
    const parent = i === 0 ? -1 : [1, 5, 10, 15, 20].includes(i) ? 0 : i - 1;
    bones[i].position.copy(rest[i]);
    if (parent !== -1) {
      bones[i].position.sub(rest[parent]);
      bones[parent].add(bones[i]);
    }
  }
  const skin = new T.SkinnedMesh(geometry, glove);
  skin.add(bones[0]);
  skin.bind(new T.Skeleton(bones));
  skin.frustumCulled = false;
  palm.add(skin);
  wrist.scale.x = side;
  const rotations = chains.map((chain, finger) => {
    let previous = new T.Quaternion();
    return chain.slice(0, -1).map((id, j) => {
      const natural = rest[chain[j + 1]].clone().sub(rest[id]).normalize();
      const targets =
        finger === 4
          ? [
              [0.65, 0.6, -0.38],
              [-0.32, 0.84, -0.38],
              [-0.92, 0.24, -0.1],
            ]
          : [
              [0.04, 0.49, -0.87],
              [0.03, -0.94, -0.34],
              [0, -0.8, 0.6],
            ];
      const target = new T.Vector3(...targets[j]).normalize();
      const worldQ = new T.Quaternion().setFromUnitVectors(natural, target);
      const local = previous.clone().invert().multiply(worldQ);
      previous = worldQ;
      return { joint: bones[id], local };
    });
  });
  function pose(open, supporting = false) {
    for (const [i, chain] of rotations.entries())
      for (const { joint, local } of chain)
        joint.quaternion
          .identity()
          .slerp(
            local,
            1 -
              T.MathUtils.clamp(
                open + (supporting ? [0.17, 0.06, -0.04, -0.13, 0.39][i] : 0),
                0,
                1,
              ) *
                0.82,
          );
  }
  pose(0);
  return { mount, wrist, palm, socket, pose };
}
