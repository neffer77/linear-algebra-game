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
    ';const Span={' + script.slice(script.indexOf('  PAIRS:[\n    {u:[2,1],'), script.indexOf('  open(){ UI.go(\'s-span\'); },')) + '};exports.Span=Span;' +
    ';const Elim={' + script.slice(script.indexOf('  SYSTEMS:[\n    [[1,2,5],'), script.indexOf('  open(){ UI.go(\'s-elim\'); },')) + '};exports.Elim=Elim;' +
    ';const Undo={' + script.slice(script.indexOf('  MATS:[\n    {m:[[1,1],[0,1]],  btn:\'Shear\''), script.indexOf('  open(){ UI.go(\'s-undo\'); },')) + '};exports.Undo=Undo;' +
    ';const Fit={' + script.slice(script.indexOf("  SETS:[\n    {btn:'Line-up'"), script.indexOf("  open(){ UI.go('s-fit'); },")) + '};exports.Fit=Fit;' +
    ';const Newton={' + script.slice(script.indexOf("  CURVES:[\n    {id:'sq',   name:'x² − 2'"), script.indexOf("  open(){ UI.go('s-newton'); },")) + '};exports.Newton=Newton;' +
    ';const Chain={' + script.slice(script.indexOf("  PAIRS:[\n    {f:'u²',"), script.indexOf("  open(){ UI.go('s-chain'); },")) + '};exports.Chain=Chain;' +
    ';const Castles={' + script.slice(script.indexOf("  RULES:[\n    {btn:'Drift'"), script.indexOf("  open(){ UI.go('s-castles'); },")) + '};exports.Castles=Castles;' +
    ';const Cistern={' + script.slice(script.indexOf("  SETS:[\n    {id:'fade', btn:'Fading spring'"), script.indexOf("  open(){ UI.go('s-cistern'); },")) + '};exports.Cistern=Cistern;' +
    ';const Hopital={' + script.slice(script.indexOf("  SETS:[\n    {id:'sq', btn:'Square'"), script.indexOf("  open(){ UI.go('s-hopital'); },")) + '};exports.Hopital=Hopital;' +
    ';const Product={' + script.slice(script.indexOf("  SETS:[\n    {id:'lin', btn:'Line'"), script.indexOf("  open(){ UI.go('s-product'); },")) + '};exports.Product=Product;' +
    ';const Ladder={' + script.slice(script.indexOf("  SETS:[\n    {id:'five', btn:'5 m ladder'"), script.indexOf("  open(){ UI.go('s-ladder'); },")) + '};exports.Ladder=Ladder;' +
    ';const Kernel={' + script.slice(script.indexOf("  SETS:[\n    {id:'flat', btn:'Flat'"), script.indexOf("  open(){ UI.go('s-null'); },")) + '};exports.Kernel=Kernel;' +
    ';const Gram={' + script.slice(script.indexOf("  SETS:[\n    {id:'tilt', btn:'Tilted'"), script.indexOf("  open(){ UI.go('s-gram'); },")) + '};exports.Gram=Gram;' +
    ';const Geo={' + script.slice(script.indexOf("  SETS:[\n    {id:'half', btn:'Halves'"), script.indexOf("  open(){ UI.go('s-geo'); },")) + '};exports.Geo=Geo;' +
    ';const Bend={' + script.slice(script.indexOf("  SETS:[\n    {id:'s', btn:'S-curve'"), script.indexOf("  open(){ UI.go('s-bend'); },")) + '};exports.Bend=Bend;' +
    ';const Avg={' + script.slice(script.indexOf("  SETS:[\n    {id:'bowl', btn:'Bowl'"), script.indexOf("  open(){ UI.go('s-avg'); },")) + '};exports.Avg=Avg;' +
    ';const Tail={' + script.slice(script.indexOf("  SETS:[\n    {id:'sq', btn:'1/x²'"), script.indexOf("  open(){ UI.go('s-tail'); },")) + '};exports.Tail=Tail;' +
    ';const Lathe={' + script.slice(script.indexOf("  SETS:[\n    {id:'cone', btn:'Cone'"), script.indexOf("  open(){ UI.go('s-lathe'); },")) + '};exports.Lathe=Lathe;' +
    ';const Swap={' + script.slice(script.indexOf("  SETS:[\n    {id:'cos', btn:'cos(x²)'"), script.indexOf("  open(){ UI.go('s-swap'); },")) + '};exports.Swap=Swap;' +
    ';const Implicit={' + script.slice(script.indexOf("  SETS:[\n    {id:'circle', btn:'Circle'"), script.indexOf("  open(){ UI.go('s-implicit'); },")) + '};exports.Implicit=Implicit;' +
    ';const Parts={' + script.slice(script.indexOf("  SETS:[\n    {id:'xe', btn:'x eˣ'"), script.indexOf("  open(){ UI.go('s-parts'); },")) + '};exports.Parts=Parts;' +
    ';const Detect={' + script.slice(script.indexOf("  SETS:[\n    {id:'pair', btn:'Two roots'"), script.indexOf("  open(){ UI.go('s-detect'); },")) + '};exports.Detect=Detect;' +
    ';const Hill={' + script.slice(script.indexOf("  SETS:[\n    {id:'bowl', btn:'Round bowl'"), script.indexOf("  open(){ UI.go('s-hill'); },")) + '};exports.Hill=Hill;' +
    ';const Cofactor={' + script.slice(script.indexOf("  SETS:[\n    {id:'gap', btn:'Two zeros'"), script.indexOf("  open(){ UI.go('s-cof'); },")) + '};exports.Cofactor=Cofactor;' +
    ';const Cover={' + script.slice(script.indexOf("  SETS:[\n    {id:'two', btn:'Two factors'"), script.indexOf("  open(){ UI.go('s-cover'); },")) + '};exports.Cover=Cover;' +
    ';const Slice={' + script.slice(script.indexOf("  SETS:[\n    {id:'xy', btn:'xy'"), script.indexOf("  render(){\n    document.getElementById('scSets')")) + 'render(){}};exports.Slice=Slice;' +
    ';const Tracer={' + script.slice(script.indexOf("  SETS:[\n    {id:'sin', btn:'sin x'"), script.indexOf("  render(){\n    document.getElementById('tcSets')")) + 'render(){}};exports.Tracer=Tracer;' +
    ';const Optim={' + script.slice(script.indexOf("  SETS:[\n    {id:'wall', btn:'Wall paddock'"), script.indexOf("  open(){ UI.go('s-optim'); },")) + '};exports.Optim=Optim;' +
    ';const Descent={' + script.slice(script.indexOf('  START:[-2, 1],\n  ETAS:'), script.indexOf('  open(){ UI.go(\'s-descent\'); },')) + '};exports.Descent=Descent;' +
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
const { GEN, trailQ, buildQuestion, buildMote, mat, Figure, figEval, Build, Slip, Workshop, Slope, Area, Dot, Eigen, Taylor, Compose, Limit, Descent, Span, Elim, Undo, Fit, Newton, Chain, Castles, Optim, Cistern, Hopital, Product, Ladder, Kernel, Gram, Geo, Bend, Avg, Tail, Lathe, Swap, Implicit, Parts, Detect, Hill, Cofactor, Cover, Slice, Tracer } = loadGame();

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

/* Every state of the span workshop: each pair and both amounts from −2 to 2.
   a·u, b·v and their sum are worked here from the pair, and every number on
   the first line is checked against them, negatives bracketed. Whether the
   pair is dependent is judged here from u and v alone; a dependent pair must
   say v = ku, work a + kb, and say its target is off the line (checked here
   by the cross product), while an independent one must say how far the
   target still is, or that it is hit. ⟨0, 0⟩ must be explained whenever it is
   made, and "reached before" must appear only where a second way exists,
   which only a dependent pair has. Each goal must be findable, none met at
   the start. */
