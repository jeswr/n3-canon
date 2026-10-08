import type * as RDF from '@rdfjs/types';
import { Store as N3Store } from 'n3';

export interface CanonicalizationOptions {
  /** The hash algorithm, `'SHA-256'` by default. Another one needs a `hash` function. */
  hashAlgorithm?: string;
  /**
   * Replaces the built-in SHA-256: it must synchronously and deterministically hash the UTF-8 encoding of the string,
   * and return the full, fixed-length digest in lowercase hex.
   */
  hash?: (string: string) => string;
  /** Hash N-Degree Quads runs at most n^maxWorkFactor times for n blank nodes without a unique hash; 1 by default. */
  maxWorkFactor?: number;
}

/** Returns the dataset as canonical N-Quads, with blank nodes labeled by RDFC-1.0. */
export function toCanonical(dataset: N3Store | Iterable<RDF.Quad>, options?: CanonicalizationOptions): string;

/** An N3.js Store whose `toCanonical()` method is implemented. */
export class Store extends N3Store {
  toCanonical(options?: CanonicalizationOptions): string;
}
