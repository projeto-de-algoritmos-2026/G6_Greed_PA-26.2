/**
 * SUBWAVE - Submarine Cabin & CRT Terminal 3D Engine
 * Renderização em Three.js de uma cabine de submarino totalmente iluminada e visível a 8.000m:
 * - Visão 360° em órbita livre (OrbitControls).
 * - Paredes de aço rebitadas, escotilha estanque com volante vermelho, tubos de cobre e teto curvado.
 * - Vigia circular olhando para a escuridão do abismo com neve marinha e a criatura rondando.
 * - Mesa de console com manômetros analógicos de agulha e controles táteis.
 * - Monitor CRT retrô cuja tela projeta o HUD completo (Radar, Árvore de Huffman, Telemetria e Comandos)
 *   via textura de Canvas 2D de alta definição com suporte a clique por UV Raycast.
 */

import * as THREE from 'three';
import { TerminalScreenCanvas, type TerminalScreenState, type ScreenActionCallback } from './terminalScreenCanvas';
import { AuxiliaryScreenCanvas, type AuxiliaryScreenState, type AuxActionCallback } from './auxiliaryScreenCanvas';

export class Terminal3DManager {
	private container: HTMLElement;
	private canvas: HTMLCanvasElement;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;

	// Tela do Monitor CRT Principal (Canvas 2D mapeado em 3D)
	public terminalCanvas: TerminalScreenCanvas;
	private screenTexture: THREE.CanvasTexture;
	private screenMesh: THREE.Mesh | null = null;
	private currentScreenState: TerminalScreenState | null = null;

	// Tela do Monitor Secundário Auxiliar (Console B à direita)
	public auxCanvas: AuxiliaryScreenCanvas;
	private auxTexture: THREE.CanvasTexture;
	private auxScreenMesh: THREE.Mesh | null = null;
	private auxMonitorGroup: THREE.Group;
	private currentAuxState: AuxiliaryScreenState | null = null;

	// Iluminação visível da cabine
	private ceilingLampLight: THREE.PointLight;
	private crtScreenLight: THREE.PointLight;
	private alarmBeaconLight: THREE.PointLight;
	private rearAlarmLight: THREE.PointLight | null = null;
	private isAlarmActive: boolean = false;

	// Elementos da cabine
	private cabinGroup: THREE.Group;
	private monitorGroup: THREE.Group;
	private pressureNeedle: THREE.Mesh | null = null;
	private sonarNeedle: THREE.Mesh | null = null;
	private marineSnowParticles: THREE.Points | null = null;
	private abyssalCreature: THREE.Mesh | null = null;
	private tapeReel1: THREE.Mesh | null = null;
	private tapeReel2: THREE.Mesh | null = null;
	private oscilloscopeCanvas: HTMLCanvasElement | null = null;
	private oscilloscopeTexture: THREE.CanvasTexture | null = null;

	// Otimização de Performance: Dirty-Checking e Throttling de Upload de Textura
	private isMainScreenDirty: boolean = true;
	private isAuxScreenDirty: boolean = true;
	private lastRadarTime: number = 0;
	private lastAuxBlinkTime: number = 0;

	// Agulhas e telemetria dos instrumentos
	private targetPressureDeg: number = 0.5;
	private targetSonarDeg: number = -0.8;
	private currentSonarDeg: number = -0.8;
	private currentProximity: number = 0;

	// Câmera em ponto fixo no assento do operador: gira estritamente no próprio eixo (Pitch & Yaw)
	private seatPosition = new THREE.Vector3(0, 0.72, 3.4);
	private currentYaw: number = 0;       // Rotação horizontal (olhar para os lados)
	private currentPitch: number = -0.06; // Rotação vertical (olhar para cima/baixo)
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

