/**
 * SUBWAVE - Terminal Screen Canvas Renderer
 * Renderiza o terminal CRT retro completo em uma CanvasTexture 2D de alta definição:
 * - Telemetria de Bits e Eficiência Gulosa
 * - Radar Sonar de Ecolocalização com varredura giratória
 * - Mensagem de Alerta SOS e Profundidade
 * - Árvore de Huffman com nós luminosos, feixes de laser e marcadores '0' e '1'
 * - Bandeja de nós disponíveis e botões táteis (FUSÃO, DESFAZER, TRANSMITIR)
 * - Telas de Transmissão, Derrota e Vitória
 * 
 * Suporta detecção de clique por coordenadas UV (0.0 a 1.0).
 */

import type { HuffmanEngine, HuffmanMetrics, HuffmanNode } from '../engine/huffman';

export interface TerminalScreenState {
	depth: number;
	pressureAtm: number;
	message: string;
	metrics: HuffmanMetrics;
	acousticProximity: number; // 0 a 100%
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
	private radarAngle: number = 0;
	private scanlinePattern: CanvasPattern | null = null;

	constructor() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.ctx = this.canvas.getContext('2d')!;

		// Pré-cria padrão de scanlines (elimina centenas de chamadas fillRect por frame)
		const patCanvas = document.createElement('canvas');
		patCanvas.width = 4;
		patCanvas.height = 4;
		const pctx = patCanvas.getContext('2d')!;
		pctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
		pctx.fillRect(0, 0, 4, 1);
		this.scanlinePattern = this.ctx.createPattern(patCanvas, 'repeat');
	}

	public setActionCallback(cb: ScreenActionCallback): void {
		this.onAction = cb;
	}

	/**
	 * Detecta clique com base em coordenadas UV (0.0 a 1.0) do Raycast no Three.js.
	 */
	public handleClickUV(u: number, v: number): boolean {
		const canvasX = u * this.width;
		const canvasY = (1 - v) * this.height; // Inverte eixo V para canvas 2D

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

	/**
	 * Renderiza um quadro completo do terminal na textura da tela.
	 */
	public render(state: TerminalScreenState, delta: number): void {
		const ctx = this.ctx;
		this.interactiveRects = [];
		this.radarAngle += delta * 1.8;

		// 1. Fundo do tubo CRT (Fósforo verde-escuro com vinheta)
		ctx.fillStyle = '#01140e';
		ctx.fillRect(0, 0, this.width, this.height);

		// Scanlines com padrão repetido ultra-rápido (1 draw call)
		if (this.scanlinePattern) {
			ctx.fillStyle = this.scanlinePattern;
			ctx.fillRect(0, 0, this.width, this.height);
		}

		// Grade de fósforo milimétrica
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.05)';
		ctx.lineWidth = 1;
		for (let x = 0; x < this.width; x += 32) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, this.height);
			ctx.stroke();
		}

		// 2. Telas Especiais (Transmissão, Game Over ou Vitória)
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

		// 3. TELA PRINCIPAL DO TERMINAL
		this.renderTopBanner(ctx, state);
		this.renderTelemetryPanel(ctx, state);
		this.renderSonarRadar(ctx, state);
		this.renderHuffmanTreeArea(ctx, state);
		this.renderBottomControls(ctx, state);

		// Borda interna de curvatura CRT
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
		ctx.lineWidth = 3;
		ctx.strokeRect(6, 6, this.width - 12, this.height - 12);
	}

	/**
	 * Topo: Telemetria da estação e mensagem de emergência ativa
	 */
	private renderTopBanner(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(0, 255, 170, 0.08)';
		ctx.fillRect(12, 12, this.width - 24, 52);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
		ctx.strokeRect(12, 12, this.width - 24, 52);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 16px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText(`TARTARUS-V // PROF: ${state.depth}m // PRESSÃO: ${state.pressureAtm} ATM`, 24, 34);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText(`ALERTA: "${state.message}"`, 24, 54);

		// Status do Casco
		const risk = Math.round(state.acousticProximity);
		ctx.textAlign = 'right';
		ctx.fillStyle = risk > 75 ? '#ff3344' : risk > 45 ? '#ffaa00' : '#00ffaa';
		ctx.fillText(`RISCO ACÚSTICO: ${risk}%`, this.width - 24, 34);

		ctx.fillStyle = '#00ffaa';
		ctx.font = '12px "Courier New", monospace';
		ctx.fillText(`COTA SEGURA: ${state.safeBitQuota} BITS`, this.width - 24, 54);
	}

	/**
	 * Painel Esquerdo: Métricas de Huffman
	 */
	private renderTelemetryPanel(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const px = 12;
		const py = 72;
		const pw = 250;
		const ph = 210;

		ctx.fillStyle = 'rgba(0, 20, 15, 0.6)';
		ctx.fillRect(px, py, pw, ph);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
		ctx.strokeRect(px, py, pw, ph);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('MÉTRICAS HUFFMAN [GULOSO]', px + 12, py + 22);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.8)';
		ctx.font = '12px "Courier New", monospace';
		ctx.fillText(`ASCII 8-bit: ${state.metrics.rawAsciiBits} bits`, px + 12, py + 52);

		ctx.fillStyle = '#00ffff';
		ctx.fillText(`Custo Ótimo: ${state.metrics.optimalBits} bits`, px + 12, py + 78);

		ctx.fillStyle = state.isTreeComplete
			? state.metrics.playerBits <= state.safeBitQuota
				? '#00ffaa'
				: '#ffaa00'
			: '#888888';
		ctx.fillText(
			`Sua Árvore:  ${state.isTreeComplete ? `${state.metrics.playerBits} bits` : 'INCOMPLETA'}`,
			px + 12,
			py + 104
		);

		// Barra de Eficiência
		ctx.fillStyle = '#ffffff';
		ctx.fillText(`Eficiência:  ${state.isTreeComplete ? `${state.metrics.efficiency}%` : '--'}`, px + 12, py + 138);

		ctx.fillStyle = '#051810';
		ctx.fillRect(px + 12, py + 148, pw - 24, 12);
		ctx.strokeStyle = '#00ffaa';
		ctx.strokeRect(px + 12, py + 148, pw - 24, 12);

		if (state.isTreeComplete) {
			ctx.fillStyle = state.metrics.efficiency >= 95 ? '#00ffaa' : state.metrics.efficiency >= 80 ? '#ffaa00' : '#ff3344';
			ctx.fillRect(px + 13, py + 149, ((pw - 26) * state.metrics.efficiency) / 100, 10);
		}

		ctx.fillStyle = state.isTreeComplete ? '#00ffaa' : '#ffaa00';
		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.fillText(
			state.isTreeComplete ? '● ÁRVORE PRONTA P/ TRANSMITIR' : `● FUSÃO PENDENTE: ${state.availableNodes.length} NÓS`,
			px + 12,
			py + 185
		);
	}

	/**
	 * Painel Direito: Radar Sonar de Ecolocalização
	 */
	private renderSonarRadar(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const rw = 210;
		const rh = 210;
		const rx = this.width - rw - 12;
		const ry = 72;

		ctx.fillStyle = 'rgba(0, 20, 15, 0.6)';
		ctx.fillRect(rx, ry, rw, rh);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
		ctx.strokeRect(rx, ry, rw, rh);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('RADAR SONAR ABISSAL', rx + rw / 2, ry + 22);

		const cx = rx + rw / 2;
		const cy = ry + 110;
		const radius = 64;

		// Círculo e anéis concêntricos
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
		ctx.lineWidth = 1;
		[0.33, 0.66, 1.0].forEach((frac) => {
			ctx.beginPath();
			ctx.arc(cx, cy, radius * frac, 0, Math.PI * 2);
			ctx.stroke();
		});

		// Eixos cruzados
		ctx.beginPath();
		ctx.moveTo(cx - radius, cy);
		ctx.lineTo(cx + radius, cy);
		ctx.moveTo(cx, cy - radius);
		ctx.lineTo(cx, cy + radius);
		ctx.stroke();

		// Varredura giratória
		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.clip();
		const gradient = ctx.createConicGradient(this.radarAngle, cx, cy);
		gradient.addColorStop(0, 'rgba(0, 255, 170, 0.45)');
		gradient.addColorStop(0.2, 'rgba(0, 255, 170, 0.0)');
		gradient.addColorStop(1, 'rgba(0, 255, 170, 0.0)');
		ctx.fillStyle = gradient;
		ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
		ctx.restore();

		// Submarino no centro
		ctx.fillStyle = '#00ffaa';
		ctx.beginPath();
		ctx.arc(cx, cy, 3, 0, Math.PI * 2);
		ctx.fill();

		// Entidade Abissal (Aproxima-se conforme acousticProximity sobe)
		const distFrac = 1 - state.acousticProximity / 100;
		const entityAngle = Math.PI * 0.25;
		const ex = cx + Math.cos(entityAngle) * radius * distFrac;
		const ey = cy - Math.sin(entityAngle) * radius * distFrac;

		ctx.fillStyle = '#ff2233';
		ctx.beginPath();
		ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
		ctx.fill();

		const distMeters = Math.max(0, Math.round(1500 * distFrac));
		ctx.font = '11px "Courier New", monospace';
		ctx.fillStyle = distMeters < 300 ? '#ff3344' : '#ffffff';
		ctx.fillText(`DISTÂNCIA: ~${distMeters}m`, cx, ry + 195);
	}

	/**
	 * Área Central: Árvore de Huffman interativa
	 */
	private renderHuffmanTreeArea(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const tx = 272;
		const ty = 72;
		const tw = this.width - 272 - 232;
		const th = 460;

		ctx.fillStyle = 'rgba(0, 25, 18, 0.4)';
		ctx.fillRect(tx, ty, tw, th);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
		ctx.strokeRect(tx, ty, tw, th);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.4)';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('ÁREA DE CONSTRUÇÃO DA ÁRVORE (SELECIONE 2 NÓS P/ FUNDIR)', tx + 12, ty + 20);

		// Layout dos nós na área central
		this.layoutNodes(state.allActiveNodes, tx + tw / 2, ty + th - 60, tw - 40, th - 80);

		// 1. Desenha as linhas a laser entre pais e filhos
		for (const parent of state.allActiveNodes) {
			if (!parent.isLeaf && parent.left && parent.right) {
				const px = parent.x ?? 0;
				const py = parent.y ?? 0;
				const lx = parent.left.x ?? 0;
				const ly = parent.left.y ?? 0;
				const rx = parent.right.x ?? 0;
				const ry = parent.right.y ?? 0;

				// Ramo Esquerdo ('0' - Ciano)
				ctx.strokeStyle = '#00ffff';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(px, py);
				ctx.lineTo(lx, ly);
				ctx.stroke();

				// Tag '0'
				ctx.fillStyle = '#00ffff';
				ctx.font = 'bold 12px "Courier New", monospace';
				ctx.fillText('0', (px + lx) / 2 - 8, (py + ly) / 2);

				// Ramo Direito ('1' - Verde-Neon)
				ctx.strokeStyle = '#00ffaa';
				ctx.beginPath();
				ctx.moveTo(px, py);
				ctx.lineTo(rx, ry);
				ctx.stroke();

				// Tag '1'
				ctx.fillStyle = '#00ffaa';
				ctx.fillText('1', (px + rx) / 2 + 8, (py + ry) / 2);
			}
		}

		// 2. Desenha os nós
		for (const node of state.allActiveNodes) {
			const nx = node.x ?? 0;
			const ny = node.y ?? 0;
			const isSelected = state.selectedNodeIds.includes(node.id);
			const isAvailable = state.availableNodes.some((n) => n.id === node.id);

			const nw = 48;
			const nh = 38;

			// Caixa do nó
			ctx.fillStyle = isSelected ? '#ffea00' : isAvailable ? '#003322' : '#001a12';
			ctx.fillRect(nx - nw / 2, ny - nh / 2, nw, nh);

			ctx.strokeStyle = isSelected ? '#ffffff' : isAvailable ? '#00ffaa' : '#006644';
			ctx.lineWidth = isSelected ? 2.5 : 1.5;
			ctx.strokeRect(nx - nw / 2, ny - nh / 2, nw, nh);

			// Texto do nó
			ctx.textAlign = 'center';
			ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
			ctx.font = 'bold 13px "Courier New", monospace';
			const label = node.isLeaf ? (node.char === ' ' ? '␣' : node.char) : 'Σ';
			ctx.fillText(label ?? '', nx, ny - 3);

			ctx.font = '10px "Courier New", monospace';
			ctx.fillStyle = isSelected ? '#111111' : '#00ffaa';
			ctx.fillText(`${node.weight}`, nx, ny + 12);

			// Registra como interativo se estiver disponível
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
	 * Calcula coordenadas (X, Y) 2D na tela para o grafo de nós
	 */
	private layoutNodes(
		allNodes: HuffmanNode[],
		centerX: number,
		bottomY: number,
		areaWidth: number,
		areaHeight: number
	): void {
		const leaves = allNodes.filter((n) => n.isLeaf);
		const totalLeaves = leaves.length;
		const stepX = totalLeaves > 1 ? areaWidth / (totalLeaves - 1) : 0;
		const startX = centerX - areaWidth / 2;

		leaves.forEach((leaf, idx) => {
			leaf.x = totalLeaves === 1 ? centerX : startX + idx * stepX;
			leaf.y = bottomY;
		});

		const internalNodes = allNodes.filter((n) => !n.isLeaf);
		for (const node of internalNodes) {
			if (node.left && node.right) {
				const lx = node.left.x ?? centerX;
				const rx = node.right.x ?? centerX;
				const ly = node.left.y ?? bottomY;
				const ry = node.right.y ?? bottomY;

				node.x = (lx + rx) / 2;
				node.y = Math.max(90, Math.min(ly, ry) - 65);
			}
		}
	}

	/**
	 * Painel Inferior: Bandeja de nós e botões de comando
	 */
	private renderBottomControls(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		const by = 540;
		const bh = 216;

		ctx.fillStyle = 'rgba(0, 16, 12, 0.85)';
		ctx.fillRect(12, by, this.width - 24, bh);
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
		ctx.strokeRect(12, by, this.width - 24, bh);

		// 1. Linha de Botões de Ação
		this.renderButton(
			ctx,
			24,
			by + 12,
			170,
			38,
			'FUSÃO [ESPAÇO]',
			state.selectedNodeIds.length === 2,
			'#00ffaa',
			() => this.onAction?.({ type: 'MERGE' })
		);

		this.renderButton(
			ctx,
			204,
			by + 12,
			140,
			38,
			'DESFAZER [Z]',
			state.allActiveNodes.length > state.availableNodes.length,
			'#00ffff',
			() => this.onAction?.({ type: 'UNDO' })
		);

		this.renderButton(
			ctx,
			354,
			by + 12,
			140,
			38,
			'REINICIAR [R]',
			state.allActiveNodes.length > state.availableNodes.length,
			'#ffaa00',
			() => this.onAction?.({ type: 'RESET' })
		);

		this.renderButton(
			ctx,
			504,
			by + 12,
			this.width - 504 - 24,
			38,
			state.isTreeComplete ? '▶ DISPARAR TRANSMISSÃO SOS [ENTER]' : 'ÁRVORE INCOMPLETA P/ TRANSMISSÃO',
			state.isTreeComplete,
			'#00ffaa',
			() => this.onAction?.({ type: 'TRANSMIT' }),
			true
		);

		// 2. Bandeja de Nós Disponíveis (Cards clicáveis)
		ctx.fillStyle = 'rgba(0, 255, 170, 0.7)';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText(
			`BANDEJA DE NÓS DISPONÍVEIS (${state.selectedNodeIds.length}/2 SELECIONADOS - CLIQUE PARA SELECIONAR):`,
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
			if (cx + cardW > this.width - 24) return; // Evita ultrapassar margem

			const isSelected = state.selectedNodeIds.includes(node.id);

			ctx.fillStyle = isSelected ? '#ffea00' : '#01261a';
			ctx.fillRect(cx, cardY, cardW, cardH);
			ctx.strokeStyle = isSelected ? '#ffffff' : '#00ffaa';
			ctx.lineWidth = isSelected ? 2.5 : 1.2;
			ctx.strokeRect(cx, cardY, cardW, cardH);

			ctx.textAlign = 'center';
			ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
			ctx.font = 'bold 22px "Courier New", monospace';
			const label = node.isLeaf ? (node.char === ' ' ? '␣' : node.char) : 'Σ';
			ctx.fillText(label ?? '', cx + cardW / 2, cardY + 34);

			ctx.font = '11px "Courier New", monospace';
			ctx.fillStyle = isSelected ? '#111111' : '#00ffaa';
			ctx.fillText(`PESO: ${node.weight}`, cx + cardW / 2, cardY + 54);

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

		// Dica de Atalho na base
		ctx.fillStyle = 'rgba(0, 255, 170, 0.5)';
		ctx.font = '11px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('ATALHOS: Espaço = Fundir | Z = Desfazer | R = Reiniciar | Enter = Transmitir | F = Focar Monitor', 24, by + 195);
	}

	/**
	 * Botão clicável estilizado no Canvas
	 */
	private renderButton(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		text: string,
		enabled: boolean,
		accentColor: string,
		action: () => void,
		pulse: boolean = false
	): void {
		ctx.fillStyle = enabled
			? pulse
				? 'rgba(0, 255, 170, 0.25)'
				: 'rgba(0, 40, 28, 0.8)'
			: 'rgba(20, 20, 20, 0.6)';
		ctx.fillRect(x, y, w, h);

		ctx.strokeStyle = enabled ? accentColor : '#444444';
		ctx.lineWidth = enabled ? 2 : 1;
		ctx.strokeRect(x, y, w, h);

		ctx.textAlign = 'center';
		ctx.fillStyle = enabled ? (pulse ? '#ffffff' : accentColor) : '#666666';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText(text, x + w / 2, y + h / 2 + 4);

		if (enabled) {
			this.interactiveRects.push({ x, y, w, h, action });
		}
	}

	/**
	 * Tela durante a Transmissão de Bits
	 */
	private renderTransmissionScreen(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(150, 0, 0, 0.15)';
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = '#ff2233';
		ctx.font = 'bold 26px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('TRANSMISSÃO SONAR ATIVA // ALERTA MÁXIMO', this.width / 2, 120);

		ctx.font = '16px "Courier New", monospace';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(
			`DISPARANDO PULSOS: ${state.currentBitIndex} DE ${state.fullBitStream.length} BITS`,
			this.width / 2,
			160
		);

		// Fluxo binário rolando
		ctx.fillStyle = '#001a12';
		ctx.fillRect(80, 200, this.width - 160, 260);
		ctx.strokeStyle = '#00ffaa';
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
				ctx.fillStyle = '#ffea00';
			} else {
				ctx.fillStyle = '#335544';
			}
			ctx.fillText(bit, cursorX, cursorY);
			cursorX += 16;
			if (cursorX > this.width - 110) {
				cursorX = 96;
				cursorY += 28;
			}
		}

		// Barra de Risco Acústico
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(`NÍVEL DE RUÍDO ACÚSTICO: ${Math.round(state.acousticProximity)}%`, this.width / 2, 520);

		ctx.fillStyle = '#000000';
		ctx.fillRect(160, 540, this.width - 320, 24);
		ctx.strokeStyle = '#ff3344';
		ctx.strokeRect(160, 540, this.width - 320, 24);

		ctx.fillStyle = '#ff2233';
		ctx.fillRect(161, 541, ((this.width - 322) * state.acousticProximity) / 100, 22);
	}

	/**
	 * Tela de Game Over
	 */
	private renderGameOverScreen(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(80, 0, 0, 0.6)';
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = '#ff2233';
		ctx.font = 'black 34px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('COLAPSO CATASTRÓFICO DO CASCO', this.width / 2, 220);

		ctx.fillStyle = '#ffffff';
		ctx.font = '16px "Courier New", monospace';
		ctx.fillText('PRESSÃO EXTERNA EXCEDEU A RESISTÊNCIA DO AÇO.', this.width / 2, 270);
		ctx.fillText('A ENTIDADE LOCALIZOU O SONAR E ROMPEU A ESCOTILHA.', this.width / 2, 300);

		ctx.fillStyle = '#ffaaaa';
		ctx.fillText(`Bits transmitidos: ${state.currentBitIndex} | Cota segura: ${state.safeBitQuota}`, this.width / 2, 350);

		this.renderButton(
			ctx,
			this.width / 2 - 180,
			420,
			360,
			54,
			'[ REINICIAR TERMINAL ]',
			true,
			'#ff3344',
			() => this.onAction?.({ type: 'RETRY' }),
			true
		);
	}

	/**
	 * Tela de Vitória
	 */
	private renderVictoryScreen(ctx: CanvasRenderingContext2D, state: TerminalScreenState): void {
		ctx.fillStyle = 'rgba(0, 40, 25, 0.7)';
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'black 32px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('SINAL SOS TRANSMITIDO COM SUCESSO!', this.width / 2, 160);

		ctx.fillStyle = '#ffffff';
		ctx.font = '16px "Courier New", monospace';
		ctx.fillText('O PEDIDO DE SOCORRO ALCANÇOU A SUPERFÍCIE.', this.width / 2, 210);

		ctx.fillStyle = '#00ffff';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.fillText(`EFICIÊNCIA GULOSA ALCANÇADA: ${state.metrics.efficiency}%`, this.width / 2, 260);

		ctx.fillStyle = '#ffffff';
		ctx.font = '14px "Courier New", monospace';
		ctx.fillText(`Bits Originais: ${state.metrics.rawAsciiBits}  ➔  Bits Comprimidos: ${state.metrics.playerBits}`, this.width / 2, 300);
		ctx.fillText(`Economia de Ruído Acústico: ${state.metrics.compressionRatio}%`, this.width / 2, 330);

		this.renderButton(
			ctx,
			this.width / 2 - 180,
			420,
			360,
			54,
			'[ DESCER PARA PRÓXIMA FASE ]',
			true,
			'#00ffaa',
			() => this.onAction?.({ type: 'NEXT_LEVEL' }),
			true
		);
	}
}
