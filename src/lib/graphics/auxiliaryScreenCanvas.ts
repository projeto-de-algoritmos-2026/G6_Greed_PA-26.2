import type { PriorityQueueSnapshot, GreedyAdvice, AcademicReport } from '../engine/huffman';
import { terminalLogo } from './terminalLogo';

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
	priorityQueue?: PriorityQueueSnapshot;
	greedyAdvice?: GreedyAdvice | null;
	academicReport?: AcademicReport;
	notification?: string;
}

export type AuxActionCallback = (action:
	| { type: 'SELECT_LEVEL'; index: number }
	| { type: 'FREE_MODE' }
	| { type: 'SET_MESSAGE'; message: string }
	| { type: 'TOGGLE_FOCUS' }
	| { type: 'FOCUS_AUX' }
	| { type: 'TOGGLE_MUTE' }
	| { type: 'REBOOT' }
	| { type: 'APPLY_GREEDY_MERGE' }
	| { type: 'EXPORT_REPORT' }
	| { type: 'COPY_JSON' }
	| { type: 'SWITCH_TAB'; tab: 'logs' | 'minheap' | 'report' }
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

	private isBooting: boolean = true;
	private bootTime: number = 0;
	public readonly bootDuration: number = 3.6;

	public activeTab: 'logs' | 'minheap' | 'report' = 'logs';
	private toastMessage: string | null = null;
	private toastTimer: number = 0;

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

	public triggerBoot(): void {
		this.isBooting = true;
		this.bootTime = 0;
	}

	public skipBoot(): void {
		this.isBooting = false;
		this.bootTime = this.bootDuration;
	}

	public get booting(): boolean {
		return this.isBooting;
	}

	public setActionCallback(cb: AuxActionCallback): void {
		this.onAction = cb;
	}

	public switchTab(tab: 'logs' | 'minheap' | 'report'): void {
		this.activeTab = tab;
	}

	public get hasActiveToast(): boolean {
		return this.toastTimer > 0;
	}

	public showToast(msg: string): void {
		this.toastMessage = msg;
		this.toastTimer = 2.5;
	}

	public handleClickUV(u: number, v: number): boolean {
		if (this.isBooting) {
			this.skipBoot();
			return true;
		}

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

		if (this.toastTimer > 0) {
			this.toastTimer -= delta;
			if (this.toastTimer <= 0) {
				this.toastTimer = 0;
				this.toastMessage = null;
			}
		}

		if (this.isBooting) {
			this.renderBootScreen(ctx, state, delta);
			return;
		}

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

		// Central interactive panel (Logs vs Min-Heap vs Relatório)
		this.renderCentralTabs(ctx, state);

		this.renderSectorSelector(ctx, state);
		this.renderSystemCommands(ctx, state);

		if (this.toastMessage) {
			this.renderToastNotification(ctx, this.toastMessage);
		}

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
		ctx.fillText('TARTARUS-V // TELETYPE & MIN-HEAP ENGINE', hx + 36, hy + 32);

		ctx.font = '12px "Courier New", monospace';
		ctx.fillStyle = 'rgba(255, 180, 70, 0.8)';
		ctx.fillText('CLASSIFICADO // PROTOCOLO AMBICIOSO DE HUFFMAN (1952)', hx + 36, hy + 48);

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

	private renderCentralTabs(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const tx = 20;
		const ty = 130;
		const tw = this.width - 40;
		const tabH = 34;

		// 3 Tab Buttons
		const tabs: Array<{ id: 'logs' | 'minheap' | 'report'; label: string; shortcut: string }> = [
			{ id: 'logs', label: '1. REGISTROS HIDROFÔNICOS', shortcut: '[1]' },
			{ id: 'minheap', label: '2. PROTOCOLO TARTARUS / MIN-HEAP', shortcut: '[T]' },
			{ id: 'report', label: '3. RELATÓRIO ACADÊMICO', shortcut: '[E]' }
		];

		const gap = 8;
		const tabW = (tw - gap * 2) / 3;

		tabs.forEach((t, i) => {
			const bx = tx + i * (tabW + gap);
			const isActive = this.activeTab === t.id;

			if (isActive) {
				ctx.fillStyle = '#ff9e24';
				ctx.fillRect(bx, ty, tabW, tabH);
				ctx.strokeStyle = '#ffcc77';
				ctx.lineWidth = 1.5;
				ctx.strokeRect(bx, ty, tabW, tabH);

				ctx.fillStyle = '#0f0700';
				ctx.font = 'bold 13px "Courier New", monospace';
				ctx.textAlign = 'center';
				ctx.fillText(`► ${t.label} ◄`, bx + tabW / 2, ty + 22);
			} else {
				ctx.fillStyle = 'rgba(25, 12, 0, 0.7)';
				ctx.fillRect(bx, ty, tabW, tabH);
				ctx.strokeStyle = 'rgba(255, 158, 36, 0.35)';
				ctx.lineWidth = 1;
				ctx.strokeRect(bx, ty, tabW, tabH);

				ctx.fillStyle = '#ff9e24';
				ctx.font = 'bold 12px "Courier New", monospace';
				ctx.textAlign = 'center';
				ctx.fillText(`${t.label} ${t.shortcut}`, bx + tabW / 2, ty + 22);
			}

			this.interactiveRects.push({
				x: bx,
				y: ty,
				w: tabW,
				h: tabH,
				action: () => {
					this.activeTab = t.id;
					this.onAction?.({ type: 'SWITCH_TAB', tab: t.id });
				}
			});
		});

		// Content Panel below tabs
		const py = ty + tabH + 6;
		const ph = 260;

		ctx.fillStyle = 'rgba(25, 12, 0, 0.6)';
		ctx.fillRect(tx, py, tw, ph);
		ctx.strokeStyle = 'rgba(255, 158, 36, 0.4)';
		ctx.strokeRect(tx, py, tw, ph);

		if (this.activeTab === 'minheap') {
			this.renderMinHeapPanel(ctx, state, tx, py, tw, ph);
		} else if (this.activeTab === 'report') {
			this.renderReportPanel(ctx, state, tx, py, tw, ph);
		} else {
			this.renderLogFeed(ctx, state, tx, py, tw, ph);
		}
	}

	private renderLogFeed(
		ctx: CanvasRenderingContext2D,
		state: AuxiliaryScreenState,
		lx: number,
		ly: number,
		lw: number,
		lh: number
	): void {
		ctx.fillStyle = '#ffcc77';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► REGISTROS DO HIDROFONE (ACÚSTICA DA FENDA):', lx + 14, ly + 26);

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

	private renderMinHeapPanel(
		ctx: CanvasRenderingContext2D,
		state: AuxiliaryScreenState,
		px: number,
		py: number,
		pw: number,
		ph: number
	): void {
		ctx.fillStyle = '#ffcc77';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► FILA DE PRIORIDADES AMBICIOSA // MIN-HEAP DINÂMICA:', px + 14, py + 26);

		const items = state.priorityQueue?.items || [];

		// Visual Min-Heap Priority Queue items
		const nodeAreaY = py + 42;
		const nodeW = 108;
		const nodeH = 50;
		const nodeGap = 10;
		const maxDisplay = 8;
		const visibleNodes = items.slice(0, maxDisplay);

		visibleNodes.forEach((item, idx) => {
			const nx = px + 14 + idx * (nodeW + nodeGap);

			if (item.isOptimalNextMin) {
				// Optimal next min glowing frame
				const pulse = Math.sin(this.blinkTimer * 1.5);
				ctx.fillStyle = pulse > 0 ? 'rgba(255, 158, 36, 0.25)' : 'rgba(255, 158, 36, 0.15)';
				ctx.fillRect(nx, nodeAreaY, nodeW, nodeH);
				ctx.strokeStyle = '#ffcc77';
				ctx.lineWidth = 2;
				ctx.strokeRect(nx, nodeAreaY, nodeW, nodeH);

				ctx.fillStyle = '#ffcc77';
				ctx.font = 'bold 9px "Courier New", monospace';
				ctx.textAlign = 'center';
				ctx.fillText(`▲ extractMin #${idx + 1} ▲`, nx + nodeW / 2, nodeAreaY + 12);

				ctx.font = 'bold 16px "Courier New", monospace';
				ctx.fillText(item.label, nx + nodeW / 2, nodeAreaY + 30);

				ctx.font = '11px "Courier New", monospace';
				ctx.fillStyle = '#ffffff';
				ctx.fillText(`peso: ${item.weight}`, nx + nodeW / 2, nodeAreaY + 44);
			} else {
				// Regular node
				ctx.fillStyle = 'rgba(20, 10, 0, 0.6)';
				ctx.fillRect(nx, nodeAreaY, nodeW, nodeH);
				ctx.strokeStyle = 'rgba(255, 158, 36, 0.35)';
				ctx.lineWidth = 1;
				ctx.strokeRect(nx, nodeAreaY, nodeW, nodeH);

				ctx.fillStyle = 'rgba(255, 180, 80, 0.7)';
				ctx.font = 'bold 15px "Courier New", monospace';
				ctx.textAlign = 'center';
				ctx.fillText(item.label, nx + nodeW / 2, nodeAreaY + 26);

				ctx.font = '11px "Courier New", monospace';
				ctx.fillText(`peso: ${item.weight}`, nx + nodeW / 2, nodeAreaY + 42);
			}
		});

		if (items.length > maxDisplay) {
			const rx = px + 14 + maxDisplay * (nodeW + nodeGap);
			ctx.fillStyle = 'rgba(255, 180, 80, 0.6)';
			ctx.font = '12px "Courier New", monospace';
			ctx.textAlign = 'left';
			ctx.fillText(`+${items.length - maxDisplay} nós`, rx, nodeAreaY + 30);
		}

		// Theoretical Card: Huffman Greedy Choice Law
		const cardY = py + 104;
		const cardW = pw - 28;
		const cardH = 92;

		ctx.fillStyle = 'rgba(15, 8, 0, 0.85)';
		ctx.fillRect(px + 14, cardY, cardW, cardH);
		ctx.strokeStyle = 'rgba(255, 158, 36, 0.45)';
		ctx.strokeRect(px + 14, cardY, cardW, cardH);

		ctx.fillStyle = '#ff9e24';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('LEMA DA ESCOLHA AMBICIOSA // PROVA DE HUFFMAN (1952):', px + 26, cardY + 22);

		ctx.font = '11px "Courier New", monospace';
		ctx.fillStyle = 'rgba(255, 220, 160, 0.9)';
		const advice = state.greedyAdvice;
		if (advice) {
			ctx.fillText(
				`RECOMENDAÇÃO: Combinar ${advice.labelA} (w:${advice.weightA}) e ${advice.labelB} (w:${advice.weightB}) ➔ Novo pai com peso ${advice.sumWeight}.`,
				px + 26,
				cardY + 42
			);
			ctx.fillStyle = 'rgba(255, 180, 80, 0.8)';
			ctx.fillText(
				'JUSTIFICATIVA: Alocar códigos longos aos nós menos frequentes minimiza o somatório ponderado Σ(fi × di).',
				px + 26,
				cardY + 62
			);
			ctx.fillText(
				'Subestrutura Ótima: Reduz a instância de tamanho n para um subproblema idêntico de tamanho n-1.',
				px + 26,
				cardY + 80
			);
		} else {
			ctx.fillText(
				'ÁRVORE COMPLETA: Todos os caracteres foram unificados em uma única raiz ótima.',
				px + 26,
				cardY + 50
			);
		}

		// Action button: Execute Recommended Greedy Merge
		const btnY = py + 208;
		const canMerge = advice !== null;

		this.renderTeletypeCommand(
			ctx,
			px + 14,
			btnY,
			pw - 28,
			42,
			canMerge ? '▶ APLICAR FUSÃO AMBICIOSA SUGERIDA (ESPAÇO)' : 'ÁRVORE TOTALMENTE UNIFICADA',
			canMerge ? `${advice?.labelA} + ${advice?.labelB} ➔ Σ${advice?.sumWeight}` : 'Pronta para transmissão SOS',
			canMerge,
			() => {
				if (canMerge) {
					this.onAction?.({ type: 'APPLY_GREEDY_MERGE' });
				}
			}
		);
	}

	private renderReportPanel(
		ctx: CanvasRenderingContext2D,
		state: AuxiliaryScreenState,
		px: number,
		py: number,
		pw: number,
		ph: number
	): void {
		ctx.fillStyle = '#ffcc77';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► RELATÓRIO TÉCNICO ACADÊMICO // COMPRESSÃO DE DADOS:', px + 14, py + 26);

		const rep = state.academicReport;

		ctx.font = '12px "Courier New", monospace';
		ctx.fillStyle = 'rgba(255, 200, 120, 0.9)';
		ctx.fillText(`MENSAGEM : "${state.activeMessage}" (${rep?.characterCount ?? state.activeMessage.length} caracteres)`, px + 14, py + 52);

		ctx.fillText(
			`ASCII 8-bit: ${rep?.rawAsciiBits ?? state.activeMessage.length * 8}b  |  HUFFMAN DO JOGADOR: ${rep?.playerBits ?? '--'}b  |  ÓTIMO: ${rep?.optimalBits ?? '--'}b`,
			px + 14,
			py + 76
		);

		ctx.fillText(
			`EFICIÊNCIA AMBICIOSA: ${rep?.efficiencyPct ?? '--'}%  |  TAXA DE COMPRESSÃO: ${rep?.compressionRatioPct ?? '--'}%`,
			px + 14,
			py + 100
		);

		if (rep) {
			ctx.fillText(
				`ENTROPIA H(X): ${rep.shannonEntropy} bits/char  |  COMPRIMENTO MÉDIO L: ${rep.averageCodeLength} bits/char`,
				px + 14,
				py + 124
			);
			ctx.fillText(`REDUNDÂNCIA ESTIMADA: ${rep.redundancyBits} bits`, px + 14, py + 148);
		}

		// Action Buttons: Copy Markdown & Copy JSON
		const btnY = py + 180;
		const halfW = (pw - 38) / 2;

		this.renderTeletypeCommand(
			ctx,
			px + 14,
			btnY,
			halfW,
			54,
			'COPIAR RELATÓRIO (MARKDOWN)',
			'Para colar em relatórios da faculdade',
			false,
			() => {
				this.onAction?.({ type: 'EXPORT_REPORT' });
				this.showToast('RELATÓRIO MARKDOWN COPIADO!');
			}
		);

		this.renderTeletypeCommand(
			ctx,
			px + 14 + halfW + 10,
			btnY,
			halfW,
			54,
			'{ } COPIAR ESTRUTURA (JSON)',
			'Exportar dados para scripts/testes',
			false,
			() => {
				this.onAction?.({ type: 'COPY_JSON' });
				this.showToast('ESTRUTURA JSON COPIADA!');
			}
		);
	}

	private renderToastNotification(ctx: CanvasRenderingContext2D, msg: string): void {
		const tw = 460;
		const th = 46;
		const tx = (this.width - tw) / 2;
		const ty = 340;

		const alpha = Math.min(1, Math.max(0, this.toastTimer / 0.4));
		ctx.save();
		ctx.globalAlpha = alpha;

		ctx.fillStyle = '#ff9e24';
		ctx.fillRect(tx, ty, tw, th);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.strokeRect(tx, ty, tw, th);

		ctx.fillStyle = '#0f0700';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(`[OK] ${msg}`, tx + tw / 2, ty + 28);
		ctx.restore();
	}

	private getContextualLogs(state: AuxiliaryScreenState): Array<{ text: string; alert?: boolean }> {
		if (state.acousticProximity > 75) {
			return [
				{ text: `[${this.formatTime(14)}] ALERTA: Ressonância acústica na escotilha.`, alert: true },
				{ text: `[${this.formatTime(28)}] Casco sob sobrecarga a ${state.pressureAtm} ATM.`, alert: true },
				{ text: `[${this.formatTime(42)}] "Impactos na antepara. Reduza a emissão sonora!"`, alert: true },
				{ text: `[${this.formatTime(56)}] PROTOCOLO: Funda nós de menor frequência primeiro.` },
				{ text: `[${this.formatTime(70)}] Falha estrutural iminente se ruído persistir.`, alert: true }
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
				{ text: `[04:28] "Contato na escotilha. Algo tenta entrar."`, alert: true },
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
		ctx.fillText('► SELEÇÃO DE MISSÃO & EXPERIMENTOS AMBICIOSOS:', sx + 14, sy + 22);

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
			{ title: 'PRESET: CASCO', msg: 'SOS CASCO' },
			{ title: 'CASO FIBONACCI', msg: 'AAAAABBBCCD' },
			{ title: 'DISTRIB. UNIFORME', msg: 'ABCDEFGH' }
		];

		const pw = (w - 20) / presets.length;
		presets.forEach((item, idx) => {
			const px = x + idx * (pw + 10);
			this.renderTeletypeCommand(
				ctx,
				px,
				y,
				pw,
				52,
				item.title,
				item.msg,
				false,
				() => this.onAction?.({ type: 'SET_MESSAGE', message: item.msg })
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
			ctx.font = 'bold 12px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(`► ${title} ◄`, x + w / 2, y + 19);

			ctx.font = '10px "Courier New", monospace';
			ctx.fillText(subtitle, x + w / 2, y + 35);
		} else {
			ctx.fillStyle = 'rgba(25, 12, 0, 0.6)';
			ctx.fillRect(x, y, w, h);
			ctx.strokeStyle = 'rgba(255, 158, 36, 0.4)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, w, h);

			ctx.fillStyle = '#ff9e24';
			ctx.font = 'bold 12px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(title, x + w / 2, y + 19);

			ctx.fillStyle = 'rgba(255, 180, 80, 0.7)';
			ctx.font = '10px "Courier New", monospace';
			ctx.fillText(subtitle, x + w / 2, y + 35);
		}

		this.interactiveRects.push({ x, y, w, h, action });
	}

	private renderSystemCommands(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const y = 690;
		const totalW = this.width - 40;
		const gap = 8;
		const count = 6;
		const w = (totalW - gap * (count - 1)) / count;

		const isAuxFocused = state.focusedScreen === 'aux';
		const isMainFocused = state.focusedScreen === 'main';

		// Button 1: Focar Console B
		this.renderTeletypeCommand(
			ctx,
			20,
			y,
			w,
			48,
			isAuxFocused ? '[ ⛶ AMPLA (C) ]' : '[ ⛶ CONSOLE B (C) ]',
			isAuxFocused ? 'Visão ampla' : 'Focar aqui',
			isAuxFocused,
			() => this.onAction?.({ type: 'FOCUS_AUX' })
		);

		// Button 2: Focar Console A
		this.renderTeletypeCommand(
			ctx,
			20 + (w + gap),
			y,
			w,
			48,
			isMainFocused ? '[ ⛶ AMPLA (F) ]' : '[ ⛶ CONSOLE A (F) ]',
			'Terminal CRT',
			isMainFocused,
			() => this.onAction?.({ type: 'TOGGLE_FOCUS' })
		);

		// Button 3: Protocolo Tartarus / Min-Heap (T)
		const isMinHeapActive = this.activeTab === 'minheap';
		this.renderTeletypeCommand(
			ctx,
			20 + (w + gap) * 2,
			y,
			w,
			48,
			isMinHeapActive ? '✓ MIN-HEAP (T)' : '► MIN-HEAP (T)',
			'Lema de Huffman',
			isMinHeapActive,
			() => {
				this.activeTab = isMinHeapActive ? 'logs' : 'minheap';
				this.onAction?.({ type: 'SWITCH_TAB', tab: this.activeTab });
			}
		);

		// Button 4: Relatório / Exportar (E)
		const isReportActive = this.activeTab === 'report';
		this.renderTeletypeCommand(
			ctx,
			20 + (w + gap) * 3,
			y,
			w,
			48,
			'RELATÓRIO (E)',
			'Markdown / JSON',
			isReportActive,
			() => {
				this.activeTab = isReportActive ? 'logs' : 'report';
				this.onAction?.({ type: 'SWITCH_TAB', tab: this.activeTab });
			}
		);

		// Button 5: Reboot
		this.renderTeletypeCommand(
			ctx,
			20 + (w + gap) * 4,
			y,
			w,
			48,
			'[ ↻ REBOOT (B) ]',
			'Reinicializar',
			false,
			() => this.onAction?.({ type: 'REBOOT' })
		);

		// Button 6: Audio Mute
		this.renderTeletypeCommand(
			ctx,
			20 + (w + gap) * 5,
			y,
			w,
			48,
			state.isMuted ? '[ MUDO ]' : '[ SOM ]',
			'[M] Áudio',
			false,
			() => this.onAction?.({ type: 'TOGGLE_MUTE' })
		);
	}

	private renderBootScreen(
		ctx: CanvasRenderingContext2D,
		_state: AuxiliaryScreenState,
		delta: number
	): void {
		this.bootTime += delta;
		if (this.bootTime >= this.bootDuration) {
			this.isBooting = false;
			return;
		}

		terminalLogo.drawXPBootScreen(ctx, {
			width: this.width,
			height: this.height,
			bootTime: this.bootTime,
			bootDuration: this.bootDuration,
			theme: 'amber',
			titleMain: 'TARTARUS',
			titleXP: 'xp',
			subtitle: 'Teletype Edition',
			companyName: 'A U X I L I A R Y   T E L E M E T R Y   U N I T',
			copyrightText: 'Cephalo-Systems Corporation // Console B Subsystem',
			accentColor: '#ff7a00'
		});
	}
}
