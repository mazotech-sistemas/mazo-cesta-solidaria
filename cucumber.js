// Config do Cucumber (BDD).
//
// Uso:
//   - local:     npm run test:bdd            (aponta para http://localhost:3000, exige dev server)
//   - produção:  npm run test:bdd:prod       (aponta para a URL da Vercel, sem dev server)
//
// A resolução de TypeScript usa `tests/bdd/tsconfig.json` (CommonJS + node,
// não o tsconfig raiz, que usa module esnext / bundler, incompatível com
// ts-node em runtime). O caminho é definido aqui para não depender de quem
// roda já ter setado `TS_NODE_PROJECT`.

const path = require('path');

process.env.TS_NODE_PROJECT =
  process.env.TS_NODE_PROJECT || path.join(__dirname, 'tests/bdd/tsconfig.json');

module.exports = {
  default: {
    format: ['progress'],
    paths: ['tests/bdd/features'],
    require: ['tests/bdd/support/hooks.ts', 'tests/bdd/step-definitions/*.ts'],
    requireModule: ['ts-node/register'],
  },
};
