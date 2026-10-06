import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createChitinTexture } from '../textures/procedural';

function createSickleClawGeometry(length: number, baseRadius: number, forwardReach: number): THREE.BufferGeometry {
	const segments = 20;
	const radialSegments = 12;
	const vertices: number[] = [];
	const indices: number[] = [];
	const normals: number[] = [];
	const uvs: number[] = [];

	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const taper = Math.pow(1.0 - t, 0.8);
		const rX = baseRadius * 0.4 * taper;
		const rZ = baseRadius * 0.75 * taper;

		const y = -t * length;
		const z = Math.sin(t * Math.PI * 0.5) * forwardReach;
		const xOffset = Math.sin(t * Math.PI) * (baseRadius * 0.1);

		for (let j = 0; j <= radialSegments; j++) {
			const theta = (j / radialSegments) * Math.PI * 2;
			const cosTh = Math.cos(theta);
			const sinTh = Math.sin(theta);

			const sharpness = sinTh > 0 ? 0.6 + 0.4 * Math.cos(theta) : 1.0;
			const vx = xOffset + cosTh * rX * sharpness;
			const vy = y + cosTh * (rX * 0.15);
			const vz = z + sinTh * rZ;

			vertices.push(vx, vy, vz);
			uvs.push(j / radialSegments, t);
			normals.push(cosTh, 0, sinTh);
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
	private stickSlipTimer: number = 0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.limbRoot = new THREE.Group();
		this.root.add(this.limbRoot);

		const chitinTex = createChitinTexture();

		const carapaceMat = new THREE.MeshStandardMaterial({
			map: chitinTex,
			color: 0x141e1b,
			roughness: 0.32,
			metalness: 0.45,
			bumpScale: 0.08
		});

		const jointMat = new THREE.MeshStandardMaterial({
			color: 0x1a100b,
			roughness: 0.85,
			metalness: 0.12
		});

		const bladeMat = new THREE.MeshStandardMaterial({
			color: 0x6edecf,
			roughness: 0.14,
			metalness: 0.68,
			emissive: 0x052a22,
			emissiveIntensity: 0.42
		});

		const photophoreMat = new THREE.MeshBasicMaterial({
			color: 0x00ffcc
		});

		this.coxaArm = new THREE.Group();
		this.limbRoot.add(this.coxaArm);

		const numUpperPlates = 8;
		for (let p = 0; p < numUpperPlates; p++) {
			const plateProgress = p / (numUpperPlates - 1);
			const rTop = 0.26 - plateProgress * 0.08;
			const rBot = 0.24 - plateProgress * 0.08;
			const pLen = 0.30;

			const plateGeo = new THREE.CylinderGeometry(rBot, rTop, pLen, 14);
			plateGeo.scale(1.2, 1.0, 0.7);
			const plateMesh = new THREE.Mesh(plateGeo, carapaceMat);
			plateMesh.position.set(0, -p * 0.26, -0.06);
			this.coxaArm.add(plateMesh);

			for (const side of [-1, 1]) {
				const spineGeo = new THREE.ConeGeometry(0.035, 0.22, 5);
				const spine = new THREE.Mesh(spineGeo, carapaceMat);
				spine.position.set(side * (rTop * 1.2), -p * 0.26 + 0.03, -0.06);
				spine.rotation.z = side * (Math.PI / 2.6);
				spine.rotation.y = side * 0.2;
				this.coxaArm.add(spine);

				const photo = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), photophoreMat);
				photo.position.set(side * (rTop * 1.12), -p * 0.26 + 0.05, -0.04);
				this.coxaArm.add(photo);
				this.photophores.push(photo);
			}
		}

		const coxaTotalLen = (numUpperPlates - 1) * 0.26;

		const elbowMembrane = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), jointMat);
		elbowMembrane.scale.set(1.1, 0.9, 0.8);
		elbowMembrane.position.set(0, -coxaTotalLen, -0.08);
		this.coxaArm.add(elbowMembrane);

		this.merusArm = new THREE.Group();
		this.merusArm.position.set(0, -coxaTotalLen, -0.08);
		this.coxaArm.add(this.merusArm);

		for (let p = 0; p < 4; p++) {
			const plateProg = p / 3;
			const rTop = 0.18 - plateProg * 0.03;
			const rBot = 0.16 - plateProg * 0.03;
			const pLen = 0.24;

			const forePlateGeo = new THREE.CylinderGeometry(rBot, rTop, pLen, 14);
			forePlateGeo.scale(1.15, 1.0, 0.75);
			const forePlate = new THREE.Mesh(forePlateGeo, carapaceMat);
			forePlate.position.set(0, -p * 0.22, -0.04);
			this.merusArm.add(forePlate);

			for (const side of [-1, 1]) {
				const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.16, 5), carapaceMat);
				thorn.position.set(side * 0.18, -p * 0.22, -0.02);
				thorn.rotation.z = side * 0.35;
				thorn.rotation.y = -side * 0.2;
				this.merusArm.add(thorn);
			}
		}

		this.carpusJoint = new THREE.Group();
		this.carpusJoint.position.set(0, -0.88, -0.04);
		this.merusArm.add(this.carpusJoint);

		this.propodusHand = new THREE.Group();
		this.carpusJoint.add(this.propodusHand);

		const palmGeo = new THREE.BoxGeometry(0.48, 0.3, 0.18);
		const palmMesh = new THREE.Mesh(palmGeo, carapaceMat);
		palmMesh.position.set(0, -0.14, -0.04);
		this.propodusHand.add(palmMesh);

		for (const side of [-1, 1]) {
			const flange = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 6), carapaceMat);
			flange.position.set(side * 0.28, -0.14, -0.04);
			flange.rotation.z = side * (Math.PI / 2.3);
			this.propodusHand.add(flange);
		}

		const talonConfigs = [
			{ id: 'left', x: -0.20, length: 0.82, radius: 0.065, reach: 0.20, rotZ: 0.22, rotY: -0.08, scale: 0.96 },
			{ id: 'center', x: 0.0, length: 0.98, radius: 0.075, reach: 0.22, rotZ: 0.0, rotY: 0.0, scale: 1.1 },
			{ id: 'right', x: 0.20, length: 0.82, radius: 0.065, reach: 0.20, rotZ: -0.22, rotY: 0.08, scale: 0.96 },
			{ id: 'thumb', x: -0.28, length: 0.54, radius: 0.055, reach: 0.16, rotZ: 0.62, rotY: -0.15, scale: 0.85 }
		];

		for (let i = 0; i < talonConfigs.length; i++) {
			const cfg = talonConfigs[i];
			const talonGroup = new THREE.Group();
			talonGroup.position.set(cfg.x, -0.28, -0.02);

			const knuckle = new THREE.Mesh(new THREE.SphereGeometry(cfg.radius * 1.1, 10, 10), jointMat);
			talonGroup.add(knuckle);

			const knucklePhoto = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), photophoreMat);
			knucklePhoto.position.set(0, 0, cfg.radius * 0.8);
			talonGroup.add(knucklePhoto);
			this.photophores.push(knucklePhoto);

			const sickleGeo = createSickleClawGeometry(cfg.length, cfg.radius, cfg.reach);
			const sickleMesh = new THREE.Mesh(sickleGeo, bladeMat);
			sickleMesh.scale.set(cfg.scale, cfg.scale, cfg.scale);
			talonGroup.add(sickleMesh);

			const numDenticles = 6;
			for (let d = 0; d < numDenticles; d++) {
				const dt = (d + 1) / (numDenticles + 1);
				const denticleGeo = new THREE.ConeGeometry(0.016, 0.065, 4);
				const denticle = new THREE.Mesh(denticleGeo, bladeMat);
				const dy = -dt * cfg.length * 0.88;
				const dz = Math.sin(dt * Math.PI * 0.5) * cfg.reach + 0.01;
				denticle.position.set(0, dy, dz);
				denticle.rotation.x = Math.PI / 4;
				talonGroup.add(denticle);
			}

			talonGroup.rotation.z = cfg.rotZ;
			talonGroup.rotation.y = cfg.rotY;
			this.clawTalons.push(talonGroup);
			this.propodusHand.add(talonGroup);
		}

		const sparkCount = 90;
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
		this.sparkLight.position.set(0.0, 0.0, -0.035);
		this.root.add(this.sparkLight);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 9.0;
		this.scrapeStarted = false;
		this.opening = opts.opening;
		this.stickSlipTimer = 0;
		this.root.visible = true;

		this.limbRoot.position.set(0.0, 6.2, -0.86);
		this.limbRoot.rotation.set(0.0, 0.0, 0.0);

		this.coxaArm.rotation.set(0.12, 0, 0);
		this.merusArm.rotation.set(0.06, 0, 0);
		this.propodusHand.rotation.set(-0.04, 0, 0);

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

		const isScraping = progress >= 0.22 && progress <= 0.78;
		const glow = isScraping
			? 0.75 + Math.sin(this.elapsed * 24.0) * 0.25
			: 0.45 + Math.sin(this.elapsed * 3.5) * 0.4;

		for (const p of this.photophores) {
			(p.material as THREE.MeshBasicMaterial).color.setRGB(0, glow * 0.95, glow * 0.85);
		}

		if (progress < 0.22) {
			const p = progress / 0.22;
			const ease = Math.sin((p * Math.PI) / 2);

			this.limbRoot.position.x = 0.0;
			this.limbRoot.position.y = 6.2 - ease * 1.0; 
			this.limbRoot.position.z = -0.86 + ease * 0.26; 

			this.coxaArm.rotation.x = 0.12 - ease * 0.23; 
			this.merusArm.rotation.x = 0.06 - ease * 0.12; 
			this.propodusHand.rotation.x = -0.04 + ease * 0.12; 

			for (const t of this.clawTalons) {
				t.rotation.x = ease * 0.05;
			}

			if (p > 0.88 && !this.scrapeStarted) {
				ctx.shake(0.24);
				ctx.audio?.playHullKnock(ctx.pan(this.opening));
			}
		} else if (progress <= 0.78) {
			if (!this.scrapeStarted) {
				this.scrapeStarted = true;
				ctx.audio?.playWindowScrape(ctx.pan(this.opening));
				ctx.glass(this.opening).addScratch(0.0, 0.0, 0.95, 'CLAW_SCRAPE');
			}

			const scrapeP = (progress - 0.22) / 0.56;

			this.stickSlipTimer += dt * 14.0;
			const slipJitter = (Math.sin(this.stickSlipTimer) + Math.cos(this.stickSlipTimer * 2.3)) * 0.015;

			this.limbRoot.position.y = 5.2 - scrapeP * 2.3 + slipJitter;
			this.limbRoot.position.x = Math.sin(scrapeP * Math.PI * 3) * 0.025;
			this.limbRoot.position.z = -0.600 + Math.sin(this.elapsed * 25.0) * 0.002;

			this.coxaArm.rotation.x = -0.11 + Math.sin(this.elapsed * 8.0) * 0.006;
			this.merusArm.rotation.x = -0.06 + Math.sin(this.elapsed * 10.0) * 0.006;
			this.merusArm.rotation.z = Math.sin(this.elapsed * 10.0) * 0.015;
			this.propodusHand.rotation.x = 0.08 + Math.sin(this.elapsed * 12.0) * 0.01;
			this.propodusHand.rotation.z = Math.cos(this.elapsed * 12.0) * 0.015;

			for (let i = 0; i < this.clawTalons.length; i++) {
				this.clawTalons[i].rotation.x = 0.05 + Math.sin(this.elapsed * 18.0 + i) * 0.01;
			}

			const sparkMat = this.sparkSystem.material as THREE.PointsMaterial;
			sparkMat.opacity = 0.88 + Math.sin(this.elapsed * 32.0) * 0.12;

			const originX = this.limbRoot.position.x;
			const originY = this.limbRoot.position.y - 3.986;
			const originZ = -0.016;

			const pos = this.sparkPositions;
			const vel = this.sparkVelocities;
			const count = pos.length / 3;

			for (let i = 0; i < count; i++) {
				pos[i * 3] += vel[i * 3] * dt;
				pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
				pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

				if (pos[i * 3 + 1] > originY + 0.55 || Math.random() < 0.08) {
					pos[i * 3] = originX + (Math.random() - 0.5) * 0.25;
					pos[i * 3 + 1] = originY + (Math.random() - 0.5) * 0.05;
					pos[i * 3 + 2] = originZ - Math.random() * 0.015;
					vel[i * 3] = (Math.random() - 0.5) * 1.5;
					vel[i * 3 + 1] = Math.random() * 1.6 + 0.35;
					vel[i * 3 + 2] = -Math.random() * 0.35 - 0.02;
				}
			}
			this.sparkSystem.geometry.attributes.position.needsUpdate = true;

			this.sparkLight.position.set(originX, originY, -0.035);
			this.sparkLight.intensity = 1.8 + Math.sin(this.elapsed * 45.0) * 1.2;

			if (Math.random() < 0.35) {
				ctx.shake(0.08);
			}
		} else {
			const leaveP = (progress - 0.78) / 0.22;
			const ease = Math.pow(leaveP, 1.8);

			(this.sparkSystem.material as THREE.PointsMaterial).opacity = Math.max(0, 1.0 - leaveP * 3.5);
			this.sparkLight.intensity = Math.max(0, this.sparkLight.intensity - dt * 7.0);

			this.limbRoot.position.z = -0.600 - ease * 4.5; 
			this.limbRoot.position.y = 2.9 + ease * 4.8;    
			this.limbRoot.position.x = Math.sin(leaveP * Math.PI) * 0.08;

			this.coxaArm.rotation.x = THREE.MathUtils.lerp(this.coxaArm.rotation.x, 0.28, Math.min(1.0, dt * 5.0));
			this.merusArm.rotation.x = THREE.MathUtils.lerp(this.merusArm.rotation.x, 0.22, Math.min(1.0, dt * 5.0));

			for (const t of this.clawTalons) {
				t.rotation.x = THREE.MathUtils.lerp(t.rotation.x, -0.05, Math.min(1.0, dt * 5.0));
			}
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.limbRoot.position.set(0.0, 6.2, -0.86);
		(this.sparkSystem.material as THREE.PointsMaterial).opacity = 0.0;
		this.sparkLight.intensity = 0.0;
	}
}
