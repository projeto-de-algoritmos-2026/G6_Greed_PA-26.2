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

