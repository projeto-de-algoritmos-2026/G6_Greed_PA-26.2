/**
 * SUBWAVE - Submarine Cabin & CRT Terminal 3D Engine
 * Atmosfera: "Iron Lung / Claustrofobia Abissal" a 8.000m de profundidade
 * - Cabine de aço envolta em névoa densa e penumbra opressiva (FogExp2).
 * - Monitor CRT principal como fonte primária de luz verde diegética.
 * - Lâmpada de filamento amarelada fraca no teto com oscilação orgânica e falhas sob estresse acústico.
 * - Parede Esquerda: Medbag militar com o Manual de Huffman anexado (prancheta em alta definição legível).
 * - Parede Direita: Grande janela panorâmica de observação submarina com reforços de aço e o breu da fenda lá fora.
 * - Vigia circular frontal à esquerda com silhueta da entidade abissal cega.
 * - Console B (Monitor Secundário) em fósforo âmbar com teletipo e botão de foco dedicado.
 * - Câmera em ponto fixo no assento do operador com rotação suave (Pitch & Yaw) e zoom óptico.
 */

import * as THREE from 'three';
import { TerminalScreenCanvas, type TerminalScreenState, type ScreenActionCallback } from './terminalScreenCanvas';
import { AuxiliaryScreenCanvas, type AuxiliaryScreenState, type AuxActionCallback } from './auxiliaryScreenCanvas';
import type { ProceduralAudioEngine } from '../audio/soundscape';

export type WindowEventCategory = 1 | 2 | 3;

export type WindowEventType =
	| 'BIO_PULSES'
	| 'FLEEING_SWARM'
	| 'DISTANT_SILHOUETTE'
	| 'VENT_SPORES'
	| 'TOTAL_ECLIPSE'
	| 'CREATURE_FLANK'
	| 'SEGMENTED_TENTACLE'
	| 'DUAL_PASSING'
	| 'RAM_CHARGE'
	| 'QUARTZ_IMPACT'
	| 'SCRAPING_CLAWS'
	| 'PRESSURE_GROAN_CHARGE';

interface ActiveWindowEvent {
	type: WindowEventType;
	category: WindowEventCategory;
	duration: number;
	elapsed: number;
	stage: number;
}

export type CabinFocusTarget = 'main' | 'aux' | 'manual' | 'window' | 'poster' | 'none';
export type FocusChangeCallback = (target: CabinFocusTarget) => void;

export class Terminal3DManager {
	private onFocusChangeCb?: FocusChangeCallback;
	private container: HTMLElement;
	private canvas: HTMLCanvasElement;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;

	// Motor de Áudio Procedural Integrado
	private audioEngine: ProceduralAudioEngine | null = null;

	// Tela do Monitor CRT Principal (Console A - Verde P1)
	public terminalCanvas: TerminalScreenCanvas;
	private screenTexture: THREE.CanvasTexture;
	private screenMesh: THREE.Mesh | null = null;
	private currentScreenState: TerminalScreenState | null = null;

	// Tela do Monitor Secundário Auxiliar (Console B - Âmbar P3)
	public auxCanvas: AuxiliaryScreenCanvas;
	private auxTexture: THREE.CanvasTexture;
	private auxScreenMesh: THREE.Mesh | null = null;
	private auxMonitorGroup: THREE.Group;
	private currentAuxState: AuxiliaryScreenState | null = null;

	// Iluminação Claustrofóbica e Modo de Inspeção
	private ambientLight: THREE.AmbientLight;
	private dirFillLight: THREE.DirectionalLight;
	private ceilingLampLight: THREE.PointLight;
	private crtScreenLight: THREE.PointLight;
	private auxScreenLight: THREE.PointLight;
	private alarmBeaconLight: THREE.PointLight;
	private rearAlarmLight: THREE.PointLight | null = null;
	private isAlarmActive: boolean = false;
	private isInspectionMode: boolean = true;
	private impactGlitchTimer: number = 0;

	// Elementos da cabine
	private cabinGroup: THREE.Group;
	private monitorGroup: THREE.Group;
	private pressureNeedle: THREE.Mesh | null = null;
	private sonarNeedle: THREE.Mesh | null = null;
	private posterMesh: THREE.Group | null = null;

	// Parede Esquerda: Armário Médico Embutido na Antepara de Aço
	private medCabinetGroup: THREE.Group | null = null;
	private medCabinetDoorHinge: THREE.Group | null = null;
	private cabinetInteriorLight: THREE.PointLight | null = null;
	private manualMesh: THREE.Group | null = null;
	private isCabinetOpen: boolean = false;
	private currentDoorAngle: number = 0;
	private targetDoorAngle: number = 0;

	// Parede Direita: Grande Janela Panorâmica com Vidro de Quartzo & Atores Externos
	private rightWindowGroup: THREE.Group | null = null;
	private marineSnowRight: THREE.Points | null = null;
	private impactDecalMesh: THREE.Mesh | null = null;
	private scratchDecalMesh: THREE.Mesh | null = null;

	// Atores Visuais para os 3 Tipos de Eventos Raros na Janela
	private biolumLight: THREE.PointLight | null = null;
	private biolumOrganGroup: THREE.Group | null = null;
	private fleeingSwarm: THREE.Points | null = null;
	private fleeingSwarmVelocities: Float32Array | null = null;
	private distantSilhouette: THREE.Mesh | null = null;
	private distantSilhouette2: THREE.Mesh | null = null;
	private eclipseMesh: THREE.Mesh | null = null;
	private creatureFlankMesh: THREE.Mesh | null = null;
	private tentacleGroup: THREE.Group | null = null;
	private tentacleSegments: THREE.Group[] = [];
	private chargingCreatureMesh: THREE.Mesh | null = null;
	private clawAppendageGroup: THREE.Group | null = null;
	private ventSporeStream: THREE.Points | null = null;

	// Gerenciador de Eventos Raros da Janela (3 Categorias, Variados e Imprevisíveis)
	private nextWindowEventTimer: number = 25; // Primeiro evento entre 20-35s
	private activeWindowEvent: ActiveWindowEvent | null = null;
	private lastEventType: WindowEventType | null = null;

	// Otimização de Performance e Throttling
	private isMainScreenDirty: boolean = true;
	private isAuxScreenDirty: boolean = true;
	private lastHydrophoneTime: number = 0;
	private lastAuxBlinkTime: number = 0;

	// Agulhas e telemetria dos instrumentos
	private targetPressureDeg: number = 0.5;
	private targetSonarDeg: number = -0.8;
	private currentSonarDeg: number = -0.8;
	private currentProximity: number = 0;

	// Câmera em ponto fixo no assento do operador (Pitch & Yaw)
	private seatPosition = new THREE.Vector3(0, 0.72, 3.4);
	private currentYaw: number = 0;
	private currentPitch: number = -0.06;
	private targetYaw: number = 0;
	private targetPitch: number = -0.06;
	private currentFov: number = 54;
	private targetFov: number = 54;
	private isDragging: boolean = false;
	private lastPointerX: number = 0;
	private lastPointerY: number = 0;
	private pointerDownPos = new THREE.Vector2();

	private raycaster: THREE.Raycaster;
	private mouseNDC = new THREE.Vector2();

	private cameraShakeIntensity: number = 0;
	private animationFrameId: number = 0;
	private clock: THREE.Clock;

	constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
		this.container = container;
		this.canvas = canvas;

		const width = container.clientWidth || 800;
		const height = container.clientHeight || 600;

