<script lang="ts">
	import { onMount } from 'svelte';
	import { HuffmanEngine, type HuffmanMetrics, type HuffmanNode } from '$lib/engine/huffman';
	import { ProceduralAudioEngine } from '$lib/audio/soundscape';
	import { Terminal3DManager } from '$lib/graphics/terminal3d';

	// Configuração das Fases da Campanha
	interface LevelConfig {
		depth: number;
		pressureAtm: number;
		name: string;
		message: string;
		description: string;
		toleranceMargin: number;
		baseLeakRate: number;
	}

	const LEVELS: LevelConfig[] = [
		{
			depth: 8000,
			pressureAtm: 800,
			name: 'ABISSO INICIAL',
			message: 'SOS SOS CASCO EM RISCO',
			description: 'Entrada na fenda abissal. Construa a árvore de prefixos com caracteres repetidos.',
			toleranceMargin: 0.25,
			baseLeakRate: 0.35
		},
		{
			depth: 9500,
			pressureAtm: 950,
			name: 'ZONA HADAL',
			message: 'CASCO RACHANDO. SOM NA PORTA. SOCORRO.',
			description: 'Pressão violenta. Menor margem para nós subótimos. A entidade está rondando.',
			toleranceMargin: 0.15,
			baseLeakRate: 0.55
		},
		{
			depth: 11000,
			pressureAtm: 1100,
			name: 'FOSSA DAS MARIANAS',
			message: 'PRESSAO CRITICA 8000 ATM. ENTIDADE NA ESCOTILHA. TRANSMITIR AGORA!',
			description: 'Desafio extremo. Qualquer desvio da árvore gulosa ótima causará colapso imediato.',
			toleranceMargin: 0.08,
			baseLeakRate: 0.75
		}
	];

	// Instâncias dos subsistemas
	let huffman = new HuffmanEngine();
	let audio = new ProceduralAudioEngine();
	let terminal3D: Terminal3DManager | null = null;
	let canvasElement: HTMLCanvasElement;
	let terminalContainer: HTMLElement;

	// Estados Reativos do Jogo
	let currentLevelIndex = $state(0);
	let isFreeMode = $state(false);
	let customMessage = $state('ALERTA NA ESTACAO SUBMARINA');
	let activeMessage = $state(LEVELS[0].message);

	let selectedNodeIds = $state<string[]>([]);
	let availableNodes = $state<HuffmanNode[]>([]);
	let allActiveNodes = $state<HuffmanNode[]>([]);
	let metrics = $state<HuffmanMetrics>({
		rawAsciiBits: 0,
		optimalBits: 0,
		playerBits: 0,
		efficiency: 0,
		compressionRatio: 0,
		characterCount: 0,
		distinctCharacters: 0
	});

	let isAudioStarted = $state(false);
	let isMuted = $state(false);
	let acousticProximity = $state(5.0);
	let isTreeComplete = $state(false);
	let isTransmitting = $state(false);
	let isGameOver = $state(false);
	let isVictory = $state(false);
	let isZoomedIn = $state(false);

	let transmittedBits = $state('');
	let fullBitStream = $state('');
	let currentBitIndex = $state(0);
	let transmissionTimer: number | null = null;
	let tensionInterval: number | null = null;

	let currentLevel = $derived(isFreeMode ? null : LEVELS[currentLevelIndex]);
	let safeBitQuota = $derived(
		metrics.optimalBits > 0
			? Math.ceil(metrics.optimalBits * (1 + (currentLevel?.toleranceMargin ?? 0.15)))
			: 0
	);

	onMount(() => {
		if (canvasElement && terminalContainer) {
			terminal3D = new Terminal3DManager(terminalContainer, canvasElement);
			terminal3D.setAudioEngine(audio);

			// Conecta ações disparadas ao clicar na tela do monitor principal 3D
			terminal3D.onScreenAction((action) => {
				activateAudio();
				if (action.type === 'SELECT_NODE' && action.nodeId) {
					toggleNodeSelection(action.nodeId);
				} else if (action.type === 'MERGE') {
					executeMerge();
				} else if (action.type === 'UNDO') {
					executeUndo();
				} else if (action.type === 'RESET') {
					executeResetTree();
				} else if (action.type === 'TRANSMIT') {
					startTransmission();
				} else if (action.type === 'RETRY') {
					loadCurrentLevel();
				} else if (action.type === 'NEXT_LEVEL') {
					nextLevel();
				}
			});

			// Conecta ações disparadas no monitor secundário auxiliar (Console B à direita)
			terminal3D.onAuxAction((action) => {
				activateAudio();
				if (action.type === 'SELECT_LEVEL') {
					isFreeMode = false;
					currentLevelIndex = action.index;
					loadCurrentLevel();
				} else if (action.type === 'FREE_MODE') {
					isFreeMode = true;
					loadCurrentLevel();
				} else if (action.type === 'SET_MESSAGE') {
					customMessage = action.message;
					activeMessage = action.message;
					loadCurrentLevel();
				} else if (action.type === 'TOGGLE_FOCUS') {
					if (focusedScreen === 'main') resetCabinView();
					else focusMonitor();
				} else if (action.type === 'FOCUS_AUX') {
					if (focusedScreen === 'aux') resetCabinView();
					else focusAuxiliaryMonitor();
				} else if (action.type === 'TOGGLE_MUTE') {
					toggleMute();
				}
			});

			// Mantém o estado da UI sincronizado quando a câmera foca ou reconfigura a visão
			terminal3D.onFocusChange((target) => {
				focusedScreen = target;
				isZoomedIn = target === 'main';
				syncScreenTexture();
			});
		}

		loadCurrentLevel();

		// Ativa o áudio no primeiro clique em qualquer lugar da tela
		window.addEventListener('pointerdown', () => activateAudio(), { once: true });

		// Tensão contínua da criatura
		tensionInterval = window.setInterval(() => {
			if (!isTransmitting && !isGameOver && !isVictory && isAudioStarted) {
				const leak = currentLevel?.baseLeakRate ?? 0.45;
				increaseProximity(leak * 0.5);

				if (acousticProximity > 50 && Math.random() < 0.15) {
					audio.playHullCreak();
					terminal3D?.triggerCameraShake(0.18);
				}
			}
		}, 500);

		const handleResize = () => {
			if (terminal3D && terminalContainer) {
				terminal3D.resize(terminalContainer.clientWidth, terminalContainer.clientHeight);
			}
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (tensionInterval) clearInterval(tensionInterval);
			if (transmissionTimer) clearInterval(transmissionTimer);
			terminal3D?.dispose();
			audio.dispose();
		};
	});

	function loadCurrentLevel(): void {
		const text = isFreeMode ? customMessage : LEVELS[currentLevelIndex].message;
		activeMessage = text;
		selectedNodeIds = [];
		acousticProximity = 5.0;
		isGameOver = false;
		isVictory = false;
		isTransmitting = false;
		currentBitIndex = 0;
		transmittedBits = '';
		fullBitStream = '';

		huffman.loadMessage(text);
		refreshState();
	}

	function refreshState(): void {
		availableNodes = [...huffman.availableNodes];
		const collected: HuffmanNode[] = [];
		const visit = (node: HuffmanNode | null) => {
			if (!node) return;
			collected.push(node);
			visit(node.left);
			visit(node.right);
		};

		for (const n of huffman.availableNodes) {
			visit(n);
		}

		allActiveNodes = Array.from(new Map(collected.map((item) => [item.id, item])).values());
		isTreeComplete = huffman.isTreeComplete();
		metrics = huffman.getMetrics();

		// Sincroniza a tela do Monitor CRT 3D
		syncScreenTexture();
		terminal3D?.updateGauges(currentLevel?.pressureAtm ?? 800, acousticProximity);

		audio.setProximityTension(acousticProximity / 100);
		if (acousticProximity >= 75) {
			audio.startProximityAlarm();
			terminal3D?.setAlarm(true);
		} else {
			audio.stopProximityAlarm();
			terminal3D?.setAlarm(false);
		}
	}

	function syncScreenTexture(): void {
		terminal3D?.updateScreenState({
			depth: currentLevel?.depth ?? 8000,
			pressureAtm: currentLevel?.pressureAtm ?? 800,
			message: activeMessage,
			metrics,
			acousticProximity,
			isTreeComplete,
			isTransmitting,
			isGameOver,
			isVictory,
			selectedNodeIds,
			availableNodes,
			allActiveNodes,
			transmittedBits,
			fullBitStream,
			currentBitIndex,
			safeBitQuota
		});

		terminal3D?.updateAuxScreenState({
			depth: currentLevel?.depth ?? 8000,
			pressureAtm: currentLevel?.pressureAtm ?? 800,
			currentLevelIndex,
			isFreeMode,
			activeMessage,
			isMuted,
			isZoomedIn,
			focusedScreen,
			acousticProximity,
			levels: LEVELS.map((l) => ({
				name: l.name,
				depth: l.depth,
				pressureAtm: l.pressureAtm,
				toleranceMargin: l.toleranceMargin
			}))
		});
	}

	async function activateAudio(): Promise<void> {
		if (!isAudioStarted) {
			await audio.init();
			isAudioStarted = true;
			audio.playRelayClick();
		}
	}

	function toggleMute(): void {
		isMuted = audio.toggleMute();
	}

	function toggleNodeSelection(nodeId: string): void {
		activateAudio();
		audio.playRelayClick();

		if (isTransmitting || isGameOver || isVictory) return;
		const isAvail = availableNodes.some((n) => n.id === nodeId);
		if (!isAvail) return;

		if (selectedNodeIds.includes(nodeId)) {
			selectedNodeIds = selectedNodeIds.filter((id) => id !== nodeId);
		} else {
			if (selectedNodeIds.length < 2) {
				selectedNodeIds = [...selectedNodeIds, nodeId];
			} else {
				selectedNodeIds = [selectedNodeIds[0], nodeId];
			}
		}

		refreshState();
	}

	function executeMerge(): void {
		if (selectedNodeIds.length !== 2) return;
		activateAudio();

		const [idA, idB] = selectedNodeIds;
		const isGreedy = huffman.isGreedyChoice(idA, idB);

		try {
			huffman.mergeNodes(idA, idB);
			selectedNodeIds = [];
			audio.playMergeSound(isGreedy);
			terminal3D?.triggerCameraShake(isGreedy ? 0.05 : 0.22);

			if (!isGreedy) {
				increaseProximity(6.0);
			}

			refreshState();
		} catch (err) {
			console.error('Erro na fusão:', err);
		}
	}

	function executeUndo(): void {
		activateAudio();
		const undone = huffman.undoLastMerge();
		if (undone) {
			selectedNodeIds = [];
			audio.playUndoSound();
			terminal3D?.triggerCameraShake(0.12);
			increaseProximity(5.0);
			refreshState();
		}
	}

	function executeResetTree(): void {
		activateAudio();
		huffman.resetPlayerTree();
		selectedNodeIds = [];
		audio.playUndoSound();
		audio.playHullCreak();
		terminal3D?.triggerCameraShake(0.2);
		increaseProximity(12.0);
		refreshState();
	}

	function increaseProximity(amount: number): void {
		acousticProximity = Math.min(100, acousticProximity + amount);
		audio.setProximityTension(acousticProximity / 100);
		terminal3D?.updateGauges(currentLevel?.pressureAtm ?? 800, acousticProximity);
		syncScreenTexture();

		if (acousticProximity >= 100 && !isGameOver) {
			triggerGameOver();
		}
	}

	function startTransmission(): void {
		if (!isTreeComplete || isTransmitting || isGameOver) return;
		activateAudio();

		try {
			fullBitStream = huffman.encode(false);
		} catch (e) {
			console.error('Erro ao codificar bits:', e);
			return;
		}

		isTransmitting = true;
		currentBitIndex = 0;
		transmittedBits = '';
		refreshState();

		const bitIntervalMs = 110;
		const noisePerBit = 85.0 / fullBitStream.length;

		transmissionTimer = window.setInterval(() => {
			if (currentBitIndex >= fullBitStream.length) {
				completeTransmissionVictory();
				return;
			}

			const bit = fullBitStream[currentBitIndex];
			transmittedBits += bit;
			currentBitIndex++;

			audio.playSonarPing(bit === '1');
			terminal3D?.triggerCameraShake(0.04);
			increaseProximity(noisePerBit);
			syncScreenTexture();

			if (acousticProximity >= 100) {
				triggerGameOver();
			}
		}, bitIntervalMs);
	}

	function completeTransmissionVictory(): void {
		if (transmissionTimer) clearInterval(transmissionTimer);
		isTransmitting = false;
		isVictory = true;
		audio.playTransmissionSuccess();
		terminal3D?.setAlarm(false);
		refreshState();
	}

	function triggerGameOver(): void {
		if (transmissionTimer) clearInterval(transmissionTimer);
		isTransmitting = false;
		isGameOver = true;
		audio.playCatastrophicBreach();
		terminal3D?.triggerCameraShake(0.95);
		terminal3D?.setAlarm(true);
		refreshState();
	}

	function nextLevel(): void {
		if (currentLevelIndex < LEVELS.length - 1) {
			currentLevelIndex++;
			loadCurrentLevel();
		} else {
			isFreeMode = true;
			loadCurrentLevel();
		}
	}

	let focusedScreen = $state<'main' | 'aux' | 'manual' | 'window' | 'poster' | 'none'>('none');

	function focusMonitor(): void {
		terminal3D?.focusMonitor();
		isZoomedIn = true;
		focusedScreen = 'main';
		syncScreenTexture();
	}

	function focusAuxiliaryMonitor(): void {
		terminal3D?.focusAuxiliaryMonitor();
		isZoomedIn = false;
		focusedScreen = 'aux';
		syncScreenTexture();
	}

	function focusManual(): void {
		terminal3D?.focusManual();
		isZoomedIn = false;
		focusedScreen = 'manual';
		syncScreenTexture();
	}

	function focusWindow(): void {
		terminal3D?.focusWindow();
		isZoomedIn = false;
		focusedScreen = 'window';
		syncScreenTexture();
	}

	function focusPoster(): void {
		terminal3D?.focusPoster();
		isZoomedIn = false;
		focusedScreen = 'poster';
		syncScreenTexture();
	}

	function resetCabinView(): void {
		terminal3D?.resetCabinView();
		isZoomedIn = false;
		focusedScreen = 'none';
		syncScreenTexture();
	}

	function handleKeyDown(e: KeyboardEvent): void {
		if (isTransmitting) return;

		if (e.code === 'Space') {
			e.preventDefault();
			if (selectedNodeIds.length === 2) {
				executeMerge();
			}
		} else if (e.key === 'z' || e.key === 'Z') {
			executeUndo();
		} else if (e.key === 'r' || e.key === 'R') {
			executeResetTree();
		} else if (e.code === 'Enter') {
			if (isTreeComplete && !isGameOver && !isVictory) {
				startTransmission();
			}
		} else if (e.key === 'm' || e.key === 'M') {
			toggleMute();
		} else if (e.key === 'f' || e.key === 'F') {
			if (focusedScreen === 'main') resetCabinView();
			else focusMonitor();
		} else if (e.key === 'c' || e.key === 'C') {
			if (focusedScreen === 'aux') resetCabinView();
			else focusAuxiliaryMonitor();
		} else if (e.key === 'h' || e.key === 'H') {
			if (focusedScreen === 'manual') resetCabinView();
			else focusManual();
		} else if (e.key === 'w' || e.key === 'W') {
			if (focusedScreen === 'window') resetCabinView();
			else focusWindow();
		} else if (e.key === 'p' || e.key === 'P') {
			if (focusedScreen === 'poster') resetCabinView();
			else focusPoster();
		} else if (e.key === 'l' || e.key === 'L') {
			terminal3D?.toggleInspectionLight();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Container da Cabine do Submarino -->
<main class="relative w-screen h-screen overflow-hidden bg-black text-[#00ffaa] font-mono select-none">
	<!-- Canvas 3D (Cobre a janela inteira - renderiza a cabine, mesa, vigia e os DOIS monitores CRT com todo o HUD integrado) -->
	<div class="absolute inset-0 w-full h-full" bind:this={terminalContainer}>
		<canvas bind:this={canvasElement} class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>
	</div>
</main>
