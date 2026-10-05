import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import {
	createPaleGhoulSkinTexture,
	createMawFleshTexture
} from '../textures/procedural';

interface CreatureInstance {
	root: THREE.Group;
	headGroup: THREE.Group;
	jawGroup: THREE.Group;
	hairGroups: THREE.Group[];
	tailSegments: THREE.Group[];
}

export class LightFailureActor implements WindowEventActor {
	public readonly type = 'LIGHT_FAILURE';
	public readonly tier = 2 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = true;
	public readonly root: THREE.Group;

	private silhouetteInstance: CreatureInstance;
	private detailedInstance: CreatureInstance;
	private silhouetteBackdrop: THREE.Mesh;
	private silhouetteBackdropMat: THREE.MeshBasicMaterial;

	private stage: number = 0;
	private stageTimer: number = 0;
	private darkDuration: number = 0;
	private playerLookTimer: number = 0;
	private secondKnockPlayed: boolean = false;
	private opening: 'hatch' = 'hatch';

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.silhouetteBackdropMat = new THREE.MeshBasicMaterial({
			color: 0x071b24,
			transparent: true,
			opacity: 0.0,
			side: THREE.DoubleSide,
			depthWrite: false
		});
		this.silhouetteBackdrop = new THREE.Mesh(
			new THREE.PlaneGeometry(6.5, 4.2),
			this.silhouetteBackdropMat
		);
		this.silhouetteBackdrop.position.set(0, 0, -2.8);
		this.root.add(this.silhouetteBackdrop);

		const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
		this.silhouetteInstance = this.createConnectedCreature(
			blackMat,
			blackMat,
			blackMat,
			blackMat,
			blackMat,
			blackMat,
			blackMat,
			true
		);
		this.root.add(this.silhouetteInstance.root);

		const skinTex = createPaleGhoulSkinTexture();
		const fleshTex = createMawFleshTexture();

