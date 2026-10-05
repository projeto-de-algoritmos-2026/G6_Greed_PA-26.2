import * as THREE from 'three';
import type { ScenePhase } from '../types';

export class CabinLightingManager {
	public ambientLight: THREE.AmbientLight;
	public dirFillLight: THREE.DirectionalLight;
	public ceilingLampLight: THREE.PointLight;
	public deskWorkLight: THREE.SpotLight;
	public crtScreenLight: THREE.PointLight;
	public auxScreenLight: THREE.PointLight;
	public alarmBeaconLight: THREE.PointLight;
	public rearAlarmLight: THREE.PointLight;

	public isInspectionMode: boolean = false;
	public isAlarmActive: boolean = false;
	public blackoutTimer: number = 0;

	constructor(scene: THREE.Scene) {
		this.ambientLight = new THREE.AmbientLight(0x182430, 0.4);
		scene.add(this.ambientLight);

		this.dirFillLight = new THREE.DirectionalLight(0x3e5265, 0.3);
		this.dirFillLight.position.set(1.5, 4.5, 2.0);
		scene.add(this.dirFillLight);

		this.ceilingLampLight = new THREE.PointLight(0xffd594, 8.5, 20, 1.35);
		this.ceilingLampLight.position.set(0, 2.7, 1.5);
		scene.add(this.ceilingLampLight);

		this.deskWorkLight = new THREE.SpotLight(0xffe8c6, 3.8, 5.0, Math.PI / 3.5, 0.6, 1.4);
		this.deskWorkLight.position.set(0, 2.1, 1.2);
		this.deskWorkLight.target.position.set(0, -1.0, 0.4);
		scene.add(this.deskWorkLight, this.deskWorkLight.target);

		this.crtScreenLight = new THREE.PointLight(0x00ffaa, 6.5, 5.5, 1.5);
		this.crtScreenLight.position.set(0, 0.45, 0.7);
		scene.add(this.crtScreenLight);

		this.auxScreenLight = new THREE.PointLight(0xff9922, 3.5, 4.5, 1.5);
		this.auxScreenLight.position.set(2.4, 0.35, 0.8);
		scene.add(this.auxScreenLight);

		this.alarmBeaconLight = new THREE.PointLight(0xff1122, 0.0, 12);
		this.alarmBeaconLight.position.set(-2.8, 2.0, 0.2);
		scene.add(this.alarmBeaconLight);

		this.rearAlarmLight = new THREE.PointLight(0xff1122, 0.0, 10);
		this.rearAlarmLight.position.set(0, 2.38, 6.65);
		scene.add(this.rearAlarmLight);
	}

	public disableFogRecursively(object: THREE.Object3D): void {
		object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				if (Array.isArray(mesh.material)) {
					mesh.material.forEach((m) => {
						if ('fog' in m) (m as { fog?: boolean }).fog = false;
					});
				} else if (mesh.material) {
					if ('fog' in mesh.material) (mesh.material as { fog?: boolean }).fog = false;
				}
			}
		});
	}

	public applyLightingMode(scene: THREE.Scene, currentPhase: ScenePhase): void {
		if (this.isInspectionMode) {
			this.ambientLight.intensity = 1.35;
			this.ambientLight.color.set(0x42586a);
			this.dirFillLight.intensity = 0.85;
			this.deskWorkLight.intensity = 9.0;
			this.ceilingLampLight.color.set(0xfffae0);
			this.ceilingLampLight.distance = 26;
			this.crtScreenLight.intensity = 7.5;
			this.auxScreenLight.intensity = 4.5;
			(scene.fog as THREE.FogExp2).density = 0.032;
			(scene.fog as THREE.FogExp2).color.set(0x0a141c);
			scene.background = new THREE.Color(0x0a141c);
		} else {
			this.ambientLight.intensity = 0.4;
			this.ambientLight.color.set(0x182430);
			this.dirFillLight.intensity = 0.3;
			this.deskWorkLight.intensity = 3.8;
			this.ceilingLampLight.color.set(0xffd594);
			this.ceilingLampLight.distance = 20;
			this.crtScreenLight.intensity = 6.5;
			this.auxScreenLight.intensity = 3.5;

			const fog = scene.fog as THREE.FogExp2;
			if (currentPhase === 1) {
				fog.density = 0.04;
				fog.color.set(0x020a12);
				scene.background = new THREE.Color(0x020a12);
			} else if (currentPhase === 2) {
				fog.density = 0.048;
				fog.color.set(0x010809);
				scene.background = new THREE.Color(0x010809);
			} else {
				fog.density = 0.055;
				fog.color.set(0x010206);
				scene.background = new THREE.Color(0x010206);
			}
		}
	}

	public update(
		delta: number,
		elapsedTime: number,
		scene: THREE.Scene,
		currentPhase: ScenePhase,
		currentProximity: number,
		cameraShakeIntensity: number,
		ceilingBulb: THREE.Mesh,
		rearAlarmStrobe: THREE.Mesh
	): void {
		if (this.blackoutTimer > 0) {
			this.blackoutTimer -= delta;
			this.ceilingLampLight.intensity = 0.02;
			this.deskWorkLight.intensity = 0.0;
			this.ambientLight.intensity = 0.1;
			(ceilingBulb.material as THREE.MeshBasicMaterial).color.set(0x180a02);
		} else {
			if (this.ambientLight.intensity < 0.25) {
				this.applyLightingMode(scene, currentPhase);
			}

			if (this.isInspectionMode) {
				this.ceilingLampLight.intensity = 20.0 + Math.sin(elapsedTime * 4.0) * 0.4;
				(ceilingBulb.material as THREE.MeshBasicMaterial).color.set(0xfffae0);
			} else {
				let lampIntensity = 8.5 + Math.sin(elapsedTime * 5.0) * 0.35;
				if (Math.random() < 0.016) lampIntensity *= Math.random() < 0.5 ? 0.2 : 0.6;
				if (currentProximity > 50) {
					const dangerRatio = (currentProximity - 50) / 50;
					if (Math.random() < dangerRatio * 0.25) {
						lampIntensity = Math.random() < 0.4 ? 0.15 : 0.5;
					}
				}
				if (cameraShakeIntensity > 0.08) {
					lampIntensity *= Math.max(0.1, 1.0 - cameraShakeIntensity * 1.5);
				}
				this.ceilingLampLight.intensity = lampIntensity;
				(ceilingBulb.material as THREE.MeshBasicMaterial).color.set(
					lampIntensity > 3.0 ? 0xffd594 : 0x66441a
				);
			}
		}

		if (this.isAlarmActive) {
			const strobe = Math.sin(elapsedTime * 14.0) > 0 ? 3.5 : 0.0;
			this.alarmBeaconLight.intensity = strobe;
			this.rearAlarmLight.intensity = strobe * 0.8;
			(rearAlarmStrobe.material as THREE.MeshBasicMaterial).color.set(
				strobe > 0 ? 0xff2233 : 0x330000
			);
		} else {
			this.alarmBeaconLight.intensity = 0.0;
			this.rearAlarmLight.intensity = 0.0;
			(rearAlarmStrobe.material as THREE.MeshBasicMaterial).color.set(0x330000);
		}
	}
}