const spanNotes = (() => {
  const S = Span, neg = n => (n < 0 ? '−' + Math.abs(n) : String(n)), num = x => +String(x).replace(/[()]/g, '').replace(/−/g, '-');
  const V = '⟨(−?\\d+), (−?\\d+)⟩', A = '(\\(?−?\\d+\\)?)';
  const vec = w => `⟨${neg(w[0])}, ${neg(w[1])}⟩`;
  const br = (raw, n) => /\(/.test(raw) === (n < 0);
  const found = {};
  let n = 0;
  const saved = [S.pi, S.a, S.b, S.moved, S.touched];
  if (saved[0] !== 0 || saved[1] !== 1 || saved[2] !== 1 || S.touched || S.moved || S.before) fail('span', 'start', 'the workshop does not open on the first pair at a = b = 1, untouched');
  for (const g of S.GOALS) if (g.ok(S)) fail('span', 'start', `${g.id} is met before anything is pressed`);
  S.PAIRS.forEach((P, pi) => {
    const [u, v, t] = [P.u, P.v, P.t], det = u[0] * v[1] - u[1] * v[0];
    const sums = {};
    for (let a = S.LO; a <= S.HI; a++) for (let b = S.LO; b <= S.HI; b++) {
      S.pi = pi; S.a = a; S.b = b; S.moved = pi === 3; S.before = null; n++;
      const key = `${pi}:${a},${b}`, L = S.working();
      const au = [a * u[0], a * u[1]], bv = [b * v[0], b * v[1]], sum = [au[0] + bv[0], au[1] + bv[1]];
      (sums[sum.join()] = sums[sum.join()] || []).push([a, b]);
      const m = new RegExp(`^a·u \\+ b·v = ${A}·${V} \\+ ${A}·${V} = ${V} \\+ ${V} = ${V}\\.$`).exec(L[0]);
      if (!m) { fail('span', key, `the first line reads: ${L[0]}`); continue; }
      const N = m.slice(1).map(num);
      if (N[0] !== a || N[3] !== b || !br(m[1], a) || !br(m[4], b)) fail('span', key, 'an amount is printed wrong, or a negative is not bracketed');
      if (N[1] !== u[0] || N[2] !== u[1] || N[4] !== v[0] || N[5] !== v[1]) fail('span', key, 'u or v is printed as another arrow');
      if (N[6] !== au[0] || N[7] !== au[1] || N[8] !== bv[0] || N[9] !== bv[1]) fail('span', key, 'a·u or b·v is worked wrong');
      if (N[10] !== sum[0] || N[11] !== sum[1]) fail('span', key, 'the sum is worked wrong');
      let k = 2;
      if (det === 0) {
        const kk = v[0] / u[0];
        const dm = /^v = (\d+)u, so a·u \+ b·v = \(a \+ (\d+)b\)·u = \((−?\d+) \+ (\d+)·(\(?−?\d+\)?)\)·u = (−?\d+)·u: every mix lies on the dashed line through u, and together the two arrows span only that line\.$/.exec(L[1]);
        if (!dm || +dm[1] !== kk || +dm[2] !== kk || +dm[4] !== kk || num(dm[3]) !== a || num(dm[5]) !== b || !br(dm[5], b) || num(dm[6]) !== a + kk * b)
          fail('span', key, `a dependent pair is not worked as (a + kb)·u: ${L[1]}`);
        if ((a + kk * b) * u[0] !== sum[0] || (a + kk * b) * u[1] !== sum[1]) fail('span', key, '(a + kb)·u is not the sum');
        if (u[0] * t[1] - u[1] * t[0] === 0) fail('span', key, 'the dependent pair\'s target is on its line after all');
        if (L[2] !== `The gold target ${vec(t)} is off that line, so no amounts a and b can ever reach it.`) fail('span', key, `the unreachable target is not said so: ${L[2]}`);
        k = 3;
      } else {
        const hit = sum[0] === t[0] && sum[1] === t[1];
        if (S.onTarget() !== hit) fail('span', key, 'the target is judged wrongly');
        const want = hit ? `That is the gold target ${vec(t)}: a = ${neg(a)} and b = ${neg(b)} land right on it.`
          : `The gold target is ${vec(t)}, and ${vec(t)} − ${vec(sum)} = ${vec([t[0] - sum[0], t[1] - sum[1]])} is still to go.`;
        if (L[1] !== want) fail('span', key, `the target line should be ${want}, it is ${L[1]}`);
        const basis = u[0] === 1 && u[1] === 0 && v[0] === 0 && v[1] === 1;
        if (basis !== /^With u = î = ⟨1, 0⟩ and v = ĵ = ⟨0, 1⟩/.test(L[2])) fail('span', key, 'î and ĵ are named where they are not, or not where they are');
        if (!basis && !/^u and v point different ways, so the right amounts reach any point of the plane: together they span it/.test(L[2])) fail('span', key, `an independent pair is not said to span the plane: ${L[2]}`);
        k = 3;
      }
      const zero = !sum[0] && !sum[1];
      if (zero) {
        const z = L[k++] || '';
        if (a === 0 && b === 0) {
          if (!/^With a = b = 0 you get ⟨0, 0⟩, as every pair does\./.test(z) || /independent/.test(z) !== (det !== 0)) fail('span', key, `a = b = 0 is not explained: ${z}`);
        } else if (det === 0) {
          if (z !== `${a < 0 ? '(' + neg(a) + ')' : a}·u + ${b < 0 ? '(' + neg(b) + ')' : b}·v = ⟨0, 0⟩ with the amounts not both 0, so u and v are dependent: one undoes the other.`) fail('span', key, `⟨0, 0⟩ made with amounts is not explained: ${z}`);
        } else fail('span', key, 'an independent pair made ⟨0, 0⟩ with amounts not both 0');
      }
      if (L.length !== k) fail('span', key, `the readout has ${L.length} lines, not ${k}`);
      for (const g of S.GOALS) if (g.id !== 'twice' && g.ok(S)) (found[g.id] = found[g.id] || []).push(key);
    }
    // a point reached two ways happens only for a dependent pair
    const many = Object.values(sums).some(w => w.length > 1);
    if (many !== (det === 0)) fail('span', `pair ${pi + 1}`, 'points are reached more than one way where u and v are independent, or never where they are not');
    if (det !== 0 && !(sums[t.join()] || []).length) fail('span', `pair ${pi + 1}`, 'the target cannot be reached inside the amounts on offer');
  });
  // remembering a second way: walk the dependent pair to ⟨2, 2⟩ two ways
  S.seen = {}; S.pi = 3; S.a = 2; S.b = 0; S.look();
  if (S.before) fail('span', 'twice', 'a first visit is said to be a second');
  S.a = 0; S.b = 1; S.look();
  if (!S.before || S.before.join() !== '2,0') fail('span', 'twice', 'the earlier way to ⟨2, 2⟩ is not remembered');
  else {
    const last = S.working().slice(-1)[0];
    if (last !== 'You reached ⟨2, 2⟩ before with a = 2 and b = 0: when both arrows lie on one line, the same point can be reached more than one way.') fail('span', 'twice', `the second way is not said: ${last}`);
    if (S.GOALS.find(g => g.id === 'twice').ok(S)) found.twice = ['3:0,1'];
  }
  // coming back by the same amounts is not a second way, on any pair
  for (let pi = 0; pi < S.PAIRS.length; pi++) {
    S.seen = {}; S.pi = pi; S.a = 1; S.b = 1; S.look();
    S.a = 2; S.look(); S.a = 1; S.look();
    if (S.before) fail('span', 'twice', `pair ${pi + 1}: returning to a = 1, b = 1 is said to be a second way`);
  }
  S.seen = {}; S.before = null; S.pi = 0;
  for (const g of S.GOALS) if (!found[g.id]) fail('span', g.id, 'this goal cannot be found');
  if (Object.keys(found.zero || {}).length && !found.zero.every(k => k.startsWith('3:'))) fail('span', 'zero', 'an independent pair makes ⟨0, 0⟩ with amounts');
  [S.pi, S.a, S.b, S.moved, S.touched] = saved;
  return { n, goals: S.GOALS.length };
})();

/* The elimination workshop: every state reachable in three row operations
   from each system. Each operation is redone here from the rows before it,
   each equation is read back into numbers, the worked line is checked entry
   by entry, the crossing point must still solve both rows, and only the
   singular systems may ever say 0 = c or 0 = 0. */
const elimNotes = (() => {
  const E = Elim, num = x => +String(x).replace(/[()]/g, '').replace(/−/g, '-');
  const found = {};
  let n = 0;
  if (E.si !== 0 || E.ri !== 1 || E.k !== 1 || E.touched || E.last || E.hist.length) fail('elim', 'start', 'the workshop does not open on the first system, row 2, k = 1, untouched');
  for (const g of E.GOALS) if (g.ok(E)) fail('elim', 'start', `${g.id} is met before anything is pressed`);
  // read "3x − 2y = 7" back into [3, −2, 7]
  const parse = s => {
    const m = /^(.*) = (−?\d+)$/.exec(s); if (!m) return null;
    let a = 0, b = 0;
    if (/(^|[ −])1[xy]/.test(m[1])) return null;  // a coefficient of 1 is never written
    if (m[1] !== '0') {
      const t = /^(−?\d*)x(?: ([+−]) (\d*)y)?$|^(−?\d*)y$/.exec(m[1]); if (!t) return null;
      const co = (sg, d) => (sg === '−' ? -1 : 1) * (d === '' ? 1 : +d);
      if (t[4] !== undefined) b = co(t[4][0] === '−' ? '−' : '+', t[4].replace('−', ''));
      else { a = co(t[1][0] === '−' ? '−' : '+', t[1].replace('−', '')); if (t[2]) b = co(t[2], t[3]); }
    }
    return [a, b, num(m[2])];
  };
  const same = (p, q) => p && q && p.every((x, j) => x === q[j]);
  const ops = [{ kind: 'swap' }];
  for (const ri of [0, 1]) for (let k = E.KLO; k <= E.KHI; k++) if (k) for (const kind of ['add', 'mul', 'div']) ops.push({ kind, ri, k });
  E.SYSTEMS.forEach((S, si) => {
    const sing = !(S[0][0] * S[1][1] - S[0][1] * S[1][0]);
    E.si = si; E.rows = null;
    const P0 = E.point();
    if (sing !== !P0) fail('elim', `system ${si + 1}`, 'the crossing point is wrong');
    const seen = new Set([JSON.stringify(E.R())]);
    let layer = [{ rows: E.R().map(r => r.slice()), path: '' }];
    for (let depth = 1; depth <= 3; depth++) {
      const next = [];
      for (const st of layer) for (const o of ops) {
        E.si = si; E.rows = st.rows.map(r => r.slice()); E.hist = []; E.last = null; E.touched = false;
        if (o.kind !== 'swap') { E.ri = o.ri; E.k = o.k; }
        const before = E.rows.map(r => r.slice());
        const want = o.kind === 'swap' ? null : E[o.kind + 'Of']();
        // redo the operation here, independently
        let mine = null;
        if (o.kind === 'add') { const r = before[o.ri].map((x, j) => x + o.k * before[1 - o.ri][j]); mine = r.every(x => Math.abs(x) <= 99) ? r : null; }
        if (o.kind === 'mul') { const r = before[o.ri].map(x => o.k * x); mine = o.k !== 1 && r.every(x => Math.abs(x) <= 99) ? r : null; }
        if (o.kind === 'div') mine = o.k !== 1 && before[o.ri].every(x => Number.isInteger(x / o.k)) ? before[o.ri].map(x => x / o.k + 0) : null;
        if (o.kind !== 'swap' && !same(want, mine) && (want || mine)) { fail('elim', `${si + 1}${st.path}`, `${o.kind} ${o.k} on row ${o.ri + 1} gives ${want}, not ${mine}`); continue; }
        if (o.kind !== 'swap' && !mine) continue;
        E.apply(o.kind); E.touched = true; n++;
        const rows = E.R(), key = `${si + 1}${st.path} ${o.kind}${o.ri === undefined ? '' : o.ri + 1}${o.k === undefined ? '' : '·' + o.k}`;
        if (o.kind === 'swap' ? !(same(rows[0], before[1]) && same(rows[1], before[0])) : !same(rows[o.ri], mine) || !same(rows[1 - o.ri], before[1 - o.ri]))
          fail('elim', key, 'the rows are not what the operation makes');
        const L = E.working();
        // line 1: both equations, read back into numbers
        const m1 = /^Row 1: (.*)\. Row 2: (.*)\.$/.exec(L[0]);
        if (!m1 || !same(parse(m1[1]), rows[0]) || !same(parse(m1[2]), rows[1])) fail('elim', key, `the equations read: ${L[0]}`);
        // line 2: the operation, worked entry by entry
        if (o.kind === 'swap') {
          if (L[1] !== `Swapped the rows: row 1 is now ${E.eq(rows[0])} and row 2 is ${E.eq(rows[1])}.`) fail('elim', key, `the swap reads: ${L[1]}`);
        } else {
          const m = Math.abs(o.k), lab = { add: `R${o.ri + 1} ${o.k < 0 ? '−' : '+'} ${m === 1 ? '' : m + '·'}R${2 - o.ri}`,
            mul: `${o.k < 0 ? '(' + '−' + m + ')' : m}·R${o.ri + 1}`, div: `R${o.ri + 1} ÷ ${o.k < 0 ? '(' + '−' + m + ')' : m}` }[o.kind];
          const parts = L[1].startsWith(lab + ': ') && /, so row (\d) is now (.*)\.$/.exec(L[1]);
          if (!parts || +parts[1] !== o.ri + 1 || !same(parse(parts[2]), rows[o.ri])) { fail('elim', key, `the operation reads: ${L[1]}`); continue; }
          const ents = L[1].slice(lab.length + 2, parts.index).split(', ');
          if (ents.length !== 3) fail('elim', key, `three entries are not worked: ${L[1]}`);
          ents.forEach((e, j) => {
            const x = before[o.ri][j], y = before[1 - o.ri][j], r = rows[o.ri][j];
            const t = o.kind === 'add' ? /^(−?\d+) ([+−]) (?:(\d+)·)?(\(−\d+\)|\d+) = (−?\d+)$/.exec(e)
              : o.kind === 'mul' ? /^(\(−\d+\)|\d+)·(\(−\d+\)|\d+) = (−?\d+)$/.exec(e) : /^(−?\d+) ÷ (\(−\d+\)|\d+) = (−?\d+)$/.exec(e);
            if (!t) return fail('elim', key, `entry ${j + 1} reads: ${e}`);
            const br = s => /\(/.test(s) === (num(s) < 0);
            if (o.kind === 'add') {
              const kk = (t[2] === '−' ? -1 : 1) * (t[3] ? +t[3] : 1);
              if (num(t[1]) !== x || kk !== o.k || num(t[4]) !== y || num(t[5]) !== r || !br(t[4]) || x + kk * num(t[4]) !== num(t[5])) fail('elim', key, `entry ${j + 1} is wrong: ${e}`);
            } else if (o.kind === 'mul') {
              if (num(t[1]) !== o.k || num(t[2]) !== x || num(t[3]) !== r || !br(t[1]) || !br(t[2]) || num(t[1]) * num(t[2]) !== num(t[3])) fail('elim', key, `entry ${j + 1} is wrong: ${e}`);
            } else if (num(t[1]) !== x || num(t[2]) !== o.k || num(t[3]) !== r || !br(t[2]) || num(t[1]) / num(t[2]) !== num(t[3])) fail('elim', key, `entry ${j + 1} is wrong: ${e}`);
          });
        }
        // what the rows say, and only what is true of this system
        const bad = rows.findIndex(r => !r[0] && !r[1] && r[2]), zero = rows.findIndex(r => !r[0] && !r[1] && !r[2]);
        const said = { never: L.filter(l => /which is never true/.test(l)).length, always: L.filter(l => /which is true for every x and y/.test(l)).length,
          solved: L.filter(l => /: the system is solved\.$/.test(l)).length, gone: L.filter(l => / is gone from row /.test(l)).length,
          both: L.filter(l => /^Both rows still hold x and y/.test(l)).length };
        if (Object.values(said).reduce((s, c) => s + c, 0) !== 1) fail('elim', key, `not exactly one verdict: ${L.join(' | ')}`);
        if (bad >= 0 !== !!said.never || zero >= 0 !== !!said.always) fail('elim', key, 'the 0 = c verdicts do not match the rows');
        if (said.never && (si !== 2 || !L.includes(`Row ${bad + 1} now reads 0 = ${E.amt(rows[bad][2]).replace(/[()]/g, '')}, which is never true: the two lines were parallel and never cross, so this system has no solution.`))) fail('elim', key, 'no solution is said wrongly');
        if (said.always && si !== 3) fail('elim', key, 'a whole line of solutions is said for a system with one answer');
        if (si === 3 && bad >= 0) fail('elim', key, 'the same line is said to have no solution');
        if (P0) {
          rows.forEach((r, i) => { if (r[0] * P0[0] + r[1] * P0[1] !== r[2]) fail('elim', key, `row ${i + 1} no longer passes through (${P0})`); });
          if (!L.includes(`Both lines still cross at (${P0.map(x => x < 0 ? '−' + -x : x).join(', ')}): a row operation changes the equations, never the point that solves them.`)) fail('elim', key, 'the crossing point is not said');
        } else if (L.some(l => /still cross/.test(l))) fail('elim', key, 'a crossing is claimed for lines that never cross once');
        const unit = r => (r[0] === 1 && r[1] === 0) || (r[0] === 0 && r[1] === 1);
        if ((unit(rows[0]) && unit(rows[1]) && rows[0][0] !== rows[1][0]) !== !!said.solved) fail('elim', key, 'solved is said wrongly');
        if (said.solved) {
          const xr = rows.findIndex(r => r[0] === 1 && r[1] === 0);
          if (!P0 || rows[xr][2] !== P0[0] || rows[1 - xr][2] !== P0[1]) fail('elim', key, 'a solution is claimed that is not the crossing');
        }
        if (said.gone) {
          const s = rows.findIndex(r => (r[0] === 0) !== (r[1] === 0)), r = rows[s], left = r[0] || r[1], v = r[0] ? 'x' : 'y';
          const tail = left === 1 ? `Add a multiple of it to row ${2 - s} to clear the ${v} there too.` : `Divide it by ${E.amt(left)} to leave ${v} on its own.`;
          if (!L.includes(`${r[0] ? 'y' : 'x'} is gone from row ${s + 1}, which now says ${E.eq(r)}. ${tail}`)) fail('elim', key, `the cleared row is not said: ${L.join(' | ')}`);
        }
        const scaled = L.filter(l => /line has not moved/.test(l));
        if ((o.kind === 'mul' || o.kind === 'div') !== (scaled.length === 1)) fail('elim', key, 'the line staying put is said wrongly');
        if (scaled.length && scaled[0] !== `Row ${o.ri + 1}'s line has not moved: ${o.kind === 'mul' ? 'multiplying' : 'dividing'} a whole equation by ${o.k < 0 ? '−' + -o.k : o.k} keeps every point that solved it.`) fail('elim', key, `the scaled line reads: ${scaled[0]}`);
        for (const g of E.GOALS) if (g.ok(E)) found[g.id] = found[g.id] || key;
        // undo puts it all back
        E.undo();
        if (!same(E.R()[0], before[0]) || !same(E.R()[1], before[1]) || E.last !== null) fail('elim', key, 'undo does not put the rows back');
        const id = JSON.stringify(rows);
        if (!seen.has(id)) { seen.add(id); next.push({ rows: rows.map(r => r.slice()), path: key.slice(String(si + 1).length) }); }
      }
      layer = next;
    }
  });
  for (const g of E.GOALS) if (!found[g.id]) fail('elim', g.id, 'this goal cannot be found in three operations');
  E.si = 0; E.rows = null; E.ri = 1; E.k = 1; E.hist = []; E.last = null; E.touched = false; E.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The undo workshop: every B from −2 to 2 for each A, 3,125 states. Each
   arrow is followed through A and B here, the worked sums are read back and
   checked, and the verdict must match: exactly one B in range undoes each
   matrix that can be undone, and it is the inverse from ad − bc; none
   undoes the squash, whose stated point really does land on ⟨0, 0⟩. */
const undoNotes = (() => {
  const U = Undo, num = x => +String(x).replace(/[()]/g, '').replace(/−/g, '-');
  const found = {};
  let n = 0;
  if (U.mi !== 0 || U.B.join() !== '1,0,0,1' || U.moved || U.touched) fail('undo', 'start', 'the workshop does not open on the shear with B = I, untouched');
  for (const g of U.GOALS) if (g.ok(U)) fail('undo', 'start', `${g.id} is met before anything is pressed`);
  const V = '⟨(−?\\d+), (−?\\d+)⟩', F = '(\\(−\\d+\\)|−?\\d+)';
  const br = s => /\(/.test(s) === (num(s) < 0);
  U.MATS.forEach((M, mi) => {
    const A = M.m, d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const inv = d ? [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]] : null;
    const undoers = [];
    for (let p = 0; p < 625; p++) {
      const B = [[p % 5 - 2, Math.floor(p / 5) % 5 - 2], [Math.floor(p / 25) % 5 - 2, Math.floor(p / 125) - 2]];
      U.mi = mi; U.B = B; U.moved = true; U.touched = true; n++;
      const key = `${M.btn} B=${B.join(';')}`, L = U.working();
      const cols = [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
      if (L[0] !== `A is ${M.is}: it sends î to ⟨${cols[0].map(x => x < 0 ? '−' + -x : x).join(', ')}⟩ and ĵ to ⟨${cols[1].map(x => x < 0 ? '−' + -x : x).join(', ')}⟩.`) fail('undo', key, `the first line reads: ${L[0]}`);
      const ends = [0, 1].map(j => {
        const nm = j ? 'ĵ' : 'î';
        const m = new RegExp(`^B sends A${nm} = ${V} to ⟨${F}·${F} \\+ ${F}·${F}, ${F}·${F} \\+ ${F}·${F}⟩ = ${V}: (.*)$`).exec(L[1 + j]);
        if (!m) { fail('undo', key, `${nm}'s line reads: ${L[1 + j]}`); return null; }
        const N = m.slice(1, 13).map(num), [x, y] = cols[j];
        if (N[0] !== x || N[1] !== y) fail('undo', key, `A${nm} is not A's column`);
        if (N[2] !== B[0][0] || N[3] !== x || N[4] !== B[0][1] || N[5] !== y || N[6] !== B[1][0] || N[7] !== x || N[8] !== B[1][1] || N[9] !== y)
          fail('undo', key, `${nm}'s sums do not use B's rows and A${nm}: ${L[1 + j]}`);
        if (![4, 5, 6, 8, 9, 10].every(k => br(m[k])) || /\(/.test(m[3]) || /\(/.test(m[7]))
          fail('undo', key, `${nm}'s factors are bracketed wrongly: ${L[1 + j]}`);
        const e = [B[0][0] * x + B[0][1] * y, B[1][0] * x + B[1][1] * y];
        if (N[10] !== e[0] || N[11] !== e[1] || N[2] * N[3] + N[4] * N[5] !== N[10] || N[6] * N[7] + N[8] * N[9] !== N[11]) fail('undo', key, `${nm}'s sum is wrong: ${L[1 + j]}`);
        const home = e[0] === (j ? 0 : 1) && e[1] === (j ? 1 : 0);
        if (m[13] !== (home ? `${nm} is back home.` : `${nm} should come back to ${j ? '⟨0, 1⟩' : '⟨1, 0⟩'}.`)) fail('undo', key, `${nm}'s verdict reads: ${m[13]}`);
        return home;
      });
      if (ends.includes(null)) continue;
      const both = ends[0] && ends[1];
      if (both !== U.undone()) fail('undo', key, 'undone() disagrees with the arrows');
      if (both) undoers.push(B);
      if (!d) {
        const z = (/and ⟨(−?\d+), (−?\d+)⟩ lands on ⟨0, 0⟩/.exec(L[3]) || []).slice(1).map(num);
        if (L.length !== 4 || !/^det A = 1·4 − 2·2 = 0: /.test(L[3]) || z.length !== 2 || (!z[0] && !z[1]) || A[0][0] * z[0] + A[0][1] * z[1] || A[1][0] * z[0] + A[1][1] * z[1])
          fail('undo', key, `the squash is not explained: ${L[3]}`);
      } else if (both) {
        const own = A.every((r, i) => r.every((x, j) => x === B[i][j]));
        if (L.length !== 4 || L[3] !== `Both are home, so BA = I and B undoes A: B is A⁻¹, with rows ${B[0].map(x => x < 0 ? '−' + -x : x).join(', ')} and ${B[1].map(x => x < 0 ? '−' + -x : x).join(', ')}.${own ? ' A is its own undo: doing it twice puts everything back.' : ''}`)
          fail('undo', key, `the undo is not said: ${L[3]}`);
      } else if (L.length !== 4 || !/^Not yet: B undoes A only when both arrows come home\./.test(L[3])) fail('undo', key, `not yet is not said: ${L[3]}`);
      for (const g of U.GOALS) if (g.ok(U)) found[g.id] = found[g.id] || key;
    }
    if (!d && undoers.length) fail('undo', M.btn, 'a B undoes the squash');
    if (d && (undoers.length !== 1 || undoers[0].join() !== inv.join())) fail('undo', M.btn, `the B that undoes it is not exactly the inverse ${inv.join(';')}`);
  });
  for (const g of U.GOALS) if (!found[g.id]) fail('undo', g.id, 'this goal cannot be found');
  U.mi = 0; U.B = [[1, 0], [0, 1]]; U.moved = false; U.touched = false; U.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* Every state of the best fit workshop: each set of points, every m and c.
   Each miss is worked here from the point and the line, every number in the
   working is read back and checked, the totals are redone, and the best line
   is found here by trying every line and must be the only one with the least
   total. The verdict, the neighbours' totals and the special lines (through
   every point, every miss the same, the four in a row) are each checked
   against that arithmetic. Each goal must be findable, and none met where
   the workshop opens. */
const fitNotes = (() => {
  const F = Fit, num = s => +String(s).replace(/[()]/g, '').replace(/−/g, '-');
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const found = {};
  let n = 0;
  if (F.si !== 0 || F.mh !== 1 || F.ch !== 0 || F.touched) fail('fit', 'start', 'the workshop does not open on the line-up with y = 0.5x, untouched');
  for (const g of F.GOALS) if (g.ok(F)) fail('fit', 'start', `${g.id} is met before anything is pressed`);
  const N = '(\\(?−?[\\d.]+\\)?)';
  F.SETS.forEach((S, si) => {
    const P = S.pts, sse = (mh, ch) => P.reduce((t, [x, y]) => t + (y - (mh * x + ch) / 2) ** 2, 0);
    let lo = Infinity, at = [];
    for (let mh = -4; mh <= 4; mh++) for (let ch = -6; ch <= 6; ch++) {
      const e = sse(mh, ch);
      if (e < lo) { lo = e; at = [[mh, ch]]; } else if (e === lo) at.push([mh, ch]);
    }
    if (at.length !== 1) fail('fit', S.btn, `${at.length} lines share the least total`);
    const xb = P.reduce((t, p) => t + p[0], 0) / P.length, yb = P.reduce((t, p) => t + p[1], 0) / P.length;
    if (at.length === 1 && at[0][0] * xb + at[0][1] !== 2 * yb) fail('fit', S.btn, 'the best line misses the average point');
    for (let mh = -4; mh <= 4; mh++) for (let ch = -6; ch <= 6; ch++) {
      F.si = si; F.mh = mh; F.ch = ch; F.touched = true; n++;
      const key = `${S.btn} m=${mh / 2} c=${ch / 2}`, L = F.working();
      const m = mh / 2, c = ch / 2, r = P.map(([x, y]) => y - (m * x + c)), E = sse(mh, ch), T = r.reduce((a, b) => a + b, 0);
      // the line, read back
      const lm = /^The line is y = (.*?)\. A point's miss is its y minus the line's height at its x\.$/.exec(L[0]);
      if (!lm) { fail('fit', key, `the first line reads: ${L[0]}`); continue; }
      const t = lm[1].replace(/−/g, '-').replace(/ /g, '');
      const tm = /^(-?[\d.]*)x(.*)$/.exec(t);
      const rm = tm ? (tm[1] === '' ? 1 : tm[1] === '-' ? -1 : +tm[1]) : 0, rc = tm ? (tm[2] ? +tm[2] : 0) : +t;
      if (rm !== m || rc !== c || /(^|[^.\d])1x|(^|[^.\d])0x|\+-|\+0(?![.\d])/.test(t)) fail('fit', key, `the line is written wrongly: ${lm[1]}`);
      // each miss, read back
      const ms = L[1].replace(/^Misses: /, '').replace(/\.$/, '').split('; ');
      if (!L[1].startsWith('Misses: ') || ms.length !== P.length) fail('fit', key, `the misses line reads: ${L[1]}`);
      else ms.forEach((txt, i) => {
        const q = new RegExp(`^at x = (−?\\d+), (−?\\d+) − ${N} = ${N}$`).exec(txt);
        if (!q) { fail('fit', key, `a miss reads: ${txt}`); return; }
        const [x, y] = P[i], h = m * x + c;
        if (num(q[1]) !== x || num(q[2]) !== y || num(q[3]) !== h || num(q[4]) !== r[i]) fail('fit', key, `a miss is wrong: ${txt}`);
        if (/\(/.test(q[3]) !== (h < 0) || /\(/.test(q[4])) fail('fit', key, `a miss is bracketed wrongly: ${txt}`);
      });
      // the totals
      const tt = /^They add to (.*) = (−?[\d.]+), and their squares to (.*) = ([\d.]+)\.$/.exec(L[2]);
      if (!tt) { fail('fit', key, `the totals read: ${L[2]}`); continue; }
      const parts = tt[1].replace(/ − /g, ' + -').replace(/−/g, '-').split(' + ').map(Number);
      if (parts.join() !== r.join() || num(tt[2]) !== T) fail('fit', key, `the misses do not add up: ${L[2]}`);
      const sq = tt[3].split(' + ').map(Number);
      if (sq.join() !== r.map(v => v * v).join() || num(tt[4]) !== E) fail('fit', key, `the squares do not add up: ${L[2]}`);
      // the verdict
      const rest = L.slice(3).join(' ');
      if (E === 0) { if (L.length !== 4 || !/^Every miss is 0: the line runs through every point/.test(L[3])) fail('fit', key, `through every point is not said: ${rest}`); }
      else if (E === lo) {
        if (L.length !== 4 || !L[3].startsWith('No line does better: this is the least-squares line') || !L[3].includes(`(${neg(xb)}, ${neg(yb)})`)) fail('fit', key, `the best line is not said: ${rest}`);
        if ((si === 2) !== /far point/.test(L[3])) fail('fit', key, `the far point is said wrongly: ${rest}`);
      } else {
        if (/No line does better|Every miss is 0/.test(rest)) fail('fit', key, `a line that is not the best is called the best: ${rest}`);
        if (r.every(v => v === r[0]) !== /misses by the same/.test(rest)) fail('fit', key, `every miss the same is said wrongly: ${rest}`);
        const row = si === 2 && r.slice(0, 4).every(v => v === 0);
        if (row !== /four points in a row/.test(rest)) fail('fit', key, `the row is said wrongly: ${rest}`);
        if (row && !rest.includes(`and ${r[4] < 0 ? '(' + neg(r[4]) + ')' : neg(r[4])}² = ${r[4] ** 2} is more than the best line's whole total of ${lo}.`)) fail('fit', key, `the far point's cost is wrong: ${rest}`);
        if ((T === 0) !== /misses add to 0, yet/.test(rest)) fail('fit', key, `cancelling misses are said wrongly: ${rest}`);
        const want = [];
        if (mh > -4) want.push(`m down gives ${neg(sse(mh - 1, ch))}`);
        if (mh < 4) want.push(`m up gives ${neg(sse(mh + 1, ch))}`);
        if (ch > -6) want.push(`c down gives ${neg(sse(mh, ch - 1))}`);
        if (ch < 6) want.push(`c up gives ${neg(sse(mh, ch + 1))}`);
        if (L[L.length - 1] !== `A smaller total is out there. One step from here: ${want.join(', ')}.`) fail('fit', key, `the steps from here are wrong: ${L[L.length - 1]}`);
      }
      if (F.best() !== (E === lo)) fail('fit', key, 'best() disagrees with every line tried');
      for (const g of F.GOALS) if (g.ok(F)) found[g.id] = found[g.id] || key;
    }
  });
  for (const g of F.GOALS) if (!found[g.id]) fail('fit', g.id, 'this goal cannot be found');
  F.si = 0; F.mh = 1; F.ch = 0; F.touched = false; F.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* Every state of Newton's method: each curve, every first guess and every
   number of steps. f, f′ and each guess are worked here from the curves
   written out by hand, the cubic's root is found by halving, and every
   number in the working must be that value to four places, with = only
   where nothing was rounded away. The verdict is read for each state: a
   root already, a root reached, a flat tangent with no next step, a loop,
   or where the tangent lands next; a jump past a root is named on the two
   curves that bend upward. Each goal must be findable, and none met where
   the workshop opens. */
const newtonNotes = (() => {
  const W = Newton;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const r4 = x => { const r = Math.round(x * 1e4) / 1e4; return Object.is(r, -0) ? 0 : r; };
  const exact = x => Math.abs(x - Math.round(x * 1e4) / 1e4) < 1e-9;
  const show = x => neg(r4(x)), eq = (x, sure) => (sure && exact(x) ? '=' : '≈');
  const par = x => (r4(x) < 0 ? '(' + show(x) + ')' : show(x));
  const sub = k => String(k).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
  let lo = -2, hi = -1.5;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (m ** 3 - 2 * m + 2 < 0) lo = m; else hi = m; }
  const HAND = {
    sq:   { f: x => x * x - 2, d: x => 2 * x, roots: [[Math.SQRT2, '√2 ≈ 1.4142', '√2'], [-Math.SQRT2, '−√2 ≈ −1.4142', '−√2']], up: true },
    cube: { f: x => x ** 3 - 2 * x + 2, d: x => 3 * x * x - 2, roots: [[lo, '≈ −1.7693']], up: false },
    two:  { f: x => x * x - 4 * x + 3, d: x => 2 * x - 4, roots: [[1, '1', '1'], [3, '3', '3']], up: true }
  };
  const found = {};
  let n = 0;
  if (W.ci !== 0 || W.xh !== 2 || W.n !== 0 || W.touched) fail('newton', 'start', 'the workshop does not open on x² − 2 at x₀ = 1, untouched');
  for (const g of W.GOALS) if (g.ok(W)) fail('newton', 'start', `${g.id} is met before anything is pressed`);
  if (Math.abs(W.CURVES[1].roots[0][0] - lo) > 1e-12) fail('newton', 'cube', 'the root of x³ − 2x + 2 is not where halving finds it');
  const reach = { 1: new Set(), 3: new Set() };
  W.CURVES.forEach((C, ci) => {
    const H = HAND[C.id];
    for (let xh = -6; xh <= 6; xh++) for (let want = 0; want <= 6; want++) {
      W.ci = ci; W.xh = xh; W.n = want; W.touched = true; n++;
      const key = `${C.id} x0=${xh / 2} n=${want}`, L = W.working();
      const xs = [xh / 2];
      while (xs.length - 1 < want && H.d(xs[xs.length - 1]) !== 0) { const x = xs[xs.length - 1]; xs.push(x - H.f(x) / H.d(x)); }
      const m = xs.length - 1, X = xs[m], F = H.f(X), D = H.d(X);
      // a guess shows in full only if every number it was worked from did
      const ok = [true];
      for (let k = 1; k <= m; k++) ok.push(ok[k - 1] && exact(H.f(xs[k - 1])) && exact(H.d(xs[k - 1])) && exact(xs[k]));
      if (W.path().length !== xs.length || W.path().some((x, i) => Math.abs(x - xs[i]) > 1e-9)) { fail('newton', key, 'the guesses are not the ones worked here'); continue; }
      if (L[0] !== `f(x) = ${C.name}, so f′(x) = ${C.d}. Each step slides down the tangent to the axis: the next x is x − f(x)/f′(x).`) fail('newton', key, `the first line reads: ${L[0]}`);
      for (let k = 1; k <= m; k++) {
        const a = xs[k - 1], Fa = H.f(a), Da = H.d(a);
        const line = `f(x${sub(k - 1)}) ${eq(Fa, ok[k - 1])} ${show(Fa)} and f′(x${sub(k - 1)}) ${eq(Da, ok[k - 1])} ${show(Da)}, so x${sub(k)} = ${show(a)} − ${par(Fa)}/${par(Da)} ${eq(xs[k], ok[k])} ${show(xs[k])}.`;
        if (L[k] !== line) fail('newton', key, `step ${k} reads: ${L[k]}, not ${line}`);
      }
      const rest = L.slice(m + 1);
      // a jump past a root, on the curves that bend upward
      let jk = 0, jr = null;
      for (let k = 1; k <= m && !jk; k++) for (const r of H.roots)
        if ((xs[k - 1] - r[0]) * (xs[k] - r[0]) < 0 && Math.abs(xs[k - 1] - r[0]) >= 5e-5 && Math.abs(xs[k] - r[0]) >= 5e-5) { jk = k; jr = r; break; }
      const jl = rest.find(t => /jumped right past/.test(t));
      if (H.up && jk) {
        if (jl !== `The step to x${sub(jk)} jumped right past ${jr[2]}: this curve bends upward, so a tangent from a point below the axis lands beyond the root, and from there the steps close in from the far side.`) fail('newton', key, `the jump is told wrongly: ${jl}`);
        if (H.f(xs[jk - 1]) >= 0) fail('newton', key, 'a jump started from above the axis');
      } else if (jl) fail('newton', key, `a jump is told where there is none: ${jl}`);
      const last = rest[rest.length - 1], at = `${m ? 'Now' : 'Start at'} x${sub(m)} ${eq(X, ok[m])} ${show(X)}`;
      const rt = H.roots.find(([r]) => Math.abs(X - r) < 5e-5);
      let lp = null;
      for (let k = 1; k <= m && !lp; k++) for (let j = 0; j < k; j++) if (Math.abs(xs[k] - xs[j]) < 1e-9 && !H.roots.some(([r]) => Math.abs(xs[k] - r) < 5e-5)) { lp = [j, k]; break; }
      let wantLast;
      if (H.f(xs[0]) === 0) wantLast = `x₀ = ${show(xs[0])} is a root already: f(x₀) = 0, so every step stays where it is.`;
      else if (rt) wantLast = `${at}, where f(x${sub(m)}) ${eq(F, ok[m])} ${show(F)}: that is the root ${rt[1]}, to four places.`;
      else if (D === 0) wantLast = `${at}, where f′(x${sub(m)}) = 0: the tangent there is flat, so it never meets the axis and there is no next step. Start somewhere else.`;
      else if (lp) wantLast = `x${sub(lp[1])} ${eq(xs[lp[1]], ok[lp[1]])} ${show(xs[lp[1]])} is back where x${sub(lp[0])} was: from here the steps go round the same ${['', 'one', 'two', 'three'][lp[1] - lp[0]]} points for ever and never reach a root.`;
      else {
        const nx = X - F / D, sure = ok[m] && exact(F) && exact(D);
        wantLast = `${at}, where f(x${sub(m)}) ${eq(F, ok[m])} ${show(F)} and f′(x${sub(m)}) ${eq(D, ok[m])} ${show(D)}. Its tangent meets the axis at ${eq(nx, sure) === '=' ? '' : 'about '}${show(nx)}` +
          (m < 6 ? ': take a step to go there.' : ', but six steps is as far as this goes.');
      }
      if (last !== wantLast) fail('newton', key, `the verdict reads: ${last}, not ${wantLast}`);
      if (rest.length !== (H.up && jk ? 2 : 1)) fail('newton', key, `the readout has ${rest.length} closing lines`);
      if (D === 0 && W.path(m + 1).length !== xs.length) fail('newton', key, 'a step is taken from a flat tangent');
      if (C.id === 'two' && m > 0 && H.f(xs[0]) !== 0 && rt) reach[rt[0]].add(key);
      for (const g of W.GOALS) if (g.id !== 'both' && g.ok(W)) found[g.id] = found[g.id] || key;
    }
  });
  // reaching both roots of x² − 4x + 3 is kept across starts
  if (reach[1].size && reach[3].size) {
    W.ci = 2; W.reached = new Set([1]);
    const both = W.GOALS.find(g => g.id === 'both');
    if (both.ok(W)) fail('newton', 'both', 'one root reached is counted as both');
    W.reached.add(3);
    if (both.ok(W)) found.both = 'both roots';
    W.ci = 0;
    if (both.ok(W)) fail('newton', 'both', 'both roots count on another curve');
  }
  for (const g of W.GOALS) if (!found[g.id]) fail('newton', g.id, 'this goal cannot be found');
  W.ci = 0; W.xh = 2; W.n = 0; W.touched = false; W.done.clear(); W.reached = new Set();
  return { n, goals: Object.keys(found).length };
})();

/* Every state of the chain rule workshop: each pair of links, every x and
   both rules. y and dy/dx are worked here from y written out in full (so
   (3x − 1)² is 9x² − 6x + 1, and its slope 18x − 6), not from the product
   of the two slopes the workshop shows, and the slip from f′ written out by
   hand. Every line of the working must carry those numbers to four places,
   with = only where nothing was rounded; the nudge must be worked from y,
   and land within 0.005 of dy/dx; the verdict must say which rule is right
   and why. The figure's curve must be y. Each goal must hold exactly where
   its sentence says, be findable, and not be met where the workshop opens. */
const chainNotes = (() => {
  const C = Chain;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const rN = (x, dp) => { const k = 10 ** dp, r = Math.round(x * k) / k; return Object.is(r, -0) ? 0 : r; };
  const show = (x, dp = 4) => neg(rN(x, dp)), eq = (x, dp = 4) => (Math.abs(x - rN(x, dp)) < 1e-9 ? '=' : '≈');
  const par = x => (rN(x, 4) < 0 ? '(' + show(x) + ')' : show(x));
  const HAND = [
    { u: x => 3 * x - 1, y: x => 9 * x * x - 6 * x + 1, dy: x => 18 * x - 6, g1: x => 3, f1: u => 2 * u },
    { u: x => x * x - 1, y: x => x ** 6 - 3 * x ** 4 + 3 * x * x - 1, dy: x => 6 * x ** 5 - 12 * x ** 3 + 6 * x, g1: x => 2 * x, f1: u => 3 * u * u },
    { u: x => x * x, y: x => x ** 4 - 2 * x * x, dy: x => 4 * x ** 3 - 4 * x, g1: x => 2 * x, f1: u => 2 * u - 2 }
  ];
  const rate = (k, a, b) => k === 0 ? `${a} stands still for a moment as ${b} moves`
    : `${a} moves ${Math.abs(k) === 1 ? 'as fast as' : show(Math.abs(k)) + ' times as fast as'} ${b}${k < 0 ? ', the other way' : ''}`;
  if (C.PAIRS.length !== HAND.length) fail('chain', 'pairs', `${C.PAIRS.length} pairs, ${HAND.length} written out here`);
  C.touched = false;
  C.pi = 0; C.xh = 2; C.slip = false;
  for (const g of C.GOALS) if (g.ok(C)) fail('chain', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  C.PAIRS.forEach((P, pi) => {
    const H = HAND[pi];
    for (let xh = C.XLO; xh <= C.XHI; xh++) for (const slip of [false, true]) {
      C.pi = pi; C.xh = xh; C.slip = slip; n++;
      const x = xh / 2, u = H.u(x), y = H.y(x), dy = H.dy(x), gp = H.g1(x), fp = H.f1(u), w = H.f1(x) * gp;
      const key = `${pi} x=${x}${slip ? ' slip' : ''}`;
      if (Math.abs(figEval(P.y, x) - y) > 1e-9) fail('chain', key, `the figure's curve gives ${figEval(P.y, x)}, y is ${y}`);
      if (Math.abs(fp * gp - dy) > 1e-9) fail('chain', key, `f′(u) × g′(x) = ${fp * gp} is not the slope of y, ${dy}`);
      if (Math.abs(C.dy() - dy) > 1e-9) fail('chain', key, `dy/dx is ${C.dy()}, should be ${dy}`);
      const X = show(x), h = 0.001, y1 = H.y(x - h), y2 = H.y(x + h), r = (y2 - y1) / (2 * h);
      if (Math.abs(r - dy) > 0.005) fail('chain', key, `the nudge gives ${r}, far from dy/dx = ${dy}`);
      const ab = v => (eq(v, 6) === '≈' ? 'about ' : '') + show(v, 6);
      const want = [
        `y = f(u) with f(u) = ${P.f}, and u = g(x) = ${P.g}.`,
        `At x = ${X}: u = g(${X}) ${eq(u)} ${show(u)}, so y = f(${show(u)}) ${eq(y)} ${show(y)}.`,
        `g′(x) = ${P.gd}, so g′(${X}) ${eq(gp)} ${show(gp)}: ${rate(gp, 'u', 'x')}.`,
        `f′(u) = ${P.fd}, so f′(${show(u)}) ${eq(fp)} ${show(fp)}: ${rate(fp, 'y', 'u')}.`,
        slip ? `The slip takes f′ at x: f′(x) × g′(x) = f′(${X}) × ${par(gp)} = ${par(H.f1(x))} × ${par(gp)} ${eq(w)} ${show(w)}.`
          : `So dy/dx = f′(u) × g′(x) = ${par(fp)} × ${par(gp)} ${eq(dy)} ${show(dy)}: ${rate(dy, 'y', 'x')}.`,
        `Check with a nudge: from x = ${show(x - h)} to ${show(x + h)}, y goes from ${ab(y1)} to ${ab(y2)}, so Δy/Δx ≈ ${show(r, 2)}.`,
        !slip ? `That agrees with dy/dx = ${show(dy)}.`
          : Math.abs(w - dy) > 1e-9 ? `So the slip's ${show(w)} is wrong: f′ has to be taken at u = ${show(u)}, where y sits, not at x = ${X}. The chain rule's answer is ${show(dy)}.`
          : gp === 0 ? `The slip gets it right here, but only because g′(${X}) = 0 makes both answers 0.`
          : `The slip gets it right here, but only by luck: g(${X}) = ${show(u)}, the same as x, so f′ is taken at the same number either way.`
      ];
      const got = C.working();
      if (got.length !== want.length) fail('chain', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('chain', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      if (slip && Math.abs(w - dy) < 1e-9 && gp !== 0 && Math.abs(u - x) > 1e-9) fail('chain', key, 'the slip is right by luck, but not because g(x) = x');
      const meant = { inner: gp === 0 && fp !== 0, outer: fp === 0 && gp !== 0, neg: dy < 0, big: dy > 50,
        miss: slip && Math.abs(w - dy) > 1e-9, luck: slip && Math.abs(w - dy) < 1e-9 && gp !== 0 };
      for (const g of C.GOALS) {
        if (!!g.ok(C) !== meant[g.id]) fail('chain', key, `goal ${g.id} is ${g.ok(C) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (g.ok(C)) found[g.id] = found[g.id] || key;
      }
    }
  });
  for (const g of C.GOALS) if (!found[g.id]) fail('chain', g.id, 'this goal cannot be found');
  C.pi = 0; C.xh = 2; C.slip = false; C.touched = false; C.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* Every state of the two castles workshop: each rule, each start and every
   night. The split is worked here by multiplying by the matrix night after
   night, not from the steady split and the other eigenvalue as the workshop
   does, and each rule's steady split is checked to be left alone by its
   matrix, with its other eigenvalue the trace less 1. Every line of the
   readout is checked exactly, each goal holds exactly where its sentence
   says, each can be found, and none is met where the workshop opens. */
const castlesNotes = (() => {
  const K = Castles;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const r2 = x => { const r = Math.round(x * 100) / 100; return Object.is(r, -0) ? 0 : r; };
  const show = x => neg(r2(x)), exact = x => Math.abs(x - r2(x)) < 1e-9;
  const eq = x => (exact(x) ? '=' : '≈'), ab = x => (exact(x) ? '' : 'about ') + show(x), pc = x => Math.round(x * 100) + '%';
  const SPLIT = [[0.1, 0.3], [0.5, 0.5], [1, 1]];
  if (K.RULES.length !== SPLIT.length) fail('castles', 'rules', `${K.RULES.length} rules, ${SPLIT.length} written out here`);
  K.RULES.forEach((R, ri) => {
    const [p, q] = SPLIT[ri];
    if (R.p !== p || R.q !== q) fail('castles', R.btn, `rides ${R.p} and ${R.q}, should be ${p} and ${q}`);
    const M = [[1 - p, q], [p, 1 - q]], S = R.star;
    const MS = [M[0][0] * S + M[0][1] * (100 - S), M[1][0] * S + M[1][1] * (100 - S)];
    if (Math.abs(MS[0] - S) > 1e-9 || Math.abs(MS[1] - (100 - S)) > 1e-9) fail('castles', R.btn, `⟨${S}, ${100 - S}⟩ is moved to ⟨${MS}⟩, so it is not the steady split`);
    if (Math.abs(M[0][0] + M[1][1] - 1 - R.lam) > 1e-9) fail('castles', R.btn, `the other eigenvalue is ${M[0][0] + M[1][1] - 1}, not ${R.lam}`);
    const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
    if (Math.abs(det - R.lam) > 1e-9) fail('castles', R.btn, `det M = ${det} should be 1 × ${R.lam}`);
  });
  K.touched = false; K.ri = 0; K.ah = 20; K.n = 0; K.sides = new Set();
  for (const g of K.GOALS) if (g.ok(K)) fail('castles', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  K.RULES.forEach((R, ri) => {
    const [p, q] = SPLIT[ri], S = R.star, L = R.lam;
    for (let ah = K.ALO; ah <= K.AHI; ah++) {
      const a0 = ah * 5, xs = [a0];
      for (let k = 0; k < K.NMAX; k++) { const a = xs[k]; xs.push((1 - p) * a + q * (100 - a)); }
      for (let nn = 0; nn <= K.NMAX; nn++) {
        K.ri = ri; K.ah = ah; K.n = nn; K.sides = new Set(); n++;
        const key = `${R.btn} A=${a0} n=${nn}`;
        for (let k = 0; k <= nn; k++) if (Math.abs(K.A(k) - xs[k]) > 1e-9) fail('castles', key, `night ${k} gives A = ${K.A(k)}, the matrix gives ${xs[k]}`);
        const want = [R.say, `So a night is the matrix M with rows ${show(1 - p)}, ${show(q)} and ${show(p)}, ${show(1 - q)}: the split ⟨A, B⟩ after a night is M times the split before it, and after n nights it is Mⁿ times the start.`];
        if (!nn) want.push(`Night 0: A has ${a0} and B has ${100 - a0}.`);
        else {
          const a = xs[nn - 1], keep = (1 - p) * a, gain = q * (100 - a), A = xs[nn];
          want.push(`Night ${nn}: A keeps ${pc(1 - p)} of ${ab(a)} ${eq(keep)} ${show(keep)} and gains ${pc(q)} of ${ab(100 - a)} ${eq(gain)} ${show(gain)}, so A has ${ab(A)} and B has ${ab(100 - A)}.`);
          const seen = xs.slice(0, nn + 1);
          want.push(`A, night by night: ${seen.map(show).join(', ')}${seen.every(exact) ? '' : ' (to two places)'}.`);
        }
        const near = nn > 0 && Math.abs(xs[nn] - S) < 1;
        if (a0 === S) want.push(`A = ${S} and B = ${100 - S} is the steady split: each night ${show(a0 * p)} ride from A to B and ${show(a0 * p)} ride back, so nothing changes. ⟨${S}, ${100 - S}⟩ is the eigenvector with λ = 1.`);
        else if (!nn) want.push(`The steady split has ${S} in A. Take a night to see what happens.`);
        else if (L === 0) want.push(`One night is enough: both castles end with ${S}, the steady split, and stay there. The other eigenvalue is 0, so the gap from it vanishes at once.`);
        else if (L === -1) want.push(`Everyone swaps, so the split flips back and forth for ever: the gap from ${S} is multiplied by −1 each night and never shrinks. That −1 is the matrix's other eigenvalue.`);
        else {
          const g = xs[nn] - S;
          want.push(`The steady split has ${S} in A. A's gap from it is (${a0} − ${S}) × ${show(L)}${nn > 1 ? '^' + nn : ''} ${eq(g)} ${show(g)}: each night the gap shrinks to ${show(L)} of itself, the matrix's other eigenvalue.` + (near ? ` A is now within 1 of ${S}.` : ''));
        }
        if (a0 === S && (100 - a0) * q !== a0 * p) fail('castles', key, 'the riders each way do not match, so this split is not steady');
        const got = K.working();
        if (got.length !== want.length) fail('castles', key, `${got.length} lines, expected ${want.length}`);
        want.forEach((l, i) => { if (got[i] !== l) fail('castles', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
        // what each goal's sentence says, read off the nights worked here
        const flips = nn >= 2 && xs[nn] !== xs[nn - 1] && Math.abs(xs[nn] - xs[nn - 2]) < 1e-9;
        const still = nn > 0 && xs.slice(0, nn + 1).every(v => v === a0);
        const meant = { close: ri === 0 && Math.abs(a0 - S) >= 20 && near, both: false,
          steady: ri === 0 && still, one: ri === 1 && a0 !== S && nn === 1 && xs[1] === S,
          flip: ri === 2 && flips, still: ri === 2 && still };
        if (ri === 1 && a0 !== S && nn >= 1 && xs[nn] !== S) fail('castles', key, `Even should reach ${S} in a night, gives ${xs[nn]}`);
        for (const g of K.GOALS) {
          if (!!g.ok(K) !== meant[g.id]) fail('castles', key, `goal ${g.id} is ${g.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
          if (g.ok(K)) found[g.id] = found[g.id] || key;
        }
      }
    }
  });
  // closing in from both sides is kept across starts: it needs one close from above and one from below
  K.ri = 0; K.sides = new Set(['above']);
  if (K.GOALS.find(g => g.id === 'both').ok(K)) fail('castles', 'both', 'met after closing in from one side only');
  K.sides.add('below');
  if (!K.GOALS.find(g => g.id === 'both').ok(K)) fail('castles', 'both', 'not met after closing in from both sides');
  K.ri = 1;
  if (K.GOALS.find(g => g.id === 'both').ok(K)) fail('castles', 'both', 'met on a rule other than Drift');
  found.both = 'Drift, from 100 and from 55';
  for (const g of K.GOALS) if (!found[g.id]) fail('castles', g.id, 'this goal cannot be found');
  if (figEval({ poly: [[75, 0]] }, 3) !== 75) fail('castles', 'figure', 'the steady line is not flat at 75');
  K.ri = 0; K.ah = 20; K.n = 0; K.touched = false; K.sides = new Set(); K.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* Every state of the cistern workshop: each spring and every half hour. The
   total is worked here as the area under the flow, added up from strips a
   thousandth of an hour wide, and must match the workshop's F to within the
   strips' own error; F′ = f is checked by a nudge; the figure's two curves are
   checked against both. Where the flow is 0, F must turn the way the readout
   says. Every line of the readout is checked exactly, each goal holds exactly
   where its sentence says, each can be found, and none is met where it opens. */
const cisternNotes = (() => {
  const K = Cistern;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const show = x => { const r = Math.round(x * 1000) / 1000; return neg(Object.is(r, -0) ? 0 : r); };
  const FLOW = { fade: t => 6 - 2 * t, steady: () => 4, tide: t => 3 * t * t - 12 * t + 9 };
  const area = (f, b) => { const n = 4000, h = b / n; let s = 0; for (let i = 0; i < n; i++) s += (f(i * h) + f((i + 1) * h)) / 2 * h; return s; };
  const bb = n => `${show(n)} barrel${Math.abs(n) === 1 ? '' : 's'}`;
  if (K.SETS.map(S => S.id).join() !== 'fade,steady,tide') fail('cistern', 'sets', K.SETS.map(S => S.id).join());
  K.touched = false; K.si = 0; K.th = K.SETS[0].start;
  for (const g of K.GOALS) if (g.ok(K)) fail('cistern', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  K.SETS.forEach((S, si) => {
    const fl = FLOW[S.id];
    if (S.start <= S.lo || S.start >= S.hi) fail('cistern', S.id, `starts at t = ${S.start / 2}`);
    for (let th = S.lo; th <= S.hi; th++) {
      K.si = si; K.th = th; n++;
      const t = th / 2, key = `${S.id} t=${t}`, T = show(t), F = K.F(), f = K.f();
      if (Math.abs(f - fl(t)) > 1e-9) fail('cistern', key, `the flow is ${f}, its formula gives ${fl(t)}`);
      if (Math.abs(F - area(fl, t)) > 1e-5) fail('cistern', key, `the total is ${F}, the area under the flow is ${area(fl, t)}`);
      if (Math.abs((K.F(t + 1e-4) - K.F(t - 1e-4)) / 2e-4 - f) > 1e-5) fail('cistern', key, 'F′ is not f');
      if (Math.abs(figEval({ poly: S.Fp }, t) - F) > 1e-9 || Math.abs(figEval({ poly: S.fp }, t) - f) > 1e-9) fail('cistern', key, "the figure's curves disagree");
      if (Math.round(F * 1000) / 1000 !== F && Math.abs(Math.round(F * 1000) / 1000 - F) > 1e-9) fail('cistern', key, `the total ${F} is not exact to three places`);
      const want = [S.say, `The total in the cistern after t hours is the area under f from 0 to t. Here that is F(t) = ${S.Fform}, and F′(t) = ${S.fform} = f(t): the total climbs exactly as fast as the water flows in.`];
      const sub = S.id === 'steady' ? `4 × ${T} = ${show(4 * t)}`
        : S.id === 'fade' ? `6 × ${T} − ${T}² = ${show(6 * t)} − ${show(t * t)} = ${show(F)}`
        : `${T}³ − 6 × ${T}² + 9 × ${T} = ${show(t ** 3)} − ${show(6 * t * t)} + ${show(9 * t)} = ${show(F)}`;
      if (th === 0) want.push('At t = 0 h nothing has flowed yet, so F(0) = 0.');
      else if (S.id === 'steady') want.push(`At t = ${T} h the area under f is a rectangle 4 tall and ${T} wide, so F(${T}) = ${sub} barrels.`);
      else want.push(`At t = ${T} h: F(${T}) = ${sub} barrels.`);
      const now = `The flow now is f(${T}) = ${bb(f)} an hour`;
      if (f > 0) want.push(`${now}, above 0: water comes in, so the total still climbs.`);
      else if (f < 0) want.push(`${now}, below 0: water runs out, so the total is falling.`);
      else {
        const up = K.F(t - 0.25) < F && K.F(t + 0.25) < F, down = K.F(t - 0.25) > F && K.F(t + 0.25) > F;
        if (!up && !down) fail('cistern', key, 'the flow is 0 but the total does not turn');
        if (up) want.push(`${now}: the tangent to F is flat. f is above 0 just before and below 0 just after, so F climbs to here and falls after: ${S.id === 'fade' ? `${bb(F)} is the most the cistern ever holds.` : `with ${bb(F)} the cistern is fuller here than just before or just after.`}`);
        else want.push(`${now}: the tangent to F is flat. f is below 0 just before and above 0 just after, so F falls to here and climbs after: ${F === 0 ? 'the cistern runs dry here, then starts to fill again.' : `with ${bb(F)} the cistern is emptier here than just before or just after.`}`);
        if (S.id === 'fade' && up) for (let k = S.lo; k <= S.hi; k++) if (K.F(k / 2) > F) fail('cistern', key, `the cistern holds more at t = ${k / 2}`);
      }
      const add = area(fl, t + 0.1) - area(fl, t), same = Math.abs(add - f * 0.1) < 1e-9;
      if (Math.abs(add - (K.F(t + 0.1) - F)) > 1e-6) fail('cistern', key, 'the next tenth of an hour does not add its strip of area');
      want.push(`In the next tenth of an hour the total changes by F(${show(t + 0.1)}) − F(${T}) = ${bb(K.F(t + 0.1) - F)}, ${same ? 'exactly' : 'close to'} f(${T}) × 0.1 = ${show(f * 0.1)}: a strip f tall and a tenth of an hour wide.${same ? '' : ' The thinner the strip, the closer it gets.'}`);
      if (th > 0 && F === 0) {
        let top = 0, pos = 0; for (let k = 0; k <= th; k++) top = Math.max(top, K.F(k / 2));
        { const m = 4000, h = t / m; for (let i = 0; i < m; i++) pos += Math.max(0, (fl(i * h) + fl((i + 1) * h)) / 2) * h; }
        if (Math.abs(pos - top) > 1e-3) fail('cistern', key, `the area above the axis is ${pos}, the readout says ${top}`);
        want.push(`F(${T}) = 0: the cistern is empty again. The ${show(top)} barrels that came in, the area above the axis, are cancelled by the area below it: an integral counts area below the axis as negative.`);
      }
      const got = K.working();
      if (got.length !== want.length) fail('cistern', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('cistern', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      const fullest = [...Array(S.hi - S.lo + 1).keys()].every(k => K.F((S.lo + k) / 2) <= F);
      const meant = { full: si === 0 && fullest, drain: si === 0 && f < 0 && F > 0, empty: si === 0 && th > 0 && Math.abs(F) < 1e-9,
        ten: si === 1 && Math.abs(F - 10) < 1e-9, high: si === 2 && f === 0 && K.F(t - 0.25) < F && th === Math.min(...[...Array(S.hi + 1).keys()].filter(k => k > 0 && K.f(k / 2) === 0)),
        low: si === 2 && f === 0 && K.F(t - 0.25) > F };
      for (const g of K.GOALS) {
        if (!!g.ok(K) !== meant[g.id]) fail('cistern', key, `goal ${g.id} is ${g.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (g.ok(K)) found[g.id] = found[g.id] || key;
      }
    }
  });
  for (const g of K.GOALS) if (!found[g.id]) fail('cistern', g.id, 'this goal cannot be found');
  K.si = 0; K.th = K.SETS[0].start; K.touched = false; K.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The workshop a fight offers for a topic that fell must be one the Tome
   holds, under the name the Tome gives it, and must open: a button that names
   the wrong workshop, or one that has gone, sends the player nowhere. */
const handsOnNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const { LABEL, FOR } = new Function(cut('const TOPIC_LABEL = {', '/* Topics grouped into strands.') +
    cut('const WORKSHOP_FOR = (() => {', '/* ------------------------------- mastery') + 'return { LABEL: TOPIC_LABEL, FOR: WORKSHOP_FOR };')();
  const mods = new Set();
  for (const k in FOR) {
    const { mod, name } = FOR[k];
    mods.add(mod);
    if (!LABEL[k]) fail('hands-on', k, 'is not a topic');
    const card = html.match(new RegExp(`<h2 style="font-size:16px;color:var\\(--gold\\)">([^<]*)</h2>[\\s\\S]{0,400}?onclick="${mod}\\.open\\(\\)"`));
    if (!card) fail('hands-on', k, `the Tome has no card that opens ${mod}`);
    else if (card[1] !== name) fail('hands-on', k, `the Tome calls ${mod} "${card[1]}", the fight calls it "${name}"`);
    if (!new RegExp(`const ${mod} = \\{[\\s\\S]*?\\n  open\\(\\)\\{ UI\\.go\\('s-`).test(script)) fail('hands-on', k, `${mod} has no open()`);
  }
  return { topics: Object.keys(FOR).length, mods: mods.size };
})();

/* The ladder workshop: every ladder at every foot position. The top's height
   is worked from Pythagoras, the top's speed from a nudge in time of that
   height, the ladder's length must hold, the 0.01 s check is rebuilt from the
   two heights, and the speed bars must stand in the top's ratio to the foot.
   Every sentence and goal is rebuilt here. */
const ladderNotes = (() => {
  const K = Ladder;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const show = (v, d = 4) => { const p = 10 ** d, r = Math.round(v * p) / p; return neg(Object.is(r, -0) ? 0 : r); };
  const sure = (v, d = 4) => Math.abs(Math.round(v * 10 ** d) / 10 ** d - v) < 1e-12;
  const is = (v, d = 4) => `${sure(v, d) ? '=' : '≈'} ${show(v, d)}`;
  const ab = (v, d = 4) => (sure(v, d) ? '' : 'about ') + show(v, d);
  if (K.SETS.map(S => S.id).join() !== 'five,thirteen,ten') fail('ladder', 'sets', K.SETS.map(S => S.id).join());
  K.touched = false; K.si = 0; K.k = K.SETS[0].s;
  for (const g of K.GOALS) if (g.ok(K)) fail('ladder', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  K.SETS.forEach((S, si) => {
    const L = S.L, v = S.v;
    if (S.X.some((x, i) => !(x > 0 && x < L) || (i && x <= S.X[i - 1]))) fail('ladder', S.id, 'the foot must step out, staying between the wall and the ladder\'s length');
    if (!S.X.some(x => Number.isInteger(x) && Number.isInteger(Math.sqrt(L * L - x * x)))) fail('ladder', S.id, 'no whole-number place, as the battles ask about');
    S.X.forEach((x, k) => {
      K.si = si; K.k = k; n++;
      const key = `${S.id} x=${x}`, H = X => Math.sqrt(L * L - X * X), y = H(x);
      if (Math.abs(K.y() ** 2 + x * x - L * L) > 1e-9) fail('ladder', key, 'the ladder has changed length');
      const dt = 1e-7, rate = (H(x + v * dt) - H(x - v * dt)) / (2 * dt);
      if (Math.abs(K.yp() - rate) > 1e-5) fail('ladder', key, `the top moves at ${rate} m/s by a nudge, the readout says ${K.yp()}`);
      if (Math.abs(K.yp() / -v - x / y) > 1e-9) fail('ladder', key, 'the top is not x/y times as fast as the foot');
      const x2 = x + v * K.DT, f = y - H(x2), M = Math.round(Math.abs(f / K.DT + K.yp()) * 1e4) / 1e4;
      if (K.miss() !== M) fail('ladder', key, `the check misses by ${K.miss()}, expected ${M}`);
      if (!(f / K.DT > -K.yp())) fail('ladder', key, 'the top should fall faster over the next moment than at this one');
      const r = x / y, yp = -x * v / y;
      const cmp = Math.abs(r - 1) < 1e-9 ? 'exactly as fast as' : r < 1 ? 'slower than' : 'faster than';
      const want = [
        `The ladder is ${L} m long, so x² + y² = ${L * L} at every moment. With the foot x = ${show(x)} m from the wall, the top is y = √(${L * L} − ${show(x * x)}) ${is(y)} m up.`,
        'Differentiate both sides in time: 2x·x′ + 2y·y′ = 0, so y′ = −x·x′/y.',
        `The foot slides out at x′ = ${v} m/s, so y′ = −${show(x)} × ${v} / ${show(y)} ${is(yp)} m/s.`,
        `So the top slides down at ${ab(-yp)} m/s, ${cmp} the foot's ${v} m/s: the top always moves x/y times as fast as the foot, and here x/y ${is(r)}.`,
        `Check: ${K.DT} s later the foot is at ${show(x2)} m and the top at ${is(H(x2))} m, so the top fell ${is(f, 6)} m, about ${show(f / K.DT)} m/s. ` +
          (M <= 0.1 ? 'That matches y′ to within 0.1 m/s: over so short a time the speed hardly changes.'
                    : `That is already ${show(M)} m/s faster than y′ says: this near the ground the top's speed is changing fast.`)
      ];
      const got = K.working();
      if (got.length !== want.length) fail('ladder', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('ladder', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: the ladder's ends on the wall and the ground, the bars in the speeds' ratio
      const svg = K.svg();
      const lad = svg.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="[^"]+" stroke-width="4"/);
      const bars = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map(m => +m[3]);
      if (!lad) fail('ladder', key, 'the ladder is not drawn');
      else {
        const [fx, fy, tx, ty] = lad.slice(1).map(Number), k0 = (fx - tx) / x;
        if (Math.abs((fy - ty) - y * k0) > 0.03) fail('ladder', key, 'the ladder is not drawn to scale');
        if (Math.hypot(fx - tx, fy - ty) > 175) fail('ladder', key, 'the ladder runs out of the picture');
      }
      if (bars.length !== 2 || Math.abs(bars[1] / bars[0] - r) > 0.01 || Math.max(...bars) > 140) fail('ladder', key, `the speed bars are ${bars.join(' and ')}, not in the ratio ${r}`);
      const meant = { slow: -yp < v - 1e-9, whole: Number.isInteger(x) && Math.abs(y - Math.round(y)) < 1e-9, fast: -yp > 3 * v, bend: M > 0.1 };
      for (const gl of K.GOALS) {
        if (!!gl.ok(K) !== meant[gl.id]) fail('ladder', key, `goal ${gl.id} is ${gl.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(K)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of K.GOALS) if (!found[g.id]) fail('ladder', g.id, 'this goal cannot be found');
  K.si = 0; K.k = K.SETS[0].s; K.touched = false; K.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The slope tracer workshop: every curve, every stop, every set of marks.
   Each slope is checked against the derivative worked out by hand, never
   against the nudge the workshop uses; the nudge's rise must give the slope
   it claims; each x label is read back as a number; every sentence's
   condition is worked out independently; every dot must sit at the height of
   the true derivative, and the traced curve must be the derivative itself. */
const tracerNotes = (() => {
  const W = Tracer;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const D = { sin: Math.cos, cos: x => -Math.sin(x), exp: Math.exp, ln: x => 1 / x };
  const X = { sin: i => (i - 4) * Math.PI / 4, cos: i => (i - 4) * Math.PI / 4, exp: i => (i - 4) / 2, ln: i => (i + 1) / 2 };
  const name = { sin: 'cos x', cos: '−sin x', exp: 'eˣ', ln: '1/x' };
  const box = { sin: [-3.5, 3.5, -1.4, 1.4], cos: [-3.5, 3.5, -1.4, 1.4], exp: [-2.25, 2.25, -0.5, 7.8], ln: [0, 4.75, -1, 2.2] };
  const label = l => Function('π', 'return ' + l.replace(/−/g, '-').replace(/(\d)π/g, '$1*π'))(Math.PI);
  if (W.SETS.map(S => S.id).join() !== 'sin,cos,exp,ln') fail('tracer', 'sets', W.SETS.map(S => S.id).join());
  const reset = () => { W.touched = false; W.k = W.START; W.seen.forEach((z, i) => { z.clear(); z.add(W.START); }); };
  reset(); W.si = 0;
  for (const g of W.GOALS) if (g.ok(W)) fail('tracer', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.pick(si); for (const g of W.GOALS) if (g.ok(W)) fail('tracer', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0; const found = {};
  W.SETS.forEach((S, si) => {
    const d = D[S.id];
    for (let k = 0; k < 9; k++) {
      const x = X[S.id](k), dx = d(x);
      for (const seen of [[W.START], [W.START, k], [k, (k + 3) % 9, (k + 5) % 9], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7, 8]]) {
        reset(); W.si = si; W.k = k; W.touched = true; W.seen[si] = new Set(seen); n++;
        const key = `${S.id} at stop ${k} with ${W.seen[si].size} marked`;
        if (Math.abs(W.x() - x) > 1e-12) fail('tracer', key, `the stop is at ${W.x()}, not ${x}`);
        if (Math.abs(label(W.xl()) - x) > 1e-9) fail('tracer', key, `the label ${W.xl()} does not read as ${x}`);
        if (Math.abs(W.slope() - dx) > 6e-5) fail('tracer', key, `the slope reads ${W.slope()}, but the derivative is ${dx}`);
        if (Math.abs(W.rise() / 0.002 - W.slope()) > 1e-4) fail('tracer', key, `a rise of ${W.rise()} over 0.002 is not a slope of ${W.slope()}`);
        const got = W.working(), txt = got.join('\n'), L = W.xl(), s = Math.round(dx * 1e4) / 1e4, sl = neg(Object.is(s, -0) ? 0 : s);
        if (!got[1].startsWith(`At x = ${L}: f(${L}) `)) fail('tracer', key, got[1]);
        if (!got[1].endsWith(`so the tangent's slope here is about ${sl}.`)) fail('tracer', key, `the slope sentence should end at ${sl}: ${got[1]}`);
        const word = /rises by/.test(got[1]) ? 1 : /falls by/.test(got[1]) ? -1 : /does not change/.test(got[1]) ? 0 : NaN;
        if (word !== Math.sign(s)) fail('tracer', key, 'the nudge says f moves the wrong way');
        const v = Math.round(S.f(x) * 1e4) / 1e4;
        if (!new RegExp(`^At x = [^:]+: f\\([^)]+\\) [=≈] ${neg(Object.is(v, -0) ? 0 : v).replace('.', '\\.')}\\.`).test(got[1])) fail('tracer', key, `f(${L}) should read ${v}`);
        if (/The slope is 0/.test(txt) !== (Math.abs(dx) < 1e-9)) fail('tracer', key, 'the flat sentence is wrong');
        if (/top of a hump/.test(txt) !== (Math.abs(dx) < 1e-9 && S.f(x) > 0)) fail('tracer', key, 'hump and dip are mixed up');
        if (/as steep as/.test(txt) !== (!!S.trig && Math.abs(Math.abs(dx) - 1) < 1e-9)) fail('tracer', key, 'the steepest sentence is wrong');
        if (/falls fastest/.test(txt) !== (!!S.trig && Math.abs(dx + 1) < 1e-9)) fail('tracer', key, 'falling fastest is claimed wrongly');
        if (/the dot lands on the curve/.test(txt) !== (S.id === 'exp')) fail('tracer', key, 'the lands-on-the-curve sentence is wrong');
        if (/A slope of 2 at/.test(txt) !== (S.id === 'ln' && Math.abs(dx - 2) < 1e-9)) fail('tracer', key, 'the slope-of-2 sentence is wrong');
        const all = seen.length === 9;
        if (txt.includes(`the dots trace out ${name[S.id]}`) !== all) fail('tracer', key, 'the traced sentence is wrong');
        if (!all && !txt.includes(`Marked so far: ${W.seen[si].size} of 9 stops.`)) fail('tracer', key, 'the count of marks is wrong');
        if (all && S.id !== 'exp') { const m = txt.match(/Here (.+?) [=≈] (−?[\d.]+), the same as the slope\./);
          if (!m || Math.abs(+m[2].replace('−', '-') - dx) > 6e-5) fail('tracer', key, 'the derivative is not worked at x');
          else if (m[1] !== { sin: `cos(${L})`, cos: `−sin(${L})`, ln: `1/${L}` }[S.id]) fail('tracer', key, `the derivative is written ${m[1]}`); }
        const svg = W.svg(), [x0, x1, y0, y1] = box[S.id];
        const PX = v => 20 + (v - x0) / (x1 - x0) * 320, PY = v => 188 - (v - y0) / (y1 - y0) * 176;
        const dots = [...svg.matchAll(/data-k="dot" cx="([\d.-]+)" cy="([\d.-]+)"/g)];
        if (dots.length !== W.seen[si].size) fail('tracer', key, `${dots.length} dots for ${W.seen[si].size} marks`);
        for (const [, cx, cy] of dots) { const at = [...W.seen[si]].map(j => X[S.id](j)).find(t => Math.abs(PX(t) - +cx) < 0.01);
          if (at === undefined || Math.abs(PY(d(at)) - +cy) > 0.05) fail('tracer', key, 'a dot is not at the height of the slope'); }
        if (/data-k="traced"/.test(svg) !== all) fail('tracer', key, 'the traced curve shows at the wrong time');
        if (all) { const pts = svg.match(/data-k="traced" points="([^"]+)"/)[1].split(' ').map(p => p.split(',').map(Number));
          for (const [px, py] of pts) { const t = x0 + (px - 20) / 320 * (x1 - x0), want = d(t);
            if (want > y0 - 0.4 && want < y1 + 0.4 && Math.abs(PY(want) - py) > 0.05) { fail('tracer', key, `the traced curve is not ${name[S.id]}`); break; } } }
        const tan = svg.match(/data-k="tan" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/);
        const ts = -((+tan[4]) - (+tan[2])) / ((+tan[3]) - (+tan[1])) * 320 / (x1 - x0) * (y1 - y0) / 176;
        if (Math.abs(ts - dx) > 0.01) fail('tracer', key, `the tangent is drawn with slope ${ts}, not ${dx}`);
        const meant = { flat: si === 0 && Math.abs(dx) < 1e-9, steep: si === 0 && Math.abs(dx + 1) < 1e-9, trace: si === 0 && all,
          cos: si === 1 && Math.abs(dx + 1) < 1e-9, exp: si === 2 && W.seen[2].size >= 3, ln: si === 3 && Math.abs(dx - 2) < 1e-9 };
        for (const gl of W.GOALS) {
          if (!!gl.ok(W) !== meant[gl.id]) fail('tracer', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}`);
          if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
        }
      }
    }
    // stepping marks each stop, and stops at both ends
    reset(); W.si = si;
    for (let i = 0; i < 6; i++) W.moveX(1);
    if (W.k !== 8) fail('tracer', S.id, 'stepping on does not stop at the last stop');
    for (let i = 0; i < 10; i++) W.moveX(-1);
    if (W.k !== 0) fail('tracer', S.id, 'stepping back does not stop at the first stop');
    if (W.seen[si].size !== 9) fail('tracer', S.id, 'walking every stop does not mark every stop');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('tracer', g.id, 'this goal cannot be found');
  reset(); W.si = 0; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The slice workshop: every function, both ways of slicing, every slice.
   Each slice's area is integrated afresh by Simpson's rule straight from
   f(x, y), never from the workshop's own formula; the swept total is
   integrated again from those areas, and both orders must land on the same
   double integral. The slice and S(t) as written are evaluated as formulas
   and must agree with f and with the areas. Every sentence's condition is
   worked out independently, the drawing is read back, and every goal is
   found by a real history of presses. */
const sliceNotes = (() => {
  const W = Slice;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const simpson = (g, a, b, n = 200) => { if (a === b) return 0; const h = (b - a) / n; let s = g(a) + g(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h); return s * h / 3; };
  // a formula as written, such as 1.5y, x², 2y + 2 or 9, read as code
  const evalF = (str, vars) => Function(...Object.keys(vars), 'return ' + str.replace(/−/g, '-').replace(/²/g, '**2').replace(/(\d)([xy])/g, '$1*$2'))(...Object.values(vars));
  if (W.SETS.map(S => S.id).join() !== 'xy,sq,sum') fail('slice', 'sets', W.SETS.map(S => S.id).join());
  const reset = () => { W.touched = false; W.k = W.START; W.hold = 'x'; W.swept.forEach(z => z.clear()); W.seen = new Set([W.START]); };
  reset(); W.si = 0;
  for (const g of W.GOALS) if (g.ok(W)) fail('slice', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => ['x', 'y'].forEach(h => { reset(); W.si = si; W.hold = h; for (const g of W.GOALS) if (g.ok(W)) fail('slice', g.id, `met where ${S.id} starts holding ${h}, so picking it gives the goal away`); }));
  let n = 0;
  const found = {};
  W.SETS.forEach((S, si) => {
    const totals = {};
    for (const h of ['x', 'y']) {
      const v = h === 'x' ? 'y' : 'x', L = h === 'x' ? S.a : S.b, M = h === 'x' ? S.b : S.a;
      const area = t => simpson(u => (h === 'x' ? S.f(t, u) : S.f(u, t)), 0, M);
      totals[h] = simpson(area, 0, L, 60);
      reset(); W.si = si; W.hold = h;
      if (W.steps() !== 2 * L) fail('slice', `${S.id} ${h}`, 'the slice should step by halves across the whole side');
      const flat = Math.abs(area(0) - area(L)) < 1e-9 && Math.abs(area(L / 2) - area(0)) < 1e-9;
      for (let k = 0; k <= 2 * L; k++) {
        for (const hist of [[], [h], [h === 'x' ? 'y' : 'x'], ['x', 'y']]) {
          for (const seen of [[k], [k, (k + 1) % (2 * L + 1)]]) {
            reset(); W.si = si; W.hold = h; W.k = k; W.touched = true; hist.forEach(z => W.swept[si].add(z)); W.seen = new Set(seen); n++;
            const t = k / 2, key = `${S.id} hold ${h} = ${t} swept ${hist.join('') || 'none'} seen ${seen.length}`;
            const A = area(t);
            if (Math.abs(W.area() - A) > 1e-6) fail('slice', key, `the slice area reads ${W.area()}, but integrating f gives ${A}`);
            const sw = simpson(area, 0, t, 60);
            if (Math.abs(W.o().W(t) - sw) > 1e-6) fail('slice', key, `the swept total reads ${W.o().W(t)}, but adding the slices gives ${sw}`);
            // the slice and S as written
            for (const u of [0, 0.7, 1.3, M]) { const got = evalF(W.o().slice(t), { [v]: u }), want = h === 'x' ? S.f(t, u) : S.f(u, t);
              if (Math.abs(got - want) > 1e-9) fail('slice', key, `the slice ${W.o().slice(t)} at ${v} = ${u} is ${got}, but f is ${want}`); }
            if (Math.abs(evalF(W.o().Ss, { [h]: t }) - A) > 1e-6) fail('slice', key, `S(${h}) = ${W.o().Ss} does not give the slice area ${A}`);
            const got = W.working(), T = neg(t), txt = got.join('\n');
            const sl = W.o().slice(t), slP = / \+ /.test(sl) ? `(${sl})` : sl;
            if (got[1] !== `Hold ${h} = ${T}: the slice is ${h === 'x' ? `f(${T}, y)` : `f(x, ${T})`} = ${sl} for ${v} from 0 to ${M}, and its area is ∫ ${slP} d${v} from ${v} = 0 to ${M}, which is ${neg(Math.round(A * 1e4) / 1e4)}.`) fail('slice', key, got[1]);
            if (/no area: f is 0/.test(txt) !== (Math.abs(A) < 1e-9)) fail('slice', key, 'the no-area sentence is wrong');
            if (/Every slice has the same area/.test(txt) !== flat) fail('slice', key, 'the same-area sentence is wrong');
            if (/is the average slice/.test(txt) !== (!flat && Math.abs(A - totals[h] / L) < 1e-6)) fail('slice', key, 'the average-slice sentence is wrong');
            if (/Nothing is swept yet/.test(txt) !== (t === 0)) fail('slice', key, 'the nothing-swept sentence is wrong');
            if (t > 0 && !txt.includes(`= ${neg(Math.round(sw * 1e4) / 1e4)}.`)) fail('slice', key, 'the swept total is not written');
            if (/That is every slice/.test(txt) !== (t === L)) fail('slice', key, 'the every-slice sentence is wrong');
            if (/Slicing the other way gave the same/.test(txt) !== (t === L && hist.length === 2)) fail('slice', key, 'the other-way sentence is wrong');
            const svg = W.svg();
            if ((svg.match(/data-k="cell"/g) || []).length !== 4 * S.a * S.b) fail('slice', key, 'the rectangle is not drawn in half-unit cells');
            if (/data-k="swept"/.test(svg) !== (t > 0) || /data-k="under"/.test(svg) !== (t > 0)) fail('slice', key, 'the swept part is shaded at the wrong time');
            const ln = svg.match(/data-k="slice" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
            if (!ln || (h === 'x' ? !(+ln[1] === +ln[3] && Math.abs(+ln[1] - (20 + 45 * t)) < 1e-6) : !(+ln[2] === +ln[4] && Math.abs(+ln[2] - (185 - 45 * t)) < 1e-6))) fail('slice', key, 'the slice line is not where the slice is');
            const meant = { zero: si === 0 && Math.abs(A) < 1e-9, all: si === 0 && hist.length >= 1, swap: si === 0 && hist.length === 2,
              flat: si === 1 && h === 'y' && seen.length >= 2, mid: si === 2 && Math.abs(A - totals[h] / L) < 1e-6 };
            for (const gl of W.GOALS) {
              if (!!gl.ok(W) !== meant[gl.id]) fail('slice', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}`);
              if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
            }
          }
        }
      }
      // sweeping to the far edge is what records it, and only then
      reset(); W.si = si; W.hold = h;
      const stub = W.render; W.render = () => {};
      for (let k = W.k; k < W.steps() - 1; k++) W.moveT(1);
      if (W.swept[si].has(h)) fail('slice', `${S.id} ${h}`, 'swept is recorded before the far edge');
      W.moveT(1);
      if (!W.swept[si].has(h)) fail('slice', `${S.id} ${h}`, 'reaching the far edge is not recorded');
      W.moveT(1); if (W.k !== W.steps()) fail('slice', `${S.id} ${h}`, 'the slice steps past the far edge');
      W.render = stub;
    }
    if (Math.abs(totals.x - totals.y) > 1e-6) fail('slice', S.id, `the two orders give ${totals.x} and ${totals.y}`);
    const cap = W.SETS[si].O; if (Math.abs(cap.x.W(S.a) - totals.x) > 1e-6) fail('slice', S.id, 'the double integral is wrong');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('slice', g.id, 'this goal cannot be found');
  reset(); W.si = 0; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The cover-up workshop: every fraction, every x, every set of kept
   equations. The split must really equal f: the cleared identity is checked
   at every x on the stepper and at many in between, the pieces must add back
   to f wherever f is defined, and the antiderivative must differentiate back
   to f. Which unknowns count as found is worked out afresh, by cover-up at a
   root or by the kept equations pinning every unknown down, for every
   choice of up to three kept x values; the readout's equation, its vanishing
   terms and its answers are rebuilt, the drawing is read back, and every
   goal, including solving without either root, is found by a real history. */
const coverNotes = (() => {
  const W = Cover;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const fac = r => (r === 0 ? 'x' : r > 0 ? `x − ${r}` : `x + ${-r}`);
  if (W.SETS.map(S => S.id).join() !== 'two,three,rep') fail('cover', 'sets', W.SETS.map(S => S.id).join());
  const reset = () => { W.touched = false; W.k = W.START; W.used.forEach(u => u.clear()); };
  reset(); W.si = 0;
  if (W.isRoot()) fail('cover', 'start', 'the workshop opens on a root, where f is not defined');
  for (const g of W.GOALS) if (g.ok(W)) fail('cover', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.si = si; if (W.isRoot()) fail('cover', S.id, 'starts on a root'); for (const g of W.GOALS) if (g.ok(W)) fail('cover', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0;
  const found = {}, tryCols = { root: new Set(), ok: new Set() };
  const subsets = (xs, k) => { const out = [[]]; for (const x of xs) { const m = out.length; for (let q = 0; q < m; q++) if (out[q].length < k) out.push([...out[q], x]); } return out; };
  W.SETS.forEach((S, si) => {
    const V = W.VAL[si], nP = S.P.length;
    const Nf = x => S.N.reduce((a, c) => a * x + c, 0), Df = x => S.den.reduce((a, r) => a * (x - r), 1);
    const piece = (j, x) => S.P[j].r.reduce((a, r) => a * (x - r), 1);
    // the coefficient of piece j once cleared: the whole bottom divided by the piece's own
    const coef = (j, x) => Df(x) / piece(j, x);
    const coefAt = (j, x) => { const rs = [...S.den]; for (const r of S.P[j].r) rs.splice(rs.indexOf(r), 1); return rs.reduce((a, r) => a * (x - r), 1); };
    // the identity holds for every x, roots included
    for (let x = -4; x <= 4; x += 0.125) {
      const lhs = Nf(x), rhs = S.P.reduce((a, _, j) => a + V[j] * coefAt(j, x), 0);
      if (Math.abs(lhs - rhs) > 1e-9) fail('cover', `${S.id} x=${x}`, `the cleared identity fails: ${lhs} ≠ ${rhs}`);
      if (!S.den.includes(x)) {
        if (Math.abs(coef(0, x) - coefAt(0, x)) > 1e-9) fail('cover', `${S.id} x=${x}`, 'the cleared coefficient is not the bottom over its own piece');
        const f = Nf(x) / Df(x), sum = S.P.reduce((a, _, j) => a + V[j] / piece(j, x), 0);
        if (Math.abs(f - sum) > 1e-9) fail('cover', `${S.id} x=${x}`, `the pieces add to ${sum}, but f is ${f}`);
        // the antiderivative: a single factor gives V ln|x − r|, a squared one gives −V/(x − r)
        const F = t => S.P.reduce((a, p, j) => a + (p.r.length === 1 ? V[j] * Math.log(Math.abs(t - p.r[0])) : -V[j] / (t - p.r[0])), 0);
        const h = 1e-5, dF = (F(x + h) - F(x - h)) / (2 * h);
        if (Math.abs(dF - f) > 1e-4 * Math.max(1, Math.abs(f))) fail('cover', `${S.id} x=${x}`, `the antiderivative's slope is ${dF}, but f is ${f}`);
      }
      n++;
    }
    if (W.X.join() !== '-4,-3,-2,-1,0,1,2,3,4') fail('cover', S.id, 'the stepper should run −4 to 4');
    const roots = [...new Set(S.den)];
    if (!roots.every(r => W.X.includes(r))) fail('cover', S.id, 'a root is out of the stepper\'s reach');
    // which unknowns a set of kept x values pins down
    const det2 = M => M[0][0] * M[1][1] - M[0][1] * M[1][0];
    const det3 = M => M[0][0] * det2([[M[1][1], M[1][2]], [M[2][1], M[2][2]]]) - M[0][1] * det2([[M[1][0], M[1][2]], [M[2][0], M[2][2]]]) + M[0][2] * det2([[M[1][0], M[1][1]], [M[2][0], M[2][1]]]);
    const pins = xs => subsets(xs, nP).some(c => c.length === nP && (nP === 2 ? det2 : det3)(c.map(x => S.P.map((_, j) => coefAt(j, x)))) !== 0);
    const coverOf = (j, xs) => xs.filter(x => S.P.every((_, q) => (coefAt(q, x) === 0) !== (q === j)));
    for (const kept of subsets(W.X, 3)) {
      for (const at of [W.START, ...W.X.map((_, k) => k).filter(k => kept.includes(W.X[k]))]) {
        reset(); W.si = si; W.k = at; W.touched = true; kept.forEach(x => W.used[si].add(x)); n++;
        const x = W.x(), key = `${S.id} kept ${kept.join(',') || 'none'} at ${x}`;
        const all = pins(kept), want = S.P.map((_, j) => j).filter(j => all || coverOf(j, kept).length);
        if (W.found().join() !== want.join()) fail('cover', key, `found reads ${W.found()}, expected ${want}`);
        const got = W.working(), cs = S.P.map((_, j) => coefAt(j, x)), live = cs.map((c, j) => j).filter(j => cs[j] !== 0);
        if (!got[1].startsWith(`At x = ${neg(x)}: ${neg(Nf(x))} = `)) fail('cover', key, got[1]);
        if (live.length === 1 && !new RegExp(`${S.P[live[0]].L} = (.* = )?${neg(V[live[0]])}( at once)?\\.$`).test(got[1])) fail('cover', key, `cover-up gives the wrong value: ${got[1]}`);
        if (live.length === 1 && Nf(x) / cs[live[0]] !== V[live[0]]) fail('cover', key, 'dividing out does not give the value');
        if (got.some(l => /f itself is not defined/.test(l)) !== S.den.includes(x)) fail('cover', key, 'the not-defined note is wrong');
        if (want.length === nP) {
          const dec = got.find(l => l.startsWith('So f(x) = '));
          if (!dec) fail('cover', key, 'no decomposition once every unknown is found');
          else { const want2 = 'So f(x) = ' + S.P.map((p, j) => `${neg(V[j])}/${p.r.length === 1 ? (p.r[0] === 0 ? 'x' : `(${fac(p.r[0])})`) : `(${fac(p.r[0])})²`}`).join(' + ').replace(/\+ −/g, '− ') + ',';
            if (!dec.startsWith(want2)) fail('cover', key, `the decomposition reads ${dec}, expected ${want2}`);
            // the antiderivative as written, the same pieces the slope check above differentiated
            const integ = '∫ f(x) dx = ' + S.P.map((p, j) => p.r.length === 1
              ? `${Math.abs(V[j]) === 1 ? (V[j] < 0 ? '−' : '') : neg(V[j]) + ' '}ln|${fac(p.r[0])}|`
              : `${neg(-V[j])}/${p.r[0] === 0 ? 'x' : `(${fac(p.r[0])})`}`).join(' + ').replace(/\+ −/g, '− ') + ' + C.';
            if (!dec.endsWith(integ)) fail('cover', key, `the integral reads ${dec}, expected it to end ${integ}`); }
          if (got.some(l => /^Solving the equations kept/.test(l)) !== S.P.some((_, j) => !coverOf(j, kept).length)) fail('cover', key, 'the solving sentence is wrong');
          if (!S.den.includes(x) && !got.some(l => l.startsWith(`Check at x = ${neg(x)}:`))) fail('cover', key, 'no check at a defined x');
        } else {
          if (!got.some(l => l.includes('Still to find: ' + W.and(S.P.map((p, j) => j).filter(j => !want.includes(j)).map(j => S.P[j].L))))) fail('cover', key, 'the still-to-find list is wrong');
          if (got.some(l => l.startsWith('So f(x) ='))) fail('cover', key, 'the decomposition shows before it is found');
        }
        const svg = W.svg();
        if ((svg.match(/data-k="asym"/g) || []).length !== roots.length) fail('cover', key, 'the dashed lines are not one per root');
        if (/data-k="piece"/.test(svg) !== (want.length === nP)) fail('cover', key, 'the pieces are drawn at the wrong time');
        if (!/data-k="f"/.test(svg)) fail('cover', key, 'f is not drawn');
        const tryCol = (svg.match(/data-k="try"[^>]*stroke="([^"]+)"/) || [])[1];
        const ptFill = (svg.match(/data-k="pt"[^>]*fill="([^"]+)"/) || [])[1];
        if (S.den.includes(x)) { if (ptFill) fail('cover', key, 'a point is drawn where f is not defined'); tryCols.root.add(tryCol); }
        else { if (ptFill && ptFill !== tryCol) fail('cover', key, 'the upright line and the point differ in colour'); tryCols.ok.add(tryCol); }
        const ks = new Set(kept);
        const meant = { a: si === 0 && ks.has(1), b: si === 0 && ks.has(-2), solve: si === 0 && kept.filter(v => v !== 1 && v !== -2).length >= 2,
          three: si === 1 && want.length === 3, rep: si === 2 && want.length === 2 };
        for (const gl of W.GOALS) {
          if (!!gl.ok(W) !== meant[gl.id]) fail('cover', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}`);
          if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
        }
      }
    }
    if (S.id === 'rep') { reset(); W.si = si; W.used[si].add(-1); if (coverOf(0, [-1]).length || !coverOf(1, [-1]).length) fail('cover', 'rep', 'cover-up should reach B and not A'); }
  });
  if (tryCols.root.size !== 1 || tryCols.ok.size !== 1 || [...tryCols.root][0] === [...tryCols.ok][0]) fail('cover', 'colours', 'the upright line should take one colour at a root and another elsewhere');
  for (const g of W.GOALS) if (!found[g.id]) fail('cover', g.id, 'this goal cannot be found');
  reset(); W.si = 0; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The cofactor workshop: every row and column of every matrix. det A is
   worked by the rule of Sarrus, which never expands along anything, and each
   line's expansion must land on it; each minor is rebuilt by striking out
   its row and column, each sign from (−1)^(i + j); the first matrix must have
   exactly one line that needs a single minor, the triangular one must be its
   diagonal multiplied, and the flattened one must really have row 3 = 2 × row
   2 − row 1. Every sentence is rebuilt, the grid is read back, and every
   goal, including the one that needs two lines tried. */
const cofNotes = (() => {
  const W = Cofactor;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n)), amt = n => (n < 0 ? `(${neg(n)})` : neg(n));
  const rows = M => { const r = M.map(R => R.map(neg).join(', ')); return M.length === 3 ? `${r[0]}; ${r[1]} and ${r[2]}` : `${r[0]} and ${r[1]}`; };
  const line = l => (l < 3 ? `row ${l + 1}` : `column ${l - 2}`);
  const cellsOf = l => [0, 1, 2].map(t => (l < 3 ? [l, t] : [t, l - 3]));
  const and = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  if (W.SETS.map(S => S.id).join() !== 'gap,tri,flat') fail('cof', 'sets', W.SETS.map(S => S.id).join());
  const reset = () => { W.touched = false; W.li = null; W.tried.forEach(t => t.clear()); };
  reset(); W.si = 0;
  for (const g of W.GOALS) if (g.ok(W)) fail('cof', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { W.si = si; W.li = null; for (const g of W.GOALS) if (g.ok(W)) fail('cof', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0;
  const found = {};
  W.SETS.forEach((S, si) => {
    const A = S.A;
    const sarrus = A[0][0] * A[1][1] * A[2][2] + A[0][1] * A[1][2] * A[2][0] + A[0][2] * A[1][0] * A[2][1]
      - A[0][2] * A[1][1] * A[2][0] - A[0][0] * A[1][2] * A[2][1] - A[0][1] * A[1][0] * A[2][2];
    const zl = [0, 1, 2, 3, 4, 5].map(l => cellsOf(l).filter(([i, j]) => A[i][j] === 0).length);
    if (S.id === 'gap' && zl.join() !== '1,1,0,0,2,0') fail('cof', S.id, `the first matrix should have one line with two zeros, column 2: ${zl}`);
    if (S.id === 'tri') {
      if (A[1][0] || A[2][0] || A[2][1]) fail('cof', S.id, 'the triangular matrix has something below its diagonal');
      if (sarrus !== A[0][0] * A[1][1] * A[2][2]) fail('cof', S.id, 'det A is not the diagonal multiplied');
    }
    if (S.id === 'flat') {
      if (A[2].some((v, k) => v !== 2 * A[1][k] - A[0][k])) fail('cof', S.id, 'row 3 is not 2 × row 2 − row 1');
      if (sarrus !== 0) fail('cof', S.id, 'the flattened matrix does not have det A = 0');
    }
    const head = `A has rows ${rows(A)}. To find det A, pick any row or column and expand along it: each entry times its minor, the 2×2 determinant left when you strike out the entry's row and column, with a sign from the checkerboard + − + / − + − / + − +.`;
    reset(); W.si = si; n++;
    let got = W.working();
    if (got.join('\n') !== [head, 'Pick a row or a column below.'].join('\n')) fail('cof', `${S.id} unpicked`, got.join(' | '));
    if (!/no line picked yet/.test(W.svg())) fail('cof', `${S.id} unpicked`, 'the grid should say no line is picked');
    const cases = [];
    for (let l = 0; l < 6; l++) cases.push([l]);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) if (a !== b) cases.push([a, b]);
    for (const seq of cases) {
      reset(); W.si = si; W.touched = true; n++;
      for (const l of seq) { W.li = l; W.tried[si].add(l); }
      const l = W.li, key = `${S.id} ${seq.map(line).join(' then ')}`, C = cellsOf(l);
      if (JSON.stringify(W.cells()) !== JSON.stringify(C)) fail('cof', key, 'the cells along the line are not that row or column');
      const want = [head, `Expand along ${line(l)}, where the signs go ${C.map(([i, j]) => ((i + j) % 2 ? '−' : '+')).join(' ')}.`];
      const T = [];
      for (const [i, j] of C) {
        const a = A[i][j], s = (i + j) % 2 ? -1 : 1;
        const M = A.filter((_, r) => r !== i).map(R => R.filter((_, c) => c !== j)), m = M[0][0] * M[1][1] - M[0][1] * M[1][0];
        T.push(s * a * m);
        if (a === 0) want.push(`Entry (${i + 1}, ${j + 1}) is 0, so its term is 0 whatever its minor is, and there is no need to work the minor out.`);
        else want.push(`Entry (${i + 1}, ${j + 1}) is ${neg(a)}, with sign ${s > 0 ? '+' : '−'}. Strike out row ${i + 1} and column ${j + 1} to leave rows ${rows(M)}, whose determinant is ${amt(M[0][0])} × ${amt(M[1][1])} − ${amt(M[0][1])} × ${amt(M[1][0])} = ${neg(m)}. The term is ${s > 0 ? '' : '−'}${amt(a)} × ${amt(m)} = ${neg(s * a * m)}.`);
      }
      const d = T.reduce((x, y) => x + y, 0), z = zl[l];
      if (d !== sarrus) fail('cof', key, `expanding gives ${d}, but det A is ${sarrus}`);
      if (W.det() !== sarrus) fail('cof', key, `det reads ${W.det()}, not ${sarrus}`);
      want.push(`Add the terms: det A = ${T.map(amt).join(' + ')} = ${neg(d)}.` + (z ? ` The ${z === 1 ? 'zero' : 'two zeros'} on this ${line(l).split(' ')[0]} saved working out ${z === 1 ? 'a minor' : 'two minors'}.` : ''));
      if (seq.length >= 2) want.push(`Every row and column gives the same det A = ${neg(d)}: you have expanded along ${and([...seq].sort((p, q) => p - q).map(line))}.`);
      if (S.id === 'tri' && z === 2) want.push(`A is triangular, with 0 below its diagonal, so this ${line(l).split(' ')[0]} leaves one term, and det A is just the diagonal multiplied: ${amt(A[0][0])} × ${amt(A[1][1])} × ${amt(A[2][2])} = ${neg(d)}.`);
      if (S.id === 'flat') want.push(`det A = 0 because row 3 is 2 × row 2 − row 1: the three rows lie in one plane, so A flattens space onto it, and a matrix with det A = 0 has no inverse.`);
      got = W.working();
      if (got.length !== want.length) fail('cof', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((ln, k) => { if (got[k] !== ln) fail('cof', key, `line ${k + 1} reads: ${got[k]}\n      expected: ${ln}`); });
      // the grid: every cell its entry and sign, the picked line and only it outlined, its zeros struck out
      const svg = W.svg();
      if (!svg.includes(`aria-label="A as a grid, ${line(l)} picked"`)) fail('cof', key, 'the grid does not name the picked line');
      const cells = [...svg.matchAll(/<g data-k="cell" data-i="(\d)" data-j="(\d)" data-on="(true|false)">(.*?)<\/g>/g)];
      if (cells.length !== 9) fail('cof', key, `${cells.length} cells drawn`);
      for (const [, si2, sj2, on, inner] of cells) {
        const i = +si2, j = +sj2, pick = C.some(([p, q]) => p === i && q === j);
        if ((on === 'true') !== pick) fail('cof', key, `cell (${i + 1}, ${j + 1}) is ${on === 'true' ? '' : 'not '}outlined`);
        const tx = [...inner.matchAll(/>([^<]*)<\/text>/g)].map(m => m[1]);
        if (tx[0] !== ((i + j) % 2 ? '−' : '+') || tx[1] !== neg(A[i][j])) fail('cof', key, `cell (${i + 1}, ${j + 1}) shows ${tx}`);
        if (/data-k="skip"/.test(inner) !== (pick && A[i][j] === 0)) fail('cof', key, `cell (${i + 1}, ${j + 1}) is struck out wrongly`);
      }
      const meant = { quick: si === 0 && z === 2, mid: l === 1, same: seq.length >= 2, tri: si === 1 && z === 2, flat: si === 2 };
      for (const gl of W.GOALS) {
        if (!!gl.ok(W) !== meant[gl.id]) fail('cof', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
      }
    }
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('cof', g.id, 'this goal cannot be found');
  reset(); W.si = 0; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The hillwalker workshop: every heading on every hill. The gradient is
   checked against numerical partials, and the partials the readout writes are
   evaluated at the point; every heading must have length 1 and the twelve
   must go once round anticlockwise; the slope ∇f · û is checked against a
   central difference along û; steepest, level and steepest down must be
   exactly where û is along, across and against ∇f; on axis headings the slope
   must be the partial. Every contour drawn must have f the same all along,
   and the arrows must point along ∇f and û. Every sentence is rebuilt, and
   every goal. */
const hillNotes = (() => {
  const W = Hill;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const gcd = (u, w) => w ? gcd(w, u % w) : Math.abs(u);
  const fr = (a, b) => { if (b < 0) { a = -a; b = -b; } const g = gcd(Math.abs(a), b) || 1; a /= g; b /= g; return b === 1 ? neg(a) : `${neg(a)}/${b}`; };
  const num = v => { const q = Math.round(v * 1e4) / 1e4; return neg(Object.is(q, -0) ? 0 : q); };
  const is = v => (Math.abs(Math.round(v * 1e4) / 1e4 - v) < 1e-10 ? '= ' : '≈ ') + num(v);
  const frd = (a, b) => { const f = fr(a, b); return f.includes('/') ? `${f} = ${num(a / b)}` : f; };
  const famt = (a, b) => (a < 0 ? `(${fr(a, b)})` : fr(a, b)), amt = a => (a < 0 ? `(${neg(a)})` : neg(a));
  /* a partial as the readout writes it, like 6y or −2y, evaluated at a point */
  const evalPart = (str, x, y) => { const m = str.match(/^(−?)(\d*)([xy])$/); if (!m) return NaN; return (m[1] ? -1 : 1) * (m[2] ? +m[2] : 1) * (m[3] === 'x' ? x : y); };
  if (W.SETS.map(S => S.id).join() !== 'bowl,oval,saddle') fail('hill', 'sets', W.SETS.map(S => S.id).join());
  if (W.U.length !== 12) fail('hill', 'headings', `${W.U.length} headings, not 12`);
  W.U.forEach(([p, q], k) => {
    if (p * p + q * q !== 25) fail('hill', `heading ${k}`, `⟨${p}/5, ${q}/5⟩ does not have length 1`);
    const a = Math.atan2(q, p), b = Math.atan2(W.U[(k + 1) % 12][1], W.U[(k + 1) % 12][0]);
    const step = ((b - a) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (!(step > 0 && step < Math.PI / 2)) fail('hill', `heading ${k}`, 'the headings do not go once round anticlockwise');
  });
  W.touched = false; W.si = 0; W.k = W.START;
  for (const g of W.GOALS) if (g.ok(W)) fail('hill', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { W.si = si; W.k = W.START; for (const g of W.GOALS) if (g.ok(W)) fail('hill', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  W.si = 0; W.k = W.START;
  let n = 0;
  const found = {};
  W.SETS.forEach((S, si) => {
    const [x, y] = S.P, h = 1e-5;
    const a = (S.f(x + h, y) - S.f(x - h, y)) / (2 * h), b = (S.f(x, y + h) - S.f(x, y - h)) / (2 * h);
    W.si = si; const g = W.grad();
    if (Math.abs(g[0] - a) > 1e-6 || Math.abs(g[1] - b) > 1e-6) fail('hill', S.id, `∇f reads ⟨${g}⟩, but the partials are ${a}, ${b}`);
    if (evalPart(S.fxs, x, y) !== g[0] || evalPart(S.fys, x, y) !== g[1]) fail('hill', S.id, `the partials written, ${S.fxs} and ${S.fys}, do not give ∇f at the point`);
    const nn = Math.hypot(g[0], g[1]);
    if (!Number.isInteger(nn)) fail('hill', S.id, '‖∇f‖ is not a whole number, so the readout cannot write it exactly');
    W.U.forEach(([p, q], k) => {
      W.si = si; W.k = k; n++;
      const key = `${S.id} heading ${k}`, D5 = g[0] * p + g[1] * q;
      if (W.D5() !== D5) fail('hill', key, `5 × the slope reads ${W.D5()}, not ${D5}`);
      const cd = (S.f(x + h * p / 5, y + h * q / 5) - S.f(x - h * p / 5, y - h * q / 5)) / (2 * h);
      if (Math.abs(cd - D5 / 5) > 1e-6) fail('hill', key, `the slope ${D5 / 5} does not match a central difference, ${cd}`);
      const cross = g[0] * q - g[1] * p, along = cross === 0 && D5 > 0, against = cross === 0 && D5 < 0, level = D5 === 0;
      if (along !== (D5 === 5 * nn) || against !== (D5 === -5 * nn)) fail('hill', key, 'steepest is not exactly along ∇f');
      const want = [
        `f(x, y) = ${S.fs}. Its partial derivatives are ∂f/∂x = ${S.fxs} and ∂f/∂y = ${S.fys}, so at (${neg(x)}, ${neg(y)}) the gradient is ∇f = ⟨${neg(g[0])}, ${neg(g[1])}⟩, of length ‖∇f‖ = √(${g[0] * g[0]} + ${g[1] * g[1]}) = ${neg(nn)}.`,
        `Facing û = ⟨${fr(p, 5)}, ${fr(q, 5)}⟩, which has length 1, the slope that way is ∇f · û = ${neg(g[0])} × ${famt(p, 5)} + ${amt(g[1])} × ${famt(q, 5)} = ${frd(D5, 5)}.`];
      if (q === 0) { if (D5 / 5 !== (p > 0 ? a : -a) && Math.abs(D5 / 5 - (p > 0 ? a : -a)) > 1e-6) fail('hill', key, 'east or west is not ±∂f/∂x');
        want.push(`Due ${p > 0 ? 'east' : 'west'}, the slope is just ${p > 0 ? '' : '−'}∂f/∂x = ${neg(p > 0 ? g[0] : -g[0])}: a partial derivative is the slope facing along an axis.`); }
      if (p === 0) { if (Math.abs(D5 / 5 - (q > 0 ? b : -b)) > 1e-6) fail('hill', key, 'north or south is not ±∂f/∂y');
        want.push(`Due ${q > 0 ? 'north' : 'south'}, the slope is just ${q > 0 ? '' : '−'}∂f/∂y = ${neg(q > 0 ? g[1] : -g[1])}: a partial derivative is the slope facing along an axis.`); }
      const fa = S.f(x - 0.01 * p / 5, y - 0.01 * q / 5), fb = S.f(x + 0.01 * p / 5, y + 0.01 * q / 5);
      if (Math.abs((fb - fa) / 0.02 - D5 / 5) > 0.01) fail('hill', key, 'the nudge check does not land on the slope');
      want.push(`Check with a nudge: a step of 0.01 back along û gives f ${is(fa)} and a step forward gives f ${is(fb)}, a rise of ${num(fb - fa)} over 0.02, which is ${num((fb - fa) / 0.02)}.`);
      if (along) {
        want.push(`That is all of ‖∇f‖ = ${neg(nn)}: û points the same way as ∇f, the angle between them is 0, and no heading climbs faster. ∇f points up the steepest slope.`);
        if (S.id === 'oval') {
          if (x * q - y * p === 0) fail('hill', key, 'on the oval the steepest way up should not be straight away from the bottom');
          want.push(`Straight away from the bottom at (0, 0) would face along ⟨${neg(x)}, ${neg(y)}⟩, but the steepest way up is ⟨${fr(p, 5)}, ${fr(q, 5)}⟩. On an oval bowl the steepest climb crosses the contour at a right angle, and that is not straight away from the bottom.`);
        }
      } else if (against) want.push(`That is −‖∇f‖ = ${neg(-nn)}: û points straight against ∇f, the angle between them is 180°, and this is the steepest way down.`);
      else if (level) want.push(`The slope is 0: û is at a right angle to ∇f, so this heading runs along the contour through the point, neither climbing nor falling.`);
      else {
        const cos = D5 / (5 * nn), ang = Math.acos(cos);
        if (Math.abs(Math.cos(ang) * nn - D5 / 5) > 1e-9) fail('hill', key, '∇f · û is not ‖∇f‖ cos θ');
        want.push(`∇f · û is also ‖∇f‖ cos θ, where θ is the angle between û and ∇f, so cos θ = ${frd(D5, 5 * nn)}: ${D5 > 0 ? 'uphill, but not the steepest climb' : 'downhill, but not the steepest descent'}.`);
      }
      const got = W.working();
      if (got.length !== want.length) fail('hill', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((line, i) => { if (got[i] !== line) fail('hill', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${line}`); });
      // the drawing: 40 px a unit, centred on the point, y up
      const svg = W.svg(), X = px => x + (px - 180) / 40, Y = py => y - (py - 110) / 40;
      for (const m of svg.matchAll(/data-k="contour" data-c="([^"]+)" points="([^"]+)"/g)) {
        const c = +m[1];
        for (const pt of m[2].split(' ')) { const [px, py] = pt.split(',').map(Number); if (Math.abs(S.f(X(px), Y(py)) - c) > 0.15 * (1 + Math.abs(c) / 10)) { fail('hill', key, `a contour drawn for f = ${c} strays off it`); break; } }
      }
      if (!svg.includes(`data-c="${S.f(x, y)}"`)) fail('hill', key, 'the contour through the point is not drawn');
      const ln = k2 => { const m = svg.match(new RegExp(`data-k="${k2}" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" stroke="([^"]+)"`)); return m && m.slice(1, 5).map(Number).concat([m[5]]); };
      const G = ln('grad'), H = ln('head');
      if (!G || !H) fail('hill', key, 'an arrow is not drawn');
      else {
        const par = (L, v) => { const dx = L[2] - L[0], dy = -(L[3] - L[1]); return Math.abs(dx * v[1] - dy * v[0]) < 1e-2 * Math.hypot(dx, dy) * Math.hypot(...v) && dx * v[0] + dy * v[1] > 0; };
        if (L0(G) || !par(G, g)) fail('hill', key, 'the gold arrow does not point along ∇f');
        if (!par(H, [p, q])) fail('hill', key, 'the heading arrow does not point along û');
        if (G[0] !== 180 || G[1] !== 110 || H[0] !== 180 || H[1] !== 110) fail('hill', key, 'the arrows do not start at the point');
        const cols = svg.match(/data-k="head"[^>]*stroke="([^"]+)"/)[1];
        if (cols === G[4]) fail('hill', key, 'the heading arrow should not share the gradient\'s gold');
        found.cols = found.cols || {}; const kind = D5 > 0 ? 'up' : D5 < 0 ? 'down' : 'flat'; found.cols[kind] = found.cols[kind] || new Set(); found.cols[kind].add(cols);
      }
      W.touched = true;
      const meant = { up: si === 0 && along, level: si === 0 && level, down: si === 0 && against, oval: si === 1 && along, pass: si === 2 && level };
      for (const gl of W.GOALS) {
        if (!!gl.ok(W) !== meant[gl.id]) fail('hill', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  function L0(L) { return Math.hypot(L[2] - L[0], L[3] - L[1]) < 1; }
  const cs = found.cols || {};
  if (['up', 'down', 'flat'].some(k => !cs[k] || cs[k].size !== 1) || new Set(['up', 'down', 'flat'].map(k => [...(cs[k] || [])][0])).size !== 3)
    fail('hill', 'colours', 'the heading should take one colour climbing, another falling and a third on the level');
  delete found.cols;
  for (const g of W.GOALS) if (!found[g.id]) fail('hill', g.id, 'this goal cannot be found');
  W.si = 0; W.k = W.START; W.touched = false; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The eigenvalue detective: every λ on every matrix. det(A − λI) is worked
   from the entries, and must equal λ² − (trace)λ + det A as the readout writes
   it; the eigenvalues found by the quadratic formula must be exactly the λ
   where the readout says so; each crushed arrow must really be crushed, in
   lowest terms, and A must send it to λ times itself; the other eigenvalue
   must be the other root; the turning matrix must have no real root, and its
   bottom must be where the readout says. The curve and the point are
   measured, every sentence is rebuilt, and every goal. */
const detectNotes = (() => {
  const W = Detect;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n)), amt = n => (n < 0 ? `(${neg(n)})` : neg(n));
  const vec = w => `⟨${neg(w[0])}, ${neg(w[1])}⟩`, rows = M => `rows ${neg(M[0][0])}, ${neg(M[0][1])} and ${neg(M[1][0])}, ${neg(M[1][1])}`;
  const gcd = (u, w) => w ? gcd(w, u % w) : Math.abs(u);
  if (W.SETS.map(S => S.id).join() !== 'pair,tri,twice,turn') fail('detect', 'sets', W.SETS.map(S => S.id).join());
  W.touched = false; W.si = 0; W.k = W.START;
  for (const g of W.GOALS) if (g.ok(W)) fail('detect', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { W.si = si; W.k = W.START; for (const g of W.GOALS) if (g.ok(W)) fail('detect', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  W.si = 0; W.k = W.START;
  let n = 0;
  const found = {};
  W.SETS.forEach((S, si) => {
    const A = S.A, t = A[0][0] + A[1][1], d = A[0][0] * A[1][1] - A[0][1] * A[1][0], disc = t * t - 4 * d;
    const roots = disc < 0 ? [] : [...new Set([(t - Math.sqrt(disc)) / 2, (t + Math.sqrt(disc)) / 2])];
    if ((S.id === 'turn') !== (disc < 0)) fail('detect', S.id, 'only the turning matrix should have no real eigenvalue');
    if ((S.id === 'twice') !== (disc === 0)) fail('detect', S.id, 'only the repeated matrix should have one eigenvalue');
    for (const r of roots) if (!W.L.includes(r)) fail('detect', S.id, `the eigenvalue ${r} cannot be reached with the stepper`);
    const polyS = 'λ²' + (t === 0 ? '' : ` ${t > 0 ? '−' : '+'} ${Math.abs(t) === 1 ? '' : Math.abs(t)}λ`) + (d === 0 ? '' : ` ${d > 0 ? '+' : '−'} ${Math.abs(d)}`);
    W.L.forEach((l, k) => {
      W.si = si; W.k = k; n++;
      const key = `${S.id} λ=${l}`, M = [[A[0][0] - l, A[0][1]], [A[1][0], A[1][1] - l]], p = M[0][0] * M[1][1] - M[0][1] * M[1][0];
      if (Math.abs(p - (l * l - t * l + d)) > 1e-12) fail('detect', key, 'det(A − λI) is not the characteristic polynomial');
      if (W.p() !== p) fail('detect', key, `det(A − λI) reads ${W.p()}, not ${p}`);
      const isRoot = roots.includes(l);
      if ((p === 0) !== isRoot) fail('detect', key, 'the eigenvalues are not where det(A − λI) = 0');
      const L = neg(l), want = [
        `A has ${rows(A)}. An eigenvalue is a number λ for which A − λI crushes some arrow to ⟨0, 0⟩, and that happens exactly when det(A − λI) = 0.`,
        `At λ = ${L}: A − λI has ${rows(M)}, so det(A − λI) = ${amt(M[0][0])} × ${amt(M[1][1])} − ${amt(M[0][1])} × ${amt(M[1][0])} = ${neg(p)}.`];
      if (l === 0) { if (p !== d) fail('detect', key, 'at λ = 0 it is not det A'); want.push(`At λ = 0, A − λI is A itself, so this is det A = ${neg(d)}: the curve crosses λ = 0 at the determinant.`); }
      if (isRoot) {
        const v = W.crushed();
        if (!v[0] && !v[1]) fail('detect', key, 'the crushed arrow is ⟨0, 0⟩');
        if (M[0][0] * v[0] + M[0][1] * v[1] || M[1][0] * v[0] + M[1][1] * v[1]) fail('detect', key, `A − λI does not crush ${vec(v)}`);
        if (gcd(v[0], v[1]) !== 1 || v[0] < 0 || (v[0] === 0 && v[1] < 0)) fail('detect', key, `${vec(v)} is not in lowest terms with a positive lead`);
        const Av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
        if (Av[0] !== l * v[0] || Av[1] !== l * v[1]) fail('detect', key, 'A does not send the arrow to λ times itself');
        want.push(`det(A − λI) = 0, so λ = ${L} is an eigenvalue. One arrow A − λI crushes is ${vec(v)}, and A sends it to ${vec(Av)}, which is ${amt(l)} × ${vec(v)}: A only stretches it${l < 0 ? ', flipping it round since λ is negative' : ''}.`);
        const o = roots.find(r => r !== l);
        if (o === undefined) want.push(`This is the only eigenvalue, and it counts twice: ${L} + ${amt(l)} = ${neg(t)} is the trace and ${amt(l)} × ${amt(l)} = ${neg(d)} is det A. Only the one direction ${vec(v)} stays on its line.`);
        else {
          if (l + o !== t || l * o !== d) fail('detect', key, 'the eigenvalues do not add to the trace and multiply to the determinant');
          want.push(`The eigenvalues add up to the trace, ${neg(A[0][0])} + ${amt(A[1][1])} = ${neg(t)}, so the other one is ${neg(t)} − ${amt(l)} = ${neg(o)}. Check: ${amt(l)} × ${amt(o)} = ${neg(d)}, which is det A.`);
          if (S.id === 'tri') {
            if (A[1][0] !== 0 || ![A[0][0], A[1][1]].includes(l)) fail('detect', key, 'the triangular matrix does not wear its eigenvalues on its diagonal');
            want.push(`A is triangular, with 0 below its diagonal, so det(A − λI) is just (${neg(A[0][0])} − λ)(${neg(A[1][1])} − λ): its eigenvalues are its diagonal entries, ${neg(A[0][0])} and ${neg(A[1][1])}.`);
          }
        }
      } else want.push(`That is not 0, so λ = ${L} is not an eigenvalue: A − λI crushes no arrow but ⟨0, 0⟩.`);
      want.push(`Worked out for every λ, det(A − λI) = ${polyS}, the characteristic polynomial. Its λ term is minus the trace times λ and its constant is det A: here the trace is ${neg(t)} and det A = ${neg(d)}.`);
      const bottom = disc < 0 && l === t / 2;
      if (bottom) {
        for (const m of W.L) if (m * m - t * m + d < p) fail('detect', key, 'this is not the bottom of the curve');
        want.push(`This is the bottom of the curve, at λ = trace/2 = ${L}, and it is still ${neg(p)} above 0. The curve never reaches the axis, so no real λ works: A turns every arrow off its line and has no real eigenvalues.`);
      }
      const got = W.working();
      if (got.length !== want.length) fail('detect', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((line, i) => { if (got[i] !== line) fail('detect', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${line}`); });
      // the drawing: recover the scale from the axis and check the curve and the point
      const svg = W.svg(), [a, b] = W.R;
      const cm = svg.match(/data-k="curve" points="([^"]+)"/), pm = svg.match(/data-k="pt" cx="([^"]+)" cy="([^"]+)" r="5" fill="([^"]+)"/);
      if (!cm || !pm) fail('detect', key, 'the curve or the point is not drawn');
      else {
        const P = cm[1].split(' ').map(q => q.split(',').map(Number)), lam = px => a + (px - 20) / 320 * (b - a);
        const [x0, y0] = P[0], [x1, y1] = P[P.length - 1], v0 = lam(x0) ** 2 - t * lam(x0) + d, v1 = lam(x1) ** 2 - t * lam(x1) + d;
        const sc = (y0 - y1) / (v1 - v0), base = y0 + v0 * sc;
        for (const [px, py] of P) { const L2 = lam(px); if (Math.abs((base - py) / sc - (L2 * L2 - t * L2 + d)) > 0.05) { fail('detect', key, 'the drawn curve is not det(A − λI)'); break; } }
        if (Math.abs(lam(+pm[1]) - l) > 0.01 || Math.abs((base - +pm[2]) / sc - p) > 0.05) fail('detect', key, 'the gold point is not at (λ, det(A − λI))');
        const dm = svg.match(/data-k="drop"[^>]*stroke="([^"]+)"/);
        if (!dm || (pm[3] !== dm[1]) !== (p === 0)) fail('detect', key, 'the point should turn green exactly at an eigenvalue');
      }
      W.touched = true;
      const meant = { root: si === 0 && isRoot, tri: si === 1 && isRoot, twice: si === 2 && isRoot, none: bottom, det: l === 0 };
      for (const gl of W.GOALS) {
        if (!!gl.ok(W) !== meant[gl.id]) fail('detect', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('detect', g.id, 'this goal cannot be found');
  W.si = 0; W.k = W.START; W.touched = false; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The parts workshop: every split tried on every integral. Each split must
   multiply back to the integrand (u times dv/dx); du is checked against a
   numerical derivative of u and v against a numerical integral of dv; the one
   split marked right must have an answer whose derivative is the integrand,
   and the integral it leaves must really be uv − answer, checked by its own
   derivative v du; the gold answer must climb across the drawing by the area
   under the integrand. Every sentence is rebuilt, and every goal. */
const partsNotes = (() => {
  const W = Parts;
  const K = {
    xe: { I: '∫ x eˣ dx', right: 'x', f: x => x * Math.exp(x) },
    xcos: { I: '∫ x cos x dx', right: 'x', f: x => x * Math.cos(x) },
    ln: { I: '∫ ln x dx', right: 'ln x', f: x => Math.log(x) },
    xln: { I: '∫ x ln x dx', right: 'ln x', f: x => x * Math.log(x) }
  };
  if (W.SETS.map(S => S.id).join() !== 'xe,xcos,ln,xln') fail('parts', 'sets', W.SETS.map(S => S.id).join());
  W.touched = false; W.si = 0; W.oi = null;
  for (const g of W.GOALS) if (g.ok(W)) fail('parts', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  const close = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
  W.SETS.forEach((S, si) => {
    const k = K[S.id], [a, b] = S.D;
    if (S.I !== k.I) fail('parts', S.id, `reads ${S.I}`);
    for (let x = a; x <= b; x += 0.05) if (!close(S.f(x), k.f(x), 1e-9)) fail('parts', S.id, `the integrand is wrong at x = ${x}`);
    const right = S.opts.filter(o => o.F).map(o => o.u);
    if (right.join() !== k.right) fail('parts', S.id, `the u marked right is ${right.join()}, not ${k.right}`);
    W.si = si;
    [null, ...S.opts.keys()].forEach(oi => {
      W.oi = oi; n++;
      const o = oi === null ? null : S.opts[oi], key = `${S.id} u=${o ? o.u : 'none'}`;
      const want = [`${k.I}: split the integrand into u, to differentiate, and dv, to integrate. Then ∫ u dv = uv − ∫ v du, and the aim is an integral left that is simpler than the one you started with.`];
      if (!o) want.push('Pick a split below.');
      else {
        const h = 1e-5;
        for (let x = a + 0.03; x < b; x += 0.07) {
          if (!close(o.uf(x) * o.dvf(x), k.f(x), 1e-9)) { fail('parts', key, `u times dv is not the integrand at x = ${x}`); break; }
          if (!o.vf) continue;
          const du = (o.uf(x + h) - o.uf(x - h)) / (2 * h), dv = (o.vf(x + h) - o.vf(x - h)) / (2 * h);
          if (!close(du, o.duf(x), 1e-4)) { fail('parts', key, `du/dx is wrong at x = ${x}`); break; }
          if (!close(dv, o.dvf(x), 1e-4)) { fail('parts', key, `v is not an integral of dv at x = ${x}`); break; }
          if (o.F) {
            const dF = (o.F(x + h) - o.F(x - h)) / (2 * h);
            if (!close(dF, k.f(x), 1e-4)) { fail('parts', key, `the answer does not differentiate to the integrand at x = ${x}`); break; }
            // the integral left, G = uv − F, must have derivative v du
            const G = t => o.uf(t) * o.vf(t) - o.F(t), dG = (G(x + h) - G(x - h)) / (2 * h);
            if (!close(dG, o.vf(x) * o.duf(x), 1e-4)) { fail('parts', key, `the integral left is not ∫ v du at x = ${x}`); break; }
          }
        }
        if (!o.vf) {
          if (o.F || o.v || o.du) fail('parts', key, 'a split with no v has nothing more to work');
          if (!/^Then v would be ∫ .+ dx, the very integral you are trying to find\./.test(o.left)) fail('parts', key, 'a dv you cannot integrate must say so');
          want.push(`Try u = ${o.u} and dv = ${o.dv}.`, o.left, 'This split never gets started. Try another.');
        } else {
          want.push(`Try u = ${o.u} and dv = ${o.dv}. Then du = ${o.du} and v = ${o.v}.`, `So ${k.I} = ${o.parts}.`);
          if (o.F) want.push(o.rest, `Put it together: ${o.back}`, `Check by differentiating: ${o.check}`);
          else want.push(o.left, 'This split makes it no simpler. Try another.');
        }
      }
      const got = W.working();
      if (got.length !== want.length) fail('parts', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('parts', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      const svg = W.svg();
      const pts = kk => { const m = svg.match(new RegExp(`data-k="${kk}" points="([^"]+)"`)); return m ? m[1].split(' ').map(t => t.split(',').map(Number)) : null; };
      const fp = pts('f'), Fp = pts('F');
      if (!fp) fail('parts', key, 'the integrand is not drawn');
      if (!!Fp !== !!(o && o.F)) fail('parts', key, 'the answer should be drawn exactly when the split is right');
      if (fp && Fp) {
        const ys = fp.map(([px]) => k.f(a + (px - 20) / 320 * (b - a)));
        const i0 = ys.indexOf(Math.min(...ys)), i1 = ys.indexOf(Math.max(...ys));
        const sc = (fp[i0][1] - fp[i1][1]) / (ys[i1] - ys[i0]);
        let worst = 0;
        for (let i = 1; i < Fp.length; i++) {
          const x0 = a + (Fp[i - 1][0] - 20) / 320 * (b - a), x1 = a + (Fp[i][0] - 20) / 320 * (b - a), m = 20;
          let area = 0; for (let j = 0; j < m; j++) { const u = x0 + (x1 - x0) * j / m, v = x0 + (x1 - x0) * (j + 1) / m; area += (k.f(u) + k.f(v)) / 2 * (v - u); }
          worst = Math.max(worst, Math.abs((Fp[i - 1][1] - Fp[i][1]) / sc - area));
        }
        if (worst > 0.02 * (Math.max(...ys) - Math.min(...ys)) / 50 + 0.02) fail('parts', key, `the gold answer does not rise by the area under the integrand (off by ${worst})`);
      }
      W.touched = true;
      const works = !!(o && o.F), meant = { xe: si === 0 && works, xcos: si === 1 && works, ln: si === 2 && works, xln: si === 3 && works, worse: !!o && !!o.vf && !works, stuck: !!o && !o.vf };
      for (const gl of W.GOALS) {
        if (!!gl.ok(W) !== meant[gl.id]) fail('parts', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('parts', g.id, 'this goal cannot be found');
  W.si = 0; W.oi = null; W.touched = false; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The implicit slope workshop: every point on every curve. Each point must
   lie on its curve exactly, and the points must run anticlockwise as the +
   button says. The y′ formula is checked against the curve's own partial
   derivatives, y′ = −Fx/Fy; each nudge is recomputed by solving the curve's
   quadratic for y outright, not by the workshop's own Newton steps; the drawn
   curve, tangent, point and radius are measured; every sentence is rebuilt,
   and every goal. */
const implicitNotes = (() => {
  const W = Implicit;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const gcd = (u, w) => w ? gcd(w, u % w) : Math.abs(u);
  if (W.SETS.map(S => S.id).join() !== 'circle,ellipse,tilt') fail('implicit', 'sets', W.SETS.map(S => S.id).join());
  W.touched = false; W.si = 0; W.k = W.START;
  for (const g of W.GOALS) if (g.ok(W)) fail('implicit', g.id, 'met where the workshop opens');
  const num = (v, d = 4) => { const q = Math.round(v * 10 ** d) / 10 ** d; return neg(Object.is(q, -0) ? 0 : q); };
  let n = 0;
  const found = {};
  W.SETS.forEach((S, si) => {
    const a = S.F(1, 0), c = S.F(0, 1), b = S.F(1, 1) - a - c;   // F = a x² + b xy + c y²
    let last = -Infinity;
    S.P.forEach(([x, y], k) => {
      const key = `${S.id} (${x}, ${y})`;
      W.si = si; W.k = k; n++;
      if (S.F(x, y) !== S.c) fail('implicit', key, 'is not on the curve');
      let ang = Math.atan2(y, x); if (ang < 0) ang += 2 * Math.PI;
      if (k && ang <= last) fail('implicit', key, 'the points do not run anticlockwise');
      last = ang;
      // y′ = −Fx/Fy from the curve itself
      const h = 1e-6, Fx = (S.F(x + h, y) - S.F(x - h, y)) / (2 * h), Fy = (S.F(x, y + h) - S.F(x, y - h)) / (2 * h);
      const [N, D] = W.nd();
      if (Math.abs(N * Fy - D * Fx) > 1e-6 || Math.sign(Fy) * Math.sign(D) < 0) fail('implicit', key, `y′ = −${N}/${D} is not −Fx/Fy = −${Fx}/${Fy}`);
      if (!Number.isInteger(N) || !Number.isInteger(D)) fail('implicit', key, 'N and D should be whole numbers');
      const want = [`${S.eq} ties y to x without solving for y, so differentiate both sides with respect to x, treating y as a function of x: each y term picks up a y′ by the chain rule.`, S.diff];
      const X = num(x), Y = num(y);
      if (D === 0) {
        if (Math.abs(Fy) > 1e-9) fail('implicit', key, 'the formula divides by 0 where the curve is not vertical');
        want.push(`At (${X}, ${Y}): ${S.dS} = 0, so the formula for y′ divides by 0 and there is no slope. The tangent stands straight up, and the curve turns back on itself here.`,
          `A nudge cannot check it either: the curve has no point just ${x > 0 ? 'right' : 'left'} of x = ${X}.`);
        // and truly none: the quadratic in y has no real root just past x
        const xx = x + Math.sign(x) * 0.01, disc = (b * xx) ** 2 - 4 * c * (a * xx * xx - S.c);
        if (disc >= 0) fail('implicit', key, 'the curve does have points just past x');
      } else {
        const sl = -N / D, g = gcd(N, D), p = -N / g * Math.sign(D), q = Math.abs(D) / g;
        const fr = q === 1 ? neg(p) : `${neg(p)}/${q}`;
        want.push(`At (${X}, ${Y}): ${S.nS} = ${num(N)} and ${S.dS} = ${num(D)}, so y′ = ${N === 0 ? '0' : fr}` +
          (N === 0 ? `: the tangent lies flat, at the very ${y > 0 ? 'top' : 'bottom'} of the curve.` : sl > 0 ? ': the tangent climbs.' : ': the tangent falls.'));
        const yq = xx => { const B = b * xx, C = a * xx * xx - S.c, r = Math.sqrt(B * B - 4 * c * C); const ys = [(-B + r) / (2 * c), (-B - r) / (2 * c)]; return Math.abs(ys[0] - y) < Math.abs(ys[1] - y) ? ys[0] : ys[1]; };
        const l = yq(x - 0.01), r = yq(x + 0.01), s2 = (r - l) / 0.02;
        if (Math.abs(s2 - (N === 0 ? 0 : sl)) > Math.max(0.002, 0.01 * Math.abs(sl))) fail('implicit', key, `the nudge gives ${s2}, not y′`);
        const exact = Math.abs(Math.round(sl * 1e4) / 1e4 - sl) < 1e-10;
        want.push(`Check with a nudge along the curve: x = ${num(x - 0.01)} gives y ≈ ${num(l)} and x = ${num(x + 0.01)} gives y ≈ ${num(r)}, a rise of about ${num(r - l)} over a run of 0.02, which is about ${num(s2)}, matching y′ ${exact ? '=' : '≈'} ${num(N === 0 ? 0 : sl)}.`);
        if (S.id === 'circle' && x !== 0) {
          const g2 = gcd(y, x), rp = y / g2 * Math.sign(x), rq = Math.abs(x) / g2;
          if (Math.abs((y / x) * sl + 1) > 1e-12) fail('implicit', key, 'the tangent is not at a right angle to the radius');
          want.push(`The radius out to this point has slope y/x = ${rq === 1 ? neg(rp) : `${neg(rp)}/${rq}`}. The tangent's slope ${fr} is its negative reciprocal, so the tangent meets the radius at a right angle, as a circle's tangent always does.`);
        }
      }
      const got = W.working();
      if (got.length !== want.length) fail('implicit', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((line, i) => { if (got[i] !== line) fail('implicit', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${line}`); });
      // the drawing
      const svg = W.svg(), ux = px => (px - 180) / 20, uy = py => (130 - py) / 20;
      const cm = svg.match(/data-k="curve" points="([^"]+)"/);
      if (!cm) fail('implicit', key, 'the curve is not drawn');
      else for (const t of cm[1].split(' ')) { const [px, py] = t.split(',').map(Number); if (Math.abs(S.F(ux(px), uy(py)) - S.c) > 0.02 * S.c) { fail('implicit', key, 'the drawn curve leaves the curve'); break; } }
      const pm = svg.match(/data-k="pt" cx="([^"]+)" cy="([^"]+)"/);
      if (!pm || Math.abs(ux(+pm[1]) - x) > 0.01 || Math.abs(uy(+pm[2]) - y) > 0.01) fail('implicit', key, 'the gold point is not at the point');
      const tm = svg.match(/data-k="tan" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/);
      if (!tm) fail('implicit', key, 'no tangent drawn');
      else {
        const [x1, y1, x2, y2] = tm.slice(1).map(Number), dx = ux(x2) - ux(x1), dy = uy(y2) - uy(y1);
        if (Math.abs((ux(x1) + ux(x2)) / 2 - x) > 0.01 || Math.abs((uy(y1) + uy(y2)) / 2 - y) > 0.01) fail('implicit', key, 'the tangent is not centred on the point');
        if (D === 0 ? Math.abs(dx) > 0.01 : Math.abs(dy - (N === 0 ? 0 : -N / D) * dx) > 0.01) fail('implicit', key, 'the drawn tangent has the wrong slope');
      }
      const rm = svg.match(/data-k="radius" x1="180" y1="130" x2="([^"]+)" y2="([^"]+)"/);
      if (!!rm !== (S.id === 'circle')) fail('implicit', key, 'the radius should be drawn on the circle alone');
      if (rm && (Math.abs(ux(+rm[1]) - x) > 0.01 || Math.abs(uy(+rm[2]) - y) > 0.01)) fail('implicit', key, 'the radius does not reach the point');
      // the goals
      W.touched = true;
      const meant = { flat: si === 0 && N === 0, stand: si === 0 && D === 0, egg: si === 1 && N === 0, climb: si === 2 && D !== 0 && -N / D > 0 };
      for (const gl of W.GOALS) {
        if (!!gl.ok(W) !== meant[gl.id]) fail('implicit', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('implicit', g.id, 'this goal cannot be found');
  W.si = 0; W.k = W.START; W.touched = false; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The swap workshop: every u tried on every integral. Each du is checked
   against a numerical derivative of u; each right u must turn the integrand
   into g(u) du exactly, and its answer must climb, step by step across the
   drawing, by the area under the integrand (the trapezoid rule, not the
   answer's own formula); a wrong u must not be the one marked right. Every
   sentence is rebuilt, and every goal. */
const swapNotes = (() => {
  const W = Swap;
  const K = {
    cos: { I: '∫ 2x cos(x²) dx', right: 'x²', f: x => 2 * x * Math.cos(x * x) },
    pow: { I: '∫ 3x²(x³ + 1)⁴ dx', right: 'x³ + 1', f: x => 3 * x * x * (x ** 3 + 1) ** 4 },
    exp: { I: '∫ x e^(x²) dx', right: 'x²', f: x => x * Math.exp(x * x) },
    log: { I: '∫ (ln x)/x dx', right: 'ln x', f: x => Math.log(x) / x }
  };
  if (W.SETS.map(S => S.id).join() !== 'cos,pow,exp,log') fail('swap', 'sets', W.SETS.map(S => S.id).join());
  W.touched = false; W.si = 0; W.oi = null;
  for (const g of W.GOALS) if (g.ok(W)) fail('swap', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  W.SETS.forEach((S, si) => {
    const k = K[S.id], [a, b] = S.D;
    if (S.I !== k.I) fail('swap', S.id, `reads ${S.I}`);
    for (let x = a; x <= b; x += 0.05) if (Math.abs(S.f(x) - k.f(x)) > 1e-9 * Math.max(1, Math.abs(k.f(x)))) fail('swap', S.id, `the integrand is wrong at x = ${x}`);
    const right = S.opts.filter(o => o.F).map(o => o.u);
    if (right.join() !== k.right) fail('swap', S.id, `the u marked right is ${right.join()}, not ${k.right}`);
    W.si = si;
    [null, ...S.opts.keys()].forEach(oi => {
      W.oi = oi; n++;
      const o = oi === null ? null : S.opts[oi], key = `${S.id} u=${o ? o.u : 'none'}`;
      const want = [`${k.I}: look for a piece whose derivative is also sitting in the integrand.`];
      if (!o) want.push('Pick a u below.');
      else {
        const h = 1e-5;
        for (let x = a + 0.03; x < b; x += 0.07) {
          const d = (o.uf(x + h) - o.uf(x - h)) / (2 * h);
          if (Math.abs(d - o.duf(x)) > 1e-4 * Math.max(1, Math.abs(d))) { fail('swap', key, `du/dx is wrong at x = ${x}`); break; }
          if (o.F && Math.abs(o.g(o.uf(x)) * o.duf(x) - k.f(x)) > 1e-9 * Math.max(1, Math.abs(k.f(x)))) { fail('swap', key, `g(u) du is not the integrand at x = ${x}`); break; }
        }
        want.push(`Try u = ${o.u}. Then du = ${o.du}.`);
        if (o.F) want.push(o.swap, `Put x back: ${o.back}`, `Check by differentiating: ${o.check}`);
        else {
          if (/^u = x changes nothing/.test(o.left) !== (o.u === 'x')) fail('swap', key, 'only u = x changes nothing');
          want.push(o.left, 'This u does not simplify it. Try another.');
        }
      }
      const got = W.working();
      if (got.length !== want.length) fail('swap', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('swap', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: the gold answer must rise between samples by the area under the blue integrand
      const svg = W.svg();
      const pts = kk => { const m = svg.match(new RegExp(`data-k="${kk}" points="([^"]+)"`)); return m ? m[1].split(' ').map(t => t.split(',').map(Number)) : null; };
      const fp = pts('f'), Fp = pts('F');
      if (!fp) fail('swap', key, 'the integrand is not drawn');
      if (!!Fp !== !!(o && o.F)) fail('swap', key, 'the answer should be drawn exactly when the u is right');
      if (fp && Fp) {
        // recover the vertical scale from the integrand, then compare each rise of F with the trapezoid area under f
        const ys = fp.map(([px]) => k.f(a + (px - 20) / 320 * (b - a)));
        const i0 = ys.indexOf(Math.min(...ys)), i1 = ys.indexOf(Math.max(...ys));
        const sc = (fp[i0][1] - fp[i1][1]) / (ys[i1] - ys[i0]);
        let worst = 0;
        for (let i = 1; i < Fp.length; i++) {
          const x0 = a + (Fp[i - 1][0] - 20) / 320 * (b - a), x1 = a + (Fp[i][0] - 20) / 320 * (b - a), m = 20;
          let area = 0; for (let j = 0; j < m; j++) { const u = x0 + (x1 - x0) * j / m, v = x0 + (x1 - x0) * (j + 1) / m; area += (k.f(u) + k.f(v)) / 2 * (v - u); }
          worst = Math.max(worst, Math.abs((Fp[i - 1][1] - Fp[i][1]) / sc - area));
        }
        if (worst > 0.02 * (Math.max(...ys) - Math.min(...ys)) / 50 + 0.02) fail('swap', key, `the gold answer does not rise by the area under the integrand (off by ${worst})`);
      }
      W.touched = true;
      const works = !!(o && o.F), meant = { cos: si === 0 && works, pow: si === 1 && works, exp: si === 2 && works, log: si === 3 && works, miss: !!o && !works };
      for (const gl of W.GOALS) {
        if (!!gl.ok(W) !== meant[gl.id]) fail('swap', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(W)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('swap', g.id, 'this goal cannot be found');
  W.si = 0; W.oi = null; W.touched = false; W.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The lathe workshop: every solid cut into every number of disks. Each
   radius squared is worked here from its own polynomial, the disks summed in
   exact fractions, the exact volume from the antiderivative at the two ends
   and again by Simpson's rule, every sentence rebuilt from those, the disks
   in the drawing read back, and every goal rebuilt here. */
const latheNotes = (() => {
  const L = Lathe;
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = (v, d = 4) => { const p = 10 ** d, q = Math.round(v * p) / p; return ng(Object.is(q, -0) ? 0 : q); };
  const ex = v => Math.abs(Math.round(v * 1e4) / 1e4 - v) < 1e-10;
  const about = v => (ex(v) ? '' : 'about ') + num(v);
  const gd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const fr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gd(n, d); n /= g; d /= g; return d === 1 ? ng(n) : `${ng(n)}/${d}`; };
  // f(x)² as polynomial coefficients, the interval, and the exact volume over π as a fraction
  const K = {
    cone: { g: [0, 0, 1], a: 0, b: 3, V: [9, 1], Vs: '9π', fs: 'x', gs: 'x²', Gs: 'x³/3', sub: '₀', sup: '³', at: 8 },
    bowl: { g: [0, 1], a: 0, b: 4, V: [8, 1], Vs: '8π', fs: '√x', gs: 'x', Gs: 'x²/2', sub: '₀', sup: '⁴', at: 1 },
    ball: { g: [4, 0, -1], a: -2, b: 2, V: [32, 3], Vs: '32π/3', fs: '√(4 − x²)', gs: '(4 − x²)', Gs: '4x − x³/3', sub: '₋₂', sup: '²', at: 8 },
    horn: { g: [0, 0, 0, 0, 1 / 4], a: 0, b: 2, V: [8, 5], Vs: '8π/5', fs: 'x²/2', gs: 'x⁴/4', Gs: 'x⁵/20', sub: '₀', sup: '²', at: 16 }
  };
  const ev = (c, x) => c.reduce((t, a, i) => t + a * x ** i, 0);
  const prim = (c, x) => c.reduce((t, a, i) => t + a * x ** (i + 1) / (i + 1), 0);
  const simpson = (c, lo, hi) => { const m = 400, h = (hi - lo) / m; let t = ev(c, lo) + ev(c, hi);
    for (let i = 1; i < m; i++) t += (i % 2 ? 4 : 2) * ev(c, lo + i * h); return t * h / 3; };
  const fact = {
    cone: 'That is the cone formula, (1/3)πr²h = (1/3)π × 3² × 3 = 9π.',
    bowl: 'That is exactly half the cylinder around it, π × 2² × 4 = 16π.',
    ball: 'That is the sphere formula, (4/3)πr³ = (4/3)π × 2³ = 32π/3.',
    horn: 'The horn is thin near 0, so most of its volume sits out near x = 2.'
  };
  if (L.SETS.map(S => S.id).join() !== 'cone,bowl,ball,horn') fail('lathe', 'sets', L.SETS.map(S => S.id).join());
  if (L.NS.join() !== '1,2,4,8,16,32,64') fail('lathe', 'disks', L.NS.join());
  L.touched = false; L.si = 0; L.k = L.START;
  for (const g of L.GOALS) if (g.ok(L)) fail('lathe', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {}, first = {};
  L.SETS.forEach((S, si) => {
    const k = K[S.id], V = k.V[0] / k.V[1];
    if (S.a !== k.a || S.b !== k.b || S.fs !== k.fs || S.gs !== k.gs || S.Gs !== k.Gs || S.V !== k.Vs) fail('lathe', S.id, 'the interval or formulas it shows are not this solid\'s');
    if (Math.abs(prim(k.g, k.b) - prim(k.g, k.a) - V) > 1e-12 || Math.abs(simpson(k.g, k.a, k.b) - V) > 1e-9) fail('lathe', S.id, 'the exact volume is not π∫f²');
    if (Math.abs(S.v - V) > 1e-12) fail('lathe', S.id, `reads the volume as ${S.v}π, worked here ${fr(...k.V)}π`);
    for (let x = k.a; x <= k.b; x += 0.125) if (Math.abs(S.f(x) ** 2 - ev(k.g, x)) > 1e-9 || S.f(x) < 0) fail('lathe', S.id, `f is wrong at x = ${x}`);
    if (S.fact !== fact[S.id]) fail('lathe', S.id, 'its closing line is not the one checked here');
    L.si = si;
    L.NS.forEach((N, j) => {
      L.k = j; n++;
      const key = `${S.id} n=${N}`, w = (k.b - k.a) / N;
      let sum = 0; for (let i = 0; i < N; i++) sum += ev(k.g, k.a + (i + 0.5) * w) * w;
      if (Math.abs(L.sum() - sum) > 1e-9) fail('lathe', key, `the disks read ${L.sum()}π, worked here ${sum}π`);
      const off = Math.abs(sum - V) / V;
      const want = [
        `Spin f(x) = ${k.fs} around the x-axis over [${ng(k.a)}, ${k.b}]. Each slice of width Δx spins into a disk whose radius is f at the slice's middle, so it holds π f(x)² Δx.`,
        `With ${N} slice${N > 1 ? 's' : ''} of width ${fr(k.b - k.a, N)}, the disk${N > 1 ? 's add up' : ' comes'} to ${about(sum)} times π, which is ${about(Math.PI * sum)}.`,
        `The exact volume is π∫${k.sub}${k.sup} ${k.gs} dx = π[${k.Gs}]${k.sub}${k.sup} = ${k.Vs} ${ex(Math.PI * V) ? '=' : '≈'} ${num(Math.PI * V)}.`
      ];
      if (off < 1e-12) {
        // the midpoint rule is exact only where f² is a straight line
        if (k.g.length !== 2) fail('lathe', key, 'exact disks on a solid whose f² bends');
        want.push(`The disks are exactly right${N === 1 ? ', even with just one' : ''}: the graph of f(x)² = ${k.gs} is a straight line, so on each slice the part above the middle's height exactly makes up for the part below it.`);
      } else want.push(`The disks are off by ${about(Math.PI * Math.abs(sum - V))}, ${num(off * 100, 2)}% of the volume` + (off <= 0.01 ? ', within 1%.' : '. Cut thinner slices to come closer.'));
      want.push(fact[S.id]);
      const got = L.working();
      if (got.length !== want.length) fail('lathe', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('lathe', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: one disk per slice, as wide as its slice and as tall as 2f at its middle
      const svg = L.svg(), R = S.id === 'cone' ? 3 : 2;
      const rs = [...svg.matchAll(/data-k="disk" data-n="(\d+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(q => q.slice(1).map(Number));
      if (rs.length !== N) fail('lathe', key, `${rs.length} disks drawn for ${N} slices`);
      rs.forEach(([i, x, y, wd, h]) => {
        const x0 = k.a + (i - 1) * w, r = Math.sqrt(ev(k.g, x0 + w / 2));
        if (Math.abs((x - 20) / 320 * (k.b - k.a) + k.a - x0) > 0.01 || Math.abs(wd / 320 * (k.b - k.a) - w) > 0.01 || Math.abs(h / 168 * R - r) > 0.01 || Math.abs((100 - y) / 84 * R - r) > 0.01) fail('lathe', key, `disk ${i} is not as wide as its slice and as tall as the solid at its middle`);
      });
      if (!/data-k="top"/.test(svg) || !/data-k="bottom"/.test(svg)) fail('lathe', key, 'the curve or its mirror is missing');
      L.touched = true;
      const meant = { cone: si === 0 && off <= 0.01, ball: si === 2 && off <= 0.01, horn: si === 3 && off <= 0.01, one: si === 1 && N === 1 };
      for (const gl of L.GOALS) {
        if (!!gl.ok(L) !== meant[gl.id]) fail('lathe', key, `goal ${gl.id} is ${gl.ok(L) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(L)) { found[gl.id] = found[gl.id] || key; if (!(gl.id in first)) first[gl.id] = N; }
      }
    });
  });
  const at = { cone: 8, ball: 8, horn: 16, one: 1 };
  for (const g of L.GOALS) { if (!found[g.id]) fail('lathe', g.id, 'this goal cannot be found'); else if (first[g.id] !== at[g.id]) fail('lathe', g.id, `first met with ${first[g.id]} disks, not ${at[g.id]}`); }
  L.si = 0; L.k = L.START; L.touched = false; L.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The endless area workshop: every curve out to every b. Each area is worked
   here twice, from the power rule and by Simpson's rule on the curve itself
   (with x = eᵘ, so the long stretch out to 1024 is sampled evenly), every
   doubling's share against the one before, every sentence rebuilt from those,
   the bars in the drawing read back, and every goal rebuilt here. */
const tailNotes = (() => {
  const T = Tail;
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = v => { const q = Math.round(v * 1e4) / 1e4; return ng(Object.is(q, -0) ? 0 : q); };
  const ex = v => Math.abs(Math.round(v * 1e4) / 1e4 - v) < 1e-10;
  const is = v => (ex(v) ? '= ' : '≈ ') + num(v);
  const about = v => (ex(v) ? '' : 'about ') + num(v);
  const K = {
    sq:   { p: 2, fs: '1/x²', Ft: '−1/x', At: '1 − 1/b', put: b => `1 − 1/${b}`, lim: 1, ls: '1', r: '1/2', share: 'half' },
    cube: { p: 3, fs: '1/x³', Ft: '−1/(2x²)', At: '1/2 − 1/(2b²)', put: b => `1/2 − 1/${2 * b * b}`, lim: 0.5, ls: '1/2', r: '1/4', share: 'a quarter of' },
    inv:  { p: 1, fs: '1/x', Ft: 'ln x', At: 'ln b', put: b => `ln ${b}` },
    root: { p: 0.5, fs: '1/√x', Ft: '2√x', At: '2√b − 2', put: b => `2√${b} − 2` }
  };
  // ∫₁^b x^(−p) dx by the power rule, and again by Simpson's rule with x = eᵘ, dx = eᵘ du
  const rule = (p, b) => p === 1 ? Math.log(b) : (b ** (1 - p) - 1) / (1 - p);
  const simpson = (p, b) => { const U = Math.log(b); if (U < 1e-12) return 0; const m = 2000, h = U / m, g = u => Math.exp(u * (1 - p));
    let t = g(0) + g(U); for (let i = 1; i < m; i++) t += (i % 2 ? 4 : 2) * g(i * h); return t * h / 3; };
  if (T.SETS.map(S => S.id).join() !== 'sq,cube,inv,root') fail('tail', 'sets', T.SETS.map(S => S.id).join());
  T.touched = false; T.si = 0; T.n = T.START;
  for (const g of T.GOALS) if (g.ok(T)) fail('tail', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {}, first = {};
  T.SETS.forEach((S, si) => {
    const k = K[S.id];
    if (S.p !== k.p || S.fs !== k.fs || S.Ft !== k.Ft || S.At !== k.At) fail('tail', S.id, 'the power or formulas it shows are not this curve\'s');
    // the antiderivative it names must differentiate back to the curve: check F(b) − F(1) by Simpson's rule
    T.si = si;
    for (let m = 0; m <= T.N; m++) {
      T.n = m; n++;
      const b = 2 ** m, key = `${S.id} b=${b}`, A = rule(k.p, b), A0 = m ? rule(k.p, b / 2) : 0;
      if (Math.abs(simpson(k.p, b) - A) > 1e-7) fail('tail', key, `the power rule gives ${A}, Simpson's rule ${simpson(k.p, b)}`);
      if (Math.abs(T.A() - A) > 1e-9) fail('tail', key, `reads the area as ${T.A()}, worked here ${A}`);
      if (T.b() !== b) fail('tail', key, `b reads ${T.b()}`);
      const want = [
        `f(x) = ${k.fs}, from x = 1 out to x = b. Its antiderivative is ${k.Ft}, so the area from 1 to b is ${k.At}.`,
        `Out to b = ${b}: the area is ${k.put(b)} ${is(A)}.`
      ];
      if (m === 0) want.push('Push b out: each press doubles it.');
      else {
        const add = A - A0, was = m > 1 ? A0 - rule(k.p, b / 4) : 0;
        // each doubling adds 2^(1 − p) times what the one before added
        if (m > 1 && Math.abs(add / was - 2 ** (1 - k.p)) > 1e-9) fail('tail', key, 'a doubling does not add 2^(1 − p) times the one before');
        want.push(`Doubling b from ${b / 2} to ${b} added ${about(add)}` + (m === 1 ? '.' :
          k.p === 1 ? ', exactly what every doubling before it added: ln 2 ≈ 0.6931.'
          : k.p < 1 ? ', √2 ≈ 1.4142 times what the doubling before it added.'
          : `, ${k.share} what the doubling before it added.`));
      }
      if (k.p > 1) {
        const g = k.lim - A;
        if (Math.abs(1 / (k.p - 1) - k.lim) > 1e-12) fail('tail', S.id, 'the limit is not 1/(p − 1)');
        if (!(g > 0)) fail('tail', key, 'the area should stay short of its limit');
        want.push(`So the doublings add up like a geometric series with r = ${k.r}, and the area closes in on ∫₁^∞ ${k.fs} dx = 1/(p − 1) = ${k.ls}. Out to ${b} it is ${about(g)} short of it${g <= 0.01 ? ', within 0.01' : ''}.`);
      } else if (k.p === 1)
        want.push('Every doubling adds the same ln 2, so the area grows without end even though 1/x itself falls toward 0: ∫₁^∞ 1/x dx diverges. p = 1 is the borderline.');
      else
        want.push('Each doubling adds more than the last, so the area runs away: ∫₁^∞ 1/√x dx diverges. Only p > 1 makes each doubling add less than the one before.');
      const got = T.working();
      if (got.length !== want.length) fail('tail', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('tail', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: one bar per doubling, end to end from 0, the last ending at the area
      const svg = T.svg(), hi = k.p > 1 ? k.lim : Math.max(A, 1e-9), UX = px => (px - 20) / 320 * hi;
      const bars = [...svg.matchAll(/data-k="step" data-n="(\d+)" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)].map(q => [+q[1], +q[2], +q[3]]);
      if (bars.length !== m) fail('tail', key, `${bars.length} bars for ${m} doublings`);
      bars.forEach(([j, x, w]) => {
        const a = rule(k.p, 2 ** (j - 1)), c = rule(k.p, 2 ** j), tol = hi / 320 * 0.02 + 1e-9;
        if (Math.abs(UX(x) - a) > tol || (c - a > hi / 320 && Math.abs(UX(x + w) - c) > tol)) fail('tail', key, `bar ${j} does not run from the area before it to the area after`);
      });
      const lim = svg.match(/data-k="lim" x1="([\d.]+)"/);
      if (!!lim !== (k.p > 1)) fail('tail', key, 'the limit line should show only where there is a limit');
      if (lim && Math.abs(UX(+lim[1]) - k.lim) > 1e-3) fail('tail', key, 'the limit line is not at 1/(p − 1)');
      if (/data-k="area"/.test(svg) !== (b > 1)) fail('tail', key, 'the area should be shaded once b is past 1');
      T.touched = true;
      const meant = { sq: si === 0 && k.lim - A <= 0.01, cube: si === 1 && k.lim - A <= 0.01, inv: si === 2 && A > 5, root: si === 3 && A > 10 };
      for (const gl of T.GOALS) {
        if (!!gl.ok(T) !== meant[gl.id]) fail('tail', key, `goal ${gl.id} is ${gl.ok(T) ? 'met' : 'not met'}, worked here otherwise`);
        if (gl.ok(T)) { found[gl.id] = found[gl.id] || key; if (!(gl.id in first)) first[gl.id] = b; }
      }
    }
  });
  // where each goal is first met: 1 − 1/128, 1/2 − 1/128, ln 256 > 5 and 2√64 − 2 = 14 > 10
  const at = { sq: 128, cube: 8, inv: 256, root: 64 };
  for (const g of T.GOALS) { if (!found[g.id]) fail('tail', g.id, 'this goal cannot be found'); else if (first[g.id] !== at[g.id]) fail('tail', g.id, `first met at b = ${first[g.id]}, not ${at[g.id]}`); }
  T.si = 0; T.n = T.START; T.touched = false; T.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The water level workshop: every curve at every level. Each curve's area is
   worked here from its own coefficients, the level against it in exact
   fractions, the curve above the level and the gaps under it by Simpson's rule
   split where the curve crosses the level (found here by halving), every
   sentence is rebuilt from those, the shading in the drawing must follow the
   curve and the level, and every goal is rebuilt here. */
const avgNotes = (() => {
  const A = Avg;
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = v => { const q = Math.round(v * 1e4) / 1e4; return ng(Object.is(q, -0) ? 0 : q); };
  const ex = v => Math.abs(Math.round(v * 1e4) / 1e4 - v) < 1e-10;
  const about = v => (ex(v) ? '' : 'about ') + num(v);
  const gd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const fr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gd(n, d); n /= g; d /= g; return d === 1 ? ng(n) : `${ng(n)}/${d}`; };
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  // coefficients, interval, the step of the level as a fraction, and how many steps
  const K = {
    bowl:   { c: [0, 0, 1], a: 0, b: 3, step: [1, 2], top: 18, fs: 'x²', fi: 'x²', Fs: 'x³/3', avg: 6 },
    ramp:   { c: [1, 2], a: 0, b: 4, step: [1, 1], top: 9, fs: '2x + 1', fi: '(2x + 1)', Fs: 'x² + x', avg: 5 },
    steep:  { c: [0, 0, 0, 1], a: 0, b: 2, step: [1, 2], top: 16, fs: 'x³', fi: 'x³', Fs: 'x⁴/4', avg: 4 },
    narrow: { c: [0, 0, 1], a: 0, b: 2, step: [1, 3], top: 12, fs: 'x²', fi: 'x²', Fs: 'x³/3', avg: 4 }
  };
  const ev = (c, x) => c.reduce((t, a, i) => t + a * x ** i, 0);
  // the area as an exact fraction: ∫ x^i from a to b with a = 0 is b^(i+1)/(i+1)
  const areaQ = k => { let n = 0, d = 1; k.c.forEach((a, i) => { const pn = a * k.b ** (i + 1), pd = i + 1; n = n * pd + pn * d; d *= pd; }); const g = gd(n, d); return [n / g, d / g]; };
  const simpson = (g, lo, hi) => { if (hi - lo < 1e-12) return 0; const m = 400, h = (hi - lo) / m; let t = g(lo) + g(hi);
    for (let i = 1; i < m; i++) t += (i % 2 ? 4 : 2) * g(lo + i * h); return t * h / 3; };
  if (A.SETS.map(S => S.id).join() !== 'bowl,ramp,steep,narrow') fail('avg', 'sets', A.SETS.map(S => S.id).join());
  A.touched = false; A.si = 0; A.k = A.START;
  for (const g of A.GOALS) if (g.ok(A)) fail('avg', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  A.SETS.forEach((S, si) => {
    const k = K[S.id], [p, q] = areaQ(k), w = k.b - k.a;
    if (S.a !== k.a || S.b !== k.b || S.fs !== k.fs || (S.fi || S.fs) !== k.fi || S.Fs !== k.Fs) fail('avg', S.id, 'the interval or formulas it shows are not this curve\'s');
    if (S.area[0] * q !== S.area[1] * p) fail('avg', S.id, `its area reads ${S.area.join('/')}, worked here ${p}/${q}`);
    if (S.sn * k.step[1] !== S.sd * k.step[0] || S.top !== k.top) fail('avg', S.id, 'its level steps are not the ones checked here');
    for (let t = k.a; t <= k.b; t += 0.125) if (Math.abs(S.f(t) - ev(k.c, t)) > 1e-9) fail('avg', S.id, `f is wrong at x = ${t}`);
    // the curve rises across the interval, so it crosses each level at most once
    for (let t = k.a; t < k.b; t += 0.125) if (!(ev(k.c, t + 0.125) > ev(k.c, t))) fail('avg', S.id, 'the curve does not rise the whole way');
    A.si = si;
    let levelled = 0;
    for (let j = 0; j <= k.top; j++) {
      A.k = j; n++;
      const c = j * k.step[0] / k.step[1], key = `${S.id} c=${c}`;
      const C = fr(j * k.step[0], k.step[1]), A_ = fr(p, q), cwN = j * k.step[0] * w, cw = fr(cwN, k.step[1]);
      const dn = p * k.step[1] - q * cwN, dd = q * k.step[1];
      if (Math.sign(A.diff()) !== Math.sign(dn)) fail('avg', key, `reads area − c × width ${A.diff()}, worked here ${dn}/${dd}`);
      const fa = ev(k.c, k.a), fb = ev(k.c, k.b);
      let lo = k.a, hi = k.b; // halve to the crossing
      if (c <= fa) hi = k.a; else if (c >= fb) lo = k.b;
      else for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (ev(k.c, m) < c) lo = m; else hi = m; }
      const xs = (lo + hi) / 2;
      const over = simpson(t => ev(k.c, t) - c, xs, k.b), gaps = simpson(t => c - ev(k.c, t), k.a, xs);
      if (Math.abs(over - A.over()) > 1e-7 || Math.abs(gaps - A.gaps()) > 1e-7) fail('avg', key, `above and under read ${A.over()} and ${A.gaps()}, worked here ${over} and ${gaps}`);
      if (Math.abs((over - gaps) - dn / dd) > 1e-7) fail('avg', key, 'above minus under is not area − c × width');
      const ab = `${SUB[k.a]}${SUP[k.b]}`;
      const want = [
        `f(x) = ${k.fs} on [${k.a}, ${k.b}]. The area under it is ∫${ab} ${k.fi} dx = [${k.Fs}]${ab} = ${A_}.`,
        `A flat level at height c = ${C} across the same width ${w} holds c × ${w} = ${cw}.`
      ];
      if (c <= fa) want.push(`The curve never dips below the level, standing above it by ${A_} − ${cw} = ${fr(dn, dd)} in all, so the level is too low: raise it.`);
      else if (c >= fb) want.push(`The curve never rises above the level, falling short of it by ${cw} − ${A_} = ${fr(-dn, dd)} in all, so the level is too high: lower it.`);
      else {
        const head = `Where the curve rises above the level, the area between them is ${about(over)}; where it dips below, the gaps under the level come to ${about(gaps)}.`;
        want.push(dn === 0
          ? `${head} They match: ${A_} − ${cw} = 0. The water above fills the gaps below, so c = ${C} is the average value, (1/${w}) × ${A_} = ${C}.`
          : `${head} They differ by ${A_} − ${cw} = ${fr(dn, dd)}, ${dn > 0 ? 'more' : 'less'} than 0, so the level is too ${dn > 0 ? 'low: raise' : 'high: lower'} it.`);
      }
      if (dn === 0) {
        levelled++;
        if (j !== k.avg) fail('avg', key, 'levels at the wrong step');
        if (Math.abs(c * w - p / q) > 1e-12) fail('avg', key, 'c × width is not the area');
        const E = fr(fa + fb, 2), straight = k.c.length === 2;
        if (straight !== ((fa + fb) / 2 === c)) fail('avg', key, 'the ends average to the level for a curve, or not for a line');
        if (!straight && !((fa + fb) / 2 > c)) fail('avg', key, 'the ends should average above the level for a curve that bends up');
        want.push(straight
          ? `For a straight line that is also the average of its two ends, (${ng(fa)} + ${ng(fb)})/2 = ${E}. Only a straight line lets you take that shortcut.`
          : `The average of the two ends, (${ng(fa)} + ${ng(fb)})/2 = ${E}, is not it: a curve that bends up spends most of its width low, so its average sits below the middle of its ends.`);
      }
      const got = A.working();
      if (got.length !== want.length) fail('avg', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('avg', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing, read back into the curve's own units
      const svg = A.svg(), ytop = k.top * k.step[0] / k.step[1] * 1.06;
      const UX = px => k.a + (px - 20) / 320 * w, UY = py => (188 - py) / 176 * ytop, tol = ytop / 176 * 0.02 + 1e-6;
      const pts = key2 => { const m = svg.match(new RegExp(`data-k="${key2}" points="([^"]+)"`)); return m ? m[1].split(' ').map(t => t.split(',').map(Number)) : null; };
      const cur = pts('curve'), ov = pts('over'), gp = pts('gap');
      if (!cur || !ov || !gp) fail('avg', key, 'the curve or a shading is missing');
      else {
        for (const [px, py] of cur) if (Math.abs(UY(py) - ev(k.c, UX(px))) > tol * 3) { fail('avg', key, `the curve is off at x = ${UX(px)}`); break; }
        for (const [px, py] of ov.slice(0, -2)) if (Math.abs(UY(py) - Math.max(ev(k.c, UX(px)), c)) > tol * 3) { fail('avg', key, `the blue shading is off at x = ${UX(px)}`); break; }
        for (const [px, py] of gp.slice(0, -2)) if (Math.abs(UY(py) - Math.min(ev(k.c, UX(px)), c)) > tol * 3) { fail('avg', key, `the red shading is off at x = ${UX(px)}`); break; }
        for (const sh of [ov, gp]) { const [b1, a1] = sh.slice(-2);
          if (Math.abs(UX(b1[0]) - k.b) > 1e-3 || Math.abs(UX(a1[0]) - k.a) > 1e-3 || Math.abs(UY(b1[1]) - c) > tol * 3 || Math.abs(UY(a1[1]) - c) > tol * 3) fail('avg', key, 'a shading does not close along the level'); }
      }
      const lv = svg.match(/data-k="level" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/);
      if (!lv || Math.abs(UY(+lv[2]) - c) > tol * 3 || Math.abs(UY(+lv[4]) - c) > tol * 3 || Math.abs(UX(+lv[1]) - k.a) > 1e-3 || Math.abs(UX(+lv[3]) - k.b) > 1e-3) fail('avg', key, 'the gold level is not at height c across the interval');
      A.touched = true;
      const meant = { bowl: si === 0 && dn === 0, ramp: si === 1 && dn === 0, steep: si === 2 && dn === 0, narrow: si === 3 && dn === 0, over: dn < 0 };
      for (const gl of A.GOALS) {
        if (!!gl.ok(A) !== meant[gl.id]) fail('avg', key, `goal ${gl.id} is ${gl.ok(A) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(A)) found[gl.id] = found[gl.id] || key;
      }
    }
    if (levelled !== 1) fail('avg', S.id, `levels at ${levelled} steps, not exactly one`);
  });
  for (const g of A.GOALS) if (!found[g.id]) fail('avg', g.id, 'this goal cannot be found');
  A.si = 0; A.k = A.START; A.touched = false; A.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The bend workshop: every curve at every point. Each curve's f′ and f″ are
   worked here from its own coefficients, every sentence is rebuilt from them,
   the slope half a step either side must move the way f″ says, a point where
   the slope is the same both sides must be its lowest, the curve must really
   sit above or below its tangent where the readout says, the drawing must put
   the curve, the point and the tangent where they belong, and every goal is
   rebuilt here. */
const bendNotes = (() => {
  const B = Bend;
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = v => { const q = Math.round(v * 1e4) / 1e4; return ng(Object.is(q, -0) ? 0 : q); };
  const ex = v => Math.abs(Math.round(v * 1e4) / 1e4 - v) < 1e-10;
  const C = { s: [0, -3, 0, 1], shift: [0, 0, -1, 1 / 3], flat: [0, 0, 0, 0, 1 / 4] };
  const W = { s: ['x³ − 3x', '3x² − 3', '6x'], shift: ['x³/3 − x²', 'x² − 2x', '2x − 2'], flat: ['x⁴/4', 'x³', '3x²'] };
  const dv = c => c.slice(1).map((a, i) => a * (i + 1));
  const ev = (c, x) => { const v = c.reduce((t, a, i) => t + a * x ** i, 0), q = Math.round(v * 1e9) / 1e9; return Object.is(q, -0) ? 0 : q; };
  if (B.SETS.map(S => S.id).join() !== 's,shift,flat') fail('bend', 'sets', B.SETS.map(S => S.id).join());
  if (B.X.join() !== '-2,-1.5,-1,-0.5,0,0.5,1,1.5,2') fail('bend', 'steps', B.X.join());
  B.touched = false; B.si = 0; B.k = B.START;
  for (const g of B.GOALS) if (g.ok(B)) fail('bend', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {}, cols = { up: new Set(), down: new Set(), zero: new Set() };
  B.SETS.forEach((S, si) => {
    const c0 = C[S.id], c1 = dv(c0), c2 = dv(c1);
    if (S.fs !== W[S.id][0] || S.d1s !== W[S.id][1] || S.d2s !== W[S.id][2]) fail('bend', S.id, 'the formulas it shows are not this curve\'s');
    for (let t = -3; t <= 3; t += 0.25)
      if (Math.abs(S.f(t) - ev(c0, t)) > 1e-9 || Math.abs(S.d1(t) - ev(c1, t)) > 1e-9 || Math.abs(S.d2(t) - ev(c2, t)) > 1e-9)
        fail('bend', S.id, `f, f′ or f″ is wrong at x = ${t}`);
    B.si = si;
    B.X.forEach((x, k) => {
      B.k = k; n++;
      const key = `${S.id} x=${x}`, X = num(x), L = num(x - 0.5), R = num(x + 0.5);
      const y = ev(c0, x), s = ev(c1, x), c = ev(c2, x), lo = ev(c1, x - 0.5), hi = ev(c1, x + 0.5);
      if (B.f1() !== s || B.f2() !== c) fail('bend', key, `reads f′ ${B.f1()} and f″ ${B.f2()}, worked here ${s} and ${c}`);
      if (c !== 0 && Math.sign(hi - lo) !== Math.sign(c)) fail('bend', key, 'the slope half a step either side moves against f″');
      if (hi === lo && !(s < lo)) fail('bend', key, 'the slope is the same both sides but is not lowest here');
      // the curve really is above or below its tangent near the point, as f″ says
      for (const d of [-0.9, -0.45, 0.45, 0.9]) {
        const t = x + d; if (t < B.D[0] || t > B.D[1]) continue;
        const gap = ev(c0, t) - (y + s * d);
        if (c !== 0 && Math.sign(gap) !== Math.sign(c)) fail('bend', key, `the curve is on the wrong side of its tangent at x = ${t}`);
      }
      const a2 = ev(c2, x - 0.5), b2 = ev(c2, x + 0.5), flip = c === 0 && a2 * b2 < 0;
      if (B.infl() !== flip) fail('bend', key, `reads ${B.infl() ? 'a flip' : 'no flip'}, worked here ${flip ? 'a flip' : 'no flip'}`);
      const want = [
        `f(x) = ${W[S.id][0]}, so its slope is f′(x) = ${W[S.id][1]}, and the slope of that, f″(x) = ${W[S.id][2]}, says how fast the slope itself is changing.`,
        `At x = ${X}: f(${X}) ${ex(y) ? '=' : '≈'} ${num(y)}, the tangent's slope is f′(${X}) = ${num(s)}, and f″(${X}) = ${num(c)}.`,
        `Half a step either side, the slope goes from f′(${L}) = ${num(lo)} to f′(${R}) = ${num(hi)}` +
          (hi > lo ? ': it is rising.' : hi < lo ? ': it is falling.' : `, the same both sides, while f′(${X}) = ${num(s)} is lower than either: the slope bottoms out right here and turns from falling to rising.`),
        c > 0 ? `f″(${X}) = ${num(c)} is more than 0, which says the same in one number: the curve bends up like a cup and sits above its tangent.`
        : c < 0 ? `f″(${X}) = ${num(c)} is less than 0, which says the same in one number: the curve bends down like a cap and sits below its tangent.`
        : flip ? `f″(${X}) = 0, and half a step either side f″(${L}) = ${num(a2)} and f″(${R}) = ${num(b2)} have opposite signs: the bend flips from ${a2 < 0 ? 'cap to cup' : 'cup to cap'} here. That is an inflection point, and the tangent crosses the curve.`
        : `f″(${X}) = 0, but half a step either side f″(${L}) = ${num(a2)} and f″(${R}) = ${num(b2)} are both ${a2 > 0 ? 'more' : 'less'} than 0: the curve bends ${a2 > 0 ? 'up' : 'down'} on both sides, so this is not an inflection point. f″ = 0 says where to look, not that the bend flips.`
      ];
      if (s === 0) want.push(c !== 0
        ? `The tangent is flat and the curve bends ${c < 0 ? 'down' : 'up'} away from it, so this is a ${c < 0 ? 'hilltop, a local maximum' : 'valley floor, a local minimum'}. Reading f″ at a flat tangent like this is the second derivative test.`
        : (() => { const fl = ev(c0, x - 0.5), fr = ev(c0, x + 0.5), up = fl > y && fr > y, dn = fl < y && fr < y;
            return `The tangent is flat here too, and with f″ = 0 the second derivative test cannot tell a hilltop from a valley floor, so look either side: f(${L}) ${ex(fl) ? '=' : '≈'} ${num(fl)} and f(${R}) ${ex(fr) ? '=' : '≈'} ${num(fr)} are ${up ? 'both higher, so this is a valley floor all the same' : dn ? 'both lower, so this is a hilltop all the same' : 'one higher and one lower, so this is neither'}.`; })());
      if (s === 0) { // a flat tangent: the point really is the top or bottom of its neighbours
        const nb = [ev(c0, x - 0.25), ev(c0, x + 0.25)];
        if (c < 0 && !(nb[0] < y && nb[1] < y)) fail('bend', key, 'called a hilltop but it is not');
        if (c > 0 && !(nb[0] > y && nb[1] > y)) fail('bend', key, 'called a valley floor but it is not');
      }
      const got = B.working();
      if (got.length !== want.length) fail('bend', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('bend', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      if (flip) { // the tangent crosses the curve: one side above, the other below
        const g1 = ev(c0, x - 0.45) - (y - s * 0.45), g2 = ev(c0, x + 0.45) - (y + s * 0.45);
        if (!(g1 * g2 < 0)) fail('bend', key, 'the tangent does not cross the curve at the flip');
      }
      // the drawing, read back into the curve's own units
      const svg = B.svg();
      let ylo = Infinity, yhi = -Infinity;
      for (let i = 0; i <= 90; i++) { const v = ev(c0, B.D[0] + (B.D[1] - B.D[0]) * i / 90); ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); }
      const pad = (yhi - ylo) * 0.08; ylo -= pad; yhi += pad;
      const UX = px => B.D[0] + (px - 20) / 320 * (B.D[1] - B.D[0]), UY = py => ylo + (188 - py) / 176 * (yhi - ylo);
      const tol = (yhi - ylo) / 176 * 0.02 + 1e-6;
      const pl = svg.match(/data-k="curve" points="([^"]+)"/);
      if (!pl) fail('bend', key, 'no curve');
      else for (const pt of pl[1].split(' ')) { const [px, py] = pt.split(',').map(Number);
        if (Math.abs(UY(py) - ev(c0, UX(px))) > tol * 3 + 0.0005 * (yhi - ylo)) { fail('bend', key, `the curve is off at x = ${UX(px)}`); break; } }
      const ptm = svg.match(/data-k="pt" cx="([\d.-]+)" cy="([\d.-]+)"/);
      if (!ptm || Math.abs(UX(+ptm[1]) - x) > 0.001 || Math.abs(UY(+ptm[2]) - y) > tol * 2) fail('bend', key, 'the gold point is not at (x, f(x))');
      const tn = svg.match(/data-k="tan" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" stroke="([^"]+)"/);
      if (!tn) fail('bend', key, 'no tangent');
      else {
        const [x1, y1, x2, y2] = tn.slice(1, 5).map(v => +v);
        if (Math.abs(UX(x1) - Math.max(x - 0.9, B.D[0])) > 0.001 || Math.abs(UX(x2) - Math.min(x + 0.9, B.D[1])) > 0.001) fail('bend', key, 'the tangent does not run 0.9 either side');
        for (const [qx, qy] of [[x1, y1], [x2, y2]]) if (Math.abs(UY(qy) - (y + s * (UX(qx) - x))) > tol * 3) fail('bend', key, 'the tangent does not have the slope f′(x) through the point');
        cols[c > 0 ? 'up' : c < 0 ? 'down' : 'zero'].add(tn[5]);
      }
      B.touched = true;
      const meant = { top: si === 0 && s === 0 && c < 0, floor: si === 0 && s === 0 && c > 0, flip: si === 0 && flip, shift: si === 1 && flip, fake: si === 2 && c === 0 && !flip };
      if (si === 0 && flip !== (x === 0)) fail('bend', key, 'the S-curve should flip at 0 and only there');
      if (si === 1 && flip !== (x === 1)) fail('bend', key, 'the shifted curve should flip at 1 and only there');
      for (const gl of B.GOALS) {
        if (!!gl.ok(B) !== meant[gl.id]) fail('bend', key, `goal ${gl.id} is ${gl.ok(B) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(B)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const w in cols) if (cols[w].size !== 1) fail('bend', 'colours', `the ${w} tangent is not one colour`);
  if (new Set([...cols.up, ...cols.down, ...cols.zero]).size !== 3) fail('bend', 'colours', 'up, down and f″ = 0 tangents must differ');
  for (const g of B.GOALS) if (!found[g.id]) fail('bend', g.id, 'this goal cannot be found');
  B.si = 0; B.k = B.START; B.touched = false; B.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The geometric series workshop: every series at every number of terms.
   The terms and running totals are worked here in exact fractions, the gap
   to a/(1 − r) must be a·rⁿ/(1 − r) and shrink by the factor r each term as
   the readout says, the doubling series must run away, the staircase must
   put each term's bar from one running total to the next, and every sentence
   and goal is rebuilt here. */
const geoNotes = (() => {
  const G = Geo;
  const gd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; };
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const fr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gd(n, d); n /= g; d /= g; return d === 1 ? ng(n) : `${ng(n)}/${d}`; };
  const num = v => { const q = Math.round(v * 1e4) / 1e4; return ng(Object.is(q, -0) ? 0 : q); };
  const ex = v => Math.abs(Math.round(v * 1e4) / 1e4 - v) < 1e-10;
  const sub = n => String(n).replace(/\d/g, c => '₀₁₂₃₄₅₆₇₈₉'[c]);
  if (G.SETS.map(S => S.id).join() !== 'half,third,swing,double') fail('geo', 'sets', G.SETS.map(S => S.id).join());
  G.touched = false; G.si = 0; G.n = G.START;
  for (const g of G.GOALS) if (g.ok(G)) fail('geo', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  G.SETS.forEach((S, si) => {
    const { a, p, q } = S, r = p / q, conv = Math.abs(r) < 1;
    // exact running totals as fractions: S_m = a(q^m − p^m) / (q^(m−1)(q − p))
    const Sx = m => { let N = 0, D = 1; for (let k = 0; k < m; k++) { const tn = a * p ** k, td = q ** k; N = N * td + tn * D; D *= td; const g = gd(N, D); N /= g; D /= g; } return N / D; };
    const T = a / (1 - r);
    if (S.id === 'swing' && p >= 0) fail('geo', S.id, 'the swinging series needs a negative r');
    if (S.id === 'double' && conv) fail('geo', S.id, 'the doubling series must run away');
    if (S.id !== 'double' && !conv) fail('geo', S.id, 'this series must converge');
    G.si = si;
    let prev = null;
    for (let m = 1; m <= G.N; m++) {
      G.n = m; n++;
      const key = `${S.id} n=${m}`, Sm = Sx(m), gap = T - Sm;
      if (Math.abs(G.S() - Sm) > 1e-9) fail('geo', key, `S reads ${G.S()}, worked here ${Sm}`);
      if (conv) {
        if (Math.abs(gap - a * r ** m / (1 - r)) > 1e-9) fail('geo', key, 'the gap is not a·rⁿ/(1 − r)');
        if (prev !== null && Math.abs(gap - r * prev) > 1e-9) fail('geo', key, 'the gap did not shrink by the factor r');
        if (Math.abs(G.gap() - gap) > 1e-9) fail('geo', key, `gap reads ${G.gap()}, worked here ${gap}`);
      }
      prev = gap;
      const tf = k => fr(a * p ** k, q ** k), rs = fr(p, q);
      const first = [0, 1, 2, 3].map(k => { const t = tf(k); return k === 0 ? t : (t[0] === '−' ? ' − ' + t.slice(1) : ' + ' + t); }).join('');
      const want = [
        `Each term is r = ${rs} times the one before, starting from a = ${a}: ${first} + ⋯`,
        `Term ${m} is ${a} × ${p < 0 || q !== 1 ? `(${rs})` : rs}^${m - 1} = ${tf(m - 1)}, and ${m === 1 ? 'so far the total is' : `the first ${m} terms add up to`} S${sub(m)} ${ex(Sm) ? '=' : '≈'} ${num(Sm)}.`
      ];
      if (conv) {
        const Gp = Math.abs(gap), by = Gp < 0.00005 ? 'less than 0.0001' : (ex(Gp) ? '' : 'about ') + num(Gp);
        want.push(`|r| < 1, so the endless sum is a/(1 − r) = ${a}/(1 ${p < 0 ? '+' : '−'} ${fr(Math.abs(p), q)}) = ${fr(a * q, q - p)}.`,
          `S${sub(m)} is ${Gp < 1e-12 ? 'exactly on it' : `${by} ${gap > 0 ? 'short of' : 'over'} it`}. Each new term multiplies that gap by r = ${rs}, so it shrinks toward 0` +
            (p < 0 ? ', changing sides every time: a negative r swings the total above and below the sum in turn.' : ' and the total creeps up on the sum from below.'),
          Gp <= 0.01 ? 'That is within 0.01: every term still to come, an endless tail of them, adds up to less than 0.01.' : 'That is still more than 0.01 away. Add more terms.');
        if (p > 0 && gap <= 0) fail('geo', key, 'a positive r should creep up from below');
      } else {
        if (m > 1 && !(Sm > Sx(m - 1) && a * p ** (m - 1) > a * p ** (m - 2))) fail('geo', key, 'the terms and total must grow');
        if (fr(a, 1 - p) !== '−1' && T >= 0) fail('geo', key, 'a/(1 − r) should be negative here');
        want.push(`|r| = ${rs} is not less than 1, so each term is bigger than the last and the total runs away without end.`,
          `a/(1 − r) = ${a}/(1 − ${rs}) = ${fr(a, 1 - p)} is not the sum: that formula only holds when |r| < 1, and no sum of positive terms is negative.`);
      }
      const got = G.working();
      if (got.length !== want.length) fail('geo', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('geo', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the staircase: one bar per term, each from one running total to the next
      const svg = G.svg();
      let lo = 0, hi = 0;
      for (let k = 0; k <= (conv ? G.N : m); k++) { lo = Math.min(lo, Sx(k)); hi = Math.max(hi, Sx(k)); }
      if (conv) hi = Math.max(hi, T);
      const X = v => 20 + (v - lo) / (hi - lo) * 320;
      const bars = [...svg.matchAll(/data-k="term" data-n="(\d+)" x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="11" rx="2" fill="([^"]+)"/g)];
      if (bars.length !== m) fail('geo', key, `${bars.length} bars for ${m} terms`);
      bars.forEach((b, i) => {
        const s0 = Sx(i), s1 = Sx(i + 1), x = +b[2], w = +b[4], ww = Math.max(Math.abs(X(s1) - X(s0)), 0.5);
        if (+b[1] !== i + 1 || Math.abs(x - Math.min(X(s0), X(s1), 340 - ww)) > 0.02 || Math.abs(w - ww) > 0.02)
          fail('geo', key, `bar ${i + 1} does not run from S${sub(i)} to S${sub(i + 1)}`);
        if (x < 19.9 || x + w > 340.1 || +b[3] + 11 > 200) fail('geo', key, `bar ${i + 1} runs out of the picture`);
        if ((b[5] === bars[0][5]) !== (s1 >= s0)) fail('geo', key, `bar ${i + 1} is the wrong colour`);
      });
      const sl = svg.match(/data-k="sum" x1="([\d.-]+)"/);
      if (!!sl !== conv) fail('geo', key, 'the gold sum line belongs on a converging series only');
      if (sl && Math.abs(+sl[1] - X(T)) > 0.02) fail('geo', key, 'the gold line is not at the endless sum');
      G.touched = true;
      const meant = { half: si === 0 && Math.abs(gap) <= 0.01, third: si === 1 && Math.abs(gap) <= 0.01, under: si === 2 && gap > 1e-12, run: si === 3 && Sm > 1000 };
      for (const gl of G.GOALS) {
        if (!!gl.ok(G) !== meant[gl.id]) fail('geo', key, `goal ${gl.id} is ${gl.ok(G) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(G)) found[gl.id] = found[gl.id] || key;
      }
    }
  });
  for (const g of G.GOALS) if (!found[g.id]) fail('geo', g.id, 'this goal cannot be found');
  G.si = 0; G.n = G.START; G.touched = false; G.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The Gram–Schmidt workshop: every pair at every number of copies taken away.
   w = u₂ − c·u₁ and w · u₁ are worked here, each pair must have exactly one
   c on the stepper that leaves w perpendicular, and it must be the shadow
   (u₂ · u₁)/(u₁ · u₁) and give the shortest w, as the readout claims. The
   drawing puts every arrow at its value inside the picture, the dashed copy
   of w must run from c·u₁'s tip to u₂'s, and every sentence and goal is
   rebuilt here. */
const gramNotes = (() => {
  const G = Gram;
  const num = v => { const q = Math.round(v * 1e4) / 1e4; const z = Object.is(q, -0) ? 0 : q; return z < 0 ? '−' + Math.abs(z) : String(z); };
  const V = p => `⟨${num(p[0])}, ${num(p[1])}⟩`;
  const par = n => (n < 0 ? `(${num(n)})` : num(n));
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  if (G.SETS.map(S => S.id).join() !== 'tilt,half,none') fail('gram', 'sets', G.SETS.map(S => S.id).join());
  G.touched = false; G.si = 0; G.k = G.START;
  for (const g of G.GOALS) if (g.ok(G)) fail('gram', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  G.SETS.forEach((S, si) => {
    const u = S.u1, u2 = S.u2, nn = u[0] * u[0] + u[1] * u[1], dp = u2[0] * u[0] + u2[1] * u[1], best = dp / nn;
    const W = c => [u2[0] - c * u[0], u2[1] - c * u[1]];
    const perp = G.C.filter(c => near(W(c)[0] * u[0] + W(c)[1] * u[1], 0));
    if (perp.length !== 1 || !near(perp[0], best)) fail('gram', S.id, `perpendicular at c = ${perp.join(', ') || 'none'}, the shadow is ${best}`);
    if (S.id === 'half' && Number.isInteger(best)) fail('gram', S.id, 'the half pair must need a fraction of a copy');
    if (S.id === 'none' && dp !== 0) fail('gram', S.id, 'the square pair must start at right angles');
    if (S.id !== 'none' && dp === 0) fail('gram', S.id, 'this pair must lean on u₁');
    const Lb = Math.hypot(...W(best));
    if (G.C.some(c => !near(c, best) && Math.hypot(...W(c)) <= Lb)) fail('gram', S.id, 'the perpendicular w is not the shortest');
    G.si = si;
    G.C.forEach((c, k) => {
      G.k = k; n++;
      const key = `${S.id} c=${c}`, w = W(c), d = w[0] * u[0] + w[1] * u[1];
      if (!near(G.w()[0], w[0]) || !near(G.w()[1], w[1]) || !near(G.dot(), d)) fail('gram', key, `w reads ${G.w()}, w · u₁ ${G.dot()}; worked here ${w}, ${d}`);
      const L = Math.hypot(w[0], w[1]), sq = w[0] * w[0] + w[1] * w[1];
      const want = [
        `u₁ = ${V(u)} is fixed. Take c copies of it away from u₂ = ${V(u2)}, and what is left is w = u₂ − c·u₁.`,
        `With c = ${num(c)}: w = ${V(u2)} − ${par(c)} × ${V(u)} = ${V(w)}.`,
        `w · u₁ = ${par(w[0])} × ${par(u[0])} + ${par(w[1])} × ${par(u[1])} = ${num(d)}` +
          (d > 1e-9 ? `: more than 0, so w still leans along u₁. Each extra copy taken away lowers w · u₁ by u₁ · u₁ = ${nn}.`
           : d < -1e-9 ? `: less than 0, so too much is taken away and w leans back against u₁. Each copy put back raises w · u₁ by u₁ · u₁ = ${nn}.`
           : ': w is perpendicular to u₁.'),
        `|w| = √${num(sq)} ${near(Math.round(L * 1e4) / 1e4, L) ? '=' : '≈'} ${num(L)}` + (near(d, 0) ? ', the shortest w can be: any other c leaves some of u₁ behind in it.' : '.')
      ];
      if (near(d, 0)) want.push(dp === 0
        ? 'u₂ · u₁ = 0 from the start, so u₂ casts no shadow on u₁ and there is nothing to take away: Gram–Schmidt leaves a pair that is already at right angles alone.'
        : `That c is exactly (u₂ · u₁)/(u₁ · u₁) = ${dp}/${nn} = ${num(best)}, the length of u₂'s shadow on u₁ in copies of u₁. Taking that shadow away is the one step of Gram–Schmidt.`);
      const got = G.working();
      if (got.length !== want.length) fail('gram', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('gram', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: every arrow at its value to one scale, inside the picture
      const svg = G.svg();
      const seg = role => { const m = svg.match(new RegExp(`data-k="${role}" x1="([\\d.-]+)" y1="([\\d.-]+)" x2="([\\d.-]+)" y2="([\\d.-]+)"`)); return m && m.slice(1).map(Number); };
      const at = (sg, a, b) => sg && Math.abs(sg[0] - (180 + a[0] * 15)) < 0.02 && Math.abs(sg[1] - (105 - a[1] * 15)) < 0.02 &&
        Math.abs(sg[2] - (180 + b[0] * 15)) < 0.02 && Math.abs(sg[3] - (105 - b[1] * 15)) < 0.02;
      const cu = [c * u[0], c * u[1]];
      if (!at(seg('u1'), [0, 0], u)) fail('gram', key, 'u₁ is not drawn at its value');
      if (!at(seg('u2'), [0, 0], u2)) fail('gram', key, 'u₂ is not drawn at its value');
      if (!at(seg('w'), [0, 0], w)) fail('gram', key, 'w is not drawn at its value');
      if (c === 0) { if (seg('cu') || seg('wcopy')) fail('gram', key, 'nothing is taken away at c = 0, so no dashed arrows belong'); }
      else {
        if (!at(seg('cu'), [0, 0], cu)) fail('gram', key, 'the dashed c·u₁ is not drawn at its value');
        if (!at(seg('wcopy'), cu, u2)) fail('gram', key, 'the dashed copy of w does not run from c·u₁ to u₂');
      }
      for (const m of svg.matchAll(/(?:x[12]|cx)="([\d.-]+)"/g)) if (+m[1] < 0 || +m[1] > 360) fail('gram', key, 'an arrow runs out of the picture');
      for (const m of svg.matchAll(/(?:y[12]|cy)="([\d.-]+)"/g)) if (+m[1] < 0 || +m[1] > 200) fail('gram', key, 'an arrow runs out of the picture');
      G.touched = true;
      const meant = { tilt: si === 0 && near(d, 0), half: si === 1 && near(d, 0), over: d < -1e-9, none: si === 2 && c === 0 && near(d, 0) };
      for (const gl of G.GOALS) {
        if (!!gl.ok(G) !== meant[gl.id]) fail('gram', key, `goal ${gl.id} is ${gl.ok(G) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(G)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of G.GOALS) if (!found[g.id]) fail('gram', g.id, 'this goal cannot be found');
  G.si = 0; G.k = G.START; G.touched = false; G.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The null space workshop: every matrix at every arrow the steppers allow.
   Av is worked here row by row, the crushed arrows are found by brute force
   and must be exactly the multiples of one arrow on a flat or steep matrix and
   only ⟨0, 0⟩ on the full-rank one, every Av of a rank-1 matrix must lie on
   the line the readout names, the drawing puts both arrows at their own
   values, and every sentence and goal is rebuilt here. */
const kernelNotes = (() => {
  const K = Kernel;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const V = p => `⟨${neg(p[0])}, ${neg(p[1])}⟩`;
  const par = n => (n < 0 ? `(${neg(n)})` : String(n));
  if (K.SETS.map(S => S.id).join() !== 'flat,steep,full') fail('null space', 'sets', K.SETS.map(S => S.id).join());
  K.touched = false; K.si = 0; K.x = 1; K.y = 1; K.seen.forEach(z => z.clear());
  for (const g of K.GOALS) if (g.ok(K)) fail('null space', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  K.SETS.forEach((S, si) => {
    const A = S.A, D = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const Av = (x, y) => [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y];
    const crushed = [];
    let big = 0;
    for (let x = K.LO; x <= K.HI; x++) for (let y = K.LO; y <= K.HI; y++) big = Math.max(big, ...Av(x, y).map(Math.abs));
    for (let x = K.LO; x <= K.HI; x++) for (let y = K.LO; y <= K.HI; y++) { const p = Av(x, y); if (!p[0] && !p[1] && (x || y)) crushed.push([x, y]); }
    if (S.id === 'full') { if (D === 0 || crushed.length) fail('null space', S.id, 'the full-rank matrix must crush only ⟨0, 0⟩'); }
    else {
      if (D !== 0) fail('null space', S.id, `det ${D}: a flat or steep matrix must be singular`);
      if (crushed.length < 2) fail('null space', S.id, `only ${crushed.length} crushed arrows within reach; the line goal needs two`);
      else if (crushed.some(([x, y]) => x * crushed[0][1] - y * crushed[0][0] !== 0)) fail('null space', S.id, 'the crushed arrows do not lie on one line');
      const k = A[1][0] / A[0][0];
      if (A[1][1] !== k * A[0][1]) fail('null space', S.id, 'the second row is not a multiple of the first');
    }
    K.si = si; K.seen[si].clear();
    let seen = new Set();
    for (let x = K.LO; x <= K.HI; x++) for (let y = K.LO; y <= K.HI; y++) {
      K.x = x; K.y = y; K.look(); n++;
      const key = `${S.id} v=⟨${x}, ${y}⟩`, p = Av(x, y), zero = !p[0] && !p[1];
      if (K.av()[0] !== p[0] || K.av()[1] !== p[1]) fail('null space', key, `Av reads ${K.av()}, worked here ${p}`);
      if (zero && (x || y)) seen.add(x + ',' + y);
      const want = [
        `A has rows ${V(A[0])} and ${V(A[1])}, and v = ${V([x, y])}.`,
        `Av dots each row with v: ${V(A[0])} · v = ${neg(A[0][0])} × ${par(x)} + ${par(A[0][1])} × ${par(y)} = ${neg(p[0])}, and ${V(A[1])} · v = ${neg(A[1][0])} × ${par(x)} + ${par(A[1][1])} × ${par(y)} = ${neg(p[1])}. So Av = ${V(p)}.`,
        !x && !y ? 'v = ⟨0, 0⟩ lands on ⟨0, 0⟩ for every matrix, so it says nothing about this one: every null space holds it.'
          : zero ? `Av = ⟨0, 0⟩ and v is not ⟨0, 0⟩, so v is in the null space. Every multiple of v is crushed too, so the null space is the whole line through ${V([x, y])}.`
          : 'Av is not ⟨0, 0⟩, so v is not in the null space: to be crushed, v must dot to 0 with both rows.'
      ];
      if (D === 0) {
        const k = A[1][0] / A[0][0];
        if (p[1] !== k * p[0]) fail('null space', key, `Av = ${V(p)} is off the line through ⟨1, ${k}⟩`);
        want.push(`The second row is ${neg(k)} times the first, so Av's second entry is always ${neg(k)} times its first: every Av lands on the gold line through ⟨1, ${neg(k)}⟩. That line is the column space, so the rank is 1.`,
          'Rank 1 + nullity 1 = 2 columns: one direction survives onto the gold line, and the other, the null space, is crushed to ⟨0, 0⟩.');
      } else {
        want.push(`det A = ${neg(A[0][0])} × ${par(A[1][1])} − ${par(A[0][1])} × ${par(A[1][0])} = ${neg(D)}, not 0, so the rows point different ways and Av can land anywhere in the plane: the rank is 2.`,
          'Only ⟨0, 0⟩ is crushed, so the nullity is 0: rank 2 + nullity 0 = 2 columns, and A has an inverse.');
      }
      const got = K.working();
      if (got.length !== want.length) fail('null space', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('null space', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: each arrow's tip at its own value, the lines only where they belong
      const svg = K.svg();
      const tip = role => { const m = svg.match(new RegExp(`data-k="${role}" x1="([\\d.]+)" y1="([\\d.]+)" x2="([\\d.]+)" y2="([\\d.]+)"`)); return m && m.slice(1).map(Number); };
      const tv = tip('v'), ta = tip('av');
      if (!tv || Math.abs((tv[2] - tv[0]) * y - (tv[1] - tv[3]) * x) > 0.05 || Math.abs(Math.hypot(tv[2] - tv[0], tv[3] - tv[1]) - Math.hypot(x, y) * 80 / (K.HI + 0.5)) > 0.05) fail('null space', key, 'v is not drawn at its value');
      if (!ta || Math.abs((ta[2] - ta[0]) * p[1] - (ta[1] - ta[3]) * p[0]) > 0.02 * Math.hypot(p[0], p[1]) || Math.max(Math.abs(ta[2] - ta[0]), Math.abs(ta[3] - ta[1])) > 85) fail('null space', key, 'Av is not drawn at its value, or runs out of its panel');
      if (ta && Math.abs(Math.hypot(ta[2] - ta[0], ta[3] - ta[1]) - Math.hypot(p[0], p[1]) * 80 / big) > 0.05) fail('null space', key, 'Av is not drawn to the matrix\'s own scale');
      if (!!tip('col') !== (D === 0)) fail('null space', key, 'the gold column-space line belongs on a rank-1 matrix only');
      if (!!tip('null') !== (D === 0 && seen.size > 0)) fail('null space', key, 'the red null-space line belongs only once a crushed arrow is found');
      const cl = tip('null');
      if (cl && crushed.length && Math.abs((cl[2] - cl[0]) * crushed[0][1] - (cl[1] - cl[3]) * crushed[0][0]) > 0.05) fail('null space', key, 'the red line is not the null space');
      const meant = { zero: !x && !y, flat: si === 0 && zero && !!(x || y), steep: si === 1 && zero && !!(x || y), line: seen.size >= 2, reach: si === 2 && p[0] === 1 && p[1] === 0 };
      for (const gl of K.GOALS) {
        if (!!gl.ok(K) !== meant[gl.id]) fail('null space', key, `goal ${gl.id} is ${gl.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(K)) found[gl.id] = found[gl.id] || key;
      }
    }
  });
  for (const g of K.GOALS) if (!found[g.id]) fail('null space', g.id, 'this goal cannot be found');
  K.si = 0; K.x = 1; K.y = 1; K.touched = false; K.done.clear(); K.seen.forEach(z => z.clear());
  return { n, goals: Object.keys(found).length };
})();

/* The product rule workshop: every field and every step. Each width and depth
   is worked here from its own formula, the strips and the corner from those,
   and they must add up to the new area exactly. The rule's rate is checked
   against a nudge of f × g, the gap must shrink as h closes in, f′ × g′ must
   stay well away from the true rate, the drawing must be to scale, and every
   sentence and goal is rebuilt here. */
const productNotes = (() => {
  const K = Product;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const show = (v, d = 4) => { const p = 10 ** d, r = Math.round(v * p) / p; return neg(Object.is(r, -0) ? 0 : r); };
  const sure = (v, d) => Math.abs(Math.round(v * 10 ** d) / 10 ** d - v) < 1e-10;
  const F = { lin: x => x + 1, sq: x => x, mix: x => x * x };
  const G = { lin: x => 2 * x + 1, sq: x => x, mix: x => x + 1 };
  if (K.SETS.map(S => S.id).join() !== 'lin,sq,mix') fail('product', 'sets', K.SETS.map(S => S.id).join());
  if (K.H.some(h => !(h > 0)) || K.H.some((h, i) => i && h >= K.H[i - 1])) fail('product', 'steps', 'h must be positive and shrink step by step');
  if (K.H[K.START] !== Math.max(...K.H)) fail('product', 'start', `h starts at ${K.H[K.START]}, not at its widest`);
  K.touched = false; K.si = 0; K.k = K.START;
  for (const g of K.GOALS) if (g.ok(K)) fail('product', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  K.SETS.forEach((S, si) => {
    const f = F[S.id], g = G[S.id], a = S.a, fa = f(a), ga = g(a);
    for (const x of [a - 0.6, a + 0.2, a + 1.3])
      if (Math.abs(S.f(x) - f(x)) > 1e-12 || Math.abs(S.g(x) - g(x)) > 1e-12) fail('product', S.id, `f or g disagrees with ${S.fs} and ${S.gs} at x = ${x}`);
    const d = Fn => (Fn(a + 1e-6) - Fn(a - 1e-6)) / 2e-6;
    if (Math.abs(d(f) - S.fp) > 1e-6 || Math.abs(d(g) - S.gp) > 1e-6) fail('product', S.id, `the slopes at x = ${a} are ${d(f)} and ${d(g)}, the readout says ${S.fp} and ${S.gp}`);
    const R = S.fp * ga + fa * S.gp;
    if (Math.abs(d(x => f(x) * g(x)) - R) > 1e-5) fail('product', S.id, `a nudge of f × g grows at ${d(x => f(x) * g(x))}, the readout says ${R}`);
    if (Math.abs(S.fp * S.gp - R) < 1) fail('product', S.id, "f′ × g′ is too close to the true rate to show it wrong");
    let last = Infinity;
    K.H.forEach((h, k) => {
      K.si = si; K.k = k; n++;
      const key = `${S.id} h=${h}`, x = a + h, df = f(x) - fa, dg = g(x) - ga;
      const s1 = df * ga, s2 = fa * dg, c = df * dg, rate = (s1 + s2 + c) / h;
      if (Math.abs(fa * ga + s1 + s2 + c - f(x) * g(x)) > 1e-9) fail('product', key, 'the old field, the strips and the corner do not make the new field');
      if (Math.abs(K.rate() - rate) > 1e-9 || Math.abs(K.corner() - c) > 1e-12) fail('product', key, `the rate is ${K.rate()}, expected ${rate}`);
      const gap = Math.round(Math.abs(rate - R) * 1e4) / 1e4;
      if (K.gap() !== gap) fail('product', key, `the gap is ${K.gap()}, expected ${gap}`);
      if (gap > last) fail('product', key, 'the rate moves away from f′g + fg′ as h closes in');
      last = gap;
      if (Math.abs(rate - S.fp * S.gp) < 0.9) fail('product', key, 'the rate is near f′ × g′');
      const is = (v, dd = 6) => `${sure(v, dd) ? '=' : '≈'} ${show(v, dd)}`;
      const P = S.fp * ga, Q = fa * S.gp;
      const ab = v => (sure(v, 4) ? '' : 'about ') + show(v);
      const want = [
        `The field is f(x) = ${S.fs} wide and g(x) = ${S.gs} deep, so its area is f × g. At x = ${a} it is ${show(fa)} × ${show(ga)} = ${show(fa * ga)}.`,
        `With h = ${show(h)}, x = ${a} + ${show(h)} = ${show(x)}: the width grows by Δf ${is(df)} and the depth by Δg ${is(dg)}.`,
        `So the area gains a side strip Δf × g ${is(s1)}, a top strip f × Δg ${is(s2)} and a corner Δf × Δg ${is(c)}, ${sure(s1 + s2 + c, 6) ? '' : 'about '}${show(s1 + s2 + c, 6)} in all.`,
        `Per unit of h, the side strip adds ${ab(s1 / h)}, the top strip ${ab(s2 / h)} and the corner ${ab(c / h)}, so the area grows at ${ab(rate)}.`,
        `As h shrinks, Δf/h heads for f′(${a}) = ${S.fpw} and Δg/h for g′(${a}) = ${S.gpw}. So the strips head for f′g = ${S.fp} × ${show(ga)} = ${show(P)} and fg′ = ${show(fa)} × ${S.gp} = ${show(Q)}, and the corner for 0: the area grows at f′g + fg′ = ${show(P)} + ${show(Q)} = ${show(R)}. That is the product rule.`,
        gap <= 0.01
          ? `${gap === 0 ? `To four places that is ${show(R)} itself` : `That is ${show(gap)} from ${show(R)}`}: the corner has all but vanished. Multiplying the slopes, f′ × g′ = ${show(S.fp * S.gp)}, only sizes that vanishing corner, which is why it is not the derivative.`
          : `That is ${show(gap)} from ${show(R)}: at this step the corner still counts. Bring h closer to 0.`
      ];
      const got = K.working();
      if (got.length !== want.length) fail('product', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('product', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      // the drawing: four rectangles, to one scale, inside the frame
      const rects = [...K.svg().matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
      if (rects.length !== 4) fail('product', key, `the drawing has ${rects.length} pieces, not 4`);
      else {
        const sc = rects[0][2] / fa, sizes = [[fa, ga], [df, ga], [fa, dg], [df, dg]];
        rects.forEach((r, i) => {
          if (Math.abs(r[2] - sizes[i][0] * sc) > 0.02 || Math.abs(r[3] - sizes[i][1] * sc) > 0.02) fail('product', key, `piece ${i + 1} is not drawn to scale`);
          if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > 360.01 || r[1] + r[3] > 200.01) fail('product', key, `piece ${i + 1} runs out of the frame`);
        });
        if (Math.abs(rects[1][0] - (rects[0][0] + rects[0][2])) > 0.02 || Math.abs(rects[2][1] + rects[2][3] - rects[0][1]) > 0.02) fail('product', key, 'the strips do not sit against the field');
        if (Math.abs(rects[3][0] - rects[1][0]) > 0.02 || Math.abs(rects[3][1] - rects[2][1]) > 0.02) fail('product', key, 'the corner is not where the two strips meet');
      }
      const meant = { lin: si === 0 && gap <= 0.01, sq: si === 1 && gap <= 0.01, mix: si === 2 && gap <= 0.01,
        corner: c > Math.min(s1, s2), even: Math.abs(s1 - s2) < 1e-9 };
      for (const gl of K.GOALS) {
        if (!!gl.ok(K) !== meant[gl.id]) fail('product', key, `goal ${gl.id} is ${gl.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(K)) found[gl.id] = found[gl.id] || key;
      }
    });
  });
  for (const g of K.GOALS) if (!found[g.id]) fail('product', g.id, 'this goal cannot be found');
  K.si = 0; K.k = K.START; K.touched = false; K.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* The L'Hôpital workshop: every ratio is checked against its own formula, the
   rule's answer against the slopes found by a nudge, the limit against the
   ratio very close to the point, and every sentence rebuilt here. On the 0/0
   ratios the gap must shrink as h closes in; on the one that is not 0/0 the
   ratio must head for the plain value and stay well away from the rule's. */
const hopitalNotes = (() => {
  const K = Hopital;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const show = (v, d = 4) => { const p = 10 ** d, r = Math.round(v * p) / p; return neg(Object.is(r, -0) ? 0 : r); };
  const sure = (v, d) => Math.abs(Math.round(v * 10 ** d) / 10 ** d - v) < 1e-12;
  const TOP = { sq: x => x * x - 1, cube: x => x ** 3 - 8, sin: Math.sin, trap: x => x * x + 2 };
  const BOT = { sq: x => x - 1, cube: x => x * x - 4, sin: x => x, trap: x => x + 1 };
  if (K.SETS.map(S => S.id).join() !== 'sq,cube,sin,trap') fail('hopital', 'sets', K.SETS.map(S => S.id).join());
  if (K.H.some(h => h === 0) || K.H.join() !== [...K.H].reverse().map(h => -h).join()) fail('hopital', 'steps', 'h must never be 0 and must step the same way on both sides');
  if (!(K.H[K.START] > 0.1)) fail('hopital', 'start', `h starts at ${K.H[K.START]}, which is already close`);
  K.touched = false; K.si = 0; K.k = K.START;
  for (const g of K.GOALS) if (g.ok(K)) fail('hopital', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {};
  K.SETS.forEach((S, si) => {
    const T = TOP[S.id], B = BOT[S.id], a = S.a, zero = S.id !== 'trap';
    for (const x of [a - 1.4, a - 0.7, a - 0.2, a + 0.3, a + 1.1])
      if (Math.abs(figEval(S.f, x) - T(x)) > 1e-12 || Math.abs(figEval(S.g, x) - B(x)) > 1e-12) fail('hopital', S.id, `the figure's curves disagree with ${S.top} and ${S.bot} at x = ${x}`);
    if (zero !== (T(a) === 0 && B(a) === 0)) fail('hopital', S.id, `top and bottom at x = ${a} are ${T(a)} and ${B(a)}`);
    const d = (F) => (F(a + 1e-6) - F(a - 1e-6)) / 2e-6;
    if (Math.abs(d(T) - S.fpa) > 1e-6 || Math.abs(d(B) - S.gpa) > 1e-6) fail('hopital', S.id, `the slopes at x = ${a} are ${d(T)} and ${d(B)}, the readout says ${S.fpa} and ${S.gpa}`);
    const L = zero ? S.fpa / S.gpa : T(a) / B(a);
    const near = T(a + 1e-7) / B(a + 1e-7);
    if (Math.abs(near - L) > 1e-5) fail('hopital', S.id, `very close to x = ${a} the ratio is ${near}, the readout heads for ${L}`);
    if (!zero && Math.abs(L - S.fpa / S.gpa) < 0.5) fail('hopital', S.id, "the rule's wrong answer is too close to the right one to catch");
    let lastGap = { neg: Infinity, pos: Infinity };
    const order = [...K.H.keys()].sort((i, j) => Math.abs(K.H[j]) - Math.abs(K.H[i]));
    for (const k of order) {
      K.si = si; K.k = k; n++;
      const h = K.H[k], x = a + h, X = show(x), f = T(x), g = B(x), r = f / g, key = `${S.id} h=${h}`;
      if (Math.abs(K.ratio() - r) > 1e-12) fail('hopital', key, `the ratio is ${K.ratio()}, the formula gives ${r}`);
      if (Math.abs(K.lim() - L) > 1e-12) fail('hopital', key, `the limit is ${K.lim()}, it should be ${L}`);
      const G = Math.round(Math.abs(r - L) * 1e4) / 1e4;
      if (K.gap() !== G) fail('hopital', key, `the gap is ${K.gap()}, expected ${G}`);
      const side = h < 0 ? 'neg' : 'pos';
      if (zero && G > lastGap[side]) fail('hopital', key, 'the ratio moves away from its limit as h closes in');
      lastGap[side] = G;
      if (!zero && Math.abs(h) <= 0.01 && Math.abs(r - S.fpa / S.gpa) < 0.9) fail('hopital', key, "the ratio is near the rule's wrong answer");
      const is = (v, dd) => `${sure(v, dd) ? '=' : '≈'} ${show(v, dd)}`;
      const want = zero ? [
        `Put x = ${a} into ${S.q} and you get 0/0: top and bottom are both 0 there, so the formula says nothing about where the ratio is heading.`,
        `Near x = ${a} each curve is almost its tangent line. The top's slope is f′(x) = ${S.dtop}, so f′(${a}) = ${S.fpaw}; the bottom's is g′(x) = ${S.dbot}, so g′(${a}) = ${S.gpaw}. So the ratio heads for f′(${a})/g′(${a}) = ${S.fpa}/${S.gpa} = ${show(L)}: that is L'Hôpital's rule.`
      ] : [
        `Put x = ${a} into ${S.q} and you get ${show(T(a))}/${show(B(a))} = ${show(L)}: not 0/0. Nothing is broken here, so the limit is just that value, ${show(L)}.`,
        `Differentiating anyway gives f′(${a})/g′(${a}) = ${S.fpa}/${S.gpa} = ${show(S.fpa / S.gpa)}, and that is wrong: L'Hôpital's rule is only for 0/0, where top and bottom both head to 0 together.`
      ];
      want.push(`With h = ${show(h)}, x = ${a} ${h < 0 ? '−' : '+'} ${show(Math.abs(h))} = ${X}: the top is f(${X}) ${is(f, 6)} and the bottom is g(${X}) ${is(g, 6)}, so their ratio is ${sure(r, 4) ? '' : 'about '}${show(r)}.`);
      if (!zero) want.push(`The ratio heads for ${show(L)}, the value at x = ${a}, not for ${show(S.fpa / S.gpa)}: it is ${show(G)} from ${show(L)} and ${show(Math.abs(r - S.fpa / S.gpa))} from ${show(S.fpa / S.gpa)}.`);
      else if (G <= 0.01) want.push(`${G === 0 ? `To four places that is ${show(L)} itself` : `That is ${show(G)} from ${show(L)}`}: this close to x = ${a}, top and bottom are as good as their tangents, so their ratio is all but the ratio of the slopes.`);
      else want.push(`That is ${show(G)} from ${show(L)}: this far from x = ${a} the curves bend away from their tangents. Bring h closer to 0.`);
      const got = K.working();
      if (got.length !== want.length) fail('hopital', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('hopital', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      const meant = { right: si === 0 && h > 0 && G <= 0.01, left: si === 0 && h < 0 && G <= 0.01, cube: si === 1 && G <= 0.01,
        sin: si === 2 && G <= 0.01, trap: si === 3 && Math.abs(h) <= 0.01 };
      for (const gl of K.GOALS) {
        if (!!gl.ok(K) !== meant[gl.id]) fail('hopital', key, `goal ${gl.id} is ${gl.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (gl.ok(K)) found[gl.id] = found[gl.id] || key;
      }
    }
  });
  for (const g of K.GOALS) if (!found[g.id]) fail('hopital', g.id, 'this goal cannot be found');
  K.si = 0; K.k = K.START; K.touched = false; K.done.clear();
  return { n, goals: Object.keys(found).length };
})();

/* Every state of the biggest build workshop: each build and every x. What
   each holds is worked here from its own lengths (two sides, or a base and a
   depth), its slope by a nudge either way, and the figure's polynomial is
   checked against both. The best x is the largest on the whole range, found
   here by trying every x; the box's other flat tangent is the least. Every
   line of the readout is checked exactly, each goal holds exactly where its
   sentence says, each can be found, and none is met where the workshop opens. */
const optimNotes = (() => {
  const K = Optim;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const show = x => { const r = Math.round(x * 100) / 100; return neg(Object.is(r, -0) ? 0 : r); };
  const HAND = {
    wall: { v: x => x * (40 - 2 * x), side: x => 40 - 2 * x },
    free: { v: x => x * (20 - x), side: x => 20 - x },
    box: { v: x => x * (12 - 2 * x) * (12 - 2 * x), side: x => 12 - 2 * x }
  };
  const slope = (f, x) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4;
  if (K.SETS.map(S => S.id).join() !== 'wall,free,box') fail('optim', 'sets', K.SETS.map(S => S.id).join());
  K.touched = false; K.si = 0; K.xh = K.SETS[0].start; K.pair = new Set();
  for (const g of K.GOALS) if (g.ok(K)) fail('optim', g.id, 'met where the workshop opens');
  let n = 0;
  const found = {}, at150 = [];
  K.SETS.forEach((S, si) => {
    const H = HAND[S.id], xs = [];
    for (let xh = S.lo; xh <= S.hi; xh++) xs.push(xh / 2);
    const top = Math.max(...xs.map(H.v)), bottom = Math.min(...xs.map(H.v));
    const flat = xs.filter(x => Math.abs(slope(H.v, x)) < 1e-6);
    if (S.best / 2 !== xs.find(x => H.v(x) === top)) fail('optim', S.id, `the best x is ${S.best / 2}, trying every x gives ${xs.find(x => H.v(x) === top)}`);
    if (xs.filter(x => H.v(x) === top).length !== 1) fail('optim', S.id, 'more than one x holds the most');
    if (S.start < S.lo || S.start > S.hi || S.start === S.best) fail('optim', S.id, `starts at x = ${S.start / 2}`);
    for (const x of xs) {
      K.si = si; K.xh = x * 2; K.pair = new Set(); n++;
      const key = `${S.id} x=${x}`, v = H.v(x), d = slope(H.v, x), X = show(x), u = S.unit, sq = S.sq, V = S.V;
      if (Math.abs(K.v() - v) > 1e-9) fail('optim', key, `holds ${K.v()}, its lengths give ${v}`);
      if (Math.abs(K.d() - d) > 1e-4) fail('optim', key, `the slope is ${K.d()}, a nudge gives ${d}`);
      if (Math.abs(figEval({ poly: S.poly }, x) - v) > 1e-9) fail('optim', key, `the figure's curve gives ${figEval({ poly: S.poly }, x)}`);
      if (S.id === 'box' && Math.abs(12 * (x - 2) * (x - 6) - K.d()) > 1e-9) fail('optim', key, 'V′ is not 12(x − 2)(x − 6)');
      const s2 = show(H.side(x));
      const want = [S.say,
        S.id === 'wall' ? `With width x, the side along the wall is 40 − 2x, so ${S.form}.`
          : S.id === 'free' ? `With one side x, the other is 20 − x, so ${S.form}.`
          : `With a cut x, the base is 12 − 2x across and the box is x deep, so ${S.form}.`,
        S.id === 'wall' ? `At x = ${X} ${u}: the side along the wall is 40 − 2·${X} = ${s2} ${u}, so A = ${X} × ${s2} = ${show(v)} ${sq}.`
          : S.id === 'free' ? `At x = ${X} ${u}: the other side is 20 − ${X} = ${s2} ${u}, so A = ${X} × ${s2} = ${show(v)} ${sq}.`
          : `At x = ${X} ${u}: the base is 12 − 2·${X} = ${s2} ${u} across, so V = ${X} × ${s2} × ${s2} = ${show(v)} ${sq}.`];
      const hold = t => `x = ${show(t)} holds ${show(H.v(t))} ${sq}`, L = x * 2 > S.lo, R = x * 2 < S.hi;
      want.push(L && R ? `Half a ${S.uw} either way: ${hold(x - 0.5)} and ${hold(x + 0.5)}.` : L ? `Half a ${S.uw} less: ${hold(x - 0.5)}.` : `Half a ${S.uw} more: ${hold(x + 0.5)}.`);
      const grow = S.id === 'box' ? 'a deeper cut' : 'widening it', D = `${V}′(${X})`, dd = Math.round(d * 1e6) / 1e6;
      if (dd > 0) want.push(`${S.dform}, so ${D} = ${show(dd)}, above 0: ${grow} still adds ${S.what}, about ${show(dd)} ${sq} for each ${S.uw}.`);
      else if (dd < 0) want.push(`${S.dform}, so ${D} = ${show(dd)}, below 0: ${grow} now loses ${S.what}, about ${show(-dd)} ${sq} for each ${S.uw}, so the best is ${S.id === 'box' ? 'a shallower cut' : 'narrower'}.`);
      else if (v === top) {
        if (!(slope(H.v, x - 0.25) > 0 && slope(H.v, x + 0.25) < 0)) fail('optim', key, 'the slope does not go from above 0 to below 0 here');
        want.push(`${S.dform}, so ${D} = 0: the tangent is flat. ${V}′ is above 0 just left of ${X} and below 0 just right of it, so ${V} climbs to here and falls after: ${show(v)} ${sq} is the most it can hold.` +
          (S.id === 'free' ? ` The best paddock is ${X} by ${s2}: a square.` : S.id === 'box' ? ` That is a box ${s2} by ${s2} and ${X} deep.` : ''));
      } else {
        if (v !== bottom || !(slope(H.v, x - 0.25) < 0)) fail('optim', key, 'this flat tangent is not the least');
        want.push(`${S.dform}, so ${D} = 0: the tangent is flat here too, but ${V} = ${show(v)}: the cuts meet in the middle and there is no base left. ${V}′ is below 0 just left of ${X}, so ${V} falls to here: this flat tangent marks the least, not the most.`);
      }
      if (S.id === 'wall' && v === 150) {
        at150.push(x);
        want.push(`150 m² is three quarters of the best, 200 m². The curve is the same on both sides of its peak at 10, so one more width holds 150 m² too.`);
      }
      const got = K.working();
      if (got.length !== want.length) fail('optim', key, `${got.length} lines, expected ${want.length}`);
      want.forEach((l, i) => { if (got[i] !== l) fail('optim', key, `line ${i + 1} reads: ${got[i]}\n      expected: ${l}`); });
      const meant = { best: si === 0 && v === top, falls: si === 0 && d < -1e-6, pair: false,
        square: si === 1 && v === top && x === 20 - x, box: si === 2 && v === top,
        trap: si === 2 && Math.abs(d) < 1e-6 && v !== top };
      for (const g of K.GOALS) {
        if (!!g.ok(K) !== meant[g.id]) fail('optim', key, `goal ${g.id} is ${g.ok(K) ? 'met' : 'not met'}, its sentence says otherwise`);
        if (g.ok(K)) found[g.id] = found[g.id] || key;
      }
    }
    if (S.id === 'box' && flat.join() !== '2,6') fail('optim', S.id, `flat tangents at ${flat}`);
    if (S.id !== 'box' && flat.join() !== String(S.best / 2)) fail('optim', S.id, `flat tangents at ${flat}`);
  });
  if (at150.join() !== '5,15') fail('optim', 'pair', `150 m² at ${at150}`);
  const P = K.GOALS.find(g => g.id === 'pair');
  K.si = 0; K.pair = new Set([10]);
  if (P.ok(K)) fail('optim', 'pair', 'met after one width');
  K.pair.add(30);
  if (!P.ok(K)) fail('optim', 'pair', 'not met after both widths');
  K.si = 1;
  if (P.ok(K)) fail('optim', 'pair', 'met on the open paddock');
  found.pair = 'wall, x = 5 and x = 15';
  for (const g of K.GOALS) if (!found[g.id]) fail('optim', g.id, 'this goal cannot be found');
  K.si = 0; K.xh = K.SETS[0].start; K.touched = false; K.pair = new Set(); K.done.clear();
  return { n, goals: Object.keys(found).length };
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

/* Every step of every walk in the downhill workshop, at each step size, from
   the start until the walk reaches the bottom or is stopped. f and ∇f are
   worked here from the formula, every number in the readout is checked
   against the ones before it, and the next point it prints must be where
   the walk then goes. What the last step did (downhill, a zigzag across the
   floor, or uphill) is judged here from f before and after and from which
   side of the floor each point lies. Each goal must be findable, and none
   met where the workshop opens. */
const descentNotes = (() => {
  const D = Descent, neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = t => +String(t).replace(/[()]/g, '').replace(/−/g, '-');
  const F = ([x, y]) => (x - 1) ** 2 + 2 * (y + 1) ** 2;
  const N = '(\\(?−?[\\d.]+\\)?)', bracketed = (raw, v) => /\(/.test(raw) === (v < 0);
  let n = 0, ups = {}, zigs = {};
  const found = {};
  for (let ei = 0; ei < D.ETAS.length; ei++) {
    D.ei = ei; D.path = [D.START.slice()];
    const eta = D.ETAS[ei];
    for (let k = 0; k <= D.MAXSTEPS; k++) {
      const key = `η=${eta} step ${k}`, q = D.path[D.path.length - 1], W = D.working(); n++;
      // f
      let m = new RegExp(`^At p = \\(${N}, ${N}\\), f = \\(${N} − 1\\)² \\+ 2\\(${N} \\+ 1\\)² = ${N}² \\+ 2·${N}² (=|≈) ([\\d.]+)\\.$`).exec(W[0]);
      if (!m) { fail('descent', key, `the first line reads: ${W[0]}`); break; }
      const [x, y] = [num(m[1]), num(m[2])];
      if (x !== q[0] || y !== q[1] || num(m[3]) !== x || num(m[4]) !== y) fail('descent', key, 'p is printed as somewhere else');
      const dx = num(m[5]), dy = num(m[6]);
      if (Math.abs(dx - (x - 1)) > 1e-9 || Math.abs(dy - (y + 1)) > 1e-9) fail('descent', key, `x − 1 or y + 1 is wrong: ${W[0]}`);
      if (!bracketed(m[5], dx) || !bracketed(m[6], dy)) fail('descent', key, 'a negative is not bracketed');
      const f = F(q), shown = +m[8];
      if (m[7] === '=' ? Math.abs(shown - f) > 1e-9 : Math.abs(shown - f) > 5e-5 + 1e-12 || Math.abs(shown - f) < 1e-12)
        fail('descent', key, `f is printed as ${m[7]} ${shown}, it is ${f}`);
      // the gradient
      m = new RegExp(`^∇f = ⟨2\\(x − 1\\), 4\\(y \\+ 1\\)⟩ = ⟨2·${N}, 4·${N}⟩ = ⟨(−?[\\d.]+), (−?[\\d.]+)⟩(: the way straight uphill)?\\.$`).exec(W[1]);
      if (!m) { fail('descent', key, `the gradient reads: ${W[1]}`); break; }
      const gx = num(m[3]), gy = num(m[4]);
      if (!m[5] !== (x === 1 && y === -1)) fail('descent', key, `∇f is called the way uphill where it is not, or not where it is: ${W[1]}`);
      if (num(m[1]) !== dx || num(m[2]) !== dy || Math.abs(gx - 2 * (x - 1)) > 1e-9 || Math.abs(gy - 4 * (y + 1)) > 1e-9)
        fail('descent', key, `∇f is not ⟨2(x − 1), 4(y + 1)⟩: ${W[1]}`);
      // the step, or why there is none
      const bottom = x === 1 && y === -1;
      if (bottom) {
        if (!/^Nothing is uphill, so this is the bottom of the valley/.test(W[2]) || gx !== 0 || gy !== 0) fail('descent', key, 'at the bottom it does not say so');
      } else if (k === D.MAXSTEPS || f > D.MAXF) {
        if (!/press Start again/.test(W[2])) fail('descent', key, 'a walk that has gone far enough is not stopped');
      } else {
        m = new RegExp(`^A step of η = ${eta} goes the other way: p − η∇f = \\(${N} − ${eta}·${N}, ${N} − ${eta}·${N}\\) (=|≈) \\(${N} ([+−]) ([\\d.]+), ${N} ([+−]) ([\\d.]+)\\) = \\(${N}, ${N}\\)\\.$`).exec(W[2]);
        if (!m) { fail('descent', key, `the step reads: ${W[2]}`); break; }
        const s0 = (m[7] === '−' ? 1 : -1) * +m[8], s1 = (m[10] === '−' ? 1 : -1) * +m[11];
        const exact = Math.abs(eta * gx - s0) < 1e-12 && Math.abs(eta * gy - s1) < 1e-12;
        if (num(m[2]) !== gx || num(m[4]) !== gy || num(m[1]) !== x || num(m[3]) !== y || num(m[6]) !== x || num(m[9]) !== y)
          fail('descent', key, `the step does not start from p and ∇f: ${W[2]}`);
        if (Math.abs(s0 - eta * gx) > 5e-5 + 1e-12 || Math.abs(s1 - eta * gy) > 5e-5 + 1e-12) fail('descent', key, `η∇f is printed wrongly: ${W[2]}`);
        if ((m[5] === '=') !== exact) fail('descent', key, `an exact step is marked ≈, or a rounded one =: ${W[2]}`);
        const nx = num(m[12]), ny = num(m[13]);
        if (Math.abs(nx - (x - s0)) > 1e-9 || Math.abs(ny - (y - s1)) > 1e-9) fail('descent', key, `the subtraction is wrong: ${W[2]}`);
        const nxt = D.next().p;
        if (nxt[0] !== nx || nxt[1] !== ny) fail('descent', key, 'the walk does not go where the readout says');
      }
      // what the last step did
      if (k === 0) { if (!/^Press Step downhill/.test(W[3])) fail('descent', key, 'a walk not started says otherwise'); }
      else {
        const pq = D.path[D.path.length - 2], fa = F(pq), fb = f;
        const cross = (pq[0] - 1) * (x - 1) < 0 || (pq[1] + 1) * (y + 1) < 0;
        const kind = fb > fa ? 'up' : cross ? 'zig' : 'down';
        const say = { up: /^That step went uphill: f rose from /, zig: /^That step jumped across the valley floor, so the walk zigzags, but f still fell from /, down: /^That step took f from .* down to / }[kind];
        if (!say.test(W[3])) fail('descent', key, `the last step was ${kind}, but it reads: ${W[3]}`);
        const vals = (W[3].match(/from (\S+) (?:down )?to (\S+?)\.(?:\s|$)/) || []).slice(1).map(Number);
        if (vals.length !== 2 || Math.abs(vals[0] - fa) > 5e-5 || Math.abs(vals[1] - fb) > 5e-5) fail('descent', key, `the f before and after are wrong: ${W[3]}`);
        if (kind === 'up') ups[eta] = true;
        if (kind === 'zig') zigs[eta] = true;
      }
      for (const g of D.GOALS) if (g.ok(D)) found[g.id] = true;
      if (bottom || k === D.MAXSTEPS || f > D.MAXF) break;
      D.path.push(D.next().p);
    }
  }
  if (!ups[0.55] || ups[0.1] || ups[0.25] || ups[0.4]) fail('descent', 'walks', 'only the biggest step size should ever climb');
  if (!zigs[0.4] || zigs[0.1] || zigs[0.25]) fail('descent', 'walks', 'only the larger step sizes should zigzag');
  for (const g of D.GOALS) if (!found[g.id]) fail('descent', g.id, 'this goal cannot be found');
  D.ei = 0; D.path = [D.START.slice()];
  if (D.GOALS.some(g => g.ok(D))) fail('descent', 'start', 'a goal is already met where the workshop opens');
  if (F(D.START) !== 17) fail('descent', 'start', 'the walk does not start at f = 17');
  return { n, goals: D.GOALS.length };
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
console.log(`  span workshop states       ${pad(spanNotes.n.toLocaleString(), 10)}  (a·u + b·v, the target, what the pair spans, ${spanNotes.goals} goals findable)`);
console.log(`  elimination states         ${pad(elimNotes.n.toLocaleString(), 10)}  (each row operation redone, worked, the crossing kept, ${elimNotes.goals} goals findable)`);
console.log(`  undo workshop states       ${pad(undoNotes.n.toLocaleString(), 10)}  (î and ĵ followed through A and B, the one inverse, ${undoNotes.goals} goals findable)`);
console.log(`  best fit states            ${pad(fitNotes.n.toLocaleString(), 10)}  (every miss and both totals worked, the one best line, ${fitNotes.goals} goals findable)`);
console.log(`  newton's method states     ${pad(newtonNotes.n.toLocaleString(), 10)}  (f, f′ and every guess worked, roots, flat tangents, loops, ${newtonNotes.goals} goals findable)`);
console.log(`  chain rule states          ${pad(chainNotes.n.toLocaleString(), 10)}  (y and dy/dx from y in full, the slip, the nudge, ${chainNotes.goals} goals findable)`);
console.log(`  two castles states         ${pad(castlesNotes.n.toLocaleString(), 10)}  (each night by the matrix, the steady split and the other eigenvalue, ${castlesNotes.goals} goals findable)`);
console.log(`  biggest build states       ${pad(optimNotes.n.toLocaleString(), 10)}  (what each holds from its lengths, the slope by a nudge, the best found by trying every x, ${optimNotes.goals} goals findable)`);
console.log(`  cistern states           ${pad(cisternNotes.n.toLocaleString(), 10)}  (each total against the area under the flow added up in strips, F′ = f by a nudge, every turn checked, ${cisternNotes.goals} goals findable)`);
console.log(`  l'hôpital states         ${pad(hopitalNotes.n.toLocaleString(), 10)}  (each ratio against its formula, the slopes by a nudge, the limit read right at the point, every gap shrinking, the rule caught wrong off 0/0, ${hopitalNotes.goals} goals findable)`);
console.log(`  product rule states      ${pad(productNotes.n.toLocaleString(), 10)}  (each field worked from its formulas, strips and corner adding to the new area, the rule against a nudge, every gap shrinking, f′ × g′ kept wrong, drawn to scale, ${productNotes.goals} goals findable)`);
console.log(`  ladder positions         ${pad(ladderNotes.n.toLocaleString(), 10)}  (each height by Pythagoras, the top's speed by a nudge in time, the length kept, the 0.01 s check rebuilt, the bars in the speeds' ratio, ${ladderNotes.goals} goals findable)`);
console.log(`  null space arrows        ${pad(kernelNotes.n.toLocaleString(), 10)}  (each Av worked row by row, the crushed arrows found by brute force and on one line, every rank-1 Av on its column space, both arrows drawn at their values, ${kernelNotes.goals} goals findable)`);
console.log(`  gram–schmidt steps       ${pad(gramNotes.n.toLocaleString(), 10)}  (w and w · u₁ worked at every c, one perpendicular c per pair and it is the shadow and the shortest w, every arrow drawn at its value, ${gramNotes.goals} goals findable)`);
console.log(`  geometric series sums   ${pad(geoNotes.n.toLocaleString(), 10)}  (every running total in exact fractions, the gap a·rⁿ/(1 − r) shrinking by r each term, the staircase bars from total to total, ${geoNotes.goals} goals findable)`);
console.log(`  bend points             ${pad(bendNotes.n.toLocaleString(), 10)}  (f′ and f″ from each curve's own coefficients, the slope either side moving as f″ says, the curve on the side of its tangent the readout names, the drawing read back, ${bendNotes.goals} goals findable)`);
console.log(`  water levels            ${pad(avgNotes.n.toLocaleString(), 10)}  (each area from the curve's own coefficients, the level against it in exact fractions, above and under the level by Simpson's rule, the shading read back, ${avgNotes.goals} goals findable)`);
console.log(`  endless areas           ${pad(tailNotes.n.toLocaleString(), 10)}  (each area by the power rule and again by Simpson's rule, each doubling's share against the last, the bars read back, ${tailNotes.goals} goals findable)`);
console.log(`  lathe cuts              ${pad(latheNotes.n.toLocaleString(), 10)}  (each solid's disks summed from its own f², the exact volume by antiderivative and by Simpson's rule, the disks read back, ${latheNotes.goals} goals findable)`);
console.log(`  swaps tried             ${pad(swapNotes.n.toLocaleString(), 10)}  (each du against a numerical derivative, each right u turning the integrand into g(u) du, the drawn answer rising by the area under the integrand, ${swapNotes.goals} goals findable)`);
console.log(`  implicit points         ${pad(implicitNotes.n.toLocaleString(), 10)}  (each on its curve, y′ against −Fx/Fy, each nudge solved outright, the tangent and radius measured, ${implicitNotes.goals} goals findable)`);
console.log(`  splits tried            ${pad(partsNotes.n.toLocaleString(), 10)}  (each u times dv giving back the integrand, du and v checked numerically, each answer and the integral it leaves checked by differentiating, the drawn answer rising by the area, ${partsNotes.goals} goals findable)`);
console.log(`  λ stepped               ${pad(detectNotes.n.toLocaleString(), 10)}  (det(A − λI) against the characteristic polynomial, each eigenvalue against the quadratic formula, each crushed arrow multiplied out, the trace and determinant checked, the curve measured, ${detectNotes.goals} goals findable)`);
console.log(`  headings faced          ${pad(hillNotes.n.toLocaleString(), 10)}  (∇f against numerical partials, each slope ∇f · û against a central difference, steepest, level and steepest down exactly along, across and against ∇f, every contour drawn on its level, ${hillNotes.goals} goals findable)`);
console.log(`  expansions tried        ${pad(cofNotes.n.toLocaleString(), 10)}  (det A by the rule of Sarrus against every row and column, each minor struck out afresh, each sign from the checkerboard, the grid read back, two lines tried agreeing, ${cofNotes.goals} goals findable)`);
console.log(`  fractions split         ${pad(coverNotes.n.toLocaleString(), 10)}  (the cleared identity at every x, the pieces adding back to f, the antiderivative differentiated back, every choice of kept equations, the drawing read back, ${coverNotes.goals} goals findable)`);
console.log(`  slices swept            ${pad(sliceNotes.n.toLocaleString(), 10)}  (each slice integrated afresh from f, the swept total added up again, both orders agreeing, the slice and S read as formulas, the drawing read back, ${sliceNotes.goals} goals findable)`);
console.log(`  slopes traced           ${pad(tracerNotes.n.toLocaleString(), 10)}  (each slope against the derivative worked by hand, the nudge's rise, every x label, every sentence, the dots and traced curve read back, ${tracerNotes.goals} goals findable)`);
console.log(`  hands-on links           ${pad(handsOnNotes.topics.toLocaleString(), 10)}  (topics a fight can point to a workshop for, across ${handsOnNotes.mods} workshops, each named as the Tome names it and opening)`);
console.log(`  downhill walk states       ${pad(descentNotes.n.toLocaleString(), 10)}  (f, ∇f, each step and what it did, ${descentNotes.goals} goals findable)`);
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
