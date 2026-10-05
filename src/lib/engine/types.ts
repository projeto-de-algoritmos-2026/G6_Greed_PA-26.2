export interface HuffmanNode {
	id: string;
	char: string | null;
	weight: number;
	left: HuffmanNode | null;
	right: HuffmanNode | null;
	code?: string;
	depth?: number;
	isLeaf: boolean;
	x?: number;
	y?: number;
	z?: number;
}

export interface MergeRecord {
	parent: HuffmanNode;
	leftChild: HuffmanNode;
	rightChild: HuffmanNode;
}

export interface HuffmanMetrics {
	rawAsciiBits: number;
	optimalBits: number;
	playerBits: number;
	efficiency: number;
	compressionRatio: number;
	characterCount: number;
	distinctCharacters: number;
}

export interface DecodeConfig {
	authentic: string[];
	mimic: string[];
	// Probabilidade de a resposta ser uma imitação da criatura.
	mimicChance: number;
}

export interface LevelConfig {
	depth: number;
	pressureAtm: number;
	name: string;
	// Uma mensagem é sorteada a cada carregamento da fase.
	messages: string[];
	description: string;
	toleranceMargin: number;
	baseLeakRate: number;
	// Quantidade de símbolos com frequência corrompida ("??") na bandeja.
	hiddenSymbols: number;
	// Probabilidade por segundo de a criatura exigir silêncio total.
	silenceChance: number;
	// Probabilidade de um impacto interromper a transmissão.
	interruptionChance: number;
	decode: DecodeConfig | null;
}

