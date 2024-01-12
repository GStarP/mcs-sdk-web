import ts from '@rollup/plugin-typescript'

export default [
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.js',
      format: 'esm',
    },
    plugins: [ts()],
    external: ['socket.io-client'],
  },
]
