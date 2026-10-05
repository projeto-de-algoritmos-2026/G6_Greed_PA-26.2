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

