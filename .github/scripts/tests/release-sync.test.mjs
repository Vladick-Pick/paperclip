import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../../workflows/sync-paperclip-release.yml', import.meta.url), 'utf8');
const importScript = workflow.split('      - name: Import latest official stable release\n')[1]
  .split('        run: |\n')[1].split('\n      - name:')[0]
  .split('\n').map(line => line.replace(/^          /, '')).join('\n');
const oldSha = 'a'.repeat(40);
const newSha = 'b'.repeat(40);
const headSha = 'c'.repeat(40);

function runImport({ blocked = '', author = 'github-actions[bot]', retry = false, current = `v2026.1001.0 ${oldSha}`, conflict = '', applyStatus = 0 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'paperclip-release-sync-test-'));
  try {
    mkdirSync(join(dir, 'bin'));
    writeFileSync(join(dir, '.paperclip-upstream-release'), current);
    writeFileSync(join(dir, 'output'), '');
    writeFileSync(join(dir, 'calls'), '');
    writeFileSync(join(dir, 'bin', 'gh'), `#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *releases/latest* ]]; then echo v2026.1005.0
elif [[ -n "$BLOCKED" && "$*" == *"$BLOCKED"* ]]; then
  if [[ "$*" != *'.user.login == "github-actions[bot]"'* || "$AUTHOR" == 'github-actions[bot]' ]]; then echo 3; fi
fi
`, { mode: 0o755 });
    writeFileSync(join(dir, 'bin', 'git'), `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$CALLS"
case "$1" in
  rev-parse)
    if [[ "$2" == --verify ]]; then exit 1
    elif [[ "$2" == HEAD ]]; then echo "$HEAD_SHA"
    elif [[ "$2" == v2026.1001.0* ]]; then echo "$OLD_SHA"
    else echo "$NEW_SHA"; fi ;;
  apply) cat >/dev/null; exit "$APPLY_STATUS" ;;
  diff) if [[ "$*" == *--diff-filter=U* ]]; then printf '%s' "$CONFLICT"; fi ;;
esac
`, { mode: 0o755 });
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', importScript], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
        GITHUB_OUTPUT: join(dir, 'output'), CALLS: join(dir, 'calls'),
        REPOSITORY: 'Vladick-Pick/paperclip', RETRY_BLOCKED: String(retry),
        BLOCKED: blocked, AUTHOR: author, OLD_SHA: oldSha, NEW_SHA: newSha, HEAD_SHA: headSha,
        CONFLICT: conflict, APPLY_STATUS: String(applyStatus) },
    });
    assert.equal(result.error, undefined);
    return { status: result.status, output: readFileSync(join(dir, 'output'), 'utf8'), calls: readFileSync(join(dir, 'calls'), 'utf8') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const blockedMarker = `Blocked import: v2026.1005.0 ${newSha} on ${headSha}`;

test('unchanged scheduled conflict is quiet but does not resolve the incident', () => {
  const result = runImport({ blocked: blockedMarker });
  assert.equal(result.status, 0);
  assert.equal(result.output, 'blocked=true\n');
  assert.doesNotMatch(result.calls, /^(apply|push) /m);
  assert.match(workflow, /success\(\) && steps\.import_release\.outputs\.blocked != 'true'/);
});

test('manual dispatch retries the same blocked import', () => {
  const result = runImport({ blocked: blockedMarker, retry: true });
  assert.equal(result.status, 0);
  assert.match(result.calls, /^apply /m);
  assert.match(result.calls, /^push /m);
  assert.equal(result.output, '');
});

test('a foreign issue author cannot suppress imports or own the incident lifecycle', () => {
  const result = runImport({ blocked: blockedMarker, author: 'external-user' });
  assert.equal(result.status, 0);
  assert.match(result.calls, /^push /m);
  assert.equal(result.output, '');
  assert.equal(workflow.split('.user.login == \\"github-actions[bot]\\"').length - 1, 3);
});

test('changed deploy SHA or release retries automatically', () => {
  for (const blocked of [blockedMarker.replace(headSha, oldSha), blockedMarker.replace('1005', '1001')]) {
    const result = runImport({ blocked });
    assert.equal(result.status, 0);
    assert.match(result.calls, /^push /m);
  }
});

test('an already imported release can close the incident', () => {
  const result = runImport({ blocked: blockedMarker, current: `v2026.1005.0 ${newSha}` });
  assert.equal(result.status, 0);
  assert.equal(result.output, '');
  assert.doesNotMatch(result.calls, /^(apply|push) /m);
});

test('only code conflicts emit a suppression marker', () => {
  const conflict = runImport({ conflict: 'package.json', applyStatus: 1 });
  assert.equal(conflict.status, 1);
  assert.equal(conflict.output, `blocked_marker=${blockedMarker}\n`);
  assert.doesNotMatch(conflict.calls, /^push /m);
  const transient = runImport({ applyStatus: 1 });
  assert.equal(transient.status, 1);
  assert.equal(transient.output, '');
});

test('malformed release markers fail without push or permanent suppression', () => {
  const result = runImport({ current: 'v2026.1001.0 broken' });
  assert.equal(result.status, 1);
  assert.equal(result.output, '');
  assert.doesNotMatch(result.calls, /^push /m);
});

test('fork-owned GitHub files are excluded from release imports', () => {
  assert.match(importScript, /'\:\(exclude\)\.github\/\*\*'/);
  assert.match(importScript, /--cached --quiet -- \.github;/);
});
