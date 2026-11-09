// Ponto de entrada do `npm run test:system`.
// Executa todos os arquivos `*.system.ts` deste diretório em sequência.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const pasta = __dirname;
const arquivos = readdirSync(pasta).filter((n) => n.endsWith('.system.ts'));

async function run() {
  let falhas = 0;
  for (const arq of arquivos) {
    console.log(`\n=== ${arq} ===`);
    const mod = await import(join(pasta, arq));
    // Cada *.system.ts expõe `main()`; executamos e coletamos exitCode.
    if (typeof mod.main === 'function') {
      await mod.main();
      if (process.exitCode === 1) falhas += 1;
      process.exitCode = 0;
    }
  }

  if (falhas > 0) {
    console.log(`\n${falhas} teste(s) de sistema falharam.`);
    process.exit(1);
  }
  console.log('\nTodos os testes de sistema passaram.');
}

run().catch((e) => {
  console.error('Erro no runner de system:', e);
  process.exit(1);
});