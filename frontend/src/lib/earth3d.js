import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const EARTH_R = 10;
const SPIN_DEG_S = 1.1;
const FOV = 38;
const SAT_SPAN = 18;

export const VIEWS = [
  { cx: 0.7, cy: 0.54, r: 0.4, yaw: 0 },
  { cx: 0.84, cy: 0.74, r: 0.52, yaw: 0.5 },
  { cx: 0.8, cy: 1.22, r: 0.85, yaw: 1.2 },
  { cx: 0.84, cy: 1.14, r: 0.56, yaw: 1.9 },
  { cx: 0.88, cy: 1.12, r: 0.52, yaw: 2.5 },
  { cx: 0.88, cy: 0.32, r: 0.3, yaw: 3.0 },
  { cx: 0.74, cy: 0.6, r: 0.42, yaw: 3.6 },
];

const SATS = [
  { id: "modis", url: "/satellites/aqua.glb", color: "#ffb547", radius: 12.4, inc: 108, raan: 240, period: 44, phase: 3.7, dashed: true, side: 1, pose: [0.42, 0.7, -0.12] },
  { id: "viirs", url: "/satellites/suomi_npp.glb", color: "#3dd6f5", radius: 13.4, inc: 99, raan: 205, period: 52, phase: 0.9, dashed: false, side: -1, pose: [1.15, -0.45, 0.25] },
];

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function loadTex(url) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      resolve(t);
    }, undefined, () => resolve(null));
  });
}

export function llToVec(lat, lon, r) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

function loadModel(loader, url) {
  return new Promise((resolve) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
  });
}

