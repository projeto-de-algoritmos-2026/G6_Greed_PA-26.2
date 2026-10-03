/**
 * SUBWAVE - Auxiliary Screen Canvas Renderer
 * Renderiza o segundo monitor CRT menor (Console B à direita do operador):
 * - Alta definição (1024x768) com tipografia ampliada de alto contraste e legibilidade.
 * - Seletor de Fases da Campanha com botões táteis grandes.
 * - Presets de Mensagem SOS de Emergência.
 * - Botões de Foco de Câmera e Liga/Desliga Som.
 * - Diagnóstico em tempo real de Ruído e Integridade do Casco.
 */

export interface AuxiliaryScreenState {
	depth: number;
	pressureAtm: number;
	currentLevelIndex: number;
	isFreeMode: boolean;
	activeMessage: string;
	isMuted: boolean;
	isZoomedIn: boolean;
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

		// Pré-cria padrão de scanlines (elimina centenas de chamadas fillRect por frame)
		const patCanvas = document.createElement('canvas');
		patCanvas.width = 4;
		patCanvas.height = 4;
		const pctx = patCanvas.getContext('2d')!;
		pctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
		pctx.fillRect(0, 0, 4, 2);
		this.scanlinePattern = this.ctx.createPattern(patCanvas, 'repeat');
	}

	public setActionCallback(cb: AuxActionCallback): void {
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
	 * Renderiza um quadro completo no monitor secundário.
	 */
	public render(state: AuxiliaryScreenState, delta: number): void {
		const ctx = this.ctx;
		this.interactiveRects = [];
		this.blinkTimer += delta * 3.5;

		// 1. Fundo do tubo CRT (Fósforo verde-azulado escuro de alto contraste)
		ctx.fillStyle = '#01130e';
		ctx.fillRect(0, 0, this.width, this.height);

		// Scanlines com padrão repetido ultra-rápido (1 draw call)
		if (this.scanlinePattern) {
			ctx.fillStyle = this.scanlinePattern;
			ctx.fillRect(0, 0, this.width, this.height);
		}

		// Grade milimétrica
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.05)';
		ctx.lineWidth = 1;
		for (let x = 0; x < this.width; x += 48) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, this.height);
			ctx.stroke();
		}

		// 2. Banner Superior
		this.renderHeader(ctx, state);

		// 3. Seletor de Fases da Campanha (Botões Grandes)
		this.renderLevelSelector(ctx, state);

		// 4. Mensagem SOS Ativa e Presets Rápidos
		this.renderMessageSection(ctx, state);

		// 5. Controles do Operador (Foco e Áudio)
		this.renderOperatorControls(ctx, state);

		// 6. Diagnóstico do Casco e Submarino
		this.renderDiagnostics(ctx, state);

		// Moldura luminosa do tubo CRT
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 5;
		ctx.strokeRect(6, 6, this.width - 12, this.height - 12);
	}

	/**
	 * Topo: Identificação e status da cabine com tipografia grande e legível
	 */
	private renderHeader(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		ctx.fillStyle = 'rgba(0, 45, 32, 0.95)';
		ctx.fillRect(16, 14, this.width - 32, 68);
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 3;
		ctx.strokeRect(16, 14, this.width - 32, 68);

		// LED de status pulsante
		const isBlinkOn = Math.sin(this.blinkTimer) > 0;
		ctx.fillStyle = isBlinkOn ? '#00ffaa' : '#004422';
		ctx.beginPath();
		ctx.arc(44, 48, 12, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 24px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('TARTARUS-V // CONSOLE AUXILIAR B', 68, 56);

		ctx.textAlign = 'right';
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 20px "Courier New", monospace';
		const modeStr = state.isFreeMode ? 'MODO LIVRE' : `FASE ${state.currentLevelIndex + 1}`;
		ctx.fillText(`[${modeStr}] | ${state.depth}m | ${state.pressureAtm} ATM`, this.width - 32, 56);
	}

	/**
	 * Seletor de Fases da Campanha (Botões Grandes e Destacados)
	 */
	private renderLevelSelector(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const sx = 16;
		const sy = 94;
		const sw = this.width - 32;

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► SELEÇÃO DE MISSÃO / PROTOCOLO SOS:', sx + 8, sy + 18);

		const btnH = 54;
		const btnY = sy + 28;
		const gap = 12;
		const totalButtons = state.levels.length + 1;
		const btnW = (sw - gap * (totalButtons - 1)) / totalButtons;

		state.levels.forEach((lvl, idx) => {
			const bx = sx + idx * (btnW + gap);
			const isActive = !state.isFreeMode && state.currentLevelIndex === idx;

			this.renderButton(
				ctx,
				bx,
				btnY,
				btnW,
				btnH,
				`F${idx + 1}: ${lvl.name.split(' ')[0]}`,
				`${lvl.depth}m`,
				isActive,
				'#00ffaa',
				() => this.onAction?.({ type: 'SELECT_LEVEL', index: idx })
			);
		});

		// Botão Modo Livre
		const freeBx = sx + state.levels.length * (btnW + gap);
		const isFreeActive = state.isFreeMode;
		this.renderButton(
			ctx,
			freeBx,
			btnY,
			btnW,
			btnH,
			'LIVRE',
			'CUSTOM',
			isFreeActive,
			'#00ffff',
			() => this.onAction?.({ type: 'FREE_MODE' })
		);
	}

	/**
	 * Mensagem SOS Ativa e Presets Rápidos com texto legível
	 */
	private renderMessageSection(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const mx = 16;
		const my = 194;
		const mw = this.width - 32;

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► MENSAGEM SOS TRANSMITIDA NO CASCO:', mx + 8, my + 18);

		// Caixa com a mensagem atual em letras grandes
		ctx.fillStyle = 'rgba(0, 36, 24, 0.95)';
		ctx.fillRect(mx, my + 26, mw, 54);
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 2.5;
		ctx.strokeRect(mx, my + 26, mw, 54);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 22px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(`"${state.activeMessage}"`, mx + mw / 2, my + 60);

		// Botões de Presets de Mensagem Rápida
		ctx.fillStyle = 'rgba(0, 255, 170, 0.95)';
		ctx.font = 'bold 18px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('PRESETS RÁPIDOS DE EMERGÊNCIA (CLIQUE P/ CARREGAR):', mx + 8, my + 104);

		const presets = [
			'SOS SOS CASCO EM RISCO',
			'CASCO RACHANDO. SOM NA PORTA. SOCORRO.',
			'PRESSAO CRITICA 8000 ATM. TRANSMITIR AGORA!',
			'FALHA NO REATOR. AGUA SUBINDO. RESGATE.'
		];

		const pBtnW = (mw - 14) / 2;
		const pBtnH = 46;

		presets.forEach((preset, i) => {
			const px = mx + (i % 2) * (pBtnW + 14);
			const py = my + 114 + Math.floor(i / 2) * (pBtnH + 10);
			const isCurrent = state.activeMessage === preset;

			this.renderButton(
				ctx,
				px,
				py,
				pBtnW,
				pBtnH,
				preset,
				'',
				isCurrent,
				'#00ffaa',
				() => this.onAction?.({ type: 'SET_MESSAGE', message: preset })
			);
		});
	}

	/**
	 * Controles do Operador: Foco de Câmera e Áudio
	 */
	private renderOperatorControls(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const cx = 16;
		const cy = 432;
		const cw = this.width - 32;

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► COMANDOS DA ESTAÇÃO:', cx + 8, cy + 18);

		const btnW = (cw - 16) / 2;
		const btnH = 64;

		// 1. Botão Focar Monitor Principal / Ver Cabine
		const focusLabel = state.isZoomedIn ? '👁️ VISÃO PANORÂMICA [TECLA F]' : '🖥️ FOCAR TERMINAL PRINCIPAL [TECLA F]';
		this.renderButton(
			ctx,
			cx,
			cy + 28,
			btnW,
			btnH,
			focusLabel,
			'',
			state.isZoomedIn,
			'#00ffff',
			() => this.onAction?.({ type: 'TOGGLE_FOCUS' })
		);

		// 2. Botão de Áudio Procedural
		const audioLabel = state.isMuted ? '🔇 ÁUDIO: MUDO [TECLA M]' : '🔊 ÁUDIO: ATIVO [TECLA M]';
		this.renderButton(
			ctx,
			cx + btnW + 16,
			cy + 28,
			btnW,
			btnH,
			audioLabel,
			'',
			!state.isMuted,
			state.isMuted ? '#ff3344' : '#00ffaa',
			() => this.onAction?.({ type: 'TOGGLE_MUTE' })
		);
	}

	/**
	 * Diagnóstico de Casco e Sonar
	 */
	private renderDiagnostics(ctx: CanvasRenderingContext2D, state: AuxiliaryScreenState): void {
		const dx = 16;
		const dy = 548;
		const dw = this.width - 32;
		const dh = 196;

		ctx.fillStyle = 'rgba(0, 30, 22, 0.95)';
		ctx.fillRect(dx, dy, dw, dh);
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 3;
		ctx.strokeRect(dx, dy, dw, dh);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('► DIAGNÓSTICO DO CASCO A 8000m DE PROFUNDIDADE:', dx + 16, dy + 28);

		// Barra de Risco Acústico
		const risk = Math.round(state.acousticProximity);
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.fillStyle = risk > 75 ? '#ff3344' : risk > 40 ? '#ffaa00' : '#ffffff';
		ctx.fillText(`NÍVEL DE RUÍDO ACÚSTICO: ${risk}%`, dx + 16, dy + 60);

		ctx.fillStyle = '#001a12';
		ctx.fillRect(dx + 16, dy + 70, dw - 32, 26);
		ctx.strokeStyle = risk > 75 ? '#ff3344' : risk > 40 ? '#ffaa00' : '#00ffaa';
		ctx.lineWidth = 2.5;
		ctx.strokeRect(dx + 16, dy + 70, dw - 32, 26);

		ctx.fillStyle = risk > 75 ? '#ff3344' : risk > 40 ? '#ffaa00' : '#00ffaa';
		ctx.fillRect(dx + 18, dy + 72, ((dw - 36) * Math.min(100, risk)) / 100, 22);

		// Telemetria textual do submarino em letras grandes
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 18px "Courier New", monospace';
		const estDist = Math.max(0, Math.round(1500 * (1 - state.acousticProximity / 100)));
		ctx.fillText(`• DISTÂNCIA DA ENTIDADE: ~${estDist}m`, dx + 16, dy + 128);
		ctx.fillText(`• INTEGRIDADE DO CASCO: ${Math.max(0, 100 - Math.round(risk * 0.65))}%`, dx + 16, dy + 158);
		ctx.fillText(`• TRANSDUTOR SONAR: OPERACIONAL [MODULAÇÃO HUFFMAN]`, dx + 400, dy + 128);
		ctx.fillText(`• OPERAÇÃO: CLIQUE DIRETO NA TELA P/ ALTERAR`, dx + 400, dy + 158);
	}

	/**
	 * Botão clicável de alto contraste
	 */
	private renderButton(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		title: string,
		subtitle: string,
		active: boolean,
		accentColor: string,
		action: () => void
	): void {
		ctx.fillStyle = active
			? accentColor
			: 'rgba(0, 36, 26, 0.9)';
		ctx.fillRect(x, y, w, h);

		ctx.strokeStyle = active ? '#ffffff' : accentColor;
		ctx.lineWidth = active ? 3 : 2;
		ctx.strokeRect(x, y, w, h);

		ctx.textAlign = 'center';
		ctx.fillStyle = active ? '#000000' : '#ffffff';

		if (subtitle) {
			ctx.font = 'bold 18px "Courier New", monospace';
			ctx.fillText(title, x + w / 2, y + h / 2 - 4);
			ctx.font = 'bold 14px "Courier New", monospace';
			ctx.fillStyle = active ? '#111111' : accentColor;
			ctx.fillText(subtitle, x + w / 2, y + h / 2 + 16);
		} else {
			ctx.font = 'bold 18px "Courier New", monospace';
			ctx.fillText(title, x + w / 2, y + h / 2 + 6);
		}

		this.interactiveRects.push({ x, y, w, h, action });
	}
}
