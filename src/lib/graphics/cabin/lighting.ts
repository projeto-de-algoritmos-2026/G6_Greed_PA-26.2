import * as THREE from 'three';
import type { ScenePhase } from '../types';

export class CabinLightingManager {
	public ambientLight: THREE.AmbientLight;
	public dirFillLight: THREE.DirectionalLight;
	public cabinBounceLight: THREE.DirectionalLight;
	public ceilingLampLight: THREE.PointLight;
	public deskWorkLight: THREE.SpotLight;
	public crtScreenLight: THREE.PointLight;
	public auxScreenLight: THREE.PointLight;
	public alarmBeaconLight: THREE.PointLight;
	public rearAlarmLight: THREE.PointLight;

	public isInspectionMode: boolean = false;
	public isAlarmActive: boolean = false;
	public blackoutTimer: number = 0;
	public luminosityMultiplier: number = 1.0;

	private cachedScene: THREE.Scene | null = null;
	private cachedPhase: ScenePhase = 1;

	constructor(scene: THREE.Scene) {
		this.cachedScene = scene;
		this.ambientLight = new THREE.AmbientLight(0x22364a, 0.85);
		scene.add(this.ambientLight);

		this.dirFillLight = new THREE.DirectionalLight(0x35506a, 0.45);
		this.dirFillLight.position.set(0, 4.0, 1.2);
		scene.add(this.dirFillLight);

		this.cabinBounceLight = new THREE.DirectionalLight(0x1e3042, 0.30);
		this.cabinBounceLight.position.set(0, -1.6, 1.2);
		this.cabinBounceLight.target.position.set(0, 3.5, 1.2);
		scene.add(this.cabinBounceLight, this.cabinBounceLight.target);

		this.ceilingLampLight = new THREE.PointLight(0xd2e8ff, 12.0, 28, 1.2);
		this.ceilingLampLight.position.set(0, 2.26, 0.65);
		scene.add(this.ceilingLampLight);

		this.deskWorkLight = new THREE.SpotLight(0xc8e4ff, 4.5, 6.0, Math.PI / 3.0, 0.6, 1.2);
		this.deskWorkLight.position.set(0, 2.22, 0.65);
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

	public setLuminosityMultiplier(mult: number): void {
		this.luminosityMultiplier = Math.max(0.1, Math.min(4.0, mult));
		if (this.cachedScene) {
			this.applyLightingMode(this.cachedScene, this.cachedPhase);
		}
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
		this.cachedScene = scene;
		this.cachedPhase = currentPhase;
		const lm = this.luminosityMultiplier;

		if (this.isInspectionMode) {
			this.ambientLight.intensity = 1.4 * lm;
			this.ambientLight.color.set(0x3e556e);
			this.dirFillLight.intensity = 0.9 * lm;
			this.dirFillLight.color.set(0x607a96);
			this.cabinBounceLight.intensity = 0.65 * lm;
			this.cabinBounceLight.color.set(0x486078);
			this.deskWorkLight.intensity = 10.0 * lm;
			this.deskWorkLight.color.set(0xd8eeff);
			this.ceilingLampLight.intensity = 26.0 * lm;
			this.ceilingLampLight.color.set(0xf2f8ff);
			this.ceilingLampLight.distance = 30;
			this.crtScreenLight.intensity = 7.5;
			this.auxScreenLight.intensity = 4.5;
			(scene.fog as THREE.FogExp2).density = 0.032;
			(scene.fog as THREE.FogExp2).color.set(0x0a141c);
			scene.background = new THREE.Color(0x0a141c);
		} else {
			this.ambientLight.intensity = 0.85 * lm;
			this.ambientLight.color.set(0x22364a);
			this.dirFillLight.intensity = 0.45 * lm;
			this.dirFillLight.color.set(0x35506a);
			this.cabinBounceLight.intensity = 0.30 * lm;
			this.cabinBounceLight.color.set(0x1e3042);
			this.deskWorkLight.intensity = 4.5 * lm;
			this.deskWorkLight.color.set(0xc8e4ff);
			this.ceilingLampLight.intensity = 12.0 * lm;
			this.ceilingLampLight.color.set(0xd2e8ff);
			this.ceilingLampLight.distance = 28;
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
		this.cachedScene = scene;
		this.cachedPhase = currentPhase;
		const lm = this.luminosityMultiplier;

		if (this.blackoutTimer > 0) {
			this.blackoutTimer -= delta;
			this.ceilingLampLight.intensity = 0.02 * lm;
			this.deskWorkLight.intensity = 0.0;
			this.dirFillLight.intensity = 0.05 * lm;
			this.cabinBounceLight.intensity = 0.05 * lm;
			this.ambientLight.intensity = 0.14 * lm;
			(ceilingBulb.material as THREE.MeshBasicMaterial).color.set(0x040c14);
		} else {
			if (this.ambientLight.intensity < 0.25 * lm) {
				this.applyLightingMode(scene, currentPhase);
			}

			if (this.isInspectionMode) {
				this.ceilingLampLight.intensity = (26.0 + Math.sin(elapsedTime * 4.0) * 0.4) * lm;
				(ceilingBulb.material as THREE.MeshBasicMaterial).color.set(0xf2f8ff);
			} else {
				let lampIntensity = 12.0 + Math.sin(elapsedTime * 5.0) * 0.4;
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
				this.ceilingLampLight.intensity = lampIntensity * lm;
				(ceilingBulb.material as THREE.MeshBasicMaterial).color.set(
					lampIntensity > 4.0 ? 0xeaf4ff : 0x334d63
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

