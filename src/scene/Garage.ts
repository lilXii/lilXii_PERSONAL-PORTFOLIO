import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { asset, brand, entries } from '../data/content';

export type Quality = 'auto' | 'high' | 'low';
type Vec = [number, number, number];
type Shot = { position: THREE.Vector3; target: THREE.Vector3 };
type Options = {
  reduced: boolean; intro: boolean; quality: Quality;
  onReady: () => void; onProgress: (value: number) => void;
  onError: () => void; onSelect: (id: string) => void;
  onHover: (id: string | null, x: number, y: number) => void;
  onIntroEnd: () => void; onQuality: (quality: 'high' | 'low') => void;
};
export class Garage {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private options: Options;
  private host: HTMLDivElement;
  private observer: ResizeObserver;
  private interactive: THREE.Object3D[] = [];
  private wall = new THREE.Group();
  private door = new THREE.Group();
  private entrance = new THREE.Group();
  private entranceActive = false;
  private blocked = false;
  private lights: THREE.Light[] = [];
  private disposed = false;
  private loaded = 0;
  private modelCount = entries.filter(entry => entry.model).length;
  private selected: string | null = null;
  private saved: Shot | null = null;
  private anim: { start: number; duration: number; from: Shot; to: Shot } | null = null;
  private introStart: number | null = null;
  private frame = 0;
  private lastFrame = 0;
  private frames = 0;
  private elapsed = 0;
  private effectiveQuality: 'high' | 'low' = 'high';
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private down = new THREE.Vector2();
  private dragDistance = 0;
  private gesture = false;
  private pointers = new Set<number>();
  private abort = new AbortController();
  private collisionBoxes: THREE.Box3[] = [];
  private needsRender = true;
  private focusPositions: Record<string, Vec> = {
    'car-a': [-2.35, 0.9, 1.1], 'car-b': [2.35, 0.9, 1.1],
    'arcade-01': [-4.65, 1.65, -2.55], 'arcade-02': [-2.75, 1.65, -2.55], 'xr-lab': [4.45, 1.6, -2.35], 'photography': [.5, 1.65, -3.4],
  };
  constructor(host: HTMLDivElement, options: Options) {
    this.host = host; this.options = options;
    this.entranceActive = options.intro && !options.reduced;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x0a0c10, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', () => { this.needsRender = true; });
    this.controls.addEventListener('start', () => this.options.onHover(null, 0, 0));
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.65;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.40;
    this.controls.minDistance = 11.5;
    this.controls.maxDistance = 25;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    this.controls.enabled = false;
    const home = this.overview(); this.camera.position.copy(home.position); this.controls.target.copy(home.target);
    this.controls.update();
    this.createEnvironment();
    if (this.entranceActive) this.placeCamera(this.entranceShot());
    this.setQuality(options.quality);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    const eventOptions = { signal: this.abort.signal };
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown, eventOptions);
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove, eventOptions);
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp, eventOptions);
    this.renderer.domElement.addEventListener('pointercancel', this.pointerCancel, eventOptions);
    this.renderer.domElement.addEventListener('pointerleave', () => this.options.onHover(null, 0, 0), eventOptions);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.options.onError(); }, eventOptions);
    this.loadModels();
    this.frame = requestAnimationFrame(this.render);
  }
  private material(color: string, metalness = 0.1, roughness = 0.65) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness });
  }
  private box(parent: THREE.Object3D, pos: Vec, size: Vec, color: string, glow = false) {
    const mat = glow ? new THREE.MeshBasicMaterial({ color, toneMapped: false }) : this.material(color);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos); mesh.castShadow = !glow; mesh.receiveShadow = !glow; parent.add(mesh); return mesh;
  }
  private text(parent: THREE.Object3D, label: string, pos: Vec, width: number, color = '#e8edf2', size = 64) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(label, 512, 80);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 160 / 1024), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
    mesh.position.set(...pos); parent.add(mesh); return mesh;
  }
  private glow(pos: Vec, color: string, width: number, depth: number) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!; const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.23, depthWrite: false, blending: THREE.AdditiveBlending }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(...pos); this.scene.add(plane);
  }
  private createEnvironment() {
    this.scene.add(new THREE.HemisphereLight('#cbd9ff', '#2a2038', 2.1));
    const key = new THREE.DirectionalLight('#f4f0e6', 4.0); key.position.set(2, 10, 5);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 0.5, far: 24 });
    key.shadow.bias = -0.001; key.shadow.normalBias = 0.025; this.scene.add(key); this.lights.push(key);
    for (const [color, x] of [['#ff2896', -5], ['#20d9ff', 5]] as const) {
      const light = new THREE.PointLight(color, 28, 14, 2); light.position.set(x, 3, 1); this.scene.add(light);
    }
    const base = this.box(this.scene, [0, -0.25, 0], [12.6, 0.5, 9.2], '#1b2029');
    base.material = this.material('#252933', 0.38, 0.65);
    const tiles = document.createElement('canvas'); tiles.width = tiles.height = 64;
    const ctx = tiles.getContext('2d')!; ctx.fillStyle = '#30343c'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#343841'; ctx.fillRect(0, 0, 32, 32); ctx.fillRect(32, 32, 32, 32);
    ctx.strokeStyle = '#1f232b'; ctx.strokeRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i++) { ctx.fillStyle = i % 2 ? '#373b43' : '#2c3037'; ctx.fillRect((i * 17) % 64, (i * 31) % 64, 2, 2); }
    const tex = new THREE.CanvasTexture(tiles); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 8); tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 9.1), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.4, roughness: 0.58 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; this.scene.add(floor);
    this.scene.add(this.wall);
    this.box(this.wall, [0, 2.25, -4.45], [12.6, 4.6, 0.22], '#20252d');
    for (let x = -6; x <= 6; x += 1.5) this.box(this.wall, [x, 2.3, -4.29], [0.045, 4.5, 0.05], '#323a44');
    this.box(this.wall, [0, 4.5, -4.15], [12.7, 0.20, 0.35], '#414955');
    this.box(this.wall, [0, 4.27, -4.2], [11.8, 0.035, 0.05], '#53d9ed', true);
    this.box(this.wall, [-3.3, 0.3, -4.2], [5.2, 0.04, 0.04], '#ff4da6', true);
    this.box(this.wall, [3.3, 0.3, -4.2], [5.2, 0.04, 0.04], '#53d9ed', true);
    this.text(this.wall, brand.name, [0.7, 3.25, -4.3], 6.3, '#b7f87a', 136);
    this.text(this.wall, brand.tagline, [0.7, 2.65, -4.3], 6.1, '#839098', 42);
    // Open sides and a view-dependent back wall preserve full horizontal orbit.
    for (const x of [-6.15, 6.15]) {
      this.box(this.wall, [x, 2.2, -4.15], [0.25, 4.4, 0.4], '#424854');
      this.box(this.wall, [x * 0.99, 2.2, -3.91], [0.06, 3.8, 0.04], x < 0 ? '#ff4da6' : '#53d9ed', true);
    }
    for (const [x, color, label] of [[-2.35, '#ff4da6', '01'], [2.35, '#53d9ed', '02']] as const) {
      for (const edge of [-1.68, 1.68]) this.box(this.scene, [x + edge, 0.025, 0.9], [0.035, 0.016, 4.9], color, true);
      this.box(this.scene, [x, 0.025, 3.35], [3.4, 0.016, 0.035], color, true);
      const num = this.text(this.scene, label, [x, 0.035, 3.75], 1.4, color, 96); num.rotation.x = -Math.PI / 2;
      this.glow([x, 0.028, 1], color, 5.5, 6.5);
    }
    for (let i = 0; i < 24; i++) this.box(this.scene, [-5.8 + i * 0.50, 0.018, 4.36], [0.25, 0.014, 0.12], i % 2 ? '#a4aa6a' : '#292c32');
    this.arcade('arcade-01', [-4.65, 0, -2.55], '#b7f87a', '01');
    this.arcade('arcade-02', [-2.75, 0, -2.55], '#b99aff', '02');
    this.vr();
    // Tool cabinet, pegboard, wall cables and stacked tires are authored primitives.
    this.box(this.scene, [0.5, 0.55, -3.7], [2.7, 1.1, 0.8], '#202a36');
    this.box(this.scene, [0.5, 1.13, -3.7], [2.9, 0.12, 0.92], '#74828b');
    for (let y = 0.2; y < 1; y += 0.23) {
      this.box(this.scene, [0.5, y, -3.285], [2.5, 0.035, 0.02], '#495563');
      this.box(this.scene, [0.5, y + 0.09, -3.26], [0.5, 0.035, 0.05], '#8b949c');
    }
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 6, 16), this.material('#11151a'));
      tire.rotation.x = Math.PI / 2; tire.position.set(5.4, 0.15 + i * 0.25, -0.8); tire.castShadow = true; this.scene.add(tire);
    }
    this.scene.add(this.door, this.entrance);
    // A continuous opaque backing seals the gaps between shutter slats.
    this.box(this.door, [0, 2.25, 4.5], [12.6, 4.6, 0.16], '#272e37');
    for (let y = 0.12; y < 4.5; y += 0.24) this.box(this.door, [0, y, 4.61], [12.5, 0.22, 0.10], '#303945');
    this.text(this.door, brand.name, [0, 2.65, 4.68], 7, '#b7f87a', 144);
    this.text(this.door, brand.tagline, [0, 1.98, 4.68], 6, '#b8c3c9', 52);
    this.box(this.door, [0, 0.12, 4.69], [12.5, 0.08, 0.1], '#b7f87a', true);
    // The facade covers the full initial frustum, including above and beside the opening.
    for (const x of [-16.3, 16.3]) this.box(this.entrance, [x, 5, 4.85], [20, 40, 0.35], '#151b22');
    this.box(this.entrance, [0, 14.65, 4.85], [12.6, 20, 0.35], '#151b22');
    this.box(this.entrance, [0, -10.1, 4.85], [12.6, 20, 0.35], '#151b22');
    for (const x of [-6.3, 6.3]) this.box(this.entrance, [x, 2.3, 5.06], [0.15, 4.7, 0.12], x < 0 ? '#ff4da6' : '#53d9ed', true);
    this.box(this.entrance, [0, 4.67, 5.06], [12.7, 0.12, 0.12], '#64737c');
    // These temporary entrance meshes fade as one overlay. They must not keep
    // invisible depth/shadows, or change shader/render queues during the fade.
    for (const group of [this.entrance, this.door]) group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = false;
      const material = object.material as THREE.Material;
      material.transparent = true; material.depthWrite = false;
    });
    this.door.visible = this.entrance.visible = this.entranceActive;
  }
  private arcade(id: string, pos: Vec, color: string, number: string) {
    const group = new THREE.Group(); group.position.set(...pos); group.scale.setScalar(1.45); group.userData.target = id;
    this.box(group, [0, 0.62, 0], [1.02, 1.24, 0.85], '#191d27');
    this.box(group, [0, 1.65, -0.1], [1.02, 1.04, 0.6], '#151a22');
    this.box(group, [0, 2.23, -0.06], [1.1, 0.3, 0.8], color);
    this.box(group, [0, 1.7, 0.22], [0.84, 0.68, 0.05], color, true);
    const screen = this.box(group, [0, 1.7, 0.255], [0.75, 0.58, 0.02], '#0d2028', true);
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#0a1921'; ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = color; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(`PROJECT ${number}`, 64, 21);
    for (let x = 0; x < 8; x++) for (let y = 0; y < 4; y++) if ((x + y) % 3 !== 0) ctx.fillRect(31 + x * 9, 32 + y * 8, 6, 5);
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.fillText('SELECT TO EXPLORE', 64, 82);
    const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter; texture.colorSpace = THREE.SRGBColorSpace;
    (screen.material as THREE.MeshBasicMaterial).map = texture;
    const deck = this.box(group, [0, 1.22, 0.3], [1.05, 0.15, 0.65], '#3b4351'); deck.rotation.x = 0.17;
    this.box(group, [-0.26, 1.4, 0.41], [0.055, 0.24, 0.055], '#b1bbc5');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), this.material(color)); ball.position.set(-0.26, 1.53, 0.41); group.add(ball);
    for (let i = 0; i < 3; i++) this.box(group, [0.08 + i * 0.13, 1.32, 0.5], [0.09, 0.05, 0.09], ['#ff4da6', '#53d9ed', '#b7f87a'][i], true);
    this.text(group, `ARCADE ${number}`, [0, 2.23, 0.35], 0.9, '#0b1720', 72);
    this.text(group, number, [0, 0.6, 0.44], 0.65, color, 100);
    for (const x of [-0.49, 0.49]) this.box(group, [x, 0.7, 0.44], [0.025, 1.1, 0.025], color, true);
    this.scene.add(group); this.interactive.push(group); this.collisionBoxes.push(new THREE.Box3().setFromObject(group));
  }
  private vr() {
    const group = new THREE.Group(); group.position.set(4.45, 0, -2.35); group.scale.setScalar(1.45); group.userData.target = 'xr-lab';
    this.box(group, [0, 0.6, 0], [1.45, 1.2, 1.1], '#1c2631');
    this.box(group, [0, 1.23, 0], [1.5, 0.06, 1.15], '#53d9ed', true);
    this.box(group, [0, 1.45, 0], [0.12, 0.45, 0.12], '#717b8b');
    const head = this.box(group, [0, 1.76, 0], [0.95, 0.46, 0.52], '#d6e5e9'); head.rotation.z = -0.08;
    this.box(group, [0, 1.75, 0.29], [0.81, 0.31, 0.06], '#151d2d');
    this.box(group, [0, 1.62, 0.33], [0.65, 0.025, 0.015], '#53d9ed', true);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 4, 12, Math.PI), this.material('#879ca8'));
    strap.position.set(0, 1.8, -0.14); strap.rotation.x = Math.PI / 2; group.add(strap);
    for (const x of [-0.55, 0.55]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.024, 4, 10), this.material('#cddce3'));
      ring.position.set(x, 1.45, 0.12); group.add(ring);
      this.box(group, [x, 1.34, 0.12], [0.07, 0.2, 0.08], '#d8e5ec');
    }
    this.text(group, 'XR LAB', [0, 0.72, 0.56], 1.2, '#53d9ed', 94);
    this.text(group, 'BEYOND THE SCREEN', [0, 0.4, 0.56], 1.2, '#7f949f', 40);
    this.scene.add(group); this.interactive.push(group); this.collisionBoxes.push(new THREE.Box3().setFromObject(group));
    this.glow([4.2, 0.032, -2.65], '#53d9ed', 4, 3);
  }
  private async loadModels() {
    const loader = new GLTFLoader();
    try {
      await Promise.all(entries.filter(entry => entry.model).map(async entry => {
        const model = await loader.loadAsync(asset(entry.model!));
        if (this.disposed) { this.disposeObject(model.scene); return; }
        // The supplied static prototypes have dozens of meshes per material.
        // Merge just these known assets; future animated replacements stay intact.
        if (entry.model!.includes('-prototype.glb')) {
          const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
          model.scene.updateMatrixWorld(true);
          model.scene.traverse(object => {
            if (object instanceof THREE.Mesh && !Array.isArray(object.material)) {
              const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
              const batch = batches.get(object.material) ?? []; batch.push(geometry); batches.set(object.material, batch);
              object.geometry.dispose();
            }
          });
          model.scene.clear();
          for (const [material, geometries] of batches) {
            const merged = mergeGeometries(geometries);
            if (merged) model.scene.add(new THREE.Mesh(merged, material));
            geometries.forEach(geometry => geometry.dispose());
          }
        }
        if (!entry.placement) throw new Error(`Missing model placement: ${entry.id}`);
        model.scene.position.set(...entry.placement.position);
        model.scene.rotation.y = entry.placement.rotationY;
        model.scene.scale.setScalar(entry.placement.scale);
        model.scene.userData.target = entry.id;
        model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        this.scene.add(model.scene); this.interactive.push(model.scene);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(model.scene));
        this.loaded++; this.needsRender = true; this.options.onProgress(Math.round(this.loaded / this.modelCount * 100));
      }));
      if (this.disposed) return;
      this.options.onReady();
      if (this.entranceActive) this.introStart = performance.now();
      else { this.controls.enabled = !this.blocked; this.options.onIntroEnd(); }
    } catch (error) { if (!this.disposed) { console.error('Garage model loading failed:', error); this.options.onError(); } }
  }
  private overview(): Shot {
    const mobile = this.host.clientWidth < 650;
    return { position: new THREE.Vector3(...(mobile ? [8.8, 13.4, 23.3] : [5.6, 8.4, 13.6]) as Vec), target: new THREE.Vector3(0, 1.2, -0.2) };
  }
  private entranceShot(): Shot { return { position: new THREE.Vector3(0, 2.25, this.host.clientWidth < 650 ? 25 : 15.8), target: new THREE.Vector3(0, 2.25, 0) }; }
  private placeCamera(shot: Shot) { this.camera.position.copy(shot.position); this.controls.target.copy(shot.target); this.camera.lookAt(shot.target); this.needsRender = true; }
  private snapshot(): Shot { return { position: this.camera.position.clone(), target: this.controls.target.clone() }; }
  private settleControls() {
    // Flush pending drag damping without moving the scripted camera. No private
    // OrbitControls fields: a non-damped update consumes the remaining deltas.
    const shot = this.snapshot();
    this.controls.enableDamping = false; this.controls.update();
    this.placeCamera(shot); this.controls.update();
    this.controls.enableDamping = true;
  }
  private moveTo(to: Shot, duration = 900) {
    this.settleControls();
    this.anim = { from: this.snapshot(), to, start: performance.now(), duration: this.options.reduced ? 0 : duration };
    this.controls.enabled = false;
  }
  select(id: string | null) {
    if (id === this.selected) return;
    this.skipIntro();
    if (id) {
      if (!this.selected) this.saved = this.snapshot();
      this.selected = id;
      const p = this.focusPositions[id];
      if (p) {
        const target = new THREE.Vector3(...p);
        // Focus cameras remain outside object bounds. The reading panel locks orbit.
        this.moveTo({ target, position: target.clone().add(new THREE.Vector3(5.9, 5.9, 8.6)) });
      }
    } else {
      this.selected = null; this.moveTo(this.saved ?? this.overview()); this.saved = null;
    }
  }
  setBlocked(blocked: boolean) { this.blocked = blocked; this.controls.enabled = !blocked && !this.anim && !this.entranceActive && this.loaded === this.modelCount; }
  home() { this.saved = null; this.selected = null; this.skipIntro(); this.moveTo(this.overview()); }
  skipIntro() {
    this.options.intro = false;
    if (this.entranceActive) {
      this.entranceActive = false; this.introStart = null; this.door.visible = this.entrance.visible = false;
      this.placeCamera(this.overview()); this.anim = null;
      this.settleControls();
      this.controls.enabled = !this.blocked && this.loaded === this.modelCount;
    }
    this.options.onIntroEnd();
  }
  setReduced(reduced: boolean) { this.options.reduced = reduced; if (reduced) { this.skipIntro(); if (this.anim) this.anim.duration = 0; } }
  setQuality(quality: Quality) {
    this.options.quality = quality;
    this.effectiveQuality = quality === 'auto' ? (matchMedia('(max-width: 700px)').matches || navigator.hardwareConcurrency <= 4 ? 'low' : 'high') : quality;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.effectiveQuality === 'low' ? 1.25 : 1.75));
    this.renderer.shadowMap.enabled = this.effectiveQuality === 'high';
    this.lights.forEach(light => { light.castShadow = this.effectiveQuality === 'high'; });
    this.renderer.shadowMap.needsUpdate = true;
    this.needsRender = true;
    this.options.onQuality(this.effectiveQuality); this.frames = 0; this.elapsed = 0;
  }
  private resize() {
    const width = this.host.clientWidth; const height = this.host.clientHeight;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x === width && size.y === height) return;
    this.renderer.setSize(width, height); this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix();
    this.controls.maxDistance = width < 650 ? 32 : 25;
    // ResizeObserver runs after RAF: paint the new buffer before the browser
    // composites it, rather than exposing a cleared canvas for one frame.
    this.renderer.render(this.scene, this.camera);
    this.needsRender = true;
  }
  private hit(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    let object: THREE.Object3D | undefined = this.ray.intersectObjects(this.interactive, true)[0]?.object;
    while (object && !object.userData.target) object = object.parent ?? undefined;
    return object?.userData.target as string | undefined;
  }
  private pointerDown = (event: PointerEvent) => {
    this.options.onHover(null, 0, 0);
    this.pointers.add(event.pointerId);
    if (this.pointers.size > 1) this.gesture = true;
    if (this.pointers.size === 1) { this.down.set(event.clientX, event.clientY); this.dragDistance = 0; this.gesture = false; }
  };
  private pointerMove = (event: PointerEvent) => {
    if (this.pointers.size) this.dragDistance = Math.max(this.dragDistance, this.down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)));
    if (!this.controls.enabled || this.pointers.size || event.pointerType === 'touch') { this.options.onHover(null, 0, 0); return; }
    const id = this.hit(event); this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    this.options.onHover(id ?? null, event.clientX, event.clientY);
  };
  private pointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (!this.controls.enabled || this.dragDistance > 7 || this.gesture || event.button !== 0) return;
    const id = this.hit(event); if (id) this.options.onSelect(id);
  };
  private pointerCancel = (event: PointerEvent) => { this.pointers.delete(event.pointerId); this.gesture = true; };
  private render = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.render);
    if (document.hidden) { this.lastFrame = now; return; }
    if (this.lastFrame && this.needsRender && !this.anim && !this.entranceActive && this.loaded === this.modelCount) {
      this.elapsed += now - this.lastFrame; this.frames++;
      if (this.frames === 150 && this.options.quality === 'auto' && this.effectiveQuality === 'high' && this.elapsed / this.frames > 35) {
        this.setQuality('low'); this.options.quality = 'auto';
      }
    }
    this.lastFrame = now;
    if (this.entranceActive) {
      this.needsRender = true;
      const elapsed = this.introStart === null ? 0 : now - this.introStart;
      const opening = THREE.MathUtils.smoothstep(elapsed, 350, 1950);
      this.door.position.y = opening * 4.8;
      // Hold the camera square to the door until the shutter is completely clear.
      const move = THREE.MathUtils.smoothstep(elapsed, 2200, 3700);
      const start = this.entranceShot(), end = this.overview();
      this.placeCamera({ position: start.position.lerp(end.position, move), target: start.target.lerp(end.target, move) });
      const opacity = 1 - THREE.MathUtils.smoothstep(elapsed, 2050, 2450);
      for (const group of [this.entrance, this.door]) group.traverse(object => { if (object instanceof THREE.Mesh) {
        (object.material as THREE.Material).opacity = opacity;
      } });
      if (opacity === 0) this.entrance.visible = this.door.visible = false;
      if (elapsed >= 3700) {
        this.settleControls();
        this.entranceActive = false; this.introStart = null; this.options.onIntroEnd(); this.controls.enabled = !this.blocked;
      }
    }
    if (this.anim) {
      this.needsRender = true;
      const t = this.anim.duration === 0 ? 1 : Math.min((now - this.anim.start) / this.anim.duration, 1);
      const eased = t * t * (3 - 2 * t);
      this.controls.target.lerpVectors(this.anim.from.target, this.anim.to.target, eased);
      // Travel on a spherical arc, never a chord through the cars or cabinets.
      const from = new THREE.Spherical().setFromVector3(this.anim.from.position.clone().sub(this.anim.from.target));
      const to = new THREE.Spherical().setFromVector3(this.anim.to.position.clone().sub(this.anim.to.target));
      const angle = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
      const sphere = new THREE.Spherical(THREE.MathUtils.lerp(from.radius, to.radius, eased), THREE.MathUtils.lerp(from.phi, to.phi, eased), from.theta + angle * eased);
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sphere));
      this.camera.lookAt(this.controls.target);
      if (t === 1) { this.settleControls(); this.anim = null; this.controls.enabled = !this.blocked; }
    }
    if (!this.entranceActive && !this.anim) this.controls.update();
    this.wall.visible = this.camera.position.z > -1.5;
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera); this.needsRender = false;
    }
  };
  diagnostics() {
    return { loaded: this.loaded, modelCount: this.modelCount, camera: this.camera.position.toArray(), target: this.controls.target.toArray(),
      distance: this.camera.position.distanceTo(this.controls.target), polar: this.controls.getPolarAngle(),
      collision: this.collisionBoxes.some(box => box.clone().expandByScalar(0.15).containsPoint(this.camera.position)),
      intro: this.entranceActive, transitioning: !!this.anim || this.entranceActive, selected: this.selected,
      entrance: { visible: this.entrance.visible, doorHeight: this.door.position.y,
        elapsed: this.introStart === null ? null : performance.now() - this.introStart,
        surfaces: [this.entrance, this.door].flatMap(group => {
          const surfaces: { opacity: number; depthWrite: boolean; castShadow: boolean }[] = [];
          group.traverse(object => { if (object instanceof THREE.Mesh) surfaces.push({
            opacity: (object.material as THREE.Material).opacity,
            depthWrite: (object.material as THREE.Material).depthWrite, castShadow: object.castShadow,
          }); }); return surfaces;
        }),
        occluded: this.interactive.map(object => {
          const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
          const ray = new THREE.Raycaster(this.camera.position, center.clone().sub(this.camera.position).normalize());
          const hit = ray.intersectObjects([this.entrance, this.door], true)[0];
          return { id: object.userData.target, blocked: this.entranceActive && !!hit && hit.distance < center.distanceTo(this.camera.position) };
        }) },
      quality: this.effectiveQuality, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      objectScreens: this.interactive.map(object => { const point = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(this.camera); return { id: object.userData.target, x: (point.x + 1) / 2 * this.host.clientWidth, y: (1 - point.y) / 2 * this.host.clientHeight }; }),
    };
  }
  private disposeObject(root: THREE.Object3D) {
    root.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      }
    });
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.abort.abort(); this.observer.disconnect();
    this.controls.dispose(); this.disposeObject(this.scene); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