		// 1. Cena com Névoa Suave (Modo Inspeção Ativo)
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x0a141c);
		this.scene.fog = new THREE.FogExp2(0x0a141c, 0.035);

		// 2. Câmera Fixa no Ponto de Visão do Operador
		this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 60);
		this.camera.position.copy(this.seatPosition);
		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.currentYaw;
		this.camera.rotation.x = this.currentPitch;

		// 3. Renderizador WebGL otimizado
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			powerPreference: 'high-performance'
		});
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(1.0);

		// 4. Iluminação Elevada (Modo Inspeção Ativo por padrão)
		this.ambientLight = new THREE.AmbientLight(0x384855, 1.8);
		this.scene.add(this.ambientLight);

		this.dirFillLight = new THREE.DirectionalLight(0x607888, 0.9);
		this.dirFillLight.position.set(2, 4, 3);
		this.scene.add(this.dirFillLight);

		// Lâmpada de teto iluminando a cabine inteira
		this.ceilingLampLight = new THREE.PointLight(0xffeed0, 2.8, 22);
		this.ceilingLampLight.position.set(0, 2.7, 1.5);
		this.scene.add(this.ceilingLampLight);

		// Luz do fósforo verde do monitor CRT principal
		this.crtScreenLight = new THREE.PointLight(0x00ffaa, 3.5, 6.5);
		this.crtScreenLight.position.set(0, 0.45, 0.7);
		this.scene.add(this.crtScreenLight);

		// Luz do monitor secundário auxiliar (fósforo âmbar)
		this.auxScreenLight = new THREE.PointLight(0xffaa33, 2.2, 5.5);
		this.auxScreenLight.position.set(2.4, 0.35, 0.8);
		this.scene.add(this.auxScreenLight);

		// Luz de alarme estroboscópico vermelha na antepara frontal
		this.alarmBeaconLight = new THREE.PointLight(0xff1122, 0.0, 12);
		this.alarmBeaconLight.position.set(-2.8, 2.0, 0.2);
		this.scene.add(this.alarmBeaconLight);

		// Luz de alarme traseira na eclusa
		this.rearAlarmLight = new THREE.PointLight(0xff1122, 0.0, 10);
		this.rearAlarmLight.position.set(0, 2.38, 6.65);
		this.scene.add(this.rearAlarmLight);

		// 5. Canvas 2D da Tela do Monitor Principal (Console A - Verde P1)
		this.terminalCanvas = new TerminalScreenCanvas();
		this.screenTexture = new THREE.CanvasTexture(this.terminalCanvas.canvas);
		this.screenTexture.colorSpace = THREE.SRGBColorSpace;
		this.screenTexture.minFilter = THREE.LinearFilter;
		this.screenTexture.magFilter = THREE.LinearFilter;

		// 6. Canvas 2D do Monitor Secundário Auxiliar (Console B - Âmbar P3)
		this.auxCanvas = new AuxiliaryScreenCanvas();
		this.auxTexture = new THREE.CanvasTexture(this.auxCanvas.canvas);
		this.auxTexture.colorSpace = THREE.SRGBColorSpace;
		this.auxTexture.minFilter = THREE.LinearFilter;
		this.auxTexture.magFilter = THREE.LinearFilter;

		// 7. Grupos da Cena 3D
		this.cabinGroup = new THREE.Group();
		this.monitorGroup = new THREE.Group();
		this.auxMonitorGroup = new THREE.Group();
		this.scene.add(this.cabinGroup);
		this.scene.add(this.monitorGroup);
		this.scene.add(this.auxMonitorGroup);

		// 8. Constrói a Cabine, Monitores, Medbag com Manual e Janela Grande
		this.buildSubmarineCabin();
		this.buildCRTMonitor();
		this.buildAuxiliaryMonitor();

		// 9. Raycasting e Eventos
		this.raycaster = new THREE.Raycaster();
		this.clock = new THREE.Clock();

		this.setupInteractionListeners();
		this.animate();
	}

	private buildSubmarineCabin(): void {
		const steelWallMat = new THREE.MeshLambertMaterial({ color: 0x182026 });
		const darkRibMat = new THREE.MeshLambertMaterial({ color: 0x0e1317 });
		const darkPipeMat = new THREE.MeshLambertMaterial({ color: 0x1a2128 });
		const redValveMat = new THREE.MeshLambertMaterial({ color: 0x5a1414 });

		// 1. Piso e Teto Arqueado do Casco Cilíndrico
		this.buildCabinEnclosure(steelWallMat, darkRibMat);

		// 2. Antepara Frontal (Vigia do abismo, vigas e tubulação superior)
		this.buildFrontWall(steelWallMat, darkRibMat, darkPipeMat, redValveMat);

		// 3. Parede Esquerda (Medbag com Manual de Huffman e viga estrutural)
		this.buildLeftWall(steelWallMat, darkRibMat, darkPipeMat);

		// 4. Parede Direita (Grande Janela Panorâmica de Observação Submarina)
		this.buildRightWall(steelWallMat, darkRibMat, darkPipeMat);

		// 5. Parede Traseira (Escotilha Estanque de Saída com volante de travamento)
		this.buildRearWall(steelWallMat, darkRibMat, redValveMat);

		// 6. Mesa do Console do Operador com Manômetros
		this.buildConsoleDesk();
	}

	private buildCabinEnclosure(steelWallMat: THREE.Material, darkRibMat: THREE.Material): void {
		const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), darkRibMat);
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(0, -1.8, 2.3);
		this.cabinGroup.add(floor);

		const vault = new THREE.Mesh(
			new THREE.CylinderGeometry(5.2, 5.2, 9.6, 32, 1, true, Math.PI * 0.22, Math.PI * 0.56),
			steelWallMat
		);
		vault.rotation.x = Math.PI / 2;
		vault.position.set(0, -0.6, 2.3);
		this.cabinGroup.add(vault);

		for (const z of [-1.0, 1.0, 3.0, 5.0]) {
			const ribArch = new THREE.Mesh(
				new THREE.TorusGeometry(5.2, 0.08, 8, 24, Math.PI * 0.56),
				darkRibMat
			);
			ribArch.rotation.z = Math.PI * 0.22;
			ribArch.position.set(0, -0.6, z);
			this.cabinGroup.add(ribArch);
		}
	}

	private buildFrontWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		darkPipeMat: THREE.Material,
		redValveMat: THREE.Material
	): void {
		const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), steelWallMat);
		frontWall.position.set(0, 1.2, -2.4);
		this.cabinGroup.add(frontWall);

		for (let x = -4; x <= 4; x += 2.0) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.0, 0.12), darkRibMat);
			rib.position.set(x, 1.2, -2.34);
			this.cabinGroup.add(rib);
		}

		const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(12, 0.22, 0.12), darkRibMat);
		crossBeam.position.set(0, 2.2, -2.34);
		this.cabinGroup.add(crossBeam);

		// Gaiola industrial da lâmpada de teto
		const lampCage = new THREE.Mesh(
			new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8, 1, true),
			new THREE.MeshBasicMaterial({ color: 0x222a30, wireframe: true })
		);
		lampCage.position.set(0, 2.8, 1.5);

		const lampBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.09, 12, 12),
			new THREE.MeshBasicMaterial({ color: 0xffcc77 })
		);
		lampBulb.position.set(0, 2.74, 1.5);
		this.cabinGroup.add(lampCage, lampBulb);

		const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12, 16), darkPipeMat);
		pipe1.rotation.z = Math.PI / 2;
		pipe1.position.set(0, 2.55, -1.5);

		const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16), redValveMat);
		valveWheel.rotation.x = Math.PI / 2;
		valveWheel.position.set(-1.2, 2.55, -1.5);
		this.cabinGroup.add(pipe1, valveWheel);

		// Pôster corporativo distópico da HADAL DYNAMICS na antepara frontal esquerda
		this.buildDystopianPoster(darkRibMat);
	}

	/**
	 * Parede Esquerda: Antepara com vigas e ARMÁRIO MÉDICO METÁLICO EMBUTIDO
	 * Centralizado horizontalmente (Z = 2.30) e verticalmente (Y = 0.70)
	 * com porta articulada e o MANUAL TÉCNICO DE HUFFMAN no painel interno.
	 */
	private buildLeftWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		darkPipeMat: THREE.Material
	): void {
		const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		leftWall.position.set(-4.8, 0.7, 2.3);
		leftWall.rotation.y = Math.PI / 2;
		this.cabinGroup.add(leftWall);

		// Vigas estruturais espaçadas para emoldurar o armário médico no centro exato (z = 2.30)
		for (const z of [-1.2, 0.8, 3.8, 5.8]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.0, 0.16), darkRibMat);
			rib.position.set(-4.72, 0.7, z);
			this.cabinGroup.add(rib);
		}

		// Colunas de reforço estrutural que emolduram o nicho de fábrica do armário médico
		const leftFlankRib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.14), darkRibMat);
		leftFlankRib.position.set(-4.72, 0.70, 1.58);
		const rightFlankRib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.14), darkRibMat);
		rightFlankRib.position.set(-4.72, 0.70, 3.02);
		this.cabinGroup.add(leftFlankRib, rightFlankRib);

		// Tubulação única alta
		const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.4, 16), darkPipeMat);
		pipe.rotation.x = Math.PI / 2;
		pipe.position.set(-4.65, 2.45, 2.3);
		this.cabinGroup.add(pipe);

		// Constrói o Armário Médico Metálico Embutido perfeitamente centralizado
		this.buildEmbeddedMedCabinet(darkRibMat);
	}

	/**
	 * Constrói o Armário Médico Metálico Embutido na Antepara de Aço
	 * - Centralizado horizontalmente (z = 2.30) e verticalmente (y = 0.70).
	 * - Caixa metálica recessed com prateleira e suprimentos médicos 3D (frascos de vidro, ataduras, injetor).
	 * - Prancha técnica de emergência contendo o Manual de Huffman em alta resolução legível.
	 * - Porta de aço reforçada com dobradiça articulada interativa e luz de inspeção interna.
	 */
	private buildEmbeddedMedCabinet(darkRibMat: THREE.Material): void {
		const cabGroup = new THREE.Group();
		// Perfeitamente centralizado na antepara esquerda (Y = 0.70, Z = 2.30)
		cabGroup.position.set(-4.70, 0.70, 2.30);
		cabGroup.rotation.y = Math.PI / 2;

		const cabW = 1.22;
		const cabH = 1.62;
		const cabD = 0.32;

		const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x141a17 });
		const interiorMat = new THREE.MeshLambertMaterial({ color: 0x1f2723 });
		const borderMat = new THREE.MeshLambertMaterial({ color: 0x27342e });
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x4a5d54 });

		// 1. Moldura externa pesada de aço com flange aparafusada
		const topFrame = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.12, 0.08, 0.06), darkRibMat);
		topFrame.position.set(0, cabH / 2 + 0.04, cabD / 2);
		const botFrame = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.12, 0.08, 0.06), darkRibMat);
		botFrame.position.set(0, -cabH / 2 - 0.04, cabD / 2);
		const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, cabH + 0.16, 0.06), darkRibMat);
		leftFrame.position.set(-cabW / 2 - 0.04, 0, cabD / 2);
		const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, cabH + 0.16, 0.06), darkRibMat);
		rightFrame.position.set(cabW / 2 + 0.04, 0, cabD / 2);

		cabGroup.add(topFrame, botFrame, leftFrame, rightFrame);

		// Parafusos industriais na moldura externa
		const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 8);
		for (let i = 0; i <= 6; i++) {
			const bx = -cabW / 2 + (i / 6) * cabW;
			const bTop = new THREE.Mesh(boltGeo, boltMat);
			bTop.rotation.x = Math.PI / 2;
			bTop.position.set(bx, cabH / 2 + 0.04, cabD / 2 + 0.03);
			const bBot = new THREE.Mesh(boltGeo, boltMat);
			bBot.rotation.x = Math.PI / 2;
			bBot.position.set(bx, -cabH / 2 - 0.04, cabD / 2 + 0.03);
			cabGroup.add(bTop, bBot);
		}

		// 2. Caixa / Cavidade embutida na parede (Paredes interna, teto, fundo e chão)
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

		cabGroup.add(backWall, innerLeft, innerRight, innerTop, innerBot);

		// 3. Divisória de prateleira horizontal no terço superior
		const shelfY = 0.38;
		const shelf = new THREE.Mesh(new THREE.BoxGeometry(cabW - 0.02, 0.025, cabD - 0.04), borderMat);
		shelf.position.set(0, shelfY, cabD / 2);
		cabGroup.add(shelf);

		// Suportes angulares da prateleira
		const bracketGeo = new THREE.BoxGeometry(0.02, 0.08, 0.08);
		const brkL = new THREE.Mesh(bracketGeo, darkMetalMat);
		brkL.position.set(-cabW / 2 + 0.02, shelfY - 0.04, 0.12);
		const brkR = new THREE.Mesh(bracketGeo, darkMetalMat);
		brkR.position.set(cabW / 2 - 0.02, shelfY - 0.04, 0.12);
		cabGroup.add(brkL, brkR);

		// 4. Suprimentos Médicos 3D na Prateleira Superior
		const bottleMat = new THREE.MeshLambertMaterial({ color: 0x995522 });
		const stopperMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
		for (const [bx, bz, bHeight] of [
			[-0.42, 0.16, 0.15],
			[-0.30, 0.18, 0.18],
			[-0.18, 0.14, 0.13]
		]) {
			const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, bHeight, 12), bottleMat);
			bottle.position.set(bx, shelfY + bHeight / 2 + 0.015, bz);
			const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.035, 10), stopperMat);
			stopper.position.set(bx, shelfY + bHeight + 0.03, bz);
			cabGroup.add(bottle, stopper);
		}

		// Rolos de atadura esterilizada de algodão
		const bandageMat = new THREE.MeshLambertMaterial({ color: 0xd8d4c6 });
		for (const [bx, bz] of [[0.06, 0.16], [0.18, 0.16]]) {
			const bandage = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.09, 16), bandageMat);
			bandage.rotation.z = Math.PI / 2;
			bandage.position.set(bx, shelfY + 0.05, bz);
			cabGroup.add(bandage);
		}

		// Estojo de auto-injetor de emergência (atropina / adrenalina)
		const injectorCase = new THREE.Mesh(
			new THREE.BoxGeometry(0.24, 0.06, 0.14),
			new THREE.MeshLambertMaterial({ color: 0x2d3a33 })
		);
		injectorCase.position.set(0.40, shelfY + 0.03, 0.16);
		const injectorStripe = new THREE.Mesh(
			new THREE.BoxGeometry(0.242, 0.02, 0.142),
			new THREE.MeshLambertMaterial({ color: 0xaa2222 })
		);
		injectorStripe.position.set(0.40, shelfY + 0.03, 0.16);
		cabGroup.add(injectorCase, injectorStripe);

		// 5. O MANUAL DE HUFFMAN (Prancha Lâminada Metálica de Emergência no Compartimento Principal)
		const manualGroup = new THREE.Group();
		manualGroup.position.set(0, -0.22, 0.03);

		const boardMat = new THREE.MeshLambertMaterial({ color: 0x161e1a });
		const board = new THREE.Mesh(new THREE.BoxGeometry(1.10, 1.10, 0.025), boardMat);

		// Textura em altíssima resolução do Manual de Huffman
		const manualCanvas = this.createHuffmanManualCanvas();
		const manualTexture = new THREE.CanvasTexture(manualCanvas);
		manualTexture.colorSpace = THREE.SRGBColorSpace;
		manualTexture.minFilter = THREE.LinearFilter;
		manualTexture.magFilter = THREE.LinearFilter;

		const manualSheet = new THREE.Mesh(
			new THREE.PlaneGeometry(1.05, 1.05),
			new THREE.MeshBasicMaterial({ map: manualTexture })
		);
		manualSheet.position.set(0, 0, 0.015);

		// Parafusos nos 4 cantos da prancha técnica
		for (const cx of [-0.50, 0.50]) {
			for (const cy of [-0.50, 0.50]) {
				const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8), boltMat);
				sc.rotation.x = Math.PI / 2;
				sc.position.set(cx, cy, 0.02);
				manualGroup.add(sc);
			}
		}

		manualGroup.add(board, manualSheet);
		manualGroup.userData = { isManual: true, isCabinet: true };
		this.manualMesh = manualGroup;
		cabGroup.add(manualGroup);

		// 6. Luminária de Inspeção Interna do Armário
		const lampCap = new THREE.Mesh(
			new THREE.CylinderGeometry(0.04, 0.05, 0.03, 12),
			new THREE.MeshLambertMaterial({ color: 0x222222 })
		);
		lampCap.position.set(0, cabH / 2 - 0.02, cabD / 2);
		const lampBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.028, 12, 12),
			new THREE.MeshBasicMaterial({ color: 0xfffae0 })
		);
		lampBulb.position.set(0, cabH / 2 - 0.04, cabD / 2);
		cabGroup.add(lampCap, lampBulb);

		this.cabinetInteriorLight = new THREE.PointLight(0xfffae0, 0.0, 3.0);
		this.cabinetInteriorLight.position.set(0, cabH / 2 - 0.05, cabD / 2);
		cabGroup.add(this.cabinetInteriorLight);

		// 7. Porta Articulada de Aço do Armário (Hinged Metal Locker Door)
		this.medCabinetDoorHinge = new THREE.Group();
		// Pivô na borda esquerda externa
		this.medCabinetDoorHinge.position.set(-cabW / 2, 0, cabD);

		const doorGroup = new THREE.Group();
		doorGroup.position.set(cabW / 2, 0, 0); // Desloca para que o pivô gire na ponta

		const doorMat = new THREE.MeshLambertMaterial({ color: 0x1d2722 });
		const doorBody = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, 0.035), doorMat);

		// Friso chanfrado da porta
		const panelBevel = new THREE.Mesh(
			new THREE.BoxGeometry(cabW - 0.12, cabH - 0.12, 0.04),
			new THREE.MeshLambertMaterial({ color: 0x17211c })
		);

		// Cruz Vermelha Médica Metálica em Relevo na Face Externa
		const crossMat = new THREE.MeshLambertMaterial({ color: 0xb51a1a });
		const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.015), crossMat);
		crossV.position.set(0, 0.15, 0.025);
		const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.015), crossMat);
		crossH.position.set(0, 0.15, 0.026);

		// Tranca mecânica industrial rotativa com volante
		const lockMat = new THREE.MeshLambertMaterial({ color: 0x3a4b42 });
		const lockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), lockMat);
		lockBase.rotation.x = Math.PI / 2;
		lockBase.position.set(cabW / 2 - 0.14, 0, 0.03);

		const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.02), lockMat);
		handleBar.position.set(cabW / 2 - 0.14, 0, 0.05);

		// Dobradiças visíveis na esquerda
		const hingeMat = new THREE.MeshLambertMaterial({ color: 0x111613 });
		for (const hy of [-0.55, 0, 0.55]) {
			const hingeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 12), hingeMat);
			hingeMesh.position.set(-cabW / 2 + 0.015, hy, 0);
			doorGroup.add(hingeMesh);
		}

		// Placa de Estêncil Militar na Porta
		const signCanvas = document.createElement('canvas');
		signCanvas.width = 512;
		signCanvas.height = 128;
		const sctx = signCanvas.getContext('2d')!;
		sctx.fillStyle = '#121815';
		sctx.fillRect(0, 0, 512, 128);
		sctx.strokeStyle = '#c48b2c';
		sctx.lineWidth = 4;
		sctx.strokeRect(10, 10, 492, 108);

		sctx.fillStyle = '#ffaa33';
		sctx.font = 'bold 22px "Courier New", monospace';
		sctx.textAlign = 'center';
		sctx.fillText('POSTO MÉDICO DE ANTEPARA #04', 256, 42);

		sctx.fillStyle = '#e8dcc4';
		sctx.font = '16px "Courier New", monospace';
		sctx.fillText('DIRETRIZ HUFFMAN & PRIMEIROS SOCORROS', 256, 74);

		sctx.fillStyle = '#00ffaa';
		sctx.font = 'bold 15px "Courier New", monospace';
		sctx.fillText('[ CLIQUE OU TECLA H PARA ABRIR ]', 256, 102);

		const stencilSign = new THREE.Mesh(
			new THREE.PlaneGeometry(0.85, 0.21),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
		);
		stencilSign.position.set(0, -0.35, 0.025);

		doorGroup.add(doorBody, panelBevel, crossV, crossH, lockBase, handleBar, stencilSign);
		doorGroup.userData = { isCabinetDoor: true, isCabinet: true };

		this.medCabinetDoorHinge.add(doorGroup);
		cabGroup.add(this.medCabinetDoorHinge);

		// Placa indicadora alta na antepara acima do armário
		const headerCanvas = document.createElement('canvas');
		headerCanvas.width = 512;
		headerCanvas.height = 64;
		const hctx = headerCanvas.getContext('2d')!;
		hctx.fillStyle = '#0a100d';
		hctx.fillRect(0, 0, 512, 64);
		hctx.font = 'bold 22px "Courier New", monospace';
		hctx.fillStyle = '#ffaa33';
		hctx.textAlign = 'center';
		hctx.fillText('ARMÁRIO MÉDICO // MANUAL DE HUFFMAN [H]', 256, 40);

		const wallSign = new THREE.Mesh(
			new THREE.PlaneGeometry(1.4, 0.18),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(headerCanvas) })
		);
		wallSign.position.set(0, cabH / 2 + 0.20, cabD / 2);
		cabGroup.add(wallSign);

		cabGroup.userData = { isCabinet: true };
		this.medCabinetGroup = cabGroup;
		this.cabinGroup.add(cabGroup);
	}

	/**
	 * Gera o documento de instruções do Manual de Huffman em Canvas 2D
	 */
	private createHuffmanManualCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 1024;
		const ctx = canvas.getContext('2d')!;

		// Papel envelhecido militar
		ctx.fillStyle = '#1c1812';
		ctx.fillRect(0, 0, 1024, 1024);

		ctx.strokeStyle = '#8a6d3b';
		ctx.lineWidth = 6;
		ctx.strokeRect(24, 24, 976, 976);

		// Tarja de cabeçalho militar de emergência
		ctx.fillStyle = '#4a1212';
		ctx.fillRect(30, 30, 964, 90);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 34px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('DIRETRIZ DE EMERGÊNCIA // CODIFICAÇÃO HUFFMAN', 512, 70);
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.fillStyle = '#ffaaaa';
		ctx.fillText('ESTAÇÃO TARTARUS-V // PROTOCOLO DE SILÊNCIO ACÚSTICO A 8.000M', 512, 102);

		ctx.strokeStyle = '#8a6d3b';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(40, 140);
		ctx.lineTo(984, 140);
		ctx.stroke();

		// Seção 1: O Perigo da Transmissão
		ctx.textAlign = 'left';
		ctx.fillStyle = '#ffaa33';
		ctx.font = 'bold 24px "Courier New", monospace';
		ctx.fillText('1. AMEAÇA BIOLÓGICA & EMISSÃO EM DECIBÉIS', 50, 180);

		ctx.fillStyle = '#e8dcc4';
		ctx.font = '19px "Courier New", monospace';
		ctx.fillText('• O sonar bruto em ASCII de 8 bits emite pulsos sonoros contínuos.', 60, 215);
		ctx.fillText('• A entidade cega caça por ecolocalização através de cada bit transmitido.', 60, 245);
		ctx.fillText('• Para sobreviver, o operador DEVE construir a árvore de prefixos mínima.', 60, 275);

		// Seção 2: O Algoritmo Guloso (David Huffman, 1952)
		ctx.fillStyle = '#ffaa33';
		ctx.font = 'bold 24px "Courier New", monospace';
		ctx.fillText('2. REGRA DA ESCOLHA GULOSA (GREEDY CHOICE)', 50, 330);

		ctx.fillStyle = '#e8dcc4';
		ctx.font = '19px "Courier New", monospace';
		ctx.fillText('• A cada etapa, examine os nós disponíveis na BANDEJA de caracteres.', 60, 365);
		ctx.fillText('• SELECIONE RIGOROSAMENTE OS DOIS NÓS COM AS MENORES FREQUÊNCIAS.', 60, 395);
		ctx.fillText('• Pressione [ESPAÇO] para fundi-los em um novo nó pai (peso somado).', 60, 425);
		ctx.fillText('• Repita o processo até restar apenas UMA raiz (árvore completa).', 60, 455);

		// Caixa de Alerta destacada
		ctx.fillStyle = 'rgba(100, 20, 20, 0.5)';
		ctx.fillRect(50, 485, 924, 120);
		ctx.strokeStyle = '#ff3344';
		ctx.lineWidth = 2;
		ctx.strokeRect(50, 485, 924, 120);

		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 22px "Courier New", monospace';
		ctx.fillText('⚠ ATENÇÃO: DESVIOS DA ESCOLHA GULOSA SÃO FATAIS ⚠', 70, 525);
		ctx.fillStyle = '#ffffff';
		ctx.font = '18px "Courier New", monospace';
		ctx.fillText('Qualquer fusão subótima aumenta o comprimento ponderado da árvore,', 70, 558);
		ctx.fillText('gerando decibéis excessivos no sonar que alertam imediatamente a entidade.', 70, 585);

		// Seção 3: Atribuição dos Bits
		ctx.fillStyle = '#ffaa33';
		ctx.font = 'bold 24px "Courier New", monospace';
		ctx.fillText('3. CODIFICAÇÃO BINÁRIA DOS RAMOS', 50, 645);

		ctx.fillStyle = '#e8dcc4';
		ctx.font = '19px "Courier New", monospace';
		ctx.fillText('• Filho Esquerdo = BIT 0 | Filho Direito = BIT 1', 60, 680);
		ctx.fillText('• Caracteres mais frequentes ficam próximos da raiz (código curto).', 60, 710);
		ctx.fillText('• Caracteres raros ficam nas profundezas da árvore (código longo).', 60, 740);

		// Diagrama ilustrado rápido
		ctx.fillStyle = '#0f241a';
		ctx.fillRect(50, 770, 924, 160);
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(50, 770, 924, 160);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.fillText('EXEMPLO GULOSO: Nós A (freq 2) e B (freq 3) ➔ PAI Σ (peso 5)', 70, 810);
		ctx.fillStyle = '#aaddcc';
		ctx.font = '17px "Courier New", monospace';
		ctx.fillText('            [ Σ (5) ]', 70, 850);
		ctx.fillText('           /         \\', 70, 875);
		ctx.fillText('       (0)/           \\(1)', 70, 900);
		ctx.fillText('      [ A:2 ]       [ B:3 ]', 70, 920);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
		ctx.font = '14px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('MANUAL DE SOBREVIVÊNCIA // GUARDE ESTE DOCUMENTO NO ARMÁRIO MÉDICO // SETOR 04', 512, 975);

		return canvas;
	}

	/**
	 * Parede Direita: Bulkhead com GRANDE JANELA PANORÂMICA REFORÇADA
	 */
	private buildRightWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		darkPipeMat: THREE.Material
	): void {
		const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		rightWall.position.set(4.8, 0.7, 2.3);
		rightWall.rotation.y = -Math.PI / 2;
		this.cabinGroup.add(rightWall);

		for (const z of [-1.0, 0.8, 2.6, 4.4, 6.2]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.0, 0.16), darkRibMat);
			rib.position.set(4.72, 0.7, z);
			this.cabinGroup.add(rib);
		}

		// Tubo elétrico preto no topo
		const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 9.4, 12), darkPipeMat);
		cable.rotation.x = Math.PI / 2;
		cable.position.set(4.68, 2.5, 2.3);
		this.cabinGroup.add(cable);

		// Constrói a GRANDE JANELA PANORÂMICA REFORÇADA COM EVENTOS RAROS
		this.buildLargeRightObservationWindow(darkRibMat);
	}

	/**
	 * Constrói a Grande Janela Panorâmica de Observação na Parede da Direita (4.2m x 2.4m)
	 * - Vigas estruturais maciças de aço com reforços verticais contra 800+ ATM de pressão.
	 * - Vidro laminado espesso de quartzo com camadas para decalques de fissura de impacto e arranhões de garras.
	 * - Atores visuais do abismo para os 3 tipos de eventos assustadores raros.
	 */
	private buildLargeRightObservationWindow(darkRibMat: THREE.Material): void {
		const winGroup = new THREE.Group();
		// Alinhada frontalmente com a visão lateral do operador em z = 1.45
		winGroup.position.set(4.75, 0.95, 1.45);
		winGroup.rotation.y = -Math.PI / 2;

		const winW = 4.2;
		const winH = 2.4;
		const frameThick = 0.20;
		const frameDepth = 0.22;

		// 1. Moldura retangular externa pesada de aço com chanfros
		const topBar = new THREE.Mesh(new THREE.BoxGeometry(winW, frameThick, frameDepth), darkRibMat);
		topBar.position.set(0, winH / 2, 0);

		const botBar = new THREE.Mesh(new THREE.BoxGeometry(winW, frameThick, frameDepth), darkRibMat);
		botBar.position.set(0, -winH / 2, 0);

		const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), darkRibMat);
		leftBar.position.set(-winW / 2, 0, 0);

		const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), darkRibMat);
		rightBar.position.set(winW / 2, 0, 0);

		// 2 Montantes verticais de reforço de alta pressão (divide a janela em 3 panoramas)
		const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, winH, frameDepth - 0.04), darkRibMat);
		rib1.position.set(-winW / 3, 0, 0.01);

		const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, winH, frameDepth - 0.04), darkRibMat);
		rib2.position.set(winW / 3, 0, 0.01);

		// Travessa horizontal central com parafusos
		const horizRib = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.12, frameDepth - 0.06), darkRibMat);
		horizRib.position.set(0, 0, 0.01);

		winGroup.add(topBar, botBar, leftBar, rightBar, rib1, rib2, horizRib);

		// Parafusos industriais na moldura
		const boltGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.08, 8);
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x3a4852 });
		for (let i = 0; i <= 10; i++) {
			const bx = -winW / 2 + (i / 10) * winW;
			const boltT = new THREE.Mesh(boltGeo, boltMat);
			boltT.rotation.x = Math.PI / 2;
			boltT.position.set(bx, winH / 2, 0.10);
			const boltB = new THREE.Mesh(boltGeo, boltMat);
			boltB.rotation.x = Math.PI / 2;
			boltB.position.set(bx, -winH / 2, 0.10);
			winGroup.add(boltT, boltB);
		}

		// 2. Vidro de Quartzo Espesso Reforçado (80mm)
		const glass = new THREE.Mesh(
			new THREE.PlaneGeometry(winW - 0.06, winH - 0.06),
			new THREE.MeshLambertMaterial({
				color: 0x01141c,
				transparent: true,
				opacity: 0.88,
				depthWrite: false
			})
		);
		glass.position.set(0, 0, 0);
		winGroup.add(glass);

		// 3. Decalque Dinâmico de Impacto/Fissura no Quartzo (QUARTZ_IMPACT)
		const impactTexture = this.createImpactTexture();
		this.impactDecalMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(1.6, 1.6),
			new THREE.MeshBasicMaterial({
				map: impactTexture,
				transparent: true,
				opacity: 0.0,
				depthWrite: false
			})
		);
		this.impactDecalMesh.position.set(0, 0.1, 0.01);
		winGroup.add(this.impactDecalMesh);

		// 4. Decalque Dinâmico de Arranhões de Garras (SCRAPING_CLAWS)
		const scratchTexture = this.createScratchTexture();
		this.scratchDecalMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(1.8, 1.8),
			new THREE.MeshBasicMaterial({
				map: scratchTexture,
				transparent: true,
				opacity: 0.0,
				depthWrite: false
			})
		);
		this.scratchDecalMesh.position.set(0.35, -0.1, 0.01);
		winGroup.add(this.scratchDecalMesh);

		// 5. Breu do Oceano Profundo no Exterior
		const oceanBackdrop = new THREE.Mesh(
			new THREE.PlaneGeometry(24, 16),
			new THREE.MeshBasicMaterial({ color: 0x000204 })
		);
		oceanBackdrop.position.set(0, 0, -11.0);
		winGroup.add(oceanBackdrop);

		// 6. Neve Marinha Flutuante da Janela Direita
		const pCount = 160;
		const pGeo = new THREE.BufferGeometry();
		const pPos = new Float32Array(pCount * 3);
		for (let i = 0; i < pCount * 3; i += 3) {
			pPos[i] = (Math.random() - 0.5) * (winW + 1.5);
			pPos[i + 1] = (Math.random() - 0.5) * (winH + 1.5);
			pPos[i + 2] = -0.3 - Math.random() * 4.0;
		}
		pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
		this.marineSnowRight = new THREE.Points(
			pGeo,
			new THREE.PointsMaterial({ color: 0x00ffcc, size: 0.03, transparent: true, opacity: 0.45 })
		);
		winGroup.add(this.marineSnowRight);

		// ==========================================
		// ATORES VISUAIS EXTERNOS PARA OS 3 TIPOS DE EVENTOS
		// ==========================================

		// Categoria 1: Luz Bioluminescente e Órgãos Emissores
		this.biolumLight = new THREE.PointLight(0x00e5ff, 0.0, 9.0);
		this.biolumLight.position.set(0, 0, -3.0);
		winGroup.add(this.biolumLight);

		this.biolumOrganGroup = new THREE.Group();
		this.biolumOrganGroup.visible = false;
		const organMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
		for (const [ox, oy, oz] of [
			[-0.4, 0.1, -3.2],
			[0.2, -0.2, -3.5],
			[-0.1, 0.35, -4.0],
			[0.5, 0.15, -3.8]
		]) {
			const organMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), organMat);
			organMesh.position.set(ox, oy, oz);
			this.biolumOrganGroup.add(organMesh);
		}
		winGroup.add(this.biolumOrganGroup);

		// Categoria 1: Cardume em Fuga Súbita (FLEEING_SWARM)
		const swarmCount = 140;
		const swarmGeo = new THREE.BufferGeometry();
		const swarmPos = new Float32Array(swarmCount * 3);
		this.fleeingSwarmVelocities = new Float32Array(swarmCount * 3);
		for (let i = 0; i < swarmCount; i++) {
			swarmPos[i * 3] = (Math.random() - 0.5) * 4.0;
			swarmPos[i * 3 + 1] = (Math.random() - 0.5) * 2.0;
			swarmPos[i * 3 + 2] = -0.5 - Math.random() * 2.5;

			this.fleeingSwarmVelocities[i * 3] = -4.5 - Math.random() * 3.5;
			this.fleeingSwarmVelocities[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
			this.fleeingSwarmVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
		}
		swarmGeo.setAttribute('position', new THREE.BufferAttribute(swarmPos, 3));
		this.fleeingSwarm = new THREE.Points(
			swarmGeo,
			new THREE.PointsMaterial({ color: 0x00ffcc, size: 0.035, transparent: true, opacity: 0.0 })
		);
		winGroup.add(this.fleeingSwarm);

		// Categoria 1: Erupção de Esporos Hidrotermais (VENT_SPORES)
		const sporeCount = 100;
		const sporeGeo = new THREE.BufferGeometry();
		const sporePos = new Float32Array(sporeCount * 3);
		for (let i = 0; i < sporeCount * 3; i += 3) {
			sporePos[i] = (Math.random() - 0.5) * 2.5;
			sporePos[i + 1] = -2.5 + Math.random() * 4.5;
			sporePos[i + 2] = -0.2 - Math.random() * 1.2;
		}
		sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3));
		this.ventSporeStream = new THREE.Points(
			sporeGeo,
			new THREE.PointsMaterial({ color: 0x55ffaa, size: 0.04, transparent: true, opacity: 0.0 })
		);
		winGroup.add(this.ventSporeStream);

		// Categoria 1 & 2: Silhuetas de Leviatã no Fundo (DISTANT_SILHOUETTE / DUAL_PASSING)
		const distGeo = new THREE.CylinderGeometry(0.75, 0.25, 9.5, 12);
		distGeo.rotateZ(Math.PI / 2);
		distGeo.scale(1.5, 0.9, 0.35);

		this.distantSilhouette = new THREE.Mesh(
			distGeo,
			new THREE.MeshBasicMaterial({ color: 0x010406, transparent: true, opacity: 0.0 })
		);
		this.distantSilhouette.position.set(-6.5, 0.2, -6.5);

		this.distantSilhouette2 = new THREE.Mesh(
			distGeo.clone(),
			new THREE.MeshBasicMaterial({ color: 0x010406, transparent: true, opacity: 0.0 })
		);
		this.distantSilhouette2.position.set(6.5, -0.3, -4.5);
		winGroup.add(this.distantSilhouette, this.distantSilhouette2);

		// Categoria 2: Eclipse Total da Janela por Corpo Colossal (TOTAL_ECLIPSE)
		this.eclipseMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(7.5, 4.2),
			new THREE.MeshBasicMaterial({ color: 0x000203, transparent: true, opacity: 0.0 })
		);
		this.eclipseMesh.position.set(-5.5, 0, -0.32);
		winGroup.add(this.eclipseMesh);

		// Categoria 2: Flanco Imenso com Poros Bioluminescentes (CREATURE_FLANK)
		const flankGeo = new THREE.CylinderGeometry(1.4, 1.4, 7.5, 16);
		flankGeo.rotateZ(Math.PI / 2);
		this.creatureFlankMesh = new THREE.Mesh(
			flankGeo,
			new THREE.MeshLambertMaterial({ color: 0x02070a, transparent: true, opacity: 0.0 })
		);
		this.creatureFlankMesh.position.set(5.5, 0, -0.55);
		winGroup.add(this.creatureFlankMesh);

		// Categoria 2: Tentáculo Segmentado Abissal (SEGMENTED_TENTACLE)
		this.tentacleGroup = new THREE.Group();
		this.tentacleGroup.position.set(0.3, 2.5, -0.38);
		this.tentacleGroup.visible = false;

		const segMat = new THREE.MeshLambertMaterial({ color: 0x071110 });
		let parentObj: THREE.Object3D = this.tentacleGroup;
		this.tentacleSegments = [];

		for (let s = 0; s < 6; s++) {
			const segGroup = new THREE.Group();
			const segLength = 0.38;
			const radiusTop = 0.20 - s * 0.026;
			const radiusBot = 0.17 - s * 0.026;
			const segMesh = new THREE.Mesh(
				new THREE.CylinderGeometry(radiusBot, radiusTop, segLength, 12),
				segMat
			);
			segMesh.position.set(0, -segLength / 2, 0);
			segGroup.add(segMesh);

			// Anel de ventosa
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(radiusTop * 0.85, 0.016, 6, 12),
				new THREE.MeshLambertMaterial({ color: 0x142822 })
			);
			ring.rotation.x = Math.PI / 2;
			ring.position.set(0, -segLength / 2, radiusTop * 0.8);
			segGroup.add(ring);

			parentObj.add(segGroup);
			this.tentacleSegments.push(segGroup);
			if (s > 0) {
				segGroup.position.set(0, -segLength, 0);
			}
			parentObj = segGroup;
		}
		winGroup.add(this.tentacleGroup);

		// Categoria 3: Investida em Alta Velocidade Contra a Janela (RAM_CHARGE)
		const chargeGeo = new THREE.ConeGeometry(0.85, 4.5, 12);
		chargeGeo.rotateX(Math.PI / 2);
		this.chargingCreatureMesh = new THREE.Mesh(
			chargeGeo,
			new THREE.MeshLambertMaterial({ color: 0x010507, transparent: true, opacity: 0.0 })
		);
		this.chargingCreatureMesh.position.set(0, 0, -9.0);
		winGroup.add(this.chargingCreatureMesh);

		// Categoria 3: Garras Arrastando no Vidro (SCRAPING_CLAWS)
		this.clawAppendageGroup = new THREE.Group();
		this.clawAppendageGroup.position.set(0.35, 2.0, -0.06);
		this.clawAppendageGroup.visible = false;

		const clawMat = new THREE.MeshLambertMaterial({ color: 0x1c2b25 });
		const armJoint = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.50, 0.08), clawMat);
		armJoint.position.set(0, 0.25, 0);
		this.clawAppendageGroup.add(armJoint);

		for (const ox of [-0.09, 0, 0.09]) {
			const clawFinger = new THREE.Mesh(
				new THREE.ConeGeometry(0.026, 0.35, 8),
				new THREE.MeshLambertMaterial({ color: 0x2e4a40 })
			);
			clawFinger.rotation.x = -Math.PI / 2 + 0.3;
			clawFinger.position.set(ox, 0, 0.05);
			this.clawAppendageGroup.add(clawFinger);
		}
		winGroup.add(this.clawAppendageGroup);

		winGroup.userData = { isRightWindow: true };
		this.rightWindowGroup = winGroup;
		this.cabinGroup.add(winGroup);
	}

	/**
	 * Gera textura procedural do estalo e microfraturas de impacto no quartzo
	 */
	private createImpactTexture(): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, 512, 512);

		const cx = 256;
		const cy = 256;

		// Centro esbranquiçado de microfraturas
		const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 140);
		grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
		grad.addColorStop(0.25, 'rgba(180, 240, 255, 0.7)');
		grad.addColorStop(0.6, 'rgba(80, 190, 210, 0.3)');
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, 140, 0, Math.PI * 2);
		ctx.fill();

		// Fissuras radiais em teia de aranha
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.lineWidth = 3;
		const rays = 16;
		for (let i = 0; i < rays; i++) {
			const angle = (i / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			let r = 0;
			let curX = cx;
			let curY = cy;
			while (r < 220) {
				r += 25 + Math.random() * 35;
				curX = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 20;
				curY = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 20;
				ctx.lineTo(curX, curY);
			}
			ctx.stroke();
		}

		// Anéis concêntricos fraturados
		for (const rad of [40, 85, 140, 190]) {
			ctx.beginPath();
			ctx.arc(cx, cy, rad, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(200, 245, 255, ${0.8 - rad / 300})`;
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	}

	/**
	 * Gera textura procedural das marcas de garras arranhando o quartzo
	 */
	private createScratchTexture(): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, 512, 512);

		// 4 ranhuras irregulares de garras paralelas
		const clawOffsets = [-75, -25, 25, 75];
		for (const ox of clawOffsets) {
			ctx.beginPath();
			ctx.moveTo(256 + ox, 40);
			let curY = 40;
			let curX = 256 + ox;
			while (curY < 470) {
				curY += 20 + Math.random() * 25;
				curX += (Math.random() - 0.5) * 16;
				ctx.lineTo(curX, curY);
			}
			ctx.strokeStyle = 'rgba(210, 255, 240, 0.9)';
			ctx.lineWidth = 5;
			ctx.stroke();

			// Halo de bioluminescência / atrito aquático
			ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
			ctx.lineWidth = 14;
			ctx.stroke();
		}

		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	}

	private buildRearWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		redValveMat: THREE.Material
	): void {
		const rearWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		rearWall.position.set(0, 0.7, 7.0);
		rearWall.rotation.y = Math.PI;
		this.cabinGroup.add(rearWall);

		const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.25, 0.16), darkRibMat);
		crossBeam.position.set(0, 2.3, 6.92);
		this.cabinGroup.add(crossBeam);

		for (const x of [-1.8, 1.8]) {
			const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.0, 0.18), darkRibMat);
			pillar.position.set(x, 0.7, 6.9);
			this.cabinGroup.add(pillar);
		}

		// Escotilha estanque pesada
		const airlockGroup = new THREE.Group();
		airlockGroup.position.set(0, 0.65, 6.84);
		airlockGroup.rotation.y = Math.PI;

		const frame = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.14, 16, 32), darkRibMat);
		const door = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 32), steelWallMat);
		door.rotation.x = Math.PI / 2;

		const lockWheel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.055, 12, 24), redValveMat);
		lockWheel.position.set(0, 0, 0.14);

		for (let i = 0; i < 4; i++) {
			const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), darkRibMat);
			spoke.rotation.z = (i * Math.PI) / 4;
			spoke.position.set(0, 0, 0.14);
			airlockGroup.add(spoke);
		}

		airlockGroup.add(frame, door, lockWheel);
		this.cabinGroup.add(airlockGroup);

		const rearStrobeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12);
		rearStrobeGeo.rotateX(Math.PI / 2);
		const rearStrobeHousing = new THREE.Mesh(rearStrobeGeo, new THREE.MeshBasicMaterial({ color: 0x330000 }));
		rearStrobeHousing.position.set(0, 2.38, 6.82);
		this.cabinGroup.add(rearStrobeHousing);
	}

	/**
	 * Pôster Corporativo Distópico da HADAL DYNAMICS na Antepara Frontal Esquerda
	 * Substitui a antiga vigia por propaganda corporativa brutalista e autoritária.
	 */
	private buildDystopianPoster(darkRibMat: THREE.Material): void {
		const posterGroup = new THREE.Group();
		// Posicionado na antepara frontal à esquerda do monitor principal
		posterGroup.position.set(-3.2, 0.95, -2.32);

		const pW = 1.15;
		const pH = 1.55;

		// Placa de montagem de aço escuro com chanfros
		const backPlate = new THREE.Mesh(
			new THREE.BoxGeometry(pW + 0.08, pH + 0.08, 0.025),
			darkRibMat
		);
		posterGroup.add(backPlate);

		// Parafusos industriais nos 4 cantos
		const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.035, 8);
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x48555e });
		for (const bx of [-pW / 2 - 0.015, pW / 2 + 0.015]) {
			for (const by of [-pH / 2 - 0.015, pH / 2 + 0.015]) {
				const bolt = new THREE.Mesh(boltGeo, boltMat);
				bolt.rotation.x = Math.PI / 2;
				bolt.position.set(bx, by, 0.02);
				posterGroup.add(bolt);
			}
		}

		// Textura em altíssima resolução do Pôster da Hadal Dynamics
		const posterCanvas = this.createHadalDynamicsPosterCanvas();
		const posterTexture = new THREE.CanvasTexture(posterCanvas);
		posterTexture.colorSpace = THREE.SRGBColorSpace;
		posterTexture.minFilter = THREE.LinearFilter;
		posterTexture.magFilter = THREE.LinearFilter;

		const posterSheet = new THREE.Mesh(
			new THREE.PlaneGeometry(pW, pH),
			new THREE.MeshBasicMaterial({ map: posterTexture })
		);
		posterSheet.position.set(0, 0, 0.015);
		posterGroup.add(posterSheet);

		// Grampos metálicos de fixação nos cantos
		const clipGeo = new THREE.BoxGeometry(0.06, 0.025, 0.02);
		for (const cx of [-pW / 2 + 0.04, pW / 2 - 0.04]) {
			for (const cy of [-pH / 2 + 0.03, pH / 2 - 0.03]) {
				const clip = new THREE.Mesh(clipGeo, boltMat);
				clip.position.set(cx, cy, 0.025);
				posterGroup.add(clip);
			}
		}

		posterGroup.userData = { isPoster: true };
		this.posterMesh = posterGroup;
		this.cabinGroup.add(posterGroup);
	}

	/**
	 * Gera o documento de propaganda da megacorporação HADAL DYNAMICS em Canvas 2D
	 */
	private createHadalDynamicsPosterCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 1536;
		const ctx = canvas.getContext('2d')!;

		// Fundo papel industrial envelhecido / chapa primer cinza-escura
		ctx.fillStyle = '#141817';
		ctx.fillRect(0, 0, 1024, 1536);

		// Vinheta de sujeira e desgaste nas bordas
		const bgGrad = ctx.createRadialGradient(512, 768, 200, 512, 768, 800);
		bgGrad.addColorStop(0, 'rgba(30, 36, 33, 0.4)');
		bgGrad.addColorStop(1, 'rgba(8, 11, 10, 0.95)');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, 1024, 1536);

		// Moldura com listras de perigo industrial (diagonal hazard stripes)
		ctx.strokeStyle = '#c48b2c';
		ctx.lineWidth = 14;
		ctx.strokeRect(16, 16, 992, 1504);

		ctx.strokeStyle = '#222d28';
		ctx.lineWidth = 4;
		ctx.strokeRect(30, 30, 964, 1476);

		// Tarja de cabeçalho corporativo da megacorporação
		ctx.fillStyle = '#3d0a0a';
		ctx.fillRect(36, 36, 952, 170);

		ctx.strokeStyle = '#ff3333';
		ctx.lineWidth = 3;
		ctx.strokeRect(36, 36, 952, 170);

		// Logotipo geométrico brutalista da Hadal Dynamics (Hexágono + Triângulo)
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.moveTo(120, 70);
		ctx.lineTo(165, 95);
		ctx.lineTo(165, 145);
		ctx.lineTo(120, 170);
		ctx.lineTo(75, 145);
		ctx.lineTo(75, 95);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#3d0a0a';
		ctx.beginPath();
		ctx.moveTo(120, 90);
		ctx.lineTo(145, 120);
		ctx.lineTo(95, 120);
		ctx.closePath();
		ctx.fill();

		// Nome da corporação
		ctx.textAlign = 'left';
		ctx.fillStyle = '#ffffff';
		ctx.font = '900 42px "Courier New", monospace';
		ctx.fillText('HADAL DYNAMICS', 195, 95);

		ctx.fillStyle = '#ff8888';
		ctx.font = 'bold 20px "Courier New", monospace';
		ctx.fillText('CONGLOMERADO DE MINERAÇÃO & RECURSOS PROFUNDOS', 195, 130);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
		ctx.font = '16px "Courier New", monospace';
		ctx.fillText('DIVISÃO DE OPERAÇÕES BENTÔNICAS // SETOR DE RISCO CLASSE 5', 195, 165);

		// SLOGAN PRINCIPAL DISTÓPICO
		ctx.textAlign = 'center';
		ctx.fillStyle = '#e6a100';
		ctx.font = '900 46px "Courier New", monospace';
		ctx.fillText('O SILÊNCIO É NOSSO', 512, 275);
		ctx.fillText('MAIOR PATRIMÔNIO', 512, 330);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 22px "Courier New", monospace';
		ctx.fillText('[ SILENCE IS OUR GREATEST ASSET ]', 512, 375);

		// Linha divisória técnica
		ctx.strokeStyle = '#c48b2c';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(60, 410);
		ctx.lineTo(964, 410);
		ctx.stroke();

		// GRÁFICO CENTRAL: SILHUETA DA FENDA E DO BATISCAFO A 8.000M
		ctx.fillStyle = '#0a100d';
		ctx.fillRect(60, 430, 904, 380);
		ctx.strokeStyle = '#2b3b33';
		ctx.lineWidth = 2;
		ctx.strokeRect(60, 430, 904, 380);

		// Grid técnico batimétrico
		ctx.strokeStyle = 'rgba(0, 255, 170, 0.12)';
		ctx.lineWidth = 1;
		for (let y = 460; y <= 780; y += 40) {
			ctx.beginPath();
			ctx.moveTo(70, y);
			ctx.lineTo(950, y);
			ctx.stroke();
		}

		// Escala de profundidade lateral
		ctx.fillStyle = 'rgba(0, 255, 170, 0.6)';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textAlign = 'left';
		ctx.fillText('SUPERFÍCIE ➔ 0.000M', 80, 465);
		ctx.fillText('ZONA BATIAL ➔ 2.000M', 80, 545);
		ctx.fillText('ZONA ABISSAL ➔ 4.000M', 80, 625);
		ctx.fillStyle = '#ff4444';
		ctx.fillText('ZONA HADAL ➔ 8.000M [ÁREA DE CAÇA DA ENTIDADE]', 80, 705);
		ctx.fillText('FOSSA TARTARUS ➔ 11.000M [SEM RESGATE POSSÍVEL]', 80, 785);

		// Silhueta do Submarino no meio do gráfico
		ctx.fillStyle = '#223830';
		ctx.beginPath();
		ctx.ellipse(650, 700, 110, 36, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 2;
		ctx.stroke();

		// Ondas sonoras em vermelho (alerta de ruído)
		ctx.strokeStyle = 'rgba(255, 50, 50, 0.85)';
		ctx.lineWidth = 3;
		for (const r of [50, 95, 140, 185]) {
			ctx.beginPath();
			ctx.arc(650, 700, r, -0.9, 0.9);
			ctx.stroke();
		}

		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('⚠ EMISSÃO ACÚSTICA: CONDUTA CONTRATUAL ILÍCITA ⚠', 650, 770);

		// SEÇÃO DE DIRETRIZES CONTRATUAIS DO FUNCIONÁRIO (LETRAS MIÚDAS DISTÓPICAS)
		ctx.textAlign = 'left';
		ctx.fillStyle = '#ffaa33';
		ctx.font = 'bold 22px "Courier New", monospace';
		ctx.fillText('CLÁUSULAS CONTRATUAIS DO OPERADOR DE CABINE // ADITIVO 99-B:', 60, 855);

		ctx.fillStyle = '#d0d8d4';
		ctx.font = '16px "Courier New", monospace';
		const clauses = [
			'1. Toda emissão sonora acima de 12dB no sonar constitui negligência dolosa.',
			'2. A corporação NÃO envia submarinos de resgate para além dos 4.000m.',
			'3. Em caso de fissura no casco, a transmissão dos dados codificados',
			'   tem prioridade legal sobre a evacuação do operador.',
			'4. O consumo de oxigênio excedente será descontado da herança dos dependentes.',
			'5. A presença de entidades cefalópodes gigantes não é risco trabalhista indenizável.',
			'6. Transmita SOMENTE em código ótimo de Huffman para manter o sonar inaudível.'
		];

		clauses.forEach((line, idx) => {
			ctx.fillText(line, 75, 895 + idx * 30);
		});

		// CARIMBO OFICIAL CORPORATIVO EM VERMELHO VIVO (ROTACIONADO)
		ctx.save();
		ctx.translate(760, 1220);
		ctx.rotate(-0.18);
		ctx.strokeStyle = '#d62828';
		ctx.lineWidth = 5;
		ctx.strokeRect(-160, -55, 320, 110);
		ctx.fillStyle = 'rgba(214, 40, 40, 0.15)';
		ctx.fillRect(-160, -55, 320, 110);

		ctx.fillStyle = '#ff4444';
		ctx.textAlign = 'center';
		ctx.font = '900 24px "Courier New", monospace';
		ctx.fillText('CONFORMIDADE APROVADA', 0, -18);
		ctx.font = 'bold 18px "Courier New", monospace';
		ctx.fillText('ZONA HADAL // PROTOCOLO 884', 0, 10);
		ctx.font = '14px "Courier New", monospace';
		ctx.fillText('SEM DIREITO A RESGATE', 0, 34);
		ctx.restore();

		// CÓDIGO DE BARRAS E MATRÍCULA
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(60, 1170, 360, 70);

		// Linhas de código de barras
		ctx.fillStyle = '#000000';
		let bx = 75;
		while (bx < 405) {
			const bw = Math.random() < 0.4 ? 4 : 2;
			ctx.fillRect(bx, 1180, bw, 40);
			bx += bw + Math.floor(Math.random() * 4 + 2);
		}
		ctx.font = 'bold 12px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('HD-SUB-8000-TARTARUS-V // MATRÍCULA #04-OP', 240, 1234);

		// RODAPÉ CORPORATIVO
		ctx.strokeStyle = '#3a4842';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(60, 1370);
		ctx.lineTo(964, 1370);
		ctx.stroke();

		ctx.fillStyle = '#7a8d85';
		ctx.font = '13px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('HADAL DYNAMICS CONGLOMERATE © 1982. TODOS OS DIREITOS RESERVADOS.', 512, 1405);
		ctx.fillText('JURISDIÇÃO EXTRA-TERRITORIAL DE ALTO MAR. RECLAMAÇÕES TRABALHISTAS ANULADAS.', 512, 1430);
		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 15px "Courier New", monospace';
		ctx.fillText('[ CLIQUE NO PÔSTER OU TECLA P PARA INSPECIONAR ]', 512, 1475);

		return canvas;
	}

	private buildConsoleDesk(): void {
		const deskMat = new THREE.MeshLambertMaterial({ color: 0x141a20 });

		const deskTop = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 2.8), deskMat);
		deskTop.position.set(0, -1.2, 0.2);
		this.cabinGroup.add(deskTop);

		const frontDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.65, 0.15), deskMat);
		frontDeck.rotation.x = -Math.PI * 0.2;
		frontDeck.position.set(0, -1.45, 1.4);
		this.cabinGroup.add(frontDeck);

		this.buildManometer(-2.5, -1.05, 0.85);
		this.buildSonarMeter(1.85, -1.05, 1.25);

		const kb = new THREE.Mesh(
			new THREE.BoxGeometry(2.4, 0.06, 0.6),
			new THREE.MeshLambertMaterial({ color: 0x0e1317 })
		);
		kb.position.set(0, -1.08, 1.0);
		this.cabinGroup.add(kb);
	}

	private buildManometer(x: number, y: number, z: number): void {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.x = -Math.PI * 0.15;

		const rim = new THREE.Mesh(
			new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24),
			new THREE.MeshLambertMaterial({ color: 0x273138 })
		);
		rim.rotation.x = Math.PI / 2;

		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#cfc9b6';
		ctx.beginPath();
		ctx.arc(128, 128, 120, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#111';
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.strokeStyle = '#991111';
		ctx.lineWidth = 14;
		ctx.beginPath();
		ctx.arc(128, 128, 95, Math.PI * 0.1, Math.PI * 0.6);
		ctx.stroke();

		ctx.font = 'bold 22px monospace';
		ctx.fillStyle = '#111';
		ctx.textAlign = 'center';
		ctx.fillText('PRESSÃO ATM', 128, 175);
		ctx.font = 'bold 16px monospace';
		ctx.fillText('x100', 128, 195);

		const dial = new THREE.Mesh(
			new THREE.CircleGeometry(0.38, 24),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })
		);
		dial.position.set(0, 0, 0.055);

		const needleGeo = new THREE.ConeGeometry(0.02, 0.28, 8);
		needleGeo.translate(0, 0.14, 0);
		this.pressureNeedle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0x881111 }));
		this.pressureNeedle.position.set(0, 0, 0.06);

		group.add(rim, dial, this.pressureNeedle);
		this.cabinGroup.add(group);
	}

	private buildSonarMeter(x: number, y: number, z: number): void {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.x = -Math.PI * 0.15;

		const rim = new THREE.Mesh(
			new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24),
			new THREE.MeshLambertMaterial({ color: 0x273138 })
		);
		rim.rotation.x = Math.PI / 2;

		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#061410';
		ctx.beginPath();
		ctx.arc(128, 128, 120, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#00bb77';
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.font = 'bold 22px monospace';
		ctx.fillStyle = '#00bb77';
		ctx.textAlign = 'center';
		ctx.fillText('HIDROFONE dB', 128, 175);
		ctx.fillText('RUÍDO', 128, 195);

		const dial = new THREE.Mesh(
			new THREE.CircleGeometry(0.38, 24),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })
		);
		dial.position.set(0, 0, 0.055);

		const needleGeo = new THREE.ConeGeometry(0.018, 0.28, 8);
		needleGeo.translate(0, 0.14, 0);
		this.sonarNeedle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0x00ffaa }));
		this.sonarNeedle.position.set(0, 0, 0.06);

		group.add(rim, dial, this.sonarNeedle);
		this.cabinGroup.add(group);
	}

	private buildCRTMonitor(): void {
		const casingMat = new THREE.MeshLambertMaterial({ color: 0x141b20 });
		const bezelMat = new THREE.MeshLambertMaterial({ color: 0x1c242a });

		const casing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 1.8), casingMat);
		casing.position.set(0, 0.45, -1.05);
		this.monitorGroup.add(casing);

		const topB = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.25), bezelMat);
		topB.position.set(0, 1.98, 0.05);
		const botB = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 0.25), bezelMat);
		botB.position.set(0, -1.08, 0.05);
		const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.25), bezelMat);
		leftB.position.set(-2.02, 0.45, 0.05);
		const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.25), bezelMat);
		rightB.position.set(2.02, 0.45, 0.05);
		this.monitorGroup.add(topB, botB, leftB, rightB);

		const labelCanvas = document.createElement('canvas');
		labelCanvas.width = 512;
		labelCanvas.height = 64;
		const lctx = labelCanvas.getContext('2d')!;
		lctx.fillStyle = '#0a1012';
		lctx.fillRect(0, 0, 512, 64);
		lctx.font = 'bold 24px "Courier New", monospace';
		lctx.fillStyle = '#00cc88';
		lctx.textAlign = 'center';
		lctx.fillText('TARTARUS-V // CONSOLE A // 8.000M', 256, 42);

		const plate = new THREE.Mesh(
			new THREE.PlaneGeometry(2.4, 0.25),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
		);
		plate.position.set(0, 1.98, 0.18);
		this.monitorGroup.add(plate);

		const screenGeo = new THREE.PlaneGeometry(3.7, 2.7, 32, 24);
		const pos = screenGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = -0.07 * ((x * x) / 5.0 + (y * y) / 3.8);
			pos.setZ(i, z);
		}
		screenGeo.computeVertexNormals();

		const screenMat = new THREE.MeshBasicMaterial({
			map: this.screenTexture,
			toneMapped: false
		});

		this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
		this.screenMesh.position.set(0, 0.45, 0.06);
		this.screenMesh.userData = { isScreen: true };
		this.monitorGroup.add(this.screenMesh);
	}

	private buildAuxiliaryMonitor(): void {
		const casingMat = new THREE.MeshLambertMaterial({ color: 0x141b20 });
		const bezelMat = new THREE.MeshLambertMaterial({ color: 0x1c242a });

		const group = new THREE.Group();
		group.position.set(3.1, 0.45, 0.70);
		group.rotation.y = -Math.PI * 0.27;
		group.rotation.x = -Math.PI * 0.02;

		const casing = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.05, 0.95), casingMat);
		casing.position.set(0, 0, -0.52);
		group.add(casing);

		const standArm = new THREE.Mesh(
			new THREE.CylinderGeometry(0.08, 0.09, 1.55, 16),
			new THREE.MeshLambertMaterial({ color: 0x1c252c })
		);
		standArm.position.set(0, -0.78, -0.2);
		group.add(standArm);

		const topB = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.22, 0.16), bezelMat);
		topB.position.set(0, 0.895, 0.04);
		const botB = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.28, 0.16), bezelMat);
		botB.position.set(0, -0.865, 0.04);
		const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.05, 0.16), bezelMat);
		leftB.position.set(-1.16, 0, 0.04);
		const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.05, 0.16), bezelMat);
		rightB.position.set(1.16, 0, 0.04);
		group.add(topB, botB, leftB, rightB);

		const labelCanvas = document.createElement('canvas');
		labelCanvas.width = 512;
		labelCanvas.height = 64;
		const lctx = labelCanvas.getContext('2d')!;
		lctx.fillStyle = '#120a02';
		lctx.fillRect(0, 0, 512, 64);
		lctx.font = 'bold 24px "Courier New", monospace';
		lctx.fillStyle = '#ff9922';
		lctx.textAlign = 'center';
		lctx.fillText('CONSOLE B // LOG TELETYPE', 256, 42);

		const plate = new THREE.Mesh(
			new THREE.PlaneGeometry(1.9, 0.18),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
		);
		plate.position.set(0, 0.90, 0.13);
		group.add(plate);

		const auxGeo = new THREE.PlaneGeometry(2.15, 1.55, 24, 18);
		const pos = auxGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = -0.05 * ((x * x) / 3.0 + (y * y) / 2.2);
			pos.setZ(i, z);
		}
		auxGeo.computeVertexNormals();

		const auxMat = new THREE.MeshBasicMaterial({
			map: this.auxTexture,
			toneMapped: false
		});

		this.auxScreenMesh = new THREE.Mesh(auxGeo, auxMat);
		this.auxScreenMesh.position.set(0, 0.015, 0.05);
		this.auxScreenMesh.userData = { isAuxScreen: true };
		group.add(this.auxScreenMesh);

		this.auxMonitorGroup = group;
		this.scene.add(this.auxMonitorGroup);
	}

	private setupInteractionListeners(): void {
		const onPointerDown = (e: PointerEvent) => {
			this.isDragging = true;
			this.lastPointerX = e.clientX;
			this.lastPointerY = e.clientY;
			this.pointerDownPos.set(e.clientX, e.clientY);
		};

		const onPointerMove = (e: PointerEvent) => {
			if (!this.isDragging) return;
			const dx = e.clientX - this.lastPointerX;
			const dy = e.clientY - this.lastPointerY;
			this.lastPointerX = e.clientX;
			this.lastPointerY = e.clientY;

			this.targetYaw -= dx * 0.0035;
			this.targetPitch -= dy * 0.0035;
			this.targetPitch = Math.max(-0.65, Math.min(0.65, this.targetPitch));
		};

		const onPointerUp = (e: PointerEvent) => {
			this.isDragging = false;
			const distMoved = this.pointerDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));

			if (distMoved < 10) {
				const rect = this.canvas.getBoundingClientRect();
				this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

				this.raycaster.setFromCamera(this.mouseNDC, this.camera);

				// 1. Clique no Monitor Principal
				if (this.screenMesh) {
					const intersects = this.raycaster.intersectObject(this.screenMesh, false);
					if (intersects.length > 0 && intersects[0].uv) {
						const { x, y } = intersects[0].uv;
						this.terminalCanvas.handleClickUV(x, y);
						this.isMainScreenDirty = true;
					}
				}

				// 2. Clique no Monitor Secundário
				let auxHandled = false;
				if (this.auxScreenMesh) {
					const auxIntersects = this.raycaster.intersectObject(this.auxScreenMesh, false);
					if (auxIntersects.length > 0 && auxIntersects[0].uv) {
						const { x, y } = auxIntersects[0].uv;
						auxHandled = this.auxCanvas.handleClickUV(x, y);
						this.isAuxScreenDirty = true;
						if (!auxHandled) {
							this.focusAuxiliaryMonitor();
							auxHandled = true;
						}
					}
				}

				if (!auxHandled && this.auxMonitorGroup) {
					const groupIntersects = this.raycaster.intersectObjects(this.auxMonitorGroup.children, true);
					if (groupIntersects.length > 0) {
						this.focusAuxiliaryMonitor();
						auxHandled = true;
					}
				}

				// 3. Clique no Armário Médico ou no Manual de Huffman na parede esquerda
				if (!auxHandled) {
					let cabinetHit = false;
					if (this.medCabinetGroup) {
						const cabinetIntersects = this.raycaster.intersectObject(this.medCabinetGroup, true);
						if (cabinetIntersects.length > 0) {
							cabinetHit = true;
						}
					}
					if (cabinetHit || (this.manualMesh && this.raycaster.intersectObject(this.manualMesh, true).length > 0)) {
						this.focusManual();
						auxHandled = true;
					}
				}

				// 4. Clique na Grande Janela Panorâmica da Direita
				if (!auxHandled && this.rightWindowGroup) {
					const winIntersects = this.raycaster.intersectObject(this.rightWindowGroup, true);
					if (winIntersects.length > 0) {
						this.focusWindow();
						auxHandled = true;
					}
				}

				// 5. Clique no Pôster Corporativo da HADAL DYNAMICS na antepara frontal esquerda
				if (!auxHandled && this.posterMesh) {
					const posterIntersects = this.raycaster.intersectObject(this.posterMesh, true);
					if (posterIntersects.length > 0) {
						this.focusPoster();
						auxHandled = true;
					}
				}
			}
		};

		this.canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	public setAudioEngine(engine: ProceduralAudioEngine): void {
		this.audioEngine = engine;
	}

	public onScreenAction(cb: ScreenActionCallback): void {
		this.terminalCanvas.setActionCallback(cb);
	}

	public onAuxAction(cb: AuxActionCallback): void {
		this.auxCanvas.setActionCallback(cb);
	}

	public onFocusChange(cb: FocusChangeCallback): void {
		this.onFocusChangeCb = cb;
	}

	public focusMonitor(): void {
		this.targetYaw = 0;
		this.targetPitch = -0.06;
		this.targetFov = 34;
		this.onFocusChangeCb?.('main');
	}

	public focusAuxiliaryMonitor(): void {
		this.targetYaw = -0.85;
		this.targetPitch = -0.065;
		this.targetFov = 30;
		this.onFocusChangeCb?.('aux');
	}

	public focusManual(): void {
		this.openCabinet();
		this.targetYaw = 1.34; // Ângulo preciso para o armário médico centralizado na parede esquerda (Z = 2.30)
		this.targetPitch = -0.02;
		this.targetFov = 28;
		this.onFocusChangeCb?.('manual');
	}

	public focusWindow(): void {
		this.targetYaw = -Math.PI / 2; // -1.57, olhadela total perpendicular para a grande janela
		this.targetPitch = 0.0;
		this.targetFov = 42;
		this.onFocusChangeCb?.('window');
	}

	public focusPoster(): void {
		this.targetYaw = 0.50; // Ângulo de leitura focado no pôster à esquerda do monitor principal
		this.targetPitch = 0.035;
		this.targetFov = 24;
		this.onFocusChangeCb?.('poster');
	}

	public openCabinet(): void {
		if (!this.isCabinetOpen) {
			this.isCabinetOpen = true;
			this.targetDoorAngle = -Math.PI * 0.62;
			this.audioEngine?.playCabinetDoor(true);
		}
	}

	public closeCabinet(): void {
		if (this.isCabinetOpen) {
			this.isCabinetOpen = false;
			this.targetDoorAngle = 0;
			this.audioEngine?.playCabinetDoor(false);
		}
	}

	public toggleCabinet(): boolean {
		if (this.isCabinetOpen) {
			this.closeCabinet();
		} else {
			this.openCabinet();
		}
		return this.isCabinetOpen;
	}

	public isCabinetOpened(): boolean {
		return this.isCabinetOpen;
	}

	public toggleInspectionLight(): boolean {
		this.isInspectionMode = !this.isInspectionMode;
		this.applyLightingMode();
		return this.isInspectionMode;
	}

	public setInspectionLight(enabled: boolean): void {
		this.isInspectionMode = enabled;
		this.applyLightingMode();
	}

	private applyLightingMode(): void {
		if (this.isInspectionMode) {
			this.ambientLight.intensity = 1.8;
			this.ambientLight.color.set(0x384855);
			if (this.dirFillLight) this.dirFillLight.intensity = 0.9;
			this.ceilingLampLight.color.set(0xffeed0);
			this.ceilingLampLight.distance = 22;
			this.crtScreenLight.intensity = 3.5;
			this.auxScreenLight.intensity = 2.2;
			(this.scene.fog as THREE.FogExp2).density = 0.035;
			(this.scene.fog as THREE.FogExp2).color.set(0x0a141c);
			this.scene.background = new THREE.Color(0x0a141c);
		} else {
			this.ambientLight.intensity = 0.35;
			this.ambientLight.color.set(0x0a141a);
			if (this.dirFillLight) this.dirFillLight.intensity = 0.0;
			this.ceilingLampLight.color.set(0xffcc88);
			this.ceilingLampLight.distance = 10;
			this.crtScreenLight.intensity = 3.2;
			this.auxScreenLight.intensity = 1.2;
			(this.scene.fog as THREE.FogExp2).density = 0.12;
			(this.scene.fog as THREE.FogExp2).color.set(0x020508);
			this.scene.background = new THREE.Color(0x020508);
		}
	}

	public resetCabinView(): void {
		this.targetYaw = 0;
		this.targetPitch = -0.06;
		this.targetFov = 54;
		this.onFocusChangeCb?.('none');
	}

	public updateGauges(pressureAtm: number, proximity: number): void {
		this.currentProximity = proximity;
		this.targetPressureDeg = ((pressureAtm - 700) / 500) * 1.5;
		this.targetSonarDeg = -1.2 + (proximity / 100) * 2.4;
	}

	public triggerCameraShake(intensity: number = 0.25): void {
		this.cameraShakeIntensity = Math.min(1.2, this.cameraShakeIntensity + intensity);
		this.currentSonarDeg += 0.35;
	}

	public setAlarm(active: boolean): void {
		if (this.isAlarmActive !== active) {
			this.isAlarmActive = active;
			this.isMainScreenDirty = true;
			this.isAuxScreenDirty = true;
		}
	}

	public updateScreenState(state: TerminalScreenState): void {
		this.currentScreenState = state;
		this.isMainScreenDirty = true;
	}

	public updateAuxScreenState(state: AuxiliaryScreenState): void {
		this.currentAuxState = state;
		this.isAuxScreenDirty = true;
	}

	public resize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	/**
	 * Dispara um evento assustador aleatório fora da janela da direita.
	 * 3 Categorias de eventos, cada uma contendo múltiplos eventos variados.
	 */
	public triggerRandomWindowEvent(forcedCat?: WindowEventCategory): void {
		if (this.activeWindowEvent) return;

		// 1. Determina a categoria com base na tensão / proximidade acústica
		let cat: WindowEventCategory = forcedCat ?? 1;
		if (!forcedCat) {
			const roll = Math.random();
			if (this.currentProximity > 70) {
				if (roll < 0.20) cat = 1;
				else if (roll < 0.55) cat = 2;
				else cat = 3;
			} else if (this.currentProximity > 40) {
				if (roll < 0.35) cat = 1;
				else if (roll < 0.70) cat = 2;
				else cat = 3;
			} else {
				if (roll < 0.50) cat = 1;
				else if (roll < 0.80) cat = 2;
				else cat = 3;
			}
		}

		// 2. Seleciona um evento específico da categoria (evitando repetição imediata)
		let pool: WindowEventType[] = [];
		if (cat === 1) {
			pool = ['BIO_PULSES', 'FLEEING_SWARM', 'DISTANT_SILHOUETTE', 'VENT_SPORES'];
		} else if (cat === 2) {
			pool = ['TOTAL_ECLIPSE', 'CREATURE_FLANK', 'SEGMENTED_TENTACLE', 'DUAL_PASSING'];
		} else {
			pool = ['RAM_CHARGE', 'QUARTZ_IMPACT', 'SCRAPING_CLAWS', 'PRESSURE_GROAN_CHARGE'];
		}

		const filtered = pool.filter((t) => t !== this.lastEventType);
		const chosenType = filtered[Math.floor(Math.random() * filtered.length)];
		this.lastEventType = chosenType;

		// 3. Configura a duração e dispara os áudios correspondentes
		let duration = 6.0;
		if (chosenType === 'BIO_PULSES') {
			duration = 8.0;
			this.audioEngine?.playBioluminescentHum();
		} else if (chosenType === 'FLEEING_SWARM') {
			duration = 3.2;
			this.audioEngine?.playSwarmScatter();
			if (this.fleeingSwarm) {
				const posAttr = this.fleeingSwarm.geometry.attributes.position as THREE.BufferAttribute;
				const arr = posAttr.array as Float32Array;
				for (let i = 0; i < arr.length; i += 3) {
					arr[i] = 3.5 + Math.random() * 2.0;
					arr[i + 1] = (Math.random() - 0.5) * 2.2;
					arr[i + 2] = -0.5 - Math.random() * 2.0;
				}
				posAttr.needsUpdate = true;
			}
		} else if (chosenType === 'DISTANT_SILHOUETTE') {
			duration = 11.0;
			if (this.distantSilhouette) {
				this.distantSilhouette.position.x = -6.5;
			}
		} else if (chosenType === 'VENT_SPORES') {
			duration = 6.0;
			this.audioEngine?.playBioluminescentHum();
		} else if (chosenType === 'TOTAL_ECLIPSE') {
			duration = 9.0;
			this.audioEngine?.playDeepWaterSurge(1.2);
			if (this.eclipseMesh) {
				this.eclipseMesh.position.x = -5.5;
			}
		} else if (chosenType === 'CREATURE_FLANK') {
			duration = 10.0;
			this.audioEngine?.playDeepWaterSurge(0.85);
			if (this.creatureFlankMesh) {
				this.creatureFlankMesh.position.x = 5.5;
			}
		} else if (chosenType === 'SEGMENTED_TENTACLE') {
			duration = 8.0;
			this.audioEngine?.playDeepWaterSurge(0.7);
			if (this.tentacleGroup) {
				this.tentacleGroup.position.set(0.3, 2.5, -0.38);
				this.tentacleGroup.visible = true;
			}
		} else if (chosenType === 'DUAL_PASSING') {
			duration = 10.0;
			this.audioEngine?.playBioluminescentHum();
			if (this.distantSilhouette && this.distantSilhouette2) {
				this.distantSilhouette.position.x = -6.5;
				this.distantSilhouette2.position.x = 6.5;
			}
		} else if (chosenType === 'RAM_CHARGE') {
			duration = 2.2;
			this.audioEngine?.playDeepWaterSurge(1.5);
			if (this.chargingCreatureMesh) {
				this.chargingCreatureMesh.position.set(0, 0, -9.0);
				this.chargingCreatureMesh.rotation.z = 0;
			}
		} else if (chosenType === 'QUARTZ_IMPACT') {
			duration = 4.5;
			this.audioEngine?.playWindowImpact();
			this.triggerCameraShake(0.8);
			this.impactGlitchTimer = 0.45;
			if (this.impactDecalMesh) {
				(this.impactDecalMesh.material as THREE.MeshBasicMaterial).opacity = 0.88;
			}
		} else if (chosenType === 'SCRAPING_CLAWS') {
			duration = 3.6;
			this.audioEngine?.playWindowScrape();
			if (this.clawAppendageGroup) {
				this.clawAppendageGroup.position.set(0.35, 1.8, -0.06);
				this.clawAppendageGroup.visible = true;
			}
		} else if (chosenType === 'PRESSURE_GROAN_CHARGE') {
			duration = 4.0;
			this.audioEngine?.playDeepWaterSurge(1.1);
			this.audioEngine?.playHullCreak();
			this.triggerCameraShake(0.42);
		}

		this.activeWindowEvent = {
			type: chosenType,
			category: cat,
			duration,
			elapsed: 0,
			stage: 0
		};
	}

	/**
	 * Animação e atualização de cada tipo de evento assustador na janela
	 */
	private updateActiveWindowEvent(delta: number, elapsedTime: number): void {
		if (!this.activeWindowEvent) return;

		this.activeWindowEvent.elapsed += delta;
		const progress = Math.min(1.0, this.activeWindowEvent.elapsed / this.activeWindowEvent.duration);
		const type = this.activeWindowEvent.type;

		// --- CATEGORIA 1: SUTIL & PERTURBADOR ---
		if (type === 'BIO_PULSES') {
			if (this.biolumOrganGroup && this.biolumLight) {
				this.biolumOrganGroup.visible = true;
				this.biolumOrganGroup.position.x = -2.5 + progress * 5.0;
				this.biolumLight.position.x = this.biolumOrganGroup.position.x;
				const pulse = Math.pow(Math.sin(progress * Math.PI * 3), 2) * 2.4;
				this.biolumLight.intensity = pulse;
			}
		} else if (type === 'FLEEING_SWARM') {
			if (this.fleeingSwarm && this.fleeingSwarmVelocities) {
				const mat = this.fleeingSwarm.material as THREE.PointsMaterial;
				mat.opacity = progress < 0.15 ? (progress / 0.15) * 0.75 : progress > 0.8 ? ((1.0 - progress) / 0.2) * 0.75 : 0.75;

				const posAttr = this.fleeingSwarm.geometry.attributes.position as THREE.BufferAttribute;
				const arr = posAttr.array as Float32Array;
				for (let i = 0; i < arr.length; i += 3) {
					arr[i] += this.fleeingSwarmVelocities[i] * delta;
					arr[i + 1] += this.fleeingSwarmVelocities[i + 1] * delta;
					arr[i + 2] += this.fleeingSwarmVelocities[i + 2] * delta;
				}
				posAttr.needsUpdate = true;
			}
		} else if (type === 'DISTANT_SILHOUETTE') {
			if (this.distantSilhouette) {
				this.distantSilhouette.position.x = -6.5 + progress * 13.0;
				this.distantSilhouette.position.y = 0.2 + Math.sin(elapsedTime * 1.5) * 0.2;
				(this.distantSilhouette.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.55;
			}
		} else if (type === 'VENT_SPORES') {
			if (this.ventSporeStream) {
				const mat = this.ventSporeStream.material as THREE.PointsMaterial;
				mat.opacity = Math.sin(progress * Math.PI) * 0.65;

				const posAttr = this.ventSporeStream.geometry.attributes.position as THREE.BufferAttribute;
				const arr = posAttr.array as Float32Array;
				for (let i = 1; i < arr.length; i += 3) {
					arr[i] += delta * 1.5;
					if (arr[i] > 2.2) arr[i] = -2.5;
				}
				posAttr.needsUpdate = true;
			}
		}

		// --- CATEGORIA 2: PRESENÇA COLOSSAL & ECLIPSE ---
		else if (type === 'TOTAL_ECLIPSE') {
			if (this.eclipseMesh) {
				this.eclipseMesh.position.x = -5.5 + progress * 11.0;
				(this.eclipseMesh.material as THREE.MeshBasicMaterial).opacity = 0.98;

				if (this.marineSnowRight) {
					const snowMat = this.marineSnowRight.material as THREE.PointsMaterial;
					if (progress > 0.25 && progress < 0.75) {
						snowMat.opacity = THREE.MathUtils.lerp(snowMat.opacity, 0.05, 0.1);
					} else {
						snowMat.opacity = THREE.MathUtils.lerp(snowMat.opacity, 0.45, 0.1);
					}
				}
			}
		} else if (type === 'CREATURE_FLANK') {
			if (this.creatureFlankMesh) {
				this.creatureFlankMesh.position.x = 5.5 - progress * 11.0;
				this.creatureFlankMesh.rotation.x = elapsedTime * 0.4;
				(this.creatureFlankMesh.material as THREE.MeshLambertMaterial).opacity = Math.sin(progress * Math.PI) * 0.92;
			}
		} else if (type === 'SEGMENTED_TENTACLE') {
			if (this.tentacleGroup) {
				if (progress < 0.3) {
					this.tentacleGroup.position.y = 2.5 - (progress / 0.3) * 2.2;
				} else if (progress > 0.7) {
					this.tentacleGroup.position.y = 0.3 + ((progress - 0.7) / 0.3) * 2.2;
				} else {
					this.tentacleGroup.position.y = 0.3 + Math.sin(elapsedTime * 2.0) * 0.08;
				}

				this.tentacleSegments.forEach((seg, idx) => {
					seg.rotation.z = Math.sin(elapsedTime * 2.2 + idx * 0.55) * 0.24;
					seg.rotation.x = Math.cos(elapsedTime * 1.8 + idx * 0.45) * 0.16;
				});
			}
		} else if (type === 'DUAL_PASSING') {
			if (this.distantSilhouette && this.distantSilhouette2) {
				this.distantSilhouette.position.x = -6.5 + progress * 13.0;
				(this.distantSilhouette.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.5;
				this.distantSilhouette2.position.x = 6.5 - progress * 13.0;
				(this.distantSilhouette2.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.6;
			}
		}

		// --- CATEGORIA 3: CHOQUES REPENTINOS & IMPACTOS ---
		else if (type === 'RAM_CHARGE') {
			if (this.chargingCreatureMesh) {
				const mat = this.chargingCreatureMesh.material as THREE.MeshLambertMaterial;
				if (progress < 0.5) {
					const p = progress / 0.5;
					this.chargingCreatureMesh.position.z = -9.0 + p * 8.65;
					mat.opacity = p * 0.95;
				} else {
					const p = (progress - 0.5) / 0.5;
					this.chargingCreatureMesh.position.x = -p * 5.0;
					this.chargingCreatureMesh.position.z = -0.35 - p * 2.2;
					this.chargingCreatureMesh.rotation.z = -0.8;
					mat.opacity = Math.max(0, 0.95 * (1.0 - p));

					if (this.activeWindowEvent.stage === 0) {
						this.triggerCameraShake(0.38);
						this.activeWindowEvent.stage = 1;
					}
				}
			}
		} else if (type === 'QUARTZ_IMPACT') {
			if (this.impactDecalMesh) {
				const mat = this.impactDecalMesh.material as THREE.MeshBasicMaterial;
				mat.opacity = Math.max(0, 0.88 * Math.pow(1.0 - progress, 1.8));
			}
		} else if (type === 'SCRAPING_CLAWS') {
			if (this.clawAppendageGroup && this.scratchDecalMesh) {
				const scratchMat = this.scratchDecalMesh.material as THREE.MeshBasicMaterial;

				if (progress < 0.1) {
					this.clawAppendageGroup.position.y = 1.8 - (progress / 0.1) * 1.05;
				} else if (progress <= 0.8) {
					const p = (progress - 0.1) / 0.7;
					this.clawAppendageGroup.position.y = 0.75 - p * 1.4;
					this.scratchDecalMesh.position.y = this.clawAppendageGroup.position.y + 0.35;
					scratchMat.opacity = Math.min(0.85, p * 1.6);
				} else {
					const p = (progress - 0.8) / 0.2;
					this.clawAppendageGroup.position.z = -0.06 - p * 1.2;
					scratchMat.opacity = Math.max(0, 0.85 * (1.0 - p));
				}
			}
		} else if (type === 'PRESSURE_GROAN_CHARGE') {
			if (progress < 0.5) {
				this.alarmBeaconLight.intensity = Math.sin(progress * Math.PI * 8) > 0.2 ? 3.0 : 0.0;
			} else {
				this.alarmBeaconLight.intensity = 0.0;
			}
		}

		// Finalização do evento
		if (this.activeWindowEvent.elapsed >= this.activeWindowEvent.duration) {
			this.resetWindowEventActors();
		}
	}

	private resetWindowEventActors(): void {
		if (this.biolumLight) this.biolumLight.intensity = 0.0;
		if (this.biolumOrganGroup) this.biolumOrganGroup.visible = false;
		if (this.fleeingSwarm) (this.fleeingSwarm.material as THREE.PointsMaterial).opacity = 0.0;
		if (this.distantSilhouette) (this.distantSilhouette.material as THREE.MeshBasicMaterial).opacity = 0.0;
		if (this.distantSilhouette2) (this.distantSilhouette2.material as THREE.MeshBasicMaterial).opacity = 0.0;
		if (this.eclipseMesh) (this.eclipseMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
		if (this.creatureFlankMesh) (this.creatureFlankMesh.material as THREE.MeshLambertMaterial).opacity = 0.0;
		if (this.tentacleGroup) this.tentacleGroup.visible = false;
		if (this.chargingCreatureMesh) (this.chargingCreatureMesh.material as THREE.MeshLambertMaterial).opacity = 0.0;
		if (this.clawAppendageGroup) this.clawAppendageGroup.visible = false;
		if (this.ventSporeStream) (this.ventSporeStream.material as THREE.PointsMaterial).opacity = 0.0;
		if (this.impactDecalMesh) (this.impactDecalMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
		if (this.scratchDecalMesh) (this.scratchDecalMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
		if (this.marineSnowRight) (this.marineSnowRight.material as THREE.PointsMaterial).opacity = 0.45;

		this.activeWindowEvent = null;
	}

	/**
	 * Loop principal de animação e renderização.
	 */
	private animate = (): void => {
		this.animationFrameId = requestAnimationFrame(this.animate);

		const delta = this.clock.getDelta();
		const elapsedTime = this.clock.getElapsedTime();

		// 1. Atualização do Monitor Principal
		const hydrophoneInterval = 0.045;
		const hydrophoneNeedsUpdate = elapsedTime - this.lastHydrophoneTime >= hydrophoneInterval;

		if (this.currentScreenState && (this.isMainScreenDirty || hydrophoneNeedsUpdate)) {
			this.terminalCanvas.render(this.currentScreenState, delta);
			this.screenTexture.needsUpdate = true;
			this.isMainScreenDirty = false;
			if (hydrophoneNeedsUpdate) {
				this.lastHydrophoneTime = elapsedTime;
			}
		}

		// 2. Atualização do Monitor Secundário
		const auxBlinkInterval = 0.45;
		const auxBlinkNeedsUpdate = elapsedTime - this.lastAuxBlinkTime >= auxBlinkInterval;

		if (this.currentAuxState && (this.isAuxScreenDirty || auxBlinkNeedsUpdate)) {
			this.auxCanvas.render(this.currentAuxState, delta);
			this.auxTexture.needsUpdate = true;
			this.isAuxScreenDirty = false;
			if (auxBlinkNeedsUpdate) {
				this.lastAuxBlinkTime = elapsedTime;
			}
		}

		// 3. Iluminação dinâmica com queda de tensão sob choque e proximidade
		if (this.isInspectionMode) {
			this.ceilingLampLight.intensity = 2.8 + Math.sin(elapsedTime * 4.0) * 0.12;
		} else {
			let lampIntensity = 0.75 + Math.sin(elapsedTime * 6.0) * 0.04 + Math.sin(elapsedTime * 19.0) * 0.02;

			// Apagão momentâneo por impacto físico violento na janela (QUARTZ_IMPACT)
			if (this.impactGlitchTimer > 0) {
				this.impactGlitchTimer -= delta;
				lampIntensity = 0.02;
			} else {
				if (Math.random() < 0.015) {
					lampIntensity *= 0.25; // Micro-queda de tensão
				}
				if (this.currentProximity > 50) {
					const dangerRatio = (this.currentProximity - 50) / 50;
					if (Math.random() < dangerRatio * 0.2) {
						lampIntensity = Math.random() < 0.5 ? 0.04 : 0.2;
					}
				}
				if (this.cameraShakeIntensity > 0.08) {
					lampIntensity *= Math.max(0.04, 1.0 - this.cameraShakeIntensity * 1.4);
				}
			}

			this.ceilingLampLight.intensity = lampIntensity;
		}

		// 4. Luz de alarme
		if (this.isAlarmActive) {
			const strobe = Math.sin(elapsedTime * 14.0) > 0 ? 3.5 : 0.0;
			this.alarmBeaconLight.intensity = strobe;
			if (this.rearAlarmLight) this.rearAlarmLight.intensity = strobe * 0.8;
		} else if (!this.activeWindowEvent || this.activeWindowEvent.type !== 'PRESSURE_GROAN_CHARGE') {
			this.alarmBeaconLight.intensity = 0.0;
			if (this.rearAlarmLight) this.rearAlarmLight.intensity = 0.0;
		}

		// 5. Suavização das agulhas
		if (this.pressureNeedle) {
			this.pressureNeedle.rotation.z = THREE.MathUtils.lerp(
				this.pressureNeedle.rotation.z,
				-this.targetPressureDeg + Math.sin(elapsedTime * 5.0) * 0.015,
				0.08
			);
		}
		if (this.sonarNeedle) {
			this.currentSonarDeg = THREE.MathUtils.lerp(this.currentSonarDeg, this.targetSonarDeg, 0.1);
			this.sonarNeedle.rotation.z = this.currentSonarDeg + (Math.random() - 0.5) * 0.025;
		}

		// 7. Animação da Porta do Armário Médico & Luz de Inspeção Interna
		if (this.medCabinetDoorHinge) {
			this.currentDoorAngle = THREE.MathUtils.lerp(this.currentDoorAngle, this.targetDoorAngle, 0.09);
			this.medCabinetDoorHinge.rotation.y = this.currentDoorAngle;

			if (this.cabinetInteriorLight) {
				const targetLight = this.isCabinetOpen ? 1.4 : 0.0;
				this.cabinetInteriorLight.intensity = THREE.MathUtils.lerp(
					this.cabinetInteriorLight.intensity,
					targetLight,
					0.1
				);
			}
		}

		// 8. Neve Marinha e Gerenciador de Eventos Raros da Janela Direita
		if (this.marineSnowRight) {
			this.marineSnowRight.position.y -= delta * 0.04;
			if (this.marineSnowRight.position.y < -0.8) {
				this.marineSnowRight.position.y += 0.8;
			}
		}

		this.nextWindowEventTimer -= delta;
		if (this.nextWindowEventTimer <= 0 && !this.activeWindowEvent) {
			const baseInterval = this.currentProximity > 60 ? 20 : 42;
			this.nextWindowEventTimer = baseInterval + Math.random() * (baseInterval * 0.7);
			this.triggerRandomWindowEvent();
		}

		if (this.activeWindowEvent) {
			this.updateActiveWindowEvent(delta, elapsedTime);
		}

		// 9. Rotação da cabeça e zoom óptico FOV
		this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 0.14);
		this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, 0.14);

		if (Math.abs(this.currentFov - this.targetFov) > 0.05) {
			this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, 0.12);
			this.camera.fov = this.currentFov;
			this.camera.updateProjectionMatrix();
		}

		this.camera.position.copy(this.seatPosition);

		if (this.cameraShakeIntensity > 0.001) {
			const rx = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.08;
			const ry = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.08;
			this.camera.position.x += rx;
			this.camera.position.y += ry;
			this.cameraShakeIntensity *= Math.pow(0.05, delta);
		}

		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.currentYaw;
		this.camera.rotation.x = this.currentPitch;

		this.renderer.render(this.scene, this.camera);
	};

	public dispose(): void {
		cancelAnimationFrame(this.animationFrameId);
		this.renderer.dispose();
		this.screenTexture.dispose();
		this.auxTexture.dispose();
		this.scene.clear();
	}
}
