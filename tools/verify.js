#!/usr/bin/env node
'use strict';
/*
 * Verification harness for Knights of the Eigenrealm.
 *
 *   node tools/verify.js            all checks
 *   node tools/verify.js --reps 200 fewer repetitions, for a quick pass
 *
 * Three layers:
 *   1. Structure  — every generator, every difficulty: four unique choices,
 *                   the answer among them, no malformed output.
 *   2. Algebra    — matrices parsed back out of the rendered HTML and
 *                   recomputed independently, including A·adj(A) = det(A)·I.
 *   3. Analysis   — answers compiled with tools/mathexpr and checked against
 *                   finite differences, quadrature or direct evaluation.
 *
 * Exits non-zero on any failure.
 */
const fs = require('fs');
const path = require('path');
const { compile, ddx, close } = require('./mathexpr');

const REPS = (() => {
  const i = process.argv.indexOf('--reps');
  return i > 0 ? parseInt(process.argv[i + 1], 10) : 400;
})();

/* ---------------------------------------------------------------- loading */
function loadGame() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const mathPart = script.slice(0, script.indexOf('/* ------------------------------ topic metadata'));
  const build = script.slice(script.indexOf('/* A distractor is either'),
                             script.indexOf('/* -------------------------------- battle'));
  const out = {};
  new Function('exports', mathPart + build +
    ';exports.GEN=GEN;exports.buildQuestion=buildQuestion;exports.buildMote=buildMote;exports.mat=mat;exports.R=R;' +
    'exports.Figure=Figure;exports.figEval=figEval;')(out);
  return out;
}
const { GEN, buildQuestion, buildMote, mat, Figure, figEval } = loadGame();

/* Figures are data, so their contract can be checked without a browser. Each
   kind names the fields it cannot draw without; the reveal flags are the ones
   that paint the payoff, and so belong only in an answer figure. */
const FIG_REQUIRED = {
  plane: ['vecs'], grid: ['m'], curve: ['f', 'lo', 'hi'],
  region: ['f', 'lo', 'hi'], bars: ['f', 'lo', 'hi'], numberline: ['at']
};
const FIG_REVEALS = ['para', 'proj', 'tangent', 'legs', 'right', 'sum'];
const finite = n => typeof n === 'number' && isFinite(n);

function checkFigure(spec, key, where) {
  if (!Figure.KINDS.includes(spec.kind)) return fail('figure', key, `${where} has unknown kind ${spec.kind}`);
  for (const f of FIG_REQUIRED[spec.kind]) {
    if (spec[f] === undefined) fail('figure', key, `${where} (${spec.kind}) is missing ${f}`);
  }
  if (spec.vecs) {
    if (!Array.isArray(spec.vecs)) fail('figure', key, `${where} vecs is not an array`);
    else for (const o of spec.vecs) {
      if (!o || !Array.isArray(o.v) || o.v.length !== 2 || !o.v.every(finite))
        fail('figure', key, `${where} has a malformed vector ${JSON.stringify(o && o.v)}`);
    }
  }
  if (spec.m && !(Array.isArray(spec.m) && spec.m.length === 2 && spec.m.every(r => r.length === 2 && r.every(finite))))
    fail('figure', key, `${where} has a malformed matrix`);
  if (spec.lo !== undefined && !(finite(spec.lo) && finite(spec.hi) && spec.hi > spec.lo))
    fail('figure', key, `${where} has an empty or malformed domain [${spec.lo}, ${spec.hi}]`);
  if (spec.f) {
    // The curve has to be drawable: sample it and insist on real, finite values.
    const lo = spec.lo, hi = spec.hi;
    let good = 0;
    for (let i = 0; i <= 24; i++) {
      const y = figEval(spec.f, lo + (hi - lo) * i / 24);
      if (finite(y)) good++;
    }
    if (good < 20) fail('figure', key, `${where} function is undefined over most of [${lo}, ${hi}]`);
  }
  if (spec.caption !== undefined && (typeof spec.caption !== 'string' || spec.caption.length < 8))
    fail('figure', key, `${where} caption is too thin`);
}

