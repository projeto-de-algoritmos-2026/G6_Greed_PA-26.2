import * as THREE from 'three';
import type {
	WindowEventType,
	EventTier,
	ScenePhase,
	OpeningId,
	EventContext,
	WindowEventActor,
	PlayerActionType,
	GlassDamageApi,
	ExteriorLightsApi
} from '../types';
import type { ProceduralAudioEngine } from '../../audio/soundscape';
import type { OpeningsManager } from '../cabin/openings';

import { LanternSwarmActor } from '../creatures/lanternSwarm';
import { SiphonophoreActor } from '../creatures/siphonophore';
import { GiantIsopodsActor } from '../creatures/giantIsopods';
import { LeviathanShadowsActor } from '../creatures/leviathanShadows';
import { LurkingPredatorActor } from '../creatures/lurkingPredator';
import { ColossalEyeActor } from '../creatures/colossalEye';
import { MassiveEclipseActor } from '../creatures/massiveEclipse';
import { DeadDiverActor } from '../creatures/deadDiver';
import { LightFailureActor } from '../creatures/lightFailure';
import { TentacleInspectionActor } from '../creatures/tentacleInspection';
import { QuartzImpactActor } from '../creatures/quartzImpact';
import { ClawScrapeActor } from '../creatures/clawScrape';
import { MawPressActor } from '../creatures/mawPress';

export class EventDirector {
	private actors: Map<WindowEventType, WindowEventActor> = new Map();
	private activeActor: WindowEventActor | null = null;
	private lastEventType: WindowEventType | null = null;

	private nextEventTimer: number = 10.0;
	private currentProximity: number = 0;
	private currentPhase: ScenePhase = 1;
	private jumpscaresInPhase: number = 0;

	private openings: OpeningsManager;
	private camera: THREE.PerspectiveCamera;
	private audio: ProceduralAudioEngine | null = null;

	public onCameraShake?: (intensity: number) => void;
	public onGlitch?: (intensity: number, duration: number) => void;
	public onCabinBlackout?: (duration: number) => void;
	public onAmbientLifeChange?: (level: number) => void;

	constructor(openings: OpeningsManager, camera: THREE.PerspectiveCamera) {
		this.openings = openings;
		this.camera = camera;

		this.registerActor(new LanternSwarmActor());
		this.registerActor(new SiphonophoreActor());
		this.registerActor(new GiantIsopodsActor());
		this.registerActor(new LeviathanShadowsActor());

		this.registerActor(new LurkingPredatorActor());
		this.registerActor(new ColossalEyeActor());
		this.registerActor(new MassiveEclipseActor());
		this.registerActor(new DeadDiverActor());
		this.registerActor(new LightFailureActor());

		this.registerActor(new TentacleInspectionActor());
		this.registerActor(new QuartzImpactActor());
		this.registerActor(new ClawScrapeActor());
		this.registerActor(new MawPressActor());
	}

	private registerActor(actor: WindowEventActor): void {
		this.actors.set(actor.type, actor);
	}

	public setAudioEngine(audio: ProceduralAudioEngine | null): void {
		this.audio = audio;
	}

	public setPhase(phase: ScenePhase): void {
		this.currentPhase = phase;
		this.jumpscaresInPhase = 0;
	}

	public updateProximity(proximity: number): void {
		this.currentProximity = proximity;
	}

	public notifyPlayerLookingAtWindow(): void {
		if (!this.activeActor && this.nextEventTimer > 3.0) {
			this.nextEventTimer = 1.8 + Math.random() * 1.5;
		}
	}

	public notifyPlayerAction(action: PlayerActionType): void {
		if (action === 'BAD_MERGE') {

			if (!this.activeActor && this.currentProximity > 50 && Math.random() < 0.15) {
				const tier3Pool: WindowEventType[] = ['CLAW_SCRAPE', 'QUARTZ_IMPACT', 'MAW_PRESS'];
				const chosen = tier3Pool[Math.floor(Math.random() * tier3Pool.length)];
				this.triggerEvent(chosen);
			} else {
				this.audio?.playHullKnock(this.calculatePan('hatch'));
			}
		} else if (action === 'UNDO' || action === 'RESET') {

			this.audio?.playHullCreak();
		}
	}

