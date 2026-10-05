export interface AuxiliaryScreenState {
	depth: number;
	pressureAtm: number;
	currentLevelIndex: number;
	isFreeMode: boolean;
	activeMessage: string;
	isMuted: boolean;
	isZoomedIn: boolean;
	focusedScreen?: 'main' | 'aux' | 'manual' | 'window' | 'poster' | 'none';
	acousticProximity: number;
	levels: Array<{
		name: string;
		depth: number;
		pressureAtm: number;
		toleranceMargin: number;
	}>;
}

export type AuxActionCallback = (action:
	| { type: 'SELECT_LEVEL'; index: number }
	| { type: 'FREE_MODE' }
	| { type: 'SET_MESSAGE'; message: string }
	| { type: 'TOGGLE_FOCUS' }
	| { type: 'FOCUS_AUX' }
	| { type: 'TOGGLE_MUTE' }
) => void;

interface InteractiveRect {
	x: number;
	y: number;
	w: number;
	h: number;
	action: () => void;
}

export class AuxiliaryScreenCanvas {
	public canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	public width: number = 1024;
	public height: number = 768;

	private interactiveRects: InteractiveRect[] = [];
	private onAction: AuxActionCallback | null = null;
	private blinkTimer: number = 0;
	private scanlinePattern: CanvasPattern | null = null;

	constructor() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.ctx = this.canvas.getContext('2d')!;

