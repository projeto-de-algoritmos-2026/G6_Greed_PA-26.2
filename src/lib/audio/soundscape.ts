/**
 * SUBWAVE - Procedural Soundscape Engine
 * Síntese de áudio procedural 100% nativa via Web Audio API.
 * Sem dependências de arquivos de áudio externos (.mp3/.wav).
 */

export class ProceduralAudioEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private isInitialized: boolean = false;
	private isMuted: boolean = false;

	// Componentes do drone contínuo abissal
	private droneGain: GainNode | null = null;
	private droneOsc1: OscillatorNode | null = null;
	private droneOsc2: OscillatorNode | null = null;
	private droneFilter: BiquadFilterNode | null = null;
	private noiseNode: AudioBufferSourceNode | null = null;
	private noiseGain: GainNode | null = null;

	// Alarme de emergência
	private alarmInterval: number | null = null;
	private isAlarmActive: boolean = false;

	constructor() {}

	/**
	 * Inicializa o AudioContext no primeiro gesto do usuário
	 * para cumprir as políticas de autoplay dos navegadores.
	 */
	public async init(): Promise<void> {
		if (this.isInitialized && this.ctx) {
			if (this.ctx.state === 'suspended') {
				await this.ctx.resume();
			}
			return;
		}

		const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		this.ctx = new AudioCtx();

		this.masterGain = this.ctx.createGain();
		this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
		this.masterGain.connect(this.ctx.destination);

		this.setupAbyssalDrone();
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

	/**
	 * Drone contínuo: sub-bass a 45Hz + oscilação de 55Hz com batimento binaural
	 * + ruído marinho filtrado simulando 8.000m de coluna d'água contra o casco.
	 */
	private setupAbyssalDrone(): void {
		if (!this.ctx || !this.masterGain) return;

		this.droneGain = this.ctx.createGain();
		this.droneGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

		this.droneFilter = this.ctx.createBiquadFilter();
		this.droneFilter.type = 'lowpass';
		this.droneFilter.frequency.setValueAtTime(110, this.ctx.currentTime);
		this.droneFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

		// Oscilador 1: Sub-bass profundo
		this.droneOsc1 = this.ctx.createOscillator();
		this.droneOsc1.type = 'sine';
		this.droneOsc1.frequency.setValueAtTime(46, this.ctx.currentTime);

		// Oscilador 2: Leve desafinação para criar batimento de pressão contínua
		this.droneOsc2 = this.ctx.createOscillator();
		this.droneOsc2.type = 'triangle';
		this.droneOsc2.frequency.setValueAtTime(47.5, this.ctx.currentTime);

		const oscGain = this.ctx.createGain();
		oscGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

		this.droneOsc1.connect(oscGain);
		this.droneOsc2.connect(oscGain);
		oscGain.connect(this.droneFilter);

		// Gerador de ruído marinho contínuo (buffer de ruído rosa/marrom)
		const bufferSize = this.ctx.sampleRate * 2;
		const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const output = noiseBuffer.getChannelData(0);
		let lastOut = 0.0;
		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise approximation
			lastOut = output[i];
			output[i] *= 3.5;
		}

		this.noiseNode = this.ctx.createBufferSource();
		this.noiseNode.buffer = noiseBuffer;
		this.noiseNode.loop = true;

		this.noiseGain = this.ctx.createGain();
		this.noiseGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

		this.noiseNode.connect(this.noiseGain);
		this.noiseGain.connect(this.droneFilter);

		this.droneFilter.connect(this.droneGain);
		this.droneGain.connect(this.masterGain);

		this.droneOsc1.start();
		this.droneOsc2.start();
		this.noiseNode.start();

		// Modulação lenta (LFO) simulando variação da pressão no casco
		const lfo = this.ctx.createOscillator();
		const lfoGain = this.ctx.createGain();
		lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
		lfoGain.gain.setValueAtTime(30, this.ctx.currentTime);
		lfo.connect(lfoGain);
		lfoGain.connect(this.droneFilter.frequency);
		lfo.start();
	}

	/**
	 * Modula a intensidade da pressão sonora conforme a criatura se aproxima.
	 * @param proximity 0.0 a 1.0
	 */
	public setProximityTension(proximity: number): void {
		if (!this.ctx || !this.droneFilter || !this.droneGain) return;
		const clamped = Math.max(0, Math.min(1, proximity));
		const now = this.ctx.currentTime;
		// Eleva o filtro do drone e a ressonância à medida que a pressão sobe
		this.droneFilter.frequency.setTargetAtTime(100 + clamped * 180, now, 0.2);
		this.droneGain.gain.setTargetAtTime(0.35 + clamped * 0.35, now, 0.2);
	}

	/**
	 * Ping de Sonar com decaimento exponencial e eco reverberante para cada bit transmitido.
	 * @param isOne Se o bit é '1' (tom ligeiramente mais agudo) ou '0' (tom base)
	 */
	public playSonarPing(isOne: boolean = false): void {
		if (!this.ctx || !this.masterGain || this.isMuted) return;

		const now = this.ctx.currentTime;
		const baseFreq = isOne ? 1480 : 1100;

		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		const filter = this.ctx.createBiquadFilter();

		// Linha de Delay simulando o eco nas paredes de aço e no abismo
		const delay = this.ctx.createDelay();
		const delayFeedback = this.ctx.createGain();

		delay.delayTime.setValueAtTime(0.18, now);
		delayFeedback.gain.setValueAtTime(0.35, now);

		osc.type = 'sine';
		osc.frequency.setValueAtTime(baseFreq, now);
		osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.35);

		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(baseFreq, now);
		filter.Q.setValueAtTime(8.0, now);

		gain.gain.setValueAtTime(0.4, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.masterGain);

		// Conecta ao delay reverberante
		gain.connect(delay);
		delay.connect(delayFeedback);
		delayFeedback.connect(delay);
		delay.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.6);
	}

	/**
	 * Clique mecânico seco de solenoide/relé dos anos 70 para seleção de nós.
	 */
	public playRelayClick(): void {
		if (!this.ctx || !this.masterGain || this.isMuted) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		const filter = this.ctx.createBiquadFilter();

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
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.04);
	}

	/**
	 * Som de fusão bem-sucedida de nós: pulso harmônico elétrico.
	 */
	public playMergeSound(isGreedy: boolean = true): void {
		if (!this.ctx || !this.masterGain || this.isMuted) return;

		const now = this.ctx.currentTime;
		const frequencies = isGreedy ? [440, 660, 880] : [280, 310]; // Harmônico agradável se guloso, dissonante se subótimo

		frequencies.forEach((freq, idx) => {
			const osc = this.ctx!.createOscillator();
			const gain = this.ctx!.createGain();

			osc.type = isGreedy ? 'sine' : 'sawtooth';
			osc.frequency.setValueAtTime(freq, now + idx * 0.03);

			gain.gain.setValueAtTime(0.2 / frequencies.length, now + idx * 0.03);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

			osc.connect(gain);
			gain.connect(this.masterGain!);

			osc.start(now + idx * 0.03);
			osc.stop(now + 0.3);
		});
	}

	/**
	 * Som de Desfazer Fusão (Undo) ou reinicialização.
	 */
	public playUndoSound(): void {
		if (!this.ctx || !this.masterGain || this.isMuted) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(450, now);
		osc.frequency.linearRampToValueAtTime(150, now + 0.12);

		gain.gain.setValueAtTime(0.2, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.15);
	}

	/**
	 * Alarme de proximidade / baixa frequência intermitente quando o jogador
	 * realiza escolhas subótimas ou o risco atinge níveis perigosos.
	 */
	public startProximityAlarm(): void {
		if (this.isAlarmActive) return;
		this.isAlarmActive = true;

		const pulse = () => {
			if (!this.isAlarmActive || !this.ctx || !this.masterGain || this.isMuted) return;
			const now = this.ctx.currentTime;

			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();

			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(180, now);
			osc.frequency.linearRampToValueAtTime(130, now + 0.22);

			gain.gain.setValueAtTime(0.28, now);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

			osc.connect(gain);
			gain.connect(this.masterGain);

			osc.start(now);
			osc.stop(now + 0.26);
		};

		pulse();
		this.alarmInterval = window.setInterval(pulse, 650);
	}

	public stopProximityAlarm(): void {
		this.isAlarmActive = false;
		if (this.alarmInterval !== null) {
			clearInterval(this.alarmInterval);
			this.alarmInterval = null;
		}
	}

	/**
	 * Gemido de metal estalando no casco (efeito de tensão ao errar ou com o tempo).
	 */
	public playHullCreak(): void {
		if (!this.ctx || !this.masterGain || this.isMuted) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		const filter = this.ctx.createBiquadFilter();

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
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.75);
	}

	/**
	 * Colapso Catastrófico do Casco (Game Over): Ruptura de placas, explosão de pressão e estática fatal.
	 */
	public playCatastrophicBreach(): void {
		if (!this.ctx || !this.masterGain) return;
		this.stopProximityAlarm();

		const now = this.ctx.currentTime;

		// 1. Impacto violento no casco (grave massivo)
		const impactOsc = this.ctx.createOscillator();
		const impactGain = this.ctx.createGain();
		impactOsc.type = 'triangle';
		impactOsc.frequency.setValueAtTime(150, now);
		impactOsc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
		impactGain.gain.setValueAtTime(0.8, now);
		impactGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
		impactOsc.connect(impactGain);
		impactGain.connect(this.masterGain);
		impactOsc.start(now);
		impactOsc.stop(now + 1.3);

		// 2. Ruído de água em alta pressão (inundação)
		const bufferSize = this.ctx.sampleRate * 2;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = this.ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = this.ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(800, now);
		filter.frequency.linearRampToValueAtTime(2500, now + 0.5);

		const noiseGain = this.ctx.createGain();
		noiseGain.gain.setValueAtTime(0.6, now);
		noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(this.masterGain);

		noise.start(now);
		noise.stop(now + 2.0);
	}

	/**
	 * Sinal de socorro transmitido com sucesso (Acordo acústico de escape).
	 */
	public playTransmissionSuccess(): void {
		if (!this.ctx || !this.masterGain || this.isMuted) return;
		this.stopProximityAlarm();

		const now = this.ctx.currentTime;
		const chord = [523.25, 659.25, 783.99, 1046.5]; // C maior triunfante analógico

		chord.forEach((freq, i) => {
			const osc = this.ctx!.createOscillator();
			const gain = this.ctx!.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, now + i * 0.08);

			gain.gain.setValueAtTime(0.25 / chord.length, now + i * 0.08);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

			osc.connect(gain);
			gain.connect(this.masterGain!);

			osc.start(now + i * 0.08);
			osc.stop(now + 1.3);
		});
	}

	public dispose(): void {
		this.stopProximityAlarm();
		if (this.ctx) {
			this.ctx.close();
			this.ctx = null;
		}
		this.isInitialized = false;
	}
}
