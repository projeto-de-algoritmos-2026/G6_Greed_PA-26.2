import * as THREE from 'three';
import type { OpeningId, OpeningFrame, GlassDamageApi, ExteriorLightsApi, ScenePhase } from '../types';
import { createImpactTexture, createScratchTexture, createDarkRibTexture } from '../textures/procedural';

export class OpeningsManager {
	public readonly group: THREE.Group;

	public readonly hatchFrame: OpeningFrame;
	public readonly exteriorSpotLight: THREE.SpotLight;
	public readonly exteriorSeabedLight: THREE.SpotLight;
	public readonly exteriorFillLight: THREE.PointLight;
	public readonly volumetricLightBeam: THREE.Mesh;
	private beamMaterial: THREE.ShaderMaterial;
	private beamPivot: THREE.Group;

	private impactDecal: THREE.Mesh;
	private scratchDecal: THREE.Mesh;
	private impactDecalMat: THREE.MeshBasicMaterial;
	private scratchDecalMat: THREE.MeshBasicMaterial;
	private impactOpacity: number = 0.0;
	private scratchOpacity: number = 0.0;

	private hatchLightLevel: number = 1.0;
	private hatchFlickerTimer: number = 0;
	private currentPhase: ScenePhase = 1;
	// Dano acumulado entre fases (0..1): rachaduras não somem abaixo deste piso
	// e as luzes externas falham com mais frequência.
	private persistentDamage: number = 0;

