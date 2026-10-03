/**
 * SUBWAVE - Huffman Engine
 * Implementação modular do Algoritmo Guloso de Huffman para compressão ótima de prefixos.
 * 
 * TEORIA GULOSA (GREEDY ALGORITHM):
 * A Codificação de Huffman resolve o problema de compressão sem perda encontrando uma
 * árvore binária com comprimento de caminho ponderado mínimo (Weighted External Path Length).
 * 
 * 1. PROPRIEDADE DA ESCOLHA GULOSA:
 *    A cada iteração, os dois nós com as menores frequências do conjunto são combinados.
 *    Existe pelo menos uma árvore ótima de prefixo em que os dois caracteres de menor
 *    frequência são irmãos na maior profundidade da árvore.
 * 
 * 2. SUBESTRUTURA ÓTIMA:
 *    A substituição dos dois nós de menor frequência por um novo nó cujo peso é a soma
 *    das frequências reduz o problema de tamanho n para n-1. A solução ótima para o
 *    subproblema de n-1 nós produz a solução ótima para o problema original de n nós.
 */

export interface HuffmanNode {
	id: string;
	char: string | null; // null se for nó interno
	weight: number;      // frequência acumulada
	left: HuffmanNode | null;
	right: HuffmanNode | null;
	code?: string;       // código de prefixo atribuído ('0'...'1'...)
	depth?: number;
	isLeaf: boolean;
	x?: number;          // coordenadas 3D para posicionamento visual
	y?: number;
	z?: number;
}

export interface MergeRecord {
	parent: HuffmanNode;
	leftChild: HuffmanNode;
	rightChild: HuffmanNode;
}

export interface HuffmanMetrics {
	rawAsciiBits: number;     // tamanho * 8 bits
	optimalBits: number;      // custo ótimo pelo algoritmo guloso
	playerBits: number;       // custo alcançado pela árvore do jogador
	efficiency: number;       // (optimalBits / playerBits) * 100%
	compressionRatio: number; // (1 - playerBits / rawAsciiBits) * 100%
	characterCount: number;
	distinctCharacters: number;
}

/**
 * Min-Heap (Priority Queue) para garantir extração em O(log n)
 * dos dois nós de menor peso a cada passo guloso.
 */
export class MinHeap<T> {
	private heap: T[] = [];
	private compare: (a: T, b: T) => number;

	constructor(compareFn: (a: T, b: T) => number) {
		this.compare = compareFn;
	}

	get size(): number {
		return this.heap.length;
	}

	isEmpty(): boolean {
		return this.heap.length === 0;
	}

	peek(): T | null {
		return this.heap.length > 0 ? this.heap[0] : null;
	}

	push(item: T): void {
		this.heap.push(item);
		this.siftUp(this.heap.length - 1);
	}

	pop(): T | null {
		if (this.heap.length === 0) return null;
		const min = this.heap[0];
		const last = this.heap.pop()!;
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.siftDown(0);
		}
		return min;
	}

	private siftUp(index: number): void {
		let current = index;
		while (current > 0) {
			const parent = Math.floor((current - 1) / 2);
			if (this.compare(this.heap[current], this.heap[parent]) < 0) {
				[this.heap[current], this.heap[parent]] = [this.heap[parent], this.heap[current]];
				current = parent;
			} else {
				break;
			}
		}
	}

	private siftDown(index: number): void {
		let current = index;
		const length = this.heap.length;

		while (true) {
			let smallest = current;
			const left = 2 * current + 1;
			const right = 2 * current + 2;

			if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
				smallest = left;
			}
			if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
				smallest = right;
			}

			if (smallest !== current) {
				[this.heap[current], this.heap[smallest]] = [this.heap[smallest], this.heap[current]];
				current = smallest;
			} else {
				break;
			}
		}
	}
}

/**
 * Motor de Huffman interativo e canônico.
 */
export class HuffmanEngine {
	public message: string = '';
	public frequencies: Map<string, number> = new Map();
	
