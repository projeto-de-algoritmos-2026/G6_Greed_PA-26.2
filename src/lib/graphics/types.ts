import type * as THREE from 'three';
import type { ProceduralAudioEngine } from '../audio/soundscape';

export type OpeningId = 'hatch';
export type EventTier = 1 | 2 | 3;
export type ScenePhase = 1 | 2 | 3;

export type WindowEventType =
	| 'LANTERN_SWARM'
	| 'SIPHONOPHORE'
	| 'GIANT_ISOPODS'
	| 'LEVIATHAN_SHADOWS'
	| 'LURKING_PREDATOR'
	| 'COLOSSAL_EYE'
	| 'MASSIVE_ECLIPSE'
	| 'DEAD_DIVER'
	| 'LIGHT_FAILURE'
	| 'TENTACLE_INSPECTION'
	| 'QUARTZ_IMPACT'
	| 'CLAW_SCRAPE'
	| 'MAW_PRESS';

export type CabinFocusTarget = 'main' | 'aux' | 'manual' | 'window' | 'poster' | 'none';

export type PlayerActionType =
	| 'BAD_MERGE'
	| 'GOOD_MERGE'
	| 'UNDO'
	| 'RESET'
	| 'TRANSMIT_START'
	| 'TRANSMIT_BIT'
	| 'VICTORY'
	| 'GAME_OVER'
	| 'LEVEL_LOAD';

export interface OpeningFrame {
	id: OpeningId;
	pivot: THREE.Group;
	glassRadius: number;
}

export type ScratchCreatureType =
	| WindowEventType
	| 'claw'
	| 'maw'
	| 'tentacle'
	| 'ghoul'
	| 'isopod'
	| 'diver'
	| 'quartz'
	| 'predator'
	| 'eye'
	| 'eclipse'
	| 'lantern'
	| 'siphonophore'
	| 'shadows'
	| 'default';

export interface GlassDamageApi {
	addCrack(x: number, y: number, severity: number): void;
	addScratch(x: number, y: number, severity: number, creatureType?: ScratchCreatureType | string): void;
	addScratchStroke(points: ReadonlyArray<readonly [number, number]>, width?: number, creatureType?: ScratchCreatureType | string): void;
	addSmear(x: number, y: number, radius: number): void;
}

export interface ExteriorLightsApi {
	setLevel(op: OpeningId, level: number): void;
	getLevel(op: OpeningId): number;
	flicker(op: OpeningId, duration: number): void;
	setAim(op: OpeningId, yaw: number, pitch: number): void;
}

export interface EventContext {
	readonly camera: THREE.PerspectiveCamera;
	readonly audio: ProceduralAudioEngine | null;
	readonly phase: ScenePhase;
	readonly proximity: number;
	frame(op: OpeningId): OpeningFrame;
	glass(op: OpeningId): GlassDamageApi;
	readonly lights: ExteriorLightsApi;
	pan(op: OpeningId): number;
	isVisible(op: OpeningId): boolean;
	shake(intensity: number): void;
	glitch(amount: number, duration: number): void;
	cabinBlackout(duration: number): void;
	setAmbientLife(level: number): void;
}

export interface StartOptions {
	opening: OpeningId;
	jumpscare: boolean;
}

export interface WindowEventActor {
	readonly type: WindowEventType;
	readonly tier: EventTier;
	readonly openings: readonly OpeningId[];
	readonly supportsJumpscare: boolean;
	readonly root: THREE.Group;
	start(ctx: EventContext, opts: StartOptions): void;
	update(dt: number, ctx: EventContext): boolean;
	stop(): void;
}

