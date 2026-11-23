import * as T from './vendor/three.js';
// A pose encodes staging, wrist attitude, prop travel and articulation independently.
const channels=['inward','lift','roll','turn','tilt','spin','toss','open','hinge','support'];
const poses={
 rest:[], show:[.23,.17,.23,-.58,.17,0,0,.12,0,.28],reverse:[.18,.19,-.18,.91,-.24,0,0,.08,0,.43],
 balance:[.25,.22,.45,-.12,.43,0,.018,.26,0,.52],low:[.02,-.08,-.43,.3,-.27,0,0,0,0,-.15],
 curl:[.12,.12,.63,-.48,-.26,-1.55,0,.66,.97,.13],fan:[.16,.22,-.36,.35,.11,-3.42,0,.82,.1,.26],
 catch:[.07,.04,.24,-.13,-.12,-6.28,0,.06,0,.15],orbit:[.17,.18,-.55,-.22,.18,-4.75,0,.78,0,.33],
 loft:[.1,.08,-.4,.22,-.18,-2.6,.32,.94,0,.55],float:[.14,.13,.22,-.49,.19,-4.65,.28,1,0,.64],
 shut:[.09,.08,.44,.26,.22,0,0,.31,1,.25],snap:[.17,.18,-.48,-.33,.06,0,0,.52,.43,.41],
 reach:[.22,.07,.61,.35,.32,0,0,.18,0,.9],cross:[.28,.21,-.71,-.31,.07,0,0,.11,0,1],
 point:[.1,.17,.82,.43,-.15,0,0,.09,0,-.3],flat:[.24,.14,-.14,-1.19,.38,0,0,.07,0,.54],
 dip:[.04,-.04,.47,.17,-.35,0,0,.11,0,.21]
};
const scripts={
 butterfly:['shut snap show reverse','shut curl fan orbit catch','curl fan orbit catch shut snap'],
 ring:['balance show flat reverse','balance curl orbit catch','reach curl fan orbit catch'],
 m9:['reach flat show balance','dip loft float catch','reach balance loft float catch'],
 bayonet:['point show reverse','reach loft catch','flat dip loft float catch'],
 skeleton:['flat balance reach','point curl fan catch','balance curl orbit catch'],
 talon:['reverse flat point','dip curl orbit catch','flat fan orbit catch'],
 flip:['shut snap flat','dip shut snap point','reverse shut snap reach'],
 gut:['point flat reach','low reach point dip','reach reverse point flat'],
 huntsman:['reach point reverse','dip cross flat','low balance cross reverse'],
 bowie:['low reach flat balance','reach dip loft catch','dip reach loft float catch'],
 stiletto:['shut point flat','shut snap point reverse','reach shut point balance'],
 ursus:['flat reverse balance','low loft catch','reverse dip loft float catch'],
 navaja:['shut show reverse','reach shut snap flat','balance shut snap reverse'],
 pair:['cross reverse reach','dip cross point reach','reach cross low balance cross'],
 classic:['balance flat reverse','point dip cross flat','reverse reach loft catch'],
 kukri:['low flat balance point','dip reach cross low','balance dip cross reverse reach']
};
function clip(name,words,duration){
 const frames=['rest',...words.split(' '),'rest'],times=frames.map((_,i)=>duration*i/(frames.length-1));
 const tracks=channels.map((c,j)=>{const values=frames.map(p=>poses[p][j]||0);
 // A complete revolution returns to the same orientation. Continue on that branch.
 if(c==='spin')for(let i=1;i<values.length;i++)if(values[i]===0&&values[i-1]<-5)values[i]=-Math.PI*2;
 return new T.NumberKeyframeTrack('.'+c,times,values,T.InterpolateSmooth)});
 return new T.AnimationClip(name,duration,tracks)
}
export class Animator{
 constructor(type){
 this.node=new T.Object3D();channels.forEach(k=>this.node[k]=0);this.mixer=new T.AnimationMixer(this.node);
 const [inspect,trick,rare]=scripts[type];
 this.clips={Equip:clip('Equip','low dip',.57),Inspect:clip('Inspect',inspect,2.65),'Inspect Rare':clip('Inspect Rare',rare,3.4),Trick:clip('Trick',trick,1.83),'Idle Variant':clip('Idle Variant','show',3.1)};
 this.clips['Inspect Alternate']=clip('Inspect Alternate',inspect.split(' ').reverse().join(' '),3.05);
 this.time=0;this.count=0;this.play('Equip')
 }
 play(name){
 if(this.action?.isRunning()&&this.action.getClip().name!=='Idle Variant')return;
 if(name==='Inspect'){this.count++;if(this.count%5===0)name='Inspect Rare';else if(this.count%2===0)name='Inspect Alternate'}
 const a=this.mixer.clipAction(this.clips[name]);a.reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;
 if(this.action&&this.action!==a&&this.action.isRunning())a.crossFadeFrom(this.action,.19,false);else if(this.action&&this.action!==a)this.action.stop();a.play();this.action=a;this.time=0
 }
 update(dt,idle,enabled){
 this.mixer.update(dt);this.time=idle?this.time+dt:0;
 if(enabled&&this.time>8&&!this.action.isRunning())this.play('Idle Variant');
 return this.node
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.node)}
}

// Locomotion and gestures use separate mixers so a landing can overlap an inspect.
export class Locomotion{
 constructor(){
 this.node=new T.Object3D();this.node.drop=0;this.node.bank=0;this.node.pitch=0;
 this.mixer=new T.AnimationMixer(this.node);this.actions={};
 const profiles={Idle:[0,0,0],Walk:[-.012,.035,.025],Sprint:[-.045,.27,.1],Jump:[.052,-.09,-.12],Airborne:[.028,-.045,-.06],Landing:[-.054,.06,.11],Crouch:[.035,-.06,.08]};
 for(const [name,v] of Object.entries(profiles)){
 const tracks=['drop','bank','pitch'].map((k,j)=>new T.NumberKeyframeTrack('.'+k,[0,1],[v[j],v[j]]));
 this.actions[name]=this.mixer.clipAction(new T.AnimationClip(name,1,tracks))}
 this.name='Idle';this.actions.Idle.play();this.hold=0;this.grounded=true
 }
 update(dt,ground,vy,crouch,sprint,speed){
 if(ground&&!this.grounded)this.hold=.18;this.grounded=ground;this.hold=Math.max(0,this.hold-dt);
 const name=!ground?(vy>3?'Jump':'Airborne'):this.hold?'Landing':crouch?'Crouch':speed<.2?'Idle':sprint?'Sprint':'Walk';
 if(name!==this.name){const prev=this.actions[this.name],next=this.actions[name];next.reset().play().crossFadeFrom(prev,.16,false);this.name=name}
 this.mixer.update(dt);return this.node
 }
}
