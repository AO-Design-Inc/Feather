/**
 * We require validation!
 * implemented using a verification type architecture similar to BOINC or
 * Folding\@Home, where n verifiers check the code and if their answer does
 * not match the expected answer but matches each other, doesn't pay!
 */
declare const ContractError: any;
declare const ContractAssert: <T extends boolean>(
	cond: T,
	message: string
) => T extends true ? string : never;
import {
	ArweaveAddress,
	ValidationLockInput,
	ValidationReleaseInput
} from './faces';
import {isOfDiscriminatedType} from './utils';
export type ValidationStages =
	| ValidationAnnounce
	| ValidationLock
	| ValidationRelease;

export type ValidationLinkedList<
	T extends [ValidationStages, ValidationStages] = [
		ValidationStages,
		ValidationStages
	]
> =
	| {value: T; next: ValidationLinkedList}
	| {value: T; next: undefined};

export interface ValidationAnnounce {
	_discriminator: 'announce';
	validator: ArweaveAddress;
}

export interface ValidationLock
	extends Omit<ValidationAnnounce, '_discriminator'> {
	_discriminator: 'lock';
	// Deprecated encrypted_hash in favour of encrypted_obj;
	encrypted_obj: string;
}

export interface ValidationRelease
	extends Omit<ValidationLock, '_discriminator'> {
	_discriminator: 'release';
	symm_key: string;
}

export abstract class ValidationState<T extends ValidationStages> {
	public readonly value: T;

	constructor(value: T) {
		this.value = value;
	}

	next(
		f: ValidationApplier<T>
	): ValidationState<ValidationStateMapsTo<T>> {
		return f(this.value);
	}
}

/** One wonders whether this is excessive if it's internal... */
export class ValidationAnnounceState extends ValidationState<ValidationAnnounce> {
	constructor(value: ValidationStages) {
		if (
			!isOfDiscriminatedType<ValidationAnnounce>(value, 'announce')
		) {
			throw new ContractError('validation not in announce state!');
		}

		super(value);
	}
}

export class ValidationLockState extends ValidationState<ValidationLock> {
	constructor(value: ValidationStages) {
		if (!isOfDiscriminatedType<ValidationLock>(value, 'lock')) {
			throw new ContractError('validation not in locked state!');
		}

		super(value);
	}
}

export class ValidationReleaseState extends ValidationState<ValidationRelease> {
	constructor(value: ValidationStages) {
		if (!isOfDiscriminatedType<ValidationRelease>(value, 'release')) {
			throw new ContractError('validation not in released state!');
		}

		super(value);
	}
}
type ValidationStateMapsTo<
	T extends ValidationStages
> = T extends ValidationAnnounce
	? ValidationLock
	: T extends ValidationLock
	? ValidationRelease
	: never;

export function isValidationLinkedListType<
	T extends ValidationStages
>(
	target: ValidationLinkedList,
	discriminator: T['_discriminator']
): target is ValidationLinkedList<[T, T]> {
	return target.value.every(
		(value) => value._discriminator === discriminator
	);
}

type ValidationApplier<T1 extends ValidationStages> = (
	_: T1
) => ValidationState<ValidationStateMapsTo<T1>>;

export function validationAnnouncedToLocked(
	lock_input: ValidationLockInput
): ValidationApplier<ValidationAnnounce> {
	return (i: ValidationAnnounce): ValidationState<ValidationLock> => {
		return new ValidationLockState({
			...i,
			_discriminator: 'lock',
			encrypted_obj: lock_input.encrypted_obj
		});
	};
}

export function validationLockedToReleased(
	release_input: ValidationReleaseInput
): ValidationApplier<ValidationLock> {
	const symm_key = release_input.symm_key;
	return (i: ValidationLock): ValidationState<ValidationRelease> => {
		return new ValidationReleaseState({
			...i,
			_discriminator: 'release',
			symm_key
		});
	};
}
