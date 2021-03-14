// Report bug with eslint & xo with defaults in generic
import {ValidationStages, ValidationAnnounce} from './validate';

export type Tuple<
	T,
	N extends number,
	A extends any[] = []
> = A extends {length: N} ? A : Tuple<T, N, [...A, T]>;

type Tree<T> = {
	value: T;
	left?: Tree<T>;
	right?: Tree<T>;
};

function traverseTree(tree: Tree<any>, callback: Function): void {
	const l = tree.left ? traverseTree(tree.left, callback) : null;
	const r = tree.right ? traverseTree(tree.right, callback) : null;
	callback(tree.value);
}

export type LinkedList<T> =
	| {value: T; next: LinkedList<T>}
	| {value: T; next: undefined};

export function lastElement<T extends {next: T | undefined}>(
	list: T
): T {
	return list.next ? lastElement(list.next) : list;
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

export function isArrayOfDiscriminatedTypes<T extends {_discriminator: any}>(
	target: any[],
	discriminator: T extends {_discriminator: infer U} ? U : never
): target is T[] {
	return target.every((_) => _._discriminator === discriminator);
}

export function isOfDiscriminatedType<T extends {_discriminator: any}>(
	target: any,
	discriminator: T extends {_discriminator: infer U} ? U : never
): target is T {
	return target._discriminator === discriminator;
}
