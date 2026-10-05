import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createDiverSuitTexture, createDarkRibTexture } from '../textures/procedural';

export class DeadDiverActor implements WindowEventActor {
	public readonly type = 'DEAD_DIVER';
	public readonly tier = 2 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private diverGroup: THREE.Group;
	private helmetGroup: THREE.Group;
	private leftArm: THREE.Group;
	private rightArm: THREE.Group;
	private sparkLight: THREE.PointLight;
	private helmetDiode: THREE.PointLight;
	private sparkParticles: THREE.Points;

	private elapsed: number = 0;
	private duration: number = 14.0;
	private opening: 'hatch' = 'hatch';

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.diverGroup = new THREE.Group();
		this.root.add(this.diverGroup);

		const suitTex = createDiverSuitTexture();
		const ribTex = createDarkRibTexture();

		const suitMat = new THREE.MeshStandardMaterial({
			map: suitTex,
			roughness: 0.65,
			metalness: 0.35,
			color: 0x3d4e42
		});

		const jointMat = new THREE.MeshStandardMaterial({
			map: ribTex,
			roughness: 0.8,
			metalness: 0.6,
			color: 0x18201a
		});

		const torsoGeo = new THREE.CylinderGeometry(0.42, 0.36, 1.05, 16);
		const torsoMesh = new THREE.Mesh(torsoGeo, suitMat);
		torsoMesh.position.set(0, 0, 0);
		this.diverGroup.add(torsoMesh);

