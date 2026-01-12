
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private animationId: number = 0;

  // Ghost Block & Placement
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private ghostMesh: THREE.Mesh | null = null;
  private floorMesh: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private isEditMode = false;
  private lastGhostPos = new THREE.Vector3();

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(30, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.set(0, 5, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Floor
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 });
    this.floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), planeMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = CONFIG.FLOOR_Y;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Grid Helper
    this.gridHelper = new THREE.GridHelper(100, 100, 0x94a3b8, 0xcbd5e1);
    this.gridHelper.position.y = CONFIG.FLOOR_Y + 0.01;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);

    // Init Ghost Mesh
    const ghostGeo = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE + 0.02, CONFIG.VOXEL_SIZE + 0.02, CONFIG.VOXEL_SIZE + 0.02);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x4dabf7,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      emissive: 0x4dabf7,
      emissiveIntensity: 0.5
    });
    this.ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostMesh.visible = false;
    this.scene.add(this.ghostMesh);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        return {
            id: i,
            x: v.x, y: v.y, z: v.z, color: c,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0
        };
    });

    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    this.instanceMesh.instanceColor!.needsUpdate = true;
  }

  public setEditMode(enabled: boolean) {
    this.isEditMode = enabled;
    if (this.ghostMesh) {
      this.ghostMesh.visible = enabled;
    }
  }

  public setGridVisible(visible: boolean) {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  public updateGhost(clientX: number, clientY: number, mode: 'add' | 'delete' = 'add') {
    if (!this.isEditMode || !this.ghostMesh) return;

    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets = [];
    if (this.instanceMesh) targets.push(this.instanceMesh);
    if (this.floorMesh) targets.push(this.floorMesh);

    const intersects = this.raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const pos = intersect.point.clone();
      
      if (mode === 'add') {
        if (intersect.object === this.instanceMesh) {
          pos.add(intersect.face!.normal.clone().multiplyScalar(0.5));
        } else {
          pos.y += 0.5;
        }
        (this.ghostMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4dabf7);
        (this.ghostMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x4dabf7);
      } else {
        // Delete mode - highlight the voxel we are hitting directly
        if (intersect.object === this.floorMesh) {
           this.ghostMesh.visible = false;
           return;
        }
        (this.ghostMesh.material as THREE.MeshStandardMaterial).color.setHex(0xff5555);
        (this.ghostMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xff5555);
      }

      const snapped = new THREE.Vector3(
        Math.round(pos.x),
        Math.round(pos.y),
        Math.round(pos.z)
      );

      if (snapped.y < CONFIG.FLOOR_Y + 0.5) snapped.y = CONFIG.FLOOR_Y + 0.5;

      this.ghostMesh.position.copy(snapped);
      this.ghostMesh.visible = true;
      this.lastGhostPos.copy(snapped);
    } else {
      this.ghostMesh.visible = false;
    }
  }

  public getGhostPosition(): THREE.Vector3 | null {
    return this.ghostMesh && this.ghostMesh.visible ? this.lastGhostPos.clone() : null;
  }

  public addVoxel(pos: THREE.Vector3, colorHex: number) {
    const newData: VoxelData[] = this.voxels.map(v => ({
      x: v.x, y: v.y, z: v.z, color: v.color.getHex()
    }));
    
    const exists = newData.some(v => v.x === pos.x && v.y === pos.y && v.z === pos.z);
    if (exists) return;

    newData.push({ x: pos.x, y: pos.y, z: pos.z, color: colorHex });
    this.loadInitialModel(newData);
  }

  public removeVoxel(pos: THREE.Vector3) {
    const newData: VoxelData[] = this.voxels
      .filter(v => !(v.x === pos.x && v.y === pos.y && v.z === pos.z))
      .map(v => ({
        x: v.x, y: v.y, z: v.z, color: v.color.getHex()
      }));
    
    if (newData.length === this.voxels.length) return; // Nothing removed

    this.loadInitialModel(newData);
  }

  public dismantle() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);

    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.8;
        v.vy = Math.random() * 0.5;
        v.vz = (Math.random() - 0.5) * 0.8;
        v.rvx = (Math.random() - 0.5) * 0.2;
        v.rvy = (Math.random() - 0.5) * 0.2;
        v.rvz = (Math.random() - 0.5) * 0.2;
    });
  }

  private getColorDist(c1: THREE.Color, hex2: number): number {
    const c2 = new THREE.Color(hex2);
    const r = (c1.r - c2.r) * 0.3;
    const g = (c1.g - c2.g) * 0.59;
    const b = (c1.b - c2.b) * 0.11;
    return Math.sqrt(r * r + g * g + b * b);
  }

  public rebuild(targetModel: VoxelData[]) {
    if (this.state === AppState.REBUILDING) return;

    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);

    targetModel.forEach(target => {
        let bestDist = 9999;
        let bestIdx = -1;

        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;
            const d = this.getColorDist(available[i].color, target.color);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
                if (d < 0.01) break;
            }
        }

        if (bestIdx !== -1) {
            available[bestIdx].taken = true;
            const h = Math.max(0, (target.y - CONFIG.FLOOR_Y) / 15);
            mappings[available[bestIdx].index] = {
                x: target.x, y: target.y, z: target.z,
                delay: h * 800
            };
        }
    });

    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
            mappings[i] = {
                x: this.voxels[i].x, y: this.voxels[i].y, z: this.voxels[i].z,
                isRubble: true, delay: 0
            };
        }
    }

    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
  }

  private updatePhysics() {
    if (this.state === AppState.DISMANTLING) {
        this.voxels.forEach(v => {
            v.vy -= 0.025;
            v.x += v.vx; v.y += v.vy; v.z += v.vz;
            v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;

            if (v.y < CONFIG.FLOOR_Y + 0.5) {
                v.y = CONFIG.FLOOR_Y + 0.5;
                v.vy *= -0.5; v.vx *= 0.9; v.vz *= 0.9;
                v.rvx *= 0.8; v.rvy *= 0.8; v.rvz *= 0.8;
            }
        });
    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = now - this.rebuildStartTime;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (t.isRubble) return;

            if (elapsed < t.delay) {
                allDone = false;
                return;
            }

            const speed = 0.12;
            v.x += (t.x - v.x) * speed;
            v.y += (t.y - v.y) * speed;
            v.z += (t.z - v.z) * speed;
            v.rx += (0 - v.rx) * speed;
            v.ry += (0 - v.ry) * speed;
            v.rz += (0 - v.rz) * speed;

            if ((t.x - v.x) ** 2 + (t.y - v.y) ** 2 + (t.z - v.z) ** 2 > 0.01) {
                allDone = false;
            } else {
                v.x = t.x; v.y = t.y; v.z = t.z;
                v.rx = 0; v.ry = 0; v.rz = 0;
            }
        });

        if (allDone) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
        }
    }

    if (this.ghostMesh && this.ghostMesh.visible) {
      const time = Date.now() * 0.005;
      this.ghostMesh.material.opacity = 0.4 + Math.sin(time) * 0.15;
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    
    if (this.state !== AppState.STABLE || this.controls.autoRotate || this.isEditMode) {
        this.draw();
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public getVoxelData(): VoxelData[] {
    return this.voxels.map(v => ({
      x: v.x,
      y: v.y,
      z: v.z,
      color: v.color.getHex()
    }));
  }

  public getJsonData(): string {
      const data = this.voxels.map((v, i) => ({
          id: i,
          x: +v.x.toFixed(2),
          y: +v.y.toFixed(2),
          z: +v.z.toFixed(2),
          c: '#' + v.color.getHexString()
      }));
      return JSON.stringify(data, null, 2);
  }
  
  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => {
        colors.add('#' + v.color.getHexString());
    });
    return Array.from(colors);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
