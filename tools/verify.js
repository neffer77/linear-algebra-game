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
/** Every ⟨a, b⟩ in a string, as number pairs. */
function vecsOf(html) {
  return [...String(html).replace(/<[^>]+>/g, '')
    .matchAll(/⟨\s*(−?-?\d+)\s*,\s*(−?-?\d+)\s*⟩/g)]
    .map(m => [num(m[1]), num(m[2])]);
}
const vecOf1 = html => vecsOf(html)[0] || null;
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
                 return same(mm(M, adj, 2), [[d, 0], [0, d]]); },

  /* --- Spectral Reach --- */

  // λ is just a variable: swap it for x and evaluate both sides.
  charPoly: p => {
    const M = mats(p.q)[0], tr = M[0][0] + M[1][1], dt = det2(M);
    const f = compile(String(p.a).replace(/λ/g, 'x'));
    algebraChecks += 4;
    return [-2, -0.5, 1.3, 4].every(x => close(f({ x }), x * x - tr * x + dt, 1e-9));
  },

  // Av = λv, checked against the matrix as rendered.
  eigenvec: p => {
    const A = mats(p.q)[0], v = vecOf(p.a);
    const lam = num(p.q.match(/λ = (−?-?\d+)/)[1]);
    return v && A[0][0] * v[0] + A[0][1] * v[1] === lam * v[0]
             && A[1][0] * v[0] + A[1][1] * v[1] === lam * v[1];
  },

  matPow: p => {
    const A = mats(p.q)[0], got = mats(p.a)[0];
    const n = p.q.includes('³') ? 3 : 2;
    let P = [[1, 0], [0, 1]];
    for (let i = 0; i < n; i++) P = mm(P, A, 2);
    return same(P, got);
  },

  nullSpace: p => {
    const A = mats(p.q)[0], v = vecOf(p.a);
    return v && (v[0] || v[1])
      && A[0][0] * v[0] + A[0][1] * v[1] === 0
      && A[1][0] * v[0] + A[1][1] * v[1] === 0;
  },

  // Rank by elimination over the rationals, computed independently of the
  // construction the generator used to guarantee it.
  colSpace: p => {
    const M = mats(p.q)[0].map(r => r.slice());
    let rank = 0;
    for (let c = 0; c < 3 && rank < 3; c++) {
      let piv = -1;
      for (let r = rank; r < 3; r++) if (Math.abs(M[r][c]) > 1e-9) { piv = r; break; }
      if (piv < 0) continue;
      [M[rank], M[piv]] = [M[piv], M[rank]];
      for (let r = 0; r < 3; r++) if (r !== rank && Math.abs(M[r][c]) > 1e-9) {
        const f = M[r][c] / M[rank][c];
        for (let k = 0; k < 3; k++) M[r][k] -= f * M[rank][k];
      }
      rank++;
    }
    return rank === num(p.a);
  },

  rankNullity: p => {
    const m = p.q.match(/A (\d+)×(\d+) matrix has rank (\d+)/);
    return num(p.a) === +m[2] - +m[3];
  },

  diagonalisable: p => {
    const A = mats(p.q)[0], tr = A[0][0] + A[1][1], disc = tr * tr - 4 * det2(A);
    const scalar = A[0][1] === 0 && A[1][0] === 0 && A[0][0] === A[1][1];
    const want = scalar ? 'Yes — it is already a multiple of the identity'
      : disc > 0 ? 'Yes — two different eigenvalues'
      : disc < 0 ? 'No — its eigenvalues are not real'
      : 'No — one repeated eigenvalue, and only one eigenvector direction';
    return p.a === want;
  },

  // The columns are where î and ĵ land, so each named map has one matrix.
  transMatrix: p => {
    const M = mats(p.a)[0], k = +(p.q.match(/(?:shear of|scaling by) (\d+)/) || [0, 0])[1];
    const WANT = {
      'a rotation by 90° anticlockwise': [[0, -1], [1, 0]],
      'a rotation by 180°': [[-1, 0], [0, -1]],
      'a reflection in the x-axis': [[1, 0], [0, -1]],
      'a reflection in the y-axis': [[-1, 0], [0, 1]],
      'a reflection in the line y = x': [[0, 1], [1, 0]],
      [`a horizontal shear of ${k}`]: [[1, k], [0, 1]],
      [`a vertical shear of ${k}`]: [[1, 0], [k, 1]],
      [`a scaling by ${k}`]: [[k, 0], [0, k]],
      'a projection onto the x-axis': [[1, 0], [0, 0]]
    };
    const nm = p.q.match(/Which matrix performs (.*?)\?$/)[1];
    return !!WANT[nm] && same(WANT[nm], M);
  },

  // proj lies along v, and u − proj is perpendicular to it.
  vecProj: p => {
    const [u, v] = vecsOf(p.q), pr = vecOf1(p.a);
    return pr && u[0] * v[1] - u[1] * v[0] === (u[0] - pr[0]) * v[1] - (u[1] - pr[1]) * v[0]
      && pr[0] * v[1] - pr[1] * v[0] === 0
      && (u[0] - pr[0]) * v[0] + (u[1] - pr[1]) * v[1] === 0;
  },

  // The leftover must be orthogonal to u₁ and differ from u₂ by a multiple of it.
  gramSchmidt: p => {
    const [u1, u2] = vecsOf(p.q), w = vecOf1(p.a);
    if (!w) return false;
    const dropped = [u2[0] - w[0], u2[1] - w[1]];
    return w[0] * u1[0] + w[1] * u1[1] === 0
      && dropped[0] * u1[1] - dropped[1] * u1[0] === 0;
  },

  unitVec: p => {
    const [v] = vecsOf(p.q), [w] = vecsOf(p.a);
    const den = num(String(p.a).match(/<span class="frac"><span>1<\/span><span>(−?-?\d+)<\/span>/)[1]);
    return close((w[0] * w[0] + w[1] * w[1]) / (den * den), 1, 1e-12)
      && v[0] * w[1] - v[1] * w[0] === 0;
  },

  angleVec: p => {
    const [u, v] = vecsOf(p.q);
    const deg = +String(p.a).match(/(\d+)°/)[1];
    const cos = (u[0] * v[0] + u[1] * v[1]) /
                (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
    return close(cos, Math.cos(deg * Math.PI / 180), 1e-9);
  }
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

/* --- Infinite Expanse: each answer checked against the mathematics itself,
   never against the formula the generator used to produce it. --- */
const numDeriv = (f, x, h) => (f(x + (h || 1e-5)) - f(x - (h || 1e-5))) / (2 * (h || 1e-5));
const nums = (str, re) => [...String(str).matchAll(re)].map(m => m.slice(1).map(num));
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** Plain text with unicode superscripts flattened back to digits. */
const flat = s => String(s).replace(/<[^>]+>/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => String(SUPS.indexOf(c)));
/** An expression lifted out of a sentence, without the sentence's full stop. */
const expr = s => String(s).replace(/\.\s*$/, '');

Object.assign(ANALYSIS, {
  // Differentiate the curve itself — y(x) = √((c − ax²)/b) — and compare.
  implicitDiff: p => {
    const m = p.q.replace(/<[^>]+>/g, '').match(/^(\d*)x² \+ (\d*)y² = (\d+)/);
    const a = m[1] === '' ? 1 : +m[1], b = m[2] === '' ? 1 : +m[2], c = +m[3];
    const y = x => Math.sqrt((c - a * x * x) / b);
    const f = compile(p.a);
    const x0 = 0.4 * Math.sqrt(c / a);
    const want = numDeriv(y, x0), got = f({ x: x0, y: y(x0) });
    analysisChecks++;
    if (!close(got, want, 1e-4)) fail('analysis', 'implicitDiff', `at x=${x0}: answer ${got}, curve slope ${want}`);
    covered.add('implicitDiff');
  },

  // Evaluate the original quotient just short of the limit point.
  lhopital: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    let f, m;
    if ((m = t.match(/sin\((\d+)x\)(\d+)x/))) f = x => Math.sin(m[1] * x) / (m[2] * x);
    else if ((m = t.match(/e(\d+)x − 1(\d+)x/))) f = x => (Math.exp(m[1] * x) - 1) / (m[2] * x);
    else { m = t.match(/1 − cos\((\d+)x\)(\d+)x²/); f = x => (1 - Math.cos(m[1] * x)) / (m[2] * x * x); }
    const a = compile(p.a);
    analysisChecks++;
    if (!close(a({}), f(1e-5), 1e-4)) fail('analysis', 'lhopital', `${t}: answer ${a({})}, numeric ${f(1e-5)}`);
    covered.add('lhopital');
  },

  relatedRates: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    const a = compile(String(p.a).replace(/π/g, 'pi').replace(/ (m|cm)[²]?\/s/, ''));
    let want;
    if (t.includes('ladder')) {
      const [[L, v, x]] = nums(t, /A (\d+) m ladder .*? at (\d+) m\/s.*?foot is (\d+) m/gs);
      want = -x * v / Math.sqrt(L * L - x * x);
    } else {
      const [[v, r]] = nums(t, /at (\d+) cm\/s.*?r = (\d+) cm/gs);
      want = 2 * Math.PI * r * v;
    }
    analysisChecks++;
    if (!close(a({}), want, 1e-9)) fail('analysis', 'relatedRates', `${t}: answer ${a({})}, expected ${want}`);
    covered.add('relatedRates');
  },

  // Maximise the objective by dense sampling rather than by the formula.
  optimisation: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    let obj, lo, hi;
    if (t.includes('fence')) {
      const P = +t.match(/have (\d+) m of fence/)[1];
      obj = y => y * (P - 2 * y); lo = 0; hi = P / 2;
    } else {
      const S = +t.match(/numbers add to (\d+)/)[1];
      obj = x => x * (S - x); lo = 0; hi = S;
    }
    let best = -Infinity;
    for (let i = 0; i <= 200000; i++) best = Math.max(best, obj(lo + (hi - lo) * i / 200000));
    const got = compile(String(p.a).replace(/ m²/, ''))({});
    analysisChecks++;
    if (!close(got, best, 1e-5)) fail('analysis', 'optimisation', `${t}: answer ${got}, sampled max ${best}`);
    covered.add('optimisation');
  },

  // f″ must vanish there and genuinely change sign across it.
  inflection: p => {
    const f = compile(expr(p.q.match(/f\(x\) = (.*?)<br>/)[1]));
    const x0 = num(String(p.a).match(/x = (−?-?\d+)/)[1]);
    const dd = x => (f({ x: x + 1e-3 }) - 2 * f({ x }) + f({ x: x - 1e-3 })) / 1e-6;
    analysisChecks += 2;
    if (!close(dd(x0), 0, 1e-3)) fail('analysis', 'inflection', `f″(${x0}) = ${dd(x0)}, not 0`);
    if (dd(x0 - 1) * dd(x0 + 1) >= 0) fail('analysis', 'inflection', `f″ does not change sign across ${x0}`);
    covered.add('inflection');
  },

  invTrigDeriv: p => {
    const m = p.q.replace(/<[^>]+>/g, '').match(/arc(sin|cos|tan)\((\d+)x\)/);
    const k = +m[2];
    const g = m[1] === 'sin' ? Math.asin : m[1] === 'cos' ? Math.acos : Math.atan;
    const a = compile(p.a);
    for (const x of [-0.13, 0.07, 0.16]) {
      const want = numDeriv(t => g(k * t), x), got = a({ x });
      analysisChecks++;
      if (!close(got, want, 1e-4)) { fail('analysis', 'invTrigDeriv', `arc${m[1]}(${k}x) at ${x}: answer ${got}, numeric ${want}`); return; }
    }
    covered.add('invTrigDeriv');
  },

  logDiff: p => {
    const k = +(p.q.replace(/<[^>]+>/g, '').match(/x(\d*)x/) || [0, ''])[1] || 1;
    const a = compile(p.a);
    for (const x of [0.6, 1.4, 2.3]) {
      const want = numDeriv(t => Math.pow(t, k * t), x), got = a({ x });
      analysisChecks++;
      if (!close(got, want, 1e-4)) { fail('analysis', 'logDiff', `d/dx x^(${k}x) at ${x}: answer ${got}, numeric ${want}`); return; }
    }
    covered.add('logDiff');
  },

  byParts: p => integCheck('byParts', integrand(p.q), p.a),

  // A must make the two partial fractions add back up to the original.
  partialFrac: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    const m = t.match(/^(\d+)\(x ([+−]) (\d+)\)\(x ([+−]) (\d+)\)/);
    const N = +m[1], a = (m[2] === '−' ? 1 : -1) * +m[3], b = (m[4] === '−' ? 1 : -1) * +m[5];
    const A = compile(p.a)({}), B = N / (b - a);
    for (const x of [0.37, 2.9, -3.4]) {
      if (Math.abs(x - a) < 0.2 || Math.abs(x - b) < 0.2) continue;
      const lhs = N / ((x - a) * (x - b)), rhs = A / (x - a) + B / (x - b);
      analysisChecks++;
      if (!close(lhs, rhs, 1e-9)) { fail('analysis', 'partialFrac', `${t}: A = ${A} does not reproduce the original at x = ${x}`); return; }
    }
    covered.add('partialFrac');
  },

  improper: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    const pw = +(flat(p.q).match(/1x(\d*) dx/)[1] || 1);
    analysisChecks++;
    if (pw === 1) {
      if (p.a !== 'Diverges') fail('analysis', 'improper', `p = 1 diverges, answer says ${p.a}`);
    } else {
      // ∫₁^B x^(−p) dx, with B large enough that the tail is below tolerance.
      const B = 1e7, want = (1 - Math.pow(B, 1 - pw)) / (pw - 1);
      const got = compile(p.a)({});
      if (!close(got, want, 1e-6)) fail('analysis', 'improper', `p = ${pw}: answer ${got}, numeric ${want}`);
    }
    covered.add('improper');
  },

  avgValue: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    const [[n, b]] = nums(flat(p.q), /y = x(\d) on \[0, (\d+)\]/g);
    const want = simpson(({ x }) => Math.pow(x, n), 0, b) / b;
    valueCheck('avgValue', want, p.a, 1e-6);
  },

  volRev: p => {
    const t = p.q.replace(/<[^>]+>/g, '');
    const m = flat(p.q).match(/y = x(\d?) on \[0, (\d+)\]/);
    const n = m[1] === '' ? 1 : +m[1], b = +m[2];
    const want = Math.PI * simpson(({ x }) => Math.pow(x, 2 * n), 0, b);
    valueCheck('volRev', want, String(p.a).replace(/π/g, 'pi'), 1e-6);
  },

  // The stated integral must actually equal the limit of the sum.
  riemannToInt: p => {
    const k = +flat(p.q).match(/in\)(\d)/)[1];
    const m = String(p.a).match(/∫<sub>(\d+)<\/sub><sup>(\d+)<\/sup> x(\S*) dx/);
    if (!m) { fail('analysis', 'riemannToInt', `answer is not an integral: ${p.a}`); return; }
    const lo = +m[1], hi = +m[2], pw = +(flat(m[3]) || 1);
    const N = 200000;
    let sum = 0;
    for (let i = 1; i <= N; i++) sum += Math.pow(i / N, k) / N;
    const want = simpson(({ x }) => Math.pow(x, pw), lo, hi);
    analysisChecks++;
    if (!close(sum, want, 1e-4)) fail('analysis', 'riemannToInt', `sum → ${sum}, but the stated integral is ${want}`);
    covered.add('riemannToInt');
  }
});