const fails = [];
const fail = (area, key, msg) => fails.push(`[${area}] ${key}: ${msg}`);

/* ------------------------------------------------------------- 1. structure */
let generated = 0, tagged = 0, wrongShown = 0, motesChecked = 0, figsChecked = 0;
const seenComplexity = new Set(), figKeys = new Set(), figKinds = new Set();

/** Parse ⟨a, b⟩ out of a rendered answer, or null if it is not a 2-vector. */
function vecOf(html) {
  const m = String(html).replace(/<[^>]+>/g, '').match(/⟨\s*(−?-?\d+)\s*,\s*(−?-?\d+)\s*⟩/);
  return m ? [m[1], m[2]].map(s => parseInt(s.replace(/−/g, '-'), 10)) : null;
}

for (const key of Object.keys(GEN)) {
  for (let d = 1; d <= 3; d++) {
    for (let i = 0; i < REPS; i++) {
      let q;
      try { q = buildQuestion(key, d); }
      catch (e) { fail('structure', key, `threw: ${e.message}`); continue; }
      generated++;

      const all = [q.q, q.a, ...q.choices].join('|');
      if (/undefined|NaN|Infinity/.test(all)) fail('structure', key, `malformed output: ${q.q}`);
      if (new Set(q.choices).size !== 4) fail('structure', key, 'choices are not four distinct values');
      if (!q.choices.includes(q.a)) fail('structure', key, 'answer missing from choices');
      if (!q.q || !q.a || !q.ex || !q.topic) fail('structure', key, 'missing a required field');
      if (q.why[q.a]) fail('structure', key, 'the correct answer is tagged as a mistake');
      for (const [, reason] of Object.entries(q.why)) {
        if (!reason || reason.length < 12) fail('structure', key, `thin misconception: ${JSON.stringify(reason)}`);
      }
      for (const c of q.choices) { if (c !== q.a) { wrongShown++; if (q.why[c]) tagged++; } }

      // Optional contract fields must be well formed when a generator supplies them.
      if (q.complexity !== undefined) {
        seenComplexity.add(key);
        if (![1, 2, 3].includes(q.complexity)) fail('contract', key, `complexity ${q.complexity} not in 1..3`);
        if (q.complexity === 3 && (!Array.isArray(q.motes) || q.motes.length < 2))
          fail('contract', key, 'complexity 3 requires a mote ladder of at least two steps');
      }
      if (q.motes !== undefined) {
        if (!Array.isArray(q.motes)) fail('contract', key, 'motes must be an array');
        else q.motes.forEach((m, n) => {
          if (!m || !m.q || !m.a || !Array.isArray(m.d)) { fail('contract', key, `mote ${n} is missing q/a/d`); return; }
          if (m.d.length < 3) fail('contract', key, `mote ${n} needs at least three authored distractors`);
          const vals = m.d.map(x => Array.isArray(x) ? x[0] : x);
          if (![...new Set(vals)].some(v => v !== m.a))
            fail('contract', key, `mote ${n} has no distractor that differs from its answer`);
          // The invariant that matters is what the player is shown.
          const shown = buildMote(Object.assign({}, m, { _choices: null, _why: null }));
          if (shown.length !== 4) fail('contract', key, `mote ${n} renders ${shown.length} choices, not four`);
          if (new Set(shown).size !== shown.length) fail('contract', key, `mote ${n} renders duplicate choices`);
          if (!shown.includes(m.a)) fail('contract', key, `mote ${n} renders without its answer`);
          motesChecked++;
          m.d.forEach((x, j) => {
            if (Array.isArray(x) && (!x[1] || x[1].length < 12))
              fail('contract', key, `mote ${n} distractor ${j} has a thin reason`);
          });
          if (!m.ex || m.ex.length < 20) fail('contract', key, `mote ${n} needs an explanation`);
        });
      }
      if (q.codex !== undefined && (!q.codex.rule || q.codex.rule.length > 200))
        fail('contract', key, 'codex needs a rule of at most 200 characters');
      if (q.fig !== undefined) {
        figKeys.add(key); figKinds.add(q.fig.kind); figsChecked++;
        checkFigure(q.fig, key, 'fig');
        // A question figure must be a prompt, not a solution: it may not carry
        // a flag that paints the payoff, nor draw the answer as one of its
        // arrows. Doing the mathematics has to remain the only way through.
        for (const flag of FIG_REVEALS) {
          if (q.fig[flag]) fail('figure', key, `fig sets "${flag}", which reveals the answer`);
        }
        const av = vecOf(q.a);
        if (av && (q.fig.vecs || []).some(o => o.v[0] === av[0] && o.v[1] === av[1]))
          fail('figure', key, `fig draws the answer vector ⟨${av}⟩`);
      }
      if (q.figAnswer !== undefined) {
        figKeys.add(key); figKinds.add(q.figAnswer.kind); figsChecked++;
        checkFigure(q.figAnswer, key, 'figAnswer');
      }
      if (q.input !== undefined && !q.input.kind) fail('contract', key, 'input needs a kind');
    }
  }
}

