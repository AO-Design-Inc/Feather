const {build} = require('esbuild');

build({
	entryPoints: ['./src/contract.ts'],
	platform: 'node',
	outdir: './dist',
	minify: false,
	bundle: true,
	format: 'esm'
}).catch(() => process.exit(1));
