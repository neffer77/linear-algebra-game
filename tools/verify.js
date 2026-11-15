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
  // The tile-and-slot build's own arithmetic, lifted out of Lesson so the bank
  // it offers can be drawn here thousands of times without a page.
  const shape = script.slice(script.indexOf('  shape(a){'), script.indexOf('  buildable(q)'));
  const bank = script.slice(script.indexOf('  pieces(a){'), script.indexOf('  /* Draw the build into'));
  // Find the slip's question, lifted the same way: it is built from a
  // generated question alone, so every topic can be asked it here.
  const slip = script.slice(script.indexOf('  SLIP:'), script.indexOf('  /* end of find the slip */'));
  const out = {};
  new Function('exports', mathPart + build + ';const Build={' + shape + bank + '};' +
    ';const Slip={' + slip + '};' +
    ';exports.GEN=GEN;exports.trailQ=trailQ;exports.buildQuestion=buildQuestion;exports.buildMote=buildMote;exports.mat=mat;exports.R=R;' +
    // The workshop's arithmetic, lifted out of its object so every matrix it
    // can show is checked here: the determinant, the directions it keeps, and
    // whether each goal can be made inside its range at all.
    ';const Slope={' + script.slice(script.indexOf('  CURVES:['), script.indexOf('  open(){ UI.go(\'s-slope\'); },')) + '};exports.Slope=Slope;' +
    // The area workshop, lifted the same way: after Slope's, so its CURVES is found from Area on.
    ';const Dot={' + script.slice(script.indexOf('  LO:-4, HI:4,\n  START:'), script.indexOf('  open(){ UI.go(\'s-dot\'); },')) + '};exports.Dot=Dot;' +
    ';const Eigen={' + script.slice(script.indexOf('  MATS:[\n    {id:\'sym\''), script.indexOf('  open(){ UI.go(\'s-eig\'); },')) + '};exports.Eigen=Eigen;' +
    ';const Compose={' + script.slice(script.indexOf('  MOVES:[\n    {id:\'turn\''), script.indexOf('  open(){ UI.go(\'s-compose\'); },')) + '};exports.Compose=Compose;' +
    ';const Limit={' + script.slice(script.indexOf('  FNS:[\n    {id:\'hole\''), script.indexOf('  open(){ UI.go(\'s-limit\'); },')) + '};exports.Limit=Limit;' +
    ';const Taylor={' + script.slice(script.indexOf('  CURVES:[\n    {id:\'exp\''), script.indexOf('  open(){ UI.go(\'s-taylor\'); },')) + '};exports.Taylor=Taylor;' +
    ';const Area={' + script.slice(script.indexOf('  CURVES:[', script.indexOf('const Area = {')), script.indexOf('  open(){ UI.go(\'s-area\'); },')) + '};exports.Area=Area;' +
    ';const Workshop={' + script.slice(script.indexOf('  LO:-4, HI:4,'), script.indexOf('  open(){ UI.go(\'s-workshop\'); },')) + '};' +
    'exports.Figure=Figure;exports.figEval=figEval;exports.Build=Build;exports.Slip=Slip;exports.Workshop=Workshop;')(out);
  return out;
}
/* The whole page script must parse. The checks below lift pieces of it, so a
   slip outside those pieces (a template string left open in a screen that
   no generator touches) would pass every one of them and still stop the page
   from loading at all. */
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  try { new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]); }
  catch (e) { console.log(`FAIL [page] script: the page script does not parse: ${e.message}`); process.exit(1); }
}
const { GEN, trailQ, buildQuestion, buildMote, mat, Figure, figEval, Build, Slip, Workshop, Slope, Area, Dot, Eigen, Taylor, Compose, Limit } = loadGame();

/* Figures are data, so their contract can be checked without a browser. Each
   kind names the fields it cannot draw without; the reveal flags are the ones
   that paint the payoff, and so belong only in an answer figure. */
const FIG_REQUIRED = {
  plane: ['vecs'], grid: ['m'], curve: ['f', 'lo', 'hi'],
  region: ['f', 'lo', 'hi'], bars: ['f', 'lo', 'hi'], numberline: ['at']
};
const FIG_REVEALS = ['para', 'proj', 'tangent', 'legs', 'right', 'sum', 'arc'];
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

/* Two signs in a row before a number or a letter ("x − −3", "5 + −1",
   "4x + −8y") is how a template reads, not how anyone writes mathematics. A
   negative being added or subtracted is either folded into the sign
   ("x + 3") or set in brackets ("5 + (−1)"). Each place a text is found is
   reported once, with the offending stretch, so one bad template does not
   bury the rest. A negative number raised to a power is held to the same
   standard, because −2² and (−2)² are different numbers. */
let notationScanned = 0;
const notationSeen = new Set();
// −2² is −4, so a square of −2 has to be written (−2)².
// Nobody writes 1x, −1y or 0(x + 1): the 1 is left out and a 0 term is dropped.
const UNIT_COEF = /(^|[^\w.,\/⁰¹²³⁴⁵⁶⁷⁸⁹])[01](?=[xyz]\b|\([xyz])/;
const NEG_POWER = /(^|[^\w)^⁰¹²³⁴⁵⁶⁷⁸⁹])−\d+(\^|[⁰¹²³⁴⁵⁶⁷⁸⁹])/;
const DOUBLE_SIGN = /[+−\-·×]\s*[+−-]\s*[\w(√]/;
// x¹ and x⁰ are written x and 1, and a term worth nothing is left out, not
// worked as 0(−1). A product of two entries, (0)(5), is a step and stays.
const POWER_01 = /[)\w][⁰¹](?![⁰¹²³⁴⁵⁶⁷⁸⁹])/;
const ZERO_TERM = /(^|[\s+−-])0\(−?\d/;
// A fraction is written in lowest terms with its sign on top: never 1/−3,
// 1/1, 0/10 or 5/0, and a choice never offers 40/10 where 4 is meant.
const FRAC = /<span class="frac"><span>(−?\d+)<\/span><span>(−?\d+)<\/span><\/span>/g;
function fractionForm(raw, choice) {
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  for (const m of String(raw).matchAll(FRAC)) {
    const n = +m[1].replace('−', '-'), d = +m[2].replace('−', '-'), at = `${m[1]}/${m[2]}`;
    if (d === 0) return `a division by zero, ${at}`;
    if (d < 0) return `a minus sign under the line, ${at}`;
    if (d === 1) return `a fraction over 1, ${at}`;
    if (n === 0) return `a fraction worth 0, ${at}`;
    if (choice && gcd(n, d) > 1) return `a fraction not in lowest terms, ${at}`;
  }
  return null;
}
// A root is simplified unless the next step works it out: √25 = 5 is a step,
// but an answer of 3 ± i√4 is 3 ± 2i, and i√12 is 2i√3.
function rootForm(raw) {
  const text = String(raw).replace(/<\/?[a-z][^>]*>/gi, ' ');
  const sq = n => Number.isInteger(Math.sqrt(n));
  const factor = n => { for (let f = 2; f * f <= n; f++) if (n % (f * f) === 0) return true; return false; };
  for (const m of text.matchAll(/(i?)√(\d+)(?![\d²])(\s*=)?/g)) {
    const n = +m[2];
    if (n > 1 && sq(n) && !m[3]) return `a root of a perfect square left unworked, ${m[0].trim()}`;
    if (m[1] && factor(n)) return `a root that can be simplified, ${m[0].trim()}`;
  }
  return null;
}
function notation(key, where, html) {
  if (html == null) return;
  notationScanned++;
  const bad = fractionForm(html, /choice|answer/.test(where)) || rootForm(html);
  if (bad) {
    const tag = `${key}/${where.replace(/\d+/g, 'n')}/fraction`;
    if (!notationSeen.has(tag)) { notationSeen.add(tag); fail('notation', key, `${where} has ${bad}`); }
  }
  const text = String(html).replace(/<sup>/g, '^').replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  for (const [re, what] of [[DOUBLE_SIGN, 'two signs in a row'], [NEG_POWER, 'a negative number raised to a power without brackets'],
                            [UNIT_COEF, 'a coefficient of 1 or 0 written out'],
                            [POWER_01, 'a power of 1 or 0 written out'], [ZERO_TERM, 'a zero term written out']]) {
    const m = re.exec(text);
    if (!m) continue;
    const tag = `${key}/${where.replace(/\d+/g, 'n')}/${what}`;
    if (notationSeen.has(tag)) continue;
    notationSeen.add(tag);
    fail('notation', key, `${where} has ${what}: "…${text.slice(Math.max(0, m.index - 25), m.index + 12)}…"`);
  }
}

/* ------------------------------------------------------------- 1. structure */
let generated = 0, tagged = 0, wrongShown = 0, motesChecked = 0, figsChecked = 0, trailsChecked = 0, trailsCut = 0;

/* The trail beside a rite records each rung as one line. Its mathematics must
   arrive drawn, whole and unchanged (a matrix stripped of its markup reads
   column by column), its words must be the question's own from the start, and
   a long rung must be cut after a whole word. */
const plainT = h => String(h).replace(/<br\s*\/?>/g, ' ').replace(/<\/?[a-z][^>]*>/gi, '').replace(/\s+/g, ' ').trim();
// Its own reading of what counts as drawn mathematics, so that a change to the
// game's list cannot quietly agree with itself.
const DRAWN = /<span class="mtx">(?:<span class="col">(?:<span>[^<]*<\/span>)*<\/span>)*<\/span>|<span class="frac"><span>[^<]*<\/span><span>[^<]*<\/span><\/span>|<sup>[^<]*<\/sup>|<sub>[^<]*<\/sub>/g;
const TRAIL_MAX = 64;
function trailCheck(key, n, q) {
  const tr = trailQ(q), cut = tr.endsWith('…');
  trailsChecked++; if (cut) trailsCut++;
  const asked = q.match(new RegExp(DRAWN.source, 'g')) || [];
  const kept = tr.match(new RegExp(DRAWN.source, 'g')) || [];
  if (kept.some((x, i) => x !== asked[i])) fail('trail', key, `rung ${n} draws mathematics the question did not ask`);
  if (!cut && kept.length !== asked.length) fail('trail', key, `rung ${n} flattens its mathematics into plain text`);
  const opens = (tr.match(/<span\b/g) || []).length, shuts = (tr.match(/<\/span>/g) || []).length;
  if (opens !== shuts) fail('trail', key, `rung ${n} cuts through a drawn sum: ${tr}`);
  if (tr.replace(new RegExp(DRAWN.source, 'g'), '').includes('<')) fail('trail', key, `rung ${n} keeps markup that is not mathematics`);
  const p = plainT(tr).replace(/…$/, '').trim(), full = plainT(q);
  if (!full.startsWith(p)) fail('trail', key, `rung ${n} is not the question's own words: "${p}"`);
  else if (cut && /[A-Za-z]/.test(p.slice(-1)) && /[A-Za-z]/.test(full.charAt(p.length)))
    fail('trail', key, `rung ${n} is cut inside a word: "${p}…"`);
  if (!cut && p !== full) fail('trail', key, `rung ${n} lost words without saying so`);
  // Counted as read, a matrix's entries spaced apart, the way the game counts it.
  const read = plainT(tr.replace(new RegExp(DRAWN.source, 'g'), x => ' ' + x.replace(/<\/?[a-z][^>]*>/gi, ' ') + ' ')).replace(/…$/, '').trim();
  if (read.length > TRAIL_MAX) fail('trail', key, `rung ${n} reads ${read.length} characters, too long for its line`);
}
const seenComplexity = new Set(), figKeys = new Set(), figKinds = new Set();

/** Parse ⟨a, b⟩ out of a rendered answer, or null if it is not a 2-vector. */
function vecOf(html) {
  const m = String(html).replace(/<\/?[a-z][^>]*>/gi, '').match(/⟨\s*(−?-?\d+)\s*,\s*(−?-?\d+)\s*⟩/);
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
      // Every line the player reads, the working included, is written the way
      // a teacher would write it: never two signs in a row like "x − −3".
      notation(key, 'question', q.q);
      notation(key, 'working', q.ex);
      q.choices.forEach(c => notation(key, 'choice', c));
      Object.values(q.why).forEach(r => notation(key, 'reason', r));
      if (q.codex) notation(key, 'rule', q.codex.rule);

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
          trailCheck(key, n, m.q);
          notation(key, `mote ${n} question`, m.q);
          notation(key, `mote ${n} working`, m.ex);
          m.d.forEach(x => { if (Array.isArray(x)) notation(key, `mote ${n} reason`, x[1]); notation(key, `mote ${n} choice`, Array.isArray(x) ? x[0] : x); });
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
  return [...String(html).replace(/<\/?[a-z][^>]*>/gi, '')
    .matchAll(/⟨\s*(−?-?\d+)\s*,\s*(−?-?\d+)\s*⟩/g)]
    .map(m => [num(m[1]), num(m[2])]);
}
const vecOf1 = html => vecsOf(html)[0] || null;
/** Every ⟨…⟩ in a string, with any number of components. */
const vecsN = html => [...String(html).replace(/<\/?[a-z][^>]*>/gi, '')
  .matchAll(/⟨([^⟩]*)⟩/g)].map(m => m[1].split(',').map(num));
const dotN = (u, v) => u.reduce((t, x, i) => t + x * v[i], 0);
/** The arithmetic steps in a working ("4 + (−2) = 2", "−3·(−2) = 6",
    "(a)(b) + (c)(d) = e + f = g"): how many there are, or −1 if any is false. */
function workedTrue(ex) {
  const t = String(ex).replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/−/g, '-');
  let n = 0;
  for (const m of t.matchAll(/(-?\d+) \+ \(?(-?\d+)\)? = (-?\d+)/g)) {
    if (+m[1] + +m[2] !== +m[3]) return -1; n++; }
  for (const m of t.matchAll(/(-?\d+)·\(?(-?\d+)\)? = (-?\d+)/g)) {
    if (+m[1] * +m[2] !== +m[3]) return -1; n++; }
  for (const m of t.matchAll(/\((-?\d+)\)\((-?\d+)\) \+ \((-?\d+)\)\((-?\d+)\) = (-?\d+) \+ \(?(-?\d+)\)? = (-?\d+)/g)) {
    if (+m[1] * +m[2] !== +m[5] || +m[3] * +m[4] !== +m[6]) return -1; n++; }
  return n;
}
/** The cross product's working: three lines "(a)(b) − (c)(d) = p ± q = r", one per
    component in order, each crossing the other two slots of u and v, and true. */