/* --------------------------------------------------------------- 2. algebra */
const num = s => parseInt(String(s).replace(/−/g, '-'), 10);
function mats(html) {
  return html.split('<span class="mtx">').slice(1).map(piece => {
    const cols = piece.split('<span class="col">').slice(1).map(c => {
      const stop = c.indexOf('</span></span>');
      return [...(stop < 0 ? c : c.slice(0, stop + 7)).matchAll(/<span>(.*?)<\/span>/g)].map(x => num(x[1]));
    });
    return cols[0].map((_, r) => cols.map(c => c[r]));
  });
}
const det2 = M => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const det3 = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
               - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
               + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
const mm = (A, B, n) => {
  const E = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (let k = 0; k < n; k++) E[r][c] += A[r][k] * B[k][c];
  return E;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Sanity-check the matrix parser itself before trusting anything it reports.
if (!same(mats(mat([[1, 2], [3, 4]]))[0], [[1, 2], [3, 4]])) fail('algebra', 'parser', '2x2 round-trip failed');
if (!same(mats(mat([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))[0], [[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
  fail('algebra', 'parser', '3x3 round-trip failed');

let algebraChecks = 0;
const ALGEBRA = {
  matMul: p => { const [A, B] = mats(p.q), [C] = mats(p.a); return same(mm(A, B, 2), C); },
  det2:   p => det2(mats(p.q)[0]) === num(p.a),
  det3:   p => det3(mats(p.q)[0]) === num(p.a),
  trace:  p => { const M = mats(p.q)[0]; return M[0][0] + M[1][1] === num(p.a); },
  transpose: p => { const [M] = mats(p.q), [T] = mats(p.a);
                    return same(T, [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]); },
  matVec: p => { const [A, v] = mats(p.q), [s] = mats(p.a);
                 return same([[A[0][0] * v[0][0] + A[0][1] * v[1][0]],
                              [A[1][0] * v[0][0] + A[1][1] * v[1][0]]], s); },
  // The inverse is displayed as (1/det)·adj, so verify A·adj = det·I.
  inv2:   p => { const M = mats(p.q)[0], adj = mats(p.a)[0], d = det2(M);
                 return same(mm(M, adj, 2), [[d, 0], [0, d]]); }
};
for (const [key, check] of Object.entries(ALGEBRA)) {
  for (let i = 0; i < REPS * 3; i++) {
    const p = GEN[key](2);
    algebraChecks++;
    let ok = false;
    try { ok = check(p); } catch (e) { fail('algebra', key, `threw: ${e.message}`); continue; }
    if (!ok) fail('algebra', key, `identity failed for ${p.q} → ${p.a}`);
  }
}

/* -------------------------------------------------------------- 3. analysis */
const DDX = /^<span class="frac"><span>d<\/span><span>dx<\/span><\/span>\s*/;
const stripD = q => q.replace(DDX, '').replace(/\s*=\s*\?\s*$/, '');
const parens = q => { const m = stripD(q).match(/^\(\s*(.*?)\s*\)$/); return m ? m[1] : stripD(q); };
const integrand = q => q.match(/∫\s*(.*?)\s*dx/)[1];
const fnLine = q => q.match(/f\(x(?:,y)?\)\s*=\s*(.*?)<br>/)[1];
const SAMPLES = [-2.31, -1.17, 0.43, 1.62, 3.08];

let analysisChecks = 0;
const covered = new Set();

/** answer(x) must equal the nth numeric derivative of fExpr. */
function derivCheck(key, fExpr, aExpr, order) {
  const f = compile(fExpr), a = compile(aExpr);
  if (!f || !a) return;
  for (const x of SAMPLES) {
    const want = order === 2
      ? (f({ x: x + 1e-3 }) - 2 * f({ x }) + f({ x: x - 1e-3 })) / 1e-6
      : ddx(f, 'x', { x });
    const got = a({ x });
    if (!isFinite(want) || !isFinite(got)) continue;
    analysisChecks++;
    if (!close(got, want, order === 2 ? 5e-3 : 5e-4)) {
      fail('analysis', key, `d${order === 2 ? '²' : ''}/dx of ${fExpr} at ${x}: answer ${got}, numeric ${want}`);
      return;
    }
  }
  covered.add(key);
}

/** d/dx(answer) must equal the integrand — which also absorbs the + C. */
function integCheck(key, integrandExpr, aExpr) {
  const g = compile(integrandExpr), a = compile(aExpr);
  if (!g || !a) return;
  for (const x of SAMPLES) {
    const want = g({ x }), got = ddx(a, 'x', { x }, 1e-4);
    if (!isFinite(want) || !isFinite(got)) continue;
    analysisChecks++;
    if (!close(got, want, 2e-3)) {
      fail('analysis', key, `∫${integrandExpr}: d/dx of answer at ${x} = ${got}, integrand = ${want}`);
      return;
    }
  }
  covered.add(key);
}

/** A plain numeric answer compared against a computed reference. */
function valueCheck(key, want, aStr, tol) {
  const a = compile(aStr);
  if (a === null) return;
  const got = a({});
  if (!isFinite(got) || !isFinite(want)) return;
  analysisChecks++;
  if (!close(got, want, tol || 1e-6)) fail('analysis', key, `expected ${want}, answer evaluates to ${got}`);
  covered.add(key);
}

const simpson = (f, lo, hi, n) => {
  n = n || 2000;
  const h = (hi - lo) / n;
  let s = f({ x: lo }) + f({ x: hi });
  for (let k = 1; k < n; k++) s += f({ x: lo + k * h }) * (k % 2 ? 4 : 2);
  return s * h / 3;
};

const ANALYSIS = {
  powerRule:   p => derivCheck('powerRule', parens(p.q), p.a),
  trigDeriv:   p => derivCheck('trigDeriv', stripD(p.q), p.a),
  expLog:      p => derivCheck('expLog', stripD(p.q), p.a),
  productRule: p => derivCheck('productRule', stripD(p.q), p.a),
  quotient:    p => derivCheck('quotient', stripD(p.q), p.a),
  chainRule:   p => derivCheck('chainRule', stripD(p.q), p.a),
  secondDeriv: p => derivCheck('secondDeriv', fnLine(p.q), p.a, 2),

  indefPower:  p => integCheck('indefPower', integrand(p.q), p.a),
  uSub:        p => integCheck('uSub', integrand(p.q), p.a),
  intTrig:     p => integCheck('intTrig', integrand(p.q), p.a),
  intExp:      p => integCheck('intExp', integrand(p.q), p.a),

  evalDeriv:   p => { const f = compile(fnLine(p.q));
                      const at = parseFloat(p.q.match(/f′\((.*?)\)/)[1].replace('−', '-'));
                      valueCheck('evalDeriv', ddx(f, 'x', { x: at }), p.a, 5e-4); },
  tangent:     p => { const f = compile(fnLine(p.q));
                      const at = parseFloat(p.q.match(/at x = (.*?)\?/)[1].replace('−', '-'));
                      valueCheck('tangent', ddx(f, 'x', { x: at }), p.a, 5e-4); },
  limPoly:     p => { const f = compile(parens(p.q.replace(/^lim<sub>.*?<\/sub>\s*/, '')));
                      const at = parseFloat(p.q.match(/x→(.*?)<\/sub>/)[1].replace('−', '-'));
                      valueCheck('limPoly', f({ x: at }), p.a); },
  defPoly:     p => { const f = compile(p.q.match(/\((.*?)\)\s*dx/)[1]);
                      const hi = parseInt(p.q.match(/<sup>(\d+)<\/sup>/)[1], 10);
                      valueCheck('defPoly', simpson(f, 0, hi), p.a, 1e-4); },
  area:        p => { const a = parseInt(p.q.match(/from 0 to (\d+)/)[1], 10);
                      valueCheck('area', a * a * a / 3, p.a, 1e-9); },
  limInf:      p => { const f = compile(p.q.replace(/^lim<sub>.*?<\/sub>\s*/, '').replace(/\s*=\s*\?\s*$/, ''));
                      if (!f) return;
                      valueCheck('limInf', f({ x: 1e8 }), p.a, 1e-3); },
  limRational: p => { const a = parseInt(p.q.match(/x − (\d+)<\/span>/)[1], 10);
                      valueCheck('limRational', ((a + 1e-7) ** 2 - a * a) / 1e-7, p.a, 1e-3); },
  partial:     p => { const f = compile(fnLine(p.q)), a = compile(p.a);
                      if (!f || !a) return;
                      for (const x of [-1.7, 0.9, 2.4]) for (const y of [-1.3, 1.8]) {
                        const want = ddx(f, 'x', { x, y }), got = a({ x, y });
                        if (!isFinite(want) || !isFinite(got)) continue;
                        analysisChecks++;
                        if (!close(got, want, 5e-4)) {
                          fail('analysis', 'partial', `∂/∂x at (${x},${y}): answer ${got}, numeric ${want}`);
                          return;
                        }
                      }
                      covered.add('partial'); }
};
for (const [key, check] of Object.entries(ANALYSIS)) {
  for (let i = 0; i < REPS; i++) {
    const p = GEN[key](2);
    try { check(p); } catch (e) { fail('analysis', key, `threw: ${e.message} — q was ${p.q}`); break; }
  }
}

/* ----------------------------------------------------------------- report */
const total = Object.keys(GEN).length;
const verified = covered.size + Object.keys(ALGEBRA).length;
const pad = (s, n) => String(s).padStart(n);

console.log('Knights of the Eigenrealm — verification');
console.log('─'.repeat(58));
console.log(`  generators                 ${pad(total, 10)}`);
console.log(`  problems generated         ${pad(generated.toLocaleString(), 10)}`);
console.log(`  algebraic identities       ${pad(algebraChecks.toLocaleString(), 10)}`);
console.log(`  numeric analysis checks    ${pad(analysisChecks.toLocaleString(), 10)}`);
console.log(`  wrong answers diagnosed    ${pad((tagged / wrongShown * 100).toFixed(1) + '%', 10)}`);
console.log(`  generators independently   ${pad(`${verified}/${total}`, 10)}`);
console.log(`    verified against maths                 (${(verified / total * 100).toFixed(0)}% coverage)`);
if (seenComplexity.size) {
  console.log(`  generators with mote ladders ${pad(seenComplexity.size, 8)}`);
  console.log(`  mote steps rendered        ${pad(motesChecked.toLocaleString(), 11)}`);
}
if (figKeys.size) {
  console.log(`  generators with figures      ${pad(figKeys.size, 8)}`);
  console.log(`  figure specs checked       ${pad(figsChecked.toLocaleString(), 11)}  (${figKinds.size}/${Figure.KINDS.length} kinds)`);
}
console.log('─'.repeat(58));

if (fails.length) {
  const shown = [...new Set(fails)].slice(0, 25);
  console.log(`\n${fails.length} FAILURE(S):`);
  shown.forEach(f => console.log('  ' + f));
  if (fails.length > shown.length) console.log(`  … and ${fails.length - shown.length} more`);
  process.exit(1);
}
console.log('\nAll checks passed.');
