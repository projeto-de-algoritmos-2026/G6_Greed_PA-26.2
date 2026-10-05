import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import {
	createGlazedEyeTexture,
	createMawFleshTexture
} from '../textures/procedural';

function createGiantSquidEyeTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 1024;
	const ctx = canvas.getContext('2d')!;

	const cx = 512;
	const cy = 512;

	const scleraGrad = ctx.createRadialGradient(cx, cy, 180, cx, cy, 512);
	scleraGrad.addColorStop(0, '#faf6ef');
	scleraGrad.addColorStop(0.55, '#dfd7ca');
	scleraGrad.addColorStop(0.82, '#918b80');
	scleraGrad.addColorStop(1, '#2c2b29');
	ctx.fillStyle = scleraGrad;
	ctx.fillRect(0, 0, 1024, 1024);

	const limbusGrad = ctx.createRadialGradient(cx, cy, 280, cx, cy, 345);
	limbusGrad.addColorStop(0, 'rgba(10, 16, 14, 0)');
	limbusGrad.addColorStop(0.68, 'rgba(10, 16, 14, 0.88)');
	limbusGrad.addColorStop(1, '#040807');
	ctx.fillStyle = limbusGrad;
	ctx.beginPath();
	ctx.arc(cx, cy, 345, 0, Math.PI * 2);
	ctx.fill();

	const irisR = 310;
	const irisGrad = ctx.createRadialGradient(cx, cy, 150, cx, cy, irisR);
	irisGrad.addColorStop(0, '#0c4436');
	irisGrad.addColorStop(0.30, '#c88815');
	irisGrad.addColorStop(0.72, '#efa825');
	irisGrad.addColorStop(0.90, '#7c4c0a');
	irisGrad.addColorStop(1, '#180e03');
	ctx.fillStyle = irisGrad;
	ctx.beginPath();
	ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
	ctx.fill();

	const numStriae = 260;
	for (let s = 0; s < numStriae; s++) {
		const ang = (s / numStriae) * Math.PI * 2;
		ctx.beginPath();
		ctx.moveTo(cx + Math.cos(ang) * 175, cy + Math.sin(ang) * 175);
		ctx.lineTo(cx + Math.cos(ang) * 306, cy + Math.sin(ang) * 306);
		ctx.strokeStyle = s % 2 === 0 ? 'rgba(255, 235, 150, 0.65)' : 'rgba(30, 65, 55, 0.65)';
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}

	ctx.beginPath();
	ctx.arc(cx, cy, 205, 0, Math.PI * 2);
	ctx.fillStyle = '#000000';
	ctx.fill();

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

function createSquidMantleTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#1c0a14';
	ctx.fillRect(0, 0, 512, 512);

	for (let m = 0; m < 60; m++) {
		const mx = Math.random() * 512;
		const my = Math.random() * 512;
		const mr = 25 + Math.random() * 80;
		const grad = ctx.createRadialGradient(mx, my, 4, mx, my, mr);
		grad.addColorStop(0, 'rgba(56, 18, 38, 0.45)');
		grad.addColorStop(0.6, 'rgba(28, 8, 18, 0.2)');
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(mx, my, mr, 0, Math.PI * 2);
		ctx.fill();
	}

	for (let c = 0; c < 450; c++) {
		const cx = Math.random() * 512;
		const cy = Math.random() * 512;
		const cr = 1.2 + Math.random() * 3.5;
		const cGrad = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, cr);
		cGrad.addColorStop(0, '#0a0206');
		cGrad.addColorStop(0.6, '#4e1428');
		cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = cGrad;
		ctx.beginPath();
		ctx.arc(cx, cy, cr, 0, Math.PI * 2);
		ctx.fill();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

interface ArmData {
	root: THREE.Group;
	segments: THREE.Mesh[];
	phaseOffset: number;
}

export class ColossalEyeActor implements WindowEventActor {
	public readonly type = 'COLOSSAL_EYE';
	public readonly tier = 2 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private squidGroup: THREE.Group;
	private headGroup: THREE.Group;
	private eyeballPivot: THREE.Group;

	private scleraMesh: THREE.Mesh;
	private pupilPivot: THREE.Group;
	private pupilMesh: THREE.Mesh;
	private nictitatingMembrane: THREE.Mesh;
	private nicMat: THREE.MeshStandardMaterial;
	private eyePointLight: THREE.PointLight;

