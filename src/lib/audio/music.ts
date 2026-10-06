export class BackgroundMusic {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private musicGain: GainNode | null = null;
	private sourceNode: AudioBufferSourceNode | null = null;
	private audioBuffer: AudioBuffer | null = null;
	private isPlaying: boolean = false;
	private isLoading: boolean = false;
	private shouldPlay: boolean = false;
	private targetGain: number = 0.026;

	public async init(ctx: AudioContext, masterGain: GainNode): Promise<void> {
		this.ctx = ctx;
		this.masterGain = masterGain;

		if (!this.musicGain) {
			this.musicGain = ctx.createGain();
			this.musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
			this.musicGain.connect(masterGain);
		}

		this.shouldPlay = true;

		if (!this.audioBuffer && !this.isLoading) {
			this.isLoading = true;
			this.audioBuffer = await this.loadBuffer(ctx);
			this.isLoading = false;
		}

		if (this.shouldPlay) {
			this.start(3.5);
		}
	}

	private async loadBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
		const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
		const candidates = [
			`${base}/the-lobotomy.mp3`,
			`./the-lobotomy.mp3`,
			`${base}/The%20Lobotomy.mp3`,
			`./The%20Lobotomy.mp3`,
			'/the-lobotomy.mp3',
			'/The%20Lobotomy.mp3'
		];

		for (const url of candidates) {
			try {
				const res = await fetch(url);
				if (res.ok) {
					const arrayBuffer = await res.arrayBuffer();
					return await ctx.decodeAudioData(arrayBuffer);
				}
			} catch {
			}
		}
		return null;
	}

	public start(fadeInDuration: number = 3.5): void {
		this.shouldPlay = true;
		if (!this.ctx || !this.musicGain || !this.audioBuffer) return;
		if (this.isPlaying) return;

		try {
			this.sourceNode = this.ctx.createBufferSource();
			this.sourceNode.buffer = this.audioBuffer;
			this.sourceNode.loop = true;
			this.sourceNode.connect(this.musicGain);

			const now = this.ctx.currentTime;
			this.musicGain.gain.cancelScheduledValues(now);
			this.musicGain.gain.setValueAtTime(0.0001, now);
			this.musicGain.gain.linearRampToValueAtTime(this.targetGain, now + fadeInDuration);

			this.sourceNode.start(0);
			this.isPlaying = true;
		} catch (err) {
			console.error('Failed to start background music:', err);
		}
	}

	public fadeIn(duration: number = 3.0): void {
		this.shouldPlay = true;
		if (!this.isPlaying) {
			this.start(duration);
		} else if (this.ctx && this.musicGain) {
			const now = this.ctx.currentTime;
			this.musicGain.gain.cancelScheduledValues(now);
			this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
			this.musicGain.gain.linearRampToValueAtTime(this.targetGain, now + duration);
		}
	}

	public fadeOut(duration: number = 2.0): void {
		this.shouldPlay = false;
		if (!this.ctx || !this.musicGain || !this.isPlaying || !this.sourceNode) return;

		const now = this.ctx.currentTime;
		const currentGain = Math.max(0.0001, this.musicGain.gain.value);
		this.musicGain.gain.cancelScheduledValues(now);
		this.musicGain.gain.setValueAtTime(currentGain, now);
		this.musicGain.gain.linearRampToValueAtTime(0.0001, now + duration);

		const nodeToStop = this.sourceNode;
		this.sourceNode = null;
		this.isPlaying = false;

		setTimeout(() => {
			try {
				nodeToStop.stop();
				nodeToStop.disconnect();
			} catch {}
		}, duration * 1000 + 100);
	}

	public stop(): void {
		this.shouldPlay = false;
		if (this.sourceNode) {
			try {
				this.sourceNode.stop();
				this.sourceNode.disconnect();
			} catch {}
			this.sourceNode = null;
		}
		this.isPlaying = false;
	}
}
