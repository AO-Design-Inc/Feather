// Report bug with eslint & xo with defaults in generic
import {ValidationStages, ValidationAnnounce} from './validate';
declare const SmartWeave: any;

export async function decipher(l: [string, string]): Promise<string> {
	return SmartWeave.arweave.crypto.decrypt(Buffer.from(l[1],'hex'), l[0]).then(
		(_:Uint8Array) => _.toString()
	);
}

export type Tuple<
	T,
	N extends number,
	A extends any[] = []
> = A extends {length: N} ? A : Tuple<T, N, [...A, T]>;

export type LinkedList<T> =
	| {value: T; next: LinkedList<T>}
	| {value: T; next: undefined};

export function lastElement<T extends {next: T | undefined}>(
	list: T
): T {
	return list.next ? lastElement(list.next) : list;
}

export function lastElementArray<T>(array: T[]): T {
	return array[array.length - 1];
}

export function lastElementArrayIndex<T>(array: T[]): number {
	return array.length - 1;
}

export function getElements<T extends {next: T | undefined}>(
	list: T
): T[] {
	const retarr: T[] = [];
	do {
		const value = list;
		retarr.push(value);
	} while (list.next);

	return retarr;
}

export function createLinkedList<T>(
	t: T[]
): LinkedList<T> | undefined {
	return t.length > 0
		? {
				value: t.shift() as T,
				next: createLinkedList<T>(t)
		  }
		: undefined;
}

export type ValidationLinkedList<
	T extends [ValidationStages, ValidationStages] = [
		ValidationStages,
		ValidationStages
	]
> =
	| {value: T; next: ValidationLinkedList}
	| {value: T; next: undefined};

export function isArrayOfDiscriminatedTypes<
	T extends {_discriminator: any}
>(
	target: any[],
	discriminator: T extends {_discriminator: infer U} ? U : never
): target is T[] {
	return target?.every((_) => _._discriminator === discriminator);
}

export function isOfDiscriminatedType<
	T extends {_discriminator: any}
>(
	target: any,
	discriminator: T extends {_discriminator: infer U} ? U : never
): target is T {
	return target._discriminator === discriminator;
}

export function setDifference<T>(setA: Set<T>, setB: Set<T>) {
	const _difference = new Set(setA);
	for (const element of setB) {
		_difference.delete(element);
	}

	return _difference;
}

export function getWeightedProbabilityElement(seed: number) {
	const mul32instance = mulberry32(seed);
	return function <T>(value: Array<[T, number]>): T {
		const total_weight = value.reduce((acc, cur) => acc + cur[1], 0);

		const pdf = value.map((_) => _[1] / total_weight);

		const rand_no_from_0_to_1 = mul32instance();

		for (
			let i = 0, _sum = pdf[0];
			i < pdf.length;
			i++, _sum += pdf[i]
		) {
			if (rand_no_from_0_to_1 < _sum) {
				return value[i][0];
			}
		}

		throw new Error('Impossible state, probability function borked');
	};
}

// Some prng i found on the internet
// Mulberry32, a fast high quality PRNG:
// https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
// https://gist.github.com/blixt/f17b47c62508be59987b
// Thanks to @blixt on github
// I wonder if I need to do this though, can I just modulus the hash?
function mulberry32(a: number) {
	return function () {
		a = Math.trunc(a);
		a = Math.trunc(a + 0x6d2b79f5);
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
