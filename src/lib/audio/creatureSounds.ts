import { connectOutput, createCrackleBuffer, createSaturationNode } from './helpers';

export class CreatureSoundSynthesizer {
	public playDeepWaterSurge(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		intensity: number = 1.0,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 4.2;

		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const subGain = ctx.createGain();
		osc1.type = 'sine';
		osc2.type = 'triangle';
		osc1.frequency.setValueAtTime(52, now);
		osc1.frequency.exponentialRampToValueAtTime(26, now + dur);
		osc2.frequency.setValueAtTime(54.5, now);
		osc2.frequency.exponentialRampToValueAtTime(28, now + dur);

		subGain.gain.setValueAtTime(0.001, now);
		subGain.gain.linearRampToValueAtTime(0.32 * intensity, now + 1.1);
		subGain.gain.setValueAtTime(0.26 * intensity, now + dur * 0.6);
		subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		const sat = createSaturationNode(ctx, 2.4);
		osc1.connect(subGain);
		osc2.connect(subGain);
		if (sat) {
			subGain.connect(sat);
			connectOutput(ctx, masterGain, sat, pan);
		} else {
			connectOutput(ctx, masterGain, subGain, pan);
		}
		osc1.start(now);
		osc2.start(now);
		osc1.stop(now + dur + 0.1);
		osc2.stop(now + dur + 0.1);

		const bufferSize = Math.floor(ctx.sampleRate * dur);
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		let last = 0;
		for (let i = 0; i < bufferSize; i++) {
			const w = Math.random() * 2 - 1;
			data[i] = (last + 0.03 * w) / 1.03;
			last = data[i];
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(80, now);
		filter.frequency.linearRampToValueAtTime(210, now + 1.4);
		filter.frequency.exponentialRampToValueAtTime(32, now + dur);

		const noiseGain = ctx.createGain();
		noiseGain.gain.setValueAtTime(0.001, now);
		noiseGain.gain.linearRampToValueAtTime(0.24 * intensity, now + 1.2);
		noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		noise.connect(filter);
		filter.connect(noiseGain);
		connectOutput(ctx, masterGain, noiseGain, pan);
		noise.start(now);
		noise.stop(now + dur + 0.1);
	}

	public playWindowImpact(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;

		const subOsc = ctx.createOscillator();
		const subGain = ctx.createGain();
		subOsc.type = 'sine';
		subOsc.frequency.setValueAtTime(88, now);
		subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.85);

		subGain.gain.setValueAtTime(0.45, now);
		subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

		const sat = createSaturationNode(ctx, 4.2);
		if (sat) {
			subOsc.connect(subGain);
			subGain.connect(sat);
			connectOutput(ctx, masterGain, sat, pan);
		} else {
			subOsc.connect(subGain);
			connectOutput(ctx, masterGain, subGain, pan);
		}
		subOsc.start(now);
		subOsc.stop(now + 1.25);

		const crackOsc = ctx.createOscillator();
		const crackGain = ctx.createGain();
		crackOsc.type = 'sawtooth';
		crackOsc.frequency.setValueAtTime(4200, now);
		crackOsc.frequency.exponentialRampToValueAtTime(1450, now + 0.08);

		crackGain.gain.setValueAtTime(0.38, now);
		crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

		const crackFilter = ctx.createBiquadFilter();
		crackFilter.type = 'bandpass';
		crackFilter.frequency.setValueAtTime(3600, now);
		crackFilter.Q.setValueAtTime(3.2, now);

		crackOsc.connect(crackFilter);
		crackFilter.connect(crackGain);
		connectOutput(ctx, masterGain, crackGain, pan);
		crackOsc.start(now);
		crackOsc.stop(now + 0.14);

		const shatterBuf = createCrackleBuffer(ctx, 0.18, 0.25);
		if (shatterBuf) {
			const shatterSource = ctx.createBufferSource();
			shatterSource.buffer = shatterBuf;
			const shatterFilter = ctx.createBiquadFilter();
			shatterFilter.type = 'highpass';
			shatterFilter.frequency.setValueAtTime(2600, now);
			const shatterGain = ctx.createGain();
			shatterGain.gain.setValueAtTime(0.32, now);
			shatterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

			shatterSource.connect(shatterFilter);
			shatterFilter.connect(shatterGain);
			connectOutput(ctx, masterGain, shatterGain, pan);
			shatterSource.start(now);
			shatterSource.stop(now + 0.2);
		}

		const crackDelays = [0.035, 0.085, 0.16, 0.26, 0.42];
		crackDelays.forEach((delay, idx) => {
			const tickTime = now + delay;
			const tickOsc = ctx.createOscillator();
			const tickGain = ctx.createGain();
			tickOsc.type = 'triangle';
			tickOsc.frequency.setValueAtTime(3800 - idx * 350, tickTime);
			tickOsc.frequency.exponentialRampToValueAtTime(1800, tickTime + 0.025);

			tickGain.gain.setValueAtTime(0.35 - idx * 0.05, tickTime);
			tickGain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.035);

			tickOsc.connect(tickGain);
			connectOutput(ctx, masterGain, tickGain, pan);
			tickOsc.start(tickTime);
			tickOsc.stop(tickTime + 0.04);
		});