function crossWorked(ex, u, v, s) {
  const t = String(ex).replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/−/g, '-');
  const lines = [...t.matchAll(/\((-?\d+)\)\((-?\d+)\) - \((-?\d+)\)\((-?\d+)\) = (-?\d+) ([+-]) (\d+) = (-?\d+)/g)];
  if (lines.length !== 3) return false;
  return [[1, 2], [2, 0], [0, 1]].every(([i, j], k) => {
    const m = lines[k].slice(1).map((x, n) => n === 5 ? x : +x);
    const q = m[5] === '+' ? -m[6] : m[6];
    return m[0] === u[i] && m[1] === v[j] && m[2] === u[j] && m[3] === v[i]
      && m[4] === u[i] * v[j] && q === u[j] * v[i] && m[7] === m[4] - q && m[7] === s[k];
  });
}
/** A matrix product's working: one line per entry, in reading order, each
    "(a)(b) + (c)(d) = p ± q = r" taking the right row and column, and true. */
function entriesWorked(ex, A, B, C) {
  const t = String(ex).replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/−/g, '-');
  const lines = [...t.matchAll(/row (\d) · column (\d): \((-?\d+)\)\((-?\d+)\) \+ \((-?\d+)\)\((-?\d+)\) = (-?\d+) ([+-]) (\d+) = (-?\d+)/g)];
  if (lines.length !== 4) return false;
  return [[0, 0], [0, 1], [1, 0], [1, 1]].every(([i, j], k) => {
    const m = lines[k].slice(1).map((x, n) => n === 7 ? x : +x);
    const q = m[7] === '-' ? -m[8] : m[8];
    return m[0] === i + 1 && m[1] === j + 1
      && m[2] === A[i][0] && m[3] === B[0][j] && m[4] === A[i][1] && m[5] === B[1][j]
      && m[6] === A[i][0] * B[0][j] && q === A[i][1] * B[1][j] && m[9] === m[6] + q && m[9] === C[i][j];
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
  matMul: p => { const [A, B] = mats(p.q), [C] = mats(p.a); return same(mm(A, B, 2), C) && entriesWorked(p.ex, A, B, C); },
  det2:   p => det2(mats(p.q)[0]) === num(p.a),
  det3:   p => det3(mats(p.q)[0]) === num(p.a),
  trace:  p => { const M = mats(p.q)[0]; return M[0][0] + M[1][1] === num(p.a); },
  transpose: p => { const [M] = mats(p.q), [T] = mats(p.a);
                    return same(T, [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]); },
  matVec: p => { const [A, v] = mats(p.q), [s] = mats(p.a);
                 return same([[A[0][0] * v[0][0] + A[0][1] * v[1][0]],
                              [A[1][0] * v[0][0] + A[1][1] * v[1][0]]], s); },
  // The inverse is displayed as n/k times a matrix (or the matrix alone when
  // the determinant is ±1), so verify A · (n/k)B = I, read as n·(A·B) = k·I.
  inv2:   p => { const M = mats(p.q)[0], B = mats(p.a)[0];
                 const f = String(p.a).match(/<span class="frac"><span>(−?\d+)<\/span><span>(−?\d+)<\/span><\/span>/);
                 const [n, k] = f ? [+f[1].replace('−', '-'), +f[2].replace('−', '-')] : [1, 1];
                 return same(mm(M, B, 2).map(r => r.map(v => n * v)), [[k, 0], [0, k]]); },

  /* --- The first realm, and the yes/no and root-set answers. Each is checked
     against what the answer has to satisfy, not against the generator's sum. --- */
  vecAdd:   p => { const [u, v] = vecsN(p.q), [s] = vecsN(p.a);
                   return same(s, u.map((x, i) => x + v[i])) && workedTrue(p.ex) >= 2; },
  vecScale: p => { const c = num(p.q.match(/^(−?\d+) ·/)[1]), [v] = vecsN(p.q), [s] = vecsN(p.a);
                   return c !== 1 && same(s, v.map(x => c * x)) && workedTrue(p.ex) >= 2; },
  vecCombo: p => { const [u, v] = vecsN(p.q), [s] = vecsN(p.a);
                   const m = p.q.replace(/<\/?[a-z][^>]*>/gi, ' ').match(/(\d+)u − (\d+)v = \?/);
                   return !!m && same(s, u.map((x, i) => +m[1] * x - +m[2] * v[i])); },
  dot:      p => { const [u, v] = vecsN(p.q);
                   return num(p.a) === dotN(u, v) && workedTrue(p.ex) >= 2; },
  // A length squared is the sum of the squared components (Pythagoras).
  mag:      p => { const [v] = vecsN(p.q), L = num(p.a);
                   return L > 0 && L * L === dotN(v, v); },
  // Perpendicular means some quarter turn of u lies along v.
  orth:     p => { const [u, v] = vecsN(p.q.replace(/<\/?[a-z][^>]*>/gi, ' '));
                   const turned = [-u[1], u[0]];
                   const along = turned[0] * v[1] - turned[1] * v[0] === 0;
                   return /^(Yes|No) /.test(p.a) && (p.a.startsWith('Yes') === along); },
  // u × v is pinned down by three facts: it is at right angles to u and to v,
  // its length squared is ‖u‖²‖v‖² − (u·v)² (Lagrange), and u, v, u × v
  // turn the right-handed way, so det[u; v; u × v] = ‖u × v‖² ≥ 0.
  cross:    p => { const [u, v] = vecsN(p.q), [s] = vecsN(p.a);
                   if (!s || s.length !== 3) return false;
                   return dotN(s, u) === 0 && dotN(s, v) === 0
                     && dotN(s, s) === dotN(u, u) * dotN(v, v) - dotN(u, v) ** 2
                     && det3([u, v, s]) === dotN(s, s) && crossWorked(p.ex, u, v, s); },
  // Dependent exactly when column 2 is k × column 1 (every entry here is nonzero,
  // so k = col2[0] / col1[0], tested without division).
  rank:     p => { const M = mats(p.q)[0];
                   const multiple = M[0][1] * M[1][0] === M[1][1] * M[0][0];
                   return /^(Yes|No) /.test(p.a) && (p.a.startsWith('Yes') === !multiple); },
  // Each eigenvalue makes A − λI singular, and the two add up to the trace.
  eigen2:   p => { const A = mats(p.q)[0];
                   const L = [...p.a.matchAll(/−?\d+/g)].map(m => num(m[0]));
                   return L.length === 2 && L[0] < L[1]
                     && L.every(l => det2([[A[0][0] - l, A[0][1]], [A[1][0], A[1][1] - l]]) === 0)
                     && L[0] + L[1] === A[0][0] + A[1][1]; },
  // f′ is zero at each answer, and nowhere else between −10 and 10.
  critical: p => { const fp = compile(p.q.match(/f′\(x\) = (.*?)<br>/)[1]);
                   const xs = [...p.a.matchAll(/x = (−?\d+)/g)].map(m => num(m[1]));
                   if (!fp || xs.length !== 2) return false;
                   const zeros = []; for (let x = -10; x <= 10; x++) if (Math.abs(fp({ x })) < 1e-9) zeros.push(x);
                   return same(zeros, xs); },

  /* --- Spectral Reach --- */

  // λ is just a variable: swap it for x and evaluate both sides.
  charPoly: p => {
    const M = mats(p.q)[0], tr = M[0][0] + M[1][1], dt = det2(M);
    const f = compile(String(p.a).replace(/λ/g, 'x'));
    algebraChecks += 4;
    // The working subtracts λ from this matrix's own diagonal, not from a and d.
    const n = v => String(v).replace('-', '−');
    const ex = String(p.ex).replace(/<\/?[a-z][^>]*>/gi, ' ');
    if (!ex.includes(`(${n(M[0][0])} − λ)(${n(M[1][1])} − λ)`) || /[ad]−λ/.test(ex)) return false;
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
    // A cosine rounded to two places is written ≈; one that is exact is =.
    const shown = String(p.ex).replace(/<\/?[a-z][^>]*>/gi, ' ').match(/cos θ = [^=≈]*\) ([=≈]) (−?\d+\.\d\d)/);
    if (!shown || +shown[2].replace('−', '-') !== Math.round(cos * 100) / 100
        || (shown[1] === '=') !== (Math.abs(cos * 100 - Math.round(cos * 100)) < 1e-9)) return false;
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

/* A determinant's working has to say what the number does, worked out here
   from the matrix the player was shown: its size is the new area (2×2) or
   volume (3×3), a negative one turns the shape over, and zero presses it flat.
   The 2×2 answer figure's caption says the same. */
let detMeaning = 0;
for (const [key, unit, size, det] of [['det2', 'square', 'area', det2], ['det3', 'cube', 'volume', det3]]) {
  for (let i = 0; i < REPS * 3; i++) {
    const p = GEN[key](2), D = det(mats(p.q)[0]);
    detMeaning++;
    const ex = p.ex.replace(/<\/?[a-z][^>]*>/gi, ''), at = ex.indexOf(`unit ${unit}`);
    if (at < 0) { fail('meaning', key, `working never says what ${p.q} does to the unit ${unit}`); continue; }
    const says = ex.slice(at);
    const tell = (txt, where) => {
      if (D === 0) {
        if (!/flat/.test(txt) || !new RegExp(`${size}( becomes)? 0\\b`).test(txt))
          fail('meaning', key, `${where} for determinant 0 should say the ${unit} is pressed flat: ${txt}`);
        return;
      }
      if (!new RegExp(`${size} ${Math.abs(D)}\\b`).test(txt))
        fail('meaning', key, `${where} gives the wrong ${size} for determinant ${D}: ${txt}`);
      if (/flipped/.test(txt) !== (D < 0))
        fail('meaning', key, `${where} gets the flip wrong for determinant ${D}: ${txt}`);
      if (/flat/.test(txt)) fail('meaning', key, `${where} calls determinant ${D} flat: ${txt}`);
    };
    tell(says, 'working');
    if (key === 'det2') tell(p.figAnswer.caption, 'answer caption');
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

// A value worked by hand: "f′(−3) = 6(−3) + 7 = −18 + 7 = −11". The term values
// before the answer must add up to it, and the substitution must be shown.
function workedSum(key, ex, a) {
  const m = flat(ex).match(/f′\(−?\d+\) = ([^.]*?) = (−?\d+)\.(?:\s|$)/);
  analysisChecks++;
  if (!m) { fail('analysis', key, `no worked substitution in: ${flat(ex)}`); return; }
  const steps = m[1].split(' = ');
  if (!/\(−?\d+\)/.test(steps[0])) fail('analysis', key, `the number is never put in: ${m[0]}`);
  const vals = steps[steps.length - 1];
  if (steps.length > 1 || !/\(/.test(vals)) {
    const terms = vals.replace(/−\s*/g, '-').replace(/\+\s*/g, '').split(/\s+/).map(Number);
    const sum = terms.reduce((x, y) => x + y, 0);
    if (terms.some(isNaN) || String(sum).replace('-', '−') !== String(a) || m[2] !== String(a))
      fail('analysis', key, `the worked values ${vals} do not add up to ${a}`);
  }
}
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
                      valueCheck('evalDeriv', ddx(f, 'x', { x: at }), p.a, 5e-4);
                      workedSum('evalDeriv', p.ex, p.a); },
  tangent:     p => { const f = compile(fnLine(p.q));
                      const at = parseFloat(p.q.match(/at x = (.*?)\?/)[1].replace('−', '-'));
                      valueCheck('tangent', ddx(f, 'x', { x: at }), p.a, 5e-4);
                      workedSum('tangent', p.ex, p.a); },
  limPoly:     p => { const f = compile(parens(p.q.replace(/^lim<sub>.*?<\/sub>\s*/, '')));
                      const at = parseFloat(p.q.match(/x→(.*?)<\/sub>/)[1].replace('−', '-'));
                      valueCheck('limPoly', f({ x: at }), p.a);
                      // The working is the hand calculation: the number put in for x, then
                      // the value of each term, which add up to the answer. No term worth 0.
                      const work = flat(p.ex).match(/plug in x = [^:]*: (.*?)\. Substitution/);
                      if (!work) { fail('analysis', 'limPoly', `no worked substitution in: ${flat(p.ex)}`); return; }
                      const steps = work[1].split(' = ');
                      analysisChecks++;
                      if (/(^|[+−] )0( |$)/.test(steps[0])) fail('analysis', 'limPoly', `a term worth 0 is worked out: ${work[1]}`);
                      if (steps.length > 2) {
                        const terms = steps[steps.length - 2].replace(/−\s*/g, '-').replace(/\+\s*/g, '').split(/\s+/).map(Number);
                        const sum = terms.reduce((x, y) => x + y, 0);
                        if (terms.some(isNaN) || String(sum).replace('-', '−') !== String(p.a))
                          fail('analysis', 'limPoly', `the term values ${steps[steps.length - 2]} do not add up to ${p.a}`);
                      } },
  // u·v / ‖v‖ worked from the two vectors in the riddle.
  proj:        p => { const vs = [...flat(p.q).matchAll(/⟨(−?\d+), (−?\d+)⟩/g)].map(m => [+m[1].replace('−', '-'), +m[2].replace('−', '-')]);
                      if (vs.length < 2) { fail('analysis', 'proj', `cannot read the vectors in: ${flat(p.q)}`); return; }
                      const [u, v] = vs;
                      valueCheck('proj', (u[0] * v[0] + u[1] * v[1]) / Math.hypot(v[0], v[1]), p.a); },
  // The worked solution is a hand elimination: a stated combination of the two
  // equations that really cancels x, the y equation it leaves, and y put back
  // into the first equation. Each number is recomputed from the riddle itself.
  solve2:      p => { const num = t => +t.replace('−', '-');
                      const coef = (sg, d) => (sg === '−' ? -1 : 1) * (d === '' ? 1 : +d);
                      const eqs = flat(p.q.replace(/<br>/g, '\n')).split('\n').map(l => {
                        const m = l.trim().match(/^(−?)(\d*)x ([+−]) (\d*)y = (−?\d+)$/);
                        return m && [coef(m[1], m[2]), coef(m[3], m[4]), num(m[5])]; });
                      const ans = flat(p.a).match(/x = (−?\d+), y = (−?\d+)/);
                      const ex = flat(p.ex);
                      analysisChecks++;
                      if (!eqs[0] || !eqs[1] || !ans) { fail('analysis', 'solve2', `cannot read: ${flat(p.q)} / ${flat(p.a)}`); return; }
                      const [X, Y] = [num(ans[1]), num(ans[2])];
                      for (const [u, v, w] of eqs) if (u * X + v * Y !== w) fail('analysis', 'solve2', `the answer does not satisfy ${u}x + ${v}y = ${w}`);
                      let l1, l2, m;
                      if (/Add the two equations/.test(ex)) [l1, l2] = [1, 1];
                      else if (/Subtract the first equation from the second/.test(ex)) [l1, l2] = [-1, 1];
                      else if ((m = ex.match(/(Add|Subtract) (\d+)× the (first|second) equation (to|from) the (first|second)/))) {
                        const k = (m[1] === 'Add' ? 1 : -1) * +m[2];
                        [l1, l2] = m[3] === 'first' ? [k, 1] : [1, k]; }
                      else if ((m = ex.match(/Multiply the first equation by (−?\d+) and the second by (−?\d+), then subtract/)))
                        [l1, l2] = [num(m[1]), -num(m[2])];
                      if (l1 === undefined) { fail('analysis', 'solve2', `no elimination step in: ${ex}`); return; }
                      const comb = [0, 1, 2].map(i => l1 * eqs[0][i] + l2 * eqs[1][i]);
                      if (comb[0] !== 0) fail('analysis', 'solve2', `the stated step leaves ${comb[0]}x: ${ex}`);
                      const ym = ex.match(/the x terms cancel and (−?\d*)y = (−?\d+)/);
                      if (!ym || coef(ym[1][0] === '−' ? '−' : '', ym[1].replace('−', '')) !== comb[1] || num(ym[2]) !== comb[2])
                        fail('analysis', 'solve2', `the y equation shown is not ${comb[1]}y = ${comb[2]}: ${ex}`);
                      const xm = ex.match(/first equation: (−?\d*)x ([+−]) (\d+) = (−?\d+)/);
                      if (!xm || coef(xm[1][0] === '−' ? '−' : '', xm[1].replace('−', '')) !== eqs[0][0]
                          || coef(xm[2], xm[3]) !== eqs[0][1] * Y || num(xm[4]) !== eqs[0][2])
                        fail('analysis', 'solve2', `putting y = ${Y} into the first equation is not shown right: ${ex}`);
                      if (!new RegExp(`x = ${ans[1]}\\.`).test(ex)) fail('analysis', 'solve2', `the worked solution does not end on x = ${ans[1]}`);
                      covered.add('solve2'); },
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
const flat = s => String(s).replace(/<\/?[a-z][^>]*>/gi, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => String(SUPS.indexOf(c)));
/** An expression lifted out of a sentence, without the sentence's full stop. */
const expr = s => String(s).replace(/\.\s*$/, '');

Object.assign(ANALYSIS, {
  // Differentiate the curve itself — y(x) = √((c − ax²)/b) — and compare.
  implicitDiff: p => {
    const m = p.q.replace(/<\/?[a-z][^>]*>/gi, '').match(/^(\d*)x² \+ (\d*)y² = (\d+)/);
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
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
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
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
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
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
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
    const m = p.q.replace(/<\/?[a-z][^>]*>/gi, '').match(/arc(sin|cos|tan)\((\d+)x\)/);
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
    const k = +(p.q.replace(/<\/?[a-z][^>]*>/gi, '').match(/x(\d*)x/) || [0, ''])[1] || 1;
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
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
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
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
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
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
    const [[n, b]] = nums(flat(p.q), /y = x(\d) on \[0, (\d+)\]/g);
    const want = simpson(({ x }) => Math.pow(x, n), 0, b) / b;
    valueCheck('avgValue', want, p.a, 1e-6);
  },

  volRev: p => {
    const t = p.q.replace(/<\/?[a-z][^>]*>/gi, '');
    const m = flat(p.q).match(/y = x(\d?) on \[0, (\d+)\]/);
    const n = m[1] === '' ? 1 : +m[1], b = +m[2];
    const want = Math.PI * simpson(({ x }) => Math.pow(x, 2 * n), 0, b);
    valueCheck('volRev', want, String(p.a).replace(/π/g, 'pi'), 1e-6);
  },

  // The stated integral must actually equal the limit of the sum.
  riemannToInt: p => {
    const k = +(flat(p.q).match(/in\)(\d?)/)[1] || 1);   // a power of 1 is not written
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
  // encode/decode reach for the game's data tables and Game.fresh(), so pull
  // those in too and stub Game — that lets a whole knight round-trip here, not
  // just base32. arr() grabs a `const NAME = [ … ];` array whose entries may
  // themselves contain `];`, by anchoring on the closer on its own line.
  const arr = a => { const i = script.indexOf(a); return script.slice(i, script.indexOf('\n];', i) + 3); };
  const out = {};
  try {
    new Function('exports',
      script.slice(0, script.indexOf('/* ------------------------------ topic metadata')) +
      cut('const TOPIC_LABEL', 'const STRANDS') +
      cut('const WEAPONS =', 'const B32 =') +
      arr('const TITLES = [') + ';' +
      arr('const BOUNTY_KINDS = [') + ';' +
      // The codec writes a depth record per setting, and the ORDER of those is
      // its own list precisely so that it can be lifted in here without the
      // eight tables of foe curves that SETTINGS itself drags along.
      arr('const SETTING_ORDER = [') + ';' +
      cut('const B32 =', 'const Profiles = {') +
      ';var Game={fresh:()=>({topicStats:{}})};' +
      'exports.Codec=Codec;exports.QR=QR;exports.TOPIC_LABEL=TOPIC_LABEL;' +
      'exports.CRESTS=CRESTS;exports.CREST_COLS=CREST_COLS;exports.REALMS=REALMS;' +
      'exports.SETTING_ORDER=SETTING_ORDER;')(out);
  } catch (e) {
    return fail('codes', 'load', `could not load the codec: ${e.message}`);
  }
  const { Codec, QR, TOPIC_LABEL, CRESTS, CREST_COLS, REALMS, SETTING_ORDER } = out;

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

  /* 2b. A whole knight has to survive encode → decode → re-encode unchanged,
         or a save could corrupt on export/import with nothing to catch it. The
         codec is lossy by design — mastery is quantised — so the property is a
         fixpoint: once a save has been through the codec, encoding it again is
         byte-for-byte identical. The write counter (`rev`, added for the
         newest-wins referee) and the fields a player would notice must come
         back exactly, and codes from the previous format must still read. */
  const RT_T = Object.keys(TOPIC_LABEL);
  let rs = 987654321;
  const rr = n => (rs = (rs * 1103515245 + 12345) & 0x7fffffff) % n;
  const NOW = 1734500000000;
  let rtBad = 0;
  for (let trial = 0; trial < 40 && !rtBad; trial++) {
    const k = { nm: 'Knight ' + trial, crest: CRESTS[rr(CRESTS.length)], col: CREST_COLS[rr(CREST_COLS.length)] };
    const g = {
      lvl: rr(30) + 1, maxHp: 100 + rr(200), hp: 1 + rr(99), gold: rr(99999), xp: rr(5000),
      qCount: rr(600), arenaBest: rr(40), realm: rr(6), rev: rr(9999),
      stats: { wins: rr(300), correct: rr(2000), wrong: rr(500), best: rr(20) },
      weapon: 'w0', armor: 'a0', owned: { w0: 1, a0: 1 },
      items: { potion: rr(9), insight: rr(9), rage: rr(9), feather: rr(9), pick: rr(9) },
      cleared: {}, titles: {}, streak: { days: rr(60), last: '2026-8-' + (1 + rr(28)) },
      daily: null, bounties: [], riteWins: {}, topicStats: {}
    };
    REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => { if (rr(4) === 0) g.cleared[ri + ':' + fi] = 1; }));
    for (let i = 0; i < RT_T.length; i++) if (rr(3) === 0)
      g.topicStats[RT_T[i]] = { w: rr(10), m: rr(1000) / 1000, seen: 1 + rr(40), last: rr(600), t: NOW - rr(20) * 864e5 };

    // Fidelity: the fields a player would notice, and the write counter, must
    // survive the first pass exactly. Stability: the codec quantises, so the
    // first pass may normalise un-gridded inputs — but from then on it is a
    // fixpoint, so a second and third pass must be byte-for-byte identical.
    const c1 = Codec.encode(k, g, NOW);
    if (c1.indexOf(Codec.TAG) !== 0) { fail('codes', 'roundtrip', `trial ${trial}: encode did not tag the code`); rtBad = 1; break; }
    const d1 = Codec.decode(c1);
    if (!d1.ok) { fail('codes', 'roundtrip', `trial ${trial}: a fresh code would not decode (${d1.why})`); rtBad = 1; break; }
    for (const f of ['lvl', 'maxHp', 'gold', 'xp', 'qCount', 'arenaBest', 'realm', 'rev'])
      if (d1.g[f] !== g[f]) { fail('codes', 'roundtrip', `trial ${trial}: ${f} changed (${g[f]} → ${d1.g[f]})`); rtBad = 1; break; }
    if (rtBad) break;
    if (Object.keys(d1.g.cleared).length !== Object.keys(g.cleared).length) {
      fail('codes', 'roundtrip', `trial ${trial}: cleared count changed`); rtBad = 1; break;
    }
    const c2 = Codec.encode(k, d1.g, NOW), d2 = Codec.decode(c2);
    if (!d2.ok) { fail('codes', 'roundtrip', `trial ${trial}: a re-encoded code would not decode (${d2.why})`); rtBad = 1; break; }
    const c3 = Codec.encode(k, d2.g, NOW);
    if (c2 !== c3) { fail('codes', 'roundtrip', `trial ${trial}: the codec did not reach a fixpoint`); rtBad = 1; break; }
  }

  /* A code written by the previous format (v1, before the write counter) must
     still import, with the counter defaulting to zero — pinned from a real v1
     code so a regression in backward compatibility is caught. */
  const V1 = 'KE1-AFICVDNUDVRJWS4RAKRSXG5DXMVWGYNAPDABMCWANLQDQQBA4AQWWUASOCIKBGACAAAAACAGAIAAIEAJQCIAQAEABAAIACAAQANYAACA6DQAAAENESJESJESJESJESJAAGNKAAJEBSBJIABEQENDVAAESAIVEUAASIAFD2QACJAM6MKAAJEBB25IABEQCMKFAAESAAR4UAASIDEXCQACJAI4ZKAAJEARUNIABEQALQVAAESAYOWUAASICEKCQACJAE3GKAAJEABOBIABEQGKWVAAESAR6WUAASIBD5KQACJAAZSKAAJEBRHVIABEQEJ5FAAESAJ3OUAAQNCF';
  const dv1 = Codec.decode(V1);
  if (!dv1.ok) fail('codes', 'compat', `a v1 code no longer decodes (${dv1.why})`);
  else if (dv1.g.rev !== 0) fail('codes', 'compat', `a v1 code decoded with rev ${dv1.g.rev}, expected 0`);
  else if (dv1.g.lvl !== 7) fail('codes', 'compat', `a v1 code decoded with lvl ${dv1.g.lvl}, expected 7`);

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

  /* 4b. That 1024 is an assumption about how large a real save gets, and every
         new item or topic pushes on it. So measure a real one rather than trust
         the assumption: a knight who has met every topic, owns every piece of
         gear, has cleared every foe, and has two thousand attempts on each of
         the seventy topics — every one of them WRONG, which is the shape that
         encodes largest, since `w` is stored and `c` is derived.

         That is roughly 140,000 questions answered, far past any real player,
         and it still lands on version 19 with a version to spare. The format
         holds this flat for an enormous range because the per-topic recency
         fields are capped at a byte each; the only unbounded parts are the two
         attempt varints, which widen from two bytes to three at 4,096 attempts
         on a single topic (about 287,000 questions answered). If a future field
         pushes the common case up a version, this is the test that says so. */
  const HEAVY = 2000;
  const maxG = {
    lvl: 99, maxHp: 9999, hp: 9999, gold: 9999999, xp: 999999,
    qCount: HEAVY * Object.keys(TOPIC_LABEL).length,
    arenaBest: 999, realm: REALMS.length - 1, rev: 999999,
    stats: { wins: 99999, correct: 999999, wrong: 999999, best: 999 },
    weapon: 'w0', armor: 'a0', owned: {}, items: {},
    cleared: {}, titles: {}, streak: { days: 9999, last: '2026-12-31' },
    daily: null, bounties: [], riteWins: {}, topicStats: {}
  };
  for (const it of Codec.items()) maxG.items[it] = 999;
  REALMS.forEach((r, ri) => r.foes.forEach((f, fi) => { maxG.cleared[ri + ':' + fi] = 1; }));
  for (const k of Object.keys(TOPIC_LABEL))
    maxG.topicStats[k] = { c: 0, w: HEAVY, m: 0.999, seen: HEAVY, last: 0, t: NOW - 900 * 864e5 };
  /* Depth records, at a depth nobody will reach, for every setting the design
     calls for rather than every setting built so far — eight, per the Skill
     Web. Measuring the ceiling against what exists today would let the four
     settings still to come arrive as a surprise. */
  const PLANNED_SETTINGS = 8;
  maxG.bests = {};
  SETTING_ORDER.forEach(k => { maxG.bests[k] = 9999; });
  const settingSlack = (PLANNED_SETTINGS - SETTING_ORDER.length) * 2;   // bytes, at 2 per varint
  const maxCode = Codec.encode({ nm: 'Maximilian the Unabbreviated', crest: CRESTS[0], col: CREST_COLS[0] }, maxG, NOW);
  const maxDec = Codec.decode(maxCode);
  if (!maxDec.ok) fail('codes', 'qr', `the heaviest realistic knight would not decode (${maxDec.why})`);
  else if (maxDec.g.lvl !== 99 || maxDec.g.gold !== 9999999)
    fail('codes', 'qr', 'the heaviest realistic knight did not survive its own round trip');
  /* What actually has to hold is that the code still fits a QR symbol loose
     enough to scan. The old test asserted 1024 characters instead, which was a
     stand-in for that and has now been overtaken: the heaviest knight passed it
     while the symbol it produces is version 19 of a permitted 20, with room to
     spare. So the character count is reported rather than asserted, and the
     version is asserted twice — once as the format stands, and once with the
     four settings still to be built already carrying depth records, so that
     the cliff arrives here rather than in somebody's camera. */
  const slackChars = Math.ceil(settingSlack * 8 / 5);      // base32: 5 bits a character
  const symbol = text => QR.matrix([{ mode: 'byte', data: Codec.utf8(URL_PREFIX) },
                                    { mode: 'alnum', text }]);
  const maxQR = symbol(maxCode);
  const grownQR = symbol(maxCode + 'A'.repeat(slackChars));
  if (!maxQR) fail('codes', 'qr', 'the heaviest realistic knight does not fit in any supported version');
  else if (maxQR.v > 20) fail('codes', 'qr', `the heaviest realistic knight needs version ${maxQR.v}, which is too dense to scan`);
  if (!grownQR || grownQR.v > 20)
    fail('codes', 'qr', `once the remaining ${PLANNED_SETTINGS - SETTING_ORDER.length} settings ` +
      `carry a depth record the heaviest knight needs version ${grownQR ? grownQR.v : '>40'}, ` +
      `which is too dense to scan — the format needs a field trimmed before then`);

  codeNotes = { topics: keys.length, sig: Codec.sig(), worst: big && big.size,
                maxChars: maxCode.length, maxSize: maxQR && maxQR.size, maxQ: maxG.qCount,
                maxV: maxQR && maxQR.v, grownV: grownQR && grownQR.v };
})();

/* --------------------------------------------------------------- workflows */
/* The deploy is part of the game: a merge is meant to go live as soon as its
   checks are green, with nobody watching. So the workflows are held to three
   things. Every action runs on a supported Node (GitHub retires old runtimes
   and an action pinned below the floor starts warning, then failing). Every
   branch is checked before it merges. And only main is ever published. */
const workflowNotes = (() => {
  const dir = path.join(__dirname, '..', '.github', 'workflows');
  // The oldest major of each action that runs on Node 24. An action missing
  // from this table fails too, so a new one is looked at before it is used.
  const FLOOR = { checkout: 5, 'setup-node': 5, cache: 5, 'upload-artifact': 6,
                  'download-artifact': 6, 'configure-pages': 6, 'upload-pages-artifact': 4,
                  'deploy-pages': 5 };
  let uses = 0;
  const files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f));
  const text = {};
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    text[f] = src;
    for (const m of src.matchAll(/^\s*-?\s*uses:\s*([\w.-]+)\/([\w.-]+)@(\S+)/gm)) {
      uses++;
      const [, owner, name, ref] = m;
      const where = `${owner}/${name}@${ref}`;
      if (owner !== 'actions') { fail('workflows', f, `${where} is a third-party action; pin it by SHA and add it here`); continue; }
      if (!(name in FLOOR)) { fail('workflows', f, `${where} has no Node floor on record`); continue; }
      const major = +(/^v(\d+)$/.exec(ref) || [])[1];
      if (!major) fail('workflows', f, `${where} is not pinned to a major version`);
      else if (major < FLOOR[name]) fail('workflows', f, `${where} runs on a retired Node; use v${FLOOR[name]} or later`);
    }
  }
  const pages = text['pages.yml'] || '';
  // Branches are checked: the push trigger is not limited to main.
  const on = (pages.match(/^on:\n([\s\S]*?)^\S/m) || [])[1] || '';
  if (!/^\s+push:/m.test(on)) fail('workflows', 'pages', 'pages.yml no longer runs on push');
  if (/push:\s*\n\s+branches:/.test(on)) fail('workflows', 'pages', 'pages.yml checks only some branches, so a change can merge unchecked');
  // Only main is published, and a deploy in progress is never cancelled.
  const job = name => (pages.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  \\w[\\w-]*:\\n|(?![\\s\\S]))`, 'm')) || [])[1] || '';
  for (const name of ['build', 'deploy']) {
    const body = job(name);
    if (!body) fail('workflows', 'pages', `pages.yml has no ${name} job`);
    else if (!/^    if: github\.ref == 'refs\/heads\/main'\s*$/m.test(body))
      fail('workflows', 'pages', `the ${name} job is not limited to main, so a branch could publish`);
  }
  // A deploy is only done when the live site reads back this commit.
  {
    const step = (job('deploy').match(/^      - name: Confirm the live site serves this build\n([\s\S]*?)(?=^      - |(?![\s\S]))/m) || [])[1];
    if (!step || !/build-info\.json/.test(step) || !/GITHUB_SHA/.test(step))
      fail('workflows', 'pages', 'the deploy never reads the live build stamp back, so a stale site can pass');
    else if (/^        if:/m.test(step) || /continue-on-error:\s*true/.test(step) || !/exit 1\s*$/.test(step))
      fail('workflows', 'pages', 'the live build stamp is read back but a mismatch cannot fail the deploy');
  }
  const conc = (pages.match(/^concurrency:\n([\s\S]*?)^\S/m) || [])[1] || '';
  if (!/cancel-in-progress:\s*\$\{\{\s*github\.ref != 'refs\/heads\/main'\s*\}\}/.test(conc))
    fail('workflows', 'pages', 'a deploy on main could be cancelled mid-publish');
  if (!/github\.ref == 'refs\/heads\/main' && 'pages'/.test(conc))
    fail('workflows', 'pages', 'main does not share one deploy group');
  return { files: files.length, uses };
})();

/* ------------------------------------------------------------ tile banks */
/* A vector or matrix answer is built from a bank of number tiles: every number
   in the answer, every number in the wrong answers, and near misses to make up
   six. The bank must not point at the answer. The easiest tell to fall into is
   making the near misses only around the answer's own numbers, which leaves
   those numbers sitting in the middle of little clusters — so a player who
   picks the most crowded tiles beats guessing without knowing any maths.

   This plays that strategy on thousands of banks and compares it with picking
   the same number of tiles at random. The bound is loose on purpose: some
   crowding is honest (small answers like ⟨0, 1⟩ live among small numbers), but
   a bank built around the answer alone lands well above it. */
const bankTell = (() => {
  const val = s => Number(String(s).replace('−', '-'));
  let n = 0, hits = 0, chance = 0;
  for (const key of Object.keys(GEN)) for (let d = 1; d <= 3; d++) for (let i = 0; i < 150; i++) {
    const q = buildQuestion(key, d);
    const sh = Build.shape(q.a);
    if (sh !== 'vec' && sh !== 'mtx') continue;
    const { nums } = Build.pieces(q.a);
    const tiles = Build.bank(nums, q.choices).map(val);
    const want = [...new Set(nums.map(val))];
    if (!want.every(w => tiles.includes(w))) fail('tiles', key, `the bank for ${q.a} is missing a number the answer needs`);
    const crowd = tiles.map(x => [x, tiles.filter(y => y !== x && Math.abs(y - x) <= 3).length])
      .sort((a, b) => b[1] - a[1]).slice(0, want.length).map(x => x[0]);
    n++;
    if (want.every(w => crowd.includes(w))) hits++;
    let ways = 1;
    for (let j = 0; j < want.length; j++) ways *= (tiles.length - j) / (want.length - j);
    chance += 1 / ways;
  }
  const ratio = hits / chance;
  if (ratio > 1.3)
    fail('tiles', 'bank', `picking the most crowded tiles finds the answer ${ratio.toFixed(2)}× as often as chance`);
  return { n, ratio };
})();

/* -------------------------------------------------------- find the slip */
/* A mastered topic is now and then asked from the other side: a squire's wrong
   answer, and which of three named mistakes made it. Asked of every topic at
   every difficulty: the three are this question's own diagnoses and all
   different, the one to pick is the diagnosis of the answer shown, the shown
   answer is wrong, no mistake quotes an answer on offer (that would hand the
   match over), and the verdict lays every mistake beside the answer it gives. */
const slipNotes = (() => {
  const plain = h => String(h).replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(('the a an and or of to in on is are be it its that this they them their you your not no with ' +
    'for by as at from than then into only one two any all has have was were would').split(' '));
  const words = h => new Set(plain(h).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, '')));
  const overlap = (a, b) => { const B = words(b); return [...words(a)].filter(w => B.has(w)).length; };
  let n = 0, echoChecked = 0;
  const topics = new Set();
  for (const key of Object.keys(GEN)) {
    for (let d = 1; d <= 3; d++) {
      for (let i = 0; i < Math.max(20, Math.round(REPS / 10)); i++) {
        const q = buildQuestion(key, d);
        const st = Slip.slipStep(q);
        if (!st) continue;
        n++; topics.add(key);
        const names = q.choices.filter(c => c !== q.a && q.why && q.why[c]).map(c => Slip.cap(q.why[c]));
        if (st._choices.length !== 3) fail('slip', key, `${st._choices.length} mistakes on offer, not 3`);
        if (new Set(st._choices).size !== st._choices.length) fail('slip', key, 'two mistakes on offer read the same');
        if (!st._choices.every(c => names.includes(c))) fail('slip', key, "a mistake on offer is not one of this question's own");
        if (st._choices.filter(c => c === st.a).length !== 1) fail('slip', key, 'the mistake to pick is not on offer exactly once');
        if (st.shown === q.a || !q.choices.includes(st.shown)) fail('slip', key, "the squire's answer is not one of the wrong answers");
        if (Slip.cap(q.why[st.shown]) !== st.a) fail('slip', key, 'the mistake to pick is not the one that gives the answer shown');
        for (const c of st._choices) for (const x of q.choices)
          if (Slip.quotes(c, x)) fail('slip', key, `"${plain(c).slice(0, 50)}" quotes the answer ${plain(x)}`);
        // The right mistake must not be the one that shares the most words
        // with the squire's answer, or it can be matched without working.
        const sc = st._choices.map(c => overlap(c, st.shown)), mine = sc[st._choices.indexOf(st.a)];
        if (mine > 0 && sc.every((v, j) => st._choices[j] === st.a || v < mine))
          fail('slip', key, `"${plain(st.a).slice(0, 50)}" echoes the squire's answer ${plain(st.shown)}`);
        echoChecked++;
        const tab = (st.ex.match(/<div class="sl( was)?">/g) || []).length;
        if (tab !== 3 || (st.ex.match(/class="sl was"/g) || []).length !== 1)
          fail('slip', key, `the verdict lays out ${tab} mistakes, not 3 with the squire's marked`);
        if (!st.ex.includes(q.a)) fail('slip', key, 'the verdict never says what it comes to done right');
        if (Object.keys(st.why).length || Object.keys(st._why).length) fail('slip', key, 'a wrong pick would be recorded as a slip of the knight\'s own');
      }
    }
  }
  if (topics.size < 60) fail('slip', 'coverage', `only ${topics.size} topics can be asked as find the slip`);
  if (echoChecked !== n) fail('slip', 'echo', 'not every question was checked for an echo');
  return { n, topics: topics.size };
})();

