import { createHash } from 'node:crypto';
import { DataFactory } from 'n3';
import { Store, toCanonical } from 'n3-canon';

const { namedNode, quad } = DataFactory;
const store = new Store([quad(namedNode('urn:s'), namedNode('urn:p'), namedNode('urn:o'))]);
const canonical: string = store.toCanonical({ hash: string => createHash('sha256').update(string).digest('hex') });
const fromQuads: string = toCanonical([...store], { maxWorkFactor: 3 });
// @ts-expect-error The hash function returns a string
toCanonical(store, { hash: (string: string) => 1 });
