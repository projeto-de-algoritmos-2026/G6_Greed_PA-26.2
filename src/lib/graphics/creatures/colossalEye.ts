import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

/**
 * Creates static offscreen base for the cephalopod eye:
 * Ivory/silver deep-sea sclera with delicate crimson capillaries,
 * dark feathered limbus border, and over 360 striated cosmic amber,
 * gold, bronze, and emerald iris fibers.
 * Center is left ready for dynamic pupil rendering!
 */
function createStaticIrisBaseCanvas(): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;

	const cx = 256;
	const cy = 256;

	// 1. Sclera gradient (ivory cream to deep oceanic slate at margin)
	const scleraGrad = ctx.createRadialGradient(cx, cy, 140, cx, cy, 256);
	scleraGrad.addColorStop(0, '#fbf8f0');
	scleraGrad.addColorStop(0.55, '#dfd6c6');
	scleraGrad.addColorStop(0.85, '#6e6358');
	scleraGrad.addColorStop(1, '#14100c');
	ctx.fillStyle = scleraGrad;
	ctx.fillRect(0, 0, 512, 512);

	// 2. Delicate branching crimson capillary vessels in sclera
	ctx.strokeStyle = 'rgba(165, 20, 35, 0.45)';
	for (let v = 0; v < 32; v++) {
		const baseAng = (v / 32) * Math.PI * 2;
		let vx = cx + Math.cos(baseAng) * 155;
		let vy = cy + Math.sin(baseAng) * 155;

		ctx.lineWidth = 1.0 + Math.random() * 1.5;
		ctx.beginPath();
		ctx.moveTo(vx, vy);

		for (let s = 0; s < 5; s++) {
			const branchAng = baseAng + (Math.random() - 0.5) * 0.9;
			const stepLen = 14 + Math.random() * 18;
			vx += Math.cos(branchAng) * stepLen;
			vy += Math.sin(branchAng) * stepLen;
			ctx.lineTo(vx, vy);

			if (s === 2) {
				const subAng = branchAng + (Math.random() > 0.5 ? 0.7 : -0.7);
				ctx.moveTo(vx, vy);
				ctx.lineTo(vx + Math.cos(subAng) * 16, vy + Math.sin(subAng) * 16);
				ctx.moveTo(vx, vy);
			}
		}
		ctx.stroke();
	}

	// 3. Dark feathered limbus border ring separating sclera and iris
	const limbusGrad = ctx.createRadialGradient(cx, cy, 150, cx, cy, 172);
	limbusGrad.addColorStop(0, 'rgba(2, 6, 4, 0)');
	limbusGrad.addColorStop(0.6, 'rgba(4, 14, 10, 0.88)');
	limbusGrad.addColorStop(1, '#020504');
	ctx.fillStyle = limbusGrad;
	ctx.beginPath();
	ctx.arc(cx, cy, 172, 0, Math.PI * 2);
	ctx.fill();

	// 4. Iris: Cephalopod iridescent amber, golden-yellow, bronze, and deep emerald
	// Iris radius is strictly 165px (leaving plenty of sclera visible around it!)
	const irisR = 165;
	const irisGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, irisR);
	irisGrad.addColorStop(0, '#042217');
	irisGrad.addColorStop(0.22, '#0f523c');
	irisGrad.addColorStop(0.48, '#ad6e0b');
	irisGrad.addColorStop(0.74, '#f5af1e');
	irisGrad.addColorStop(0.92, '#703e06');
	irisGrad.addColorStop(1, '#020604');
	ctx.fillStyle = irisGrad;
	ctx.beginPath();
	ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
	ctx.fill();

	// 5. Over 360 finely striated radial iris fibers and sphincter folds
	const numStriae = 360;
	for (let s = 0; s < numStriae; s++) {
		const ang = (s / numStriae) * Math.PI * 2;
		const innerR = 48 + Math.sin(s * 14) * 6;
		const outerR = 163 + Math.sin(s * 7) * 2;

		ctx.beginPath();
		ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
		ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR);

		const mod = s % 5;
		if (mod === 0) {
			ctx.strokeStyle = 'rgba(255, 238, 150, 0.85)';
			ctx.lineWidth = 1.6;
		} else if (mod === 1) {
			ctx.strokeStyle = 'rgba(25, 105, 80, 0.8)';
			ctx.lineWidth = 1.2;
		} else if (mod === 2) {
			ctx.strokeStyle = 'rgba(225, 120, 20, 0.7)';
			ctx.lineWidth = 1.4;
		} else if (mod === 3) {
			ctx.strokeStyle = 'rgba(255, 200, 60, 0.6)';
			ctx.lineWidth = 1.1;
		} else {
			ctx.strokeStyle = 'rgba(12, 55, 40, 0.65)';
			ctx.lineWidth = 0.9;
		}
		ctx.stroke();
	}

	// 6. Concentric wavy sphincter rings on iris
	ctx.lineWidth = 1.6;
	ctx.strokeStyle = 'rgba(190, 135, 25, 0.4)';
	for (let r = 60; r <= 150; r += 16) {
		ctx.beginPath();
		for (let a = 0; a <= Math.PI * 2; a += 0.05) {
			const waveR = r + Math.sin(a * 16) * 1.8;
			const px = cx + Math.cos(a) * waveR;
			const py = cy + Math.sin(a) * waveR;
			if (a === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.stroke();
	}

	return canvas;
}

/**
 * Creates authentic Giant / Colossal Squid skin texture
 * with deep crimson/plum chromatophore mottling and bioluminescent sheen.
 */
function createColossalSquidSkinTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#1c0510';
	ctx.fillRect(0, 0, 512, 512);

	for (let m = 0; m < 90; m++) {
		const mx = Math.random() * 512;
		const my = Math.random() * 512;
		const mr = 20 + Math.random() * 80;
		const grad = ctx.createRadialGradient(mx, my, 4, mx, my, mr);
		grad.addColorStop(0, 'rgba(115, 22, 55, 0.58)');
		grad.addColorStop(0.5, 'rgba(55, 12, 32, 0.35)');
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(mx, my, mr, 0, Math.PI * 2);
		ctx.fill();
	}

	// Dense chromatophore freckle dots
	for (let d = 0; d < 4000; d++) {
		const dx = Math.random() * 512;
		const dy = Math.random() * 512;
		const dr = 0.8 + Math.random() * 2.2;
		const alpha = 0.25 + Math.random() * 0.55;
		ctx.fillStyle = Math.random() > 0.4 ? `rgba(145, 25, 60, ${alpha})` : `rgba(35, 5, 18, ${alpha})`;
		ctx.beginPath();
		ctx.arc(dx, dy, dr, 0, Math.PI * 2);
		ctx.fill();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

/**
 * Creates a seamless polar sphere geometry for the eyeball.
 * Concentric rings start from the forward pole (0, 0, +R) and sweep backward to (0, 0, -R).
 * Mathematically avoids Y-axis pole pinch, seams, and distortion:
 * Vertex (0, 0, +R) maps directly to canvas center (0.5, 0.5).
 * Looking at the sphere from +Z faces the pupil dead-center!
 */
function createPolarEyeballGeometry(radius: number, numR: number = 36, numS: number = 48): THREE.BufferGeometry {
	const geo = new THREE.BufferGeometry();
	const vertices: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	for (let r = 0; r <= numR; r++) {
		const phi = (r / numR) * Math.PI;
		const z = radius * Math.cos(phi);
		const ringRad = radius * Math.sin(phi);

		for (let s = 0; s <= numS; s++) {
			const theta = (s / numS) * Math.PI * 2;
			const x = ringRad * Math.cos(theta);
			const y = ringRad * Math.sin(theta);

			vertices.push(x, y, z);

			let u: number;
			let v: number;
			if (phi <= Math.PI * 0.55) {
				const dist = (phi / (Math.PI * 0.55)) * 0.46;
				u = 0.5 + Math.cos(theta) * dist;
				v = 0.5 - Math.sin(theta) * dist;
			} else {
				u = 0.5 + Math.cos(theta) * 0.46;
				v = 0.5 - Math.sin(theta) * 0.46;
			}
			uvs.push(u, v);
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

	geo.setIndex(indices);
	geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
	geo.computeVertexNormals();
	return geo;
}

/**
 * Creates continuous 360° cranial cowl geometry that surrounds the eye socket.
 * Spans seamlessly across both left (-X) and right (+X), top (+Y) and bottom (-Y).
 */
function createCranialCowlGeometry(): THREE.BufferGeometry {
	const geo = new THREE.BufferGeometry();
	const vertices: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	const numR = 18;
	const numS = 36;

	for (let r = 0; r <= numR; r++) {
		const t = r / numR;
		const z = -0.15 - t * 2.65;
		const baseR = THREE.MathUtils.lerp(1.55, 2.8, Math.pow(t, 0.7));

		for (let s = 0; s <= numS; s++) {
			const theta = (s / numS) * Math.PI * 2;
			const cosT = Math.cos(theta); // X
			const sinT = Math.sin(theta); // Y

			// Symmetrical lateral muscular cheeks on BOTH left (-X) and right (+X)
			const lateralBulge = Math.pow(Math.abs(cosT), 1.5) * (0.65 + t * 0.55);
			// Dorsal crest across the top (+Y)
			const dorsalCrest = sinT > 0 ? Math.pow(sinT, 2.0) * 0.38 : 0;

			const rx = (baseR + lateralBulge) * cosT;
			const ry = (baseR + dorsalCrest) * sinT * 0.95;

			vertices.push(rx, ry, z);
			uvs.push(s / numS, t * 2.5);
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

	geo.setIndex(indices);
	geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
	geo.computeVertexNormals();
	return geo;
}

interface SquidArm {
	root: THREE.Group;
	segments: THREE.Mesh[];
	phaseOffset: number;
}

interface FeedingTentacle {
	root: THREE.Group;
	segments: THREE.Mesh[];
	club: THREE.Mesh;
	phaseOffset: number;
}

export class ColossalEyeActor implements WindowEventActor {
	public readonly type = 'COLOSSAL_EYE';
	public readonly tier = 2;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	// Hierarchy
	private squidGroup: THREE.Group;
	private eyePivot: THREE.Group;

	// The SINGLE Eyeball & Dynamic Canvas Texture
	private eyeballMesh: THREE.Mesh;
	private eyeCanvas: HTMLCanvasElement;
	private eyeCanvasCtx: CanvasRenderingContext2D;
	private staticIrisCanvas: HTMLCanvasElement;
	private eyeTexture: THREE.CanvasTexture;
	private lastDrawnPupilRadius: number = -1;

	// Head & Socket
	private headGroup: THREE.Group;
	private cranialCowlMesh: THREE.Mesh;
	private orbitalBrow: THREE.Mesh;
	private eyePointLight: THREE.PointLight;
	private orbitalPhotophores: THREE.Mesh[] = [];

	// Body & Siphon
	private mantleMesh: THREE.Mesh;
	private mantleBasePositions: Float32Array;
	private mantleRingCount: number = 24;
	private mantleRadialCount: number = 18;
	private terminalFins: THREE.Group;
	private siphonMesh: THREE.Mesh;

	// 8 Framing Arms & 2 Long Feeding Tentacles
	private arms: SquidArm[] = [];
	private feedingTentacles: FeedingTentacle[] = [];

	// State & Timing
	private elapsed: number = 0;
	private duration: number = 15.0;
	private opening: 'hatch' = 'hatch';

	// Pupil dilation state (normalized 0.0 to 1.0)
	private currentPupilDilation: number = 0.2;
	private targetPupilDilation: number = 0.2;

	// Audio & Event triggers
	private stareAudioTriggered: boolean = false;
	private leaveAudioTriggered: boolean = false;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.squidGroup = new THREE.Group();
		this.root.add(this.squidGroup);

		// Shared Procedural Materials
		const skinTex = createColossalSquidSkinTexture();

		const squidSkinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x36081b,
			roughness: 0.45,
			metalness: 0.15,
			side: THREE.DoubleSide
		});

		const underbellyMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x1d030e,
			roughness: 0.55,
			metalness: 0.1
		});

		const suckerFleshMat = new THREE.MeshStandardMaterial({
			color: 0xdfcfc0,
			roughness: 0.35,
			metalness: 0.15
		});

		const suckerTeethMat = new THREE.MeshStandardMaterial({
			color: 0xf2dfa8,
			roughness: 0.18,
			metalness: 0.45
		});

		// -----------------------------------------------------------
		// 1. DYNAMIC EYE CANVAS TEXTURE PIPELINE (SINGLE SPHERE, NO ARTIFACTS!)
		// Iris radius is strictly 165px.
		// Pupil radius is strictly clamped between 50px and 105px.
		// Pupil is ALWAYS within the iris with a rich 60px golden ring visible!
		// -----------------------------------------------------------
		this.staticIrisCanvas = createStaticIrisBaseCanvas();

		this.eyeCanvas = document.createElement('canvas');
		this.eyeCanvas.width = 512;
		this.eyeCanvas.height = 512;
		this.eyeCanvasCtx = this.eyeCanvas.getContext('2d')!;

		this.eyeTexture = new THREE.CanvasTexture(this.eyeCanvas);
		this.eyeTexture.colorSpace = THREE.SRGBColorSpace;

		this.renderEyeCanvas(58);

		// -----------------------------------------------------------
		// 2. THE SINGLE COLOSSAL EYEBALL
		// Polar geometry: pole (0, 0, +R) faces directly into the cabin!
		// Radius = 1.35m.
		// Position = (0.0, 0.0, -1.40).
		// Front pole reaches Z = -1.40 + 1.35 = -0.05m (5cm outside window glass Z=0)!
		// -----------------------------------------------------------
		const eyeRadius = 1.35;

		this.eyePivot = new THREE.Group();
		this.eyePivot.position.set(0.0, 0.0, -1.40);
		this.squidGroup.add(this.eyePivot);

		const eyeGeo = createPolarEyeballGeometry(eyeRadius, 36, 48);

		const eyeMat = new THREE.MeshPhysicalMaterial({
			map: this.eyeTexture,
			roughness: 0.03,
			metalness: 0.02,
			clearcoat: 1.0,
			clearcoatRoughness: 0.02,
			emissive: 0x051612,
			emissiveIntensity: 0.42
		});

		this.eyeballMesh = new THREE.Mesh(eyeGeo, eyeMat);
		this.eyePivot.add(this.eyeballMesh);

		// Fleshy Orbital Brow Ring circling the perimeter of the eyeball
		const browGeo = new THREE.TorusGeometry(eyeRadius + 0.08, 0.24, 16, 48);
		this.orbitalBrow = new THREE.Mesh(browGeo, squidSkinMat);
		this.orbitalBrow.position.set(0, 0, 0.12);
		this.eyePivot.add(this.orbitalBrow);

		// Bioluminescent Photophores encircling the orbital brow
		const photoMat = new THREE.MeshBasicMaterial({ color: 0x3cf0c8 });
		const photoGeo = new THREE.SphereGeometry(0.045, 8, 8);
		for (let p = 0; p < 24; p++) {
			const ang = (p / 24) * Math.PI * 2;
			const pr = eyeRadius + 0.20 + Math.sin(p * 3) * 0.04;
			const pMesh = new THREE.Mesh(photoGeo, photoMat);
			pMesh.position.set(Math.cos(ang) * pr, Math.sin(ang) * pr, 0.22);
			this.orbitalPhotophores.push(pMesh);
			this.eyePivot.add(pMesh);
		}

		// Eye Light: Hypnotic bio-luminescent beam cast straight through the porthole
		this.eyePointLight = new THREE.PointLight(0x72f5d0, 3.8, 7.5, 1.8);
		this.eyePointLight.position.set(0.0, 0.25, 0.6);
		this.eyePivot.add(this.eyePointLight);

		// -----------------------------------------------------------
		// 3. CONTINUOUS 360° CRANIAL HEAD MASS (SEAMLESS ON BOTH SIDES!)
		// Encompasses the eye from behind, above, below, left AND right!
		// -----------------------------------------------------------
		this.headGroup = new THREE.Group();
		this.headGroup.position.set(0.0, 0.0, -1.40);
		this.squidGroup.add(this.headGroup);

		// Solid continuous cranial cowl spanning ±3.8m across the porthole
		const cowlGeo = createCranialCowlGeometry();
		this.cranialCowlMesh = new THREE.Mesh(cowlGeo, squidSkinMat);
		this.headGroup.add(this.cranialCowlMesh);

		// Muscular Siphon (Hyponome) on ventral side underneath the head
		const siphonGeo = new THREE.CylinderGeometry(0.34, 0.62, 1.7, 18, 2, true);
		siphonGeo.rotateZ(Math.PI / 2.3);
		siphonGeo.scale(1.0, 0.85, 1.2);
		this.siphonMesh = new THREE.Mesh(siphonGeo, underbellyMat);
		this.siphonMesh.position.set(-0.3, -1.45, -1.2);
		this.headGroup.add(this.siphonMesh);

		// Conical Torpedo Mantle connects smoothly behind the cowl into the abyss
		const numR = this.mantleRingCount;
		const numS = this.mantleRadialCount;
		const mantleVertices: number[] = [];
		const mantleUvs: number[] = [];
		const mantleIndices: number[] = [];

		for (let r = 0; r <= numR; r++) {
			const t = r / numR;
			const posX = -0.4 - t * 9.5;
			const posY = -0.1 - Math.sin(t * Math.PI * 0.6) * 0.35;
			const posZ = -2.6 - t * 3.0;

			let radius: number;
			if (t < 0.2) {
				const p = t / 0.2;
				radius = 2.4 + Math.sin(p * Math.PI * 0.5) * 0.3;
			} else {
				const p = (t - 0.2) / 0.8;
				radius = THREE.MathUtils.lerp(2.7, 0.15, Math.pow(p, 1.15));
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
		this.mantleMesh = new THREE.Mesh(mantleGeo, squidSkinMat);
		this.headGroup.add(this.mantleMesh);

		// Terminal diamond swimming fins at posterior mantle tip
		this.terminalFins = new THREE.Group();
		this.terminalFins.position.set(-9.8, -0.4, -5.6);
		this.headGroup.add(this.terminalFins);

		const finShape = new THREE.Shape();
		finShape.moveTo(0, 0);
		finShape.lineTo(2.4, 1.6);
		finShape.lineTo(4.2, 0);
		finShape.lineTo(2.4, -1.6);
		finShape.closePath();

		const finGeo = new THREE.ShapeGeometry(finShape, 12);
		const topFin = new THREE.Mesh(finGeo, squidSkinMat);
		topFin.rotation.x = Math.PI / 2;
		topFin.scale.set(0.65, 0.65, 0.65);
		this.terminalFins.add(topFin);

		// -----------------------------------------------------------
		// 4. 8 RADIAL ARMS FRAMING THE OBSERVATION WINDOW
		// Arch forward and outward from around the eye socket
		// -----------------------------------------------------------
		const suckerBaseGeo = new THREE.CylinderGeometry(0.08, 0.10, 0.06, 10);
		suckerBaseGeo.rotateX(Math.PI / 2);

		const suckerRimGeo = new THREE.TorusGeometry(0.065, 0.016, 6, 12);
		suckerRimGeo.rotateX(Math.PI / 2);

		const armRadius = eyeRadius + 0.35;
		const armLength = 4.8;
		const numArms = 8;

		for (let a = 0; a < numArms; a++) {
			const angle = (a / numArms) * Math.PI * 2;
			const cosA = Math.cos(angle);
			const sinA = Math.sin(angle);

			const aGroup = new THREE.Group();
			aGroup.position.set(cosA * armRadius, sinA * armRadius, -0.2);
			aGroup.rotation.z = angle - Math.PI / 2;
			aGroup.rotation.x = -0.38;

			const segments: THREE.Mesh[] = [];
			let parentJoint: THREE.Object3D = aGroup;
			const segCount = 6;
			const segLen = armLength / segCount;

			for (let s = 0; s < segCount; s++) {
				const rTop = 0.14 - s * (0.09 / segCount);
				const rBot = 0.13 - (s + 1) * (0.09 / segCount);
				const sGeo = new THREE.CylinderGeometry(rTop, rBot, segLen, 10);
				sGeo.translate(0, -segLen / 2, 0);

				const segMesh = new THREE.Mesh(sGeo, squidSkinMat);
				segMesh.position.set(0, s === 0 ? 0 : -segLen, 0);
				parentJoint.add(segMesh);
				segments.push(segMesh);

				for (let v = 0; v < 2; v++) {
					const suckerCup = new THREE.Mesh(suckerBaseGeo, suckerFleshMat);
					suckerCup.position.set(0, -segLen * 0.3 - v * (segLen * 0.4), rTop + 0.015);
					const suckerRim = new THREE.Mesh(suckerRimGeo, suckerTeethMat);
					suckerCup.add(suckerRim);
					segMesh.add(suckerCup);
				}

				parentJoint = segMesh;
			}

			this.arms.push({ root: aGroup, segments, phaseOffset: a * 0.8 });
			this.headGroup.add(aGroup);
		}

		// -----------------------------------------------------------
		// 5. 2 COLOSSAL FEEDING TENTACLES
		// -----------------------------------------------------------
		const tentacleAngles = [-Math.PI * 0.35, -Math.PI * 0.65];
		tentacleAngles.forEach((tAng, tIdx) => {
			const tGroup = new THREE.Group();
			tGroup.position.set(Math.cos(tAng) * (armRadius + 0.25), Math.sin(tAng) * (armRadius + 0.25), -0.3);
			tGroup.rotation.z = tAng - Math.PI / 2;
			tGroup.rotation.x = -0.28;

			const segments: THREE.Mesh[] = [];
			let parentJoint: THREE.Object3D = tGroup;
			const segCount = 8;
			const segLen = 7.5 / segCount;

			for (let s = 0; s < segCount; s++) {
				const rTop = 0.07 - s * (0.03 / segCount);
				const rBot = 0.065 - (s + 1) * (0.03 / segCount);
				const sGeo = new THREE.CylinderGeometry(rTop, rBot, segLen, 8);
				sGeo.translate(0, -segLen / 2, 0);

				const segMesh = new THREE.Mesh(sGeo, squidSkinMat);
				segMesh.position.set(0, s === 0 ? 0 : -segLen, 0);
				parentJoint.add(segMesh);
				segments.push(segMesh);

				parentJoint = segMesh;
			}

			const clubGeo = new THREE.CylinderGeometry(0.13, 0.04, 1.4, 10);
			clubGeo.scale(1.2, 1.0, 0.7);
			const club = new THREE.Mesh(clubGeo, squidSkinMat);
			club.position.set(0, -segLen, 0);
			parentJoint.add(club);

			this.feedingTentacles.push({ root: tGroup, segments, club, phaseOffset: tIdx * 1.5 });
			this.headGroup.add(tGroup);
		});
	}

	/**
	 * Redraws the dynamic eye canvas with a strictly clamped pupil radius.
	 * Iris radius is 165px.
	 * Pupil radius is clamped strictly between 50px and 105px (max 63% of iris).
	 * Pupil is ALWAYS guaranteed to stay well within the iris!
	 */
	private renderEyeCanvas(pupilRadiusPx: number): void {
		const clampedRadius = Math.max(50, Math.min(105, Math.round(pupilRadiusPx)));
		if (clampedRadius === this.lastDrawnPupilRadius) return;
		this.lastDrawnPupilRadius = clampedRadius;

		const ctx = this.eyeCanvasCtx;
		// 1. Draw pre-rendered static iris and sclera base
		ctx.drawImage(this.staticIrisCanvas, 0, 0);

		// 2. Draw black pupil in the center
		ctx.fillStyle = '#000000';
		ctx.beginPath();
		ctx.arc(256, 256, clampedRadius, 0, Math.PI * 2);
		ctx.fill();

		// Soft feathered pupil edge
		const edgeGrad = ctx.createRadialGradient(256, 256, clampedRadius * 0.88, 256, 256, clampedRadius + 2.5);
		edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
		edgeGrad.addColorStop(1, 'rgba(4, 34, 23, 0)');
		ctx.fillStyle = edgeGrad;
		ctx.beginPath();
		ctx.arc(256, 256, clampedRadius + 2.5, 0, Math.PI * 2);
		ctx.fill();

		this.eyeTexture.needsUpdate = true;
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 15.0;
		this.opening = opts.opening;
		this.root.visible = true;

		// Approaching position safely outside window in the abyss
		this.root.position.set(-8.5, 0.1, -5.5);
		this.squidGroup.rotation.set(0, 0, 0);

		// Eye looks DEAD FORWARD
		this.eyePivot.rotation.set(0, 0, 0);
		this.currentPupilDilation = 0.2;
		this.targetPupilDilation = 0.2;
		this.renderEyeCanvas(58);

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

		// Siphon breathing contraction
		const breath = Math.sin(this.elapsed * 1.6);
		this.siphonMesh.scale.set(1.0 + breath * 0.15, 1.0 + breath * 0.12, 1.0 - breath * 0.12);

		// Photophore bioluminescent intensity pulsing
		const bioGlow = 0.8 + Math.sin(this.elapsed * 2.8) * 0.25;
		for (let i = 0; i < this.orbitalPhotophores.length; i++) {
			this.orbitalPhotophores[i].scale.setScalar(bioGlow);
		}

		// Mantle undulating swimming waves
		const mantleGeo = this.mantleMesh.geometry;
		const mantlePosAttr = mantleGeo.attributes.position as THREE.BufferAttribute;
		const numR = this.mantleRingCount;
		const numS = this.mantleRadialCount;
		const swimFreq = 1.6;

		for (let r = 0; r <= numR; r++) {
			const t = r / numR;
			const phase = this.elapsed * swimFreq - t * 4.2;
			const waveZ = Math.sin(phase) * (0.04 + t * 0.38);
			const waveY = Math.cos(phase * 0.8) * (0.035 * t);

			for (let s = 0; s <= numS; s++) {
				const idx = (r * (numS + 1) + s) * 3;
				const baseX = this.mantleBasePositions[idx];
				const baseY = this.mantleBasePositions[idx + 1];
				const baseZ = this.mantleBasePositions[idx + 2];

				mantlePosAttr.setXYZ(r * (numS + 1) + s, baseX, baseY + waveY, baseZ + waveZ);
			}
		}
		mantlePosAttr.needsUpdate = true;
		mantleGeo.computeVertexNormals();

		// Terminal diamond fins undulating smoothly
		this.terminalFins.rotation.x = Math.sin(this.elapsed * 1.8) * 0.2;
		this.terminalFins.rotation.z = Math.cos(this.elapsed * 1.3) * 0.1;

		// 8 Radial Arms undulating organically outward and framing the window
		for (let a = 0; a < this.arms.length; a++) {
			const arm = this.arms[a];
			for (let s = 0; s < arm.segments.length; s++) {
				const seg = arm.segments[s];
				const aPhase = this.elapsed * 1.5 + arm.phaseOffset + s * 0.45;
				const curlZ = Math.sin(aPhase) * (0.06 + s * 0.035);
				const curlX = Math.cos(aPhase * 0.8) * (0.05 + s * 0.03);
				seg.rotation.z = curlZ;
				seg.rotation.x = curlX;
			}
		}

		// 2 Feeding tentacles undulating
		for (let f = 0; f < this.feedingTentacles.length; f++) {
			const tent = this.feedingTentacles[f];
			for (let s = 0; s < tent.segments.length; s++) {
				const seg = tent.segments[s];
				const tPhase = this.elapsed * 1.2 + tent.phaseOffset + s * 0.38;
				seg.rotation.z = Math.sin(tPhase) * (0.05 + s * 0.025);
				seg.rotation.x = Math.cos(tPhase * 0.7) * 0.04;
			}
			tent.club.rotation.z = Math.sin(this.elapsed * 1.6 + f) * 0.2;
		}

		// -----------------------------------------------------------
		// 3-STAGE CHOREOGRAPHY: APPROACH -> GLORIOUS STARE -> DEPARTURE
		// -----------------------------------------------------------
		if (progress < 0.28) {
			// PHASE 1: Emergence from abyss directly towards window center
			const p = progress / 0.28;
			const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

			this.root.position.x = -8.5 + ease * 8.5;
			this.root.position.y = 0.1 + Math.sin(this.elapsed * 1.0) * 0.03;
			this.root.position.z = -5.5 + ease * 5.5;

			this.squidGroup.rotation.y = (1 - ease) * -0.08;
			this.targetPupilDilation = 0.25;
		} else if (progress <= 0.74) {
			// PHASE 2: Colossal Eye staring straight into the cabin through the glass!
			const obsP = (progress - 0.28) / 0.46;

			this.root.position.x = Math.sin(this.elapsed * 0.45) * 0.03;
			this.root.position.y = Math.cos(this.elapsed * 0.55) * 0.025;
			this.root.position.z = Math.sin(this.elapsed * 0.35) * 0.015;

			this.squidGroup.rotation.y = 0.0;
			this.squidGroup.rotation.x = Math.sin(this.elapsed * 0.6) * 0.01;
			this.squidGroup.rotation.z = Math.cos(this.elapsed * 0.5) * 0.01;

			// Cephalopod gaze: ALWAYS facing forward, pupil dilating dynamically on the single canvas!
			if (obsP < 0.2) {
				this.targetPupilDilation = 0.35;
			} else if (obsP < 0.65) {
				const dilatePhase = (obsP - 0.2) / 0.45;
				const dilationCurve = Math.sin(dilatePhase * Math.PI);

				// Smooth dilation (corresponds to 50px -> 100px, strictly inside iris 165px!)
				this.targetPupilDilation = 0.35 + dilationCurve * 0.65;

				if (!this.stareAudioTriggered && obsP > 0.35) {
					this.stareAudioTriggered = true;
					ctx.audio?.playDeepWaterSurge(0.75, pan);
					ctx.shake(0.04);
					ctx.lights.flicker(this.opening, 0.7);
				}
			} else if (obsP < 0.85) {
				const settleP = (obsP - 0.65) / 0.2;
				this.targetPupilDilation = 0.75 - settleP * 0.4;
			} else {
				this.targetPupilDilation = 0.25;
			}
		} else {
			// PHASE 3: Siphon pulse contraction and rapid glide back into abyss
			const depP = (progress - 0.74) / 0.26;
			const easeOut = depP * depP;

			this.root.position.x = easeOut * 9.5;
			this.root.position.y = -easeOut * 2.5;
			this.root.position.z = -easeOut * 7.5;

			this.squidGroup.rotation.y = easeOut * 0.25;
			this.squidGroup.rotation.x = easeOut * -0.15;

			this.targetPupilDilation = 0.15;

			if (!this.leaveAudioTriggered && depP > 0.06) {
				this.leaveAudioTriggered = true;
				ctx.audio?.playDeepWaterSurge(0.9, pan);
			}
		}

		// Interpolate dynamic pupil dilation and redraw canvas
		this.currentPupilDilation = THREE.MathUtils.lerp(
			this.currentPupilDilation,
			this.targetPupilDilation,
			dt * 4.5
		);
		// Min: 50px, Max: 105px (iris is 165px -> pupil is ALWAYS within the iris!)
		const targetPx = THREE.MathUtils.lerp(50, 105, this.currentPupilDilation);
		this.renderEyeCanvas(targetPx);

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.root.position.set(-8.5, 0.1, -5.5);
		this.squidGroup.rotation.set(0, 0, 0);

		this.eyePivot.rotation.set(0, 0, 0);
		this.currentPupilDilation = 0.2;
		this.targetPupilDilation = 0.2;
		this.renderEyeCanvas(58);

		this.stareAudioTriggered = false;
		this.leaveAudioTriggered = false;
	}
}
