import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createChitinTexture } from '../textures/procedural';

interface IsopodInstance {
	group: THREE.Group;
	legs: THREE.Group[];
	antennae: THREE.Group[];
	startPos: THREE.Vector3;
	endPos: THREE.Vector3;
	rot: THREE.Euler;
}

export class GiantIsopodsActor implements WindowEventActor {
	public readonly type = 'GIANT_ISOPODS';
	public readonly tier = 1 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private instances: IsopodInstance[] = [];
	private elapsed: number = 0;
	private duration: number = 12.0;
	private clicksTriggered: boolean = false;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		const chitinTex = createChitinTexture();

		const chitinMat = new THREE.MeshStandardMaterial({
			map: chitinTex,
			color: 0x9bb0a4,
			roughness: 0.32,
			metalness: 0.18
		});

		const underbellyMat = new THREE.MeshStandardMaterial({
			color: 0xb5c6ba,
			roughness: 0.55,
			metalness: 0.08
		});

		const eyeMat = new THREE.MeshStandardMaterial({
			color: 0x142822,
			roughness: 0.1,
			metalness: 0.85,
			emissive: 0x09221a,
			emissiveIntensity: 0.5
		});

		const createBathynomus = (scale: number): { group: THREE.Group; legs: THREE.Group[]; antennae: THREE.Group[] } => {
			const group = new THREE.Group();
			const legs: THREE.Group[] = [];
			const antennae: THREE.Group[] = [];

			const headGeo = new THREE.SphereGeometry(0.24 * scale, 14, 12);
			headGeo.scale(1.2, 0.6, 0.95);
			const head = new THREE.Mesh(headGeo, chitinMat);
			head.position.set(0.38 * scale, 0, 0);
			group.add(head);

			for (const z of [-0.14 * scale, 0.14 * scale]) {
				const eye = new THREE.Mesh(new THREE.ConeGeometry(0.065 * scale, 0.13 * scale, 5), eyeMat);
				eye.position.set(0.42 * scale, 0.04 * scale, z);
				eye.rotation.z = -Math.PI / 2;
				eye.rotation.y = z > 0 ? -0.4 : 0.4;
				group.add(eye);

				const antGroup = new THREE.Group();
				antGroup.position.set(0.48 * scale, 0.02 * scale, z * 0.7);
				const antGeo = new THREE.CylinderGeometry(0.007 * scale, 0.016 * scale, 0.72 * scale, 6);
				antGeo.rotateZ(-Math.PI / 2.6);
				const antMesh = new THREE.Mesh(antGeo, chitinMat);
				antMesh.position.set(0.32 * scale, 0, 0);
				antGroup.add(antMesh);
				antennae.push(antGroup);
				group.add(antGroup);
			}

			for (let s = 0; s < 7; s++) {
				const tGeo = new THREE.SphereGeometry((0.27 - s * 0.016) * scale, 14, 10, 0, Math.PI);
				tGeo.scale(1.0, 0.58, 1.35);
				const tergite = new THREE.Mesh(tGeo, chitinMat);
				tergite.position.set((0.22 - s * 0.115) * scale, 0.03 * scale, 0);
				tergite.rotation.y = -Math.PI / 2;
				group.add(tergite);
			}

			const telsonGeo = new THREE.ConeGeometry(0.22 * scale, 0.35 * scale, 5);
			telsonGeo.rotateZ(Math.PI / 2);
			telsonGeo.scale(1.0, 0.3, 1.2);
			const telson = new THREE.Mesh(telsonGeo, chitinMat);
			telson.position.set(-0.62 * scale, 0.02 * scale, 0);
			group.add(telson);

			const bellyGeo = new THREE.BoxGeometry(0.88 * scale, 0.13 * scale, 0.48 * scale);
			const belly = new THREE.Mesh(bellyGeo, underbellyMat);
			belly.position.set(-0.1 * scale, -0.04 * scale, 0);
			group.add(belly);

			for (let p = 0; p < 7; p++) {
				const px = (0.24 - p * 0.115) * scale;
				for (const side of [-1, 1]) {
					const legGroup = new THREE.Group();
					legGroup.position.set(px, -0.06 * scale, side * 0.22 * scale);

					const upperLeg = new THREE.Mesh(
						new THREE.CylinderGeometry(0.022 * scale, 0.028 * scale, 0.24 * scale, 6),
						chitinMat
					);
					upperLeg.position.set(0, -0.1 * scale, side * 0.07 * scale);
					upperLeg.rotation.x = side * (Math.PI / 3.4);
					legGroup.add(upperLeg);

					const claw = new THREE.Mesh(
						new THREE.ConeGeometry(0.016 * scale, 0.2 * scale, 5),
						chitinMat
					);
					claw.position.set(0, -0.24 * scale, side * 0.15 * scale);
					claw.rotation.x = side * (Math.PI / 2.1);
					legGroup.add(claw);

					legs.push(legGroup);
					group.add(legGroup);
				}
			}

			return { group, legs, antennae };
		}

