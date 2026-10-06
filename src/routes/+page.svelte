<script lang="ts">
	import { onMount } from 'svelte';
	import {
		HuffmanEngine,
		LEVELS,
		createDecodeChallenge,
		pickRandom,
		type DecodeChallenge,
		type HuffmanMetrics,
		type HuffmanNode
	} from '$lib/engine';
	import { ProceduralAudioEngine } from '$lib/audio';
	import { Terminal3DManager, type CabinFocusTarget } from '$lib/graphics/terminal3d';
	import type { DecodeScreenState } from '$lib/graphics/terminalScreenCanvas';
	import GameOverOverlay from '$lib/components/GameOverOverlay.svelte';

	const TENSION_TICK_S = 0.5;
	const SILENCE_DURATION_S = 5;
	const SILENCE_COOLDOWN_S = 20;
	const SILENCE_BREAK_NOISE = 4;
	const BAD_MERGE_LEAK_STEP = 0.25;
	const MAX_LEAK_MULTIPLIER = 3;
	const FORCED_NOISE_BITS = 16;
	const FORCED_NOISE_FACTOR = 2;
	const HOLD_DURATION_S = 4;
	const HOLD_HULL_DAMAGE = 0.08;
	const INTERRUPT_STALL_NOISE = 0.6;
	const DECODE_ERROR_NOISE = 3;
	const DECODE_PING_INTERVAL_MS = 90;
	const MAX_HULL_DAMAGE = 0.9;

	let huffman = new HuffmanEngine();
	let audio = new ProceduralAudioEngine();
	let terminal3D: Terminal3DManager | null = null;
	let canvasElement: HTMLCanvasElement;
	let terminalContainer: HTMLElement;

	let currentLevelIndex = $state(0);
	let isFreeMode = $state(false);
	let customMessage = $state('ALERTA SUBMARINO');
	let activeMessage = $state(LEVELS[0].messages[0]);

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

	let hiddenChars = $state.raw<string[]>([]);
	let leakMultiplier = $state(1);
	let silenceRemaining = $state(0);
	let silenceCooldown = 0;

	let isTransmissionInterrupted = $state(false);
	let holdRemaining = $state(0);
	let interruptAtBit = -1;
	let forcedNoiseBits = 0;
	let symbolCodes = $state.raw<string[]>([]);
	let isAlternativeOptimal = $state(false);
	let gameOverCause = $state<string | null>(null);

	let hullDamage = $state(0);
	let peakProximity = 0;

	let decodeChallenge: DecodeChallenge | null = null;
	let decodeState = $state.raw<DecodeScreenState | null>(null);

	let currentLevel = $derived(isFreeMode ? null : LEVELS[currentLevelIndex]);
	let hasDecode = $derived(currentLevel?.decode != null);
	let safeBitQuota = $derived(
		metrics.optimalBits > 0
			? Math.ceil(metrics.optimalBits * (1 + (currentLevel?.toleranceMargin ?? 0.35)))
			: 0
	);

	onMount(() => {
		if (canvasElement && terminalContainer) {
			terminal3D = new Terminal3DManager(terminalContainer, canvasElement);
			terminal3D.setAudioEngine(audio);

			if (typeof window !== 'undefined') {
				(window as any).__terminal3D = terminal3D;
				(window as any).__focusManual = () => {
					terminal3D?.snapCabinetOpen();
					focusManual();
					terminal3D?.snapCamera();
				};
				(window as any).__focusPoster = () => {
					focusPoster();
					terminal3D?.snapCamera();
				};
				(window as any).__focusMonitor = () => {
					focusMonitor();
					terminal3D?.snapCamera();
				};
				(window as any).__focusAux = () => {
					focusAuxiliaryMonitor();
					terminal3D?.snapCamera();
				};
				(window as any).__resetCabin = () => {
					resetCabinView();
					terminal3D?.snapCamera();
				};
			}

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
				} else if (action.type === 'START_DECODE') {
					startDecode();
				} else if (action.type === 'DECODE_PICK' && action.char) {
					decodeGuess(action.char);
				} else if (action.type === 'VERDICT' && action.authentic !== undefined) {
					judgeResponse(action.authentic);
				} else if (action.type === 'RESUME_FORCE') {
					resumeTransmission(true);
				} else if (action.type === 'RESUME_HOLD') {
					resumeTransmission(false);
				} else if (action.type === 'EXPORT_REPORT') {
					exportAcademicReport();
				}
			});

			terminal3D.onAuxAction((action) => {
				activateAudio();
				if (action.type === 'SELECT_LEVEL') {
					isFreeMode = false;
					currentLevelIndex = action.index;
					if (action.index === 0) hullDamage = 0;
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
				} else if (action.type === 'SWITCH_TAB') {
					terminal3D?.switchAuxTab(action.tab);
				} else if (action.type === 'APPLY_GREEDY_MERGE') {
					executeGreedyMerge();
				} else if (action.type === 'EXPORT_REPORT') {
					exportAcademicReport();
				} else if (action.type === 'COPY_JSON') {
					copyReportJson();
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
			if (!isAudioStarted || isGameOver) return;

			if (isTransmissionInterrupted) {
				increaseProximity(INTERRUPT_STALL_NOISE);
				return;
			}

			if (!isTransmitting && !isVictory && !decodeState) {
				const leak = (currentLevel?.baseLeakRate ?? 0.1) * leakMultiplier * (1 + hullDamage * 0.5);
				increaseProximity(leak * TENSION_TICK_S);

				if (acousticProximity > 65 && Math.random() < 0.1) {
					audio.playHullCreak();
					terminal3D?.triggerCameraShake(0.12);
				}

				updateSilence(TENSION_TICK_S);
			}
		}, TENSION_TICK_S * 1000);

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
		audio.fadeInMusic(3.0);
		const text = isFreeMode
			? customMessage
			: pickRandom(LEVELS[currentLevelIndex].messages, activeMessage);
		if (transmissionTimer) clearInterval(transmissionTimer);
		transmissionTimer = null;
		activeMessage = text;
		selectedNodeIds = [];
		acousticProximity = 5.0;
		peakProximity = acousticProximity;
		isGameOver = false;
		isVictory = false;
		isTransmitting = false;
		currentBitIndex = 0;
		transmittedBits = '';
		fullBitStream = '';
		symbolCodes = [];
		leakMultiplier = 1;
		silenceRemaining = 0;
		silenceCooldown = SILENCE_COOLDOWN_S / 2;
		isTransmissionInterrupted = false;
		holdRemaining = 0;
		interruptAtBit = -1;
		forcedNoiseBits = 0;
		gameOverCause = null;
		decodeChallenge = null;
		decodeState = null;

		const phase = isFreeMode ? 1 : Math.min(3, currentLevelIndex + 1);
		terminal3D?.setPhase(phase as 1 | 2 | 3);
		terminal3D?.notifyPlayerAction('LEVEL_LOAD');
		terminal3D?.setAlarm(false);
		terminal3D?.setHullDamage(hullDamage);

		huffman.loadMessage(text);
		hiddenChars = pickHiddenChars(currentLevel?.hiddenSymbols ?? 0);
		refreshState();
	}

	function pickHiddenChars(count: number): string[] {
		const pool = [...huffman.frequencies.keys()].filter((ch) => ch !== ' ');
		const amount = Math.min(count, Math.max(0, huffman.frequencies.size - 2), pool.length);
		const chosen: string[] = [];
		while (chosen.length < amount) {
			const ch = pickRandom(pool);
			if (!chosen.includes(ch)) chosen.push(ch);
		}
		return chosen;
	}

	function damageHull(amount: number): void {
		hullDamage = Math.min(MAX_HULL_DAMAGE, hullDamage + amount);
		terminal3D?.setHullDamage(hullDamage);
	}

	function updateSilence(dt: number): void {
		if (silenceRemaining > 0) {
			silenceRemaining = Math.max(0, silenceRemaining - dt);
			if (silenceRemaining === 0) {
				silenceCooldown = SILENCE_COOLDOWN_S;
				audio.playRelayClick();
			}
			syncScreenTexture();
			return;
		}

		silenceCooldown -= dt;
		const chance = currentLevel?.silenceChance ?? 0;
		if (silenceCooldown <= 0 && Math.random() < chance * dt) {
			silenceRemaining = SILENCE_DURATION_S;
			audio.playDeepWaterSurge(0.7);
			terminal3D?.triggerCameraShake(0.1);
			syncScreenTexture();
		}
	}

	function breakSilence(): void {
		if (silenceRemaining <= 0) return;
		increaseProximity(SILENCE_BREAK_NOISE);
		terminal3D?.triggerCameraShake(0.15);
		terminal3D?.notifyPlayerAction('SILENCE_BROKEN');
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
		isAlternativeOptimal = huffman.isAlternativeOptimal();

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
		const academicReport = huffman.generateAcademicReport();
		const greedyAdvice = huffman.getGreedyAdvice();
		const priorityQueue = huffman.getPriorityQueueSnapshot();

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
			safeBitQuota,
			hiddenChars,
			silenceRemaining,
			leakMultiplier,
			hullIntegrity: (1 - hullDamage) * 100,
			isTransmissionInterrupted,
			holdRemaining,
			symbolCodes,
			isAlternativeOptimal,
			hasDecode,
			gameOverCause,
			decode: decodeState,
			academicReport,
			greedyAdvice
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
			})),
			priorityQueue,
			greedyAdvice,
			academicReport
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
		breakSilence();

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
		breakSilence();

		try {
			huffman.mergeNodes(idA, idB);
			selectedNodeIds = [];
			audio.playMergeSound(isGreedy);
			terminal3D?.triggerCameraShake(isGreedy ? 0.04 : 0.14);

			if (!isGreedy) {
				leakMultiplier = Math.min(MAX_LEAK_MULTIPLIER, leakMultiplier + BAD_MERGE_LEAK_STEP);
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

	function executeGreedyMerge(): void {
		if (isTransmitting || isGameOver || isVictory || huffman.isTreeComplete()) return;
		const advice = huffman.getGreedyAdvice();
		if (!advice) return;

		activateAudio();
		try {
			huffman.mergeNodes(advice.idA, advice.idB);
			selectedNodeIds = [];
			audio.playMergeSound(true);
			terminal3D?.triggerCameraShake(0.04);
			terminal3D?.notifyPlayerAction('GOOD_MERGE');
			terminal3D?.showAuxToast(`FUSÃO AMBICIOSA: ${advice.labelA} + ${advice.labelB}`);
			refreshState();
		} catch (err) {
			console.error('Erro na fusão ambiciosa assistida:', err);
		}
	}

	function executeUndo(): void {
		activateAudio();
		const undone = huffman.undoLastMerge();
		if (undone) {
			breakSilence();
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
		breakSilence();
		huffman.resetPlayerTree();
		selectedNodeIds = [];
		audio.playUndoSound();
		audio.playHullCreak();
		terminal3D?.triggerCameraShake(0.12);
		increaseProximity(3.0);
		terminal3D?.notifyPlayerAction('RESET');
		refreshState();
	}

	async function copyToClipboard(text: string, successMsg: string): Promise<void> {
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const textarea = document.createElement('textarea');
				textarea.value = text;
				textarea.style.position = 'fixed';
				textarea.style.opacity = '0';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
			terminal3D?.showAuxToast(successMsg);
		} catch (err) {
			console.error('Falha ao copiar:', err);
			terminal3D?.showAuxToast('ERRO AO COPIAR');
		}
	}

	function exportAcademicReport(): void {
		const rep = huffman.generateAcademicReport();
		copyToClipboard(rep.markdown, 'RELATÓRIO ACADÊMICO COPIADO!');
		audio.playRelayClick();
	}

	function copyReportJson(): void {
		const rep = huffman.generateAcademicReport();
		copyToClipboard(rep.json, 'DADOS JSON COPIADOS!');
		audio.playRelayClick();
	}

	function increaseProximity(amount: number): void {
		acousticProximity = Math.min(100, acousticProximity + amount);
		peakProximity = Math.max(peakProximity, acousticProximity);
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

		breakSilence();
		silenceRemaining = 0;
		isTransmitting = true;
		currentBitIndex = 0;
		transmittedBits = '';
		symbolCodes = [...activeMessage].map((ch) => huffman.playerCodes.get(ch) ?? '');
		const symbolEnds = new Set<number>();
		symbolCodes.reduce((end, code) => {
			symbolEnds.add(end + code.length);
			return end + code.length;
		}, 0);

		const interruptionChance = currentLevel?.interruptionChance ?? 0;
		interruptAtBit =
			fullBitStream.length >= 8 && Math.random() < interruptionChance
				? Math.floor(fullBitStream.length * (0.3 + Math.random() * 0.4))
				: -1;
		forcedNoiseBits = 0;
		holdRemaining = 0;

		terminal3D?.notifyPlayerAction('TRANSMIT_START');
		refreshState();

		const transmissionIntervalMs = 110;
		const isWithinQuota = fullBitStream.length <= safeBitQuota;
		const baseTransmissionNoise = 18.0;
		const excessBits = Math.max(0, fullBitStream.length - safeBitQuota);
		const excessPenalty = (excessBits / Math.max(1, metrics.optimalBits)) * 40.0;
		const totalTransmissionNoise = isWithinQuota
			? baseTransmissionNoise * (fullBitStream.length / Math.max(1, safeBitQuota))
			: baseTransmissionNoise + excessPenalty;
		const noisePerBit = totalTransmissionNoise / fullBitStream.length;

		transmissionTimer = window.setInterval(() => {
			if (isTransmissionInterrupted) return;
			if (holdRemaining > 0) {
				holdRemaining = Math.max(0, holdRemaining - transmissionIntervalMs / 1000);
				syncScreenTexture();
				return;
			}

			if (currentBitIndex >= fullBitStream.length) {
				completeTransmissionVictory();
				return;
			}

			if (currentBitIndex === interruptAtBit) {
				interruptAtBit = -1;
				interruptTransmission();
				return;
			}

			const bit = fullBitStream[currentBitIndex];
			transmittedBits += bit;
			currentBitIndex++;

			audio.playSonarPing(bit === '1');
			if (symbolEnds.has(currentBitIndex)) audio.playSymbolBoundary();
			terminal3D?.triggerCameraShake(0.04);
			terminal3D?.notifyPlayerAction('TRANSMIT_BIT');

			const noiseFactor = forcedNoiseBits > 0 ? FORCED_NOISE_FACTOR : 1;
			forcedNoiseBits = Math.max(0, forcedNoiseBits - 1);
			increaseProximity(noisePerBit * noiseFactor);
			syncScreenTexture();

			if (acousticProximity >= 100) {
				triggerGameOver();
			}
		}, transmissionIntervalMs);
	}

	function interruptTransmission(): void {
		isTransmissionInterrupted = true;
		audio.playHullCreak();
		terminal3D?.triggerCameraShake(0.35);
		terminal3D?.notifyPlayerAction('TRANSMIT_INTERRUPTED');
		syncScreenTexture();
	}

	function resumeTransmission(force: boolean): void {
		if (!isTransmissionInterrupted) return;
		isTransmissionInterrupted = false;
		audio.playRelayClick();
		if (force) {
			forcedNoiseBits = FORCED_NOISE_BITS;
		} else {
			holdRemaining = HOLD_DURATION_S;
			damageHull(HOLD_HULL_DAMAGE);
			audio.playHullCreak();
			terminal3D?.triggerCameraShake(0.2);
		}
		syncScreenTexture();
	}

	function completeTransmissionVictory(): void {
		if (transmissionTimer) clearInterval(transmissionTimer);
		transmissionTimer = null;
		isTransmitting = false;

		if (metrics.playerBits > safeBitQuota) {
			triggerGameOver();
			return;
		}

		damageHull((peakProximity / 100) * 0.2);
		isVictory = true;
		audio.playTransmissionSuccess();
		terminal3D?.setAlarm(false);
		terminal3D?.notifyPlayerAction('VICTORY');
		refreshState();
	}

	function startDecode(): void {
		const config = currentLevel?.decode;
		if (!config || !isVictory || decodeState) return;

		const isMimic = config.mimic.length > 0 && Math.random() < config.mimicChance;
		const message = pickRandom(isMimic ? config.mimic : config.authentic);
		decodeChallenge = createDecodeChallenge(message, isMimic);
		decodeState = {
			root: decodeChallenge.root,
			bits: decodeChallenge.bits,
			cursor: 0,
			decoded: '',
			treeBits: decodeChallenge.treeBits,
			stage: 'decoding',
			result: null,
			lastGuessWrong: false
		};
		audio.playDeepWaterSurge(0.4);
		syncScreenTexture();
	}

	function playCodeAsPings(code: string): void {
		[...code].forEach((bit, i) => {
			window.setTimeout(() => audio.playSonarPing(bit === '1'), i * DECODE_PING_INTERVAL_MS);
		});
		window.setTimeout(() => audio.playSymbolBoundary(), code.length * DECODE_PING_INTERVAL_MS);
	}

	function decodeGuess(char: string): void {
		if (!decodeChallenge || !decodeState || decodeState.stage !== 'decoding') return;

		const expected = [...decodeChallenge.message];
		if (char === expected[decodeState.decoded.length]) {
			const code = decodeChallenge.codes.get(char)!;
			const decoded = decodeState.decoded + char;
			playCodeAsPings(code);
			decodeState = {
				...decodeState,
				cursor: decodeState.cursor + code.length,
				decoded,
				lastGuessWrong: false,
				stage: decoded.length === expected.length ? 'verdict' : 'decoding'
			};
		} else {
			audio.playHullKnock();
			terminal3D?.triggerCameraShake(0.12);
			decodeState = { ...decodeState, lastGuessWrong: true };
			increaseProximity(DECODE_ERROR_NOISE);
		}
		syncScreenTexture();
	}

	function judgeResponse(trustAsAuthentic: boolean): void {
		if (!decodeChallenge || !decodeState || decodeState.stage !== 'verdict') return;

		if (trustAsAuthentic && decodeChallenge.isMimic) {
			gameOverCause = 'A ENTIDADE IMITOU A SUPERFÍCIE. A ESCOTILHA FOI ABERTA.';
			terminal3D?.notifyPlayerAction('MIMIC_TRUSTED');
			triggerGameOver();
			return;
		}

		const result = decodeChallenge.isMimic
			? 'MIMIC_DETECTED'
			: trustAsAuthentic
				? 'RESCUE'
				: 'RESCUE_LOST';
		if (result === 'RESCUE_LOST') {
			audio.playHullCreak();
		} else {
			audio.playTransmissionSuccess();
		}
		decodeState = { ...decodeState, stage: 'result', result };
		syncScreenTexture();
	}

	function triggerGameOver(): void {
		if (transmissionTimer) clearInterval(transmissionTimer);
		transmissionTimer = null;
		isTransmitting = false;
		isTransmissionInterrupted = false;
		silenceRemaining = 0;
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

	function handleDecodeKey(e: KeyboardEvent): void {
		if (!decodeState) return;
		if (e.key === 'Escape') {
			if (focusedScreen !== 'none') resetCabinView();
			return;
		}

		if (decodeState.stage === 'decoding') {
			if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				e.preventDefault();
				decodeGuess(e.key.toUpperCase());
			}
		} else if (decodeState.stage === 'verdict') {
			if (e.key === 'a' || e.key === 'A') judgeResponse(true);
			else if (e.key === 'i' || e.key === 'I') judgeResponse(false);
		} else if (e.code === 'Enter') {
			nextLevel();
		}
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

		if (decodeState) {
			handleDecodeKey(e);
			return;
		}

		if (isTransmissionInterrupted) {
			if (e.code === 'Enter') resumeTransmission(true);
			else if (e.key === 's' || e.key === 'S') resumeTransmission(false);
			return;
		}

		if (isTransmitting) return;

		if (isVictory && e.code === 'Enter') {
			if (hasDecode) startDecode();
			else nextLevel();
			return;
		}

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
			if (isVictory) {
				e.preventDefault();
				nextLevel();
			} else if (isTreeComplete && !isGameOver) {
				startTransmission();
			}
		} else if (e.key === 't' || e.key === 'T') {
			if (focusedScreen !== 'aux') {
				focusAuxiliaryMonitor();
			}
			terminal3D?.switchAuxTab('minheap');
			audio.playRelayClick();
		} else if (e.key === 'e' || e.key === 'E') {
			exportAcademicReport();
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
			cause={gameOverCause}
			onRestart={loadCurrentLevel}
		/>
	{/if}
</main>
