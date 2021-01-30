const { build } = require('esbuild');
const glob = require('glob');
const fs = require('fs');

build({
	entryPoints: ['./src/contract.ts'],
	platform: 'node',
	outdir: './dist',
	minify: false,
	bundle: true,
	format: 'esm'
}).catch(() => process.exit(1));