	// Estado ótimo gerado pelo algoritmo canônico guloso
	public optimalRoot: HuffmanNode | null = null;
	public optimalCodes: Map<string, string> = new Map();
	public optimalTotalBits: number = 0;

	// Estado interativo montado pelo operador/jogador
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

	/**
	 * Carrega uma nova mensagem de alerta, calcula frequências e prepara a árvore ótima
	 * e o espaço de montagem do jogador.
	 */
	public loadMessage(text: string): void {
		this.message = text;
		this.frequencies.clear();
		this.mergeHistory = [];
		this.nextNodeId = 1;

		// 1. Mapeamento de Frequência de cada caractere
		for (const ch of text) {
			this.frequencies.set(ch, (this.frequencies.get(ch) || 0) + 1);
		}

		// 2. Calcula a Solução Ótima (Gulosa)
		this.computeOptimalSolution();

		// 3. Inicializa as Folhas do Jogador
		this.resetPlayerTree();
	}

	/**
	 * ALGORITMO GULOSO DE HUFFMAN CANÔNICO:
	 * Usa Min-Heap para garantir que os dois nós com as menores frequências
	 * sejam combinados iterativamente a cada passo.
	 */
	private computeOptimalSolution(): void {
		if (this.frequencies.size === 0) {
			this.optimalRoot = null;
			this.optimalCodes.clear();
			this.optimalTotalBits = 0;
			return;
		}

		// Caso especial: apenas 1 caractere distinto na mensagem inteira
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
			this.optimalTotalBits = freq * 1;
			return;
		}

		// Cria uma Min-Heap com todos os nós-folha
		const minHeap = new MinHeap<HuffmanNode>((a, b) => {
			if (a.weight !== b.weight) {
				return a.weight - b.weight;
			}
			// Desempate determinístico por caractere para estabilidade
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

		// LAÇO GULOSO: Repetir até restar apenas 1 nó na fila de prioridade
		while (minHeap.size > 1) {
			// Passo Guloso 1: Extrai os dois nós com menor peso
			const left = minHeap.pop()!;
			const right = minHeap.pop()!;

			// Passo Guloso 2: Combina os dois nós criando um novo nó-pai
			const parent: HuffmanNode = {
				id: `opt_parent_${optId++}`,
				char: null,
				weight: left.weight + right.weight,
				left,
				right,
				isLeaf: false
			};

			// Insere o novo nó de volta na Min-Heap
			minHeap.push(parent);
		}

		this.optimalRoot = minHeap.pop()!;

		// Percorre a árvore atribuindo os códigos de prefixo ('0' à esquerda, '1' à direita)
		this.optimalCodes.clear();
		this.generatePrefixCodes(this.optimalRoot, '', 0, this.optimalCodes);

		// Calcula o custo teórico ótimo em bits: sum(freq_i * profundidade_i)
		this.optimalTotalBits = 0;
		for (const [char, freq] of this.frequencies.entries()) {
			const code = this.optimalCodes.get(char) || '';
			this.optimalTotalBits += freq * code.length;
		}
	}

	/**
	 * Reinicializa a árvore do jogador deixando apenas os nós-folha disponíveis na bandeja.
	 */
	public resetPlayerTree(): void {
		this.availableNodes = [];
		this.mergeHistory = [];
		this.playerRoot = null;
		this.playerCodes.clear();
		this.playerTotalBits = 0;

		// Ordena os nós iniciais por frequência ascendente para facilitar a visualização
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

		// Se tiver apenas 1 caractere
		if (this.availableNodes.length === 1) {
			this.playerRoot = this.availableNodes[0];
			this.playerCodes.set(this.playerRoot.char!, '0');
			this.playerTotalBits = this.playerRoot.weight;
		}
	}

	/**
	 * Ação do Jogador: Seleciona 2 nós disponíveis e executa a FUSÃO (MERGE).
	 * O primeiro nó torna-se o filho esquerdo ('0') e o segundo o filho direito ('1').
	 */
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

		// Remove os dois nós da lista de nós disponíveis
		this.availableNodes = this.availableNodes.filter((n) => n.id !== idA && n.id !== idB);

		// Cria nó-pai com peso somado
		const parent: HuffmanNode = {
			id: `parent_${this.nextNodeId++}`,
			char: null,
			weight: nodeA.weight + nodeB.weight,
			left: nodeA,
			right: nodeB,
			isLeaf: false
		};

		// Guarda no histórico para permitir Desfazer (Undo)
		this.mergeHistory.push({
			parent,
			leftChild: nodeA,
			rightChild: nodeB
		});

		// O nó-pai agora está disponível para fusões subsequentes
		this.availableNodes.push(parent);

		// Atualiza o estado da árvore
		this.updatePlayerTreeState();

		return parent;
	}