/* --- Gradient Summit: two variables, so the checks differentiate and
   integrate in both of them rather than trusting either formula. --- */
const dx2 = (f, x, y) => (f(x + 1e-5, y) - f(x - 1e-5, y)) / 2e-5;
const dy2 = (f, x, y) => (f(x, y + 1e-5) - f(x, y - 1e-5)) / 2e-5;
/** Read a·x² ± b·xy ± c·y² back out of a rendered surface, coefficients and
    all. An absent term is 0; a bare sign means 1. Throwing on a shape this
    does not recognise is deliberate — the harness reports it as a failure
    rather than quietly checking against the wrong surface. */
function quadratic(line) {
  const L = flat(line).replace(/\s/g, '');
  const co = (m, dflt) => {
    if (!m) return dflt;
    const t = m[1].replace('+', '');
    return t === '' ? 1 : t === '−' ? -1 : num(t);
  };
  const a = co(L.match(/^([+−]?\d*)x2/), null);
  if (a === null) throw new Error(`no x² term in ${JSON.stringify(L)}`);
  return { a, b: co(L.match(/([+−]\d*)xy/), 0), c: co(L.match(/([+−]\d*)y2/), 0) };
}

Object.assign(ANALYSIS, {
  gradient: p => {
    const { a, b, c } = quadratic(p.q.match(/f\(x, y\) = (.*?)<br>/)[1]);
    const [x0, y0] = flat(p.q).match(/at \((−?-?\d+), (−?-?\d+)\)/).slice(1).map(num);
    const f = (x, y) => a * x * x + b * x * y + c * y * y;
    const g = vecOf1(p.a);
    analysisChecks += 2;
    if (!close(g[0], dx2(f, x0, y0), 1e-5)) fail('analysis', 'gradient', `∂f/∂x at (${x0},${y0}): answer ${g[0]}, numeric ${dx2(f, x0, y0)}`);
    if (!close(g[1], dy2(f, x0, y0), 1e-5)) fail('analysis', 'gradient', `∂f/∂y at (${x0},${y0}): answer ${g[1]}, numeric ${dy2(f, x0, y0)}`);
    covered.add('gradient');
  },

  dirDeriv: p => {
    const { a, c: b } = quadratic(p.q.match(/f\(x, y\) = (.*?),/)[1]);
    const [x0, y0] = flat(p.q).match(/point \((−?-?\d+), (−?-?\d+)\)/).slice(1).map(num);
    const [u] = vecsOf(p.q.split('direction')[1]);
    const f = (x, y) => a * x * x + b * y * y;
    const n = Math.hypot(u[0], u[1]);
    // The definition itself: the limit of the difference quotient along u.
    const h = 1e-5;
    const want = (f(x0 + h * u[0] / n, y0 + h * u[1] / n) - f(x0 - h * u[0] / n, y0 - h * u[1] / n)) / (2 * h);
    const got = compile(p.a)({});
    analysisChecks++;
    if (!close(got, want, 1e-4)) fail('analysis', 'dirDeriv', `answer ${got}, directional limit ${want}`);
    covered.add('dirDeriv');
  },

  chainMulti: p => {
    const t = flat(p.q);
    const m = +(t.match(/z = x(\d?)y/)[1] || 1), n = +(t.match(/y(\d?),/)[1] || 1);
    const pp = +(t.match(/x = t(\d?) /)[1] || 1), qq = +(t.match(/y = t(\d?)\./)[1] || 1);
    const z = tt => Math.pow(Math.pow(tt, pp), m) * Math.pow(Math.pow(tt, qq), n);
    const a = compile(String(p.a).replace(/t/g, 'x'));   // flat() would eat the exponent
    for (const x of [1.3, 2.1]) {
      const want = numDeriv(z, x, 1e-6), got = a({ x });
      analysisChecks++;
      if (!close(got, want, 1e-3)) { fail('analysis', 'chainMulti', `dz/dt at t=${x}: answer ${got}, numeric ${want}`); return; }
    }
    covered.add('chainMulti');
  },

  // The plane must share the surface's height and both its slopes at the point.
  tangentPlane: p => {
    const { a, c: b } = quadratic(p.q.match(/f\(x, y\) = (.*?)<br>/)[1]);
    const [x0, y0] = flat(p.q).match(/at \((−?-?\d+), (−?-?\d+)\)/).slice(1).map(num);
    const M = flat(p.a).match(/^z = (−?-?\d+) ([+−]) (\d+)\(x [+−] \d+\) ([+−]) (\d+)\(y [+−] \d+\)$/);
    if (!M) { fail('analysis', 'tangentPlane', `unreadable plane: ${flat(p.a)}`); return; }
    const z0 = num(M[1]), cx = (M[2] === '−' ? -1 : 1) * +M[3], cy = (M[4] === '−' ? -1 : 1) * +M[5];
    const f = (x, y) => a * x * x + b * y * y;
    analysisChecks += 3;
    if (!close(z0, f(x0, y0), 1e-9)) fail('analysis', 'tangentPlane', `height ${z0} ≠ f(${x0},${y0}) = ${f(x0, y0)}`);
    if (!close(cx, dx2(f, x0, y0), 1e-5)) fail('analysis', 'tangentPlane', `x-slope ${cx} ≠ ${dx2(f, x0, y0)}`);
    if (!close(cy, dy2(f, x0, y0), 1e-5)) fail('analysis', 'tangentPlane', `y-slope ${cy} ≠ ${dy2(f, x0, y0)}`);
    covered.add('tangentPlane');
  },

  doubleInt: p => {
    const t = flat(p.q);
    const [a, b] = [+t.match(/∫0(\d)/g)[0].slice(-1), +t.match(/∫0(\d)/g)[1].slice(-1)];
    const body = t.match(/<sup>\d<\/sup> (.*?) dy dx/) ? null : t.match(/\d (.*?) dy dx/)[1];
    const m = body === '1' ? 0 : +((body.match(/x(\d?)/) || [0, ''])[1] || (body.includes('x') ? 1 : 0));
    const n = body === '1' ? 0 : +((body.match(/y(\d?)/) || [0, ''])[1] || (body.includes('y') ? 1 : 0));
    // Iterated Simpson in both variables.
    const inner = x => simpson(({ x: y }) => Math.pow(x, m) * Math.pow(y, n), 0, b, 400);
    const want = simpson(({ x }) => inner(x), 0, a, 400);
    valueCheck('doubleInt', want, p.a, 1e-6);
  },

  geoSeries: p => {
    const t = flat(p.q);
    const rm = t.match(/ratio r = (.*?)\)/);
    if (!rm) {                                   // the divergent branch
      analysisChecks++;
      if (p.a !== 'Diverges') fail('analysis', 'geoSeries', `growing series answered ${p.a}`);
      covered.add('geoSeries'); return;
    }
    // The ratio is a fraction, so the capture has to run to the ")</span>".
    const r = compile(p.q.match(/ratio r = (.*?)\)<\/span>/)[1])({});
    // Terms are joined with " + " / " − ", and a fraction never contains either,
    // so the first term is everything before the first separator.
    const first = compile(p.q.split('<br>')[0].split(/ [+−] /)[0])({});
    let sum = 0, term = first;
    for (let i = 0; i < 4000; i++) { sum += term; term *= r; }
    valueCheck('geoSeries', sum, p.a, 1e-6);
  },

  taylor: p => {
    const t = flat(p.q);
    const m = t.match(/of (e|cos\(|ln\(1 \+ )(\d?)(x)?/);
    const k = +(t.match(/(\d)x/) || [0, 1])[1];
    const g = t.includes('cos') ? x => Math.cos(k * x)
            : t.includes('ln')  ? x => Math.log(1 + k * x)
            :                     x => Math.exp(k * x);
    const P = compile(p.a);
    analysisChecks += 3;
    // A degree-2 Taylor polynomial matches value, slope and curvature at 0.
    const d2 = f => (f(1e-3) - 2 * f(0) + f(-1e-3)) / 1e-6;
    if (!close(P({ x: 0 }), g(0), 1e-6)) fail('analysis', 'taylor', `P(0) = ${P({ x: 0 })}, f(0) = ${g(0)}`);
    if (!close(numDeriv(x => P({ x }), 0), numDeriv(g, 0), 1e-4)) fail('analysis', 'taylor', `P′(0) ≠ f′(0)`);
    if (!close(d2(x => P({ x })), d2(g), 1e-3)) fail('analysis', 'taylor', `P″(0) = ${d2(x => P({ x }))}, f″(0) = ${d2(g)}`);
    covered.add('taylor');
  }
});
for (const [key, check] of Object.entries(ANALYSIS)) {
  for (let i = 0; i < REPS; i++) {
    const p = GEN[key](2);
    try { check(p); } catch (e) { fail('analysis', key, `threw: ${e.message} — q was ${p.q}`); break; }
  }
}