		// 1. Cena
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x060c10);

		// 2. Câmera Fixa no Ponto de Visão do Operador (NÃO se move pelo espaço, apenas gira no eixo)
		this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 100);
		this.camera.position.copy(this.seatPosition);
		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.currentYaw;
		this.camera.rotation.x = this.currentPitch;

		// 3. Renderizador WebGL otimizado (DPR 1.0 fixo para máxima taxa de quadros e zero supersampling inútil)
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			powerPreference: 'high-performance'
		});
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(1.0);

		// 5. Iluminação Otimizada e Atmosférica da Cabine (Consolidada para 3 luzes dinâmicas de alta performance)
		const ambientLight = new THREE.AmbientLight(0x384855, 2.6);
		this.scene.add(ambientLight);

		// Lâmpada de teto industrial central da cabine
		this.ceilingLampLight = new THREE.PointLight(0xffeed0, 4.2, 20);
		this.ceilingLampLight.position.set(0, 2.8, 1.5);
		this.scene.add(this.ceilingLampLight);

		// Luz do fósforo verde do monitor CRT
		this.crtScreenLight = new THREE.PointLight(0x00ffaa, 2.4, 5.0);
		this.crtScreenLight.position.set(0, 0.45, 0.6);
		this.scene.add(this.crtScreenLight);

		// Luz de alarme estroboscópico vermelha na antepara frontal
		this.alarmBeaconLight = new THREE.PointLight(0xff1122, 0.0, 12);
		this.alarmBeaconLight.position.set(-2.8, 2.0, 0.2);
		this.scene.add(this.alarmBeaconLight);

		// Luz de alarme traseira na eclusa
		this.rearAlarmLight = new THREE.PointLight(0xff1122, 0.0, 10);
		this.rearAlarmLight.position.set(0, 2.38, 6.65);
		this.scene.add(this.rearAlarmLight);

		// Luz de preenchimento direcional suave
		const dirLight = new THREE.DirectionalLight(0x557799, 1.0);
		dirLight.position.set(2, 4, 3);
		this.scene.add(dirLight);

		// 6. Canvas 2D da Tela do Monitor Principal
		this.terminalCanvas = new TerminalScreenCanvas();
		this.screenTexture = new THREE.CanvasTexture(this.terminalCanvas.canvas);
		this.screenTexture.colorSpace = THREE.SRGBColorSpace;
		this.screenTexture.minFilter = THREE.LinearFilter;
		this.screenTexture.magFilter = THREE.LinearFilter;

		// 7. Canvas 2D do Monitor Secundário Auxiliar (Console B à direita)
		this.auxCanvas = new AuxiliaryScreenCanvas();
		this.auxTexture = new THREE.CanvasTexture(this.auxCanvas.canvas);
		this.auxTexture.colorSpace = THREE.SRGBColorSpace;
		this.auxTexture.minFilter = THREE.LinearFilter;
		this.auxTexture.magFilter = THREE.LinearFilter;

		// 8. Grupos da Cena 3D
		this.cabinGroup = new THREE.Group();
		this.monitorGroup = new THREE.Group();
		this.auxMonitorGroup = new THREE.Group();
		this.scene.add(this.cabinGroup);
		this.scene.add(this.monitorGroup);
		this.scene.add(this.auxMonitorGroup);

		// 9. Constrói o Ambiente da Cabine e os Dois Monitores
		this.buildSubmarineCabin();
		this.buildCRTMonitor();
		this.buildAuxiliaryMonitor();

		// 9. Raycasting e Eventos
		this.raycaster = new THREE.Raycaster();
		this.clock = new THREE.Clock();

		this.setupInteractionListeners();
		this.animate();
	}

	/**
	 * Constrói a cabine do submarino com materiais metálicos visíveis:
	 * Paredes de aço rebitadas, vigia de observação, escotilha estanque, mesa e tubos.
	 */
	/**
	 * Constrói a cabine completa e imersiva do submarino em 360°:
	 * Parede Frontal (Console e Vigia), Parede Esquerda (Alta Tensão e O2),
	 * Parede Direita (Rack Sonar, Gravador de Fita e Mapa Batimétrico),
	 * Parede Traseira (Escotilha Estanque de Saída com volante de 4 raios, Escafandro, Armários e Bomba).
	 */
	private buildSubmarineCabin(): void {
		// Materiais metálicos da cabine otimizados com iluminação difusa (Gouraud per-vertex, 10x mais rápido que PBR)
		const steelWallMat = new THREE.MeshLambertMaterial({ color: 0x323c45 });
		const darkRibMat = new THREE.MeshLambertMaterial({ color: 0x1e262c });
		const copperPipeMat = new THREE.MeshLambertMaterial({ color: 0x8a5430 });
		const ironPipeMat = new THREE.MeshLambertMaterial({ color: 0x283038 });
		const redValveMat = new THREE.MeshLambertMaterial({ color: 0xb51c1c });
		const yellowHazardMat = new THREE.MeshLambertMaterial({ color: 0xd4a017 });
		const brassMat = new THREE.MeshLambertMaterial({ color: 0xb8860b });

		// 1. Piso reforçado e teto arqueado do casco de pressão cilíndrico
		this.buildCabinEnclosure(steelWallMat, darkRibMat, yellowHazardMat);

		// 2. Antepara Frontal (Vigia do abismo, vigas e tubulação superior)
		this.buildFrontWall(steelWallMat, darkRibMat, copperPipeMat, ironPipeMat, redValveMat);

		// 3. Parede Esquerda (Alta Tensão 440V, Estação de Oxigênio O2, Armário de Emergência)
		this.buildLeftWall(steelWallMat, darkRibMat, copperPipeMat, ironPipeMat, redValveMat, yellowHazardMat, brassMat);

		// 4. Parede Direita (Rack Sonar, Gravador de Caixa Preta com carretéis, Mapa das Marianas)
		this.buildRightWall(steelWallMat, darkRibMat, copperPipeMat, ironPipeMat, redValveMat, yellowHazardMat, brassMat);

		// 5. Parede Traseira (Escotilha Estanque de Saída com volante de 4 raios, Escafandro, Armários e Bomba)
		this.buildRearWall(steelWallMat, darkRibMat, copperPipeMat, ironPipeMat, redValveMat, yellowHazardMat, brassMat);

		// 6. Mesa do Console do Operador
		this.buildConsoleDesk();
	}

	/**
	 * Estrutura cilíndrica envolvente do casco: Piso com faixas antiderrapantes e teto em abóbada arqueada
	 */
	private buildCabinEnclosure(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		yellowHazardMat: THREE.Material
	): void {
		// Piso de chapa de aço escura
		const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), darkRibMat);
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(0, -1.8, 2.3);
		this.cabinGroup.add(floor);

		// Faixa de segurança amarela no chão em frente ao console
		const floorHazard = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.015, 0.14), yellowHazardMat);
		floorHazard.position.set(0, -1.79, 1.8);
		this.cabinGroup.add(floorHazard);

		// Teto arqueado contínuo do casco de pressão cilíndrico (corre ao longo do eixo Z)
		const vault = new THREE.Mesh(
			new THREE.CylinderGeometry(5.2, 5.2, 9.6, 32, 1, true, Math.PI * 0.22, Math.PI * 0.56),
			steelWallMat
		);
		vault.rotation.x = Math.PI / 2;
		vault.position.set(0, -0.6, 2.3);
		this.cabinGroup.add(vault);

		// Arcos de reforço estrutural do casco ao longo do teto
		for (const z of [-1.0, 1.0, 3.0, 5.0]) {
			const ribArch = new THREE.Mesh(
				new THREE.TorusGeometry(5.2, 0.075, 8, 24, Math.PI * 0.56),
				darkRibMat
			);
			ribArch.rotation.z = Math.PI * 0.22;
			ribArch.position.set(0, -0.6, z);
			this.cabinGroup.add(ribArch);
		}
	}

	/**
	 * Antepara Frontal: Vigas verticais, tubulações de alta pressão, escotilha secundária e vigia
	 */
	private buildFrontWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		copperPipeMat: THREE.Material,
		ironPipeMat: THREE.Material,
		redValveMat: THREE.Material
	): void {
		// Antepara frontal de aço
		const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), steelWallMat);
		frontWall.position.set(0, 1.2, -2.4);
		this.cabinGroup.add(frontWall);

		// Vigas de aço verticais na antepara frontal
		for (let x = -4; x <= 4; x += 2.0) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.0, 0.12), darkRibMat);
			rib.position.set(x, 1.2, -2.34);
			this.cabinGroup.add(rib);
		}

		// Viga horizontal com rebites
		const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(12, 0.22, 0.12), darkRibMat);
		crossBeam.position.set(0, 2.2, -2.34);
		this.cabinGroup.add(crossBeam);

		// Lâmpada de teto frontal com gaiola
		const lampCage = new THREE.Mesh(
			new THREE.CylinderGeometry(0.2, 0.25, 0.4, 8, 1, true),
			new THREE.MeshBasicMaterial({ color: 0x4a5560, wireframe: true })
		);
		lampCage.position.set(0, 2.9, 0.8);
		const lampBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.12, 16, 16),
			new THREE.MeshBasicMaterial({ color: 0xffeed0 })
		);
		lampBulb.position.set(0, 2.85, 0.8);
		this.cabinGroup.add(lampCage, lampBulb);

		// Tubulações superiores de cobre e ferro
		const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 12, 16), copperPipeMat);
		pipe1.rotation.z = Math.PI / 2;
		pipe1.position.set(0, 2.6, -1.5);

		const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12, 16), ironPipeMat);
		pipe2.rotation.z = Math.PI / 2;
		pipe2.position.set(0, 2.35, -1.3);

		// Volante de válvula vermelho no tubo superior
		const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 16), redValveMat);
		valveWheel.rotation.x = Math.PI / 2;
		valveWheel.position.set(-1.2, 2.35, -1.3);
		this.cabinGroup.add(pipe1, pipe2, valveWheel);

		// Escotilha estanque frontal à direita
		const hatchGroup = new THREE.Group();
		hatchGroup.position.set(3.4, 0.8, -2.1);
		const hatchFrame = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.1, 12, 32), darkRibMat);
		const hatchDoor = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 32), steelWallMat);
		hatchDoor.rotation.x = Math.PI / 2;

		const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.05, 8, 24), redValveMat);
		wheel.position.set(0, 0, 0.12);
		const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), darkRibMat);
		bar1.position.set(0, 0, 0.12);
		const bar2 = bar1.clone();
		bar2.rotation.z = Math.PI / 2;

		hatchGroup.add(hatchFrame, hatchDoor, wheel, bar1, bar2);
		this.cabinGroup.add(hatchGroup);

		// Vigia circular olhando para o abismo escuro
		this.buildPorthole();
	}

	/**
	 * Parede Esquerda (X = -4.8):
	 * - Painel de Força Elétrica 440V / Reator com voltímetros, amperímetros e chaves de faca.
	 * - Estação de Oxigênio de Alta Pressão com cilindros amarelos e máscaras de rebreather.
	 * - Armário de Emergência com ferramenta de controle de avarias.
	 * - Tubulações de óleo/pressão com volantes industriais vermelhos e lâmpada âmbar.
	 */
	private buildLeftWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		copperPipeMat: THREE.Material,
		ironPipeMat: THREE.Material,
		redValveMat: THREE.Material,
		yellowHazardMat: THREE.Material,
		brassMat: THREE.Material
	): void {
		// 1. Placa de antepara da parede esquerda
		const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		leftWall.position.set(-4.8, 0.7, 2.3);
		leftWall.rotation.y = Math.PI / 2;
		this.cabinGroup.add(leftWall);

		// Vigas estruturais verticais na parede esquerda
		for (const z of [-1.0, 0.8, 2.6, 4.4, 6.2]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.0, 0.16), darkRibMat);
			rib.position.set(-4.72, 0.7, z);
			this.cabinGroup.add(rib);
		}

		// Tubulação horizontal alta correndo ao longo da parede
		const pipeCu = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9.4, 16), copperPipeMat);
		pipeCu.rotation.x = Math.PI / 2;
		pipeCu.position.set(-4.65, 2.4, 2.3);

		const pipeFe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.4, 16), ironPipeMat);
		pipeFe.rotation.x = Math.PI / 2;
		pipeFe.position.set(-4.65, 2.62, 2.3);

		const valve1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), redValveMat);
		valve1.rotation.y = Math.PI / 2;
		valve1.position.set(-4.56, 2.4, 0.8);

		const valve2 = valve1.clone();
		valve2.position.set(-4.56, 2.4, 4.0);
		this.cabinGroup.add(pipeCu, pipeFe, valve1, valve2);

		// 2. PAINEL DE FORÇA ELÉTRICA / DISJUNTORES 440V DO REATOR
		const pwrBox = new THREE.Mesh(
			new THREE.BoxGeometry(0.22, 1.7, 1.3),
			new THREE.MeshLambertMaterial({ color: 0x182026 })
		);
		pwrBox.position.set(-4.62, 0.75, 0.6);
		this.cabinGroup.add(pwrBox);

		// Placa de advertência de perigo 440V
		const hazardCanvas = this.createHazardCanvas('⚡ FORÇA 440V // REATOR ABISSAL');
		const hazardMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(1.22, 0.22),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hazardCanvas) })
		);
		hazardMesh.position.set(-4.50, 1.48, 0.6);
		hazardMesh.rotation.y = Math.PI / 2;
		this.cabinGroup.add(hazardMesh);

		// Voltímetro e Amperímetro analógicos
		for (let i = 0; i < 2; i++) {
			const gaugeGroup = new THREE.Group();
			gaugeGroup.position.set(-4.50, 1.15, 0.38 + i * 0.44);
			gaugeGroup.rotation.y = Math.PI / 2;

			const gRim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16), darkRibMat);
			gRim.rotation.x = Math.PI / 2;

			const gDial = new THREE.Mesh(
				new THREE.CircleGeometry(0.11, 16),
				new THREE.MeshBasicMaterial({ color: 0xe0dac8 })
			);
			gDial.position.z = 0.025;

			const gNeedle = new THREE.Mesh(
				new THREE.BoxGeometry(0.015, 0.08, 0.005),
				new THREE.MeshBasicMaterial({ color: 0x991111 })
			);
			gNeedle.position.set(0, 0.03, 0.03);
			gNeedle.rotation.z = i === 0 ? 0.3 : -0.4;

			gaugeGroup.add(gRim, gDial, gNeedle);
			this.cabinGroup.add(gaugeGroup);
		}

		// 6 Chaves de faca / disjuntores em cobre com punhos pretos
		for (let row = 0; row < 2; row++) {
			for (let col = 0; col < 3; col++) {
				const swGroup = new THREE.Group();
				swGroup.position.set(-4.50, 0.82 - row * 0.26, 0.35 + col * 0.25);
				swGroup.rotation.y = Math.PI / 2;

				const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.01), copperPipeMat);
				blade.rotation.x = -0.3;
				const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), darkRibMat);
				handle.position.set(0, 0.07, 0.02);

				swGroup.add(blade, handle);
				this.cabinGroup.add(swGroup);
			}
		}

		// LEDs de status do reator (Verde, Âmbar, Vermelho)
		const ledColors = [0x00ff88, 0xffbb00, 0xffbb00, 0xff2222];
		ledColors.forEach((col, idx) => {
			const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
			led.position.set(-4.50, 0.42, 0.36 + idx * 0.16);
			this.cabinGroup.add(led);
		});

		// 3. ESTAÇÃO DE OXIGÊNIO DE EMERGÊNCIA & REBREATHERS
		const o2Rack = new THREE.Mesh(
			new THREE.PlaneGeometry(1.2, 1.5),
			new THREE.MeshLambertMaterial({ color: 0x222c34 })
		);
		o2Rack.position.set(-4.70, 0.6, 3.0);
		o2Rack.rotation.y = Math.PI / 2;
		this.cabinGroup.add(o2Rack);

		// Cilindros duplos de O2 amarelos de alta pressão
		for (let i = 0; i < 2; i++) {
			const cylGroup = new THREE.Group();
			cylGroup.position.set(-4.54, 0.55, 2.82 + i * 0.36);

			const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.95, 16), yellowHazardMat);
			const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), yellowHazardMat);
			dome.position.y = 0.475;

			const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), brassMat);
			valve.position.y = 0.62;

			cylGroup.add(body, dome, valve);
			this.cabinGroup.add(cylGroup);
		}

		// Regulador de pressão e manômetro de O2
		const o2Reg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.38), brassMat);
		o2Reg.position.set(-4.54, 1.18, 3.0);
		this.cabinGroup.add(o2Reg);

		// Máscara com mangueira corrugada de respiração pendurada
		const hose = new THREE.Mesh(
			new THREE.TorusGeometry(0.18, 0.035, 8, 20, Math.PI),
			new THREE.MeshLambertMaterial({ color: 0x11161a })
		);
		hose.position.set(-4.54, 0.5, 3.0);
		hose.rotation.y = Math.PI / 2;
		this.cabinGroup.add(hose);

		// 4. CAIXA DE EMERGÊNCIA ANTI-DESPRESSURIZAÇÃO
		const toolBox = new THREE.Mesh(
			new THREE.BoxGeometry(0.18, 1.0, 0.65),
			new THREE.MeshLambertMaterial({ color: 0xaa1818 })
		);
		toolBox.position.set(-4.62, 0.8, 5.0);
		this.cabinGroup.add(toolBox);

		const glassFront = new THREE.Mesh(
			new THREE.PlaneGeometry(0.58, 0.92),
			new THREE.MeshLambertMaterial({ color: 0x88ccdd, transparent: true, opacity: 0.45 })
		);
		glassFront.position.set(-4.52, 0.8, 5.0);
		glassFront.rotation.y = Math.PI / 2;
		this.cabinGroup.add(glassFront);

		// Pé-de-cabra / alavanca de emergência metálica
		const crowbar = new THREE.Mesh(
			new THREE.CylinderGeometry(0.02, 0.02, 0.75, 8),
			new THREE.MeshLambertMaterial({ color: 0xd4a017 })
		);
		crowbar.position.set(-4.56, 0.8, 5.0);
		crowbar.rotation.x = 0.5;
		this.cabinGroup.add(crowbar);

		// 5. Luminária industrial na parede esquerda com lâmpada âmbar
		const leftLampCage = new THREE.Mesh(
			new THREE.CylinderGeometry(0.14, 0.18, 0.28, 8, 1, true),
			new THREE.MeshBasicMaterial({ color: 0x3d4852, wireframe: true })
		);
		leftLampCage.position.set(-4.55, 2.1, 1.8);
		const leftLampBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.09, 12, 12),
			new THREE.MeshBasicMaterial({ color: 0xffcc88 })
		);
		leftLampBulb.position.set(-4.55, 2.1, 1.8);
		this.cabinGroup.add(leftLampCage, leftLampBulb);
	}

	/**
	 * Parede Direita (X = +4.8):
	 * - Rack Sonar de Comunicações & Gravador de Caixa Preta com carretéis de fita móveis.
	 * - Osciloscópio CRT verde ativo com sinal de ecolocalização abissal.
	 * - Carta Batimétrica das Fossas Marianas / Tartarus (8.000m - 11.000m) iluminada.
	 * - Prancheta com diretrizes operacionais de silêncio acústico e luminária ciano.
	 */
	private buildRightWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		copperPipeMat: THREE.Material,
		ironPipeMat: THREE.Material,
		redValveMat: THREE.Material,
		yellowHazardMat: THREE.Material,
		brassMat: THREE.Material
	): void {
		// 1. Placa de antepara da parede direita
		const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		rightWall.position.set(4.8, 0.7, 2.3);
		rightWall.rotation.y = -Math.PI / 2;
		this.cabinGroup.add(rightWall);

		// Vigas estruturais verticais na parede direita
		for (const z of [-1.0, 0.8, 2.6, 4.4, 6.2]) {
			const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.0, 0.16), darkRibMat);
			rib.position.set(4.72, 0.7, z);
			this.cabinGroup.add(rib);
		}

		// Chicote de cabos industriais pretos ao longo do topo
		const cableBundle = new THREE.Mesh(
			new THREE.CylinderGeometry(0.05, 0.05, 9.4, 12),
			new THREE.MeshLambertMaterial({ color: 0x12161a })
		);
		cableBundle.rotation.x = Math.PI / 2;
		cableBundle.position.set(4.68, 2.5, 2.3);
		this.cabinGroup.add(cableBundle);

		// 2. RACK SONAR DE COMUNICAÇÕES & GRAVADOR DE CAIXA PRETA
		const rackBox = new THREE.Mesh(
			new THREE.BoxGeometry(0.24, 2.1, 1.45),
			new THREE.MeshLambertMaterial({ color: 0x161e24 })
		);
		rackBox.position.set(4.62, 0.75, 1.3);
		this.cabinGroup.add(rackBox);

		// Grelha de ventilação na base do rack
		for (let row = 0; row < 4; row++) {
			const slot = new THREE.Mesh(
				new THREE.BoxGeometry(0.01, 0.02, 0.8),
				new THREE.MeshBasicMaterial({ color: 0x070b0e })
			);
			slot.position.set(4.49, -0.05 - row * 0.06, 1.3);
			this.cabinGroup.add(slot);
		}

		// Osciloscópio (Tela CRT redonda verde com animação por hardware via UV scrolling)
		this.oscilloscopeCanvas = document.createElement('canvas');
		this.oscilloscopeCanvas.width = 256;
		this.oscilloscopeCanvas.height = 128;
		this.drawStaticOscilloscopeWave(this.oscilloscopeCanvas);
		this.oscilloscopeTexture = new THREE.CanvasTexture(this.oscilloscopeCanvas);
		this.oscilloscopeTexture.wrapS = THREE.RepeatWrapping;
		this.oscilloscopeTexture.wrapT = THREE.ClampToEdgeWrapping;

		const oscScreen = new THREE.Mesh(
			new THREE.CircleGeometry(0.22, 24),
			new THREE.MeshBasicMaterial({ map: this.oscilloscopeTexture })
		);
		oscScreen.position.set(4.49, 1.35, 1.3);
		oscScreen.rotation.y = -Math.PI / 2;

		const oscBezel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 24), darkRibMat);
		oscBezel.position.set(4.49, 1.35, 1.3);
		oscBezel.rotation.y = -Math.PI / 2;
		this.cabinGroup.add(oscScreen, oscBezel);

		// Gravador de Fita Magnética (Reel-to-Reel Tape Recorder)
		const reelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.025, 24);
		reelGeo.rotateZ(Math.PI / 2);

		const reelMat = new THREE.MeshLambertMaterial({ color: 0x7a8b98 });
		this.tapeReel1 = new THREE.Mesh(reelGeo, reelMat);
		this.tapeReel1.position.set(4.49, 0.65, 1.05);

		this.tapeReel2 = new THREE.Mesh(reelGeo.clone(), reelMat);
		this.tapeReel2.position.set(4.49, 0.65, 1.55);

		// Cubos centrais de latão dos carretéis
		const hubGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.035, 12);
		hubGeo.rotateZ(Math.PI / 2);
		const hub1 = new THREE.Mesh(hubGeo, brassMat);
		hub1.position.set(4.48, 0.65, 1.05);
		const hub2 = new THREE.Mesh(hubGeo.clone(), brassMat);
		hub2.position.set(4.48, 0.65, 1.55);

		// Tira de fita marrom entre os carretéis
		const tapeStrip = new THREE.Mesh(
			new THREE.BoxGeometry(0.005, 0.015, 0.5),
			new THREE.MeshBasicMaterial({ color: 0x3d2012 })
		);
		tapeStrip.position.set(4.485, 0.48, 1.3);

		// Placa do gravador de voz / caixa preta
		const blackboxCanvas = document.createElement('canvas');
		blackboxCanvas.width = 384;
		blackboxCanvas.height = 48;
		const bctx = blackboxCanvas.getContext('2d')!;
		bctx.fillStyle = '#0a1014';
		bctx.fillRect(0, 0, 384, 48);
		bctx.font = 'bold 18px monospace';
		bctx.fillStyle = '#00ffaa';
		bctx.textAlign = 'center';
		bctx.fillText('GRAVADOR TELEMÉTRICO // REGISTRO NEGRO', 192, 32);

		const bbPlate = new THREE.Mesh(
			new THREE.PlaneGeometry(1.2, 0.15),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blackboxCanvas) })
		);
		bbPlate.position.set(4.49, 0.22, 1.3);
		bbPlate.rotation.y = -Math.PI / 2;

		this.cabinGroup.add(this.tapeReel1, this.tapeReel2, hub1, hub2, tapeStrip, bbPlate);

		// 3. CARTA BATIMÉTRICA TÁTICA DAS FOSSAS MARIANAS (8000m - 11000m)
		const mapCanvas = this.createTrenchMapCanvas();
		const mapMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(2.3, 1.7),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(mapCanvas) })
		);
		mapMesh.position.set(4.68, 1.05, 3.7);
		mapMesh.rotation.y = -Math.PI / 2;

		const mapFrame = new THREE.Mesh(
			new THREE.BoxGeometry(0.05, 1.78, 2.38),
			new THREE.MeshLambertMaterial({ color: 0x222c34 })
		);
		mapFrame.position.set(4.70, 1.05, 3.7);
		this.cabinGroup.add(mapFrame, mapMesh);

		// Luminária em foco sobre o mapa
		const mapLamp = new THREE.Mesh(
			new THREE.BoxGeometry(0.12, 0.08, 0.6),
			new THREE.MeshLambertMaterial({ color: 0x3d4852 })
		);
		mapLamp.position.set(4.55, 1.95, 3.7);
		this.cabinGroup.add(mapLamp);

		// 4. PRANCHETA DE DIRETRIZES DE CONTROLE DE RUÍDO
		const clipCanvas = this.createHazardCanvas('DIRETRIZ DE SEGURANÇA // SILÊNCIO ACÚSTICO');
		const clipMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(0.9, 0.18),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(clipCanvas) })
		);
		clipMesh.position.set(4.68, 0.75, 5.4);
		clipMesh.rotation.y = -Math.PI / 2;
		this.cabinGroup.add(clipMesh);
	}

	/**
	 * Parede Traseira (Z = +7.0, diretamente atrás do assento do operador):
	 * - Escotilha Estanque de Saída Principal / Eclusa com volante de travamento de 4 raios.
	 * - Luz estroboscópica de alarme traseira (sincronizada com o alarme do casco).
	 * - Armários de tripulação com Macacão de Mergulho Profundo (Escafandro) de bronze.
	 * - Estação de Bombeamento de Porão (Bomba com aletas e poça de condensação).
	 * - Lâmpada industrial com gaiola protetora no teto traseiro.
	 */
	private buildRearWall(
		steelWallMat: THREE.Material,
		darkRibMat: THREE.Material,
		copperPipeMat: THREE.Material,
		ironPipeMat: THREE.Material,
		redValveMat: THREE.Material,
		yellowHazardMat: THREE.Material,
		brassMat: THREE.Material
	): void {
		// 1. Placa de antepara da parede traseira (Atrás do operador em Z = +7.0)
		const rearWall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.0), steelWallMat);
		rearWall.position.set(0, 0.7, 7.0);
		rearWall.rotation.y = Math.PI;
		this.cabinGroup.add(rearWall);

		// Vigas de reforço horizontal e colunas estruturais
		const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.25, 0.16), darkRibMat);
		crossBeam.position.set(0, 2.3, 6.92);
		this.cabinGroup.add(crossBeam);

		for (const x of [-1.8, 1.8]) {
			const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.0, 0.18), darkRibMat);
			pillar.position.set(x, 0.7, 6.9);
			this.cabinGroup.add(pillar);
		}

		// 2. ESCOTILHA ESTANQUE DE SAÍDA PRINCIPAL / ECLUSA
		const airlockGroup = new THREE.Group();
		airlockGroup.position.set(0, 0.65, 6.84);
		airlockGroup.rotation.y = Math.PI; // Voltada para frente (em direção ao jogador)

		// Moldura reforçada circular
		const frame = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.14, 16, 32), darkRibMat);

		// Porta de aço pesado
		const door = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 32), steelWallMat);
		door.rotation.x = Math.PI / 2;

		// Volante de travamento estanque de 4 raios vermelho industrial
		const lockWheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.065, 12, 24), redValveMat);
		lockWheel.position.set(0, 0, 0.14);

		for (let i = 0; i < 4; i++) {
			const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 8), darkRibMat);
			spoke.rotation.z = (i * Math.PI) / 4;
			spoke.position.set(0, 0, 0.14);
			airlockGroup.add(spoke);
		}

		// Mostrador de equalização de pressão no centro da escotilha
		const pDial = new THREE.Mesh(
			new THREE.CircleGeometry(0.14, 16),
			new THREE.MeshBasicMaterial({ color: 0xded8c6 })
		);
		pDial.position.set(0, 0, 0.16);

		airlockGroup.add(frame, door, lockWheel, pDial);
		this.cabinGroup.add(airlockGroup);

		// Banner de risco acima da escotilha
		const hatchHazard = this.createHazardCanvas('COMPARTIMENTO 04 // RISCO DE ALAGAMENTO // NÃO ABRIR');
		const hatchSign = new THREE.Mesh(
			new THREE.PlaneGeometry(2.6, 0.38),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hatchHazard) })
		);
		hatchSign.position.set(0, 2.05, 6.86);
		hatchSign.rotation.y = Math.PI;
		this.cabinGroup.add(hatchSign);

		// Luz estroboscópica de alarme traseira montada acima da escotilha
		const rearStrobeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12);
		rearStrobeGeo.rotateX(Math.PI / 2);
		const rearStrobeHousing = new THREE.Mesh(rearStrobeGeo, new THREE.MeshBasicMaterial({ color: 0x550000 }));
		rearStrobeHousing.position.set(0, 2.38, 6.82);
		this.cabinGroup.add(rearStrobeHousing);

		// 3. ARMÁRIOS DE EQUIPAGEM E TRAJE DE MERGULHO PROFUNDO (ESCAFANDRO)
		const lockerGroup = new THREE.Group();
		lockerGroup.position.set(-2.8, 0.6, 6.8);
		lockerGroup.rotation.y = Math.PI;

		const lockerBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.35), darkRibMat);
		lockerGroup.add(lockerBody);

		// Fendas de ventilação e divisões dos 3 armários
		for (let c = 0; c < 3; c++) {
			const seam = new THREE.Mesh(
				new THREE.BoxGeometry(0.015, 2.0, 0.02),
				new THREE.MeshBasicMaterial({ color: 0x090d10 })
			);
			seam.position.set(-0.5 + c * 0.5, 0, 0.18);
			lockerGroup.add(seam);
		}
		this.cabinGroup.add(lockerGroup);

		// Traje de mergulho atmosférico abissal (Escafandro) pendurado em suporte
		const suitGroup = new THREE.Group();
		suitGroup.position.set(-1.65, 0.8, 6.78);
		suitGroup.rotation.y = Math.PI;

		// Capacete esférico de bronze com visor circular
		const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), brassMat);
		helmet.position.set(0, 0.45, 0);

		const visor = new THREE.Mesh(
			new THREE.CircleGeometry(0.11, 16),
			new THREE.MeshBasicMaterial({ color: 0x011a24 })
		);
		visor.position.set(0, 0.45, 0.21);

		const visorRim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 16), darkRibMat);
		visorRim.position.set(0, 0.45, 0.21);

		// Torso reforçado em lona amarela espessa com pesos de chumbo
		const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.32), yellowHazardMat);
		torso.position.set(0, -0.05, 0);

		// Botas pesadas de chumbo
		for (let b = 0; b < 2; b++) {
			const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.65, 12), darkRibMat);
			boot.position.set(-0.15 + b * 0.3, -0.65, 0);
			suitGroup.add(boot);
		}

		suitGroup.add(helmet, visor, visorRim, torso);
		this.cabinGroup.add(suitGroup);

		// 4. ESTAÇÃO DE BOMBEAMENTO DE PORÃO (BILGE DRAINAGE PUMP)
		const pumpGroup = new THREE.Group();
		pumpGroup.position.set(2.7, -0.4, 6.75);
		pumpGroup.rotation.y = Math.PI;

		// Motor cilíndrico de ferro fundido com aletas
		const motor = new THREE.Mesh(
			new THREE.CylinderGeometry(0.35, 0.35, 0.72, 16),
			new THREE.MeshLambertMaterial({ color: 0x242e35 })
		);
		motor.rotation.x = Math.PI / 2;

		// Tubo de sucção entrando no chão
		const suctionPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 12), ironPipeMat);
		suctionPipe.position.set(0, -0.65, 0);

		// Tubo de descarga subindo para a antepara
		const dischargePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 12), copperPipeMat);
		dischargePipe.position.set(0.32, 0.8, 0);

		const pumpValve = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 16), redValveMat);
		pumpValve.position.set(0.32, 1.2, 0.1);

		pumpGroup.add(motor, suctionPipe, dischargePipe, pumpValve);
		this.cabinGroup.add(pumpGroup);

		// Poça de condensação / água brilhante no chão abaixo da bomba
		const puddle = new THREE.Mesh(
			new THREE.CircleGeometry(0.65, 16),
			new THREE.MeshLambertMaterial({ color: 0x050c10 })
		);
		puddle.rotation.x = -Math.PI / 2;
		puddle.position.set(2.7, -1.79, 6.6);
		this.cabinGroup.add(puddle);

		// 5. Lâmpada industrial de teto da seção traseira
		const rearLampCage = new THREE.Mesh(
			new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8, 1, true),
			new THREE.MeshBasicMaterial({ color: 0x4a5560, wireframe: true })
		);
		rearLampCage.position.set(0, 2.8, 5.0);
		const rearLampBulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.11, 16, 16),
			new THREE.MeshBasicMaterial({ color: 0xffeed0 })
		);
		rearLampBulb.position.set(0, 2.75, 5.0);
		this.cabinGroup.add(rearLampCage, rearLampBulb);
	}

	/**
	 * Gera textura procedural de listras de perigo com texto central
	 */
	private createHazardCanvas(text: string): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 96;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#101518';
		ctx.fillRect(0, 0, 512, 96);

		// Listras amarelas e pretas diagonais
		const stripeW = 24;
		for (let x = -96; x < 512 + 96; x += stripeW * 2) {
			ctx.fillStyle = '#d4a017';
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x + stripeW, 0);
			ctx.lineTo(x + stripeW - 20, 20);
			ctx.lineTo(x - 20, 20);
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(x, 76);
			ctx.lineTo(x + stripeW, 76);
			ctx.lineTo(x + stripeW - 20, 96);
			ctx.lineTo(x - 20, 96);
			ctx.fill();
		}

		ctx.font = 'bold 20px monospace';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'center';
		ctx.fillText(text, 256, 54);

		return canvas;
	}

	/**
	 * Gera a Carta Batimétrica das Fossas Marianas a 8.000m - 11.000m
	 */
	private createTrenchMapCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 384;
		const ctx = canvas.getContext('2d')!;

		// Fundo azul escuro abissal
		ctx.fillStyle = '#020b12';
		ctx.fillRect(0, 0, 512, 384);

		// Grade batimétrica
		ctx.strokeStyle = 'rgba(0, 255, 200, 0.12)';
		ctx.lineWidth = 1;
		for (let x = 32; x < 512; x += 48) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, 384);
			ctx.stroke();
		}
		for (let y = 32; y < 384; y += 48) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(512, y);
			ctx.stroke();
		}

		// Isóbatas (curvas de profundidade do relevo oceânico)
		const depths = [
			{ y: 70, label: '0m // SUPERFÍCIE' },
			{ y: 135, label: '3000m // ZONA MESOPELÁGICA' },
			{ y: 200, label: '6000m // ZONA ABISSOPELÁGICA' },
			{ y: 265, label: '8000m // FOSSA TARTARUS [ESTAÇÃO]' },
			{ y: 330, label: '11000m // ABISSO HADAL' }
		];

		ctx.strokeStyle = '#00a880';
		ctx.lineWidth = 2;
		depths.forEach((d, i) => {
			ctx.beginPath();
			ctx.moveTo(16, d.y);
			for (let x = 16; x < 496; x += 32) {
				const wave = Math.sin((x + i * 40) * 0.025) * 14;
				ctx.lineTo(x, d.y + wave);
			}
			ctx.stroke();

			ctx.font = 'bold 12px monospace';
			ctx.fillStyle = '#00ffaa';
			ctx.fillText(d.label, 24, d.y - 4);
		});

		// Ponto da Estação Tartarus-V a 8000m
		ctx.fillStyle = '#00ffff';
		ctx.beginPath();
		ctx.arc(220, 265, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.font = 'bold 13px monospace';
		ctx.fillStyle = '#ffffff';
		ctx.fillText('ESTAÇÃO TARTARUS-V [8000m]', 235, 270);

		// Anomalia bio-acústica ativa da criatura abissal
		ctx.strokeStyle = '#ff2244';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(380, 275, 28, 0, Math.PI * 2);
		ctx.stroke();
		ctx.fillStyle = 'rgba(255, 34, 68, 0.25)';
		ctx.fill();

		ctx.fillStyle = '#ff4466';
		ctx.font = 'bold 12px monospace';
		ctx.fillText('⚠ CONTATO BIO-ACÚSTICO ANÔMALO', 260, 325);
		ctx.fillText('MODULAÇÃO HUFFMAN EXIGIDA', 260, 342);

		// Moldura luminosa do mapa
		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 4;
		ctx.strokeRect(6, 6, 500, 372);

		ctx.fillStyle = '#00ffaa';
		ctx.font = 'bold 14px monospace';
		ctx.fillText('SETOR MARIANAS-SUL // CARTA BATIMÉTRICA CLASSIFICADA', 16, 26);

		return canvas;
	}

	/**
	 * Desenha uma forma de onda acústica contínua pré-renderizada para o osciloscópio.
	 * Utiliza UV repeat/offset por hardware na GPU, eliminando 60 redraws e uploads de textura/segundo.
	 */
	private drawStaticOscilloscopeWave(canvas: HTMLCanvasElement): void {
		const ctx = canvas.getContext('2d')!;
		const w = canvas.width;
		const h = canvas.height;

		ctx.fillStyle = '#02140a';
		ctx.fillRect(0, 0, w, h);

		// Grade verde escura do osciloscópio
		ctx.strokeStyle = '#053018';
		ctx.lineWidth = 1;
		for (let i = 16; i < w; i += 16) {
			ctx.beginPath();
			ctx.moveTo(i, 0);
			ctx.lineTo(i, h);
			ctx.stroke();
		}
		for (let i = 16; i < h; i += 16) {
			ctx.beginPath();
			ctx.moveTo(0, i);
			ctx.lineTo(w, i);
			ctx.stroke();
		}

		// Sinal acústico em verde de fósforo brilhante com loop contínuo e perfeito
		ctx.strokeStyle = '#00ff88';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		const cycles = 4;
		for (let x = 0; x <= w; x++) {
			const angle = (x / w) * Math.PI * 2 * cycles;
			const harmonic = Math.sin(angle * 2.5) * 6;
			const y = h / 2 + Math.sin(angle) * 28 + harmonic;
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}

	/**
	 * Constrói a vigia circular de observação olhando para o oceano escuro a 8.000m.
	 */
	private buildPorthole(): void {
		const portholeGroup = new THREE.Group();
		portholeGroup.position.set(-3.6, 0.9, -1.5);
		portholeGroup.rotation.y = 0.45; // Voltada suavemente para o jogador

		// Flange de aço pesado com parafusos
		const flange = new THREE.Mesh(
			new THREE.TorusGeometry(0.9, 0.12, 12, 32),
			new THREE.MeshLambertMaterial({ color: 0x222c34 })
		);

		// Parafusos radiais na moldura
		const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
		const boltMat = new THREE.MeshLambertMaterial({ color: 0x506070 });
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			const bolt = new THREE.Mesh(boltGeo, boltMat);
			bolt.rotation.x = Math.PI / 2;
			bolt.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.08);
			portholeGroup.add(bolt);
		}

		// Vidro de quartzo reforçado
		const glass = new THREE.Mesh(
			new THREE.CircleGeometry(0.82, 32),
			new THREE.MeshLambertMaterial({
				color: 0x011b22,
				transparent: true,
				opacity: 0.85
			})
		);
		glass.position.set(0, 0, 0.03);

		// Fundo da água abissal
		const oceanBackdrop = new THREE.Mesh(
			new THREE.PlaneGeometry(3.5, 3.5),
			new THREE.MeshBasicMaterial({ color: 0x00080d })
		);
		oceanBackdrop.position.set(0, 0, -0.7);

		// Partículas de neve marinha
		const count = 100;
		const pGeo = new THREE.BufferGeometry();
		const pPos = new Float32Array(count * 3);
		for (let i = 0; i < count * 3; i += 3) {
			pPos[i] = (Math.random() - 0.5) * 1.6;
			pPos[i + 1] = (Math.random() - 0.5) * 1.6;
			pPos[i + 2] = -0.1 - Math.random() * 0.5;
		}
		pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
		this.marineSnowParticles = new THREE.Points(
			pGeo,
			new THREE.PointsMaterial({ color: 0x00ffcc, size: 0.03, transparent: true, opacity: 0.5 })
		);

		// Criatura abissal fora da janela
		const creatureGeo = new THREE.SphereGeometry(0.35, 16, 16);
		creatureGeo.scale(2.0, 0.7, 0.5);
		this.abyssalCreature = new THREE.Mesh(
			creatureGeo,
			new THREE.MeshBasicMaterial({ color: 0x080104, transparent: true, opacity: 0.0 })
		);
		this.abyssalCreature.position.set(-0.8, 0, -0.45);

		// Olhos vermelhos da entidade
		const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
		const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
		const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
		eye1.position.set(0.3, 0.08, 0.2);
		const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
		eye2.position.set(0.42, 0.05, 0.18);
		this.abyssalCreature.add(eye1, eye2);

		portholeGroup.add(flange, glass, oceanBackdrop, this.marineSnowParticles, this.abyssalCreature);
		this.cabinGroup.add(portholeGroup);
	}

	/**
	 * Constrói a mesa de console com manômetros analógicos e botões táteis.
	 */
	private buildConsoleDesk(): void {
		const deskMat = new THREE.MeshLambertMaterial({
			color: 0x1f2830
		});

		// Tampo de aço da mesa do console
		const deskTop = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 2.8), deskMat);
		deskTop.position.set(0, -1.2, 0.2);
		this.cabinGroup.add(deskTop);

		// Painel frontal chanfrado com controles
		const frontDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.65, 0.15), deskMat);
		frontDeck.rotation.x = -Math.PI * 0.2;
		frontDeck.position.set(0, -1.45, 1.4);
		this.cabinGroup.add(frontDeck);

		// MANÔMETRO DE PRESSÃO (Esquerda da mesa)
		this.buildManometer(-2.5, -1.05, 0.85);

		// MANÔMETRO DE SONAR dB (Direita da mesa)
		this.buildSonarMeter(1.85, -1.05, 1.25);

		// Teclado militar metálico no console
		const kb = new THREE.Mesh(
			new THREE.BoxGeometry(2.4, 0.06, 0.6),
			new THREE.MeshLambertMaterial({ color: 0x141b20 })
		);
		kb.position.set(0, -1.08, 1.0);
		this.cabinGroup.add(kb);
	}

	/**
	 * Manômetro analógico com mostrador em canvas e agulha 3D.
	 */
	private buildManometer(x: number, y: number, z: number): void {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.x = -Math.PI * 0.15;

		const rim = new THREE.Mesh(
			new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24),
			new THREE.MeshLambertMaterial({ color: 0x3d4852 })
		);
		rim.rotation.x = Math.PI / 2;

		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#eae4d4';
		ctx.beginPath();
		ctx.arc(128, 128, 120, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#111';
		ctx.lineWidth = 4;
		ctx.stroke();

		// Faixa de perigo
		ctx.strokeStyle = '#cc1111';
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
		this.pressureNeedle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xaa1111 }));
		this.pressureNeedle.position.set(0, 0, 0.06);

		group.add(rim, dial, this.pressureNeedle);
		this.cabinGroup.add(group);
	}

	/**
	 * Galvanômetro do Sonar.
	 */
	private buildSonarMeter(x: number, y: number, z: number): void {
		const group = new THREE.Group();
		group.position.set(x, y, z);
		group.rotation.x = -Math.PI * 0.15;

		const rim = new THREE.Mesh(
			new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24),
			new THREE.MeshLambertMaterial({ color: 0x3d4852 })
		);
		rim.rotation.x = Math.PI / 2;

		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const ctx = c.getContext('2d')!;
		ctx.fillStyle = '#0a1d18';
		ctx.beginPath();
		ctx.arc(128, 128, 120, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#00ffaa';
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.font = 'bold 22px monospace';
		ctx.fillStyle = '#00ffaa';
		ctx.textAlign = 'center';
		ctx.fillText('SONAR dB', 128, 175);
		ctx.fillText('ACÚSTICO', 128, 195);

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

	/**
	 * Constrói o gabinete do Monitor CRT retrô sobre a mesa.
	 * A tela frontal usa a CanvasTexture autoiluminada do TerminalScreenCanvas.
	 */
	private buildCRTMonitor(): void {
		const casingMat = new THREE.MeshLambertMaterial({
			color: 0x1d272d
		});

		const bezelMat = new THREE.MeshLambertMaterial({
			color: 0x27343c
		});

		// 1. Gabinete profundo do monitor (fica atrás da moldura e da tela)
		const casing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, 1.8), casingMat);
		casing.position.set(0, 0.45, -1.05);
		this.monitorGroup.add(casing);

		// 2. Moldura metálica exterior (Bezel chanfrado)
		const topB = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.25), bezelMat);
		topB.position.set(0, 1.98, 0.05);
		const botB = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 0.25), bezelMat);
		botB.position.set(0, -1.08, 0.05);
		const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.25), bezelMat);
		leftB.position.set(-2.02, 0.45, 0.05);
		const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.25), bezelMat);
		rightB.position.set(2.02, 0.45, 0.05);

		this.monitorGroup.add(topB, botB, leftB, rightB);

		// 3. Placa metálica de identificação no topo do monitor
		const labelCanvas = document.createElement('canvas');
		labelCanvas.width = 512;
		labelCanvas.height = 64;
		const lctx = labelCanvas.getContext('2d')!;
		lctx.fillStyle = '#11171a';
		lctx.fillRect(0, 0, 512, 64);
		lctx.font = 'bold 26px "Courier New", monospace';
		lctx.fillStyle = '#00ffaa';
		lctx.textAlign = 'center';
		lctx.fillText('TARTARUS-V // SONAR TERMINAL 8000M', 256, 42);

		const plate = new THREE.Mesh(
			new THREE.PlaneGeometry(2.4, 0.25),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
		);
		plate.position.set(0, 1.98, 0.18);
		this.monitorGroup.add(plate);

		// 4. Botão físico de alimentação e LED de status verde no Bezel inferior
		const pwrBtnGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 16);
		pwrBtnGeo.rotateX(Math.PI / 2);
		const pwrBtn = new THREE.Mesh(
			pwrBtnGeo,
			new THREE.MeshLambertMaterial({ color: 0x202b28 })
		);
		pwrBtn.position.set(1.35, -1.08, 0.18);
		this.monitorGroup.add(pwrBtn);

		const pwrLedGeo = new THREE.SphereGeometry(0.035, 12, 12);
		const pwrLed = new THREE.Mesh(
			pwrLedGeo,
			new THREE.MeshBasicMaterial({ color: 0x00ffaa })
		);
		pwrLed.position.set(1.52, -1.08, 0.18);
		this.monitorGroup.add(pwrLed);

		// 5. TELA DE VIDRO CURVO DO CRT (Mapeia a textura 2D do Canvas - Autoiluminada sem oclusão)
		const screenGeo = new THREE.PlaneGeometry(3.7, 2.7, 32, 24);
		const pos = screenGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = -0.07 * ((x * x) / 5.0 + (y * y) / 3.8);
			pos.setZ(i, z);
		}
		screenGeo.computeVertexNormals();

		// MeshBasicMaterial garante brilho de fósforo constante e visibilidade 100% perfeita
		const screenMat = new THREE.MeshBasicMaterial({
			map: this.screenTexture,
			toneMapped: false
		});

		this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
		this.screenMesh.position.set(0, 0.45, 0.06);
		this.screenMesh.userData = { isScreen: true };
		this.monitorGroup.add(this.screenMesh);
	}

	/**
	 * Constrói o monitor CRT secundário menor à direita do console.
	 * Exibe os controles de missão, telemetria da estação e comandos do operador.
	 * Totalmente desobstruído em relação ao monitor principal e angulado para o operador.
	 */
	private buildAuxiliaryMonitor(): void {
		const casingMat = new THREE.MeshLambertMaterial({
			color: 0x1a2328
		});

		const bezelMat = new THREE.MeshLambertMaterial({
			color: 0x243038
		});

		const group = new THREE.Group();
		// Posicionado com desobstrução total em relação ao monitor principal, voltado diretamente para o operador
		group.position.set(3.1, 0.45, 0.70);
		group.rotation.y = -Math.PI * 0.27; // Angulado ~49° em direção aos olhos do jogador
		group.rotation.x = -Math.PI * 0.02; // Leve inclinação ergonômica para cima

		// 1. Gabinete traseiro
		const casing = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.05, 0.95), casingMat);
		casing.position.set(0, 0, -0.52);
		group.add(casing);

		// 2. Braço articulado e suporte metálico fixado à mesa do console
		const standArm = new THREE.Mesh(
			new THREE.CylinderGeometry(0.08, 0.09, 1.55, 16),
			new THREE.MeshLambertMaterial({ color: 0x2a363f })
		);
		standArm.position.set(0, -0.78, -0.2);
		group.add(standArm);

		const baseFlange = new THREE.Mesh(
			new THREE.CylinderGeometry(0.24, 0.27, 0.08, 16),
			new THREE.MeshLambertMaterial({ color: 0x1e272e })
		);
		baseFlange.position.set(0, -1.52, -0.2);
		group.add(baseFlange);

		// 3. Moldura chanfrada (Bezel)
		const topB = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.22, 0.16), bezelMat);
		topB.position.set(0, 0.895, 0.04);
		const botB = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.28, 0.16), bezelMat);
		botB.position.set(0, -0.865, 0.04);
		const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.05, 0.16), bezelMat);
		leftB.position.set(-1.16, 0, 0.04);
		const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.05, 0.16), bezelMat);
		rightB.position.set(1.16, 0, 0.04);

		group.add(topB, botB, leftB, rightB);

		// 4. Placa gravada no topo do monitor secundário
		const labelCanvas = document.createElement('canvas');
		labelCanvas.width = 512;
		labelCanvas.height = 64;
		const lctx = labelCanvas.getContext('2d')!;
		lctx.fillStyle = '#0f1816';
		lctx.fillRect(0, 0, 512, 64);
		lctx.font = 'bold 24px "Courier New", monospace';
		lctx.fillStyle = '#00ffaa';
		lctx.textAlign = 'center';
		lctx.fillText('SUB-TERMINAL B // TELEMETRIA', 256, 42);

		const plate = new THREE.Mesh(
			new THREE.PlaneGeometry(1.9, 0.18),
			new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
		);
		plate.position.set(0, 0.90, 0.13);
		group.add(plate);

		// 5. Botão físico e LED de status
		const pwrBtnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16);
		pwrBtnGeo.rotateX(Math.PI / 2);
		const pwrBtn = new THREE.Mesh(
			pwrBtnGeo,
			new THREE.MeshLambertMaterial({ color: 0x22332a })
		);
		pwrBtn.position.set(0.85, -0.865, 0.13);
		group.add(pwrBtn);

		const pwrLed = new THREE.Mesh(
			new THREE.SphereGeometry(0.025, 12, 12),
			new THREE.MeshBasicMaterial({ color: 0x00ffaa })
		);
		pwrLed.position.set(0.98, -0.865, 0.13);
		group.add(pwrLed);

		// 6. Tela CRT Curva Autoiluminada (Proporção 4:3 com 2.15 x 1.61)
		const screenGeo = new THREE.PlaneGeometry(2.15, 1.61, 24, 18);
		const pos = screenGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = -0.035 * ((x * x) / 1.8 + (y * y) / 1.3);
			pos.setZ(i, z);
		}
		screenGeo.computeVertexNormals();

		const screenMat = new THREE.MeshBasicMaterial({
			map: this.auxTexture,
			toneMapped: false
		});

		this.auxScreenMesh = new THREE.Mesh(screenGeo, screenMat);
		this.auxScreenMesh.position.set(0, 0, 0.05);
		this.auxScreenMesh.userData = { isAuxScreen: true };
		group.add(this.auxScreenMesh);

		this.auxMonitorGroup.add(group);
	}

	/**
	 * Configura escuta de arrasto para girar a cabeça (Pitch/Yaw) no próprio eixo,
	 * e clique pontual para interagir com a tela dos monitores CRT.
	 */
	private setupInteractionListeners(): void {
		const onPointerDown = (e: MouseEvent) => {
			if (e.button !== 0) return;
			this.isDragging = true;
			this.lastPointerX = e.clientX;
			this.lastPointerY = e.clientY;
			this.pointerDownPos.set(e.clientX, e.clientY);
		};

		const onPointerMove = (e: MouseEvent) => {
			if (!this.isDragging) return;

			const deltaX = e.clientX - this.lastPointerX;
			const deltaY = e.clientY - this.lastPointerY;
			this.lastPointerX = e.clientX;
			this.lastPointerY = e.clientY;

			// Sensibilidade de rotação da cabeça (Yaw & Pitch)
			const sensitivity = 0.0035;
			this.targetYaw -= deltaX * sensitivity;
			this.targetPitch -= deltaY * sensitivity;

			// Limita o pitch vertical para não virar de ponta-cabeça (-60° a +60°)
			const maxPitch = Math.PI * 0.35;
			this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, -maxPitch, maxPitch);
		};

		const onPointerUp = (e: MouseEvent) => {
			if (!this.isDragging) return;
			this.isDragging = false;
			const distMoved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

			// Se moveu menos de 10 pixels, foi um clique pontual: Raycast nas telas dos monitores
			if (distMoved < 10) {
				const rect = this.canvas.getBoundingClientRect();
				this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

				this.raycaster.setFromCamera(this.mouseNDC, this.camera);

				// 1. Clique no Monitor Principal (Árvore de Huffman e Ações)
				if (this.screenMesh) {
					const intersects = this.raycaster.intersectObject(this.screenMesh, false);
					if (intersects.length > 0 && intersects[0].uv) {
						const { x, y } = intersects[0].uv;
						this.terminalCanvas.handleClickUV(x, y);
						this.isMainScreenDirty = true;
					}
				}

				// 2. Clique no Monitor Secundário (Telemetria, Fases, Som e Foco)
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

				// Se clicou na carcaça ou moldura do monitor secundário, foca nele
				if (!auxHandled && this.auxMonitorGroup) {
					const groupIntersects = this.raycaster.intersectObjects(this.auxMonitorGroup.children, true);
					if (groupIntersects.length > 0) {
						this.focusAuxiliaryMonitor();
					}
				}
			}
		};

		this.canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	/**
	 * Conecta callback de ações do terminal principal para o loop do jogo.
	 */
	public onScreenAction(cb: ScreenActionCallback): void {
		this.terminalCanvas.setActionCallback(cb);
	}

	/**
	 * Conecta callback de ações do terminal secundário auxiliar.
	 */
	public onAuxAction(cb: AuxActionCallback): void {
		this.auxCanvas.setActionCallback(cb);
	}

	/**
	 * Transição suave para virar a cabeça diretamente para a tela do monitor CRT principal e dar zoom [Tecla F].
	 */
	public focusMonitor(): void {
		this.targetYaw = 0;
		this.targetPitch = -0.06;
		this.targetFov = 34; // Zoom óptico no monitor CRT principal
	}

	/**
	 * Transição suave para virar a cabeça para o monitor secundário auxiliar à direita [Tecla C].
	 */
	public focusAuxiliaryMonitor(): void {
		this.targetYaw = -0.85;
		this.targetPitch = -0.065;
		this.targetFov = 30; // Zoom óptico bem próximo e nítido no monitor auxiliar
	}

	/**
	 * Reseta a visão da cabeça para o centro da cabine em ângulo amplo.
	 */
	public resetCabinView(): void {
		this.targetYaw = 0;
		this.targetPitch = -0.06;
		this.targetFov = 54; // Visão panorâmica da cabine
	}

	/**
	 * Atualiza a telemetria dos manômetros do console.
	 */
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
	 * Loop principal de animação e renderização.
	 */
	private animate = (): void => {
		this.animationFrameId = requestAnimationFrame(this.animate);

		const delta = this.clock.getDelta();
		const elapsedTime = this.clock.getElapsedTime();

		// 1. Renderiza o HUD e a Árvore de Huffman diretamente na textura da tela do monitor principal
		// Throttling da varredura de radar para ~22 FPS (a cada 45ms) e dirty-checking imediato para ações
		const radarInterval = 0.045;
		const radarNeedsUpdate = elapsedTime - this.lastRadarTime >= radarInterval;

		if (this.currentScreenState && (this.isMainScreenDirty || radarNeedsUpdate)) {
			this.terminalCanvas.render(this.currentScreenState, delta);
			this.screenTexture.needsUpdate = true;
			this.isMainScreenDirty = false;
			if (radarNeedsUpdate) {
				this.lastRadarTime = elapsedTime;
			}
		}

		// 2. Renderiza os controles de missão e telemetria no monitor secundário à direita
		// Apenas atualiza quando dirty (ou periodicamente a cada 500ms para o LED de status)
		const auxBlinkInterval = 0.5;
		const auxBlinkNeedsUpdate = elapsedTime - this.lastAuxBlinkTime >= auxBlinkInterval;

		if (this.currentAuxState && (this.isAuxScreenDirty || auxBlinkNeedsUpdate)) {
			this.auxCanvas.render(this.currentAuxState, delta);
			this.auxTexture.needsUpdate = true;
			this.isAuxScreenDirty = false;
			if (auxBlinkNeedsUpdate) {
				this.lastAuxBlinkTime = elapsedTime;
			}
		}

		// 2. Luz de emergência piscante (ante-sala frontal e escotilha traseira)
		if (this.isAlarmActive) {
			const strobe = Math.sin(elapsedTime * 14.0) > 0 ? 4.0 : 0.0;
			this.alarmBeaconLight.intensity = strobe;
			if (this.rearAlarmLight) this.rearAlarmLight.intensity = strobe * 0.9;
		} else {
			this.alarmBeaconLight.intensity = 0.0;
			if (this.rearAlarmLight) this.rearAlarmLight.intensity = 0.0;
		}

		// Rotação contínua dos carretéis de fita do gravador de caixa preta
		if (this.tapeReel1 && this.tapeReel2) {
			const reelSpeed = delta * 2.2;
			this.tapeReel1.rotation.x += reelSpeed;
			this.tapeReel2.rotation.x += reelSpeed;
		}

		// Atualização contínua da forma de onda do osciloscópio acústico via deslocamento UV por hardware
		if (this.oscilloscopeTexture) {
			this.oscilloscopeTexture.offset.x += delta * 0.35;
		}

		// 3. Suavização das agulhas dos manômetros
		if (this.pressureNeedle) {
			this.pressureNeedle.rotation.z = THREE.MathUtils.lerp(
				this.pressureNeedle.rotation.z,
				-this.targetPressureDeg + Math.sin(elapsedTime * 6.0) * 0.02,
				0.08
			);
		}
		if (this.sonarNeedle) {
			this.currentSonarDeg = THREE.MathUtils.lerp(this.currentSonarDeg, this.targetSonarDeg, 0.1);
			this.sonarNeedle.rotation.z = this.currentSonarDeg + (Math.random() - 0.5) * 0.03;
		}

		// 4. Animação da neve marinha e criatura na vigia (zero mutação de buffer geometry)
		if (this.marineSnowParticles) {
			this.marineSnowParticles.position.y -= delta * 0.06;
			if (this.marineSnowParticles.position.y < -0.6) {
				this.marineSnowParticles.position.y += 0.6;
			}
		}

		if (this.abyssalCreature) {
			const mat = this.abyssalCreature.material as THREE.MeshBasicMaterial;
			const targetOpacity = Math.max(0, (this.currentProximity - 30) / 70) * 0.85;
			mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.05);

			this.abyssalCreature.position.x = Math.sin(elapsedTime * 0.35) * 0.7;
			this.abyssalCreature.position.y = Math.cos(elapsedTime * 0.5) * 0.18;
		}

		// 5. Suavização da rotação da cabeça e zoom óptico FOV
		this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 0.14);
		this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, 0.14);

		if (Math.abs(this.currentFov - this.targetFov) > 0.05) {
			this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, 0.12);
			this.camera.fov = this.currentFov;
			this.camera.updateProjectionMatrix();
		}

		// Posição física travada no assento (câmera nunca anda pelo espaço)
		this.camera.position.copy(this.seatPosition);

		// Tremor de câmera quando o casco range
		if (this.cameraShakeIntensity > 0.001) {
			const rx = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.08;
			const ry = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.08;
			this.camera.position.x += rx;
			this.camera.position.y += ry;
			this.cameraShakeIntensity *= Math.pow(0.05, delta);
		}

		// Aplica a orientação da visão em Euler YXZ
		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.currentYaw;
		this.camera.rotation.x = this.currentPitch;

		// 6. Renderização da cena 3D
		this.renderer.render(this.scene, this.camera);
	};

	public dispose(): void {
		cancelAnimationFrame(this.animationFrameId);
		this.renderer.dispose();
		this.scene.clear();
	}
}
