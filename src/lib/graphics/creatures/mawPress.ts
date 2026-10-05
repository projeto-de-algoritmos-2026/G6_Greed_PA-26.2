import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createMawFleshTexture, createAbyssalSkinTexture } from '../textures/procedural';

export class MawPressActor implements WindowEventActor {
	public readonly type = 'MAW_PRESS';
	public readonly tier = 3 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private mawGroup: THREE.Group;
	private upperJaw: THREE.Group;
	private lowerJaw: THREE.Group;
	private throatGullet: THREE.Mesh;
	private throatLight: THREE.PointLight;
	private teethMeshes: THREE.Mesh[] = [];

	private elapsed: number = 0;
	private duration: number = 10.0;
	private soundPlayed: boolean = false;
	private contactTriggered: boolean = false;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.mawGroup = new THREE.Group();
		this.root.add(this.mawGroup);

		const skinTex = createAbyssalSkinTexture();
		const fleshTex = createMawFleshTexture();

		const outerSkinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x091418,
			roughness: 0.85,
			metalness: 0.2
		});

		const innerMouthMat = new THREE.MeshStandardMaterial({
			map: fleshTex,
			color: 0x4a121d,
			roughness: 0.35,
			metalness: 0.15,
			emissive: 0x1a0508,
			emissiveIntensity: 0.4
		});

		const fangMat = new THREE.MeshStandardMaterial({
			color: 0xb5f0e4,
			roughness: 0.05,
			metalness: 0.6,
			transparent: true,
			opacity: 0.88,
			emissive: 0x003328,
			emissiveIntensity: 0.3
		});

		const throatGeo = new THREE.CylinderGeometry(0.7, 1.8, 4.0, 24, 8, true);
		throatGeo.rotateX(Math.PI / 2);
		this.throatGullet = new THREE.Mesh(throatGeo, innerMouthMat);
		this.throatGullet.position.set(0, 0, -2.6);
		this.mawGroup.add(this.throatGullet);

		this.throatLight = new THREE.PointLight(0x00ffcc, 1.8, 4.5);
		this.throatLight.position.set(0, 0, -2.2);
		this.mawGroup.add(this.throatLight);

		this.upperJaw = new THREE.Group();
		this.upperJaw.position.set(0, 0.4, 0);

		const uArchGeo = new THREE.TorusGeometry(1.85, 0.28, 14, 32, Math.PI * 0.95);
		const uArch = new THREE.Mesh(uArchGeo, outerSkinMat);
		uArch.rotation.z = Math.PI * 1.025;
		this.upperJaw.add(uArch);

		const uPalate = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 16, 1, true), innerMouthMat);
		uPalate.rotation.x = -Math.PI / 2;
		uPalate.position.set(0, 0.2, -0.6);
		uPalate.scale.set(1.1, 0.45, 1.0);
		this.upperJaw.add(uPalate);

		for (let i = 0; i <= 22; i++) {
			const angle = (i / 22) * Math.PI * 0.95 - 0.02;
			const fangLen = 0.35 + Math.sin((i / 22) * Math.PI) * 0.42;
			const fang = new THREE.Mesh(new THREE.ConeGeometry(0.042, fangLen, 6), fangMat);

			const r = 1.82;
			fang.position.set(Math.cos(angle) * r, -Math.sin(angle) * r + 0.12, -0.015);
			fang.rotation.z = angle + Math.PI / 2;
			fang.rotation.x = -0.32;

			this.teethMeshes.push(fang);
			this.upperJaw.add(fang);
		}
		this.mawGroup.add(this.upperJaw);

		this.lowerJaw = new THREE.Group();
		this.lowerJaw.position.set(0, -0.4, 0);

		const lArchGeo = new THREE.TorusGeometry(1.80, 0.26, 14, 32, Math.PI * 0.95);
		const lArch = new THREE.Mesh(lArchGeo, outerSkinMat);
		lArch.rotation.z = -0.025;
		this.lowerJaw.add(lArch);

		for (let i = 0; i <= 22; i++) {
			const angle = (i / 22) * Math.PI * 0.95 - 0.02;
			const fangLen = 0.32 + Math.sin((i / 22) * Math.PI) * 0.45;
			const fang = new THREE.Mesh(new THREE.ConeGeometry(0.04, fangLen, 6), fangMat);

			const r = 1.76;
			fang.position.set(Math.cos(angle) * r, Math.sin(angle) * r - 0.12, -0.015);
			fang.rotation.z = angle - Math.PI / 2;
			fang.rotation.x = 0.32;

			this.teethMeshes.push(fang);
			this.lowerJaw.add(fang);
		}
		this.mawGroup.add(this.lowerJaw);

		const sideMat = new THREE.MeshStandardMaterial({
			map: fleshTex,
			color: 0x3d0f18,
			transparent: true,
			opacity: 0.85,
			roughness: 0.4,
			side: THREE.DoubleSide
		});

		for (const sx of [-1.75, 1.75]) {
			const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.6), sideMat);
			flap.position.set(sx, 0, -0.35);
			flap.rotation.y = sx > 0 ? -Math.PI / 4 : Math.PI / 4;
			this.mawGroup.add(flap);
		}
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 10.0;
		this.soundPlayed = false;
		this.contactTriggered = false;
		this.root.visible = true;

		this.mawGroup.position.set(0, 0, -4.2);
		this.upperJaw.rotation.x = 0;
		this.lowerJaw.rotation.x = 0;
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		this.throatLight.intensity = 1.4 + Math.sin(this.elapsed * 6.0) * 0.6;

		if (progress < 0.25) {

			const p = progress / 0.25;
			const ease = Math.sin((p * Math.PI) / 2);
			this.mawGroup.position.z = -4.2 + ease * 4.15;
			this.mawGroup.position.y = Math.sin(this.elapsed * 1.5) * 0.08;

			this.upperJaw.rotation.x = ease * -0.55;
			this.lowerJaw.rotation.x = ease * 0.55;

			if (p > 0.8 && !this.soundPlayed) {
				this.soundPlayed = true;
				const pan = ctx.pan('hatch');
				ctx.audio?.playMawPress(pan);
			}
		} else if (progress <= 0.65) {

			if (!this.contactTriggered) {
				this.contactTriggered = true;
				ctx.shake(0.45);
				ctx.glass('hatch').addScratch(0.0, 0.0, 0.85);
			}

			const pressP = (progress - 0.25) / 0.40;

			const biteGrip = Math.sin(pressP * Math.PI * 5) * 0.12;
			this.upperJaw.rotation.x = -0.45 + biteGrip;
			this.lowerJaw.rotation.x = 0.45 - biteGrip;

			this.mawGroup.position.x = Math.sin(this.elapsed * 2.2) * 0.12;
			this.mawGroup.position.y = Math.cos(this.elapsed * 2.0) * 0.08;
			this.mawGroup.position.z = -0.045 + Math.sin(this.elapsed * 3.5) * 0.012;

			if (Math.random() < 0.2) {
				ctx.shake(0.08);
			}
		} else {

			const leaveP = (progress - 0.65) / 0.35;
			const ease = leaveP * leaveP;

			this.upperJaw.rotation.x = THREE.MathUtils.lerp(this.upperJaw.rotation.x, -0.05, dt * 6.0);
			this.lowerJaw.rotation.x = THREE.MathUtils.lerp(this.lowerJaw.rotation.x, 0.05, dt * 6.0);

			this.mawGroup.position.z = -0.04 - ease * 7.5;
			this.mawGroup.position.y = -ease * 2.5;
			this.mawGroup.position.x = ease * 3.0;
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.mawGroup.position.set(0, 0, -4.2);
		this.upperJaw.rotation.x = 0;
		this.lowerJaw.rotation.x = 0;
	}
}

