import * as THREE from 'three';
import {
	createBasaltRockTexture,
	createSedimentTexture,
	createTrenchCliffTexture,
	createWhaleBoneTexture,
	createBacterialMatTexture,
	createDarkRibTexture
} from '../textures/procedural';

export class Phase2Scenery {
	public readonly group: THREE.Group;
	private crinoidArms: THREE.Group[] = [];
	private ctenophores: THREE.Group[] = [];
	private probeDiagnosticLed: THREE.PointLight;
	private probeLedMesh: THREE.Mesh;

	constructor() {
		this.group = new THREE.Group();

		const basaltTex = createBasaltRockTexture();
		const sedimentTex = createSedimentTexture();
		const cliffTex = createTrenchCliffTexture();
		const boneTex = createWhaleBoneTexture();
		const matTex = createBacterialMatTexture();
		const ribTex = createDarkRibTexture();

		const cliffMat = new THREE.MeshStandardMaterial({
			color: 0x303e42,
			map: cliffTex,
			roughness: 0.85,
			metalness: 0.15
		});
		const bedMat = new THREE.MeshStandardMaterial({
			color: 0x768f96,
			map: sedimentTex,
			roughness: 0.72,
			metalness: 0.08
		});
		const boneMat = new THREE.MeshStandardMaterial({
			color: 0xc8caa8,
			map: boneTex,
			roughness: 0.7,
			metalness: 0.05
		});
		const bacterialMat = new THREE.MeshStandardMaterial({
			color: 0xebf2dc,
			map: matTex,
			roughness: 0.85,
			transparent: true,
			opacity: 0.88
		});
		const wreckMat = new THREE.MeshStandardMaterial({
			color: 0x2a353a,
			map: ribTex,
			roughness: 0.65,
			metalness: 0.4
		});

		const leftCliffGeo = new THREE.PlaneGeometry(28, 26, 16, 12);
		const lPos = leftCliffGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < lPos.count; i++) {
			const lx = lPos.getX(i);
			const ly = lPos.getY(i);
			lPos.setZ(i, Math.sin(ly * 0.4) * 1.2 + Math.cos(lx * 0.3) * 0.8);
		}
		leftCliffGeo.computeVertexNormals();
		const leftCliff = new THREE.Mesh(leftCliffGeo, cliffMat);
		leftCliff.position.set(-9.5, 2.2, -16.5);
		leftCliff.rotation.y = Math.PI * 0.22;
		this.group.add(leftCliff);

