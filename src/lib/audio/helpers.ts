export function connectOutput(
	ctx: AudioContext | null,
	masterGain: GainNode | null,
	source: AudioNode,
	pan: number = 0
): void {
	if (!ctx || !masterGain) return;
	if (Math.abs(pan) > 0.02 && typeof ctx.createStereoPanner === 'function') {
		const panner = ctx.createStereoPanner();
		panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
		source.connect(panner);
		panner.connect(masterGain);
	} else {
		source.connect(masterGain);
	}
}

export function createSaturationNode(ctx: AudioContext | null, drive: number = 2.5): WaveShaperNode | null {
	if (!ctx) return null;
	const ws = ctx.createWaveShaper();
	const samples = 1024;
	const curve = new Float32Array(samples);
	for (let i = 0; i < samples; i++) {
		const x = (i * 2) / samples - 1;
		curve[i] = Math.tanh(x * drive);
	}
	ws.curve = curve;
	ws.oversample = '2x';
	return ws;
}

export function createCrackleBuffer(
	ctx: AudioContext | null,
	duration: number,
	density: number = 0.08
): AudioBuffer | null {
	if (!ctx) return null;
	const sampleRate = ctx.sampleRate;
	const length = Math.max(1, Math.floor(sampleRate * duration));
	const buffer = ctx.createBuffer(1, length, sampleRate);
	const data = buffer.getChannelData(0);
	let b0 = 0;
	let b1 = 0;
	let b2 = 0;

	for (let i = 0; i < length; i++) {
		const white = Math.random() * 2 - 1;
		b0 = 0.99886 * b0 + white * 0.0555179;
		b1 = 0.99332 * b1 + white * 0.0750759;
		b2 = 0.969 * b2 + white * 0.153852;
		let pink = b0 + b1 + b2 + white * 0.5362;

		if (Math.random() < density) {
			const spike = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.6);
			pink += spike * 3.2;
		}
		data[i] = Math.max(-1, Math.min(1, pink * 0.35));
	}
	return buffer;
}

export function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
	const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = Math.random() * 2 - 1;
	}
	return buffer;
}

export function autoCleanup(
	source: AudioScheduledSourceNode,
	...nodes: (AudioNode | null | undefined)[]
): void {
	source.onended = () => {
		try {
			source.disconnect();
			for (const node of nodes) {
				node?.disconnect();
			}
		} catch {
			// already disconnected
		}
	};
}


