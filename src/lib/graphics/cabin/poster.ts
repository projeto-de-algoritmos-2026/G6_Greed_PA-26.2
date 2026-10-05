import * as THREE from 'three';
import { createDarkRibTexture } from '../textures/procedural';

export class DystopianPoster {
	public readonly group: THREE.Group;

	constructor() {
		this.group = new THREE.Group();
		this.group.position.set(-4.30, 1.05, -2.37);

		const pW = 0.96;
		const pH = 1.256;

		const darkRibMat = new THREE.MeshLambertMaterial({
			color: 0x547998,
			map: createDarkRibTexture()
		});

		const backPlate = new THREE.Mesh(new THREE.BoxGeometry(pW + 0.08, pH + 0.08, 0.02), darkRibMat);
		this.group.add(backPlate);

		const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.025, 8);
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x7ea3be });
		for (const bx of [-pW / 2 - 0.02, pW / 2 + 0.02]) {
			for (const by of [-pH / 2 - 0.02, 0, pH / 2 + 0.02]) {
				const bolt = new THREE.Mesh(boltGeo, boltMat);
				bolt.rotation.x = Math.PI / 2;
				bolt.position.set(bx, by, 0.015);
				this.group.add(bolt);
			}
		}

		const posterCanvas = this.createMilitaryAcousticPosterCanvas();
		const posterTexture = new THREE.CanvasTexture(posterCanvas);
		posterTexture.colorSpace = THREE.SRGBColorSpace;
		posterTexture.generateMipmaps = true;
		posterTexture.minFilter = THREE.LinearMipmapLinearFilter;
		posterTexture.magFilter = THREE.LinearFilter;

		const posterSheet = new THREE.Mesh(
			new THREE.PlaneGeometry(pW, pH),
			new THREE.MeshBasicMaterial({ map: posterTexture, fog: false })
		);
		posterSheet.position.set(0, 0, 0.012);
		this.group.add(posterSheet);

		const clipGeo = new THREE.BoxGeometry(0.055, 0.022, 0.016);
		const clipMat = new THREE.MeshLambertMaterial({ color: 0x658ca8 });
		for (const cx of [-pW / 2 + 0.035, pW / 2 - 0.035]) {
			for (const cy of [-pH / 2 + 0.025, pH / 2 - 0.025]) {
				const clip = new THREE.Mesh(clipGeo, clipMat);
				clip.position.set(cx, cy, 0.02);
				this.group.add(clip);
			}
		}

		this.group.userData = { isPoster: true };
	}

	private createMilitaryAcousticPosterCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		const W = 1500;
		const H = 1962;
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d')!;

		const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1100);
		bgGrad.addColorStop(0, '#f2ebd9');
		bgGrad.addColorStop(0.65, '#e4d8c1');
		bgGrad.addColorStop(1, '#caba9d');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, W, H);

		const imgData = ctx.getImageData(0, 0, W, H);
		const px = imgData.data;
		for (let i = 0; i < px.length; i += 8) {
			const n = (Math.random() - 0.5) * 14;
			px[i] = Math.max(0, Math.min(255, px[i] + n));
			px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n * 0.9));
			px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n * 0.7));
		}
		ctx.putImageData(imgData, 0, 0);

		ctx.fillStyle = 'rgba(120, 95, 60, 0.04)';
		for (let s = 0; s < 12; s++) {
			ctx.beginPath();
			const sx = Math.random() < 0.5 ? Math.random() * 200 : W - Math.random() * 200;
			const sy = Math.random() * H;
			ctx.arc(sx, sy, 40 + Math.random() * 80, 0, Math.PI * 2);
			ctx.fill();
		}

		const drawCrease = (x1: number, y1: number, x2: number, y2: number) => {
			ctx.save();

			ctx.strokeStyle = 'rgba(50, 40, 30, 0.14)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();

			ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x1 + 1.5, y1 + 1.5);
			ctx.lineTo(x2 + 1.5, y2 + 1.5);
			ctx.stroke();
			ctx.restore();
		};

		drawCrease(W / 2, 20, W / 2, H - 20);

		drawCrease(20, H * 0.35, W - 20, H * 0.35);
		drawCrease(20, H * 0.68, W - 20, H * 0.68);

		ctx.strokeStyle = '#1b2328';
		ctx.lineWidth = 14;
		ctx.strokeRect(18, 18, W - 36, H - 36);

		ctx.strokeStyle = '#3d4d57';
		ctx.lineWidth = 2;
		ctx.strokeRect(26, 26, W - 52, H - 52);

		const drawHazardStripes = (y: number, h: number) => {
			ctx.save();
			ctx.beginPath();
			ctx.rect(30, y, W - 60, h);
			ctx.clip();
			ctx.fillStyle = '#181b1e';
			ctx.fillRect(30, y, W - 60, h);
			ctx.fillStyle = '#e5a912';
			for (let x = -80; x < W + 100; x += 44) {
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + 22, y);
				ctx.lineTo(x - 4, y + h);
				ctx.lineTo(x - 26, y + h);
				ctx.closePath();
				ctx.fill();
			}
			ctx.restore();
		};
		drawHazardStripes(32, 26);
		drawHazardStripes(H - 58, 26);

		const headX = 46;
		const headY = 66;
		const headW = W - 92;
		const headH = 148;

		ctx.fillStyle = '#141d24';
		ctx.fillRect(headX, headY, headW, headH);
		ctx.strokeStyle = '#2d3e4a';
		ctx.lineWidth = 2;
		ctx.strokeRect(headX, headY, headW, headH);

		const cx = headX + 75;
		const cy = headY + 74;
		ctx.save();

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.45)';
		ctx.lineWidth = 2;
		for (const r of [22, 38, 54]) {
			ctx.beginPath();
			ctx.arc(cx, cy, r, -Math.PI * 0.42, Math.PI * 0.42);
			ctx.stroke();
		}

		ctx.strokeStyle = '#e5a912';
		ctx.fillStyle = '#e5a912';
		ctx.lineWidth = 3.5;
		ctx.beginPath();
		ctx.arc(cx, cy - 22, 12, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx, cy - 10);
		ctx.lineTo(cx, cy + 34);
		ctx.moveTo(cx - 24, cy + 2);
		ctx.lineTo(cx + 24, cy + 2);
		ctx.moveTo(cx - 28, cy + 20);
		ctx.quadraticCurveTo(cx, cy + 46, cx + 28, cy + 20);
		ctx.stroke();
		ctx.restore();

		ctx.textAlign = 'left';
		ctx.fillStyle = '#8da4b3';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('HADAL DYNAMICS // DIVISÃO DE GUERRA HIDROACÚSTICA // SETOR TARTARUS', headX + 155, headY + 38);

		ctx.fillStyle = '#ffffff';
		ctx.font = '900 29px "Impact", "Arial Black", sans-serif';
		ctx.fillText('DIRETRIZ DE SOBREVIVÊNCIA HIPERBÁRICA Nº 409-MIL', headX + 155, headY + 76);

		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 14.5px "Courier New", monospace';
		ctx.fillText('ISÓBATAS: 8.000M - 11.500M // PRESSÃO DO CASCO: 1.150 ATM // FOSSA DAS MARIANAS', headX + 155, headY + 106);

		ctx.fillStyle = '#5c7585';
		ctx.font = '12.5px "Courier New", monospace';
		ctx.fillText('REF. CRUZADA: MANUAL DE ANTEPARA SOP-82-HUF // EMISSÃO BENTÔNICA SILENCIOSA', headX + 155, headY + 128);

		ctx.save();
		ctx.translate(headX + headW - 130, headY + 74);
		ctx.rotate(-0.07);
		ctx.fillStyle = 'rgba(38, 12, 12, 0.9)';
		ctx.fillRect(-105, -50, 210, 100);
		ctx.strokeStyle = '#d62828';
		ctx.lineWidth = 3;
		ctx.strokeRect(-105, -50, 210, 100);
		ctx.strokeStyle = 'rgba(214, 40, 40, 0.4)';
		ctx.lineWidth = 1;
		ctx.strokeRect(-100, -45, 200, 90);

		ctx.textAlign = 'center';
		ctx.fillStyle = '#ff4d4d';
		ctx.font = '900 17px "Arial Black", monospace';
		ctx.fillText('CONFIDENCIAL', 0, -22);
		ctx.font = 'bold 12.5px "Courier New", monospace';
		ctx.fillText('GRAU ÔMEGA', 0, -2);
		ctx.fillText('AUTORIDADE NAVAL', 0, 16);
		ctx.fillStyle = '#ff8888';
		ctx.font = 'bold 10px "Courier New", monospace';
		ctx.fillText('TARTARUS-V // 1982', 0, 34);
		ctx.restore();

		const doutY = 224;
		const doutH = 112;
		ctx.fillStyle = '#10171d';
		ctx.fillRect(headX, doutY, headW, doutH);
		ctx.strokeStyle = '#e5a912';
		ctx.lineWidth = 3;
		ctx.strokeRect(headX, doutY, headW, doutH);

		ctx.textAlign = 'center';
		ctx.fillStyle = '#e5a912';
		ctx.font = '900 38px "Impact", "Arial Black", sans-serif';
		ctx.fillText('DISCIPLINA ACÚSTICA SUBMARINA', W / 2, doutY + 44);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 17.5px "Courier New", monospace';
		ctx.fillText('PULSOS NÃO COMPACTADOS SÃO FATAIS // O SILÊNCIO É SUA ARMADURA', W / 2, doutY + 75);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.fillText('EM ÁGUA HIPERBÁRICA, CADA BIT BRUTO PROPAGA-SE COMO ONDA DE CHOQUE POR QUILÔMETROS', W / 2, doutY + 98);

		const mod1Y = 348;
		const mod1H = 372;
		ctx.fillStyle = '#0b1116';
		ctx.fillRect(headX, mod1Y, headW, mod1H);
		ctx.strokeStyle = '#263742';
		ctx.lineWidth = 2;
		ctx.strokeRect(headX, mod1Y, headW, mod1H);

		ctx.fillStyle = '#16222b';
		ctx.fillRect(headX, mod1Y, headW, 30);
		ctx.textAlign = 'left';
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.fillText('MÓDULO I // ANÁLISE ESPECTRAL COMPARATIVA (VELOCIDADE DE ONDA: 1.580 m/s EM ÁGUA PROFUNDA)', headX + 16, mod1Y + 21);

		const pW = (headW - 36) / 2;
		const pH = mod1H - 46;

		const p1X = headX + 12;
		const pY = mod1Y + 36;
		ctx.fillStyle = '#060a0d';
		ctx.fillRect(p1X, pY, pW, pH);
		ctx.strokeStyle = '#521919';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(p1X, pY, pW, pH);

		ctx.fillStyle = 'rgba(70, 16, 16, 0.85)';
		ctx.fillRect(p1X, pY, pW, 28);
		ctx.fillStyle = '#ff5555';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('EMISSÃO BRUTA NÃO COMPACTADA [ASCII 8-BIT]', p1X + 14, pY + 19);

		ctx.strokeStyle = 'rgba(255, 60, 60, 0.12)';
		ctx.lineWidth = 1;
		for (let gx = p1X + 20; gx < p1X + pW; gx += 40) {
			ctx.beginPath();
			ctx.moveTo(gx, pY + 30);
			ctx.lineTo(gx, pY + pH - 100);
			ctx.stroke();
		}
		for (let gy = pY + 40; gy < pY + pH - 100; gy += 30) {
			ctx.beginPath();
			ctx.moveTo(p1X + 10, gy);
			ctx.lineTo(p1X + pW - 10, gy);
			ctx.stroke();
		}

		ctx.strokeStyle = '#ff3333';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		const midY1 = pY + (pH - 100) / 2 + 15;
		ctx.moveTo(p1X + 15, midY1);
		for (let x = p1X + 15; x < p1X + pW - 15; x += 5) {
			const nx = (x - p1X) / pW;
			const noise = Math.sin(nx * 48) * 28 + Math.cos(nx * 110) * 18 + (Math.sin(nx * 6) > 0 ? 35 : -35);
			ctx.lineTo(x, midY1 + noise * (0.6 + Math.sin(nx * Math.PI) * 0.4));
		}
		ctx.stroke();

		ctx.fillStyle = '#1c0a0a';
		ctx.fillRect(p1X + 12, pY + pH - 94, pW - 24, 84);
		ctx.strokeStyle = '#732222';
		ctx.lineWidth = 1.2;
		ctx.strokeRect(p1X + 12, pY + pH - 94, pW - 24, 84);

		ctx.fillStyle = '#ff7777';
		ctx.font = 'bold 12.5px "Courier New", monospace';
		ctx.fillText('• PICO ACÚSTICO DETECTADO: +48.6 dB (CRÍTICO)', p1X + 24, pY + pH - 71);
		ctx.fillText('• ASSINATURA: ONDAS CONTÍNUAS DE ALTA FREQUÊNCIA', p1X + 24, pY + pH - 50);
		ctx.fillText('• EFEITO: ECOLOCALIZAÇÃO ESTIMULADA EM RAIO > 5.000 METROS', p1X + 24, pY + pH - 29);

		const p2X = headX + 24 + pW;
		ctx.fillStyle = '#060a0d';
		ctx.fillRect(p2X, pY, pW, pH);
		ctx.strokeStyle = '#184a2b';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(p2X, pY, pW, pH);

		ctx.fillStyle = 'rgba(16, 60, 36, 0.85)';
		ctx.fillRect(p2X, pY, pW, 28);
		ctx.fillStyle = '#00ffaa';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('TRANSMISSÃO COMPACTADA [ÁRVORE ÓTIMA HUFFMAN]', p2X + 14, pY + 19);

		ctx.strokeStyle = 'rgba(0, 255, 170, 0.12)';
		for (let gx = p2X + 20; gx < p2X + pW; gx += 40) {
			ctx.beginPath();
			ctx.moveTo(gx, pY + 30);
			ctx.lineTo(gx, pY + pH - 100);
			ctx.stroke();
		}
		for (let gy = pY + 40; gy < pY + pH - 100; gy += 30) {
			ctx.beginPath();
			ctx.moveTo(p2X + 10, gy);
			ctx.lineTo(p2X + pW - 10, gy);
			ctx.stroke();
		}

		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		const midY2 = pY + (pH - 100) / 2 + 15;
		ctx.moveTo(p2X + 15, midY2);
		for (let x = p2X + 15; x < p2X + pW - 15; x += 4) {
			const nx = (x - p2X) / pW;
			const envelope = Math.exp(-Math.pow((nx - 0.5) / 0.07, 2));
			const wave = Math.sin((nx - 0.5) * 90) * 48 * envelope;
			ctx.lineTo(x, midY2 + wave);
		}
		ctx.stroke();

		ctx.fillStyle = '#091c13';
		ctx.fillRect(p2X + 12, pY + pH - 94, pW - 24, 84);
		ctx.strokeStyle = '#1e6640';
		ctx.lineWidth = 1.2;
		ctx.strokeRect(p2X + 12, pY + pH - 94, pW - 24, 84);

		ctx.fillStyle = '#8ce8b8';
		ctx.font = 'bold 12.5px "Courier New", monospace';
		ctx.fillText('• PICO ACÚSTICO CONTROLADO: +8.4 dB (SEGURO)', p2X + 24, pY + pH - 71);
		ctx.fillText('• COMPRESSÃO BINÁRIA EFETIVA: > 68% DE REDUÇÃO', p2X + 24, pY + pH - 50);
		ctx.fillText('• EFEITO: SINAL DISSIPADO NO RUÍDO DE FUNDO (< 800 METROS)', p2X + 24, pY + pH - 29);

		const mod2Y = 732;
		const mod2H = 580;
		ctx.fillStyle = '#0a1015';
		ctx.fillRect(headX, mod2Y, headW, mod2H);
		ctx.strokeStyle = '#273844';
		ctx.lineWidth = 2;
		ctx.strokeRect(headX, mod2Y, headW, mod2H);

		ctx.fillStyle = '#16222b';
		ctx.fillRect(headX, mod2Y, headW, 30);
		ctx.textAlign = 'left';
		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.fillText('MÓDULO II // DIAGRAMA TÁTICO DE PROPAGAÇÃO NO ABISSO (ISÓBATAS -8.000M A -11.500M)', headX + 16, mod2Y + 21);

		const mapX = headX + 14;
		const mapY = mod2Y + 40;
		const mapW = headW - 28;
		const mapH = mod2H - 52;

		ctx.fillStyle = '#060a0e';
		ctx.fillRect(mapX, mapY, mapW, mapH);
		ctx.strokeStyle = '#1b2a33';
		ctx.strokeRect(mapX, mapY, mapW, mapH);

		ctx.strokeStyle = 'rgba(0, 180, 216, 0.10)';
		ctx.lineWidth = 1;
		for (let y = mapY + 40; y < mapY + mapH; y += 45) {
			ctx.beginPath();
			ctx.moveTo(mapX, y);
			ctx.lineTo(mapX + mapW, y);
			ctx.stroke();
		}
		for (let x = mapX + 60; x < mapX + mapW; x += 80) {
			ctx.beginPath();
			ctx.moveTo(x, mapY);
			ctx.lineTo(x, mapY + mapH);
			ctx.stroke();
		}

		ctx.fillStyle = '#5c788a';
		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.fillText('-8.000m  [ISÓBATA SUPERIOR]', mapX + 12, mapY + 45);
		ctx.fillText('-9.000m  [CAMADA TERMOCLINA]', mapX + 12, mapY + 135);
		ctx.fillText('-10.000m [COTA DO SUBMARINO]', mapX + 12, mapY + 245);
		ctx.fillText('-11.000m [LEITO HADAL]', mapX + 12, mapY + 380);
		ctx.fillText('-11.500m [FOSSA MÁXIMA]', mapX + 12, mapY + 500);

		ctx.fillStyle = '#0f1820';
		ctx.beginPath();
		ctx.moveTo(mapX, mapY + 30);
		ctx.lineTo(mapX + 220, mapY + 200);
		ctx.lineTo(mapX + 340, mapY + 420);
		ctx.lineTo(mapX + 380, mapY + mapH);
		ctx.lineTo(mapX, mapY + mapH);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = '#283c4a';
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.fillStyle = '#0f1820';
		ctx.beginPath();
		ctx.moveTo(mapX + mapW, mapY + 30);
		ctx.lineTo(mapX + mapW - 220, mapY + 200);
		ctx.lineTo(mapX + mapW - 320, mapY + 420);
		ctx.lineTo(mapX + mapW - 360, mapY + mapH);
		ctx.lineTo(mapX + mapW, mapY + mapH);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = '#283c4a';
		ctx.lineWidth = 2;
		ctx.stroke();

		const subX = mapX + mapW * 0.44;
		const subY = mapY + 245;

		ctx.strokeStyle = 'rgba(255, 50, 50, 0.45)';
		ctx.lineWidth = 2.5;
		ctx.setLineDash([8, 6]);
		ctx.beginPath();
		ctx.arc(subX, subY, 230, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(255, 50, 50, 0.25)';
		ctx.beginPath();
		ctx.arc(subX, subY, 320, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = '#ff5555';
		ctx.font = 'bold 12.5px "Courier New", monospace';
		ctx.fillText('⚠ RAIO DE ALERTA DE PREDADORES (> 5.000 METROS)', subX - 190, subY - 240);
		ctx.fillText('   PULSO ASCII NÃO COMPACTADO REVERBERA NAS PAREDES DA FOSSA', subX - 190, subY - 222);

		ctx.fillStyle = 'rgba(0, 255, 170, 0.12)';
		ctx.beginPath();
		ctx.arc(subX, subY, 52, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(subX, subY, 52, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('● ZONA SEGURA HUFFMAN (< 800M)', subX + 62, subY - 12);
		ctx.fillStyle = '#9eecc6';
		ctx.font = '11px "Courier New", monospace';
		ctx.fillText('DISSIPADO ANTES DA DETECÇÃO', subX + 62, subY + 4);

		ctx.fillStyle = '#c5d3dc';
		ctx.beginPath();
		ctx.ellipse(subX, subY, 32, 12, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillRect(subX - 6, subY - 18, 12, 8);

		ctx.strokeStyle = '#e5a912';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(subX, subY + 12);
		ctx.lineTo(subX, subY + 28);
		ctx.stroke();

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('SUBWAVE-06', subX, subY + 44);
		ctx.textAlign = 'left';

		const eyeX = mapX + mapW * 0.76;
		const eyeY = mapY + 440;

		ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(eyeX, eyeY, 48, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(eyeX, eyeY, 18, 0, Math.PI * 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(eyeX - 58, eyeY);
		ctx.lineTo(eyeX + 58, eyeY);
		ctx.moveTo(eyeX, eyeY - 58);
		ctx.lineTo(eyeX, eyeY + 58);
		ctx.stroke();

		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('BIOMASSA HOSTIL [CLASSE TARTARUS]', eyeX - 110, eyeY + 70);
		ctx.fillStyle = '#ffaaaa';
		ctx.font = '10.5px "Courier New", monospace';
		ctx.fillText('AUDIÇÃO HIDROACÚSTICA ULTRA-SENSÍVEL', eyeX - 110, eyeY + 86);
		ctx.fillText('RESPOSTA: AVANÇO VERTICAL EM 35 SEGUNDOS', eyeX - 110, eyeY + 100);

		const tabX = mapX + mapW - 360;
		const tabY = mapY + 16;
		ctx.fillStyle = 'rgba(12, 20, 26, 0.92)';
		ctx.fillRect(tabX, tabY, 345, 130);
		ctx.strokeStyle = '#324a59';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(tabX, tabY, 345, 130);

		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('MATRIZ DE EMISSÃO VS SOBREVIVÊNCIA', tabX + 12, tabY + 22);

		ctx.fillStyle = '#b0c5d4';
		ctx.font = '11px "Courier New", monospace';
		ctx.fillText('MODO          ENERGIA  RAIO     RISCO', tabX + 12, tabY + 44);
		ctx.fillStyle = '#ff6666';
		ctx.fillText('ASCII BRUTO   100%     5.2 km   FATAL (100%)', tabX + 12, tabY + 64);
		ctx.fillStyle = '#e5a912';
		ctx.fillText('FUSÃO SUB-ÓT  ~65%     2.8 km   ALTO (65%)', tabX + 12, tabY + 84);
		ctx.fillStyle = '#00ffaa';
		ctx.fillText('HUFFMAN ÓTIMO <32%     0.8 km   NULO (<1%)', tabX + 12, tabY + 104);

		const mod3Y = 1324;
		const mod3H = 380;
		ctx.fillStyle = '#0d1419';
		ctx.fillRect(headX, mod3Y, headW, mod3H);
		ctx.strokeStyle = '#273844';
		ctx.lineWidth = 2;
		ctx.strokeRect(headX, mod3Y, headW, mod3H);

		ctx.fillStyle = '#16222b';
		ctx.fillRect(headX, mod3Y, headW, 30);
		ctx.textAlign = 'left';
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.fillText('MÓDULO III // AS 3 REGRAS DE OURO DA DISCIPLINA ACÚSTICA (CÓDIGO DE COMBATE)', headX + 16, mod3Y + 21);

		const cardW = (headW - 40) / 3;
		const cardH = mod3H - 46;

		const c1X = headX + 10;
		const cY = mod3Y + 36;
		ctx.fillStyle = '#070b0e';
		ctx.fillRect(c1X, cY, cardW, cardH);
		ctx.strokeStyle = '#32424c';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(c1X, cY, cardW, cardH);

		ctx.fillStyle = '#e5a912';
		ctx.fillRect(c1X, cY, cardW, 26);
		ctx.fillStyle = '#000000';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('REGRA 01 // COMPRIMA SEMPRE', c1X + 12, cY + 18);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('NUNCA DISPARE EM ASCII', c1X + 12, cY + 54);

		ctx.fillStyle = '#a6bac7';
		ctx.font = '12px "Courier New", monospace';
		const r1Lines = [
			'O trem de pulsos padrão (8 bits',
			'por caractere) satura o leito',
			'oceânico.',
			'',
			'Cada bit desnecessário gera',
			'+3.2 dB de pico sonoro.',
			'',
			'Sob cerco hidroacústico, o',
			'envio sem árvore de prefixos',
			'equivale a suicídio tático.'
		];
		r1Lines.forEach((l, idx) => ctx.fillText(l, c1X + 12, cY + 84 + idx * 18));

		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('PENALIDADE: ATAQUE IMEDIATO', c1X + 12, cY + cardH - 20);

		const c2X = c1X + cardW + 10;
		ctx.fillStyle = '#070b0e';
		ctx.fillRect(c2X, cY, cardW, cardH);
		ctx.strokeStyle = '#32424c';
		ctx.strokeRect(c2X, cY, cardW, cardH);

		ctx.fillStyle = '#e5a912';
		ctx.fillRect(c2X, cY, cardW, 26);
		ctx.fillStyle = '#000000';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('REGRA 02 // ESCOLHA GULOSA', c2X + 12, cY + 18);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('OS DOIS MENORES PESOS', c2X + 12, cY + 54);

		ctx.fillStyle = '#a6bac7';
		ctx.font = '12px "Courier New", monospace';
		const r2Lines = [
			'A cada fusão na bancada, selecione',
			'IMPRETERIVELMENTE os 2 nós com as',
			'menores frequências acumuladas.',
			'',
			'Aperte [ESPAÇO] para gerar o nó',
			'pai (soma dos pesos).',
			'',
			'Fusões fora de ordem inflacionam',
			'o comprimento do código e geram',
			'ruído estático mortal.'
		];
		r2Lines.forEach((l, idx) => ctx.fillText(l, c2X + 12, cY + 84 + idx * 18));

		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('DIRETRIZ: W_pai = W1 + W2', c2X + 12, cY + cardH - 20);

		const c3X = c2X + cardW + 10;
		ctx.fillStyle = '#070b0e';
		ctx.fillRect(c3X, cY, cardW, cardH);
		ctx.strokeStyle = '#32424c';
		ctx.strokeRect(c3X, cY, cardW, cardH);

		ctx.fillStyle = '#00ffaa';
		ctx.fillRect(c3X, cY, cardW, 26);
		ctx.fillStyle = '#000000';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('REGRA 03 // PROCEDIMENTO SOP', c3X + 12, cY + 18);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('MANUAL DE ANTEPARA [H]', c3X + 12, cY + 54);

		ctx.fillStyle = '#a6bac7';
		ctx.font = '12px "Courier New", monospace';
		const r3Lines = [
			'Em caso de hesitação ou pane do',
			'operador, acesse o compartimento',
			'de emergência à esquerda.',
			'',
			'A prancheta técnica SOP-82-HUF',
			'exibe o esquema vetorial passo a',
			'passo e a tabela de códigos.',
			'',
			'Comandos: [Z] Desfazer fusão,',
			'[R] Reset total, [ENTER] Disparo.'
		];
		r3Lines.forEach((l, idx) => ctx.fillText(l, c3X + 12, cY + 84 + idx * 18));

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('ACESSO RÁPIDO: TECLA [H]', c3X + 12, cY + cardH - 20);

		const footY = 1720;
		const footH = 175;
		ctx.fillStyle = '#121a20';
		ctx.fillRect(headX, footY, headW, footH);
		ctx.strokeStyle = '#273844';
		ctx.lineWidth = 2;
		ctx.strokeRect(headX, footY, headW, footH);

		ctx.fillStyle = '#8da3af';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.fillText('ESTAÇÃO BENTÔNICA TARTARUS-V // ANTEPARA N-04 // DIVISÃO DE GUERRA HIDROACÚSTICA', headX + 20, footY + 36);
		ctx.fillText('REGULAMENTO NAVAL MILITAR // ART. 409-MIL // HOMOLOGAÇÃO HIPERBÁRICA 1982', headX + 20, footY + 60);

		ctx.fillStyle = '#5c7380';
		ctx.font = '11px "Courier New", monospace';
		ctx.fillText('AVISO: A adulteração desta diretriz acarreta corte sumário de oxigênio de emergência.', headX + 20, footY + 86);
		ctx.fillText('VERIFICAÇÃO ACÚSTICA: TRANSDUTOR SUBWAVE CALIBRADO PARA BITS DE 440 Hz.', headX + 20, footY + 104);

		const barX = headX + 20;
		const barY = footY + 118;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(barX, barY, 260, 42);
		ctx.fillStyle = '#000000';
		let curX = barX + 8;
		while (curX < barX + 250) {
			const bW = Math.random() < 0.4 ? 4 : 2;
			ctx.fillRect(curX, barY + 4, bW, 26);
			curX += bW + (Math.random() < 0.5 ? 2 : 4);
		}
		ctx.font = 'bold 9px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('*HD-82-TARTARUS-409-MIL*', barX + 130, barY + 38);
		ctx.textAlign = 'left';

		ctx.save();
		const stampX = headX + headW - 320;
		const stampY = footY + 88;
		ctx.translate(stampX, stampY);
		ctx.rotate(0.06);
		ctx.strokeStyle = '#2d8f68';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(0, 0, 48, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = 'rgba(45, 143, 104, 0.4)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(0, 0, 42, 0, Math.PI * 2);
		ctx.stroke();
		ctx.fillStyle = '#3eb587';
		ctx.font = 'bold 9px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('VISTORIA NAVAL', 0, -18);
		ctx.font = '900 14px "Arial Black", monospace';
		ctx.fillText('APROVADO', 0, 4);
		ctx.font = 'bold 9px "Courier New", monospace';
		ctx.fillText('TARTARUS 1982', 0, 22);
		ctx.restore();

		ctx.textAlign = 'right';
		ctx.fillStyle = '#00ffaa';
		ctx.font = '900 15px "Courier New", monospace';
		ctx.fillText('[ ESC OU TECLA P PARA VOLTAR ]', headX + headW - 24, footY + footH - 24);

		return canvas;
	}
}

