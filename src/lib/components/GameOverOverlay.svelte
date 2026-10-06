<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		depth: number;
		pressureAtm: number;
		transmittedBits: string;
		safeBitQuota: number;
		efficiency: number;
		levelName?: string;
		cause?: string | null;
		onRestart: () => void;
	}

	let {
		depth,
		pressureAtm,
		transmittedBits,
		safeBitQuota,
		efficiency,
		levelName = 'SETOR ABISSAL',
		cause = null,
		onRestart
	}: Props = $props();

	let displayedLines = $state<string[]>([]);
	let isTypingComplete = $state(false);
	let currentLineIndex = $state(0);
	let currentCharIndex = $state(0);
	let typingTimer: number | null = null;

	const incidentLogLines = $derived([
		`[ REGISTRO DE INCIDENTE // CAIXA-PRETA TARTARUS-V ]`,
		`>> ALERTA CATASTRÓFICO: COLAPSO ESTRUTURAL DO CASCO <<`,
		`SETOR: ${levelName.toUpperCase()} // PROFUNDIDADE: ${depth.toLocaleString('pt-BR')} METROS`,
		`PRESSÃO EXTERNA: ${pressureAtm} ATM // RUPTURA DE MAMPARAS`,
		`CAUSA: ${cause ?? 'ATRAÇÃO DA ENTIDADE POR SOBRECARGA ACÚSTICA DE SONAR'}`,
		`BITS TRANSMITIDOS: ${transmittedBits.length} / COTA SEGURA: ${safeBitQuota} BITS`,
		`EFICIÊNCIA DE HUFFMAN: ${efficiency}% ${efficiency < 100 ? '(SUB-ÓTIMA)' : '(ÓTIMA)'}`,
		`STATUS DO OPERADOR: SINAL BIOMÉTRICO INTERROMPIDO`,
		`> SISTEMA CRÍTICO // AGUARDANDO COMANDO_`
	]);

	onMount(() => {
		displayedLines = [''];
		startTeletype();

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
				e.preventDefault();
				e.stopPropagation();
				onRestart();
			} else if (e.code === 'Space' && !isTypingComplete) {
				e.preventDefault();
				skipTeletype();
			}
		};

		window.addEventListener('keydown', handleKeyDown, { capture: true });

		return () => {
			if (typingTimer) clearTimeout(typingTimer);
			window.removeEventListener('keydown', handleKeyDown, { capture: true });
		};
	});

	function startTeletype(): void {
		const lines = incidentLogLines;

		function step() {
			if (currentLineIndex >= lines.length) {
				isTypingComplete = true;
				return;
			}

			const targetLine = lines[currentLineIndex];
			if (currentCharIndex < targetLine.length) {
				const chunk = targetLine.slice(currentCharIndex, currentCharIndex + 2);
				currentCharIndex += chunk.length;
				displayedLines[currentLineIndex] = targetLine.slice(0, currentCharIndex);
				typingTimer = window.setTimeout(step, 14);
			} else {
				currentLineIndex++;
				currentCharIndex = 0;
				if (currentLineIndex < lines.length) {
					displayedLines.push('');
					typingTimer = window.setTimeout(step, 90);
				} else {
					isTypingComplete = true;
				}
			}
		}

		step();
	}

	function skipTeletype(): void {
		if (typingTimer) clearTimeout(typingTimer);
		displayedLines = [...incidentLogLines];
		isTypingComplete = true;
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden emergency-overlay"
	role="dialog"
	aria-modal="true"
	aria-label="Alerta de Falha Catastrófica"
>
	
	<div class="absolute inset-0 emergency-strobe pointer-events-none"></div>

	
	<div class="absolute inset-0 crt-scanlines pointer-events-none"></div>

	
	<svg
		class="absolute inset-0 w-full h-full pointer-events-none cracked-glass"
		viewBox="0 0 1920 1080"
		preserveAspectRatio="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		
		<g stroke="#ffffff" stroke-width="1.8" opacity="0.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
			
			<path d="M 1380 200 Q 1420 220 1440 250 Q 1430 290 1390 300 Q 1350 280 1340 240 Q 1350 210 1380 200 Z" stroke-width="2.5" />
			<path d="M 1380 160 Q 1460 190 1490 250 Q 1470 330 1390 350 Q 1310 320 1290 240 Q 1320 170 1380 160 Z" opacity="0.6" />
			<path d="M 1380 110 Q 1520 160 1560 260 Q 1530 380 1390 410 Q 1250 370 1230 250 Q 1270 130 1380 110 Z" opacity="0.4" />

			
			<path d="M 1380 240 L 1260 180 L 1150 140 L 980 90 L 820 60 L 540 20 L 0 0" stroke-width="2.2" />
			<path d="M 1380 240 L 1320 340 L 1240 460 L 1180 580 L 1090 740 L 1020 920 L 980 1080" stroke-width="2.4" />
			<path d="M 1380 240 L 1490 290 L 1620 380 L 1750 490 L 1880 620 L 1920 670" stroke-width="2.0" />
			<path d="M 1380 240 L 1460 160 L 1570 100 L 1720 40 L 1920 10" stroke-width="2.0" />
			<path d="M 1380 240 L 1300 200 L 1180 210 L 990 240 L 760 290 L 510 360 L 220 450 L 0 520" stroke-width="1.8" />
			<path d="M 1380 240 L 1350 120 L 1330 0" stroke-width="2.2" />
			<path d="M 1240 460 L 1330 520 L 1410 610 L 1530 760 L 1650 940 L 1720 1080" stroke-width="1.6" opacity="0.6" />
			<path d="M 1150 140 L 1120 230 L 1060 350 L 950 440 L 780 540 L 610 630 L 380 730 L 0 850" stroke-width="1.6" opacity="0.65" />
			<path d="M 1260 180 L 1240 100 L 1210 0" stroke-width="1.4" opacity="0.5" />
			<path d="M 1490 290 L 1580 250 L 1720 220 L 1920 200" stroke-width="1.4" opacity="0.5" />
		</g>
		
		<g stroke="#ff2a3b" stroke-width="4" opacity="0.3" fill="none" filter="blur(3px)" stroke-linecap="round">
			<path d="M 1380 240 L 1260 180 L 1150 140 L 980 90 L 540 20" />
			<path d="M 1380 240 L 1320 340 L 1240 460 L 1090 740 L 980 1080" />
			<path d="M 1380 240 L 1490 290 L 1620 380 L 1880 620" />
			<path d="M 1380 240 L 1300 200 L 990 240 L 510 360 L 0 520" />
		</g>
	</svg>

	
	<div
		class="relative z-10 w-full max-w-4xl mx-4 sm:mx-6 p-6 sm:p-10 border-2 border-[#ff2a3b] bg-black/92 backdrop-blur-md shadow-[0_0_60px_rgba(255,42,59,0.45)] rounded-sm font-mono text-[#ff4455] terminal-panel"
	>
		
		<div class="flex items-center justify-between border-b-2 border-[#ff2a3b]/60 pb-4 mb-6">
			<div class="flex items-center gap-3">
				<span class="inline-block w-4 h-4 bg-[#ff2a3b] rounded-full animate-ping"></span>
				<span class="text-xs sm:text-sm font-bold tracking-widest text-[#ff6b7a] uppercase">
					ALERTA CRÍTICO // NÍVEL V // DESCOMPRESSÃO CATASTRÓFICA
				</span>
			</div>
			<div class="text-[10px] sm:text-xs text-[#ff8899]/70 tracking-widest hidden sm:block">
				TERMINAL_ID: TARTARUS_01
			</div>
		</div>

		
		<div class="space-y-3 min-h-[260px] sm:min-h-[300px] text-xs sm:text-sm md:text-base leading-relaxed tracking-wider">
			{#each displayedLines as line, idx}
				{#if idx === 1}
					<div class="font-extrabold text-base sm:text-lg md:text-xl text-[#ff2a3b] tracking-wider animate-pulse pt-1 pb-1">
						{line}
					</div>
				{:else if idx === 4}
					<div class="text-[#ff9955] font-semibold">
						{line}
					</div>
				{:else if idx === displayedLines.length - 1 && isTypingComplete}
					<div class="text-[#ffeedd] font-bold pt-2 flex items-center gap-1">
						<span>{line}</span>
						<span class="inline-block w-2.5 h-4 bg-[#ffeedd] animate-blink"></span>
					</div>
				{:else}
					<div class="text-[#ff8899]/90 font-mono">
						{line}
					</div>
				{/if}
			{/each}
		</div>

		
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-[#ff2a3b]/40 text-center">
			<div class="p-3 bg-[#330005]/60 border border-[#ff2a3b]/30 rounded">
				<div class="text-[10px] sm:text-xs text-[#ff8899]/70 uppercase tracking-widest">Profundidade</div>
				<div class="text-sm sm:text-lg font-bold text-[#ffccd2]">{depth.toLocaleString('pt-BR')} M</div>
			</div>
			<div class="p-3 bg-[#330005]/60 border border-[#ff2a3b]/30 rounded">
				<div class="text-[10px] sm:text-xs text-[#ff8899]/70 uppercase tracking-widest">Pressão Hidrost.</div>
				<div class="text-sm sm:text-lg font-bold text-[#ffccd2]">{pressureAtm} ATM</div>
			</div>
			<div class="p-3 bg-[#330005]/60 border border-[#ff2a3b]/30 rounded">
				<div class="text-[10px] sm:text-xs text-[#ff8899]/70 uppercase tracking-widest">Ruído Transmitido</div>
				<div class="text-sm sm:text-lg font-bold {transmittedBits.length > safeBitQuota ? 'text-[#ff3b3b]' : 'text-[#ffccd2]'}">
					{transmittedBits.length} / {safeBitQuota} BITS
				</div>
			</div>
			<div class="p-3 bg-[#330005]/60 border border-[#ff2a3b]/30 rounded">
				<div class="text-[10px] sm:text-xs text-[#ff8899]/70 uppercase tracking-widest">Eficiência Huffman</div>
				<div class="text-sm sm:text-lg font-bold text-[#ffccd2]">{efficiency}%</div>
			</div>
		</div>

		
		<div class="pt-8 sm:pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="text-[11px] sm:text-xs text-[#ff8899]/60 tracking-wider text-center sm:text-left">
				<span>Pressione <kbd class="px-1.5 py-0.5 bg-[#400008] border border-[#ff3b3b]/40 rounded text-[#ffccd2] font-mono">R</kbd> ou <kbd class="px-1.5 py-0.5 bg-[#400008] border border-[#ff3b3b]/40 rounded text-[#ffccd2] font-mono">ENTER</kbd> para reiniciar</span>
				{#if !isTypingComplete}
					<span class="block text-[10px] text-[#ff8899]/40 mt-1">Pressione [ESPAÇO] para pular relatório</span>
				{/if}
			</div>

			<button
				onclick={onRestart}
				class="w-full sm:w-auto px-8 py-3.5 bg-[#ff2a3b] hover:bg-[#ff4455] active:bg-[#cc1828] text-black font-extrabold text-sm sm:text-base tracking-widest rounded-sm transition-all duration-150 shadow-[0_0_25px_rgba(255,42,59,0.7)] hover:shadow-[0_0_40px_rgba(255,68,85,0.9)] cursor-pointer flex items-center justify-center gap-2"
			>
				<span>[ REINICIAR PROTOCOLO (R) ]</span>
			</button>
		</div>
	</div>
</div>

<style>
	.emergency-overlay {
		background: radial-gradient(circle at center, rgba(30, 2, 4, 0.94) 0%, rgba(5, 0, 2, 0.98) 100%);
		box-shadow: inset 0 0 120px 40px rgba(180, 0, 0, 0.45);
	}

	.emergency-strobe {
		animation: strobePulse 1.8s ease-in-out infinite;
	}

	@keyframes strobePulse {
		0%, 100% {
			background: radial-gradient(circle at center, rgba(160, 10, 20, 0.22) 0%, rgba(0, 0, 0, 0.85) 80%);
		}
		50% {
			background: radial-gradient(circle at center, rgba(255, 20, 40, 0.42) 0%, rgba(20, 0, 5, 0.95) 85%);
		}
	}

	.crt-scanlines {
		background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.6) 50%),
			linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.04));
		background-size: 100% 4px, 6px 100%;
		opacity: 0.85;
	}

	.terminal-panel {
		animation: glitchEnter 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
	}

	@keyframes glitchEnter {
		0% {
			opacity: 0;
			transform: scale(0.96) translateY(10px);
			filter: contrast(180%) brightness(150%);
		}
		40% {
			opacity: 0.8;
			transform: scale(1.02) translateX(-4px);
			filter: hue-rotate(20deg);
		}
		70% {
			transform: scale(0.99) translateX(2px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
			filter: none;
		}
	}

	@keyframes blink {
		0%, 49% {
			opacity: 1;
		}
		50%, 100% {
			opacity: 0;
		}
	}

	.animate-blink {
		animation: blink 0.8s infinite;
	}
</style>