		const ringOsc = ctx.createOscillator();
		const ringGain = ctx.createGain();
		ringOsc.type = 'sine';
		ringOsc.frequency.setValueAtTime(285, now + 0.02);

		const ringFilter = ctx.createBiquadFilter();
		ringFilter.type = 'bandpass';
		ringFilter.frequency.setValueAtTime(285, now + 0.02);
		ringFilter.Q.setValueAtTime(8.5, now);

		ringGain.gain.setValueAtTime(0.42, now + 0.02);
		ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

		ringOsc.connect(ringFilter);
		ringFilter.connect(ringGain);
		connectOutput(ctx, masterGain, ringGain, pan);
		ringOsc.start(now + 0.02);
		ringOsc.stop(now + 1.45);
	}

	public playWindowScrape(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 2.4;

		const sampleRate = ctx.sampleRate;
		const length = Math.floor(sampleRate * dur);
		const scrapeBuffer = ctx.createBuffer(1, length, sampleRate);
		const sData = scrapeBuffer.getChannelData(0);

		let last = 0;
		let envelopeMod = 0.5;

		for (let i = 0; i < length; i++) {
			if (i % 380 === 0) {
				envelopeMod = 0.25 + Math.random() * 0.75;
			}

			const white = Math.random() * 2 - 1;
			last = (last + 0.14 * white) / 1.14;

			let sample = (white * 0.75 + last * 0.25) * envelopeMod;
			if (Math.random() < 0.035) {
				sample += (Math.random() > 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.9);
			}

			sData[i] = Math.max(-1, Math.min(1, sample * 0.32));
		}

		const scrapeSource = ctx.createBufferSource();
		scrapeSource.buffer = scrapeBuffer;

		const scrapeFilter1 = ctx.createBiquadFilter();
		scrapeFilter1.type = 'bandpass';
		scrapeFilter1.frequency.setValueAtTime(2150, now);
		scrapeFilter1.frequency.linearRampToValueAtTime(1750, now + dur);
		scrapeFilter1.Q.setValueAtTime(4.2, now);

		const scrapeFilter2 = ctx.createBiquadFilter();
		scrapeFilter2.type = 'bandpass';
		scrapeFilter2.frequency.setValueAtTime(3600, now);
		scrapeFilter2.frequency.linearRampToValueAtTime(2900, now + dur);
		scrapeFilter2.Q.setValueAtTime(3.8, now);

		const scrapeGain = ctx.createGain();
		scrapeGain.gain.setValueAtTime(0.001, now);
		scrapeGain.gain.linearRampToValueAtTime(0.36, now + 0.12);
		scrapeGain.gain.setValueAtTime(0.30, now + dur * 0.75);
		scrapeGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		const sat = createSaturationNode(ctx, 1.8);
		scrapeSource.connect(scrapeFilter1);
		scrapeSource.connect(scrapeFilter2);
		scrapeFilter1.connect(scrapeGain);
		scrapeFilter2.connect(scrapeGain);

		if (sat) {
			scrapeGain.connect(sat);
			connectOutput(ctx, masterGain, sat, pan);
		} else {
			connectOutput(ctx, masterGain, scrapeGain, pan);
		}
		scrapeSource.start(now);
		scrapeSource.stop(now + dur + 0.1);

		const highBuf = createCrackleBuffer(ctx, dur, 0.12);
		if (highBuf) {
			const highSource = ctx.createBufferSource();
			highSource.buffer = highBuf;

			const highFilter = ctx.createBiquadFilter();
			highFilter.type = 'highpass';
			highFilter.frequency.setValueAtTime(4200, now);

			const highGain = ctx.createGain();
			highGain.gain.setValueAtTime(0.001, now);
			highGain.gain.linearRampToValueAtTime(0.42, now + 0.15);
			highGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

			highSource.connect(highFilter);
			highFilter.connect(highGain);
			connectOutput(ctx, masterGain, highGain, pan);
			highSource.start(now);
			highSource.stop(now + dur + 0.1);
		}

		const hullRumble = ctx.createBuffer(1, length, sampleRate);
		const hrData = hullRumble.getChannelData(0);
		let rLast = 0;
		for (let i = 0; i < length; i++) {
			const w = Math.random() * 2 - 1;
			rLast = (rLast + 0.04 * w) / 1.04;
			hrData[i] = rLast * 0.5;
		}

		const rSource = ctx.createBufferSource();
		rSource.buffer = hullRumble;
		const rFilter = ctx.createBiquadFilter();
		rFilter.type = 'lowpass';
		rFilter.frequency.setValueAtTime(140, now);

		const rGain = ctx.createGain();
		rGain.gain.setValueAtTime(0.001, now);
		rGain.gain.linearRampToValueAtTime(0.45, now + 0.2);
		rGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		rSource.connect(rFilter);
		rFilter.connect(rGain);
		connectOutput(ctx, masterGain, rGain, pan);
		rSource.start(now);
		rSource.stop(now + dur + 0.1);
	}

	public playBioluminescentHum(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 4.2;

		const freqs = [196.0, 293.66, 440.0];
		freqs.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, now);

			const lfo = ctx.createOscillator();
			const lfoGain = ctx.createGain();
			lfo.frequency.setValueAtTime(0.7 + idx * 0.2, now);
			lfoGain.gain.setValueAtTime(2.8, now);
			lfo.connect(osc.frequency);
			lfo.start(now);
			lfo.stop(now + dur);

			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(0.09 / freqs.length, now + 1.2);
			gain.gain.setValueAtTime(0.08 / freqs.length, now + dur - 1.2);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

			osc.connect(gain);
			connectOutput(ctx, masterGain, gain, pan);
			osc.start(now);
			osc.stop(now + dur + 0.1);
		});
	}

	public playSwarmScatter(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 1.8;

		const bufferSize = Math.floor(ctx.sampleRate * dur);
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(1200, now);
		filter.frequency.linearRampToValueAtTime(2400, now + 0.4);
		filter.frequency.exponentialRampToValueAtTime(600, now + dur);
		filter.Q.setValueAtTime(4.2, now);

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		noise.connect(filter);
		filter.connect(gain);
		connectOutput(ctx, masterGain, gain, pan);
		noise.start(now);
		noise.stop(now + dur + 0.1);
	}

	public playLightFailureSpark(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(80, now);
		osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
		osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

		gain.gain.setValueAtTime(0.4, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

		osc.connect(gain);
		connectOutput(ctx, masterGain, gain, pan);
		osc.start(now);
		osc.stop(now + 0.2);

		const relay = ctx.createOscillator();
		const rGain = ctx.createGain();
		relay.type = 'square';
		relay.frequency.setValueAtTime(60, now + 0.04);
		rGain.gain.setValueAtTime(0.25, now + 0.04);
		rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
		relay.connect(rGain);
		connectOutput(ctx, masterGain, rGain, pan);
		relay.start(now + 0.04);
		relay.stop(now + 0.23);
	}

	public playIsopodClicks(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const clicks = 8 + Math.floor(Math.random() * 6);

		const scrapeBuf = createCrackleBuffer(ctx, 1.4, 0.12);
		if (scrapeBuf) {
			const sSource = ctx.createBufferSource();
			sSource.buffer = scrapeBuf;
			const sFilter = ctx.createBiquadFilter();
			sFilter.type = 'bandpass';
			sFilter.frequency.setValueAtTime(3200, now);
			sFilter.Q.setValueAtTime(4.0, now);

			const sGain = ctx.createGain();
			sGain.gain.setValueAtTime(0.001, now);
			sGain.gain.linearRampToValueAtTime(0.18, now + 0.1);
			sGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

			sSource.connect(sFilter);
			sFilter.connect(sGain);
			connectOutput(ctx, masterGain, sGain, pan);
			sSource.start(now);
			sSource.stop(now + 1.5);
		}

		for (let i = 0; i < clicks; i++) {
			const clickTime = now + i * 0.11 + Math.random() * 0.09;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = Math.random() > 0.4 ? 'triangle' : 'sawtooth';
			const startFreq = 2600 + Math.random() * 2200;
			osc.frequency.setValueAtTime(startFreq, clickTime);
			osc.frequency.exponentialRampToValueAtTime(700 + Math.random() * 400, clickTime + 0.025);

			gain.gain.setValueAtTime(0.32 + Math.random() * 0.12, clickTime);
			gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.03);

			osc.connect(gain);
			connectOutput(ctx, masterGain, gain, pan + (Math.random() - 0.5) * 0.3);
			osc.start(clickTime);
			osc.stop(clickTime + 0.035);
		}
	}

	public playDeadDiverDrift(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 2.8;

		const bufferSize = Math.floor(ctx.sampleRate * dur);
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(420, now);
		filter.frequency.linearRampToValueAtTime(750, now + 1.2);
		filter.frequency.linearRampToValueAtTime(280, now + dur);
		filter.Q.setValueAtTime(3.8, now);

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.24, now + 0.8);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		noise.connect(filter);
		filter.connect(gain);
		connectOutput(ctx, masterGain, gain, pan);
		noise.start(now);
		noise.stop(now + dur + 0.1);
	}

	public playColossalEyePulse(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 3.8;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(38, now);
		osc.frequency.linearRampToValueAtTime(46, now + 1.5);
		osc.frequency.exponentialRampToValueAtTime(20, now + dur);

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.58, now + 1.2);
		gain.gain.setValueAtTime(0.5, now + 2.2);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		const sat = createSaturationNode(ctx, 2.0);
		if (sat) {
			osc.connect(gain);
			gain.connect(sat);
			connectOutput(ctx, masterGain, sat, pan);
		} else {
			connectOutput(ctx, masterGain, gain, pan);
		}
		osc.start(now);
		osc.stop(now + dur + 0.1);

		const humOsc = ctx.createOscillator();
		const humMod = ctx.createOscillator();
		const humModGain = ctx.createGain();
		humOsc.type = 'triangle';
		humOsc.frequency.setValueAtTime(185, now);
		humMod.type = 'sine';
		humMod.frequency.setValueAtTime(3.2, now);
		humModGain.gain.setValueAtTime(28, now);

		humMod.connect(humModGain);
		humModGain.connect(humOsc.frequency);

		const humFilter = ctx.createBiquadFilter();
		humFilter.type = 'bandpass';
		humFilter.frequency.setValueAtTime(240, now);
		humFilter.frequency.linearRampToValueAtTime(380, now + 1.6);
		humFilter.Q.setValueAtTime(4.5, now);

		const humGain = ctx.createGain();
		humGain.gain.setValueAtTime(0.001, now);
		humGain.gain.linearRampToValueAtTime(0.25, now + 1.2);
		humGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		humOsc.connect(humFilter);
		humFilter.connect(humGain);
		connectOutput(ctx, masterGain, humGain, pan);
		humMod.start(now);
		humOsc.start(now);
		humMod.stop(now + dur + 0.1);
		humOsc.stop(now + dur + 0.1);
	}

	public playMawPress(
		ctx: AudioContext | null,
		masterGain: GainNode | null,
		isMuted: boolean,
		pan: number = 0
	): void {
		if (!ctx || !masterGain || isMuted) return;
		const now = ctx.currentTime;
		const dur = 2.8;

		const subOsc = ctx.createOscillator();
		const subGain = ctx.createGain();
		subOsc.type = 'sawtooth';
		subOsc.frequency.setValueAtTime(62, now);
		subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.4);
		subOsc.frequency.exponentialRampToValueAtTime(22, now + dur);

		const subFilter = ctx.createBiquadFilter();
		subFilter.type = 'lowpass';
		subFilter.frequency.setValueAtTime(110, now);
		subFilter.Q.setValueAtTime(3.0, now);

		subGain.gain.setValueAtTime(0.01, now);
		subGain.gain.linearRampToValueAtTime(0.42, now + 0.05);
		subGain.gain.setValueAtTime(0.35, now + 1.2);
		subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		const subSat = createSaturationNode(ctx, 3.5);
		if (subSat) {
			subOsc.connect(subFilter);
			subFilter.connect(subGain);
			subGain.connect(subSat);
			connectOutput(ctx, masterGain, subSat, pan);
		} else {
			subOsc.connect(subFilter);
			subFilter.connect(subGain);
			connectOutput(ctx, masterGain, subGain, pan);
		}
		subOsc.start(now);
		subOsc.stop(now + dur + 0.1);

		const gutturalCarrier = ctx.createOscillator();
		gutturalCarrier.type = 'sawtooth';
		gutturalCarrier.frequency.setValueAtTime(105, now);
		gutturalCarrier.frequency.linearRampToValueAtTime(78, now + 0.8);
		gutturalCarrier.frequency.linearRampToValueAtTime(48, now + dur);

		const gutturalMod = ctx.createOscillator();
		gutturalMod.type = 'sawtooth';
		gutturalMod.frequency.setValueAtTime(36, now);
		gutturalMod.frequency.linearRampToValueAtTime(24, now + dur);
		const gutturalModGain = ctx.createGain();
		gutturalModGain.gain.setValueAtTime(140, now);
		gutturalMod.connect(gutturalModGain);
		gutturalModGain.connect(gutturalCarrier.frequency);

		const throatFilter = ctx.createBiquadFilter();
		throatFilter.type = 'peaking';
		throatFilter.frequency.setValueAtTime(380, now);
		throatFilter.Q.setValueAtTime(4.0, now);
		throatFilter.gain.setValueAtTime(12.0, now);

		const mouthFilter = ctx.createBiquadFilter();
		mouthFilter.type = 'lowpass';
		mouthFilter.frequency.setValueAtTime(680, now);

		const gutturalGain = ctx.createGain();
		gutturalGain.gain.setValueAtTime(0.001, now);
		gutturalGain.gain.linearRampToValueAtTime(0.32, now + 0.15);
		gutturalGain.gain.setValueAtTime(0.26, now + 1.4);
		gutturalGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

		const gutturalSat = createSaturationNode(ctx, 2.2);
		gutturalCarrier.connect(throatFilter);
		throatFilter.connect(mouthFilter);
		mouthFilter.connect(gutturalGain);
		if (gutturalSat) {
			gutturalGain.connect(gutturalSat);
			connectOutput(ctx, masterGain, gutturalSat, pan);
		} else {
			connectOutput(ctx, masterGain, gutturalGain, pan);
		}
		gutturalMod.start(now);
		gutturalCarrier.start(now);
		gutturalMod.stop(now + dur + 0.1);
		gutturalCarrier.stop(now + dur + 0.1);

		const crunchBuf = createCrackleBuffer(ctx, 1.6, 0.14);
		if (crunchBuf) {
			const crunchSource = ctx.createBufferSource();
			crunchSource.buffer = crunchBuf;
			const crunchFilter = ctx.createBiquadFilter();
			crunchFilter.type = 'bandpass';
			crunchFilter.frequency.setValueAtTime(1450, now);
			crunchFilter.Q.setValueAtTime(2.8, now);

			const crunchGain = ctx.createGain();
			crunchGain.gain.setValueAtTime(0.001, now);
			crunchGain.gain.linearRampToValueAtTime(0.45, now + 0.04);
			crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

			crunchSource.connect(crunchFilter);
			crunchFilter.connect(crunchGain);
			connectOutput(ctx, masterGain, crunchGain, pan);
			crunchSource.start(now);
			crunchSource.stop(now + 1.7);
		}

		const teethOsc1 = ctx.createOscillator();
		const teethOsc2 = ctx.createOscillator();
		teethOsc1.type = 'triangle';
		teethOsc2.type = 'sawtooth';
		teethOsc1.frequency.setValueAtTime(1180, now + 0.12);
		teethOsc1.frequency.linearRampToValueAtTime(840, now + 1.8);
		teethOsc2.frequency.setValueAtTime(1240, now + 0.12);
		teethOsc2.frequency.linearRampToValueAtTime(890, now + 1.8);

		const teethFilter = ctx.createBiquadFilter();
		teethFilter.type = 'bandpass';
		teethFilter.frequency.setValueAtTime(1100, now + 0.12);
		teethFilter.Q.setValueAtTime(5.5, now);

		const teethGain = ctx.createGain();
		teethGain.gain.setValueAtTime(0.001, now + 0.12);
		teethGain.gain.linearRampToValueAtTime(0.35, now + 0.28);
		teethGain.gain.setValueAtTime(0.28, now + 1.4);
		teethGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

		teethOsc1.connect(teethFilter);
		teethOsc2.connect(teethFilter);
		teethFilter.connect(teethGain);
		connectOutput(ctx, masterGain, teethGain, pan);
		teethOsc1.start(now + 0.12);
		teethOsc2.start(now + 0.12);
		teethOsc1.stop(now + 2.1);
		teethOsc2.stop(now + 2.1);
	}
}

