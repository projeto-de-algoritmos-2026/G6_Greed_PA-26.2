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

export class MedCabinet {
	public readonly group: THREE.Group;
	public readonly manualMesh: THREE.Group;
	private doorHinge: THREE.Group;
	public readonly interiorLight: THREE.PointLight;

	private isDoorOpen: boolean = false;
	private currentDoorAngle: number = 0;
	private targetDoorAngle: number = 0;

	constructor() {
		this.group = new THREE.Group();

		this.group.position.set(-4.70, 0.70, 2.30);
		this.group.rotation.y = Math.PI / 2;

		const cabW = 1.22;
		const cabH = 1.62;
		const cabD = 0.32;

		const ribTex = createDarkRibTexture();
		const darkRibMat = new THREE.MeshLambertMaterial({ color: 0x547998, map: ribTex });
		const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x304959 });
		const interiorMat = new THREE.MeshLambertMaterial({ color: 0x3b586c });
		const borderMat = new THREE.MeshLambertMaterial({ color: 0x486c84 });
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x7ea3be });

		const topFrame = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.12, 0.08, 0.06), darkRibMat);
		topFrame.position.set(0, cabH / 2 + 0.04, cabD / 2);
		const botFrame = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.12, 0.08, 0.06), darkRibMat);
		botFrame.position.set(0, -cabH / 2 - 0.04, cabD / 2);
		const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, cabH + 0.16, 0.06), darkRibMat);
		leftFrame.position.set(-cabW / 2 - 0.04, 0, cabD / 2);
		const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, cabH + 0.16, 0.06), darkRibMat);
		rightFrame.position.set(cabW / 2 + 0.04, 0, cabD / 2);
		this.group.add(topFrame, botFrame, leftFrame, rightFrame);

		const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 8);
		for (let i = 0; i <= 6; i++) {
			const bx = -cabW / 2 + (i / 6) * cabW;
			const bTop = new THREE.Mesh(boltGeo, boltMat);
			bTop.rotation.x = Math.PI / 2;
			bTop.position.set(bx, cabH / 2 + 0.04, cabD / 2 + 0.03);
			const bBot = new THREE.Mesh(boltGeo, boltMat);
			bBot.rotation.x = Math.PI / 2;
			bBot.position.set(bx, -cabH / 2 - 0.04, cabD / 2 + 0.03);
			this.group.add(bTop, bBot);
		}

		const backWall = new THREE.Mesh(new THREE.PlaneGeometry(cabW, cabH), interiorMat);
		backWall.position.set(0, 0, 0.01);

		const innerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, cabH, cabD), darkMetalMat);
		innerLeft.position.set(-cabW / 2, 0, cabD / 2);
		const innerRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, cabH, cabD), darkMetalMat);
		innerRight.position.set(cabW / 2, 0, cabD / 2);
		const innerTop = new THREE.Mesh(new THREE.BoxGeometry(cabW, 0.02, cabD), darkMetalMat);
		innerTop.position.set(0, cabH / 2, cabD / 2);
		const innerBot = new THREE.Mesh(new THREE.BoxGeometry(cabW, 0.02, cabD), darkMetalMat);
		innerBot.position.set(0, -cabH / 2, cabD / 2);
		this.group.add(backWall, innerLeft, innerRight, innerTop, innerBot);

		const shelfY = 0.38;
		const shelf = new THREE.Mesh(new THREE.BoxGeometry(cabW - 0.02, 0.025, cabD - 0.04), borderMat);
		shelf.position.set(0, shelfY, cabD / 2);
		this.group.add(shelf);

		const bottleMat = new THREE.MeshLambertMaterial({ color: 0x8a4b1f });
		const stopperMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
		for (const [bx, bz, bHeight] of [
			[-0.44, 0.16, 0.15],
			[-0.33, 0.18, 0.18],
			[-0.22, 0.14, 0.13]
		]) {
			const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, bHeight, 12), bottleMat);
			bottle.position.set(bx, shelfY + bHeight / 2 + 0.015, bz);
			const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.035, 10), stopperMat);
			stopper.position.set(bx, shelfY + bHeight + 0.03, bz);
			this.group.add(bottle, stopper);
		}

		const bandageMat = new THREE.MeshLambertMaterial({ color: 0xcec8b8 });
		for (const [bx, bz] of [[-0.08, 0.16], [0.03, 0.16]]) {
			const bandage = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.09, 16), bandageMat);
			bandage.rotation.z = Math.PI / 2;
			bandage.position.set(bx, shelfY + 0.05, bz);
			this.group.add(bandage);
		}

		const tubeCase = new THREE.Mesh(
			new THREE.BoxGeometry(0.24, 0.06, 0.14),
			new THREE.MeshLambertMaterial({ color: 0x243229 })
		);
		tubeCase.position.set(0.24, shelfY + 0.03, 0.16);
		const tubeStripe = new THREE.Mesh(
			new THREE.BoxGeometry(0.242, 0.02, 0.142),
			new THREE.MeshLambertMaterial({ color: 0xb52222 })
		);
		tubeStripe.position.set(0.24, shelfY + 0.03, 0.16);
		this.group.add(tubeCase, tubeStripe);

		const tubeBase = new THREE.Mesh(
			new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12),
			new THREE.MeshLambertMaterial({ color: 0x7a6332 })
		);
		tubeBase.position.set(0.44, shelfY + 0.025, 0.16);
		const tubeGlass = new THREE.Mesh(
			new THREE.CylinderGeometry(0.026, 0.026, 0.09, 12),
			new THREE.MeshLambertMaterial({ color: 0x99ccbb, transparent: true, opacity: 0.6 })
		);
		tubeGlass.position.set(0.44, shelfY + 0.085, 0.16);
		this.group.add(tubeBase, tubeGlass);

		this.manualMesh = new THREE.Group();
		this.manualMesh.position.set(0, -0.22, 0.03);

		const clipBoardMat = new THREE.MeshLambertMaterial({ color: 0x3d2919 });
		const board = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.08, 0.022), clipBoardMat);

		const bumperMat = new THREE.MeshLambertMaterial({ color: 0x11161a });
		const leftBumper = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.09, 0.026), bumperMat);
		leftBumper.position.set(-0.52, 0, 0);
		const rightBumper = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.09, 0.026), bumperMat);
		rightBumper.position.set(0.52, 0, 0);
		this.manualMesh.add(leftBumper, rightBumper);

		const ringGeo = new THREE.TorusGeometry(0.03, 0.008, 8, 16);
		const steelMat = new THREE.MeshLambertMaterial({ color: 0x6e828f });
		const hangRing = new THREE.Mesh(ringGeo, steelMat);
		hangRing.position.set(0, 0.52, 0.015);
		this.manualMesh.add(hangRing);

		const clampBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.042, 0.022), steelMat);
		clampBase.position.set(0, 0.47, 0.025);
		const clampLip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.012), steelMat);
		clampLip.position.set(0, 0.44, 0.032);

		const leverMat = new THREE.MeshLambertMaterial({ color: 0x8a9ea8 });
		for (const lx of [-0.11, 0.11]) {
			const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 8), leverMat);
			lever.position.set(lx, 0.51, 0.032);
			this.manualMesh.add(lever);
		}
		this.manualMesh.add(clampBase, clampLip);

		const paperStackMat = new THREE.MeshLambertMaterial({ color: 0xf3ede0 });
		const paperStack = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.02, 0.006), paperStackMat);
		paperStack.position.set(0, -0.015, 0.012);
		this.manualMesh.add(paperStack);

		const S = 1536;
		const manualCanvas = document.createElement('canvas');
		manualCanvas.width = S;
		manualCanvas.height = S;
		const mctx = manualCanvas.getContext('2d')!;

		const manualTexture = new THREE.CanvasTexture(manualCanvas);
		manualTexture.colorSpace = THREE.SRGBColorSpace;
		manualTexture.generateMipmaps = true;
		manualTexture.minFilter = THREE.LinearMipmapLinearFilter;
		manualTexture.magFilter = THREE.LinearFilter;

		const logoImg = new Image();
		logoImg.src = '/terminal.png';

		const renderManual = () => {
			this.renderHuffmanNotebookCanvas(mctx, S, logoImg);
			manualTexture.needsUpdate = true;
		};

		if (logoImg.complete && logoImg.naturalWidth > 0) {
			renderManual();
		} else {
			renderManual();
			logoImg.onload = () => renderManual();
		}

		const manualSheet = new THREE.Mesh(
			new THREE.PlaneGeometry(0.96, 1.00),
			new THREE.MeshBasicMaterial({ map: manualTexture, fog: false })
		);
		manualSheet.position.set(0, -0.015, 0.016);

		for (const cx of [-0.48, 0.48]) {
			for (const cy of [-0.48, 0.48]) {
				const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), boltMat);
				sc.rotation.x = Math.PI / 2;
				sc.position.set(cx, cy, 0.02);
				this.manualMesh.add(sc);
			}
		}

		this.manualMesh.add(board, manualSheet);
		this.manualMesh.userData = { isManual: true, isCabinet: true };
		this.group.add(this.manualMesh);

		this.interiorLight = new THREE.PointLight(0xfffae6, 0.0, 5.0, 1.2);
		this.interiorLight.position.set(0, cabH / 2 - 0.05, cabD / 2);
		this.group.add(this.interiorLight);

		this.doorHinge = new THREE.Group();
		this.doorHinge.position.set(-cabW / 2, 0, cabD);

		const doorGroup = new THREE.Group();
		doorGroup.position.set(cabW / 2, 0, 0);

		const doorBody = new THREE.Mesh(
			new THREE.BoxGeometry(cabW, cabH, 0.035),
			new THREE.MeshLambertMaterial({ color: 0x3d6179 })
		);

		const panelBevel = new THREE.Mesh(
			new THREE.BoxGeometry(cabW - 0.12, cabH - 0.12, 0.04),
			new THREE.MeshLambertMaterial({ color: 0x335165 })
		);

		const crossMat = new THREE.MeshLambertMaterial({ color: 0xcc2a2a });
		const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.015), crossMat);
		crossV.position.set(0, 0.15, 0.025);
		const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.015), crossMat);
		crossH.position.set(0, 0.15, 0.026);

		const lockMat = new THREE.MeshLambertMaterial({ color: 0x7295ae });
		const lockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), lockMat);
		lockBase.rotation.x = Math.PI / 2;
		lockBase.position.set(cabW / 2 - 0.14, 0, 0.03);

		const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.02), lockMat);
		handleBar.position.set(cabW / 2 - 0.14, 0, 0.05);

		const signCanvas = document.createElement('canvas');
		signCanvas.width = 512;
		signCanvas.height = 128;
		const sctx = signCanvas.getContext('2d')!;
		sctx.fillStyle = '#0f1713';
		sctx.fillRect(0, 0, 512, 128);
		sctx.strokeStyle = '#c48b2c';
		sctx.lineWidth = 4;
		sctx.strokeRect(10, 10, 492, 108);

		sctx.fillStyle = '#ffaa33';
		sctx.font = 'bold 20px "Courier New", monospace';
		sctx.textAlign = 'center';
		sctx.fillText('COMPARTIMENTO TÉCNICO // ANEXO #04', 256, 40);

		sctx.fillStyle = '#e8dcc4';
		sctx.font = 'bold 15px "Courier New", monospace';
		sctx.fillText('CADERNO DE HUFFMAN (TUTORIAL DIDÁTICO)', 256, 72);

		sctx.fillStyle = '#00ffaa';
		sctx.font = 'bold 14px "Courier New", monospace';
		sctx.fillText('[ CLIQUE OU TECLA H PARA ABRIR ]', 256, 102);

		const stencilSign = new THREE.Mesh(
			new THREE.PlaneGeometry(0.88, 0.22),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
		);
		stencilSign.position.set(0, -0.35, 0.025);

		doorGroup.add(doorBody, panelBevel, crossV, crossH, lockBase, handleBar, stencilSign);
		doorGroup.userData = { isCabinetDoor: true, isCabinet: true };
		this.doorHinge.add(doorGroup);
		this.group.add(this.doorHinge);

		const headerCanvas = document.createElement('canvas');
		headerCanvas.width = 512;
		headerCanvas.height = 64;
		const hctx = headerCanvas.getContext('2d')!;
		hctx.fillStyle = '#0a100d';
		hctx.fillRect(0, 0, 512, 64);
		hctx.strokeStyle = '#273830';
		hctx.lineWidth = 3;
		hctx.strokeRect(6, 6, 500, 52);
		hctx.font = 'bold 19px "Courier New", monospace';
		hctx.fillStyle = '#ffaa33';
		hctx.textAlign = 'center';
		hctx.fillText('COMPARTIMENTO TÉCNICO // CADERNO HUFFMAN [H]', 256, 40);

		const wallSign = new THREE.Mesh(
			new THREE.PlaneGeometry(1.4, 0.18),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(headerCanvas) })
		);
		wallSign.position.set(0, cabH / 2 + 0.20, cabD / 2);
		this.group.add(wallSign);

		this.group.userData = { isCabinet: true };
	}

	public open(): void {
		this.isDoorOpen = true;
		this.targetDoorAngle = -Math.PI * 0.62;
	}

	public snapOpen(): void {
		this.isDoorOpen = true;
		this.targetDoorAngle = -Math.PI * 0.62;
		this.currentDoorAngle = this.targetDoorAngle;
		this.doorHinge.rotation.y = this.currentDoorAngle;
		this.interiorLight.intensity = 5.0;
	}

	public close(): void {
		this.isDoorOpen = false;
		this.targetDoorAngle = 0;
	}

	public toggle(): boolean {
		if (this.isDoorOpen) this.close();
		else this.open();
		return this.isDoorOpen;
	}

	public isOpen(): boolean {
		return this.isDoorOpen;
	}

	public update(): void {
		this.currentDoorAngle = THREE.MathUtils.lerp(this.currentDoorAngle, this.targetDoorAngle, 0.09);
		this.doorHinge.rotation.y = this.currentDoorAngle;

		const targetLight = this.isDoorOpen ? 5.0 : 0.0;
		this.interiorLight.intensity = THREE.MathUtils.lerp(this.interiorLight.intensity, targetLight, 0.15);
	}

	private renderHuffmanNotebookCanvas(
		ctx: CanvasRenderingContext2D,
		S: number,
		logoImg: HTMLImageElement
	): void {
		const bgGrad = ctx.createRadialGradient(S / 2, S / 2, 250, S / 2, S / 2, 1050);
		bgGrad.addColorStop(0, '#fdfbf6');
		bgGrad.addColorStop(0.7, '#f7f0e4');
		bgGrad.addColorStop(1, '#ebe0cf');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, S, S);

		const imgData = ctx.getImageData(0, 0, S, S);
		const px = imgData.data;
		for (let i = 0; i < px.length; i += 8) {
			const n = (Math.random() - 0.5) * 10;
			px[i] = Math.max(0, Math.min(255, px[i] + n));
			px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n * 0.95));
			px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n * 0.8));
		}
		ctx.putImageData(imgData, 0, 0);

		const lineSpacing = 32;
		for (let y = 64; y < S - 35; y += lineSpacing) {
			const isMajor = Math.floor(y / lineSpacing) % 5 === 0;
			ctx.strokeStyle = isMajor ? 'rgba(70, 120, 185, 0.42)' : 'rgba(90, 140, 200, 0.24)';
			ctx.lineWidth = isMajor ? 1.6 : 1.0;
			ctx.beginPath();
			ctx.moveTo(35, y);
			ctx.lineTo(S - 35, y);
			ctx.stroke();
		}

		const mX1 = 150;
		const mX2 = 154;
		ctx.strokeStyle = 'rgba(215, 60, 60, 0.48)';
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(mX1, 35);
		ctx.lineTo(mX1, S - 35);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(215, 60, 60, 0.26)';
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.moveTo(mX2, 35);
		ctx.lineTo(mX2, S - 35);
		ctx.stroke();

		const holeX = 65;
		for (const hy of [220, 768, 1316]) {
			ctx.fillStyle = '#e8d8be';
			ctx.beginPath();
			ctx.arc(holeX, hy, 18, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = 'rgba(135, 105, 70, 0.45)';
			ctx.lineWidth = 1.5;
			ctx.stroke();

			ctx.fillStyle = '#22150d';
			ctx.beginPath();
			ctx.arc(holeX, hy, 9, 0, Math.PI * 2);
			ctx.fill();
		}

		const contentX = 175;
		const contentW = S - contentX - 65; 

		const drawHighlighter = (x: number, y: number, w: number, h: number) => {
			ctx.save();
			ctx.fillStyle = 'rgba(255, 235, 60, 0.45)';
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, 4);
			ctx.fill();
			ctx.restore();
		};

		const drawBox = (x: number, y: number, w: number, h: number, bg: string, border: string) => {
			ctx.fillStyle = bg;
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, 6);
			ctx.fill();
			ctx.strokeStyle = border;
			ctx.lineWidth = 1.6;
			ctx.stroke();
		};

		drawHighlighter(contentX - 4, 60, 710, 36);
		ctx.textAlign = 'left';
		ctx.fillStyle = '#102036';
		ctx.font = '900 27px "Courier New", monospace';
		ctx.fillText('MANUAL DIDÁTICO: COMPRESSÃO DE HUFFMAN', contentX + 6, 88);

		ctx.fillStyle = '#244362';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('Como construir a Árvore Binária Ótima através da Escolha Gulosa.', contentX + 6, 116);

		ctx.fillStyle = 'rgba(255, 245, 160, 0.7)';
		ctx.strokeStyle = '#dfc246';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.roundRect(contentX, 134, contentW - 220, 36, 4);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#102e18';
		ctx.font = '900 13.5px "Courier New", monospace';
		ctx.fillText('REGRA DE OURO: Letras frequentes usam 1 ou 2 bits. Letras raras usam 3 ou 4 bits.', contentX + 12, 156);

		const stampCX = contentX + contentW - 100;
		const stampCY = 100;
		const stampR = 64;

		ctx.save();
		ctx.translate(stampCX, stampCY);
		ctx.rotate(0.08);

		ctx.strokeStyle = '#1b3a5d';
		ctx.lineWidth = 2.8;
		ctx.beginPath();
		ctx.arc(0, 0, stampR, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(27, 58, 93, 0.5)';
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.arc(0, 0, stampR - 6, 0, Math.PI * 2);
		ctx.stroke();

		ctx.textAlign = 'center';
		ctx.fillStyle = '#1b3a5d';
		ctx.font = '900 10.5px "Courier New", monospace';
		ctx.fillText('TARTARUS LABS', 0, -stampR + 17);
		ctx.fillText('HUFFMAN APROVADO', 0, stampR - 12);

		drawTintedImage(ctx, logoImg, -38, -36, 76, 76, '#1b3a5d');
		ctx.restore();

		const sY = 190;
		const sH = 240;
		const stepW = Math.floor((contentW - 30) / 3);

		const p1X = contentX;
		drawBox(p1X, sY, stepW, sH, 'rgba(255, 255, 255, 0.88)', '#386287');
		drawHighlighter(p1X + 10, sY + 8, 260, 24);

		ctx.textAlign = 'left';
		ctx.fillStyle = '#0f2238';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('1. IDENTIFICAR OS MENORES', p1X + 14, sY + 25);

		ctx.fillStyle = '#263d52';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('Ordene a fila de prioridade pelo peso:', p1X + 12, sY + 50);

		const drawMiniCard = (x: number, y: number, ch: string, w: number, isMin: boolean) => {
			ctx.fillStyle = isMin ? '#fdedea' : '#eef4f8';
			ctx.strokeStyle = isMin ? '#cc2222' : '#456a88';
			ctx.lineWidth = isMin ? 2.0 : 1.2;
			ctx.beginPath();
			ctx.roundRect(x, y, 68, 42, 6);
			ctx.fill();
			ctx.stroke();

			ctx.textAlign = 'center';
			ctx.fillStyle = isMin ? '#b81414' : '#143048';
			ctx.font = '900 14px "Courier New", monospace';
			ctx.fillText(`'${ch}'`, x + 34, y + 20);
			ctx.font = 'bold 11px "Courier New", monospace';
			ctx.fillText(`p:${w}`, x + 34, y + 36);
			ctx.textAlign = 'left';
		};

		drawMiniCard(p1X + 12, sY + 66, 'A', 2, true);
		drawMiniCard(p1X + 88, sY + 66, 'B', 3, true);
		drawMiniCard(p1X + 164, sY + 66, 'C', 5, false);
		drawMiniCard(p1X + 240, sY + 66, 'D', 8, false);

		ctx.strokeStyle = '#d42222';
		ctx.lineWidth = 2.4;
		ctx.beginPath();
		ctx.ellipse(p1X + 84, sY + 87, 80, 28, 0, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = '#cc1818';
		ctx.font = '900 12.5px "Courier New", monospace';
		ctx.fillText('▲ 2 MENORES PESOS: (2 e 3)', p1X + 12, sY + 130);

		ctx.fillStyle = '#3c5870';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('A escolha gulosa SEMPRE une', p1X + 12, sY + 158);
		ctx.fillText('os dois nós mais leves da esteira.', p1X + 12, sY + 178);

		ctx.fillStyle = '#156035';
		ctx.font = '900 12px "Courier New", monospace';
		ctx.fillText('Clique ou use teclas 1..4', p1X + 12, sY + 212);

		const p2X = p1X + stepW + 15;
		drawBox(p2X, sY, stepW, sH, 'rgba(255, 255, 255, 0.88)', '#386287');
		drawHighlighter(p2X + 10, sY + 8, 240, 24);

		ctx.fillStyle = '#0f2238';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('2. FUNDIR COM [ESPAÇO]', p2X + 14, sY + 25);

		ctx.fillStyle = '#263d52';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('Crie um Nó Pai somando os pesos:', p2X + 12, sY + 50);

		ctx.fillStyle = '#e8f6ed';
		ctx.strokeStyle = '#1d7844';
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.roundRect(p2X + 30, sY + 66, stepW - 60, 46, 8);
		ctx.fill();
		ctx.stroke();

		ctx.textAlign = 'center';
		ctx.fillStyle = '#125c32';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('NÓ PAI: 2 + 3 = 5', p2X + stepW / 2, sY + 86);
		ctx.fillStyle = '#254530';
		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.fillText('Filhos: A(2) e B(3)', p2X + stepW / 2, sY + 103);
		ctx.textAlign = 'left';

		ctx.fillStyle = '#156035';
		ctx.font = '900 12.5px "Courier New", monospace';
		ctx.fillText('✔ O PAI VOLTA PARA A FILA!', p2X + 12, sY + 130);

		ctx.fillStyle = '#3c5870';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('Nova fila ordenada:', p2X + 12, sY + 158);
		ctx.fillStyle = '#103050';
		ctx.font = '900 12px "Courier New", monospace';
		ctx.fillText('[ C: 5 ]   [ Pai: 5 ]   [ D: 8 ]', p2X + 12, sY + 178);

		ctx.fillStyle = '#156035';
		ctx.font = '900 12px "Courier New", monospace';
		ctx.fillText('Pressione [ESPAÇO] para fundir', p2X + 12, sY + 212);

		const p3X = p2X + stepW + 15;
		drawBox(p3X, sY, stepW, sH, 'rgba(255, 255, 255, 0.88)', '#386287');
		drawHighlighter(p3X + 10, sY + 8, 250, 24);

		ctx.fillStyle = '#0f2238';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('3. REPETIR ATÉ A RAIZ', p3X + 14, sY + 25);

		ctx.fillStyle = '#263d52';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('Continue unindo os 2 menores:', p3X + 12, sY + 50);

		ctx.fillStyle = '#183452';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('• Funda C(5) + Pai(5) -> [10]', p3X + 12, sY + 76);
		ctx.fillText('• Funda D(8) + Nó(10) -> [18]', p3X + 12, sY + 102);

		ctx.fillStyle = '#b81414';
		ctx.font = '900 12.5px "Courier New", monospace';
		ctx.fillText('★ RAIZ ÚNICA ALCANÇADA!', p3X + 12, sY + 130);

		ctx.fillStyle = '#3c5870';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('Quando restar apenas 1 nó,', p3X + 12, sY + 158);
		ctx.fillText('a Árvore Binária está completa!', p3X + 12, sY + 178);

		ctx.fillStyle = '#156035';
		ctx.font = '900 12px "Courier New", monospace';
		ctx.fillText('Pressione [ENTER] para emitir', p3X + 12, sY + 212);

		const treeY = 450;
		const treeH = 565;
		drawBox(contentX, treeY, contentW, treeH, 'rgba(255, 255, 255, 0.92)', '#244560');

		drawHighlighter(contentX + 12, treeY + 10, 840, 28);
		ctx.fillStyle = '#0a1624';
		ctx.font = '900 14.5px "Courier New", monospace';
		ctx.fillText('DEMONSTRAÇÃO DA ÁRVORE COMPLETA // RAMO ESQUERDO = BIT \'0\'  |  RAMO DIREITO = BIT \'1\'', contentX + 18, treeY + 29);

		const rx = contentX + Math.floor(contentW * 0.42);
		const ry = treeY + 85;

		const drawCircleNode = (x: number, y: number, label: string, isLeaf: boolean, freq: number) => {
			const r = 28;
			ctx.fillStyle = isLeaf ? '#e8f6ed' : '#fef6e6';
			ctx.strokeStyle = isLeaf ? '#156035' : '#c47d0b';
			ctx.lineWidth = 2.4;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.textAlign = 'center';
			ctx.fillStyle = isLeaf ? '#0f4825' : '#8a5200';
			ctx.font = '900 15px "Courier New", monospace';
			ctx.fillText(label, x, isLeaf ? y - 3 : y + 5);

			if (isLeaf) {
				ctx.fillStyle = '#156035';
				ctx.font = 'bold 11px "Courier New", monospace';
				ctx.fillText(`p:${freq}`, x, y + 14);
			}
			ctx.textAlign = 'left';
		};

		const drawBranch = (x1: number, y1: number, x2: number, y2: number, bit: '0' | '1') => {
			ctx.strokeStyle = '#2b4458';
			ctx.lineWidth = 2.8;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();

			const mx = (x1 + x2) / 2;
			const my = (y1 + y2) / 2;
			ctx.fillStyle = bit === '0' ? '#d4f2df' : '#fcedd2';
			ctx.strokeStyle = bit === '0' ? '#1b7a42' : '#c47d0b';
			ctx.lineWidth = 1.8;
			ctx.beginPath();
			ctx.roundRect(mx - 14, my - 14, 28, 28, 6);
			ctx.fill();
			ctx.stroke();

			ctx.textAlign = 'center';
			ctx.fillStyle = bit === '0' ? '#145c32' : '#8a5200';
			ctx.font = '900 16px "Courier New", monospace';
			ctx.fillText(bit, mx, my + 6);
			ctx.textAlign = 'left';
		};

		const nRoot = { x: rx, y: ry };
		const nD = { x: rx - 190, y: ry + 115 };
		const n10 = { x: rx + 150, y: ry + 115 };
		const nC = { x: n10.x - 120, y: n10.y + 125 };
		const n5 = { x: n10.x + 120, y: n10.y + 125 };
		const nA = { x: n5.x - 70, y: n5.y + 125 };
		const nB = { x: n5.x + 70, y: n5.y + 125 };

		drawBranch(nRoot.x, nRoot.y + 28, nD.x, nD.y - 28, '0');
		drawBranch(nRoot.x, nRoot.y + 28, n10.x, n10.y - 28, '1');

		drawBranch(n10.x, n10.y + 28, nC.x, nC.y - 28, '0');
		drawBranch(n10.x, n10.y + 28, n5.x, n5.y - 28, '1');

		drawBranch(n5.x, n5.y + 28, nA.x, nA.y - 28, '0');
		drawBranch(n5.x, n5.y + 28, nB.x, nB.y - 28, '1');

		drawCircleNode(nRoot.x, nRoot.y, '18', false, 18);
		drawCircleNode(nD.x, nD.y, "'D'", true, 8);
		drawCircleNode(n10.x, n10.y, '10', false, 10);
		drawCircleNode(nC.x, nC.y, "'C'", true, 5);
		drawCircleNode(n5.x, n5.y, '5', false, 5);
		drawCircleNode(nA.x, nA.y, "'A'", true, 2);
		drawCircleNode(nB.x, nB.y, "'B'", true, 3);

		const sideTabX = contentX + contentW - 380;
		const sideTabY = treeY + 50;
		drawBox(sideTabX, sideTabY, 360, 440, '#f8fcff', '#3c6991');

		drawHighlighter(sideTabX + 12, sideTabY + 10, 336, 26);
		ctx.fillStyle = '#0f1c2b';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('CÓDIGOS GERADOS (RAIZ -> FOLHA)', sideTabX + 18, sideTabY + 28);

		const codes = [
			{ ch: "'D'", f: 8, code: '0', bits: '1 bit', c: '#156035', desc: 'Mais frequente = Mais curto!' },
			{ ch: "'C'", f: 5, code: '10', bits: '2 bits', c: '#156035', desc: 'Frequência média' },
			{ ch: "'A'", f: 2, code: '110', bits: '3 bits', c: '#b81414', desc: 'Raro = Código mais longo' },
			{ ch: "'B'", f: 3, code: '111', bits: '3 bits', c: '#b81414', desc: 'Raro = Código mais longo' }
		];

		codes.forEach((cd, idx) => {
			const cy = sideTabY + 50 + idx * 78;
			ctx.fillStyle = '#ffffff';
			ctx.strokeStyle = cd.c;
			ctx.lineWidth = 1.4;
			ctx.beginPath();
			ctx.roundRect(sideTabX + 12, cy, 336, 68, 6);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = cd.c;
			ctx.font = '900 17px "Courier New", monospace';
			ctx.fillText(`${cd.ch}  ->  "${cd.code}"`, sideTabX + 24, cy + 26);

			ctx.fillStyle = '#2c4052';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.fillText(`(${cd.bits})`, sideTabX + 240, cy + 26);

			ctx.fillStyle = '#5c758a';
			ctx.font = 'italic 11px "Courier New", monospace';
			ctx.fillText(cd.desc, sideTabX + 24, cy + 50);
		});

		ctx.fillStyle = '#b81414';
		ctx.font = '900 11.5px "Courier New", monospace';
		ctx.fillText('★ PROPRIEDADE DE PREFIXO:', sideTabX + 16, sideTabY + 390);
		ctx.fillStyle = '#263d52';
		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.fillText('Nenhum código é início de outro!', sideTabX + 16, sideTabY + 412);

		ctx.fillStyle = '#156035';
		ctx.font = '900 13.5px "Courier New", monospace';
		ctx.fillText('✔ Repare: \'D\' (peso 8) está a apenas 1 salto da raiz e gasta apenas 1 bit (\'0\')!', contentX + 20, treeY + treeH - 24);

		const savY = 1035;
		const savH = 195;
		drawBox(contentX, savY, contentW, savH, 'rgba(255, 255, 255, 0.88)', '#244560');

		drawHighlighter(contentX + 14, savY + 10, 540, 26);
		ctx.fillStyle = '#0a1624';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('COMPROVAÇÃO MATEMÁTICA: O IMPACTO NO CASCO', contentX + 20, savY + 28);

		const bY1 = savY + 50;
		ctx.fillStyle = '#c32323';
		ctx.fillRect(contentX + 20, bY1, contentW - 40, 34);
		ctx.fillStyle = '#ffffff';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('ASCII PADRÃO (8-BIT):  18 letras × 8 bits = 144 BITS   [ ALTO RISCO DE DETECÇÃO PELO MONSTRO ]', contentX + 35, bY1 + 22);

		const bY2 = savY + 95;
		const huffW = Math.floor((contentW - 40) * 0.23); 
		ctx.fillStyle = '#198c41';
		ctx.fillRect(contentX + 20, bY2, huffW, 34);
		ctx.strokeStyle = '#198c41';
		ctx.lineWidth = 2;
		ctx.strokeRect(contentX + 20, bY2, contentW - 40, 34);

		ctx.fillStyle = '#ffffff';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('HUFFMAN: 33 BITS', contentX + 35, bY2 + 22);

		ctx.fillStyle = '#147833';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('(8×1 + 5×2 + 2×3 + 3×3 = 33 bits) -> ECONOMIA DE 77.1% DOS BITS!', contentX + huffW + 35, bY2 + 22);

		ctx.fillStyle = '#263d52';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('Conclusão: Cada bit economizado reduz o alcance sonoro das ondas na fossa em centenas de metros.', contentX + 20, savY + 160);

		const ctlY = 1245;
		const ctlH = 240;
		drawBox(contentX, ctlY, contentW, ctlH, 'rgba(255, 255, 255, 0.88)', '#355975');

		drawHighlighter(contentX + 14, ctlY + 10, 420, 26);
		ctx.fillStyle = '#0a1624';
		ctx.font = '900 13.5px "Courier New", monospace';
		ctx.fillText('COMANDOS DA BANCADA NO TERMINAL', contentX + 20, ctlY + 28);

		const keys = [
			{ k: '[ CLIQUE OU 1..9 ]', d: 'Seleciona 2 nós na esteira' },
			{ k: '[ BARRA ESPAÇO ]', d: 'Funde os 2 nós selecionados' },
			{ k: '[ TECLA Z ]', d: 'Desfaz a última fusão' },
			{ k: '[ TECLA R ]', d: 'Reinicia a árvore do início' },
			{ k: '[ TECLA ENTER ]', d: 'Transmite com a raiz pronta' },
			{ k: '[ TECLA H / ESC ]', d: 'Fecha este caderno de anotações' }
		];

		keys.forEach((item, idx) => {
			const col = idx < 3 ? 0 : 1;
			const row = idx < 3 ? idx : idx - 3;
			const kx = contentX + (col === 0 ? 20 : Math.floor(contentW / 2) + 10);
			const ky = ctlY + 48 + row * 44;

			ctx.fillStyle = '#f0f5fc';
			ctx.strokeStyle = '#325a82';
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.roundRect(kx, ky, 180, 34, 6);
			ctx.fill();
			ctx.stroke();

			ctx.textAlign = 'center';
			ctx.fillStyle = '#0f2846';
			ctx.font = '900 12px "Courier New", monospace';
			ctx.fillText(item.k, kx + 90, ky + 21);
			ctx.textAlign = 'left';

			ctx.fillStyle = '#263d52';
			ctx.font = 'bold 12.5px "Courier New", monospace';
			ctx.fillText(item.d, kx + 195, ky + 21);
		});

		ctx.fillStyle = '#657d94';
		ctx.font = 'bold 11px "Courier New", monospace';
		ctx.fillText('REGISTRO DIDÁTICO DE ENGENHARIA // TARTARUS LABS', contentX + 20, ctlY + ctlH - 20);

		ctx.textAlign = 'right';
		ctx.fillStyle = '#156035';
		ctx.font = '900 13px "Courier New", monospace';
		ctx.fillText('[ PRESSIONE H OU ESC PARA VOLTAR AO TERMINAL ]', contentX + contentW - 20, ctlY + ctlH - 20);
	}
}
