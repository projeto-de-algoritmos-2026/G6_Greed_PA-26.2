import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createDarkRibTexture, createAbyssalSkinTexture } from '../textures/procedural';

export class QuartzImpactActor implements WindowEventActor {
	public readonly type = 'QUARTZ_IMPACT';
	public readonly tier = 3 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = true;
	public readonly root: THREE.Group;

	private beastGroup: THREE.Group;
	private jaw: THREE.Group;
	private elapsed: number = 0;
	private duration: number = 5.2;
	private hasImpacted: boolean = false;
	private opening: 'hatch' = 'hatch';
	private sedimentBurst: THREE.Points;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.beastGroup = new THREE.Group();
		this.root.add(this.beastGroup);

		const boneTex = createDarkRibTexture();
		const skinTex = createAbyssalSkinTexture();

		const armorMat = new THREE.MeshStandardMaterial({
			map: boneTex,
			color: 0x222e33,
			roughness: 0.7,
			metalness: 0.4
		});

		const skinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x0a1418,
			roughness: 0.9,
			metalness: 0.1
		});

		const skullGeo = new THREE.ConeGeometry(1.4, 3.2, 12);
		skullGeo.rotateX(Math.PI / 2);
		skullGeo.scale(1.2, 0.85, 1.0);
		const skull = new THREE.Mesh(skullGeo, armorMat);
		skull.position.set(0, 0.15, -1.6);
		this.beastGroup.add(skull);

		for (const sx of [-0.65, 0.65]) {
			const brow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 1.4), armorMat);
			brow.position.set(sx, 0.55, -1.0);
			brow.rotation.z = sx > 0 ? -0.25 : 0.25;
			this.beastGroup.add(brow);
		}

		const eyeMat = new THREE.MeshStandardMaterial({
			color: 0xddeee8,
			roughness: 0.1,
			metalness: 0.1,
			emissive: 0x22443a,
			emissiveIntensity: 0.5
		});
		for (const ex of [-0.75, 0.75]) {
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), eyeMat);
			eye.position.set(ex, 0.45, -0.8);
			this.beastGroup.add(eye);
		}

		this.jaw = new THREE.Group();
		this.jaw.position.set(0, -0.25, -1.0);

		const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.6), armorMat);
		jawMesh.position.set(0, -0.1, 0.4);
		this.jaw.add(jawMesh);

		const boneToothMat = new THREE.MeshStandardMaterial({
			color: 0x99b8b0,
			roughness: 0.2,
			metalness: 0.3
		});
		for (let i = -0.45; i <= 0.45; i += 0.22) {
			const t = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5), boneToothMat);
			t.position.set(i, 0.18, 0.9);
			this.jaw.add(t);
		}
		this.beastGroup.add(this.jaw);

		const bodyGeo = new THREE.CylinderGeometry(1.3, 0.6, 5.0, 16);
		bodyGeo.rotateX(Math.PI / 2);
		const bodyMesh = new THREE.Mesh(bodyGeo, skinMat);
		bodyMesh.position.set(0, 0, -4.5);
		this.beastGroup.add(bodyMesh);

		for (const side of [-1, 1]) {
			const finGeo = new THREE.ConeGeometry(0.65, 2.6, 6);
			finGeo.rotateZ(side * Math.PI / 3);
			const fin = new THREE.Mesh(finGeo, skinMat);
			fin.position.set(side * 1.8, -0.2, -3.2);
			this.beastGroup.add(fin);
		}

		const pCount = 80;
		const pGeo = new THREE.BufferGeometry();
		const pPos = new Float32Array(pCount * 3);
		pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
		this.sedimentBurst = new THREE.Points(
			pGeo,
			new THREE.PointsMaterial({
				color: 0x051a20,
				size: 0.25,
				transparent: true,
				opacity: 0.0,
				blending: THREE.NormalBlending
			})
		);
		this.root.add(this.sedimentBurst);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 5.2;
		this.hasImpacted = false;
		this.opening = opts.opening;
		this.root.visible = true;

		this.beastGroup.position.set(0, 0, -8.5);
		this.beastGroup.rotation.set(0, 0, 0);
		this.jaw.rotation.x = 0.15;
		(this.sedimentBurst.material as THREE.PointsMaterial).opacity = 0.0;
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;

		if (this.elapsed >= this.duration) {
			this.stop();
			return false;
		}

		const impactTime = 0.48;

		if (this.elapsed < impactTime) {

			const p = this.elapsed / impactTime;
			const accel = p * p;
			this.beastGroup.position.z = -8.5 + accel * 8.46;
			this.beastGroup.position.y = Math.sin(this.elapsed * 12.0) * 0.06;

			this.jaw.rotation.x = -0.45 * p;
		} else if (!this.hasImpacted) {

			this.hasImpacted = true;
			const pan = ctx.pan(this.opening);
			ctx.audio?.playWindowImpact(pan);

			ctx.shake(0.95);
			ctx.cabinBlackout(0.42);
			ctx.glitch(1.0, 0.45);

			ctx.glass(this.opening).addCrack(0.05, 0.12, 1.0);

			(this.sedimentBurst.material as THREE.PointsMaterial).opacity = 0.95;
		} else {

			const recoilP = (this.elapsed - impactTime) / (this.duration - impactTime);
			const ease = recoilP * (2.0 - recoilP);

			this.beastGroup.position.z = -0.04 - ease * 7.0;
			this.beastGroup.position.y = -ease * 2.8;
			this.beastGroup.rotation.z = Math.sin(this.elapsed * 6.0) * 0.15;
			this.beastGroup.rotation.x = ease * 0.45;

			(this.sedimentBurst.material as THREE.PointsMaterial).opacity = Math.max(0, 0.95 - ease * 1.2);
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.beastGroup.position.set(0, 0, -8.5);
		(this.sedimentBurst.material as THREE.PointsMaterial).opacity = 0.0;
	}
}

