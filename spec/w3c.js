// Runs the W3C RDF Dataset Canonicalization test suite: https://w3c.github.io/rdf-canon/tests/
// Pass a local checkout of the tests folder as the first argument to run without the network.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Parser } from 'n3';
import { toCanonical } from '../src/index.js';

const source = process.argv[2] || 'https://w3c.github.io/rdf-canon/tests/';

async function load(path) {
  if (!/^https?:/.test(source))
    return readFile(new URL(path, `file://${source.replace(/\/?$/, '/')}`), 'utf8');
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(new URL(path, source));
      if (!response.ok)
        throw new Error(`${response.status} for ${path}`);
      return await response.text();
    }
    catch (error) {
      if (attempt === 3)
        throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

let failed = 0;
const tests = JSON.parse(await load('manifest.jsonld')).entries.filter(test => test.type !== 'rdfc:RDFC10MapTest');
for (const { name, type, hashAlgorithm, action, result } of tests) {
  // Other hash algorithms than the built-in SHA-256 come from Node's crypto module
  const hash = hashAlgorithm && (string => createHash(hashAlgorithm).update(string).digest('hex'));
  let actual;
  try {
    actual = toCanonical(new Parser({ format: 'N-Quads' }).parse(await load(action)), { hashAlgorithm, hash, maxWorkFactor: 3 });
  }
  catch (error) {
    actual = error;
  }
  if (type === 'rdfc:RDFC10NegativeEvalTest' ? !(actual instanceof Error) : actual !== await load(result)) {
    failed++;
    console.log(`✖ ${action} ${name}${actual instanceof Error ? `: ${actual.message}` : ''}`);
  }
}
console.log(`${failed ? '✖' : '✔'} ${tests.length - failed} / ${tests.length} tests succeeded`);
process.exitCode = failed ? 1 : 0;
