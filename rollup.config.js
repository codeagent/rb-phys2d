import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import { string } from 'rollup-plugin-string';

import pkg from './package.json';

const onwarn = (warning, warn) => {
  // skip circular dependency warnings
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    return;
  }

  warn(warning);
};

export default process.env.BUILD !== 'development'
  ? {
      input: 'dist/esm/index.js',
      context: 'self',
      onwarn,
      output: [
        {
          file: `dist/bundle/${pkg.name}.js`,
          format: 'iife',
          name: 'JSP2D',
          sourcemap: true,
        },
        {
          file: `dist/bundle/${pkg.name}.min.js`,
          format: 'iife',
          name: 'JSP2D',
          sourcemap: true,
          plugins: [terser()],
        },
      ],
      plugins: [resolve(), commonjs()],
    }
  : {
      input: 'examples/index.ts',
      context: 'self',
      onwarn,
      output: {
        file: 'examples/public/bundle.js',
        format: 'iife',
        sourcemap: 'inline',
      },
      plugins: [
        string({
          include: '**/*.obj',
        }),
        resolve(),
        commonjs(),
        typescript({
          tsconfig: __dirname + '/tsconfig.dev.json',
        }),
        serve({
          verbose: false,
          open: true,
          contentBase: ['examples/public'],
        }),
        livereload(),
      ],
    };