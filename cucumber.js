module.exports = {
  default: {
    format: ['progress'],
    paths: ['tests/bdd/features'],
    require: ['tests/bdd/support/hooks.ts', 'tests/bdd/step-definitions/*.ts'],
    requireModule: ['ts-node/register'],
  },
};