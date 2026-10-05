export class AbyssalDrone {
	private droneGain: GainNode | null = null;
	private droneOsc1: OscillatorNode | null = null;
	private droneOsc2: OscillatorNode | null = null;
	private droneFilter: BiquadFilterNode | null = null;
	private noiseNode: AudioBufferSourceNode | null = null;
	private noiseGain: GainNode | null = null;

	public init(ctx: AudioContext, masterGain: GainNode): void {
		this.droneGain = ctx.createGain();
		this.droneGain.gain.setValueAtTime(0.35, ctx.currentTime);

		this.droneFilter = ctx.createBiquadFilter();
		this.droneFilter.type = 'lowpass';
		this.droneFilter.frequency.setValueAtTime(110, ctx.currentTime);
		this.droneFilter.Q.setValueAtTime(4.0, ctx.currentTime);

		this.droneOsc1 = ctx.createOscillator();
		this.droneOsc1.type = 'sine';
		this.droneOsc1.frequency.setValueAtTime(46, ctx.currentTime);

		this.droneOsc2 = ctx.createOscillator();
		this.droneOsc2.type = 'triangle';
		this.droneOsc2.frequency.setValueAtTime(47.5, ctx.currentTime);

		const oscGain = ctx.createGain();
		oscGain.gain.setValueAtTime(0.4, ctx.currentTime);

		this.droneOsc1.connect(oscGain);
		this.droneOsc2.connect(oscGain);
		oscGain.connect(this.droneFilter);

		const bufferSize = ctx.sampleRate * 2;
		const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const output = noiseBuffer.getChannelData(0);
		let lastOut = 0.0;
		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			output[i] = (lastOut + 0.02 * white) / 1.02;
			lastOut = output[i];
		}

		this.noiseNode = ctx.createBufferSource();
		this.noiseNode.buffer = noiseBuffer;
		this.noiseNode.loop = true;

		const noiseFilter = ctx.createBiquadFilter();
		noiseFilter.type = 'lowpass';
		noiseFilter.frequency.setValueAtTime(160, ctx.currentTime);

		this.noiseGain = ctx.createGain();
		this.noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);

		this.noiseNode.connect(noiseFilter);
		noiseFilter.connect(this.noiseGain);
		this.noiseGain.connect(this.droneGain);

		this.droneFilter.connect(this.droneGain);
		this.droneGain.connect(masterGain);

		this.droneOsc1.start();
		this.droneOsc2.start();
		this.noiseNode.start();
	}

	public setTension(ctx: AudioContext, proximity: number): void {
		if (!this.droneFilter || !this.droneGain) return;
		const normalized = Math.max(0, Math.min(100, proximity)) / 100;
		const cutoff = 110 + normalized * 380;
		const gain = 0.35 + normalized * 0.35;

		this.droneFilter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.4);
		this.droneGain.gain.setTargetAtTime(gain, ctx.currentTime, 0.4);
	}

	public stop(): void {
		try {
			this.droneOsc1?.stop();
			this.droneOsc2?.stop();
			this.noiseNode?.stop();
			this.droneOsc1?.disconnect();
			this.droneOsc2?.disconnect();
			this.noiseNode?.disconnect();
		} catch {
		}
		this.droneOsc1 = null;
		this.droneOsc2 = null;
		this.noiseNode = null;
		this.droneGain = null;
		this.droneFilter = null;
		this.noiseGain = null;
	}
}

