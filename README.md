# WebApp SvelteKit + UnoCSS

Estrutura base moderna com **SvelteKit** (Svelte 5 com Runes), **TypeScript** e **UnoCSS**.

---

## 🚀 Tecnologias e Configurações

- **SvelteKit 2 + Svelte 5**: Suporte a runes (`$state`, `$derived`, `$props`, etc.) e modo reativo moderno.
- **UnoCSS**: Motor de CSS utilitário ultrarrápido integrado diretamente no Vite.
  - **`presetUno`**: Compatível com classes utilitárias do Tailwind CSS / Windi CSS.
  - **`presetTypography`**: Estilos padronizados para textos e artigos.
  - **`presetIcons`**: Ícones puros em CSS utilizando a coleção `@iconify-json/lucide` (ex: `i-lucide-flame`, `i-lucide-box`, `i-lucide-zap`).
  - **`transformerDirectives`**: Permite o uso de `@apply` e diretivas em blocos `<style>`.
  - **`transformerVariantGroup`**: Permite agrupamento de variantes, ex: `hover:(bg-blue-600 text-white)`.
  - **`@unocss/reset/tailwind.css`**: CSS Reset moderno baseado no Tailwind.

---

## 📁 Estrutura de Arquivos Principais

- [`uno.config.ts`](./uno.config.ts): Configuração do UnoCSS (presets, regras, atalhos e coleções de ícones).
- [`vite.config.ts`](./vite.config.ts): Integração do plugin `unocss/vite` com o `@sveltejs/kit/vite`.
- [`src/routes/+layout.svelte`](./src/routes/+layout.svelte): Layout base com importação de `virtual:uno.css` e reset CSS.
- [`src/routes/+page.svelte`](./src/routes/+page.svelte): Página inicial demonstrativa com UnoCSS, ícones e reatividade com Svelte 5 runes.

---

## 🛠️ Comandos de Desenvolvimento

Iniciar servidor de desenvolvimento:
```bash
npm run dev
# ou abrindo diretamente no navegador
npm run dev -- --open
```

Verificação de tipos e diagnósticos:
```bash
npm run check
```

Compilar para produção:
```bash
npm run build
```

Pré-visualizar a versão de produção:
```bash
npm run preview
```
