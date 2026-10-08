import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DataFactory, Parser, Store as N3Store } from 'n3';
import { Store, toCanonical } from '../src/index.js';


// Runs the assertions of the tests that N3.js had for toCanonical
function expect(actual) {
  return {
    toEqual: expected => assert.deepEqual(actual, expected),
    toMatch: pattern => assert.match(actual, pattern),
    toHaveLength: length => assert.equal(actual.length, length),
    toThrow: message => assert.throws(actual, error => error.message.includes(message)),
    not: { toEqual: expected => assert.notDeepEqual(actual, expected) },
  };
}

const { namedNode, blankNode, literal, variable, quad } = DataFactory;

describe('toCanonical', () => {
  const store1 = new Store([quad(namedNode('s1'), namedNode('p1'), namedNode('o1')),
    quad(namedNode('s1'), namedNode('p1'), namedNode('o2'))]);

  function canonical(nquads, options) {
    return new Store(new Parser({ format: 'N-Quads' }).parse(nquads)).toCanonical(options);
  }

  it('should convert to a canonical string', () => {
    expect(store1.toCanonical()).toEqual('<s1> <p1> <o1> .\n<s1> <p1> <o2> .\n');
    expect(new Store().toCanonical()).toEqual('');
  });

  it('should label isomorphic datasets identically', () => {
    const expected = '<urn:s> <urn:p> _:c14n0 .\n_:c14n0 <urn:p> _:c14n2 _:c14n1 .\n_:c14n2 <urn:q> "a"@en .\n';
    expect(canonical('<urn:s> <urn:p> _:x .\n_:x <urn:p> _:y _:g .\n_:y <urn:q> "a"@en .\n')).toEqual(expected);
    expect(canonical('_:b <urn:q> "a"@en .\n_:a <urn:p> _:b _:c .\n<urn:s> <urn:p> _:a .\n')).toEqual(expected);
  });

  it('should label blank node graph names', () => {
    expect(canonical('<urn:s> <urn:p> <urn:o> _:g .\n<urn:s> <urn:p> _:x _:g .\n<urn:s> <urn:p> <urn:o> <urn:g> .\n'))
      .toEqual('<urn:s> <urn:p> <urn:o> <urn:g> .\n<urn:s> <urn:p> <urn:o> _:c14n1 .\n<urn:s> <urn:p> _:c14n0 _:c14n1 .\n');
  });

  it('should distinguish blank nodes with identical first-degree hashes', () => {
    // A cycle of four blank nodes with alternating predicates (W3C rdf-canon test021)
    const cycle = '_:a <urn:p> _:b .\n_:b <urn:q> _:c .\n_:c <urn:p> _:d .\n_:d <urn:q> _:a .\n';
    const expected = '_:c14n0 <urn:q> _:c14n3 .\n_:c14n1 <urn:p> _:c14n0 .\n_:c14n2 <urn:q> _:c14n1 .\n_:c14n3 <urn:p> _:c14n2 .\n';
    expect(canonical(cycle, { maxWorkFactor: 3 })).toEqual(expected);
    expect(canonical(cycle.split('\n').reverse().join('\n'), { maxWorkFactor: 3 })).toEqual(expected);
    // As in rdf-canonize, the default work limit does not cover the cycle
    expect(() => canonical(cycle)).toThrow('Canonicalization exceeded its maximum amount of work');
  });

  it('should label isomorphic datasets that need permutations identically', () => {
    function relabel(nquads) {
      return nquads.split('\n').reverse().join('\n').replace(/_:n(\d)/g, '_:m$1');
    }
    for (const nquads of [
      '_:n0 <urn:q> _:n1 .\n_:n0 <urn:q> _:n2 .\n',
      '_:n0 <urn:p> <urn:o> _:n1 .\n_:n1 <urn:p> <urn:o> _:n0 .\n',
      '_:n2 <urn:p> _:n1 .\n_:n3 <urn:p> _:n1 .\n_:n0 <urn:p> _:n2 .\n_:n1 <urn:p> _:n0 .\n_:n2 <urn:p> _:n3 .\n' +
        '_:n0 <urn:p> _:n3 .\n',
      '_:n5 <urn:q> _:n4 .\n_:n3 <urn:q> _:n0 .\n_:n2 <urn:q> _:n3 .\n_:n5 <urn:p> _:n1 .\n_:n5 <urn:q> _:n3 .\n' +
        '_:n4 <urn:q> _:n2 .\n_:n0 <urn:q> _:n2 .\n_:n1 <urn:q> _:n1 .\n',
    ])
      expect(canonical(relabel(nquads), { maxWorkFactor: 3 })).toEqual(canonical(nquads, { maxWorkFactor: 3 }));
  });

  it('should try each distinct permutation of repeated related blank nodes once', () => {
    let nquads = '';
    for (let i = 0; i < 20; i++)
      nquads += `_:a <urn:p> _:x <urn:g${i}> .\n_:b <urn:p> _:x <urn:g${i}> .\n`;
    expect(canonical(nquads)).toMatch(/^_:c14n\d <urn:p> _:c14n\d <urn:g0> \.\n/);
  });

  it('should accept work linear in the blank nodes with the default limit', () => {
    let nquads = '';
    for (let i = 0; i < 32; i++)
      nquads += `_:a <urn:p> _:x${i} .\n_:b <urn:p> _:x${i} .\n_:x${i} <urn:q> "${i}" .\n`;
    expect(canonical(nquads).split('\n')).toHaveLength(97);
  });

  it('should sort by code point', () => {
    expect(canonical('<urn:s> <urn:p> "\uE000" .\n<urn:s> <urn:p> "\u{10000}" .\n<urn:s> <urn:p> "" .\n'))
      .toEqual('<urn:s> <urn:p> "" .\n<urn:s> <urn:p> "\uE000" .\n<urn:s> <urn:p> "\u{10000}" .\n');
  });

  it('should sort equal lines by code point', () => {
    expect(canonical('_:a <urn:p> _:b .\n_:a <urn:p> _:c .\n_:a <urn:q> "\u{1F600}" .\n'))
      .toEqual('_:c14n0 <urn:p> _:c14n1 .\n_:c14n0 <urn:p> _:c14n2 .\n_:c14n0 <urn:q> "\u{1F600}" .\n');
  });

  it('should write literals in canonical N-Quads', () => {
    expect(toCanonical([quad(namedNode('urn:s'), namedNode('urn:p'), literal('a\b\f\r\\\u0001\u007F￿', 'en'))]))
      .toEqual('<urn:s> <urn:p> "a\\b\\f\\r\\\\\\u0001\\u007F\\uFFFF"@en .\n');
  });

  it('should reject invalid IRIs and malformed Unicode', () => {
    const s = namedNode('urn:s'), p = namedNode('urn:p');
    for (const value of ['urn:a b', 'urn:a\u0001', 'urn:a"', 'urn:a\\', 'urn:\uD800', ...'<>{}|^`'].map(c => c.length > 1 ? c : `urn:${c}`))
      expect(() => toCanonical([quad(s, p, namedNode(value))])).toThrow('Cannot canonicalize the invalid IRI');
    for (const value of ['urn:bad type', 'urn:\uD800'])
      expect(() => toCanonical([quad(s, p, literal('x', namedNode(value)))])).toThrow('Cannot canonicalize the invalid IRI');
    for (const value of ['\uDC00', '\u{1F600}\uD800'])
      expect(() => toCanonical([quad(s, p, literal(value))])).toThrow('with malformed Unicode');
  });

  it('should reject directional language-tagged literals', () => {
    expect(() => toCanonical([quad(namedNode('urn:s'), namedNode('urn:p'), literal('a', { language: 'ar', direction: 'rtl' }))]))
      .toThrow('RDFC-1.0 does not define the canonicalization of directional language-tagged literals');
    expect(toCanonical([quad(namedNode('urn:s'), namedNode('urn:p'), literal('v', namedNode('urn:datatype--ltr')))]))
      .toEqual('<urn:s> <urn:p> "v"^^<urn:datatype--ltr> .\n');
    expect(toCanonical([quad(namedNode('urn:s'), namedNode('urn:p'), literal('a--ltr', 'en'))]))
      .toEqual('<urn:s> <urn:p> "a--ltr"@en .\n');
  });

  it('should leave a lazy view following its store', () => {
    const store = new N3Store([quad(namedNode('urn:s'), namedNode('urn:p'), namedNode('urn:o1'))]);
    const view = store.match();
    toCanonical(view);
    store.add(quad(namedNode('urn:s'), namedNode('urn:p'), namedNode('urn:o2')));
    expect([...view]).toHaveLength(2);
  });

  it('should reject variables', () => {
    expect(() => toCanonical([quad(variable('x'), namedNode('urn:p'), namedNode('urn:o'))]))
      .toThrow('RDFC-1.0 does not define the canonicalization of variables');
  });

  it('should reject triple terms', () => {
    expect(() => canonical('<urn:s> <urn:p> <<( _:a <urn:q> _:b )>> .\n'))
      .toThrow('RDFC-1.0 does not define the canonicalization of triple terms');
  });

  it('should reject blank node predicates', () => {
    const store = new Store([quad(namedNode('urn:s'), blankNode('p'), namedNode('urn:o'))]);
    expect(() => store.toCanonical())
      .toThrow('RDFC-1.0 does not define the canonicalization of blank node predicates');
  });

  it('should reject hash algorithms other than SHA-256', () => {
    expect(store1.toCanonical({ hashAlgorithm: 'SHA-256' })).toEqual(store1.toCanonical());
    expect(() => store1.toCanonical({ hashAlgorithm: 'SHA-384' }))
      .toThrow('Unsupported canonicalization hash algorithm: SHA-384');
    expect(() => store1.toCanonical({ hash: 'sha256' }))
      .toThrow('Unsupported canonicalization hash algorithm: SHA-256; a hash function can provide it');
  });

  it('should use a given hash function', () => {
    const nquads = '<urn:s> <urn:p> _:x .\n_:x <urn:p> _:y _:g .\n_:y <urn:q> "a"@en .\n';
    function hashWith(algorithm) {
      return string => createHash(algorithm).update(string).digest('hex');
    }
    expect(canonical(nquads, { hash: hashWith('sha256') })).toEqual(canonical(nquads));
    // W3C rdf-canon test075, whose labels differ with SHA-256
    const v = 'http://example.org/vocab#';
    const test075 = `<${v}test> <${v}A> _:e0 .\n<${v}test> <${v}B> _:e1 .\n_:e0 <${v}next> _:e2 .\n_:e1 <${v}next> _:e2 .\n`;
    expect(canonical(test075, { hashAlgorithm: 'SHA-384', hash: hashWith('sha384') })).toEqual(
      `<${v}test> <${v}A> _:c14n0 .\n<${v}test> <${v}B> _:c14n2 .\n_:c14n0 <${v}next> _:c14n1 .\n_:c14n2 <${v}next> _:c14n1 .\n`);
    expect(canonical(test075)).not.toEqual(canonical(test075, { hashAlgorithm: 'SHA-384', hash: hashWith('sha384') }));
  });

  it('should fail on poison graphs', () => {
    // A clique of blank nodes needs work factorial in its size
    let clique = '';
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        clique += i === j ? '' : `_:n${i} <urn:p> _:n${j} .\n`;
    expect(() => canonical(clique)).toThrow('Canonicalization exceeded its maximum amount of work');
    expect(() => canonical(clique, { maxWorkFactor: 3 })).toThrow('Canonicalization exceeded its maximum amount of work');
  });

  it('should fail on many permutations of related blank nodes that already have identifiers', () => {
    // Once the urn:p quads give _:x and _:y identifiers, the urn:q quads relate them 20 times each
    let nquads = '';
    for (const subject of ['a', 'b']) {
      for (const object of ['x', 'y']) {
        nquads += `_:${subject} <urn:p> _:${object} .\n`;
        for (let i = 0; i < 20; i++)
          nquads += `_:${subject} <urn:q> _:${object} <urn:g${i}> .\n`;
      }
    }
    expect(() => canonical(nquads, { maxWorkFactor: 3 }))
      .toThrow('Canonicalization exceeded its maximum amount of work; a higher maxWorkFactor allows more');
  });

  it('should fail on chains of blank nodes too long for the call stack', () => {
    let chain = '';
    for (let i = 0; i < 20000; i++)
      chain += `_:b${i} <urn:p> _:b${i + 1} .\n`;
    expect(() => canonical(chain, { maxWorkFactor: 3 })).toThrow('Canonicalization exceeded its maximum amount of work');
  });

  it('should canonicalize a view, an N3.js Store and iterables of quads', () => {
    const view = store1.match(null, null, namedNode('o2'));
    expect(toCanonical(view)).toEqual('<s1> <p1> <o2> .\n');
    expect(toCanonical(new N3Store([...view]))).toEqual('<s1> <p1> <o2> .\n');
    expect(toCanonical([...view])).toEqual('<s1> <p1> <o2> .\n');
    expect(toCanonical(new Set(view))).toEqual('<s1> <p1> <o2> .\n');
    expect(toCanonical((function* () { yield* view; })())).toEqual('<s1> <p1> <o2> .\n');
    expect(() => toCanonical(view, { hashAlgorithm: 'MD5' })).toThrow('Unsupported canonicalization hash algorithm: MD5');
  });
});
