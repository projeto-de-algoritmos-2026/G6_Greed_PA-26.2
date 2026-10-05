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

export interface LevelConfig {
	depth: number;
	pressureAtm: number;
	name: string;
	message: string;
	description: string;
	toleranceMargin: number;
	baseLeakRate: number;
}

export interface PriorityQueueItem {
	id: string;
	label: string;
	weight: number;
	isLeaf: boolean;
	isOptimalNextMin: boolean;
}

export interface PriorityQueueSnapshot {
	items: PriorityQueueItem[];
	topTwoMinIds: [string, string] | null;
	recommendationExplanation: string;
}

export interface GreedyAdvice {
	idA: string;
	idB: string;
	labelA: string;
	labelB: string;
	weightA: number;
	weightB: number;
	sumWeight: number;
	explanation: string;
	theoreticPrinciple: string;
}

export interface CharacterCodeReport {
	char: string;
	frequency: number;
	playerCode: string;
	playerBitLen: number;
	optimalCode: string;
	optimalBitLen: number;
}

export interface AcademicReport {
	message: string;
	characterCount: number;
	distinctCharacters: number;
	shannonEntropy: number;
	rawAsciiBits: number;
	playerBits: number;
	optimalBits: number;
	efficiencyPct: number;
	compressionRatioPct: number;
	averageCodeLength: number;
	redundancyBits: number;
	characterTable: CharacterCodeReport[];
	asciiTree: string;
	markdown: string;
	json: string;
}