	public triggerEvent(forcedType?: WindowEventType): void {
		if (this.activeActor) return;

		let chosenActor: WindowEventActor;

		if (forcedType && this.actors.has(forcedType)) {
			chosenActor = this.actors.get(forcedType)!;
		} else {

			const phaseBias = this.currentPhase === 1 ? 0 : this.currentPhase === 2 ? 10 : 20;
			const effectiveProximity = this.currentProximity + phaseBias;

			let targetTier: EventTier = 1;
			if (effectiveProximity >= 70) targetTier = 3;
			else if (effectiveProximity >= 35) targetTier = 2;

			const candidates = Array.from(this.actors.values()).filter(
				(a) => a.tier === targetTier && a.type !== this.lastEventType
			);

			if (candidates.length === 0) {
				chosenActor = this.actors.get('LANTERN_SWARM')!;
			} else {
				chosenActor = candidates[Math.floor(Math.random() * candidates.length)];
			}
		}

		this.lastEventType = chosenActor.type;

		const opening: OpeningId = 'hatch';

		const isOpeningVisible = this.isOpeningVisible(opening);
		const canJumpscare =
			chosenActor.supportsJumpscare &&
			chosenActor.tier === 3 &&
			this.jumpscaresInPhase === 0 &&
			isOpeningVisible;

		if (canJumpscare) {
			this.jumpscaresInPhase++;
		}

		const frame = this.openings.getFrame(opening);
		frame.pivot.add(chosenActor.root);

		const ctx = this.createContext();
		chosenActor.start(ctx, { opening, jumpscare: canJumpscare });
		this.activeActor = chosenActor;
	}

	private isOpeningVisible(_op?: OpeningId): boolean {
		const camDir = new THREE.Vector3();
		this.camera.getWorldDirection(camDir);

		return camDir.x > 0.45;
	}

	private calculatePan(_op?: OpeningId): number {

		const camDir = new THREE.Vector3();
		this.camera.getWorldDirection(camDir);
		const camAngle = Math.atan2(camDir.x, -camDir.z);
		const diff = Math.PI / 2 - camAngle;
		return Math.max(-1, Math.min(1, Math.sin(diff)));
	}

	private createContext(): EventContext {
		return {
			camera: this.camera,
			audio: this.audio,
			phase: this.currentPhase,
			proximity: this.currentProximity,
			frame: (op: OpeningId) => this.openings.getFrame(op),
			glass: (op: OpeningId): GlassDamageApi => this.openings.getGlassDamageApi(op),
			lights: this.openings.getExteriorLightsApi(),
			pan: (op: OpeningId) => this.calculatePan(op),
			isVisible: (op: OpeningId) => this.isOpeningVisible(op),
			shake: (intensity: number) => this.onCameraShake?.(intensity),
			glitch: (amount: number, duration: number) => this.onGlitch?.(amount, duration),
			cabinBlackout: (duration: number) => this.onCabinBlackout?.(duration),
			setAmbientLife: (level: number) => this.onAmbientLifeChange?.(level)
		};
	}

	public update(delta: number): void {
		if (this.activeActor) {
			const ctx = this.createContext();
			const isStillActive = this.activeActor.update(delta, ctx);
			if (!isStillActive) {
				this.activeActor = null;

				const baseInterval = this.currentProximity > 60 ? 16 : 28;
				this.nextEventTimer = baseInterval + Math.random() * (baseInterval * 0.5);
			}
		} else {
			this.nextEventTimer -= delta;
			if (this.nextEventTimer <= 0) {
				this.triggerEvent();
			}
		}
	}

	public stopCurrentEvent(): void {
		if (this.activeActor) {
			this.activeActor.stop();
			this.activeActor = null;
		}
	}

	public isEventActive(): boolean {
		return this.activeActor !== null;
	}

	public getActiveEventType(): WindowEventType | null {
		return this.activeActor?.type ?? null;
	}
}

