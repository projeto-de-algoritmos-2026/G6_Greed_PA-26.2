import * as THREE from 'three';
import { AuxiliaryScreenCanvas, type AuxiliaryScreenState } from '../auxiliaryScreenCanvas';
import { createDarkRibTexture } from '../textures/procedural';

export class AuxMonitor {
	public readonly group: THREE.Group;
	public readonly auxScreenMesh: THREE.Mesh;
	public readonly auxCanvas: AuxiliaryScreenCanvas;
	private auxTexture: THREE.CanvasTexture;
	private isDirty: boolean = true;
	private lastAuxBlinkTime: number = 0;

	constructor() {
		this.group = new THREE.Group();
		this.group.position.set(3.1, 0.45, 0.70);
		this.group.rotation.y = -Math.PI * 0.27;
		this.group.rotation.x = -Math.PI * 0.02;

		const casingMat = new THREE.MeshLambertMaterial({
			color: 0x202a32,
			map: createDarkRibTexture()
		});
		const bezelMat = new THREE.MeshLambertMaterial({
			color: 0x283642,
			map: createDarkRibTexture()
		});

		const casing = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.05, 0.95), casingMat);
		casing.position.set(0, 0, -0.52);
		this.group.add(casing);

		const standArm = new THREE.Mesh(
			new THREE.CylinderGeometry(0.08, 0.09, 1.55, 16),
			new THREE.MeshLambertMaterial({ color: 0x2a3844 })
		);
		standArm.position.set(0, -0.78, -0.2);
		this.group.add(standArm);

		const topB = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.22, 0.16), bezelMat);
		topB.position.set(0, 0.895, 0.04);
		const botB = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.28, 0.16), bezelMat);
		botB.position.set(0, -0.865, 0.04);
		const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.05, 0.16), bezelMat);
		leftB.position.set(-1.16, 0, 0.04);
		const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.05, 0.16), bezelMat);
		rightB.position.set(1.16, 0, 0.04);
		this.group.add(topB, botB, leftB, rightB);

		const labelCanvas = document.createElement('canvas');
		labelCanvas.width = 512;
		labelCanvas.height = 64;
		const lctx = labelCanvas.getContext('2d')!;
		lctx.fillStyle = '#120a02';
		lctx.fillRect(0, 0, 512, 64);
		lctx.font = 'bold 24px "Courier New", monospace';
		lctx.fillStyle = '#ff9922';
		lctx.textAlign = 'center';
		lctx.fillText('CONSOLE B // LOG TELETYPE', 256, 42);

		const plate = new THREE.Mesh(
			new THREE.PlaneGeometry(1.9, 0.18),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
		);
		plate.position.set(0, 0.90, 0.13);
		this.group.add(plate);

		const auxGeo = new THREE.PlaneGeometry(2.15, 1.55, 24, 18);
		const pos = auxGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = -0.05 * ((x * x) / 3.0 + (y * y) / 2.2);
			pos.setZ(i, z);
		}
		auxGeo.computeVertexNormals();

		this.auxCanvas = new AuxiliaryScreenCanvas();
		this.auxTexture = new THREE.CanvasTexture(this.auxCanvas.canvas);
		this.auxTexture.colorSpace = THREE.SRGBColorSpace;
		this.auxTexture.minFilter = THREE.LinearFilter;
		this.auxTexture.magFilter = THREE.LinearFilter;

		const auxMat = new THREE.MeshBasicMaterial({
			map: this.auxTexture,
			toneMapped: false
		});

		this.auxScreenMesh = new THREE.Mesh(auxGeo, auxMat);
		this.auxScreenMesh.position.set(0, 0.015, 0.05);
		this.auxScreenMesh.userData = { isAuxScreen: true };
		this.group.add(this.auxScreenMesh);
	}

	public markDirty(): void {
		this.isDirty = true;
	}

	public updateScreen(state: AuxiliaryScreenState | null, delta: number, elapsedTime: number): void {
		const auxBlinkInterval = 0.45;
		const auxBlinkNeedsUpdate = elapsedTime - this.lastAuxBlinkTime >= auxBlinkInterval;

		if (state && (this.isDirty || auxBlinkNeedsUpdate)) {
			this.auxCanvas.render(state, delta);
			this.auxTexture.needsUpdate = true;
			this.isDirty = false;
			if (auxBlinkNeedsUpdate) {
				this.lastAuxBlinkTime = elapsedTime;
			}
		}
	}

	public dispose(): void {
		this.auxTexture.dispose();
	}
}

