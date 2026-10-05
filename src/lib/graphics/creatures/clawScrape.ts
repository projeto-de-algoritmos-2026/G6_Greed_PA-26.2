import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createChitinTexture } from '../textures/procedural';

function createSickleClawGeometry(length: number, baseRadius: number): THREE.BufferGeometry {
	const segments = 16;
	const radialSegments = 10;
	const vertices: number[] = [];
	const indices: number[] = [];
	const normals: number[] = [];
	const uvs: number[] = [];

	for (let i = 0; i <= segments; i++) {
		const t = i / segments;

		const r = baseRadius * Math.pow(1.0 - t, 0.82);

		const y = -t * length;
		const z = -Math.sin(t * Math.PI * 0.5) * (length * 0.38);
		const xOffset = Math.sin(t * Math.PI) * (baseRadius * 0.15);

		for (let j = 0; j <= radialSegments; j++) {
			const theta = (j / radialSegments) * Math.PI * 2;

			const cosTh = Math.cos(theta);
			const sinTh = Math.sin(theta);
			const vx = xOffset + cosTh * (r * 0.55);
			const vy = y + sinTh * (r * 0.35);
			const vz = z + sinTh * r;

			vertices.push(vx, vy, vz);
			uvs.push(j / radialSegments, t);

			const nx = cosTh;
			const ny = 0;
			const nz = sinTh;
			normals.push(nx, ny, nz);
		}
	}

	for (let i = 0; i < segments; i++) {
		for (let j = 0; j < radialSegments; j++) {
			const a = i * (radialSegments + 1) + j;
			const b = (i + 1) * (radialSegments + 1) + j;
			const c = (i + 1) * (radialSegments + 1) + (j + 1);
			const d = i * (radialSegments + 1) + (j + 1);
			indices.push(a, b, d);
			indices.push(b, c, d);
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
	geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
	geo.setIndex(indices);
	geo.computeVertexNormals();
	return geo;
}

export class ClawScrapeActor implements WindowEventActor {
	public readonly type = 'CLAW_SCRAPE';
	public readonly tier = 3 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private limbRoot: THREE.Group;
	private coxaArm: THREE.Group;
	private merusArm: THREE.Group;
	private carpusJoint: THREE.Group;
	private propodusHand: THREE.Group;
	private clawTalons: THREE.Group[] = [];

	private sparkSystem: THREE.Points;
	private sparkPositions: Float32Array;
	private sparkVelocities: Float32Array;
	private sparkLight: THREE.PointLight;
	private photophores: THREE.Mesh[] = [];

	private elapsed: number = 0;
	private duration: number = 9.0;
	private scrapeStarted: boolean = false;
	private opening: 'hatch' = 'hatch';
	private stickSlipOffset: number = 0;
	private stickSlipTimer: number = 0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.limbRoot = new THREE.Group();
		this.root.add(this.limbRoot);

		const chitinTex = createChitinTexture();

		const carapaceMat = new THREE.MeshStandardMaterial({
			map: chitinTex,
			color: 0x1a2622,
			roughness: 0.28,
			metalness: 0.42,
			bumpScale: 0.08
		});

		const jointMat = new THREE.MeshStandardMaterial({
			color: 0x22110c,
			roughness: 0.75,
			metalness: 0.15
		});

		const bladeMat = new THREE.MeshStandardMaterial({
			color: 0x9be8e0,
			roughness: 0.12,
			metalness: 0.55,
			emissive: 0x063328,
			emissiveIntensity: 0.35
		});

		const photophoreMat = new THREE.MeshBasicMaterial({
			color: 0x00ffcc
		});

		this.coxaArm = new THREE.Group();
		this.limbRoot.add(this.coxaArm);

		const numUpperPlates = 5;
		for (let p = 0; p < numUpperPlates; p++) {
			const plateProgress = p / (numUpperPlates - 1);
			const rTop = 0.34 - plateProgress * 0.08;
			const rBot = 0.31 - plateProgress * 0.08;
			const pLen = 0.32;

			const plateGeo = new THREE.CylinderGeometry(rBot, rTop, pLen, 14);
			plateGeo.scale(1.25, 1.0, 0.85);
			const plateMesh = new THREE.Mesh(plateGeo, carapaceMat);
			plateMesh.position.set(0, -p * 0.26, -0.06);
			plateMesh.rotation.x = 0.12;
			this.coxaArm.add(plateMesh);

			for (const side of [-1, 1]) {
				const spineGeo = new THREE.ConeGeometry(0.045, 0.28, 5);
				const spine = new THREE.Mesh(spineGeo, carapaceMat);
				spine.position.set(side * (rTop * 1.25), -p * 0.26 + 0.04, -0.06);
				spine.rotation.z = side * (Math.PI / 2.8);
				spine.rotation.y = side * 0.2;
				this.coxaArm.add(spine);

				const photo = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), photophoreMat);
				photo.position.set(side * (rTop * 1.15), -p * 0.26 + 0.08, -0.04);
				this.coxaArm.add(photo);
				this.photophores.push(photo);
			}
		}

		const elbowMembrane = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), jointMat);
		elbowMembrane.scale.set(1.1, 0.9, 0.9);
		elbowMembrane.position.set(0, -1.25, -0.08);
		this.coxaArm.add(elbowMembrane);

		this.merusArm = new THREE.Group();
		this.merusArm.position.set(0, -1.25, -0.08);
		this.coxaArm.add(this.merusArm);

		for (let p = 0; p < 4; p++) {
			const plateProg = p / 3;
			const rTop = 0.26 - plateProg * 0.04;
			const rBot = 0.24 - plateProg * 0.04;
			const pLen = 0.28;

			const forePlate = new THREE.Mesh(new THREE.CylinderGeometry(rBot, rTop, pLen, 14), carapaceMat);
			forePlate.scale.set(1.2, 1.0, 0.9);
			forePlate.position.set(0, -p * 0.24, 0);
			this.merusArm.add(forePlate);

			for (const side of [-1, 1]) {
				const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5), carapaceMat);
				thorn.position.set(side * 0.22, -p * 0.24, 0.08);
				thorn.rotation.x = -Math.PI / 3.5;
				thorn.rotation.z = side * 0.25;
				this.merusArm.add(thorn);
			}
		}

		this.carpusJoint = new THREE.Group();
		this.carpusJoint.position.set(0, -0.95, 0);
		this.merusArm.add(this.carpusJoint);

		this.propodusHand = new THREE.Group();
		this.carpusJoint.add(this.propodusHand);

		const palmGeo = new THREE.BoxGeometry(0.55, 0.35, 0.28);
		const palmMesh = new THREE.Mesh(palmGeo, carapaceMat);
		palmMesh.position.set(0, -0.15, -0.04);
		this.propodusHand.add(palmMesh);

		for (const side of [-1, 1]) {
			const flange = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), carapaceMat);
			flange.position.set(side * 0.32, -0.15, -0.04);
			flange.rotation.z = side * (Math.PI / 2.2);
			this.propodusHand.add(flange);
		}

		const talonConfigs = [
			{ x: -0.22, length: 0.82, radius: 0.075, rotZ: 0.18, scale: 0.95 },
			{ x: 0.0, length: 0.98, radius: 0.088, rotZ: 0.0, scale: 1.15 },
			{ x: 0.22, length: 0.82, radius: 0.075, rotZ: -0.18, scale: 0.95 }
		];

		for (let i = 0; i < talonConfigs.length; i++) {
			const cfg = talonConfigs[i];
			const talonGroup = new THREE.Group();
			talonGroup.position.set(cfg.x, -0.32, 0.0);

			const knuckle = new THREE.Mesh(new THREE.SphereGeometry(cfg.radius * 1.15, 10, 10), jointMat);
			talonGroup.add(knuckle);

			const sickleGeo = createSickleClawGeometry(cfg.length, cfg.radius);
			const sickleMesh = new THREE.Mesh(sickleGeo, bladeMat);
			sickleMesh.scale.set(cfg.scale, cfg.scale, cfg.scale);
			talonGroup.add(sickleMesh);

			const numDenticles = 6;
			for (let d = 0; d < numDenticles; d++) {
				const dt = (d + 1) / (numDenticles + 1);
				const denticleGeo = new THREE.ConeGeometry(0.02, 0.08, 4);
				const denticle = new THREE.Mesh(denticleGeo, bladeMat);
				const dy = -dt * cfg.length * 0.85;
				const dz = -Math.sin(dt * Math.PI * 0.5) * (cfg.length * 0.3) + 0.02;
				denticle.position.set(0, dy, dz);
				denticle.rotation.x = -Math.PI / 3;
				talonGroup.add(denticle);
			}

			talonGroup.rotation.z = cfg.rotZ;
			this.clawTalons.push(talonGroup);
			this.propodusHand.add(talonGroup);
		}

		const sparkCount = 80;
		this.sparkPositions = new Float32Array(sparkCount * 3);
		this.sparkVelocities = new Float32Array(sparkCount * 3);

		for (let i = 0; i < sparkCount; i++) {
			this.sparkPositions[i * 3] = 0;
			this.sparkPositions[i * 3 + 1] = 0;
			this.sparkPositions[i * 3 + 2] = -0.015;
			this.sparkVelocities[i * 3] = (Math.random() - 0.5) * 1.6;
			this.sparkVelocities[i * 3 + 1] = Math.random() * 1.8 + 0.4;
			this.sparkVelocities[i * 3 + 2] = -Math.random() * 0.5 - 0.05;
		}

		const sparkGeo = new THREE.BufferGeometry();
		sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));

		const sparkMat = new THREE.PointsMaterial({
			color: 0x88ffff,
			size: 0.12,
			transparent: true,
			opacity: 0.0,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});

		this.sparkSystem = new THREE.Points(sparkGeo, sparkMat);
		this.root.add(this.sparkSystem);

		this.sparkLight = new THREE.PointLight(0x00e1ff, 0.0, 3.2);
		this.sparkLight.position.set(0.35, 0.0, -0.03);
		this.root.add(this.sparkLight);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 9.0;
		this.scrapeStarted = false;
		this.opening = opts.opening;
		this.stickSlipOffset = 0;
		this.stickSlipTimer = 0;
		this.root.visible = true;

		this.limbRoot.position.set(0.42, 2.2, -0.08);
		this.limbRoot.rotation.set(-0.25, 0.15, -0.2);

		this.coxaArm.rotation.set(0.2, 0, 0);
		this.merusArm.rotation.set(-0.15, 0, 0);
		this.propodusHand.rotation.set(0.1, 0, 0);

		for (const t of this.clawTalons) {
			t.rotation.x = 0;
		}

		(this.sparkSystem.material as THREE.PointsMaterial).opacity = 0.0;
		this.sparkLight.intensity = 0.0;
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		const glow = 0.5 + Math.sin(this.elapsed * 4.0) * 0.45;
		for (const p of this.photophores) {
			(p.material as THREE.MeshBasicMaterial).color.setRGB(0, glow * 0.95, glow * 0.8);
		}

		if (progress < 0.22) {

			const p = progress / 0.22;
			const ease = Math.sin((p * Math.PI) / 2);

			this.limbRoot.position.x = 0.42 - ease * 0.08;
			this.limbRoot.position.y = 2.2 - ease * 0.85;
			this.limbRoot.position.z = -0.08 + ease * 0.055;

			this.coxaArm.rotation.x = 0.2 + ease * 0.15;
			this.merusArm.rotation.x = -0.15 + ease * 0.35;
			this.propodusHand.rotation.x = 0.1 + ease * 0.45;

			for (const t of this.clawTalons) {
				t.rotation.x = ease * 0.55;
			}

			if (p > 0.88 && !this.scrapeStarted) {
				ctx.shake(0.22);
				ctx.audio?.playHullKnock(ctx.pan(this.opening));
			}
		} else if (progress <= 0.78) {

			if (!this.scrapeStarted) {
				this.scrapeStarted = true;
				ctx.audio?.playWindowScrape(ctx.pan(this.opening));
				ctx.glass(this.opening).addScratch(0.35, 0.15, 0.95);
			}

			const scrapeP = (progress - 0.22) / 0.56;

			this.stickSlipTimer += dt * 14.0;
			const slipJitter = (Math.sin(this.stickSlipTimer) + Math.cos(this.stickSlipTimer * 2.3)) * 0.018;

			const targetY = 1.35 - scrapeP * 2.6 + slipJitter;
			this.limbRoot.position.y = targetY;
			this.limbRoot.position.x = 0.34 + Math.sin(scrapeP * Math.PI * 4) * 0.04;

			this.limbRoot.position.z = -0.020 + Math.sin(this.elapsed * 25.0) * 0.003;

			this.merusArm.rotation.z = Math.sin(this.elapsed * 10.0) * 0.04;
			this.propodusHand.rotation.z = Math.cos(this.elapsed * 12.0) * 0.03;

			for (let i = 0; i < this.clawTalons.length; i++) {
				this.clawTalons[i].rotation.x = 0.55 + Math.sin(this.elapsed * 18.0 + i) * 0.06;
			}

			const sparkMat = this.sparkSystem.material as THREE.PointsMaterial;
			sparkMat.opacity = 0.85 + Math.sin(this.elapsed * 30.0) * 0.15;

			const originX = this.limbRoot.position.x;
			const originY = this.limbRoot.position.y - 0.75;
			const originZ = -0.016;

			const pos = this.sparkPositions;
			const vel = this.sparkVelocities;
			const count = pos.length / 3;

			for (let i = 0; i < count; i++) {
				pos[i * 3] += vel[i * 3] * dt;
				pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
				pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

				if (pos[i * 3 + 1] > originY + 0.6 || Math.random() < 0.08) {
					pos[i * 3] = originX + (Math.random() - 0.5) * 0.35;
					pos[i * 3 + 1] = originY + (Math.random() - 0.5) * 0.05;
					pos[i * 3 + 2] = originZ - Math.random() * 0.015;
					vel[i * 3] = (Math.random() - 0.5) * 1.5;
					vel[i * 3 + 1] = Math.random() * 1.6 + 0.3;
					vel[i * 3 + 2] = -Math.random() * 0.4 - 0.02;
				}
			}
			this.sparkSystem.geometry.attributes.position.needsUpdate = true;

			this.sparkLight.position.set(originX, originY, -0.03);
			this.sparkLight.intensity = 1.6 + Math.sin(this.elapsed * 45.0) * 1.2;

			if (Math.random() < 0.35) {
				ctx.shake(0.08);
			}
		} else {

			const leaveP = (progress - 0.78) / 0.22;
			const ease = leaveP * leaveP;

			(this.sparkSystem.material as THREE.PointsMaterial).opacity = Math.max(0, 1.0 - leaveP * 3.0);
			this.sparkLight.intensity = Math.max(0, this.sparkLight.intensity - dt * 6.0);

			this.limbRoot.position.z = -0.020 - ease * 4.8;
			this.limbRoot.position.y = -1.25 - ease * 2.8;
			this.limbRoot.position.x = 0.34 + ease * 1.8;

			this.coxaArm.rotation.x = THREE.MathUtils.lerp(this.coxaArm.rotation.x, -0.4, dt * 5.0);
			this.merusArm.rotation.x = THREE.MathUtils.lerp(this.merusArm.rotation.x, -0.5, dt * 5.0);

			for (const t of this.clawTalons) {
				t.rotation.x = THREE.MathUtils.lerp(t.rotation.x, 0.05, dt * 4.0);
			}
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.limbRoot.position.set(0.42, 2.2, -0.08);
		(this.sparkSystem.material as THREE.PointsMaterial).opacity = 0.0;
		this.sparkLight.intensity = 0.0;
	}
}

