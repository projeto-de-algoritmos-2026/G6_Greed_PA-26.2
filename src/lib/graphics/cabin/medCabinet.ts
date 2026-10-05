import * as THREE from 'three';
import { createDarkRibTexture } from '../textures/procedural';

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

		const clipBoardMat = new THREE.MeshLambertMaterial({ color: 0x202b33 });
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

		const paperStackMat = new THREE.MeshLambertMaterial({ color: 0xd6cbb5 });
		const paperStack = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.02, 0.006), paperStackMat);
		paperStack.position.set(0, -0.015, 0.012);
		this.manualMesh.add(paperStack);

		const manualCanvas = this.createHuffmanManualCanvas();
		const manualTexture = new THREE.CanvasTexture(manualCanvas);
		manualTexture.colorSpace = THREE.SRGBColorSpace;
		manualTexture.generateMipmaps = true;
		manualTexture.minFilter = THREE.LinearMipmapLinearFilter;
		manualTexture.magFilter = THREE.LinearFilter;

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
		sctx.font = 'bold 21px "Courier New", monospace';
		sctx.textAlign = 'center';
		sctx.fillText('COMPARTIMENTO DE EMERGÊNCIA #04', 256, 40);

		sctx.fillStyle = '#e8dcc4';
		sctx.font = 'bold 15px "Courier New", monospace';
		sctx.fillText('DIRETRIZ HUFFMAN (SOP-82) & PRIMEIROS SOCORROS', 256, 72);

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
		hctx.font = 'bold 20px "Courier New", monospace';
		hctx.fillStyle = '#ffaa33';
		hctx.textAlign = 'center';
		hctx.fillText('COMPARTIMENTO DE EMERGÊNCIA // MANUAL SOP-82 [H]', 256, 40);

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

	private createHuffmanManualCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		const S = 1536;
		canvas.width = S;
		canvas.height = S;
		const ctx = canvas.getContext('2d')!;

		const bgGrad = ctx.createRadialGradient(S / 2, S / 2, 200, S / 2, S / 2, 950);
		bgGrad.addColorStop(0, '#f4ece0');
		bgGrad.addColorStop(0.7, '#e8ded0');
		bgGrad.addColorStop(1, '#c5b8a0');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, S, S);

		const imgData = ctx.getImageData(0, 0, S, S);
		const px = imgData.data;
		for (let i = 0; i < px.length; i += 8) {
			const n = (Math.random() - 0.5) * 12;
			px[i] = Math.max(0, Math.min(255, px[i] + n));
			px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n * 0.9));
			px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n * 0.7));
		}
		ctx.putImageData(imgData, 0, 0);

		ctx.strokeStyle = 'rgba(40, 75, 95, 0.055)';
		ctx.lineWidth = 1;
		for (let x = 0; x < S; x += 24) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, S);
			ctx.stroke();
		}
		for (let y = 0; y < S; y += 24) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(S, y);
			ctx.stroke();
		}

		for (const hy of [380, 1140]) {
			ctx.fillStyle = '#bda77e';
			ctx.beginPath();
			ctx.arc(38, hy, 16, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#1e1c16';
			ctx.beginPath();
			ctx.arc(38, hy, 9, 0, Math.PI * 2);
			ctx.fill();
		}

		const drawCrease = (x1: number, y1: number, x2: number, y2: number) => {
			ctx.save();
			ctx.strokeStyle = 'rgba(40, 30, 20, 0.13)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();

			ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x1 + 1.5, y1 + 1.5);
			ctx.lineTo(x2 + 1.5, y2 + 1.5);
			ctx.stroke();
			ctx.restore();
		};
		drawCrease(S / 2, 20, S / 2, S - 20);
		drawCrease(20, S * 0.48, S - 20, S * 0.48);

		ctx.strokeStyle = '#273830';
		ctx.lineWidth = 8;
		ctx.strokeRect(20, 20, S - 40, S - 40);

		ctx.strokeStyle = '#4a6356';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(28, 28, S - 56, S - 56);

		const headX = 46;
		const headY = 44;
		const headW = S - 92;
		const headH = 138;

		ctx.fillStyle = '#141e1a';
		ctx.fillRect(headX, headY, headW, headH);
		ctx.strokeStyle = '#2d4438';
		ctx.lineWidth = 2;
		ctx.strokeRect(headX, headY, headW, headH);

		const cx = headX + 70;
		const cy = headY + 68;
		ctx.save();
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.45)';
		ctx.lineWidth = 2;
		for (const r of [20, 34, 48]) {
			ctx.beginPath();
			ctx.arc(cx, cy, r, -Math.PI * 0.42, Math.PI * 0.42);
			ctx.stroke();
		}
		ctx.strokeStyle = '#e5a912';
		ctx.fillStyle = '#e5a912';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(cx, cy - 20, 10, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx, cy - 10);
		ctx.lineTo(cx, cy + 30);
		ctx.moveTo(cx - 20, cy);
		ctx.lineTo(cx + 20, cy);
		ctx.moveTo(cx - 24, cy + 18);
		ctx.quadraticCurveTo(cx, cy + 40, cx + 24, cy + 18);
		ctx.stroke();
		ctx.restore();

		ctx.textAlign = 'left';
		ctx.fillStyle = '#8ea89a';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('HADAL DYNAMICS // DIVISÃO DE GUERRA HIDROACÚSTICA // SETOR TARTARUS-V', headX + 145, headY + 36);

		ctx.fillStyle = '#ffffff';
		ctx.font = '900 27px "Impact", "Arial Black", sans-serif';
		ctx.fillText('PROCEDIMENTO OPERACIONAL DE EMERGÊNCIA (SOP-82-HUF)', headX + 145, headY + 70);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 14.5px "Courier New", monospace';
		ctx.fillText('DIRETRIZ DE CODIFICAÇÃO GULOSA DE HUFFMAN // NÍVEL DE CONTROLE 1', headX + 145, headY + 98);

		ctx.fillStyle = '#7a9688';
		ctx.font = '12px "Courier New", monospace';
		ctx.fillText('REF. CRUZADA: DIRETRIZ DE DISCIPLINA ACÚSTICA 409-MIL // REVISÃO: 12.NOV.1982', headX + 145, headY + 120);

		ctx.save();
		ctx.translate(headX + headW - 135, headY + 68);
		ctx.rotate(-0.06);
		ctx.fillStyle = 'rgba(42, 10, 10, 0.9)';
		ctx.fillRect(-100, -45, 200, 90);
		ctx.strokeStyle = '#d62828';
		ctx.lineWidth = 2.5;
		ctx.strokeRect(-100, -45, 200, 90);
		ctx.strokeStyle = 'rgba(214, 40, 40, 0.4)';
		ctx.lineWidth = 1;
		ctx.strokeRect(-95, -40, 190, 80);

		ctx.textAlign = 'center';
		ctx.fillStyle = '#ff4d4d';
		ctx.font = '900 16px "Arial Black", monospace';
		ctx.fillText('URGENTE', 0, -18);
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('GRAU ÔMEGA', 0, 0);
		ctx.fillText('PROTOCOLO EM VIGOR', 0, 18);
		ctx.fillStyle = '#ff8888';
		ctx.font = 'bold 10px "Courier New", monospace';
		ctx.fillText('TARTARUS-V // 1982', 0, 32);
		ctx.restore();

		const s1Y = 194;
		const s1H = 116;
		ctx.fillStyle = '#0f1714';
		ctx.fillRect(headX, s1Y, headW, s1H);
		ctx.strokeStyle = '#273830';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(headX, s1Y, headW, s1H);

		ctx.fillStyle = '#1a2922';
		ctx.fillRect(headX, s1Y, headW, 26);
		ctx.textAlign = 'left';
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13.5px "Courier New", monospace';
		ctx.fillText('1. OBJETIVO OPERACIONAL & PRINCÍPIO DO SILÊNCIO ACÚSTICO', headX + 14, s1Y + 18);

		ctx.fillStyle = '#e8dcc4';
		ctx.font = '14px "Courier New", monospace';
		const s1Lines = [
			'• Emissões brutas em 8 bits por caractere produzem choque hidroacústico contínuo na fossa.',
			'• O algoritmo guloso de Huffman constrói uma árvore de prefixos ótima, minimizando o total de bits emitidos.',
			'• Caracteres de alta frequência recebem sequências binárias curtas; caracteres raros ficam mais profundos.',
			'• Resultado: redução superior a 70% da energia sonora, mantendo o casco abaixo do limiar de ecolocalização.'
		];
		s1Lines.forEach((l, idx) => ctx.fillText(l, headX + 16, s1Y + 48 + idx * 19));

		const s2Y = 320;
		const s2H = 238;
		ctx.fillStyle = '#0f1714';
		ctx.fillRect(headX, s2Y, headW, s2H);
		ctx.strokeStyle = '#273830';
		ctx.strokeRect(headX, s2Y, headW, s2H);

		ctx.fillStyle = '#1a2922';
		ctx.fillRect(headX, s2Y, headW, 26);
		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 13.5px "Courier New", monospace';
		ctx.fillText('2. PROTOCOLO OPERACIONAL DA ESCOLHA GULOSA (PASSO A PASSO NA BANCADA)', headX + 14, s2Y + 18);

		const steps = [
			{
				tag: '[PASSO 1: IDENTIFICAR]',
				desc: 'Examine a fila de nós no terminal. Localize impreterivelmente os DOIS NÓS COM MENOR PESO (frequência).'
			},
			{
				tag: '[PASSO 2: SELECIONAR]',
				desc: 'Clique nos dois nós identificados (ou use as teclas numéricas de atalho da esteira de prioridade).'
			},
			{
				tag: '[PASSO 3: FUNDIR - ESPAÇO]',
				desc: 'Pressione [ESPAÇO]. O sistema une os nós, criando um NÓ PAI com peso somado: W_pai = W_esq + W_dir.'
			},
			{
				tag: '[PASSO 4: REITERAR]',
				desc: 'O novo nó pai passa a competir na esteira. Repita a fusão dos 2 menores até restar APENAS 1 NÓ (a Raiz).'
			},
			{
				tag: '[PASSO 5: TRANSMITIR - ENTER]',
				desc: 'Com a árvore 100% conectada (raiz consolidada), pressione [ENTER] para modular e disparar a transmissão.'
			}
		];

		steps.forEach((st, idx) => {
			const py = s2Y + 54 + idx * 40;
			ctx.fillStyle = '#e5a912';
			ctx.font = '900 14px "Courier New", monospace';
			ctx.fillText(st.tag, headX + 16, py);

			ctx.fillStyle = '#ffffff';
			ctx.font = '13.5px "Courier New", monospace';
			ctx.fillText(st.desc, headX + 270, py);
		});

		const s3Y = 568;
		const s3H = 488;
		ctx.fillStyle = '#080d0a';
		ctx.fillRect(headX, s3Y, headW, s3H);
		ctx.strokeStyle = '#273830';
		ctx.strokeRect(headX, s3Y, headW, s3H);

		ctx.fillStyle = '#15241d';
		ctx.fillRect(headX, s3Y, headW, 26);
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13.5px "Courier New", monospace';
		ctx.fillText('3. DIAGRAMA ESQUEMÁTICO ILUSTRADO DE FUSÃO E CODIFICAÇÃO BINÁRIA', headX + 14, s3Y + 18);

		const col1W = 540;
		ctx.fillStyle = '#0c1410';
		ctx.fillRect(headX + 14, s3Y + 38, col1W, s3H - 52);
		ctx.strokeStyle = '#1b2c24';
		ctx.strokeRect(headX + 14, s3Y + 38, col1W, s3H - 52);

		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.fillText('FILA DE PRIORIDADE: ESCOLHA DOS 2 MENORES', headX + 28, s3Y + 64);

		const drawNode = (x: number, y: number, label: string, freq: number, isMin: boolean) => {
			ctx.fillStyle = isMin ? '#2d1818' : '#14221b';
			ctx.strokeStyle = isMin ? '#ff4444' : '#00ffaa';
			ctx.lineWidth = isMin ? 2.5 : 1.5;
			ctx.beginPath();
			ctx.roundRect(x, y, 96, 52, 6);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = isMin ? '#ff6666' : '#00ffaa';
			ctx.font = '900 16px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(`'${label}'`, x + 48, y + 24);
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.fillText(`p:${freq}`, x + 48, y + 44);
			ctx.textAlign = 'left';
		};

		drawNode(headX + 35, s3Y + 88, 'A', 2, true);
		drawNode(headX + 155, s3Y + 88, 'B', 3, true);
		drawNode(headX + 275, s3Y + 88, 'C', 5, false);
		drawNode(headX + 395, s3Y + 88, 'D', 8, false);

		ctx.strokeStyle = '#ff4444';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(headX + 35, s3Y + 148);
		ctx.lineTo(headX + 35, s3Y + 162);
		ctx.lineTo(headX + 251, s3Y + 162);
		ctx.lineTo(headX + 251, s3Y + 148);
		ctx.stroke();

		ctx.fillStyle = '#ff5555';
		ctx.font = 'bold 12.5px "Courier New", monospace';
		ctx.fillText('▲ OS 2 MENORES PESOS SELECIONADOS ▲', headX + 48, s3Y + 180);

		ctx.strokeStyle = '#e5a912';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(headX + 143, s3Y + 192);
		ctx.lineTo(headX + 143, s3Y + 230);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(headX + 135, s3Y + 222);
		ctx.lineTo(headX + 143, s3Y + 234);
		ctx.lineTo(headX + 151, s3Y + 222);
		ctx.fill();

		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('[ESPAÇO] FUSÃO', headX + 160, s3Y + 218);

		ctx.fillStyle = '#1c2920';
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(headX + 85, s3Y + 242, 116, 54, 8);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#00ffaa';
		ctx.font = '900 15px "Courier New", monospace';
		ctx.fillText('PAI Σ [A+B]', headX + 96, s3Y + 266);
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.fillText('PESO: 2 + 3 = 5', headX + 96, s3Y + 286);

		ctx.fillStyle = '#8daaa0';
		ctx.font = '12px "Courier New", monospace';
		const c1Lines = [
			'O nó pai Σ (peso 5) é reinserido na fila.',
			'Agora os 2 menores são: Σ (5) e C (5).',
			'Fundem-se em nó de peso 10.',
			'Por fim, 10 e D (8) formam a Raiz (18).'
		];
		c1Lines.forEach((l, idx) => ctx.fillText(l, headX + 30, s3Y + 340 + idx * 24));

		const col2X = headX + 14 + col1W + 14;
		const col2W = headW - col1W - 42;
		ctx.fillStyle = '#0c1410';
		ctx.fillRect(col2X, s3Y + 38, col2W, s3H - 52);
		ctx.strokeStyle = '#1b2c24';
		ctx.strokeRect(col2X, s3Y + 38, col2W, s3H - 52);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 13px "Courier New", monospace';
		ctx.fillText('ÁRVORE DE HUFFMAN MONTADA & PREFIXOS', col2X + 20, s3Y + 64);

		const rx = col2X + 220;
		const ry = s3Y + 110;

		const drawCircleNode = (x: number, y: number, label: string, color: string) => {
			ctx.fillStyle = '#101a15';
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, 22, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = color;
			ctx.font = '900 13px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(label, x, y + 5);
			ctx.textAlign = 'left';
		};

		const drawBranch = (x1: number, y1: number, x2: number, y2: number, bit: '0' | '1') => {
			ctx.strokeStyle = '#3d614e';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();

			const mx = (x1 + x2) / 2;
			const my = (y1 + y2) / 2;
			ctx.fillStyle = bit === '0' ? '#12261a' : '#262012';
			ctx.strokeStyle = bit === '0' ? '#00ffaa' : '#e5a912';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(mx, my, 11, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = bit === '0' ? '#00ffaa' : '#e5a912';
			ctx.font = '900 12px "Courier New", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(bit, mx, my + 4);
			ctx.textAlign = 'left';
		};

		const dPos = { x: rx - 140, y: ry + 80 };
		const n10Pos = { x: rx + 140, y: ry + 80 };
		const cPos = { x: n10Pos.x - 90, y: n10Pos.y + 90 };
		const n5Pos = { x: n10Pos.x + 90, y: n10Pos.y + 90 };
		const aPos = { x: n5Pos.x - 55, y: n5Pos.y + 90 };
		const bPos = { x: n5Pos.x + 55, y: n5Pos.y + 90 };

		drawBranch(rx, ry + 22, dPos.x, dPos.y - 22, '0');
		drawBranch(rx, ry + 22, n10Pos.x, n10Pos.y - 22, '1');

		drawBranch(n10Pos.x, n10Pos.y + 22, cPos.x, cPos.y - 22, '0');
		drawBranch(n10Pos.x, n10Pos.y + 22, n5Pos.x, n5Pos.y - 22, '1');

		drawBranch(n5Pos.x, n5Pos.y + 22, aPos.x, aPos.y - 22, '0');
		drawBranch(n5Pos.x, n5Pos.y + 22, bPos.x, bPos.y - 22, '1');

		drawCircleNode(rx, ry, '18', '#e5a912');
		drawCircleNode(dPos.x, dPos.y, 'D:8', '#00ffaa');
		drawCircleNode(n10Pos.x, n10Pos.y, '10', '#7bb89a');
		drawCircleNode(cPos.x, cPos.y, 'C:5', '#00ffaa');
		drawCircleNode(n5Pos.x, n5Pos.y, '5', '#7bb89a');
		drawCircleNode(aPos.x, aPos.y, 'A:2', '#00ffaa');
		drawCircleNode(bPos.x, bPos.y, 'B:3', '#00ffaa');

		const tabX = col2X + 460;
		const tabY = s3Y + 80;
		ctx.fillStyle = '#101a15';
		ctx.fillRect(tabX, tabY, 360, 290);
		ctx.strokeStyle = '#273830';
		ctx.strokeRect(tabX, tabY, 360, 290);

		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 12.5px "Courier New", monospace';
		ctx.fillText('DICIONÁRIO DE PREFIXOS', tabX + 16, tabY + 26);

		ctx.fillStyle = '#8ea89a';
		ctx.font = 'bold 11.5px "Courier New", monospace';
		ctx.fillText('CHAR  FREQ  CÓDIGO    COMPRIMENTO', tabX + 16, tabY + 54);

		const codeTable = [
			{ char: 'D', f: 8, code: '0', len: '1 bit' },
			{ char: 'C', f: 5, code: '10', len: '2 bits' },
			{ char: 'A', f: 2, code: '110', len: '3 bits' },
			{ char: 'B', f: 3, code: '111', len: '3 bits' }
		];

		codeTable.forEach((ct, idx) => {
			const cty = tabY + 84 + idx * 28;
			ctx.fillStyle = '#00ffaa';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.fillText(`'${ct.char}'`, tabX + 22, cty);
			ctx.fillStyle = '#ffffff';
			ctx.fillText(`${ct.f}`, tabX + 90, cty);
			ctx.fillStyle = '#e5a912';
			ctx.fillText(`${ct.code}`, tabX + 155, cty);
			ctx.fillStyle = '#a8c2b5';
			ctx.fillText(`${ct.len}`, tabX + 250, cty);
		});

		ctx.fillStyle = 'rgba(0, 255, 170, 0.12)';
		ctx.fillRect(tabX + 12, tabY + 204, 336, 72);
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 1;
		ctx.strokeRect(tabX + 12, tabY + 204, 336, 72);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('ECONOMIA DE BITS BENTÔNICA:', tabX + 20, tabY + 226);
		ctx.fillStyle = '#ffffff';
		ctx.font = '11px "Courier New", monospace';
		ctx.fillText('ASCII BRUTO: 18 × 8 = 144 bits', tabX + 20, tabY + 246);
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('HUFFMAN: 31 bits [ -78.5% RUÍDO ]', tabX + 20, tabY + 266);

		const s4Y = 1066;
		const s4H = 162;
		ctx.fillStyle = '#1a0c0c';
		ctx.fillRect(headX, s4Y, headW, s4H);
		ctx.strokeStyle = '#ff3344';
		ctx.lineWidth = 2.5;
		ctx.strokeRect(headX, s4Y, headW, s4H);

		ctx.save();
		ctx.beginPath();
		ctx.rect(headX + 2, s4Y + 2, headW - 4, 18);
		ctx.clip();
		ctx.fillStyle = '#220808';
		ctx.fillRect(headX + 2, s4Y + 2, headW - 4, 18);
		ctx.fillStyle = '#ff4444';
		for (let x = -40; x < headW + 60; x += 30) {
			ctx.beginPath();
			ctx.moveTo(headX + x, s4Y + 2);
			ctx.lineTo(headX + x + 15, s4Y + 2);
			ctx.lineTo(headX + x - 2, s4Y + 20);
			ctx.lineTo(headX + x - 17, s4Y + 20);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();

		ctx.fillStyle = '#ff4444';
		ctx.font = '900 17px "Impact", "Arial Black", sans-serif';
		ctx.fillText('⚠ ADVERTÊNCIA DE COMBATE: O DESVIO GULOSO É FATAL ⚠', headX + 24, s4Y + 48);

		ctx.fillStyle = '#ffffff';
		ctx.font = '14px "Courier New", monospace';
		const warnLines = [
			'1. Se o operador fundir nós que NÃO sejam os dois de menor peso atual, a propriedade ótima é perdida.',
			'2. Cada bit excedente aumenta o pico sonoro em +3.2 dB, excitando as bio-antenas do Olho Colossal no abisso.',
			'3. Em caso de seleção incorreta: UTILIZE IMEDIATAMENTE [Z] (DESFAZER) OU [R] (REINICIAR ÁRVORE).',
			'4. NUNCA dispare o transmissor [ENTER] sem antes garantir a raiz única e a compressão mínima estipulada.'
		];
		warnLines.forEach((l, idx) => ctx.fillText(l, headX + 24, s4Y + 76 + idx * 24));

		const s5Y = 1238;
		const s5H = 250;
		ctx.fillStyle = '#0f1714';
		ctx.fillRect(headX, s5Y, headW, s5H);
		ctx.strokeStyle = '#273830';
		ctx.strokeRect(headX, s5Y, headW, s5H);

		ctx.fillStyle = '#15241d';
		ctx.fillRect(headX, s5Y, headW, 26);
		ctx.fillStyle = '#e5a912';
		ctx.font = 'bold 13.5px "Courier New", monospace';
		ctx.fillText('4. CONTROLES RÁPIDOS DA BANCADA DE COMUNICAÇÃO', headX + 14, s5Y + 18);

		const controls = [
			{ key: '[ESPAÇO]', desc: 'Fundir os dois nós selecionados em nó pai' },
			{ key: '[Z]', desc: 'Desfazer a última fusão realizada' },
			{ key: '[R]', desc: 'Reiniciar árvore completa para os nós iniciais' },
			{ key: '[ENTER]', desc: 'Disparar transmissão do pacote compactado' },
			{ key: '[F] / [C]', desc: 'Alternar foco nos Monitores CRT (Principal / Auxiliar)' },
			{ key: '[P]', desc: 'Inspecionar Pôster Naval de Segurança na antepara frontal' },
			{ key: '[H] / [ESC]', desc: 'Fechar compartimento de emergência e retornar ao assento' }
		];

		controls.forEach((c, idx) => {
			const cx = headX + (idx % 2 === 0 ? 24 : 740);
			const cy = s5Y + 54 + Math.floor(idx / 2) * 28;
			ctx.fillStyle = '#00ffaa';
			ctx.font = 'bold 14px "Courier New", monospace';
			ctx.fillText(c.key, cx, cy);
			ctx.fillStyle = '#ffffff';
			ctx.font = '13px "Courier New", monospace';
			ctx.fillText(c.desc, cx + 130, cy);
		});

		const divY = s5Y + 172;
		ctx.strokeStyle = '#273830';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(headX + 16, divY);
		ctx.lineTo(headX + headW - 16, divY);
		ctx.stroke();

		ctx.fillStyle = '#7a9688';
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.fillText('OFICIAL DE SISTEMAS ACÚSTICOS // VISTORIA HOMOLOGADA', headX + 24, divY + 24);
		ctx.fillText('ESTAÇÃO BENTÔNICA TARTARUS-V // ANTEPARA N-04 // 1982', headX + 24, divY + 44);

		ctx.fillStyle = '#3a6888';
		ctx.font = 'italic 900 17px "Georgia", "Times New Roman", serif';
		ctx.fillText('Cap. Ten. R. Vance', headX + 480, divY + 36);

		ctx.save();
		const sStampX = headX + headW - 180;
		const sStampY = divY + 34;
		ctx.translate(sStampX, sStampY);
		ctx.rotate(0.04);
		ctx.strokeStyle = '#2d8f68';
		ctx.lineWidth = 2;
		ctx.strokeRect(-90, -26, 180, 52);
		ctx.fillStyle = '#3eb587';
		ctx.font = 'bold 10px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('VISTORIA TÉCNICA', 0, -8);
		ctx.font = '900 13px "Arial Black", monospace';
		ctx.fillText('HOMOLOGADO', 0, 10);
		ctx.font = 'bold 9px "Courier New", monospace';
		ctx.fillText('SOP-82-HUF', 0, 22);
		ctx.restore();

		ctx.textAlign = 'right';
		ctx.fillStyle = '#00ffaa';
		ctx.font = '900 14px "Courier New", monospace';
		ctx.fillText('[ TECLA H OU ESC PARA FECHAR E RETORNAR ]', headX + headW - 24, s5Y + s5H - 14);

		return canvas;
	}
}

