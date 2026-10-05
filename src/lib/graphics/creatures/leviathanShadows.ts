import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';

/**
 * Creates high-detail procedural skin for the shadow leviathan:
 * spectral abyssal dragon scales with metallic iridescence and deep indigo-black undertones.
 */
function createSerpentSkinTexture(tone: 'cyan' | 'amber'): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#04080c';
	ctx.fillRect(0, 0, 512, 512);

	// Spectral subcutaneous gradient
	for (let i = 0; i < 100; i++) {
		const x = Math.random() * 512;
		const y = Math.random() * 512;
		const r = 20 + Math.random() * 65;
		const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
		if (tone === 'cyan') {
			grad.addColorStop(0, 'rgba(10, 42, 45, 0.45)');
			grad.addColorStop(0.6, 'rgba(4, 18, 22, 0.25)');
		} else {
			grad.addColorStop(0, 'rgba(45, 30, 10, 0.45)');
			grad.addColorStop(0.6, 'rgba(22, 14, 4, 0.25)');
		}
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}

	// Micro-scale diamond skin texture
	ctx.strokeStyle = tone === 'cyan' ? 'rgba(0, 255, 200, 0.05)' : 'rgba(255, 180, 50, 0.05)';
	ctx.lineWidth = 1;
	const step = 16;
	for (let y = 0; y < 512; y += step) {
		for (let x = 0; x < 512; x += step) {
			const ox = (Math.floor(y / step) % 2) * (step / 2);
			ctx.strokeRect(x + ox, y, step * 0.9, step * 0.9);
		}
	}

	// Bioluminescent photophore pore nodes
	for (let p = 0; p < 180; p++) {
		const px = Math.random() * 512;
		const py = Math.random() * 512;
		const pr = 1.0 + Math.random() * 2.2;
		ctx.fillStyle = tone === 'cyan' ? 'rgba(80, 255, 220, 0.35)' : 'rgba(255, 200, 90, 0.35)';
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

interface SegmentNode {
	group: THREE.Group;
	bodyMesh: THREE.Mesh;
	dorsalRay?: THREE.Mesh;
	photophore?: THREE.Mesh;
	baseScale: number;
}

interface LeviathanCreature {
	root: THREE.Group;
	head: THREE.Group;
	segments: SegmentNode[];
	pelvicStreamers: THREE.Mesh[];
	chinBarbel: THREE.Group;
	eyeLight: THREE.PointLight;
	eyes: THREE.Mesh[];
	photophores: THREE.Mesh[];
	swimSpeed: number;
	waveFreq: number;
	waveAmp: number;
	direction: number;
	baseY: number;
	baseZ: number;
	tone: 'cyan' | 'amber';
}

export class LeviathanShadowsActor implements WindowEventActor {
	public readonly type = 'LEVIATHAN_SHADOWS';
	public readonly tier = 1 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private leviathan1: LeviathanCreature;
	private leviathan2: LeviathanCreature;

	private elapsed: number = 0;
	private duration: number = 14.0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		const createLeviathan = (
			tone: 'cyan' | 'amber',
			swimSpeed: number,
			direction: number,
			baseY: number,
			baseZ: number
		): LeviathanCreature => {
			const group = new THREE.Group();
			const skinTex = createSerpentSkinTexture(tone);

			const mainColor = tone === 'cyan' ? 0x050e14 : 0x0a0906;
			const glowColor = tone === 'cyan' ? 0x00ffcc : 0xffaa22;
			const emissiveColor = tone === 'cyan' ? 0x00c899 : 0xcc7711;

			const skinMat = new THREE.MeshStandardMaterial({
				map: skinTex,
				color: mainColor,
				roughness: 0.58,
				metalness: 0.38
			});

			const finMat = new THREE.MeshStandardMaterial({
				color: mainColor,
				roughness: 0.3,
				metalness: 0.2,
				transparent: true,
				opacity: 0.78,
				side: THREE.DoubleSide
			});

			const toothMat = new THREE.MeshStandardMaterial({
				color: 0xccf0ea,
				roughness: 0.1,
				metalness: 0.45,
				transparent: true,
				opacity: 0.92
			});

			const eyeMat = new THREE.MeshStandardMaterial({
				color: glowColor,
				emissive: emissiveColor,
				emissiveIntensity: 2.8,
				roughness: 0.12,
				metalness: 0.85
			});

			const photoMat = new THREE.MeshBasicMaterial({
				color: glowColor
			});

			// -------------------------------------------------------
			// 1. MASSIVE, IMPOSING APEX PREDATOR SKULL (Dunkleosteus/Dragon)
			// Proportional, dominant, and terrifying head
			// -------------------------------------------------------
			const head = new THREE.Group();
			group.add(head);

			// Massive upper cranium: length ~6.2m, height ~2.4m, width ~2.2m
			const skullGeo = new THREE.CylinderGeometry(0.85, 2.3, 6.2, 14, 4);
			skullGeo.rotateZ(-Math.PI / 2);
			skullGeo.scale(1.05, 0.75, 0.85);

			const sPos = skullGeo.attributes.position as THREE.BufferAttribute;
			for (let i = 0; i < sPos.count; i++) {
				let x = sPos.getX(i);
				let y = sPos.getY(i);
				let z = sPos.getZ(i);

				// Heavy, armored snout & brow ridges
				if (x > 1.2) {
					y *= 0.82;
					z *= 0.78;
				}
				// Brow crest above eyes
				if (x > 0.2 && x < 1.8 && y > 0.4) {
					y += 0.28;
				}
				sPos.setXYZ(i, x, y, z);
			}
			skullGeo.computeVertexNormals();

			const skullMesh = new THREE.Mesh(skullGeo, skinMat);
			skullMesh.position.set(2.8, 0.2, 0);
			head.add(skullMesh);

			// Heavy armored occipital horn crests radiating back from skull
			for (let c = 0; c < 6; c++) {
				const cLen = 2.2 + Math.sin((c / 5) * Math.PI) * 2.4;
				const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, cLen, 5), skinMat);
				horn.position.set(1.2 - c * 0.45, 1.4 + cLen * 0.45, 0);
				horn.rotation.z = -0.45 - c * 0.12;
				horn.rotation.x = (c % 2 === 0 ? 1 : -1) * 0.15;
				head.add(horn);

				// Glowing photophore on horn tip
				const drop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), photoMat);
				drop.position.set(0, cLen * 0.5, 0);
				horn.add(drop);
			}

			// Massive predatory eyes in heavy bony orbits
			const eyes: THREE.Mesh[] = [];
			for (const zSide of [0.95, -0.95]) {
				const eyeSocket = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.14, 10, 20), skinMat);
				eyeSocket.position.set(3.4, 0.65, zSide);
				eyeSocket.rotation.y = zSide > 0 ? 0.35 : -0.35;
				head.add(eyeSocket);

				const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), eyeMat);
				eyeBall.position.set(3.4, 0.65, zSide);
				eyes.push(eyeBall);
				head.add(eyeBall);
			}

			const eyeLight = new THREE.PointLight(glowColor, 2.6, 9.0, 1.4);
			eyeLight.position.set(4.2, 0.6, 0);
			head.add(eyeLight);

			// Gaping, massive predatory lower jaw
			const lowerJaw = new THREE.Group();
			lowerJaw.position.set(1.2, -0.55, 0);
			head.add(lowerJaw);

			const jawStrut = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 1.4), skinMat);
			jawStrut.position.set(1.8, -0.15, 0);
			lowerJaw.add(jawStrut);

			// Giant interlocking fangs & sabre teeth
			const fangData = [
				{ x: 3.8, len: 0.95, rad: 0.08 }, // Giant anterior sabre fang
				{ x: 3.2, len: 0.75, rad: 0.065 },
				{ x: 2.6, len: 0.85, rad: 0.07 },
				{ x: 2.0, len: 0.65, rad: 0.055 },
				{ x: 1.4, len: 0.55, rad: 0.05 },
				{ x: 0.8, len: 0.45, rad: 0.045 }
			];

			for (const fd of fangData) {
				for (const side of [0.55, -0.55]) {
					// Lower fang
					const lFang = new THREE.Mesh(new THREE.ConeGeometry(fd.rad, fd.len, 5), toothMat);
					lFang.position.set(fd.x, 0.15 + fd.len * 0.45, side);
					lFang.rotation.z = 0.22;
					lFang.rotation.x = side > 0 ? 0.15 : -0.15;
					lowerJaw.add(lFang);

					// Upper fang
					const uFang = new THREE.Mesh(new THREE.ConeGeometry(fd.rad * 0.9, fd.len * 0.9, 5), toothMat);
					uFang.position.set(fd.x + 0.35, -0.45 - fd.len * 0.4, side * 0.95);
					uFang.rotation.z = -0.25;
					uFang.rotation.x = side > 0 ? -0.15 : 0.15;
					head.add(uFang);
				}
			}

			// Long chin barbel
			const chinBarbel = new THREE.Group();
			chinBarbel.position.set(4.2, -0.7, 0);
			lowerJaw.add(chinBarbel);

			const bStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 2.2, 6), skinMat);
			bStem.position.set(0, -1.1, 0);
			chinBarbel.add(bStem);

			const bTip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), photoMat);
			bTip.position.set(0, -2.2, 0);
			chinBarbel.add(bTip);

			// Trailing pelvic streamers
			const pelvicStreamers: THREE.Mesh[] = [];
			for (const side of [1, -1]) {
				const streamerGeo = new THREE.CylinderGeometry(0.035, 0.015, 6.2, 6);
				streamerGeo.translate(0, -3.1, 0);
				const streamer = new THREE.Mesh(streamerGeo, finMat);
				streamer.position.set(0.5, -0.9, side * 1.2);
				streamer.rotation.z = 0.55;
				streamer.rotation.x = side * 0.28;
				head.add(streamer);
				pelvicStreamers.push(streamer);

				const paddle = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 4), photoMat);
				paddle.position.set(0, -6.2, 0);
				paddle.scale.set(1.0, 1.0, 0.1);
				streamer.add(paddle);
			}

			// -------------------------------------------------------
			// 2. Muscular Tapering Serpentine Body (18 segments)
			// Smoothly connects from massive head (s=0) and tapers gracefully to tail
			// -------------------------------------------------------
			const numSegs = 18;
			const totalLength = 24.0;
			const segSpacing = totalLength / numSegs;
			const segments: SegmentNode[] = [];
			const photophores: THREE.Mesh[] = [];

			for (let s = 0; s < numSegs; s++) {
				const t = s / (numSegs - 1);
				const sGroup = new THREE.Group();
				sGroup.position.set(-s * segSpacing, 0, 0);
				group.add(sGroup);

				// Proportional scaling: connects seamlessly to the massive head
				// Near head (t=0): height ~2.8m, width ~2.0m
				// Near tail (t=1): height ~0.4m, width ~0.2m
				const sScale = Math.pow(1.0 - t * 0.85, 0.85);
				const height = 2.8 * sScale;
				const width = 2.0 * sScale;

				const bGeo = new THREE.CylinderGeometry(width * 0.9, width, segSpacing * 1.05, 12, 1);
				bGeo.rotateZ(Math.PI / 2);
				bGeo.scale(1.0, height / width, 1.0);
				const bodyMesh = new THREE.Mesh(bGeo, skinMat);
				sGroup.add(bodyMesh);

				// Dorsal fin ray
				const rayHeight = 1.3 * sScale + 0.3;
				const rayGeo = new THREE.ConeGeometry(0.035, rayHeight, 4);
				const dorsalRay = new THREE.Mesh(rayGeo, finMat);
				dorsalRay.position.set(0, height * 0.52 + rayHeight * 0.45, 0);
				dorsalRay.rotation.z = -0.22;
				sGroup.add(dorsalRay);

				const finSlab = new THREE.Mesh(new THREE.PlaneGeometry(segSpacing * 1.05, rayHeight * 0.85), finMat);
				finSlab.position.set(0, height * 0.52 + rayHeight * 0.35, 0);
				finSlab.rotation.y = Math.PI / 2;
				sGroup.add(finSlab);

				// Ventral photophore chain
				let photophore: THREE.Mesh | undefined;
				if (s % 2 === 0) {
					for (const side of [0.45 * sScale, -0.45 * sScale]) {
						const pNode = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), photoMat);
						pNode.position.set(0, -height * 0.52, side);
						sGroup.add(pNode);
						photophores.push(pNode);
					}
					photophore = photophores[photophores.length - 1];
				}

				if (s === numSegs - 1) {
					const tailBladeGeo = new THREE.BoxGeometry(segSpacing * 1.8, 2.8, 0.1);
					const tailBlade = new THREE.Mesh(tailBladeGeo, finMat);
					tailBlade.position.set(-segSpacing * 0.85, 0, 0);
					sGroup.add(tailBlade);
				}

				segments.push({
					group: sGroup,
					bodyMesh,
					dorsalRay,
					photophore,
					baseScale: sScale
				});
			}

			if (direction < 0) {
				group.rotation.y = Math.PI;
			}

			return {
				root: group,
				head,
				segments,
				pelvicStreamers,
				chinBarbel,
				eyeLight,
				eyes,
				photophores,
				swimSpeed,
				waveFreq: 2.1,
				waveAmp: 0.55,
				direction,
				baseY,
				baseZ,
				tone
			};
		};

		// Leviathan 1: Glides left-to-right at middle distance (-9.5m), piercing ghostly cyan glow
		this.leviathan1 = createLeviathan('cyan', 56.0, 1, 1.5, -9.5);

		// Leviathan 2: Glides right-to-left deeper in the gloom (-14.0m), spectral amber glow
		this.leviathan2 = createLeviathan('amber', 56.0, -1, -2.5, -14.0);

		this.root.add(this.leviathan1.root, this.leviathan2.root);
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 14.0;
		this.root.visible = true;

		this.leviathan1.root.position.set(-28.0, this.leviathan1.baseY, this.leviathan1.baseZ);
		this.leviathan1.root.rotation.set(0, 0, 0);

		this.leviathan2.root.position.set(28.0, this.leviathan2.baseY, this.leviathan2.baseZ);
		this.leviathan2.root.rotation.set(0, Math.PI, 0);

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playDeepWaterSurge(0.7, pan);
	}

	public update(dt: number, _ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		this.updateSerpent(this.leviathan1, progress, dt);
		this.updateSerpent(this.leviathan2, progress, dt);

		return true;
	}

	private updateSerpent(lev: LeviathanCreature, progress: number, _dt: number): void {
		if (lev.direction > 0) {
			lev.root.position.x = -28.0 + progress * lev.swimSpeed;
			lev.root.position.y = lev.baseY + Math.sin(this.elapsed * 1.1) * 0.45;
			lev.root.rotation.z = Math.sin(this.elapsed * 1.4) * 0.04;
		} else {
			lev.root.position.x = 28.0 - progress * lev.swimSpeed;
			lev.root.position.y = lev.baseY + Math.cos(this.elapsed * 0.95) * 0.55;
			lev.root.rotation.z = Math.cos(this.elapsed * 1.2) * 0.04;
		}

		const k = 0.38;
		const omega = lev.waveFreq;

		for (let s = 0; s < lev.segments.length; s++) {
			const seg = lev.segments[s];
			const tNorm = s / (lev.segments.length - 1);

			const currentAmp = lev.waveAmp * (0.18 + tNorm * 1.15);
			const phase = this.elapsed * omega - s * k;

			seg.group.position.z = Math.sin(phase) * currentAmp;
			seg.group.rotation.y = Math.cos(phase) * (currentAmp * 0.45);
			seg.group.rotation.x = Math.sin(phase * 0.5) * 0.08;

			if (seg.dorsalRay) {
				seg.dorsalRay.rotation.z = -0.22 + Math.sin(phase * 1.5) * 0.25;
			}
		}

		const headPhase = this.elapsed * omega;
		lev.head.rotation.y = Math.cos(headPhase) * 0.12;
		lev.head.rotation.z = Math.sin(headPhase * 0.7) * 0.04;

		lev.chinBarbel.rotation.z = Math.sin(this.elapsed * 1.8) * 0.22;
		lev.chinBarbel.rotation.x = Math.cos(this.elapsed * 1.4) * 0.15;

		for (let i = 0; i < lev.pelvicStreamers.length; i++) {
			const str = lev.pelvicStreamers[i];
			str.rotation.z = 0.55 + Math.sin(this.elapsed * 1.6 + i * 0.5) * 0.15;
		}

		const photoGlow = 1.4 + Math.sin(this.elapsed * 4.0) * 0.6;
		lev.eyeLight.intensity = 2.0 + Math.sin(this.elapsed * 3.5) * 0.8;
		for (let p = 0; p < lev.photophores.length; p++) {
			(lev.photophores[p].material as THREE.MeshBasicMaterial).opacity = photoGlow;
		}
	}

	public stop(): void {
		this.root.visible = false;
	}
}
