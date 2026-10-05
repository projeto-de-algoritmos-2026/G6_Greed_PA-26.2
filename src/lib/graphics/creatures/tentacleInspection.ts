import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createTentacleSkinTexture, createMawFleshTexture } from '../textures/procedural';

interface SegmentNode {
	group: THREE.Group;
	bodyMesh: THREE.Mesh;
	keelMesh: THREE.Mesh;
	leftSucker: THREE.Group;
	rightSucker: THREE.Group;
	leftSuckerRim: THREE.Mesh;
	rightSuckerRim: THREE.Mesh;
	radius: number;
}

export class TentacleInspectionActor implements WindowEventActor {
	public readonly type = 'TENTACLE_INSPECTION';
	public readonly tier = 3 as const;
	public readonly openings = ['hatch'] as const;
	public readonly supportsJumpscare = false;
	public readonly root: THREE.Group;

	private tentacleContainer: THREE.Group;
	private segments: SegmentNode[] = [];
	private numSegments: number = 34;

	private elapsed: number = 0;
	private duration: number = 12.0;
	private opening: 'hatch' = 'hatch';
	private soundPlayed: boolean = false;
	private scratchAdded: boolean = false;

	constructor() {
		this.root = new THREE.Group();
		this.root.visible = false;

		this.tentacleContainer = new THREE.Group();
		this.root.add(this.tentacleContainer);

		const tentacleTex = createTentacleSkinTexture();
		const fleshTex = createMawFleshTexture();

		const skinMat = new THREE.MeshStandardMaterial({
			map: tentacleTex,
			color: 0x421222,
			roughness: 0.32,
			metalness: 0.18,
			emissive: 0x120308,
			emissiveIntensity: 0.35,
			bumpScale: 0.05
		});

		const suckerRimMat = new THREE.MeshStandardMaterial({
			map: fleshTex,
			color: 0x9e3048,
			roughness: 0.38,
			metalness: 0.1,
			emissive: 0x1a050c,
			emissiveIntensity: 0.25
		});

		const toothRingMat = new THREE.MeshStandardMaterial({
			color: 0xdceee8,
			roughness: 0.12,
			metalness: 0.55
		});

		const cavityMat = new THREE.MeshBasicMaterial({ color: 0x0a0104, side: THREE.DoubleSide });

		const keelMat = new THREE.MeshStandardMaterial({
			color: 0x54182b,
			transparent: true,
			opacity: 0.72,
			roughness: 0.45,
			side: THREE.DoubleSide
		});

		const segLen = 0.22;

		for (let s = 0; s < this.numSegments; s++) {
			const segProg = s / (this.numSegments - 1);

			const radius = 0.28 * Math.pow(1.0 - segProg, 0.75) + 0.035;

			const segGroup = new THREE.Group();

			const segGeo = new THREE.CylinderGeometry(radius * 0.94, radius, segLen, 14);

			segGeo.scale(1.2, 1.0, 0.85);
			const bodyMesh = new THREE.Mesh(segGeo, skinMat);
			segGroup.add(bodyMesh);

			const keelGeo = new THREE.PlaneGeometry(segLen * 0.95, radius * 0.85);
			keelGeo.rotateZ(Math.PI / 2);
			const keelMesh = new THREE.Mesh(keelGeo, keelMat);
			keelMesh.position.set(0, 0, -radius * 0.95);
			keelMesh.rotation.y = Math.PI / 2;
			segGroup.add(keelMesh);

			const suckerRadius = radius * 0.36;

			const leftSucker = this.buildSuctionCup(suckerRadius, suckerRimMat, toothRingMat, cavityMat);
			leftSucker.group.position.set(-radius * 0.42, segLen * 0.22, radius * 0.82);
			segGroup.add(leftSucker.group);

			const rightSucker = this.buildSuctionCup(suckerRadius, suckerRimMat, toothRingMat, cavityMat);
			rightSucker.group.position.set(radius * 0.42, -segLen * 0.22, radius * 0.82);
			segGroup.add(rightSucker.group);

			this.tentacleContainer.add(segGroup);

			this.segments.push({
				group: segGroup,
				bodyMesh,
				keelMesh,
				leftSucker: leftSucker.group,
				rightSucker: rightSucker.group,
				leftSuckerRim: leftSucker.rim,
				rightSuckerRim: rightSucker.rim,
				radius
			});
		}
	}

