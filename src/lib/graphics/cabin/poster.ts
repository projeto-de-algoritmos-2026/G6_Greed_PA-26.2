import * as THREE from 'three';
import { createDarkRibTexture } from '../textures/procedural';

function drawTintedImage(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	x: number,
	y: number,
	w: number,
	h: number,
	tintColor: string
): void {
	if (!img.complete || img.naturalWidth === 0) return;
	const offscreen = document.createElement('canvas');
	offscreen.width = img.naturalWidth;
	offscreen.height = img.naturalHeight;
	const octx = offscreen.getContext('2d');
	if (!octx) return;
	octx.drawImage(img, 0, 0);
	octx.globalCompositeOperation = 'source-in';
	octx.fillStyle = tintColor;
	octx.fillRect(0, 0, offscreen.width, offscreen.height);
	ctx.drawImage(offscreen, x, y, w, h);
}

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

		const W = 1500;
		const H = 1962;
		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d')!;

		const posterTexture = new THREE.CanvasTexture(canvas);
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

		// Carrega a logo do peixe do terminal.png e atualiza o pôster
		const logoImg = new Image();
		logoImg.src = '/terminal.png';

		const render = () => {
			this.renderPosterContent(ctx, W, H, logoImg);
			posterTexture.needsUpdate = true;
		};

		if (logoImg.complete && logoImg.naturalWidth > 0) {
			render();
		} else {
			render(); // render inicial imediato
			logoImg.onload = () => render();
		}
	}

	private renderPosterContent(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		logoImg: HTMLImageElement
	): void {
		// --- 1. FUNDO RETRÔ DE SEGURANÇA NAVAL ---
		const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
		bgGrad.addColorStop(0, '#0c1b26');
		bgGrad.addColorStop(0.35, '#122535');
		bgGrad.addColorStop(0.7, '#09151e');
		bgGrad.addColorStop(1, '#04090e');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, W, H);

		// Ruído e textura procedural de papel/chapa naval
		const imgData = ctx.getImageData(0, 0, W, H);
		const px = imgData.data;
		for (let i = 0; i < px.length; i += 8) {
			const n = (Math.random() - 0.5) * 12;
			px[i] = Math.max(0, Math.min(255, px[i] + n));
			px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n * 0.9));
			px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n * 1.1));
		}
		ctx.putImageData(imgData, 0, 0);

		// Moldura perimetral industrial dupla com rebites visuais
		ctx.strokeStyle = '#22384a';
		ctx.lineWidth = 14;
		ctx.strokeRect(14, 14, W - 28, H - 28);

		ctx.strokeStyle = '#b82424';
		ctx.lineWidth = 3.5;
		ctx.strokeRect(24, 24, W - 48, H - 48);

		// Faixas listradas amarelas e pretas no topo e na base
		const drawHazardStripes = (y: number, h: number) => {
			ctx.save();
			ctx.beginPath();
			ctx.rect(30, y, W - 60, h);
			ctx.clip();
			ctx.fillStyle = '#0f161c';
			ctx.fillRect(30, y, W - 60, h);
			ctx.fillStyle = '#e5a812';
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
		drawHazardStripes(30, 22);
		drawHazardStripes(H - 52, 22);

		const padX = 54;
		const mainW = W - padX * 2;

		// --- 2. CABEÇALHO MILITAR NAVAL (Y: 64 a 245) ---
		ctx.fillStyle = '#9e1a1a';
		ctx.fillRect(padX, 64, mainW, 38);
		ctx.textAlign = 'center';
		ctx.fillStyle = '#ffffff';
		ctx.font = '900 17px "Courier New", monospace';
		ctx.fillText('★ DEPARTAMENTO DE GUERRA SUBMARINA // BASE BENTÔNICA TARTARUS ★', W / 2, 89);

		ctx.fillStyle = '#ffffff';
		ctx.font = '900 68px "Impact", "Arial Black", sans-serif';
		ctx.fillText('PULSOS LIVRES AFUNDAM CASCOS!', W / 2, 168);

		ctx.fillStyle = '#f0b419';
		ctx.font = '900 23px "Courier New", monospace';
		ctx.fillText('O ABISSO NÃO PERDOA O ECO // O SILÊNCIO É NOSSA ÚNICA BLINDAGEM', W / 2, 222);

		// --- 3. JANELA ARTÍSTICA DA FOSSA E DO LEVIATÃ (Y: 255 a 1005) ---
		const artY = 255;
		const artH = 750;

		ctx.save();
		ctx.beginPath();
		ctx.rect(padX, artY, mainW, artH);
		ctx.clip();

		// Fundo da fossa com gradiente abissal profundo
		const oceanGrad = ctx.createLinearGradient(0, artY, 0, artY + artH);
		oceanGrad.addColorStop(0, '#0d2033');
		oceanGrad.addColorStop(0.35, '#071320');
		oceanGrad.addColorStop(0.7, '#03080e');
		oceanGrad.addColorStop(1, '#010306');
		ctx.fillStyle = oceanGrad;
		ctx.fillRect(padX, artY, mainW, artH);

		// Paredes rochosas da fossa basáltica à esquerda e à direita
		ctx.fillStyle = '#141e26';
		// Falésia esquerda
		ctx.beginPath();
		ctx.moveTo(padX, artY);
		ctx.lineTo(padX + 90, artY);
		ctx.lineTo(padX + 140, artY + 180);
		ctx.lineTo(padX + 80, artY + 360);
		ctx.lineTo(padX + 130, artY + 520);
		ctx.lineTo(padX + 160, artY + artH);
		ctx.lineTo(padX, artY + artH);
		ctx.closePath();
		ctx.fill();

		// Falésia direita
		ctx.beginPath();
		ctx.moveTo(padX + mainW, artY);
		ctx.lineTo(padX + mainW - 90, artY);
		ctx.lineTo(padX + mainW - 130, artY + 200);
		ctx.lineTo(padX + mainW - 70, artY + 420);
		ctx.lineTo(padX + mainW - 150, artY + 600);
		ctx.lineTo(padX + mainW - 140, artY + artH);
		ctx.lineTo(padX + mainW, artY + artH);
		ctx.closePath();
		ctx.fill();

		// Marcações de profundidade na falésia esquerda
		const depths = [
			{ frac: 0.12, label: '0m - SUPERFÍCIE (SOL)' },
			{ frac: 0.38, label: '-3.000m - ZONA BATIAL' },
			{ frac: 0.68, label: '-7.000m - ZONA ABISSAL' },
			{ frac: 0.92, label: '-10.920m - FOSSA TARTARUS' }
		];
		depths.forEach((d) => {
			const ly = artY + Math.floor(artH * d.frac);
			ctx.strokeStyle = '#325578';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(padX + 15, ly);
			ctx.lineTo(padX + 160, ly);
			ctx.stroke();

			ctx.fillStyle = '#8cb8dc';
			ctx.font = 'bold 14px "Courier New", monospace';
			ctx.textAlign = 'left';
			ctx.fillText(d.label, padX + 170, ly + 4);
		});

		// Posição central do submarino Tartarus-V
		const subCX = padX + Math.floor(mainW * 0.58);
		const subCY = artY + Math.floor(artH * 0.38);

		// Anéis de choque de sonar emitidos pela transmissão não comprimida
		ctx.lineWidth = 2;
		for (const r of [80, 160, 250, 350, 460]) {
			ctx.strokeStyle = 'rgba(220, 45, 45, 0.38)';
			ctx.beginPath();
			ctx.arc(subCX, subCY, r, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Cone de luz dos holofotes do submarino cortando a água
		const coneGrad = ctx.createLinearGradient(subCX + 75, subCY, subCX + 400, subCY);
		coneGrad.addColorStop(0, 'rgba(60, 180, 200, 0.35)');
		coneGrad.addColorStop(1, 'rgba(40, 120, 150, 0.0)');
		ctx.fillStyle = coneGrad;
		ctx.beginPath();
		ctx.moveTo(subCX + 75, subCY);
		ctx.lineTo(subCX + 380, subCY - 70);
		ctx.lineTo(subCX + 400, subCY + 150);
		ctx.closePath();
		ctx.fill();

		// Silhueta do Submarino Tartarus-V
		ctx.fillStyle = '#2b4458';
		ctx.strokeStyle = '#5f91b4';
		ctx.lineWidth = 3;
		// Casco principal
		ctx.beginPath();
		ctx.ellipse(subCX, subCY, 90, 28, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		// Torre de comando
		ctx.beginPath();
		ctx.roundRect(subCX - 25, subCY - 52, 45, 27, 4);
		ctx.fill();
		ctx.stroke();
		// Janela frontal iluminada
		ctx.fillStyle = '#78f0d2';
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(subCX + 65, subCY, 12, 12, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.textAlign = 'center';
		ctx.fillStyle = '#94c2e6';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('SUBMARINO TARTARUS-V', subCX, subCY + 45);

		// Silhueta colossal do Leviatã Abissal no leito da fossa
		const beastY = artY + Math.floor(artH * 0.76);
		const beastCX = subCX;

		ctx.fillStyle = '#0b1117';
		ctx.beginPath();
		ctx.moveTo(beastCX - 240, artY + artH);
		ctx.lineTo(beastCX - 200, beastY + 40);
		ctx.lineTo(beastCX - 160, beastY);
		ctx.lineTo(beastCX - 120, beastY + 30);
		ctx.lineTo(beastCX - 80, beastY - 15);
		ctx.lineTo(beastCX - 30, beastY + 25);
		ctx.lineTo(beastCX + 40, beastY - 10);
		ctx.lineTo(beastCX + 100, beastY + 35);
		ctx.lineTo(beastCX + 180, beastY + 50);
		ctx.lineTo(beastCX + 250, artY + artH);
		ctx.closePath();
		ctx.fill();

		// Olhos vermelhos bioluminescentes do predador
		ctx.fillStyle = '#ff2828';
		ctx.shadowColor = '#ff1111';
		ctx.shadowBlur = 18;
		ctx.beginPath();
		ctx.ellipse(beastCX - 90, beastY + 16, 12, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(beastCX - 25, beastY + 18, 12, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;

		ctx.fillStyle = '#ff4444';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('LEVIATÃ ACÚSTICO // CAÇADOR DE PULSOS', beastCX - 55, beastY - 28);
		ctx.fillStyle = '#f0a028';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('ATRAÍDO POR TRANSMISSÕES NÃO-COMPRIMIDAS (> 40 dB)', beastCX - 55, beastY + 55);

		// BRASÃO OFICIAL DOURADO COM O PEIXE DO TERMINAL.PNG
		const crestCX = padX + 220;
		const crestCY = artY + 150;
		const crestR = 110;

		ctx.fillStyle = 'rgba(12, 24, 36, 0.95)';
		ctx.beginPath();
		ctx.arc(crestCX, crestCY, crestR, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#d79b19';
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.arc(crestCX, crestCY, crestR, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(170, 120, 20, 0.7)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(crestCX, crestCY, crestR - 8, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = '#ebaf1e';
		ctx.font = '900 11.5px "Courier New", monospace';
		ctx.fillText('★ 1ª DIV. MERGULHO ★', crestCX, crestCY - crestR + 20);
		ctx.fillText('"IN SILENTIO VINCIMUS"', crestCX, crestCY + crestR - 18);

		// Desenho nítido e dourado da logo do peixe (terminal.png)
		drawTintedImage(ctx, logoImg, crestCX - 67, crestCY - 65, 134, 134, '#ebaf1e');

		// Barra de legenda no rodapé da janela do oceano
		ctx.fillStyle = 'rgba(16, 28, 38, 0.92)';
		ctx.fillRect(padX + 10, artY + artH - 38, mainW - 20, 32);
		ctx.fillStyle = '#b4d7f0';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('TELEMETRIA HIDROACÚSTICA // ONDAS SONORAS NÃO COMPRIMIDAS ECOAM POR 14 KM NA FOSSA', W / 2, artY + artH - 18);

		ctx.restore();

		// Borda da janela da fossa
		ctx.strokeStyle = '#23415f';
		ctx.lineWidth = 3;
		ctx.strokeRect(padX, artY, mainW, artH);

		// --- 4. RELATÓRIO HISTÓRICO NAVAL (Y: 1030 a 1480) ---
		const dispY = 1030;
		const dispH = 450;
		ctx.fillStyle = '#0c141c';
		ctx.fillRect(padX, dispY, mainW, dispH);
		ctx.strokeStyle = '#2d4b69';
		ctx.lineWidth = 3;
		ctx.strokeRect(padX, dispY, mainW, dispH);

		// Barra de título do relatório
		ctx.fillStyle = '#182838';
		ctx.fillRect(padX, dispY, mainW, 44);
		ctx.textAlign = 'left';
		ctx.fillStyle = '#f5d778';
		ctx.font = '900 20px "Courier New", monospace';
		ctx.fillText('RELATÓRIO HISTÓRICO // INCIDENTE DO SUBMARINO TARTARUS-III (ANO 1981)', padX + 24, dispY + 28);

		const lines: Array<[string, string]> = [
			['LOCAL:', 'Fossa das Marianas, Setor de Falha Abissal Tartarus (Cota -9.420m).'],
			['HORÁRIO:', '03:42h UTC. Telemetria e sensores passivos de escuta ativos.'],
			['OCORRÊNCIA:', 'A tripulação transmitiu relatório de rotina utilizando código ASCII padrão (8-bit).'],
			['IMPACTO:', 'Foram 18 caracteres enviados em 8 bits fixos = 144 pulsos acústicos mecânicos contínuos.'],
			['', 'O ruído sonoro ecoou pelas paredes basálticas da fossa por mais de 14 quilômetros.'],
			['RESPOSTA:', 'Às 03:45h, o sonar captou aproximação hidrodinâmica violenta a 68 nós de velocidade.'],
			['DESFECHO:', 'Contato rompido em 40 segundos. O casco implodiu após colisão biológica direta.'],
			['', 'NENHUM SOBREVIVENTE FOI RESGATADO.']
		];

		let curY = dispY + 74;
		lines.forEach(([label, text]) => {
			if (label) {
				ctx.fillStyle = '#eb4b4b';
				ctx.font = '900 16px "Courier New", monospace';
				ctx.fillText(label, padX + 30, curY);

				ctx.fillStyle = text.includes('NENHUM') ? '#ff4d4d' : '#e1ebf5';
				ctx.font = text.includes('NENHUM') ? '900 16px "Courier New", monospace' : 'bold 15px "Courier New", monospace';
				ctx.fillText(text, padX + 175, curY);
			} else {
				ctx.fillStyle = text.includes('NENHUM') ? '#ff3333' : '#e1ebf5';
				ctx.font = text.includes('NENHUM') ? '900 16px "Courier New", monospace' : 'bold 15px "Courier New", monospace';
				ctx.fillText(text, padX + 30, curY);
			}
			curY += 36;
		});

		// Carimbo de borracha vermelho: CLASSIFICAÇÃO ÔMEGA
		ctx.save();
		const sCX = padX + mainW - 250;
		const sCY = dispY + dispH - 95;
		ctx.translate(sCX, sCY);
		ctx.rotate(0.18);

		ctx.strokeStyle = 'rgba(210, 35, 35, 0.88)';
		ctx.lineWidth = 4.5;
		ctx.strokeRect(-215, -45, 430, 90);

		ctx.textAlign = 'center';
		ctx.fillStyle = 'rgba(220, 40, 40, 0.92)';
		ctx.font = '900 24px "Impact", "Arial Black", sans-serif';
		ctx.fillText('CLASSIFICAÇÃO ÔMEGA', 0, -6);
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('DIRETRIZ DE SEGURANÇA NACIONAL // 1981', 0, 24);
		ctx.restore();

		// --- 5. ORDEM GERAL DE OPERAÇÕES MANDATÓRIA (Y: 1500 a 1700) ---
		const dirY = 1500;
		const dirH = 195;
		ctx.fillStyle = '#101a14';
		ctx.fillRect(padX, dirY, mainW, dirH);
		ctx.strokeStyle = '#28a05a';
		ctx.lineWidth = 3;
		ctx.strokeRect(padX, dirY, mainW, dirH);

		ctx.fillStyle = '#16693a';
		ctx.fillRect(padX, dirY, mainW, 40);
		ctx.textAlign = 'center';
		ctx.fillStyle = '#ffffff';
		ctx.font = '900 18px "Courier New", monospace';
		ctx.fillText('ORDEM GERAL DE OPERAÇÕES // DIRETRIZ HUFFMAN MANDATÓRIA', W / 2, dirY + 26);

		ctx.fillStyle = '#6ef0a0';
		ctx.font = '900 18px "Courier New", monospace';
		ctx.fillText('NENHUMA MENSAGEM DEVE SER DISPARADA SEM COMPRESSÃO GULOSA!', W / 2, dirY + 75);

		ctx.fillStyle = '#dcfae6';
		ctx.font = 'bold 16px "Courier New", monospace';
		ctx.fillText('Caracteres frequentes recebem códigos mínimos. Reduza em até 80% o ruído acústico.', W / 2, dirY + 112);

		ctx.fillStyle = '#fad264';
		ctx.font = '900 18px "Courier New", monospace';
		ctx.fillText('A matemática de Huffman é a espessura do seu casco.', W / 2, dirY + 152);

		// --- 6. RODAPÉ INSTITUCIONAL (Y: 1715 a 1870) ---
		const footY = 1715;
		const footH = 155;
		ctx.fillStyle = '#060c12';
		ctx.fillRect(padX, footY, mainW, footH);
		ctx.strokeStyle = '#1e3246';
		ctx.lineWidth = 2;
		ctx.strokeRect(padX, footY, mainW, footH);

		// Logo em miniatura ciano brilhante no rodapé
		drawTintedImage(ctx, logoImg, padX + 24, footY + 28, 100, 100, '#00ffb4');

		ctx.textAlign = 'left';
		ctx.fillStyle = '#8cb4d2';
		ctx.font = '900 15px "Courier New", monospace';
		ctx.fillText('ESTAÇÃO SUBMARINA TARTARUS-V // SETOR HIDROACÚSTICO ABISSAL', padX + 145, footY + 44);

		ctx.fillStyle = '#ebb928';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.fillText('Consulte o Caderno de Huffman no Armário de Emergência [H] para a teoria algorítmica.', padX + 145, footY + 74);

		ctx.fillStyle = '#5a82a0';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('DOCUMENTO NAVAL DESCLASSIFICADO // USO EXCLUSIVO DO OFICIAL DE COMUNICAÇÕES', padX + 145, footY + 104);

		ctx.textAlign = 'right';
		ctx.fillStyle = '#00ffb4';
		ctx.font = '900 16px "Courier New", monospace';
		ctx.fillText('[ PRESSIONE P OU ESC PARA FECHAR ]', padX + mainW - 25, footY + footH - 26);
	}
}
