import { MinHeap } from './minHeap';
import type { HuffmanMetrics, HuffmanNode, MergeRecord } from './types';

export type { HuffmanMetrics, HuffmanNode, MergeRecord };
export { MinHeap };

export class HuffmanEngine {
	public message: string = '';
	public frequencies: Map<string, number> = new Map();

	public optimalRoot: HuffmanNode | null = null;
	public optimalCodes: Map<string, string> = new Map();
	public optimalTotalBits: number = 0;

	public availableNodes: HuffmanNode[] = [];
	public playerRoot: HuffmanNode | null = null;
	public playerCodes: Map<string, string> = new Map();
	public playerTotalBits: number = 0;
	public mergeHistory: MergeRecord[] = [];

	private nextNodeId: number = 1;

	constructor(initialMessage: string = '') {
		if (initialMessage) {
			this.loadMessage(initialMessage);
		}
	}

	public loadMessage(text: string): void {
		this.message = text;
		this.frequencies.clear();
		this.mergeHistory = [];
		this.nextNodeId = 1;

		for (const ch of text) {
			this.frequencies.set(ch, (this.frequencies.get(ch) || 0) + 1);
		}

		this.computeOptimalSolution();
		this.resetPlayerTree();
	}

	private computeOptimalSolution(): void {
		if (this.frequencies.size === 0) {
			this.optimalRoot = null;
			this.optimalCodes.clear();
			this.optimalTotalBits = 0;
			return;
		}

		if (this.frequencies.size === 1) {
			const [ch, freq] = Array.from(this.frequencies.entries())[0];
			const singleNode: HuffmanNode = {
				id: `opt_leaf_${ch}`,
				char: ch,
				weight: freq,
				left: null,
				right: null,
				isLeaf: true,
				code: '0',
				depth: 1
			};
			this.optimalRoot = singleNode;
			this.optimalCodes.clear();
			this.optimalCodes.set(ch, '0');
			this.optimalTotalBits = freq;
			return;
		}

		const minHeap = new MinHeap<HuffmanNode>((a, b) => {
			if (a.weight !== b.weight) {
				return a.weight - b.weight;
			}
			const charA = a.char || '';
			const charB = b.char || '';
			return charA.localeCompare(charB);
		});

		let optId = 1;
		for (const [char, freq] of this.frequencies.entries()) {
			minHeap.push({
				id: `opt_leaf_${optId++}_${char}`,
				char,
				weight: freq,
				left: null,
				right: null,
				isLeaf: true
			});
		}

		while (minHeap.size > 1) {
			const left = minHeap.pop()!;
			const right = minHeap.pop()!;

			const parent: HuffmanNode = {
				id: `opt_parent_${optId++}`,
				char: null,
				weight: left.weight + right.weight,
				left,
				right,
				isLeaf: false
			};

			minHeap.push(parent);
		}

		this.optimalRoot = minHeap.pop()!;
		this.optimalCodes.clear();
		this.generatePrefixCodes(this.optimalRoot, '', 0, this.optimalCodes);

		this.optimalTotalBits = 0;
		for (const [char, freq] of this.frequencies.entries()) {
			const code = this.optimalCodes.get(char) || '';
			this.optimalTotalBits += freq * code.length;
		}
	}

	public resetPlayerTree(): void {
		this.availableNodes = [];
		this.mergeHistory = [];
		this.playerRoot = null;
		this.playerCodes.clear();
		this.playerTotalBits = 0;

		const sortedEntries = Array.from(this.frequencies.entries()).sort((a, b) => a[1] - b[1]);

		for (const [char, freq] of sortedEntries) {
			this.availableNodes.push({
				id: `node_${this.nextNodeId++}_${char}`,
				char,
				weight: freq,
				left: null,
				right: null,
				isLeaf: true
			});
		}

		if (this.availableNodes.length === 1) {
			this.playerRoot = this.availableNodes[0];
			this.playerCodes.set(this.playerRoot.char!, '0');
			this.playerTotalBits = this.playerRoot.weight;
		}
	}

	public mergeNodes(idA: string, idB: string): HuffmanNode {
		if (idA === idB) {
			throw new Error('Não é possível fundir um nó consigo mesmo.');
		}

		const indexA = this.availableNodes.findIndex((n) => n.id === idA);
		const indexB = this.availableNodes.findIndex((n) => n.id === idB);

		if (indexA === -1 || indexB === -1) {
			throw new Error('Um ou ambos os nós selecionados não estão disponíveis.');
		}

		const nodeA = this.availableNodes[indexA];
		const nodeB = this.availableNodes[indexB];

		this.availableNodes = this.availableNodes.filter((n) => n.id !== idA && n.id !== idB);

		const parent: HuffmanNode = {
			id: `parent_${this.nextNodeId++}`,
			char: null,
			weight: nodeA.weight + nodeB.weight,
			left: nodeA,
			right: nodeB,
			isLeaf: false
		};

		this.mergeHistory.push({
			parent,
			leftChild: nodeA,
			rightChild: nodeB
		});

		this.availableNodes.push(parent);
		this.updatePlayerTreeState();

		return parent;
	}

