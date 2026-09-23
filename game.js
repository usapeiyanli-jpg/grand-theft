import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const home = document.querySelector('#home-screen');
const game = document.querySelector('#game-screen');
const canvasHolder = document.querySelector('#game-canvas');
const destinationCards = document.querySelectorAll('.destination-card');
const destinationData = {
  park: { name:'Maple Park', icon:'🌳', sky:0xa9dce3, ground:0x9cdbac, accent:0x79c697, toast:'A quiet spot for a picnic!' },
  cafe: { name:'Sunny Cafe', icon:'☕', sky:0xffdca8, ground:0xf2c184, accent:0xff9d78, toast:'Fresh treats are ready!' },
  beach: { name:'Rainbow Beach', icon:'🌈', sky:0xb8d9f1, ground:0xe8d19f, accent:0x74cbd1, toast:'What a beautiful day!' }
};
let selectedDestination = 'park';
let scene, camera, renderer, car, clock, animationFrame;
let speed = 0, stars = 0, startTime, toastTimer;
const keys = {};
const interactiveThings = [];
const interactionZones = [];
const visitedZones = new Set();

function makeMaterial(color) { return new THREE.MeshLambertMaterial({ color }); }
function box(w,h,d,color, x=0,y=0,z=0) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), makeMaterial(color)); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; return mesh; }
function cylinder(radius,height,color,x=0,y=0,z=0) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,12),makeMaterial(color)); mesh.position.set(x,y,z); mesh.castShadow=true; return mesh; }