		const rightCliffGeo = new THREE.PlaneGeometry(28, 26, 16, 12);
		const rPos = rightCliffGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < rPos.count; i++) {
			const rx = rPos.getX(i);
			const ry = rPos.getY(i);
			rPos.setZ(i, Math.cos(ry * 0.4) * 1.2 + Math.sin(rx * 0.3) * 0.8);
		}
		rightCliffGeo.computeVertexNormals();
		const rightCliff = new THREE.Mesh(rightCliffGeo, cliffMat);
		rightCliff.position.set(9.5, 2.2, -16.5);
		rightCliff.rotation.y = -Math.PI * 0.22;
		this.group.add(rightCliff);

		const bedLength = 28.0;
		const bedGeo = new THREE.PlaneGeometry(34, bedLength, 22, 18);
		bedGeo.rotateX(-Math.PI / 2);
		bedGeo.translate(0, 0, -bedLength / 2 - 0.8);
		const bPos = bedGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < bPos.count; i++) {
			const bx = bPos.getX(i);
			const bz = bPos.getZ(i);
			bPos.setY(i, Math.sin(bx * 0.28) * 0.35 + Math.cos(bz * 0.32) * 0.28);
		}
		bedGeo.computeVertexNormals();
		const seabed = new THREE.Mesh(bedGeo, bedMat);
		seabed.position.set(0, -2.85, 0);
		this.group.add(seabed);

		const whaleGroup = new THREE.Group();
		whaleGroup.position.set(-1.4, -2.75, -9.0);
		whaleGroup.rotation.y = 0.25;

		const ribCount = 7;
		for (let r = 0; r < ribCount; r++) {
			const rz = -2.4 + r * 0.85;
			const ribHeight = 1.6 + Math.sin((r / ribCount) * Math.PI) * 0.7;
			const ribArc = new THREE.TorusGeometry(ribHeight, 0.08, 8, 16, Math.PI * 0.75);

			const leftRib = new THREE.Mesh(ribArc, boneMat);
			leftRib.position.set(-0.6, 0.2, rz);
			leftRib.rotation.y = Math.PI * 0.15;
			leftRib.rotation.z = Math.PI * 0.35;
			whaleGroup.add(leftRib);

			const rightRib = new THREE.Mesh(ribArc, boneMat);
			rightRib.position.set(0.6, 0.2, rz);
			rightRib.rotation.y = -Math.PI * 0.15;
			rightRib.rotation.z = -Math.PI * 0.35;
			whaleGroup.add(rightRib);
		}

		for (let v = 0; v < 8; v++) {
			const vertGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.45, 8);
			const vert = new THREE.Mesh(vertGeo, boneMat);
			vert.rotation.x = Math.PI / 2;
			vert.position.set(0, 0.1, -2.8 + v * 0.8);
			whaleGroup.add(vert);
		}

		const skullGeo = new THREE.ConeGeometry(0.75, 2.6, 6);
		const skull = new THREE.Mesh(skullGeo, boneMat);
		skull.rotation.x = -Math.PI * 0.45;
		skull.rotation.y = 0.2;
		skull.position.set(0.2, 0.4, 3.8);
		whaleGroup.add(skull);

		for (let m = 0; m < 5; m++) {
			const matPatch = new THREE.Mesh(
				new THREE.CircleGeometry(0.9 + Math.random() * 0.6, 12),
				bacterialMat
			);
			matPatch.rotation.x = -Math.PI / 2;
			matPatch.position.set((Math.random() - 0.5) * 3.0, 0.05, -2.0 + Math.random() * 4.5);
			whaleGroup.add(matPatch);
		}

		this.group.add(whaleGroup);

		const crinoidPositions = [
			[-3.8, -2.7, -6.8],
			[-2.6, -2.6, -8.2],
			[2.2, -2.7, -7.5],
			[3.6, -2.6, -9.5]
		];
		const crinoidStemMat = new THREE.MeshStandardMaterial({ color: 0x587868, roughness: 0.7 });
		const crinoidFeatherMat = new THREE.MeshStandardMaterial({ color: 0x98cfbe, roughness: 0.5 });

		for (const [cx, cy, cz] of crinoidPositions) {
			const crinoid = new THREE.Group();
			crinoid.position.set(cx, cy, cz);

			const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.2, 8), crinoidStemMat);
			stem.position.set(0, 0.6, 0);
			crinoid.add(stem);

			const crown = new THREE.Group();
			crown.position.set(0, 1.2, 0);

			for (let a = 0; a < 5; a++) {
				const angle = (a / 5) * Math.PI * 2;
				const arm = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.65, 5), crinoidFeatherMat);
				arm.position.set(Math.cos(angle) * 0.15, 0.25, Math.sin(angle) * 0.15);
				arm.rotation.z = Math.cos(angle) * 0.45;
				arm.rotation.x = Math.sin(angle) * 0.45;
				crown.add(arm);
			}

			crinoid.add(crown);
			this.crinoidArms.push(crown);
			this.group.add(crinoid);
		}

		const ctenoGeo = new THREE.SphereGeometry(0.24, 12, 10);
		ctenoGeo.scale(1.0, 1.4, 0.9);
		const ctenoMat = new THREE.MeshPhongMaterial({
			color: 0x33ffbb,
			emissive: 0x11aa77,
			emissiveIntensity: 0.65,
			transparent: true,
			opacity: 0.55,
			shininess: 90
		});

		for (let c = 0; c < 3; c++) {
			const ctenoGroup = new THREE.Group();
			const ctenoMesh = new THREE.Mesh(ctenoGeo, ctenoMat);
			ctenoGroup.add(ctenoMesh);

			for (let t = 0; t < 3; t++) {
				const tent = new THREE.Mesh(
					new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4),
					new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.45 })
				);
				tent.position.set((t - 1) * 0.06, -0.45, 0);
				ctenoGroup.add(tent);
			}

			ctenoGroup.position.set(-2.5 + c * 2.8, -0.4 + c * 0.5, -6.5 - c * 2.5);
			this.ctenophores.push(ctenoGroup);
			this.group.add(ctenoGroup);
		}

		const probeGroup = new THREE.Group();
		probeGroup.position.set(2.4, -2.55, -7.0);

		const sphereGeo = new THREE.SphereGeometry(0.85, 16, 16);
		sphereGeo.scale(1.15, 0.42, 0.88);
		const probeSphere = new THREE.Mesh(sphereGeo, wreckMat);
		probeGroup.add(probeSphere);

		const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8);
		const antenna = new THREE.Mesh(antGeo, wreckMat);
		antenna.position.set(0.3, 0.5, 0.1);
		antenna.rotation.z = 0.65;
		antenna.rotation.x = -0.3;
		probeGroup.add(antenna);

		this.probeLedMesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.04, 6, 6),
			new THREE.MeshBasicMaterial({ color: 0x00ffaa })
		);
		this.probeLedMesh.position.set(-0.25, 0.35, 0.3);
		probeGroup.add(this.probeLedMesh);

		this.probeDiagnosticLed = new THREE.PointLight(0x00ffaa, 0.6, 4.0);
		this.probeDiagnosticLed.position.set(-0.25, 0.35, 0.3);
		probeGroup.add(this.probeDiagnosticLed);

		this.group.add(probeGroup);

		const cableMat = new THREE.MeshStandardMaterial({ color: 0x182025, roughness: 0.8 });
		for (const [cx, cy, cz, rot] of [
			[-1.8, -2.75, -5.5, 0.4],
			[1.0, -2.75, -9.0, -0.6],
			[-3.2, -2.70, -11.0, 0.2]
		]) {
			const cable = new THREE.Mesh(
				new THREE.CylinderGeometry(0.04, 0.04, 5.0, 10),
				cableMat
			);
			cable.position.set(cx, cy, cz);
			cable.rotation.z = Math.PI / 2;
			cable.rotation.y = rot;
			this.group.add(cable);
		}
	}

	public update(delta: number, elapsedTime: number): void {

		for (let i = 0; i < this.crinoidArms.length; i++) {
			const crown = this.crinoidArms[i];
			crown.rotation.z = Math.sin(elapsedTime * 1.2 + i * 0.7) * 0.12;
			crown.rotation.x = Math.cos(elapsedTime * 0.9 + i * 0.5) * 0.09;
		}

		for (let c = 0; c < this.ctenophores.length; c++) {
			const ct = this.ctenophores[c];
			ct.position.y += Math.sin(elapsedTime * 1.4 + c * 1.8) * delta * 0.15;
			ct.position.x += Math.cos(elapsedTime * 0.8 + c * 1.2) * delta * 0.12;
			ct.rotation.y = Math.sin(elapsedTime * 0.5 + c) * 0.2;
		}

		const blipCycle = elapsedTime % 2.5;
		const isBlip = blipCycle < 0.12;
		this.probeDiagnosticLed.intensity = isBlip ? 1.8 : 0.05;
		(this.probeLedMesh.material as THREE.MeshBasicMaterial).color.set(isBlip ? 0x44ffbb : 0x062818);
	}
}

