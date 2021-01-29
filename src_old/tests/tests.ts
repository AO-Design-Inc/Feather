import {handle} from '../contract3';
import {GetFunctions} from '../interfaces';
import init_state from './init_state.json';

console.log(handle(init_state, {
	input: {
		function: GetFunctions.unexecuted
	},
	caller: 'asldfjslkvn'
}));
