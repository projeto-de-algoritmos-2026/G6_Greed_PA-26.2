import { autoCleanup } from './helpers';

export class UISoundSynthesizer {
	public playSonarPing(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		isOne: boolean = false
	): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;
		const baseFreq = isOne ? 1480 : 1100;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const filter = ctx.createBiquadFilter();

		const delay = ctx.createDelay();
		const delayFeedback = ctx.createGain();

		delay.delayTime.setValueAtTime(0.18, now);
		delayFeedback.gain.setValueAtTime(0.35, now);

		osc.type = isOne ? 'triangle' : 'sine';
		osc.frequency.setValueAtTime(baseFreq, now);
		osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.35);

		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(baseFreq, now);
		filter.Q.setValueAtTime(8.0, now);

		gain.gain.setValueAtTime(0.4, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(masterGain);

		gain.connect(delay);
		delay.connect(delayFeedback);
		delayFeedback.connect(delay);
		delay.connect(masterGain);

		autoCleanup(osc, filter, gain, delay, delayFeedback);

		osc.start(now);
		osc.stop(now + 0.6);
	}

	public playSymbolBoundary(ctx: AudioContext | null, masterGain: GainNode | null, isMuted: boolean): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(660, now);
		osc.frequency.setValueAtTime(990, now + 0.05);

		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

		osc.connect(gain);
		gain.connect(masterGain);

		autoCleanup(osc, gain);

		osc.start(now);
		osc.stop(now + 0.15);
	}

	public playRelayClick(ctx: AudioContext | null, masterGain: GainNode | null, isMuted: boolean): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const filter = ctx.createBiquadFilter();

		osc.type = 'square';
		osc.frequency.setValueAtTime(320, now);
		osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);

		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(1200, now);
		filter.Q.setValueAtTime(3.0, now);

		gain.gain.setValueAtTime(0.25, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(masterGain);

		autoCleanup(osc, filter, gain);

		osc.start(now);
		osc.stop(now + 0.04);
	}

	public playMergeSound(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		isGreedy: boolean = true
	): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;
		const frequencies = isGreedy ? [440, 660, 880] : [280, 310];

		frequencies.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = isGreedy ? 'sine' : 'sawtooth';
			osc.frequency.setValueAtTime(freq, now + idx * 0.03);

			gain.gain.setValueAtTime(0.2 / frequencies.length, now + idx * 0.03);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

			osc.connect(gain);
			gain.connect(masterGain);

			autoCleanup(osc, gain);

			osc.start(now + idx * 0.03);
			osc.stop(now + 0.3);
		});
	}

	public playUndoSound(ctx: AudioContext | null, masterGain: GainNode | null, isMuted: boolean): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(450, now);
		osc.frequency.linearRampToValueAtTime(150, now + 0.12);

		gain.gain.setValueAtTime(0.2, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

		osc.connect(gain);
		gain.connect(masterGain);

		autoCleanup(osc, gain);

		osc.start(now);
		osc.stop(now + 0.15);
	}

	public playTransmissionSuccess(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean
	): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(110, now);
		osc.frequency.exponentialRampToValueAtTime(32, now + 1.8);

		gain.gain.setValueAtTime(0.35, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

		osc.connect(gain);
		gain.connect(masterGain);
		autoCleanup(osc, gain);
		osc.start(now);
		osc.stop(now + 2.1);

		const bufferSize = Math.floor(ctx.sampleRate * 1.5);
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(450, now);
		filter.frequency.exponentialRampToValueAtTime(80, now + 1.5);

		const noiseGain = ctx.createGain();
		noiseGain.gain.setValueAtTime(0.18, now);
		noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(masterGain);
		autoCleanup(noise, filter, noiseGain);
		noise.start(now);
		noise.stop(now + 1.6);
	}

	public playCabinetDoor(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		isOpen: boolean
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;

		if (isOpen) {
			for (const offset of [0, 0.045]) {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'triangle';
				osc.frequency.setValueAtTime(offset === 0 ? 1550 : 980, now + offset);
				gain.gain.setValueAtTime(0.18, now + offset);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.04);
				osc.connect(gain);
				gain.connect(masterGain);
				autoCleanup(osc, gain);
				osc.start(now + offset);
				osc.stop(now + offset + 0.05);
			}

			const hingeOsc = ctx.createOscillator();
			const hingeGain = ctx.createGain();
			const hingeFilter = ctx.createBiquadFilter();
			hingeOsc.type = 'sawtooth';
			hingeOsc.frequency.setValueAtTime(320, now + 0.05);
			hingeOsc.frequency.linearRampToValueAtTime(460, now + 0.25);
			hingeOsc.frequency.exponentialRampToValueAtTime(170, now + 0.55);

			hingeFilter.type = 'bandpass';
			hingeFilter.frequency.setValueAtTime(680, now + 0.05);
			hingeFilter.Q.setValueAtTime(7.5, now + 0.05);

			hingeGain.gain.setValueAtTime(0.001, now + 0.05);
			hingeGain.gain.linearRampToValueAtTime(0.11, now + 0.18);
			hingeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

			hingeOsc.connect(hingeFilter);
			hingeFilter.connect(hingeGain);
			hingeGain.connect(masterGain);
			autoCleanup(hingeOsc, hingeFilter, hingeGain);
			hingeOsc.start(now + 0.05);
			hingeOsc.stop(now + 0.65);
		} else {
			const impactOsc = ctx.createOscillator();
			const impactGain = ctx.createGain();
			impactOsc.type = 'sine';
			impactOsc.frequency.setValueAtTime(135, now);
			impactOsc.frequency.exponentialRampToValueAtTime(36, now + 0.22);
			impactGain.gain.setValueAtTime(0.35, now);
			impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

			impactOsc.connect(impactGain);
			impactGain.connect(masterGain);
			autoCleanup(impactOsc, impactGain);
			impactOsc.start(now);
			impactOsc.stop(now + 0.25);

			const bufferSize = Math.floor(ctx.sampleRate * 0.18);
			const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

			const noise = ctx.createBufferSource();
			noise.buffer = buffer;
			const filter = ctx.createBiquadFilter();
			filter.type = 'bandpass';
			filter.frequency.setValueAtTime(820, now);
			filter.Q.setValueAtTime(3.8, now);

			const noiseGain = ctx.createGain();
			noiseGain.gain.setValueAtTime(0.22, now);
			noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

			noise.connect(filter);
			filter.connect(noiseGain);
			noiseGain.connect(masterGain);
			autoCleanup(noise, filter, noiseGain);
			noise.start(now);
			noise.stop(now + 0.2);
		}
	}

	public playBootSound(ctx: AudioContext | null, masterGain: GainNode | null, isMuted: boolean): void {
		if (!ctx || !masterGain || isMuted) return;

		const now = ctx.currentTime;

		this.playRelayClick(ctx, masterGain, isMuted);

		const notes = [
			{ freq: 155.56, time: 0.05, duration: 2.2, gain: 0.16, type: 'sine' as OscillatorType },
			{ freq: 233.08, time: 0.20, duration: 2.0, gain: 0.15, type: 'sine' as OscillatorType },
			{ freq: 311.13, time: 0.35, duration: 2.1, gain: 0.18, type: 'triangle' as OscillatorType },
			{ freq: 392.00, time: 0.50, duration: 2.2, gain: 0.16, type: 'triangle' as OscillatorType },
			{ freq: 466.16, time: 0.65, duration: 2.3, gain: 0.14, type: 'sine' as OscillatorType },
			{ freq: 622.25, time: 0.78, duration: 2.0, gain: 0.08, type: 'sine' as OscillatorType }
		];

		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(1400, now);
		filter.frequency.exponentialRampToValueAtTime(3200, now + 0.7);
		filter.frequency.exponentialRampToValueAtTime(800, now + 2.5);
		filter.connect(masterGain);

		notes.forEach((n, idx) => {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();

			osc.type = n.type;
			osc.frequency.setValueAtTime(n.freq, now + n.time);

			g.gain.setValueAtTime(0.0001, now + n.time);
			g.gain.linearRampToValueAtTime(n.gain, now + n.time + 0.08);
			g.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.duration);

			osc.connect(g);
			g.connect(filter);

			if (idx === notes.length - 1) {
				autoCleanup(osc, g, filter);
			} else {
				autoCleanup(osc, g);
			}

			osc.start(now + n.time);
			osc.stop(now + n.time + n.duration + 0.1);
		});
	}
}


