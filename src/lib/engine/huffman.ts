import { MinHeap } from './minHeap';
import type {
	HuffmanMetrics,
	HuffmanNode,
	MergeRecord,
	PriorityQueueItem,
	PriorityQueueSnapshot,
	GreedyAdvice,
	CharacterCodeReport,
	AcademicReport
} from './types';

export type {
	HuffmanMetrics,
	HuffmanNode,
	MergeRecord,
	PriorityQueueItem,
	PriorityQueueSnapshot,
	GreedyAdvice,
	CharacterCodeReport,
	AcademicReport
};
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

	public getNodeLabel(node: HuffmanNode): string {
		if (node.isLeaf && node.char !== null) {
			return node.char === ' ' ? '[SPC]' : `'${node.char}'`;
		}
		return `Σ${node.weight}`;
	}

	public getPriorityQueueSnapshot(): PriorityQueueSnapshot {
		const sorted = [...this.availableNodes].sort((a, b) => {
			if (a.weight !== b.weight) return a.weight - b.weight;
			const charA = a.char || a.id;
			const charB = b.char || b.id;
			return charA.localeCompare(charB);
		});

		const topTwoMinIds: [string, string] | null =
			sorted.length >= 2 ? [sorted[0].id, sorted[1].id] : null;

		const items = sorted.map((node, index) => ({
			id: node.id,
			label: this.getNodeLabel(node),
			weight: node.weight,
			isLeaf: node.isLeaf,
			isOptimalNextMin: index < 2
		}));

		let recommendationExplanation = '';
		if (sorted.length >= 2) {
			const n1 = sorted[0];
			const n2 = sorted[1];
			recommendationExplanation = `REGRA DA ESCOLHA AMBICIOSA: Os dois menores nós atuais são ${this.getNodeLabel(n1)} (peso ${n1.weight}) e ${this.getNodeLabel(n2)} (peso ${n2.weight}). Fundi-los primeiro garante que fiquem no nível mais profundo da árvore, minimizando o custo total ponderado.`;
		} else if (sorted.length === 1) {
			recommendationExplanation = 'ÁRVORE COMPLETA: Todos os símbolos foram unificados em uma única raiz.';
		} else {
			recommendationExplanation = 'Fila vazia.';
		}

		return {
			items,
			topTwoMinIds,
			recommendationExplanation
		};
	}

	public getGreedyAdvice(): GreedyAdvice | null {
		if (this.availableNodes.length < 2) return null;

		const sorted = [...this.availableNodes].sort((a, b) => {
			if (a.weight !== b.weight) return a.weight - b.weight;
			const charA = a.char || a.id;
			const charB = b.char || b.id;
			return charA.localeCompare(charB);
		});

		const a = sorted[0];
		const b = sorted[1];
		const sumWeight = a.weight + b.weight;
		const labelA = this.getNodeLabel(a);
		const labelB = this.getNodeLabel(b);

		return {
			idA: a.id,
			idB: b.id,
			labelA,
			labelB,
			weightA: a.weight,
			weightB: b.weight,
			sumWeight,
			explanation: `Os nós ${labelA} (${a.weight}) e ${labelB} (${b.weight}) são os 2 menores da Min-Heap. Fundi-los gerará um nó pai de peso ${sumWeight}.`,
			theoreticPrinciple:
				'Propriedade da Escolha Ambiciosa: Existe uma árvore de prefixos ótima onde os dois caracteres menos frequentes são folhas irmãs na maior profundidade.'
		};
	}

	public generateAsciiTree(node: HuffmanNode | null = this.playerRoot || this.optimalRoot, prefix: string = '', isLeft: boolean = true): string {
		if (!node) return '(árvore vazia)';

		let result = '';
		const connector = prefix === '' ? '└── ' : isLeft ? '├── 0: ' : '└── 1: ';
		const label = node.isLeaf && node.char !== null
			? `${this.getNodeLabel(node)} [peso: ${node.weight}, cód: "${node.code || ''}"]`
			: `[sub-raiz w:${node.weight}]`;

		result += prefix + connector + label + '\n';

		const childPrefix = prefix + (prefix === '' ? '    ' : isLeft ? '│   ' : '    ');
		if (node.left) {
			result += this.generateAsciiTree(node.left, childPrefix, true);
		}
		if (node.right) {
			result += this.generateAsciiTree(node.right, childPrefix, false);
		}

		return result;
	}

	public generateAcademicReport(): AcademicReport {
		const metrics = this.getMetrics();
		const totalChars = this.message.length;

		let shannonEntropy = 0;
		for (const freq of this.frequencies.values()) {
			if (freq > 0 && totalChars > 0) {
				const p = freq / totalChars;
				shannonEntropy -= p * Math.log2(p);
			}
		}
		shannonEntropy = Math.round(shannonEntropy * 1000) / 1000;

		const sortedChars = Array.from(this.frequencies.entries()).sort((a, b) => b[1] - a[1]);
		const characterTable: CharacterCodeReport[] = sortedChars.map(([ch, freq]) => {
			const playerCode = this.playerCodes.get(ch) || '-';
			const optimalCode = this.optimalCodes.get(ch) || '-';
			return {
				char: ch === ' ' ? '[ESPAÇO]' : ch,
				frequency: freq,
				playerCode,
				playerBitLen: playerCode !== '-' ? playerCode.length : 8,
				optimalCode,
				optimalBitLen: optimalCode !== '-' ? optimalCode.length : 8
			};
		});

		const averageCodeLength =
			totalChars > 0 && metrics.playerBits > 0
				? Math.round((metrics.playerBits / totalChars) * 1000) / 1000
				: 8;

		const redundancyBits = Math.max(0, Math.round((averageCodeLength - shannonEntropy) * 1000) / 1000);

		const asciiTree = this.generateAsciiTree();

		let md = `# RELATÓRIO TÉCNICO // ALGORITMO AMBICIOSO DE HUFFMAN\n`;
		md += `> **Estação Tartarus-V // Módulo de Transmissão Acústica Sonarwave**\n\n`;
		md += `## 1. Dados da Mensagem\n`;
		md += `- **Texto:** \`"${this.message}"\`\n`;
		md += `- **Comprimento total ($N$):** ${totalChars} caracteres\n`;
		md += `- **Símbolos distintos ($|\\Sigma|$):** ${this.frequencies.size} símbolos\n`;
		md += `- **Entropia de Shannon $H(X)$:** ${shannonEntropy} bits/símbolo\n\n`;

		md += `## 2. Comparativo de Custo e Compressão\n`;
		md += `| Métrica | Valor |\n`;
		md += `| :--- | :--- |\n`;
		md += `| **ASCII Fixo (8 bits/char)** | ${metrics.rawAsciiBits} bits |\n`;
		md += `| **Código do Jogador (Sonarwave)** | ${metrics.playerBits} bits |\n`;
		md += `| **Cota Mínima Ótima (Huffman)** | ${metrics.optimalBits} bits |\n`;
		md += `| **Eficiência Ambiciosa** | ${metrics.efficiency}% |\n`;
		md += `| **Taxa de Compressão vs ASCII** | ${metrics.compressionRatio}% |\n`;
		md += `| **Comprimento Médio ($\\bar{L}$)** | ${averageCodeLength} bits/símbolo |\n`;
		md += `| **Redundância ($\\bar{L} - H(X)$)** | ${redundancyBits} bits |\n\n`;

		md += `## 3. Tabela de Frequência e Dicionário de Prefixos\n\n`;
		md += `| Caractere | Frequência | Probabilidade | Código do Jogador | Comprimento | Código Ótimo |\n`;
		md += `| :---: | :---: | :---: | :---: | :---: | :---: |\n`;
		for (const row of characterTable) {
			const prob = totalChars > 0 ? ((row.frequency / totalChars) * 100).toFixed(1) + '%' : '0%';
			md += `| \`${row.char}\` | ${row.frequency} | ${prob} | \`${row.playerCode}\` | ${row.playerBitLen} | \`${row.optimalCode}\` |\n`;
		}
		md += `\n## 4. Estrutura da Árvore de Prefixos (Diagrama ASCII)\n\n\`\`\`text\n`;
		md += asciiTree;
		md += `\`\`\`\n\n`;
		md += `*Gerado pelo simulador SONARWAVE - Algoritmos Ambiciosos (Greedy/Huffman)*\n`;

		const json = JSON.stringify(
			{
				message: this.message,
				metrics,
				shannonEntropy,
				averageCodeLength,
				redundancyBits,
				characterTable,
				treeRoot: this.playerRoot || this.optimalRoot
			},
			null,
			2
		);

		return {
			message: this.message,
			characterCount: totalChars,
			distinctCharacters: this.frequencies.size,
			shannonEntropy,
			rawAsciiBits: metrics.rawAsciiBits,
			playerBits: metrics.playerBits,
			optimalBits: metrics.optimalBits,
			efficiencyPct: metrics.efficiency,
			compressionRatioPct: metrics.compressionRatio,
			averageCodeLength,
			redundancyBits,
			characterTable,
			asciiTree,
			markdown: md,
			json
		};
	}
}


