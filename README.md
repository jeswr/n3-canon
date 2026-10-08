# n3-canon

[RDF Dataset Canonicalization (RDFC-1.0)](https://www.w3.org/TR/rdf-canon/) for [N3.js](https://github.com/rdfjs/N3.js):
the `toCanonical()` method of the [RDF/JS Dataset](https://rdf.js.org/dataset-spec/) interface,
which N3.js's `Store` does not implement.

It returns the dataset as canonical N-Quads, with blank nodes labeled by RDFC-1.0,
so isomorphic datasets give identical strings.
It is synchronous, has no runtime dependencies besides N3.js, and adds about 5.8 KB minified (2.8 KB gzipped).

This code was proposed for N3.js in [rdfjs/N3.js#856](https://github.com/rdfjs/N3.js/pull/856).
If you use it, or would like `toCanonical()` in N3.js itself,
please say so in [an issue on N3.js](https://github.com/rdfjs/N3.js/issues),
and it can be considered for the core library.

## Install

```sh
npm install n3 n3-canon
```

It works with n3 2.x and 3.x on Node.js 22 and later, and ships TypeScript declarations.

## Usage

```js
import { Parser } from 'n3';
import { Store, toCanonical } from 'n3-canon';

const quads = new Parser().parse('_:b <urn:p> "o" .');

// A Store that extends N3.js's Store with toCanonical()
const store = new Store(quads);
console.log(store.toCanonical());
// _:c14n0 <urn:p> "o" .

// Or canonicalize an N3.js Store, any RDF/JS dataset, or an iterable of quads
console.log(toCanonical(quads));
```

An N3.js `Store` is read directly through its indexes; anything else is first copied into one.

### Options

- `maxWorkFactor` (default `1`): as in [rdf-canonize](https://github.com/digitalbazaar/rdf-canonize),
  Hash N-Degree Quads runs at most n^`maxWorkFactor` times for n blank nodes without a unique first-degree hash,
  so poison graphs throw instead of running indefinitely. The default also rejects some small symmetric graphs,
  such as cycles of blank nodes; `maxWorkFactor: 3` accepts every W3C test.
- `hash`: replaces the built-in SHA-256, which is written in JavaScript because Web Crypto's digest is async only.
  It must synchronously and deterministically hash the UTF-8 encoding of the string,
  and return the full, fixed-length digest in lowercase hex. In Node.js, its own SHA-256 is faster:

  ```js
  import { createHash } from 'node:crypto';
  store.toCanonical({ hash: string => createHash('sha256').update(string).digest('hex') });
  ```

- `hashAlgorithm` (default `'SHA-256'`): another algorithm, such as `'SHA-384'`, needs a `hash` function for it.

It throws on triple terms, directional language-tagged literals, blank-node predicates and variables, which RDFC-1.0 does not define,
and on invalid IRIs and malformed Unicode, which canonical N-Quads cannot write.

## Performance

Median time per call in Node.js 22, from `npm run bench`:

| Dataset | Built-in SHA-256 | Node's SHA-256 | rdf-canonize |
|---|---:|---:|---:|
| 100 quads, 50 blank nodes | 0.63 ms | 0.39 ms | 0.51 ms |
| 10,000 quads, 5,000 blank nodes | 94 ms | 52 ms | 70 ms |
| 100,000 quads, 50,000 blank nodes | 1020 ms | 853 ms | 904 ms |
| 1,000 quads, no blank nodes | 3.01 ms | 2.74 ms | 2.52 ms |
| 100,000 quads, no blank nodes | 140 ms | 145 ms | 154 ms |

## Development

Use Node.js 22.8 or later, which the coverage thresholds of `npm test` need:

```sh
npm ci
npm test       # unit tests, and the output of 1,000 random datasets against rdf-canonize
npm run spec   # the W3C rdf-canon test suite
npm run lint
npm run bench
```

The tests run against n3 2.0.0, the current 2.x and 3.x alpha in CI,
since the code reads N3.js `Store` internals.
Releases are published from `main` by semantic-release through npm trusted publishing.

## License

MIT. The implementation comes from N3.js and retains the N3.js contributors' copyright;
see [LICENSE.md](./LICENSE.md).
