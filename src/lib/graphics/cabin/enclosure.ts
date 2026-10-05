import * as THREE from 'three';
import { createHullMetalTexture, createDarkRibTexture } from '../textures/procedural';

export class CabinEnclosure {
	public readonly group: THREE.Group;
	public readonly ceilingBulb: THREE.Mesh;

	constructor() {
		this.group = new THREE.Group();

		const hullTex = createHullMetalTexture();
		const ribTex = createDarkRibTexture();

		const steelWallMat = new THREE.MeshLambertMaterial({
			color: 0x6e9ec0,
			map: hullTex,
			side: THREE.DoubleSide
		});
		const darkRibMat = new THREE.MeshLambertMaterial({
			color: 0x547998,
			map: ribTex,
			side: THREE.DoubleSide
		});
		const darkPipeMat = new THREE.MeshLambertMaterial({
			color: 0x5a82a0,
			map: ribTex
		});
		const redValveMat = new THREE.MeshLambertMaterial({ color: 0xcc2929 });

		const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 14, 8, 8), darkRibMat);
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(0, -1.8, 2.3);
		this.group.add(floor);

		const vault = new THREE.Mesh(
			new THREE.CylinderGeometry(5.2, 5.2, 9.6, 32, 1, true, Math.PI * 0.68, Math.PI * 0.64),
			steelWallMat
		);
		vault.rotation.x = Math.PI / 2;
		vault.position.set(0, -0.6, 2.3);
		this.group.add(vault);

		for (const z of [-1.0, 1.0, 3.0, 5.0]) {
			const ribArch = new THREE.Mesh(
				new THREE.TorusGeometry(5.2, 0.08, 8, 24, Math.PI * 0.64),
				darkRibMat
			);
			ribArch.rotation.z = Math.PI * 0.68;
			ribArch.position.set(0, -0.6, z);
			this.group.add(ribArch);
		}

		const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), steelWallMat);
		frontWall.position.set(0, 1.2, -2.4);
		this.group.add(frontWall);

		for (const x of [-2.0, 0, 2.0, 4.0]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.0, 0.12), darkRibMat);
			rib.position.set(x, 1.2, -2.34);
			this.group.add(rib);
		}

		const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(12, 0.22, 0.12), darkRibMat);
		crossBeam.position.set(0, 2.2, -2.34);
		this.group.add(crossBeam);

		// Industrial overhead ceiling lamp fixture at top of cabin
		const lampGroup = new THREE.Group();
		lampGroup.position.set(0, 2.30, 0.65);

		const cordGeo = new THREE.CylinderGeometry(0.016, 0.016, 2.3, 8);
		const cordMat = new THREE.MeshLambertMaterial({ color: 0x223240 });
		const cord = new THREE.Mesh(cordGeo, cordMat);
		cord.position.set(0, 1.15, 0);

		const shadeGeo = new THREE.ConeGeometry(0.36, 0.18, 16, 1, true);
		shadeGeo.rotateX(Math.PI);
		const shadeMat = new THREE.MeshLambertMaterial({ color: 0x3d5d77, side: THREE.DoubleSide });
		const shade = new THREE.Mesh(shadeGeo, shadeMat);
		shade.position.set(0, 0.12, 0);

		const lampCage = new THREE.Mesh(
			new THREE.CylinderGeometry(0.20, 0.25, 0.36, 8, 1, true),
			new THREE.MeshBasicMaterial({ color: 0x688fae, wireframe: true })
		);

		this.ceilingBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.11, 16, 16),
			new THREE.MeshBasicMaterial({ color: 0xeaf4ff, fog: false })
		);
		this.ceilingBulb.position.set(0, -0.04, 0);

		lampGroup.add(cord, shade, lampCage, this.ceilingBulb);
		this.group.add(lampGroup);

		const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12, 16), darkPipeMat);
		pipe1.rotation.z = Math.PI / 2;
		pipe1.position.set(0, 2.55, -1.5);

		const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16), redValveMat);
		valveWheel.rotation.x = Math.PI / 2;
		valveWheel.position.set(-1.2, 2.55, -1.5);
		this.group.add(pipe1, valveWheel);

		const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		leftWall.position.set(-4.8, 0.7, 2.3);
		leftWall.rotation.y = Math.PI / 2;
		this.group.add(leftWall);

		for (const z of [-1.2, 0.8, 3.8, 5.8]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.0, 0.16), darkRibMat);
			rib.position.set(-4.72, 0.7, z);
			this.group.add(rib);
		}

		const leftFlankRib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.14), darkRibMat);
		leftFlankRib.position.set(-4.72, 0.70, 1.58);
		const rightFlankRib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.14), darkRibMat);
		rightFlankRib.position.set(-4.72, 0.70, 3.02);
		this.group.add(leftFlankRib, rightFlankRib);

		const leftPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.4, 16), darkPipeMat);
		leftPipe.rotation.x = Math.PI / 2;
		leftPipe.position.set(-4.65, 2.45, 2.3);
		this.group.add(leftPipe);

		const rightFrontWall = new THREE.Mesh(new THREE.PlaneGeometry(2.60, 5.0), steelWallMat);
		rightFrontWall.position.set(4.8, 0.7, -1.20);
		rightFrontWall.rotation.y = -Math.PI / 2;

		const rightRearWall = new THREE.Mesh(new THREE.PlaneGeometry(2.60, 5.0), steelWallMat);
		rightRearWall.position.set(4.8, 0.7, 5.80);
		rightRearWall.rotation.y = -Math.PI / 2;

		const rightBotWall = new THREE.Mesh(new THREE.PlaneGeometry(4.40, 1.55), steelWallMat);
		rightBotWall.position.set(4.8, -1.025, 2.30);
		rightBotWall.rotation.y = -Math.PI / 2;

		const rightTopWall = new THREE.Mesh(new THREE.PlaneGeometry(4.40, 1.05), steelWallMat);
		rightTopWall.position.set(4.8, 2.675, 2.30);
		rightTopWall.rotation.y = -Math.PI / 2;

		this.group.add(rightFrontWall, rightRearWall, rightBotWall, rightTopWall);

		for (const z of [-1.8, -0.6, 5.2, 6.4]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.0, 0.16), darkRibMat);
			rib.position.set(4.72, 0.7, z);
			this.group.add(rib);
		}

		const rearWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		rearWall.position.set(0, 0.7, 7.0);
		rearWall.rotation.y = Math.PI;
		this.group.add(rearWall);

		const rearCrossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.25, 0.16), darkRibMat);
		rearCrossBeam.position.set(0, 2.3, 6.92);
		this.group.add(rearCrossBeam);

		for (const x of [-1.8, 1.8]) {
			const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.0, 0.18), darkRibMat);
			pillar.position.set(x, 0.7, 6.9);
			this.group.add(pillar);
		}
	}
}