		const patCanvas = document.createElement('canvas');
		patCanvas.width = 4;
		patCanvas.height = 4;
		const pctx = patCanvas.getContext('2d')!;
		pctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
		pctx.fillRect(0, 0, 4, 2);
		this.scanlinePattern = this.ctx.createPattern(patCanvas, 'repeat');
	}

	public setActionCallback(cb: AuxActionCallback): void {
		this.onAction = cb;
	}

	public handleClickUV(u: number, v: number): boolean {
		const canvasX = u * this.width;
		const canvasY = (1 - v) * this.height;

		for (const rect of this.interactiveRects) {
			if (
				canvasX >= rect.x &&
				canvasX <= rect.x + rect.w &&
				canvasY >= rect.y &&
				canvasY <= rect.y + rect.h
			) {
				rect.action();
				return true;
			}
		}
		return false;
	}

	public render(state: AuxiliaryScreenState, delta: number): void {
		const ctx = this.ctx;
		this.interactiveRects = [];
		this.blinkTimer += delta * 3.2;

		ctx.fillStyle = '#0f0700';
		ctx.fillRect(0, 0, this.width, this.height);

		if (this.scanlinePattern) {
			ctx.fillStyle = this.scanlinePattern;
			ctx.fillRect(0, 0, this.width, this.height);
		}

		ctx.strokeStyle = 'rgba(255, 150, 30, 0.04)';
		ctx.lineWidth = 1;
		for (let x = 0; x < this.width; x += 48) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, this.height);
			ctx.stroke();
		}
		for (let y = 0; y < this.height; y += 48) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(this.width, y);
			ctx.stroke();
		}

		this.renderHeader(ctx, state);
		this.renderTelemetryBar(ctx, state);
		this.renderLogFeed(ctx, state);
		this.renderSectorSelector(ctx, state);
		this.renderSystemCommands(ctx, state);

		ctx.strokeStyle = 'rgba(255, 158, 36, 0.4)';
		ctx.lineWidth = 2;
		ctx.strokeRect(8, 8, this.width - 16, this.height - 16);
	}

	private renderHeader(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const hx = 20;
		const hy = 18;
		const hw = this.width - 40;

		ctx.fillStyle = 'rgba(255, 158, 36, 0.08)';
		ctx.fillRect(hx, hy, hw, 50);
		ctx.strokeStyle = '#ff9e24';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(hx, hy, hw, 50);

		const isBlink = Math.sin(this.blinkTimer) > 0;
		ctx.fillStyle = isBlink ? '#ff9e24' : '#4a2500';
		ctx.fillRect(hx + 12, hy + 18, 14, 14);

		ctx.fillStyle = '#ff9e24';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('TARTARUS-V // TELETYPE LOG', hx + 36, hy + 32);

		ctx.font = '12px "Courier New", monospace';
		ctx.fillStyle = 'rgba(255, 180, 70, 0.8)';
		ctx.fillText('CLASSIFICADO // PROTOCOLO HUFFMAN', hx + 36, hy + 48);

		ctx.textAlign = 'right';
		ctx.fillStyle = '#ffcc77';
		ctx.font = 'bold 16px "Courier New", monospace';
		const mode = state.isFreeMode ? 'MODO LIVRE' : `SETOR ${state.currentLevelIndex + 1}`;
		ctx.fillText(`STATUS: [${mode}]`, hx + hw - 14, hy + 34);
	}

	private renderTelemetryBar(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const bx = 20;
		const by = 78;
		const bw = this.width - 40;

		ctx.fillStyle = 'rgba(20, 10, 0, 0.7)';
		ctx.fillRect(bx, by, bw, 42);
		ctx.strokeStyle = 'rgba(255, 158, 36, 0.3)';
		ctx.strokeRect(bx, by, bw, 42);

		const integrity = Math.max(0, 100 - Math.round(state.acousticProximity));
		const barWidth = 14;
		const filledBlocks = Math.round((integrity / 100) * barWidth);
		const barStr = '█'.repeat(filledBlocks) + '░'.repeat(barWidth - filledBlocks);

		ctx.font = '14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillStyle = '#ff9e24';
		ctx.fillText(`COTA: ${state.depth}m | PRESSÃO: ${state.pressureAtm} ATM`, bx + 14, by + 26);

		ctx.textAlign = 'right';
		ctx.fillStyle = integrity < 30 ? '#ff3b3b' : integrity < 60 ? '#ffaa00' : '#ff9e24';
		ctx.fillText(`CASCO: [${barStr}] ${integrity}%`, bx + bw - 14, by + 26);
	}

	private renderLogFeed(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const lx = 20;
		const ly = 130;
		const lw = this.width - 40;
		const lh = 300;

		ctx.fillStyle = 'rgba(25, 12, 0, 0.5)';
		ctx.fillRect(lx, ly, lw, lh);
		ctx.strokeStyle = 'rgba(255, 158, 36, 0.3)';
		ctx.strokeRect(lx, ly, lw, lh);

		ctx.fillStyle = '#ffcc77';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► REGISTROS DO HIDROFONE:', lx + 14, ly + 26);

		const logs = this.getContextualLogs(state);

		ctx.font = '13px "Courier New", monospace';
		let logY = ly + 56;

		logs.forEach((log) => {
			ctx.fillStyle = log.alert ? '#ff4d4d' : 'rgba(255, 180, 80, 0.9)';
			ctx.fillText(log.text, lx + 14, logY);
			logY += 26;
		});

		if (Math.sin(this.blinkTimer) > 0) {
			ctx.fillStyle = '#ff9e24';
			ctx.fillText('█', lx + 14, logY + 2);
		}
	}

	private getContextualLogs(state: AuxiliaryScreenState): Array<{ text: string; alert?: boolean }> {
		if (state.acousticProximity > 75) {
			return [
				{ text: `[${this.formatTime(14)}] ALERTA: Ressonância acústica na escotilha.` , alert: true },
				{ text: `[${this.formatTime(28)}] Casco sob sobrecarga a ${state.pressureAtm} ATM.` , alert: true },
				{ text: `[${this.formatTime(42)}] "Impactos na antepara. Reduza a emissão sonora!"` , alert: true },
				{ text: `[${this.formatTime(56)}] PROTOCOLO: Funda nós de menor frequência primeiro.` },
				{ text: `[${this.formatTime(70)}] Falha estrutural iminente se ruído persistir.` , alert: true }
			];
		}

		if (state.currentLevelIndex === 0) {
			return [
				{ text: `[02:14] Tartarus cota 8.000m na fenda.` },
				{ text: `[02:40] Ruído biológico captado a 12Hz.` },
				{ text: `[03:15] "A criatura é cega. Caça por som."` },
				{ text: `[03:32] ASCII bruto emite pulsos demais.` },
				{ text: `[03:48] Comprima a mensagem no Console A.` }
			];
		} else if (state.currentLevelIndex === 1) {
			return [
				{ text: `[04:02] Casco sob 950 ATM na Zona Hadal.` },
				{ text: `[04:15] Sem resposta no canal auxiliar.` },
				{ text: `[04:28] "Contato na escotilha. Algo tenta entrar."` , alert: true },
				{ text: `[04:41] Tolerância reduzida: evite fusões erradas.` },
				{ text: `[04:55] Transmita o socorro antes do colapso.` }
			];
		} else {
			return [
				{ text: `[05:01] Cota 11.000m - Fossa das Marianas.`, alert: true },
				{ text: `[05:07] Pressão 1.100 ATM. Ruído crítico.`, alert: true },
				{ text: `[05:14] "Qualquer erro alerta a entidade no casco."` },
				{ text: `[05:22] Transmita o sinal ótimo agora.`, alert: true }
			];
		}
	}

	private formatTime(offsetSec: number): string {
		const s = (40 + offsetSec) % 60;
		return `05:18:${s < 10 ? '0' : ''}${s}`;
	}

	private renderSectorSelector(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const sx = 20;
		const sy = 440;
		const sw = this.width - 40;

		ctx.fillStyle = '#ffcc77';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► SELEÇÃO DE MISSÃO:', sx + 14, sy + 22);

		const btnH = 46;
		const btnY = sy + 34;
		const gap = 10;
		const totalButtons = state.levels.length + 1;
		const btnW = (sw - gap * (totalButtons - 1)) / totalButtons;

		state.levels.forEach((lvl, idx) => {
			const bx = sx + idx * (btnW + gap);
			const isActive = !state.isFreeMode && state.currentLevelIndex === idx;

			this.renderTeletypeCommand(
				ctx,
				bx,
				btnY,
				btnW,
				btnH,
				`SETOR 0${idx + 1}`,
				`${lvl.depth}m`,
				isActive,
				() => this.onAction?.({ type: 'SELECT_LEVEL', index: idx })
			);
		});

		const freeBx = sx + state.levels.length * (btnW + gap);
		const isFreeActive = state.isFreeMode;
		this.renderTeletypeCommand(
			ctx,
			freeBx,
			btnY,
			btnW,
			btnH,
			'MODO LIVRE',
			'TEXTO LIVRE',
			isFreeActive,
			() => this.onAction?.({ type: 'FREE_MODE' })
		);

		if (state.isFreeMode) {
			this.renderPresetMessages(ctx, sx, sy + 94, sw);
		} else {

			const currentLvl = state.levels[state.currentLevelIndex];
			ctx.fillStyle = 'rgba(255, 158, 36, 0.08)';
			ctx.fillRect(sx, sy + 94, sw, 52);
			ctx.strokeStyle = 'rgba(255, 158, 36, 0.25)';
			ctx.strokeRect(sx, sy + 94, sw, 52);

			ctx.fillStyle = '#ff9e24';
			ctx.font = '12px "Courier New", monospace';
			ctx.textAlign = 'left';
			ctx.fillText(`MENSAGEM: "${state.activeMessage}"`, sx + 14, sy + 115);
			ctx.fillStyle = 'rgba(255, 200, 100, 0.75)';
			ctx.fillText(
				`DIRETRIZ: Tolerância sonora de +${Math.round((currentLvl?.toleranceMargin ?? 0.35) * 100)}%. Erros aceleram o ataque.`,
				sx + 14,
				sy + 134
			);
		}
	}

	private renderPresetMessages(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
		const presets = [
			'SOS CASCO',
			'CASCO EM RISCO',
			'PRESSAO CRITICA'
		];

		const pw = (w - 20) / presets.length;
		presets.forEach((msg, idx) => {
			const px = x + idx * (pw + 10);
			this.renderTeletypeCommand(
				ctx,
				px,
				y,
				pw,
				52,
				`PRESET 0${idx + 1}`,
				msg.slice(0, 24),
				false,
				() => this.onAction?.({ type: 'SET_MESSAGE', message: msg })
			);
		});
	}

	private renderTeletypeCommand(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		title: string,
		subtitle: string,
		isActive: boolean,
		action: () => void
	): void {
		if (isActive) {
			ctx.fillStyle = '#ff9e24';
			ctx.fillRect(x, y, w, h);
			ctx.strokeStyle = '#ffcc77';
			ctx.lineWidth = 1.5;
			ctx.strokeRect(x, y, w, h);

			ctx.fillStyle = '#0f0700';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(`► ${title} ◄`, x + w / 2, y + 20);

			ctx.font = '11px "Courier New", monospace';
			ctx.fillText(subtitle, x + w / 2, y + 36);
		} else {
			ctx.fillStyle = 'rgba(25, 12, 0, 0.6)';
			ctx.fillRect(x, y, w, h);
			ctx.strokeStyle = 'rgba(255, 158, 36, 0.4)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, w, h);

			ctx.fillStyle = '#ff9e24';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(title, x + w / 2, y + 20);

			ctx.fillStyle = 'rgba(255, 180, 80, 0.7)';
			ctx.font = '11px "Courier New", monospace';
			ctx.fillText(subtitle, x + w / 2, y + 36);
		}

		this.interactiveRects.push({ x, y, w, h, action });
	}

	private renderSystemCommands(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const y = 690;
		const totalW = this.width - 40;
		const gap = 12;
		const w = (totalW - gap * 2) / 3;

		const isAuxFocused = state.focusedScreen === 'aux';
		const isMainFocused = state.focusedScreen === 'main';

		this.renderTeletypeCommand(
			ctx,
			20,
			y,
			w,
			48,
			isAuxFocused ? '[ ⛶ VISÃO GERAL (C) ]' : '[ ⛶ CONSOLE B (C) ]',
			isAuxFocused ? 'Visão ampla' : 'Focar neste console',
			isAuxFocused,
			() => this.onAction?.({ type: 'FOCUS_AUX' })
		);

		this.renderTeletypeCommand(
			ctx,
			20 + w + gap,
			y,
			w,
			48,
			isMainFocused ? '[ ⛶ VISÃO GERAL (F) ]' : '[ ⛶ CONSOLE A (F) ]',
			'Console principal',
			isMainFocused,
			() => this.onAction?.({ type: 'TOGGLE_FOCUS' })
		);

		this.renderTeletypeCommand(
			ctx,
			20 + (w + gap) * 2,
			y,
			w,
			48,
			state.isMuted ? '[ ÁUDIO: MUDO ]' : '[ ÁUDIO: ATIVO ]',
			'[M] Alternar som',
			false,
			() => this.onAction?.({ type: 'TOGGLE_MUTE' })
		);
	}
}