	private buildSuctionCup(
		radius: number,
		rimMat: THREE.Material,
		toothMat: THREE.Material,
		cavityMat: THREE.Material
	): { group: THREE.Group; rim: THREE.Mesh } {
		const group = new THREE.Group();

		const rimGeo = new THREE.TorusGeometry(radius, radius * 0.24, 10, 18);
		const rim = new THREE.Mesh(rimGeo, rimMat);
		rim.position.set(0, 0, 0);
		group.add(rim);

		const teeth = new THREE.Mesh(
			new THREE.TorusGeometry(radius * 0.68, radius * 0.08, 6, 16),
			toothMat
		);
		teeth.position.set(0, 0, -radius * 0.08);
		group.add(teeth);

		const cavity = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.65, 14), cavityMat);
		cavity.position.set(0, 0, -radius * 0.16);
		group.add(cavity);

		return { group, rim };
	}

	public start(ctx: EventContext, opts: StartOptions): void {
		this.elapsed = 0;
		this.duration = 12.0;
		this.opening = opts.opening;
		this.soundPlayed = false;
		this.scratchAdded = false;
		this.root.visible = true;

		this.updateSpine(0, 0, ctx);
	}

	public update(dt: number, ctx: EventContext): boolean {
		this.elapsed += dt;
		const progress = this.elapsed / this.duration;

		if (progress >= 1.0) {
			this.stop();
			return false;
		}

		this.updateSpine(progress, dt, ctx);
		return true;
	}

	private updateSpine(progress: number, dt: number, ctx: EventContext): void {

		let crawlIntensity = 0;
		let glassContact = 0;

		if (progress < 0.28) {

			const p = progress / 0.28;
			const ease = Math.sin((p * Math.PI) / 2);
			crawlIntensity = ease;
			glassContact = Math.max(0, (p - 0.5) * 2.0);

			if (p > 0.75 && !this.soundPlayed) {
				this.soundPlayed = true;
				ctx.audio?.playWindowScrape(ctx.pan(this.opening));
			}
		} else if (progress <= 0.76) {

			crawlIntensity = 1.0;
			glassContact = 1.0;

			if (!this.scratchAdded && progress > 0.45) {
				this.scratchAdded = true;
				ctx.glass(this.opening).addScratch(0.1, 0.0, 0.75);
			}

			if (Math.random() < 0.16) {
				ctx.shake(0.04);
			}
		} else {

			const leaveP = (progress - 0.76) / 0.24;
			const ease = leaveP * leaveP;
			crawlIntensity = Math.max(0, 1.0 - ease * 1.3);
			glassContact = Math.max(0, 1.0 - leaveP * 2.5);
		}

		const baseX = 2.75;
		const baseY = 2.45;
		const baseZ = -0.35;

		const waveTime = this.elapsed * 2.2;
		const tipTargetX = 0.8 - crawlIntensity * 2.6 + Math.sin(waveTime * 0.8) * 0.45;
		const tipTargetY = 1.2 - crawlIntensity * 2.2 + Math.cos(waveTime * 0.7) * 0.35;

		const numNodes = this.segments.length;
		const segPositions: THREE.Vector3[] = [];

		for (let s = 0; s < numNodes; s++) {
			const u = s / (numNodes - 1);

			const sinOffset1 = Math.sin(u * Math.PI * 2.2 - waveTime) * (0.45 * crawlIntensity * u);
			const sinOffset2 = Math.cos(u * Math.PI * 3.4 - waveTime * 1.3) * (0.22 * crawlIntensity * u);

			const x = THREE.MathUtils.lerp(baseX, tipTargetX, u) + sinOffset1;
			const y = THREE.MathUtils.lerp(baseY, tipTargetY, u) + sinOffset2;

			const r = this.segments[s].radius;

			const segContactWeight = Math.min(1.0, Math.max(0.0, (u - 0.15) * 1.8)) * glassContact;

			const oceanDepth = -0.35 - (1.0 - crawlIntensity) * 2.2 - Math.sin(u * Math.PI) * 0.35;
			const contactDepth = -0.018 - r;

			const targetZ = THREE.MathUtils.lerp(oceanDepth, contactDepth, segContactWeight);

			const maxAllowedZ = -0.018 - r;
			const clampedZ = Math.min(maxAllowedZ, targetZ);

			segPositions.push(new THREE.Vector3(x, y, clampedZ));
		}

		for (let s = 0; s < numNodes; s++) {
			const seg = this.segments[s];
			const pos = segPositions[s];

			seg.group.position.copy(pos);

			let tangent: THREE.Vector3;
			if (s < numNodes - 1) {
				tangent = new THREE.Vector3().subVectors(segPositions[s + 1], pos);
			} else {
				tangent = new THREE.Vector3().subVectors(pos, segPositions[s - 1]);
			}

			if (tangent.lengthSq() > 0.0001) {
				tangent.normalize();

				const up = new THREE.Vector3(0, 1, 0);
				const quat = new THREE.Quaternion().setFromUnitVectors(up, tangent);
				seg.group.quaternion.copy(quat);

			}

			const u = s / (numNodes - 1);
			const isTouchingGlass = glassContact > 0.6 && u > 0.25 && u < 0.92;
			const squash = isTouchingGlass ? 1.25 + Math.sin(this.elapsed * 5.0 + s) * 0.12 : 1.0;
			const zCompress = isTouchingGlass ? 0.65 : 1.0;

			seg.leftSuckerRim.scale.set(squash, squash, zCompress);
			seg.rightSuckerRim.scale.set(squash, squash, zCompress);
		}
	}

	public stop(): void {
		this.root.visible = false;
	}
}

