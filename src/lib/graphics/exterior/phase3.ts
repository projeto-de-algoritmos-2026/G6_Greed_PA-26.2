import * as THREE from 'three';
import {
	createBasaltRockTexture,
	createDiatomOozeTexture,
	createSerpentiniteSpireTexture,
	createCrushedTitaniumTexture,
	createDarkRibTexture
} from '../textures/procedural';

export class Phase3Scenery {
	public readonly group: THREE.Group;
	private transponderBeacon: THREE.PointLight;
	private beaconBulb: THREE.Mesh;
	private cherenkovLight: THREE.PointLight;
	private cherenkovCore: THREE.Mesh;
	private snailfish: THREE.Group;
	private snailfishTail: THREE.Mesh;
	private amphipods: THREE.Mesh[] = [];

	constructor() {
		this.group = new THREE.Group();

		const basaltTex = createBasaltRockTexture();
		const diatomTex = createDiatomOozeTexture();
		const spireTex = createSerpentiniteSpireTexture();
		const wreckTex = createCrushedTitaniumTexture();
		const ribTex = createDarkRibTexture();

		const abyssRockMat = new THREE.MeshStandardMaterial({
			color: 0x222a30,
			map: basaltTex,
			roughness: 0.9,
			metalness: 0.1
		});
		const diatomBedMat = new THREE.MeshStandardMaterial({
			color: 0xa8b8c2,
			map: diatomTex,
			roughness: 0.65,
			metalness: 0.05
		});
		const spireMat = new THREE.MeshStandardMaterial({
			color: 0x9cb0aa,
			map: spireTex,
			roughness: 0.72,
			metalness: 0.1
		});
		const crushedHullMat = new THREE.MeshStandardMaterial({
			color: 0x2e3c48,
			map: wreckTex,
			roughness: 0.55,
			metalness: 0.55
		});
		const ribMat = new THREE.MeshStandardMaterial({
			color: 0x1a242c,
			map: ribTex,
			roughness: 0.7,
			metalness: 0.3
		});

		const bedLength = 30.0;
		const bedGeo = new THREE.PlaneGeometry(42, bedLength, 24, 18);
		bedGeo.rotateX(-Math.PI / 2);
		bedGeo.translate(0, 0, -bedLength / 2 - 0.8);
		const bPos = bedGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < bPos.count; i++) {
			const bx = bPos.getX(i);
			const bz = bPos.getZ(i);
			const bh = Math.sin(bx * 0.22) * 0.35 + Math.cos(bz * 0.28) * 0.28 + Math.sin(bx * 0.6 + bz * 0.5) * 0.12;
			bPos.setY(i, bh);
		}
		bedGeo.computeVertexNormals();
		const seabed = new THREE.Mesh(bedGeo, diatomBedMat);
		seabed.position.set(0, -2.85, 0);
		this.group.add(seabed);

		const backWallGeo = new THREE.PlaneGeometry(46, 30, 14, 10);
		const backWall = new THREE.Mesh(backWallGeo, abyssRockMat);
		backWall.position.set(0, 3.0, -25.0);
		this.group.add(backWall);

		const spireCoords = [
			[-4.8, -2.85, -9.5, 0.9, 3.8, 0.9],
			[-3.6, -2.85, -13.0, 1.4, 5.2, 1.3],
			[4.2, -2.85, -8.5, 0.8, 3.2, 0.8],
			[5.0, -2.85, -12.5, 1.3, 4.6, 1.2],
			[-1.8, -2.85, -18.0, 1.8, 6.5, 1.7]
		];