	public undoLastMerge(): MergeRecord | null {
		const lastMerge = this.mergeHistory.pop();
		if (!lastMerge) return null;

		this.availableNodes = this.availableNodes.filter((n) => n.id !== lastMerge.parent.id);
		this.availableNodes.push(lastMerge.leftChild);
		this.availableNodes.push(lastMerge.rightChild);

		this.updatePlayerTreeState();
		return lastMerge;
	}

	public isTreeComplete(): boolean {
		if (this.frequencies.size <= 1) return true;
		if (this.availableNodes.length !== 1) return false;

		const root = this.availableNodes[0];
		const leavesFound = new Set<string>();

		const traverse = (node: HuffmanNode | null) => {
			if (!node) return;
			if (node.isLeaf && node.char !== null) {
				leavesFound.add(node.char);
			}
			traverse(node.left);
			traverse(node.right);
		};

		traverse(root);
		return leavesFound.size === this.frequencies.size;
	}

	private updatePlayerTreeState(): void {
		this.playerCodes.clear();
		this.playerTotalBits = 0;

		if (this.isTreeComplete()) {
			this.playerRoot = this.availableNodes[0];
			this.generatePrefixCodes(this.playerRoot, '', 0, this.playerCodes);

			for (const [char, freq] of this.frequencies.entries()) {
				const code = this.playerCodes.get(char) || '';
				this.playerTotalBits += freq * code.length;
			}
		} else {
			this.playerRoot = null;
		}
	}

	private generatePrefixCodes(
		node: HuffmanNode | null,
		currentCode: string,
		currentDepth: number,
		targetMap: Map<string, string>
	): void {
		if (!node) return;

		node.depth = currentDepth;
		node.code = currentCode;

		if (node.isLeaf && node.char !== null) {
			const finalCode = currentCode.length === 0 ? '0' : currentCode;
			node.code = finalCode;
			targetMap.set(node.char, finalCode);
			return;
		}

		this.generatePrefixCodes(node.left, currentCode + '0', currentDepth + 1, targetMap);
		this.generatePrefixCodes(node.right, currentCode + '1', currentDepth + 1, targetMap);
	}

	public encode(useOptimal: boolean = false): string {
		const codeMap = useOptimal ? this.optimalCodes : this.playerCodes;
		let bitString = '';
		for (const ch of this.message) {
			const code = codeMap.get(ch);
			if (code !== undefined) {
				bitString += code;
			} else {
				throw new Error(`Caractere '${ch}' sem código na árvore.`);
			}
		}
		return bitString;
	}

	public decode(bitString: string, useOptimal: boolean = false): string {
		const root = useOptimal ? this.optimalRoot : this.playerRoot;
		if (!root) return '';

		let result = '';
		let current = root;

		for (const bit of bitString) {
			if (current.isLeaf) {
				result += current.char;
				current = root;
			}

			if (bit === '0') {
				current = current.left || current;
			} else if (bit === '1') {
				current = current.right || current;
			}

			if (current.isLeaf) {
				result += current.char;
				current = root;
			}
		}

		return result;
	}

	public getMetrics(): HuffmanMetrics {
		const rawAsciiBits = this.message.length * 8;
		const optimalBits = this.optimalTotalBits;
		const playerBits = this.playerTotalBits > 0 ? this.playerTotalBits : rawAsciiBits;

		const efficiency =
			optimalBits > 0 && playerBits > 0
				? Math.min(100, Math.round((optimalBits / playerBits) * 1000) / 10)
				: 0;

		const compressionRatio =
			rawAsciiBits > 0 ? Math.round((1 - playerBits / rawAsciiBits) * 1000) / 10 : 0;

		return {
			rawAsciiBits,
			optimalBits,
			playerBits,
			efficiency,
			compressionRatio,
			characterCount: this.message.length,
			distinctCharacters: this.frequencies.size
		};
	}

	/**
	 * Verdadeiro quando a árvore do jogador tem custo ótimo mas atribui
	 * comprimentos de código diferentes da árvore de referência: com empates
	 * de frequência, existem várias árvores de Huffman igualmente ótimas.
	 */
	public isAlternativeOptimal(): boolean {
		if (!this.playerRoot || this.playerTotalBits !== this.optimalTotalBits) return false;
		for (const [char, code] of this.optimalCodes) {
			if (this.playerCodes.get(char)?.length !== code.length) return true;
		}
		return false;
	}

	public isGreedyChoice(idA: string, idB: string): boolean {
		if (this.availableNodes.length <= 2) return true;

		const sorted = [...this.availableNodes].sort((a, b) => a.weight - b.weight);
		const minWeight1 = sorted[0].weight;
		const minWeight2 = sorted[1].weight;

		const nodeA = this.availableNodes.find((n) => n.id === idA);
		const nodeB = this.availableNodes.find((n) => n.id === idB);
		if (!nodeA || !nodeB) return false;

		const weights = [nodeA.weight, nodeB.weight].sort((a, b) => a - b);
		return weights[0] === minWeight1 && weights[1] <= minWeight2;
	}
}