		const sirenSkinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0xe5eeea,
			roughness: 0.32,
			metalness: 0.08,
			emissive: 0x061418,
			emissiveIntensity: 0.22
		});

		const mouthFleshMat = new THREE.MeshStandardMaterial({
			map: fleshTex,
			color: 0x6e1422,
			roughness: 0.35,
			metalness: 0.12,
			emissive: 0x180308,
			emissiveIntensity: 0.35
		});

		const fangMat = new THREE.MeshStandardMaterial({
			color: 0xebfff8,
			roughness: 0.05,
			metalness: 0.5,
			transparent: true,
			opacity: 0.9,
			emissive: 0x082e22,
			emissiveIntensity: 0.3
		});

		const hairMat = new THREE.MeshStandardMaterial({
			color: 0x050e11,
			roughness: 0.7,
			metalness: 0.15,
			side: THREE.DoubleSide
		});

		const serpentineMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x22363a,
			roughness: 0.45,
			metalness: 0.25,
			emissive: 0x061114,
			emissiveIntensity: 0.2
		});

		const finMat = new THREE.MeshStandardMaterial({
			color: 0x3d6268,
			transparent: true,
			opacity: 0.55,
			roughness: 0.5,
			side: THREE.DoubleSide
		});

		const clawMat = new THREE.MeshStandardMaterial({
			color: 0x080d0f,
			roughness: 0.2,
			metalness: 0.85
		});

		this.detailedInstance = this.createConnectedCreature(
			sirenSkinMat,
			mouthFleshMat,
			fangMat,
			hairMat,
			serpentineMat,
			finMat,
			clawMat,
			false
		);
		this.detailedInstance.root.visible = false;
		this.root.add(this.detailedInstance.root);
	}

	private createConnectedCreature(
		skinMat: THREE.Material,
		mouthMat: THREE.Material,
		fangMat: THREE.Material,
		hairMat: THREE.Material,
		tailMat: THREE.Material,
		finMat: THREE.Material,
		clawMat: THREE.Material,
		isSilhouette: boolean
	): CreatureInstance {
		const creatureRoot = new THREE.Group();
		const hairGroups: THREE.Group[] = [];
		const tailSegments: THREE.Group[] = [];

		const torsoGroup = new THREE.Group();
		torsoGroup.position.set(0, 0.05, -0.16);
		creatureRoot.add(torsoGroup);

		const torsoGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.70, 18, 10);
		torsoGeo.scale(1.15, 1.0, 0.85);
		const torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
		torsoGroup.add(torsoMesh);

		const headGroup = new THREE.Group();
		headGroup.position.set(0, 0.44, 0.02);
		torsoGroup.add(headGroup);

		const skullGeo = new THREE.SphereGeometry(0.18, 24, 20);
		const sPos = skullGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < sPos.count; i++) {
			let x = sPos.getX(i);
			let y = sPos.getY(i);
			let z = sPos.getZ(i);
			if (y < 0) {
				const cp = Math.min(1.0, -y / 0.18);
				x *= 1.0 - cp * 0.45;
				z *= 1.0 - cp * 0.35;
			}
			if (y > 0 && y < 0.09 && Math.abs(x) > 0.03 && Math.abs(x) < 0.11 && z > 0.05) {
				z -= 0.03;
			}
			sPos.setXYZ(i, x, y, z);
		}
		skullGeo.computeVertexNormals();

		const skullMesh = new THREE.Mesh(skullGeo, skinMat);
		headGroup.add(skullMesh);

		if (isSilhouette) {
			for (const ex of [-0.06, 0.06]) {
				const glow = new THREE.Mesh(
					new THREE.CircleGeometry(0.005, 8),
					new THREE.MeshBasicMaterial({ color: 0x44ffdd, side: THREE.DoubleSide })
				);
				glow.position.set(ex, 0.045, 0.14);
				headGroup.add(glow);
			}
		} else {
			for (const ex of [-0.06, 0.06]) {
				const eye = new THREE.Mesh(
					new THREE.SphereGeometry(0.028, 12, 12),
					new THREE.MeshStandardMaterial({ color: 0x020709, roughness: 0.1, metalness: 0.9 })
				);
				eye.position.set(ex, 0.045, 0.13);
				headGroup.add(eye);
			}
		}

		const jawGroup = new THREE.Group();
		jawGroup.position.set(0, -0.05, 0.02);
		headGroup.add(jawGroup);

		const jawGeo = new THREE.ConeGeometry(0.055, 0.18, 6);
		jawGeo.rotateX(Math.PI * 0.85);
		const jawMesh = new THREE.Mesh(jawGeo, skinMat);
		jawMesh.position.set(0, -0.06, 0.02);
		jawGroup.add(jawMesh);

		if (!isSilhouette) {

			for (let i = -0.045; i <= 0.045; i += 0.018) {
				const fang = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.065, 4), fangMat);
				fang.position.set(i, -0.02, 0.05);
				fang.rotation.x = -Math.PI / 4;
				jawGroup.add(fang);
			}

			const throat = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 8), mouthMat);
			throat.rotation.x = -Math.PI / 2;
			throat.position.set(0, -0.02, -0.04);
			headGroup.add(throat);
		}

		const numLocks = 16;
		for (let i = 0; i < numLocks; i++) {
			const ang = (i / numLocks) * Math.PI * 1.8 - Math.PI * 0.9;

			const rootX = Math.sin(ang) * 0.15;
			const rootY = 0.08 + Math.cos(ang * 0.5) * 0.08;
			const rootZ = -Math.cos(ang) * 0.13 - 0.04;

			const hairPivot = new THREE.Group();
			hairPivot.position.set(rootX, rootY, rootZ);

			const lockGeo = new THREE.CylinderGeometry(0.010, 0.038, 1.4, 6);
			lockGeo.translate(0, -0.7, 0);
			const lockMesh = new THREE.Mesh(lockGeo, hairMat);
			lockMesh.rotation.z = Math.sin(ang) * 0.35;
			lockMesh.rotation.x = 0.2;
			hairPivot.add(lockMesh);

			headGroup.add(hairPivot);
			hairGroups.push(hairPivot);
		}

		for (const side of [-1, 1] as const) {

			const shoulderPos = new THREE.Vector3(side * 0.16, 0.28, 0.02);
			const shoulderGroup = new THREE.Group();
			shoulderGroup.position.copy(shoulderPos);
			torsoGroup.add(shoulderGroup);

			const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), skinMat);
			shoulderGroup.add(shoulderJoint);

			const upperArmGroup = new THREE.Group();
			shoulderGroup.add(upperArmGroup);

			const upperArmLen = 0.44;
			const upperArmGeo = new THREE.CylinderGeometry(0.028, 0.024, upperArmLen, 8);
			upperArmGeo.translate(0, -upperArmLen / 2, 0);
			const upperArmMesh = new THREE.Mesh(upperArmGeo, skinMat);
			upperArmGroup.add(upperArmMesh);

			upperArmGroup.rotation.z = side * (Math.PI / 4.2);
			upperArmGroup.rotation.x = 0.28;

			const elbowGroup = new THREE.Group();
			elbowGroup.position.set(0, -upperArmLen, 0);
			upperArmGroup.add(elbowGroup);

			const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), skinMat);
			elbowGroup.add(elbowJoint);

			const forearmGroup = new THREE.Group();
			elbowGroup.add(forearmGroup);

			const forearmLen = 0.42;
			const forearmGeo = new THREE.CylinderGeometry(0.024, 0.018, forearmLen, 8);
			forearmGeo.translate(0, -forearmLen / 2, 0);
			const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
			forearmGroup.add(forearmMesh);

			forearmGroup.rotation.z = -side * (Math.PI / 5.5);
			forearmGroup.rotation.x = 0.38;

			const handGroup = new THREE.Group();
			handGroup.position.set(0, -forearmLen, 0);
			forearmGroup.add(handGroup);

			const wristJoint = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), skinMat);
			handGroup.add(wristJoint);

			const palmGeo = new THREE.BoxGeometry(0.055, 0.085, 0.012);
			palmGeo.translate(0, -0.045, 0);
			const palmMesh = new THREE.Mesh(palmGeo, skinMat);
			handGroup.add(palmMesh);

			for (let f = 0; f < 5; f++) {
				const fx = (f - 2) * 0.013;
				const fingerLen = 0.11;
				const fingerGeo = new THREE.CylinderGeometry(0.005, 0.003, fingerLen, 6);
				fingerGeo.translate(0, -fingerLen / 2, 0);
				const fingerMesh = new THREE.Mesh(fingerGeo, skinMat);
				fingerMesh.position.set(fx, -0.085, 0);
				handGroup.add(fingerMesh);

				if (!isSilhouette) {
					const clawGeo = new THREE.ConeGeometry(0.005, 0.07, 4);
					clawGeo.rotateX(Math.PI * 0.75);
					const clawMesh = new THREE.Mesh(clawGeo, clawMat);
					clawMesh.position.set(fx, -0.085 - fingerLen, 0.005);
					handGroup.add(clawMesh);
				}
			}
		}

		const tailGroup = new THREE.Group();
		tailGroup.position.set(0, -0.35, 0.0);
		torsoGroup.add(tailGroup);

		const numTailSegs = 16;
		let parentObj: THREE.Object3D = tailGroup;
		const tailSegLen = 0.24;

		for (let s = 0; s < numTailSegs; s++) {
			const sProg = s / (numTailSegs - 1);
			const segGroup = new THREE.Group();

			const rTop = 0.08 * (1.0 - sProg * 0.8) + 0.016;
			const rBot = 0.08 * (1.0 - (sProg + 1 / numTailSegs) * 0.8) + 0.016;

			const segGeo = new THREE.CylinderGeometry(rBot, rTop, tailSegLen, 8);
			segGeo.translate(0, -tailSegLen / 2, 0);
			const segMesh = new THREE.Mesh(segGeo, tailMat);
			segGroup.add(segMesh);

			const spineCone = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.14 * (1.0 - sProg * 0.6), 4), tailMat);
			spineCone.position.set(0, -tailSegLen / 2, -rTop * 1.2);
			spineCone.rotation.x = -Math.PI / 3;
			segGroup.add(spineCone);

			parentObj.add(segGroup);
			if (s > 0) segGroup.position.set(0, -tailSegLen, -0.02);
			parentObj = segGroup;
			tailSegments.push(segGroup);
		}

		const finGeo = new THREE.PlaneGeometry(0.20, 3.4, 1, 16);
		finGeo.rotateZ(Math.PI / 2);
		const finMesh = new THREE.Mesh(finGeo, finMat);
		finMesh.position.set(0, -1.7, -0.15);
		finMesh.rotation.y = Math.PI / 2;
		tailGroup.add(finMesh);

		return {
			root: creatureRoot,
			headGroup,
			jawGroup,
			hairGroups,
			tailSegments
		};
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.stage = 0;
		this.stageTimer = 0;
		this.darkDuration = 0;
		this.playerLookTimer = 0;
		this.secondKnockPlayed = false;
		this.opening = opts.opening;

		this.root.visible = true;
		this.silhouetteInstance.root.visible = true;
		this.detailedInstance.root.visible = false;
		this.silhouetteBackdropMat.opacity = 0.0;

		this.silhouetteInstance.root.position.set(0, 0.08, -0.055);
		this.detailedInstance.root.position.set(0, 0.08, -0.055);
		this.detailedInstance.jawGroup.rotation.x = 0;

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playLightFailureSpark(pan);
		ctx.lights.flicker(opts.opening, 1.8);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.stageTimer += dt;

		const activeHair = this.stage < 2 ? this.silhouetteInstance.hairGroups : this.detailedInstance.hairGroups;
		for (let h = 0; h < activeHair.length; h++) {
			activeHair[h].rotation.z = Math.sin(this.stageTimer * 2.2 + h * 0.35) * 0.12;
			activeHair[h].rotation.x = 0.15 + Math.cos(this.stageTimer * 1.8 + h * 0.3) * 0.08;
		}

		const activeTail = this.stage < 2 ? this.silhouetteInstance.tailSegments : this.detailedInstance.tailSegments;
		for (let s = 0; s < activeTail.length; s++) {
			activeTail[s].rotation.z = Math.sin(this.stageTimer * 2.6 - s * 0.4) * 0.15;
		}

		if (this.stage === 0) {

			if (this.stageTimer >= 1.8) {
				this.stage = 1;
				this.stageTimer = 0;
				this.darkDuration = 0;
				this.playerLookTimer = 0;
				this.secondKnockPlayed = false;

				ctx.lights.setLevel(this.opening, 0.0);
				ctx.audio?.playHullKnock(ctx.pan(this.opening));
			}
		} else if (this.stage === 1) {

			this.darkDuration += dt;
			this.silhouetteInstance.root.visible = true;
			this.detailedInstance.root.visible = false;

			this.silhouetteBackdropMat.opacity = Math.min(0.65, this.silhouetteBackdropMat.opacity + dt * 1.2);

			this.silhouetteInstance.root.position.x = Math.sin(this.darkDuration * 1.4) * 0.025;
			this.silhouetteInstance.root.position.z = -0.055 + Math.sin(this.darkDuration * 1.0) * 0.005;

			if (this.darkDuration >= 3.0 && !this.secondKnockPlayed) {
				this.secondKnockPlayed = true;
				ctx.audio?.playHullKnock(ctx.pan(this.opening));
			}

			const isPlayerLookingAtWindow = ctx.isVisible(this.opening);
			const hasMetMinDarkTime = this.darkDuration >= 4.5;

			if (isPlayerLookingAtWindow && hasMetMinDarkTime) {

				this.playerLookTimer += dt;

				if (this.playerLookTimer >= 2.2) {
					this.triggerJumpscare(ctx);
				}
			} else {

				if (this.darkDuration >= 18.0) {
					this.triggerJumpscare(ctx);
				}
			}
		} else if (this.stage === 2) {

			this.silhouetteInstance.root.visible = false;
			this.detailedInstance.root.visible = true;
			this.silhouetteBackdropMat.opacity = 0.0;

			const jx = (Math.random() - 0.5) * 0.005;
			const jy = (Math.random() - 0.5) * 0.005;
			this.detailedInstance.root.position.set(jx, 0.08 + jy, -0.055);

			const jawProgress = Math.min(1.0, this.stageTimer / 0.7);
			this.detailedInstance.jawGroup.rotation.x = jawProgress * 0.65;

			if (this.stageTimer >= 2.4) {
				this.stage = 3;
				this.stageTimer = 0;
				ctx.shake(0.35);
			}
		} else if (this.stage === 3) {

			const leaveP = Math.min(1.0, this.stageTimer / 2.6);
			const ease = leaveP * leaveP;

			this.detailedInstance.root.position.z = -0.055 - ease * 15.0;
			this.detailedInstance.root.position.y = 0.08 - ease * 5.8;
			this.detailedInstance.root.position.x = Math.sin(this.stageTimer * 8.0) * 0.5;

			if (leaveP >= 1.0) {
				this.stop();
				return false;
			}
		}

		return true;
	}

	private triggerJumpscare(ctx: EventContext): void {
		this.stage = 2;
		this.stageTimer = 0;

		ctx.lights.setLevel(this.opening, 1.0);
		ctx.shake(0.90);
		ctx.glitch(0.55, 0.5);
		ctx.audio?.playLightFailureSpark(ctx.pan(this.opening));
		ctx.glass(this.opening).addScratch(0.0, -0.05, 0.8);
	}

	public stop(): void {
		this.root.visible = false;
		this.silhouetteInstance.root.visible = false;
		this.detailedInstance.root.visible = false;
		this.silhouetteBackdropMat.opacity = 0.0;
		this.silhouetteInstance.root.position.set(0, 0.08, -0.055);
		this.detailedInstance.root.position.set(0, 0.08, -0.055);
		this.detailedInstance.jawGroup.rotation.x = 0;
	}
}

