#!/usr/bin/env node
/* Break each new guard on purpose, and confirm a check notices.
 *
 *   node tools/mutate.js tools/mutations.json
 *   node tools/mutate.js tools/mutations.json --only some-name
 *
 * A check that cannot fail proves nothing. The mutations file lists, for the
 * latest change, the lines that guard what it promises, each with a deliberate
 * break and the suite that ought to catch it:
 *
 *   { "change": "what the change was",
 *     "mutations": [
 *       { "name": "rung is stored, not derived",
 *         "file": "index.html",
 *         "find": "exact text that must occur exactly once",
 *         "replace": "the broken version",
 *         "run": "play:lesson" }          // or "verify", or "play" for every suite
 *     ] }
 *
 * Each break is applied alone, the named suite runs, and the file is put back
 * before the next — whatever happens, including Ctrl-C. A break whose `find`
 * no longer matches exactly once is reported as stale rather than skipped,
 * because a mutation that silently stops applying is a check that silently
 * stops being tested. Exits non-zero if any break survives or is stale.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function arg(flag) { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; }

function command(run) {
  if (run === 'verify') return ['node', ['tools/verify.js', '--reps', '60']];
  if (run === 'play') return ['node', ['tools/play.js']];
  const m = /^play:(\w+)$/.exec(run || '');
  if (m) return ['node', ['tools/play.js', '--suite', m[1]]];
  if (run === 'balance' || /^balance:/.test(run || '')) {
    const extra = run === 'balance' ? [] : run.slice('balance:'.length).trim().split(/\s+/);
    return ['node', ['tools/balance.js', ...extra]];
  }
  throw new Error(`unknown run "${run}" — use verify, play, play:<suite> or balance[:args]`);
}

function count(hay, needle) {
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

const specPath = process.argv[2];
if (!specPath) { console.error('usage: node tools/mutate.js <mutations.json> [--only name]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const only = arg('--only');
const list = (spec.mutations || []).filter(m => !only || m.name === only);
if (!list.length) { console.error('No mutations to run.'); process.exit(2); }

// Whatever is mid-flight when the process is stopped gets put back.
let pending = null;
const restore = () => { if (pending) { fs.writeFileSync(pending.file, pending.text); pending = null; } };
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restore(); process.exit(130); });
process.on('exit', restore);

console.log(`Mutations — ${spec.change || specPath}`);
console.log('─'.repeat(58));
const results = [];
for (const m of list) {
  const file = path.join(ROOT, m.file || 'index.html');
  const text = fs.readFileSync(file, 'utf8');
  const n = count(text, m.find);
  if (n !== 1) {
    results.push({ name: m.name, verdict: 'stale', detail: `find matches ${n} times` });
    console.log(`  STALE    ${m.name}  (find matches ${n} times, needs exactly 1)`);
    continue;
  }
  pending = { file, text };
  fs.writeFileSync(file, text.replace(m.find, () => m.replace));
  const [cmd, args] = command(m.run);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', env: process.env });
  restore();
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  // Exit 1 is a check failing. Anything else (2 is "could not start the
  // browser") is the harness failing, which proves nothing about the guard.
  const out = (r.stdout || '') + (r.stderr || '');
  const verdict = r.status === 1 ? 'caught' : r.status === 0 ? 'survived' : 'error';
  // Name the check that noticed, so a catch can be told from a crash.
  const first = (out.match(/^\s*FAIL\s+.*$/m) || out.match(/FAILURE\(S\):\n(.*)/) || out.match(/^.*Error.*$/m) || ['', ''])
    .slice(-1)[0].trim();
  results.push({ name: m.name, verdict, detail: first });
  const label = { caught: 'caught  ', survived: 'SURVIVED', error: 'ERROR   ' }[verdict];
  console.log(`  ${label} ${m.name}  [${m.run}, ${secs}s]${first ? '\n             ' + first.slice(0, 120) : ''}`);
}
console.log('─'.repeat(58));
const caught = results.filter(r => r.verdict === 'caught').length;
const bad = results.filter(r => r.verdict !== 'caught');
console.log(`${caught} of ${results.length} mutations caught.`);
if (bad.length) {
  console.log(`\n${bad.length} not caught:`);
  bad.forEach(b => console.log(`  ${b.verdict}: ${b.name}${b.detail ? ' — ' + b.detail : ''}`));
  process.exit(1);
}
