import { Store as N3Store } from 'n3';
import canonicalize from './canonicalize.js';

// Returns the dataset as canonical N-Quads, with blank nodes labeled by RDFC-1.0.
// An N3.js Store is read through its indexes; any other dataset or iterable of quads is copied into one first.
export function toCanonical(dataset, { hashAlgorithm, hash, maxWorkFactor } = {}) {
  return canonicalize(dataset instanceof N3Store ? dataset : new N3Store(dataset), { hashAlgorithm, hash, maxWorkFactor });
}

// An N3.js Store whose toCanonical() method is implemented
export class Store extends N3Store {
  toCanonical(options) {
    return toCanonical(this, options);
  }
}
