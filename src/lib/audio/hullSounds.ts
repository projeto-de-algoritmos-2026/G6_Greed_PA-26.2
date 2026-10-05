import { connectOutput, createSaturationNode } from './helpers';

export class HullSoundSynthesizer {
	public playHullCreak(ctx: AudioContext | null, masterGain: GainNode | null, isMuted: boolean): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const filter = ctx.createBiquadFilter();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(95, now);
		osc.frequency.linearRampToValueAtTime(140, now + 0.3);
		osc.frequency.linearRampToValueAtTime(75, now + 0.6);

		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(350, now);
		filter.Q.setValueAtTime(12.0, now);

		gain.gain.setValueAtTime(0.01, now);
		gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(masterGain);

		osc.start(now);
		osc.stop(now + 0.75);
	}

	public playCatastrophicBreach(ctx: AudioContext | null, masterGain: GainNode | null): void {
		if (!ctx || !masterGain) return;

		const now = ctx.currentTime;

		const impactOsc = ctx.createOscillator();
		const impactGain = ctx.createGain();
		impactOsc.type = 'triangle';
		impactOsc.frequency.setValueAtTime(150, now);
		impactOsc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
		impactGain.gain.setValueAtTime(0.8, now);
		impactGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
		impactOsc.connect(impactGain);
		impactGain.connect(masterGain);
		impactOsc.start(now);
		impactOsc.stop(now + 1.3);

		const bufferSize = ctx.sampleRate * 2;
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(800, now);
		filter.frequency.linearRampToValueAtTime(2500, now + 0.5);

		const noiseGain = ctx.createGain();
		noiseGain.gain.setValueAtTime(0.6, now);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(masterGain);

		noise.start(now);
		noise.stop(now + 2.0);
	}

	public playHullKnock(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;

		const thudOsc = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thudOsc.type = 'sine';
		thudOsc.frequency.setValueAtTime(140, now);
		thudOsc.frequency.exponentialRampToValueAtTime(32, now + 0.55);

		thudGain.gain.setValueAtTime(0.85, now);
		thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

		const sat = createSaturationNode(ctx, 2.2);
		if (sat) {
			thudOsc.connect(thudGain);
			thudGain.connect(sat);
			connectOutput(ctx, masterGain, sat, pan);
		} else {
			thudOsc.connect(thudGain);
			connectOutput(ctx, masterGain, thudGain, pan);
		}
		thudOsc.start(now);
		thudOsc.stop(now + 0.65);

		const clangOsc = ctx.createOscillator();
		const clangGain = ctx.createGain();
		clangOsc.type = 'triangle';
		clangOsc.frequency.setValueAtTime(360, now + 0.015);
		clangOsc.frequency.exponentialRampToValueAtTime(180, now + 0.45);

		const clangFilter = ctx.createBiquadFilter();
		clangFilter.type = 'bandpass';
		clangFilter.frequency.setValueAtTime(360, now + 0.015);
		clangFilter.Q.setValueAtTime(7.5, now);

		clangGain.gain.setValueAtTime(0.45, now + 0.015);
		clangGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

		clangOsc.connect(clangFilter);
		clangFilter.connect(clangGain);
		connectOutput(ctx, masterGain, clangGain, pan);
		clangOsc.start(now + 0.015);
		clangOsc.stop(now + 0.75);
	}
}

