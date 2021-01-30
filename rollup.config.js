import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
//import nodePolyfills from 'rollup-plugin-node-polyfills'
// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
//const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'built/contract.js',
	output: {
		file: 'dist/contract.js',
		format: 'cjs'
	},
	plugins: [
		resolve({ preferBuiltins: false }),
		commonjs(),
		//nodePolyfills()
	]
};
