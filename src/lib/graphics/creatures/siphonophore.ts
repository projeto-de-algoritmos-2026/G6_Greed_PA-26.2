import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

export class SiphonophoreActor implements WindowEventActor {
	public readonly type = 'SIPHONOPHORE';
	public readonly tier = 1 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private siphonophoreRoot: THREE.Group;
	private nectophores: THREE.Group[] = [];
	private zooidMeshes: THREE.Mesh[] = [];
	private tentacles: THREE.Line[] = [];
	private stemCurve: THREE.CatmullRomCurve3;
	private stemPoints: THREE.Vector3[] = [];
	private stemGeometry: THREE.BufferGeometry;
	private stemLine: THREE.Line;
	private stemPositions: Float32Array;
	private zooidMaterials: THREE.MeshStandardMaterial[] = [];

	private elapsed: number = 0;
	private duration: number = 15.0;
	private totalZooids: number = 36;
	private numStemSamples: number = 48;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.siphonophoreRoot = new THREE.Group();
		this.root.add(this.siphonophoreRoot);

		const jellyMat = new THREE.MeshStandardMaterial({
			color: 0x22ffcc,
			emissive: 0x00ddaa,
			emissiveIntensity: 0.9,
			transparent: true,
			opacity: 0.75,
			roughness: 0.1,
			metalness: 0.1
		});

		for (let m = 0; m < 6; m++) {
			this.zooidMaterials.push(jellyMat.clone());
		}

		for (const nz of [-0.22, 0.22]) {
			const nectGroup = new THREE.Group();
			nectGroup.position.set(0.15, 0, nz);

			const bellGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
			bellGeo.scale(1.2, 0.9, 0.9);
			const bell = new THREE.Mesh(bellGeo, jellyMat);
			bell.rotation.z = -Math.PI / 2;
			nectGroup.add(bell);

			this.nectophores.push(nectGroup);
			this.siphonophoreRoot.add(nectGroup);
		}

		for (let i = 0; i < this.totalZooids; i++) {
			this.stemPoints.push(new THREE.Vector3(-i * 0.35, 0, 0));
		}
		this.stemCurve = new THREE.CatmullRomCurve3(this.stemPoints);

		this.stemPositions = new Float32Array(this.numStemSamples * 3);
		this.stemGeometry = new THREE.BufferGeometry();
		this.stemGeometry.setAttribute(
			'position',
			new THREE.BufferAttribute(this.stemPositions, 3)
		);

		const stemMat = new THREE.LineBasicMaterial({
			color: 0x00ffcc,
			transparent: true,
			opacity: 0.85,
			blending: THREE.AdditiveBlending
		});

		this.stemLine = new THREE.Line(this.stemGeometry, stemMat);
		this.siphonophoreRoot.add(this.stemLine);

		const zooidGeo = new THREE.SphereGeometry(0.12, 10, 10);
		zooidGeo.scale(1.0, 1.5, 0.8);

		const tentMat = new THREE.LineBasicMaterial({
			color: 0x00ffcc,
			transparent: true,
			opacity: 0.45,
			blending: THREE.AdditiveBlending
		});

		for (let i = 0; i < this.totalZooids; i++) {
			const zMesh = new THREE.Mesh(zooidGeo, this.zooidMaterials[i % 6]);
			this.zooidMeshes.push(zMesh);
			this.siphonophoreRoot.add(zMesh);

			const tentPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.6 - Math.random() * 0.8, 0)];
			const tGeo = new THREE.BufferGeometry().setFromPoints(tentPoints);
			const tLine = new THREE.Line(tGeo, tentMat);
			zMesh.add(tLine);
			this.tentacles.push(tLine);
		}
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 15.0;
		this.root.visible = true;

		this.siphonophoreRoot.position.set(-4.0, 0.35, -2.5);
		this.siphonophoreRoot.rotation.set(0, -0.03, -0.02);

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playBioluminescentHum(pan);
	}

	public update(dt: number, _ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		const pump = 1.0 + Math.sin(this.elapsed * 3.5) * 0.18;
		for (const nect of this.nectophores) {
			nect.scale.set(pump, 1.0 / pump, 1.0 / pump);
		}

		this.siphonophoreRoot.position.x = -4.0 + progress * 20.0;
		this.siphonophoreRoot.position.y = 0.35 - progress * 0.45 + Math.sin(this.elapsed * 0.7) * 0.12;
		this.siphonophoreRoot.position.z = -2.5 + Math.sin(progress * Math.PI) * 0.30;
		this.siphonophoreRoot.rotation.set(0, -0.03, -0.02);

		for (let m = 0; m < 6; m++) {
			const lumPhase = (this.elapsed * 4.0 - m * 0.5) % (Math.PI * 2);
			const lumBrightness = 0.5 + Math.sin(lumPhase) * 0.8;
			this.zooidMaterials[m].emissiveIntensity = Math.max(0.2, lumBrightness);
		}

		for (let i = 0; i < this.totalZooids; i++) {
			const wave = Math.sin(this.elapsed * 2.2 - i * 0.28) * 0.30;
			const waveZ = Math.cos(this.elapsed * 1.8 - i * 0.22) * 0.25;
			const posX = -i * 0.35;

			this.stemPoints[i].set(posX, wave, waveZ);
			this.zooidMeshes[i].position.set(posX, wave, waveZ);

			this.tentacles[i].rotation.z = Math.sin(this.elapsed * 1.5 + i * 0.2) * 0.25;
			this.tentacles[i].rotation.x = Math.cos(this.elapsed * 1.2 + i * 0.2) * 0.2;
		}

		const pts = this.stemCurve.getPoints(this.numStemSamples - 1);
		const posArr = this.stemPositions;
		for (let p = 0; p < pts.length; p++) {
			posArr[p * 3] = pts[p].x;
			posArr[p * 3 + 1] = pts[p].y;
			posArr[p * 3 + 2] = pts[p].z;
		}
		this.stemGeometry.attributes.position.needsUpdate = true;

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.siphonophoreRoot.position.set(-4.0, 0.35, -2.5);
		this.siphonophoreRoot.rotation.set(0, -0.03, -0.02);
	}
}