/* --------------------------------------------------------------- workshop */
/* Every matrix the workshop can be turned to, 9⁴ of them. Each direction it
   draws must really be kept (Av is λv, and v is not zero), the eigenvalues
   must be the roots of λ² − (trace)λ + det, "no direction" must mean a
   negative discriminant, and every goal must be makeable in range and true
   of the matrix the README names for it. */
const workshopNotes = (() => {
  const W = Workshop, made = {};
  let n = 0;
  for (let a = W.LO; a <= W.HI; a++) for (let b = W.LO; b <= W.HI; b++)
  for (let c = W.LO; c <= W.HI; c++) for (let d = W.LO; d <= W.HI; d++) {
    const M = [[a, b], [c, d]], key = `[[${a},${b}],[${c},${d}]]`, e = W.eig(M);
    n++;
    if (W.det(M) !== a * d - b * c) fail('workshop', key, 'determinant is not ad − bc');
    const t = a + d, D = a * d - b * c, disc = t * t - 4 * D;
    if ((e.kind === 'none') !== (disc < 0)) fail('workshop', key, `says ${e.kind} with discriminant ${disc}`);
    for (const l of e.L || [])
      if (Math.abs(l * l - t * l + D) > 1e-9) fail('workshop', key, `λ = ${l} is not a root of the characteristic polynomial`);
    if (e.kind === 'two' && !(e.L[0] < e.L[1])) fail('workshop', key, 'two directions with one eigenvalue');
    if (e.kind === 'one' && e.L.length !== 1) fail('workshop', key, `a repeated eigenvalue is listed ${e.L.length} times`);
    if (disc === 0 && !(b === 0 && c === 0) && e.kind !== 'one') fail('workshop', key, 'a repeated eigenvalue with one direction is not reported as one');
    (e.V || []).forEach((v, k) => {
      const l = e.L[k], Av = [a * v[0] + b * v[1], c * v[0] + d * v[1]];
      if (Math.hypot(v[0], v[1]) < 1e-9) fail('workshop', key, 'draws a zero direction');
      if (Math.abs(Av[0] - l * v[0]) > 1e-9 || Math.abs(Av[1] - l * v[1]) > 1e-9)
        fail('workshop', key, `the direction drawn for λ = ${l} is not kept`);
    });
    if (e.kind !== 'none' && e.kind !== 'all' && !(e.V && e.V.length === e.L.length))
      fail('workshop', key, 'an eigenvalue with no direction drawn');
    for (const g of W.GOALS) if (g.ok(M)) made[g.id] = (made[g.id] || 0) + 1;
  }
  for (const g of W.GOALS) if (!made[g.id]) fail('workshop', g.id, 'this goal cannot be made in range');
  const EXAMPLE = { stretch: [[2,0],[0,1]], swap: [[0,1],[1,0]], quarter: [[0,-1],[1,0]], flip: [[1,0],[0,-1]],
    shear: [[1,1],[0,1]], six: [[2,0],[0,3]], flat: [[1,2],[2,4]], scale: [[3,0],[0,3]], spin: [[0,-1],[1,0]] };
  for (const g of W.GOALS) {
    if (!EXAMPLE[g.id]) fail('workshop', g.id, 'no worked example to check it against');
    else if (!g.ok(EXAMPLE[g.id])) fail('workshop', g.id, 'is not true of its own example');
  }
  if (W.GOALS.find(g => g.id === 'stretch').ok([[1,0],[0,1]])) fail('workshop', 'stretch', 'the identity already counts');
  if (W.GOALS.find(g => g.id === 'flat').ok([[0,0],[0,0]])) fail('workshop', 'flat', 'the zero matrix counts as pressing flat');
  if (W.GOALS.find(g => g.id === 'shear').ok([[1,1],[1,1]])) fail('workshop', 'shear', 'a matrix leaning both ways counts as a shear');
  /* Match the shape: every target is a real puzzle. Its numbers sit on the
     grid's lines (−2 to 2), it is never flat (a flat shape hides where ĵ
     went) and never the identity the workshop starts on, and the next one
     is never the one just matched. A column is on its mark exactly when
     both its numbers are. */
  let targets = 0;
  for (let i = 0; i < REPS * 10; i++) {
    const prev = W.target(), T = W.target(prev), key = JSON.stringify(T);
    targets++;
    if (T.flat().some(v => v < -2 || v > 2 || !Number.isInteger(v))) fail('workshop', key, 'a target off the grid lines');
    if (W.det(T) === 0) fail('workshop', key, 'a flat target');
    if (key === '[[1,0],[0,1]]') fail('workshop', key, 'the identity as a target');
    if (key === JSON.stringify(prev)) fail('workshop', key, 'the same target twice running');
    const [ci, cj] = W.cols(T, T);
    if (!ci || !cj) fail('workshop', key, 'a shape is not on its own marks');
    const off = T.map(r => r.slice()); off[1][0] += 1;
    if (W.cols(off, T)[0] || !W.cols(off, T)[1]) fail('workshop', key, 'î is judged by more or less than the first column');
    const off2 = T.map(r => r.slice()); off2[0][1] -= 1;
    if (!W.cols(off2, T)[0] || W.cols(off2, T)[1]) fail('workshop', key, 'ĵ is judged by more or less than the second column');
  }
  return { n, goals: W.GOALS.length, targets };
})();

