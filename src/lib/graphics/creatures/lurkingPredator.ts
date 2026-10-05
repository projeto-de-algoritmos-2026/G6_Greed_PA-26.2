import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

/**
 * Creates high-detail procedural abyssal reptile/fish skin with slimy epidermal sheen,
 * mottled dark scales, and bio-iridescent undertones.
 */
function createEldritchViperSkinTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#050a0d';
	ctx.fillRect(0, 0, 512, 512);

	// Mottled abyssal slime and subcutaneous decay
	for (let i = 0; i < 90; i++) {
		const x = Math.random() * 512;
		const y = Math.random() * 512;
		const r = 18 + Math.random() * 55;
		const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
		grad.addColorStop(0, 'rgba(12, 38, 34, 0.45)');
		grad.addColorStop(0.5, 'rgba(6, 20, 26, 0.25)');
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}

	// Hexagonal / diamond abyssal scale pattern
	ctx.strokeStyle = 'rgba(0, 240, 180, 0.04)';
	ctx.lineWidth = 1;
	const step = 14;
	for (let y = 0; y < 512; y += step) {
		for (let x = 0; x < 512; x += step) {
			const ox = (Math.floor(y / step) % 2) * (step / 2);
			ctx.strokeRect(x + ox, y, step * 0.9, step * 0.9);
		}
	}

	// Micro epidermal scratches and mucus pores
	for (let p = 0; p < 350; p++) {
		const px = Math.random() * 512;
		const py = Math.random() * 512;
		const pr = 0.8 + Math.random() * 1.8;
		ctx.fillStyle = Math.random() > 0.4 ? 'rgba(0, 255, 200, 0.12)' : 'rgba(2, 8, 10, 0.8)';
		ctx.beginPath();
		ctx.arc(px, py, pr, 0, Math.PI * 2);
		ctx.fill();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

interface SpineSegment {
	mesh: THREE.Mesh;
	basePos: THREE.Vector3;
	finMesh?: THREE.Mesh;
	ribs: THREE.Mesh[];
}

export class LurkingPredatorActor implements WindowEventActor {
	public readonly type = 'LURKING_PREDATOR';
	public readonly tier = 2 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private predatorGroup: THREE.Group;
	private headGroup: THREE.Group;
	private lowerJaw: THREE.Group;
	private operculumLeft: THREE.Mesh;
	private operculumRight: THREE.Mesh;

	private spineSegments: SpineSegment[] = [];
	private pectoralLeft: THREE.Group;
	private pectoralRight: THREE.Group;

	private iliciumJoints: THREE.Group[] = [];
	private escaBulb: THREE.Mesh;
	private escaLight: THREE.PointLight;
	private escaTendrils: THREE.LineSegments;

	private chinBarbel: THREE.Group;
	private barbelNodes: THREE.Mesh[] = [];

	private mainEyes: THREE.Mesh[] = [];
	private accessoryEyes: THREE.Mesh[] = [];
	private teethMeshes: THREE.Mesh[] = [];

	private elapsed: number = 0;
	private duration: number = 12.0;

	// Resting coordinates directly on the existing ocean seabed
	private readonly restX: number = 0.35;
	private readonly restY: number = -2.25;
	private readonly restZ: number = -3.8;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		const skinTex = createEldritchViperSkinTexture();

		// Materials
		const skinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x091419,
			roughness: 0.65,
			metalness: 0.28
		});

		const darkUnderbellyMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x04080a,
			roughness: 0.8,
			metalness: 0.15
		});

		const toothMat = new THREE.MeshStandardMaterial({
			color: 0xd6f7ee,
			roughness: 0.1,
			metalness: 0.35,
			transparent: true,
			opacity: 0.92
		});

		const gillMat = new THREE.MeshStandardMaterial({
			color: 0x36050b,
			roughness: 0.3,
			metalness: 0.1,
			emissive: 0x1a0205,
			emissiveIntensity: 0.4
		});

		const finMat = new THREE.MeshStandardMaterial({
			color: 0x0b181c,
			roughness: 0.4,
			metalness: 0.2,
			transparent: true,
			opacity: 0.8,
			side: THREE.DoubleSide
		});

		// -----------------------------------------------------------
		// 1. Predator Main Group (Resting on existing seabed)
		// -----------------------------------------------------------
		this.predatorGroup = new THREE.Group();
		this.predatorGroup.position.set(this.restX, this.restY, this.restZ);
		this.root.add(this.predatorGroup);

		// -----------------------------------------------------------
		// 2. Articulated Serpentine Body & Spine
		// -----------------------------------------------------------
		const numSegments = 9;
		const totalLength = 3.6;
		const segLen = totalLength / numSegments;

		for (let s = 0; s < numSegments; s++) {
			const t = s / (numSegments - 1);
			const width = (1.0 - t * 0.8) * (0.36 + Math.sin(t * Math.PI) * 0.14);
			const height = (1.0 - t * 0.75) * (0.48 + Math.sin(t * Math.PI) * 0.18);

			const segGeo = new THREE.CylinderGeometry(width * 0.85, width, segLen, 10, 1);
			segGeo.rotateZ(Math.PI / 2);
			segGeo.scale(1.0, height / width, 1.0);

			const segMesh = new THREE.Mesh(segGeo, s % 2 === 0 ? skinMat : darkUnderbellyMat);
			const posX = -0.5 - s * (segLen * 0.88);
			const posY = -Math.sin(t * 1.5) * 0.08;
			const posZ = Math.sin(t * 2.2) * 0.22;
			segMesh.position.set(posX, posY, posZ);

			const ribs: THREE.Mesh[] = [];
			if (s < 7) {
				const spineHeight = 0.25 + Math.sin(t * Math.PI) * 0.28;
				const spine = new THREE.Mesh(new THREE.ConeGeometry(0.02, spineHeight, 4), skinMat);
				spine.position.set(0, height * 0.55 + spineHeight * 0.45, 0);
				spine.rotation.z = -0.15;
				segMesh.add(spine);
				ribs.push(spine);

				const finGeo = new THREE.PlaneGeometry(segLen * 0.95, spineHeight * 0.85);
				const fin = new THREE.Mesh(finGeo, finMat);
				fin.position.set(0, height * 0.55 + spineHeight * 0.35, 0.005);
				fin.rotation.y = Math.PI / 2;
				segMesh.add(fin);
			}

			if (s >= numSegments - 2) {
				const tailFinGeo = new THREE.ConeGeometry(0.18, 0.7, 5);
				tailFinGeo.scale(1.0, 0.1, 1.8);
				const tailFin = new THREE.Mesh(tailFinGeo, finMat);
				tailFin.position.set(-segLen * 0.5, 0, 0);
				tailFin.rotation.z = Math.PI / 2;
				segMesh.add(tailFin);
			}

			this.predatorGroup.add(segMesh);
			this.spineSegments.push({
				mesh: segMesh,
				basePos: new THREE.Vector3(posX, posY, posZ),
				ribs
			});
		}

		// -----------------------------------------------------------
		// 3. Pectoral Fins (Resting directly on seabed sediment)
		// -----------------------------------------------------------
		const createPectoralFin = (isLeft: boolean): THREE.Group => {
			const pGroup = new THREE.Group();
			const side = isLeft ? 1 : -1;

			const finArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.65, 6), skinMat);
			finArm.rotation.x = side * 0.75;
			finArm.rotation.z = -0.55;
			pGroup.add(finArm);

			for (let r = 0; r < 5; r++) {
				const rayAng = -0.4 + r * 0.22;
				const rayLen = 0.55 + Math.sin((r / 4) * Math.PI) * 0.3;
				const ray = new THREE.Mesh(new THREE.ConeGeometry(0.014, rayLen, 4), skinMat);
				ray.position.set(-0.25, -0.4, side * (0.2 + r * 0.09));
				ray.rotation.z = -0.9 + rayAng;
				ray.rotation.x = side * 0.4;
				pGroup.add(ray);
			}

			const webPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.5), finMat);
			webPlane.position.set(-0.25, -0.38, side * 0.35);
			webPlane.rotation.x = side * (Math.PI / 3);
			webPlane.rotation.y = -0.3;
			pGroup.add(webPlane);

			return pGroup;
		};

		this.pectoralLeft = createPectoralFin(true);
		this.pectoralLeft.position.set(-0.25, -0.15, 0.32);
		this.predatorGroup.add(this.pectoralLeft);

		this.pectoralRight = createPectoralFin(false);
		this.pectoralRight.position.set(-0.25, -0.15, -0.32);
		this.predatorGroup.add(this.pectoralRight);

		// -----------------------------------------------------------
		// 4. Grotesque Cranium & Opercula
		// -----------------------------------------------------------
		this.headGroup = new THREE.Group();
		this.headGroup.position.set(0.0, 0.04, 0.0);
		this.predatorGroup.add(this.headGroup);

		const craniumGeo = new THREE.CylinderGeometry(0.24, 0.48, 1.25, 12, 4);
		craniumGeo.rotateZ(-Math.PI / 2);
		craniumGeo.scale(1.1, 0.65, 0.85);

		const cPos = craniumGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < cPos.count; i++) {
			let x = cPos.getX(i);
			let y = cPos.getY(i);
			let z = cPos.getZ(i);

			if (x > 0.3) {
				y *= 0.75;
				z *= 0.65;
			}
			if (x > 0.0 && x < 0.4 && y > 0.12) {
				y += 0.06;
			}
			cPos.setXYZ(i, x, y, z);
		}
		craniumGeo.computeVertexNormals();

		const cranium = new THREE.Mesh(craniumGeo, skinMat);
		cranium.position.set(0.6, 0.08, 0);
		this.headGroup.add(cranium);

		const gillCavity = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.68), gillMat);
		gillCavity.position.set(0.3, 0.0, 0);
		this.headGroup.add(gillCavity);

		const opGeo = new THREE.BoxGeometry(0.38, 0.38, 0.04);
		this.operculumLeft = new THREE.Mesh(opGeo, skinMat);
		this.operculumLeft.position.set(0.32, 0.02, 0.38);
		this.operculumLeft.rotation.y = 0.12;
		this.headGroup.add(this.operculumLeft);

		this.operculumRight = new THREE.Mesh(opGeo, skinMat);
		this.operculumRight.position.set(0.32, 0.02, -0.38);
		this.operculumRight.rotation.y = -0.12;
		this.headGroup.add(this.operculumRight);

		// -----------------------------------------------------------
		// 5. Glazed Cataract Eyes & Sensory Pits
		// -----------------------------------------------------------
		const eyeMat = new THREE.MeshStandardMaterial({
			color: 0x88ffe0,
			emissive: 0x00dca0,
			emissiveIntensity: 1.6,
			roughness: 0.15,
			metalness: 0.8
		});
		const pupilDotMat = new THREE.MeshBasicMaterial({ color: 0x011210 });

		for (const zSide of [0.30, -0.30]) {
			const socket = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), skinMat);
			socket.position.set(0.72, 0.22, zSide);
			socket.rotation.y = zSide > 0 ? 0.35 : -0.35;
			this.headGroup.add(socket);

			const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 14), eyeMat);
			eyeBall.position.set(0.72, 0.22, zSide);
			this.mainEyes.push(eyeBall);
			this.headGroup.add(eyeBall);

			const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.11, 0.04), pupilDotMat);
			pupil.position.set(0.09, 0, 0);
			pupil.rotation.y = zSide > 0 ? 0.2 : -0.2;
			eyeBall.add(pupil);
		}

		const pitMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
		const pitGeo = new THREE.SphereGeometry(0.022, 6, 6);
		for (let p = 0; p < 6; p++) {
			for (const side of [1, -1]) {
				const pit = new THREE.Mesh(pitGeo, pitMat);
				pit.position.set(0.65 + p * 0.08, 0.08 + Math.sin(p * 0.6) * 0.04, side * (0.24 - p * 0.025));
				this.accessoryEyes.push(pit);
				this.headGroup.add(pit);
			}
		}

		// -----------------------------------------------------------
		// 6. Hinged Lower Jaw & Chauliodus Needle Fangs
		// -----------------------------------------------------------
		this.lowerJaw = new THREE.Group();
		this.lowerJaw.position.set(0.32, -0.12, 0);
		this.headGroup.add(this.lowerJaw);

		const jawStrutGeo = new THREE.BoxGeometry(0.95, 0.12, 0.1);
		for (const zSide of [0.22, -0.22]) {
			const strut = new THREE.Mesh(jawStrutGeo, skinMat);
			strut.position.set(0.45, -0.04, zSide);
			strut.rotation.y = zSide > 0 ? -0.18 : 0.18;
			this.lowerJaw.add(strut);
		}

		const chin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), skinMat);
		chin.position.set(0.95, -0.06, 0);
		chin.rotation.z = -Math.PI / 2;
		this.lowerJaw.add(chin);

		const mouthFloor = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.32), finMat);
		mouthFloor.position.set(0.48, -0.08, 0);
		mouthFloor.rotation.x = Math.PI / 2;
		this.lowerJaw.add(mouthFloor);

		const lowerFangConfigs = [
			{ x: 0.92, len: 0.42, rad: 0.026 },
			{ x: 0.80, len: 0.32, rad: 0.022 },
			{ x: 0.68, len: 0.38, rad: 0.024 },
			{ x: 0.56, len: 0.26, rad: 0.018 },
			{ x: 0.44, len: 0.22, rad: 0.016 },
			{ x: 0.32, len: 0.18, rad: 0.014 },
			{ x: 0.20, len: 0.14, rad: 0.012 }
		];

		for (const cfg of lowerFangConfigs) {
			for (const side of [1, -1]) {
				const fangGeo = new THREE.ConeGeometry(cfg.rad, cfg.len, 5);
				fangGeo.rotateZ(0.25);
				fangGeo.rotateX(side * 0.18);

				const fang = new THREE.Mesh(fangGeo, toothMat);
				const zPos = side * (0.24 - (cfg.x - 0.2) * 0.08);
				fang.position.set(cfg.x, 0.04 + cfg.len * 0.45, zPos);

				this.teethMeshes.push(fang);
				this.lowerJaw.add(fang);
			}
		}

		const upperFangConfigs = [
			{ x: 0.85, len: 0.28, rad: 0.022 },
			{ x: 0.72, len: 0.35, rad: 0.025 },
			{ x: 0.60, len: 0.26, rad: 0.020 },
			{ x: 0.48, len: 0.30, rad: 0.022 },
			{ x: 0.36, len: 0.18, rad: 0.015 }
		];

		for (const cfg of upperFangConfigs) {
			for (const side of [1, -1]) {
				const fangGeo = new THREE.ConeGeometry(cfg.rad, cfg.len, 5);
				fangGeo.rotateZ(-0.22);
				fangGeo.rotateX(side * -0.15);

				const fang = new THREE.Mesh(fangGeo, toothMat);
				fang.position.set(cfg.x, -0.06 - cfg.len * 0.45, side * (0.22 - (cfg.x - 0.3) * 0.06));

				this.teethMeshes.push(fang);
				this.headGroup.add(fang);
			}
		}

		// -----------------------------------------------------------
		// 7. Chin Barbel with Lure Beads
		// -----------------------------------------------------------
		this.chinBarbel = new THREE.Group();
		this.chinBarbel.position.set(0.92, -0.10, 0);
		this.lowerJaw.add(this.chinBarbel);

		const barbelSegments = 5;
		let parentBarbelObj: THREE.Object3D = this.chinBarbel;
		for (let b = 0; b < barbelSegments; b++) {
			const bGeo = new THREE.CylinderGeometry(0.014 - b * 0.002, 0.012 - b * 0.002, 0.22, 6);
			bGeo.translate(0, -0.11, 0);
			const bMesh = new THREE.Mesh(bGeo, skinMat);
			parentBarbelObj.add(bMesh);

			if (b >= barbelSegments - 2) {
				const bBulb = new THREE.Mesh(
					new THREE.SphereGeometry(0.035, 8, 8),
					new THREE.MeshBasicMaterial({ color: 0x00ffcc })
				);
				bBulb.position.set(0, -0.22, 0);
				bMesh.add(bBulb);
				this.barbelNodes.push(bBulb);
			}

			parentBarbelObj = bMesh;
		}

		// -----------------------------------------------------------
		// 8. Articulated Illicium (Lure Stalk) & Esca Bulb
		// -----------------------------------------------------------
		const stalkBase = new THREE.Group();
		stalkBase.position.set(0.68, 0.28, 0);
		this.headGroup.add(stalkBase);

		const numStalkJoints = 6;
		const stalkJointLen = 0.22;
		let curStalkParent: THREE.Object3D = stalkBase;

		for (let j = 0; j < numStalkJoints; j++) {
			const jGroup = new THREE.Group();
			jGroup.position.set(j === 0 ? 0 : stalkJointLen * 0.85, j === 0 ? 0 : 0.08, 0);

			const rTop = 0.024 - j * 0.003;
			const rBot = 0.022 - j * 0.003;
			const jGeo = new THREE.CylinderGeometry(rBot, rTop, stalkJointLen, 8);
			jGeo.rotateZ(-Math.PI / 3);
			const jMesh = new THREE.Mesh(jGeo, skinMat);
			jMesh.position.set(stalkJointLen * 0.45, 0.04, 0);
			jGroup.add(jMesh);

			curStalkParent.add(jGroup);
			this.iliciumJoints.push(jGroup);
			curStalkParent = jGroup;
		}

		this.escaBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.095, 16, 14),
			new THREE.MeshStandardMaterial({
				color: 0x00ffcc,
				emissive: 0x00ffaa,
				emissiveIntensity: 2.8,
				roughness: 0.15,
				metalness: 0.5
			})
		);
		this.escaBulb.position.set(stalkJointLen, 0.08, 0);
		curStalkParent.add(this.escaBulb);

		const tendrilLines = [
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0.08, -0.22, 0.06),
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(-0.06, -0.28, -0.05),
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0.02, -0.32, 0.08),
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0.12, -0.18, -0.07)
		];
		const tendrilGeo = new THREE.BufferGeometry().setFromPoints(tendrilLines);
		this.escaTendrils = new THREE.LineSegments(
			tendrilGeo,
			new THREE.LineBasicMaterial({ color: 0x55ffdd, linewidth: 2 })
		);
		this.escaBulb.add(this.escaTendrils);

		this.escaLight = new THREE.PointLight(0x00ffcc, 2.4, 4.5, 1.4);
		this.escaLight.position.set(0, 0, 0);
		this.escaBulb.add(this.escaLight);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 12.0;
		this.root.visible = true;

		// Sits directly on the natural seabed
		this.predatorGroup.position.set(this.restX, this.restY, this.restZ);
		this.predatorGroup.rotation.set(0, 0.15, 0);
		this.headGroup.rotation.set(0, 0, 0);
		this.lowerJaw.rotation.z = 0;

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

		// Bioluminescent lure pulse
		const lureThrob = 1.8 + Math.sin(this.elapsed * 5.2) * 1.0 + Math.sin(this.elapsed * 11.0) * 0.35;
		this.escaLight.intensity = lureThrob;
		(this.escaBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = lureThrob * 1.3;

		// Illicium enticing twitch
		for (let j = 0; j < this.iliciumJoints.length; j++) {
			const jPhase = this.elapsed * 2.8 + j * 0.45;
			this.iliciumJoints[j].rotation.z = Math.sin(jPhase) * 0.06;
			this.iliciumJoints[j].rotation.y = Math.cos(jPhase * 0.75) * 0.08;
		}

		// Chin barbel floating in deep water
		const barbelWave = Math.sin(this.elapsed * 1.6) * 0.15;
		this.chinBarbel.rotation.z = barbelWave;
		this.chinBarbel.rotation.x = Math.cos(this.elapsed * 1.4) * 0.12;

		if (progress < 0.65) {
			// Ambush posture resting on seabed
			const breathCycle = Math.sin(this.elapsed * 1.7);

			const opFlare = Math.max(0, breathCycle) * 0.28;
			this.operculumLeft.rotation.y = 0.12 + opFlare;
			this.operculumRight.rotation.y = -0.12 - opFlare;

			this.lowerJaw.rotation.z = -0.06 + Math.sin(this.elapsed * 1.1) * 0.05;

			for (let s = 0; s < this.spineSegments.length; s++) {
				const seg = this.spineSegments[s];
				const sPhase = this.elapsed * 1.4 - s * 0.35;
				seg.mesh.position.z = seg.basePos.z + Math.sin(sPhase) * (0.02 + s * 0.015);
				seg.mesh.rotation.y = Math.sin(sPhase) * 0.06;
			}

			this.pectoralLeft.rotation.z = Math.sin(this.elapsed * 1.7) * 0.05;
			this.pectoralRight.rotation.z = -Math.sin(this.elapsed * 1.7) * 0.05;

			for (const eye of this.mainEyes) {
				(eye.material as THREE.MeshStandardMaterial).emissiveIntensity =
					1.5 + Math.sin(this.elapsed * 3.2) * 0.4;
			}

			this.headGroup.rotation.y = Math.sin(this.elapsed * 0.8) * 0.06;
			this.headGroup.rotation.x = Math.cos(this.elapsed * 0.6) * 0.03;
		} else if (progress < 0.72) {
			// Aggression reveal: jaws open wide
			this.predatorGroup.rotation.y = THREE.MathUtils.lerp(this.predatorGroup.rotation.y, 0.45, dt * 7.0);

			this.lowerJaw.rotation.z = THREE.MathUtils.lerp(this.lowerJaw.rotation.z, -0.65, dt * 9.0);
			this.operculumLeft.rotation.y = 0.42;
			this.operculumRight.rotation.y = -0.42;

			for (let j = 0; j < this.iliciumJoints.length; j++) {
				this.iliciumJoints[j].rotation.z = -0.12;
			}
		} else {
			// Explosive launch off the seabed into the black abyss
			const fleeP = (progress - 0.72) / 0.28;
			const ease = fleeP * fleeP;

			this.predatorGroup.position.x = this.restX - ease * 5.8;
			this.predatorGroup.position.y = this.restY - ease * 2.4;
			this.predatorGroup.position.z = this.restZ - ease * 4.8;

			const whipFreq = 16.0;
			this.predatorGroup.rotation.z = Math.sin(this.elapsed * whipFreq) * 0.28;
			for (let s = 0; s < this.spineSegments.length; s++) {
				const seg = this.spineSegments[s];
				seg.mesh.rotation.y = Math.sin(this.elapsed * whipFreq - s * 0.6) * 0.35;
			}
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.predatorGroup.position.set(this.restX, this.restY, this.restZ);
	}
}
