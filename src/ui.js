import {collection} from './catalog.js';
export const $=id=>document.getElementById(id);
const defaults={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',walk:'ShiftLeft',duck:'ControlLeft',run:'CapsLock',inspect:'KeyF',trick:'KeyQ',inventory:'KeyI',pause:'Escape'};
for(let i=1;i<=9;i++)defaults['slot'+i]='Digit'+i;
const titles={forward:'Вперёд',back:'Назад',left:'Влево',right:'Вправо',jump:'Прыжок',walk:'Шаг',duck:'Присед',run:'Бег',inspect:'Осмотр',trick:'Трюк',inventory:'Коллекция',pause:'Пауза'};
export const mobile=matchMedia('(pointer:coarse)').matches;
let saved={};try{saved=JSON.parse(localStorage.getItem('tl-studio-1'))||{}}catch{}
export const settings={quality:mobile?'low':'high',fov:77,weaponFov:54,sensitivity:100,button:51,motion:true,...saved.settings};
export const bindings={...defaults,...saved.bindings};
function save(){try{localStorage.setItem('tl-studio-1',JSON.stringify({settings,bindings}))}catch{}}
function label(code){return code.replace(/^Key|^Digit/,'').replace('Left',' L').replace('Right',' R')}
export function menu(tab){
 $('cover').hidden=false;document.body.classList.add('menu');$('touch').hidden=true;
 for(const name of ['home','inventory','settings'])$(name).hidden=name!==tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('resume').hidden=tab==='home';
 $('hint').textContent=mobile?'Левый джойстик для движения. Проведи справа для обзора.':label(bindings.inspect)+'  Осмотр　 /　'+label(bindings.trick)+'  Трюк　 /　'+label(bindings.inventory)+'  Коллекция'
}
export function choose(i){const d=collection[i];$('name').textContent=d.name;$('finish').textContent=d.finish.toUpperCase();[...$('cards').children].forEach((b,j)=>b.classList.toggle('active',i===j))}
export function setupUI(select,apply){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>menu(b.dataset.tab));
 collection.forEach((d,i)=>{const b=document.createElement('button'),c=document.createElement('canvas');c.width=240;c.height=64;const g=c.getContext('2d');g.translate(90,38);g.scale(139,-95);g.fillStyle=d.color;g.fillRect(-.54,-.047,.55,.095);g.beginPath();d.stations.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));[...d.stations].reverse().forEach(([x,,y])=>g.lineTo(x,y));g.closePath();const grad=g.createLinearGradient(0,-.14,0,.14);grad.addColorStop(0,'#7b8990');grad.addColorStop(.43,'#edf1ec');grad.addColorStop(.5,'#9dabb0');grad.addColorStop(1,'#d6dacc');g.fillStyle=grad;g.fill();
 const name=document.createElement('b'),finish=document.createElement('small');name.textContent=d.name;finish.textContent=d.finish.toUpperCase();b.append(c,finish,name);b.onclick=()=>select(i);$('cards').append(b)});
 const options=[['quality','Графика',['low','medium','high']],['fov','Угол обзора',60,105],['weaponFov','Угол обзора рук',45,68],['sensitivity','Чувствительность',30,220],['button','Размер кнопок',38,65],['motion','Фоновые анимации']];
 for(const [key,title,min,max] of options){const row=document.createElement('label');row.textContent=title;const input=document.createElement(Array.isArray(min)?'select':'input');const out=document.createElement('output');
 if(Array.isArray(min)){min.forEach((v,i)=>input.add(new Option(['Низкая','Средняя','Высокая'][i],v)));input.value=settings[key]}
 else if(max){input.type='range';input.min=min;input.max=max;input.value=settings[key];out.textContent=input.value}
 else{input.type='checkbox';input.checked=settings[key]}
 input.oninput=()=>{settings[key]=input.type==='checkbox'?input.checked:max?Number(input.value):input.value;out.textContent=input.value;save();apply()};row.append(input);if(max)row.append(out);$('options').append(row)}
 let waiting=null;const buttons={};
 for(const key of Object.keys(defaults)){const row=document.createElement('label'),b=document.createElement('button');row.textContent=titles[key]||'Слот '+key.slice(4);buttons[key]=b;b.textContent=label(bindings[key]);b.onclick=()=>{if(waiting)buttons[waiting].textContent=label(bindings[waiting]);waiting=key;b.textContent='…'};row.append(b);$('bindings').append(row)}
 window.addEventListener('keydown',e=>{if(!waiting||$('settings').hidden||$('cover').hidden)return;e.preventDefault();e.stopImmediatePropagation();const other=Object.keys(bindings).find(k=>bindings[k]===e.code);
 if(other){bindings[other]=bindings[waiting];buttons[other].textContent=label(bindings[other])}bindings[waiting]=e.code;buttons[waiting].textContent=label(e.code);waiting=null;save()},true)
}
