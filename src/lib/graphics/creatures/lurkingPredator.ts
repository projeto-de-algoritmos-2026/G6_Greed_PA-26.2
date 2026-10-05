import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createAbyssalSkinTexture, createBasaltRockTexture } from '../textures/procedural';

export class LurkingPredatorActor implements WindowEventActor {
	public readonly type = 'LURKING_PREDATOR';
	public readonly tier = 2 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private predatorGroup: THREE.Group;
	private rockShelf: THREE.Mesh;
	private escaLight: THREE.PointLight;
	private escaBulb: THREE.Mesh;
	private iliciumStalk: THREE.Mesh;
	private jaw: THREE.Group;
	private eyeMeshes: THREE.Mesh[] = [];
	private siltParticles: THREE.Points;

	private elapsed: number = 0;
	private duration: number = 12.0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		const skinTex = createAbyssalSkinTexture();
		const basaltTex = createBasaltRockTexture();

		const skinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x081318,
			roughness: 0.85,
			metalness: 0.2
		});

		const rockMat = new THREE.MeshStandardMaterial({
			map: basaltTex,
			color: 0x121b20,
			roughness: 0.95,
			metalness: 0.05
		});

		const rockGeo = new THREE.BoxGeometry(4.2, 1.8, 3.2);
		this.rockShelf = new THREE.Mesh(rockGeo, rockMat);
		this.rockShelf.position.set(0, -2.2, -3.8);
		this.root.add(this.rockShelf);

		this.predatorGroup = new THREE.Group();
		this.predatorGroup.position.set(0, -1.2, -3.2);
		this.root.add(this.predatorGroup);

		const bodyGeo = new THREE.CylinderGeometry(0.38, 0.12, 3.8, 14, 6);
		bodyGeo.rotateZ(Math.PI / 2);
		bodyGeo.scale(1.2, 0.75, 1.0);
		const body = new THREE.Mesh(bodyGeo, skinMat);
		body.position.set(-0.8, 0, 0);
		this.predatorGroup.add(body);

		for (let sx = -2.2; sx <= 0.4; sx += 0.35) {
			const spine = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.38, 5), skinMat);
			spine.position.set(sx, 0.38, 0);
			this.predatorGroup.add(spine);
		}

		const headGeo = new THREE.ConeGeometry(0.55, 1.4, 8);
		headGeo.rotateZ(-Math.PI / 2);
		headGeo.scale(1.0, 0.7, 1.2);
		const head = new THREE.Mesh(headGeo, skinMat);
		head.position.set(0.7, 0.1, 0);
		this.predatorGroup.add(head);

		const tapetumMat = new THREE.MeshStandardMaterial({
			color: 0x00ffaa,
			emissive: 0x00e688,
			emissiveIntensity: 1.8,
			roughness: 0.1,
			metalness: 0.9
		});

		for (const z of [-0.32, 0.32]) {
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), tapetumMat);
			eye.position.set(0.75, 0.28, z);
			this.eyeMeshes.push(eye);
			this.predatorGroup.add(eye);
		}

		this.jaw = new THREE.Group();
		this.jaw.position.set(0.65, -0.05, 0);
		const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.55), skinMat);
		jawMesh.position.set(0.25, -0.08, 0);
		this.jaw.add(jawMesh);

		const toothMat = new THREE.MeshStandardMaterial({
			color: 0xccf0e6,
			roughness: 0.1,
			metalness: 0.4
		});
		for (let tx = 0.0; tx <= 0.65; tx += 0.12) {
			for (const side of [-0.22, 0.22]) {
				const t = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.22, 5), toothMat);
				t.position.set(tx, 0.06, side);
				t.rotation.x = side > 0 ? 0.25 : -0.25;
				this.jaw.add(t);
			}
		}
		this.predatorGroup.add(this.jaw);

		const stalkGeo = new THREE.CylinderGeometry(0.015, 0.025, 1.2, 8);
		stalkGeo.rotateZ(Math.PI / 3);
		this.iliciumStalk = new THREE.Mesh(stalkGeo, skinMat);
		this.iliciumStalk.position.set(0.9, 0.55, 0);
		this.predatorGroup.add(this.iliciumStalk);

		this.escaBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.085, 12, 12),
			new THREE.MeshStandardMaterial({
				color: 0x00ffcc,
				emissive: 0x00ffaa,
				emissiveIntensity: 2.2,
				roughness: 0.1
			})
		);
		this.escaBulb.position.set(1.4, 0.95, 0);
		this.predatorGroup.add(this.escaBulb);

		this.escaLight = new THREE.PointLight(0x00ffcc, 1.6, 3.5);
		this.escaLight.position.set(1.4, 0.95, 0);
		this.predatorGroup.add(this.escaLight);

		const siltCount = 120;
		const siltGeo = new THREE.BufferGeometry();
		const siltPos = new Float32Array(siltCount * 3);
		siltGeo.setAttribute('position', new THREE.BufferAttribute(siltPos, 3));
		this.siltParticles = new THREE.Points(
			siltGeo,
			new THREE.PointsMaterial({
				color: 0x334a42,
				size: 0.16,
				transparent: true,
				opacity: 0.0,
				blending: THREE.NormalBlending
			})
		);
		this.siltParticles.position.set(0, -1.2, -3.2);
		this.root.add(this.siltParticles);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 12.0;
		this.root.visible = true;

		this.predatorGroup.position.set(0.3, -1.2, -3.2);
		this.predatorGroup.rotation.set(0, 0.2, 0);
		this.jaw.rotation.z = 0;
		(this.siltParticles.material as THREE.PointsMaterial).opacity = 0.0;

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

		const lureThrob = 1.4 + Math.sin(this.elapsed * 4.5) * 0.8;
		this.escaLight.intensity = lureThrob;

		this.escaBulb.position.y = 0.95 + Math.sin(this.elapsed * 2.0) * 0.12;
		this.escaBulb.position.z = Math.cos(this.elapsed * 1.5) * 0.18;
		this.escaLight.position.copy(this.escaBulb.position);

		if (progress < 0.65) {

			const breath = Math.sin(this.elapsed * 1.8) * 0.04;
			this.predatorGroup.scale.set(1.0 + breath, 1.0 + breath, 1.0);

			this.jaw.rotation.z = Math.sin(this.elapsed * 1.2) * 0.08;

			for (const eye of this.eyeMeshes) {
				(eye.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8 + Math.sin(this.elapsed * 3.0) * 0.5;
			}
		} else if (progress < 0.72) {

			this.predatorGroup.rotation.y = THREE.MathUtils.lerp(this.predatorGroup.rotation.y, 0.65, dt * 6.0);
			this.jaw.rotation.z = -0.35;
		} else {

			const fleeP = (progress - 0.72) / 0.28;
			const ease = fleeP * fleeP;

			this.predatorGroup.position.x = 0.3 - ease * 4.5;
			this.predatorGroup.position.y = -1.2 - ease * 1.8;
			this.predatorGroup.position.z = -3.2 - ease * 3.5;
			this.predatorGroup.rotation.z = Math.sin(this.elapsed * 14.0) * 0.25;

			(this.siltParticles.material as THREE.PointsMaterial).opacity = Math.max(0, 0.85 - ease * 0.9);
			(this.siltParticles.material as THREE.PointsMaterial).size = 0.16 + ease * 0.3;
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.predatorGroup.position.set(0.3, -1.2, -3.2);
		(this.siltParticles.material as THREE.PointsMaterial).opacity = 0.0;
	}
}

