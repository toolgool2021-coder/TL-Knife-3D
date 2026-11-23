import * as T from './vendor/three.js';
export const mat=(color,roughness=.55,metalness=.1)=>new T.MeshStandardMaterial({color,roughness,metalness});
const steel=mat('#cedde3',.23,.9), edge=mat('#f1f5f5',.14,.92), hardware=mat('#333d41',.33,.78), pin=mat('#c0a876',.3,.72);
export function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g}
export function mesh(parent,geo,m){const o=new T.Mesh(geo,m);parent.add(o);return o}
function plate(parent,outline,depth,m,holes=[]){
  const s=new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));
  for(const [x,y,r] of holes){const p=new T.Path();p.absarc(x,y,r,0,Math.PI*2,true);s.holes.push(p)}
  const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:14});
  geo.translate(0,0,-depth/2);return mesh(parent,geo,m);
}
function ring(g,x,y,r,m){const o=mesh(g,new T.TorusGeometry(r,.022,10,32),m);o.position.set(x,y,0)}
function rivet(g,x,y,z){const o=mesh(g,new T.CylinderGeometry(.019,.019,.013,12),pin);o.rotation.x=Math.PI/2;o.position.set(x,y,z)}
function blade(g,stations){
 const vertices=[],indices=[],geo=new T.BufferGeometry();
 for(const [x,top,low] of stations){const ridge=low+(top-low)*.37;vertices.push(x,top,0,x,ridge,.032,x,low,0,x,ridge,-.032)}
 for(const [material,faces] of [[0,[0,3]],[1,[1,2]]]){const start=indices.length;for(const j of faces)for(let i=1;i<stations.length;i++){const a=(i-1)*4+j,b=(i-1)*4+(j+1)%4;indices.push(a,b,a+4,b,b+4,a+4)}geo.addGroup(start,indices.length-start,material)}
 geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);const flat=geo.toNonIndexed();flat.computeVertexNormals();geo.dispose();steel.side=edge.side=T.DoubleSide;mesh(g,flat,[steel,edge]);
}
export function weapon(parent,d){
 const prop=group(parent),body=group(prop),pivot=group(body,.255,0,0),arms=[];
 const tint=mat(d.color,.46,.32),t=d.type;blade(pivot,d.stations);
 if(t==='butterfly'){
  for(const side of [-1,1]){const h=group(pivot,0,side*.035,side*.035);arms.push(h);
   plate(h,[[.015,.023],[-.19,.036],[-.48,.08],[-.56,.067],[-.55,.015],[-.24,-.023],[.012,-.024]].map(([x,y])=>[x,side*y]),.039,tint,[[-.32,side*.028,.016],[-.44,side*.044,.018]]);
   rivet(h,0,0,.028);rivet(h,-.51,side*.043,.027)}
 }else if(t==='pair'){
   pivot.rotation.z=Math.PI/2;pivot.position.set(0,.055,0);
   plate(body,[[-.22,.025],[-.09,.07],[0,.04],[.09,.07],[.22,.025],[.20,-.067],[-.2,-.067]],.11,tint);
 }else{
 const hooked=['ring','talon'].includes(t),holed=t==='skeleton',fold=['navaja','flip','stiletto'].includes(t);
 const tail=hooked?.18:t==='bowie'?.11:t==='navaja'?.09:0;
 const points=hooked?[[-.25,.12],[-.16,.13],[.10,.075],[.27,.028],[.25,-.077],[.14,-.04],[.08,-.08],[0,-.05],[-.08,-.04],[-.20,.018]] :
 [[-.28,tail+.03],[-.21,tail+.074],[-.06,.07],[.14,.064],[.24,.082],[.26,-.055],[.16,-.054],[.085,-.069],[-.085,-.07],[-.21,tail-.08],[-.29,tail-.051]];
 plate(body,points,holed?.05:.09,holed?steel:tint,holed?[[-.16,0,.042],[0,0,.05],[.15,0,.034]]:[]);
 if(hooked)ring(body,-.27,.115,.091,t==='talon'?pin:hardware);
 if(!holed){rivet(body,-.19,tail,.056);rivet(body,.19,.005,.056)}
 if(['bayonet','m9','bowie','classic','stiletto','huntsman'].includes(t)){
 const span=t==='stiletto'?.11:t==='bowie'?.19:.145;
 plate(body,[[.195,-span],[.254,-span],[.27,span],[.214,span]],.09,hardware);
 if(t==='m9'||t==='bayonet')ring(body,.233,.196,.052,hardware)}
 if(['m9','bayonet','ursus','huntsman'].includes(t))for(let i=0;i<6;i++){
 const x=-.16+i*.058;plate(body,[[x,-.056],[x+.015,-.06],[x+.04,.055],[x+.024,.06]],.098,hardware)}
 if(fold)rivet(body,.248,.003,.062);
 }
 return {prop,body,pivot,arms};
}
