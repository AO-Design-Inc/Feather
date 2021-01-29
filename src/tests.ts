import {ExecutableState, ProposedExecutable} from './executable';
import {ExecutableKinds} from './interfaces';

const a = new ExecutableState<ProposedExecutable>({
	executable: {
		executable_address: 'asfsd',
		executable_kind: ExecutableKinds.webgpu,
		birth_height: 2000
	},
	caller: 'asdfs',
	bids: [{quantity: 234, bidder: 'sdfs'}]
});
