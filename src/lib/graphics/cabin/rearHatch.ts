import * as THREE from 'three';
import { createDarkRibTexture, createHullMetalTexture } from '../textures/procedural';

export class RearHatch {
	public readonly group: THREE.Group;
	public readonly rearAlarmStrobe: THREE.Mesh;

	constructor() {
		this.group = new THREE.Group();
		this.group.position.set(0, 0.65, 6.84);
		this.group.rotation.y = Math.PI;

		const darkRibMat = new THREE.MeshLambertMaterial({
			color: 0x202b34,
			map: createDarkRibTexture()
		});
		const steelWallMat = new THREE.MeshLambertMaterial({
			color: 0x32424e,
			map: createHullMetalTexture()
		});
		const redValveMat = new THREE.MeshLambertMaterial({ color: 0x9e1e1e });

		const frame = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.14, 16, 32), darkRibMat);
		const door = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 32), steelWallMat);
		door.rotation.x = Math.PI / 2;

		const lockWheel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.055, 12, 24), redValveMat);
		lockWheel.position.set(0, 0, 0.14);

		for (let i = 0; i < 4; i++) {
			const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), darkRibMat);
			spoke.rotation.z = (i * Math.PI) / 4;
			spoke.position.set(0, 0, 0.14);
			this.group.add(spoke);
		}

		this.group.add(frame, door, lockWheel);

		const rearStrobeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12);
		rearStrobeGeo.rotateX(Math.PI / 2);
		this.rearAlarmStrobe = new THREE.Mesh(rearStrobeGeo, new THREE.MeshBasicMaterial({ color: 0x330000 }));
		this.rearAlarmStrobe.position.set(0, 1.73, -0.02);
		this.group.add(this.rearAlarmStrobe);
	}
}

