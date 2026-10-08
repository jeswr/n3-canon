// Times toCanonical with the built-in SHA-256 and with Node's, against rdf-canonize, and prints a Markdown table
import { createHash } from 'node:crypto';
import { DataFactory } from 'n3';
import rdfCanonize from 'rdf-canonize';
import { Store } from '../src/index.js';

const { namedNode, blankNode, literal, quad } = DataFactory;
const p = namedNode('urn:p'), q = namedNode('urn:q'), r = namedNode('urn:r');

function nodeHash(string) {
  return createHash('sha256').update(string).digest('hex');
}

// Each item adds four quads with two blank nodes, or four quads without
function* quads(items, blankNodes) {
  for (let i = 0; i < items; i++) {
    const s = namedNode(`urn:s${i % 1000}`);
    if (!blankNodes)
      yield* [quad(s, p, literal(`v${i}`)), quad(s, q, namedNode(`urn:o${i}`)),
        quad(s, r, literal(`${i}`, 'en'), namedNode(`urn:g${i % 3}`)), quad(namedNode(`urn:o${i}`), p, s)];
    else {
      const a = blankNode(`a${i}`), b = blankNode(`b${i}`);
      yield* [quad(s, p, a), quad(a, q, literal(`v${i % 50}`)), quad(a, r, b), quad(b, q, literal(`w${i}`, 'en'))];
    }
  }
}

// Returns the median time of a call in milliseconds
async function time(run, size) {
  const times = [];
  for (let i = 0, runs = Math.max(5, Math.min(100, Math.round(200000 / size))); i < runs + 2; i++) {
    const start = performance.now();
    await run();
    times.push(performance.now() - start);
  }
  return times.slice(2).sort((a, b) => a - b)[times.length - 2 >> 1];
}

console.log('| Dataset | Built-in SHA-256 | Node\'s SHA-256 | rdf-canonize |\n|---|---:|---:|---:|');
for (const [items, blankNodes] of [[25, true], [2500, true], [25000, true], [250, false], [25000, false]]) {
  const store = new Store([...quads(items, blankNodes)]), nquads = store.toCanonical();
  const columns = [
    await time(() => store.toCanonical(), store.size),
    await time(() => store.toCanonical({ hash: nodeHash }), store.size),
    await time(() => rdfCanonize.canonize([...store], { algorithm: 'RDFC-1.0' }), store.size),
  ];
  if (await rdfCanonize.canonize([...store], { algorithm: 'RDFC-1.0' }) !== nquads)
    throw new Error('The output differs from rdf-canonize');
  console.log(`| ${store.size.toLocaleString('en')} quads, ${blankNodes ? (items * 2).toLocaleString('en') : 'no'} blank nodes | ${
    columns.map(ms => `${ms < 10 ? ms.toFixed(2) : Math.round(ms)} ms`).join(' | ')} |`);
}
