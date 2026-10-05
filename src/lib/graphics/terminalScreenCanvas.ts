import type { HuffmanMetrics, HuffmanNode } from '../engine/huffman';
import { terminalLogo } from './terminalLogo';

export interface TerminalScreenState {
	depth: number;
	pressureAtm: number;
	message: string;
	metrics: HuffmanMetrics;
	acousticProximity: number;
	isTreeComplete: boolean;
	isTransmitting: boolean;
	isGameOver: boolean;
	isVictory: boolean;
	selectedNodeIds: string[];
	availableNodes: HuffmanNode[];
	allActiveNodes: HuffmanNode[];
	transmittedBits: string;
	fullBitStream: string;
	currentBitIndex: number;
	safeBitQuota: number;
}

export type ScreenActionCallback = (action: {
	type: 'SELECT_NODE' | 'MERGE' | 'UNDO' | 'RESET' | 'TRANSMIT' | 'RETRY' | 'NEXT_LEVEL';
	nodeId?: string;
}) => void;

interface InteractiveRect {
	x: number;
	y: number;
	w: number;
	h: number;
	action: () => void;
}

export class TerminalScreenCanvas {
	public canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	public width: number = 1024;
	public height: number = 768;

	private interactiveRects: InteractiveRect[] = [];
	private onAction: ScreenActionCallback | null = null;
	private scanlinePattern: CanvasPattern | null = null;
	private hydrophonePhase: number = 0;

	private isBooting: boolean = true;
	private bootTime: number = 0;
	public readonly bootDuration: number = 3.6;

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
		pctx.fillRect(0, 0, 4, 1);
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

