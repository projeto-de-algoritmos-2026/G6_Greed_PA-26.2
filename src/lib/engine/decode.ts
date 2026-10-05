import { HuffmanEngine } from './huffman';
import type { HuffmanNode } from './types';

export interface DecodeChallenge {
	message: string;
	root: HuffmanNode;
	codes: Map<string, string>;
	bits: string;
	isMimic: boolean;
	treeBits: number;
	optimalBits: number;
}

function collectCodes(node: HuffmanNode, prefix: string, codes: Map<string, string>): void {
	if (node.isLeaf && node.char !== null) {
		codes.set(node.char, prefix || '0');
		return;
	}
	if (node.left) collectCodes(node.left, prefix + '0', codes);
	if (node.right) collectCodes(node.right, prefix + '1', codes);
}

/**
 * A criatura "imita" a superfície com uma árvore quase ótima: parte da árvore
 * de Huffman e troca de lugar uma folha frequente e rasa com uma folha rara e
 * profunda. A forma continua plausível, mas a escolha gulosa é violada (as
 * folhas irmãs mais profundas deixam de ser as de menor peso) e o custo sobe.
 */
function buildMimicTree(optimal: HuffmanNode): HuffmanNode {
	const root = relabel(optimal, 'mim');
	const leaves: Array<{ node: HuffmanNode; depth: number }> = [];
	const collect = (node: HuffmanNode, depth: number) => {
		if (node.isLeaf) leaves.push({ node, depth });
		if (node.left) collect(node.left, depth + 1);
		if (node.right) collect(node.right, depth + 1);
	};
	collect(root, 0);

	let best: [HuffmanNode, HuffmanNode] | null = null;
	let bestGain = 0;
	for (const a of leaves) {
		for (const b of leaves) {
			const gain = (a.node.weight - b.node.weight) * (b.depth - a.depth);
			if (gain > bestGain) {
				bestGain = gain;
				best = [a.node, b.node];
			}
		}
	}

	if (best) {
		const [a, b] = best;
		[a.char, b.char] = [b.char, a.char];
		[a.weight, b.weight] = [b.weight, a.weight];
		const reweigh = (node: HuffmanNode): number => {
			if (node.isLeaf || !node.left || !node.right) return node.weight;
			node.weight = reweigh(node.left) + reweigh(node.right);
			return node.weight;
		};
		reweigh(root);
	}
	return root;
}

function relabel(node: HuffmanNode, prefix: string): HuffmanNode {
	return {
		...node,
		id: `dec_${prefix}_${node.id}`,
		left: node.left ? relabel(node.left, prefix) : null,
		right: node.right ? relabel(node.right, prefix) : null
	};
}

export function createDecodeChallenge(message: string, isMimic: boolean): DecodeChallenge {
	const engine = new HuffmanEngine(message);
	const root = isMimic ? buildMimicTree(engine.optimalRoot!) : relabel(engine.optimalRoot!, 'opt');
	const codes = new Map<string, string>();
	collectCodes(root, '', codes);

	let bits = '';
	let treeBits = 0;
	for (const ch of message) {
		const code = codes.get(ch)!;
		bits += code;
		treeBits += code.length;
	}

	return {
		message,
		root,
		codes,
		bits,
		isMimic,
		treeBits,
		optimalBits: engine.optimalTotalBits
	};
}

export function pickRandom<T>(items: readonly T[], avoid?: T): T {
	const pool = items.length > 1 && avoid !== undefined ? items.filter((i) => i !== avoid) : items;
	return pool[Math.floor(Math.random() * pool.length)];
}
