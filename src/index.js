import { Store as N3Store } from 'n3';
import canonicalize from './canonicalize.js';

// Returns the dataset as canonical N-Quads, with blank nodes labeled by RDFC-1.0.
// An N3.js Store is read through its indexes; any other dataset or iterable of quads is copied into one first.
// They are added one by one: the Store constructor takes an iterable that is not an array as options,
// and addAll would keep a copy in a lazy view, which would then stop following its store.
export function toCanonical(dataset, { hashAlgorithm, hash, maxWorkFactor } = {}) {
  let store = dataset;
  if (!(dataset instanceof N3Store)) {
    store = new N3Store();
    for (const quad of dataset)
      store.add(quad);
  }
  return canonicalize(store, { hashAlgorithm, hash, maxWorkFactor });
}

// An N3.js Store whose toCanonical() method is implemented
export class Store extends N3Store {
  toCanonical(options) {
    return toCanonical(this, options);
  }
}
