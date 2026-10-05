import type { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
	{
		depth: 8000,
		pressureAtm: 800,
		name: 'ABISSO INICIAL',
		messages: ['SOS CASCO', 'SOS SOS SOS', 'AJUDA AQUI', 'CASCO FALHOU'],
		description: 'Abisso inicial. Construa a árvore com nós repetidos.',
		toleranceMargin: 0.5,
		baseLeakRate: 0.08,
		hiddenSymbols: 0,
		silenceChance: 0,
		interruptionChance: 0,
		decode: {
			authentic: ['RESGATE A CAMINHO', 'SINAL RECEBIDO'],
			mimic: [],
			mimicChance: 0
		}
	},
	{
		depth: 9500,
		pressureAtm: 950,
		name: 'ZONA HADAL',
		messages: ['CASCO EM RISCO', 'ABRA A BOIA', 'RADAR MUDO', 'CABO PARTIDO'],
		description: 'Zona Hadal. Empates de frequência geram várias árvores ótimas.',
		toleranceMargin: 0.35,
		baseLeakRate: 0.12,
		hiddenSymbols: 0,
		silenceChance: 0.02,
		interruptionChance: 0.35,
		decode: {
			authentic: ['SUBAM AO NIVEL DOIS', 'AGUARDEM O BATISCAFO'],
			mimic: ['ABRAM A ESCOTILHA', 'SAIAM DO CASCO AGORA'],
			mimicChance: 0.35
		}
	},
	{
		depth: 11000,
		pressureAtm: 1100,
		name: 'FOSSA DAS MARIANAS',
		messages: ['PRESSAO CRITICA', 'SINAL FRACO NO CASCO', 'OXIGENIO BAIXO'],
		description: 'Fossa abissal. Interferência corrompe parte das frequências.',
		toleranceMargin: 0.25,
		baseLeakRate: 0.18,
		hiddenSymbols: 2,
		silenceChance: 0.03,
		interruptionChance: 0.5,
		decode: {
			authentic: ['MANTENHAM SILENCIO', 'CABO DE RESGATE PRONTO'],
			mimic: ['DESLIGUEM AS LUZES', 'ESTAMOS LA FORA'],
			mimicChance: 0.5
		}
	},
	{
		depth: 12400,
		pressureAtm: 1240,
		name: 'FENDA TARTARUS',
		messages: ['SOS: 3 VIVOS, 2 FERIDOS', 'O2 EM 12%. ENVIEM AJUDA', 'PORTA 7 SELADA; CASCO 40%'],
		description: 'Fenda Tartarus. Alfabeto maior: números e pontuação.',
		toleranceMargin: 0.18,
		baseLeakRate: 0.22,
		hiddenSymbols: 3,
		silenceChance: 0.035,
		interruptionChance: 0.6,
		decode: {
			authentic: ['DESCIDA EM 9 MIN', 'CABO 2 ACOPLADO'],
			mimic: ['ABRAM A PORTA 7', 'SAIAM. ESTAMOS AQUI'],
			mimicChance: 0.5
		}
	},
	{
		depth: 13900,
		pressureAtm: 1390,
		name: 'NÚCLEO ABISSAL',
		messages: ['ELA ESTA AQUI. 4 MIN DE AR!', 'NAO ABRAM A ESCOTILHA 3-B!', 'COORD 11.37N 142.59E, SOS'],
		description: 'Núcleo abissal. Margem mínima e a entidade imita a superfície.',
		toleranceMargin: 0.12,
		baseLeakRate: 0.26,
		hiddenSymbols: 4,
		silenceChance: 0.04,
		interruptionChance: 0.7,
		decode: {
			authentic: ['SUBAM. RESGATE ACIMA', 'CAPSULA 4 LIBERADA'],
			mimic: ['ABRAM A ESCOTILHA 3-B', 'TUDO SEGURO. SAIAM'],
			mimicChance: 0.6
		}
	}
];
