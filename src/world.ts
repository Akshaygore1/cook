import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Game, STATIONS, type Point, type GameEvent } from './model';

const C = { grass: 0xa8be79, grassDark: 0x779556, earth: 0x9d7650, path: 0xf3dfb8, cream: 0xfff5df, wheat: 0xe5ad43, gold: 0xf6ce69, teal: 0x4c9490, tealDark: 0x306963, tomato: 0xe55e40, ink: 0x34453d, wood: 0xc49a62, skin: 0xf0be91 };
const materials = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85 }));
  return materials.get(color)!;
}
const rounded = new RoundedBoxGeometry(1, 1, 1, 2, .1);
function box(parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], color: number, round = true) {
  const mesh = new THREE.Mesh(round ? rounded : new THREE.BoxGeometry(1, 1, 1), mat(color));
  mesh.scale.set(...size); mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, radius: number, height: number, pos: [number, number, number], color: number, sides = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), mat(color));
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent: THREE.Object3D, radius: number, pos: [number, number, number], color: number, detail = 1) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), mat(color));
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

export function pizza(parent: THREE.Object3D, x = 0, y = 0, z = 0, radius = .43) {
  const g = group(parent, x, y, z);
  cylinder(g, radius, .13, [0, 0, 0], 0xd89c48, 20);
  cylinder(g, radius * .86, .02, [0, .075, 0], 0xf8d77c, 20);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + .3;
    cylinder(g, radius * .14, .024, [Math.cos(angle) * radius * .55, .097, Math.sin(angle) * radius * .55], C.tomato, 8);
  }
  cylinder(g, radius * .12, .024, [0, .097, 0], C.tomato, 8);
  for (let i = 0; i < 3; i++) {
    const leaf = sphere(g, radius * .1, [Math.cos(i * 2.1) * radius * .37, .12, Math.sin(i * 2.1) * radius * .37], 0x6b9142, 0);
    leaf.scale.set(1, .25, 1.8);
  }
  return g;
}

function wheatBundle(parent: THREE.Object3D, y = 0) {
  const g = group(parent, 0, y, 0);
  box(g, [.72, .19, .46], [0, 0, 0], 0xe6bc71);
  for (let i = 0; i < 4; i++) box(g, [.06, .2, .49], [-.26 + i * .17, 0, 0], 0xf3d597);
  box(g, [.76, .045, .055], [0, .105, 0], 0xc18c52);
  return g;
}

type Person = { root: THREE.Group; body: THREE.Group; leftLeg: THREE.Group; rightLeg: THREE.Group; leftArm: THREE.Group; rightArm: THREE.Group; stack: THREE.Group };
function person(parent: THREE.Object3D, shirt: number, hat: boolean): Person {
  const root = group(parent);
  root.userData.dynamic = true;
  const body = group(root, 0, .58, 0);
  box(body, [.56, .64, .35], [0, .42, 0], shirt);
  box(body, [.37, .41, .06], [0, .34, .2], C.cream);
  const head = sphere(body, .255, [0, .99, 0], C.skin, 2);
  head.scale.set(.92, 1.12, .92);
  sphere(body, .07, [0, .99, .245], C.skin, 1);
  for (const x of [-.09, .09]) sphere(body, .025, [x, 1.04, .217], C.ink, 1);
  if (hat) {
    cylinder(body, .29, .16, [0, 1.23, 0], C.cream);
    sphere(body, .26, [0, 1.39, 0], C.cream, 2);
    sphere(body, .19, [-.16, 1.33, 0], C.cream, 1);
    sphere(body, .19, [.16, 1.33, 0], C.cream, 1);
    box(body, [.55, .07, .43], [0, 1.19, 0], C.tomato);
  } else {
    const hair = sphere(body, .27, [0, 1.09, -.04], 0x654b3d, 1); hair.scale.y = .7;
  }
  const leftLeg = group(root, -.15, .65, 0), rightLeg = group(root, .15, .65, 0);
  for (const leg of [leftLeg, rightLeg]) {
    box(leg, [.21, .44, .22], [0, -.22, 0], C.ink);
    box(leg, [.24, .16, .34], [0, -.49, .055], 0x39413b);
  }
  const leftArm = group(body, -.35, .68, 0), rightArm = group(body, .35, .68, 0);
  for (const arm of [leftArm, rightArm]) {
    box(arm, [.17, .32, .19], [0, -.14, 0], shirt);
    sphere(arm, .11, [0, -.34, 0], C.skin, 1);
  }
  const stack = group(body, 0, .34, -.38);
  return { root, body, leftLeg, rightLeg, leftArm, rightArm, stack };
}

