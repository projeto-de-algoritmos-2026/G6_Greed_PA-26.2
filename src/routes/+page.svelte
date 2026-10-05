<script lang="ts">
	import { onMount } from 'svelte';
	import { HuffmanEngine, LEVELS, type HuffmanMetrics, type HuffmanNode } from '$lib/engine';
	import { ProceduralAudioEngine } from '$lib/audio';
	import { Terminal3DManager, type CabinFocusTarget } from '$lib/graphics/terminal3d';
	import GameOverOverlay from '$lib/components/GameOverOverlay.svelte';

	let huffman = new HuffmanEngine();
	let audio = new ProceduralAudioEngine();
	let terminal3D: Terminal3DManager | null = null;
	let canvasElement: HTMLCanvasElement;
	let terminalContainer: HTMLElement;

	let currentLevelIndex = $state(0);
	let isFreeMode = $state(false);
	let customMessage = $state('ALERTA SUBMARINO');
	let activeMessage = $state(LEVELS[0].message);

	let selectedNodeIds = $state<string[]>([]);
	let availableNodes = $state.raw<HuffmanNode[]>([]);
	let allActiveNodes = $state.raw<HuffmanNode[]>([]);
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
			? Math.ceil(metrics.optimalBits * (1 + (currentLevel?.toleranceMargin ?? 0.35)))
			: 0
	);

	onMount(() => {
		if (canvasElement && terminalContainer) {
			terminal3D = new Terminal3DManager(terminalContainer, canvasElement);
			terminal3D.setAudioEngine(audio);

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
				} else if (action.type === 'REBOOT') {
					terminal3D?.triggerReboot();
				}
			});

			terminal3D.onFocusChange((target) => {
				focusedScreen = target;
				isZoomedIn = target === 'main';
				syncScreenTexture();
			});
		}

		loadCurrentLevel();

		window.addEventListener('pointerdown', () => activateAudio(), { once: true });

		tensionInterval = window.setInterval(() => {
			if (!isTransmitting && !isGameOver && !isVictory && isAudioStarted) {
				const leak = currentLevel?.baseLeakRate ?? 0.1;
				increaseProximity(leak * 0.5);

				if (acousticProximity > 65 && Math.random() < 0.1) {
					audio.playHullCreak();
					terminal3D?.triggerCameraShake(0.12);
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
		activateAudio();
		audio.playRelayClick();
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

		terminal3D?.setPhase(isFreeMode ? 1 : ((currentLevelIndex + 1) as 1 | 2 | 3));
		terminal3D?.notifyPlayerAction('LEVEL_LOAD');
		terminal3D?.setAlarm(false);

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
			if (terminal3D?.isBooting()) {
				audio.playBootSound();
			} else {
				audio.playRelayClick();
			}
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
			terminal3D?.triggerCameraShake(isGreedy ? 0.04 : 0.14);

			if (!isGreedy) {
				increaseProximity(2.0);
				terminal3D?.notifyPlayerAction('BAD_MERGE');
			} else {
				terminal3D?.notifyPlayerAction('GOOD_MERGE');
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
			terminal3D?.triggerCameraShake(0.06);
			increaseProximity(1.0);
			terminal3D?.notifyPlayerAction('UNDO');
			refreshState();
		}
	}

	function executeResetTree(): void {
		activateAudio();
		huffman.resetPlayerTree();
		selectedNodeIds = [];
		audio.playUndoSound();
		audio.playHullCreak();
		terminal3D?.triggerCameraShake(0.12);
		increaseProximity(3.0);
		terminal3D?.notifyPlayerAction('RESET');
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
		terminal3D?.notifyPlayerAction('TRANSMIT_START');
		refreshState();

		const transmissionIntervalMs = 110;
		// Cada fase define quantos bits podem ser transmitidos com segurança.
		// Dentro da cota o ruído é proporcional ao uso dela; acima, o excesso
		// gera penalidade extra e a árvore é rejeitada ao final da transmissão.
		const isWithinQuota = fullBitStream.length <= safeBitQuota;
		const baseTransmissionNoise = 18.0;
		const excessBits = Math.max(0, fullBitStream.length - safeBitQuota);
		const excessPenalty = (excessBits / Math.max(1, metrics.optimalBits)) * 40.0;
		const totalTransmissionNoise = isWithinQuota
			? baseTransmissionNoise * (fullBitStream.length / Math.max(1, safeBitQuota))
			: baseTransmissionNoise + excessPenalty;
		const noisePerBit = totalTransmissionNoise / fullBitStream.length;

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
			terminal3D?.notifyPlayerAction('TRANSMIT_BIT');
			increaseProximity(noisePerBit);
			syncScreenTexture();

			if (acousticProximity >= 100) {
				triggerGameOver();
			}
		}, transmissionIntervalMs);
	}

	function completeTransmissionVictory(): void {
		if (transmissionTimer) clearInterval(transmissionTimer);
		transmissionTimer = null;
		isTransmitting = false;

		// A cota é a regra de sobrevivência da fase: transmitir uma árvore
		// completa, mas acima da margem permitida, ainda causa o colapso.
		if (metrics.playerBits > safeBitQuota) {
			triggerGameOver();
			return;
		}

		isVictory = true;
		audio.playTransmissionSuccess();
		terminal3D?.setAlarm(false);
		terminal3D?.notifyPlayerAction('VICTORY');
		refreshState();
	}

	function triggerGameOver(): void {
		if (transmissionTimer) clearInterval(transmissionTimer);
		transmissionTimer = null;
		isTransmitting = false;
		isGameOver = true;
		audio.playCatastrophicBreach();
		terminal3D?.triggerCameraShake(0.95);
		terminal3D?.setAlarm(true);
		terminal3D?.notifyPlayerAction('GAME_OVER');
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

	let focusedScreen = $state<CabinFocusTarget>('none');

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
		if (isGameOver) {
			if (e.key === 'r' || e.key === 'R' || e.code === 'Enter') {
				e.preventDefault();
				loadCurrentLevel();
			}
			return;
		}

		if (terminal3D?.isBooting()) {
			terminal3D.skipBoot();
			return;
		}

		if (isTransmitting) return;

		if (e.key === 'b' || e.key === 'B') {
			terminal3D?.triggerReboot();
			return;
		}

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
		} else if (e.key === 'Escape') {
			if (focusedScreen !== 'none') resetCabinView();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<main class="relative w-screen h-screen overflow-hidden bg-black text-[#00ffaa] font-mono select-none">
	<div class="absolute inset-0 w-full h-full" bind:this={terminalContainer}>
		<canvas bind:this={canvasElement} class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>
	</div>

	{#if focusedScreen === 'window'}
		<div class="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 border border-[#00ffcc]/40 rounded text-xs text-[#00ffcc] tracking-widest pointer-events-none flex items-center gap-3 backdrop-blur-sm shadow-lg shadow-[#003322]/50 animate-fade-in">
			<span class="inline-block w-2 h-2 rounded-full bg-[#00ffcc] animate-ping"></span>
			<span>JANELA // [W] OU [ESC] VOLTAR</span>
		</div>
	{:else if focusedScreen === 'poster'}
		<div class="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 border border-[#00ffcc]/40 rounded text-xs text-[#00ffcc] tracking-widest pointer-events-none flex items-center gap-3 backdrop-blur-sm shadow-lg shadow-[#003322]/50 animate-fade-in">
			<span class="inline-block w-2 h-2 rounded-full bg-[#00ffcc] animate-ping"></span>
			<span>PÔSTER // [P] OU [ESC] VOLTAR</span>
		</div>
	{:else if focusedScreen === 'manual'}
		<div class="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 border border-[#00ffcc]/40 rounded text-xs text-[#00ffcc] tracking-widest pointer-events-none flex items-center gap-3 backdrop-blur-sm shadow-lg shadow-[#003322]/50 animate-fade-in">
			<span class="inline-block w-2 h-2 rounded-full bg-[#00ffcc] animate-ping"></span>
			<span>MANUAL // [H] OU [ESC] VOLTAR</span>
		</div>
	{/if}

	{#if isGameOver}
		<GameOverOverlay
			depth={currentLevel?.depth ?? 8000}
			pressureAtm={currentLevel?.pressureAtm ?? 800}
			transmittedBits={transmittedBits}
			safeBitQuota={safeBitQuota}
			efficiency={metrics.efficiency}
			levelName={currentLevel?.name ?? 'MODO LIVRE'}
			onRestart={loadCurrentLevel}
		/>
	{/if}
</main>