/* ---------------------------------------------------------- slope workshop */
/* Every state the slope workshop can be in: three curves, five points, five
   sizes of h, and both sides. Its derivative must be the true one (checked
   against a symmetric difference, not its own rule), its secant the slope
   through the two points drawn, and the working it prints must be true of
   the numbers it prints. At the closest h the secant must be within 0.01 of
   the derivative, or the sentence saying it has all but become the tangent
   would be false; both points must lie on the drawn plot; and each goal must
   be findable. */
const slopeNotes = (() => {
  const S = Slope, found = {}, unnum = t => +String(t).replace('−', '-');
  let n = 0;
  for (let ci = 0; ci < S.CURVES.length; ci++) for (let a = -2; a <= 2; a++)
  for (let hi = 0; hi < S.HS.length; hi++) for (const side of [1, -1]) {
    Object.assign(S, { ci, a, hi, side });
    const key = `${S.curve().name} a=${a} h=${S.h()}`, h = S.h(), F = x => figEval(S.curve().f, x);
    n++;
    const sym = (F(a + 1e-5) - F(a - 1e-5)) / 2e-5;
    if (Math.abs(S.dfa() - sym) > 1e-4) fail('slope', key, `f′(a) is ${S.dfa()}, the curve says ${sym}`);
    if (!Number.isInteger(S.dfa())) fail('slope', key, 'a derivative that is not a whole number');
    if (Math.abs(S.secant() - (F(a + h) - F(a)) / h) > 1e-9) fail('slope', key, 'the secant is not the slope through its two points');
    const fb = unnum(S.num(F(a + h))), fa = unnum(S.num(F(a))), hh = unnum(S.num(h)), m = unnum(S.num(S.secant()));
    if (Math.abs((fb - fa) / hh - m) > 1e-6) fail('slope', key, `the working (${fb} − ${fa}) / ${hh} does not give ${m}`);
    if (hh !== h) fail('slope', key, 'h is printed as something else');
    if (hi === S.HS.length - 1 && !(Math.abs(S.secant() - S.dfa()) < 0.01)) fail('slope', key, 'at the closest h the secant is still far from the tangent');
    if (Math.abs(a + h) > 3.1) fail('slope', key, 'the second point is off the plot');
    if (S.pn(-2) !== '(−2)' || S.pn(2) !== '2') fail('slope', 'pn', 'a negative is not bracketed in the working');
    for (const g of S.GOALS) if (g.ok(S)) found[g.id] = (found[g.id] || 0) + 1;
  }
  for (const g of S.GOALS) if (!found[g.id]) fail('slope', g.id, 'this goal cannot be found');
  Object.assign(S, { ci: 0, a: 1, hi: 0, side: 1 });
  if (S.GOALS.some(g => g.ok(S))) fail('slope', 'start', 'a goal is already met where the workshop opens');
  return { n, goals: S.GOALS.length };
})();

