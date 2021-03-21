const {build} = require('esbuild');

build({
	entryPoints: ['./src/contract.ts'],
	outdir: './dist',
	format: 'esm',
	minify: false,
	bundle: true,
	platform: 'node',
	target: 'es2019'
}).catch(() => process.exit(1));