		for (const [sx, sy, sz, scX, scY, scZ] of spireCoords) {
			const spireGeo = new THREE.ConeGeometry(0.5, 1.0, 7);

			const sPos = spireGeo.attributes.position as THREE.BufferAttribute;
			for (let i = 0; i < sPos.count; i++) {
				const nx = sPos.getX(i);
				const ny = sPos.getY(i);
				const nz = sPos.getZ(i);
				sPos.setXYZ(i, nx * (1 + (Math.random() - 0.5) * 0.25), ny, nz * (1 + (Math.random() - 0.5) * 0.25));
			}
			spireGeo.computeVertexNormals();

			const spireMesh = new THREE.Mesh(spireGeo, spireMat);
			spireMesh.position.set(sx, sy + scY / 2, sz);
			spireMesh.scale.set(scX, scY, scZ);
			spireMesh.rotation.y = Math.random() * Math.PI;
			this.group.add(spireMesh);
		}

		const wreckGroup = new THREE.Group();
		wreckGroup.position.set(-1.2, -2.45, -10.5);
		wreckGroup.rotation.y = 0.42;
		wreckGroup.rotation.z = -0.22;

		const brokenHullGeo = new THREE.CylinderGeometry(2.3, 2.5, 5.8, 20, 6, true, 0, Math.PI * 1.4);