/* Every state the area workshop can be in: three curves, seven counts of
   rectangles and three places to take the height. The sum must be the true
   Riemann sum (worked here from the curve, not from its own rule), the gap
   it reports the true distance to an exact area that is itself checked
   against a fine sum, and the working it prints must be true of the numbers
   it prints: Δx, each height where they are listed, their total, and a
   printed = only where nothing was rounded. At 64 midpoint rectangles the
   sum must be within 0.01 of the integral, or the sentence that it closes
   in would be hollow; each goal must be findable, and none met before the
   player has turned anything. */
const areaNotes = (() => {
  const A = Area, found = {}, unnum = t => +String(t).replace(/[()]/g, '').replace('−', '-');
  let n = 0;
  for (let ci = 0; ci < A.CURVES.length; ci++) {
    const C = A.CURVES[ci], F = x => figEval(C.f, x);
    let fine = 0; const N = 200000, d = (C.b - C.a) / N;
    for (let i = 0; i < N; i++) fine += F(C.a + (i + 0.5) * d) * d;
    if (Math.abs(fine - C.exact) > 1e-6) fail('area', C.name, `the exact area ${C.exact} is not the integral (${fine})`);
    if (Math.abs(unnum(C.ex.split(/ [=≈] /).pop()) - C.exact) > 1e-4) fail('area', C.name, `it is printed as ${C.ex}`);
    for (let ni = 0; ni < A.NS.length; ni++) for (let ri = 0; ri < A.RULES.length; ri++) {
      Object.assign(A, { ci, ni, ri });
      const k = A.n(), w = (C.b - C.a) / k, off = [0, 0.5, 1][ri], key = `${C.name} n=${k} ${A.rule()}`;
      n++;
      let s = 0; for (let i = 0; i < k; i++) s += F(C.a + (i + off) * w);
      if (Math.abs(A.sum() - s * w) > 1e-9) fail('area', key, `the sum is ${A.sum()}, the rectangles give ${s * w}`);
      if (Math.abs(A.err() - (s * w - C.exact)) > 1e-9) fail('area', key, 'the gap is not the distance to the exact area');
      if (unnum(A.num(A.dx())) !== w || !A.exact(A.dx())) fail('area', key, `Δx is printed as ${A.num(A.dx())}`);
      if (k <= 4) {
        // the short working lists every height, so each must be printed whole
        const hs = A.heights();
        if (hs.some(h => !A.exact(h)) || !A.exact(A.total())) fail('area', key, 'a listed height is rounded');
        const tot = hs.reduce((t, h) => t + unnum(A.num(h)), 0);
        if (Math.abs(tot - unnum(A.num(A.total()))) > 1e-9) fail('area', key, 'the listed heights do not add to the total printed');
      }
      const printed = unnum(A.num(A.sum()));
      if (Math.abs(unnum(A.num(A.dx())) * A.total() - printed) > (A.exact(A.sum()) ? 1e-9 : 6e-5)) fail('area', key, 'Δx × total is not the sum printed');
      if (A.eq(A.sum()).startsWith('= ') && printed !== A.sum()) fail('area', key, 'a rounded sum is printed with =');
      if (ni === A.NS.length - 1 && ri === 1 && !(Math.abs(A.err()) < 0.01)) fail('area', key, 'at 64 midpoint rectangles the sum is still far from the area');
      for (const g of A.GOALS) if (g.ok(A)) found[g.id] = (found[g.id] || 0) + 1;
    }
  }
  if (A.pn(-2) !== '(−2)' || A.pn(2) !== '2') fail('area', 'pn', 'a negative is not bracketed in the working');
  for (const g of A.GOALS) if (!found[g.id]) fail('area', g.id, 'this goal cannot be found');
  if (A.touched !== false) fail('area', 'start', 'the workshop opens as if already turned');
  return { n, goals: A.GOALS.length };
})();