	public setActionCallback(cb: ScreenActionCallback): void {
		this.onAction = cb;
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

	public render(state: TerminalScreenState, delta: number): void {
		const ctx = this.ctx;
		this.interactiveRects = [];
		this.hydrophonePhase += delta * 4.5;

		if (this.isBooting) {
			this.renderBootScreen(ctx, state, delta);
			return;
		}

		ctx.fillStyle = '#010d08';
		ctx.fillRect(0, 0, this.width, this.height);

		if (this.scanlinePattern) {
			ctx.fillStyle = this.scanlinePattern;
			ctx.fillRect(0, 0, this.width, this.height);
		}

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.04)';
		ctx.lineWidth = 1;
		for (let x = 0; x < this.width; x += 32) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, this.height);
			ctx.stroke();
		}
		for (let y = 0; y < this.height; y += 32) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(this.width, y);
			ctx.stroke();
		}

		if (state.isGameOver) {
			this.renderGameOverScreen(ctx, state);
			return;
		}
		if (state.isVictory) {
			this.renderVictoryScreen(ctx, state);
			return;
		}
		if (state.isTransmitting) {
			this.renderTransmissionScreen(ctx, state);
			return;
		}

		this.renderTopBanner(ctx, state);
		this.renderTelemetryPanel(ctx, state);
		this.renderHydrophoneScope(ctx, state);
		this.renderHuffmanTreeArea(ctx, state);
		this.renderBottomControls(ctx, state);

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
		ctx.lineWidth = 2;
		ctx.strokeRect(6, 6, this.width - 12, this.height - 12);
	}

	private renderTopBanner(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const bx = 12;
		const by = 12;
		const bw = this.width - 24;
		const bh = 52;

		ctx.fillStyle = 'rgba(0, 26, 18, 0.6)';
		ctx.fillRect(bx, by, bw, bh);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
		ctx.lineWidth = 1;
		ctx.strokeRect(bx, by, bw, bh);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText(`TARTARUS-V // ${state.depth}m`, bx + 16, by + 24);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.fillText(`MENSAGEM: "${state.message}"`, bx + 16, by + 42);

		const risk = Math.round(state.acousticProximity);
		ctx.textAlign = 'right';
		ctx.fillStyle = risk > 75 ? '#ff3b3b' : risk > 45 ? '#ffaa00' : '#00ffaa';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText(`RISCO: ${risk}%`, bx + bw - 16, by + 24);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.8)';
		ctx.font = '12px "Courier New", monospace';
		ctx.fillText(`COTA LIMITE: ${state.safeBitQuota}b`, bx + bw - 16, by + 42);
	}

	private renderTelemetryPanel(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const px = 12;
		const py = 72;
		const pw = 246;
		const ph = 216;

		ctx.fillStyle = 'rgba(0, 18, 12, 0.65)';
		ctx.fillRect(px, py, pw, ph);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
		ctx.lineWidth = 1;
		ctx.strokeRect(px, py, pw, ph);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('TELEMETRIA HUFFMAN', px + 14, py + 24);

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.15)';
		ctx.beginPath();
		ctx.moveTo(px + 14, py + 34);
		ctx.lineTo(px + pw - 14, py + 34);
		ctx.stroke();

		ctx.font = '12px "Courier New", monospace';
		ctx.fillStyle = 'rgba(0, 255, 170, 0.75)';
		ctx.fillText(`ASCII BRUTO : ${state.metrics.rawAsciiBits}b`, px + 14, py + 58);
		ctx.fillText(`CUSTO ÓTIMO : ${state.metrics.optimalBits}b`, px + 14, py + 84);

		ctx.fillStyle = state.isTreeComplete
			? state.metrics.playerBits <= state.safeBitQuota
				? '#00ffaa'
				: '#ffaa00'
			: 'rgba(0, 255, 170, 0.4)';
		ctx.fillText(
			`SUA ÁRVORE  : ${state.isTreeComplete ? `${state.metrics.playerBits}b` : 'PENDENTE'}`,
			px + 14,
			py + 110
		);

		ctx.fillStyle = '#ffffff';
		ctx.fillText(`EFICIÊNCIA  : ${state.isTreeComplete ? `${state.metrics.efficiency}%` : '--'}`, px + 14, py + 142);

		ctx.fillStyle = '#02120b';
		ctx.fillRect(px + 14, py + 152, pw - 28, 10);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.5)';
		ctx.strokeRect(px + 14, py + 152, pw - 28, 10);

		if (state.isTreeComplete) {
			const effRatio = Math.min(1.0, state.metrics.efficiency / 100);
			ctx.fillStyle = state.metrics.efficiency >= 95 ? '#00ffaa' : state.metrics.efficiency >= 80 ? '#ffaa00' : '#ff3b3b';
			ctx.fillRect(px + 15, py + 153, (pw - 30) * effRatio, 8);
		}

		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.fillStyle = state.isTreeComplete ? '#00ffaa' : '#ffaa00';
		ctx.fillText(
			state.isTreeComplete ? '● TRANSMISSÃO PRONTA' : `● ${state.availableNodes.length} NÓS PENDENTES`,
			px + 14,
			py + 192
		);
	}

	private renderHydrophoneScope(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const rw = 246;
		const rh = 216;
		const rx = this.width - rw - 12;
		const ry = 72;

		ctx.fillStyle = 'rgba(0, 18, 12, 0.65)';
		ctx.fillRect(rx, ry, rw, rh);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
		ctx.lineWidth = 1;
		ctx.strokeRect(rx, ry, rw, rh);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('HIDROFONE PASSIVO [dB]', rx + rw / 2, ry + 24);

		const cx = rx + rw / 2;
		const cy = ry + 104;
		const radius = 62;

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.12)';
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(cx - radius, cy);
		ctx.lineTo(cx + radius, cy);
		ctx.moveTo(cx, cy - radius);
		ctx.lineTo(cx, cy + radius);
		ctx.stroke();

		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
		ctx.clip();

		const waveY = cy;
		const tension = state.acousticProximity / 100;
		const wavePoints = 48;
		const step = (radius * 2) / wavePoints;

		ctx.strokeStyle = tension > 0.75 ? '#ff3b3b' : tension > 0.4 ? '#00ffaa' : '#00bb77';
		ctx.lineWidth = 1.5;
		ctx.beginPath();

		for (let i = 0; i <= wavePoints; i++) {
			const px = cx - radius + i * step;

			const freq = 4.0 + tension * 12.0;
			const amp = 6.0 + tension * 22.0;
			const noise = (Math.random() - 0.5) * (tension * 16.0);
			const py = waveY + Math.sin(i * 0.35 * freq + this.hydrophonePhase) * amp + noise;

			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();
		ctx.restore();

		const dbLevel = (120 - state.acousticProximity * 0.85).toFixed(1);
		ctx.font = '11px "Courier New", monospace';
		ctx.fillStyle = tension > 0.75 ? '#ff3b3b' : tension > 0.45 ? '#ffaa00' : 'rgba(0, 255, 170, 0.9)';
		ctx.fillText(`PRESSÃO: -${dbLevel} dB`, cx, ry + 185);

		const contactStatus = tension > 0.75 ? 'RESSONÂNCIA CRÍTICA' : tension > 0.45 ? 'BIORRUÍDO DETECTADO' : 'NOMINAL // SILÊNCIO';
		ctx.font = 'bold 10px "Courier New", monospace';
		ctx.fillText(`STATUS: ${contactStatus}`, cx, ry + 202);
	}

	private renderHuffmanTreeArea(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const tx = 270;
		const ty = 72;
		const tw = this.width - 270 - 258;
		const th = 460;

		ctx.fillStyle = 'rgba(0, 20, 14, 0.45)';
		ctx.fillRect(tx, ty, tw, th);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.2)';
		ctx.lineWidth = 1;
		ctx.strokeRect(tx, ty, tw, th);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.5)';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('DIAGRAMA BINÁRIO (SELECIONE 2 NÓS)', tx + 14, ty + 22);

		// Layout dos nós (as raízes da floresta são os nós ainda disponíveis).
		// As posições ficam num mapa local indexado por id: os nós chegam do Svelte
		// como proxies de $state, e gravar x/y neles não se propaga entre cópias.
		const { nodes, positions, nodeW: nw, nodeH: nh } = this.layoutNodes(
			state.availableNodes,
			tx + 20,
			ty + 36,
			tw - 40,
			th - 48
		);
		const pos = (node: HuffmanNode) => positions.get(node.id)!;
		const availableIds = new Set(state.availableNodes.map((n) => n.id));
		const scale = Math.min(nw / 48, nh / 38);
		const labelSize = Math.max(9, Math.round(14 * scale));
		const weightSize = Math.max(8, Math.round(10 * scale));
		ctx.textAlign = 'center';

		for (const parent of nodes) {
			if (!parent.isLeaf && parent.left && parent.right) {
				const { x: px, y: py } = pos(parent);
				const { x: lx, y: ly } = pos(parent.left);
				const { x: rx, y: ry } = pos(parent.right);

				ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(px, py);
				ctx.lineTo(lx, ly);
				ctx.stroke();

				ctx.fillStyle = 'rgba(0, 255, 170, 0.9)';
				ctx.font = `bold ${Math.max(8, Math.round(11 * scale))}px "Courier New", monospace`;
				ctx.fillText('0', (px + lx) / 2 - 8, (py + ly) / 2);

				ctx.beginPath();
				ctx.moveTo(px, py);
				ctx.lineTo(rx, ry);
				ctx.stroke();

				ctx.fillText('1', (px + rx) / 2 + 8, (py + ry) / 2);
			}
		}

		for (const node of nodes) {
			const { x: nx, y: ny } = pos(node);
			const isSelected = state.selectedNodeIds.includes(node.id);
			const isAvailable = availableIds.has(node.id);
			const labelY = ny - nh * 0.08;
			const weightY = ny + nh * 0.32;

			if (isSelected) {

				ctx.fillStyle = '#00ffaa';
				ctx.fillRect(nx - nw / 2, ny - nh / 2, nw, nh);
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 1.5;
				ctx.strokeRect(nx - nw / 2, ny - nh / 2, nw, nh);

				ctx.textAlign = 'center';
				ctx.fillStyle = '#010d08';
				ctx.font = `bold ${labelSize}px "Courier New", monospace`;
				const label = node.isLeaf ? (node.char === ' ' ? '␣' : node.char) : 'Σ';
				ctx.fillText(label ?? '', nx, labelY);

				ctx.font = `bold ${weightSize}px "Courier New", monospace`;
				ctx.fillText(`${node.weight}`, nx, weightY);
			} else {

				ctx.fillStyle = isAvailable ? '#012015' : '#01120c';
				ctx.fillRect(nx - nw / 2, ny - nh / 2, nw, nh);
				ctx.strokeStyle = isAvailable ? '#00ffaa' : 'rgba(0, 255, 170, 0.25)';
				ctx.lineWidth = 1;
				ctx.strokeRect(nx - nw / 2, ny - nh / 2, nw, nh);

				ctx.textAlign = 'center';
				ctx.fillStyle = isAvailable ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
				ctx.font = `bold ${Math.max(9, labelSize - 1)}px "Courier New", monospace`;
				const label = node.isLeaf ? (node.char === ' ' ? '␣' : node.char) : 'Σ';
				ctx.fillText(label ?? '', nx, labelY);

				ctx.font = `${weightSize}px "Courier New", monospace`;
				ctx.fillStyle = isAvailable ? '#00ffaa' : 'rgba(0, 255, 170, 0.4)';
				ctx.fillText(`${node.weight}`, nx, weightY);
			}

			if (isAvailable) {
				this.interactiveRects.push({
					x: nx - nw / 2,
					y: ny - nh / 2,
					w: nw,
					h: nh,
					action: () => {
						this.onAction?.({ type: 'SELECT_NODE', nodeId: node.id });
					}
				});
			}
		}
	}

	/**
	 * Posiciona a floresta de subárvores de baixo para cima: cada folha recebe uma
	 * fatia horizontal própria (subárvores ocupam fatias contíguas proporcionais ao
	 * número de folhas) e cada nó interno fica acima do filho mais alto. Os tamanhos
	 * dos nós encolhem para que a floresta inteira caiba na área, sem sobreposição.
	 */
	private layoutNodes(
		roots: HuffmanNode[],
		left: number,
		top: number,
		areaWidth: number,
		areaHeight: number
	): {
		nodes: HuffmanNode[];
		positions: Map<string, { x: number; y: number }>;
		nodeW: number;
		nodeH: number;
	} {
		const nodes: HuffmanNode[] = [];
		const positions = new Map<string, { x: number; y: number }>();
		const heights = new Map<string, number>();
		const leafCounts = new Map<string, number>();

		const measure = (node: HuffmanNode): void => {
			nodes.push(node);
			if (!node.isLeaf && node.left && node.right) {
				measure(node.left);
				measure(node.right);
				heights.set(node.id, 1 + Math.max(heights.get(node.left.id)!, heights.get(node.right.id)!));
				leafCounts.set(node.id, leafCounts.get(node.left.id)! + leafCounts.get(node.right.id)!);
			} else {
				heights.set(node.id, 0);
				leafCounts.set(node.id, 1);
			}
		};

		let totalLeaves = 0;
		let maxHeight = 0;
		for (const root of roots) {
			measure(root);
			maxHeight = Math.max(maxHeight, heights.get(root.id)!);
			totalLeaves += leafCounts.get(root.id)!;
		}
		if (totalLeaves === 0) return { nodes, positions, nodeW: 48, nodeH: 38 };

		const slotW = Math.min(90, areaWidth / totalLeaves);
		const nodeW = Math.max(16, Math.min(48, slotW - 4));

		let nodeH = 38;
		let levelGap = maxHeight > 0 ? (areaHeight - nodeH) / maxHeight : 0;
		if (maxHeight > 0 && levelGap < nodeH + 6) {
			nodeH = Math.max(18, levelGap - 6);
			levelGap = (areaHeight - nodeH) / maxHeight;
		}
		levelGap = Math.min(72, levelGap);

		const bottomY = top + areaHeight - nodeH / 2;
		const place = (node: HuffmanNode, startX: number): number => {
			let x: number;
			if (!node.isLeaf && node.left && node.right) {
				const lx = place(node.left, startX);
				const rx = place(node.right, startX + leafCounts.get(node.left.id)! * slotW);
				x = (lx + rx) / 2;
			} else {
				x = startX + slotW / 2;
			}
			positions.set(node.id, { x, y: bottomY - heights.get(node.id)! * levelGap });
			return x;
		};

		let cursor = left + (areaWidth - totalLeaves * slotW) / 2;
		for (const root of roots) {
			place(root, cursor);
			cursor += leafCounts.get(root.id)! * slotW;
		}

		return { nodes, positions, nodeW, nodeH };
	}

	private renderBottomControls(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const by = 540;
		const bh = 216;

		ctx.fillStyle = 'rgba(0, 14, 10, 0.85)';
		ctx.fillRect(12, by, this.width - 24, bh);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
		ctx.lineWidth = 1;
		ctx.strokeRect(12, by, this.width - 24, bh);

		this.renderTactileButton(
			ctx,
			24,
			by + 12,
			170,
			38,
			'[ FUNDIR: ESPAÇO ]',
			state.selectedNodeIds.length === 2,
			() => this.onAction?.({ type: 'MERGE' })
		);

		this.renderTactileButton(
			ctx,
			204,
			by + 12,
			140,
			38,
			'[ DESFAZER: Z ]',
			state.allActiveNodes.length > state.availableNodes.length,
			() => this.onAction?.({ type: 'UNDO' })
		);

		this.renderTactileButton(
			ctx,
			354,
			by + 12,
			140,
			38,
			'[ REINICIAR: R ]',
			state.allActiveNodes.length > state.availableNodes.length,
			() => this.onAction?.({ type: 'RESET' })
		);

		this.renderTactileButton(
			ctx,
			504,
			by + 12,
			this.width - 504 - 24,
			38,
			state.isTreeComplete ? '▶ TRANSMITIR SOS [ENTER]' : 'ÁRVORE PENDENTE',
			state.isTreeComplete,
			() => this.onAction?.({ type: 'TRANSMIT' }),
			true
		);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.65)';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText(
			`NÓS DISPONÍVEIS (${state.selectedNodeIds.length}/2):`,
			24,
			by + 72
		);

		const cardW = 68;
		const cardH = 68;
		const gap = 12;
		const startX = 24;
		const cardY = by + 86;

		state.availableNodes.forEach((node, i) => {
			const cx = startX + i * (cardW + gap);
			if (cx + cardW > this.width - 24) return;

			const isSelected = state.selectedNodeIds.includes(node.id);

			if (isSelected) {
				ctx.fillStyle = '#00ffaa';
				ctx.fillRect(cx, cardY, cardW, cardH);
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 1.5;
				ctx.strokeRect(cx, cardY, cardW, cardH);

				ctx.textAlign = 'center';
				ctx.fillStyle = '#010d08';
				ctx.font = 'bold 22px "Courier New", monospace';
				const label = node.isLeaf ? (node.char === ' ' ? '␣' : node.char) : 'Σ';
				ctx.fillText(label ?? '', cx + cardW / 2, cardY + 34);

				ctx.font = 'bold 11px "Courier New", monospace';
				ctx.fillText(`PESO: ${node.weight}`, cx + cardW / 2, cardY + 54);
			} else {
				ctx.fillStyle = '#012015';
				ctx.fillRect(cx, cardY, cardW, cardH);
				ctx.strokeStyle = '#00ffaa';
				ctx.lineWidth = 1;
				ctx.strokeRect(cx, cardY, cardW, cardH);

				ctx.textAlign = 'center';
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 22px "Courier New", monospace';
				const label = node.isLeaf ? (node.char === ' ' ? '␣' : node.char) : 'Σ';
				ctx.fillText(label ?? '', cx + cardW / 2, cardY + 34);

				ctx.font = '11px "Courier New", monospace';
				ctx.fillStyle = '#00ffaa';
				ctx.fillText(`PESO: ${node.weight}`, cx + cardW / 2, cardY + 54);
			}

			this.interactiveRects.push({
				x: cx,
				y: cardY,
				w: cardW,
				h: cardH,
				action: () => {
					this.onAction?.({ type: 'SELECT_NODE', nodeId: node.id });
				}
			});
		});

		ctx.fillStyle = 'rgba(0, 255, 170, 0.45)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('ATALHOS: [Espaço] Fundir | [Z] Desfazer | [R] Reset | [Enter] Transmitir | [F/C] Foco | [H] Manual', 24, by + 195);
	}

	private renderTactileButton(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		text: string,
		enabled: boolean,
		action: () => void,
		isPrimary: boolean = false
	): void {
		if (enabled) {
			if (isPrimary) {
				ctx.fillStyle = 'rgba(0, 255, 170, 0.2)';
				ctx.fillRect(x, y, w, h);
				ctx.strokeStyle = '#00ffaa';
				ctx.lineWidth = 1.5;
				ctx.strokeRect(x, y, w, h);

				ctx.textAlign = 'center';
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 12px "Courier New", monospace';
				ctx.fillText(text, x + w / 2, y + h / 2 + 4);
			} else {
				ctx.fillStyle = 'rgba(0, 36, 24, 0.8)';
				ctx.fillRect(x, y, w, h);
				ctx.strokeStyle = '#00ffaa';
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, w, h);

				ctx.textAlign = 'center';
				ctx.fillStyle = '#00ffaa';
				ctx.font = 'bold 12px "Courier New", monospace';
				ctx.fillText(text, x + w / 2, y + h / 2 + 4);
			}
			this.interactiveRects.push({ x, y, w, h, action });
		} else {
			ctx.fillStyle = 'rgba(10, 16, 14, 0.6)';
			ctx.fillRect(x, y, w, h);
			ctx.strokeStyle = 'rgba(0, 255, 170, 0.15)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, w, h);

			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(0, 255, 170, 0.3)';
			ctx.font = 'bold 12px "Courier New", monospace';
			ctx.fillText(text, x + w / 2, y + h / 2 + 4);
		}
	}

	private renderTransmissionScreen(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(30, 4, 4, 0.4)';
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = '#ff3b3b';
		ctx.font = 'bold 24px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('TRANSMISSÃO SONAR ATIVA', this.width / 2, 120);

		ctx.font = '15px "Courier New", monospace';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
		ctx.fillText(
			`PULSOS ACÚSTICOS: ${state.currentBitIndex} / ${state.fullBitStream.length}`,
			this.width / 2,
			160
		);

		ctx.fillStyle = '#01120a';
		ctx.fillRect(80, 200, this.width - 160, 260);
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 1;
		ctx.strokeRect(80, 200, this.width - 160, 260);

		ctx.font = '18px "Courier New", monospace';
		ctx.textAlign = 'left';
		let cursorX = 96;
		let cursorY = 236;

		for (let i = 0; i < state.fullBitStream.length; i++) {
			const bit = state.fullBitStream[i];
			if (i < state.currentBitIndex) {
				ctx.fillStyle = '#00ffaa';
			} else if (i === state.currentBitIndex) {
				ctx.fillStyle = '#ffffff';
			} else {
				ctx.fillStyle = '#0a3824';
			}
			ctx.fillText(bit, cursorX, cursorY);
			cursorX += 16;
			if (cursorX > this.width - 110) {
				cursorX = 96;
				cursorY += 28;
			}
		}

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(`RUÍDO ACÚSTICO: ${Math.round(state.acousticProximity)}%`, this.width / 2, 520);

		ctx.fillStyle = '#010d08';
		ctx.fillRect(160, 540, this.width - 320, 22);
		ctx.strokeStyle = '#ff3b3b';
		ctx.lineWidth = 1;
		ctx.strokeRect(160, 540, this.width - 320, 22);

		ctx.fillStyle = '#ff3b3b';
		ctx.fillRect(161, 541, ((this.width - 322) * state.acousticProximity) / 100, 20);
	}

	private renderGameOverScreen(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(40, 2, 2, 0.75)';
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = '#ff3b3b';
		ctx.font = 'bold 30px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('COLAPSO DE CASCO // SINAL PERDIDO', this.width / 2, 210);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
		ctx.font = '15px "Courier New", monospace';
		ctx.fillText('PRESSÃO CRÍTICA. CASCO ROMPIDO.', this.width / 2, 260);
		ctx.fillText('A ENTIDADE DETECTOU O SONAR.', this.width / 2, 290);

		ctx.fillStyle = 'rgba(255, 120, 120, 0.9)';
		ctx.fillText(`Bits: ${state.currentBitIndex} | Limite seguro: ${state.safeBitQuota}`, this.width / 2, 340);

		this.renderTactileButton(
			ctx,
			this.width / 2 - 180,
			420,
			360,
			50,
			'[ REINICIAR ]',
			true,
			() => this.onAction?.({ type: 'RETRY' }),
			true
		);
	}

	private renderVictoryScreen(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(0, 24, 16, 0.8)';
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 28px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('SINAL TRANSMITIDO COM SUCESSO', this.width / 2, 160);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.font = '15px "Courier New", monospace';
		ctx.fillText('SONAR SILENCIADO A TEMPO.', this.width / 2, 210);
		ctx.fillText('A CRIATURA PERDEU O RASTRO NA FENDA.', this.width / 2, 236);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 18px "Courier New", monospace';
		ctx.fillText(`EFICIÊNCIA GULOSA: ${state.metrics.efficiency}%`, this.width / 2, 280);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.8)';
		ctx.font = '13px "Courier New", monospace';
		ctx.fillText(`Bits: ${state.metrics.rawAsciiBits}  ➔  ${state.metrics.playerBits}`, this.width / 2, 314);
		ctx.fillText(`Economia de Ruído: ${state.metrics.compressionRatio}%`, this.width / 2, 338);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
		ctx.font = '12px "Courier New", monospace';
		ctx.fillText('AGUARDANDO EQUIPE DE RESGATE...', this.width / 2, 380);

		this.renderTactileButton(
			ctx,
			this.width / 2 - 180,
			430,
			360,
			50,
			'[ PRÓXIMO SETOR ]',
			true,
			() => this.onAction?.({ type: 'NEXT_LEVEL' }),
			true
		);
	}

	private renderBootScreen(
		ctx: CanvasRenderingContext2D,
		_state: TerminalScreenState,
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
			theme: 'green',
			titleMain: 'SUBWAVE',
			titleXP: 'xp',
			subtitle: 'Professional',
			companyName: 'T A R T A R U S   S U B M E R S I B L E   S Y S T E M S',
			copyrightText: 'Cephalo-Systems Corporation // All rights reserved.',
			accentColor: '#00e5ff'
		});
	}
}

