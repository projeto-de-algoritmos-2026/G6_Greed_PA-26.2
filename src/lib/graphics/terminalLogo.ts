
export type PhosphorTheme = 'green' | 'amber' | 'cyan' | 'white';

export class TerminalLogoManager {
	private static instance: TerminalLogoManager | null = null;
	private rawImage: HTMLImageElement | null = null;
	private isLoaded: boolean = false;
	private tintedCaches: Map<string, HTMLCanvasElement> = new Map();
	private loadListeners: Array<() => void> = [];

	private constructor() {
		if (typeof window !== 'undefined') {
			this.loadImage();
		}
	}

	public static getInstance(): TerminalLogoManager {
		if (!TerminalLogoManager.instance) {
			TerminalLogoManager.instance = new TerminalLogoManager();
		}
		return TerminalLogoManager.instance;
	}

	private loadImage(): void {
		const img = new Image();
		img.src = '/terminal.png';
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			this.rawImage = img;
			this.isLoaded = true;
			this.buildCaches();
			for (const cb of this.loadListeners) {
				cb();
			}
			this.loadListeners = [];
		};

		img.onerror = (err) => {
			console.warn('[TerminalLogo] Falha ao carregar /terminal.png, usando fallback procedural', err);
		};
	}

	public onLoad(cb: () => void): void {
		if (this.isLoaded) {
			cb();
		} else {
			this.loadListeners.push(cb);
		}
	}

	public get ready(): boolean {
		return this.isLoaded;
	}

	private buildCaches(): void {
		if (!this.rawImage) return;

		const themes: Record<PhosphorTheme, { primary: string; glow: string }> = {
			green: { primary: '#00ffaa', glow: '#003322' },
			amber: { primary: '#ff9e24', glow: '#331a00' },
			cyan: { primary: '#00e5ff', glow: '#002833' },
			white: { primary: '#e6fff5', glow: '#112218' }
		};

		for (const [theme, colors] of Object.entries(themes) as Array<[PhosphorTheme, { primary: string; glow: string }]>) {
			const canvas = document.createElement('canvas');
			canvas.width = this.rawImage.width;
			canvas.height = this.rawImage.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) continue;

			ctx.drawImage(this.rawImage, 0, 0);

			ctx.globalCompositeOperation = 'source-in';
			ctx.fillStyle = colors.primary;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = 0.35;
			ctx.drawImage(this.rawImage, 0, 0);
			ctx.globalAlpha = 1.0;

			this.tintedCaches.set(theme, canvas);
		}
	}

	public getTintedCanvas(theme: PhosphorTheme): HTMLCanvasElement | null {
		return this.tintedCaches.get(theme) || null;
	}

	public draw(
		ctx: CanvasRenderingContext2D,
		centerX: number,
		centerY: number,
		size: number,
		options: {
			theme?: PhosphorTheme;
			alpha?: number;
			revealProgress?: number; 
			glowIntensity?: number; 
			glitchOffset?: number; 
			drawRings?: boolean;
		} = {}
	): void {
		const {
			theme = 'green',
			alpha = 1.0,
			revealProgress = 1.0,
			glowIntensity = 0.5,
			glitchOffset = 0,
			drawRings = true
		} = options;

		if (alpha <= 0) return;

		const half = size / 2;
		const x = centerX - half;
		const y = centerY - half;

		ctx.save();
		ctx.globalAlpha = alpha;

		const phosphorColor =
			theme === 'green' ? '#00ffaa' : theme === 'amber' ? '#ff9e24' : '#00e5ff';
		const glowColor =
			theme === 'green' ? 'rgba(0, 255, 170, ' : theme === 'amber' ? 'rgba(255, 158, 36, ' : 'rgba(0, 229, 255, ';

		if (drawRings) {
			const ringRadius = half * 1.18;
			ctx.save();
			ctx.strokeStyle = `${glowColor}${0.18 * alpha})`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
			ctx.stroke();

			ctx.strokeStyle = `${glowColor}${0.35 * alpha})`;
			ctx.lineWidth = 1.5;
			const bracketLen = Math.PI * 0.18;
			for (let a = 0; a < 4; a++) {
				const startAngle = a * (Math.PI / 2) + Math.PI * 0.15;
				ctx.beginPath();
				ctx.arc(centerX, centerY, ringRadius + 6, startAngle, startAngle + bracketLen);
				ctx.stroke();
			}

			const tickLen = 8;
			const r = ringRadius + 14;
			ctx.beginPath();
			ctx.moveTo(centerX - r, centerY);
			ctx.lineTo(centerX - r + tickLen, centerY);
			ctx.moveTo(centerX + r, centerY);
			ctx.lineTo(centerX + r - tickLen, centerY);
			ctx.moveTo(centerX, centerY - r);
			ctx.lineTo(centerX, centerY - r + tickLen);
			ctx.moveTo(centerX, centerY + r);
			ctx.lineTo(centerX, centerY + r - tickLen);
			ctx.stroke();
			ctx.restore();
		}

		if (glowIntensity > 0) {
			const grad = ctx.createRadialGradient(
				centerX,
				centerY,
				half * 0.2,
				centerX,
				centerY,
				half * 1.15
			);
			grad.addColorStop(0, `${glowColor}${0.28 * glowIntensity * alpha})`);
			grad.addColorStop(0.5, `${glowColor}${0.12 * glowIntensity * alpha})`);
			grad.addColorStop(1, `${glowColor}0)`);
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(centerX, centerY, half * 1.15, 0, Math.PI * 2);
			ctx.fill();
		}

		const tinted = this.getTintedCanvas(theme);
		const source = tinted || this.rawImage;

		if (source) {
			ctx.save();

			if (revealProgress < 1.0) {
				ctx.beginPath();
				ctx.rect(x - 20, y - 20, size + 40, (size + 40) * Math.max(0, Math.min(1, revealProgress)));
				ctx.clip();
			}

			if (Math.abs(glitchOffset) > 0.1) {
				const sliceY = y + size * 0.45;
				const sliceH = size * 0.2;
				ctx.drawImage(source, 0, 0, source.width, source.height * 0.45, x, y, size, size * 0.45);
				ctx.drawImage(
					source,
					0,
					source.height * 0.45,
					source.width,
					source.height * 0.2,
					x + glitchOffset,
					sliceY,
					size,
					sliceH
				);
				ctx.drawImage(
					source,
					0,
					source.height * 0.65,
					source.width,
					source.height * 0.35,
					x,
					y + size * 0.65,
					size,
					size * 0.35
				);
			} else {
				ctx.drawImage(source, x, y, size, size);
			}

			ctx.restore();

			if (revealProgress > 0 && revealProgress < 1.0) {
				const beamY = y + size * revealProgress;
				ctx.save();
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 2;
				ctx.shadowColor = phosphorColor;
				ctx.shadowBlur = 10;
				ctx.beginPath();
				ctx.moveTo(x - 15, beamY);
				ctx.lineTo(x + size + 15, beamY);
				ctx.stroke();

				const beamGrad = ctx.createLinearGradient(0, beamY - 14, 0, beamY);
				beamGrad.addColorStop(0, `${glowColor}0)`);
				beamGrad.addColorStop(1, `${glowColor}${0.45 * alpha})`);
				ctx.fillStyle = beamGrad;
				ctx.fillRect(x - 15, beamY - 14, size + 30, 14);
				ctx.restore();
			}
		} else {
			this.drawFallbackLogo(ctx, centerX, centerY, size, phosphorColor);
		}

		ctx.restore();
	}

	private drawFallbackLogo(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
		color: string
	): void {
		const r = size * 0.38;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;

		ctx.beginPath();
		for (let a = 0; a < Math.PI * 4; a += 0.1) {
			const radius = (r * 0.2) + (r * 0.8) * (a / (Math.PI * 4));
			const px = cx + Math.cos(a) * radius;
			const py = cy + Math.sin(a) * radius;
			if (a === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();
		ctx.restore();
	}

	public drawRoundRectPath(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	): void {
		if (typeof ctx.roundRect === 'function') {
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, r);
		} else {
			ctx.beginPath();
			ctx.moveTo(x + r, y);
			ctx.arcTo(x + w, y, x + w, y + h, r);
			ctx.arcTo(x + w, y + h, x, y + h, r);
			ctx.arcTo(x, y + h, x, y, r);
			ctx.arcTo(x, y, x + w, y, r);
			ctx.closePath();
		}
	}

	public drawXPBootScreen(
		ctx: CanvasRenderingContext2D,
		config: {
			width: number;
			height: number;
			bootTime: number;
			bootDuration: number;
			theme: PhosphorTheme;
			titleMain: string;
			titleXP: string;
			subtitle: string;
			companyName?: string;
			copyrightText?: string;
			accentColor?: string;
		}
	): void {
		const {
			width,
			height,
			bootTime,
			bootDuration,
			theme,
			titleMain,
			titleXP,
			subtitle,
			companyName = 'T A R T A R U S   S U B M E R S I B L E   S Y S T E M S',
			copyrightText = 'Cephalo-Systems Corporation // All rights reserved.',
			accentColor
		} = config;

		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, width, height);

		const fadeIn = 0.45;
		const fadeOut = 0.45;
		let alpha = 1.0;
		if (bootTime < fadeIn) {
			alpha = Math.max(0, bootTime / fadeIn);
		} else if (bootTime > bootDuration - fadeOut) {
			alpha = Math.max(0, (bootDuration - bootTime) / fadeOut);
		}

		if (alpha <= 0) return;

		ctx.save();
		ctx.globalAlpha = alpha;

		ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
		ctx.font = '12px "Lucida Console", "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(companyName, width / 2, 175);

		const logoSize = 175;
		const logoCX = width / 2;
		const logoCY = 295;
		this.draw(ctx, logoCX, logoCY, logoSize, {
			theme,
			alpha: 1.0,
			revealProgress: 1.0,
			glowIntensity: 0.55,
			drawRings: false
		});

		const textY = 422;
		ctx.save();

		ctx.font = 'bold 44px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
		const mainW = ctx.measureText(titleMain).width;

		ctx.font = 'bold italic 40px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
		const xpW = ctx.measureText(titleXP).width;

		const gap = 8;
		const totalBrandW = mainW + gap + xpW;
		const brandStartX = (width - totalBrandW) / 2;

		ctx.font = 'bold 44px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
		ctx.shadowBlur = 8;
		ctx.textAlign = 'left';
		ctx.fillText(titleMain, brandStartX, textY);

		const xpCol = accentColor || (theme === 'green' ? '#00e5ff' : '#ff7a00');
		ctx.font = 'bold italic 40px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
		ctx.fillStyle = xpCol;
		ctx.shadowColor = xpCol;
		ctx.shadowBlur = 10;
		ctx.fillText(titleXP, brandStartX + mainW + gap, textY - 3);

		ctx.shadowBlur = 0;
		ctx.font = 'italic bold 15px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
		ctx.fillStyle = theme === 'green' ? '#00ffaa' : '#ff9e24';
		ctx.textAlign = 'right';
		ctx.fillText(subtitle, brandStartX + totalBrandW, textY + 22);
		ctx.restore();

		const trackW = 250;
		const trackH = 18;
		const trackX = (width - trackW) / 2;
		const trackY = 480;
		const r = 3;

		ctx.fillStyle = '#060708';
		this.drawRoundRectPath(ctx, trackX, trackY, trackW, trackH, r);
		ctx.fill();

		ctx.strokeStyle =
			theme === 'green' ? 'rgba(0, 255, 170, 0.4)' : 'rgba(255, 158, 36, 0.4)';
		ctx.lineWidth = 1.3;
		this.drawRoundRectPath(ctx, trackX, trackY, trackW, trackH, r);
		ctx.stroke();

		ctx.strokeStyle = '#020304';
		ctx.lineWidth = 1.0;
		this.drawRoundRectPath(ctx, trackX + 1, trackY + 1, trackW - 2, trackH - 2, r - 1);
		ctx.stroke();

		ctx.save();
		this.drawRoundRectPath(ctx, trackX + 2, trackY + 2, trackW - 4, trackH - 4, r - 1);
		ctx.clip();

		const numBlocks = 3;
		const blockW = 13;
		const blockH = trackH - 4;
		const blockGap = 3;
		const totalGroupW = numBlocks * blockW + (numBlocks - 1) * blockGap;

		const traverseDuration = 1.15;
		const cycle = (bootTime / traverseDuration) % 1.0;
		const startGroupX = trackX - totalGroupW - 12;
		const endGroupX = trackX + trackW + 12;
		const currentGroupX = startGroupX + cycle * (endGroupX - startGroupX);

		for (let b = 0; b < numBlocks; b++) {
			const bx = currentGroupX + b * (blockW + blockGap);
			const by = trackY + 2;

			const grad = ctx.createLinearGradient(0, by, 0, by + blockH);
			if (theme === 'green') {
				grad.addColorStop(0, '#c2ffea');
				grad.addColorStop(0.3, '#00ffaa');
				grad.addColorStop(0.7, '#00cc88');
				grad.addColorStop(1, '#006644');
			} else {
				grad.addColorStop(0, '#fff4cc');
				grad.addColorStop(0.3, '#ffaa33');
				grad.addColorStop(0.7, '#ff8800');
				grad.addColorStop(1, '#994400');
			}

			ctx.fillStyle = grad;
			this.drawRoundRectPath(ctx, bx, by, blockW, blockH, 2);
			ctx.fill();

			ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
			ctx.fillRect(bx + 1, by + 1, blockW - 2, 2);
		}

		ctx.restore(); 

		ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.font = '12px "Segoe UI", Arial, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(copyrightText, width / 2, 702);
		ctx.fillText('Tartarus Deep Sea Submersible Research Facility', width / 2, 720);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
		ctx.font = '11px "Trebuchet MS", sans-serif';
		ctx.fillText('[ Clique ou pressione qualquer tecla para iniciar ]', width / 2, 746);

		ctx.restore();
	}
}

export const terminalLogo = TerminalLogoManager.getInstance();