	private mantleMesh: THREE.Mesh;
	private mantleBasePositions: Float32Array;
	private mantleRingCount: number = 32;
	private mantleRadialCount: number = 24;
	private upperMantleFin: THREE.Mesh;
	private lowerMantleFin: THREE.Mesh;

	private siphonMesh: THREE.Mesh;

	private arms: ArmData[] = [];
	private photophoreMeshes: THREE.Mesh[] = [];

	private elapsed: number = 0;
	private duration: number = 14.0;
	private opening: 'hatch' = 'hatch';
	private lastPosX: number = -9.5;

	private targetGazeYaw: number = 0;
	private targetGazePitch: number = 0;
	private targetGazeRoll: number = 0;
	private targetPupilScale: number = 1.0;

	private stareAudioTriggered: boolean = false;
	private leaveAudioTriggered: boolean = false;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.squidGroup = new THREE.Group();
		this.root.add(this.squidGroup);

		this.headGroup = new THREE.Group();
		this.squidGroup.add(this.headGroup);

		const squidSkinTex = createSquidMantleTexture();
		const eyeTex = createGiantSquidEyeTexture();
		const fleshTex = createMawFleshTexture();

		const mantleSkinMat = new THREE.MeshStandardMaterial({
			map: squidSkinTex,
			color: 0x220c18,
			roughness: 0.58,
			metalness: 0.16,
			side: THREE.FrontSide
		});

		const giantEyeMat = new THREE.MeshPhysicalMaterial({
			map: eyeTex,
			roughness: 0.08,
			metalness: 0.02,
			clearcoat: 1.0,
			clearcoatRoughness: 0.03,
			emissive: 0x101a16,
			emissiveIntensity: 0.32
		});

		const pupilMat = new THREE.MeshBasicMaterial({
			color: 0x000000
		});

		const suckerMat = new THREE.MeshStandardMaterial({
			map: fleshTex,
			color: 0xd8c8b8,
			roughness: 0.35,
			metalness: 0.12
		});

		const photophoreMat = new THREE.MeshBasicMaterial({
			color: 0x38f0c2
		});

		const headGeo = new THREE.SphereGeometry(1.45, 32, 24);
		const hPos = headGeo.attributes.position as THREE.BufferAttribute;

		for (let i = 0; i < hPos.count; i++) {
			let x = hPos.getX(i);
			let y = hPos.getY(i);
			let z = hPos.getZ(i);

			z -= 1.45;

			const r = Math.sqrt(x * x + y * y);

			if (r < 0.85 && z > -1.50) {
				const socketDepth = 1.0 - r / 0.85;
				z -= socketDepth * 0.42;
			}

			if (r >= 0.72 && r <= 0.92 && z > -1.55) {
				const fold = Math.sin((r - 0.72) / 0.20 * Math.PI) * 0.08;
				z += fold;
			}

			z -= (x * x * 0.28 + y * y * 0.20);

			if (z > -0.16) {
				z = -0.16;
			}

			hPos.setXYZ(i, x, y, z);
		}
		headGeo.computeVertexNormals();

		const headMesh = new THREE.Mesh(headGeo, mantleSkinMat);
		this.headGroup.add(headMesh);

		const siphonGeo = new THREE.CylinderGeometry(0.24, 0.42, 0.9, 16, 2, true);
		siphonGeo.rotateZ(Math.PI / 2.3);
		siphonGeo.scale(1.0, 0.8, 1.2);
		this.siphonMesh = new THREE.Mesh(siphonGeo, mantleSkinMat);
		this.siphonMesh.position.set(-0.3, -1.05, -0.95);
		this.headGroup.add(this.siphonMesh);

		const eyeRadius = 0.65;
		this.eyeballPivot = new THREE.Group();
		this.eyeballPivot.position.set(0, 0, -0.70);
		this.headGroup.add(this.eyeballPivot);

		const eyeGeo = new THREE.SphereGeometry(eyeRadius, 64, 48);
		const eyePosAttr = eyeGeo.attributes.position as THREE.BufferAttribute;
		const eyeUvAttr = eyeGeo.attributes.uv as THREE.BufferAttribute;

