import * as T from './vendor/three.js';
import {group,mesh,mat} from './models.js';
const leather=mat('#30363a',.79),suede=mat('#675e4b',.94),shell=mat('#242b2c',.43),cloth=mat('#575e55',.95),thread=mat('#b5a58a',.83);
function fabric(material){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#aaa';ctx.fillRect(0,0,64,64);
 for(let y=0;y<64;y+=3)for(let x=0;x<64;x+=4){ctx.fillStyle=(x+y)%2?'#666':'#ccc';ctx.fillRect(x+y%2,y,2,1)}
 const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,3);material.bumpMap=tex;material.bumpScale=.002;
}
fabric(leather);fabric(cloth);
// Elliptical cross sections follow the local tangent, including the bent fingertips.
// Neighbouring joints share vertices through skin weights.
function loft(parent,rows,m,bones=null){
 const pos=[],uv=[],ix=[],weights=[],skin=[],N=16;
 rows.forEach(([x,y,z,rx,rz,j=0,w=0],i)=>{
 const a=rows[Math.max(i-1,0)],b=rows[Math.min(i+1,rows.length-1)],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dy,dz)||1;
 for(let k=0;k<=N;k++){const th=k*2*Math.PI/N,c=Math.cos(th),s=Math.sin(th);
 pos.push(x+rx*c,y-rz*s*dz/len,z+rz*s*dy/len);uv.push(k/N,i/(rows.length-1));
 skin.push(j,Math.min(j+1,(bones?.length||1)-1),0,0);weights.push(1-w,w,0,0);
 if(i&&k){const v=i*(N+1)+k;ix.push(v-N-2,v,v-1,v-N-2,v-N-1,v)}}
 });
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();m.side=T.DoubleSide;
 if(!bones)return mesh(parent,geo,m);
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skin,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));const o=new T.SkinnedMesh(geo,m);o.add(bones[0]);parent.add(o);o.updateMatrixWorld(true);o.bind(new T.Skeleton(bones));o.frustumCulled=false;return o;
}
function seam(parent,pts){
 const c=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));mesh(parent,new T.TubeGeometry(c,14,.0022,5,false),thread)
}
export function hand(scene,side){
 const mount=group(scene),wrist=group(mount);wrist.scale.x=side;
 const socket=group(wrist,0,.12,-.043);
 loft(wrist,[[-.55,-.77,.52,.19,.15],[-.38,-.56,.37,.17,.14],[-.22,-.4,.25,.148,.12],[-.16,-.33,.2,.16,.13],[-.12,-.28,.15,.14,.115],[-.07,-.23,.10,.145,.109],[-.035,-.17,.06,.115,.091]],cloth);
 loft(wrist,[[-.065,-.235,.10,.124,.102],[-.048,-.215,.08,.14,.103],[-.018,-.145,.037,.13,.097],[0,-.13,.03,.115,.082]],shell);
 loft(wrist,[[0,-.168,.04,.104,.071],[.006,-.116,.018,.119,.075],[.006,-.025,0,.15,.082],[.004,.046,.001,.172,.077],[0,.113,.003,.164,.064],[0,.137,.005,.14,.045]],leather);
 seam(wrist,[[-.092,-.12,.073],[-.13,-.015,.055],[-.135,.065,.053],[-.09,.1,.063]]);
 seam(wrist,[[.08,-.12,.074],[.115,-.025,.065],[.132,.057,.057]]);
 const fingers=[];
 for(let i=0;i<5;i++){
 const thumb=i===4,x=thumb?.138:.119-i*.078,L=thumb?.87:[1,1.07,1,.82][i];
 const path=thumb?[[x,-.045,.017],[.183,.016,.004],[.182,.075,-.055],[.135,.103,-.086],[.09,.105,-.085]]:
 [[x,.06,.023],[x,.123,.043],[x,.174*L,.004],[x,.168*L,-.066],[x,.12*L,-.103],[x,.087*L,-.085]];
 const bones=[new T.Bone(),new T.Bone(),new T.Bone()];const breaks=thumb?[0,1,2]:[0,2,3];
 bones.forEach((bone,j)=>{bone.position.fromArray(path[breaks[j]]);if(j){bone.position.sub(new T.Vector3(...path[breaks[j-1]]));bones[j-1].add(bone)}});
 const rows=path.map(([px,y,z],k)=>{const j=k>=breaks[2]?2:k>=breaks[1]?1:0;const radius=(thumb?.045:.038)*L*(1-k*.056);return [px,y,z,k===path.length-1?.009:radius,k===path.length-1?.009:radius*.91,j,k===1?.27:0]});
 loft(wrist,rows,i===4?suede:leather,bones);fingers.push(bones);
 if(!thumb){const o=mesh(wrist,new T.SphereGeometry(1,12,8),shell);o.position.set(x,.083,.065);o.scale.set(.034,.042,.023)}
 }
 const patch=mesh(wrist,new T.SphereGeometry(1,20,12),suede);patch.position.set(-.012,-.03,.065);patch.scale.set(.106,.073,.019);
 return {mount,wrist,socket,fingers};
}