function createCity(type) {
  const data = destinationData[type];
  scene = new THREE.Scene(); scene.background = new THREE.Color(data.sky); scene.fog = new THREE.Fog(data.sky, 30, 105);
  camera = new THREE.PerspectiveCamera(55, canvasHolder.clientWidth / canvasHolder.clientHeight, .1, 250);
  camera.position.set(10, 12, 16); camera.lookAt(0,0,0);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x789b9c, 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3ce, 2.5); sun.position.set(-25,35,20); sun.castShadow=true; scene.add(sun);
  const ground = box(115,.3,115,data.ground,0,-.3,0); scene.add(ground);
  const road = makeMaterial(0x7d8798);
  [-20,0,20].forEach(x=>{ const r=box(8,.05,115,road,x,0,0); scene.add(r); addRoadStripe(x,0,true); });
  [-20,0,20].forEach(z=>{ const r=box(115,.05,8,road,0,0,z); scene.add(r); addRoadStripe(0,z,false); });
  for(let x=-40;x<=40;x+=20) for(let z=-40;z<=40;z+=20) { if(Math.abs(x)===20||Math.abs(z)===20|| (x===0&&z===0)) continue; addBuilding(x,z, type); }
  addTrees(type); addLandmark(type); addInteractionZones(type); addCollectibles();
  createCar();
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false }); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(canvasHolder.clientWidth,canvasHolder.clientHeight); renderer.shadowMap.enabled=true; canvasHolder.replaceChildren(renderer.domElement);
}
function addRoadStripe(x,z,vertical) { for(let p=-50;p<50;p+=10) { const stripe=box(.28,.06,4,0xfbe1a1,vertical?x:p,.05,vertical?p:z); if(!vertical) stripe.rotation.y=Math.PI/2; scene.add(stripe); } }
function addBuilding(x,z,type) { const colors=type==='cafe'?[0xffa184,0xffc273,0x8fc9d7]:type==='beach'?[0xf59cb6,0x9db9ef,0x8bd2bd]:[0xf3a57f,0x9c9bdc,0x7fcad6]; const w=7+Math.random()*3,h=4+Math.random()*6,d=7+Math.random()*3; const b=box(w,h,d,colors[Math.floor(Math.random()*colors.length)],x,h/2,z); scene.add(b); for(let i=0;i<2;i++){ const window=box(1.1,.7,.08,0xffefb0,x-1.5+i*2,h*.62,z-d/2-.05); scene.add(window); } const roof=box(w+.4,.18,d+.4,0xffffff,x,h+.1,z); scene.add(roof); }
function addTrees(type) { const treeColor=type==='beach'?0x61b892:0x55ae75; for(const [x,z] of [[-8,-8],[8,-8],[-8,8],[8,8],[34,31],[-34,31],[34,-31],[-34,-31]]) { const trunk=cylinder(.45,2,0xa87958,x,1,z); const crown=cylinder(1.8,2.8,treeColor,x,3.2,z); scene.add(trunk,crown); } }
function addLandmark(type) { if(type==='park') { const pond=new THREE.Mesh(new THREE.CylinderGeometry(5,5,.12,32),makeMaterial(0x66c4d2)); pond.position.set(0,.04,31); scene.add(pond); for(let i=0;i<3;i++) { const bench=box(2,.45,.5,0xc48656,-5+i*5,.5,29); scene.add(bench); } } if(type==='cafe') { const building=box(10,5,7,0xff9b7f,0,2.5,32); scene.add(building); const sign=box(5,1.2,.2,0xffedaf,0,5.5,28.4); scene.add(sign); } if(type==='beach') { const water=box(115,.1,14,0x68c9d5,0,.05,42); scene.add(water); for(let x=-45;x<45;x+=8) { const umbrella=cylinder(.15,3,0x6f759e,x,1.5,34); const top=new THREE.Mesh(new THREE.ConeGeometry(1.6,.7,16),makeMaterial(0xffcf62)); top.position.set(x,3,34); scene.add(umbrella,top); } } }
function addInteractionZones(type) { const zone = type==='park' ? {x:0,z:31,icon:'🦆',text:'The ducks say hello!' } : type==='cafe' ? {x:0,z:27,icon:'☕',text:'The Sunny Cafe is open!' } : {x:0,z:36,icon:'🌈',text:'You found the rainbow shore!' }; interactionZones.push(zone); }
function addCollectibles() { [[-8,0,-8],[8,0,8],[-8,0,8],[8,0,-8],[30,0,0]].forEach(([x,y,z],i)=>{ const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.7),makeMaterial(i%2?0xffd166:0xff8f83)); gem.position.set(x,1.3,z); gem.userData.baseY=1.3; gem.userData.spin=i; scene.add(gem); interactiveThings.push(gem); }); }
function createCar() { car=new THREE.Group(); const body=box(2.7,.7,4.2,0xff6f61,0,1,0); body.position.z=0; const cabin=box(2.25,.75,2.1,0xff8f82,0,1.65,-.25); const windshield=box(1.7,.45,.08,0xbce8e2,0,1.72,-1.33); const backWindow=box(1.7,.45,.08,0xbce8e2,0,1.72,.84); const wheelGeo=new THREE.CylinderGeometry(.48,.48,.32,16); const wheelMat=makeMaterial(0x35435b); car.add(body,cabin,windshield,backWindow); for(const x of [-1.35,1.35]) for(const z of [-1.35,1.35]) { const w=new THREE.Mesh(wheelGeo,wheelMat); w.rotation.z=Math.PI/2; w.position.set(x,.55,z); car.add(w); } car.position.set(0,0,0); car.castShadow=true; scene.add(car); }
function addCollectibleFeedback() { const nearest=interactiveThings.find(item=>item.position.distanceTo(car.position)<2.4 && item.visible); if(nearest){ nearest.visible=false; stars++; document.querySelector('#star-count').textContent=stars; showToast('✦', 'Star collected!'); } }
function showToast(icon,text) { const toast=document.querySelector('#interaction-toast'); document.querySelector('#toast-icon').textContent=icon; document.querySelector('#toast-text').textContent=text; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600); }
function animate() { animationFrame=requestAnimationFrame(animate); if(!renderer) return; const now=performance.now(); const elapsed=Math.floor((now-startTime)/1000); document.querySelector('#drive-time').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`; const forward=keys.ArrowUp||keys.w; const backward=keys.ArrowDown||keys.s; const left=keys.ArrowLeft||keys.a; const right=keys.ArrowRight||keys.d; speed += forward?.018:backward?-.014: -speed*.055; speed=THREE.MathUtils.clamp(speed,-.16,.22); car.rotation.y += (left?-0.035:right?0.035:0) * (Math.abs(speed)*7+0.2); car.translateZ(-speed); car.position.x=THREE.MathUtils.clamp(car.position.x,-51,51); car.position.z=THREE.MathUtils.clamp(car.position.z,-51,51); car.position.y=0; camera.position.lerp(new THREE.Vector3(car.position.x+9,10.5,car.position.z+13),.08); camera.lookAt(car.position.x,0,car.position.z); interactiveThings.forEach(item=>{if(item.visible){item.rotation.y += .025;item.position.y=item.userData.baseY+Math.sin(now*.003+item.userData.spin)*.15;}}); interactionZones.forEach((zone,index)=>{if(!visitedZones.has(index) && Math.hypot(car.position.x-zone.x,car.position.z-zone.z)<7){visitedZones.add(index);showToast(zone.icon,zone.text);}}); addCollectibleFeedback(); renderer.render(scene,camera); }
function startGame(type) { selectedDestination=type; const data=destinationData[type]; home.hidden=true; game.hidden=false; document.querySelector('#hud-location').textContent=data.name; document.querySelector('#hud-icon').textContent=data.icon; stars=0; document.querySelector('#star-count').textContent='0'; startTime=performance.now(); interactiveThings.length=0; interactionZones.length=0; visitedZones.clear(); createCity(type); animate(); showToast(data.icon,data.toast); }
function endGame() { cancelAnimationFrame(animationFrame); renderer?.dispose(); scene=null; renderer=null; game.hidden=true; home.hidden=false; window.scrollTo({top:0,behavior:'smooth'}); }
destinationCards.forEach(card=>card.addEventListener('click',()=>startGame(card.dataset.destination)));
document.querySelector('#back-home').addEventListener('click',endGame); document.querySelector('#dismiss-tip').addEventListener('click',()=>document.querySelector('#game-tip').remove());
window.addEventListener('keydown',e=>{ keys[e.key]=true; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); }); window.addEventListener('keyup',e=>{ keys[e.key]=false; }); window.addEventListener('resize',()=>{ if(camera&&renderer){ camera.aspect=canvasHolder.clientWidth/canvasHolder.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvasHolder.clientWidth,canvasHolder.clientHeight); } });
document.querySelector('#sound-toggle').addEventListener('click',e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'🔊 Sound on':'🔇 Sound off';}); document.querySelector('#game-sound-toggle').addEventListener('click',e=>e.currentTarget.textContent=e.currentTarget.textContent==='🔊'?'🔇':'🔊');