		for (let i = 0; i < eyePosAttr.count; i++) {
			const vx = eyePosAttr.getX(i);
			const vy = eyePosAttr.getY(i);

			const u = 0.5 + vx / (2.12 * eyeRadius);
			const v = 0.5 - vy / (2.12 * eyeRadius);
			eyeUvAttr.setXY(i, u, v);
		}
		eyeUvAttr.needsUpdate = true;

		this.scleraMesh = new THREE.Mesh(eyeGeo, giantEyeMat);
		this.eyeballPivot.add(this.scleraMesh);

		this.pupilPivot = new THREE.Group();
		this.pupilPivot.position.set(0, 0, 0);

		const pupilGeo = new THREE.SphereGeometry(eyeRadius + 0.003, 48, 16, 0, Math.PI * 2, 0, 0.40);
		this.pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
		this.pupilMesh.rotation.x = -Math.PI / 2;
		this.pupilPivot.add(this.pupilMesh);
		this.eyeballPivot.add(this.pupilPivot);

		const nicGeo = new THREE.SphereGeometry(eyeRadius + 0.015, 36, 18, 0, Math.PI * 0.95, 0, 0.52);
		this.nicMat = new THREE.MeshStandardMaterial({
			color: 0x162422,
			transparent: true,
			opacity: 0.0,
			roughness: 0.35,
			side: THREE.DoubleSide,
			depthWrite: false
		});
		this.nictitatingMembrane = new THREE.Mesh(nicGeo, this.nicMat);
		this.nictitatingMembrane.rotation.x = -Math.PI / 2;
		this.nictitatingMembrane.rotation.y = -Math.PI * 0.65;
		this.eyeballPivot.add(this.nictitatingMembrane);

		this.eyePointLight = new THREE.PointLight(0xa0eeff, 3.2, 5.0);
		this.eyePointLight.position.set(0.0, 0.85, -0.35);
		this.headGroup.add(this.eyePointLight);

		const numR = this.mantleRingCount;
		const numS = this.mantleRadialCount;

		const mantleVertices: number[] = [];
		const mantleUvs: number[] = [];
		const mantleIndices: number[] = [];

		for (let r = 0; r <= numR; r++) {
			const t = r / numR;

			const posX = -0.65 - t * 7.8;
			const posZ = -0.80 - t * 2.5 - Math.sin(t * Math.PI) * 0.45;
			const posY = -0.05 - t * 0.22;

			let radius: number;
			if (t < 0.20) {
				const p = t / 0.20;
				radius = 1.38 + Math.sin(p * Math.PI * 0.5) * 0.18;
			} else {
				const p = (t - 0.20) / 0.80;
				radius = THREE.MathUtils.lerp(1.56, 0.08, Math.pow(p, 1.2));
			}

			for (let s = 0; s <= numS; s++) {
				const theta = (s / numS) * Math.PI * 2;
				const cosT = Math.cos(theta);
				const sinT = Math.sin(theta);

				const rx = cosT * radius * 0.95;
				const ry = sinT * radius * 1.05;

				mantleVertices.push(posX + rx, posY + ry, posZ);
				mantleUvs.push(s / numS, t * 4.0);
			}
		}

		for (let r = 0; r < numR; r++) {
			for (let s = 0; s < numS; s++) {
				const a = r * (numS + 1) + s;
				const b = (r + 1) * (numS + 1) + s;
				const c = (r + 1) * (numS + 1) + (s + 1);
				const d = r * (numS + 1) + (s + 1);

				mantleIndices.push(a, b, d);
				mantleIndices.push(b, c, d);
			}
		}

