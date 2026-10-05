import * as THREE from 'three';
import type { TerminalScreenState, ScreenActionCallback } from './terminalScreenCanvas';
import type { AuxiliaryScreenState, AuxActionCallback } from './auxiliaryScreenCanvas';
import type { ProceduralAudioEngine } from '../audio/soundscape';
import type {
	CabinFocusTarget,
	WindowEventType,
	ScenePhase,
	PlayerActionType
} from './types';

import { CabinEnclosure } from './cabin/enclosure';
import { ConsoleDesk } from './cabin/desk';
import { CRTMonitor } from './cabin/crtMonitor';
import { AuxMonitor } from './cabin/auxMonitor';
import { MedCabinet } from './cabin/medCabinet';
import { DystopianPoster } from './cabin/poster';
import { RearHatch } from './cabin/rearHatch';
import { OpeningsManager } from './cabin/openings';
import { CabinLightingManager } from './cabin/lighting';
import { CabinCameraRig, type FocusChangeCallback } from './cabin/cameraRig';

import { ExteriorWorld } from './exterior/world';
import { EventDirector } from './events/director';
import { DevPanel } from './debug/devPanel';

export type { CabinFocusTarget, WindowEventType, ScenePhase, PlayerActionType };
export type { FocusChangeCallback };

export class Terminal3DManager {
	private scene: THREE.Scene;
	private renderer: THREE.WebGLRenderer;
	private cameraRig: CabinCameraRig;
	private lighting: CabinLightingManager;

	private audioEngine: ProceduralAudioEngine | null = null;

	private enclosure: CabinEnclosure;
	private desk: ConsoleDesk;
	private crt: CRTMonitor;
	private aux: AuxMonitor;
	private cabinet: MedCabinet;
	private poster: DystopianPoster;
	private rearHatch: RearHatch;
	private openings: OpeningsManager;

	private exteriorWorld: ExteriorWorld;
	private eventDirector: EventDirector;
	private devPanel: DevPanel | null = null;

	private currentProximity: number = 0;
	private currentPhase: ScenePhase = 1;
	private animationFrameId: number = 0;
	private clock: THREE.Clock;
	private lastScreenState: TerminalScreenState | null = null;
	private lastAuxState: AuxiliaryScreenState | null = null;

	constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
		const width = container.clientWidth || 800;
		const height = container.clientHeight || 600;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x020508);
		this.scene.fog = new THREE.FogExp2(0x020508, 0.048);

		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: 'high-performance'
		});
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.15;

		this.lighting = new CabinLightingManager(this.scene);

		this.enclosure = new CabinEnclosure();
		this.desk = new ConsoleDesk();
		this.crt = new CRTMonitor();
		this.aux = new AuxMonitor();
		this.cabinet = new MedCabinet();
		this.poster = new DystopianPoster();
		this.rearHatch = new RearHatch();
		this.openings = new OpeningsManager();

		this.scene.add(
			this.enclosure.group,
			this.desk.group,
			this.crt.group,
			this.aux.group,
			this.cabinet.group,
			this.poster.group,
			this.rearHatch.group,
			this.openings.group
		);

		this.lighting.disableFogRecursively(this.enclosure.group);
		this.lighting.disableFogRecursively(this.desk.group);
		this.lighting.disableFogRecursively(this.crt.group);
		this.lighting.disableFogRecursively(this.aux.group);
		this.lighting.disableFogRecursively(this.cabinet.group);
		this.lighting.disableFogRecursively(this.poster.group);
		this.lighting.disableFogRecursively(this.rearHatch.group);
		this.lighting.disableFogRecursively(this.openings.hatchFrame.pivot);

		this.exteriorWorld = new ExteriorWorld();
		this.exteriorWorld.group.position.set(4.75, 0.95, 2.3);
		this.exteriorWorld.group.rotation.y = -Math.PI / 2;
		this.scene.add(this.exteriorWorld.group);

		const tempCamera = new THREE.PerspectiveCamera(54, width / height, 0.1, 65);
		this.eventDirector = new EventDirector(this.openings, tempCamera);
		this.eventDirector.onCameraShake = (intensity) => this.triggerCameraShake(intensity);
		this.eventDirector.onGlitch = (amount) => this.triggerCameraShake(amount * 0.4);
		this.eventDirector.onCabinBlackout = (duration) => {
			this.lighting.blackoutTimer = duration;
		};

		this.cameraRig = new CabinCameraRig(
			width,
			height,
			canvas,
			this.crt,
			this.aux,
			this.cabinet,
			this.poster,
			this.openings,
			this.eventDirector,
			() => this.openCabinet()
		);

		this.clock = new THREE.Clock();

		this.devPanel = new DevPanel({
			onTriggerEvent: (type) => this.eventDirector.triggerEvent(type),
			onSetPhase: (p) => this.setPhase(p),
			onSetProximity: (prox) => this.updateGauges(800 + prox * 3, prox),
			onSetCabinLuminosity: (mult) => this.setCabinLuminosity(mult),
			onFocusTarget: (target) => {
				if (target === 'main') this.focusMonitor();
				else if (target === 'aux') this.focusAuxiliaryMonitor();
				else if (target === 'manual') this.focusManual();
				else if (target === 'window') this.focusWindow();
				else if (target === 'poster') this.focusPoster();
				else this.resetCabinView();
			}
		});

		this.lighting.applyLightingMode(this.scene, this.currentPhase);
		this.animate();
	}

	public setCabinLuminosity(mult: number): void {
		this.lighting.setLuminosityMultiplier(mult);
	}

	public get terminalCanvas() {
		return this.crt.terminalCanvas;
	}

	public get auxCanvas() {
		return this.aux.auxCanvas;
	}

	public setAudioEngine(engine: ProceduralAudioEngine): void {
		this.audioEngine = engine;
		this.eventDirector.setAudioEngine(engine);
	}

	public onScreenAction(cb: ScreenActionCallback): void {
		this.crt.terminalCanvas.setActionCallback(cb);
	}

	public onAuxAction(cb: AuxActionCallback): void {
		this.aux.auxCanvas.setActionCallback(cb);
	}

	public onFocusChange(cb: FocusChangeCallback): void {
		this.cameraRig.onFocusChange(cb);
	}

	public focusMonitor(): void {
		this.cameraRig.focusMonitor();
	}

	public focusAuxiliaryMonitor(): void {
		this.cameraRig.focusAuxiliaryMonitor();
	}

	public focusManual(): void {
		this.openCabinet();
		this.cameraRig.focusManual();
	}

	public focusWindow(): void {
		this.cameraRig.focusWindow();
		this.eventDirector.notifyPlayerLookingAtWindow();
	}

	public focusPoster(): void {
		this.cameraRig.focusPoster();
	}

	public resetCabinView(): void {
		if (this.cabinet.isOpen()) {
			this.closeCabinet();
		}
		this.cameraRig.resetCabinView();
	}

	public openCabinet(): void {
		this.cabinet.open();
		this.audioEngine?.playCabinetDoor(true);
	}

	public closeCabinet(): void {
		this.cabinet.close();
		this.audioEngine?.playCabinetDoor(false);
	}

	public toggleCabinet(): boolean {
		const isOpened = this.cabinet.toggle();
		this.audioEngine?.playCabinetDoor(isOpened);
		return isOpened;
	}

	public isCabinetOpened(): boolean {
		return this.cabinet.isOpen();
	}

	public toggleInspectionLight(): boolean {
		this.lighting.isInspectionMode = !this.lighting.isInspectionMode;
		this.lighting.applyLightingMode(this.scene, this.currentPhase);
		return this.lighting.isInspectionMode;
	}

	public setInspectionLight(enabled: boolean): void {
		this.lighting.isInspectionMode = enabled;
		this.lighting.applyLightingMode(this.scene, this.currentPhase);
	}

	public setPhase(phase: ScenePhase): void {
		this.currentPhase = phase;
		this.exteriorWorld.setPhase(phase);
		this.eventDirector.setPhase(phase);
		this.openings.setPhase(phase);
		this.lighting.applyLightingMode(this.scene, this.currentPhase);
	}

	public setHullDamage(level: number): void {
		this.openings.setPersistentDamage(level);
	}

	public notifyPlayerAction(action: PlayerActionType): void {
		this.eventDirector.notifyPlayerAction(action);
	}

	public triggerRandomWindowEvent(forcedType?: WindowEventType): void {
		this.eventDirector.triggerEvent(forcedType);
	}

	public updateGauges(pressureAtm: number, proximity: number): void {
		this.currentProximity = proximity;
		this.desk.updateGauges(pressureAtm, proximity);
		this.eventDirector.updateProximity(proximity);
	}

	public triggerCameraShake(intensity: number = 0.25): void {
		this.cameraRig.triggerCameraShake(intensity);
		this.desk.nudgeSonarNeedle(0.35);
	}

	public setAlarm(active: boolean): void {
		if (this.lighting.isAlarmActive !== active) {
			this.lighting.isAlarmActive = active;
			this.crt.markDirty();
			this.aux.markDirty();
		}
	}

	public updateScreenState(state: TerminalScreenState): void {
		this.lastScreenState = state;
		this.crt.updateScreen(state, 0.016, this.clock.getElapsedTime());
	}

	public updateAuxScreenState(state: AuxiliaryScreenState): void {
		this.lastAuxState = state;
		this.aux.updateScreen(state, 0.016, this.clock.getElapsedTime());
	}

	public triggerReboot(): void {
		this.crt.terminalCanvas.triggerBoot();
		this.aux.auxCanvas.triggerBoot();
		this.crt.markDirty();
		this.aux.markDirty();
		this.audioEngine?.playBootSound();
	}

	public skipBoot(): void {
		this.crt.terminalCanvas.skipBoot();
		this.aux.auxCanvas.skipBoot();
		this.crt.markDirty();
		this.aux.markDirty();
	}

	public isBooting(): boolean {
		return this.crt.terminalCanvas.booting || this.aux.auxCanvas.booting;
	}

	public resize(width: number, height: number): void {
		this.cameraRig.resize(width, height);
		this.renderer.setSize(width, height);
	}

	private animate = (): void => {
		this.animationFrameId = requestAnimationFrame(this.animate);

		const delta = this.clock.getDelta();
		const elapsedTime = this.clock.getElapsedTime();

		if (this.lastScreenState) {
			this.crt.updateScreen(this.lastScreenState, delta, elapsedTime);
		}
		if (this.lastAuxState) {
			this.aux.updateScreen(this.lastAuxState, delta, elapsedTime);
		}

		this.desk.update(delta, elapsedTime);
		this.cabinet.update();
		this.openings.update(delta, elapsedTime);

		this.exteriorWorld.update(delta, elapsedTime);
		this.eventDirector.update(delta);

		this.lighting.update(
			delta,
			elapsedTime,
			this.scene,
			this.currentPhase,
			this.currentProximity,
			this.cameraRig.cameraShakeIntensity,
			this.enclosure.ceilingBulb,
			this.rearHatch.rearAlarmStrobe
		);

		this.cameraRig.update(delta);

		this.renderer.render(this.scene, this.cameraRig.camera);
	};

	public dispose(): void {
		cancelAnimationFrame(this.animationFrameId);
		this.devPanel?.dispose();
		this.cameraRig.dispose();
		this.crt.dispose();
		this.aux.dispose();
		this.renderer.dispose();
		this.scene.clear();
	}
}

