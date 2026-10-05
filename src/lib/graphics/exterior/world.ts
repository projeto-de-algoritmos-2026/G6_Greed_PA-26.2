import * as THREE from 'three';
import type { ScenePhase } from '../types';
import { MarineParticles } from './particles';
import { Phase1Scenery } from './phase1';
import { Phase2Scenery } from './phase2';
import { Phase3Scenery } from './phase3';

export class ExteriorWorld {
	public readonly group: THREE.Group;
	public readonly particles: MarineParticles;

	private phase1: Phase1Scenery;
	private phase2: Phase2Scenery;
	private phase3: Phase3Scenery;
	private currentPhase: ScenePhase = 1;
	private backdropMat: THREE.MeshBasicMaterial;

	constructor() {
		this.group = new THREE.Group();

		this.backdropMat = new THREE.MeshBasicMaterial({ color: 0x01050a });
		const oceanBackdrop = new THREE.Mesh(
			new THREE.PlaneGeometry(72, 45),
			this.backdropMat
		);
		oceanBackdrop.position.set(0, 0, -28.0);
		this.group.add(oceanBackdrop);

		this.particles = new MarineParticles();
		this.group.add(this.particles.group);

		this.phase1 = new Phase1Scenery();
		this.phase2 = new Phase2Scenery();
		this.phase3 = new Phase3Scenery();

		this.group.add(this.phase1.group, this.phase2.group, this.phase3.group);

		this.setPhase(1);
	}

	public setPhase(phase: ScenePhase): void {
		this.currentPhase = phase;
		this.phase1.group.visible = phase === 1;
		this.phase2.group.visible = phase === 2;
		this.phase3.group.visible = phase === 3;

		this.particles.setPhase(phase);

		if (phase === 1) {
			this.backdropMat.color.set(0x01070d);
		} else if (phase === 2) {
			this.backdropMat.color.set(0x010506);
		} else {
			this.backdropMat.color.set(0x000103);
		}
	}

	public getPhase(): ScenePhase {
		return this.currentPhase;
	}

	public update(delta: number, elapsedTime: number): void {
		this.particles.update(delta, elapsedTime);

		if (this.currentPhase === 1) {
			this.phase1.update(delta, elapsedTime);
		} else if (this.currentPhase === 2) {
			this.phase2.update(delta, elapsedTime);
		} else if (this.currentPhase === 3) {
			this.phase3.update(delta, elapsedTime);
		}
	}
}

