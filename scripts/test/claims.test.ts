import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The public account must not drop a recorded miss (spec §4 stop rule): every miss the test suite records
// ("MISSED, see ledger: Item …", or a missed target cited by ledger item) is cited in the README's results.
const TEST_DIR = 'packages/view-engine/test';
const tests = readdirSync(TEST_DIR).filter((f) => f.endsWith('.test.ts')).map((f) => readFileSync(`${TEST_DIR}/${f}`, 'utf8')).join('\n');
const missed = [...new Set([...tests.matchAll(/(?:MISSED, see ledger: Item|was missed — ledger, item) ([0-9]+(?:\.[0-9]+)?)/g)].map((m) => m[1]!))].sort();
const readme = readFileSync('README.md', 'utf8');

describe('README results', () => {
  it('finds the recorded misses', () => expect(missed.length).toBeGreaterThanOrEqual(7));
  it.each(missed)('cites the miss recorded as ledger Item %s', (item) => {
    expect(readme).toMatch(new RegExp(`Item ${item.replace('.', '\\.')}(?![0-9.])`));
  });
});