/* Every pair of arrows the dot product workshop can show: all four numbers
   from −4 to 4. Each line the player reads is read back here and checked
   against mathematics worked independently: the products and sum, both
   lengths from their squares, cos θ and the angle (from atan2, not acos),
   an exact = only where nothing was rounded, the verdict for the sign, and
   the shadow's length and direction. Each goal must be findable, and none
   met where the workshop opens. */
const dotNotes = (() => {
  const D = Dot, found = {}, num = s => +String(s).trim().replace(/−/g, '-');
  const evalExpr = e => Function(`return (${e.replace(/−/g, '-').replace(/·/g, '*')})`)();
  let n = 0;
  for (let a = D.LO; a <= D.HI; a++) for (let b = D.LO; b <= D.HI; b++)
  for (let c = D.LO; c <= D.HI; c++) for (let d = D.LO; d <= D.HI; d++) {
    D.u = [a, b]; D.v = [c, d]; n++;
    const key = `u=⟨${a},${b}⟩ v=⟨${c},${d}⟩`, dot = a * c + b * d, L = D.working();
    if (D.dot() !== dot) fail('dot', key, `u·v is ${D.dot()}, not ${dot}`);
    if (L.some(l => /[+−] −/.test(l))) fail('dot', key, 'a sum is written with a sign after a sign');
    const parts = L[0].replace(/\.$/, '').split(' = ').slice(2);
    if (parts.length !== 3 || parts.some(p => evalExpr(p) !== dot)) fail('dot', key, `the working ${L[0]} does not give ${dot}`);
    const nu = Math.hypot(a, b), nv = Math.hypot(c, d);
    if (!nu || !nv) {
      if (L.length !== 2 || !/no angle/.test(L[1])) fail('dot', key, 'a zero arrow is given an angle');
      continue;
    }
    const lens = [...L[1].matchAll(/√\((.*?)\) = √(\d+)(?: = (\d+))?/g)];
    [[a, b], [c, d]].forEach(([x, y], i) => {
      const m = lens[i], s = x * x + y * y;
      if (!m || evalExpr(m[1].replace(/²/g, '**2')) !== s || +m[2] !== s) fail('dot', key, `a length is worked wrongly: ${L[1]}`);
      else if (m[3] !== undefined && m[3] * m[3] !== s) fail('dot', key, `√${s} is printed as ${m[3]}`);
      else if (m[3] === undefined && Number.isInteger(Math.sqrt(s))) fail('dot', key, `√${s} is left unworked`);
    });
    const cm = L[2].match(/ ([=≈]) (−?[\d.]+), so θ ([=≈]) (\d+)°\.$/);
    const cos = dot / (nu * nv);
    const ang = Math.abs(Math.atan2(a * d - b * c, dot)) * 180 / Math.PI;
    if (!cm) { fail('dot', key, `the angle line does not read: ${L[2]}`); continue; }
    if (Math.abs(num(cm[2]) - cos) > (cm[1] === '=' ? 1e-9 : 6e-4)) fail('dot', key, `cos θ is printed as ${cm[2]}, it is ${cos}`);
    if (Math.abs(num(cm[4]) - ang) > (cm[3] === '=' ? 1e-9 : 0.5)) fail('dot', key, `θ is printed as ${cm[4]}°, it is ${ang}°`);
    if (cm[3] === '=' && num(cm[4]) % 45) fail('dot', key, 'an angle is printed as exact that is not');
    const sign = Math.sign(dot);
    if (!(sign > 0 ? /^Positive/ : sign < 0 ? /^Negative/ : /^Zero/).test(L[3])) fail('dot', key, `the verdict "${L[3]}" is for the wrong sign`);
    if (/exactly (along|against)/.test(L[3]) !== (a * d - b * c === 0 && dot !== 0)) fail('dot', key, 'parallel arrows are not named, or others are');
    if (dot) {
      const sm = L[4].match(/\|u·v\| \/ ‖v‖ = (\d+) \/ (√?\d+) ([=≈]) ([\d.]+) long/);
      if (!sm || +sm[1] !== Math.abs(dot) || Math.abs(num(sm[4]) - Math.abs(dot) / nv) > (sm[3] === '=' ? 1e-9 : 6e-3))
        fail('dot', key, `the shadow is measured wrongly: ${L[4]}`);
      if (/back against v/.test(L[4]) !== dot < 0) fail('dot', key, 'the shadow points the wrong way');
    }
    for (const g of D.GOALS) if (g.ok(D)) found[g.id] = (found[g.id] || 0) + 1;
    // the goals that name a direction are checked against the angle itself
    if (D.GOALS.find(g => g.id === 'opp').ok(D) !== (Math.abs(ang - 180) < 1e-9)) fail('dot', key, 'exactly opposite is judged wrongly');
    if (D.GOALS.find(g => g.id === 'perp').ok(D) !== (Math.abs(ang - 90) < 1e-9)) fail('dot', key, 'perpendicular is judged wrongly');
    if (D.GOALS.find(g => g.id === 'tilt').ok(D) !== (dot === 0 && !!(a && b && c && d))) fail('dot', key, 'a right angle with a 0 in it is counted as tilted');
  }
  for (const g of D.GOALS) if (!found[g.id]) fail('dot', g.id, 'this goal cannot be found');
  D.u = [...D.START.u]; D.v = [...D.START.v];
  if (D.GOALS.some(g => g.ok(D))) fail('dot', 'start', 'a goal is already met where the workshop opens');
  if (D.touched !== false) fail('dot', 'start', 'the workshop opens as if already turned');
  return { n, goals: D.GOALS.length };
})();

/* Every arrow the eigenvector hunt can point, on each of its four matrices.
   Each line the player reads is read back and checked against mathematics
   worked here: Av from the matrix, its two sums, whether v stays on its line
   (by the cross product), λ, the flip, and how far Av is knocked off (from
   acos, where the page uses atan2). Each goal must be findable, and none met
   where the hunt opens. */
