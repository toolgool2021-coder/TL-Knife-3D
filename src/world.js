import * as THREE from './vendor/three.js';
export function arena(scene){
const material=(color,roughness=1,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});const sand=material('#ab956f'),stone=material('#bca785'),stone2=material('#d8c2a0'),plaster=material('#d4bea0'),roof=material('#8f735d'),wood=material('#69503c'),metal=material('#515b62',.4,.7),dark=material('#605d53');
const solids=[], batches=new Map();
function box(x,y,z,w,h,d,m,collision=true){const o=new THREE.Object3D();o.position.set(x,y,z);o.scale.set(w,h,d);o.updateMatrix();
if(!batches.has(m))batches.set(m,[]);batches.get(m).push(o.matrix);if(collision)solids.push({x,y,z,w,h,d});return o}
function wall(x,z,w,d,h=10,m=plaster){box(x,h/2,z,w,h,d,m)}
function building(x,z,w,d,h=21){box(x,h/2,z,w,h,d,stone);box(x,h+.35,z,w+.8,.7,d+.8,roof,false);for(let side of [-1,1])for(let i=-1;i<=1;i++){box(x+i*(w/3),h*.6,z+side*(d/2+.1),2.1,3.0,.2,dark,false);box(x+i*(w/3),h*.6,z+side*(d/2+.25),1.5,2.5,.3,wood,false)}}
function crate(x,z,s=3){box(x,s/2,z,s,s,s,wood);for(let side of [-1,1]){box(x,s/2,z+side*(s/2+.09),s*.85,.16,.13,stone2,false);box(x+side*(s/2+.09),s/2,z,.13,.16,s*.85,stone2,false);box(x,s/2+side*s*.42,z,s*.9,.14,s*.9,metal,false)}}
function arch(x,z,w=11,h=11,d=4,axis='x'){if(axis==='x'){box(x-w/2-1,h/2,z,2,h,d,plaster);box(x+w/2+1,h/2,z,2,h,d,plaster);box(x,h-1,z,w+4,2,d,plaster)}else{box(x,h/2,z-w/2-1,d,h,2,plaster);box(x,h/2,z+w/2+1,d,h,2,plaster);box(x,h-1,z,d,2,w+4,plaster)}}
box(0,-.8,0,220,1.6,220,sand,false);box(0,-.35,0,175,.7,175,stone,false);
wall(0,-92,186,4,20);wall(0,92,186,4,20);wall(-92,0,4,186,20);wall(92,0,4,186,20);
[[-70,-66,32,30,25],[-31,-71,33,21,22],[60,-70,46,24,22],[75,-12,22,34,20],[-68,40,35,40,24],[59,58,44,40,24],[4,74,33,18,18],[-14,31,19,29,19]].forEach(p=>building(...p));
[[-39,-26,4,41,11],[-46,4,20,4,10],[34,-28,4,38,13],[47,11,29,4,13],[-20,-43,19,3,11],[9,-48,24,3,11],[-25,48,23,3,9],[23,48,28,3,9],[-51,22,3,23,13],[22,17,3,29,9],[67,29,3,24,12],[-2,-5,3,18,9]].forEach(p=>wall(...p));
arch(-2,-24,12,12,4);arch(-23,1,10,9,3,'z');arch(37,34,10,10,4);arch(-47,64,12,10,4);
box(-6,4,4,5,8,1.4,wood);box(6,4,4,5,8,1.4,wood);box(-6,4,4.8,.2,7.5,.4,metal,false);box(6,4,4.8,.2,7.5,.4,metal,false);
[[-44,-43,4],[-37,-40,3],[-59,14,3],[-54,18,2.6],[45,-34,4],[50,-27,3],[60,39,4],[57,44,3],[-11,66,3],[21,60,3],[2,-63,3],[13,-65,2.8],[24,10,3],[-30,28,3]].forEach(p=>crate(...p));
for(let i=0;i<6;i++){box(-65+i*2.6,.35+i*.42,-10,2.6,.7+i*.84,12,stone2);box(49-i*2.5,.35+i*.42,-48,2.5,.7+i*.84,10,stone2)}
box(-66,1.5,9,12,3,9,stone);box(46,1.5,-49,9,3,13,stone);
for(const [x,z] of [[-66,9],[55,38]]){const ring=new THREE.Mesh(new THREE.RingGeometry(6.2,6.65,56),new THREE.MeshBasicMaterial({color:0xc5754b,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.04,z);scene.add(ring)}
for(const [x,z] of [[-52,-48],[-52,29],[28,-48],[39,44],[0,43]]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,7,8),metal);post.position.set(x,3.5,z);scene.add(post);}
for(const m of [sand,stone,plaster,wood]){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),im=g.createImageData(128,128);
 let seed=7123;for(let i=0;i<128*128;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=201+(seed>>>27)+(m===wood?Math.sin(i%128*.65)*14:0);
 im.data.set([v,v,v,255],4*i)}g.putImageData(im,0,0);m.map=new THREE.CanvasTexture(c);m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;m.bumpMap=m.map;m.bumpScale=.045;
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
 #ifdef USE_INSTANCING
 vec3 wp=(instanceMatrix*vec4(position,1.)).xyz;
 vMapUv=(abs(normal.y)>.5?wp.xz:abs(normal.x)>.5?wp.zy:wp.xy)*.32;
 vBumpMapUv=vMapUv;
 #endif`)}
}
for(const [x,z] of [[-2,-24],[37,34],[-47,64]]){
 for(let i=0;i<15;i++){const a=(i+.5)*Math.PI/15,o=box(x+6*Math.cos(a),5+5*Math.sin(a),z,1.42,1.9,4.15,stone2,false);o.rotation.z=a-Math.PI/2;o.updateMatrix()}
}
for(const [m,matrices] of batches){const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(),m,matrices.length);matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));batch.castShadow=batch.receiveShadow=true;scene.add(batch)}
// Baked contact shading under architectural masses.
const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(32,32,4,32,32,32);grad.addColorStop(0,'#311d13b0');grad.addColorStop(1,'#311d1300');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
const footprints=solids.filter(s=>s.w>3&&s.d>3),ao=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}),footprints.length);
footprints.forEach((s,i)=>{const o=new THREE.Object3D();o.position.set(s.x,.018,s.z);o.rotation.x=-Math.PI/2;o.scale.set(s.w+5,s.d+5,1);o.updateMatrix();ao.setMatrixAt(i,o.matrix)});scene.add(ao);return solids}