		for (const y of [-0.3, 0.0, 0.3]) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 8, 24), jointMat);
			ring.rotation.x = Math.PI / 2;
			ring.position.set(0, y, 0);
			this.diverGroup.add(ring);
		}

		for (const tx of [-0.18, 0.18]) {
			const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 12), jointMat);
			tank.position.set(tx, 0.15, -0.36);
			this.diverGroup.add(tank);

			const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), jointMat);
			cap.position.set(tx, 0.62, -0.36);
			this.diverGroup.add(cap);
		}

		this.helmetGroup = new THREE.Group();
		this.helmetGroup.position.set(0, 0.82, 0);

		const helmetGeo = new THREE.SphereGeometry(0.36, 20, 20);
		const helmetMesh = new THREE.Mesh(helmetGeo, suitMat);
		this.helmetGroup.add(helmetMesh);

		const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 18), jointMat);
		collar.position.set(0, -0.28, 0);
		this.helmetGroup.add(collar);

		const visorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.035, 10, 24), jointMat);
		visorFrame.position.set(0, 0.02, 0.32);
		this.helmetGroup.add(visorFrame);

		const visorGlass = new THREE.Mesh(
			new THREE.CircleGeometry(0.19, 20),
			new THREE.MeshStandardMaterial({
				color: 0x0a1816,
				roughness: 0.1,
				metalness: 0.9,
				transparent: true,
				opacity: 0.35
			})
		);
		visorGlass.position.set(0, 0.02, 0.33);
		this.helmetGroup.add(visorGlass);

		const skullMat = new THREE.MeshStandardMaterial({
			color: 0xb5b09e,
			roughness: 0.9,
			metalness: 0.05
		});
		const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), skullMat);
		cranium.position.set(0, 0.03, 0.12);
		cranium.scale.set(0.9, 1.1, 1.0);
		this.helmetGroup.add(cranium);

		const socketMat = new THREE.MeshBasicMaterial({ color: 0x020202 });
		for (const ex of [-0.05, 0.05]) {
			const eyeSocket = new THREE.Mesh(new THREE.CircleGeometry(0.032, 10), socketMat);
			eyeSocket.position.set(ex, 0.04, 0.25);
			this.helmetGroup.add(eyeSocket);
		}

		const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.08), skullMat);
		jaw.position.set(0, -0.07, 0.19);
		this.helmetGroup.add(jaw);

		this.helmetDiode = new THREE.PointLight(0xff2222, 1.2, 0.8);
		this.helmetDiode.position.set(0.12, 0.15, 0.22);
		this.helmetGroup.add(this.helmetDiode);

		this.diverGroup.add(this.helmetGroup);

		this.leftArm = new THREE.Group();
		this.leftArm.position.set(-0.52, 0.42, 0);
		const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.55, 10), suitMat);
		lUpper.position.set(0, -0.27, 0);
		this.leftArm.add(lUpper);

		const lJoint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), jointMat);
		lJoint.position.set(0, -0.55, 0);
		this.leftArm.add(lJoint);

		const lFore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 10), suitMat);
		lFore.position.set(0, -0.82, 0);
		this.leftArm.add(lFore);

		for (let c = 0; c < 3; c++) {
			const clawAngle = (c / 3) * Math.PI * 2;
			const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 5), jointMat);
			pincer.position.set(Math.cos(clawAngle) * 0.06, -1.15, Math.sin(clawAngle) * 0.06);
			pincer.rotation.x = Math.PI;
			this.leftArm.add(pincer);
		}
		this.diverGroup.add(this.leftArm);

		this.rightArm = new THREE.Group();
		this.rightArm.position.set(0.52, 0.42, 0);
		const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.55, 10), suitMat);
		rUpper.position.set(0, -0.27, 0);
		this.rightArm.add(rUpper);

		const rJoint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), jointMat);
		rJoint.position.set(0, -0.55, 0);
		this.rightArm.add(rJoint);

		const rFore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 10), suitMat);
		rFore.position.set(0, -0.82, 0);
		this.rightArm.add(rFore);

		for (let c = 0; c < 3; c++) {
			const clawAngle = (c / 3) * Math.PI * 2;
			const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 5), jointMat);
			pincer.position.set(Math.cos(clawAngle) * 0.06, -1.15, Math.sin(clawAngle) * 0.06);
			pincer.rotation.x = Math.PI;
			this.rightArm.add(pincer);
		}
		this.diverGroup.add(this.rightArm);

		for (const lx of [-0.22, 0.22]) {
			const leg = new THREE.Group();
			leg.position.set(lx, -0.55, 0);

			const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65, 10), suitMat);
			thigh.position.set(0, -0.32, 0);
			leg.add(thigh);

			const knee = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), jointMat);
			knee.position.set(0, -0.65, 0);
			leg.add(knee);

			const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.6, 10), suitMat);
			calf.position.set(0, -0.98, 0);
			leg.add(calf);

			const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.32), jointMat);
			boot.position.set(0, -1.35, 0.08);
			leg.add(boot);

			leg.rotation.x = 0.22;
			this.diverGroup.add(leg);
		}

		const cordGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8);
		const cordMat = new THREE.MeshStandardMaterial({ color: 0x111614, roughness: 0.9 });
		const cordMesh = new THREE.Mesh(cordGeo, cordMat);
		cordMesh.position.set(0, -0.3, -0.7);
		cordMesh.rotation.x = Math.PI / 3;
		this.diverGroup.add(cordMesh);

		this.sparkLight = new THREE.PointLight(0x44aaff, 0.0, 3.5);
		this.sparkLight.position.set(0, -0.85, -1.5);
		this.diverGroup.add(this.sparkLight);

		const sCount = 20;
		const sGeo = new THREE.BufferGeometry();
		const sPos = new Float32Array(sCount * 3);
		sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
		this.sparkParticles = new THREE.Points(
			sGeo,
			new THREE.PointsMaterial({
				color: 0x88ccff,
				size: 0.06,
				transparent: true,
				opacity: 0.0,
				blending: THREE.AdditiveBlending
			})
		);
		this.sparkParticles.position.set(0, -0.85, -1.5);
		this.diverGroup.add(this.sparkParticles);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 14.0;
		this.opening = opts.opening;
		this.root.visible = true;

		this.diverGroup.position.set(-2.8, -1.8, -1.15);
		this.diverGroup.rotation.set(0.25, -Math.PI * 0.45, 0.15);

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playDeadDiverDrift(pan);
	}

	public update(dt: number, _ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		const diodePulse = Math.sin(this.elapsed * 4.5);
		this.helmetDiode.intensity = diodePulse > 0.3 ? 1.4 : 0.08;

		if (Math.random() < 0.08) {
			this.sparkLight.intensity = 3.5;
			(this.sparkParticles.material as THREE.PointsMaterial).opacity = 1.0;
		} else {
			this.sparkLight.intensity *= 0.85;
			(this.sparkParticles.material as THREE.PointsMaterial).opacity *= 0.85;
		}

		this.leftArm.rotation.x = Math.sin(this.elapsed * 0.9) * 0.22;
		this.leftArm.rotation.z = -0.25 + Math.cos(this.elapsed * 0.7) * 0.15;
		this.rightArm.rotation.x = Math.cos(this.elapsed * 0.8) * 0.25;
		this.rightArm.rotation.z = 0.25 + Math.sin(this.elapsed * 0.6) * 0.12;

		this.diverGroup.position.x = -2.8 + progress * 5.6;
		this.diverGroup.position.y = -1.8 + progress * 3.4 + Math.sin(this.elapsed * 0.8) * 0.08;
		this.diverGroup.position.z = -1.15 + Math.sin(progress * Math.PI) * 0.35;

		const facingTarget = progress > 0.35 && progress < 0.75 ? 0.05 : -Math.PI * 0.45;
		this.diverGroup.rotation.y = THREE.MathUtils.lerp(this.diverGroup.rotation.y, facingTarget, dt * 1.8);
		this.diverGroup.rotation.z = Math.sin(this.elapsed * 0.5) * 0.18;
		this.diverGroup.rotation.x = 0.2 + Math.cos(this.elapsed * 0.6) * 0.12;

		if (progress > 0.45 && progress < 0.72) {
			this.helmetGroup.rotation.y = Math.sin(this.elapsed * 1.5) * 0.15;
			this.helmetGroup.rotation.x = 0.1;
		} else {
			this.helmetGroup.rotation.y = 0;
			this.helmetGroup.rotation.x = 0;
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.diverGroup.position.set(-2.8, -1.8, -1.15);
		this.sparkLight.intensity = 0.0;
		(this.sparkParticles.material as THREE.PointsMaterial).opacity = 0.0;
	}
}

