import * as THREE from 'three';
import {
	createBasaltRockTexture,
	createSedimentTexture,
	createHydrothermalSulfideTexture,
	createManganeseNoduleTexture,
	createTubeWormTexture
} from '../textures/procedural';

export class Phase1Scenery {
	public readonly group: THREE.Group;
	private ventGlowLight: THREE.PointLight;
	private ventRimMesh: THREE.Mesh;
	private wormPlumes: THREE.Mesh[] = [];
	private sponges: THREE.Group[] = [];

	constructor() {
		this.group = new THREE.Group();

		const basaltTex = createBasaltRockTexture();
		const sedimentTex = createSedimentTexture();
		const sulfideTex = createHydrothermalSulfideTexture();
		const noduleTex = createManganeseNoduleTexture();
		const wormTex = createTubeWormTexture();

		const cliffMat = new THREE.MeshStandardMaterial({
			color: 0x3a4850,
			map: basaltTex,
			roughness: 0.85,
			metalness: 0.15
		});
		const bedMat = new THREE.MeshStandardMaterial({
			color: 0x869ba8,
			map: sedimentTex,
			roughness: 0.72,
			metalness: 0.08
		});
		const sulfideMat = new THREE.MeshStandardMaterial({
			color: 0x5a5246,
			map: sulfideTex,
			roughness: 0.72,
			metalness: 0.35
		});
		const noduleMat = new THREE.MeshStandardMaterial({
			color: 0x2c3840,
			map: noduleTex,
			roughness: 0.65,
			metalness: 0.45
		});
		const wormTubeMat = new THREE.MeshStandardMaterial({
			color: 0xe6e8df,
			map: wormTex,
			roughness: 0.55
		});
		const wormPlumeMat = new THREE.MeshLambertMaterial({
			color: 0xdd2030
		});

		const cliffGeo = new THREE.PlaneGeometry(38, 24, 20, 14);
		const cPos = cliffGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < cPos.count; i++) {
			const cx = cPos.getX(i);
			const cy = cPos.getY(i);
			const disp = Math.sin(cx * 0.35) * 1.1 + Math.cos(cy * 0.45) * 0.9 + Math.sin(cx * 1.1 + cy * 0.9) * 0.45;
			cPos.setZ(i, disp);
		}
		cliffGeo.computeVertexNormals();
		const trenchWall = new THREE.Mesh(cliffGeo, cliffMat);
		trenchWall.position.set(0, 2.0, -22.0);
		this.group.add(trenchWall);

