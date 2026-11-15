// Mission worlds share the kit planets' surfaces, atmosphere and city landmarks.
import * as THREE from 'three';
import { atmosphere, cityLightsTexture, coronaTexture, galaxyDust, glowTexture, planetTexture, rng, type Theme } from './common';
import { signature } from './signature';
import type { MissionGalaxyData, ScenePlanet } from './types';
export type MissionKind = 'missioncontrol' | 'mission';
interface Context {
  scene: THREE.Scene;
  data: MissionGalaxyData;
  planets: ScenePlanet[];
  theme: Theme;
  small: boolean;
  mkLabel: (kind: MissionKind, id: string, html: string, aria: string, style?: string) => HTMLButtonElement;
  addTarget: (target: {kind: MissionKind; id: string; object: THREE.Object3D; hit: THREE.Object3D[]; label: HTMLButtonElement; radius: number; labelOffset: number}) => void;
  kitWorld: (id: string, out: THREE.Vector3) => THREE.Vector3;
}

export function missionGalaxy(ctx: Context) {
  const center = new THREE.Vector3(...ctx.data.position);
  const root = new THREE.Group(); root.position.copy(center); ctx.scene.add(root);
  const dust = galaxyDust(ctx.small ? 3400 : 7600, 5, 47, 121, ['#fff0cc','#e6ad69','#8d90ee','#80d8ce']);
  root.add(dust);
  const dustMat = dust.material as THREE.ShaderMaterial;
  dustMat.uniforms.uScale.value = 1.4;
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshBasicMaterial({map:glowTexture(),color:'#b77e57',transparent:true,depthWrite:false,opacity:.16,blending:THREE.AdditiveBlending}));
  haze.rotation.x = -Math.PI/2; haze.position.y = -2; root.add(haze);

  // A luminous, built intelligence at the centre, with a physical orbital array.
  const clock = {value:0};
  const core = new THREE.Mesh(new THREE.SphereGeometry(4.6,48,32),new THREE.ShaderMaterial({
    uniforms:{uTime:clock},
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;varying vec3 vP;varying vec3 vN;varying vec3 vV;
      void main(){vec3 p=normalize(vP); float lat=asin(p.y); float lon=atan(p.z,p.x);
        float flow=sin(lon*7.0+sin(lat*9.0+uTime*.18)*1.5-uTime*.3)*.5+.5;
        float weave=pow(abs(sin(lon*14.0+lat*9.0+uTime*.08)*cos(lat*22.0-lon*3.0)),9.0);
        float rim=pow(1.0-max(dot(vN,vV),0.0),2.2);
        vec3 c=mix(vec3(.19,.09,.04),vec3(.95,.49,.17),flow*.7);
        c+=vec3(1.0,.82,.48)*(weave*.85+rim*.8);gl_FragColor=vec4(c,1.0);}`,
  }));
  root.add(core); root.add(atmosphere(4.8,'#ffd7a0',.8));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#ffbb78',transparent:true,depthWrite:false,opacity:.36,blending:THREE.AdditiveBlending}));
  glow.scale.setScalar(25); root.add(glow);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({map:coronaTexture(),color:'#ffd1a1',transparent:true,depthWrite:false,opacity:.22,blending:THREE.AdditiveBlending}));
  corona.scale.setScalar(24); root.add(corona);
  const hull = new THREE.MeshStandardMaterial({color:'#d3c9bd',roughness:.38,metalness:.65});
  const glass = new THREE.MeshStandardMaterial({color:'#f7dcae',emissive:'#f0af61',emissiveIntensity:.45,roughness:.2,metalness:.25});
  const array = new THREE.Group(); array.rotation.set(.25,0,.28); root.add(array);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(6.6,.16,8,128),hull); collar.rotation.x=Math.PI/2; array.add(collar);
  const signal = new THREE.MeshBasicMaterial({color:'#ffcb83'});
  for(let n=0;n<12;n++) {
    const a=n*Math.PI/6;
    const panel=new THREE.Mesh(new THREE.BoxGeometry(.9,.18,1.7),hull);
    panel.position.set(Math.cos(a)*6.6,0,Math.sin(a)*6.6);panel.rotation.y=-a;array.add(panel);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.55,.2,.08),signal);
    lamp.position.copy(panel.position);lamp.position.y=.2;lamp.rotation.y=-a;array.add(lamp);
  }
  ctx.addTarget({kind:'missioncontrol',id:'missioncontrol',object:core,hit:[core],radius:4.8,labelOffset:1.35,label:ctx.mkLabel('missioncontrol','missioncontrol',`<span class="n">${ctx.data.control}</span><span class="k">${ctx.data.name}</span>`,ctx.data.control)});

  const positions = [new THREE.Vector3(23,1,9),new THREE.Vector3(-22,0,14),new THREE.Vector3(-1,2,-25)];
  const worldMaterials: THREE.MeshStandardMaterial[]=[];
  const atmospheres: THREE.Mesh[]=[];
  const makeLine=(points:THREE.Vector3[],color:string,opacity:number,parent:THREE.Object3D=root)=>{
    const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat));return mat;
  };
  const routes=ctx.data.missions.map((mission,i)=>{
    const color=mission.color;
    const world=new THREE.Group();world.position.copy(positions[i]);root.add(world);
    const mat=new THREE.MeshStandardMaterial({map:planetTexture(['bands','swirl','grid'][i] as 'bands'|'swirl'|'grid',color,71+i,256),roughness:.65,metalness:.12,emissive:'#ffe5be',emissiveMap:cityLightsTexture(71+i,256),emissiveIntensity:1.3});
    worldMaterials.push(mat);
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(3.3,40,28),mat);world.add(sphere);
    const air=atmosphere(3.55,color,1.25);world.add(air);atmospheres.push(air);
    // Actual landmark geometry from the existing planet cities keeps one visual language.
    const hues={main:color,light:'#fff1d7',dark:'#33344e'};
    const landmark=signature(['sheet','vector','note'][i],hues,{wall:hull,glass},ctx.theme,90+i);
    landmark.group.scale.setScalar(Math.min(3.4/landmark.height,2.2/landmark.radius));
    landmark.group.position.y=3.0;world.add(landmark.group);
    const orbit=new THREE.Group();orbit.rotation.set(.18,0,.18);world.add(orbit);
    const belt=new THREE.Mesh(new THREE.TorusGeometry(4.9,.09,6,96),hull);belt.rotation.x=Math.PI/2;orbit.add(belt);
    const trim=new THREE.Mesh(new THREE.TorusGeometry(5.12,.035,5,96),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65}));trim.rotation.x=Math.PI/2;orbit.add(trim);
    const satellites=mission.steps.map((step,j)=>{
      const kit=ctx.planets.find(p=>p.id===step.kit)!;
      const a=j*Math.PI/2+.5;
      const node=new THREE.Mesh(new THREE.SphereGeometry(.65,16,10),new THREE.MeshStandardMaterial({color:kit.color.dark,roughness:.4,emissive:kit.color.dark,emissiveIntensity:.35}));
      node.position.set(Math.cos(a)*5.12,0,Math.sin(a)*5.12);orbit.add(node);return node;
    });
    ctx.addTarget({kind:'mission',id:mission.id,object:world,hit:[sphere,belt],radius:3.5,labelOffset:1.65,label:ctx.mkLabel('mission',mission.id,`<span class="n">${mission.title}</span><span class="k">${mission.steps.map(s=>s.kit).join(' · ')}</span>`,`${mission.title} · ${ctx.data.demo}`,`--mission:${color}`)});
    // Sweep from the AI core to each destination. Ships follow the curve tangent.
    const direction=positions[i].clone().normalize();
    const curve=new THREE.CubicBezierCurve3(direction.clone().multiplyScalar(7.5),new THREE.Vector3(direction.x*11,6,direction.z*11),new THREE.Vector3(positions[i].x+direction.z*7,4,positions[i].z-direction.x*7),positions[i].clone());
    const routeMat=makeLine(curve.getPoints(90),color,.45);
    const orbitPoints=Array.from({length:161},(_,j)=>{const a=j/160*Math.PI*2;const r=positions[i].length();return new THREE.Vector3(Math.cos(a)*r,-.7-i*.15,Math.sin(a)*r);});
    makeLine(orbitPoints,color,.12);
    const ship=new THREE.Group();root.add(ship);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,1.2,4,8),hull);body.rotation.x=Math.PI/2;ship.add(body);
    const wing=new THREE.Mesh(new THREE.BoxGeometry(1.6,.09,.55),glass);wing.position.z=.2;ship.add(wing);
    const engine=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.75}));engine.position.z=.9;engine.scale.setScalar(1.8);ship.add(engine);
    const cables=mission.steps.map(step=>{
      const buffer=new Float32Array(40*3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(buffer,3));
      const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false}));line.frustumCulled=false;line.visible=false;ctx.scene.add(line);
      return {kit:step.kit,line,buffer,curve:new THREE.QuadraticBezierCurve3()};
    });
    return {id:mission.id,world,sphere,orbit,landmark,hues,curve,ship,routeMat,satellites,cables,index:i,hover:0};
  });
  // A restrained outer belt adds depth without obscuring the destinations.
  const random=rng(340);const debris=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13,0),hull,ctx.small?90:220);
  const matrix=new THREE.Matrix4();
  for(let i=0;i<debris.count;i++){const a=random()*Math.PI*2,r=34+random()*5;matrix.makeTranslation(Math.cos(a)*r,(random()-.5)*1.3,Math.sin(a)*r);debris.setMatrixAt(i,matrix);}root.add(debris);
  const start=new THREE.Vector3(),end=new THREE.Vector3(),mid=new THREE.Vector3(),point=new THREE.Vector3(),tangent=new THREE.Vector3();
  const forward=new THREE.Vector3(0,0,-1);
  function setTheme(theme:Theme) {
    const dark=theme==='dark';
    dustMat.uniforms.uOpacity.value=dark?.78:.3;dustMat.blending=dark?THREE.AdditiveBlending:THREE.NormalBlending;dustMat.needsUpdate=true;
    glow.material.opacity=dark?.36:.1;corona.material.opacity=dark?.22:.06;haze.material.opacity=dark?.16:.06;
    worldMaterials.forEach(mat=>mat.emissiveIntensity=dark?1.3:.18);
    atmospheres.forEach(mesh=>(mesh.material as THREE.ShaderMaterial).uniforms.uStrength.value=dark?1.25:.45);
    routes.forEach(route=>route.landmark.setTheme(theme,route.hues));
  }
  setTheme(ctx.theme);
  return {center,setTheme,update(dt:number,time:number,motion:number,hovered:{kind:string;id:string}|null,selected:string|null){
    clock.value=time*motion;dust.rotation.y+=dt*.006*motion;array.rotation.y+=dt*.08*motion;core.rotation.y+=dt*.025*motion;
    routes.forEach(route=>{
      const active=selected===route.id||(hovered?.kind==='mission'&&hovered.id===route.id);
      route.hover=THREE.MathUtils.damp(route.hover,active?1:0,5,dt);route.world.scale.setScalar(1+route.hover*.08);route.routeMat.opacity=.4+route.hover*.45;
      route.orbit.rotation.y+=dt*.07*motion;route.sphere.rotation.y+=dt*.035*motion;route.landmark.tick(time*motion,dt*motion);
      const phase=motion?(time*.045+route.index*.33)%1:.65;route.ship.position.copy(route.curve.getPoint(phase));tangent.copy(route.curve.getTangent(phase)).normalize();route.ship.quaternion.setFromUnitVectors(forward,tangent);
      route.cables.forEach(cable=>{cable.line.visible=active;if(!active)return;
        route.world.getWorldPosition(start);ctx.kitWorld(cable.kit,end);mid.copy(start).lerp(end,.5);mid.y+=18;cable.curve.v0.copy(start);cable.curve.v1.copy(mid);cable.curve.v2.copy(end);
        for(let n=0;n<40;n++){cable.curve.getPoint(n/39,point);point.toArray(cable.buffer,n*3);}(cable.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true;
      });
    });
  }};
}