	/**
	 * Ação do Jogador: Desfaz a última fusão realizada.
	 */
	public undoLastMerge(): MergeRecord | null {
		const lastMerge = this.mergeHistory.pop();
		if (!lastMerge) return null;

		// Remove o nó pai da lista de disponíveis
		this.availableNodes = this.availableNodes.filter((n) => n.id !== lastMerge.parent.id);

		// Recoloca os dois filhos na lista de disponíveis
		this.availableNodes.push(lastMerge.leftChild);
		this.availableNodes.push(lastMerge.rightChild);

		this.updatePlayerTreeState();
		return lastMerge;
	}

	/**
	 * Verifica se a árvore do jogador está completa (restou apenas 1 nó raiz contendo todas as folhas).
	 */
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

	/**
	 * Atualiza os códigos e métricas da árvore do jogador.
	 */
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

	/**
	 * Percorre a árvore gerando os códigos de prefixo recursivamente.
	 * Subárvore esquerda = '0', Subárvore direita = '1'.
	 */
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
			// Se o nó for a raiz (caso 1 caractere único), o código é '0'
			const finalCode = currentCode.length === 0 ? '0' : currentCode;
			node.code = finalCode;
			targetMap.set(node.char, finalCode);
			return;
		}

		this.generatePrefixCodes(node.left, currentCode + '0', currentDepth + 1, targetMap);
		this.generatePrefixCodes(node.right, currentCode + '1', currentDepth + 1, targetMap);
	}

	/**
	 * Codifica uma string usando os códigos da árvore do jogador (ou ótima se especificado).
	 */
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

	/**
	 * Decodifica uma sequência de bits com base na raiz da árvore.
	 */
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

	/**
	 * Calcula todas as métricas comparativas: ASCII vs Árvore do Jogador vs Ótimo Guloso.
	 */
	public getMetrics(): HuffmanMetrics {
		const rawAsciiBits = this.message.length * 8;
		const optimalBits = this.optimalTotalBits;
		const playerBits = this.playerTotalBits > 0 ? this.playerTotalBits : rawAsciiBits;

		const efficiency = optimalBits > 0 && playerBits > 0
			? Math.min(100, Math.round((optimalBits / playerBits) * 1000) / 10)
			: 0;

		const compressionRatio = rawAsciiBits > 0
			? Math.round((1 - playerBits / rawAsciiBits) * 1000) / 10
			: 0;

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
	 * Verifica se uma determinada fusão entre dois nós foi uma "Escolha Gulosa Ótima",
	 * ou seja, se ambos os nós estavam entre os de menor peso do conjunto de disponíveis.
	 */
	public isGreedyChoice(idA: string, idB: string): boolean {
		if (this.availableNodes.length <= 2) return true;

		// Copia e ordena por peso ascendente
		const sorted = [...this.availableNodes].sort((a, b) => a.weight - b.weight);
		const minWeight1 = sorted[0].weight;
		const minWeight2 = sorted[1].weight;

		const nodeA = this.availableNodes.find((n) => n.id === idA);
		const nodeB = this.availableNodes.find((n) => n.id === idB);
		if (!nodeA || !nodeB) return false;

		// Uma escolha é gulosa se o peso de ambos corresponder aos dois menores pesos possíveis
		const weights = [nodeA.weight, nodeB.weight].sort((a, b) => a - b);
		return weights[0] === minWeight1 && weights[1] <= minWeight2;
	}
}
