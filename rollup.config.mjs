import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { raw } from './build/raw.mjs'

export default defineConfig({
  external: ['vscode', 'typescript', /^node:.*/],
  input: ['./src/index.ts'],
  output: { format: 'cjs', dir: 'dist' },
  plugins: [esbuild(), raw(), resolve(), commonjs()],
})
