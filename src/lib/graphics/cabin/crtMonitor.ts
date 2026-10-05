import * as THREE from 'three';
import { TerminalScreenCanvas, type TerminalScreenState } from '../terminalScreenCanvas';
import { createDarkRibTexture } from '../textures/procedural';

export class CRTMonitor {
	public readonly group: THREE.Group;
	public readonly screenMesh: THREE.Mesh;
	public readonly terminalCanvas: TerminalScreenCanvas;
	private screenTexture: THREE.CanvasTexture;
	private isDirty: boolean = true;
	private lastHydrophoneTime: number = 0;

	constructor() {
		this.group = new THREE.Group();

		const casingMat = new THREE.MeshLambertMaterial({
			color: 0x202a32,
			map: createDarkRibTexture()
		});
		const bezelMat = new THREE.MeshLambertMaterial({
			color: 0x283642,
			map: createDarkRibTexture()
		});

		const casing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 1.8), casingMat);
		casing.position.set(0, 0.45, -1.05);
		this.group.add(casing);

		const topB = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.25), bezelMat);
		topB.position.set(0, 1.98, 0.05);
		const botB = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 0.25), bezelMat);
		botB.position.set(0, -1.08, 0.05);
		const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.25), bezelMat);
		leftB.position.set(-2.02, 0.45, 0.05);
		const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.25), bezelMat);
		rightB.position.set(2.02, 0.45, 0.05);
		this.group.add(topB, botB, leftB, rightB);

		const ventMat = new THREE.MeshBasicMaterial({ color: 0x0c1216 });
		for (let v = 0; v < 8; v++) {
			const vent = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.5), ventMat);
			vent.position.set(0, 2.16, -1.4 + v * 0.1);
			this.group.add(vent);
		}

		const knobGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.06, 12);
		knobGeo.rotateX(Math.PI / 2);
		const knobMat = new THREE.MeshLambertMaterial({ color: 0x4a5e6d });
		for (const kx of [1.2, 1.45, 1.7]) {
			const knob = new THREE.Mesh(knobGeo, knobMat);
			knob.position.set(kx, -1.08, 0.18);
			this.group.add(knob);
		}

		const labelCanvas = document.createElement('canvas');
		labelCanvas.width = 512;
		labelCanvas.height = 64;
		const lctx = labelCanvas.getContext('2d')!;
		lctx.fillStyle = '#0a1012';
		lctx.fillRect(0, 0, 512, 64);
		lctx.font = 'bold 24px "Courier New", monospace';
		lctx.fillStyle = '#00cc88';
		lctx.textAlign = 'center';
		lctx.fillText('TARTARUS-V // CONSOLE A // 8.000M', 256, 42);

		const plate = new THREE.Mesh(
			new THREE.PlaneGeometry(2.4, 0.25),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
		);
		plate.position.set(0, 1.98, 0.18);
		this.group.add(plate);

		const screenGeo = new THREE.PlaneGeometry(3.7, 2.7, 32, 24);
		const pos = screenGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = -0.07 * ((x * x) / 5.0 + (y * y) / 3.8);
			pos.setZ(i, z);
		}
		screenGeo.computeVertexNormals();

		this.terminalCanvas = new TerminalScreenCanvas();
		this.screenTexture = new THREE.CanvasTexture(this.terminalCanvas.canvas);
		this.screenTexture.colorSpace = THREE.SRGBColorSpace;
		this.screenTexture.minFilter = THREE.LinearFilter;
		this.screenTexture.magFilter = THREE.LinearFilter;

		const screenMat = new THREE.MeshBasicMaterial({
			map: this.screenTexture,
			toneMapped: false
		});

		this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
		this.screenMesh.position.set(0, 0.45, 0.06);
		this.screenMesh.userData = { isScreen: true };
		this.group.add(this.screenMesh);
	}

	public markDirty(): void {
		this.isDirty = true;
	}

	public updateScreen(state: TerminalScreenState | null, delta: number, elapsedTime: number): void {
		const isBooting = this.terminalCanvas.booting;
		const hydrophoneInterval = state?.isGameOver ? 0.5 : 0.045;
		const hydrophoneNeedsUpdate = elapsedTime - this.lastHydrophoneTime >= hydrophoneInterval;

		if (state && (this.isDirty || isBooting || hydrophoneNeedsUpdate)) {
			this.terminalCanvas.render(state, delta);
			this.screenTexture.needsUpdate = true;
			this.isDirty = false;
			if (hydrophoneNeedsUpdate) {
				this.lastHydrophoneTime = elapsedTime;
			}
		}
	}

	public dispose(): void {
		this.screenTexture.dispose();
	}
}

