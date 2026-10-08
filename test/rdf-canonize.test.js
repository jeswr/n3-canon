import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Parser } from 'n3';
import rdfCanonize from 'rdf-canonize';
import { toCanonical } from '../src/index.js';

// Random datasets with named graphs, literals, escapes and shared blank nodes give the same output,
// or fail alike, as with rdf-canonize
it('should match rdf-canonize', async () => {
  let seed = 7;
  const random = n => (seed = seed * 16807 % 2147483647) % n;
  const literals = ['"l0"', '"x"@en', '"é😀\\n\\t\\u0001\\u007F\\""', '"1"^^<http://www.w3.org/2001/XMLSchema#integer>'];
  for (let i = 0; i < 1000; i++) {
    const blankNodes = 2 + random(6), lines = new Set();
    for (let n = blankNodes + random(6); n > 0; n--) {
      const object = random(2) ? `_:n${random(blankNodes)}` : random(2) ? `<urn:i${random(3)}>` : literals[random(4)];
      lines.add(`${random(4) ? `_:n${random(blankNodes)}` : '<urn:s>'} <urn:${'pq'[random(2)]}> ${object}${
        ['', ' <urn:g>', ` _:n${random(blankNodes)}`][random(3)]} .\n`);
    }
    const nquads = [...lines].join(''), options = { maxWorkFactor: i % 2 ? 1 : 3 };
    let expected, actual;
    try {
      expected = await rdfCanonize.canonize(nquads, { algorithm: 'RDFC-1.0', inputFormat: 'application/n-quads', ...options });
    }
    catch (error) {
      expected = 'error';
    }
    try {
      actual = toCanonical(new Parser({ format: 'N-Quads' }).parse(nquads), options);
    }
    catch (error) {
      actual = 'error';
    }
    assert.equal(actual, expected, nquads);
  }
});
