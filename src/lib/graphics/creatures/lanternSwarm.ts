import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

export class LanternSwarmActor implements WindowEventActor {
	public readonly type = 'LANTERN_SWARM';
	public readonly tier = 1 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private fishCount: number = 42;
	private fishGroups: THREE.Group[] = [];
	private fishPhotophores: THREE.Mesh[] = [];
	private fishTails: THREE.Mesh[] = [];
	private scatterVelocities: THREE.Vector3[] = [];

	private elapsed: number = 0;
	private duration: number = 11.0;
	private hasScattered: boolean = false;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		const fishMat = new THREE.MeshStandardMaterial({
			color: 0x122228,
			roughness: 0.2,
			metalness: 0.8
		});

		const finMat = new THREE.MeshStandardMaterial({
			color: 0x225555,
			transparent: true,
			opacity: 0.5,
			roughness: 0.3
		});

		const photophoreMat = new THREE.MeshStandardMaterial({
			color: 0x00ffcc,
			emissive: 0x00ffaa,
			emissiveIntensity: 2.2,
			roughness: 0.1
		});

		for (let i = 0; i < this.fishCount; i++) {
			const fish = new THREE.Group();

			const bodyGeo = new THREE.ConeGeometry(0.045, 0.32, 7);
			bodyGeo.rotateZ(-Math.PI / 2);
			bodyGeo.scale(1.0, 0.65, 0.45);
			const body = new THREE.Mesh(bodyGeo, fishMat);
			fish.add(body);

			const tailGeo = new THREE.BoxGeometry(0.08, 0.14, 0.01);
			const tail = new THREE.Mesh(tailGeo, finMat);
			tail.position.set(-0.19, 0, 0);
			this.fishTails.push(tail);
			fish.add(tail);

			for (const side of [-1, 1]) {
				const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), finMat);
				fin.position.set(0.02, -0.02, side * 0.035);
				fin.rotation.y = side * (Math.PI / 4);
				fish.add(fin);
			}

			for (let p = 0; p < 4; p++) {
				const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), photophoreMat);
				bulb.position.set(-0.08 + p * 0.05, -0.025, 0);
				this.fishPhotophores.push(bulb);
				fish.add(bulb);
			}

			this.fishGroups.push(fish);
			this.root.add(fish);

			this.scatterVelocities.push(
				new THREE.Vector3(
					(Math.random() - 0.5) * 8.0,
					(Math.random() - 0.5) * 6.0,
					-Math.random() * 8.0
				)
			);
		}
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 11.0;
		this.hasScattered = false;
		this.root.visible = true;

		for (let i = 0; i < this.fishCount; i++) {
			const fish = this.fishGroups[i];
			fish.position.set(
				-4.5 + (Math.random() - 0.5) * 1.8,
				(Math.random() - 0.5) * 1.2,
				-2.2 + (Math.random() - 0.5) * 1.2
			);
			fish.rotation.set(0, 0, 0);
		}

		for (const p of this.fishPhotophores) {
			(p.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2;
		}

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playBioluminescentHum(pan);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		for (let i = 0; i < this.fishTails.length; i++) {
			this.fishTails[i].rotation.y = Math.sin(this.elapsed * 12.0 + i) * 0.45;
		}

		if (progress < 0.52) {

			for (let i = 0; i < this.fishCount; i++) {
				const fish = this.fishGroups[i];
				fish.position.x += dt * 1.6;
				fish.position.y += Math.sin(this.elapsed * 2.5 + i * 0.2) * dt * 0.6;
				fish.rotation.y = Math.sin(this.elapsed * 2.0 + i * 0.1) * 0.15;
			}
		} else {

			if (!this.hasScattered) {
				this.hasScattered = true;
				ctx.audio?.playSwarmScatter();

				for (const p of this.fishPhotophores) {
					(p.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
				}
			}

			for (let i = 0; i < this.fishCount; i++) {
				const fish = this.fishGroups[i];
				const vel = this.scatterVelocities[i];
				fish.position.x += vel.x * dt;
				fish.position.y += vel.y * dt;
				fish.position.z += vel.z * dt;

				fish.rotation.z = Math.atan2(vel.y, vel.x);
			}
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
	}
}

