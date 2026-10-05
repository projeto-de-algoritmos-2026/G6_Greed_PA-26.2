<script lang="ts">
	import '@unocss/reset/tailwind.css';
	import 'virtual:uno.css';
	import favicon from '$lib/assets/terminal.png';

	let { children } = $props();
</script>

<svelte:head>
	<title>SONARWAVE // Terror Abissal e Algoritmo de Huffman</title>
	<link rel="icon" type="image/png" href={favicon} />
</svelte:head>

{@render children()}
