<script lang="ts">
	let count = $state(0);
</script>

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-purple-500 selection:text-white">
	<div class="max-w-2xl w-full bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 shadow-2xl space-y-6">
		<header class="flex items-center justify-between border-b border-slate-700/50 pb-5">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
					<div class="i-lucide-flame text-2xl"></div>
				</div>
				<div>
					<h1 class="text-2xl font-bold tracking-tight text-white">SvelteKit + UnoCSS</h1>
					<p class="text-xs text-slate-400">Template base configurado com sucesso</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					Ativo
				</span>
			</div>
		</header>

		<section class="space-y-4">
			<p class="text-slate-300 leading-relaxed text-sm">
				Sua aplicação está pronta com suporte completo a <strong class="text-white">Svelte 5</strong> (runes),
				<strong class="text-white">UnoCSS</strong> com presets de ícones Lucide, tipografia e utilitários sob demanda.
			</p>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
				<div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3">
					<div class="i-lucide-zap text-xl text-yellow-400 shrink-0 mt-0.5"></div>
					<div>
						<h3 class="text-sm font-semibold text-slate-200">Alta Performance</h3>
						<p class="text-xs text-slate-400 mt-0.5">UnoCSS compila atômico e instantâneo via Vite.</p>
					</div>
				</div>

				<div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3">
					<div class="i-lucide-box text-xl text-purple-400 shrink-0 mt-0.5"></div>
					<div>
						<h3 class="text-sm font-semibold text-slate-200">Svelte 5 Runes</h3>
						<p class="text-xs text-slate-400 mt-0.5">Reatividade moderna com <code class="text-purple-300">$state</code> e mais.</p>
					</div>
				</div>
			</div>
		</section>

		<section class="p-4 rounded-xl bg-slate-900/40 border border-slate-700/40 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="i-lucide-mouse-pointer-click text-lg text-slate-400"></div>
				<span class="text-sm text-slate-300">Contador de teste (reatividade):</span>
			</div>
			<div class="flex items-center gap-3">
				<button
					onclick={() => count--}
					class="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 transition flex items-center justify-center text-slate-200 font-bold"
					aria-label="Diminuir"
				>
					-
				</button>
				<span class="font-mono text-lg font-bold min-w-8 text-center text-purple-300">{count}</span>
				<button
					onclick={() => count++}
					class="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-95 transition flex items-center justify-center text-white font-bold"
					aria-label="Aumentar"
				>
					+
				</button>
			</div>
		</section>

		<footer class="pt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
			<span>Edite <code class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">src/routes/+page.svelte</code> para começar</span>
		</footer>
	</div>
</main>
