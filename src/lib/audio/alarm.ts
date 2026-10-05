export class AlarmSystem {
	private alarmInterval: number | null = null;
	private isAlarmActive: boolean = false;

	public get active(): boolean {
		return this.isAlarmActive;
	}

	public start(ctx: AudioContext | null, masterGain: GainNode | null, isMuted: boolean): void {
		if (this.isAlarmActive) return;
		this.isAlarmActive = true;

		const pulse = () => {
			if (!this.isAlarmActive || !ctx || !masterGain || isMuted) return;
			const now = ctx.currentTime;

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(180, now);
			osc.frequency.linearRampToValueAtTime(130, now + 0.22);

			gain.gain.setValueAtTime(0.28, now);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

			osc.connect(gain);
			gain.connect(masterGain);

			osc.start(now);
			osc.stop(now + 0.26);
		};

		pulse();
		this.alarmInterval = window.setInterval(pulse, 650);
	}

	public stop(): void {
		this.isAlarmActive = false;
		if (this.alarmInterval !== null) {
			clearInterval(this.alarmInterval);
			this.alarmInterval = null;
		}
	}
}