		const iso1Data = createBathynomus(1.25);
		const inst1: IsopodInstance = {
			group: iso1Data.group,
			legs: iso1Data.legs,
			antennae: iso1Data.antennae,
			startPos: new THREE.Vector3(-1.6, -0.75, -0.36),
			endPos: new THREE.Vector3(0.6, 0.45, -0.36),
			rot: new THREE.Euler(0, Math.PI, Math.PI / 3.2)
		};
		inst1.group.rotation.copy(inst1.rot);
		this.instances.push(inst1);
		this.root.add(inst1.group);

		const iso2Data = createBathynomus(1.05);
		const inst2: IsopodInstance = {
			group: iso2Data.group,
			legs: iso2Data.legs,
			antennae: iso2Data.antennae,
			startPos: new THREE.Vector3(0.9, -1.05, -0.42),
			endPos: new THREE.Vector3(1.75, -0.45, -0.42),
			rot: new THREE.Euler(0.2, Math.PI * 0.85, Math.PI / 2.8)
		};
		inst2.group.rotation.copy(inst2.rot);
		this.instances.push(inst2);
		this.root.add(inst2.group);

		const iso3Data = createBathynomus(0.95);
		const inst3: IsopodInstance = {
			group: iso3Data.group,
			legs: iso3Data.legs,
			antennae: iso3Data.antennae,
			startPos: new THREE.Vector3(-1.95, 0.8, -0.40),
			endPos: new THREE.Vector3(-1.45, 0.05, -0.40),
			rot: new THREE.Euler(-0.2, Math.PI * 1.15, -Math.PI / 3.0)
		};
		inst3.group.rotation.copy(inst3.rot);
		this.instances.push(inst3);
		this.root.add(inst3.group);

		const iso4Data = createBathynomus(0.85);
		const inst4: IsopodInstance = {
			group: iso4Data.group,
			legs: iso4Data.legs,
			antennae: iso4Data.antennae,
			startPos: new THREE.Vector3(-0.6, -0.92, -0.45),
			endPos: new THREE.Vector3(0.35, -0.84, -0.45),
			rot: new THREE.Euler(0.1, Math.PI * 0.95, Math.PI / 6.0)
		};
		inst4.group.rotation.copy(inst4.rot);
		this.instances.push(inst4);
		this.root.add(inst4.group);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 12.0;
		this.clicksTriggered = false;
		this.root.visible = true;

		for (const inst of this.instances) {
			inst.group.position.copy(inst.startPos);
			inst.group.rotation.copy(inst.rot);
		}

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playIsopodClicks(pan);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		for (let i = 0; i < this.instances.length; i++) {
			const inst = this.instances[i];
			const speedFactor = 1.0 + i * 0.08;
			const p = Math.min(1.0, progress * speedFactor);

			const stepWobble = Math.sin(this.elapsed * 6.0 + i * 1.5) * 0.015;
			inst.group.position.x = THREE.MathUtils.lerp(inst.startPos.x, inst.endPos.x, p);
			inst.group.position.y = THREE.MathUtils.lerp(inst.startPos.y, inst.endPos.y, p) + stepWobble;
			inst.group.position.z = inst.startPos.z;

			const legs = inst.legs;
			for (let l = 0; l < legs.length; l++) {
				const legPhase = this.elapsed * 10.0 + (l % 2 === 0 ? 0 : Math.PI) + l * 0.35;
				legs[l].rotation.z = Math.sin(legPhase) * 0.38;
			}

			const ants = inst.antennae;
			for (let a = 0; a < ants.length; a++) {
				ants[a].rotation.y = Math.sin(this.elapsed * 5.0 + a * 1.8 + i) * 0.3;
				ants[a].rotation.z = Math.cos(this.elapsed * 4.2 + a * 1.2 + i) * 0.22;
			}
		}

		if (!this.clicksTriggered && progress > 0.42) {
			this.clicksTriggered = true;
			ctx.audio?.playIsopodClicks(ctx.pan('hatch'));
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		for (const inst of this.instances) {
			inst.group.position.copy(inst.startPos);
		}
	}
}