function normaliseModel(root) {
  const holder = new THREE.Group();
  if (!root) {
    return holder;
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  const boxAll = new THREE.Box3().setFromObject(root);
  boxAll.getSize(size);
  boxAll.getCenter(center);
  const longest = Math.max(size.x, size.y, size.z) || 1;
  const k = SAT_SPAN / longest;
  root.position.copy(center).multiplyScalar(-k);
  root.scale.setScalar(k);
  holder.add(root);
  return holder;
}

const EARTH_VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vO;
void main(){ vUv=uv; vO=normalize(position); vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

const EARTH_FS = `
uniform sampler2D day; uniform sampler2D night; uniform sampler2D water; uniform vec3 sun; uniform vec3 camPos; uniform float cloudT;
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vO;
float h3(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5; float s=0.; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }
void main(){
  vec3 n=normalize(vN); float d=dot(n,normalize(sun));
  float k=smoothstep(-0.18,0.22,d);
  vec3 dc=texture2D(day,vUv).rgb;
  vec3 nt=texture2D(night,vUv).rgb; float lt=dot(nt,vec3(.3,.59,.11));
  vec3 nc=vec3(1.0,0.62,0.28)*lt*1.6+vec3(1.0,0.88,0.65)*pow(lt,2.)*2.6;
  vec3 q=vO*3.2+vec3(cloudT,0.,cloudT*.4);
  float cl=smoothstep(.52,.78,fbm(q+fbm(q*1.7)*.6));
  vec3 v=normalize(camPos-vW);
  float wm=texture2D(water,vUv).r;
  vec3 h=normalize(normalize(sun)+v); float spec=pow(max(dot(n,h),0.),60.)*wm*0.9*k;
  vec3 dayc=mix(dc,vec3(1.),cl*0.8)*(0.25+0.75*max(d,0.))+vec3(1.0,0.92,0.8)*spec;
  vec3 nightc=nc*(1.-cl*0.6)+dc*0.006+cl*vec3(0.006,0.009,0.02);
  vec3 col=mix(nightc,dayc,k);
  float twi=exp(-pow(d*6.,2.)); col+=vec3(0.9,0.38,0.12)*twi*0.05*k;
  float fr=pow(1.-max(dot(n,v),0.),5.0);
  col+=vec3(0.30,0.55,1.0)*fr*(0.04+0.96*smoothstep(-0.25,0.4,d))*0.8;
  gl_FragColor=vec4(col,1.);
  #include <colorspace_fragment>
}`;

const ATMO_FS = `
uniform vec3 sun; uniform vec3 camPos; uniform float uPow; varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vO;
void main(){ vec3 n=normalize(vN); vec3 v=normalize(camPos-vW); float r=1.-abs(dot(n,v)); float a=pow(r,uPow); float s=smoothstep(-0.45,0.5,dot(n,normalize(sun)));
 vec3 c=mix(vec3(0.12,0.25,0.65),vec3(0.45,0.72,1.0),s); gl_FragColor=vec4(c*a*(0.25+1.3*s),a*(0.35+0.9*s)); }`;

function fireSprite() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.25, "rgba(255,255,255,0.8)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function orbitBasis(incDeg, raanDeg) {
  const ax = new THREE.Vector3(1, 0, 0);
  const ay = new THREE.Vector3(0, 1, 0);
  const inc = (incDeg * Math.PI) / 180;
  const raan = (raanDeg * Math.PI) / 180;
  const u = new THREE.Vector3(1, 0, 0).applyAxisAngle(ax, inc).applyAxisAngle(ay, raan);
  const v = new THREE.Vector3(0, 0, 1).applyAxisAngle(ax, inc).applyAxisAngle(ay, raan);
  return { u: u, v: v };
}

export async function createEarthScene(canvas, options) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(options.dpr || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(FOV, 16 / 10, 0.1, 3000);
  const viewDir = llToVec(14, 77, 1).normalize();

  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);
  const loaded = await Promise.all([
    Promise.all(["/textures/earth-blue-marble.jpg", "/textures/earth-night.jpg", "/textures/earth-water.png"].map(loadTex)),
    Promise.all(SATS.map((def) => loadModel(gltfLoader, def.url))),
  ]);
  const textures = loaded[0];
  const models = loaded[1];

  const sunCam = new THREE.Vector3(0.62, 0.3, -1).normalize();
  const sun = new THREE.Vector3();
  const globe = new THREE.Group();
  scene.add(globe);
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { day: { value: textures[0] }, night: { value: textures[1] }, water: { value: textures[2] }, sun: { value: sun }, camPos: { value: new THREE.Vector3() }, cloudT: { value: 0 } },
    vertexShader: EARTH_VS,
    fragmentShader: EARTH_FS,
  });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 192, 128), earthMat));
  const outer = new THREE.ShaderMaterial({ uniforms: { sun: { value: sun }, camPos: { value: new THREE.Vector3() }, uPow: { value: 2.2 } }, vertexShader: EARTH_VS, fragmentShader: ATMO_FS, transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false });
  const inner = new THREE.ShaderMaterial({ uniforms: { sun: { value: sun }, camPos: { value: new THREE.Vector3() }, uPow: { value: 7.0 } }, vertexShader: EARTH_VS, fragmentShader: ATMO_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10.35, 128, 96), outer));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10.06, 128, 96), inner));

  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 4000; i = i + 1) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(900 + Math.random() * 400);
    starPos.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaab8d8, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.7 })));

  let firePoints = null;
  function setFires(list) {
    if (firePoints) {
      globe.remove(firePoints);
      firePoints.geometry.dispose();
    }
    if (!list || list.length === 0) {
      firePoints = null;
      return;
    }
    const g = new THREE.BufferGeometry();
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    list.forEach((f) => {
      const v = llToVec(f.lat, f.lon, 10.03);
      pos.push(v.x, v.y, v.z);
      c.set(f.color || "#ff7a3d");
      col.push(c.r, c.g, c.b);
    });
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    firePoints = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.13, map: fireSprite(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    globe.add(firePoints);
  }
  setFires(options.fires);

  scene.add(new THREE.AmbientLight(0x223355, 0.4));
  const key = new THREE.DirectionalLight(0xfff4e0, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe2b0, 2.0);
  scene.add(fill);

  const fleet = SATS.map((def, index) => {
    const basis = orbitBasis(def.inc, def.raan);
    const ring = [];
    for (let i = 0; i <= 360; i = i + 1) {
      const a = (i * Math.PI) / 180;
      ring.push(basis.u.clone().multiplyScalar(def.radius * Math.cos(a)).add(basis.v.clone().multiplyScalar(def.radius * Math.sin(a))));
    }
    let lineMat = new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.45 });
    if (def.dashed) {
      lineMat = new THREE.LineDashedMaterial({ color: def.color, dashSize: 0.12, gapSize: 0.22, transparent: true, opacity: 0.6 });
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), lineMat);
    if (def.dashed) {
      line.computeLineDistances();
    }
    scene.add(line);
    const model = normaliseModel(models[index]);
    model.traverse((m) => {
      if (m.material) {
        m.material.envMap = envTex;
        m.material.envMapIntensity = 0.85;
        m.material.needsUpdate = true;
      }
    });
    const pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);
    return { def: def, basis: basis, line: line, lineMat: lineMat, model: model, pivot: pivot, angle: def.phase, dock: 0, slot: null };
  });

  const tmp = { up: new THREE.Vector3(), x: new THREE.Vector3(), z: new THREE.Vector3(), m: new THREE.Matrix4(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), p: new THREE.Vector3(), h: new THREE.Vector3(), e: new THREE.Euler() };
  const yAxis = new THREE.Vector3(0, 1, 0);
  const st = { w: 1, h: 1, p: 0, target: 0, time: 0, auto: true, anchors: [0, 0.15, 0.33, 0.5, 0.62, 0.8, 1] };

  function sampleView(p) {
    const A = st.anchors;
    if (p <= A[0]) {
      return VIEWS[0];
    }
    if (p >= A[A.length - 1]) {
      return VIEWS[VIEWS.length - 1];
    }
    let i = 0;
    for (let k = 0; k < A.length - 1; k = k + 1) {
      if (p >= A[k] && p <= A[k + 1]) {
        i = k;
      }
    }
    const a = VIEWS[i];
    const b = VIEWS[i + 1];
    let t = 0;
    if (A[i + 1] > A[i]) {
      t = smooth(clamp01((p - A[i]) / (A[i + 1] - A[i])));
    }
    return { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, r: a.r + (b.r - a.r) * t, yaw: a.yaw + (b.yaw - a.yaw) * t };
  }

  function placeCamera(view) {
    const tanHalf = Math.tan(((FOV / 2) * Math.PI) / 180);
    const alpha = Math.atan(2 * view.r * tanHalf);
    const dist = EARTH_R / Math.sin(alpha);
    cam.position.copy(viewDir).multiplyScalar(dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.aspect = st.w / st.h;
    cam.setViewOffset(st.w, st.h, st.w / 2 - view.cx * st.w, st.h / 2 - view.cy * st.h, st.w, st.h);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    sun.copy(sunCam).applyQuaternion(cam.quaternion).normalize();
    key.position.copy(sun).multiplyScalar(100);
    fill.position.copy(cam.position).multiplyScalar(3).add(new THREE.Vector3(0, 20, 0));
    earthMat.uniforms.camPos.value.copy(cam.position);
    outer.uniforms.camPos.value.copy(cam.position);
    inner.uniforms.camPos.value.copy(cam.position);
    return dist;
  }

  function orbitPose(s) {
    const b = s.basis;
    const r = s.def.radius;
    tmp.p.copy(b.u).multiplyScalar(r * Math.cos(s.angle)).addScaledVector(b.v, r * Math.sin(s.angle));
    tmp.up.copy(tmp.p).normalize();
    tmp.x.crossVectors(tmp.up, sun);
    if (tmp.x.lengthSq() < 1e-6) {
      tmp.x.set(1, 0, 0);
    }
    tmp.x.normalize();
    tmp.z.crossVectors(tmp.x, tmp.up).normalize();
    tmp.m.makeBasis(tmp.x, tmp.up, tmp.z);
    tmp.qa.setFromRotationMatrix(tmp.m);
  }

  function heroPose(s, camDist) {
    const slot = s.slot;
    const depth = Math.max(8, (camDist - EARTH_R) * 0.55);
    const ndcX = slot.x * 2 - 1;
    const ndcY = -(slot.y * 2 - 1);
    tmp.h.set(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position).normalize();
    const dist = depth / Math.max(0.2, tmp.h.dot(new THREE.Vector3().copy(cam.position).negate().normalize()));
    tmp.h.multiplyScalar(dist).add(cam.position);
    const visH = 2 * depth * Math.tan(((FOV / 2) * Math.PI) / 180);
    const wantSpan = Math.min(slot.w * visH * (st.w / st.h), slot.h * visH) * 0.82;
    const scale = wantSpan / SAT_SPAN;
    const wob = Math.sin(st.time * 0.5 + s.def.phase) * 0.12;
    tmp.e.set(s.def.pose[0] + wob * 0.5, s.def.pose[1] + wob, s.def.pose[2], "YXZ");
    tmp.qb.setFromEuler(tmp.e).premultiply(cam.quaternion);
    return scale;
  }

  function placeFleet(camDist) {
    fleet.forEach((s) => {
      orbitPose(s);
      const orbitPos = tmp.p.clone();
      let scale = 0.22;
      let dock = s.dock;
      if (!s.slot) {
        dock = 0;
      }
      if (dock > 0.001) {
        const heroScale = heroPose(s, camDist);
        const e = smooth(dock);
        s.pivot.position.copy(orbitPos).lerp(tmp.h, e);
        s.pivot.quaternion.copy(tmp.qa).slerp(tmp.qb, e);
        scale = 0.22 + (heroScale - 0.22) * e;
        const arc = Math.sin(e * Math.PI) * 3;
        s.pivot.position.addScaledVector(orbitPos.clone().normalize(), arc);
      } else {
        s.pivot.position.copy(orbitPos);
        s.pivot.quaternion.copy(tmp.qa);
      }
      s.pivot.scale.setScalar(scale);
      s.lineMat.opacity = (0.55 - 0.3 * dock);
    });
  }

  function setSize(w, h) {
    st.w = Math.max(1, w);
    st.h = Math.max(1, h);
    renderer.setSize(st.w, st.h, false);
  }

  function setScroll(p) {
    st.target = clamp01(p);
  }

  function setAnchors(list) {
    if (list && list.length === VIEWS.length) {
      st.anchors = list;
    }
  }

  function setSlots(slots) {
    fleet.forEach((s) => {
      const slot = slots[s.def.id];
      if (slot) {
        s.slot = slot;
        s.targetDock = slot.e;
      } else {
        s.slot = null;
        s.targetDock = 0;
      }
    });
  }

  function getDock() {
    const out = {};
    fleet.forEach((s) => {
      out[s.def.id] = s.dock;
    });
    return out;
  }

  function setAuto(on) {
    st.auto = on;
  }

  function frame(dt, jump) {
    const step = Math.min(dt, 0.1);
    const k = 1 - Math.exp(-step / 0.35);
    if (jump) {
      st.p = st.target;
    } else {
      st.p = st.p + (st.target - st.p) * k;
    }
    fleet.forEach((s) => {
      const target = s.targetDock || 0;
      if (jump) {
        s.dock = target;
      } else {
        s.dock = s.dock + (target - s.dock) * (1 - Math.exp(-step / 0.18));
      }
      if (st.auto && s.dock < 0.98) {
        s.angle = s.angle + ((step * 2 * Math.PI) / s.def.period) * (1 - s.dock);
      }
    });
    if (st.auto) {
      st.time = st.time + step;
    }
    const view = sampleView(st.p);
    const spin = (st.time * SPIN_DEG_S * Math.PI) / 180;
    globe.quaternion.setFromAxisAngle(yAxis, spin + view.yaw);
    earthMat.uniforms.cloudT.value = st.time * 0.012;
    const camDist = placeCamera(view);
    placeFleet(camDist);
    renderer.render(scene, cam);
  }

  function dispose() {
    renderer.dispose();
    pmrem.dispose();
    draco.dispose();
  }

  return { frame: frame, setSize: setSize, setScroll: setScroll, setAnchors: setAnchors, setSlots: setSlots, getDock: getDock, setAuto: setAuto, setFires: setFires, dispose: dispose };
}
