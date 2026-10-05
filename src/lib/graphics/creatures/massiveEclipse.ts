import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createAbyssalSkinTexture, createBasaltRockTexture } from '../textures/procedural';

export class MassiveEclipseActor implements WindowEventActor {
	public readonly type = 'MASSIVE_ECLIPSE';
	public readonly tier = 2 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private titanGroup: THREE.Group;
	private gillFlaps: THREE.Mesh[] = [];
	private barnacleClusters: THREE.Group;
	private lateralSensors: THREE.Mesh[] = [];

	private elapsed: number = 0;
	private duration: number = 13.0;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.titanGroup = new THREE.Group();
		this.root.add(this.titanGroup);

		const skinTex = createAbyssalSkinTexture();
		const basaltTex = createBasaltRockTexture();

		const titanSkinMat = new THREE.MeshStandardMaterial({
			map: skinTex,
			color: 0x061116,
			roughness: 0.88,
			metalness: 0.18,
			side: THREE.FrontSide
		});

		const barnacleMat = new THREE.MeshStandardMaterial({
			map: basaltTex,
			color: 0x1e2c2a,
			roughness: 0.95,
			metalness: 0.08
		});

		const titanWidth = 36.0;
		const titanHeight = 16.0;
		const titanGeo = new THREE.PlaneGeometry(titanWidth, titanHeight, 36, 16);
		const posAttr = titanGeo.attributes.position as THREE.BufferAttribute;

		for (let i = 0; i < posAttr.count; i++) {
			const x = posAttr.getX(i);
			const y = posAttr.getY(i);

			const normX = x / (titanWidth * 0.5);
			const normY = y / (titanHeight * 0.5);
			const curveDepth = -(normX * normX * 2.8 + normY * normY * 2.4);
			posAttr.setZ(i, curveDepth);
		}
		titanGeo.computeVertexNormals();

		const titanMesh = new THREE.Mesh(titanGeo, titanSkinMat);
		titanMesh.position.set(0, 0, 0);
		this.titanGroup.add(titanMesh);

		const gillMat = new THREE.MeshStandardMaterial({
			color: 0x140306,
			roughness: 0.6,
			metalness: 0.1
		});

		for (let g = 0; g < 3; g++) {
			const gx = -4.2 + g * 2.4;
			const gillGeo = new THREE.BoxGeometry(0.45, 3.8, 0.35);
			const gill = new THREE.Mesh(gillGeo, gillMat);

			const normX = gx / (titanWidth * 0.5);
			const surfZ = -(normX * normX * 2.8) + 0.12;
			gill.position.set(gx, 0.4, surfZ);
			this.gillFlaps.push(gill);
			this.titanGroup.add(gill);
		}

		this.barnacleClusters = new THREE.Group();
		for (let b = 0; b < 32; b++) {
			const bx = (Math.random() - 0.5) * 24.0;
			const by = (Math.random() - 0.5) * 6.5;
			const normX = bx / (titanWidth * 0.5);
			const normY = by / (titanHeight * 0.5);
			const surfZ = -(normX * normX * 2.8 + normY * normY * 2.4) + 0.14;

			const bGeo = new THREE.ConeGeometry(0.12 + Math.random() * 0.18, 0.32, 6);
			bGeo.rotateX(Math.PI / 2);
			const bMesh = new THREE.Mesh(bGeo, barnacleMat);
			bMesh.position.set(bx, by, surfZ);
			this.barnacleClusters.add(bMesh);
		}
		this.titanGroup.add(this.barnacleClusters);

		const poreMat = new THREE.MeshStandardMaterial({
			color: 0x00ffcc,
			emissive: 0x00cc99,
			emissiveIntensity: 0.85
		});
		const poreGeo = new THREE.SphereGeometry(0.065, 8, 8);

		for (let p = -16.0; p <= 16.0; p += 1.4) {
			const normX = p / (titanWidth * 0.5);
			const normY = -0.6 / (titanHeight * 0.5);
			const surfZ = -(normX * normX * 2.8 + normY * normY * 2.4) + 0.15;

			const pore = new THREE.Mesh(poreGeo, poreMat);
			pore.position.set(p, -0.6, surfZ);
			this.lateralSensors.push(pore);
			this.titanGroup.add(pore);
		}
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 13.0;
		this.root.visible = true;

		this.titanGroup.position.set(-24.0, 0.0, -4.2);

		const pan = ctx.pan(opts.opening);
		ctx.audio?.playDeepWaterSurge(0.85, pan);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			ctx.lights.setLevel('hatch', 1.0);
			this.stop();
			return false;
		}

		this.titanGroup.position.x = -24.0 + progress * 48.0;
		this.titanGroup.position.y = Math.sin(this.elapsed * 0.55) * 0.22;

		this.titanGroup.position.z = -4.2 + Math.sin(this.elapsed * 0.75) * 0.12;

		const gillBreathing = Math.sin(this.elapsed * 1.8);
		for (let i = 0; i < this.gillFlaps.length; i++) {
			this.gillFlaps[i].scale.z = 1.0 + gillBreathing * 0.45;
		}

		if (progress > 0.18 && progress < 0.82) {
			const eclipseCurve = Math.sin(((progress - 0.18) / 0.64) * Math.PI);
			const lightLevel = Math.max(0.04, 1.0 - eclipseCurve * 0.96);
			ctx.lights.setLevel('hatch', lightLevel);

			if (Math.random() < 0.2) {
				ctx.shake(0.06);
			}
		} else {
			ctx.lights.setLevel('hatch', 1.0);
		}

		return true;
	}

	public stop(): void {
		this.root.visible = false;
		this.titanGroup.position.set(-24.0, 0.0, -4.2);
	}
}