const eigNotes = (() => {
  const E = Eigen, found = {};
  const evalExpr = e => Function(`return (${e.replace(/−/g, '-').replace(/·/g, '*')})`)();
  const num = s => +String(s).trim().replace(/−/g, '-');
  let n = 0;
  E.MATS.forEach((M, mi) => {
    const [[a, b], [c, d]] = M.m;
    for (let x = E.VLO; x <= E.VHI; x++) for (let y = E.VLO; y <= E.VHI; y++) {
      E.mi = mi; E.v = [x, y]; n++;
      const key = `${M.id} v=⟨${x},${y}⟩`, p = a * x + b * y, q = c * x + d * y, L = E.working();
      if (L.some(l => /[+−] −/.test(l))) fail('eigen', key, 'a sum is written with a sign after a sign');
      const m0 = L[0].match(/^Av = ⟨(.*), (.*)⟩ = ⟨(.*), (.*)⟩ = ⟨(.*), (.*)⟩\.$/);
      if (!m0 || evalExpr(m0[1]) !== p || evalExpr(m0[2]) !== q || evalExpr(m0[3]) !== p || evalExpr(m0[4]) !== q
          || num(m0[5]) !== p || num(m0[6]) !== q) { fail('eigen', key, `Av is worked wrongly: ${L[0]}`); continue; }
      if (!x && !y) {
        if (L.length !== 2 || !/never counted/.test(L[1]) || E.lambda() !== null) fail('eigen', key, 'the zero arrow is counted');
        continue;
      }
      const on = x * q - y * p === 0, lam = on ? (x ? p / x : q / y) : null;
      if (E.lambda() !== lam) fail('eigen', key, `λ is ${E.lambda()}, not ${lam}`);
      if (on) {
        const lm = L[1].match(/λ = (−?\d+)\.$/);
        if (!lm || num(lm[1]) !== lam) fail('eigen', key, `λ is printed wrongly: ${L[1]}`);
        if (/^Av = v:/.test(L[1]) !== (lam === 1)) fail('eigen', key, 'Av = v is claimed where it is not, or missed');
        if (/flipped/.test(L[1]) !== (lam < 0)) fail('eigen', key, 'the flip is named wrongly');
        if (L.length !== 3 || !/^Every arrow along this line/.test(L[2])) fail('eigen', key, 'the whole line is not named');
      } else {
        const om = L[1].match(/^Av is knocked (about )?(\d+)° off v's line, so v is not an eigenvector/);
        const cos = Math.abs(x * p + y * q) / (Math.hypot(x, y) * Math.hypot(p, q));
        const ang = Math.acos(Math.min(1, cos)) * 180 / Math.PI;
        if (!om) { fail('eigen', key, `the miss does not read: ${L[1]}`); continue; }
        if (Math.abs(+om[2] - ang) > 0.5) fail('eigen', key, `Av is ${ang}° off, printed ${om[2]}°`);
        if (!om[1] !== (Math.abs(ang - Math.round(ang)) < 1e-6)) fail('eigen', key, `"about" is wrong for ${ang}°`);
        if ((L.length === 3 && /quarter-turn/.test(L[2])) !== (mi === 3)) fail('eigen', key, 'the quarter-turn note is on the wrong matrix');
      }
      for (const g of E.GOALS) if (g.ok(E)) found[g.id] = (found[g.id] || 0) + 1;
      const gcd = (u, w) => w ? gcd(w, u % w) : Math.abs(u);
      if (E.GOALS.find(g => g.id === 'long').ok(E) !== (on && gcd(Math.abs(x), Math.abs(y)) > 1)) fail('eigen', key, 'a longer eigenvector is judged wrongly');
    }
  });
  for (const g of E.GOALS) if (!found[g.id]) fail('eigen', g.id, 'this goal cannot be found');
  if (E.MATS.slice(0, 3).some(M => { E.mi = E.MATS.indexOf(M); return ![...Array(25)].some((_, k) => { E.v = [k % 5 - 2, Math.floor(k / 5) - 2]; return E.lambda() !== null; }); }))
    fail('eigen', 'matrices', 'a matrix offered for hunting has no eigenvector in reach');
  E.mi = 0; E.v = [1, 0];
  if (E.GOALS.some(g => g.ok(E))) fail('eigen', 'start', 'a goal is already met where the hunt opens');
  if (E.touched !== false) fail('eigen', 'start', 'the hunt opens as if already turned');
  return { n, goals: E.GOALS.length };
})();

/* Every state of the Taylor workshop: each function, every highest power
   from 0 to 9, and every x it offers. The coefficients are worked here from
   the derivatives at 0 (eˣ's are all 1, sin's and cos's go round in fours),
   and each line the player reads is read back: the powers listed and their
   signs, every term shown and the count of those too small to show, the
   total with = only where nothing was rounded, the function's value, which
   side P falls and by how much, and the one note that fits. Each goal must be
   findable, and none met where the workshop opens. */
const taylorNotes = (() => {
  const T = Taylor, found = {}, num = s => +String(s).trim().replace(/−/g, '-');
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', fact = k => k ? k * fact(k - 1) : 1;
  const DER = { exp: [1, 1, 1, 1], sin: [0, 1, 0, -1], cos: [1, 0, -1, 0] };
  const F = { exp: Math.exp, sin: Math.sin, cos: Math.cos };
  const isExact = v => Math.abs(Math.round(v * 1e9) - v * 1e9) < 1e-3;
  let n = 0;
  T.CURVES.forEach((C, ci) => {
    const co = k => DER[C.id][k % 4] / fact(k);
    for (let deg = 0; deg <= T.NMAX; deg++) for (let xi = 0; xi < T.XS.length; xi++) {
      T.ci = ci; T.n = deg; T.xi = xi; n++;
      const x = T.XS[xi], key = `${C.id} n=${deg} x=${x}`, L = T.working();
      for (let k = 0; k <= T.NMAX; k++) if (Math.abs(T.c(k) - co(k)) > 1e-15) fail('taylor', key, `the x^${k} coefficient is ${T.c(k)}, not ${co(k)}`);
      const ks = [...Array(deg + 1).keys()].filter(k => co(k) !== 0);
      const vals = ks.map(k => co(k) * x ** k), P = vals.reduce((a, b) => a + b, 0), fx = F[C.id](x), err = P - fx;
      // the polynomial line: its powers, in order, with their signs
      const pm = L[1].match(/^P\S+\(x\) = (.*?)(, the series up to x([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\.|: .* has no constant term, so it starts at x\.)$/);
      if (!pm) { fail('taylor', key, `the polynomial does not read: ${L[1]}`); continue; }
      if (ks.length) {
        const terms = [...('+ ' + pm[1]).replace(/^\+ −/, '− ').matchAll(/([+−]) (1|x(?:([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\/(\d+)!)?)/g)];
        const got = terms.map(t => [t[2] === '1' ? 0 : t[3] ? [...t[3]].reduce((a, d) => a * 10 + SUP.indexOf(d), 0) : 1, t[1], t[4]]);
        if (got.length !== ks.length || got.some(([k, sg, f], i) => k !== ks[i] || (sg === '−') !== (co(k) < 0) || (f !== undefined && +f !== k)))
          fail('taylor', key, `the polynomial lists the wrong powers or signs: ${L[1]}`);
        if (pm[3] !== [...String(deg)].map(d => SUP[d]).join('')) fail('taylor', key, 'the highest power is named wrongly');
      } else if (!/no constant term/.test(pm[2])) fail('taylor', key, 'an empty polynomial is not explained');
      // the value line
      let li = 2;
      if (ks.length) {
        const vl = L[li++].replace(/\.$/, ''), tm = vl.match(/ ([=≈]) (−?[\d.]+)$/);
        const shownI = vals.map((v, i) => i).filter(i => isExact(vals[i]) || Math.abs(vals[i]) >= 0.00005);
        const allExact = vals.every(isExact);
        if (!tm) { fail('taylor', key, `the value line does not read: ${vl}`); continue; }
        if ((tm[1] === '=') !== allExact) fail('taylor', key, 'the total is marked = or ≈ wrongly');
        if (Math.abs(num(tm[2]) - P) > (allExact ? 1e-9 : 5.1e-5)) fail('taylor', key, `P is printed as ${tm[2]}, it is ${P}`);
        const body = vl.slice(vl.indexOf(') = ') + 4, vl.length - tm[0].length);
        const hm = body.match(/ \+ \((\d+) more terms?, each under 0\.0001\)$/);
        if ((hm ? +hm[1] : 0) !== vals.length - shownI.length) fail('taylor', key, 'the hidden terms are miscounted');
        if (vl.indexOf(') = ') + 4 <= vl.length - tm[0].length) {
          const sv = [...('+ ' + body.replace(/ \+ \(.*$/, '')).replace(/^\+ −/, '− ').matchAll(/([+−]) ([\d.]+)/g)].map(m => (m[1] === '−' ? -1 : 1) * +m[2]);
          if (sv.length !== shownI.length || sv.some((v, j) => Math.abs(v - vals[shownI[j]]) > 5.1e-5)) fail('taylor', key, `the terms are worked wrongly: ${vl}`);
        } else if (shownI.length !== 1 || vals.length !== 1) fail('taylor', key, 'a sum of several terms is not shown');
        for (const i of shownI) if (!isExact(vals[i]) && Math.abs(vals[i]) < 0.00005) fail('taylor', key, 'a term too small to read is shown');
      }
      const fm = L[li].match(/^At x = (−?[\d.]+), (.+?) ([=≈]) (−?[\d.]+), so P\S+ is (exactly right|(over|short) by (about ([\d.]+)|less than 0\.000001))\.$/);
      if (!fm) { fail('taylor', key, `the comparison does not read: ${L[li]}`); continue; }
      if (num(fm[1]) !== x || fm[2] !== C.at) fail('taylor', key, 'the comparison names the wrong x or function');
      if (Math.abs(num(fm[4]) - fx) > (fm[3] === '=' ? 1e-12 : 5.1e-5) || (fm[3] === '=') !== isExact(fx)) fail('taylor', key, `${C.at} is printed as ${fm[4]}, it is ${fx}`);
      if ((fm[5] === 'exactly right') !== (Math.abs(err) < 1e-12)) fail('taylor', key, 'exactly right is claimed wrongly');
      if (fm[6] && (fm[6] === 'over') !== (err > 0)) fail('taylor', key, 'over and short are swapped');
      if (fm[9] !== undefined && Math.abs(+fm[9] - Math.abs(err)) > Math.max(5.1e-5, Math.abs(err) * 0.05)) fail('taylor', key, `the gap is printed as ${fm[9]}, it is ${Math.abs(err)}`);
      if (fm[7] === 'less than 0.000001' && Math.abs(err) >= 1e-6) fail('taylor', key, 'a visible gap is called less than 0.000001');
      const note = L[li + 1] || '';
      const worse = x !== 0 && deg > 0 && co(deg) !== 0 && Math.abs(err) > Math.abs(err - vals[vals.length - 1]) + 1e-12;
      const want = x === 0 ? 'zero' : deg > 0 && co(deg) === 0 ? 'skip' : worse ? 'worse' : '';
      const have = /^At x = 0 every power/.test(note) ? 'zero' : /has no x\S+ term, so/.test(note) ? 'skip' : /^Adding the x\S+ term made this worse/.test(note) ? 'worse' : note ? '?' : '';
      if (want !== have) fail('taylor', key, `the note should be ${want || 'none'}, it is ${have || 'none'}`);
      if (L.length > li + 2) fail('taylor', key, 'more than one note');
      for (const g of T.GOALS) if (g.ok(T)) found[g.id] = (found[g.id] || 0) + 1;
      if (T.GOALS.find(g => g.id === 'worse').ok(T) !== worse) fail('taylor', key, 'a worse guess is judged wrongly');
    }
  });
  for (const g of T.GOALS) if (!found[g.id]) fail('taylor', g.id, 'this goal cannot be found');
  T.ci = 0; T.n = 1; T.xi = 6;
  if (T.GOALS.some(g => g.ok(T))) fail('taylor', 'start', 'a goal is already met where the workshop opens');
  if (T.touched !== false) fail('taylor', 'start', 'the workshop opens as if already turned');
  return { n, goals: T.GOALS.length };
})();

/* Every pair in Order Matters: each move is worked here as what it does to
   a point (a quarter-turn sends (x, y) to (−y, x), and so on), never from
   its matrix, and each line the player reads is read back: where î and ĵ go
   after one move and then both, the columns of the pair, the determinant as
   the product of the two and as the signed area of where the square lands,
   whether the other order lands in the same place, and what the pair makes.
   Each goal must be findable, and only flip with stretch may commute. */
const composeNotes = (() => {
  const C = Compose, found = {}, num = s => +String(s).replace(/−/g, '-');
  const MAP = {
    turn: ([x, y]) => [-y, x], flip: ([x, y]) => [x, -y], swap: ([x, y]) => [y, x],
    shear: ([x, y]) => [x + y, y], stretch: ([x, y]) => [2 * x, y]
  };
  const vec = s => { const m = /^⟨(−?\d+), (−?\d+)⟩$/.exec(s); return m && [num(m[1]), num(m[2])]; };
  const same = (u, v) => u && v && u[0] === v[0] && u[1] === v[1];
  const area = (p, q) => p[0] * q[1] - p[1] * q[0];
  let n = 0;
  if (Object.keys(MAP).join() !== C.MOVES.map(m => m.id).join()) fail('compose', 'moves', 'the moves are not the five checked here');
  for (const m of C.MOVES) {
    if (!same([m.m[0][0], m.m[1][0]], MAP[m.id]([1, 0])) || !same([m.m[0][1], m.m[1][1]], MAP[m.id]([0, 1])))
      fail('compose', m.id, 'the matrix is not where the move sends î and ĵ');
  }
  C.MOVES.forEach((F, fi) => C.MOVES.forEach((S, si) => {
    C.fi = fi; C.si = si; n++;
    const key = `${F.id}>${S.id}`, L = C.working();
    const go = p => MAP[S.id](MAP[F.id](p)), back = p => MAP[F.id](MAP[S.id](p));
    const I = go([1, 0]), J = go([0, 1]), I2 = back([1, 0]), J2 = back([0, 1]);
    if (L[0] !== `First ${F.does}, then ${S.does}.`) fail('compose', key, `the first line reads: ${L[0]}`);
    for (const [k, nm, p] of [[1, 'î', [1, 0]], [2, 'ĵ', [0, 1]]]) {
      const m = new RegExp(`^${nm} goes to (⟨[^⟩]+⟩) under the first move, then to (⟨[^⟩]+⟩) under the second\\.$`).exec(L[k]);
      if (!m) { fail('compose', key, `the ${nm} line does not read: ${L[k]}`); continue; }
      if (!same(vec(m[1]), MAP[F.id](p))) fail('compose', key, `${nm} after the first move is ${m[1]}`);
      if (!same(vec(m[2]), go(p))) fail('compose', key, `${nm} after both moves is ${m[2]}`);
    }
    const cm = /^So both moves together are the matrix with columns (⟨[^⟩]+⟩) and (⟨[^⟩]+⟩), and its determinant is (\(?−?\d+\)?) × (\(?−?\d+\)?) = (−?\d+): the two determinants multiply\. (.*)$/.exec(L[3]);
    if (!cm) fail('compose', key, `the matrix line does not read: ${L[3]}`);
    else {
      if (!same(vec(cm[1]), I) || !same(vec(cm[2]), J)) fail('compose', key, 'the columns of the pair are wrong');
      const d = x => num(x.replace(/[()]/g, ''));
      const dF = area(MAP[F.id]([1, 0]), MAP[F.id]([0, 1])), dS = area(MAP[S.id]([1, 0]), MAP[S.id]([0, 1]));
      if (d(cm[3]) !== dF || d(cm[4]) !== dS) fail('compose', key, 'the two determinants are wrong, or in the wrong order');
      if (/^\(/.test(cm[3]) !== (dF < 0) || /^\(/.test(cm[4]) !== (dS < 0)) fail('compose', key, 'a negative factor is not bracketed');
      if (num(cm[5]) !== area(I, J)) fail('compose', key, `det is printed as ${cm[5]}, the square's signed area is ${area(I, J)}`);
      const D = area(I, J), dm = /^So the unit square becomes a shape of area (\d+), (flipped over|the same way round)/.exec(cm[6]);
      if (!dm || +dm[1] !== Math.abs(D) || (dm[2] === 'flipped over') !== (D < 0)) fail('compose', key, `the determinant is not explained: ${cm[6]}`);
    }
    const commute = same(I, I2) && same(J, J2);
    if (C.same() !== commute) fail('compose', key, 'whether the order matters is judged wrongly');
    if (fi === si) { if (L[4] !== 'Both moves are the same, so there is no other order to try.') fail('compose', key, 'a move done twice is not said so'); }
    else if (commute) { if (!/^The other way round, î and ĵ land in the same places/.test(L[4])) fail('compose', key, 'the order is said to matter when it does not'); }
    else {
      const om = /^The other way round, î lands on (⟨[^⟩]+⟩) and ĵ on (⟨[^⟩]+⟩), drawn dashed: the order matters\.$/.exec(L[4]);
      if (!om || !same(vec(om[1]), I2) || !same(vec(om[2]), J2)) fail('compose', key, `the other order is wrong: ${L[4]}`);
    }
    const P = [[I[0], J[0]], [I[1], J[1]]];
    const isM = M => same(I, [M[0][0], M[1][0]]) && same(J, [M[0][1], M[1][1]]);
    const want = isM([[1, 0], [0, 1]]) ? 'Every arrow is back where it began: the second move undoes the first.'
      : isM([[-1, 0], [0, -1]]) ? 'Every arrow now points the opposite way: together they make a half-turn.'
      : (m => m ? `Together they make a single move: ${m.is}.` : undefined)(C.MOVES.find(m => isM(m.m)));
    if (L[5] !== want) fail('compose', key, `the closing note should be ${want}, it is ${L[5]}`);
    if (L.length > 6) fail('compose', key, 'more than one closing note');
    if (!C.eq(C.P(), P)) fail('compose', key, 'the pair\'s matrix is not where î and ĵ land');
    for (const g of C.GOALS) if (g.ok(C)) (found[g.id] = found[g.id] || []).push(key);
  }));
  for (const g of C.GOALS) if (!found[g.id]) fail('compose', g.id, 'this goal cannot be found');
  if ((found.same || []).join() !== 'flip>stretch,stretch>flip') fail('compose', 'same', `only flip and stretch commute, not ${found.same}`);
  if ((found.half || []).join() !== 'turn>turn') fail('compose', 'half', 'only two quarter-turns make a half-turn');
  C.fi = 3; C.si = 0;
  if (C.touched !== false) fail('compose', 'start', 'the workshop opens as if already turned');
  return { n, goals: C.GOALS.length };
})();

/* Every state of the limit workshop: each formula, both sides and every h.
   Each value is worked here another way ((x² − 1)/(x − 1) is x + 1 once x is
   not 1, sin x / x from its series, |x| / x is the sign of x, 1/x from the
   printed x), and every number in the working is checked against the ones
   before it. The verdict is read for each pair of sides watched: a side's
   trend is judged here from f at h = 0.1, 0.01 and 0.001, and the two sides
   must agree for a limit to be named. Each goal must be findable, and none
   met where the workshop opens. */
const limitNotes = (() => {
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const L = Limit, num = s => +String(s).replace(/[()]/g, '').replace(/−/g, '-');
  const SERIES = x => 1 - x ** 2 / 6 + x ** 4 / 120 - x ** 6 / 5040 + x ** 8 / 362880 - x ** 10 / 39916800;
  const ALT = { hole: x => x + 1, sinc: SERIES, sgn: x => (x > 0 ? 1 : -1), inv: x => 1 / x };
  const NUM = '(\\(?−?[\\d.]+\\)?)';
  let n = 0;
  // where each side heads, judged from three values closing in
  const trend = (F, side) => {
    const v = [0.1, 0.01, 0.001].map(h => ALT[F.id](F.a + (side === 'L' ? -h : h)));
    if (v.every(y => y === v[0])) return { stays: v[0] };
    if (Math.abs(v[2]) > 900 && Math.abs(v[2] / v[1]) > 9) return { off: v[2] > 0 ? 'up' : 'down' };
    const to = Math.round(v[2] * 100) / 100;
    if (Math.abs(v[2] - to) < Math.abs(v[1] - to) && Math.abs(v[2] - to) < 0.01) return { to };
    return null;
  };
  const says = (tr, txt) => tr && (tr.stays !== undefined ? txt === `stays at ${neg(tr.stays)}`
    : tr.off ? txt === (tr.off === 'up' ? 'climbs without end' : 'falls without end') : txt === `heads for ${neg(tr.to)}`);
  for (let fi = 0; fi < L.FNS.length; fi++) {
    const F = L.FNS[fi];
    const tl = trend(F, 'L'), tr = trend(F, 'R');
    if (!tl || !tr) { fail('limit', F.id, 'a side heads nowhere this check can name'); continue; }
    for (const side of ['L', 'R']) for (let hi = 0; hi < L.HS.length; hi++) {
      L.fi = fi; L.side = side; L.hi = hi; L.near = {}; n++;
      const key = `${F.id} ${side} h=${L.HS[hi]}`, h = L.HS[hi], x = +(F.a + (side === 'L' ? -h : h)).toFixed(9);
      if (L.x() !== x) { fail('limit', key, `x is ${L.x()}, not ${x}`); continue; }
      const W = L.working(), X = neg(x);
      if (W[0] !== `f(x) = ${F.at}, with x closing in on ${neg(F.a)} from the ${side === 'L' ? 'left' : 'right'}: h = ${h}, so x = ${neg(F.a)} ${side === 'L' ? '−' : '+'} ${h} = ${X}.`)
        fail('limit', key, `the first line reads: ${W[0]}`);
      const want = ALT[F.id](x);
      if (F.id === 'hole') {
        const m = new RegExp(`^f\\(${X}\\) = \\(${NUM}² − 1\\)/\\(${X} − 1\\) = \\(${NUM} − 1\\)/${NUM} = ${NUM}/${NUM} = ${NUM}\\.$`).exec(W[1]);
        if (!m) { fail('limit', key, `the working does not read: ${W[1]}`); continue; }
        const [, xs, sq, b1, t, b2, v] = m.map(num);
        if (xs !== x || Math.abs(sq - x * x) > 1e-12 || Math.abs(t - (sq - 1)) > 1e-12 || b1 !== b2 || Math.abs(b1 - (x - 1)) > 1e-12 || Math.abs(t / b1 - v) > 1e-9)
          fail('limit', key, `a step of the working does not follow: ${W[1]}`);
        if ([[m[3], b1], [m[4], t], [m[5], b2]].some(([raw, n]) => /\(/.test(raw) !== (n < 0))) fail('limit', key, `a negative is not bracketed: ${W[1]}`);
        if (Math.abs(v - want) > 1e-9) fail('limit', key, `f is printed as ${v}, x + 1 is ${want}`);
      } else if (F.id === 'sinc') {
        const m = new RegExp(`^f\\(${X}\\) = sin\\(${X}\\)/${NUM} ≈ ${NUM}/${NUM} ≈ ${NUM}\\.$`).exec(W[1]);
        if (!m) { fail('limit', key, `the working does not read: ${W[1]}`); continue; }
        const [, d1, sv, d2, v] = m.map(num);
        if (d1 !== x || d2 !== x) fail('limit', key, 'it divides by something other than x');
        if (Math.abs(sv - Math.sin(x)) > Math.abs(Math.sin(x)) * 1e-7) fail('limit', key, `sin is printed as ${sv}`);
        if (/\(/.test(m[2]) !== (sv < 0) || /\(/.test(m[3]) !== (x < 0)) fail('limit', key, 'a negative is not bracketed');
        if (Math.abs(v - want) > 1e-7) fail('limit', key, `f is printed as ${v}, the series gives ${want}`);
      } else if (F.id === 'sgn') {
        if (W[1] !== `f(${X}) = |${X}|/${x < 0 ? `(${X})` : X} = ${neg(Math.abs(x))}/${x < 0 ? `(${X})` : X} = ${neg(want)}.`) fail('limit', key, `the working reads: ${W[1]}`);
      } else {
        const m = new RegExp(`^f\\(${X}\\) = 1/${NUM} = ${NUM}\\.$`).exec(W[1]);
        if (!m || num(m[1]) !== x || Math.abs(num(m[2]) * x - 1) > 1e-9) fail('limit', key, `the working reads: ${W[1]}`);
      }
      if (!W[2].includes(F.id === 'inv' ? 'it is 1/0, which is no number at all' : 'gives 0/0, which is no number at all'))
        fail('limit', key, 'it does not say why x = a itself has no value');
      // the verdict, for each pair of sides watched up close
      for (const seen of [[], ['L'], ['R'], ['L', 'R']]) {
        L.near = seen.length ? { [F.id]: new Set(seen) } : {};
        const v = L.working()[3];
        if (!seen.length) { if (!/^Bring h down to 0\.001/.test(v)) fail('limit', key, 'nothing watched, yet a verdict is given'); continue; }
        if (seen.length === 1) {
          const s1 = seen[0], m = /^From the (left|right), f\(x\) (.+)\. A limit needs both sides to agree, so close in from the (left|right) too\.$/.exec(v);
          if (!m || m[1] !== (s1 === 'L' ? 'left' : 'right') || m[3] === m[1]) { fail('limit', key, `one side's verdict reads: ${v}`); continue; }
          if (!says(s1 === 'L' ? tl : tr, m[2])) fail('limit', key, `it says f(x) ${m[2]} from the ${m[1]}, which is not where it heads`);
          continue;
        }
        const agree = tl.to !== undefined && tr.to !== undefined && tl.to === tr.to;
        if (agree !== /so the limit as x → \S+ is /.test(v)) fail('limit', key, `the verdict on both sides is wrong: ${v}`);
        if (agree && !v.includes(`closes in on ${neg(tl.to)}, so the limit as x → ${neg(F.a)} is ${neg(tl.to)}`)) fail('limit', key, `the limit is misnamed: ${v}`);
        if (!agree && !/does not exist|there is no limit/.test(v)) fail('limit', key, 'two sides that disagree are not said to give no limit');
      }
      L.near = {};
    }
  }
  // every goal, found by watching every side of every formula up close
  const found = {};
  L.near = {};
  for (let fi = 0; fi < L.FNS.length; fi++) for (const side of ['L', 'R']) for (let hi = 0; hi < L.HS.length; hi++) {
    L.fi = fi; L.side = side; L.hi = hi;
    if (hi === L.HS.length - 1) (L.near[L.fn().id] = L.near[L.fn().id] || new Set()).add(side);
    for (const g of L.GOALS) if (g.ok(L)) found[g.id] = true;
  }
  for (const g of L.GOALS) if (!found[g.id]) fail('limit', g.id, 'this goal cannot be found');
  L.fi = 0; L.side = 'R'; L.hi = 0; L.near = {};
  if (L.GOALS.some(g => g.ok(L))) fail('limit', 'start', 'a goal is already met where the workshop opens');
  if (L.touched !== false) fail('limit', 'start', 'the workshop opens as if already turned');
  return { n, goals: L.GOALS.length };
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
console.log(`  determinants explained     ${pad(detMeaning.toLocaleString(), 10)}  (area or volume, flipped, or pressed flat)`);
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
  console.log(`    rite trail lines checked ${pad(trailsChecked.toLocaleString(), 11)}  (${trailsCut.toLocaleString()} cut at a word, mathematics drawn)`);
}
console.log(`  lines read for notation    ${pad(notationScanned.toLocaleString(), 11)}  (no 5 + −1, −2², 1x, x¹, 1/−3)`);
console.log(`  tile banks drawn           ${pad(bankTell.n.toLocaleString(), 11)}  (crowding tell ${bankTell.ratio.toFixed(2)}× chance)`);
console.log(`  find-the-slip questions    ${pad(slipNotes.n.toLocaleString(), 11)}  (${slipNotes.topics} topics, none quoting an answer or echoing the squire)`);
if (figKeys.size) {
  console.log(`  generators with figures      ${pad(figKeys.size, 8)}`);
  console.log(`  figure specs checked       ${pad(figsChecked.toLocaleString(), 11)}  (${figKinds.size}/${Figure.KINDS.length} kinds)`);
}
if (codeNotes) {
  console.log(`  knight codes: topics       ${pad(codeNotes.topics, 10)}  (signature 0x${codeNotes.sig.toString(16)})`);
  console.log(`    QR symbols pinned                      (worst case ${codeNotes.worst}×${codeNotes.worst} modules)`);
  console.log(`    a ${codeNotes.maxQ.toLocaleString()}-question knight ${String(codeNotes.maxChars).padStart(7)} chars → v${codeNotes.maxV} (${codeNotes.maxSize}×${codeNotes.maxSize}), v${codeNotes.grownV} at eight settings`);
}
console.log(`  workshop matrices checked  ${pad(workshopNotes.n.toLocaleString(), 10)}  (kept directions, eigenvalues, ${workshopNotes.goals} goals makeable)`);
console.log(`    shapes to match drawn    ${pad(workshopNotes.targets.toLocaleString(), 12)}  (on the grid, never flat, never twice running)`);
console.log(`  slope workshop states      ${pad(slopeNotes.n.toLocaleString(), 10)}  (derivative, secant, working, ${slopeNotes.goals} goals findable)`);
console.log(`  dot product pairs          ${pad(dotNotes.n.toLocaleString(), 10)}  (products, lengths, angle, shadow, ${dotNotes.goals} goals findable)`);
console.log(`  area workshop states       ${pad(areaNotes.n.toLocaleString(), 10)}  (Riemann sums, working, gap, ${areaNotes.goals} goals findable)`);
console.log(`  eigenvector hunt states    ${pad(eigNotes.n.toLocaleString(), 10)}  (Av, λ, the flip, how far off, ${eigNotes.goals} goals findable)`);
console.log(`  taylor workshop states     ${pad(taylorNotes.n.toLocaleString(), 10)}  (coefficients, terms, value, gap, ${taylorNotes.goals} goals findable)`);
console.log(`  order matters pairs        ${pad(composeNotes.n.toLocaleString(), 10)}  (both moves, columns, det, the other order, ${composeNotes.goals} goals findable)`);
console.log(`  limit workshop states      ${pad(limitNotes.n.toLocaleString(), 10)}  (values, working, each side's trend, ${limitNotes.goals} goals findable)`);
console.log(`  workflow actions checked   ${pad(workflowNotes.uses, 10)}  (${workflowNotes.files} workflows, all on Node 24)`);
console.log('─'.repeat(58));

if (fails.length) {
  const shown = [...new Set(fails)].slice(0, 25);
  console.log(`\n${fails.length} FAILURE(S):`);
  shown.forEach(f => console.log('  ' + f));
  if (fails.length > shown.length) console.log(`  … and ${fails.length - shown.length} more`);
  process.exit(1);
}
console.log('\nAll checks passed.');