type Particle = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maximum: number };
type FlyingItem = { root: THREE.Group; start: THREE.Vector3; end: THREE.Vector3; t: number };

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-20, 20, 12, -12, .1, 150);
  player: Person;
  private cropStalks: THREE.InstancedMesh;
  private cropHeads: THREE.InstancedMesh;
  private matrix = new THREE.Object3D();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private particles: Particle[] = [];
  private flying: FlyingItem[] = [];
  private targetRing: THREE.Mesh;
  private deliveryRing: THREE.Mesh;
  private pickupRing: THREE.Mesh;
  private counterRing: THREE.Mesh;
  private ovenLight: THREE.PointLight;
  private ovenGlow: THREE.Mesh;
  private readyStack: THREE.Group;
  private storedWheat: THREE.Group;
  private lastStack = '';
  private lastReady = -1;
  private lastWheat = -1;
  private look = new THREE.Vector3();
  private cameraOffset = new THREE.Vector3(19, 25, 26);
  private viewHeight = 26;
  private walkTime = 0;
  private customers: Person[] = [];
  private saleHop = 0;
  private smoke: THREE.Mesh[] = [];
  private car: THREE.Group;
  private goalArrow: THREE.Group;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement, private game: Game) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b39a, 2.2));
    const sun = new THREE.DirectionalLight(0xfff3d5, 3.2);
    sun.position.set(-12, 24, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: .5, far: 65 });
    sun.shadow.normalBias = .035; sun.shadow.bias = -.0001;
    this.scene.add(sun);

    this.buildLandscape();
    const crops = this.buildCrops(); this.cropStalks = crops.stalks; this.cropHeads = crops.heads;
    const kitchen = this.buildKitchen(); this.ovenGlow = kitchen.glow; this.ovenLight = kitchen.light;
    this.readyStack = group(this.scene, 6.0, .7, -2.7);
    this.storedWheat = group(this.scene, .1, .35, -5.1);
    this.buildCounter();
    this.mergeStaticScenery();
    this.player = person(this.scene, C.tomato, true);
    this.player.root.position.set(game.state.position.x, 0, game.state.position.z);
    this.player.root.rotation.y = -.4;

    this.deliveryRing = this.pad(STATIONS.delivery, C.gold);
    this.pickupRing = this.pad(STATIONS.pickup, 0x81b991);
    this.counterRing = this.pad(STATIONS.counter, 0xe88b6a);
    this.targetRing = new THREE.Mesh(new THREE.RingGeometry(.24, .32, 32), new THREE.MeshBasicMaterial({ color: C.cream, transparent: true, opacity: .85, side: THREE.DoubleSide }));
    this.targetRing.rotation.x = -Math.PI / 2; this.targetRing.visible = false; this.scene.add(this.targetRing);
    this.goalArrow = group(this.scene);
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-.26, .4); arrowShape.lineTo(.26, .4); arrowShape.lineTo(.26, 0); arrowShape.lineTo(.48, 0); arrowShape.lineTo(0, -.48); arrowShape.lineTo(-.48, 0); arrowShape.lineTo(-.26, 0); arrowShape.closePath();
    const arrow = new THREE.Mesh(new THREE.ExtrudeGeometry(arrowShape, { depth: .12, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .05, bevelThickness: .04 }), mat(C.cream));
    arrow.castShadow = true; this.goalArrow.add(arrow);
    this.car = this.buildCar();
    this.resize();
  }

  private buildLandscape() {
    box(this.scene, [27, .9, 21], [0, -.58, -.1], 0x83a266);
    box(this.scene, [27, .18, 21], [0, -.07, -.1], C.grass);
    box(this.scene, [13.2, .07, 15.4], [5.1, .025, .6], C.path);
    box(this.scene, [24.8, .045, 3.0], [0, .04, 4.0], C.path);
    box(this.scene, [9.1, .08, 10.1], [-6.9, .03, -2.4], C.earth);
    for (let i = 0; i < 11; i++) box(this.scene, [.035, .025, 9.4], [-10.4 + i * .74, .08, -2.4], 0x876c48, false);
    // A narrow country road runs behind the plot.
    box(this.scene, [26.8, .06, 2], [0, .02, -8.9], 0x8c9990);
    for (let i = -12; i < 13; i += 2.5) box(this.scene, [1.1, .012, .075], [i, .055, -8.9], C.cream, false);
    box(this.scene, [26.8, .09, .15], [0, .04, -7.8], C.cream);
    box(this.scene, [26.8, .09, .15], [0, .04, -10], C.cream);

    this.fence(-11.8, -7.1, -11.8, 2.5, 8);
    this.fence(-11.8, -7.4, -2.6, -7.4, 8);
    this.fence(-11.8, 6.9, -4.8, 6.9, 6);
    this.fence(11.8, -6.5, 11.8, 6.8, 10);
    [[-12.1, -5.8, 1.1], [-12, 5.5, .9], [-9.5, 8.6, 1.15], [10.7, -6.4, 1.15], [11.5, 1.9, .8], [-4.4, -10, .75], [8.8, -10, .8]].forEach(([x, z, s]) => this.tree(x, z, s));
    for (let i = 0; i < 24; i++) {
      const x = Math.sin(i * 127.1) * 12, z = 7.3 + Math.cos(i * 21.7) * .9;
      if (x > -3) continue;
      const grass = new THREE.Mesh(new THREE.ConeGeometry(.09, .25, 3), mat(i % 3 ? 0x7f9f51 : 0xe7d280));
      grass.position.set(x, .16, z); this.scene.add(grass);
    }
    // Little herb pots by the kitchen.
    for (let i = 0; i < 3; i++) {
      cylinder(this.scene, .25, .36, [8.6, .2, -5.9 + i * .8], 0xc78359);
      sphere(this.scene, .33, [8.6, .58, -5.9 + i * .8], 0x749450, 1);
    }
    // Outdoor table, chairs, and one pizza.
    cylinder(this.scene, .12, 1.05, [-4.5, .52, 6.0], C.tealDark);
    cylinder(this.scene, .85, .15, [-4.5, 1.12, 6.0], C.cream, 24);
    pizza(this.scene, -4.5, 1.23, 6.0, .38);
    for (const side of [-1, 1]) {
      box(this.scene, [.6, .15, .58], [-4.5 + side * 1.2, .54, 6], C.teal);
      box(this.scene, [.1, .7, .58], [-4.5 + side * 1.45, .89, 6], C.teal);
      for (const dz of [-.2, .2]) box(this.scene, [.08, .5, .08], [-4.5 + side * 1.2, .27, 6 + dz], C.tealDark);
    }
    // Small delivery crates and a chalkboard.
    for (let i = 0; i < 2; i++) box(this.scene, [.8, .58, .7], [9.7, .3 + i * .58, -2.8], C.wood);
    const board = group(this.scene, 3.8, 0, 6.2); board.rotation.y = -.2;
    box(board, [1, 1.35, .15], [0, .9, 0], C.wood);
    box(board, [.81, 1.12, .05], [0, .93, .1], C.tealDark);
    const boardText = this.textSprite('PIZZA\nFRESH DAILY', '#fff6e3', 192, 160); boardText.position.set(0, .94, .15); boardText.scale.set(.76, .8, 1); board.add(boardText);
  }

  private fence(x1: number, z1: number, x2: number, z2: number, count: number) {
    const length = Math.hypot(x2 - x1, z2 - z1), vertical = x1 === x2;
    for (let i = 0; i <= count; i++) {
      box(this.scene, [.14, .75, .14], [x1 + (x2 - x1) * i / count, .38, z1 + (z2 - z1) * i / count], C.wood);
    }
    for (const y of [.28, .58]) box(this.scene, vertical ? [.095, .1, length] : [length, .1, .095], [(x1 + x2) / 2, y, (z1 + z2) / 2], 0xe3c290);
  }

  private tree(x: number, z: number, scale: number) {
    const g = group(this.scene, x, 0, z); g.scale.setScalar(scale);
    cylinder(g, .15, 1.4, [0, .7, 0], 0x95704d, 7);
    sphere(g, .95, [0, 1.85, 0], 0x82a858, 1);
    sphere(g, .72, [.4, 2.3, 0], 0x92b968, 1);
    sphere(g, .62, [-.5, 1.9, .25], 0x92b968, 1);
  }

  private buildCrops() {
    const stalkParts: THREE.BufferGeometry[] = [], headParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4, x = Math.cos(angle) * (.13 + i * .023), z = Math.sin(angle) * (.13 + i * .023), h = .55 + (i % 5) * .055;
      stalkParts.push(new THREE.CylinderGeometry(.017, .024, h, 4).translate(x, h / 2, z));
      for (let j = 0; j < 4; j++) {
        headParts.push(new THREE.IcosahedronGeometry(.075, 0).scale(.8, 1.4, .65).rotateZ((j % 2 ? 1 : -1) * .4).translate(x + (j % 2 ? .035 : -.035), h + j * .073, z));
      }
    }
    const stalks = new THREE.InstancedMesh(mergeGeometries(stalkParts)!, mat(C.wheat), this.game.crops.length);
    const heads = new THREE.InstancedMesh(mergeGeometries(headParts)!, mat(C.gold), this.game.crops.length);
    stalks.castShadow = true; heads.castShadow = true; stalks.receiveShadow = true; heads.receiveShadow = true;
    stalks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.game.crops.forEach((_, i) => {
      heads.setColorAt(i, new THREE.Color().setHSL(.112 + (i % 7) * .003, .65, .54 + (i % 3) * .05));
    });
    this.scene.add(stalks, heads);
    stalkParts.forEach(p => p.dispose()); headParts.forEach(p => p.dispose());
    return { stalks, heads };
  }

  private buildKitchen() {
    box(this.scene, [6.1, .22, 4.7], [4.3, .12, -4.85], C.cream);
    box(this.scene, [5.5, 1.02, 2.5], [4.4, .66, -4.4], C.teal);
    box(this.scene, [5.75, .2, 2.7], [4.4, 1.26, -4.4], C.cream);
    for (const x of [2.2, 3.3, 4.4, 5.5, 6.6]) box(this.scene, [.8, .57, .06], [x, .73, -3.12], C.tealDark);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.tomato));
    dome.position.set(3.4, 1.37, -4.6); dome.castShadow = true; dome.receiveShadow = true; this.scene.add(dome);
    box(this.scene, [2.52, .22, 2.25], [3.4, 1.47, -4.55], C.tomato);
    const opening = new THREE.Mesh(new THREE.CircleGeometry(.63, 24), mat(0x4f3430));
    opening.position.set(3.4, 1.66, -3.30); opening.scale.y = .65; this.scene.add(opening);
    box(this.scene, [1.48, .12, .68], [3.4, 1.39, -3.25], 0xe3c797);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.42, 20), new THREE.MeshBasicMaterial({ color: 0xfbb55c }));
    glow.position.set(3.4, 1.62, -3.285); glow.scale.y = .6; this.scene.add(glow);
    const light = new THREE.PointLight(0xffa239, 2, 3); light.position.set(3.4, 1.5, -3.1); this.scene.add(light);
    cylinder(this.scene, .27, 1.55, [3.4, 3, -5.05], 0xb97056, 10);
    cylinder(this.scene, .37, .18, [3.4, 3.8, -5.05], C.cream, 10);
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(.22, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .4, depthWrite: false }));
      this.scene.add(puff); this.smoke.push(puff);
    }
    // Prep table, flour sack, rolling pin, and tomato bowl.
    box(this.scene, [2.3, 1.05, 1.9], [.15, .57, -5.6], C.wood);
    box(this.scene, [2.55, .18, 2.12], [.15, 1.17, -5.6], C.cream);
    sphere(this.scene, .37, [-.3, 1.48, -5.9], 0xeed7a1, 1).scale.set(.8, 1.15, .65);
    const pin = cylinder(this.scene, .07, .74, [.48, 1.34, -5.4], C.wood, 10); pin.rotation.z = Math.PI / 2;
    cylinder(this.scene, .33, .14, [6.15, 1.42, -4.8], C.cream);
    for (let i = 0; i < 4; i++) sphere(this.scene, .13, [6.04 + (i % 2) * .2, 1.55, -4.92 + Math.floor(i / 2) * .2], C.tomato, 1);
    pizza(this.scene, 5.9, 1.43, -3.9, .4);
    return { glow, light };
  }

  private buildCounter() {
    box(this.scene, [3.6, 1.12, 1.25], [7.45, .62, 6], C.teal);
    box(this.scene, [3.85, .18, 1.5], [7.45, 1.25, 6], C.cream);
    for (const x of [5.65, 9.25]) cylinder(this.scene, .07, 3.5, [x, 1.75, 6.4], C.wood, 8);
    for (let i = 0; i < 8; i++) {
      const panel = box(this.scene, [.49, .12, 2.0], [5.74 + i * .49, 3.35, 5.9], i % 2 ? C.cream : C.tomato, false);
      panel.rotation.x = -.12;
      box(this.scene, [.49, .3, .1], [5.74 + i * .49, 3.12, 6.88], i % 2 ? C.cream : C.tomato);
    }
    const sign = this.textSprite('DOUGH & GO', '#fff6e3', 512, 96, '#397e7c'); sign.position.set(7.45, 2.55, 6.5); sign.scale.set(3.2, .6, 1); this.scene.add(sign);
    pizza(this.scene, 6.7, 1.4, 6, .37);
    box(this.scene, [.52, .32, .4], [8.35, 1.53, 6], C.tealDark);
    box(this.scene, [.38, .24, .04], [8.35, 1.7, 6.19], 0xbad19d);
    [0x658ca3, 0xd69b64, 0xa7a082].forEach((color, i) => {
      const customer = person(this.scene, color, false);
      customer.root.position.set(6.75 + i * 1.1, 0, 7.65); customer.root.rotation.y = Math.PI;
      customer.root.scale.setScalar(.87); this.customers.push(customer);
    });
  }

  private textSprite(text: string, color: string, width = 512, height = 128, background?: string) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, width, height); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.font = `bold ${height / (text.includes('\n') ? 4 : 2.5)}px sans-serif`;
    const lines = text.split('\n'); lines.forEach((line, i) => ctx.fillText(line, width / 2, height / 2 + (i - (lines.length - 1) / 2) * height / 3));
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  }

  /** Bake fixed scenery by material to keep mobile draw calls low. */
  private mergeStaticScenery() {
    this.scene.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const sources: THREE.Mesh[] = [];
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || !(object.material instanceof THREE.MeshStandardMaterial)) return;
      for (let parent = object.parent; parent; parent = parent.parent) if (parent.userData.dynamic) return;
      const geometry = (object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()).applyMatrix4(object.matrixWorld);
      const batch = batches.get(object.material) ?? [];
      batch.push(geometry); batches.set(object.material, batch); sources.push(object);
    });
    for (const [material, geometries] of batches) {
      const combined = mergeGeometries(geometries);
      if (!combined) continue;
      const mesh = new THREE.Mesh(combined, material); mesh.castShadow = true; mesh.receiveShadow = true; this.scene.add(mesh);
      geometries.forEach(geometry => geometry.dispose());
    }
    sources.forEach(mesh => { mesh.removeFromParent(); if (mesh.geometry !== rounded) mesh.geometry.dispose(); });
  }

  private buildCar() {
    const g = group(this.scene, -8, 0, -8.9);
    box(g, [1.8, .5, .9], [0, .53, 0], 0xf0d196);
    box(g, [.9, .45, .84], [-.12, .96, 0], C.cream);
    box(g, [.57, .3, .025], [-.12, 1.0, .43], 0x8ebfbe);
    for (const x of [-.58, .58]) for (const z of [-.44, .44]) {
      const tire = cylinder(g, .22, .12, [x, .28, z], C.ink, 10); tire.rotation.x = Math.PI / 2;
    }
    return g;
  }

  private pad(point: Point, color: number) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.92, 1.02, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .95, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(point.x, .095, point.z); this.scene.add(mesh);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(.91, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .22, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2; inner.position.set(point.x, .085, point.z); this.scene.add(inner);
    return mesh;
  }

  resize() {
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    this.updateCameraBounds(width / height);
  }

  private updateCameraBounds(aspect: number) {
    this.camera.left = -this.viewHeight * aspect / 2; this.camera.right = -this.camera.left;
    this.camera.top = this.viewHeight / 2; this.camera.bottom = -this.camera.top; this.camera.updateProjectionMatrix();
  }

  project(point: Point, y = 0) {
    const pos = new THREE.Vector3(point.x, y, point.z).project(this.camera);
    return { x: (pos.x * .5 + .5) * this.canvas.clientWidth, y: (-pos.y * .5 + .5) * this.canvas.clientHeight };
  }

  groundPoint(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const point = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, point) ? { x: point.x, z: point.z } : null;
  }

  screenDirection(x: number, y: number): Point {
    const angle = Math.atan2(this.cameraOffset.x, this.cameraOffset.z);
    return { x: Math.cos(angle) * x + Math.sin(angle) * y, z: -Math.sin(angle) * x + Math.cos(angle) * y };
  }

  markTarget(point: Point | null) {
    this.targetRing.visible = !!point;
    if (point) this.targetRing.position.set(point.x, .12, point.z);
  }

  event(event: GameEvent) {
    if (event.type === 'harvest' || event.type === 'sale' || event.type === 'upgrade' || event.type === 'milestone') {
      const count = this.reducedMotion ? 0 : event.type === 'milestone' ? 45 : event.type === 'harvest' ? 3 : 10;
      for (let i = 0; i < count; i++) {
        const color = event.type === 'harvest' ? C.gold : event.type === 'milestone' ? [C.tomato, C.teal, C.gold, C.cream][i % 4] : C.gold;
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.065 + Math.random() * .05, 0), mat(color));
        mesh.position.set(event.x, event.type === 'harvest' ? .6 : 1.7, event.z);
        this.scene.add(mesh);
        const maximum = .5 + Math.random() * .6;
        this.particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - .5) * 3, 2 + Math.random() * 3, (Math.random() - .5) * 3), life: maximum, maximum });
      }
    }
    if (event.type === 'sale') this.saleHop = .7;
    if (event.type === 'deposit' || event.type === 'pickup') {
      const start = this.player.root.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const end = new THREE.Vector3(.15, 1.4, -5.5);
      const item = event.type === 'deposit' ? wheatBundle(this.scene) : pizza(this.scene);
      if (event.type === 'pickup') { end.copy(start); start.set(6, 1.1, -2.7); }
      this.flying.push({ root: item, start, end, t: 0 });
    }
  }

  update(dt: number, time: number, playing: boolean) {
    const s = this.game.state, mobile = this.canvas.clientWidth < 700;
    const targetHeight = playing ? (mobile ? 18 : 25.5) : (mobile ? 64 : 28);
    const lerp = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
    this.viewHeight += (targetHeight - this.viewHeight) * lerp;
    const targetLook = playing ? new THREE.Vector3(s.position.x * (mobile ? 1 : .25), 0, s.position.z * (mobile ? 1 : .22) - 1) : new THREE.Vector3(mobile ? 0 : -4.5, 0, mobile ? -2 : 2.8);
    this.look.lerp(targetLook, lerp);
    this.camera.position.copy(this.look).add(this.cameraOffset); this.camera.lookAt(this.look);
    this.updateCameraBounds(this.canvas.clientWidth / this.canvas.clientHeight);

    this.player.root.position.set(s.position.x, 0, s.position.z);
    if (this.game.moving && playing) this.walkTime += dt * 13;
    const swing = this.game.moving && playing ? Math.sin(this.walkTime) * .6 : 0;
    this.player.leftLeg.rotation.x = swing; this.player.rightLeg.rotation.x = -swing;
    this.player.leftArm.rotation.x = -swing * .7; this.player.rightArm.rotation.x = swing * .7;
    this.player.body.position.y = .58 + (this.game.moving && playing ? Math.abs(Math.sin(this.walkTime)) * .055 : Math.sin(time * 2.5) * .012);
    this.player.stack.rotation.z = this.reducedMotion ? 0 : Math.sin(time * 5) * .018;
    const signature = `${s.grain},${s.pizzas}`;
    if (signature !== this.lastStack) {
      this.lastStack = signature; this.clearGroup(this.player.stack);
      for (let i = 0; i < Math.min(s.grain, 18); i++) wheatBundle(this.player.stack, i * .12);
      for (let i = 0; i < Math.min(s.pizzas, 12); i++) pizza(this.player.stack, 0, Math.min(s.grain, 18) * .12 + i * .16, 0, .4);
    }
    if (s.readyPizzas !== this.lastReady) {
      this.lastReady = s.readyPizzas; this.clearGroup(this.readyStack);
      for (let i = 0; i < Math.min(s.readyPizzas, 12); i++) pizza(this.readyStack, 0, i * .17, 0, .48);
    }
    if (Math.ceil(s.ovenWheat / 6) !== this.lastWheat) {
      this.lastWheat = Math.ceil(s.ovenWheat / 6); this.clearGroup(this.storedWheat);
      for (let i = 0; i < Math.min(this.lastWheat, 6); i++) wheatBundle(this.storedWheat, i * .17);
    }

    this.game.crops.forEach((crop, i) => {
      const remaining = crop.readyAt - this.game.elapsed;
      const growth = remaining <= 0 ? 1 : remaining < 3 ? .08 + .92 * (1 - remaining / 3) : .08;
      this.matrix.position.set(crop.x, .09, crop.z);
      this.matrix.scale.set(.95, growth, .95);
      this.matrix.rotation.set(0, i * 2.4, this.reducedMotion ? 0 : Math.sin(time * 1.7 + i * .4) * .04 * growth);
      this.matrix.updateMatrix(); this.cropStalks.setMatrixAt(i, this.matrix.matrix); this.cropHeads.setMatrixAt(i, this.matrix.matrix);
    });
    this.cropStalks.instanceMatrix.needsUpdate = true; this.cropHeads.instanceMatrix.needsUpdate = true;
    this.cropStalks.computeBoundingSphere(); this.cropHeads.computeBoundingSphere();

    const cooking = s.ovenWheat >= 3 && s.readyPizzas < 24;
    this.ovenGlow.visible = cooking; this.ovenLight.intensity = cooking ? 2 + Math.sin(time * 15) * .5 : 0;
    this.smoke.forEach((puff, i) => {
      const phase = (time * .35 + i * .25) % 1;
      puff.visible = cooking;
      puff.position.set(3.4 + phase * .7, 3.9 + phase * 1.9, -5.05);
      puff.scale.setScalar(.5 + phase * 1.7);
      (puff.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * .3;
    });
    this.car.position.x = ((time * 1.35 + 8) % 28) - 14;
    if (this.reducedMotion) this.car.position.x = -8;
    this.saleHop = Math.max(0, this.saleHop - dt);
    this.customers.forEach((customer, i) => { customer.body.position.y = .58 + (i === s.served % 3 && this.saleHop > 0 ? Math.sin(this.saleHop * Math.PI / .7) * .25 : Math.sin(time * 2 + i) * .012); });

    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(time * 3) * .035;
    [this.deliveryRing, this.pickupRing, this.counterRing].forEach(ring => ring.scale.setScalar(pulse));
    this.goalArrow.visible = playing && s.served < 2;
    const target = this.game.objective.target;
    this.goalArrow.position.set(target.x, 2.5 + (this.reducedMotion ? 0 : Math.sin(time * 3) * .13), target.z);
    this.goalArrow.quaternion.copy(this.camera.quaternion);

    this.particles = this.particles.filter(particle => {
      particle.life -= dt;
      if (particle.life <= 0) { this.scene.remove(particle.mesh); particle.mesh.geometry.dispose(); return false; }
      particle.velocity.y -= dt * 8;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.scale.setScalar(Math.min(1, particle.life * 4)); return true;
    });
    this.flying = this.flying.filter(item => {
      item.t += dt * 2.9;
      if (item.t >= 1) { this.clearGroup(item.root); this.scene.remove(item.root); return false; }
      item.root.position.lerpVectors(item.start, item.end, item.t);
      item.root.position.y += Math.sin(item.t * Math.PI) * 1.4; return true;
    });
    this.renderer.render(this.scene, this.camera);
  }

  face(direction: Point, dt: number) {
    if (Math.hypot(direction.x, direction.z) < .02) return;
    const target = Math.atan2(direction.x, direction.z);
    const difference = Math.atan2(Math.sin(target - this.player.root.rotation.y), Math.cos(target - this.player.root.rotation.y));
    this.player.root.rotation.y += difference * Math.min(1, dt * 16);
  }

  private clearGroup(g: THREE.Group) {
    g.traverse(object => { if (object instanceof THREE.Mesh && object.geometry !== rounded) object.geometry.dispose(); });
    g.clear();
  }
}
