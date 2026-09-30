import { createRequire } from 'node:module';
import {
	defineConfig,
	presetIcons,
	presetTypography,
	presetUno,
	transformerDirectives,
	transformerVariantGroup
} from 'unocss';

const require = createRequire(import.meta.url);

export default defineConfig({
	presets: [
		presetUno(),
		presetTypography(),
		presetIcons({
			scale: 1.2,
			warn: true,
			collections: {
				lucide: () => require('@iconify-json/lucide/icons.json')
			}
		})
	],
	transformers: [transformerDirectives(), transformerVariantGroup()]
});
