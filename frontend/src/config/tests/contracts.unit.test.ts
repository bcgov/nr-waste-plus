import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { pageableResponseSchema } from '@/types/pagination.types';

const contractsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
  'shared/contracts',
);

// [file relative to shared/contracts/, schema]
// Grows alongside backend golden tests: a new golden file without a registry
// entry (or the reverse) fails the completeness test below.
const registry: ReadonlyArray<readonly [string, z.ZodType]> = [
  ['pagination/paged-model.json', pageableResponseSchema(z.unknown())],
];

describe('shared/contracts golden files', () => {
  it('every golden file is registered and every registry entry exists on disk', () => {
    const onDisk = listGoldenFiles(contractsDir).sort();
    const registered = registry.map(([file]) => file).sort();

    const unregistered = onDisk.filter((file) => !registered.includes(file));
    const missing = registered.filter((file) => !onDisk.includes(file));

    expect(unregistered, 'golden files missing a registry entry').toEqual([]);
    expect(missing, 'registry entries missing on disk').toEqual([]);
  });

  it.each(registry)('%s matches its schema', (file, schema) => {
    const json = JSON.parse(readFileSync(path.join(contractsDir, file), 'utf8'));
    const result = schema.safeParse(json);
    // Print the issues so the failure says WHICH field drifted:
    if (!result.success) {
      throw new Error(`Contract drift in ${file}:\n${z.prettifyError(result.error)}`);
    }
    expect(result.success).toBe(true);
  });
});

/** Recursively lists `*.json` files under the contracts directory. */
function listGoldenFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listGoldenFiles(full).map((p) => path.join(entry, p)));
    } else if (entry.endsWith('.json')) {
      out.push(entry);
    }
  }
  return out;
}
