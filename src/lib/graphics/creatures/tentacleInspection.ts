import * as THREE from 'three';
import type { WindowEventActor, EventContext, StartOptions } from '../types';
import { createTentacleSkinTexture, createMawFleshTexture } from '../textures/procedural';

const _tangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

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
	private cachedSegPositions: THREE.Vector3[] = [];
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
			this.cachedSegPositions.push(new THREE.Vector3());
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

	/**
	 * Calculates the exterior surface Z of the submarine hull in hatchPivot coordinates.
	 * Prevents tentacle segments from clipping into the curved cabin ceiling above the window.
	 */
	private getHullExteriorZ(y: number): number {
		// Window opening extends between y = -1.18 and +1.18
		if (y <= 1.18 && y >= -1.18) {
			return 0.0;
		}
		// Submarine hull is a cylinder centered at cabin Y = -0.6, radius ~5.25.
		// In hatchPivot space: Y_cabin = y + 0.95 => dY = y + 1.55.
		const dY = Math.abs(y + 1.55);
		const hullRadius = 5.25;
		if (dY < hullRadius) {
			const xCabin = Math.sqrt(hullRadius * hullRadius - dY * dY);
			// hatchPivot is at X = 4.75 in cabin
			return xCabin - 4.75;
		}
		return -2.5;
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
				ctx.glass(this.opening).addScratch(0.1, 0.0, 0.75, 'TENTACLE_INSPECTION');
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

		// Base anchored on the exterior of the hull above the window frame
		const baseX = 2.65;
		const baseY = 1.95;
		const baseZ = this.getHullExteriorZ(baseY) - 0.55;

		const waveTime = this.elapsed * 2.2;
		const tipTargetX = 0.8 - crawlIntensity * 2.6 + Math.sin(waveTime * 0.8) * 0.45;
		const tipTargetY = 1.2 - crawlIntensity * 2.2 + Math.cos(waveTime * 0.7) * 0.35;

		const numNodes = this.segments.length;

		for (let s = 0; s < numNodes; s++) {
			const u = s / (numNodes - 1);

			const sinOffset1 = Math.sin(u * Math.PI * 2.2 - waveTime) * (0.45 * crawlIntensity * u);
			const sinOffset2 = Math.cos(u * Math.PI * 3.4 - waveTime * 1.3) * (0.22 * crawlIntensity * u);

			const x = THREE.MathUtils.lerp(baseX, tipTargetX, u) + sinOffset1;
			const y = THREE.MathUtils.lerp(baseY, tipTargetY, u) + sinOffset2;

			const r = this.segments[s].radius;

			const segContactWeight = Math.min(1.0, Math.max(0.0, (u - 0.15) * 1.8)) * glassContact;

			const hullZ = this.getHullExteriorZ(y);
			const oceanDepth = Math.min(hullZ - 0.45, -0.65 - (1.0 - crawlIntensity) * 2.2 - Math.sin(u * Math.PI) * 0.35);
			const contactDepth = -0.018 - r;

			const targetZ = THREE.MathUtils.lerp(oceanDepth, contactDepth, segContactWeight);

			// Strict clamp: never allow penetration through window glass OR curved cabin ceiling hull
			const maxAllowedZ = Math.min(-0.018 - r, hullZ - r - 0.05);
			const clampedZ = Math.min(maxAllowedZ, targetZ);

			this.cachedSegPositions[s].set(x, y, clampedZ);
		}

		for (let s = 0; s < numNodes; s++) {
			const seg = this.segments[s];
			const pos = this.cachedSegPositions[s];

			seg.group.position.copy(pos);

			if (s < numNodes - 1) {
				_tangent.subVectors(this.cachedSegPositions[s + 1], pos);
			} else {
				_tangent.subVectors(pos, this.cachedSegPositions[s - 1]);
			}

			if (_tangent.lengthSq() > 0.0001) {
				_tangent.normalize();
				_quat.setFromUnitVectors(_up, _tangent);
				seg.group.quaternion.copy(_quat);
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