/* ------------------------------------------------------------- knight codes */
/* A knight code is the one thing this game emits that has to be readable by a
   *different copy* of the game, possibly a different build of it. So the two
   things that would silently corrupt one are pinned here.
                                                                              */
let codeNotes = null;
(function checkCodes() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b));
  const out = {};
  try {
    new Function('exports',
      script.slice(0, script.indexOf('/* ------------------------------ topic metadata')) +
      cut('const TOPIC_LABEL', 'const STRANDS') +
      cut('const B32 =', 'const Profiles = {') +
      ';exports.Codec=Codec;exports.QR=QR;exports.TOPIC_LABEL=TOPIC_LABEL;')(out);
  } catch (e) {
    return fail('codes', 'load', `could not load the codec: ${e.message}`);
  }
  const { Codec, QR, TOPIC_LABEL } = out;

  /* 1. The topic list is what the mastery half of a code is indexed by, and a
        code carries a 16-bit fingerprint of it. Changing the list is allowed —
        a code from before is then read with its topic history dropped and a
        message saying so, which is the designed behaviour. But it should never
        happen by accident, so the list is pinned. If this fails and the change
        was deliberate, update the two numbers below. */
  const PINNED = { count: 70, sig: 0x502a };
  const keys = Object.keys(TOPIC_LABEL);
  if (keys.length !== PINNED.count || Codec.sig() !== PINNED.sig) {
    fail('codes', 'topics',
      `the topic list changed (${keys.length} topics, signature 0x${Codec.sig().toString(16)}; ` +
      `pinned at ${PINNED.count} and 0x${PINNED.sig.toString(16)}). Knight codes already in the ` +
      `wild will import without their topic history. If that is intended, update PINNED in tools/verify.js.`);
  }

  /* 2. base32 has to be exactly reversible, or a code is a coin toss.
        Every length mod 5 leaves a different number of bits over into the last
        character, and whether a mistake there is visible depends on the actual
        bit values — an arithmetic pattern can walk straight past a real fault.
        So each length is tried with many different byte patterns. */
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8 & 255;
  let b32Bad = 0;
  for (let n = 0; n <= 40 && !b32Bad; n++) {
    for (let trial = 0; trial < 60; trial++) {
      const b = [];
      for (let i = 0; i < n; i++) b.push(rnd());
      if (JSON.stringify(Codec.unb32(Codec.b32(b))) !== JSON.stringify(b)) {
        fail('codes', 'base32', `${n} bytes did not survive the round trip (${b.join(',')})`);
        b32Bad = 1; break;
      }
    }
  }
  // all-zero and all-ones are the patterns an arithmetic sequence never reaches
  for (const fillN of [1, 2, 3, 4, 6, 7, 9, 11]) for (const fill of [0, 255]) {
    const b = new Array(fillN).fill(fill);
    if (JSON.stringify(Codec.unb32(Codec.b32(b))) !== JSON.stringify(b))
      fail('codes', 'base32', `${fillN} bytes of ${fill} did not survive the round trip`);
  }
  // and the separators a player might introduce by copying it out of an email
  const sample = Codec.b32([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  if (JSON.stringify(Codec.unb32(sample.replace(/(.{4})/g, '$1 ').trim())) !==
      JSON.stringify(Codec.unb32(sample)))
    fail('codes', 'base32', 'spaces inside a code changed what it decoded to');

  /* 3. The QR encoder was checked module-for-module against an independent
        implementation across versions 1–25, at every mask. That cannot run
        here without a dependency, so the symbols it produced are pinned by
        hash instead: these detect a regression, having already been shown
        correct once. */
  const fnv = m => {
    let x = 0x811c9dc5;
    for (let i = 0; i < m.length; i++) { x ^= m[i]; x = (x + ((x << 1) + (x << 4) + (x << 7) + (x << 8) + (x << 24))) >>> 0; }
    return x >>> 0;
  };
  const URL_PREFIX = 'https://neffer77.github.io/linear-algebra-game/#k=';
  const B32RUN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const GOLDEN = [
    { nm: 'alnum, one block', segs: [{ mode: 'alnum', text: 'HELLO WORLD' }], v: 1, mask: 7, h: 0x5395e5a1 },
    { nm: 'a short code', segs: [{ mode: 'alnum', text: 'KE1-' + B32RUN.repeat(8) }], v: 8, mask: 4, h: 0x8ebc5191 },
    { nm: 'digits, two groups', segs: [{ mode: 'alnum', text: '0123456789'.repeat(40) }], v: 11, mask: 0, h: 0xa090a2f5 },
    { nm: 'a carry link', segs: [{ mode: 'byte', data: Codec.utf8(URL_PREFIX) },
                                 { mode: 'alnum', text: 'KE1-' + B32RUN.repeat(25) }], v: 17, mask: 1, h: 0x668572e6 }
  ];
  for (const g of GOLDEN) {
    const r = QR.matrix(g.segs);
    if (!r) { fail('codes', 'qr', `${g.nm}: did not fit in any version`); continue; }
    if (r.v !== g.v || r.mask !== g.mask || fnv(r.m) !== g.h)
      fail('codes', 'qr', `${g.nm}: got version ${r.v} mask ${r.mask} hash 0x${fnv(r.m).toString(16)}, ` +
                          `expected version ${g.v} mask ${g.mask} hash 0x${g.h.toString(16)}`);
    if (r.size !== 17 + 4 * r.v) fail('codes', 'qr', `${g.nm}: size ${r.size} does not match version ${r.v}`);
  }

  /* 4. A carry link at the size a maxed-out save reaches must still fit, with
        room to spare, in a symbol a phone camera can read off a screen. */
  const big = QR.matrix([{ mode: 'byte', data: Codec.utf8(URL_PREFIX) },
                         { mode: 'alnum', text: 'KE1-' + B32RUN.repeat(32) }]);   // 1024 chars
  if (!big) fail('codes', 'qr', 'a 1024-character code does not fit in any supported version');
  else if (big.v > 20) fail('codes', 'qr', `a 1024-character code needs version ${big.v}, which is too dense to scan`);

  codeNotes = { topics: keys.length, sig: Codec.sig(), worst: big && big.size };
})();

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
{
  // Name the gap rather than leaving it to arithmetic: these are the answers
  // that are not scalars or matrices — judgements, sets of roots, prose — and
  // so rest on the structural and algebraic layers instead.
  const done = new Set([...covered, ...Object.keys(ALGEBRA)]);
  const gap = Object.keys(GEN).filter(k => !done.has(k));
  if (gap.length) console.log(`    not numerically checked: ${gap.join(', ')}`);
}
if (seenComplexity.size) {
  console.log(`  generators with mote ladders ${pad(seenComplexity.size, 8)}`);
  console.log(`  mote steps rendered        ${pad(motesChecked.toLocaleString(), 11)}`);
}
if (figKeys.size) {
  console.log(`  generators with figures      ${pad(figKeys.size, 8)}`);
  console.log(`  figure specs checked       ${pad(figsChecked.toLocaleString(), 11)}  (${figKinds.size}/${Figure.KINDS.length} kinds)`);
}
if (codeNotes) {
  console.log(`  knight codes: topics       ${pad(codeNotes.topics, 10)}  (signature 0x${codeNotes.sig.toString(16)})`);
  console.log(`    QR symbols pinned                      (worst case ${codeNotes.worst}×${codeNotes.worst} modules)`);
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
