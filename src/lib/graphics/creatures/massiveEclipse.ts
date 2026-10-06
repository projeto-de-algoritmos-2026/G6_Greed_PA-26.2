import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

function createWhaleSharkSkinTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;

	const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
	bgGrad.addColorStop(0, '#0a171d');
	bgGrad.addColorStop(0.35, '#12242c');
	bgGrad.addColorStop(0.7, '#1b323c');
	bgGrad.addColorStop(1, '#0e1c22');
	ctx.fillStyle = bgGrad;
	ctx.fillRect(0, 0, 1024, 512);

	ctx.strokeStyle = 'rgba(215, 235, 230, 0.12)';
	ctx.lineWidth = 14;
	for (let x = 60; x < 1024; x += 55) {
		ctx.beginPath();
		ctx.moveTo(x, 40);
		ctx.bezierCurveTo(x + 12, 180, x - 12, 340, x, 480);
		ctx.stroke();
	}

	ctx.lineWidth = 8;
	for (let y = 100; y <= 420; y += 75) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.bezierCurveTo(340, y + 10, 680, y - 10, 1024, y);
		ctx.stroke();
	}

	for (let i = 0; i < 750; i++) {
		const sx = Math.random() * 1024;
		const sy = 60 + Math.random() * 380;
		const r = 2.5 + Math.random() * 5.5;

		const spotGrad = ctx.createRadialGradient(sx, sy, 0.5, sx, sy, r);
		spotGrad.addColorStop(0, 'rgba(240, 252, 248, 0.85)');
		spotGrad.addColorStop(0.65, 'rgba(200, 230, 225, 0.55)');
		spotGrad.addColorStop(1, 'rgba(160, 200, 195, 0)');

		ctx.fillStyle = spotGrad;
		ctx.beginPath();
		ctx.arc(sx, sy, r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.strokeStyle = 'rgba(180, 210, 205, 0.35)';
	for (let s = 0; s < 24; s++) {
		const scx = 80 + Math.random() * 850;
		const scy = 100 + Math.random() * 300;
		const len = 30 + Math.random() * 70;
		const ang = (Math.random() - 0.5) * 0.8;

		ctx.lineWidth = 1.5 + Math.random() * 2.0;
		ctx.beginPath();
		ctx.moveTo(scx, scy);
		ctx.lineTo(scx + Math.cos(ang) * len, scy + Math.sin(ang) * len);
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

interface GillArch {
	flapMesh: THREE.Mesh;
	filamentsMesh: THREE.Mesh;
	baseRotY: number;
}

export class MassiveEclipseActor implements WindowEventActor {
	public readonly type = 'MASSIVE_ECLIPSE';
	public readonly tier = 2;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private behemothGroup: THREE.Group;
	private torsoMesh: THREE.Mesh;

	private headGroup: THREE.Group;
	private lowerJaw: THREE.Group;
	private sensoryPores: THREE.Mesh[] = [];

	private eyePivot: THREE.Group;
	private eyeBall: THREE.Mesh;
	private eyePointLight: THREE.PointLight;

	private gillArches: GillArch[] = [];

	private pectoralFin: THREE.Group;
	private dorsalFin: THREE.Mesh;
	private secondDorsalFin: THREE.Mesh;
	private caudalFin: THREE.Group;

	private barnacleColonies: THREE.Group;
	private marineSnow: THREE.Points;

	private elapsed: number = 0;
	private duration: number = 16.0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.behemothGroup = new THREE.Group();
		this.root.add(this.behemothGroup);

		const skinTex = createWhaleSharkSkinTexture();

		const skinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x1f343e,
			roughness: 0.58,
			metalness: 0.12,
			side: THREE.DoubleSide
		});

		const underbellyMat = new THREE.MeshStandardMaterial({
			color: 0x22363d,
			roughness: 0.65,
			metalness: 0.08
		});

		const mouthMat = new THREE.MeshStandardMaterial({
			color: 0x12080c,
			roughness: 0.75,
			metalness: 0.05
		});

		const gillVascularMat = new THREE.MeshStandardMaterial({
			color: 0x8b1828,
			roughness: 0.35,
			metalness: 0.15,
			emissive: 0x3d060e,
			emissiveIntensity: 0.4
		});

		const eyeMat = new THREE.MeshStandardMaterial({
			color: 0x060c0e,
			roughness: 0.08,
			metalness: 0.4,
			emissive: 0x081e1a,
			emissiveIntensity: 0.35
		});

		const numR = 40;
		const numS = 32;
		const vertices: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];

		const startX = 13.5;
		const endX = -15.5;
		const totalLength = startX - endX;

		const getBodyProfile = (x: number): { radZ: number; radY: number; centerY: number } => {
			if (x >= 11.5) {
				const t = (13.5 - x) / 2.0;
				return {
					radZ: THREE.MathUtils.lerp(2.3, 2.7, t),
					radY: THREE.MathUtils.lerp(0.75, 1.6, t),
					centerY: THREE.MathUtils.lerp(0.1, 0.0, t)
				};
			} else if (x >= 6.0) {
				const t = (11.5 - x) / 5.5;
				return {
					radZ: THREE.MathUtils.lerp(2.7, 3.0, t),
					radY: THREE.MathUtils.lerp(1.6, 2.3, t),
					centerY: 0.0
				};
			} else if (x >= 0.0) {
				const t = (6.0 - x) / 6.0;
				return {
					radZ: THREE.MathUtils.lerp(3.0, 2.8, t),
					radY: THREE.MathUtils.lerp(2.3, 2.2, t),
					centerY: 0.0
				};
			} else if (x >= -8.0) {
				const t = (0.0 - x) / 8.0;
				return {
					radZ: THREE.MathUtils.lerp(2.8, 1.8, t),
					radY: THREE.MathUtils.lerp(2.2, 1.6, t),
					centerY: THREE.MathUtils.lerp(0.0, 0.1, t)
				};
			} else if (x >= -13.0) {
				const t = (-8.0 - x) / 5.0;
				return {
					radZ: THREE.MathUtils.lerp(1.8, 0.8, t),
					radY: THREE.MathUtils.lerp(1.6, 1.1, t),
					centerY: THREE.MathUtils.lerp(0.1, 0.2, t)
				};
			} else {
				const t = Math.min(1.0, (-13.0 - x) / 2.5);
				return {
					radZ: THREE.MathUtils.lerp(0.8, 0.15, t),
					radY: THREE.MathUtils.lerp(1.1, 0.25, t),
					centerY: 0.2
				};
			}
		};

		for (let r = 0; r <= numR; r++) {
			const tr = r / numR;
			const x = startX - tr * totalLength;
			const profile = getBodyProfile(x);

			for (let s = 0; s <= numS; s++) {
				const theta = (s / numS) * Math.PI * 2;
				const cosT = Math.cos(theta); 
				const sinT = Math.sin(theta); 

				let y = profile.centerY + sinT * profile.radY;
				let z = cosT * profile.radZ;

				if (sinT < 0) {
					y *= 0.85;
				}

				if (x > -11.0 && x < 10.5 && cosT > 0.1) {
					const distR1 = Math.abs(theta - 0.45);
					if (distR1 < 0.2) {
						const bump = Math.cos((distR1 / 0.2) * Math.PI * 0.5) * 0.32;
						z += bump * cosT;
						y += bump * sinT;
					}

					const distR2 = Math.abs(theta);
					if (distR2 < 0.18) {
						const bump = Math.cos((distR2 / 0.18) * Math.PI * 0.5) * 0.3;
						z += bump * cosT;
					}

					const distR3 = Math.abs(theta - (Math.PI * 2 - 0.45));
					if (distR3 < 0.2) {
						const bump = Math.cos((distR3 / 0.2) * Math.PI * 0.5) * 0.32;
						z += bump * cosT;
						y += bump * sinT;
					}
				}

				if (sinT > 0.72) {
					const dorsalP = (sinT - 0.72) / 0.28;
					let keelSpine = Math.pow(dorsalP, 2.0) * 0.65;
					if (x > -2.0 && x < 3.0) {
						keelSpine += Math.sin(((x + 2.0) / 5.0) * Math.PI) * 0.5;
					}
					y += keelSpine;
				}

				if (sinT < -0.35 && x > 2.0 && x < 9.5) {
					const pleatWave = Math.sin(theta * 28.0) * 0.16;
					y += pleatWave * sinT;
					z += pleatWave * cosT;
				}

				vertices.push(x, y, z);
				uvs.push((1.0 - tr) * 4.0, s / numS);
			}
		}

		for (let r = 0; r < numR; r++) {
			for (let s = 0; s < numS; s++) {
				const a = r * (numS + 1) + s;
				const b = (r + 1) * (numS + 1) + s;
				const c = (r + 1) * (numS + 1) + (s + 1);
				const d = r * (numS + 1) + (s + 1);

				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		const torsoGeo = new THREE.BufferGeometry();
		torsoGeo.setIndex(indices);
		torsoGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		torsoGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
		torsoGeo.computeVertexNormals();

		this.torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
		this.behemothGroup.add(this.torsoMesh);

		this.headGroup = new THREE.Group();
		this.headGroup.position.set(11.5, 0, 0);
		this.behemothGroup.add(this.headGroup);

		const uLipShape = new THREE.TorusGeometry(2.35, 0.22, 12, 32, Math.PI * 0.9);
		uLipShape.rotateX(Math.PI / 2);
		uLipShape.rotateZ(-Math.PI * 0.45);
		uLipShape.scale(0.85, 1.0, 1.05);
		const uLipMesh = new THREE.Mesh(uLipShape, skinMat);
		uLipMesh.position.set(1.5, 0.25, 0);
		this.headGroup.add(uLipMesh);

		const throatGeo = new THREE.CylinderGeometry(1.2, 1.9, 2.6, 20, 2, true);
		throatGeo.rotateZ(Math.PI / 2);
		throatGeo.scale(0.7, 0.45, 1.15);
		const throatMesh = new THREE.Mesh(throatGeo, mouthMat);
		throatMesh.position.set(0.6, 0.05, 0.0);
		this.headGroup.add(throatMesh);

		this.lowerJaw = new THREE.Group();
		this.lowerJaw.position.set(0.2, -0.2, 0);
		this.headGroup.add(this.lowerJaw);

		const lJawShape = new THREE.TorusGeometry(2.25, 0.22, 12, 32, Math.PI * 0.88);
		lJawShape.rotateX(Math.PI / 2);
		lJawShape.rotateZ(-Math.PI * 0.44);
		lJawShape.scale(0.82, 1.0, 1.02);
		const lJawMesh = new THREE.Mesh(lJawShape, underbellyMat);
		lJawMesh.position.set(1.3, -0.12, 0);
		this.lowerJaw.add(lJawMesh);

		const lChinGeo = new THREE.SphereGeometry(2.3, 24, 12, 0, Math.PI, 0, Math.PI * 0.4);
		lChinGeo.rotateZ(-Math.PI / 2);
		lChinGeo.scale(1.15, -0.3, 0.95);
		const lChin = new THREE.Mesh(lChinGeo, underbellyMat);
		lChin.position.set(0.3, -0.25, 0);
		this.lowerJaw.add(lChin);

		const barbelGeo = new THREE.ConeGeometry(0.07, 0.55, 8);
		barbelGeo.rotateZ(-Math.PI / 2.6);

		const rightBarbel = new THREE.Mesh(barbelGeo, skinMat);
		rightBarbel.position.set(1.9, 0.35, 1.2);
		this.headGroup.add(rightBarbel);

		const leftBarbel = new THREE.Mesh(barbelGeo, skinMat);
		leftBarbel.position.set(1.9, 0.35, -1.2);
		this.headGroup.add(leftBarbel);

		const poreGeo = new THREE.SphereGeometry(0.045, 6, 6);
		const poreMat = new THREE.MeshStandardMaterial({
			color: 0x24ffd8,
			emissive: 0x00f0c0,
			emissiveIntensity: 1.6
		});

		for (let p = 0; p < 24; p++) {
			const ang = -Math.PI * 0.4 + (p / 23) * Math.PI * 0.8;
			const px = 1.2 + Math.cos(ang) * 1.0;
			const pz = Math.sin(ang) * 2.3;
			const py = 0.28 + Math.sin(p * 0.8) * 0.12;
			const pMesh = new THREE.Mesh(poreGeo, poreMat);
			pMesh.position.set(px, py, pz);
			this.sensoryPores.push(pMesh);
			this.headGroup.add(pMesh);
		}

		this.eyePivot = new THREE.Group();
		this.eyePivot.position.set(-0.2, 0.4, 2.55);
		this.headGroup.add(this.eyePivot);

		const browGeo = new THREE.TorusGeometry(0.48, 0.13, 10, 18);
		browGeo.rotateY(Math.PI / 2);
		const brow = new THREE.Mesh(browGeo, skinMat);
		this.eyePivot.add(brow);

		const eyeGeo = new THREE.SphereGeometry(0.38, 20, 16);
		this.eyeBall = new THREE.Mesh(eyeGeo, eyeMat);
		this.eyePivot.add(this.eyeBall);

		this.eyePointLight = new THREE.PointLight(0x00ffd0, 1.8, 4.5, 1.8);
		this.eyePointLight.position.set(0, 0, 0.35);
		this.eyePivot.add(this.eyePointLight);

		const gillXPositions = [9.2, 8.1, 7.0, 5.9, 4.8];
		for (let g = 0; g < gillXPositions.length; g++) {
			const gx = gillXPositions[g];
			const prof = getBodyProfile(gx);
			const gHeight = prof.radY * 1.35;
			const gz = prof.radZ;

			const filGeo = new THREE.PlaneGeometry(0.24, gHeight * 0.85, 1, 6);
			const filamentsMesh = new THREE.Mesh(filGeo, gillVascularMat);
			filamentsMesh.position.set(gx, 0.1, gz - 0.04);
			filamentsMesh.rotation.y = Math.PI / 2 + 0.25;
			this.behemothGroup.add(filamentsMesh);

			const flapGeo = new THREE.BoxGeometry(0.24, gHeight, 0.12);
			const flapMesh = new THREE.Mesh(flapGeo, skinMat);
			flapMesh.position.set(gx + 0.1, 0.1, gz + 0.04);
			const baseRotY = Math.PI / 2 + 0.2 + g * 0.04;
			flapMesh.rotation.y = baseRotY;
			this.behemothGroup.add(flapMesh);

			this.gillArches.push({ flapMesh, filamentsMesh, baseRotY });
		}

		this.pectoralFin = new THREE.Group();
		this.pectoralFin.position.set(3.6, -0.9, 2.4);
		this.behemothGroup.add(this.pectoralFin);

		const finRootGeo = new THREE.CylinderGeometry(0.5, 0.8, 1.4, 10);
		finRootGeo.rotateZ(Math.PI / 3.2);
		const finRoot = new THREE.Mesh(finRootGeo, skinMat);
		this.pectoralFin.add(finRoot);

		const finBladeShape = new THREE.Shape();
		finBladeShape.moveTo(0, 0);
		finBladeShape.bezierCurveTo(-2.0, -0.8, -4.2, -1.8, -5.6, -3.2);
		finBladeShape.bezierCurveTo(-4.2, -3.4, -2.0, -2.1, 0, -1.2);
		finBladeShape.closePath();

		const finBladeGeo = new THREE.ShapeGeometry(finBladeShape, 16);
		const finBlade = new THREE.Mesh(finBladeGeo, skinMat);
		finBlade.position.set(0.0, -0.3, 0.2);
		finBlade.rotation.y = -0.22;
		finBlade.rotation.x = -0.32;
		this.pectoralFin.add(finBlade);

		const dFinShape = new THREE.Shape();
		dFinShape.moveTo(0, 0);
		dFinShape.bezierCurveTo(1.2, 2.2, 1.8, 3.5, 2.2, 4.0);
		dFinShape.bezierCurveTo(1.8, 3.2, 0.5, 1.5, -1.2, 0);
		dFinShape.closePath();

		const dFinGeo = new THREE.ShapeGeometry(dFinShape, 14);

		this.dorsalFin = new THREE.Mesh(dFinGeo, skinMat);
		this.dorsalFin.position.set(-1.5, 2.1, 0.0);
		this.dorsalFin.rotation.y = Math.PI / 2;
		this.dorsalFin.rotation.z = -0.12;
		this.behemothGroup.add(this.dorsalFin);

		this.secondDorsalFin = new THREE.Mesh(dFinGeo, skinMat);
		this.secondDorsalFin.position.set(-7.5, 1.6, 0.0);
		this.secondDorsalFin.rotation.y = Math.PI / 2;
		this.secondDorsalFin.rotation.z = -0.15;
		this.secondDorsalFin.scale.setScalar(0.48);
		this.behemothGroup.add(this.secondDorsalFin);

		this.caudalFin = new THREE.Group();
		this.caudalFin.position.set(-15.4, 0.2, 0.0);
		this.behemothGroup.add(this.caudalFin);

		const caudalShape = new THREE.Shape();
		caudalShape.moveTo(0, 0);
		caudalShape.bezierCurveTo(-1.8, 2.8, -3.2, 5.8, -4.4, 7.8);
		caudalShape.bezierCurveTo(-3.2, 5.0, -1.8, 2.2, -1.0, 0.4);
		caudalShape.bezierCurveTo(-1.8, -1.6, -3.0, -3.6, -3.8, -5.2);
		caudalShape.bezierCurveTo(-2.6, -3.6, -1.4, -1.8, 0, 0);
		caudalShape.closePath();

		const caudalGeo = new THREE.ShapeGeometry(caudalShape, 20);
		const caudalMesh = new THREE.Mesh(caudalGeo, skinMat);
		caudalMesh.rotation.y = Math.PI / 2;
		this.caudalFin.add(caudalMesh);

		this.barnacleColonies = new THREE.Group();
		this.behemothGroup.add(this.barnacleColonies);

		const barnacleMat = new THREE.MeshStandardMaterial({
			color: 0x485854,
			roughness: 0.9,
			metalness: 0.05
		});

		for (let b = 0; b < 45; b++) {
			const bx = -10.0 + Math.random() * 20.0;
			const prof = getBodyProfile(bx);
			const by = -prof.radY * 0.6 + Math.random() * (prof.radY * 1.2);
			const bz = prof.radZ * 0.88 + Math.random() * 0.2;

			const bGeo = new THREE.ConeGeometry(0.16 + Math.random() * 0.2, 0.32, 6);
			bGeo.rotateX(Math.PI / 2);
			const bMesh = new THREE.Mesh(bGeo, barnacleMat);
			bMesh.position.set(bx, by, bz);
			this.barnacleColonies.add(bMesh);
		}

		const snowCount = 160;
		const snowGeo = new THREE.BufferGeometry();
		const snowPos = new Float32Array(snowCount * 3);
		for (let i = 0; i < snowCount; i++) {
			snowPos[i * 3] = (Math.random() - 0.5) * 36.0;
			snowPos[i * 3 + 1] = (Math.random() - 0.5) * 14.0;
			snowPos[i * 3 + 2] = 2.0 - Math.random() * 5.0;
		}
		snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
		this.marineSnow = new THREE.Points(
			snowGeo,
			new THREE.PointsMaterial({
				color: 0x608078,
				size: 0.22,
				transparent: true,
				opacity: 0.35,
				depthWrite: false
			})
		);
		this.behemothGroup.add(this.marineSnow);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 16.0;
		this.root.visible = true;

		this.behemothGroup.position.set(-22.0, 0.0, -8.5);
		this.behemothGroup.rotation.set(0, 0, 0);

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playDeepWaterSurge(0.9, pan);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		if (progress < 0.35) {
			const p = progress / 0.35;
			const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

			this.behemothGroup.position.x = -22.0 + ease * 14.0;
			this.behemothGroup.position.y = Math.sin(this.elapsed * 0.4) * 0.22;
			this.behemothGroup.position.z = -11.5 + ease * 3.0;

			this.behemothGroup.rotation.y = -0.10 + ease * 0.10;
			this.behemothGroup.rotation.z = Math.sin(this.elapsed * 0.5) * 0.015;
		} else if (progress <= 0.75) {
			const glideP = (progress - 0.35) / 0.4;

			this.behemothGroup.position.x = -8.0 + glideP * 16.0;
			this.behemothGroup.position.y = Math.sin(this.elapsed * 0.35) * 0.22;
			this.behemothGroup.position.z = -8.5 + Math.sin(this.elapsed * 0.35) * 0.15;

			this.behemothGroup.rotation.y = Math.sin(this.elapsed * 0.6) * 0.015;
			this.behemothGroup.rotation.z = Math.sin(this.elapsed * 0.4) * 0.015;
		} else {
			const diveP = (progress - 0.75) / 0.25;
			const easeOut = diveP * diveP;

			this.behemothGroup.position.x = 8.0 + easeOut * 16.0;
			this.behemothGroup.position.y = -easeOut * 3.5;
			this.behemothGroup.position.z = -8.5 - easeOut * 6.5;

			this.behemothGroup.rotation.y = easeOut * 0.15;
			this.behemothGroup.rotation.x = easeOut * -0.12;
		}

		const breathCycle = Math.sin(this.elapsed * 1.4);
		const gillFlare = Math.max(0, breathCycle) * 0.35;
		for (let i = 0; i < this.gillArches.length; i++) {
			const g = this.gillArches[i];
			g.flapMesh.rotation.y = g.baseRotY + gillFlare;
			g.filamentsMesh.scale.z = 1.0 + gillFlare * 0.6;
		}

		const mouthGape = Math.sin(this.elapsed * 1.3) * 0.18;
		this.lowerJaw.rotation.z = -Math.max(0, mouthGape * 0.32);

		this.pectoralFin.rotation.z = Math.sin(this.elapsed * 1.0) * 0.08;
		this.pectoralFin.rotation.y = Math.cos(this.elapsed * 0.8) * 0.06;

		this.caudalFin.rotation.y = Math.PI / 2 + Math.sin(this.elapsed * 1.1) * 0.25;

		this.eyeBall.rotation.y = Math.sin(this.elapsed * 0.6) * 0.08;
		this.eyeBall.rotation.x = Math.cos(this.elapsed * 0.45) * 0.05;

		const poreGlow = 1.2 + Math.sin(this.elapsed * 2.8) * 0.45;
		for (let p = 0; p < this.sensoryPores.length; p++) {
			(this.sensoryPores[p].material as THREE.MeshStandardMaterial).emissiveIntensity = poreGlow;
		}

		if (progress > 0.15 && progress < 0.85) {
			const eclipsePhase = (progress - 0.15) / 0.7;
			const eclipseCurve = Math.sin(eclipsePhase * Math.PI);
			const lightLevel = Math.max(0.03, 1.0 - eclipseCurve * 0.97);
			ctx.lights.setLevel('hatch', lightLevel);

			if (Math.random() < 0.25) {
				ctx.shake(0.075 * eclipseCurve);
			}
		} else {
			ctx.lights.setLevel('hatch', 1.0);
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.behemothGroup.position.set(-22.0, 0.0, -8.5);
	}
}
