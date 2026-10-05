import * as THREE from 'three';
import type { ScenePhase } from '../types';

export class MarineParticles {
	public readonly group: THREE.Group;
	public readonly snowMesh: THREE.Points;
	public readonly ventSmokeMesh: THREE.Points;
	public readonly ventSparkMesh: THREE.Points;
	public readonly biolumMesh: THREE.Points;
	public readonly cherenkovMoteMesh: THREE.Points;

	private smokeVelocities: Float32Array;
	private sparkVelocities: Float32Array;
	private biolumBasePositions: Float32Array;
	private cherenkovVelocities: Float32Array;
	private currentPhase: ScenePhase = 1;

	constructor() {
		this.group = new THREE.Group();

		const snowCount = 450;
		const snowGeo = new THREE.BufferGeometry();
		const snowPos = new Float32Array(snowCount * 3);

		for (let i = 0; i < snowCount * 3; i += 3) {
			snowPos[i] = (Math.random() - 0.5) * 12.0;
			snowPos[i + 1] = -2.5 + Math.random() * 6.5;
			snowPos[i + 2] = -1.0 - Math.random() * 22.0;
		}
		snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
		this.snowMesh = new THREE.Points(
			snowGeo,
			new THREE.PointsMaterial({
				color: 0xa0c8e0,
				size: 0.055,
				transparent: true,
				opacity: 0.65,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			})
		);
		this.group.add(this.snowMesh);

		const smokeCount = 220;
		const smokeGeo = new THREE.BufferGeometry();
		const smokePos = new Float32Array(smokeCount * 3);
		this.smokeVelocities = new Float32Array(smokeCount * 3);

		for (let i = 0; i < smokeCount; i++) {
			smokePos[i * 3] = -1.8 + (Math.random() - 0.5) * 0.4;
			smokePos[i * 3 + 1] = -0.25 + Math.random() * 3.5;
			smokePos[i * 3 + 2] = -8.0 + (Math.random() - 0.5) * 0.4;

			this.smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.09;
			this.smokeVelocities[i * 3 + 1] = 0.32 + Math.random() * 0.4;
			this.smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.09;
		}
		smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
		this.ventSmokeMesh = new THREE.Points(
			smokeGeo,
			new THREE.PointsMaterial({
				color: 0x14181c,
				size: 0.095,
				transparent: true,
				opacity: 0.65,
				blending: THREE.NormalBlending,
				depthWrite: false
			})
		);
		this.group.add(this.ventSmokeMesh);

		const sparkCount = 45;
		const sparkGeo = new THREE.BufferGeometry();
		const sparkPos = new Float32Array(sparkCount * 3);
		this.sparkVelocities = new Float32Array(sparkCount * 3);

		for (let i = 0; i < sparkCount; i++) {
			sparkPos[i * 3] = -1.8 + (Math.random() - 0.5) * 0.25;
			sparkPos[i * 3 + 1] = -0.25 + Math.random() * 2.2;
			sparkPos[i * 3 + 2] = -8.0 + (Math.random() - 0.5) * 0.25;

			this.sparkVelocities[i * 3] = (Math.random() - 0.5) * 0.12;
			this.sparkVelocities[i * 3 + 1] = 0.45 + Math.random() * 0.55;
			this.sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
		}
		sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
		this.ventSparkMesh = new THREE.Points(
			sparkGeo,
			new THREE.PointsMaterial({
				color: 0xffaa33,
				size: 0.045,
				transparent: true,
				opacity: 0.85,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			})
		);
		this.group.add(this.ventSparkMesh);

		const bioCount = 75;
		const bioGeo = new THREE.BufferGeometry();
		const bioPos = new Float32Array(bioCount * 3);
		this.biolumBasePositions = new Float32Array(bioCount * 3);

		for (let i = 0; i < bioCount; i++) {
			const bx = (Math.random() - 0.5) * 9.0;
			const by = -2.2 + Math.random() * 4.5;
			const bz = -2.0 - Math.random() * 14.0;
			bioPos[i * 3] = bx;
			bioPos[i * 3 + 1] = by;
			bioPos[i * 3 + 2] = bz;
			this.biolumBasePositions[i * 3] = bx;
			this.biolumBasePositions[i * 3 + 1] = by;
			this.biolumBasePositions[i * 3 + 2] = bz;
		}
		bioGeo.setAttribute('position', new THREE.BufferAttribute(bioPos, 3));
		this.biolumMesh = new THREE.Points(
			bioGeo,
			new THREE.PointsMaterial({
				color: 0x44ffaa,
				size: 0.065,
				transparent: true,
				opacity: 0.75,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			})
		);
		this.group.add(this.biolumMesh);

		const cherenkovCount = 80;
		const cherenkovGeo = new THREE.BufferGeometry();
		const cherenkovPos = new Float32Array(cherenkovCount * 3);
		this.cherenkovVelocities = new Float32Array(cherenkovCount * 3);

		for (let i = 0; i < cherenkovCount; i++) {
			cherenkovPos[i * 3] = -1.2 + (Math.random() - 0.5) * 2.5;
			cherenkovPos[i * 3 + 1] = -1.8 + Math.random() * 2.8;
			cherenkovPos[i * 3 + 2] = -10.5 + (Math.random() - 0.5) * 2.5;

			this.cherenkovVelocities[i * 3] = (Math.random() - 0.5) * 0.08;
			this.cherenkovVelocities[i * 3 + 1] = 0.05 + Math.random() * 0.12;
			this.cherenkovVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
		}
		cherenkovGeo.setAttribute('position', new THREE.BufferAttribute(cherenkovPos, 3));
		this.cherenkovMoteMesh = new THREE.Points(
			cherenkovGeo,
			new THREE.PointsMaterial({
				color: 0x00f0ff,
				size: 0.05,
				transparent: true,
				opacity: 0.8,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			})
		);
		this.group.add(this.cherenkovMoteMesh);

		this.setPhase(1);
	}

