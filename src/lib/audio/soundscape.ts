import { AbyssalDrone } from './drone';
import { AlarmSystem } from './alarm';
import { UISoundSynthesizer } from './uiSounds';
import { HullSoundSynthesizer } from './hullSounds';
import { CreatureSoundSynthesizer } from './creatureSounds';

export class ProceduralAudioEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private isInitialized: boolean = false;
	private isMuted: boolean = false;

	private drone = new AbyssalDrone();
	private alarm = new AlarmSystem();
	private uiSounds = new UISoundSynthesizer();
	private hullSounds = new HullSoundSynthesizer();
	private creatureSounds = new CreatureSoundSynthesizer();

	constructor() {}

	public async init(): Promise<void> {
		if (this.isInitialized && this.ctx) {
			if (this.ctx.state === 'suspended') {
				await this.ctx.resume();
			}
			return;
		}

		const AudioCtx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		this.ctx = new AudioCtx();

		this.masterGain = this.ctx.createGain();
		this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
		this.masterGain.connect(this.ctx.destination);

		this.drone.init(this.ctx, this.masterGain);
		this.isInitialized = true;
	}

	public get active(): boolean {
		return this.isInitialized && this.ctx?.state === 'running';
	}

	public toggleMute(): boolean {
		if (!this.masterGain || !this.ctx) return false;
		this.isMuted = !this.isMuted;
		this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
		return this.isMuted;
	}

	public setProximityTension(proximity: number): void {
		if (!this.ctx || !this.isInitialized) return;
		this.drone.setTension(this.ctx, proximity);
	}

	public playSonarPing(isOne: boolean = false): void {
		this.uiSounds.playSonarPing(this.ctx, this.masterGain, this.isMuted, isOne);
	}

	public playRelayClick(): void {
		this.uiSounds.playRelayClick(this.ctx, this.masterGain, this.isMuted);
	}

	public playMergeSound(isGreedy: boolean = true): void {
		this.uiSounds.playMergeSound(this.ctx, this.masterGain, this.isMuted, isGreedy);
	}

	public playUndoSound(): void {
		this.uiSounds.playUndoSound(this.ctx, this.masterGain, this.isMuted);
	}

	public startProximityAlarm(): void {
		this.alarm.start(this.ctx, this.masterGain, this.isMuted);
	}

	public stopProximityAlarm(): void {
		this.alarm.stop();
	}

	public playHullCreak(): void {
		this.hullSounds.playHullCreak(this.ctx, this.masterGain, this.isMuted);
	}

	public playCatastrophicBreach(): void {
		this.stopProximityAlarm();
		this.hullSounds.playCatastrophicBreach(this.ctx, this.masterGain);
	}

	public playTransmissionSuccess(): void {
		this.stopProximityAlarm();
		this.uiSounds.playTransmissionSuccess(this.ctx, this.masterGain, this.isMuted);
	}

	public playCabinetDoor(isOpen: boolean): void {
		this.uiSounds.playCabinetDoor(this.ctx, this.masterGain, this.isMuted, isOpen);
	}

	public playBootSound(): void {
		this.uiSounds.playBootSound(this.ctx, this.masterGain, this.isMuted);
	}

	public playDeepWaterSurge(intensity: number = 1.0, pan: number = 0): void {
		this.creatureSounds.playDeepWaterSurge(this.ctx, this.masterGain, this.isMuted, intensity, pan);
	}

	public playWindowImpact(pan: number = 0): void {
		this.creatureSounds.playWindowImpact(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playWindowScrape(pan: number = 0): void {
		this.creatureSounds.playWindowScrape(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playBioluminescentHum(pan: number = 0): void {
		this.creatureSounds.playBioluminescentHum(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playSwarmScatter(pan: number = 0): void {
		this.creatureSounds.playSwarmScatter(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playLightFailureSpark(pan: number = 0): void {
		this.creatureSounds.playLightFailureSpark(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playIsopodClicks(pan: number = 0): void {
		this.creatureSounds.playIsopodClicks(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playDeadDiverDrift(pan: number = 0): void {
		this.creatureSounds.playDeadDiverDrift(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playColossalEyePulse(pan: number = 0): void {
		this.creatureSounds.playColossalEyePulse(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playMawPress(pan: number = 0): void {
		this.creatureSounds.playMawPress(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public playHullKnock(pan: number = 0): void {
		this.hullSounds.playHullKnock(this.ctx, this.masterGain, this.isMuted, pan);
	}

	public dispose(): void {
		this.stopProximityAlarm();
		this.drone.stop();
		if (this.ctx) {
			this.ctx.close();
			this.ctx = null;
		}
		this.isInitialized = false;
	}
}

