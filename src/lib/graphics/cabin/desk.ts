import * as THREE from 'three';
import { createDarkRibTexture } from '../textures/procedural';

export class ConsoleDesk {
	public readonly group: THREE.Group;
	private pressureNeedle: THREE.Mesh;
	private sonarNeedle: THREE.Mesh;

	private targetPressureDeg: number = 0.5;
	private targetSonarDeg: number = -0.8;
	private currentSonarDeg: number = -0.8;

	constructor() {
		this.group = new THREE.Group();
		const deskMat = new THREE.MeshLambertMaterial({
			color: 0x2c3b48,
			map: createDarkRibTexture()
		});

		const deskTop = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 2.8), deskMat);
		deskTop.position.set(0, -1.2, 0.2);
		this.group.add(deskTop);

		const frontDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.65, 0.15), deskMat);
		frontDeck.rotation.x = -Math.PI * 0.2;
		frontDeck.position.set(0, -1.45, 1.4);
		this.group.add(frontDeck);

		const kb = new THREE.Mesh(
			new THREE.BoxGeometry(2.4, 0.06, 0.6),
			new THREE.MeshLambertMaterial({ color: 0x1c252e })
		);
		kb.position.set(0, -1.08, 1.0);
		this.group.add(kb);

		const keyMat = new THREE.MeshLambertMaterial({ color: 0x3e5262 });
		const keyGroup = new THREE.Group();
		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 12; col++) {
				const key = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.10), keyMat);
				key.position.set(-1.0 + col * 0.18, -1.04, 0.82 + row * 0.13);
				keyGroup.add(key);
			}
		}
		this.group.add(keyGroup);

		this.pressureNeedle = this.buildManometer(-2.5, -1.05, 0.85);

		this.sonarNeedle = this.buildSonarMeter(1.85, -1.05, 1.25);
	}

	private buildManometer(x: number, y: number, z: number): THREE.Mesh {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.x = -Math.PI * 0.15;

		const rim = new THREE.Mesh(
			new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24),
			new THREE.MeshLambertMaterial({ color: 0x364654 })
		);
		rim.rotation.x = Math.PI / 2;

		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#cfc9b6';
		ctx.beginPath();
		ctx.arc(128, 128, 120, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#111';
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.strokeStyle = '#991111';
		ctx.lineWidth = 14;
		ctx.beginPath();
		ctx.arc(128, 128, 95, Math.PI * 0.1, Math.PI * 0.6);
		ctx.stroke();

		ctx.strokeStyle = '#222';
		ctx.lineWidth = 2;
		for (let a = Math.PI * 0.2; a <= Math.PI * 1.8; a += 0.12) {
			const x1 = 128 + Math.cos(a) * 105;
			const y1 = 128 + Math.sin(a) * 105;
			const x2 = 128 + Math.cos(a) * 118;
			const y2 = 128 + Math.sin(a) * 118;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}

		ctx.font = 'bold 22px monospace';
		ctx.fillStyle = '#111';
		ctx.textAlign = 'center';
		ctx.fillText('PRESSÃO ATM', 128, 175);
		ctx.font = 'bold 16px monospace';
		ctx.fillText('x100', 128, 195);

		const dial = new THREE.Mesh(
			new THREE.CircleGeometry(0.38, 24),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })
		);
		dial.position.set(0, 0, 0.055);

		const needleGeo = new THREE.ConeGeometry(0.02, 0.28, 8);
		needleGeo.translate(0, 0.14, 0);
		const needle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0x881111 }));
		needle.position.set(0, 0, 0.06);

		group.add(rim, dial, needle);
		this.group.add(group);
		return needle;
	}

	private buildSonarMeter(x: number, y: number, z: number): THREE.Mesh {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.x = -Math.PI * 0.15;

		const rim = new THREE.Mesh(
			new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24),
			new THREE.MeshLambertMaterial({ color: 0x364654 })
		);
		rim.rotation.x = Math.PI / 2;

		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#061410';
		ctx.beginPath();
		ctx.arc(128, 128, 120, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#00bb77';
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.arc(128, 128, 100, Math.PI * 0.8, Math.PI * 1.5);
		ctx.stroke();

		ctx.strokeStyle = '#ff3344';
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.arc(128, 128, 100, Math.PI * 1.5, Math.PI * 2.1);
		ctx.stroke();

		ctx.font = 'bold 22px monospace';
		ctx.fillStyle = '#00bb77';
		ctx.textAlign = 'center';
		ctx.fillText('HIDROFONE dB', 128, 175);
		ctx.fillText('RUÍDO', 128, 195);

		const dial = new THREE.Mesh(
			new THREE.CircleGeometry(0.38, 24),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })
		);
		dial.position.set(0, 0, 0.055);

		const needleGeo = new THREE.ConeGeometry(0.018, 0.28, 8);
		needleGeo.translate(0, 0.14, 0);
		const needle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0x00ffaa }));
		needle.position.set(0, 0, 0.06);

		group.add(rim, dial, needle);
		this.group.add(group);
		return needle;
	}

	public updateGauges(pressureAtm: number, proximity: number): void {
		this.targetPressureDeg = ((pressureAtm - 700) / 500) * 1.5;
		this.targetSonarDeg = -1.2 + (proximity / 100) * 2.4;
	}

	public nudgeSonarNeedle(amount: number = 0.35): void {
		this.currentSonarDeg += amount;
	}

	public update(delta: number, elapsedTime: number): void {
		this.pressureNeedle.rotation.z = THREE.MathUtils.lerp(
			this.pressureNeedle.rotation.z,
			-this.targetPressureDeg + Math.sin(elapsedTime * 5.0) * 0.015,
			0.08
		);

		this.currentSonarDeg = THREE.MathUtils.lerp(this.currentSonarDeg, this.targetSonarDeg, 0.1);
		this.sonarNeedle.rotation.z = this.currentSonarDeg + (Math.random() - 0.5) * 0.025;
	}
}