	public setPhase(phase: ScenePhase): void {
		this.currentPhase = phase;

		this.ventSmokeMesh.visible = phase === 1;
		this.ventSparkMesh.visible = phase === 1;
		this.biolumMesh.visible = phase === 2;
		this.cherenkovMoteMesh.visible = phase === 3;

		const snowMat = this.snowMesh.material as THREE.PointsMaterial;
		if (phase === 1) {
			snowMat.color.set(0x92c2dc);
			snowMat.size = 0.052;
			snowMat.opacity = 0.65;
		} else if (phase === 2) {
			snowMat.color.set(0x72a898);
			snowMat.size = 0.058;
			snowMat.opacity = 0.55;
		} else {

			snowMat.color.set(0xb0c0cc);
			snowMat.size = 0.042;
			snowMat.opacity = 0.72;
		}
	}

	public update(delta: number, elapsedTime: number): void {

		const sPos = this.snowMesh.geometry.attributes.position as THREE.BufferAttribute;
		const sArr = sPos.array as Float32Array;
		const fallSpeed = this.currentPhase === 3 ? 0.08 : 0.13;
		const swayIntensity = this.currentPhase === 2 ? 0.06 : 0.035;

		for (let i = 0; i < sArr.length; i += 3) {
			sArr[i] += Math.sin(elapsedTime * 0.7 + i * 0.1) * delta * swayIntensity;
			sArr[i + 1] -= delta * fallSpeed;
			if (sArr[i + 1] < -2.8) {
				sArr[i + 1] += 6.5;
				sArr[i] = (Math.random() - 0.5) * 12.0;
				sArr[i + 2] = -1.0 - Math.random() * 22.0;
			}
			if (sArr[i + 2] > -0.8) {
				sArr[i + 2] = -0.8 - Math.random() * 2.0;
			}
		}
		sPos.needsUpdate = true;

		if (this.currentPhase === 1) {
			const vPos = this.ventSmokeMesh.geometry.attributes.position as THREE.BufferAttribute;
			const vArr = vPos.array as Float32Array;
			for (let i = 0; i < vArr.length; i += 3) {
				vArr[i] += Math.sin(elapsedTime * 1.5 + i) * delta * 0.11;
				vArr[i + 1] += this.smokeVelocities[i + 1] * delta;
				vArr[i + 2] += Math.cos(elapsedTime * 1.2 + i) * delta * 0.09;
				if (vArr[i + 1] > 3.6) {
					vArr[i] = -1.8 + (Math.random() - 0.5) * 0.35;
					vArr[i + 1] = -0.25;
					vArr[i + 2] = -8.0 + (Math.random() - 0.5) * 0.35;
				}
			}
			vPos.needsUpdate = true;

			const spPos = this.ventSparkMesh.geometry.attributes.position as THREE.BufferAttribute;
			const spArr = spPos.array as Float32Array;
			for (let i = 0; i < spArr.length; i += 3) {
				spArr[i] += Math.sin(elapsedTime * 3.0 + i) * delta * 0.08;
				spArr[i + 1] += this.sparkVelocities[i + 1] * delta;
				spArr[i + 2] += Math.cos(elapsedTime * 2.5 + i) * delta * 0.08;
				if (spArr[i + 1] > 2.8) {
					spArr[i] = -1.8 + (Math.random() - 0.5) * 0.2;
					spArr[i + 1] = -0.25;
					spArr[i + 2] = -8.0 + (Math.random() - 0.5) * 0.2;
				}
			}
			spPos.needsUpdate = true;
		}

		if (this.currentPhase === 2) {
			const bPos = this.biolumMesh.geometry.attributes.position as THREE.BufferAttribute;
			const bArr = bPos.array as Float32Array;
			for (let i = 0; i < bArr.length; i += 3) {
				const idx = i / 3;
				bArr[i] = this.biolumBasePositions[i] + Math.sin(elapsedTime * 0.8 + idx) * 0.45;
				bArr[i + 1] = this.biolumBasePositions[i + 1] + Math.cos(elapsedTime * 0.6 + idx * 1.5) * 0.3;
				bArr[i + 2] = this.biolumBasePositions[i + 2] + Math.sin(elapsedTime * 0.5 + idx * 0.8) * 0.35;
			}
			bPos.needsUpdate = true;

			const bioMat = this.biolumMesh.material as THREE.PointsMaterial;
			bioMat.opacity = 0.55 + Math.sin(elapsedTime * 2.2) * 0.25;
		}

		if (this.currentPhase === 3) {
			const cPos = this.cherenkovMoteMesh.geometry.attributes.position as THREE.BufferAttribute;
			const cArr = cPos.array as Float32Array;
			for (let i = 0; i < cArr.length; i += 3) {
				cArr[i] += Math.sin(elapsedTime * 1.8 + i) * delta * 0.06;
				cArr[i + 1] += this.cherenkovVelocities[i + 1] * delta;
				cArr[i + 2] += Math.cos(elapsedTime * 1.4 + i) * delta * 0.06;
				if (cArr[i + 1] > 1.2) {
					cArr[i] = -1.2 + (Math.random() - 0.5) * 2.2;
					cArr[i + 1] = -1.8;
					cArr[i + 2] = -10.5 + (Math.random() - 0.5) * 2.2;
				}
			}
			cPos.needsUpdate = true;

			const chMat = this.cherenkovMoteMesh.material as THREE.PointsMaterial;
			chMat.opacity = 0.65 + Math.sin(elapsedTime * 4.0) * 0.25;
		}
	}
}

