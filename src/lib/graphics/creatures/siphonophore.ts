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
	private stemMesh: THREE.Mesh;

	private elapsed: number = 0;
	private duration: number = 15.0;
	private totalZooids: number = 36;

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

		const tubeGeo = new THREE.TubeGeometry(this.stemCurve, 48, 0.035, 6, false);
		this.stemMesh = new THREE.Mesh(
			tubeGeo,
			new THREE.MeshStandardMaterial({
				color: 0x00ffcc,
				emissive: 0x00aa88,
				emissiveIntensity: 0.7,
				transparent: true,
				opacity: 0.85
			})
		);
		this.siphonophoreRoot.add(this.stemMesh);

		const zooidGeo = new THREE.SphereGeometry(0.12, 10, 10);
		zooidGeo.scale(1.0, 1.5, 0.8);

		const tentMat = new THREE.LineBasicMaterial({
			color: 0x00ffcc,
			transparent: true,
			opacity: 0.45,
			blending: THREE.AdditiveBlending
		});

		for (let i = 0; i < this.totalZooids; i++) {
			const zMesh = new THREE.Mesh(zooidGeo, jellyMat.clone());
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

		for (let i = 0; i < this.totalZooids; i++) {
			const wave = Math.sin(this.elapsed * 2.2 - i * 0.28) * 0.30;
			const waveZ = Math.cos(this.elapsed * 1.8 - i * 0.22) * 0.25;

			const pos = new THREE.Vector3(-i * 0.35, wave, waveZ);
			this.stemPoints[i].copy(pos);

			const zMesh = this.zooidMeshes[i];
			zMesh.position.copy(pos);

			const lumPhase = (this.elapsed * 4.0 - i * 0.4) % (Math.PI * 2);
			const lumBrightness = 0.5 + Math.sin(lumPhase) * 0.8;
			(zMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.max(0.2, lumBrightness);

			this.tentacles[i].rotation.z = Math.sin(this.elapsed * 1.5 + i * 0.2) * 0.25;
			this.tentacles[i].rotation.x = Math.cos(this.elapsed * 1.2 + i * 0.2) * 0.2;
		}

		this.stemMesh.geometry.dispose();
		this.stemMesh.geometry = new THREE.TubeGeometry(this.stemCurve, 48, 0.035, 6, false);

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.siphonophoreRoot.position.set(-4.0, 0.35, -2.5);
		this.siphonophoreRoot.rotation.set(0, -0.03, -0.02);
	}
}

