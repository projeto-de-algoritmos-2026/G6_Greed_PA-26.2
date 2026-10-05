import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

export class LeviathanShadowsActor implements WindowEventActor {
	public readonly type = 'LEVIATHAN_SHADOWS';
	public readonly tier = 1 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private leviathan1: THREE.Group;
	private leviathan2: THREE.Group;
	private tail1: THREE.Mesh;
	private tail2: THREE.Mesh;
	private eyes1: THREE.Mesh[] = [];
	private eyes2: THREE.Mesh[] = [];

	private elapsed: number = 0;
	private duration: number = 14.0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		const createLeviathanMesh = (color: number, eyeColor: number): { group: THREE.Group; tail: THREE.Mesh; eyes: THREE.Mesh[] } => {
			const group = new THREE.Group();
			const eyes: THREE.Mesh[] = [];

			const mat = new THREE.MeshStandardMaterial({
				color,
				roughness: 0.85,
				metalness: 0.2
			});

			const eyeMat = new THREE.MeshStandardMaterial({
				color: eyeColor,
				emissive: eyeColor,
				emissiveIntensity: 2.4,
				roughness: 0.1
			});

			const bodyGeo = new THREE.CylinderGeometry(1.6, 0.45, 24.0, 16);
			bodyGeo.rotateZ(Math.PI / 2);
			bodyGeo.scale(1.2, 0.8, 0.5);
			const body = new THREE.Mesh(bodyGeo, mat);
			group.add(body);

			const headGeo = new THREE.ConeGeometry(1.65, 5.0, 10);
			headGeo.rotateZ(-Math.PI / 2);
			headGeo.scale(1.0, 0.75, 0.5);
			const head = new THREE.Mesh(headGeo, mat);
			head.position.set(13.5, 0, 0);
			group.add(head);

			for (const side of [-0.45, 0.45]) {
				const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), eyeMat);
				eye.position.set(13.8, 0.35, side);
				eyes.push(eye);
				group.add(eye);
			}

			for (const side of [-1, 1]) {
				const finGeo = new THREE.ConeGeometry(0.85, 4.2, 6);
				finGeo.rotateZ(side * Math.PI / 3);
				const fin = new THREE.Mesh(finGeo, mat);
				fin.position.set(4.0, -0.4, side * 1.8);
				group.add(fin);
			}

			for (let s = -6.0; s <= 6.0; s += 2.2) {
				const spine = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.8, 4), mat);
				spine.position.set(s, 1.4, 0);
				group.add(spine);
			}

			const tailGeo = new THREE.BoxGeometry(0.35, 4.8, 2.2);
			const tail = new THREE.Mesh(tailGeo, mat);
			tail.position.set(-13.0, 0, 0);
			group.add(tail);

			return { group, tail, eyes };
		};

		const l1 = createLeviathanMesh(0x061118, 0x00ffcc);
		this.leviathan1 = l1.group;
		this.tail1 = l1.tail;
		this.eyes1 = l1.eyes;

		const l2 = createLeviathanMesh(0x050c12, 0xffaa22);
		this.leviathan2 = l2.group;
		this.tail2 = l2.tail;
		this.eyes2 = l2.eyes;

		this.root.add(this.leviathan1, this.leviathan2);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 14.0;
		this.root.visible = true;

		this.leviathan1.position.set(-28.0, 1.5, -9.5);
		this.leviathan1.rotation.set(0, 0, 0);

		this.leviathan2.position.set(28.0, -2.5, -14.0);
		this.leviathan2.rotation.set(0, Math.PI, 0);

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playDeepWaterSurge(0.7, pan);
	}

	public update(dt: number, _ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		this.tail1.rotation.y = Math.sin(this.elapsed * 2.2) * 0.45;
		this.tail2.rotation.y = Math.sin(this.elapsed * 1.8 + 1.0) * 0.45;

		this.leviathan1.position.x = -28.0 + progress * 56.0;
		this.leviathan1.position.y = 1.5 + Math.sin(this.elapsed * 1.2) * 0.35;
		this.leviathan1.rotation.z = Math.sin(this.elapsed * 1.5) * 0.05;

		this.leviathan2.position.x = 28.0 - progress * 56.0;
		this.leviathan2.position.y = -2.5 + Math.cos(this.elapsed * 1.0) * 0.45;
		this.leviathan2.rotation.z = Math.cos(this.elapsed * 1.2) * 0.05;

		return true;
	}

	public stop(): void {
		this.root.visible = false;
	}
}