		const bedLength = 28.0;
		const bedGeo = new THREE.PlaneGeometry(38, bedLength, 24, 20);
		bedGeo.rotateX(-Math.PI / 2);
		bedGeo.translate(0, 0, -bedLength / 2 - 0.8);
		const bPos = bedGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < bPos.count; i++) {
			const bx = bPos.getX(i);
			const bz = bPos.getZ(i);
			const bh = Math.sin(bx * 0.25) * 0.35 + Math.cos(bz * 0.3) * 0.25 + Math.sin(bx * 0.8) * Math.cos(bz * 0.7) * 0.15;
			bPos.setY(i, bh);
		}
		bedGeo.computeVertexNormals();
		const seabed = new THREE.Mesh(bedGeo, bedMat);
		seabed.position.set(0, -2.85, 0);
		this.group.add(seabed);

		const noduleCount = 130;
		const noduleGeo = new THREE.DodecahedronGeometry(0.12, 1);
		const nPos = noduleGeo.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < nPos.count; i++) {
			const v = new THREE.Vector3(nPos.getX(i), nPos.getY(i), nPos.getZ(i));
			v.x *= 1.0 + (Math.random() - 0.5) * 0.3;
			v.y *= 0.65 + (Math.random() - 0.5) * 0.2;
			v.z *= 1.0 + (Math.random() - 0.5) * 0.3;
			nPos.setXYZ(i, v.x, v.y, v.z);
		}
		noduleGeo.computeVertexNormals();

		const noduleInstMesh = new THREE.InstancedMesh(noduleGeo, noduleMat, noduleCount);
		const dummy = new THREE.Object3D();

		for (let i = 0; i < noduleCount; i++) {
			const nx = (Math.random() - 0.5) * 16.0;
			const nz = -2.5 - Math.random() * 16.0;
			const ny = -2.75 + Math.sin(nx * 0.25) * 0.2 + (Math.random() - 0.5) * 0.08;
			const scale = 0.7 + Math.random() * 0.9;

			dummy.position.set(nx, ny, nz);
			dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
			dummy.scale.set(scale, scale * 0.7, scale);
			dummy.updateMatrix();
			noduleInstMesh.setMatrixAt(i, dummy.matrix);
		}
		noduleInstMesh.instanceMatrix.needsUpdate = true;
		this.group.add(noduleInstMesh);

		const pillowCoords = [
			[-4.2, -2.55, -6.5, 1.4, 0.9, 1.2],
			[-3.2, -2.55, -5.8, 1.1, 0.7, 1.0],
			[3.5, -2.50, -7.0, 1.8, 1.1, 1.5],
			[4.6, -2.50, -8.2, 1.3, 0.8, 1.2],
			[1.6, -2.60, -11.5, 2.2, 1.4, 1.9],
			[-3.8, -2.50, -14.0, 2.6, 1.6, 2.3],
			[2.8, -2.50, -15.5, 2.8, 1.8, 2.4]
		];
		const pillowGeo = new THREE.SphereGeometry(1.0, 10, 8);
		pillowGeo.scale(1.0, 0.65, 0.9);

		for (const [px, py, pz, sx, sy, sz] of pillowCoords) {
			const pillow = new THREE.Mesh(pillowGeo, cliffMat);
			pillow.position.set(px, py, pz);
			pillow.scale.set(sx, sy, sz);
			pillow.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
			this.group.add(pillow);
		}

		const ventGroup = new THREE.Group();
		ventGroup.position.set(-1.8, -2.85, -8.0);

		const mainSpire = new THREE.Mesh(
			new THREE.CylinderGeometry(0.28, 0.75, 2.6, 10),
			sulfideMat
		);
		mainSpire.position.set(0, 1.3, 0);
		mainSpire.rotation.z = -0.06;

		const subSpire = new THREE.Mesh(
			new THREE.CylinderGeometry(0.16, 0.42, 1.8, 8),
			sulfideMat
		);
		subSpire.position.set(0.55, 0.9, 0.25);
		subSpire.rotation.z = 0.12;

		for (let f = 0; f < 4; f++) {
			const flange = new THREE.Mesh(
				new THREE.TorusGeometry(0.32 + f * 0.08, 0.08, 6, 12),
				sulfideMat
			);
			flange.position.set(0, 0.6 + f * 0.45, 0);
			flange.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
			ventGroup.add(flange);
		}

		const rimGeo = new THREE.TorusGeometry(0.3, 0.07, 8, 16);
		const rimMat = new THREE.MeshStandardMaterial({
			color: 0x331006,
			emissive: 0xff4411,
			emissiveIntensity: 0.85,
			roughness: 0.6
		});
		this.ventRimMesh = new THREE.Mesh(rimGeo, rimMat);
		this.ventRimMesh.rotation.x = Math.PI / 2;
		this.ventRimMesh.position.set(0, 2.6, 0);

		ventGroup.add(mainSpire, subSpire, this.ventRimMesh);

		this.ventGlowLight = new THREE.PointLight(0xff5511, 2.6, 8.5);
		this.ventGlowLight.position.set(0, 2.65, 0);
		ventGroup.add(this.ventGlowLight);

		this.group.add(ventGroup);

		const wormColony = new THREE.Group();
		wormColony.position.set(-1.8, -2.80, -7.8);

		const tubeGeo = new THREE.CylinderGeometry(0.024, 0.032, 0.85, 6);
		const plumeGeo = new THREE.ConeGeometry(0.038, 0.22, 6);

		for (let w = 0; w < 32; w++) {
			const angle = (w / 32) * Math.PI * 2;
			const dist = 0.55 + Math.random() * 0.7;
			const wx = Math.cos(angle) * dist;
			const wz = Math.sin(angle) * dist;

			const tube = new THREE.Mesh(tubeGeo, wormTubeMat);
			const tiltX = (Math.random() - 0.5) * 0.4;
			const tiltZ = (Math.random() - 0.5) * 0.4;
			tube.position.set(wx, 0.4, wz);
			tube.rotation.set(tiltX, Math.random() * Math.PI, tiltZ);

			const plume = new THREE.Mesh(plumeGeo, wormPlumeMat);
			plume.position.set(0, 0.45, 0);
			tube.add(plume);
			this.wormPlumes.push(plume);

			wormColony.add(tube);
		}
		this.group.add(wormColony);

		const spongeLocations = [
			[-3.8, -2.2, -6.2, 0.55],
			[3.1, -2.1, -7.2, 0.7],
			[1.4, -2.2, -11.0, 0.9]
		];
		const spongeMat = new THREE.MeshPhongMaterial({
			color: 0xd0ebff,
			specular: 0x88ccff,
			shininess: 90,
			transparent: true,
			opacity: 0.65
		});

		for (const [sx, sy, sz, scale] of spongeLocations) {
			const spongeGroup = new THREE.Group();
			spongeGroup.position.set(sx, sy, sz);

			const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 0.6 * scale, 8), spongeMat);
			stem.position.set(0, 0.3 * scale, 0);

			const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.08 * scale, 0.55 * scale, 10, 1, true), spongeMat);
			cup.position.set(0, 0.75 * scale, 0);

			spongeGroup.add(stem, cup);
			this.sponges.push(spongeGroup);
			this.group.add(spongeGroup);
		}
	}

	public update(delta: number, elapsedTime: number): void {

		const thermalFlicker = Math.sin(elapsedTime * 6.5) * 0.35 + Math.sin(elapsedTime * 14.0) * 0.15;
		this.ventGlowLight.intensity = Math.max(1.4, 2.6 + thermalFlicker);

		const rimMat = this.ventRimMesh.material as THREE.MeshStandardMaterial;
		rimMat.emissiveIntensity = 0.8 + Math.sin(elapsedTime * 5.0) * 0.3;

		for (let i = 0; i < this.wormPlumes.length; i++) {
			const plume = this.wormPlumes[i];
			const sway = Math.sin(elapsedTime * 2.2 + i * 0.3) * 0.08;
			plume.rotation.z = sway;
			plume.rotation.x = Math.cos(elapsedTime * 1.8 + i * 0.4) * 0.06;
		}

		for (let i = 0; i < this.sponges.length; i++) {
			const sp = this.sponges[i];
			sp.rotation.y = Math.sin(elapsedTime * 0.4 + i) * 0.03;
		}
	}
}