		const mantleGeo = new THREE.BufferGeometry();
		mantleGeo.setIndex(mantleIndices);
		mantleGeo.setAttribute('position', new THREE.Float32BufferAttribute(mantleVertices, 3));
		mantleGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mantleUvs, 2));
		mantleGeo.computeVertexNormals();

		this.mantleBasePositions = new Float32Array(mantleVertices);
		this.mantleMesh = new THREE.Mesh(mantleGeo, mantleSkinMat);
		this.squidGroup.add(this.mantleMesh);

		const finShape = new THREE.Shape();
		finShape.moveTo(0, 0);
		finShape.bezierCurveTo(1.5, 0.8, 3.2, 0.4, 4.0, 0);
		finShape.bezierCurveTo(3.2, -0.4, 1.5, -0.8, 0, 0);
		finShape.closePath();

		const finGeo = new THREE.ShapeGeometry(finShape, 16);

		this.upperMantleFin = new THREE.Mesh(finGeo, mantleSkinMat);
		this.upperMantleFin.position.set(-4.2, 0.85, -2.1);
		this.upperMantleFin.rotation.set(-0.3, 0.1, 0.05);
		this.squidGroup.add(this.upperMantleFin);

		this.lowerMantleFin = new THREE.Mesh(finGeo, mantleSkinMat);
		this.lowerMantleFin.position.set(-4.2, -0.85, -2.1);
		this.lowerMantleFin.rotation.set(0.3, 0.1, -0.05);
		this.squidGroup.add(this.lowerMantleFin);

		const armRoots = [
			{ pos: new THREE.Vector3(0.18, -0.75, -0.65), len: 3.2, isLong: false },
			{ pos: new THREE.Vector3(-0.15, -0.85, -0.75), len: 3.6, isLong: false },
			{ pos: new THREE.Vector3(-0.48, -0.80, -0.85), len: 3.0, isLong: false },
			{ pos: new THREE.Vector3(0.05, -0.95, -0.80), len: 4.8, isLong: true },
			{ pos: new THREE.Vector3(-0.35, -1.02, -0.90), len: 4.6, isLong: true }
		];

		const suckerGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.02, 10);
		suckerGeo.rotateX(Math.PI / 2);

		armRoots.forEach((aCfg, aIdx) => {
			const aGroup = new THREE.Group();
			aGroup.position.copy(aCfg.pos);

			const segments: THREE.Mesh[] = [];
			let parentJoint: THREE.Object3D = aGroup;
			const segCount = aCfg.isLong ? 6 : 4;
			const segLen = aCfg.len / segCount;

			for (let s = 0; s < segCount; s++) {
				const rTop = 0.09 - s * (0.06 / segCount);
				const rBot = 0.08 - (s + 1) * (0.06 / segCount);
				const sGeo = new THREE.CylinderGeometry(rTop, rBot, segLen, 10);
				sGeo.translate(0, -segLen / 2, 0);

				const segMesh = new THREE.Mesh(sGeo, mantleSkinMat);
				segMesh.position.set(0, s === 0 ? 0 : -segLen, 0);
				parentJoint.add(segMesh);
				segments.push(segMesh);

				for (let v = 0; v < 2; v++) {
					const sucker = new THREE.Mesh(suckerGeo, suckerMat);
					sucker.position.set(0, -segLen * 0.35 - v * (segLen * 0.4), rTop + 0.015);
					segMesh.add(sucker);
				}

				parentJoint = segMesh;
			}

			this.arms.push({ root: aGroup, segments, phaseOffset: aIdx * 0.75 });
			this.headGroup.add(aGroup);
		});

		const bNodeGeo = new THREE.SphereGeometry(0.035, 8, 8);
		for (let n = 0; n < 22; n++) {
			const pX = -1.0 - n * 0.34;
			const pY = 0.15 + Math.sin(n * 0.5) * 0.18;
			const pZ = -0.85 - n * 0.16;

			const node = new THREE.Mesh(bNodeGeo, photophoreMat);
			node.position.set(pX, pY, pZ);
			this.photophoreMeshes.push(node);
			this.squidGroup.add(node);
		}
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 14.0;
		this.opening = opts.opening;
		this.root.visible = true;

		this.root.position.set(-9.5, 0.06, -5.0);
		this.squidGroup.rotation.set(0, -0.12, 0);
		this.lastPosX = -9.5;

		this.eyeballPivot.rotation.set(0, 0.35, 0);
		this.targetGazeYaw = 0.35;
		this.targetGazePitch = 0.0;
		this.targetGazeRoll = 0.0;
		this.targetPupilScale = 1.0;
		this.pupilPivot.scale.set(1.0, 1.0, 1.0);

		this.nicMat.opacity = 0.0;
		this.nictitatingMembrane.rotation.y = -Math.PI * 0.65;

		this.stareAudioTriggered = false;
		this.leaveAudioTriggered = false;

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playColossalEyePulse(pan);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		const pan = ctx.pan(this.opening);

		const breath = Math.sin(this.elapsed * 1.8);
		this.siphonMesh.scale.set(1.0 + breath * 0.18, 1.0 + breath * 0.12, 1.0 - breath * 0.1);

		const glowPulse = 0.8 + Math.sin(this.elapsed * 2.5) * 0.25;
		for (let i = 0; i < this.photophoreMeshes.length; i++) {
			this.photophoreMeshes[i].scale.setScalar(glowPulse);
		}

		const lateralSpeed = (this.root.position.x - this.lastPosX) / Math.max(0.001, dt);
		this.lastPosX = this.root.position.x;

		const mantleGeo = this.mantleMesh.geometry;
		const mantlePosAttr = mantleGeo.attributes.position as THREE.BufferAttribute;
		const numR = this.mantleRingCount;
		const numS = this.mantleRadialCount;
		const swimFreq = 1.8;

		for (let r = 0; r <= numR; r++) {
			const t = r / numR;
			const phase = this.elapsed * swimFreq - t * 4.2;

			const waveZ = Math.sin(phase) * (0.04 + t * 0.38);
			const waveY = Math.cos(phase * 0.75) * (0.03 * t);
			const dragX = -lateralSpeed * 0.12 * t;

			for (let s = 0; s <= numS; s++) {
				const idx = (r * (numS + 1) + s) * 3;
				const baseX = this.mantleBasePositions[idx];
				const baseY = this.mantleBasePositions[idx + 1];
				const baseZ = this.mantleBasePositions[idx + 2];

				mantlePosAttr.setXYZ(
					r * (numS + 1) + s,
					baseX + dragX,
					baseY + waveY,
					baseZ + waveZ
				);
			}
		}
		mantlePosAttr.needsUpdate = true;
		mantleGeo.computeVertexNormals();

		const finWave = Math.sin(this.elapsed * 2.2) * 0.22;
		this.upperMantleFin.rotation.z = finWave;
		this.lowerMantleFin.rotation.z = -finWave;

		for (let a = 0; a < this.arms.length; a++) {
			const arm = this.arms[a];
			for (let s = 0; s < arm.segments.length; s++) {
				const seg = arm.segments[s];
				const aPhase = this.elapsed * 1.8 + arm.phaseOffset + s * 0.55;
				const curlZ = Math.sin(aPhase) * (0.08 + s * 0.04) - lateralSpeed * 0.14 * (s + 1);
				const curlX = Math.cos(aPhase * 0.85) * (0.06 + s * 0.03);

				seg.rotation.z = curlZ;
				seg.rotation.x = curlX;
			}
		}

		if (progress < 0.30) {

			const p = progress / 0.30;
			const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

			this.root.position.x = -9.5 + ease * 9.80;
			this.root.position.y = 0.06 + Math.sin(this.elapsed * 1.1) * 0.04;
			this.root.position.z = -5.0 + ease * 4.50;

			this.squidGroup.rotation.y = -0.12 + (1 - ease) * 0.10;
			this.squidGroup.rotation.z = Math.sin(this.elapsed * 1.3) * 0.025;

			if (p < 0.65) {
				this.targetGazeYaw = 0.30;
				this.targetGazePitch = 0.0;
			} else {
				const turnP = (p - 0.65) / 0.35;
				this.targetGazeYaw = 0.30 - turnP * 0.12;
				this.targetGazePitch = -0.03;
			}
			this.targetPupilScale = 1.0;
		} else if (progress <= 0.72) {

			const obsP = (progress - 0.30) / 0.42;

			this.root.position.x = 0.30 + Math.sin(this.elapsed * 0.50) * 0.035;
			this.root.position.y = 0.06 + Math.cos(this.elapsed * 0.60) * 0.025;
			this.root.position.z = -0.50 + Math.sin(this.elapsed * 0.40) * 0.015;

			this.squidGroup.rotation.y = -0.02 + Math.sin(this.elapsed * 0.7) * 0.02;
			this.squidGroup.rotation.x = Math.sin(this.elapsed * 0.8) * 0.015;
			this.squidGroup.rotation.z = Math.sin(this.elapsed * 0.6) * 0.015;

			if (obsP < 0.25) {

				const scanP = obsP / 0.25;
				this.targetGazeYaw = THREE.MathUtils.lerp(0.24, -0.10, scanP);
				this.targetGazePitch = -0.04 + Math.sin(scanP * Math.PI) * 0.03;
				this.targetGazeRoll = 0.0;
				this.targetPupilScale = 0.95;
			} else if (obsP < 0.28) {

				this.targetGazeYaw = 0.0;
				this.targetGazePitch = 0.0;
				this.targetGazeRoll = 0.0;
				this.targetPupilScale = 1.05;
			} else if (obsP < 0.60) {

				const dilateP = (obsP - 0.28) / 0.32;
				const d = Math.sin(dilateP * Math.PI);

				this.targetPupilScale = 1.05 + d * 0.30;

				this.targetGazeYaw = (Math.random() - 0.5) * 0.008;
				this.targetGazePitch = (Math.random() - 0.5) * 0.008;
				this.targetGazeRoll = 0.0;

				if (!this.stareAudioTriggered && obsP > 0.38) {
					this.stareAudioTriggered = true;
					ctx.audio?.playDeepWaterSurge(0.65, pan);
					ctx.shake(0.035);
					ctx.lights.flicker(this.opening, 0.6);
				}
			} else if (obsP < 0.72) {

				const blinkP = (obsP - 0.60) / 0.12;
				const blinkSin = Math.sin(blinkP * Math.PI);

				this.nictitatingMembrane.rotation.y = -Math.PI * 0.65 + blinkSin * (Math.PI * 0.65);
				this.nicMat.opacity = blinkSin * 0.78;

				this.targetPupilScale = 1.25 - blinkSin * 0.20;
			} else if (obsP < 0.88) {

				this.targetGazeRoll = 0.09;
				this.targetGazePitch = 0.04;
				this.targetGazeYaw = -0.05;

				const settleP = (obsP - 0.72) / 0.16;
				this.targetPupilScale = 1.15 - settleP * 0.20;
			} else {

				this.targetGazeYaw = 0.22;
				this.targetGazeRoll = 0.0;
				this.targetPupilScale = 1.0;
			}
		} else {

			const depP = (progress - 0.72) / 0.28;
			const easeOut = depP * depP;

			this.root.position.x = 0.30 + easeOut * 9.5;
			this.root.position.y = 0.06 - easeOut * 2.6;
			this.root.position.z = -0.50 - easeOut * 6.5;

			this.squidGroup.rotation.y = -0.02 + easeOut * 0.32;
			this.squidGroup.rotation.x = easeOut * -0.18;
			this.squidGroup.rotation.z = easeOut * -0.08;

			if (depP < 0.32) {
				this.targetGazeYaw = -0.18;
			} else {
				this.targetGazeYaw = 0.35;
			}

			if (!this.leaveAudioTriggered && depP > 0.08) {
				this.leaveAudioTriggered = true;
				ctx.audio?.playDeepWaterSurge(0.85, pan);
			}
		}

		this.eyeballPivot.rotation.x = THREE.MathUtils.lerp(
			this.eyeballPivot.rotation.x,
			this.targetGazePitch,
			dt * 8.0
		);
		this.eyeballPivot.rotation.y = THREE.MathUtils.lerp(
			this.eyeballPivot.rotation.y,
			this.targetGazeYaw,
			dt * 8.0
		);
		this.eyeballPivot.rotation.z = THREE.MathUtils.lerp(
			this.eyeballPivot.rotation.z,
			this.targetGazeRoll,
			dt * 8.0
		);

		const curScale = this.pupilPivot.scale.x;
		const nextScale = THREE.MathUtils.lerp(curScale, this.targetPupilScale, dt * 6.5);
		this.pupilPivot.scale.set(nextScale, nextScale, 1.0);

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.root.position.set(-9.5, 0.06, -5.0);
		this.squidGroup.rotation.set(0, -0.12, 0);

		this.eyeballPivot.rotation.set(0, 0.35, 0);
		this.targetGazeYaw = 0.35;
		this.targetGazePitch = 0.0;
		this.targetGazeRoll = 0.0;

		this.pupilPivot.scale.set(1.0, 1.0, 1.0);
		this.nicMat.opacity = 0.0;
		this.nictitatingMembrane.rotation.y = -Math.PI * 0.65;

		this.stareAudioTriggered = false;
		this.leaveAudioTriggered = false;
	}
}