	constructor() {
		this.group = new THREE.Group();
		const darkRibMat = new THREE.MeshLambertMaterial({
			color: 0x547998,
			map: createDarkRibTexture()
		});

		const hatchPivot = new THREE.Group();
		hatchPivot.position.set(4.75, 0.95, 2.30);
		hatchPivot.rotation.y = -Math.PI / 2;

		const winW = 4.40;
		const winH = 2.40;
		const frameThick = 0.20;
		const frameDepth = 0.22;

		const topBar = new THREE.Mesh(new THREE.BoxGeometry(winW, frameThick, frameDepth), darkRibMat);
		topBar.position.set(0, winH / 2, 0);
		const botBar = new THREE.Mesh(new THREE.BoxGeometry(winW, frameThick, frameDepth), darkRibMat);
		botBar.position.set(0, -winH / 2, 0);
		const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), darkRibMat);
		leftBar.position.set(-winW / 2, 0, 0);
		const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), darkRibMat);
		rightBar.position.set(winW / 2, 0, 0);

		const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, winH, frameDepth - 0.04), darkRibMat);
		rib1.position.set(-winW / 3, 0, 0.01);
		const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, winH, frameDepth - 0.04), darkRibMat);
		rib2.position.set(winW / 3, 0, 0.01);

		hatchPivot.add(topBar, botBar, leftBar, rightBar, rib1, rib2);

		const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8);
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x7ea3be });
		for (let i = 0; i <= 10; i++) {
			const bx = -winW / 2 + (i / 10) * winW;
			const boltT = new THREE.Mesh(boltGeo, boltMat);
			boltT.rotation.x = Math.PI / 2;
			boltT.position.set(bx, winH / 2, 0.10);
			const boltB = new THREE.Mesh(boltGeo, boltMat);
			boltB.rotation.x = Math.PI / 2;
			boltB.position.set(bx, -winH / 2, 0.10);
			hatchPivot.add(boltT, boltB);
		}

		const glass = new THREE.Mesh(
			new THREE.PlaneGeometry(winW - 0.04, winH - 0.04),
			new THREE.MeshPhongMaterial({
				color: 0x061c26,
				specular: 0x4488aa,
				shininess: 95,
				transparent: true,
				opacity: 0.18,
				depthWrite: false
			})
		);
		glass.position.set(0, 0, 0);
		glass.renderOrder = 10;
		hatchPivot.add(glass);

		this.impactDecalMat = new THREE.MeshBasicMaterial({
			map: createImpactTexture(),
			transparent: true,
			opacity: 0.0,
			depthWrite: false
		});
		this.impactDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), this.impactDecalMat);
		this.impactDecal.position.set(0, 0.1, 0.01);
		this.impactDecal.renderOrder = 11;
		hatchPivot.add(this.impactDecal);

		this.scratchDecalMat = new THREE.MeshBasicMaterial({
			map: createScratchTexture(),
			transparent: true,
			opacity: 0.0,
			depthWrite: false
		});
		this.scratchDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), this.scratchDecalMat);
		this.scratchDecal.position.set(0.35, -0.1, 0.01);
		this.scratchDecal.renderOrder = 11;
		hatchPivot.add(this.scratchDecal);

		const lampCaseGeo = new THREE.BoxGeometry(0.36, 0.26, 0.36);
		const lampLensGeo = new THREE.PlaneGeometry(0.30, 0.22);
		const lampLensMat = new THREE.MeshBasicMaterial({ color: 0xebf8ff, fog: false });

		const leftLampCase = new THREE.Mesh(lampCaseGeo, darkRibMat);
		leftLampCase.position.set(-1.4, winH / 2 + 0.14, -0.16);
		const leftLampLens = new THREE.Mesh(lampLensGeo, lampLensMat);
		leftLampLens.position.set(-1.4, winH / 2 + 0.14, -0.345);
		leftLampLens.rotation.y = Math.PI;

		const rightLampCase = new THREE.Mesh(lampCaseGeo, darkRibMat);
		rightLampCase.position.set(1.4, winH / 2 + 0.14, -0.16);
		const rightLampLens = new THREE.Mesh(lampLensGeo, lampLensMat);
		rightLampLens.position.set(1.4, winH / 2 + 0.14, -0.345);
		rightLampLens.rotation.y = Math.PI;

		hatchPivot.add(leftLampCase, leftLampLens, rightLampCase, rightLampLens);

		this.exteriorSpotLight = new THREE.SpotLight(0x8ad2eb, 16.0, 52, Math.PI / 2.7, 0.85, 1.1);
		this.exteriorSpotLight.position.set(0, winH / 2 + 0.18, -0.32);
		this.exteriorSpotLight.target.position.set(0, -0.65, -20.0);
		hatchPivot.add(this.exteriorSpotLight, this.exteriorSpotLight.target);

		this.exteriorSeabedLight = new THREE.SpotLight(0xa0d8ef, 13.0, 42, Math.PI / 2.3, 0.9, 1.05);
		this.exteriorSeabedLight.position.set(0, winH / 2 + 0.1, -0.35);
		this.exteriorSeabedLight.target.position.set(0, -2.4, -12.0);
		hatchPivot.add(this.exteriorSeabedLight, this.exteriorSeabedLight.target);

		this.exteriorFillLight = new THREE.PointLight(0x5cb2d4, 6.5, 26);
		this.exteriorFillLight.position.set(0, 0.15, -2.2);
		hatchPivot.add(this.exteriorFillLight);

		const beamLength = 26.0;

		const coneGeo = new THREE.CylinderGeometry(6.4, 0.08, beamLength, 36, 16, true);
		coneGeo.translate(0, beamLength / 2, 0);
		coneGeo.rotateX(Math.PI / 2);

		this.beamMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uColor: { value: new THREE.Color(0x8ad2eb) },
				uIntensity: { value: 0.35 }
			},
			vertexShader: `
				varying vec3 vNormal;
				varying vec3 vViewPosition;
				varying vec2 vUv;
				void main() {
					vUv = uv;
					vNormal = normalize(normalMatrix * normal);
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					vViewPosition = -mvPosition.xyz;
					gl_Position = projectionMatrix * mvPosition;
				}
			`,
			fragmentShader: `
				uniform vec3 uColor;
				uniform float uIntensity;
				varying vec3 vNormal;
				varying vec3 vViewPosition;
				varying vec2 vUv;
				void main() {
					float lengthFade = pow(1.0 - vUv.y, 1.45) * smoothstep(0.0, 0.035, vUv.y);

					vec3 viewDir = normalize(vViewPosition);
					float rim = abs(dot(vNormal, viewDir));
					float softSilhouette = pow(rim, 1.4);

					float alpha = lengthFade * softSilhouette * uIntensity;
					gl_FragColor = vec4(uColor, alpha);
				}
			`,
			transparent: true,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
			depthWrite: false
		});

		this.volumetricLightBeam = new THREE.Mesh(coneGeo, this.beamMaterial);

		this.beamPivot = new THREE.Group();
		this.beamPivot.position.set(0, winH / 2 + 0.18, -0.32);
		this.beamPivot.lookAt(new THREE.Vector3(0, -0.65, -20.0));
		this.beamPivot.add(this.volumetricLightBeam);
		hatchPivot.add(this.beamPivot);

		hatchPivot.userData = { isRightWindow: true };
		this.hatchFrame = {
			id: 'hatch',
			pivot: hatchPivot,
			glassRadius: 1.15
		};
		this.group.add(hatchPivot);
	}

	public setPhase(phase: ScenePhase): void {
		this.currentPhase = phase;

		if (phase === 1) {

			this.exteriorSpotLight.color.set(0x8ad2eb);
			this.exteriorSeabedLight.color.set(0xa0d8ef);
			this.exteriorFillLight.color.set(0x5cb2d4);
			this.beamMaterial.uniforms.uColor.value.set(0x8ad2eb);
			this.beamMaterial.uniforms.uIntensity.value = 0.35;
		} else if (phase === 2) {

			this.exteriorSpotLight.color.set(0x70c5b8);
			this.exteriorSeabedLight.color.set(0x80dcd0);
			this.exteriorFillLight.color.set(0x489e92);
			this.beamMaterial.uniforms.uColor.value.set(0x6ed0c0);
			this.beamMaterial.uniforms.uIntensity.value = 0.38;
		} else {

			this.exteriorSpotLight.color.set(0xcae6ff);
			this.exteriorSeabedLight.color.set(0xddeeff);
			this.exteriorFillLight.color.set(0x8ab8e0);
			this.beamMaterial.uniforms.uColor.value.set(0xcae6ff);
			this.beamMaterial.uniforms.uIntensity.value = 0.32;
		}
	}

	public setPersistentDamage(level: number): void {
		this.persistentDamage = Math.max(0, Math.min(1, level));
		this.impactOpacity = Math.max(this.impactOpacity, this.persistentDamage * 0.7);
		this.scratchOpacity = Math.max(this.scratchOpacity, this.persistentDamage * 0.5);
		this.impactDecalMat.opacity = this.impactOpacity;
		this.scratchDecalMat.opacity = this.scratchOpacity;
	}

	public getFrame(_id?: OpeningId): OpeningFrame {
		return this.hatchFrame;
	}

	public getGlassDamageApi(_id?: OpeningId): GlassDamageApi {
		return {
			addCrack: (x: number, y: number, severity: number) => {
				this.impactDecal.position.set(x, y, 0.01);
				this.impactOpacity = Math.min(1.0, this.impactOpacity + severity * 0.95);
				this.impactDecalMat.opacity = this.impactOpacity;
			},
			addScratch: (x: number, y: number, severity: number) => {
				this.scratchDecal.position.set(x, y, 0.01);
				this.scratchOpacity = Math.min(1.0, this.scratchOpacity + severity * 0.95);
				this.scratchDecalMat.opacity = this.scratchOpacity;
			},
			addScratchStroke: (_points, _width) => {
				this.scratchOpacity = Math.min(1.0, this.scratchOpacity + 0.95);
				this.scratchDecalMat.opacity = this.scratchOpacity;
			},
			addSmear: () => {}
		};
	}

	public getExteriorLightsApi(): ExteriorLightsApi {
		return {
			setLevel: (_op: OpeningId, level: number) => {
				this.hatchLightLevel = Math.max(0, level);
			},
			getLevel: (_op: OpeningId) => {
				return this.hatchLightLevel;
			},
			flicker: (_op: OpeningId, duration: number) => {
				this.hatchFlickerTimer = duration;
			},
			setAim: (_op: OpeningId, yaw: number, pitch: number) => {
				const aimTarget = new THREE.Vector3(
					Math.sin(yaw) * 20.0,
					-0.65 + Math.sin(pitch) * 20.0,
					-Math.cos(yaw) * 20.0
				);
				this.exteriorSpotLight.target.position.copy(aimTarget);
				this.exteriorSeabedLight.target.position.set(aimTarget.x * 0.6, -2.4, aimTarget.z * 0.6);
				this.beamPivot.lookAt(aimTarget);
			}
		};
	}

	public update(delta: number, elapsedTime: number): void {

		const impactFloor = this.persistentDamage * 0.7;
		const scratchFloor = this.persistentDamage * 0.5;
		if (this.impactOpacity > impactFloor + 0.001) {
			this.impactOpacity = Math.max(impactFloor, this.impactOpacity - delta * 0.075);
			this.impactDecalMat.opacity = this.impactOpacity;
		}
		if (this.scratchOpacity > scratchFloor + 0.001) {
			this.scratchOpacity = Math.max(scratchFloor, this.scratchOpacity - delta * 0.065);
			this.scratchDecalMat.opacity = this.scratchOpacity;
		}

		if (this.hatchFlickerTimer <= 0 && this.persistentDamage > 0.3) {
			if (Math.random() < delta * this.persistentDamage * 0.2) {
				this.hatchFlickerTimer = 0.15 + Math.random() * 0.35;
			}
		}

		if (this.hatchFlickerTimer > 0) {
			this.hatchFlickerTimer -= delta;
			const isFlickering = Math.random() < 0.4;
			this.exteriorSpotLight.intensity = isFlickering ? 1.0 : 16.0 * this.hatchLightLevel;
			this.exteriorSeabedLight.intensity = isFlickering ? 0.8 : 13.0 * this.hatchLightLevel;
			this.exteriorFillLight.intensity = isFlickering ? 0.5 : 6.5 * this.hatchLightLevel;
			this.beamMaterial.uniforms.uIntensity.value = isFlickering ? 0.05 : 0.35 * this.hatchLightLevel;
		} else {
			const hum = Math.sin(elapsedTime * 7.5) * 0.35;
			this.exteriorSpotLight.intensity = (15.6 + hum) * this.hatchLightLevel;
			this.exteriorSeabedLight.intensity = (12.8 + hum * 0.8) * this.hatchLightLevel;
			this.exteriorFillLight.intensity = (6.4 + hum * 0.4) * this.hatchLightLevel;
			this.beamMaterial.uniforms.uIntensity.value =
				(this.currentPhase === 2 ? 0.38 : this.currentPhase === 3 ? 0.32 : 0.35) * this.hatchLightLevel;
		}
	}
}

