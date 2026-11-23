import * as T from './vendor/three.js';
import {hand} from './hands.js';
import {weapon} from './models.js';
import {Animator,Locomotion} from './motion.js';
function reflections(renderer){
 const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
 const g=ctx.createLinearGradient(0,0,0,256);['#fff3dd','#a2c2d3','#394047','#a89578','#6c5649'].forEach((v,i)=>g.addColorStop(i/4,v));ctx.fillStyle=g;ctx.fillRect(0,0,512,256);
 ctx.fillStyle='#fff';ctx.fillRect(35,35,95,76);ctx.fillRect(320,55,43,68);
 const tex=new T.CanvasTexture(c);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;
 const gen=new T.PMREMGenerator(renderer),target=gen.fromEquirectangular(tex);tex.dispose();gen.dispose();return target
}
export class View{
 constructor(renderer){
 this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(54,1,.025,12);
 this.env=reflections(renderer);this.scene.environment=this.env.texture;
 this.scene.add(new T.HemisphereLight(0xffeed9,0x778991,1.7));const key=new T.DirectionalLight(0xffedcd,2.5);key.position.set(-2,4,3);this.scene.add(key);
 this.right=hand(this.scene,-1);this.left=hand(this.scene,1);
 this.locomotion=new Locomotion();this.cache=new Map();this.clock=this.phase=this.swayX=this.swayY=this.dip=this.dipV=this.bob=this.lean=0;this.lastGround=true;this.offset=0;this.pending=null
 }
 select(d){
 if(!this.model){this.swap(d);return}
 this.pending=d
 }
 swap(d){
 this.anim?.dispose();if(this.model)this.model.prop.visible=false;if(this.twin)this.twin.prop.visible=false;
 this.data=d;if(!this.cache.has(d.type))this.cache.set(d.type,weapon(this.right.socket,d));
 this.model=this.cache.get(d.type);this.model.prop.visible=true;
 if(d.type==='pair'){this.twin??=weapon(this.left.socket,d);this.twin.prop.visible=true}
 this.anim=new Animator(d.type)
 }
 play(name){if(!this.pending)this.anim.play(name)}
 update(dt,{speed,ground,vY,crouch,sprint,dx,dy,motion,fov,aspect}){
 this.clock+=dt;this.phase+=dt*speed*1.65;
 const smooth=1-Math.exp(-dt*10),smoothFast=1-Math.exp(-dt*18);
 if(this.pending===this.data)this.pending=null;
 this.offset+=((this.pending?1:0)-this.offset)*(1-Math.exp(-dt*22));
 if(this.pending&&this.offset>.92){this.swap(this.pending);this.pending=null}
 if(ground&&!this.lastGround)this.dipV-=1.45;this.lastGround=ground;
 this.dipV+=(-this.dip*150-this.dipV*19)*dt;this.dip+=this.dipV*dt;
 this.swayX+=(T.MathUtils.clamp(dx*1.5,-.1,.1)-this.swayX)*smoothFast;
 this.swayY+=(T.MathUtils.clamp(dy,-.07,.07)-this.swayY)*smoothFast;
 this.bob+=((ground?Math.min(1,speed/8):0)-this.bob)*smooth;
 this.lean+=((sprint&&speed>5?1:0)-this.lean)*smooth;
 const loc=this.locomotion.update(dt,ground,vY,crouch,sprint,speed);
 const p=this.anim.update(dt,speed<.3,motion),paired=this.data.type==='pair';
 const breathing=motion?Math.sin(this.clock*1.65)*.009:0;
 const camAspect=Math.max(.7,aspect);this.camera.aspect=aspect;this.camera.fov=fov;this.camera.updateProjectionMatrix();
 const z=-1.22*Math.max(1,1.46/camAspect)*Math.tan(54*Math.PI/360)/Math.tan(fov*Math.PI/360);
 for(const [h,sign] of [[this.right,1],[this.left,-1]]){
 const main=sign===1,k=main?1:paired?.78:.21,shift=main?p.inward:paired?p.inward*.76:p.support*.095;
 h.mount.position.set(sign*((main?.56:.51)-shift)+this.swayX+Math.sin(this.phase)*this.bob*.019,
 (main?-.34:paired?-.36:-.44)+p.lift*k+breathing+Math.cos(this.phase*2)*this.bob*.014+loc.drop+this.dip+this.swayY-this.offset*.63+(crouch?.025:0),z+(main?0:-.06));
 h.mount.rotation.set(-.12+loc.pitch+p.tilt*k+T.MathUtils.clamp(vY*.014,-.14,.12),sign*(main?-.42:.49)+p.turn*k*sign,sign*(-.14+p.roll*k-loc.bank-this.lean*.15)+(main?0:p.support*.26));
 for(let i=0;i<5;i++)for(let j=1;j<3;j++){const open=main?p.open:paired?p.open*.84:.56+p.support*.23;
 h.fingers[i][j].rotation.x=(i===4?-.32:.67)*open*(i===0&&['talon','ring','skeleton'].includes(this.data.type)?.28:1)}
 }
 const spin=p.spin,model=this.model,t=this.data.type;
 const anchor=t==='ring'||t==='talon'?[-.27,.115]:t==='skeleton'?[-.16,0]:[0,0];
 model.prop.rotation.z=spin;model.prop.position.set(anchor[0],anchor[1]+p.toss,0);model.body.position.set(-anchor[0],-anchor[1],0);
 if(t==='butterfly'){model.arms[0].rotation.z=p.hinge*2.85;model.arms[1].rotation.z=-p.hinge*2.81+.34*Math.sin(spin)}
 if(['navaja','flip','stiletto'].includes(t))model.pivot.rotation.z=p.hinge*2.9;
 if(paired){this.twin.prop.rotation.y=-p.support*.48;this.twin.prop.rotation.z=p.roll*.45}
 }
 render(renderer){renderer.clearDepth();renderer.render(this.scene,this.camera)}
}
