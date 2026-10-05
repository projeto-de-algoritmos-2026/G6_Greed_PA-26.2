import type { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
	{
		depth: 8000,
		pressureAtm: 800,
		name: 'ABISSO INICIAL',
		message: 'SOS CASCO',
		description: 'Abisso inicial. Construa a árvore com nós repetidos.',
		toleranceMargin: 0.5,
		baseLeakRate: 0.08
	},
	{
		depth: 9500,
		pressureAtm: 950,
		name: 'ZONA HADAL',
		message: 'CASCO EM RISCO',
		description: 'Zona Hadal. Menor tolerância a ruído acústico.',
		toleranceMargin: 0.35,
		baseLeakRate: 0.12
	},
	{
		depth: 11000,
		pressureAtm: 1100,
		name: 'FOSSA DAS MARIANAS',
		message: 'PRESSAO CRITICA',
		description: 'Fossa abissal. Transmita o código antes do colapso.',
		toleranceMargin: 0.25,
		baseLeakRate: 0.18
	}
];