		const hPos = brokenHullGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < hPos.count; i++) {
			const hy = hPos.getY(i);
			const hx = hPos.getX(i);
			const hz = hPos.getZ(i);
			const pinch = Math.exp(-Math.pow(hy / 1.5, 2)) * 0.45;
			hPos.setX(i, hx * (1 - pinch) + Math.sin(hy * 2) * 0.2);
			hPos.setZ(i, hz * (1 - pinch));
		}
		brokenHullGeo.computeVertexNormals();

		const brokenHull = new THREE.Mesh(brokenHullGeo, crushedHullMat);
		brokenHull.rotation.x = Math.PI / 2;
		wreckGroup.add(brokenHull);

		for (let r = -2.2; r <= 2.2; r += 1.1) {
			const ribArc = new THREE.TorusGeometry(2.4, 0.11, 8, 18, Math.PI * 1.3);
			const rib = new THREE.Mesh(ribArc, ribMat);
			rib.position.set(0, 0, r);
			rib.rotation.z = (Math.random() - 0.5) * 0.3;
			wreckGroup.add(rib);
		}

		const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.14, 16), ribMat);
		hatch.rotation.x = Math.PI * 0.42;
		hatch.position.set(2.4, -0.6, 0.9);
		wreckGroup.add(hatch);

		const nameCanvas = document.createElement('canvas');
		nameCanvas.width = 256;
		nameCanvas.height = 64;
		const nctx = nameCanvas.getContext('2d')!;
		nctx.fillStyle = '#0a1014';
		nctx.fillRect(0, 0, 256, 64);
		nctx.font = 'bold 24px "Courier New", monospace';
		nctx.fillStyle = '#ee3333';
		nctx.textAlign = 'center';
		nctx.fillText('STYX // T-02', 128, 42);

		const namePlate = new THREE.Mesh(
			new THREE.PlaneGeometry(1.3, 0.32),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nameCanvas) })
		);
		namePlate.position.set(0.4, 1.25, 1.4);
		namePlate.rotation.y = 0.3;
		wreckGroup.add(namePlate);

		this.cherenkovCore = new THREE.Mesh(
			new THREE.SphereGeometry(0.22, 10, 10),
			new THREE.MeshBasicMaterial({
				color: 0x00f0ff,
				transparent: true,
				opacity: 0.85
			})
		);
		this.cherenkovCore.position.set(0.1, 0.2, -0.6);
		wreckGroup.add(this.cherenkovCore);

		this.cherenkovLight = new THREE.PointLight(0x00e5ff, 3.2, 7.5);
		this.cherenkovLight.position.set(0.1, 0.2, -0.6);
		wreckGroup.add(this.cherenkovLight);

		this.beaconBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.08, 8, 8),
			new THREE.MeshBasicMaterial({ color: 0xff1122 })
		);
		this.beaconBulb.position.set(-0.7, 0.9, -0.4);
		wreckGroup.add(this.beaconBulb);

		this.transponderBeacon = new THREE.PointLight(0xff1122, 0.0, 9.0);
		this.transponderBeacon.position.set(-0.7, 0.9, -0.4);
		wreckGroup.add(this.transponderBeacon);

		this.group.add(wreckGroup);

		this.snailfish = new THREE.Group();
		this.snailfish.position.set(2.0, 0.3, -7.5);

		const fishMat = new THREE.MeshPhongMaterial({
			color: 0xede8ec,
			emissive: 0x221825,
			specular: 0xddccdd,
			shininess: 90,
			transparent: true,
			opacity: 0.72
		});

		const headGeo = new THREE.SphereGeometry(0.26, 12, 10);
		headGeo.scale(1.2, 0.9, 0.8);
		const head = new THREE.Mesh(headGeo, fishMat);
		this.snailfish.add(head);

		const finGeo = new THREE.PlaneGeometry(0.28, 0.16);
		const leftFin = new THREE.Mesh(finGeo, fishMat);
		leftFin.position.set(0.1, -0.05, 0.22);
		leftFin.rotation.y = Math.PI * 0.3;
		const rightFin = new THREE.Mesh(finGeo, fishMat);
		rightFin.position.set(0.1, -0.05, -0.22);
		rightFin.rotation.y = -Math.PI * 0.3;
		this.snailfish.add(leftFin, rightFin);

		const tailGeo = new THREE.ConeGeometry(0.18, 0.9, 8);
		tailGeo.rotateZ(Math.PI / 2);
		this.snailfishTail = new THREE.Mesh(tailGeo, fishMat);
		this.snailfishTail.position.set(-0.6, 0.0, 0.0);
		this.snailfish.add(this.snailfishTail);

		this.group.add(this.snailfish);

		const amphipodMat = new THREE.MeshStandardMaterial({
			color: 0xd8dcd5,
			roughness: 0.5,
			metalness: 0.1
		});
		const amphGeo = new THREE.CapsuleGeometry(0.04, 0.12, 4, 8);

		const amphPositions = [
			[-1.8, -2.25, -9.2],
			[-0.6, -1.85, -10.0],
			[-1.4, -2.70, -8.5],
			[0.8, -2.75, -7.0]
		];

		for (const [ax, ay, az] of amphPositions) {
			const amph = new THREE.Mesh(amphGeo, amphipodMat);
			amph.position.set(ax, ay, az);
			amph.rotation.set(Math.PI / 2, (Math.random() - 0.5) * 0.4, Math.random() * Math.PI);
			this.amphipods.push(amph);
			this.group.add(amph);
		}
	}

	public update(delta: number, elapsedTime: number): void {

		const pulseCycle = elapsedTime % 3.8;
		const isPulsing = pulseCycle < 0.15;
		const intensity = isPulsing ? 3.5 : 0.0;
		this.transponderBeacon.intensity = intensity;
		(this.beaconBulb.material as THREE.MeshBasicMaterial).color.set(isPulsing ? 0xff4455 : 0x220505);

		const cherenkovBreath = 2.4 + Math.sin(elapsedTime * 2.8) * 0.9 + Math.sin(elapsedTime * 5.5) * 0.3;
		this.cherenkovLight.intensity = cherenkovBreath;
		const coreMat = this.cherenkovCore.material as THREE.MeshBasicMaterial;
		coreMat.opacity = 0.65 + Math.sin(elapsedTime * 2.8) * 0.25;

		this.snailfish.position.x += Math.sin(elapsedTime * 0.6) * delta * 0.25;
		this.snailfish.position.y += Math.cos(elapsedTime * 0.4) * delta * 0.12;
		this.snailfishTail.rotation.y = Math.sin(elapsedTime * 3.5) * 0.35;

		for (let i = 0; i < this.amphipods.length; i++) {
			const amph = this.amphipods[i];
			amph.rotation.z = Math.sin(elapsedTime * 1.5 + i * 2.0) * 0.08;
		}
	}
}

