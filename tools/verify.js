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
    ';const Arrow={' + script.slice(script.indexOf("  SETS:[\n    {id:'a', u:[3,4]"), script.indexOf("  render(){\n    document.getElementById('vwSets')")) + 'render(){}};exports.Arrow=Arrow;' +
    ';const Horizon={' + script.slice(script.indexOf("  SETS:[\n    {id:'eq', btn:'Equal powers'"), script.indexOf("  render(){\n    document.getElementById('hzSets')")) + 'render(){}};exports.Horizon=Horizon;' +
    ';const Cross={' + script.slice(script.indexOf("  SETS:[\n    {id:'floor', btn:'On the floor'"), script.indexOf("  tab:'hand',\n  setTab(t){ this.tab=t; this.render(); },\n  render(){\n    document.getElementById('crTab')")) + 'render(){}};exports.Cross=Cross;' +
    ';const Quot={' + script.slice(script.indexOf("  SETS:[\n    {id:'sq', btn:'x² over x + 1'"), script.indexOf("  render(){\n    document.getElementById('qoTab')")) + 'render(){}};exports.Quot=Quot;' +
    ';const Anti={' + script.slice(script.indexOf("  SETS:[\n    {id:'sq', btn:'6x²'"), script.indexOf("  render(){\n    document.getElementById('adTab')")) + 'render(){}};exports.Anti=Anti;' +
    ';const Transpose={' + script.slice(script.indexOf("  SETS:[\n    {id:'wide', btn:'Wide'"), script.indexOf("  tab:'hand',\n  setTab(t){ this.tab=t; this.render(); },\n  render(){\n    document.getElementById('tpTab')")) + 'render(){}};exports.Transpose=Transpose;' +
    ';const Diag={' + script.slice(script.indexOf("  SETS:[\n    {id:'sym', btn:'Symmetric'"), script.indexOf("  render(){\n    if(!this.c) this.start();")) + 'render(){}};exports.Diag=Diag;' +
    ';const TrigInt={' + script.slice(script.indexOf("  SETS:[\n    {id:'cos2', btn:'cos 2x'"), script.indexOf("  render(){\n    document.getElementById('itSets')")) + 'render(){}};exports.TrigInt=TrigInt;' +
    ';const TanPlane={' + script.slice(script.indexOf("  SETS:[\n    {id:'bowl', btn:'Bowl', name:'a bowl'"), script.indexOf("  render(){\n    document.getElementById('tqSets')")) + 'render(){}};exports.TanPlane=TanPlane;' +
    ';const InvSlope={' + script.slice(script.indexOf("  SETS:[\n    {id:'asin', btn:'arcsin', g:'arcsin'"), script.indexOf("  render(){\n    document.getElementById('ivSets')")) + 'render(){}};exports.InvSlope=InvSlope;' +
    ';const LogDiff={' + script.slice(script.indexOf("  E:Math.E,\n  SETS:[\n    {id:'xx'"), script.indexOf("  render(){\n    document.getElementById('lgSets')")) + 'render(){}};exports.LogDiff=LogDiff;' +
    ';const PathChain={' + script.slice(script.indexOf("  SETS:[\n    {id:'xy', btn:'z = xy'"), script.indexOf("  render(){\n    document.getElementById('pcSets')")) + 'render(){}};exports.PathChain=PathChain;' +
    ';const ExpInt={' + script.slice(script.indexOf("  SETS:[\n    {id:'two', btn:'e^(2x)'"), script.indexOf("  render(){\n    document.getElementById('xiSets')")) + 'render(){}};exports.ExpInt=ExpInt;' +
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
const { GEN, trailQ, buildQuestion, buildMote, mat, Figure, figEval, Build, Slip, Workshop, Slope, Area, Dot, Eigen, Taylor, Compose, Limit, Descent, Span, Elim, Undo, Fit, Newton, Chain, Castles, Optim, Cistern, Hopital, Product, Ladder, Kernel, Gram, Geo, Bend, Avg, Tail, Lathe, Swap, Implicit, Parts, Detect, Hill, Cofactor, Cover, Slice, Tracer, Arrow, Horizon, Cross, Quot, Anti, Transpose, Diag, TrigInt, TanPlane, InvSlope, LogDiff, PathChain, ExpInt } = loadGame();

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
    const card = html.match(new RegExp(`<h2 style="font-size:16px;color:var\\(--gold\\)">([^<]*)</h2>[\\s\\S]{0,520}?onclick="${mod}\\.open\\(\\)"`));
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

/* The workshop index at the top of the Tome: every workshop exactly once,
   under the strand of the topic it was built for and in that strand's order,
   opening the same module as its card further down, with a chip's colour read
   off mastery as the index's own rule says and decided again here. */
const wsIndexNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { s: null, eff: {} };
  const { I, FOR, STR } = new Function('env', 'const Game = { get s(){ return env.s; } }; const Mastery = { eff: k => env.eff[k] || 0 };' +
    cut('const STRANDS = [', '/* The hands-on workshop that shows') +
    cut('const WORKSHOP_FOR = (() => {', '/* ------------------------------- mastery') + 'return { I: WorkshopIndex, FOR: WORKSHOP_FOR, STR: STRANDS };')(env);
  const pos = {};
  STR.forEach(([, ks], si) => ks.forEach((k, i) => { pos[k] = [si, i]; }));
  /* the modules, each with the topics it was given in the order it lists them */
  const mods = {};
  for (const k of Object.keys(FOR)) (mods[FOR[k].mod] || (mods[FOR[k].mod] = { name: FOR[k].name, topics: [] })).topics.push(k);
  const cards = [...html.matchAll(/onclick="(\w+)\.open\(\)">Open [^<]*<\/button>/g)].map(m => m[1]);
  const gs = I.groups(), items = gs.flatMap(g => g.items);
  if (items.length !== Object.keys(mods).length) fail('wsindex', 'count', `${items.length} chips for ${Object.keys(mods).length} workshops`);
  const seen = new Set();
  for (const w of items) {
    if (seen.has(w.mod)) fail('wsindex', w.mod, 'listed twice');
    seen.add(w.mod);
    const m = mods[w.mod];
    if (!m) { fail('wsindex', w.mod, 'is not a workshop'); continue; }
    if (w.name !== m.name) fail('wsindex', w.mod, `named ${w.name}, not ${m.name}`);
    if (w.topics.join() !== m.topics.join()) fail('wsindex', w.mod, `covers ${w.topics}, not ${m.topics}`);
    const g = gs.find(G => G.items.includes(w));
    if (g.strand !== STR[pos[m.topics[0]][0]][0]) fail('wsindex', w.mod, `is under ${g.strand}, but ${m.topics[0]} is in ${STR[pos[m.topics[0]][0]][0]}`);
    const sp = m.name.indexOf(' ');
    if (w.title !== m.name.slice(sp + 1) || w.emoji !== m.name.slice(0, sp) || w.short !== m.name.slice(sp + 1).replace(/ Workshop$/, '')) fail('wsindex', w.mod, `shows ${w.emoji} ${w.short}`);
  }
  for (const c of cards) if (c !== 'Opening' && !seen.has(c) && mods[c]) fail('wsindex', c, 'has a Tome card but no chip');
  for (const c of Object.keys(mods)) if (!cards.includes(c)) fail('wsindex', c, 'has a chip but no Tome card');
  if (gs.map(g => g.strand).join('|') !== STR.filter(([, ks]) => items.some(w => ks.includes(w.topics[0]))).map(([s]) => s).join('|')) fail('wsindex', 'strands', 'not in the order the strands are declared');
  for (const g of gs) for (let i = 1; i < g.items.length; i++)
    if (pos[g.items[i - 1].topics[0]][1] > pos[g.items[i].topics[0]][1]) fail('wsindex', g.strand, `${g.items[i - 1].mod} comes before ${g.items[i].mod} against the strand's order`);
  /* states: no knight, an unseen topic, all solid, one slipped, on the edges */
  const two = items.find(w => w.topics.length === 2), [a, b] = two.topics;
  const set = (rec, eff) => { env.s = { topicStats: rec }; env.eff = eff; };
  const cases = [
    [null, {}, ''],
    [{}, {}, ''],
    [{ [a]: { seen: 3 } }, { [a]: 0.9 }, ''],
    [{ [a]: { seen: 3 }, [b]: { seen: 2 } }, { [a]: 0.9, [b]: 0.85 }, 'solid'],
    [{ [a]: { seen: 3 }, [b]: { seen: 2 } }, { [a]: 0.9, [b]: 0.84 }, ''],
    [{ [a]: { seen: 3 }, [b]: { seen: 2 } }, { [a]: 0.9, [b]: 0.59 }, 'weak'],
    [{ [a]: { seen: 3 } }, { [a]: 0.6 }, ''],
    [{ [a]: { seen: 0 }, [b]: { seen: 1 } }, { [a]: 0.9, [b]: 0.9 }, ''],
    [{ [a]: { seen: 1 } }, { [a]: 0.1 }, 'weak'],
  ];
  for (const [rec, eff, want] of cases) {
    if (rec === null) env.s = null; else set(rec, eff);
    const got = I.state(two);
    if (got !== want) fail('wsindex', `${two.mod} ${JSON.stringify(rec)} ${JSON.stringify(eff)}`, `state ${got || 'plain'}, not ${want || 'plain'}`);
    const c = I.chip(two);
    if ((want === 'solid') !== / ✓<\/button>$/.test(c) || !c.includes(`data-state="${want}"`) || (want && !c.includes(`wiChip ${want}"`))) fail('wsindex', two.mod, `the chip does not show ${want || 'plain'}: ${c}`);
    if ((want === 'solid') !== c.includes('every topic it covers solid') || (want === 'weak') !== c.includes('a topic it covers needs work')) fail('wsindex', two.mod, `the chip's name for a screen reader is wrong: ${c}`);
  }
  env.s = { topicStats: {} }; env.eff = {};
  const h = I.html();
  const chips = [...h.matchAll(/data-ws="(\w+)" data-state="" onclick="(\w+)\.open\(\)" aria-label="Open ([^"]+)">([^<]+)<\/button>/g)];
  if (chips.length !== items.length) fail('wsindex', 'html', `${chips.length} chips drawn for ${items.length} workshops`);
  for (const [, ws, op, label, text] of chips) {
    const m = mods[ws];
    if (op !== ws) fail('wsindex', ws, `its chip opens ${op}`);
    if (!m) continue;
    const sp = m.name.indexOf(' '), short = m.name.slice(sp + 1).replace(/ Workshop$/, '');
    if (text !== `${m.name.slice(0, sp)} ${short}`) fail('wsindex', ws, `its chip reads ${text}`);
    if (label !== m.name.slice(sp + 1)) fail('wsindex', ws, `its chip is named ${label}`);
  }
  if (!h.includes(`${items.length} hands-on workshops.`)) fail('wsindex', 'html', 'the count is wrong');
  if ((h.match(/class="wiStrand"/g) || []).length !== gs.length) fail('wsindex', 'html', 'a strand heading is missing');
  if (!/renderTome\(\)\{[\s\S]{0,700}?WorkshopIndex\.html\(\)/.test(script)) fail('wsindex', 'tome', 'the Tome does not show the index near its top');
  env.s = null;
  return { chips: items.length, strands: gs.length, cases: cases.length };
})();

/* Spot the eigenvector: the pick-an-arrow round in the eigenvector hunt. The
   matrix is checked to keep the arrow offered as right by multiplying it out
   here, and every other arrow to be knocked off its line by a visible angle;
   every button, drawing, sentence and tap is read back, over many seeded
   rounds. */
const eigSpotNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {axis:'#6b5f92', a:'#5aa9e6', b:'#f2c14e'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Eigen = {render(){ env.renders++; }};" +
    cut('const EigSpot = {', '/* ============ SPAN WORKSHOP ============') + 'return EigSpot;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const vec = w => `⟨${ng(w[0])}, ${ng(w[1])}⟩`;
  const Mv = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  const deg = (A, v) => { const w = Mv(A, v), c = Math.abs(cross(v, w)) / Math.hypot(...v) / Math.hypot(...w); return Math.asin(Math.min(1, c)) * 180 / Math.PI; };
  const pn = n => n < 0 ? '(' + ng(n) + ')' : String(n);
  const sum = (s, t) => `${ng(s)} ${t < 0 ? '−' : '+'} ${Math.abs(t)}`;
  const work = (A, v) => { const [[a, b], [c, d]] = A, [x, y] = v;
    return `A·${vec(v)} = ⟨${pn(a)}·${pn(x)} + ${pn(b)}·${pn(y)}, ${pn(c)}·${pn(x)} + ${pn(d)}·${pn(y)}⟩ = ⟨${sum(a * x, b * y)}, ${sum(c * x, d * y)}⟩ = ${vec(Mv(A, v))}.`; };
  const read = () => { const h = S.html(); return txt(h.split('id="esRead"')[1].replace(/^[^>]*>/, '')); };
  if (S.RULE !== 'An eigenvector stays on its own line: A may stretch it, shrink it or turn it right round, but never knock it off. Which arrow stays on its dotted line?') fail('eigspot', 'rule', 'the rule is not stated');
  if (S.round !== null || S.matched !== 0) fail('eigspot', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0;
  const lams = new Set(), slots = new Set();
  for (let seed = 1; seed <= 400; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, A = r.A, key = `seed ${seed} round ${k}`;
      rounds++;
      if (A.flat().some(v => !Number.isInteger(v) || Math.abs(v) > 4) || (A[0][1] === 0 && A[1][0] === 0)) fail('eigspot', key, `the matrix ${JSON.stringify(A)} is not a fair one`);
      if (prev && JSON.stringify(prev) === JSON.stringify(A)) fail('eigspot', key, 'the same matrix comes twice in a row');
      // its eigenvalues from the characteristic polynomial, worked here
      const t = A[0][0] + A[1][1], D = A[0][0] * A[1][1] - A[0][1] * A[1][0], disc = t * t - 4 * D;
      const ev = disc > 0 ? [(t - Math.sqrt(disc)) / 2, (t + Math.sqrt(disc)) / 2] : [];
      if (ev.length !== 2 || ev.some(l => !Number.isInteger(l) || l === 0)) fail('eigspot', key, `the eigenvalues ${ev} are not two whole numbers other than 0`);
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('eigspot', key, 'there is not one right arrow among four');
      const ri = r.opts.findIndex(o => o.k === 'right'), right = r.opts[ri];
      slots.add(ri); lams.add(right.lam);
      const Av = Mv(A, right.v);
      if (cross(right.v, Av) !== 0 || Av[0] !== right.lam * right.v[0] || Av[1] !== right.lam * right.v[1] || !ev.includes(right.lam)) fail('eigspot', key, `${vec(right.v)} is not kept with λ = ${right.lam}`);
      // every other arrow knocked off by a visible angle, each on its own line
      const lines = r.opts.map(o => o.v);
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (cross(lines[i], lines[j]) === 0) fail('eigspot', key, 'two arrows share a line');
      for (const o of r.opts) {
        if (o.v.some(c => Math.abs(c) > 2) || (!o.v[0] && !o.v[1])) fail('eigspot', key, `the arrow ${vec(o.v)} is out of range`);
        if (o.k !== 'right' && (cross(o.v, Mv(A, o.v)) === 0 || deg(A, o.v) < 12 - 1e-9)) fail('eigspot', key, `${vec(o.v)} is too close to its line to see`);
      }
      // the nearest miss there is, among all short arrows, is one of them
      let best = 90;
      for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) { const w = [x, y];
        if ((!x && !y) || (Math.abs(x) === 2 && Math.abs(y) === 2) || cross(w, Mv(A, w)) === 0) continue; const d = deg(A, w); if (d >= 12 - 1e-9 && d < best) best = d; }
      if (Math.abs(Math.min(...r.opts.filter(o => o.k !== 'right').map(o => deg(A, o.v))) - best) > 1e-6) fail('eigspot', key, 'the nearest miss is left out');
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ` A = ${ng(A[0][0])} ${ng(A[0][1])} ${ng(A[1][0])} ${ng(A[1][1])} Green: the arrow v and its dotted line. Gold: where A sends it.`)) fail('eigspot', key, 'the rule and the matrix are not shown first');
      if (!h0.includes(`role="img" aria-label="A has rows ${ng(A[0][0])}, ${ng(A[0][1])} and ${ng(A[1][0])}, ${ng(A[1][1])}"`)) fail('eigspot', key, 'the matrix is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="EigSpot\.choose\((\d)\)" aria-label="Arrow ([ABCD]): v = (⟨[^⟩]+⟩), sent to (⟨[^⟩]+⟩)(\. Not an eigenvector)?"[^>]*>\s*<svg[^>]*>([\s\S]*?)<\/svg><b>([ABCD])<\/b>/g)];
      if (btns.length !== 4 || btns.some((b, i) => b[1] !== 'ABCD'[i] || b[2] || +b[3] !== i || b[4] !== 'ABCD'[i] || b[9] !== 'ABCD'[i] || b[5] !== vec(r.opts[i].v) || b[6] !== vec(Mv(A, r.opts[i].v)) || b[7])) fail('eigspot', key, 'the four arrows are not offered as they are, A to D');
      // each panel: v in green, A·v in gold, both ending where they should, and v's line through both ends of the frame
      btns.forEach((b, i) => {
        const v = r.opts[i].v, w = Mv(A, v), ls = [...b[8].matchAll(/<line (data-k="line" )?x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="([^"]+)"/g)];
        const ends = ls.slice(2).map(l => ({ dot: !!l[1], x: +l[4] - 60, y: 50 - +l[5], col: l[6] }));
        const lineL = ends.find(e => e.dot), gold = ends.find(e => !e.dot && e.col === '#f2c14e'), green = ends.filter(e => !e.dot && e.col === '#57cc7a');
        if (!lineL || !gold || green.length !== 1) { fail('eigspot', key, `panel ${'ABCD'[i]} does not draw v, A·v and v's line`); return; }
        const along = (e, u) => Math.abs(e.x * u[1] - e.y * u[0]) <= 0.15 * Math.hypot(...u) && e.x * u[0] + e.y * u[1] > 0;
        if (!along(gold, w) || !along(green[0], v) || !along(lineL, v)) fail('eigspot', key, `panel ${'ABCD'[i]} points an arrow the wrong way`);
        const sc = gold.x ? gold.x / w[0] : gold.y / w[1], sv = green[0].x ? green[0].x / v[0] : green[0].y / v[1];
        if (Math.abs(sc - sv) > 0.2) fail('eigspot', key, `panel ${'ABCD'[i]} draws v and A·v to different scales`);
        if ([gold, green[0]].some(e => Math.abs(e.x) > 60 || Math.abs(e.y) > 50)) fail('eigspot', key, `panel ${'ABCD'[i]} runs off its frame`);
      });
      if (k === 0 ? read() !== `${S.matched} spotted this visit, ${S.firstTry} on the first try.` : !read().startsWith('A·')) fail('eigspot', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], v = r.opts[i].v, m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('eigspot', key, 'a miss is counted, or not crossed off');
        const d = deg(A, v), rd = Math.round(d);
        const want = `${work(A, v)} That is knocked ${Math.abs(d - rd) < 1e-9 ? '' : 'about '}${rd}° off the dotted line through ${vec(v)}, so arrow ${'ABCD'[i]} is not an eigenvector. ${S.matched} spotted this visit, ${S.firstTry} on the first try.`;
        if (read() !== want) fail('eigspot', key, `the miss is explained as: ${read()} | want ${want}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${'ABCD'[i]}" disabled onclick="EigSpot\\.choose\\(${i}\\)" aria-label="Arrow ${'ABCD'[i]}: [^"]+\\. Not an eigenvector"`).test(h)) fail('eigspot', key, 'a missed arrow is not shut and told as not an eigenvector');
        if ((h.match(/ disabled /g) || []).length !== q + 1 || (h.match(/stroke="#e5484d"/g) || []).length !== 2 * (q + 1)) fail('eigspot', key, 'the wrong number of arrows are shut and drawn in red');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('eigspot', key, 'tapping a missed arrow again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('eigspot', key, 'a pick does not redraw the hunt');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('eigspot', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('eigspot', key, 'no fresh matrix after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'EIGEN SPOTTER / 5 eigenvectors spotted') fail('eigspot', key, 'no banner at five'); }
      else { const tries = missN + 1, want = `✓ Arrow ${'ABCD'[ri]} stays on its line, spotted ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== want || env.banners.length !== nb) fail('eigspot', key, `the toast is ${env.toasts[nt]}`); }
      const L = right.lam;
      const after = `${work(A, right.v)} ${vec(Av)} = ${ng(L)} × ${vec(right.v)}: it stays on its own line${L < 0 ? ', turned right round' : ''}, so ${vec(right.v)} is an eigenvector with λ = ${ng(L)}.${L < 0 ? ' Turned round still counts: an eigenvector keeps its line, not its direction.' : ''} Here is a new matrix. ${S.matched} spotted this visit, ${S.firstTry} on the first try.`;
      if (read() !== after) fail('eigspot', key, `after a pick: ${read()}`);
      prev = A;
    }
  }
  for (const l of [-2, -1, 2, 3]) if (!lams.has(l)) fail('eigspot', 'λ', `no arrow kept with λ = ${l} is ever offered`);
  if (slots.size !== 4) fail('eigspot', 'deal', `the right arrow only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 40) fail('eigspot', 'banner', `five eigenvectors were spotted ${fives} times, not 40`);
  return { rounds, misses };
})();

/* Which integral? The pick-a-number round in the area workshop. Every
   integral is worked again here by Simpson's rule, which is exact for these
   curves and never uses F; every slip is worked from what it gets wrong, and
   the picture is read back off its own ticks and checked against f. */
const intPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Area = {render(){ env.renders++; }};" +
    cut('const IntPick = {', '/* ============ DOT PRODUCT WORKSHOP ============') + 'return IntPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const fr = n6 => { const g = gcd(n6, 6), n = n6 / g, d = 6 / g; return d === 1 ? ng(n) : `${ng(n)}/${d}`; };
  const pr = n6 => { const t = fr(n6); return t.startsWith('−') ? '(' + t + ')' : t; };
  const f = (c, x) => c.p * x * x + c.q * x + c.r;
  // ∫ from u to v, times 6, by Simpson's rule: exact for a quadratic, and no F in sight
  const simp6 = (c, u, v) => { const t = (v - u) * (f(c, u) + 4 * f(c, (u + v) / 2) + f(c, v)); if (!Number.isInteger(t)) throw new Error('not whole'); return t; };
  const sub = n => String(n).replace('-', '₋').replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
  const sup = n => String(n).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  // a polynomial written by hand: whole coefficients for f, and F's own
  const term = (num, den, pw, first) => {
    if (!num) return '';
    const g = gcd(num, den), n = num / g, d = den / g, m = Math.abs(n), x = ['', 'x', 'x²', 'x³'][pw];
    const body = pw === 0 ? (d === 1 ? String(m) : `${m}/${d}`) : (m === 1 ? x : m + x) + (d === 1 ? '' : '/' + d);
    return (n < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + ')) + body;
  };
  const write = ts => { let o = ''; for (const [n, d, pw] of ts) o += term(n, d, pw, o === ''); return o || '0'; };
  const fT = c => 'f(x) = ' + write([[c.p, 1, 2], [c.q, 1, 1], [c.r, 1, 0]]);
  const FT = c => 'F(x) = ' + write([[c.p, 3, 3], [c.q, 2, 2], [c.r, 1, 1]]);
  const read = () => txt(S.html().split('id="ipRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'An integral adds up signed area: gold above the axis counts plus, red below counts minus. Undo the power rule to get F, then ∫ₐᵇ f dx = F(b) − F(a). Which number is the integral of the shaded part?') fail('intpick', 'rule', 'the rule is not stated');
  if (S.round !== null || S.matched !== 0) fail('intpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, crossing = 0;
  const slots = new Set(), kinds = {}, dens = new Set();
  for (let seed = 1; seed <= 400; seed++) {
    env.seed = seed * 104729; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`, { a, b } = c;
      rounds++;
      if (![c.p, c.q, c.r, a, b].every(Number.isInteger) || !(b > a) || a < -2 || b > 3 || (!c.p && !c.q)) fail('intpick', key, `the curve ${JSON.stringify(c)} is not a fair one`);
      if (c.roots.some(t => f(c, t) !== 0)) fail('intpick', key, 'a root of f is not one');
      for (let x = a - 1; x <= b + 1; x += 0.125) if (Math.abs(f(c, x)) > 9) { fail('intpick', key, `f runs to ${f(c, x)} at x = ${x}`); break; }
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('intpick', key, 'the same curve comes twice in a row');
      // where f crosses inside (a, b), found by stepping, and each piece's signed area
      const cuts = []; for (let x = a + 1; x < b; x++) if (f(c, x) === 0 && f(c, x - 0.5) * f(c, x + 0.5) < 0) cuts.push(x);
      for (let x = a; x < b; x++) if (f(c, x + 0.5) === 0 && f(c, x + 0.25) * f(c, x + 0.75) < 0) fail('intpick', key, 'f crosses between whole numbers');
      if (cuts.length) crossing++;
      const xs = [a, ...cuts, b], pieces = xs.slice(1).map((x, i) => simp6(c, xs[i], x));
      const V = simp6(c, a, b);
      if (V === 0 || 6 / gcd(V, 6) > 3) fail('intpick', key, `the integral ${V}/6 is not a fair answer`);
      dens.add(6 / gcd(V, 6));
      const want = { right: V, swap: -V, top: simp6(c, 0, b), abs: pieces.reduce((s, w) => s + Math.abs(w), 0),
        nodiv: 6 * ((c.p * b ** 3 + c.q * b * b + c.r * b) - (c.p * a ** 3 + c.q * a * a + c.r * a)), ends: 6 * (f(c, b) - f(c, a)) };
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1 || new Set(r.opts.map(o => o.v)).size !== 4) fail('intpick', key, 'there are not four different numbers, one of them right');
      for (const o of r.opts) { if (o.v !== want[o.k]) fail('intpick', key, `${o.k} is ${o.v}/6, not ${want[o.k]}/6`); kinds[o.k] = (kinds[o.k] || 0) + 1; }
      if (cuts.length && want.abs !== V && !r.opts.some(o => o.k === 'abs')) fail('intpick', key, 'the red part counted as plus is not offered where the curve crosses');
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html(), t0 = txt(h0);
      if (!t0.startsWith(`${S.RULE} ${fT(c)}, shaded from x = ${ng(a)} to x = ${ng(b)}`)) fail('intpick', key, `the curve is not written first: ${t0.slice(S.RULE.length, S.RULE.length + 60)}`);
      const lab = `The curve ${fT(c)}, shaded from x = ${ng(a)} to x = ${ng(b)}${cuts.length ? ', crossing the axis at x = ' + cuts.map(ng).join(' and x = ') : ''}${pieces.some(w => w < 0) ? '; part of it is under the axis, in red' : ''}`;
      if (!h0.includes(`role="img" aria-label="${lab}"`)) fail('intpick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="IntPick\.choose\((\d)\)" aria-label="([ABCD]): ([^".]+)(\. Not the integral)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== fr(r.opts[i].v) || m[6] || m[7] !== 'ABCD'[i] || m[8] !== fr(r.opts[i].v))) fail('intpick', key, 'the four numbers are not offered as they are, A to D');
      // the picture, read back off its own ticks
      const svg = h0.split('id="ipFig"')[1].split('</svg>')[0];
      const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="10"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1], +m[2].replace('−', '-')]);
      const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="9"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1] - 3, +m[2].replace('−', '-')]);
      if (xt.length < 3 || yt.length < 2 || xt[0][1] !== a - 1 || xt[xt.length - 1][1] !== b + 1) { fail('intpick', key, 'the ticks do not run from a − 1 to b + 1'); continue; }
      // every y label fits inside the picture: at 9px a character is about 5.2px wide, and an end-anchored label runs left from its x
      if ([...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9"[^>]*text-anchor="end"[^>]*>([^<]+)<\/text>/g)].some(m => +m[1] - 5.2 * [...m[2]].length < 1)) fail('intpick', key, 'a y label runs off the left edge of the picture');
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      if (!(kx > 0 && ky < 0)) fail('intpick', key, 'the picture is drawn back to front or upside down: higher numbers must sit further right and further up');
      const ux = px => xt[0][1] + (px - xt[0][0]) / kx, uy = py => yt[0][1] + (py - yt[0][0]) / ky;
      const bold = [...svg.matchAll(/font-weight="bold">([^<]+)</g)].map(m => +m[1].replace('−', '-'));
      if (JSON.stringify(bold) !== JSON.stringify([a, b])) fail('intpick', key, 'a and b are not picked out on the axis');
      const curve = svg.match(/<path data-k="curve" d="([^"]+)"/);
      if (!curve) fail('intpick', key, 'no curve is drawn');
      else for (const m of curve[1].matchAll(/([-\d.]+),([-\d.]+)/g)) { const x = ux(+m[1]), y = uy(+m[2]); if (Math.abs(y - f(c, x)) > 0.05 + 0.05 * Math.abs(f(c, x))) { fail('intpick', key, `the curve passes (${x.toFixed(2)}, ${y.toFixed(2)}), off f`); break; } }
      const bands = [...svg.matchAll(/<path data-k="(gold|red)" d="([^"]+)" fill="([^"]+)"/g)];
      if (bands.some(m => m[3] !== (m[1] === 'gold' ? 'rgba(242,193,78,.35)' : 'rgba(229,72,77,.35)'))) fail('intpick', key, `the shading is filled ${bands.map(m => m[3])}, not gold above and red below`);
      if (bands.length !== pieces.length || bands.some((m, i) => m[1] !== (pieces[i] > 0 ? 'gold' : 'red'))) fail('intpick', key, `the shading is ${bands.map(m => m[1])}, not ${pieces.map(w => w > 0 ? 'gold' : 'red')}`);
      bands.forEach((m, i) => { const pts = [...m[2].matchAll(/([-\d.]+),([-\d.]+)/g)].map(q => [ux(+q[1]), uy(+q[2])]);
        const xs0 = pts.map(p => p[0]); if (Math.abs(Math.min(...xs0) - xs[i]) > 0.02 || Math.abs(Math.max(...xs0) - xs[i + 1]) > 0.02) fail('intpick', key, `band ${i} runs from ${Math.min(...xs0)} to ${Math.max(...xs0)}`);
        if (Math.abs(pts[0][1]) > 0.1 || Math.abs(pts[pts.length - 1][1]) > 0.1 || pts.slice(1, -1).some(p => Math.abs(p[1] - f(c, p[0])) > 0.05 + 0.05 * Math.abs(f(c, p[0])))) fail('intpick', key, `band ${i} does not hug the curve`); });
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: F(x) = ')) fail('intpick', key, `before a pick the readout says ${read()}`);
      const Fv = x => simp6(c, 0, x);
      const work = `${FT(c)}, so F(${ng(b)}) = ${fr(Fv(b))} and F(${ng(a)}) = ${fr(Fv(a))}: ∫${sub(a)}${sup(b)} f dx = F(${ng(b)}) − F(${ng(a)}) = ${fr(Fv(b))} − ${pr(Fv(a))} = ${fr(V)}.`;
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('intpick', key, 'a miss is counted, or not crossed off');
        const gold = pieces.filter(w => w > 0).reduce((s, w) => s + w, 0), red = -pieces.filter(w => w < 0).reduce((s, w) => s + w, 0);
        const slip = {
          swap: `${L} is F(${ng(a)}) − F(${ng(b)}) = ${fr(o.v)}: the ends taken the wrong way round, which flips the sign. The top end comes first.`,
          top: `${L} is F(${ng(b)}) alone = ${fr(o.v)}: it forgets to take away F(${ng(a)}), which is ${fr(Fv(a))}, not 0.`,
          abs: `${L} counts the red part as plus: the gold part is ${fr(gold)} and the red part ${fr(red)}, and ${L} adds them to ${fr(o.v)}. Area under the axis counts as minus, so the integral is ${fr(gold)} − ${fr(red)} = ${fr(V)}.`,
          nodiv: `${L} forgets to divide by the new power: it takes ${write([[c.p, 1, 3], [c.q, 1, 2], [c.r, 1, 1]])} for F, which gives ${fr(o.v)}. Its slope is not f: undoing xⁿ gives xⁿ⁺¹/(n + 1).`,
          ends: `${L} is f(${ng(b)}) − f(${ng(a)}) = ${fr(o.v)}: f at the two ends, not F. That measures how much f rises, not the area under it.`
        }[o.k];
        const want2 = `${slip} ${work} ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('intpick', key, `the miss is explained as: ${read()} | want ${want2}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="IntPick\\.choose\\(${i}\\)" aria-label="${L}: [^"]+\\. Not the integral"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('intpick', key, 'the missed numbers are not shut and told as not the integral');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('intpick', key, 'tapping a missed number again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('intpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('intpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('intpick', key, 'no fresh curve after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'INTEGRAL READER / 5 integrals picked') fail('intpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} is the integral, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('intpick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work} Here is a new curve. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('intpick', key, `after a pick: ${read()}`);
      prev = c;
    }
  }
  for (const k of ['swap', 'top', 'abs', 'nodiv', 'ends']) if (!kinds[k]) fail('intpick', 'slips', `the slip ${k} is never offered`);
  if (slots.size !== 4) fail('intpick', 'deal', `the right number only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (crossing < rounds / 3) fail('intpick', 'deal', `only ${crossing} of ${rounds} curves cross the axis inside the shading`);
  if (!dens.has(1) || !dens.has(2) || !dens.has(3)) fail('intpick', 'deal', `the answers only have bottoms ${[...dens]}`);
  if (fives !== 40) fail('intpick', 'banner', `five integrals were picked ${fives} times, not 40`);
  return { rounds, misses, crossing };
})();

/* Which dy/dx? The pick-a-formula round in the chain rule workshop. Every
   formula on screen is read back as maths and evaluated: the chain rule's
   must match a nudge of y itself, and each slip must be exactly the slip it
   is named as, worked here from what it gets wrong. The picture is read back
   off its own ticks: the curve must be y, and each red line must pass
   through the point with the slope of the formula it stands for. */
const chainPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺'}; const sup = n => String(n).split('').map(c=>SUP[c]||c).join('');" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Chain = {render(){ env.renders++; }};" +
    cut('const ChainPick = {', "/* ---------- The L'Hôpital workshop") + 'return ChainPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  // a formula as the player reads it, turned into a function of x
  const maths = t => {
    let e = t.replace(/eˣ/g, 'E(x)').replace(/e\^\(/g, 'E(').replace(/eᵘ/g, '?')
      .replace(/(cos|sin) x/g, '$1(x)').replace(/(cos|sin) (\d+)/g, '$1($2)').replace(/cos\(/g, 'C(').replace(/sin\(/g, 'N(')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '**' + [...m].map(ch => SUPS.indexOf(ch)).join(''))
      .replace(/ · /g, '*').replace(/−/g, '-').replace(/(\d)(x|\(|[ECN])/g, '$1*$2').replace(/\)(\(|x|\d|[ECN])/g, ')*$1');
    if (/[^-+*() \dxECN]/.test(e.replace(/\*\*/g, ''))) return null;
    try { const fn = new Function('x', 'E', 'C', 'N', 'return ' + e + ';'); return x => fn(x, Math.exp, Math.cos, Math.sin); } catch (er) { return null; }
  };
  // the inside and the outer function, worked here from the round's own numbers
  const g = (c, x) => c.sq ? x * x + c.b : c.a * x + c.b, gp = (c, x) => c.sq ? 2 * x : c.a;
  const F = (c, u) => ({ pow: u ** c.n, sin: Math.sin(u), cos: Math.cos(u), exp: Math.exp(u) })[c.fam];
  const Fp = (c, u) => ({ pow: c.n * u ** (c.n - 1), sin: Math.cos(u), cos: -Math.sin(u), exp: Math.exp(u) })[c.fam];
  const y = (c, x) => F(c, g(c, x));
  const want = {
    right: (c, x) => Fp(c, g(c, x)) * gp(c, x),
    inner: (c, x) => Fp(c, g(c, x)),
    atx: (c, x) => Fp(c, x) * gp(c, x),
    inside: (c, x) => Fp(c, gp(c, x)),
    outer: (c, x) => { const u = g(c, x); return ({ pow: c.n * u ** c.n, sin: -Math.cos(u), cos: Math.sin(u), exp: u * Math.exp(u - 1) })[c.fam] * gp(c, x); }
  };
  const near = (p, q) => Math.abs(p - q) <= 1e-7 * (1 + Math.abs(q));
  const XS = [-1.7, -0.9, -0.3, 0.4, 1.1, 1.8];
  const gT = c => { const h = c.sq ? 'x²' : (c.a === -1 ? '−' : ng(c.a)) + 'x'; return c.b ? h + (c.b < 0 ? ' − ' : ' + ') + Math.abs(c.b) : h; };
  const supT = n => String(n).replace(/\d/g, d => SUPS[d]);
  const fu = c => ({ pow: 'u' + supT(c.n), sin: 'sin u', cos: 'cos u', exp: 'eᵘ' })[c.fam];
  const fpu = c => ({ pow: c.n === 2 ? '2u' : `${c.n}u${supT(c.n - 1)}`, sin: 'cos u', cos: '−sin u', exp: 'eᵘ' })[c.fam];
  const read = () => txt(S.html().split('id="chpRead"')[1].replace(/^[^>]*>/, ''));
  const num = v => { const r = Math.round(v * 100) / 100; return ng(Object.is(r, -0) ? 0 : r); };
  if (S.RULE !== 'The chain rule: if y = f(u) with u = g(x), then dy/dx = f′(u) × g′(x). Take the outer slope at the inside, u = g(x), then multiply by the inner slope. Which formula is dy/dx?') fail('chainpick', 'rule', 'the rule is not stated');
  if (S.round !== null || S.matched !== 0) fail('chainpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, lines = 0;
  const slots = new Set(), kinds = {}, fams = {}, insides = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`;
      rounds++; fams[c.fam] = (fams[c.fam] || 0) + 1; insides.add(c.sq ? 'sq' : 'lin');
      if (!['pow', 'sin', 'cos', 'exp'].includes(c.fam) || (c.fam === 'pow' && ![2, 3, 4].includes(c.n)) || !Number.isInteger(c.b) || !c.b || Math.abs(c.b) > 3
        || (!c.sq && (!Number.isInteger(c.a) || Math.abs(c.a) < 2 || Math.abs(c.a) > 4)) || ![-1, -0.5, 0.5, 1].includes(c.x0)) fail('chainpick', key, `the curve ${JSON.stringify(c)} is not a fair one`);
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('chainpick', key, 'the same curve comes twice in a row');
      // y as written is y, and the chain rule's formula matches a nudge of it
      const yT = S.yText(c), wantY = { pow: `(${gT(c)})${supT(c.n)}`, sin: `sin(${gT(c)})`, cos: `cos(${gT(c)})`, exp: `e^(${gT(c)})` }[c.fam];
      if (yT !== wantY) fail('chainpick', key, `y is written ${yT}, not ${wantY}`);
      const yf = maths(yT);
      if (!yf || XS.some(x => !near(yf(x), y(c, x)))) fail('chainpick', key, `${yT} does not read back as y`);
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('chainpick', key, 'there are not four formulas, one of them right');
      const texts = r.opts.map(o => S.text(c, o.k));
      if (new Set(texts).size !== 4) fail('chainpick', key, 'two formulas are written the same');
      const fns = texts.map(maths);
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('chainpick', key, `an option is the unknown ${o.k}`); return; }
        if (!fns[i]) { fail('chainpick', key, `${texts[i]} does not read as maths`); return; }
        if (XS.some(x => !near(fns[i](x), want[o.k](c, x)))) fail('chainpick', key, `${o.k} is written ${texts[i]}, which is not that slip`);
        if (XS.some(x => !near(S.value(c, o.k, x), want[o.k](c, x)))) fail('chainpick', key, `${o.k} is worked wrong`);
      });
      const gpT = c.sq ? '2x' : c.a < 0 ? `(−${-c.a})` : String(c.a);
      r.opts.forEach((o, i) => {
        if (['right', 'atx', 'outer'].includes(o.k) && !texts[i].endsWith(' · ' + gpT)) fail('chainpick', key, `${texts[i]} does not end with the inner slope · ${gpT}, bracketed when negative`);
        if (o.k === 'atx' && c.fam === 'exp' && !texts[i].startsWith('eˣ · ')) fail('chainpick', key, `the at-x slip is written ${texts[i]}, not eˣ`);
      });
      if (XS.some(x => Math.abs((y(c, x + 1e-5) - y(c, x - 1e-5)) / 2e-5 - want.right(c, x)) > 1e-4 * (1 + Math.abs(want.right(c, x))))) fail('chainpick', key, 'the chain rule does not match a nudge of y');
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (fns[i] && fns[j] && XS.every(x => near(fns[i](x), fns[j](x)))) fail('chainpick', key, `${texts[i]} and ${texts[j]} are the same slope`);
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ' y = ' + yT)) fail('chainpick', key, 'the rule and y are not shown first');
      const lab = `The curve y = ${yT} from x = ${ng(c.x0 - 1)} to x = ${ng(c.x0 + 1)}, with a point at x = ${ng(c.x0)}`;
      if (!h0.includes(`role="img" aria-label="${lab}">`)) fail('chainpick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="ChainPick\.choose\((\d)\)" aria-label="([ABCD]): dy\/dx = ([^"]+?)(\. Not the chain rule)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== texts[i] || m[6] || m[7] !== 'ABCD'[i] || m[8] !== texts[i])) fail('chainpick', key, 'the four formulas are not offered as they are, A to D');
      // the picture, read back off its own ticks
      const pic = h => {
        const svg = h.split('id="chpFig"')[1].split('</svg>')[0];
        const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="10" fill="[^"]+" text-anchor="middle"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1], +m[2].replace('−', '-')]);
        const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="9"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1] - 3, +m[2].replace('−', '-')]);
        return { svg, xt, yt };
      };
      const { svg, xt, yt } = pic(h0);
      if (xt.length !== 5 || xt[0][1] !== c.x0 - 1 || xt[4][1] !== c.x0 + 1) { fail('chainpick', key, 'the ticks do not run from x₀ − 1 to x₀ + 1 in halves'); continue; }
      if (yt.length < 2 || yt.length > 8) { fail('chainpick', key, `there are ${yt.length} y ticks`); continue; }
      // every y label fits inside the picture: at 9px a character is about 5.2px wide, and an end-anchored label runs left from its x
      if ([...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9"[^>]*text-anchor="end"[^>]*>([^<]+)<\/text>/g)].some(m => +m[1] - 5.2 * [...m[2]].length < 1)) fail('chainpick', key, 'a y label runs off the left edge of the picture');
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      // the 10° rule measures angles as the picture draws them
      if (r.opts.some(o => Math.abs(S.angle(c, want[o.k](c, c.x0)) - Math.atan(want[o.k](c, c.x0) * Math.abs(ky) / kx) * 180 / Math.PI) > 0.2)) fail('chainpick', key, 'the 10° rule measures angles another way from the picture');
      if (!(kx > 0 && ky < 0)) fail('chainpick', key, 'the picture is drawn back to front or upside down');
      const ux = px => xt[0][1] + (px - xt[0][0]) / kx, uy = py => yt[0][1] + (py - yt[0][0]) / ky;
      const span = Math.abs((yt[yt.length - 1][1] - yt[0][1]) / (yt.length - 1)) * 8;
      if (JSON.stringify([...svg.matchAll(/font-weight="bold">([^<]+)</g)].map(m => +m[1].replace('−', '-'))) !== JSON.stringify([c.x0])) fail('chainpick', key, 'x₀ is not picked out on the axis');
      const curve = svg.match(/<path data-k="curve" d="([^"]+)"/);
      if (!curve) fail('chainpick', key, 'no curve is drawn');
      else for (const m of curve[1].matchAll(/([-\d.]+),([-\d.]+)/g)) { const x = ux(+m[1]), yy = uy(+m[2]); if (Math.abs(yy - y(c, x)) > 0.02 * span + 0.01) { fail('chainpick', key, `the curve passes (${x.toFixed(2)}, ${yy.toFixed(2)}), off y`); break; } }
      const pt = svg.match(/<circle data-k="point" cx="([-\d.]+)" cy="([-\d.]+)"/);
      if (!pt || Math.abs(ux(+pt[1]) - c.x0) > 0.01 || Math.abs(uy(+pt[2]) - y(c, c.x0)) > 0.01 * span + 0.01) fail('chainpick', key, 'the point is not on the curve at x₀');
      if (/data-k="miss/.test(svg)) fail('chainpick', key, 'a red line is drawn before any miss');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: y = f(u)')) fail('chainpick', key, `before a pick the readout says ${read()}`);
      const work = `y = f(u) with f(u) = ${fu(c)} and u = g(x) = ${gT(c)}, so f′(u) = ${fpu(c)} and g′(x) = ${c.sq ? '2x' : ng(c.a)}: dy/dx = f′(g(x)) × g′(x) = ${texts[ri]}.`;
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('chainpick', key, 'a miss is counted, or not crossed off');
        const slip = {
          inner: `${L} stops at f′(g(x)) and forgets the inner slope: it needs × g′(x) = ${c.sq ? '2x' : ng(c.a)} as well, for how fast the inside moves.`,
          atx: `${L} takes f′ at x itself: it puts x where the inside, u = ${gT(c)}, belongs. The outer slope has to be taken at u.`,
          inside: `${L} puts the inner slope inside f′: it takes f′(g′(x)), where the chain rule takes f′(g(x)) and then multiplies by g′(x).`,
          outer: { pow: `${L} keeps the power at ${c.n}: the power rule drops it by one, so u${supT(c.n)} gives ${fpu(c)}.`,
            sin: `${L} puts a minus in front: the slope of sin u is cos u, with no minus.`, cos: `${L} drops the minus: the slope of cos u is −sin u.`,
            exp: `${L} tries the power rule on eᵘ: eᵘ is not a power of u, and its slope is eᵘ itself.` }[c.fam]
        }[o.k];
        const s0 = want[o.k](c, c.x0), H = 0.001, nudge = (y(c, c.x0 + H) - y(c, c.x0 - H)) / (2 * H);
        const r4 = v => ng(Math.round(v * 1e4) / 1e4);
        const check = `At x = ${ng(c.x0)}, ${L} gives a slope of ${Math.abs(s0 - Math.round(s0 * 100) / 100) < 1e-9 ? '' : 'about '}${num(s0)}, drawn in red: it cuts across the curve. A nudge from x = ${r4(c.x0 - H)} to ${r4(c.x0 + H)} gives Δy/Δx ≈ ${num(nudge)}.`;
        if (Math.abs(nudge - want.right(c, c.x0)) > 0.01 * (1 + Math.abs(want.right(c, c.x0)))) fail('chainpick', key, 'the nudge is not the curve\'s slope');
        const want2 = `${slip} ${check} ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('chainpick', key, `the miss is explained as: ${read()} | want ${want2}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="ChainPick\\.choose\\(${i}\\)" aria-label="${L}: dy/dx = [^"]+\\. Not the chain rule"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('chainpick', key, 'the missed formulas are not shut and told as not the chain rule');
        const outs = wrong.slice(0, q + 1).slice().sort();
        if (!h.includes(`${lab}; red lines through it with the slopes of ${outs.map(j => 'ABCD'[j]).join(' and ')}, cutting across the curve">`)) fail('chainpick', key, 'the red lines are not read out');
        // each red line goes through the point with its formula's slope, and looks wrong
        const sv = pic(h).svg, reds = [...sv.matchAll(/<line data-k="miss([ABCD])" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="([^"]+)"/g)];
        if (reds.map(m => m[1]).join() !== outs.map(j => 'ABCD'[j]).join()) fail('chainpick', key, `the red lines are ${reds.map(m => m[1])}`);
        for (const m of reds) {
          lines++;
          const j = 'ABCD'.indexOf(m[1]), sj = want[r.opts[j].k](c, c.x0), P = [ux(+m[2]), uy(+m[3])], Q = [ux(+m[4]), uy(+m[5])];
          const sl = (Q[1] - P[1]) / (Q[0] - P[0]), mid = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
          if (m[6] !== '#e5484d' || Math.abs(sl - sj) > 0.02 * (1 + Math.abs(sj)) || Math.abs(mid[0] - c.x0) > 0.01 || Math.abs(mid[1] - y(c, c.x0)) > 0.01 * span + 0.02) fail('chainpick', key, `the red line ${m[1]} is not ${texts[j]} through the point`);
          const ang = s => Math.atan(s * Math.abs(ky) / kx) * 180 / Math.PI;
          if (Math.abs(ang(sj) - ang(want.right(c, c.x0))) < 10) fail('chainpick', key, `the red line ${m[1]} looks too like the curve's own slope`);
        }
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('chainpick', key, 'tapping a missed formula again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('chainpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('chainpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('chainpick', key, 'no fresh curve after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'CHAIN READER / 5 slopes picked') fail('chainpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} is dy/dx, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('chainpick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work} Here is a new curve. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('chainpick', key, `after a pick: ${read()} | want That was it: ${work}`);
      prev = c;
    }
  }
  for (const k of ['inner', 'atx', 'inside', 'outer']) if (!kinds[k]) fail('chainpick', 'slips', `the slip ${k} is never offered`);
  for (const f of ['pow', 'sin', 'cos', 'exp']) if (!fams[f]) fail('chainpick', 'deal', `y is never a ${f}`);
  if (insides.size !== 2) fail('chainpick', 'deal', 'the inside is never x² + b, or never a x + b');
  if (slots.size !== 4) fail('chainpick', 'deal', `the right formula only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('chainpick', 'banner', `five slopes were picked ${fives} times, not 30`);
  return { rounds, misses, lines };
})();

/* Which dy/dx? The pick-a-formula round in the product rule workshop. Every
   formula on screen is read back as maths and evaluated: the product rule's
   must match a nudge of y itself, and each slip must be exactly the slip it
   is named as, worked here from f and g. The picture is read back off its
   own ticks: the curve must be y, and each red line must pass through the
   point with the slope of the formula it stands for. */
const productPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Product = {render(){ env.renders++; }};" +
    cut('const ProductPick = {', '/* ---------- The ladder workshop') + 'return ProductPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  // a formula as the player reads it, turned into a function of x
  const maths = t => {
    let e = t.replace(/eˣ/g, 'E(x)').replace(/(cos|sin) x/g, '$1(x)').replace(/cos\(/g, 'C(').replace(/sin\(/g, 'N(')
      .replace(/x([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m, p) => '(x**' + [...p].map(ch => SUPS.indexOf(ch)).join('') + ')')
      .replace(/ · /g, '*').replace(/−/g, '-').replace(/(\d)(x|\(|[ECN])/g, '$1*$2').replace(/\)(\(|x|\d|[ECN])/g, ')*$1');
    if (/[^-+*() \dxECN]/.test(e.replace(/\*\*/g, ''))) return null;
    try { const fn = new Function('x', 'E', 'C', 'N', 'return ' + e + ';'); return x => fn(x, Math.exp, Math.cos, Math.sin); } catch (er) { return null; }
  };
  // f and g, worked here from the round's own numbers
  const f = (c, x) => ({ x2: x * x, x3: x ** 3, x: x, lin: c.a * x + c.b })[c.f];
  const fp = (c, x) => ({ x2: 2 * x, x3: 3 * x * x, x: 1, lin: c.a })[c.f];
  const g = (c, x) => ({ sin: Math.sin(x), cos: Math.cos(x), exp: Math.exp(x), lin: c.p * x + c.q })[c.g];
  const gp = (c, x) => ({ sin: Math.cos(x), cos: -Math.sin(x), exp: Math.exp(x), lin: c.p })[c.g];
  const y = (c, x) => f(c, x) * g(c, x);
  const want = {
    right: (c, x) => fp(c, x) * g(c, x) + f(c, x) * gp(c, x),
    minus: (c, x) => fp(c, x) * g(c, x) - f(c, x) * gp(c, x),
    both: (c, x) => fp(c, x) * gp(c, x),
    one: (c, x) => fp(c, x) * g(c, x),
    other: (c, x) => f(c, x) * gp(c, x)
  };
  const near = (p, q) => Math.abs(p - q) <= 1e-7 * (1 + Math.abs(q));
  const XS = [-1.7, -0.9, -0.3, 0.4, 1.1, 1.8];
  const lin = (a, b) => (a === 1 ? '' : ng(a)) + 'x' + (b < 0 ? ' − ' : ' + ') + Math.abs(b);
  const fT = c => ({ x2: 'x²', x3: 'x³', x: 'x', lin: c.f === 'lin' ? lin(c.a, c.b) : '' })[c.f];
  const gT = c => ({ sin: 'sin x', cos: 'cos x', exp: 'eˣ', lin: c.g === 'lin' ? lin(c.p, c.q) : '' })[c.g];
  const br = (c, w) => (w === 'f' ? c.f : c.g) === 'lin' ? '(' + (w === 'f' ? fT(c) : gT(c)) + ')' : (w === 'f' ? fT(c) : gT(c));
  const fpT = c => ({ x2: '2x', x3: '3x²', x: '1', lin: String(c.a) })[c.f];
  const gpT = c => ({ sin: 'cos x', cos: '−sin x', exp: 'eˣ', lin: String(c.p) })[c.g];
  const read = () => txt(S.html().split('id="ppRead"')[1].replace(/^[^>]*>/, ''));
  const num = v => { const r = Math.round(v * 100) / 100; return ng(Object.is(r, -0) ? 0 : r); };
  if (S.RULE !== 'The product rule: if y = f(x) · g(x), then dy/dx = f′g + fg′. Let each factor change in turn while the other holds still, and add the two parts. Which formula is dy/dx?') fail('productpick', 'rule', 'the rule is not stated');
  if (S.round !== null || S.matched !== 0) fail('productpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, lines = 0;
  const slots = new Set(), kinds = {}, fs_ = {}, gs = {};
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`;
      rounds++; fs_[c.f] = (fs_[c.f] || 0) + 1; gs[c.g] = (gs[c.g] || 0) + 1;
      const fair = ['x2', 'x3', 'x', 'lin'].includes(c.f) && ['sin', 'cos', 'exp', 'lin'].includes(c.g) && !(c.f === 'lin' && c.g === 'lin')
        && (c.f === 'lin' ? [1, 2, 3].includes(c.a) && Number.isInteger(c.b) && c.b && Math.abs(c.b) <= 3 : c.a === 0 && c.b === 0)
        && (c.g === 'lin' ? [1, 2, 3].includes(c.p) && Number.isInteger(c.q) && c.q && Math.abs(c.q) <= 3 : c.p === 0 && c.q === 0)
        && [-1, -0.5, 0.5, 1].includes(c.x0);
      if (!fair) fail('productpick', key, `the curve ${JSON.stringify(c)} is not a fair one`);
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('productpick', key, 'the same curve comes twice in a row');
      { let lo = Infinity, hi = -Infinity; for (let j = 0; j <= 80; j++) { const v = y(c, c.x0 - 1 + j / 40); lo = Math.min(lo, v); hi = Math.max(hi, v); }
        const tall = hi - lo + 2 * Math.max(0.5, 0.12 * (hi - lo)); if (tall > 60) fail('productpick', key, `the picture is ${tall.toFixed(1)} tall, too squashed to read a slope off`); }
      // y as written is y, and the product rule's formula matches a nudge of it
      const yT = S.yText(c), wantY = br(c, 'f') + ' · ' + br(c, 'g');
      if (yT !== wantY) fail('productpick', key, `y is written ${yT}, not ${wantY}`);
      const yf = maths(yT);
      if (!yf || XS.some(x => !near(yf(x), y(c, x)))) fail('productpick', key, `${yT} does not read back as y`);
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('productpick', key, 'there are not four formulas, one of them right');
      const texts = r.opts.map(o => S.text(c, o.k));
      if (new Set(texts).size !== 4) fail('productpick', key, 'two formulas are written the same');
      const fns = texts.map(maths);
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('productpick', key, `an option is the unknown ${o.k}`); return; }
        if (!fns[i]) { fail('productpick', key, `${texts[i]} does not read as maths`); return; }
        if (XS.some(x => !near(fns[i](x), want[o.k](c, x)))) fail('productpick', key, `${o.k} is written ${texts[i]}, which is not that slip`);
        if (XS.some(x => !near(S.value(c, o.k, x), want[o.k](c, x)))) fail('productpick', key, `${o.k} is worked wrong`);
        if (/(^|[^\d])1 · | · 1($|[^\d])|\+ −|− −|−\(−|^\([^()]*\)$/.test(texts[i])) fail('productpick', key, `${texts[i]} is written untidily`);
        if (/\d · x|\d · \(/.test(texts[i])) fail('productpick', key, `${texts[i]} puts a · between a number and x or a bracket`);
        if (/ · \d+( |$)/.test(texts[i])) fail('productpick', key, `${texts[i]} puts a number after what it multiplies`);
      });
      // the product rule written as f′g + fg′, in that order
      const ri0 = r.opts.findIndex(o => o.k === 'right');
      if (!/ [+−] /.test(texts[ri0])) fail('productpick', key, `the product rule ${texts[ri0]} is not two parts`);
      if (XS.some(x => Math.abs((y(c, x + 1e-5) - y(c, x - 1e-5)) / 2e-5 - want.right(c, x)) > 1e-4 * (1 + Math.abs(want.right(c, x))))) fail('productpick', key, 'the product rule does not match a nudge of y');
      { const v = S.view(c), ag = s => Math.atan(s * (158 / (v.hi - v.lo)) / (266 / 2)) * 180 / Math.PI;
        r.opts.forEach((o, i) => { if (o.k !== 'right' && Math.abs(ag(want[o.k](c, c.x0)) - ag(want.right(c, c.x0))) < 10) fail('productpick', key, `${texts[i]} looks too like the curve's own slope at x₀`); }); }
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (fns[i] && fns[j] && XS.every(x => near(fns[i](x), fns[j](x)))) fail('productpick', key, `${texts[i]} and ${texts[j]} are the same slope`);
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ' y = ' + yT)) fail('productpick', key, 'the rule and y are not shown first');
      const lab = `The curve y = ${yT} from x = ${ng(c.x0 - 1)} to x = ${ng(c.x0 + 1)}, with a point at x = ${ng(c.x0)}`;
      if (!h0.includes(`role="img" aria-label="${lab}">`)) fail('productpick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="ProductPick\.choose\((\d)\)" aria-label="([ABCD]): dy\/dx = ([^"]+?)(\. Not the product rule)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== texts[i] || m[6] || m[7] !== 'ABCD'[i] || m[8] !== texts[i])) fail('productpick', key, 'the four formulas are not offered as they are, A to D');
      // the picture, read back off its own ticks
      const pic = h => {
        const svg = h.split('id="ppFig"')[1].split('</svg>')[0];
        const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="10" fill="[^"]+" text-anchor="middle"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1], +m[2].replace('−', '-')]);
        const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="9"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1] - 3, +m[2].replace('−', '-')]);
        return { svg, xt, yt };
      };
      const { svg, xt, yt } = pic(h0);
      if (xt.length !== 5 || xt[0][1] !== c.x0 - 1 || xt[4][1] !== c.x0 + 1) { fail('productpick', key, 'the ticks do not run from x₀ − 1 to x₀ + 1 in halves'); continue; }
      if (yt.length < 2 || yt.length > 8) { fail('productpick', key, `there are ${yt.length} y ticks`); continue; }
      // every y label fits inside the picture: at 9px a character is about 5.2px wide, and an end-anchored label runs left from its x
      if ([...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9"[^>]*text-anchor="end"[^>]*>([^<]+)<\/text>/g)].some(m => +m[1] - 5.2 * [...m[2]].length < 1)) fail('productpick', key, 'a y label runs off the left edge of the picture');
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      // the 10° rule measures angles as the picture draws them
      if (r.opts.some(o => Math.abs(S.angle(c, want[o.k](c, c.x0)) - Math.atan(want[o.k](c, c.x0) * Math.abs(ky) / kx) * 180 / Math.PI) > 0.2)) fail('productpick', key, 'the 10° rule measures angles another way from the picture');
      if (!(kx > 0 && ky < 0)) fail('productpick', key, 'the picture is drawn back to front or upside down');
      const ux = px => xt[0][1] + (px - xt[0][0]) / kx, uy = py => yt[0][1] + (py - yt[0][0]) / ky;
      const span = Math.abs((yt[yt.length - 1][1] - yt[0][1]) / (yt.length - 1)) * 8;
      if (JSON.stringify([...svg.matchAll(/font-weight="bold">([^<]+)</g)].map(m => +m[1].replace('−', '-'))) !== JSON.stringify([c.x0])) fail('productpick', key, 'x₀ is not picked out on the axis');
      const curve = svg.match(/<path data-k="curve" d="([^"]+)"/);
      if (!curve) fail('productpick', key, 'no curve is drawn');
      else for (const m of curve[1].matchAll(/([-\d.]+),([-\d.]+)/g)) { const x = ux(+m[1]), yy = uy(+m[2]); if (Math.abs(yy - y(c, x)) > 0.02 * span + 0.01) { fail('productpick', key, `the curve passes (${x.toFixed(2)}, ${yy.toFixed(2)}), off y`); break; } }
      const pt = svg.match(/<circle data-k="point" cx="([-\d.]+)" cy="([-\d.]+)"/);
      if (!pt || Math.abs(ux(+pt[1]) - c.x0) > 0.01 || Math.abs(uy(+pt[2]) - y(c, c.x0)) > 0.01 * span + 0.01) fail('productpick', key, 'the point is not on the curve at x₀');
      if (/data-k="miss/.test(svg)) fail('productpick', key, 'a red line is drawn before any miss');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: f(x) = ')) fail('productpick', key, `before a pick the readout says ${read()}`);
      const work = `f(x) = ${fT(c)} and g(x) = ${gT(c)}, so f′(x) = ${fpT(c)} and g′(x) = ${gpT(c)}: dy/dx = f′g + fg′ = ${texts[ri]}.`;
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('productpick', key, 'a miss is counted, or not crossed off');
        const slip = {
          both: `${L} multiplies the two slopes, f′ · g′. That only sizes the corner where both change at once, and the corner vanishes as the step shrinks: the slope is f′g + fg′.`,
          minus: `${L} takes fg′ away: that minus belongs to the quotient rule. Here both parts add to y, so the product rule adds them.`,
          one: `${L} keeps only f′g, the part from f changing: it forgets fg′, the part from g changing.`,
          other: `${L} keeps only fg′, the part from g changing: it forgets f′g, the part from f changing.`
        }[o.k];
        const s0 = want[o.k](c, c.x0), H = 0.001, nudge = (y(c, c.x0 + H) - y(c, c.x0 - H)) / (2 * H);
        const r4 = v => ng(Math.round(v * 1e4) / 1e4);
        const check = `At x = ${ng(c.x0)}, ${L} gives a slope of ${Math.abs(s0 - Math.round(s0 * 100) / 100) < 1e-9 ? '' : 'about '}${num(s0)}, drawn in red: it cuts across the curve. A nudge from x = ${r4(c.x0 - H)} to ${r4(c.x0 + H)} gives Δy/Δx ≈ ${num(nudge)}.`;
        if (Math.abs(nudge - want.right(c, c.x0)) > 0.01 * (1 + Math.abs(want.right(c, c.x0)))) fail('productpick', key, 'the nudge is not the curve\'s slope');
        const want2 = `${slip} ${check} ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('productpick', key, `the miss is explained as: ${read()} | want ${want2}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="ProductPick\\.choose\\(${i}\\)" aria-label="${L}: dy/dx = [^"]+\\. Not the product rule"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('productpick', key, 'the missed formulas are not shut and told as not the product rule');
        const outs = wrong.slice(0, q + 1).slice().sort();
        if (!h.includes(`${lab}; red lines through it with the slopes of ${outs.map(j => 'ABCD'[j]).join(' and ')}, cutting across the curve">`)) fail('productpick', key, 'the red lines are not read out');
        // each red line goes through the point with its formula's slope, and looks wrong
        const sv = pic(h).svg, reds = [...sv.matchAll(/<line data-k="miss([ABCD])" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="([^"]+)"/g)];
        if (reds.map(m => m[1]).join() !== outs.map(j => 'ABCD'[j]).join()) fail('productpick', key, `the red lines are ${reds.map(m => m[1])}`);
        for (const m of reds) {
          lines++;
          const j = 'ABCD'.indexOf(m[1]), sj = want[r.opts[j].k](c, c.x0), P = [ux(+m[2]), uy(+m[3])], Q = [ux(+m[4]), uy(+m[5])];
          const sl = (Q[1] - P[1]) / (Q[0] - P[0]), mid = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
          if (m[6] !== '#e5484d' || Math.abs(sl - sj) > 0.02 * (1 + Math.abs(sj)) || Math.abs(mid[0] - c.x0) > 0.01 || Math.abs(mid[1] - y(c, c.x0)) > 0.01 * span + 0.02) fail('productpick', key, `the red line ${m[1]} is not ${texts[j]} through the point`);
          const ang = s => Math.atan(s * Math.abs(ky) / kx) * 180 / Math.PI;
          if (Math.abs(ang(sj) - ang(want.right(c, c.x0))) < 10) fail('productpick', key, `the red line ${m[1]} looks too like the curve's own slope`);
        }
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('productpick', key, 'tapping a missed formula again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('productpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('productpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('productpick', key, 'no fresh curve after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'PRODUCT READER / 5 slopes picked') fail('productpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} is dy/dx, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('productpick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work} Here is a new curve. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('productpick', key, `after a pick: ${read()} | want That was it: ${work}`);
      prev = c;
    }
  }
  for (const k of ['both', 'minus', 'one', 'other']) if (!kinds[k]) fail('productpick', 'slips', `the slip ${k} is never offered`);
  for (const k of ['x2', 'x3', 'x', 'lin']) if (!fs_[k]) fail('productpick', 'deal', `f is never ${k}`);
  for (const k of ['sin', 'cos', 'exp', 'lin']) if (!gs[k]) fail('productpick', 'deal', `g is never ${k}`);
  if (slots.size !== 4) fail('productpick', 'deal', `the right formula only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('productpick', 'banner', `five slopes were picked ${fives} times, not 30`);
  return { rounds, misses, lines };
})();

/* Which dy/dx? The pick-a-formula round in the quotient rule workshop. Every
   formula on screen is read back as maths and evaluated: the quotient rule's
   must match a nudge of y itself, and each slip must be exactly the slip it
   is named as, worked here from f and g. g must keep clear of 0 across the
   picture, so y never breaks. The picture is read back off its own ticks: the
   curve must be y, and each red line must pass through the point with the
   slope of the formula it stands for. */
const quotPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Quot = {render(){ env.renders++; }};" +
    cut('const QuotPick = {', '/* ---------- The quotient workshop') + 'return QuotPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  // a formula as the player reads it, turned into a function of x
  const maths = t => {
    let e = t.replace(/eˣ/g, 'E(x)').replace(/(cos|sin) x/g, '$1(x)').replace(/cos\(/g, 'C(').replace(/sin\(/g, 'N(')
      .replace(/x²/g, '(x**2)').replace(/\)²/g, ')**2')
      .replace(/ · /g, '*').replace(/ \/ /g, '/').replace(/−/g, '-').replace(/(\d) ?(x|\(|[ECN])/g, '$1*$2').replace(/\)(\(|x|\d|[ECN])/g, ')*$1');
    if (/[^-+*/() \dxECN]/.test(e.replace(/\*\*/g, ''))) return null;
    try { const fn = new Function('x', 'E', 'C', 'N', 'return ' + e + ';'); return x => fn(x, Math.exp, Math.cos, Math.sin); } catch (er) { return null; }
  };
  // f and g, worked here from the round's own numbers
  const f = (c, x) => ({ x2: x * x, x: x, sin: Math.sin(x), lin: c.a * x + c.b })[c.f];
  const fp = (c, x) => ({ x2: 2 * x, x: 1, sin: Math.cos(x), lin: c.a })[c.f];
  const g = (c, x) => ({ exp: Math.exp(x), sq1: x * x + 1, lin: c.p * x + c.q })[c.g];
  const gp = (c, x) => ({ exp: Math.exp(x), sq1: 2 * x, lin: c.p })[c.g];
  const y = (c, x) => f(c, x) / g(c, x);
  const want = {
    right: (c, x) => (fp(c, x) * g(c, x) - f(c, x) * gp(c, x)) / g(c, x) ** 2,
    swap: (c, x) => (f(c, x) * gp(c, x) - fp(c, x) * g(c, x)) / g(c, x) ** 2,
    nosq: (c, x) => (fp(c, x) * g(c, x) - f(c, x) * gp(c, x)) / g(c, x),
    plus: (c, x) => (fp(c, x) * g(c, x) + f(c, x) * gp(c, x)) / g(c, x) ** 2,
    ratio: (c, x) => fp(c, x) / gp(c, x)
  };
  const near = (p, q) => Math.abs(p - q) <= 1e-7 * (1 + Math.abs(q));
  const xsOf = c => [-0.9, -0.4, 0.15, 0.6, 0.95].map(d => c.x0 + d);
  const lin = (a, b) => (a === 1 ? '' : ng(a)) + 'x' + (b < 0 ? ' − ' : ' + ') + Math.abs(b);
  const fT = c => ({ x2: 'x²', x: 'x', sin: 'sin x', lin: c.f === 'lin' ? lin(c.a, c.b) : '' })[c.f];
  const gT = c => ({ exp: 'eˣ', sq1: 'x² + 1', lin: c.g === 'lin' ? lin(c.p, c.q) : '' })[c.g];
  const fpT = c => ({ x2: '2x', x: '1', sin: 'cos x', lin: String(c.a) })[c.f];
  const gpT = c => ({ exp: 'eˣ', sq1: '2x', lin: String(c.p) })[c.g];
  const read = () => txt(S.html().split('id="qpRead"')[1].replace(/^[^>]*>/, ''));
  const num = v => { const r = Math.round(v * 100) / 100; return ng(Object.is(r, -0) ? 0 : r); };
  if (S.RULE !== 'The quotient rule: if y = f(x) / g(x), then dy/dx = (f′g − fg′) / g². The top growing lifts y and the bottom growing pulls it down, and the whole is over g squared. Which formula is dy/dx?') fail('quotpick', 'rule', 'the rule is not stated');
  if (S.round !== null || S.matched !== 0) fail('quotpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, lines = 0;
  const slots = new Set(), kinds = {}, fs_ = {}, gs = {};
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`, XS = xsOf(c);
      rounds++; fs_[c.f] = (fs_[c.f] || 0) + 1; gs[c.g] = (gs[c.g] || 0) + 1;
      const fair = ['x2', 'x', 'sin', 'lin'].includes(c.f) && ['exp', 'sq1', 'lin'].includes(c.g) && !(c.f === 'lin' && c.g === 'lin')
        && (c.f === 'lin' ? [1, 2, 3].includes(c.a) && Number.isInteger(c.b) && c.b && Math.abs(c.b) <= 3 : c.a === 0 && c.b === 0)
        && (c.g === 'lin' ? [1, 2, 3].includes(c.p) && Number.isInteger(c.q) && c.q && Math.abs(c.q) <= 3 : c.p === 0 && c.q === 0)
        && [-1, -0.5, 0.5, 1].includes(c.x0);
      if (!fair) fail('quotpick', key, `the curve ${JSON.stringify(c)} is not a fair one`);
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('quotpick', key, 'the same curve comes twice in a row');
      { let lo = Infinity, hi = -Infinity, gmin = Infinity;
        for (let j = 0; j <= 200; j++) { const x = c.x0 - 1 + j / 100, v = y(c, x); lo = Math.min(lo, v); hi = Math.max(hi, v); gmin = Math.min(gmin, Math.abs(g(c, x))); }
        if (gmin < 0.75) fail('quotpick', key, `g comes within ${gmin.toFixed(2)} of 0 in the picture, so y nearly breaks`);
        if (hi - lo > 40.5) fail('quotpick', key, `y runs ${(hi - lo).toFixed(1)} tall, too squashed to read a slope off`); }
      // y as written is y, and the quotient rule's formula matches a nudge of it
      const yT = S.yText(c), wantY = ({ x2: 'x²', x: 'x', sin: '(sin x)', lin: '(' + fT(c) + ')' })[c.f] + ' / ' + (c.g === 'exp' ? 'eˣ' : '(' + gT(c) + ')');
      if (yT !== wantY) fail('quotpick', key, `y is written ${yT}, not ${wantY}`);
      const yf = maths(yT);
      if (!yf || XS.some(x => !near(yf(x), y(c, x)))) fail('quotpick', key, `${yT} does not read back as y`);
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('quotpick', key, 'there are not four formulas, one of them right');
      const texts = r.opts.map(o => S.text(c, o.k));
      if (new Set(texts).size !== 4) fail('quotpick', key, 'two formulas are written the same');
      const fns = texts.map(maths);
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('quotpick', key, `an option is the unknown ${o.k}`); return; }
        if (!fns[i]) { fail('quotpick', key, `${texts[i]} does not read as maths`); return; }
        if (XS.some(x => !near(fns[i](x), want[o.k](c, x)))) fail('quotpick', key, `${o.k} is written ${texts[i]}, which is not that slip`);
        if (XS.some(x => !near(S.value(c, o.k, x), want[o.k](c, x)))) fail('quotpick', key, `${o.k} is worked wrong`);
        if (/(^|[^\d])1 · | · 1($|[^\d])|\+ −|− −|−\(−/.test(texts[i])) fail('quotpick', key, `${texts[i]} is written untidily`);
        if (/\d · x|\d · \(|\d · e/.test(texts[i])) fail('quotpick', key, `${texts[i]} puts a · between a number and x, eˣ or a bracket`);
        if (/ · \d+( |\)|$)/.test(texts[i])) fail('quotpick', key, `${texts[i]} puts a number after what it multiplies`);
        if (/\/ (\d+x|[a-z]+ x)/.test(texts[i])) fail('quotpick', key, `${texts[i]} leaves a product bare under the line, so it reads the wrong way`);
        if (/\/ 1$|^[^x]*$/.test(texts[i])) fail('quotpick', key, `${texts[i]} shows no working`);
        if (/(^|[^\d.])1(?=[x(e]| sin| cos)/.test(texts[i])) fail('quotpick', key, `${texts[i]} writes a 1 in front of what it multiplies`);
        if (/\d(sin|cos)/.test(texts[i])) fail('quotpick', key, `${texts[i]} runs a number into ${'sin or cos'}`);
        if (/ˣ²/.test(texts[i])) fail('quotpick', key, `${texts[i]} squares the power of eˣ, not eˣ itself`);
        if (o.k !== 'ratio' && !/^\(.+ [+−] .+\) \/ \S/.test(texts[i])) fail('quotpick', key, `${texts[i]} is not two parts over a bottom`);
      });
      // the quotient rule written as (f′g − fg′) / g², in that order
      const ri0 = r.opts.findIndex(o => o.k === 'right');
      if (!/^\(.+ − .+\) \/ .+²$/.test(texts[ri0])) fail('quotpick', key, `the quotient rule ${texts[ri0]} is not (f′g − fg′) / g²`);
      if (XS.some(x => Math.abs((y(c, x + 1e-5) - y(c, x - 1e-5)) / 2e-5 - want.right(c, x)) > 1e-4 * (1 + Math.abs(want.right(c, x))))) fail('quotpick', key, 'the quotient rule does not match a nudge of y');
      { const v = S.view(c), ag = s => Math.atan(s * (158 / (v.hi - v.lo)) / (266 / 2)) * 180 / Math.PI;
        r.opts.forEach((o, i) => { if (o.k !== 'right' && Math.abs(ag(want[o.k](c, c.x0)) - ag(want.right(c, c.x0))) < 10) fail('quotpick', key, `${texts[i]} looks too like the curve's own slope at x₀`); }); }
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (fns[i] && fns[j] && XS.every(x => near(fns[i](x), fns[j](x)))) fail('quotpick', key, `${texts[i]} and ${texts[j]} are the same slope`);
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ' y = ' + yT)) fail('quotpick', key, 'the rule and y are not shown first');
      const lab = `The curve y = ${yT} from x = ${ng(c.x0 - 1)} to x = ${ng(c.x0 + 1)}, with a point at x = ${ng(c.x0)}`;
      if (!h0.includes(`role="img" aria-label="${lab}">`)) fail('quotpick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="QuotPick\.choose\((\d)\)" aria-label="([ABCD]): dy\/dx = ([^"]+?)(\. Not the quotient rule)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== texts[i] || m[6] || m[7] !== 'ABCD'[i] || m[8] !== texts[i])) fail('quotpick', key, 'the four formulas are not offered as they are, A to D');
      // the picture, read back off its own ticks
      const pic = h => {
        const svg = h.split('id="qpFig"')[1].split('</svg>')[0];
        const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="10" fill="[^"]+" text-anchor="middle"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1], +m[2].replace('−', '-')]);
        const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="9"[^>]*>([^<]+)<\/text>/g)].map(m => [+m[1] - 3, +m[2].replace('−', '-')]);
        return { svg, xt, yt };
      };
      const { svg, xt, yt } = pic(h0);
      if (xt.length !== 5 || xt[0][1] !== c.x0 - 1 || xt[4][1] !== c.x0 + 1) { fail('quotpick', key, 'the ticks do not run from x₀ − 1 to x₀ + 1 in halves'); continue; }
      if (yt.length < 2 || yt.length > 8) { fail('quotpick', key, `there are ${yt.length} y ticks`); continue; }
      // every y label fits inside the picture: at 9px a character is about 5.2px wide, and an end-anchored label runs left from its x
      if ([...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9"[^>]*text-anchor="end"[^>]*>([^<]+)<\/text>/g)].some(m => +m[1] - 5.2 * [...m[2]].length < 1)) fail('quotpick', key, 'a y label runs off the left edge of the picture');
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      // the 10° rule measures angles as the picture draws them
      if (r.opts.some(o => Math.abs(S.angle(c, want[o.k](c, c.x0)) - Math.atan(want[o.k](c, c.x0) * Math.abs(ky) / kx) * 180 / Math.PI) > 0.2)) fail('quotpick', key, 'the 10° rule measures angles another way from the picture');
      if (!(kx > 0 && ky < 0)) fail('quotpick', key, 'the picture is drawn back to front or upside down');
      const ux = px => xt[0][1] + (px - xt[0][0]) / kx, uy = py => yt[0][1] + (py - yt[0][0]) / ky;
      const span = Math.abs((yt[yt.length - 1][1] - yt[0][1]) / (yt.length - 1)) * 8;
      if (JSON.stringify([...svg.matchAll(/font-weight="bold">([^<]+)</g)].map(m => +m[1].replace('−', '-'))) !== JSON.stringify([c.x0])) fail('quotpick', key, 'x₀ is not picked out on the axis');
      const curve = svg.match(/<path data-k="curve" d="([^"]+)"/);
      if (!curve) fail('quotpick', key, 'no curve is drawn');
      else for (const m of curve[1].matchAll(/([-\d.]+),([-\d.]+)/g)) { const x = ux(+m[1]), yy = uy(+m[2]); if (Math.abs(yy - y(c, x)) > 0.02 * span + 0.01) { fail('quotpick', key, `the curve passes (${x.toFixed(2)}, ${yy.toFixed(2)}), off y`); break; } }
      const pt = svg.match(/<circle data-k="point" cx="([-\d.]+)" cy="([-\d.]+)"/);
      if (!pt || Math.abs(ux(+pt[1]) - c.x0) > 0.01 || Math.abs(uy(+pt[2]) - y(c, c.x0)) > 0.01 * span + 0.01) fail('quotpick', key, 'the point is not on the curve at x₀');
      if (/data-k="miss/.test(svg)) fail('quotpick', key, 'a red line is drawn before any miss');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: f(x) = ')) fail('quotpick', key, `before a pick the readout says ${read()}`);
      const work = `f(x) = ${fT(c)} and g(x) = ${gT(c)}, so f′(x) = ${fpT(c)} and g′(x) = ${gpT(c)}: dy/dx = (f′g − fg′) / g² = ${texts[ri]}.`;
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('quotpick', key, 'a miss is counted, or not crossed off');
        const slip = {
          swap: `${L} takes f′g away from fg′: the top is the wrong way round, so it gives exactly minus the slope. f growing lifts y, so f′g comes first.`,
          nosq: `${L} divides by g once: the quotient rule divides by g², because the slope of 1/g is −g′/g².`,
          plus: `${L} adds fg′: that plus belongs to the product rule. When the bottom grows the fraction shrinks, so the quotient rule takes fg′ away.`,
          ratio: `${L} divides the slopes, f′ / g′: the slope of a fraction is not the fraction of the slopes.`
        }[o.k];
        const s0 = want[o.k](c, c.x0), H = 0.001, nudge = (y(c, c.x0 + H) - y(c, c.x0 - H)) / (2 * H);
        const r4 = v => ng(Math.round(v * 1e4) / 1e4);
        const check = `At x = ${ng(c.x0)}, ${L} gives a slope of ${Math.abs(s0 - Math.round(s0 * 100) / 100) < 1e-9 ? '' : 'about '}${num(s0)}, drawn in red: it cuts across the curve. A nudge from x = ${r4(c.x0 - H)} to ${r4(c.x0 + H)} gives Δy/Δx ≈ ${num(nudge)}.`;
        if (Math.abs(nudge - want.right(c, c.x0)) > 0.01 * (1 + Math.abs(want.right(c, c.x0)))) fail('quotpick', key, 'the nudge is not the curve\'s slope');
        const want2 = `${slip} ${check} ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('quotpick', key, `the miss is explained as: ${read()} | want ${want2}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="QuotPick\\.choose\\(${i}\\)" aria-label="${L}: dy/dx = [^"]+\\. Not the quotient rule"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('quotpick', key, 'the missed formulas are not shut and told as not the quotient rule');
        const outs = wrong.slice(0, q + 1).slice().sort();
        if (!h.includes(`${lab}; red lines through it with the slopes of ${outs.map(j => 'ABCD'[j]).join(' and ')}, cutting across the curve">`)) fail('quotpick', key, 'the red lines are not read out');
        // each red line goes through the point with its formula's slope, and looks wrong
        const sv = pic(h).svg, reds = [...sv.matchAll(/<line data-k="miss([ABCD])" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="([^"]+)"/g)];
        if (reds.map(m => m[1]).join() !== outs.map(j => 'ABCD'[j]).join()) fail('quotpick', key, `the red lines are ${reds.map(m => m[1])}`);
        for (const m of reds) {
          lines++;
          const j = 'ABCD'.indexOf(m[1]), sj = want[r.opts[j].k](c, c.x0), P = [ux(+m[2]), uy(+m[3])], Q = [ux(+m[4]), uy(+m[5])];
          const sl = (Q[1] - P[1]) / (Q[0] - P[0]), mid = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
          if (m[6] !== '#e5484d' || Math.abs(sl - sj) > 0.02 * (1 + Math.abs(sj)) || Math.abs(mid[0] - c.x0) > 0.01 || Math.abs(mid[1] - y(c, c.x0)) > 0.01 * span + 0.02) fail('quotpick', key, `the red line ${m[1]} is not ${texts[j]} through the point`);
          const ang = s => Math.atan(s * Math.abs(ky) / kx) * 180 / Math.PI;
          if (Math.abs(ang(sj) - ang(want.right(c, c.x0))) < 10) fail('quotpick', key, `the red line ${m[1]} looks too like the curve's own slope`);
        }
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('quotpick', key, 'tapping a missed formula again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('quotpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('quotpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('quotpick', key, 'no fresh curve after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'QUOTIENT READER / 5 slopes picked') fail('quotpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} is dy/dx, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('quotpick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work} Here is a new curve. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('quotpick', key, `after a pick: ${read()} | want That was it: ${work}`);
      prev = c;
    }
  }
  for (const k of ['swap', 'nosq', 'plus', 'ratio']) if (!kinds[k]) fail('quotpick', 'slips', `the slip ${k} is never offered`);
  for (const k of ['x2', 'x', 'sin', 'lin']) if (!fs_[k]) fail('quotpick', 'deal', `f is never ${k}`);
  for (const k of ['exp', 'sq1', 'lin']) if (!gs[k]) fail('quotpick', 'deal', `g is never ${k}`);
  if (slots.size !== 4) fail('quotpick', 'deal', `the right formula only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('quotpick', 'banner', `five slopes were picked ${fives} times, not 30`);
  return { rounds, misses, lines };
})();

/* One id, one element. The page looks every panel up by its id, so two
   elements that share one id mean the second is never found: whichever comes
   first in the page gets written to, even when it sits on a screen that is
   shut. Every id written in the file, in the page itself or in the HTML a
   script builds, is counted here. The only ids allowed twice are the ones
   whose copies are alternatives that fill the same slot, so only one of them
   is ever on the page: the lesson's figure and its Continue button, the two
   Try again buttons, the lock's answer box and the hero's main button. */
const idNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ALT = { afig: 2, contBtn: 2, tryAgain: 2, lockOut: 8, heroGo: 4 };
  const seen = {};
  for (const m of html.matchAll(/\bid="([A-Za-z][\w-]*)"/g)) seen[m[1]] = (seen[m[1]] || 0) + 1;
  let ids = 0;
  for (const [id, n] of Object.entries(seen)) {
    ids++;
    if (n > 1 && ALT[id] !== n) fail('ids', id, `the id ${id} is written ${n} times, so the page may write into the wrong one`);
  }
  for (const id of Object.keys(ALT)) if (!seen[id]) fail('ids', id, `the alternative id ${id} is gone, so the list of alternatives is stale`);
  // the eigenvalue detective and the chain rule's which-dy/dx keep apart
  for (const id of ['cpFig', 'cpRead']) if (seen[id] !== 1) fail('ids', id, `${id} is not the eigenvalue detective's alone`);
  return { ids };
})();

/* Which λ? The pick-a-pair round in the eigenvalue detective. Every matrix
   is solved here from its own entries, by the quadratic formula, and the
   eigenvalues must be two different whole numbers; A must not be
   triangular, or its diagonal would give them away. Every pair on screen is
   read back as two numbers and must be exactly the slip it is named as. The
   picture is read back off its own ticks: the blue curve must be
   det(A − λI) at every point it is drawn through, the gold rings must sit on
   the axis at the eigenvalues, and each red dot must sit on the curve at the
   number it stands for. */
const lamPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const mat = A => '[' + A.map(r => r.join(' ')).join('; ') + ']';" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', a:'#5aa9e6', b:'#f2c14e', c:'#57cc7a', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Detect = {render(){ env.renders++; }};" +
    cut('const LamPick = {', '/* ---------- The eigenvalue detective') + 'return LamPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : String(n));
  const num = s => +s.replace('−', '-');
  // a pair as the player reads it, turned back into its two numbers
  const pairOf = t => { const m = t.match(/^λ = (−?\d+) and (−?\d+)$/); return m && [num(m[1]), num(m[2])]; };
  const tr = A => A[0][0] + A[1][1], dt = A => A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const P = (A, l) => l * l - tr(A) * l + dt(A);
  // the eigenvalues, from the quadratic formula and nothing else
  const solve = A => { const t = tr(A), d = dt(A), q = t * t - 4 * d, s = Math.round(Math.sqrt(q));
    return q > 0 && s * s === q && (t + s) % 2 === 0 ? [(t - s) / 2, (t + s) / 2] : null; };
  const srt = w => [...w].sort((x, y) => x - y);
  const want = { right: c => c.roots, diag: c => srt([c.A[0][0], c.A[1][1]]), sign: c => srt(c.roots.map(x => -x)), trdet: c => srt([tr(c.A), dt(c.A)]) };
  const poly = A => { const t = tr(A), d = dt(A);
    return 'λ²' + (t === 0 ? '' : ` ${t > 0 ? '−' : '+'} ${Math.abs(t) === 1 ? '' : Math.abs(t)}λ`) + (d === 0 ? '' : ` ${d > 0 ? '+' : '−'} ${Math.abs(d)}`); };
  const fac = l => (l === 0 ? 'λ' : `(λ ${l > 0 ? '−' : '+'} ${Math.abs(l)})`);
  const work = c => { const [[a, b], [cc, d]] = c.A, [l, m] = c.roots;
    return `trace = ${ng(a)} + ${pn(d)} = ${ng(tr(c.A))} and det A = ${pn(a)}·${pn(d)} − ${pn(b)}·${pn(cc)} = ${ng(dt(c.A))}, so det(A − λI) = ${poly(c.A)} = ${fac(l)}${fac(m)}, which is 0 at λ = ${ng(l)} and λ = ${ng(m)}`; };
  const read = () => txt(S.html().split('id="lpRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'An eigenvalue is a λ where det(A − λI) = 0. For a 2×2 matrix that is λ² − (trace)λ + det A = 0, so the two eigenvalues add up to the trace a + d and multiply to det A = ad − bc. Which pair are the eigenvalues of A?') fail('lampick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('lampick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, dots = 0, halves = 0;
  const slots = new Set(), kinds = {}, pairs = new Set(), mats = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = { A: r.c.A, roots: solve(r.c.A) }, key = `seed ${seed} round ${k}`;
      rounds++;
      if (!c.A.flat().every(x => Number.isInteger(x) && Math.abs(x) <= 9)) fail('lampick', key, `A has an entry that is not a whole number from −9 to 9`);
      if (!c.A[0][1] || !c.A[1][0]) fail('lampick', key, 'A is triangular, so its eigenvalues sit on its diagonal');
      if (!c.roots) { fail('lampick', key, `A = ${JSON.stringify(c.A)} does not have two different whole eigenvalues`); continue; }
      if (JSON.stringify(c.roots) !== JSON.stringify(srt(r.c.lam))) fail('lampick', key, `the round says the eigenvalues are ${r.c.lam}, but A has ${c.roots}`);
      if (prev && JSON.stringify(prev) === JSON.stringify(r.c)) fail('lampick', key, 'the same matrix comes twice in a row');
      pairs.add(c.roots.join()); mats.add(JSON.stringify(c.A));
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('lampick', key, 'there are not four pairs, one of them right');
      const texts = r.opts.map(o => S.text(r.c, o.k)), got = texts.map(pairOf);
      if (new Set(texts).size !== 4) fail('lampick', key, 'two pairs are written the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('lampick', key, `an option is the unknown ${o.k}`); return; }
        if (!got[i]) { fail('lampick', key, `${texts[i]} does not read as two numbers`); return; }
        if (got[i].join() !== want[o.k](c).join()) fail('lampick', key, `${o.k} is written ${texts[i]}, which is not that slip`);
        if (got[i][0] >= got[i][1]) fail('lampick', key, `${texts[i]} does not name two different numbers, smaller first`);
        if (o.k !== 'right' && got[i].every(x => P(c.A, x) === 0)) fail('lampick', key, `${texts[i]} are the eigenvalues too`);
        if (o.k !== 'right' && got[i].some(x => P(c.A, x) === 0)) halves++;
      });
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html();
      if (!txt(h0).startsWith(`${S.RULE} A = [${c.A.map(w => w.join(' ')).join('; ')}]`)) fail('lampick', key, 'the rule and A are not shown first');
      const rows = `A has rows ${ng(c.A[0][0])}, ${ng(c.A[0][1])} and ${ng(c.A[1][0])}, ${ng(c.A[1][1])}`;
      if (!h0.includes(`aria-label="${rows}"`)) fail('lampick', key, 'A is not read out');
      if (/id="lpFig"/.test(h0)) fail('lampick', key, 'the curve is drawn before any miss, which would show the answer');
      const btns = [...h0.matchAll(/data-opt="([PQRS])" (disabled )?onclick="LamPick\.choose\((\d)\)" aria-label="([PQRS]): ([^"]+?)(\. Not the eigenvalues)?"[^>]*><b>([PQRS])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'PQRS'[i] || m[2] || +m[3] !== i || m[4] !== 'PQRS'[i] || m[5] !== texts[i] || m[6] || m[7] !== 'PQRS'[i] || m[8] !== texts[i])) fail('lampick', key, 'the four pairs are not offered as they are, A to D');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: ')) fail('lampick', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'PQRS'[i], m0 = S.matched, nt = env.toasts.length, r0 = env.renders;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt || env.renders !== r0 + 1) fail('lampick', key, 'a miss is counted, not crossed off, or not redrawn');
        const [l, m] = c.roots, [x, y] = want[o.k](c), A = c.A;
        const slip = {
          diag: `${L} reads the eigenvalues off the diagonal, ${ng(A[0][0])} and ${ng(A[1][1])}. That only works when A is triangular. Here neither number off the diagonal is 0, so det(A − λI) is (a − λ)(d − λ) − bc, and the − bc moves the roots.`,
          sign: `${L} flips the sign of the trace term, solving λ² + (trace)λ + det A = 0, and so gets ${ng(-m)} and ${ng(-l)}, each eigenvalue turned round. Opening up det(A − λI) gives − (a + d)λ, with a minus.`,
          trdet: `${L} takes the trace and the determinant themselves, ${ng(tr(A))} and ${ng(dt(A))}. Those are what the two eigenvalues add up to and multiply to, not the eigenvalues.`
        }[o.k];
        const px = P(A, x), py = P(A, y);
        const at = px === 0 ? `At λ = ${ng(x)}, det(A − λI) = 0, so ${ng(x)} is one eigenvalue, but at λ = ${ng(y)} it is ${ng(py)}: ${L} gets only one of the two, and its other red dot sits off the axis.`
          : py === 0 ? `At λ = ${ng(y)}, det(A − λI) = 0, so ${ng(y)} is one eigenvalue, but at λ = ${ng(x)} it is ${ng(px)}: ${L} gets only one of the two, and its other red dot sits off the axis.`
          : `At λ = ${ng(x)}, det(A − λI) = ${ng(px)}, and at λ = ${ng(y)} it is ${ng(py)}: neither is 0, so ${L}'s red dots sit off the axis.`;
        const want2 = `${slip} ${at} ${work(c)}. Check: ${ng(l)} + ${pn(m)} = ${ng(l + m)} is the trace and ${pn(l)} × ${pn(m)} = ${ng(l * m)} is det A. ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('lampick', key, `the miss is explained as: ${read()} | want ${want2}`);
        if (l + m !== tr(A) || l * m !== dt(A)) fail('lampick', key, 'the eigenvalues do not add up to the trace and multiply to det A');
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="LamPick\\.choose\\(${i}\\)" aria-label="${L}: [^"]+\\. Not the eigenvalues"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('lampick', key, 'the missed pairs are not shut and told as not the eigenvalues');
        const outs = wrong.slice(0, q + 1).slice().sort();
        if (!h.includes(`role="img" aria-label="det(A − λI) = ${poly(A)} in blue against λ, meeting the axis at the gold rings, λ = ${ng(l)} and ${ng(m)}; red dots for ${outs.map(j => 'PQRS'[j]).join(' and ')}">`)) fail('lampick', key, 'the curve is not read out');
        // the picture, read back off its own ticks
        const svg = (h.split('id="lpFig"')[1] || '').split('</svg>')[0];
        const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="10" fill="[^"]+" text-anchor="middle">([^<]+)<\/text>/g)].map(mm => [+mm[1], num(mm[2])]);
        const yt = [...svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" font-size="9" fill="[^"]+" text-anchor="end">([^<]+)<\/text>/g)].map(mm => [+mm[2] - 3, num(mm[3]), +mm[1], mm[3]]);
        if (xt.length < 2 || yt.length < 2 || !yt.some(p => p[1] === 0)) { fail('lampick', key, 'the axes are not marked, or 0 is not marked on the det axis'); continue; }
        if (yt.some(p => p[2] - 5.2 * [...p[3]].length < 1)) fail('lampick', key, 'a label runs off the left edge of the picture');
        const xe = xt[xt.length - 1], ye = yt[yt.length - 1], kx = (xe[0] - xt[0][0]) / (xe[1] - xt[0][1]), ky = (ye[0] - yt[0][0]) / (ye[1] - yt[0][1]);
        if (!(kx > 0 && ky < 0)) fail('lampick', key, 'the curve is drawn back to front or upside down');
        const ux = px => xt[0][1] + (px - xt[0][0]) / kx, uy = py => yt[0][1] + (py - yt[0][0]) / ky;
        const all = Object.keys(want).flatMap(kk => want[kk](c)), x0 = Math.min(...all) - 1, x1 = Math.max(...all) + 1;
        const yr = Math.abs(yt[yt.length - 1][1] - yt[0][1]);
        const path = (svg.match(/<path data-k="curve" d="([^"]+)" fill="none" stroke="#5aa9e6"/) || [])[1];
        const pts = path ? [...path.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(mm => [ux(+mm[1]), uy(+mm[2])]) : [];
        if (pts.length !== 81) fail('lampick', key, `the curve is drawn through ${pts.length} points, not 81`);
        else pts.forEach((p, j) => { const lx = x0 + (x1 - x0) * j / 80;
          if (Math.abs(p[0] - lx) > 0.01 * (x1 - x0) || Math.abs(p[1] - P(A, lx)) > 0.005 * yr) fail('lampick', key, `the curve at λ = ${lx.toFixed(2)} is drawn at ${p[1].toFixed(2)}, not det(A − λI) = ${P(A, lx).toFixed(2)}`); });
        const rings = [...svg.matchAll(/<circle data-k="root" cx="([-\d.]+)" cy="([-\d.]+)" r="6" fill="none" stroke="#f2c14e"/g)].map(mm => [ux(+mm[1]), uy(+mm[2])]);
        if (rings.length !== 2 || rings.some((p, j) => Math.abs(p[0] - c.roots[j]) > 0.02 || Math.abs(p[1]) > 0.005 * yr)) fail('lampick', key, 'the gold rings do not sit on the axis at the eigenvalues');
        const drawn = [...new Set([...svg.matchAll(/data-k="miss-([PQRS])"/g)].map(mm => mm[1]))];
        if (drawn.join() !== outs.map(j => 'PQRS'[j]).join()) fail('lampick', key, `the red dots are for ${drawn}`);
        for (const j of outs) {
          const Lj = 'PQRS'[j], w = want[r.opts[j].k](c);
          const ds = [...svg.matchAll(new RegExp(`<circle data-k="miss-${Lj}" cx="([-\\d.]+)" cy="([-\\d.]+)" r="4" fill="#e5484d"/><text[^>]*>${Lj}</text>`, 'g'))].map(mm => [ux(+mm[1]), uy(+mm[2])]);
          dots += ds.length;
          if (ds.length !== 2 || ds.some((p, z) => Math.abs(p[0] - w[z]) > 0.02 || Math.abs(p[1] - P(A, w[z])) > 0.005 * yr)) fail('lampick', key, `${Lj}'s red dots do not sit on the curve at ${w}`);
        }
        const r1 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r1) fail('lampick', key, 'tapping a missed pair again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('lampick', key, 'a pick does not redraw the detective');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('lampick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('lampick', key, 'no fresh matrix after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'EIGENVALUE READER / 5 pairs picked') fail('lampick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'PQRS'[ri]} are the eigenvalues, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('lampick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work(c)}. Here is a new matrix. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('lampick', key, `after a pick: ${read()}`);
      prev = r.c;
    }
  }
  // a matrix dealt twice running is dealt again: build is made to repeat itself
  { const real = S.build; env.seed = 4242; S.round = null; S.start(); const c0 = S.round.c; let n = 0;
    S.build = function () { return n++ < 3 ? JSON.parse(JSON.stringify(c0)) : real.call(S); };
    S.newRound(); S.build = real;
    if (JSON.stringify(S.round.c) === JSON.stringify(c0)) fail('lampick', 'repeat', 'the same matrix is dealt twice in a row'); }
  for (const k of ['diag', 'sign', 'trdet']) if (!kinds[k]) fail('lampick', 'slips', `the slip ${k} is never offered`);
  if (slots.size !== 4) fail('lampick', 'deal', `the right pair only ever sits at ${[...slots].sort().map(i => 'PQRS'[i]).join(', ')}`);
  if (pairs.size < 12) fail('lampick', 'deal', `only ${pairs.size} pairs of eigenvalues ever come up`);
  if (mats.size < 80) fail('lampick', 'deal', `only ${mats.size} matrices ever come up`);
  if (!halves) fail('lampick', 'deal', 'no slip ever happens to share one eigenvalue, so that explanation is never tried');
  if (fives !== 30) fail('lampick', 'banner', `five pairs were picked ${fives} times, not 30`);
  return { rounds, misses, dots, pairs: pairs.size };
})();

/* Which mix? The pick-a-mix round in the span workshop. Every mix on screen
   is read back as amounts of u and v and worked here: the right one must land
   on the ring and each slip must be exactly the slip it is named as. u and v
   must point different ways, so no two mixes land on the same point. The
   picture is read back off its own ticks: u, v and the ring must sit where
   the numbers say, and each red walk must go a lots of u, then b lots of v,
   to the point its mix really reaches. */
const spanPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', a:'#5aa9e6', b:'#f2c14e', c:'#57cc7a', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Span = {render(){ env.renders++; }};" +
    cut('const SpanPick = {', '/* ============ SPAN WORKSHOP') + 'return SpanPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const V = w => `⟨${ng(w[0])}, ${ng(w[1])}⟩`;
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : String(n));
  // a mix as the player reads it, turned back into its two amounts
  const amounts = t => {
    const m = t.match(/^(−?)(\d?)u (\+|−) (\d?)v$/);
    if (!m) return null;
    return [(m[1] ? -1 : 1) * (m[2] ? +m[2] : 1), (m[3] === '−' ? -1 : 1) * (m[4] ? +m[4] : 1)];
  };
  const at = (c, a, b) => [a * c.u[0] + b * c.v[0], a * c.u[1] + b * c.v[1]];
  const want = { right: c => [c.a, c.b], swap: c => [c.b, c.a], signa: c => [-c.a, c.b], signb: c => [c.a, -c.b], both: c => [-c.a, -c.b] };
  const read = () => txt(S.html().split('id="skRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'A mix a·u + b·v walks a lots of u, then b lots of v from where it stopped. A negative amount walks that arrow backwards. Which mix lands on the gold ring?') fail('spanpick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('spanpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, walks = 0;
  const slots = new Set(), kinds = {}, signs = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`, t = at(c, c.a, c.b);
      rounds++;
      const short = w => Number.isInteger(w[0]) && Number.isInteger(w[1]) && Math.abs(w[0]) <= 2 && Math.abs(w[1]) <= 2 && (w[0] || w[1]) && !(Math.abs(w[0]) === 2 && Math.abs(w[1]) === 2);
      if (!short(c.u) || !short(c.v)) fail('spanpick', key, `u = ${V(c.u)} or v = ${V(c.v)} is not a short whole arrow`);
      if (c.u[0] * c.v[1] - c.u[1] * c.v[0] === 0) fail('spanpick', key, 'u and v lie on one line, so the ring may be reached more than one way or not at all');
      if (c.u[0] * c.u[1] === 0 && c.v[0] * c.v[1] === 0) fail('spanpick', key, 'u and v both lie along the axes, so the amounts are just coordinates');
      if (![-2, -1, 1, 2].includes(c.a) || ![-2, -1, 1, 2].includes(c.b)) fail('spanpick', key, `the amounts ${c.a}, ${c.b} are not −2, −1, 1 or 2`);
      if (!t[0] && !t[1]) fail('spanpick', key, 'the ring sits on ⟨0, 0⟩');
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('spanpick', key, 'the same pair and ring come twice in a row');
      signs.add(Math.sign(c.a) + ',' + Math.sign(c.b));
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('spanpick', key, 'there are not four mixes, one of them right');
      const texts = r.opts.map(o => S.text(c, o.k));
      if (new Set(texts).size !== 4) fail('spanpick', key, 'two mixes are written the same');
      const amts = texts.map(amounts);
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('spanpick', key, `an option is the unknown ${o.k}`); return; }
        if (!amts[i]) { fail('spanpick', key, `${texts[i]} does not read as a mix of u and v`); return; }
        if (amts[i].join() !== want[o.k](c).join()) fail('spanpick', key, `${o.k} is written ${texts[i]}, which is not that slip`);
        if (S.amts(c, o.k).join() !== want[o.k](c).join()) fail('spanpick', key, `${o.k} is worked wrong`);
        if (/(^|[^\d])1[uv]/.test(texts[i])) fail('spanpick', key, `${texts[i]} writes a 1 in front of an arrow`);
        // every walk stays on the grid: its stop after u, and its end
        const [a, b] = want[o.k](c), mid = [a * c.u[0], a * c.u[1]], e = at(c, a, b);
        if ([...mid, ...e].some(z => Math.abs(z) > 5)) fail('spanpick', key, `${texts[i]} walks off the grid`);
        if (o.k !== 'right' && e[0] === t[0] && e[1] === t[1]) fail('spanpick', key, `${texts[i]} lands on the ring too`);
      });
      const ends = amts.filter(Boolean).map(p => at(c, ...p).join());
      if (new Set(ends).size !== 4) fail('spanpick', key, 'two mixes land on the same point');
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html();
      if (!txt(h0).startsWith(`${S.RULE} u = ${V(c.u)}, v = ${V(c.v)}, ring at ${V(t)}`)) fail('spanpick', key, 'the rule, the arrows and the ring are not shown first');
      const lab = `A grid from −6 to 6 with u = ${V(c.u)} in blue, v = ${V(c.v)} in green and a gold ring at ${V(t)}`;
      if (!h0.includes(`role="img" aria-label="${lab}">`)) fail('spanpick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="SpanPick\.choose\((\d)\)" aria-label="([ABCD]): ([^"]+?)(\. Not on the ring)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== texts[i] || m[6] || m[7] !== 'ABCD'[i] || m[8] !== texts[i])) fail('spanpick', key, 'the four mixes are not offered as they are, A to D');
      // the picture, read back off its own ticks
      const pic = h => {
        const svg = h.split('id="skFig"')[1].split('</svg>')[0];
        const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9" fill="[^"]+" text-anchor="middle">([^<]+)<\/text>/g)].map(m => [+m[1], +m[2].replace('−', '-')]);
        const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="9" fill="[^"]+" text-anchor="end">([^<]+)<\/text>/g)].map(m => [+m[1] - 3, +m[2].replace('−', '-')]);
        return { svg, xt, yt };
      };
      const { svg, xt, yt } = pic(h0);
      if (JSON.stringify(xt.map(p => p[1])) !== '[-4,-2,2,4]' || JSON.stringify(yt.map(p => p[1])) !== '[-4,-2,2,4]') { fail('spanpick', key, 'the axes are not marked at −4, −2, 2 and 4'); continue; }
      // every y label fits inside the picture
      if ([...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9"[^>]*text-anchor="end"[^>]*>([^<]+)<\/text>/g)].some(m => +m[1] - 5.2 * [...m[2]].length < 1)) fail('spanpick', key, 'a y label runs off the left edge of the picture');
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      if (!(kx > 0 && ky < 0) || Math.abs(kx + ky) > 0.01) fail('spanpick', key, 'the grid is drawn back to front, upside down or squashed');
      const ux = px => xt[0][1] + (px - xt[0][0]) / kx, uy = py => yt[0][1] + (py - yt[0][0]) / ky;
      const P = (x, y) => [ux(+x), uy(+y)], close = (p, q) => Math.abs(p[0] - q[0]) < 0.02 && Math.abs(p[1] - q[1]) < 0.02;
      const arrow = (s, name) => { const m = s.match(new RegExp(`<line data-k="${name}" x1="([-\\d.]+)" y1="([-\\d.]+)" x2="([-\\d.]+)" y2="([-\\d.]+)" stroke="([^"]+)" stroke-width="[\\d.]+"( stroke-dasharray="[^"]+")?/>`)); return m && { from: P(m[1], m[2]), to: P(m[3], m[4]), col: m[5], dash: !!m[6] }; };
      const au = arrow(svg, 'u'), av = arrow(svg, 'v');
      if (!au || !close(au.from, [0, 0]) || !close(au.to, c.u) || au.col !== '#5aa9e6' || au.dash) fail('spanpick', key, 'u is not drawn in blue from ⟨0, 0⟩ to where it should end');
      if (!av || !close(av.from, [0, 0]) || !close(av.to, c.v) || av.col !== '#57cc7a' || av.dash) fail('spanpick', key, 'v is not drawn in green from ⟨0, 0⟩ to where it should end');
      const ring = svg.match(/<circle data-k="ring" cx="([-\d.]+)" cy="([-\d.]+)" r="7" fill="none" stroke="#f2c14e"/);
      if (!ring || !close(P(ring[1], ring[2]), t)) fail('spanpick', key, 'the gold ring is not at the point the right mix reaches');
      if (/data-k="miss/.test(svg)) fail('spanpick', key, 'a red walk is drawn before any miss');
      if (!/<text[^>]*fill="#5aa9e6"[^>]*>u<\/text>/.test(svg) || !/<text[^>]*fill="#57cc7a"[^>]*>v<\/text>/.test(svg)) fail('spanpick', key, 'u and v are not named on the picture');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: ')) fail('spanpick', key, `before a pick the readout says ${read()}`);
      const work = kk => { const [a, b] = want[kk](c); return `${S.text(c, kk)} = ${pn(a)}·${V(c.u)} + ${pn(b)}·${V(c.v)} = ${V([a * c.u[0], a * c.u[1]])} + ${V([b * c.v[0], b * c.v[1]])} = ${V(at(c, a, b))}`; };
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('spanpick', key, 'a miss is counted, or not crossed off');
        const slip = {
          swap: `${L} swaps the amounts: it takes ${ng(c.b)} of u and ${ng(c.a)} of v. The amount in front of u says how far to walk along u, so the two are not interchangeable.`,
          signa: `${L} walks u the wrong way: it takes ${ng(-c.a)} of u, not ${ng(c.a)}. A minus in front of an amount turns that walk right round.`,
          signb: `${L} walks v the wrong way: it takes ${ng(-c.b)} of v, not ${ng(c.b)}. A minus in front of an amount turns that walk right round.`,
          both: `${L} turns both walks round, so it lands on the ring's mirror point through ⟨0, 0⟩: −(a·u + b·v) is the same mix walked backwards.`
        }[o.k];
        const want2 = `${slip} ${L} is ${work(o.k)}, drawn in red. The ring is at ${V(t)}. ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('spanpick', key, `the miss is explained as: ${read()} | want ${want2}`);
        if (o.k === 'both') { const e = at(c, ...want.both(c)); if (e[0] !== -t[0] || e[1] !== -t[1]) fail('spanpick', key, 'turning both walks round does not land on the mirror point'); }
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="SpanPick\\.choose\\(${i}\\)" aria-label="${L}: [^"]+\\. Not on the ring"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('spanpick', key, 'the missed mixes are not shut and told as not on the ring');
        const outs = wrong.slice(0, q + 1).slice().sort();
        if (!h.includes(`${lab}; red walks for ${outs.map(j => 'ABCD'[j]).join(' and ')}, each landing off the ring">`)) fail('spanpick', key, 'the red walks are not read out');
        // each red walk goes a lots of u from ⟨0, 0⟩, then b lots of v from there, and is marked where it ends
        const sv = pic(h).svg, drawn = [...sv.matchAll(/data-k="miss-u-([ABCD])"/g)].map(m => m[1]);
        if (drawn.join() !== outs.map(j => 'ABCD'[j]).join()) fail('spanpick', key, `the red walks are ${drawn}`);
        for (const j of outs) {
          walks++;
          const Lj = 'ABCD'[j], [a, b] = want[r.opts[j].k](c), mid = [a * c.u[0], a * c.u[1]], e = at(c, a, b);
          const w1 = arrow(sv, 'miss-u-' + Lj), w2 = arrow(sv, 'miss-v-' + Lj);
          if (!w1 || !close(w1.from, [0, 0]) || !close(w1.to, mid) || w1.col !== '#e5484d' || !w1.dash) fail('spanpick', key, `the red walk ${Lj} does not start with ${ng(a)} of u`);
          if (!w2 || !close(w2.from, mid) || !close(w2.to, e) || w2.col !== '#e5484d' || !w2.dash) fail('spanpick', key, `the red walk ${Lj} does not go on with ${ng(b)} of v`);
          const end = sv.match(new RegExp(`<circle data-k="end-${Lj}" cx="([-\\d.]+)" cy="([-\\d.]+)" r="4" fill="#e5484d"/><text[^>]*>${Lj}</text>`));
          if (!end || !close(P(end[1], end[2]), e)) fail('spanpick', key, `where ${Lj} lands is not marked with its letter`);
        }
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('spanpick', key, 'tapping a missed mix again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('spanpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('spanpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('spanpick', key, 'no fresh pair after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'SPAN READER / 5 mixes picked') fail('spanpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} lands on the ring, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('spanpick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work('right')}, right on the ring. Here is a new pair. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('spanpick', key, `after a pick: ${read()}`);
      prev = c;
    }
  }
  // a pair dealt twice running is dealt again: build is made to repeat itself
  { const real = S.build; env.seed = 4242; S.round = null; S.start(); const c0 = S.round.c; let n = 0;
    S.build = function () { return n++ < 3 ? JSON.parse(JSON.stringify(c0)) : real.call(S); };
    S.newRound(); S.build = real;
    if (JSON.stringify(S.round.c) === JSON.stringify(c0)) fail('spanpick', 'repeat', 'the same pair and ring are dealt twice in a row'); }
  for (const k of ['swap', 'signa', 'signb', 'both']) if (!kinds[k]) fail('spanpick', 'slips', `the slip ${k} is never offered`);
  if (signs.size !== 4) fail('spanpick', 'deal', `the amounts only ever have the signs ${[...signs].join(' ')}`);
  if (slots.size !== 4) fail('spanpick', 'deal', `the right mix only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('spanpick', 'banner', `five mixes were picked ${fives} times, not 30`);
  return { rounds, misses, walks };
})();
/* Which u·v? The pick-a-number round in the dot product workshop. Every
   number on screen is checked against the sum it stands for: the right one is
   u₁v₁ + u₂v₂ and each slip is exactly the slip it is named as, worked out
   in the readout from the numbers the player sees. The picture is read back
   off its own ticks: u and v must sit where the numbers say, and after a miss
   the gold shadow must be u dropped square onto v's line, pointing the way
   the sign of u·v says. */
const dotPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', a:'#5aa9e6', b:'#f2c14e', c:'#57cc7a', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Dot = {render(){ env.renders++; }};" +
    cut('const DotPick = {', '/* ============ DOT PRODUCT WORKSHOP') + 'return DotPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = t => +t.replace('−', '-');
  const V = w => `⟨${ng(w[0])}, ${ng(w[1])}⟩`;
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : String(n));
  // two products joined with a sign, worked as the readout should show them
  const sum = (x, y, s, X, Y) => `${x} ${s} ${y} = ${ng(X)} ${(s === '+') === (Y >= 0) ? '+' : '−'} ${Math.abs(Y)} = ${ng(s === '+' ? X + Y : X - Y)}`;
  const want = {
    right: ([a, b], [p, q]) => a * p + b * q, cross: ([a, b], [p, q]) => a * q + b * p,
    minus: ([a, b], [p, q]) => a * p - b * q, first: ([a, b], [p, q]) => a * p, det: ([a, b], [p, q]) => a * q - b * p
  };
  const read = () => txt(S.html().split('id="dpRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'u·v = u₁v₁ + u₂v₂: multiply first with first, second with second, and add. Its sign says how the arrows lean: together gives a positive number, apart a negative one, square to each other 0. Which number is u·v?') fail('dotpick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('dotpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, shadows = 0;
  const slots = new Set(), kinds = {}, signs = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`, d = want.right(c.u, c.v);
      rounds++;
      if ([...c.u, ...c.v].some(x => !Number.isInteger(x) || !x || Math.abs(x) > 3)) fail('dotpick', key, `u = ${V(c.u)} or v = ${V(c.v)} is not made of whole numbers from −3 to 3 without a 0`);
      if (c.u.join() === c.v.join()) fail('dotpick', key, 'u and v are the same arrow');
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('dotpick', key, 'the same pair comes twice in a row');
      signs.add(Math.sign(d));
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('dotpick', key, 'there are not four numbers, one of them right');
      const vals = r.opts.map(o => S.value(c, o.k));
      if (new Set(vals).size !== 4) fail('dotpick', key, 'two options are the same number');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) fail('dotpick', key, `an option is the unknown ${o.k}`);
        else if (vals[i] !== want[o.k](c.u, c.v)) fail('dotpick', key, `${o.k} is ${vals[i]}, which is not that slip`);
      });
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      const h0 = S.html();
      if (!txt(h0).startsWith(`${S.RULE} u = ${V(c.u)}, v = ${V(c.v)}`)) fail('dotpick', key, 'the rule and the arrows are not shown first');
      const lab = `A grid from −5 to 5 with u = ${V(c.u)} in blue and v = ${V(c.v)} in green`;
      if (!h0.includes(`role="img" aria-label="${lab}">`)) fail('dotpick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="DotPick\.choose\((\d)\)" aria-label="([ABCD]): u·v = ([^".]+)(\. Not u·v)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || num(m[5]) !== vals[i] || m[6] || m[7] !== 'ABCD'[i] || num(m[8]) !== vals[i])) fail('dotpick', key, 'the four numbers are not offered as they are, A to D');
      // the picture, read back off its own ticks
      const pic = h => h.split('id="dpFig"')[1].split('</svg>')[0];
      const svg = pic(h0);
      const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9" fill="[^"]+" text-anchor="middle">([^<]+)<\/text>/g)].map(m => [+m[1], num(m[2])]);
      const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="9" fill="[^"]+" text-anchor="end">([^<]+)<\/text>/g)].map(m => [+m[1] - 3, num(m[2])]);
      if (JSON.stringify(xt.map(p => p[1])) !== '[-4,-2,2,4]' || JSON.stringify(yt.map(p => p[1])) !== '[-4,-2,2,4]') { fail('dotpick', key, 'the axes are not marked at −4, −2, 2 and 4'); continue; }
      if ([...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="9"[^>]*text-anchor="end"[^>]*>([^<]+)<\/text>/g)].some(m => +m[1] - 5.2 * [...m[2]].length < 1)) fail('dotpick', key, 'a y label runs off the left edge of the picture');
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      if (!(kx > 0 && ky < 0) || Math.abs(kx + ky) > 0.01) fail('dotpick', key, 'the grid is drawn back to front, upside down or squashed');
      const P = (x, y) => [xt[0][1] + (+x - xt[0][0]) / kx, yt[0][1] + (+y - yt[0][0]) / ky];
      const close = (p, q, e = 0.02) => Math.abs(p[0] - q[0]) < e && Math.abs(p[1] - q[1]) < e;
      const line = (s, name) => { const m = s.match(new RegExp(`<line data-k="${name}" x1="([-\\d.]+)" y1="([-\\d.]+)" x2="([-\\d.]+)" y2="([-\\d.]+)" stroke="([^"]+)" stroke-width="([\\d.]+)"( stroke-dasharray="[^"]+")?`)); return m && { from: P(m[1], m[2]), to: P(m[3], m[4]), col: m[5], w: +m[6], dash: !!m[7] }; };
      const au = line(svg, 'u'), av = line(svg, 'v');
      if (!au || !close(au.from, [0, 0]) || !close(au.to, c.u) || au.col !== '#5aa9e6' || au.dash) fail('dotpick', key, 'u is not drawn in blue from ⟨0, 0⟩ to where its numbers say');
      if (!av || !close(av.from, [0, 0]) || !close(av.to, c.v) || av.col !== '#57cc7a' || av.dash) fail('dotpick', key, 'v is not drawn in green from ⟨0, 0⟩ to where its numbers say');
      if (!/<text[^>]*fill="#5aa9e6"[^>]*>u<\/text>/.test(svg) || !/<text[^>]*fill="#57cc7a"[^>]*>v<\/text>/.test(svg)) fail('dotpick', key, 'u and v are not named on the picture');
      if (/data-k="(shadow|drop|vline)"/.test(svg)) fail('dotpick', key, 'the shadow is drawn before any miss, giving the sign away');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: ')) fail('dotpick', key, `before a pick the readout says ${read()}`);
      const work = `u·v = ${sum(pn(c.u[0]) + '·' + pn(c.v[0]), pn(c.u[1]) + '·' + pn(c.v[1]), '+', c.u[0] * c.v[0], c.u[1] * c.v[1])}`;
      const n2 = c.v[0] ** 2 + c.v[1] ** 2, rt = Math.round(Math.sqrt(n2)), lv = rt * rt === n2 ? String(rt) : '√' + n2;
      const lean = d === 0 ? 'u·v is 0: the arrows stand square to each other, and u casts no shadow on v\'s line.'
        : `${d > 0 ? 'Positive: the arrows lean together' : 'Negative: the arrows lean apart'}, and the gold shadow of u on v's line ${d > 0 ? 'points along v' : 'points back against v'}. It is u·v / ‖v‖ = ${ng(d)} / ${lv} long${d < 0 ? ', the minus meaning backwards' : ''}.`;
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('dotpick', key, 'a miss is counted, or not crossed off');
        const [a, b] = c.u, [p, qq] = c.v;
        const slip = {
          cross: `${L} pairs the wrong parts: u₁v₂ + u₂v₁ = ${sum(pn(a) + '·' + pn(qq), pn(b) + '·' + pn(p), '+', a * qq, b * p)}. A dot product multiplies matching parts, first with first and second with second.`,
          minus: `${L} takes the second product away: u₁v₁ − u₂v₂ = ${sum(pn(a) + '·' + pn(p), pn(b) + '·' + pn(qq), '−', a * p, b * qq)}. Both products are added, whatever their signs.`,
          first: `${L} stops after the first product: u₁v₁ = ${pn(a)}·${pn(p)} = ${ng(a * p)}. The second parts count just as much: u₂v₂ = ${pn(b)}·${pn(qq)} = ${ng(b * qq)} still has to be added.`,
          det: `${L} is the determinant, u₁v₂ − u₂v₁ = ${sum(pn(a) + '·' + pn(qq), pn(b) + '·' + pn(p), '−', a * qq, b * p)}. That measures the area the arrows span, not how far they agree.`
        }[o.k];
        // each worked sum must come out at the number on the button
        const tail = slip.match(/= (−?\d+)\. /);
        if (!tail || num(tail[1]) !== vals[i]) fail('dotpick', key, `the slip ${o.k} is worked to ${tail && tail[1]}, not ${vals[i]}`);
        if (!work.endsWith('= ' + ng(d))) fail('dotpick', key, 'the right sum does not come out at u·v');
        const want2 = `${slip} ${L} is ${ng(vals[i])}, but ${work}. ${lean} ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (read() !== want2) fail('dotpick', key, `the miss is explained as: ${read()} | want ${want2}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="DotPick\\.choose\\(${i}\\)" aria-label="${L}: u·v = [^"]+\\. Not u·v"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('dotpick', key, 'the missed numbers are not shut and told as not u·v');
        const lab2 = lab + (d ? `; u's shadow on v's line in gold, pointing ${d > 0 ? 'along' : 'back against'} v` : '; u stands square to v and casts no shadow');
        if (!h.includes(`aria-label="${lab2}">`)) fail('dotpick', key, 'the shadow is not read out');
        // the shadow: u dropped square onto v's line, as long and as signed as u·v says
        const sv = pic(h), foot = [d * c.v[0] / n2, d * c.v[1] / n2];
        shadows++;
        const vl = line(sv, 'vline'), dr = line(sv, 'drop'), sh = line(sv, 'shadow');
        if (!vl || Math.abs((vl.to[0] - vl.from[0]) * c.v[1] - (vl.to[1] - vl.from[1]) * c.v[0]) > 0.05 || Math.abs(vl.from[0] * c.v[1] - vl.from[1] * c.v[0]) > 0.05) fail('dotpick', key, 'v\'s line is not drawn through ⟨0, 0⟩ along v');
        if (!dr || !close(dr.from, c.u) || !close(dr.to, foot)) fail('dotpick', key, 'the drop does not run from u\'s tip to its foot on v\'s line');
        else if (Math.abs((dr.to[0] - dr.from[0]) * c.v[0] + (dr.to[1] - dr.from[1]) * c.v[1]) > 0.05) fail('dotpick', key, 'the drop does not meet v\'s line square');
        if (d === 0 ? !!sh : (!sh || !close(sh.from, [0, 0]) || !close(sh.to, foot) || sh.col !== '#f2c14e' || sh.dash)) fail('dotpick', key, 'the gold shadow is not u\'s foot on v\'s line');
        else if (d && Math.sign(sh.to[0] * c.v[0] + sh.to[1] * c.v[1]) !== Math.sign(d)) fail('dotpick', key, 'the shadow points the wrong way along v');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('dotpick', key, 'tapping a missed number again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('dotpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('dotpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('dotpick', key, 'no fresh pair after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'DOT READER / 5 dot products picked') fail('dotpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} is u·v, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('dotpick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${work}. Here is a new pair. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('dotpick', key, `after a pick: ${read()}`);
      prev = c;
    }
  }
  for (const k of ['cross', 'minus', 'first', 'det']) if (!kinds[k]) fail('dotpick', 'slips', `the slip ${k} is never offered`);
  if (!signs.has(1) || !signs.has(-1) || !signs.has(0)) fail('dotpick', 'deal', `u·v only ever has the signs ${[...signs].join(' ')}`);
  if (slots.size !== 4) fail('dotpick', 'deal', `the right number only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('dotpick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, shadows };
})();

/* Which F? The pick-an-antiderivative round in the antiderivative workshop.
   Every F on screen is read back as a number times a power of x and checked
   against the slip it is named as, worked out here from f alone; the right
   one must have f as its slope, and no slip may. Each slope in the readout is
   worked again by the power rule from what the button shows. The picture is
   read back off its own ticks: the gold dashes must lie on f, and after a miss
   the red curve must lie on the slope of the F that was picked. */
const antiPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', a:'#5aa9e6', b:'#f2c14e', c:'#57cc7a', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    cut('const AntiPick = {', '/* ---------- The transpose workshop') + 'Anti.render = () => { env.renders++; }; return AntiPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = t => +t.replace('−', '-');
  // fractions as written on the page, read back to numbers
  const rd = t => { const m = t.match(/^(−?)(\d+)(?:\/(\d+))?$/); return m ? (m[1] ? -1 : 1) * m[2] / (m[3] || 1) : NaN; };
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  // read a written term back: 2x³, −x⁻¹, (3/2)x^(1/2), 5 → {k, p}
  const parse = s => {
    let m = s.match(/^(−?\d+(?:\/\d+)?)$/); if (m) return { k: rd(m[1]), p: 0 };
    m = s.match(/^(?:\((−?\d+\/\d+)\)|(−?\d*))x(?:\^\((−?\d+\/\d+)\)|([⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))?$/);
    if (!m) return null;
    const k = m[1] ? rd(m[1]) : m[2] === '' ? 1 : m[2] === '−' ? -1 : rd(m[2]);
    const p = m[3] ? rd(m[3]) : m[4] ? (m[4][0] === '⁻' ? -1 : 1) * +[...m[4].replace('⁻', '')].map(ch => SUP.indexOf(ch)).join('') : 1;
    return { k, p };
  };
  const same = (a, b) => Math.abs(a.k - b.k) < 1e-9 && Math.abs(a.p - b.p) < 1e-9;
  const d = t => (t.p === 0 ? { k: 0, p: 0 } : { k: t.k * t.p, p: t.p - 1 });
  const want = {
    right: (a, m) => ({ k: a, p: m }), nodiv: (a, m) => ({ k: a * m, p: m }), olddiv: (a, m) => ({ k: a * m / (m - 1), p: m }),
    deriv: (a, m) => ({ k: a * m * (m - 1), p: m - 2 }), mult: (a, m) => ({ k: a * m * m, p: m })
  };
  const read = () => txt(S.html().split('id="apRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'To undo a power of x, raise the power by one and divide by the new power: xⁿ has antiderivative xⁿ⁺¹/(n + 1). Check by taking the slope of F: it has to come back to f. Every F can carry a + C, which never changes its slope. Which F has slope f?') fail('antipick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('antipick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, fives = 0, curves = 0, negs = 0, thirds = 0;
  const slots = new Set(), kinds = {}, powers = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, c = r.c, key = `seed ${seed} round ${k}`, f = { k: c.a * c.m, p: c.m - 1 };
      rounds++; powers.add(c.m); if (c.a < 0) negs++;
      if (c.m === 0 || c.m === 1) fail('antipick', key, `F has the power ${c.m}, which leaves f as 1/x or a number`);
      if (!Number.isInteger(f.k) || !f.k) fail('antipick', key, `f's number in front is ${f.k}`);
      if (prev && JSON.stringify(prev) === JSON.stringify(c)) fail('antipick', key, 'the same f comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('antipick', key, 'there are not four F, one of them right');
      const h0 = S.html();
      const fs0 = h0.match(/font-weight:700;margin-bottom:4px">f\(x\) = ([^<]+)<\/div>/);
      if (!fs0 || !parse(fs0[1]) || !same(parse(fs0[1]), f)) fail('antipick', key, `f is written as ${fs0 && fs0[1]}`);
      if (!txt(h0).startsWith(`${S.RULE} f(x) = ${fs0 && fs0[1]}`)) fail('antipick', key, 'the rule and f are not shown first');
      const lab = `f(x) = ${fs0 && fs0[1]} dashed in gold, for x from 0.5 to 2.5`;
      if (!h0.includes(`role="img" aria-label="${lab}">`)) fail('antipick', key, 'the picture is not read out');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="AntiPick\.choose\((\d)\)" aria-label="([ABCD]): F\(x\) = ([^"]+?)(\. Its slope is not f)?"[^>]*><b>([ABCD])<\/b> ([^<]+)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== m[8] || m[6] || m[7] !== 'ABCD'[i])) { fail('antipick', key, 'the four F are not offered as they are, A to D'); continue; }
      const terms = btns.map(m => parse(m[8]));
      if (btns.some(m => /(^|[^\d/])−?1x/.test(m[8]))) fail('antipick', key, `a 1 in front is written out: ${btns.map(m => m[8]).join(' | ')}`);
      if (btns.some(m => /\/3\)/.test(m[8]))) thirds++;
      if (terms.some(t => !t)) { fail('antipick', key, `an F cannot be read back: ${btns.map(m => m[8]).join(' | ')}`); continue; }
      if (new Set(terms.map(t => t.k + ',' + t.p)).size !== 4) fail('antipick', key, 'two F are the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) fail('antipick', key, `an option is the unknown ${o.k}`);
        else if (!same(terms[i], want[o.k](c.a, c.m))) fail('antipick', key, `${o.k} is written ${btns[i][8]}, which is not that slip`);
        if ((o.k === 'right') !== same(d(terms[i]), f)) fail('antipick', key, `${btns[i][8]} ${o.k === 'right' ? 'does not have' : 'has'} slope f`);
      });
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      // the picture, read back off its own ticks
      const pic = h => h.split('id="apFig"')[1].split('</svg>')[0];
      const svg = pic(h0);
      const xt = [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" font-size="10" fill="[^"]+" text-anchor="middle">([^<]+)<\/text>/g)].map(m => [+m[1], num(m[2])]);
      const yt = [...svg.matchAll(/<text x="[-\d.]+" y="([-\d.]+)" font-size="10" fill="[^"]+" text-anchor="end">([^<]+)<\/text>/g)].map(m => [+m[1] - 3, num(m[2])]);
      if (JSON.stringify(xt.map(p => p[1])) !== '[1,2]' || yt.length !== 2 || yt[0][1] !== 0 || !yt[1][1]) { fail('antipick', key, 'the axes are not marked at 1 and 2 across and at 0 and one round number up'); continue; }
      const kx = (xt[1][0] - xt[0][0]) / (xt[1][1] - xt[0][1]), ky = (yt[1][0] - yt[0][0]) / (yt[1][1] - yt[0][1]);
      if (!(kx > 0 && ky < 0)) fail('antipick', key, 'the picture is drawn back to front or upside down');
      const P = (x, y) => [xt[0][1] + (+x - xt[0][0]) / kx, yt[0][1] + (+y - yt[0][0]) / ky];
      const span = 176 / -ky;
      if (Math.abs(yt[1][1]) > span) fail('antipick', key, `the round number ${yt[1][1]} is off the picture`);
      const curve = (s, name) => [...s.matchAll(new RegExp(`<polyline data-k="${name}" points="([^"]+)" fill="none" stroke="([^"]+)"`, 'g'))].map(m => ({ col: m[2], pts: m[1].split(' ').map(q => P(...q.split(','))) }));
      const onIt = (cs, t) => cs.length && cs.every(cv => cv.pts.every(([x, y]) => Math.abs(y - t.k * x ** t.p) < span * 0.01));
      const gold = curve(svg, 'target');
      if (!onIt(gold, f) || gold.some(cv => cv.col !== '#f2c14e')) fail('antipick', key, 'the gold dashes do not lie on f');
      if (gold.reduce((n, cv) => n + cv.pts.length, 0) < 100) fail('antipick', key, 'most of f is off the picture');
      if (/data-k="slope"/.test(svg)) fail('antipick', key, 'a red slope is drawn before any miss');
      if (k === 0 ? read() !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !read().startsWith('That was it: ')) fail('antipick', key, `before a pick the readout says ${read()}`);
      // each slope worked again from the F the player sees
      const work = (i) => { const t = terms[i], w = btns[i][8];
        if (t.p === 0) return `${w} is a number on its own, so its slope is 0`;
        const fr = v => { for (const q of [1, 2, 3, 4, 6, 8]) if (Math.abs(v * q - Math.round(v * q)) < 1e-9) return (v < 0 ? '−' : '') + (q === 1 ? Math.round(Math.abs(v)) : Math.round(Math.abs(v) * q) + '/' + q); };
        const pr = v => (v < 0 || !Number.isInteger(v) ? `(${fr(v)})` : fr(v));
        return `the slope of ${w} is ${pr(t.k)} · ${pr(t.p)}${t.p === 1 ? '' : ' · ' + S.T({ k: 1, p: t.p - 1 })} = `; };
      const slopeTxt = i => { const s = read().match(new RegExp(`${work(i).replace(/[()^.*+?[\]\\/]/g, '\\$&')}([^,]+),`)); return s && s[1]; };
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('antipick', key, 'a miss is counted, or not crossed off');
        const rt = read();
        const slip = { nodiv: `${L} raises the power to `, olddiv: `${L} divides by the old power, `, deriv: `${L} takes the slope of f instead of undoing it`, mult: `${L} multiplies by the new power, ` }[o.k];
        if (!rt.startsWith(slip)) fail('antipick', key, `${o.k} is explained as: ${rt}`);
        const frw = v => { for (const q of [1, 2, 3, 4, 6, 8]) if (Math.abs(v * q - Math.round(v * q)) < 1e-9) return (v < 0 ? '−' : '') + (q === 1 ? Math.round(Math.abs(v)) : Math.round(Math.abs(v) * q) + '/' + q); };
        if (o.k === 'olddiv' && !rt.startsWith(`${L} divides by the old power, ${frw(c.m - 1)}, instead of the new one, ${frw(c.m)}.`)) fail('antipick', key, `the old-power slip names the wrong powers: ${rt}`);
        if (!rt.includes(`Check ${L} by its slope: ${work(i)}`) || !rt.includes(`, which is not f. But ${work(ri)}`) || !rt.endsWith(`, which is f exactly. ${S.matched} picked this visit, ${S.firstTry} on the first try.`)) fail('antipick', key, `the miss is not checked by its slope: ${rt}`);
        const sw = slopeTxt(i), sr = slopeTxt(ri);
        if (terms[i].p !== 0 && (!sw || !parse(sw) || !same(parse(sw), d(terms[i])))) fail('antipick', key, `the slope of ${btns[i][8]} is worked to ${sw}`);
        if (!sr || !parse(sr) || !same(parse(sr), f)) fail('antipick', key, `the slope of the right F is worked to ${sr}`);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="AntiPick\\.choose\\(${i}\\)" aria-label="${L}: F\\(x\\) = [^"]+\\. Its slope is not f"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('antipick', key, 'the missed F are not shut and told as not having slope f');
        const ds = d(terms[i]);
        if (!h.includes(`aria-label="${lab}; the slope of ${L}, ${S.T(ds)}, in red, off f">`)) fail('antipick', key, 'the red slope is not read out');
        const red = curve(pic(h), 'slope');
        curves++;
        // the red curve may run off the picture, but where it is drawn it lies on F′, and somewhere it is clear of f
        const clip = red.every(cv => cv.pts.every(([x, y]) => Math.abs(y - (ds.p === 0 && ds.k === 0 ? 0 : ds.k * x ** ds.p)) < span * 0.01));
        if (red.some(cv => cv.col !== '#e5484d') || !clip) fail('antipick', key, 'the red curve does not lie on the slope of the F that was picked');
        if (red.length && red.every(cv => cv.pts.every(([x, y]) => Math.abs(y - f.k * x ** f.p) < span * 0.03))) fail('antipick', key, 'the red slope cannot be told apart from f');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('antipick', key, 'tapping a missed F again does something');
      }
      const rightWork = work(ri) + fs0[1];
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('antipick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('antipick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('antipick', key, 'no fresh f after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'ANTIDERIVATIVE READER / 5 antiderivatives picked') fail('antipick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} has slope f, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('antipick', key, `the toast is ${env.toasts[nt]}`); }
      if (read() !== `That was it: ${rightWork}, which is f. Here is a new one. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('antipick', key, `after a pick: ${read()} | want ${rightWork}`);
      prev = c;
    }
  }
  for (const k of ['nodiv', 'olddiv', 'deriv', 'mult']) if (!kinds[k]) fail('antipick', 'slips', `the slip ${k} is never offered`);
  if (!negs) fail('antipick', 'deal', 'f never has a minus in front');
  if (!thirds) fail('antipick', 'deal', 'no F is ever written in thirds');
  if (!powers.has(0.5) || !powers.has(1.5) || !powers.has(-1) || !powers.has(4)) fail('antipick', 'deal', `F only ever has the powers ${[...powers].join(' ')}`);
  if (slots.size !== 4) fail('antipick', 'deal', `the right F only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('antipick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, curves };
})();

/* Which Aᵀ? The pick-a-transpose round in the transpose workshop. Every
   matrix on screen is read back twice, from its button's name and from its
   cells, and checked against the slip it is named as, worked out here from A
   alone; the right one must be Aᵀ and no slip may be. After a miss the red
   cells must be exactly the entries out of place, and the check must name one
   of them truly. */
const transPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', a:'#5aa9e6', b:'#f2c14e', c:'#57cc7a', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    "const Transpose = {render(){ env.renders++; }};" +
    cut('const TransPick = {', '/* ---------- The transpose workshop') + 'return TransPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const num = t => +t.replace('−', '-');
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const T = A => A[0].map((_, j) => A.map(row => row[j]));
  const want = {
    right: A => T(A), copy: A => A.map(r => r.slice()),
    reshape: A => { const f = A.flat(), r = A.length; return T(A).map((row, p) => row.map((_, q) => f[p * r + q])); },
    anti: A => T(A).map(row => row.slice().reverse()).reverse(),
    rot: A => T(A).map(row => row.slice().reverse())
  };
  const eq = (M, N) => JSON.stringify(M) === JSON.stringify(N);
  // a grid on the page read back from its cells: its shape, its numbers and which cells are red
  const cells = h => {
    const g = h.match(/<span data-m="(\d)x(\d)" [^>]*>([\s\S]*?)<\/span><\/span>/); if (!g) return null;
    const M = Array.from({ length: +g[1] }, () => Array(+g[2]).fill(null)), bad = [];
    for (const c of (g[3] + '</span>').matchAll(/<span data-cell="(\d),(\d)"( data-bad="1")? style="([^"]*)">([^<]+)<\/span>/g)) {
      M[+c[1]][+c[2]] = num(c[5]);
      if (c[3]) { bad.push([+c[1], +c[2]]); if (!/border:1px solid #e5484d/.test(c[4])) return null; }
    }
    return M.flat().some(x => x === null) ? null : { M, bad };
  };
  const fromRows = s => s.split('; ').map(r => r.split(', ').map(num));
  const read = () => txt(S.html().split('id="txRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'The transpose Aᵀ turns each row of A into a column: the entry in row i, column j of A moves to row j, column i of Aᵀ. A wide matrix turns tall, and the main diagonal, where the row and column numbers match, stays put. Which matrix is Aᵀ?') fail('transpick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('transpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, reds = 0, fives = 0;
  const slots = new Set(), kinds = {}, shapes = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, A = r.A, key = `seed ${seed} round ${k}`;
      rounds++; shapes.add(A.length + 'x' + A[0].length);
      const flat = A.flat();
      if (new Set(flat).size !== flat.length || flat.some(x => !x || Math.abs(x) > 9 || !Number.isInteger(x))) fail('transpick', key, `A holds a repeat, a 0 or a big number: ${JSON.stringify(A)}`);
      if (prev && eq(prev, A)) fail('transpick', key, 'the same A comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('transpick', key, 'there are not four matrices, one of them right');
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ' A =')) fail('transpick', key, 'the rule and A are not shown first');
      const aBox = h0.split('id="txA"')[1].split('id="txPick"')[0];
      const aLab = aBox.match(/aria-label="A is (\d)×(\d), with rows ([^"]+)"/), aC = cells(aBox);
      if (!aLab || !eq(fromRows(aLab[3]), A) || +aLab[1] !== A.length || +aLab[2] !== A[0].length) fail('transpick', key, 'A is not read out as it is');
      if (!aC || !eq(aC.M, A) || aC.bad.length) fail('transpick', key, 'A is not drawn as it is');
      const diagCells = [...aBox.matchAll(/data-cell="(\d),(\d)" style="[^"]*border:1px solid var\(--gold-dk\)/g)].map(m => m[1] + m[2]);
      if (diagCells.join() !== Array.from({ length: Math.min(A.length, A[0].length) }, (_, i) => `${i}${i}`).join()) fail('transpick', key, `the gold edges are on ${diagCells.join()}, not the main diagonal`);
      const btns = h0.split('id="txPick"')[1].split('id="txRead"')[0].split('<button').slice(1);
      if (btns.length !== 4) { fail('transpick', key, 'four matrices are not offered'); continue; }
      const mats = btns.map((b, i) => {
        const m = b.match(/^ class="btn sm ghost smOpt" data-opt="([PQRS])" onclick="TransPick\.choose\((\d)\)" aria-label="([PQRS]): (\d)×(\d), with rows ([^"]+)" [^>]*><b>([PQRS])<\/b> /);
        if (!m || m[1] !== 'PQRS'[i] || +m[2] !== i || m[3] !== 'PQRS'[i] || m[7] !== 'PQRS'[i]) return null;
        const c = cells(b), L = fromRows(m[6]);
        if (!c || !eq(c.M, L) || c.bad.length || +m[4] !== L.length || +m[5] !== L[0].length) return null;
        return L;
      });
      if (mats.some(x => !x)) { fail('transpick', key, 'a matrix is not named and drawn as it is, A to D'); continue; }
      if (new Set(mats.map(x => JSON.stringify(x))).size !== 4) fail('transpick', key, 'two matrices are the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) fail('transpick', key, `an option is the unknown ${o.k}`);
        else if (!eq(mats[i], want[o.k](A))) fail('transpick', key, `${o.k} is drawn as ${JSON.stringify(mats[i])}, which is not that slip`);
        if ((o.k === 'right') !== eq(mats[i], T(A))) fail('transpick', key, `${JSON.stringify(mats[i])} ${o.k === 'right' ? 'is not' : 'is'} Aᵀ`);
      });
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      if (k === 0 && read() !== '0 picked this visit, 0 on the first try.') fail('transpick', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4, row1 = A[0].map(ng).join(', ');
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'PQRS'[i], M = mats[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('transpick', key, 'a miss is counted, or not crossed off');
        const rt = read();
        const sq = A.length === A[0].length;
        const slip = { copy: `${L} is A copied as it was${sq ? '.' : `, still ${A.length}×${A[0].length}.`}`, reshape: `${L} reads A across, row by row, and pours the entries into the ${A[0].length}×${A.length} shape`, anti: `${L} flips A across the other diagonal`, rot: `${L} turns A a quarter turn` }[o.k];
        if (!rt.startsWith(slip)) fail('transpick', key, `${o.k} is explained as: ${rt}`);
        if (o.k === 'copy' && !sq && !rt.includes(`becomes one of Aᵀ's ${A.length} columns, so Aᵀ is ${A[0].length}×${A.length}.`)) fail('transpick', key, `the copy slip gets the shape wrong: ${rt}`);
        const keep = `Row 1 of A reads ${row1} across, so column 1 of Aᵀ reads ${row1} down. ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        const same = M.length === A[0].length;
        if (!same) { if (!rt.includes(`${L} is ${M.length}×${M[0].length}, but Aᵀ is ${A[0].length}×${A.length}. ${keep}`)) fail('transpick', key, `the wrong shape is not checked: ${rt}`); }
        else {
          const ck = rt.match(new RegExp(`Check ${L} at row (\\d), column (\\d): it holds (−?\\d+)\\. That slot of Aᵀ takes the entry from row (\\d), column (\\d) of A, which is (−?\\d+)\\. `));
          if (!ck || !rt.endsWith(keep)) fail('transpick', key, `the miss is not checked against A: ${rt}`);
          else { const [p, qq] = [ck[1] - 1, ck[2] - 1];
            if (+ck[4] !== qq + 1 || +ck[5] !== p + 1 || num(ck[3]) !== M[p][qq] || num(ck[6]) !== A[qq][p] || M[p][qq] === A[qq][p]) fail('transpick', key, `the check names a slot that is not out of place: ${ck[0]}`); }
        }
        const h = S.html(), b = h.split('id="txPick"')[1].split('<button').slice(1)[i];
        if (!new RegExp(`^ class="btn sm ghost smOpt miss" data-opt="${L}" disabled onclick="TransPick\\.choose\\(${i}\\)" aria-label="${L}: [^"]+\\. Not Aᵀ"`).test(b) || (h.match(/ disabled /g) || []).length !== q + 1) fail('transpick', key, 'the missed matrices are not shut and told as not Aᵀ');
        const c = cells(b), T0 = T(A);
        const out = same ? M.flatMap((row, p) => row.map((x, qq) => [p, qq, x])).filter(([p, qq, x]) => x !== T0[p][qq]).map(([p, qq]) => p + ',' + qq) : [];
        if (!c || c.bad.map(x => x.join()).join() !== out.join()) fail('transpick', key, `the red cells are ${c && c.bad.map(x => x.join()).join(' ')}, not ${out.join(' ')}`);
        reds += out.length;
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('transpick', key, 'tapping a missed matrix again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('transpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('transpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('transpick', key, 'no fresh A after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'TRANSPOSE READER / 5 transposes picked') fail('transpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'PQRS'[ri]} is Aᵀ, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('transpick', key, `the toast is ${env.toasts[nt]}`); }
      const said = A.map((row, i) => `row ${i + 1} of A, ${row.map(ng).join(', ')}, stands as column ${i + 1}`).join(', and ');
      if (read() !== `That was it: ${said}. Here is a new one. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('transpick', key, `after a pick: ${read()}`);
      prev = A;
    }
  }
  { // the same A dealt again is turned away for a fresh one
    const real = S.build; let n = 0;
    S.build = () => (n++ < 3 ? [[1, 2], [3, 4]] : real.call(S));
    S.round = null; S.newRound(); S.newRound();
    if (JSON.stringify(S.round.A) === '[[1,2],[3,4]]') fail('transpick', 'repeat', 'the same A is dealt twice in a row');
    S.build = real;
  }
  for (const k of ['copy', 'reshape', 'anti', 'rot']) if (!kinds[k]) fail('transpick', 'slips', `the slip ${k} is never offered`);
  if (shapes.size !== 3) fail('transpick', 'deal', `A only ever comes as ${[...shapes].join(', ')}`);
  if (slots.size !== 4) fail('transpick', 'deal', `the right matrix only ever sits at ${[...slots].sort().map(i => 'PQRS'[i]).join(', ')}`);
  if (fives !== 30) fail('transpick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, reds };
})();

/* Which c? The pick-a-shadow round in the Gram–Schmidt workshop. Every
   number on screen is read back off its button and checked against the slip
   it is named as, worked out here from u₁ and u₂ alone as an exact fraction;
   the right one alone must leave w · u₁ = 0. Every dot product and every
   w · u₁ = u₂ · u₁ − c × (u₁ · u₁) in the readout is worked again from the
   numbers it shows, and the w the right pick shows must stand square to u₁. */
const gramPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    "const Gram = {render(){ env.renders++; }};" +
    cut('const GramPick = {', 'const Gram = {') + 'return GramPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : ng(n));
  const vec = w => `⟨${ng(w[0])}, ${ng(w[1])}⟩`;
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const fr = (p, q) => { if (q < 0) { p = -p; q = -q; } const g = gcd(p, q) || 1; return [p / g, q / g]; };
  const fst = f => (f[1] === 1 ? ng(f[0]) : `${ng(f[0])}/${f[1]}`);
  // a number as the readout writes it, read back as an exact fraction
  const rd = t => { const m = t.replace(/[()]/g, '').replace('−', '-').match(/^(-?\d+)(?:\/(\d+))?$/); return m ? fr(+m[1], m[2] ? +m[2] : 1) : null; };
  const eq = (f, g) => f && g && f[0] * g[1] === g[0] * f[1];
  // each option, worked out here from u₁ and u₂ alone
  const want = {
    right: P => fr(dot(P.u2, P.u1), dot(P.u1, P.u1)),
    flip: P => fr(dot(P.u1, P.u1), dot(P.u2, P.u1)),
    nodiv: P => fr(dot(P.u2, P.u1), 1),
    u2: P => fr(dot(P.u2, P.u1), dot(P.u2, P.u2)),
    sign: P => fr(-dot(P.u2, P.u1), dot(P.u1, P.u1))
  };
  const left = (P, f) => fr(dot(P.u2, P.u1) * f[1] - f[0] * dot(P.u1, P.u1), f[1]);   // w · u₁ for c = f
  const ct = f => (f[1] === 1 ? pn(f[0]) : `(${fst(f)})`);
  const dotsOf = P => [[P.u2, P.u1, 'u₂', 'u₁'], [P.u1, P.u1, 'u₁', 'u₁']].map(([p, q, a, b]) => `${a} · ${b} = ${ng(p[0])} × ${pn(q[0])} + ${pn(p[1])} × ${pn(q[1])} = ${ng(dot(p, q))}`).join(', and ');
  const restOf = (P, f) => `w · u₁ = u₂ · u₁ − c × (u₁ · u₁) = ${ng(dot(P.u2, P.u1))} − ${ct(f)} × ${dot(P.u1, P.u1)} = ${fst(left(P, f))}`;
  // every "p × q + r × s = t" and every "a − c × n = b" in a line, worked again from its own numbers
  const sums = (t, key) => { let n = 0;
    for (const m of t.matchAll(/(−?\d+) × (\(?−?\d+\)?) \+ (\(?−?\d+\)?) × (\(?−?\d+\)?) = (−?\d+)/g)) { n++; const f = i => +m[i].replace(/[()]/g, '').replace('−', '-');
      if (f(1) * f(2) + f(3) * f(4) !== f(5)) fail('grampick', key, `${m[0]} is worked wrong`); }
    for (const m of t.matchAll(/= (−?\d+) − (\(?−?\d+(?:\/\d+)?\)?) × (\d+) = (−?\d+(?:\/\d+)?)/g)) { n++; const a = rd(m[1]), c = rd(m[2]), b = rd(m[4]), nn = +m[3];
      if (!eq(fr(a[0] * c[1] - c[0] * nn, c[1]), b)) fail('grampick', key, `${m[0]} is worked wrong`); }
    return n; };
  const read = () => txt(S.html().split('id="gpRead"')[1].replace(/^[^>]*>/, ''));
  const slipOf = (k, L) => ({ flip: `${L} is (u₁ · u₁)/(u₂ · u₁), the fraction upside down. The shadow divides by u₁ · u₁, the arrow being taken away.`,
    nodiv: `${L} is u₂ · u₁ with nothing divided out. Each copy of u₁ lowers w · u₁ by u₁ · u₁, not by 1, so u₂ · u₁ still has to be divided by it.`,
    u2: `${L} divides by u₂ · u₂. The shadow is counted in copies of u₁, so it divides by u₁ · u₁.`,
    sign: `${L} is the right size with the wrong sign, as if u₂ · u₁ had come out the other way. It moves w the wrong way along u₁.` }[k]);
  if (S.RULE !== 'Take c copies of u₁ away from u₂, and what is left is w = u₂ − c·u₁. Each copy taken away lowers w · u₁ by u₁ · u₁, so w is at a right angle to u₁ when c = (u₂ · u₁)/(u₁ · u₁): the length of u₂\'s shadow on u₁, counted in copies of u₁. Which c is it?') fail('grampick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('grampick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, worked = 0, fives = 0, fracs = 0, wholes = 0;
  const slots = new Set(), kinds = {}, left4 = new Set(), sides = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, P = r.P, key = `seed ${seed} round ${k}`, dp = dot(P.u2, P.u1);
      rounds++;
      if ([...P.u1, ...P.u2].some(x => !Number.isInteger(x)) || P.u1.some(x => Math.abs(x) > 2) || P.u2.some(x => Math.abs(x) > 3) || (!P.u1[0] && !P.u1[1])) fail('grampick', key, `u₁ = ${vec(P.u1)}, u₂ = ${vec(P.u2)} are not small and whole`);
      if (!dp || P.u1[0] * P.u2[1] === P.u1[1] * P.u2[0]) fail('grampick', key, `u₂ = ${vec(P.u2)} is square to u₁ or along it`);
      if (want.right(P)[1] === 1) wholes++; else fracs++;
      if (prev && JSON.stringify(prev) === JSON.stringify(P)) fail('grampick', key, 'the same pair comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('grampick', key, 'there are not four numbers, one of them right');
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ` u₁ = ${vec(P.u1)}, u₂ = ${vec(P.u2)} P`)) fail('grampick', key, 'the rule and the pair are not shown first');
      const btns = [...h0.matchAll(/<button class="btn sm ghost smOpt" data-opt="([PQRS])" onclick="GramPick\.choose\((\d)\)" aria-label="([PQRS]): c = (−?\d+(?:\/\d+)?)" style="margin:0"><b>([PQRS])<\/b> c = (−?\d+(?:\/\d+)?)<\/button>/g)];
      if (btns.length !== 4 || btns.some((x, i) => x[1] !== 'PQRS'[i] || +x[2] !== i || x[3] !== 'PQRS'[i] || x[5] !== 'PQRS'[i] || x[4] !== x[6])) { fail('grampick', key, 'the four numbers are not offered as they are, P to S'); continue; }
      const vals = btns.map(x => rd(x[4]));
      if (vals.some(v => !v || fst(v) !== btns[vals.indexOf(v)][4])) fail('grampick', key, 'a number is not written in lowest terms');
      if (new Set(vals.map(fst)).size !== 4) fail('grampick', key, 'two numbers are the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('grampick', key, `an option is the unknown ${o.k}`); return; }
        if (!eq(vals[i], want[o.k](P))) fail('grampick', key, `${o.k} is shown as ${fst(vals[i])}, which is not that slip`);
        if ((o.k === 'right') !== (left(P, vals[i])[0] === 0)) fail('grampick', key, `c = ${fst(vals[i])} ${o.k === 'right' ? 'does not leave' : 'leaves'} w square to u₁`);
      });
      {
        const can = [], seen = new Set([fst(want.right(P))]);
        for (const s of ['flip', 'nodiv', 'u2', 'sign']) { const v = fst(want[s](P)); if (!seen.has(v)) { seen.add(v); can.push(s); } }
        if (can.length === 4) { const shown = r.opts.map(o => o.k); left4.add(can.find(s => !shown.includes(s))); }
        if (can.length < 3) fail('grampick', key, 'a pair with fewer than three slips is dealt'); }
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      if (k === 0 && read() !== '0 picked this visit, 0 on the first try.') fail('grampick', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'PQRS'[i], f = vals[i], m0 = S.matched, nt = env.toasts.length, lf = left(P, f);
        S.choose(i); misses++; sides.add(lf[0] > 0);
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('grampick', key, 'a miss is counted, or not crossed off');
        const rt = read();
        const ck = `Check ${L} the way the workshop checks w: ${dotsOf(P)}, so with c = ${fst(f)}, ${restOf(P, f)}, not 0: w ${lf[0] > 0 ? 'still leans along u₁' : 'leans back against u₁'}.`;
        if (rt !== `${slipOf(o.k, L)} ${ck} ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('grampick', key, `${o.k} is explained as: ${rt} | want ${slipOf(o.k, L)} ${ck}`);
        if (sums(rt, key) !== 3) fail('grampick', key, 'a miss does not work both dot products and w · u₁');
        worked += 3;
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="GramPick\\.choose\\(${i}\\)" aria-label="${L}: c = [^"]+\\. Not c"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('grampick', key, 'the missed numbers are not shut and told as not c');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('grampick', key, 'tapping a missed number again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('grampick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('grampick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('grampick', key, 'no fresh pair after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'SHADOW READER / 5 shadows picked') fail('grampick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'PQRS'[ri]} is c, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('grampick', key, `the toast is ${env.toasts[nt]}`); }
      const c = vals[ri], W = [0, 1].map(j => fr(P.u2[j] * c[1] - c[0] * P.u1[j], c[1])), raw = `${ng(dp)}/${dot(P.u1, P.u1)}`, rt = read();
      const after = `That was it: ${dotsOf(P)}, so c = ${raw}${fst(c) === raw ? '' : ' = ' + fst(c)}. Then ${restOf(P, c)}, and w = u₂ − ${ct(c)}·u₁ = ⟨${fst(W[0])}, ${fst(W[1])}⟩ stands at a right angle to u₁. Here is a new pair. ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
      if (rt !== after) fail('grampick', key, `after a pick: ${rt} | want ${after}`);
      if (sums(rt, key) !== 3 || !/ = 0, and w = /.test(rt)) fail('grampick', key, 'the right pick does not bring w · u₁ to 0');
      { const m = rt.match(/·u₁ = ⟨(−?\d+(?:\/\d+)?), (−?\d+(?:\/\d+)?)⟩ stands/), w = m && [rd(m[1]), rd(m[2])];
        if (!w || w[0][0] * w[1][1] * P.u1[0] + w[1][0] * w[0][1] * P.u1[1] !== 0) fail('grampick', key, 'the w shown is not square to u₁'); }
      worked += 3;
      prev = P;
    }
  }
  { // the same pair dealt again is turned away for a fresh one
    const real = S.build; let n = 0;
    S.build = () => (n++ < 3 ? { u1: [2, 1], u2: [3, 4] } : real.call(S));
    S.round = null; S.newRound(); S.newRound();
    if (JSON.stringify(S.round.P) === '{"u1":[2,1],"u2":[3,4]}') fail('grampick', 'repeat', 'the same pair is dealt twice in a row');
    S.build = real;
  }
  for (const k of ['flip', 'nodiv', 'u2', 'sign']) if (!kinds[k]) fail('grampick', 'slips', `the slip ${k} is never offered`);
  if (!fracs || !wholes) fail('grampick', 'deal', `c is ${fracs ? 'never' : 'always'} a whole number, which gives it away`);
  if (sides.size !== 2) fail('grampick', 'deal', 'a wrong c only ever leans one way');
  if (left4.size !== 4) fail('grampick', 'deal', `when a pair has four slips, only ${[...left4].join(', ')} are ever the one left out`);
  if (slots.size !== 4) fail('grampick', 'deal', `the right number only ever sits at ${[...slots].sort().map(i => 'PQRS'[i]).join(', ')}`);
  if (fives !== 30) fail('grampick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, worked, fracs };
})();

/* Which arrow is crushed? The pick-a-null-vector round in the null space
   workshop. Every arrow on screen is read back off its button and checked
   against the slip it is named as, worked out here from A alone; the right one
   alone must be sent to ⟨0, 0⟩. A miss is checked the way the workshop checks
   v, by dotting it with both rows, and every product is worked again. */
const nullPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    cut('function mat(rows){', 'const vec = a =>') +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    "const Kernel = {render(){ env.renders++; }};" +
    cut('const NullPick = {', 'const Kernel = {') + 'return NullPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = t => +t.replace('−', '-');
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : ng(n));
  const vec = w => `⟨${ng(w[0])}, ${ng(w[1])}⟩`;
  const app = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
  // each option, worked out here from A alone
  const want = {
    right: A => [-A[0][1], A[0][0]],
    row: A => [A[0][0], A[0][1]],
    noflip: A => [A[0][1], A[0][0]],
    noswap: A => [-A[0][0], A[0][1]],
    col: A => [1, A[1][0] / A[0][0]]
  };
  const dotsOf = (A, v, L) => { const p = app(A, v);
    return [0, 1].map(i => `${vec(A[i])} · ${L} = ${ng(A[i][0])} × ${pn(v[0])} + ${pn(A[i][1])} × ${pn(v[1])} = ${ng(p[i])}`).join(', and '); };
  // every "p × q + r × s = t" in a line, worked again from its own numbers
  const prods = (t, key) => { let n = 0; for (const m of t.matchAll(/(−?\d+) × (\(?−?\d+\)?) \+ (\(?−?\d+\)?) × (\(?−?\d+\)?) = (−?\d+)/g)) {
    n++; const f = i => num(m[i].replace(/[()]/g, ''));
    if (f(1) * f(2) + f(3) * f(4) !== f(5)) fail('nullpick', key, `${m[0]} is worked wrong`); } return n; };
  const cells = h => { const cols = [...h.matchAll(/<span class="col">((?:<span>[^<]*<\/span>)+)<\/span>/g)].map(c => [...c[1].matchAll(/<span>([^<]*)<\/span>/g)].map(x => num(x[1])));
    return cols.length === 2 && cols.every(c => c.length === 2) ? [[cols[0][0], cols[1][0]], [cols[0][1], cols[1][1]]] : null; };
  const read = () => txt(S.html().split('id="npRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'The second row of A is a multiple of the first, so A is flat: it crushes a whole line of arrows to ⟨0, 0⟩. To be crushed, v must dot to 0 with the first row ⟨a, b⟩, and then it dots to 0 with the second row too. Swap the entries and change one sign: ⟨−b, a⟩ works, since a × (−b) + b × a = 0. Which arrow does A crush?') fail('nullpick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('nullpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, worked = 0, fives = 0;
  const slots = new Set(), kinds = {}, left = new Set(), mults = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, A = r.A, key = `seed ${seed} round ${k}`;
      rounds++;
      const [a, b] = A[0], m = A[1][0] / a; mults.add(m);
      if (!a || !b || A[0].some(x => !Number.isInteger(x) || Math.abs(x) > 3) || ![-2, -1, 2].includes(m) || A[1][0] !== m * a || A[1][1] !== m * b) fail('nullpick', key, `A = ${JSON.stringify(A)} is not two small rows, the second −2, −1 or 2 times the first`);
      if (prev && JSON.stringify(prev) === JSON.stringify(A)) fail('nullpick', key, 'the same A comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('nullpick', key, 'there are not four arrows, one of them right');
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ' A =') || !h0.includes(`id="npA" style="text-align:center;margin-bottom:4px" aria-label="A has rows ${vec(A[0])} and ${vec(A[1])}">A = `)) fail('nullpick', key, 'the rule and A are not shown first');
      const shownA = cells(h0.split('id="npA"')[1].split('</div>')[0]);
      if (!shownA || JSON.stringify(shownA) !== JSON.stringify(A)) fail('nullpick', key, `A is drawn as ${JSON.stringify(shownA)}`);
      const btns = [...h0.matchAll(/<button class="btn sm ghost smOpt" data-opt="([PQRS])" onclick="NullPick\.choose\((\d)\)" aria-label="([PQRS]): ⟨(−?\d+), (−?\d+)⟩" style="margin:0"><b>([PQRS])<\/b> ⟨(−?\d+), (−?\d+)⟩<\/button>/g)];
      if (btns.length !== 4 || btns.some((x, i) => x[1] !== 'PQRS'[i] || +x[2] !== i || x[3] !== 'PQRS'[i] || x[6] !== 'PQRS'[i] || x[4] !== x[7] || x[5] !== x[8])) { fail('nullpick', key, 'the four arrows are not offered as they are, P to S'); continue; }
      const arrows = btns.map(x => [num(x[4]), num(x[5])]);
      if (new Set(arrows.map(v => v.join())).size !== 4) fail('nullpick', key, 'two arrows are the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('nullpick', key, `an option is the unknown ${o.k}`); return; }
        if (arrows[i].join() !== want[o.k](A).join()) fail('nullpick', key, `${o.k} is shown as ${vec(arrows[i])}, which is not that slip`);
        const p = app(A, arrows[i]), crushed = p[0] === 0 && p[1] === 0 && (arrows[i][0] || arrows[i][1]);
        if ((o.k === 'right') !== !!crushed) fail('nullpick', key, `${vec(arrows[i])} ${o.k === 'right' ? 'is not' : 'is'} crushed`);
      });
      {
        const can = []; const seen = new Set([want.right(A).join()]);
        for (const s of ['row', 'noflip', 'noswap', 'col']) { const v = want[s](A), p = app(A, v);
          if (!(p[0] === 0 && p[1] === 0) && !seen.has(v.join())) { seen.add(v.join()); can.push(s); } }
        if (can.length === 4) { const shown = r.opts.map(o => o.k); left.add(can.find(s => !shown.includes(s))); }
        if (can.length < 3) fail('nullpick', key, 'an A with fewer than three slips is dealt'); }
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      if (k === 0 && read() !== '0 picked this visit, 0 on the first try.') fail('nullpick', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'PQRS'[i], v = arrows[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('nullpick', key, 'a miss is counted, or not crossed off');
        const rt = read();
        const slip = { row: `${L} is the first row itself. A row dots with itself to a × a + b × b, which is never 0, so A never crushes its own rows.`,
          noflip: `${L} swaps the entries of ${vec(A[0])} but changes no sign. One of them has to change sign too, as in ⟨−b, a⟩.`,
          noswap: `${L} changes a sign but leaves the entries where they were. They have to swap places too, as in ⟨−b, a⟩.`,
          col: `${L} points along the line every Av lands on, the column space. The null space is the line A crushes, and that is a different line.` }[o.k];
        const ck = `Check ${L} the way the workshop checks v: ${dotsOf(A, v, L)}. So A sends ${L} to ${vec(app(A, v))}, not ⟨0, 0⟩.`;
        if (rt !== `${slip} ${ck} ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('nullpick', key, `${o.k} is explained as: ${rt} | want ${slip} ${ck}`);
        if (prods(rt, key) !== 2) fail('nullpick', key, 'a miss does not dot the arrow with both rows');
        worked += 2;
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="NullPick\\.choose\\(${i}\\)" aria-label="${L}: ⟨[^"]+⟩\\. Not crushed"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('nullpick', key, 'the missed arrows are not shut and told as not crushed');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('nullpick', key, 'tapping a missed arrow again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('nullpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('nullpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('nullpick', key, 'no fresh A after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'NULL SPACE READER / 5 crushed arrows picked') fail('nullpick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ A crushes ${'PQRS'[ri]}, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('nullpick', key, `the toast is ${env.toasts[nt]}`); }
      const v = arrows[ri], rt = read();
      const after = `That was it, v = ${vec(v)}: ${dotsOf(A, v, 'v')}. Every multiple of v is crushed too, so the null space is the whole line through ${vec(v)}. Here is a new A. ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
      if (rt !== after) fail('nullpick', key, `after a pick: ${rt} | want ${after}`);
      if (prods(rt, key) !== 2 || !/ = 0, and .* = 0\. Every/.test(rt)) fail('nullpick', key, 'the right pick does not dot to 0 with both rows');
      worked += 2;
      prev = A;
    }
  }
  { // the same A dealt again is turned away for a fresh one
    const real = S.build; let n = 0;
    S.build = () => (n++ < 3 ? [[1, 2], [2, 4]] : real.call(S));
    S.round = null; S.newRound(); S.newRound();
    if (JSON.stringify(S.round.A) === '[[1,2],[2,4]]') fail('nullpick', 'repeat', 'the same A is dealt twice in a row');
    S.build = real;
  }
  for (const k of ['row', 'noflip', 'noswap', 'col']) if (!kinds[k]) fail('nullpick', 'slips', `the slip ${k} is never offered`);
  if (mults.size !== 3) fail('nullpick', 'deal', `the second row is only ever ${[...mults].join(', ')} times the first`);
  if (left.size !== 4) fail('nullpick', 'deal', `when an A has four slips, only ${[...left].join(', ')} are ever the one left out`);
  if (slots.size !== 4) fail('nullpick', 'deal', `the right arrow only ever sits at ${[...slots].sort().map(i => 'PQRS'[i]).join(', ')}`);
  if (fives !== 30) fail('nullpick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, worked };
})();

/* Which A⁻¹? The pick-an-inverse round in the undo workshop. Every matrix on
   screen is read back from both its name and its cells, and checked against
   the slip it is named as, worked out here from A alone; the right one alone
   must send Aî and Aĵ home. A miss is checked the way the workshop checks B,
   on the first arrow that does not come home, and every product is worked
   again. */
const undoPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    cut('function mat(rows){', 'const vec = a =>') +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    "const Undo = {render(){ env.renders++; }};" +
    cut('const UndoPick = {', 'const Undo = {') + 'return UndoPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = t => +t.replace('−', '-');
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : ng(n));
  const vec = w => `⟨${ng(w[0])}, ${ng(w[1])}⟩`;
  const rows = M => `rows ${ng(M[0][0])}, ${ng(M[0][1])} and ${ng(M[1][0])}, ${ng(M[1][1])}`;
  const det = M => M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const mul = (M, N) => [[M[0][0] * N[0][0] + M[0][1] * N[1][0], M[0][0] * N[0][1] + M[0][1] * N[1][1]], [M[1][0] * N[0][0] + M[1][1] * N[1][0], M[1][0] * N[0][1] + M[1][1] * N[1][1]]];
  const isI = M => M[0][0] === 1 && M[0][1] === 0 && M[1][0] === 0 && M[1][1] === 1;
  // each option, worked out here from A alone
  const want = {
    right: ([[a, b], [c, d]]) => { const t = a * d - b * c; return [[d / t, -b / t], [-c / t, a / t]]; },
    noswap: ([[a, b], [c, d]]) => { const t = a * d - b * c; return [[a / t, -b / t], [-c / t, d / t]]; },
    noneg: ([[a, b], [c, d]]) => { const t = a * d - b * c; return [[d / t, b / t], [c / t, a / t]]; },
    trans: ([[a, b], [c, d]]) => [[a, c], [b, d]],
    nodiv: ([[a, b], [c, d]]) => [[d, -b], [-c, a]]
  };
  const z = M => M.map(r => r.map(x => x + 0));   // no −0
  const workOf = A => { const [[a, b], [c, d]] = A, t = det(A);
    return `det A = ${ng(a)}·${pn(d)} − ${pn(b)}·${pn(c)} = ${ng(t)}, so A⁻¹ = (1/${pn(t)})·[${ng(d)} ${ng(-b)}; ${ng(-c)} ${ng(a)}], with ${rows(z(want.right(A)))}`; };
  const sendOf = (M, A, j, L) => { const v = [A[0][j], A[1][j]], e = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
    return `${L} sends A${j ? 'ĵ' : 'î'} = ${vec(v)} to ⟨${ng(M[0][0])}·${pn(v[0])} + ${pn(M[0][1])}·${pn(v[1])}, ${ng(M[1][0])}·${pn(v[0])} + ${pn(M[1][1])}·${pn(v[1])}⟩ = ${vec(e)}`; };
  // every "⟨p·q + r·s, t·u + v·w⟩ = ⟨x, y⟩" in a line, worked again from its own numbers
  const sends = (t, key) => { let n = 0; for (const m of t.matchAll(/⟨(\(?−?\d+\)?)·(\(?−?\d+\)?) \+ (\(?−?\d+\)?)·(\(?−?\d+\)?), (\(?−?\d+\)?)·(\(?−?\d+\)?) \+ (\(?−?\d+\)?)·(\(?−?\d+\)?)⟩ = ⟨(−?\d+), (−?\d+)⟩/g)) {
    n++; const f = i => num(m[i].replace(/[()]/g, ''));
    if (f(1) * f(2) + f(3) * f(4) !== f(9) || f(5) * f(6) + f(7) * f(8) !== f(10)) fail('undopick', key, `${m[0]} is worked wrong`); } return n; };
  // a matrix as mat() draws it, read back cell by cell (it is drawn column by column)
  const cells = h => { const cols = [...h.matchAll(/<span class="col">((?:<span>[^<]*<\/span>)+)<\/span>/g)].map(c => [...c[1].matchAll(/<span>([^<]*)<\/span>/g)].map(x => num(x[1])));
    return cols.length === 2 && cols.every(c => c.length === 2) ? [[cols[0][0], cols[1][0]], [cols[0][1], cols[1][1]]] : null; };
  const read = () => txt(S.html().split('id="uiRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'For A with rows a, b and c, d, the undo is A⁻¹ = (1/det A)·[d −b; −c a]: swap a and d, change the signs of b and c, and divide by det A = ad − bc. Here det A is 1 or −1, so dividing by it keeps every sign or flips them all. A⁻¹ sends Aî back to ⟨1, 0⟩ and Aĵ back to ⟨0, 1⟩. Which matrix is A⁻¹?') fail('undopick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('undopick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, worked = 0, fives = 0, negs = 0;
  const slots = new Set(), kinds = {}, left = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, A = r.A, key = `seed ${seed} round ${k}`, t = det(A);
      rounds++; if (t === -1) negs++;
      if (A.flat().some(x => !Number.isInteger(x) || Math.abs(x) > 3) || Math.abs(t) !== 1 || A.flat().filter(x => x).length < 3) fail('undopick', key, `A = ${JSON.stringify(A)} is not small and whole with det ±1 and at most one 0`);
      if (prev && JSON.stringify(prev) === JSON.stringify(A)) fail('undopick', key, 'the same A comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('undopick', key, 'there are not four matrices, one of them right');
      const h0 = S.html();
      if (!txt(h0).startsWith(S.RULE + ' A =') || !h0.includes(`id="uiA" style="text-align:center;margin-bottom:4px" aria-label="A has ${rows(A)}">A = `)) fail('undopick', key, 'the rule and A are not shown first');
      const shownA = cells(h0.split('id="uiA"')[1].split('</div>')[0]);
      if (!shownA || JSON.stringify(shownA) !== JSON.stringify(A)) fail('undopick', key, `A is drawn as ${JSON.stringify(shownA)}`);
      const btns = [...h0.matchAll(/<button class="btn sm ghost smOpt" data-opt="([PQRS])" onclick="UndoPick\.choose\((\d)\)" aria-label="([PQRS]): rows (−?\d+), (−?\d+) and (−?\d+), (−?\d+)" style="margin:0"><b>([PQRS])<\/b> (<span class="mtx">.*?<\/span><\/span><\/span>)<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'PQRS'[i] || +m[2] !== i || m[3] !== 'PQRS'[i] || m[8] !== 'PQRS'[i])) { fail('undopick', key, 'the four matrices are not offered as they are, P to S'); continue; }
      const mats = btns.map(m => { const said = [[num(m[4]), num(m[5])], [num(m[6]), num(m[7])]], drawn = cells(m[9]);
        if (JSON.stringify(said) !== JSON.stringify(drawn)) fail('undopick', key, `a matrix is named ${JSON.stringify(said)} but drawn ${JSON.stringify(drawn)}`);
        return said; });
      if (new Set(mats.map(M => M.join())).size !== 4) fail('undopick', key, 'two matrices are the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) { fail('undopick', key, `an option is the unknown ${o.k}`); return; }
        if (JSON.stringify(mats[i]) !== JSON.stringify(z(want[o.k](A)))) fail('undopick', key, `${o.k} is shown as ${JSON.stringify(mats[i])}, which is not that slip`);
        if ((o.k === 'right') !== isI(mul(mats[i], A))) fail('undopick', key, `${JSON.stringify(mats[i])} ${o.k === 'right' ? 'does not undo' : 'undoes'} A`);
        if (o.k === 'nodiv' && t !== -1) fail('undopick', key, 'the forgot-to-divide slip is offered when det A is 1');
      });
      {
        const can = []; const seen = new Set([JSON.stringify(z(want.right(A)))]);
        for (const s of ['noswap', 'noneg', 'trans', 'nodiv']) { const w = JSON.stringify(z(want[s](A))); if (!seen.has(w)) { seen.add(w); can.push(s); } }
        if (can.length === 4) { const shown = r.opts.map(o => o.k); left.add(can.find(s => !shown.includes(s))); }
        if (can.length < 3) fail('undopick', key, 'an A with fewer than three slips is dealt'); }
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      if (k === 0 && read() !== '0 picked this visit, 0 on the first try.') fail('undopick', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'PQRS'[i], M = mats[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('undopick', key, 'a miss is counted, or not crossed off');
        const rt = read();
        const slip = { noswap: `${L} leaves a and d where they were, ${ng(A[0][0])} top-left and ${ng(A[1][1])} bottom-right. The undo swaps them: d goes top-left.`,
          noneg: `${L} swaps a and d but leaves b and c with their signs. The undo changes the signs of b and c: −b top-right, −c bottom-left.`,
          trans: `${L} is A turned on its side, Aᵀ: its rows are A's columns. Turning a matrix over is not undoing it.`,
          nodiv: `${L} swaps a and d and changes the signs of b and c, but forgets to divide by det A = −1, which flips every sign.` }[o.k];
        const P = mul(M, A), j = P[0][0] === 1 && P[1][0] === 0 ? 1 : 0;
        const ck = `Check ${L} the way B is checked: ${sendOf(M, A, j, L)}, but ${j ? 'ĵ' : 'î'} has to come back to ${j ? '⟨0, 1⟩' : '⟨1, 0⟩'}. ${workOf(A)}.`;
        if (rt !== `${slip} ${ck} ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('undopick', key, `${o.k} is explained as: ${rt} | want ${slip} ${ck}`);
        worked += sends(rt, key);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="UndoPick\\.choose\\(${i}\\)" aria-label="${L}: rows [^"]+\\. Not A⁻¹"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('undopick', key, 'the missed matrices are not shut and told as not A⁻¹');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('undopick', key, 'tapping a missed matrix again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('undopick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('undopick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('undopick', key, 'no fresh A after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'INVERSE READER / 5 undos picked') fail('undopick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'PQRS'[ri]} is A⁻¹, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('undopick', key, `the toast is ${env.toasts[nt]}`); }
      const W = mats[ri], rt = read();
      const after = `That was it: ${workOf(A)}. ${sendOf(W, A, 0, 'It')}, and ${sendOf(W, A, 1, 'it')}: both come home. Here is a new A. ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
      if (rt !== after) fail('undopick', key, `after a pick: ${rt} | want ${after}`);
      if (sends(rt, key) !== 2) fail('undopick', key, 'the right pick does not work both arrows');
      worked += 2;
      prev = A;
    }
  }
  { // the same A dealt again is turned away for a fresh one
    const real = S.build; let n = 0;
    S.build = () => (n++ < 3 ? [[2, 1], [1, 1]] : real.call(S));
    S.round = null; S.newRound(); S.newRound();
    if (JSON.stringify(S.round.A) === '[[2,1],[1,1]]') fail('undopick', 'repeat', 'the same A is dealt twice in a row');
    S.build = real;
  }
  for (const k of ['noswap', 'noneg', 'trans', 'nodiv']) if (!kinds[k]) fail('undopick', 'slips', `the slip ${k} is never offered`);
  if (!negs || negs === rounds) fail('undopick', 'deal', 'det A is always the same sign');
  if (left.size !== 4) fail('undopick', 'deal', `when an A has four slips, only ${[...left].join(', ')} are ever the one left out`);
  if (slots.size !== 4) fail('undopick', 'deal', `the right matrix only ever sits at ${[...slots].sort().map(i => 'PQRS'[i]).join(', ')}`);
  if (fives !== 30) fail('undopick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, worked };
})();

/* Which u × v? The pick-a-cross-product round in the cross product workshop.
   Every arrow on screen is read back off its button and checked against the
   slip it is named as, worked out here from u and v alone; the right one must
   be u × v and no slip may be. Every product, difference and dot product in
   the readout is worked again from the numbers it shows, and the square test
   must catch every slip but the swap. */
const crossPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {grid:'#2c2547', axis:'#6b5f92', dim:'#a99ccb', a:'#5aa9e6', b:'#f2c14e', c:'#57cc7a', d:'#e5484d', ink:'#e8e2f5'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    "const Cross = {render(){ env.renders++; }};" +
    cut('const CrossPick = {', 'const Cross = {') + 'return CrossPick;')(R, env);
  const txt = h => h.replace(/<\/div>|<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const num = t => +t.replace(/^\((.*)\)$/, '$1').replace('−', '-');
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const vec = w => `⟨${w.map(ng).join(', ')}⟩`;
  const X = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const D = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const want = {
    right: (u, v) => X(u, v), swap: (u, v) => X(v, u),
    plus: (u, v) => [u[1] * v[2] + u[2] * v[1], u[2] * v[0] + u[0] * v[2], u[0] * v[1] + u[1] * v[0]],
    mid: (u, v) => [u[1] * v[2] - u[2] * v[1], u[0] * v[2] - u[2] * v[0], u[0] * v[1] - u[1] * v[0]],
    parts: (u, v) => [u[0] * v[0], u[1] * v[1], u[2] * v[2]]
  };
  // every "a·b − c·d = n" and "a·b + c·d = n" in a line, worked again
  const sums = (t, key) => { for (const m of t.matchAll(/(?<![+−] |[\d(−·])(\(?−?\d+\)?)·(\(?−?\d+\)?) ([+−]) (\(?−?\d+\)?)·(\(?−?\d+\)?) = (−?\d+)(?![·\d])/g)) {
    const v = num(m[1]) * num(m[2]) + (m[3] === '+' ? 1 : -1) * num(m[4]) * num(m[5]);
    if (v !== num(m[6])) fail('crosspick', key, `${m[0]} is worked wrong`); } };
  // every dot product written out, worked again from its own numbers
  const dots = (t, key) => { let n = 0; for (const m of t.matchAll(/= ((?:\(?−?\d+\)?·\(?−?\d+\)? \+ ){2}\(?−?\d+\)?·\(?−?\d+\)?) = (−?\d+(?: [+−] \d+){2}) = (−?\d+)/g)) {
    n++; const ps = m[1].split(' + ').map(p => p.split('·').map(num)), terms = ps.map(([a, b]) => a * b);
    const said = m[2].split(' ').reduce((acc, tk, i, arr) => (i === 0 ? [num(tk)] : /^[+−]$/.test(tk) ? acc : [...acc, (arr[i - 1] === '−' ? -1 : 1) * +tk]), []);
    if (said.join() !== terms.join() || num(m[3]) !== terms.reduce((a, b) => a + b, 0)) fail('crosspick', key, `a dot product is worked wrong: ${m[0]}`); } return n; };
  const pn = n => (n < 0 ? '(' + ng(n) + ')' : String(n));
  // u × v and a dot product, written out the way the readout must write them
  const workOf = (u, v) => { const [a, b, e] = u, [p, q, s] = v, P = pn;
    return `u × v = ⟨${P(b)}·${P(s)} − ${P(e)}·${P(q)}, ${P(e)}·${P(p)} − ${P(a)}·${P(s)}, ${P(a)}·${P(q)} − ${P(b)}·${P(p)}⟩ = ${vec(X(u, v))}`; };
  const dw = (w, x, L, N) => { const tm = w.map((y, i) => y * x[i]);
    return `${L}·${N} = ${w.map((y, i) => pn(y) + '·' + pn(x[i])).join(' + ')} = ${ng(tm[0])}${tm.slice(1).map(t => ` ${t < 0 ? '−' : '+'} ${Math.abs(t)}`).join('')} = ${ng(D(w, x))}`; };
  const read = () => txt(S.html().split('id="ckRead"')[1].replace(/^[^>]*>/, ''));
  if (S.RULE !== 'u × v = ⟨u₂v₃ − u₃v₂, u₃v₁ − u₁v₃, u₁v₂ − u₂v₁⟩: each slot is worked from the other two, and each one takes away. The answer stands square to both u and v, so its dot product with each is 0, and swapping the order flips it. Which arrow is u × v?') fail('crosspick', 'rule', 'the rule is not stated as it should be');
  if (S.round !== null || S.matched !== 0) fail('crosspick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, dotsWorked = 0, fives = 0;
  const slots = new Set(), kinds = {};
  for (let seed = 1; seed <= 300; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, { u, v } = r.c, key = `seed ${seed} round ${k}`;
      rounds++;
      if ([...u, ...v].some(x => !Number.isInteger(x) || Math.abs(x) > 3) || u.filter(x => x).length < 2 || v.filter(x => x).length < 2) fail('crosspick', key, `u = ${u}, v = ${v} are not small whole arrows with at most one 0`);
      if (X(u, v).every(x => !x)) fail('crosspick', key, 'u and v are parallel');
      if (prev && JSON.stringify(prev) === JSON.stringify(r.c)) fail('crosspick', key, 'the same pair comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1) fail('crosspick', key, 'there are not four arrows, one of them right');
      const h0 = S.html();
      if (!txt(h0).startsWith(`${S.RULE} u = ${vec(u)}, v = ${vec(v)}`)) fail('crosspick', key, 'the rule, u and v are not shown first');
      const btns = [...h0.matchAll(/data-opt="([ABCD])" (disabled )?onclick="CrossPick\.choose\((\d)\)" aria-label="([ABCD]): ⟨([^⟩]+)⟩(\. Not u × v)?"[^>]*><b>([ABCD])<\/b> ⟨([^⟩]+)⟩<\/button>/g)];
      if (btns.length !== 4 || btns.some((m, i) => m[1] !== 'ABCD'[i] || m[2] || +m[3] !== i || m[4] !== 'ABCD'[i] || m[5] !== m[8] || m[6] || m[7] !== 'ABCD'[i])) { fail('crosspick', key, 'the four arrows are not offered as they are, A to D'); continue; }
      const arrows = btns.map(m => m[8].split(', ').map(num));
      if (new Set(arrows.map(a => a.join())).size !== 4) fail('crosspick', key, 'two arrows are the same');
      r.opts.forEach((o, i) => {
        kinds[o.k] = (kinds[o.k] || 0) + 1;
        if (!want[o.k]) fail('crosspick', key, `an option is the unknown ${o.k}`);
        else if (arrows[i].join() !== want[o.k](u, v).join()) fail('crosspick', key, `${o.k} is shown as ${vec(arrows[i])}, which is not that slip`);
        if ((o.k === 'right') !== (arrows[i].join() === X(u, v).join())) fail('crosspick', key, `${vec(arrows[i])} ${o.k === 'right' ? 'is not' : 'is'} u × v`);
        if (o.k !== 'right' && o.k !== 'swap' && !D(arrows[i], u) && !D(arrows[i], v)) fail('crosspick', key, `${o.k} passes the square test`);
      });
      const ri = r.opts.findIndex(o => o.k === 'right'); slots.add(ri);
      if (k === 0 && read() !== '0 picked this visit, 0 on the first try.') fail('crosspick', key, `before a pick the readout says ${read()}`);
      const wrong = [0, 1, 2, 3].filter(i => i !== ri); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let q = 0; q < missN; q++) {
        const i = wrong[q], o = r.opts[i], L = 'ABCD'[i], A = arrows[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++;
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('crosspick', key, 'a miss is counted, or not crossed off');
        const rt = read();
        const slip = { swap: `${L} is v × u, the order swapped.`, plus: `${L} adds where every slot should take away: its `, mid: `${L} works the middle slot the wrong way round, u₁v₃ − u₃v₁ = `, parts: `${L} multiplies matching parts, u₁v₁, u₂v₂ and u₃v₃` }[o.k];
        if (!rt.startsWith(slip)) fail('crosspick', key, `${o.k} is explained as: ${rt}`);
        if (o.k === 'plus') { const m = rt.match(/its (first|middle|last) slot is .+? = (−?\d+), where u × v has .+? = (−?\d+)\./);
          const s = m && ['first', 'middle', 'last'].indexOf(m[1]);
          if (!m || num(m[2]) !== A[s] || num(m[3]) !== X(u, v)[s] || m[2] === m[3]) fail('crosspick', key, `the added slot is not one that differs: ${rt}`); }
        if (o.k === 'mid' && !rt.includes(`= ${ng(A[1])}. The middle slot is u₃v₁ − u₁v₃ = ${ng(X(u, v)[1])}:`)) fail('crosspick', key, `the middle slot is not shown: ${rt}`);
        const dU = `${L}·u = `, dV = `${L}·v = `;
        const ck = o.k === 'swap' ? `${L} passes the square test, ${dU}` : `Check ${L} by the square test: ${dU}`;
        if (!rt.includes(ck) || !rt.includes(` and ${dV}`)) fail('crosspick', key, `the miss is not checked by its dot products: ${rt}`);
        const said = [...rt.matchAll(new RegExp(`${L}·([uv]) = .+? = (−?\\d+)(?= and|\\. u × v|, because)`, 'g'))].map(m => [m[1], num(m[2])]);
        if (said.length !== 2 || said[0][1] !== D(A, u) || said[1][1] !== D(A, v)) fail('crosspick', key, `the dot products are said to be ${JSON.stringify(said)}`);
        if (!rt.includes(`${workOf(u, v)}.`)) fail('crosspick', key, `u × v is not worked beside the miss: ${rt}`);
        if (!rt.includes(dw(A, u, L, 'u') + ' and ' + dw(A, v, L, 'v') + (o.k === 'swap' ? ', because' : '. u × v'))) fail('crosspick', key, `the square test is not worked with u and then v: ${rt}`);
        sums(rt, key); dotsWorked += dots(rt, key);
        const h = S.html();
        if (!new RegExp(`smOpt miss" data-opt="${L}" disabled onclick="CrossPick\\.choose\\(${i}\\)" aria-label="${L}: ⟨[^⟩]+⟩\\. Not u × v"`).test(h) || (h.match(/ disabled /g) || []).length !== q + 1) fail('crosspick', key, 'the missed arrows are not shut and told as not u × v');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== q + 1 || env.renders !== r0) fail('crosspick', key, 'tapping a missed arrow again does something');
      }
      const m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri);
      if (env.renders !== r0 + 1) fail('crosspick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('crosspick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('crosspick', key, 'no fresh pair after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'CROSS READER / 5 cross products picked') fail('crosspick', key, 'no banner at five'); }
      else { const tries = missN + 1, w = `✓ ${'ABCD'[ri]} is u × v, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== w || env.banners.length !== nb) fail('crosspick', key, `the toast is ${env.toasts[nt]}`); }
      const rt = read();
      const W = X(u, v);
      if (!rt.startsWith(`That was it: ${workOf(u, v)}, and it is square to both: ${dw(W, u, '(u × v)', 'u')}, ${dw(W, v, '(u × v)', 'v')}. Here is a new pair.`) || !rt.includes(`= ${vec(X(u, v))}, and it is square to both: (u × v)·u = `) || !rt.endsWith(`= 0. Here is a new pair. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) || (rt.match(/ = 0[,.]/g) || []).length !== 2) fail('crosspick', key, `after a pick: ${rt}`);
      sums(rt, key); if (dots(rt, key) !== 2) fail('crosspick', key, 'the right pick does not work both dot products');
      prev = r.c;
    }
  }
  { // the same pair dealt again is turned away for a fresh one
    const real = S.build; let n = 0;
    S.build = () => (n++ < 3 ? { u: [1, 2, 0], v: [0, 1, 3] } : real.call(S));
    S.round = null; S.newRound(); S.newRound();
    if (JSON.stringify(S.round.c) === '{"u":[1,2,0],"v":[0,1,3]}') fail('crosspick', 'repeat', 'the same pair is dealt twice in a row');
    S.build = real;
  }
  for (const k of ['swap', 'plus', 'mid', 'parts']) if (!kinds[k]) fail('crosspick', 'slips', `the slip ${k} is never offered`);
  if (slots.size !== 4) fail('crosspick', 'deal', `the right arrow only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (fives !== 30) fail('crosspick', 'banner', `five were picked ${fives} times, not 30`);
  return { rounds, misses, dotsWorked };
})();

/* Which matrix? The pick-a-matrix round in the matrix workshop: the shape is
   one matrix, and each of the other three is checked to be the slip it is
   named as by where it sends î and ĵ, worked out here from the shape alone;
   every button, sentence, drawing and tap is read back, over many seeded
   rounds. */
const matPickNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const { S, W } = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)};" +
    cut('const Workshop = {', "  open(){ UI.go('s-workshop'); },") + "render(){ env.renders++; } };" +
    cut('const MatPick = {', '/* ---------------------------- slope workshop') + 'return { S: MatPick, W: Workshop };')(R, env);
  const txt = h => h.replace(/<\/div>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const ng = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const at = (x, y) => `⟨${ng(x)}, ${ng(y)}⟩`;
  const key2 = M => JSON.stringify(M);
  // where a matrix sends î and ĵ: its columns
  const I = M => [M[0][0], M[1][0]], J = M => [M[0][1], M[1][1]];
  const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
  const named = {
    trans: (A, D) => [0, 1].every(i => [0, 1].every(j => D[i][j] === A[j][i])),
    swap: (A, D) => eq(I(D), J(A)) && eq(J(D), I(A)),
    rows: (A, D) => eq(I(D), [I(A)[1], I(A)[0]]) && eq(J(D), [J(A)[1], J(A)[0]]),
    sign: (A, D, e) => { const diff = [0, 1, 2, 3].filter(k => D[k >> 1][k & 1] !== A[k >> 1][k & 1]);
      return diff.length === 1 && diff[0] === e && D[e >> 1][e & 1] === -A[e >> 1][e & 1] && A[e >> 1][e & 1] !== 0; }
  };
  const said = {
    trans: A => `It is the transpose: its rows are the right columns. The columns are where the arrows land, so ${at(...I(A))} goes down the first column, top to bottom.`,
    swap: () => 'It has the right two columns in the wrong order: the first column is where î lands, the second where ĵ lands.',
    rows: () => "It swaps each arrow's across and up: in each column the top number is how far across, the bottom how far up.",
    sign: (A, e) => { const v = A[e >> 1][e & 1], arrow = e & 1 ? 'ĵ' : 'î', dir = e >> 1 ? (v > 0 ? 'up' : 'down') : (v > 0 ? 'right' : 'left');
      return `One number has the wrong sign: the dashed ${arrow} goes ${dir} ${Math.abs(v)}, so the ${['top-left', 'top-right', 'bottom-left', 'bottom-right'][e]} number is ${ng(v)}.`; }
  };
  if (S.RULE !== 'Each column of a matrix is where an arrow lands: the first column is where î ends, the second where ĵ ends. Which matrix makes the dashed shape?') fail('matpick', 'rule', 'the rule is not stated');
  if (S.round !== null || S.matched !== 0) fail('matpick', 'open', 'a round is dealt before the mode is opened');
  let rounds = 0, misses = 0, picks = 0, fives = 0, symm = 0;
  const dealt = new Set(), caught = new Set(), slots = new Set();
  for (let seed = 1; seed <= 400; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, A = r.A, key = `seed ${seed} round ${k}`;
      rounds++;
      if (A.flat().some(v => v < -2 || v > 2) || W.det(A) === 0 || key2(A) === key2([[1, 0], [0, 1]])) fail('matpick', key, `the shape ${key2(A)} is not a fair one`);
      if (prev && key2(prev) === key2(A)) fail('matpick', key, 'the same shape comes twice in a row');
      if (r.opts.length !== 4 || r.opts.filter(o => o.k === 'right').length !== 1 || key2(r.opts.find(o => o.k === 'right').M) !== key2(A)) fail('matpick', key, 'there is not one right matrix among four');
      slots.add(r.opts.findIndex(o => o.k === 'right'));
      if (new Set(r.opts.map(o => key2(o.M))).size !== 4) fail('matpick', key, 'two of the matrices are the same');
      for (const o of r.opts) if (o.k !== 'right') {
        if (!named[o.k] || !named[o.k](A, o.M, o.e)) fail('matpick', key, `${key2(o.M)} is not the ${o.k} slip of ${key2(A)}`);
        dealt.add(o.k);
      }
      const symmetric = A[0][1] === A[1][0];
      if (symmetric) symm++;
      if (r.opts.some(o => o.k === 'trans') === symmetric) fail('matpick', key, 'the transpose is not offered whenever it differs');
      if (!r.opts.some(o => o.k === 'sign')) fail('matpick', key, 'no wrong sign is offered');
      const f0 = S.fig();
      if (f0.kind !== 'grid' || key2(f0.m) !== key2([[1, 0], [0, 1]]) || key2(f0.ghost) !== key2(A) || f0.ticks !== true || f0.before !== false || !/^Gold is the square before\. The dashed shape is where one of these matrices sends it\.$/.test(f0.caption)) fail('matpick', key, 'the shape is not drawn dashed over the square');
      const h0 = S.html();
      const btn = [...h0.matchAll(/<button class="btn sm ghost mpOpt( miss)?" (disabled )?onclick="MatPick\.choose\((\d)\)" aria-label="Matrix ([ABCD]): top row (\S+), (\S+); bottom row (\S+), ([^".]+)(\. Not this one)?"[^>]*>\s*<b aria-hidden="true">([ABCD])<\/b><span class="mpMat" aria-hidden="true"><i class="c0">([^<]+)<\/i><i class="c1">([^<]+)<\/i><i class="c0">([^<]+)<\/i><i class="c1">([^<]+)<\/i><\/span><\/button>/g)];
      if (btn.length !== 4 || btn.some((b, i) => b[1] || b[2] || b[9] || +b[3] !== i || b[4] !== 'ABCD'[i] || b[10] !== 'ABCD'[i] ||
        [b[5], b[6], b[7], b[8]].join() !== r.opts[i].M.flat().map(ng).join() || [b[11], b[12], b[13], b[14]].join() !== r.opts[i].M.flat().map(ng).join())) fail('matpick', key, 'the four matrices are not offered as they are, A to D');
      if (k === 0 ? txt(S.read()) !== `${S.matched} picked this visit, ${S.firstTry} on the first try.` : !txt(S.read()).startsWith('That was it: ')) fail('matpick', key, `before a pick the readout says ${txt(S.read())}`);
      // miss some of the wrong matrices, in an order that changes, then pick
      const wrong = [0, 1, 2, 3].filter(i => r.opts[i].k !== 'right'); if (seed % 2) wrong.reverse();
      const missN = (seed + k) % 4;
      for (let t = 0; t < missN; t++) {
        const i = wrong[t], o = r.opts[i], m0 = S.matched, nt = env.toasts.length;
        S.choose(i); misses++; caught.add(o.k);
        if (S.matched !== m0 || !S.round.out.has(i) || S.round !== r || env.toasts.length !== nt) fail('matpick', key, 'a miss is counted, or not crossed off');
        const want = `Matrix ${'ABCD'[i]} sends î to ${at(...I(o.M))} and ĵ to ${at(...J(o.M))}, drawn in gold. The dashed î ends at ${at(...I(A))} and the dashed ĵ at ${at(...J(A))}. ${o.k === 'sign' ? said.sign(A, o.e) : said[o.k](A)} ${S.matched} picked this visit, ${S.firstTry} on the first try.`;
        if (txt(S.read()) !== want) fail('matpick', key, `the miss on ${o.k} is explained as: ${txt(S.read())}`);
        const f = S.fig();
        if (key2(f.m) !== key2(o.M) || key2(f.ghost) !== key2(A) || !/^Gold is where that matrix sends the square\. The dashed shape is the one to make\.$/.test(f.caption)) fail('matpick', key, 'the wrong pick is not drawn over the shape');
        const h = S.html();
        if (!new RegExp(`mpOpt miss" disabled onclick="MatPick\\.choose\\(${i}\\)" aria-label="Matrix ${'ABCD'[i]}: [^"]+\\. Not this one"`).test(h)) fail('matpick', key, 'a missed matrix is not shut and told as not this one');
        if ((h.match(/ disabled /g) || []).length !== t + 1) fail('matpick', key, 'the wrong number of matrices are shut');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== t + 1 || env.renders !== r0) fail('matpick', key, 'tapping a missed matrix again does something');
      }
      const ri = r.opts.findIndex(o => o.k === 'right'), m0 = S.matched, ft = S.firstTry, nt = env.toasts.length, nb = env.banners.length, r0 = env.renders;
      S.choose(ri); picks++;
      if (env.renders !== r0 + 1) fail('matpick', key, 'a pick does not redraw the workshop');
      if (S.matched !== m0 + 1 || S.firstTry !== ft + (missN === 0 ? 1 : 0)) fail('matpick', key, 'the right pick is not counted');
      if (S.round === r || S.misses !== 0 || S.picked !== null) fail('matpick', key, 'no fresh shape after the right pick');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || env.banners[nb] !== 'MATRIX SPOTTER / 5 matrices picked') fail('matpick', key, 'no banner at five'); }
      else { const tries = missN + 1, want = `✓ Matrix ${'ABCD'[ri]} makes the shape, picked ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== want || env.banners.length !== nb) fail('matpick', key, `the toast is ${env.toasts[nt]}`); }
      const after = txt(S.read());
      if (after !== `That was it: î lands on ${at(...I(A))}, the first column, and ĵ on ${at(...J(A))}, the second. Here is a new shape. ${S.matched} picked this visit, ${S.firstTry} on the first try.`) fail('matpick', key, `after a pick: ${after}`);
      if (key2(S.fig().m) !== key2([[1, 0], [0, 1]])) fail('matpick', key, 'the new shape is drawn with the old pick');
      prev = A;
    }
  }
  for (const k of Object.keys(named)) { if (!dealt.has(k)) fail('matpick', k, 'never offered'); if (!caught.has(k)) fail('matpick', k, 'never picked and explained'); }
  if (slots.size !== 4) fail('matpick', 'deal', `the right matrix only ever sits at ${[...slots].sort().map(i => 'ABCD'[i]).join(', ')}`);
  if (!symm) fail('matpick', 'symmetric', 'no symmetric shape is ever dealt, so the fill-in is never tried');
  if (fives !== 40) fail('matpick', 'banner', `five matrices were picked ${fives} times, not 40`);
  return { rounds, misses, picks };
})();

/* Which is f′? The graph-reading round in the slope tracer: f′ is checked as
   the slope of f by nudging f itself, never from the coefficients it was built
   from; each wrong graph is checked to be the slip it is named as, and to break
   the rule at the x it is caught at; and every sentence, every graph told as
   words, every tap and every drawing is read back, over many seeded rounds. */
const slopeMatchNotes = (() => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const cut = (a, b) => script.slice(script.indexOf(a), script.indexOf(b, script.indexOf(a)));
  const env = { toasts: [], banners: [], renders: 0, seed: 1 };
  const R = { _r: () => { env.seed = (env.seed * 1664525 + 1013904223) >>> 0; return env.seed / 4294967296; } };
  R.i = (a, b) => Math.floor(R._r() * (b - a + 1)) + a; R.pick = a => a[Math.floor(R._r() * a.length)];
  const S = new Function('R', 'env',
    "const neg = n => (n<0? '−'+Math.abs(n) : String(n));" +
    "const FIG_COL = {axis:'#6b5f92', a:'#5aa9e6', b:'#f2c14e'};" +
    "const UI = {toast:m=>env.toasts.push(m)}; const Sfx = {good(){}, milestone(){}};" +
    "const Celebrate = {banner:(t,s)=>env.banners.push(t+' / '+s)}; const Tracer = {render(){ env.renders++; }};" +
    cut('const SlopeMatch = {', '/* ---------- The slope tracer workshop') + 'return SlopeMatch;')(R, env);
  const txt = h => h.replace(/<\/div>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const H = 1e-4, slope = (f, x) => (f(x + H) - f(x - H)) / (2 * H);
  const label = (F, x) => {
    if (!F.trig) return (x < 0 ? '−' : '') + Math.abs(x);
    const q = Math.round(x / (Math.PI / 4));
    return q === 0 ? '0' : (q < 0 ? '−' : '') + { 1: 'π/4', 2: 'π/2', 3: '3π/4', 4: 'π' }[Math.abs(q)];
  };
  const named = { self: (F, x) => F.f(x), neg: (F, x) => -slope(F.f, x), dd: (F, x) => slope(x2 => slope(F.f, x2), x) };
  let n = 0, rounds = 0, misses = 0, kinds = new Set(), slips = new Set(), dealt = new Set(), fives = 0;
  if (S.round !== null || S.matched !== 0) fail('slopematch', 'open', 'a round is dealt before the mode is opened');
  for (let seed = 1; seed <= 400; seed++) {
    env.seed = seed * 7919; S.round = null; S.last = null; S.matched = 0; S.firstTry = 0;
    S.start();
    let prev = null;
    for (let k = 0; k < (seed % 10 === 0 ? 6 : 4); k++) {
      const r = S.round, F = r.F, key = `seed ${seed} round ${k}`;
      rounds++; kinds.add(F.kind);
      if (prev && F.fs === prev.fs && JSON.stringify(F.D) === JSON.stringify(prev.D)) fail('slopematch', key, 'the same f comes twice in a row');
      if (r.deal.length !== 3 || r.deal.filter(d => d === 'd').length !== 1) fail('slopematch', key, `the deal is ${r.deal}`);
      const wrong = r.deal.filter(d => d !== 'd');
      if (wrong[0] === wrong[1] || !wrong.every(w => S.NAMES[w])) fail('slopematch', key, `the wrong graphs are ${wrong}`);
      const xs = []; for (let i = 0; i <= 120; i++) xs.push(F.X[0] + (F.X[1] - F.X[0]) * i / 120);
      for (const x of xs) {
        n++;
        if (Math.abs(slope(F.f, x) - F.G.d(x)) > 1e-5) { fail('slopematch', key, `f′ is not the slope of f at x = ${x}`); break; }
        for (const w of Object.keys(named)) if (Math.abs(named[w](F, x) - F.G[w](x)) > 1e-3) { fail('slopematch', key, `${w} is not what it is named at x = ${x}`); break; }
      }
      // f′ slid sideways: a step of 2 either way, or a quarter turn on a wave
      if (![2, -2, Math.PI / 2].some(s => (F.trig === (s === Math.PI / 2)) && xs.every(x => Math.abs(F.G.shift(x) - slope(F.f, x - s)) < 1e-5))) fail('slopematch', key, 'the slid graph is not f′ slid sideways');
      for (const w of wrong) dealt.add(F.kind + ' ' + w);
      const far = (g, h) => xs.some(x => Math.abs(g(x) - h(x)) > 0.1);
      if (!far(F.G[wrong[0]], F.G.d) || !far(F.G[wrong[1]], F.G.d) || !far(F.G[wrong[0]], F.G[wrong[1]])) fail('slopematch', key, 'two of the graphs look the same');
      // every flat tangent of f is named, and only those
      const flats = S.flats(F), crosses = [];
      for (let i = 1; i < xs.length; i++) if (Math.sign(slope(F.f, xs[i - 1])) * Math.sign(slope(F.f, xs[i])) < 0) crosses.push(xs[i]);
      for (const c of crosses) if (!flats.some(L => S.grid(F).some(g => label(F, g) === L && Math.abs(g - c) <= (F.X[1] - F.X[0]) / 120 + 1e-9))) fail('slopematch', key, `f lies flat near x = ${c}, which is not named`);
      for (const L of flats) { const g = S.grid(F).find(x => label(F, x) === L); if (g === undefined || Math.abs(slope(F.f, g)) > 1e-6) fail('slopematch', key, `x = ${L} is named flat but is not`); }
      // f, and each graph, told as words
      const told = (g, words, up, down) => {
        const parts = words.split(', ');
        parts.forEach((p, i) => {
          const m = p.match(new RegExp(`^(?:then )?(${up}|${down})(?: from (about )?x = (\\S+))?$`));
          if (!m || (i === 0) !== (m[3] === undefined)) { fail('slopematch', key, `cannot read "${words}"`); return; }
          const at = m[3] === undefined ? F.X[0] : S.grid(F).concat(F.trig ? [] : [-3, 3]).find(x => label(F, x) === m[3]);
          if (at === undefined) { fail('slopematch', key, `"${m[3]}" is not on the grid`); return; }
          const nx = i + 1 < parts.length ? S.grid(F).concat(F.trig ? [] : [-3, 3]).find(x => label(F, x) === (parts[i + 1].match(/x = (\S+)$/) || [])[1]) : F.X[1];
          const st = (nx - at) / 60, bad = [], u = F.trig ? Math.PI / 8 : 0.25;
          const nxAbout = i + 1 < parts.length && / from about /.test(parts[i + 1]);
          for (let q = 1; q < 60; q++) { const x = at + q * st, v = g(x);
            if ((m[2] && x - at < u) || (nxAbout && nx - x < u)) continue; if (Math.abs(v) > 1e-9 && (m[1] === up) !== (v > 0)) bad.push(x); }
          if (bad.length > 3) fail('slopematch', key, `"${p}" is wrong: the graph is on the other side of the axis at x = ${bad[0]} in "${words}" ${F.kind} ${F.fs} ${JSON.stringify(F.D)} ${Object.keys(F.G).find(k => F.G[k] === g)}`);
          if (m[3] !== undefined && !m[2] && Math.abs(g(at)) > 1e-6) fail('slopematch', key, `"${p}" says exactly, but the graph is not 0 there`);
          if (m[2] && Math.abs(g(at)) < 1e-6) fail('slopematch', key, `"${p}" says about, but it is exact`);
        });
      };
      const h0 = S.html();
      const fl = (h0.match(/role="img" aria-label="f(?: = [^:]+)?: it ([^"]+)"/) || [])[1];
      if (!fl) fail('slopematch', key, 'f is not told as words'); else told(x => slope(F.f, x), fl, 'climbs', 'falls');
      const opts = [...h0.matchAll(/data-opt="([ABC])" (disabled )?onclick="SlopeMatch\.choose\((\d)\)" aria-label="Graph ([ABC]): ([^"]+)"/g)];
      if (opts.map(o => o[1] + o[3] + o[4]).join() !== 'A0A,B1B,C2C' || opts.some(o => o[2])) fail('slopematch', key, 'the three graphs are not offered A, B, C');
      opts.forEach((o, i) => told(F.G[r.deal[i]], o[5], 'above the axis', 'below the axis'));
      if (/data-k="tell"/.test(h0)) fail('slopematch', key, 'a tell is marked before any miss');
      for (const p of h0.matchAll(/points="([^"]+)"/g)) for (const pt of p[1].split(' ')) { const [x, y] = pt.split(',').map(Number); if (x < 0 || x > 340 || y < 0 || y > 120) { fail('slopematch', key, `a point is drawn off its frame: ${pt}`); break; } }
      if (!txt(h0).startsWith("f′ sits above the axis wherever f climbs, below wherever f falls, and crosses 0 where f's tangent lies flat. Which graph is f′?")) fail('slopematch', key, 'the rule is not stated');
      // miss each wrong graph in turn, at random order, then pick f′
      const order = [0, 1, 2].filter(i => r.deal[i] !== 'd'); if (seed % 2) order.reverse();
      const missN = k % 3;
      for (let t = 0; t < missN && t < 2; t++) {
        const i = order[t], w = r.deal[i], before = S.matched;
        S.choose(i); misses++; slips.add(w);
        const X = S.tell(F, F.G[w]);
        if (X === null || X <= F.X[0] + 0.1 || X >= F.X[1] - 0.1) fail('slopematch', key, `${w} is caught at no x, or at an end`);
        const up = slope(F.f, X) > 0;
        if (Math.sign(F.G[w](X)) !== (up ? -1 : 1)) fail('slopematch', key, `${w} does not break the rule at x = ${X}`);
        const h = S.html(), rd = txt(h.split('id="smRead"')[1].replace(/^[^>]*>/, ''));
        const want = `At x = ${label(F, X)}, f is ${up ? 'climbing' : 'falling'}: its tangent slopes ${up ? 'up' : 'down'}, so f′ must sit ${up ? 'above' : 'below'} the axis there. Graph ${'ABC'[i]} is ${up ? 'below' : 'above'} the axis at x = ${label(F, X)}, so it cannot be f′. It is ${S.NAMES[w]}.`;
        if (!rd.startsWith(want)) fail('slopematch', key, `the miss is explained as: ${rd}`);
        if (S.matched !== before || !S.round.out.has(i)) fail('slopematch', key, 'a miss is counted as read, or not crossed off');
        if ((h.match(/data-k="tell"/g) || []).length !== 2) fail('slopematch', key, 'the tell is not marked on f and on the missed graph');
        if (!new RegExp(`data-opt="${'ABC'[i]}" disabled onclick`).test(h) || !new RegExp(`aria-label="Graph ${'ABC'[i]}: [^"]+\\. Not f′"`).test(h)) fail('slopematch', key, 'a missed graph is not shut and told as not f′');
        const r0 = env.renders; S.choose(i);
        if (S.misses !== t + 1 || env.renders !== r0) fail('slopematch', key, 'tapping a missed graph again does something');
      }
      const di = r.deal.indexOf('d'), m0 = S.matched, f0 = S.firstTry, nt = env.toasts.length, nb = env.banners.length;
      S.choose(di);
      if (S.matched !== m0 + 1 || S.firstTry !== f0 + (missN === 0 ? 1 : 0)) fail('slopematch', key, 'reading f′ is not counted');
      if (S.round === r) fail('slopematch', key, 'no new f after reading f′');
      if (S.matched === 5) { fives++; if (env.banners.length !== nb + 1 || !/SLOPE SPOTTER \/ 5 slopes read/.test(env.banners[nb])) fail('slopematch', key, 'no banner at five'); }
      else { const tries = missN + 1, want = `✓ Graph ${'ABC'[di]} is f′, read ${tries === 1 ? 'on the first try' : 'in ' + tries + ' tries'}. Here is another.`;
        if (env.toasts.length !== nt + 1 || env.toasts[nt] !== want) fail('slopematch', key, `the toast is ${env.toasts[nt]}`); }
      const after = txt(S.html().split('id="smRead"')[1].replace(/^[^>]*>/, ''));
      if (!after.startsWith('That was f′: ') || (flats.length > 0) !== after.includes(`0 at x = ${flats.join(' and x = ')}, where f's tangent lay flat`)) fail('slopematch', key, `after a read: ${after}`);
      if (!after.endsWith(`${S.matched} read this visit, ${S.firstTry} on the first try.`)) fail('slopematch', key, 'the tally is wrong');
      prev = F;
    }
  }
  for (const k of ['line', 'quad', 'wave']) if (!kinds.has(k)) fail('slopematch', k, 'never dealt');
  for (const w of Object.keys(S.NAMES)) if (!slips.has(w)) fail('slopematch', w, 'never caught');
  // a parabola slid by 2 breaks the rule only near the bottom of its bowl, too
  // faintly to point at, so it is never dealt; every other slip is
  for (const k of ['line', 'quad', 'wave']) for (const w of Object.keys(S.NAMES)) if (!(k === 'quad' && w === 'shift') && !dealt.has(k + ' ' + w)) fail('slopematch', k, `never offers ${w} as a wrong graph`);
  if (dealt.has('quad shift')) fail('slopematch', 'quad', 'a faint slid parabola is dealt');
  if (fives !== 40) fail('slopematch', 'banner', `five slopes were read ${fives} times, not 40`);
  return { n, rounds, misses };
})();

/* The growth integral workshop: every curve, every number in front, every
   lift and both forms. Whether F fits is decided here by nudging F and
   comparing with Math's own e^(kx) at many x, never from c·k = 1; every
   number the readout works is checked against those; every sentence's
   condition is decided independently; and the slope field and the curve are
   read back. */
const expIntNotes = (() => {
  const W = ExpInt;
  const num = t => +t.replace(/[()]/g, '').replace(/−/g, '-');
  const frv = t => { const s = t.replace(/[()]/g, '').replace(/−/g, '-'), [a, b] = s.split('/'); return b === undefined ? +a : +a / +b; };
  const r3 = v => Math.round(v * 1000) / 1000;
  const near3 = (t, v) => Math.abs(num(t) - r3(v)) < 1e-9;
  const nearF = (t, v) => Math.abs(frv(t) - v) < 1e-9;
  const sl = (h, x, e = 1e-6) => (h(x + e) - h(x - e)) / (2 * e);
  const K = { two: 2, neg: -2, half: 0.5 }, EX = { two: '2x', neg: '−2x', half: 'x/2' }, UP = { two: '3x', neg: '−x', half: '3x/2' };
  if (W.SETS.map(S => S.id).join() !== 'two,neg,half') fail('expint', 'sets', W.SETS.map(S => S.id).join());
  if (W.FORMS.join() !== 'Keep the exponent,Raise it, as the power rule does') fail('expint', 'forms', W.FORMS.join());
  if (W.LIFT.join() !== '-2,-1.5,-1,-0.5,0,0.5,1,1.5,2') fail('expint', 'lifts', W.LIFT.join());
  if (W.si !== 0 || W.ci !== W.SETS[0].start || W.li !== 4 || W.form !== 0 || W.LIFT[4] !== 0) fail('expint', 'open', 'the workshop does not open on e^(2x) with F = e^(2x), no lift and the exponent kept');
  const reset = () => { W.touched = false; W.si = 0; W.ci = W.SETS[0].start; W.li = 4; W.form = 0; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('expint', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.form = 1; W.ci = 0; W.li = 0; W.pick(si);
    if (W.form !== 0 || W.ci !== S.start || W.li !== 4) fail('expint', S.id, 'picking a curve does not start F again');
    if (W.c() !== 1) fail('expint', S.id, 'F does not start as e^(kx) itself');
    for (const g of W.GOALS) if (g.ok(W)) fail('expint', g.id, `met where ${S.id} starts, so picking it gives the goal away`);
    W.ci = S.C.length - 1; W.moveC(1); if (W.ci !== S.C.length - 1) fail('expint', S.id, 'the number in front does not stop at its last step');
    W.ci = 0; W.moveC(-1); if (W.ci !== 0) fail('expint', S.id, 'the number in front does not stop at its first step');
    W.li = 8; W.moveL(1); W.li = 0; W.moveL(-1); if (W.li !== 0) fail('expint', S.id, 'the lift does not stop at its ends');
    const cs = S.C.map(v => typeof v === 'string' ? frv(v) : v);
    if (!cs.some(c => Math.abs(c * K[S.id] - 1) < 1e-12)) fail('expint', S.id, 'no number in front fits');
    if (!cs.some(c => c === K[S.id])) fail('expint', S.id, 'k itself is not offered, so the multiply slip cannot be tried');
    if (!cs.some(c => Math.abs(c * (K[S.id] + 1) - 1) < 1e-12)) fail('expint', S.id, 'the power rule’s number is not offered'); });
  const found = {}; let n = 0, pts = 0, dashes = 0;
  W.SETS.forEach((S, si) => {
    const k = K[S.id], f = x => Math.exp(k * x), [a, b] = S.D, [c0, d0] = S.R;
    S.C.forEach((cv, ci) => W.LIFT.forEach((L, li) => [0, 1].forEach(form => {
      reset(); W.si = si; W.ci = ci; W.li = li; W.form = form; W.touched = true; n++;
      const c = typeof cv === 'string' ? frv(cv) : cv, m = form ? k + 1 : k, F = x => c * Math.exp(m * x) + L;
      const key = `${S.id} c=${cv} C=${L} form ${form}`, got = W.working(), txt = got.join(' ');
      const fits = [-1, -0.3, 0, 0.4, 1].every(x => Math.abs(sl(F, x) - f(x)) < 1e-6 * Math.max(1, f(x)));
      const q = sl(F, 0) / Math.exp(0), through = Math.abs(F(0) - 1) < 1e-9;
      if (W.fits() !== fits) fail('expint', key, `fits says ${W.fits()}, the nudges say ${fits}`);
      if (got[0] !== `f(x) = e^(${EX[S.id]}). An antiderivative F is any curve whose slope at every x is f(x). The short dashes show that slope, and F has to run along them.`) fail('expint', key, got[0]);
      const m1 = got[1].match(/^You have F\(x\) = (.+?)\. Differentiating multiplies by the number in front of x, (\S+), so F′\(x\) = (\S+) × (\S+)·e\^\((\S+)\) = (.+)\.$/);
      const ex = form ? UP[S.id] : EX[S.id];
      if (!m1) fail('expint', key, `F′ is not worked: ${got[1]}`);
      else {
        const fm = m1[1].match(/^(−?)(?:\((\S+)\)·|(\S+)·)?e\^\((\S+)\)(?: ([+−]) (\S+))?$/);
        const cf = fm && (fm[2] || fm[3] ? frv(fm[2] || fm[3]) : 1) * (fm[1] ? -1 : 1);
        if (!fm || Math.abs(cf - c) > 1e-12 || fm[4] !== ex || (fm[5] ? (fm[5] === '+' ? 1 : -1) * frv(fm[6]) : 0) !== L) fail('expint', key, `F is not written as it is: ${m1[1]}`);
        if (!nearF(m1[2], m) || !nearF(m1[3], c) || !nearF(m1[4], m) || m1[5] !== ex) fail('expint', key, `the chain rule step is wrong: ${got[1]}`);
        const fq = m1[6].match(/^(−?)(?:\((\S+)\)·|(\S+)·)?e\^\((\S+)\)$/), qv = fq && (fq[2] || fq[3] ? frv(fq[2] || fq[3]) : 1) * (fq[1] ? -1 : 1);
        if (!fq || Math.abs(qv - c * m) > 1e-9 || fq[4] !== ex) fail('expint', key, `F′ is wrong: ${m1[6]}`);
        if (/× −|· ?\d+\/\d+·e/.test(got[1]) || /× \d+\/\d+/.test(got[1])) fail('expint', key, `a negative or a fraction is multiplied bare: ${got[1]}`);
      }
      const v = got[2];
      if (form === 1) {
        if (v !== `That is not f at all: raising the exponent is the power rule, but e^(${EX[S.id]}) is not a power of x. An exponential keeps its exponent, so F′ is a multiple of e^(${UP[S.id]}), not of e^(${EX[S.id]}), and F cuts across the dashes.`) fail('expint', key, `the raised form is not caught: ${v}`);
      } else if (fits) {
        const ks = { two: '2', neg: '−2', half: '1/2' }[S.id], ans = { two: '(1/2)·e^(2x)', neg: '−(1/2)·e^(−2x)', half: '2·e^(x/2)' }[S.id];
        if (!v.startsWith(`That is exactly f(x), so F runs along every dash. Dividing by the k inside, ${ks}, undoes the ${ks} that differentiating brings out: ∫ e^(${EX[S.id]}) dx = ${ans} + C.`)) fail('expint', key, `the fit is not said: ${v}`);
        if ((k < 0) !== v.includes('the minus comes along') || (k === 0.5) !== v.includes('Dividing by a half doubles.')) fail('expint', key, `a note on k shows at the wrong time: ${v}`);
      } else if (c === k) {
        const m = v.match(/^That is (\S+) times f: multiplying by (\S+) is what differentiating does\. Integrating has to divide by it instead, so the number in front should be 1\/k = (\S+)\.$/);
        if (!m || !nearF(m[1], k * k) || !nearF(m[2], k) || !nearF(m[3], 1 / k)) fail('expint', key, `the multiply slip is not caught: ${v}`);
      } else {
        const m = v.match(/^That is (\S+) times f, (sloping the wrong way|too steep|too shallow)\. For F′ to be exactly f, the number in front times (\S+) must be 1\.$/);
        const want = c * k < 0 ? 'sloping the wrong way' : c * k > 1 ? 'too steep' : 'too shallow';
        if (!m || !nearF(m[1], c * k) || m[2] !== want || !nearF(m[3], k)) fail('expint', key, `a wrong number in front is not explained: ${v}`);
      }
      const nl = got[3].match(/^Check with a nudge at x = 0\.5: F goes from about (\S+) to about (\S+), so ΔF\/Δx ≈ (\S+), against f\(0\.5\) ≈ (\S+)\.$/);
      if (!nl || Math.abs(num(nl[1]) - F(0.499)) > 1e-6 || Math.abs(num(nl[2]) - F(0.501)) > 1e-6 || !near3(nl[3], sl(F, 0.5)) || !near3(nl[4], f(0.5))) fail('expint', key, `the nudge is wrong: ${got[3]}`);
      const rest = got.slice(4).join(' ');
      if (!fits && got.length !== 4) fail('expint', key, `a fit is talked about where F does not fit: ${rest}`);
      if (fits) {
        if ((L !== 0) !== /the whole curve without changing a single slope, so it still fits: that is the \+ C\./.test(rest) || (L !== 0 && !rest.includes(`${L > 0 ? '+ ' : '− '}`) ) || (L !== 0 && !rest.includes(L > 0 ? 'lifts' : 'lowers'))) fail('expint', key, `the + C is wrong: ${rest}`);
        if (through !== /this is the one antiderivative through the gold point \(0, 1\)\./.test(rest)) fail('expint', key, `the gold point is said at the wrong time: ${rest}`);
        const m0 = rest.match(/It meets x = 0 at F\(0\) = (\S+)\./);
        if (!through && (!m0 || !nearF(m0[1], F(0)))) fail('expint', key, `F(0) is wrong: ${rest}`);
      }
      /* the drawing: every dash along f's slope, F on its own values, coloured by whether it fits */
      const svg = W.svg(), sx = W.W / (b - a), sy = W.Hh / (d0 - c0);
      const PX = v => W.L + (v - a) * sx, PY = v => W.T + W.Hh - (v - c0) * sy;
      const ds = [...svg.matchAll(/data-k="dash" data-x="([\d.-]+)" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)];
      if (ds.length !== 88) fail('expint', key, `the field has ${ds.length} dashes, not 88`);
      for (const d of ds) { dashes++;
        const [x, x1, y1, x2, y2] = d.slice(1).map(Number), s = -((y2 - y1) / sy) / ((x2 - x1) / sx);
        if (Math.abs(s - f(x)) > 0.03 * Math.max(1, f(x)) || x < a || x > b || Math.min(y1, y2) < W.T - 7 || Math.max(y1, y2) > W.T + W.Hh + 7) { fail('expint', key, `a dash does not point along f at x = ${x}`); break; } }
      const polys = [...svg.matchAll(/data-k="F" points="([^"]+)" fill="none" stroke="([^"]+)"/g)];
      if (!polys.length) fail('expint', key, 'F is not drawn');
      for (const p of polys) {
        if (p[2] !== (fits ? '#57cc7a' : '#5aa9e6')) fail('expint', key, 'F is not green exactly when it fits');
        for (const qq of p[1].split(' ')) { const [qx, qy] = qq.split(',').map(Number), vx = a + (qx - W.L) / sx; pts++;
          if (Math.abs(qy - PY(F(vx))) > 0.02 + Math.abs(sl(F, vx)) * sy / sx * 0.006 || qy < W.T - 0.5 || qy > W.T + W.Hh + 0.5) { fail('expint', key, `F leaves its values at ${qq}`); break; } }
      }
      const pt = svg.match(/data-k="pt" cx="([\d.-]+)" cy="([\d.-]+)"/);
      if (!pt || Math.abs(+pt[1] - PX(0)) > 0.01 || Math.abs(+pt[2] - PY(1)) > 0.01) fail('expint', key, 'the gold point is not at (0, 1)');
      const al = (svg.match(/aria-label="([^"]+)"/) || [])[1] || '';
      if (fits !== al.includes('runs along every dash') || through !== al.includes('through the gold point')) fail('expint', key, `the figure's description is wrong: ${al}`);
      const truth = {
        fit: S.id === 'two' && fits, neg: S.id === 'neg' && fits, half: S.id === 'half' && fits,
        times: form === 0 && c === k && !fits, raise: form === 1 && Math.abs(c * (k + 1) - 1) < 1e-12,
        lift: fits && L !== 0, through: fits && through,
      };
      for (const g of W.GOALS) {
        if (!(g.id in truth)) { fail('expint', g.id, 'a goal with no check'); continue; }
        if (!!g.ok(W) !== truth[g.id]) fail('expint', g.id, `${key}: goal ${g.id} is ${truth[g.id] ? 'not ' : ''}met`);
        if (truth[g.id]) found[g.id] = 1;
      }
    })));
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('expint', g.id, 'no setting finds this goal');
  reset();
  return { n, pts, dashes, goals: Object.keys(found).length };
})();

/* The path chain workshop: every hill, every t and every method. The true
   rate is found here by nudging z along Math's own path, and each part by
   nudging the hill in x or y and the path in t, never from the formulas the
   readout uses; every number it works out is checked against those; every
   sentence's condition is decided independently; and the drawing, bars
   included, is read back. */
const pathChainNotes = (() => {
  const W = PathChain;
  const num = t => +t.replace(/[()]/g, '').replace(/−/g, '-');
  const r3 = v => Math.round(v * 1000) / 1000;
  const near3 = (t, v) => Math.abs(num(t) - r3(v)) < 1e-9;
  const eqv = (sign, t, v) => near3(t, v) && (sign === '=') === (Math.abs(r3(v) - v) < 1e-9);
  const sl = (h, x, e = 1e-6) => (h(x + e) - h(x - e)) / (2 * e);
  const HILL = {
    xy: [(x, y) => x * y, t => t * t, t => t],
    ring: [(x, y) => x * x + y * y, Math.cos, Math.sin],
    hill: [(x, y) => x * x * y, t => t, t => 2 - t],
  };
  const VAL = { 'π/6': Math.PI / 6, 'π/4': Math.PI / 4, 'π/3': Math.PI / 3, 'π/2': Math.PI / 2, '2π/3': 2 * Math.PI / 3, 'π': Math.PI, '1/3': 1 / 3, '2/3': 2 / 3, '4/3': 4 / 3, '5/3': 5 / 3 };
  if (W.SETS.map(S => S.id).join() !== 'xy,ring,hill') fail('pathchain', 'sets', W.SETS.map(S => S.id).join());
  if (W.MODES.join() !== 'Both parts,x part only,y part only,Forget the speeds') fail('pathchain', 'modes', W.MODES.join());
  const reset = () => { W.touched = false; W.si = 0; W.k = W.SETS[0].start; W.mode = 0; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('pathchain', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.mode = 2; W.k = 0; W.pick(si);
    if (W.mode !== 0 || W.k !== S.start) fail('pathchain', S.id, 'picking a hill does not start t and the method again');
    for (const g of W.GOALS) if (g.ok(W)) fail('pathchain', g.id, `met where ${S.id} starts, so picking it gives the goal away`);
    W.k = S.T.length - 1; W.moveT(1); if (W.k !== S.T.length - 1) fail('pathchain', S.id, 't does not stop at its last step');
    W.k = 0; W.moveT(-1); if (W.k !== 0) fail('pathchain', S.id, 't does not stop at its first step'); });
  const truth = {
    cancel: (id, t, m, R, P) => id === 'ring' && m === 0 && Math.abs(P) > 1e-9 && Math.abs(R) < 1e-9,
    peak: (id, t, m) => id === 'hill' && m === 0 && Math.abs(t - 4 / 3) < 1e-12,
    tug: (id, t, m, R, P) => m === 0 && P > 1e-9 && R < -1e-9,
    xonly: (id, t, m, R, P) => m === 1 && Math.abs(P - R) > 1e-6,
    yonly: (id, t, m, R, P, Q) => m === 2 && Math.abs(Q - R) > 1e-6,
    speeds: (id, t, m, R, P, Q, F) => m === 3 && Math.abs(F - R) > 1e-6,
    luck: (id, t, m, R, P, Q, F) => m === 3 && Math.abs(F - R) < 1e-6 && Math.abs(R) > 1e-6,
  };
  if (Object.keys(truth).join() !== W.GOALS.map(g => g.id).join()) fail('pathchain', 'goals', W.GOALS.map(g => g.id).join());
  if (W.SETS[2].T.join() !== '0,1/3,2/3,1,4/3,5/3,2') fail('pathchain', 'hill', `t should step from 0 to 2 in thirds: ${W.SETS[2].T.join()}`);
  if (!W.SETS[1].T.includes('π/4')) fail('pathchain', 'ring', `the circle should stop at π/4: ${W.SETS[1].T.join()}`);
  const found = {}; let n = 0, pts = 0;
  W.SETS.forEach((S, si) => {
    const [F, X, Y] = HILL[S.id], Z = t => F(X(t), Y(t));
    const ts = S.T.map(v => typeof v === 'string' ? VAL[v] : v);
    if (ts.some((t, i) => i && t <= ts[i - 1])) fail('pathchain', S.id, `t should rise: ${S.T.join()}`);
    S.T.forEach((tv, k) => [0, 1, 2, 3].forEach(mode => {
      reset(); W.si = si; W.k = k; W.mode = mode; W.touched = true; n++;
      const t = ts[k], T = typeof tv === 'string' ? tv : (tv < 0 ? '−' + -tv : String(tv));
      const key = `${S.id} t=${T} mode ${mode}`, got = W.working(), txt = got.join(' ');
      const x = X(t), y = Y(t), z = Z(t), R = sl(Z, t);
      const fx = sl(v => F(v, y), x), fy = sl(v => F(x, v), y), dx = sl(X, t), dy = sl(Y, t);
      const P = fx * dx, Q = fy * dy, Fs = fx + fy;
      if (Math.abs(W.right() - R) > 1e-6 || Math.abs(W.P() - P) > 1e-6 || Math.abs(W.Q() - Q) > 1e-6) fail('pathchain', key, `the rate ${W.right()} or its parts are not the nudged ${R}`);
      if (Math.abs(P + Q - R) > 1e-6) fail('pathchain', key, 'the two parts do not add to the rate');
      if (got[0] !== `z = ${S.z}, and the point walks along ${S.path}. As t changes both x and y move, so z changes for two reasons.`) fail('pathchain', key, got[0]);
      const m1 = got[1].match(/^At t = (\S+): x ([=≈]) (\S+) and y ([=≈]) (\S+), so z ([=≈]) (\S+)\. Along the path, dx\/dt = (.+?) and dy\/dt = (.+)\.$/);
      if (!m1) fail('pathchain', key, `the point is not worked: ${got[1]}`);
      else {
        if (m1[1] !== T) fail('pathchain', key, `t is not named: ${got[1]}`);
        if (!eqv(m1[2], m1[3], x) || !eqv(m1[4], m1[5], y) || !eqv(m1[6], m1[7], z)) fail('pathchain', key, `the point is wrong: ${got[1]}`);
        [[m1[8], S.dXS, dx], [m1[9], S.dYS, dy]].forEach(([s, f, v]) => {
          const m = s.match(/^(.+?)(?: ([=≈]) (\S+))?$/);
          if (/^−?\d+$/.test(f) ? s !== f || num(f) !== Math.round(v) || Math.abs(v - num(f)) > 1e-6 : !m || m[1] !== f || !m[2] || !eqv(m[2], m[3], v)) fail('pathchain', key, `a speed is wrong: ${s}`);
        });
      }
      const nl = got[got.length - 2].match(/^Check with a nudge: from t ≈ (\S+) to (\S+), z goes from about (\S+) to about (\S+), so Δz\/Δt ≈ (\S+)\.$/);
      if (!nl || !near3(nl[5], R) || Math.abs(num(nl[1]) - (t - 0.001)) > 1e-4 || Math.abs(num(nl[2]) - (t + 0.001)) > 1e-4 || Math.abs(num(nl[3]) - Z(t - 0.001)) > 1e-6 || Math.abs(num(nl[4]) - Z(t + 0.001)) > 1e-6) fail('pathchain', key, `the nudge is wrong: ${got[got.length - 2]}`);
      const last = got[got.length - 1], zero = Math.abs(R) < 1e-9, wrongV = [R, P, Q, Fs][mode], same = Math.abs(wrongV - R) < 1e-6;
      if (mode === 0) {
        const m2 = got[2].match(/^dz\/dt = \(∂z\/∂x\)\(dx\/dt\) \+ \(∂z\/∂y\)\(dy\/dt\), with ∂z\/∂x = (\S+) ([=≈]) (\S+) and ∂z\/∂y = (\S+) ([=≈]) (\S+)\.$/);
        if (!m2 || m2[1] !== S.fxS || m2[4] !== S.fyS || !eqv(m2[2], m2[3], fx) || !eqv(m2[5], m2[6], fy)) fail('pathchain', key, `the partials are wrong: ${got[2]}`);
        const m3 = got[3].match(/^The x part is (\S+) × (\S+) ([=≈]) (\S+) and the y part is (\S+) × (\S+) ([=≈]) (\S+), so dz\/dt ([=≈]) (\S+)\.$/);
        if (!m3 || !near3(m3[1], fx) || !near3(m3[2], dx) || !eqv(m3[3], m3[4], P) || !near3(m3[5], fy) || !near3(m3[6], dy) || !eqv(m3[7], m3[8], Q) || !eqv(m3[9], m3[10], R)) fail('pathchain', key, `the parts are wrong: ${got[3]}`);
        const cancel = zero && Math.abs(P) > 1e-9;
        if (cancel !== /The two parts cancel/.test(last)) fail('pathchain', key, `the cancel sentence shows at the wrong time: ${last}`);
        if ((S.id === 'ring') !== /circles the bowl at radius 1/.test(last) && zero) fail('pathchain', key, `the circle is not explained: ${last}`);
        const top = S.id === 'hill' && Math.abs(t - 4 / 3) < 1e-12;
        if (top !== /highest point of z along the path, 32\/27 ≈ 1\.185\./.test(last) || (top && Math.abs(z - 32 / 27) > 1e-12)) fail('pathchain', key, `the top sentence shows at the wrong time: ${last}`);
        if (zero && !cancel && !/both parts are 0 here/.test(last)) fail('pathchain', key, `a still point is not said: ${last}`);
        const tug = P > 1e-9 && R < -1e-9;
        if (tug !== /the y part pulls harder/.test(last)) fail('pathchain', key, `the tug of war shows at the wrong time: ${last}`);
        if (!zero && !tug && last !== `That agrees with dz/dt ${Math.abs(r3(R) - R) < 1e-9 ? '=' : '≈'} ${W.num(R)}: z ${R > 0 ? 'rises' : 'falls'} as t rises here.`) fail('pathchain', key, `the verdict is wrong: ${last}`);
      } else {
        const want = mode === 1 ? /^The slip keeps only the x part: \(∂z\/∂x\)\(dx\/dt\) = (\S+) × (\S+) ([=≈]) (\S+), as if y stood still\.$/
          : mode === 2 ? /^The slip keeps only the y part: \(∂z\/∂y\)\(dy\/dt\) = (\S+) × (\S+) ([=≈]) (\S+), as if x stood still\.$/
          : /^The slip forgets the speeds and adds the slopes of the hill: ∂z\/∂x \+ ∂z\/∂y = (\S+) \+ (\S+) ([=≈]) (\S+)\.$/;
        const m = got[2].match(want), a1 = mode === 2 ? fy : fx, a2 = mode === 1 ? dx : mode === 2 ? dy : fy;
        if (!m || !near3(m[1], a1) || !near3(m[2], a2) || !eqv(m[3], m[4], wrongV)) fail('pathchain', key, `the slip is wrong: ${got[2]}`);
        if (!same) {
          const miss = mode === 1 ? `it misses the y part, ${W.num(Q)}.` : mode === 2 ? `it misses the x part, ${W.num(P)}.` : 'multiplied by how fast the path moves that way.';
          if (!last.includes('is wrong') || !last.includes(miss) || !last.endsWith(`The rate is ${W.num(R)}.`)) fail('pathchain', key, `the slip is not caught: ${last}`);
        } else if (zero !== /everything is 0/.test(last) || (!zero && mode === 3) !== /by luck/.test(last)) fail('pathchain', key, `a slip that agrees is not explained: ${last}`);
        else if (!zero && mode < 3 && last !== `It gets it right here only because the ${mode === 1 ? 'y' : 'x'} part happens to be 0. Anywhere else it would be wrong.`) fail('pathchain', key, `a dropped part is not said to be 0: ${last}`);
        if (!zero && same && mode < 3 && Math.abs(mode === 1 ? Q : P) > 1e-6) fail('pathchain', key, 'a dropped part is called 0 but is not');
        if (!zero && same && mode === 3 && (Math.abs(dx - 1) > 1e-6 || Math.abs(dy - 1) > 1e-6)) fail('pathchain', key, 'luck is said where a speed is not 1');
      }
      if (/× −/.test(txt)) fail('pathchain', key, 'a negative number is multiplied without brackets');
      if (/ = (\S+) = \1[.,]/.test(txt)) fail('pathchain', key, 'a number is said to equal itself');
      /* the figure: the point on the curve, the tangent's slope, the slip's line only when it differs, and the bars */
      const svg = W.svg(), [a, b] = S.D, [c, d] = S.R;
      const PX = v => W.L + (v - a) / (b - a) * W.W, PY = v => W.T0 + W.Hh - (v - c) / (d - c) * W.Hh;
      const pt = svg.match(/data-k="pt" cx="([\d.-]+)" cy="([\d.-]+)"/);
      if (!pt || Math.abs(+pt[1] - PX(t)) > 0.01 || Math.abs(+pt[2] - PY(z)) > 0.01) fail('pathchain', key, 'the gold point is not on the curve at t');
      const line = k2 => { const m = svg.match(new RegExp(`data-k="${k2}" x1="([\\d.-]+)" y1="([\\d.-]+)" x2="([\\d.-]+)" y2="([\\d.-]+)"`)); return m && m.slice(1).map(Number); };
      const slope = L => -((L[3] - L[1]) / (W.Hh / (d - c))) / ((L[2] - L[0]) / (W.W / (b - a)));
      const Tn = line('tan'), Sl = line('slip');
      if (!Tn || Math.abs(slope(Tn) - R) > 0.02 * Math.max(1, Math.abs(R))) fail('pathchain', key, `the tangent is drawn with slope ${Tn && slope(Tn)}, not ${R}`);
      if ((mode > 0 && !same) !== !!Sl || (Sl && Math.abs(slope(Sl) - wrongV) > 0.02 * Math.max(1, Math.abs(wrongV)))) fail('pathchain', key, `the slip's line is wrong`);
      for (const L of [Tn, Sl].filter(Boolean)) if (L.some((v, i) => i % 2 ? v < W.T0 - 0.5 || v > W.T0 + W.Hh + 0.5 : v < W.L - 0.5 || v > W.L + W.W + 0.5)) fail('pathchain', key, 'a line runs off the chart');
      const zx = svg.match(/data-k="zero" x1="([\d.-]+)"/), mid = zx && +zx[1];
      const bar = k2 => { const m = svg.match(new RegExp(`data-k="${k2}" x="([\\d.-]+)" y="[\\d.-]+" width="([\\d.-]+)"`)); return m ? (+m[1] < mid - 0.01 ? -1 : 1) * +m[2] : NaN; };
      const u = 120 / Math.max(1, Math.abs(P), Math.abs(Q), Math.abs(R)), bx = bar('xpart'), by = bar('ypart'), bs = bar('sum');
      const bars = [...svg.matchAll(/<rect [^>]*x="([\d.-]+)" y="[\d.-]+" width="([\d.-]+)"/g)].map(m => [+m[1], +m[1] + +m[2]]);
      if (bars.some(([l, rr]) => l < 60 - 0.01 || rr > 352)) fail('pathchain', key, 'a bar runs into its label or off the side');
      if (!zx || Math.abs(bx - P * u) > 0.02 || Math.abs(by - Q * u) > 0.02 || Math.abs(bs - R * u) > 0.02 || Math.abs(bx + by - bs) > 0.05) fail('pathchain', key, `the bars do not show the parts: ${bx}, ${by}, ${bs}`);
      const poly = svg.match(/data-k="curve" points="([^"]+)"/);
      if (!poly) fail('pathchain', key, 'no curve');
      else for (const q of poly[1].split(' ')) { const [qx, qy] = q.split(',').map(Number), vt = a + (qx - W.L) / W.W * (b - a); pts++;
        if (Math.abs(qy - PY(Z(vt))) > 0.05 || qy < W.T0 - 0.5 || qy > W.T0 + W.Hh + 0.5) { fail('pathchain', key, `the curve leaves z = ${S.z} at ${q}`); break; } }
      if (!/aria-label="[^"]+"/.test(svg)) fail('pathchain', key, 'the figure has no description');
      for (const g of W.GOALS) {
        const want = truth[g.id](S.id, t, mode, R, P, Q, Fs);
        if (!!g.ok(W) !== want) fail('pathchain', g.id, `${key}: goal ${g.id} is ${want ? 'not ' : ''}met`);
        if (want) found[g.id] = 1;
      }
    }));
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('pathchain', g.id, 'no step finds this goal');
  reset();
  return { n, pts, goals: Object.keys(found).length };
})();

/* The log slope workshop: every slope is checked against a nudge on Math's
   own x ** p(x), never against ln x + 1 or the other worked formulas. */
const logDiffNotes = (() => {
  const W = LogDiff;
  const num = t => +t.replace(/−/g, '-');
  const r3 = v => Math.round(v * 1000) / 1000;
  const near3 = (t, v) => Math.abs(num(t) - r3(v)) < 1e-9;
  const POW = { xx: x => x, x2x: x => 2 * x, root: x => 1 / x };
  const Y = (id, x) => Math.pow(x, POW[id](x));
  const sl = (h, x, e = 1e-6) => (h(x + e) - h(x - e)) / (2 * e);
  const VAL = { '1/e': 1 / Math.E, e: Math.E };
  if (W.SETS.map(S => S.id).join() !== 'xx,x2x,root') fail('logdiff', 'sets', W.SETS.map(S => S.id).join());
  if (W.MODES.join() !== 'Take ln first,Power rule,Exponent rule,Both, added') fail('logdiff', 'modes', W.MODES.join());
  const reset = () => { W.touched = false; W.si = 0; W.k = W.SETS[0].start; W.mode = 0; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('logdiff', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.mode = 2; W.k = 0; W.pick(si);
    if (W.mode !== 0 || W.k !== S.start) fail('logdiff', S.id, 'picking a curve does not start x and the method again');
    for (const g of W.GOALS) if (g.ok(W)) fail('logdiff', g.id, `met where ${S.id} starts, so picking it gives the goal away`);
    W.k = S.X.length - 1; W.moveX(1); if (W.k !== S.X.length - 1) fail('logdiff', S.id, 'x does not stop at its last step');
    W.k = 0; W.moveX(-1); if (W.k !== 0) fail('logdiff', S.id, 'x does not stop at its first step'); });
  const truth = {
    flat: (id, x, m, R) => id === 'xx' && m === 0 && x === 1 / Math.E,
    two: (id, x, m, R) => id === 'x2x' && m === 0 && Math.abs(R - 2) < 1e-6,
    peak: (id, x, m, R) => id === 'root' && m === 0 && Math.abs(R) < 1e-6,
    power: (id, x, m, R, P, E) => m === 1 && Math.abs(P - R) > 1e-6,
    expo: (id, x, m, R, P, E) => m === 2 && Math.abs(E - R) > 1e-6,
    luck: (id, x, m, R, P, E) => m === 1 && Math.abs(P - R) < 1e-6,
    sum: (id, x, m, R, P, E) => m === 3 && Math.abs(P) > 1e-6 && Math.abs(E) > 1e-6,
  };
  if (Object.keys(truth).join() !== W.GOALS.map(g => g.id).join()) fail('logdiff', 'goals', W.GOALS.map(g => g.id).join());
  const found = {}; let n = 0, pts = 0;
  W.SETS.forEach((S, si) => {
    const xs = S.X.map(v => typeof v === 'string' ? VAL[v] : v);
    if (xs.some((x, i) => i && x <= xs[i - 1]) || !S.X.includes(1)) fail('logdiff', S.id, `x should rise and pass through 1: ${S.X.join()}`);
    if (!S.X.includes(S.id === 'root' ? 'e' : '1/e')) fail('logdiff', S.id, `the flat point is not a step: ${S.X.join()}`);
    S.X.forEach((xv, k) => [0, 1, 2, 3].forEach(mode => {
      reset(); W.si = si; W.k = k; W.mode = mode; W.touched = true; n++;
      const x = typeof xv === 'string' ? VAL[xv] : xv, X = typeof xv === 'string' ? xv : (xv < 0 ? '−' + -xv : String(xv));
      const key = `${S.id} x=${X} mode ${mode}`, got = W.working(), txt = got.join(' ');
      const y = Y(S.id, x), R = sl(t => Y(S.id, t), x), p = POW[S.id](x), dp = sl(POW[S.id], x);
      const P = p * Math.pow(x, p - 1), E = y * Math.log(x) * dp;
      if (Math.abs(W.right() - R) > 1e-6) fail('logdiff', key, `the slope ${W.right()} is not the nudged ${R}`);
      if (Math.abs(P + E - R) > 1e-6) fail('logdiff', key, 'the two parts do not add to the slope');
      if (got[0] !== `y = ${S.y}: x is in the base and in the power, so neither the power rule (a fixed power) nor the exponent rule (a fixed base) fits on its own.`) fail('logdiff', key, got[0]);
      const m1 = got[1].match(/^At x = (\S+?)(?: ≈ (\S+))?: y = (\S+) ([=≈]) (\S+), and ln (\S+) ([=≈]) (\S+)\.$/);
      if (!m1) fail('logdiff', key, `the point is not worked: ${got[1]}`);
      else {
        if (m1[1] !== X || (typeof xv === 'string') !== !!m1[2] || (m1[2] && !near3(m1[2], x))) fail('logdiff', key, `x is not named: ${got[1]}`);
        if (!near3(m1[5], y) || (m1[4] === '=') !== (Math.abs(r3(y) - y) < 1e-9)) fail('logdiff', key, `y is wrong: ${got[1]}`);
        const base = m1[3].match(/^\(?(.+?)\)?\^\((.+)\)$/), ev = t => t === 'e' ? Math.E : t === '1/e' ? 1 / Math.E : t === '2/e' ? 2 / Math.E : /^1\//.test(t) ? 1 / num(t.slice(2)) : num(t);
        if (!base || Math.abs(Math.pow(ev(base[1]), ev(base[2])) - y) > 1e-9 || ev(base[1]) !== x) fail('logdiff', key, `y is not x to its power: ${m1[3]}`);
        if (m1[6] !== X || !near3(m1[8], Math.log(x)) || (m1[7] === '=') !== (Math.abs(r3(Math.log(x)) - Math.log(x)) < 1e-12)) fail('logdiff', key, `ln x is wrong: ${got[1]}`);
      }
      const nl = got[got.length - 2].match(/^Check with a nudge: from x = (\S+) to (\S+), y goes from about (\S+) to about (\S+), so Δy\/Δx ≈ (\S+)\.$/);
      if (!nl || !near3(nl[5], R) || Math.abs(num(nl[1]) - (x - 0.001)) > 1e-4 || Math.abs(num(nl[3]) - Y(S.id, x - 0.001)) > 1e-6 || Math.abs(num(nl[4]) - Y(S.id, x + 0.001)) > 1e-6) fail('logdiff', key, `the nudge is wrong: ${got[got.length - 2]}`);
      const last = got[got.length - 1], zero = Math.abs(R) < 1e-6;
      if (mode === 0) {
        if (got[2] !== `Take ln of both sides: ln y = ${S.lnY}. Differentiate both sides: y′/y = ${S.dl}.`) fail('logdiff', key, got[2]);
        const m3 = got[3].match(/^Here y′\/y ([=≈]) (\S+), so multiply back by y: y′ = (\S+) × \(?(\S+?)\)? ([=≈]) (\S+)\.$/);
        if (!m3 || !near3(m3[2], R / y) || !near3(m3[3], y) || !near3(m3[4], R / y) || !near3(m3[6], R)) fail('logdiff', key, `the multiply back is wrong: ${got[3]}`);
        const top = S.id === 'root' && Math.abs(x - Math.E) < 1e-12;
        if (top !== /this is the top of x\^\(1\/x\)/.test(last)) fail('logdiff', key, `the top sentence shows at the wrong time: ${last}`);
        if ((zero && !top) !== /this is the lowest point of/.test(last) || (zero && !top && !last.includes(`lowest point of ${S.y},`))) fail('logdiff', key, `the bottom sentence is wrong: ${last}`);
        if (!zero && last !== `That agrees with y′ ${Math.abs(r3(R) - R) < 1e-9 ? '=' : '≈'} ${W.num(R)}: y ${R > 0 ? 'rises' : 'falls'} as x rises here.`) fail('logdiff', key, `the verdict is wrong: ${last}`);
      } else if (mode === 3) {
        const m = got[2].match(/^Add the two: the power rule part .+ ([=≈]) (\S+), plus the exponent rule part .+ ([=≈]) (\S+), makes (\S+)\.$/);
        if (!m || !near3(m[2], P) || !near3(m[4], E) || !near3(m[5], R)) fail('logdiff', key, `the sum is wrong: ${got[2]}`);
        if (!/^That is y′ exactly\./.test(last)) fail('logdiff', key, `the sum verdict is wrong: ${last}`);
      } else {
        const v = mode === 1 ? P : E, m = got[2].match(/^The slip uses the (power|exponent) rule, .*: y′ = .+ ([=≈]) (\S+)\.$/);
        if (!m || m[1] !== (mode === 1 ? 'power' : 'exponent') || !near3(m[3], v)) fail('logdiff', key, `the slip is wrong: ${got[2]}`);
        const same = Math.abs(v - R) < 1e-6;
        if (same !== /by luck/.test(last) || (same && Math.abs(Math.log(x)) > 1e-12)) fail('logdiff', key, `luck is said at the wrong time: ${last}`);
        if (!same && (!last.startsWith(`So the ${mode === 1 ? 'power' : 'exponent'} rule is wrong`) || !last.endsWith(`The slope is ${W.num(R)}.`) || !near3(last.match(/ ([=≈]) (\S+)\. The slope/)?.[2] || 'NaN', mode === 1 ? E : P))) fail('logdiff', key, `the slip is not caught: ${last}`);
      }
      if (/(^|[^\w)])−[\d.]+²/.test(txt)) fail('logdiff', key, 'a negative number is squared without brackets');
      /* the figure: the point on the curve, the tangent's slope, the slip's line only when it differs */
      const svg = W.svg(), [a, b] = S.D, [c, d] = S.R;
      const PX = v => W.L + (v - a) / (b - a) * W.W, PY = v => W.T + W.Hh - (v - c) / (d - c) * W.Hh;
      const pt = svg.match(/data-k="pt" cx="([\d.-]+)" cy="([\d.-]+)"/);
      if (!pt || Math.abs(+pt[1] - PX(x)) > 0.01 || Math.abs(+pt[2] - PY(y)) > 0.01) fail('logdiff', key, 'the gold point is not on the curve at x');
      const line = k2 => { const m = svg.match(new RegExp(`data-k="${k2}" x1="([\\d.-]+)" y1="([\\d.-]+)" x2="([\\d.-]+)" y2="([\\d.-]+)"`)); return m && m.slice(1).map(Number); };
      const slope = L => -((L[3] - L[1]) / (W.Hh / (d - c))) / ((L[2] - L[0]) / (W.W / (b - a)));
      const T = line('tan'), wrongV = mode === 1 ? P : mode === 2 ? E : R, slipOn = mode > 0 && Math.abs(wrongV - R) > 1e-6, Sl = line('slip');
      if (!T || Math.abs(slope(T) - R) > 0.02 * Math.max(1, Math.abs(R))) fail('logdiff', key, `the tangent is drawn with slope ${T && slope(T)}, not ${R}`);
      if (slipOn !== !!Sl || (Sl && Math.abs(slope(Sl) - wrongV) > 0.02 * Math.max(1, Math.abs(wrongV)))) fail('logdiff', key, `the slip's line is wrong`);
      for (const L of [T, Sl].filter(Boolean)) if (L.some((v, i) => i % 2 ? v < W.T - 0.5 || v > W.T + W.Hh + 0.5 : v < W.L - 0.5 || v > W.L + W.W + 0.5)) fail('logdiff', key, 'a line runs off the chart');
      const poly = svg.match(/data-k="curve" points="([^"]+)"/);
      if (!poly) fail('logdiff', key, 'no curve');
      else for (const q of poly[1].split(' ')) { const [qx, qy] = q.split(',').map(Number), vx = a + (qx - W.L) / W.W * (b - a); pts++;
        if (Math.abs(qy - PY(Y(S.id, vx))) > 0.05 || qy < W.T - 0.5) { fail('logdiff', key, `the curve leaves y = ${S.y} at ${q}`); break; } }
      if (!/aria-label="[^"]+"/.test(svg)) fail('logdiff', key, 'the figure has no description');
      for (const g of W.GOALS) {
        const want = truth[g.id](S.id, x, mode, R, P, E);
        if (!!g.ok(W) !== want) fail('logdiff', g.id, `${key}: goal ${g.id} is ${want ? 'not ' : ''}met`);
        if (want) found[g.id] = 1;
      }
    }));
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('logdiff', g.id, 'no step finds this goal');
  reset();
  return { n, pts, goals: Object.keys(found).length };
})();

/* The inverse slope workshop: every inverse, every u and every method.
   The true slopes are found here by nudging Math's own arcsin, arccos and
   arctan, and f′ by nudging sin, cos and tan at x, never from the identities
   the readout uses; every number it works out is checked against those; every
   sentence's condition is decided independently; and the drawing is read
   back point by point. */
const invSlopeNotes = (() => {
  const W = InvSlope;
  const num = t => +t.replace(/−/g, '-');
  const sl = (h, x, e = 1e-6) => (h(x + e) - h(x - e)) / (2 * e);
  const r3 = v => Math.round(v * 1000) / 1000;
  const near3 = (t, v) => Math.abs(num(t) - r3(v)) < 1e-9;
  const TRUE = { asin: [Math.sin, Math.asin], acos: [Math.cos, Math.acos], atan: [Math.tan, Math.atan] };
  if (W.SETS.map(S => S.id).join() !== 'asin,acos,atan') fail('invslope', 'sets', W.SETS.map(S => S.id).join());
  if (W.MODES.join() !== 'Flip f′ at x,Forget to flip,Flip at u') fail('invslope', 'modes', W.MODES.join());
  const reset = () => { W.touched = false; W.si = 0; W.k = W.SETS[0].start; W.mode = 0; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('invslope', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.mode = 2; W.k = 0; W.pick(si);
    if (W.mode !== 0 || W.k !== S.start) fail('invslope', S.id, 'picking an inverse does not start u and the method again');
    for (const g of W.GOALS) if (g.ok(W)) fail('invslope', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  const found = {}; let n = 0, pts = 0;
  W.SETS.forEach((S, si) => {
    const [F, G] = TRUE[S.id], [a, b] = S.D;
    if (S.U.some((u, i) => i && u <= S.U[i - 1]) || S.U[0] !== -S.U[S.U.length - 1] || !S.U.includes(0)) fail('invslope', S.id, `u should run evenly either side of 0: ${S.U.join()}`);
    if (S.id !== 'atan' && (S.U[0] !== -1 || S.U.length !== 11)) fail('invslope', S.id, `u should step from −1 to 1 in fifths: ${S.U.join()}`);
    S.U.forEach((u, k) => [0, 1, 2].forEach(mode => {
      reset(); W.si = si; W.k = k; W.mode = mode; W.touched = true; n++;
      const key = `${S.id} u=${u} mode ${mode}`, got = W.working(), txt = got.join(' ');
      const x = G(u), wall = Math.abs(u) === 1 && S.id !== 'atan';
      const fpx = wall ? 0 : sl(F, x), right = wall ? NaN : sl(G, u), fpu = sl(F, u);
      const U = u < 0 ? '−' + -u : String(u);
      if (got[0] !== `g(u) = ${S.g} u undoes f(x) = ${S.f} x, for x from ${S.range}. Its graph is f’s mirrored in the line y = x.`) fail('invslope', key, got[0]);
      if (S.range !== (S.id === 'acos' ? '0 to π' : '−π/2 to π/2')) fail('invslope', key, `the range is wrong: ${S.range}`);
      if (/(^|[^\w)])−[\d.]+²/.test(txt)) fail('invslope', key, `a negative number is squared without brackets, which reads as minus its square: ${txt}`);
      const m1 = got[1].match(/^At u = (\S+): x = (\w+) (\S+) ([=≈]) (\S+), the angle whose (\w+) is (\S+)\. The point \((\S+), (\S+)\) on f mirrors to \((\S+), (\S+)\) on g\.$/);
      if (!m1) fail('invslope', key, `the point is not worked: ${got[1]}`);
      else {
        if (m1[1] !== U || m1[7] !== U || m1[9] !== U || m1[10] !== U || m1[3].replace(/[()]/g, '') !== U || m1[2] !== S.g) fail('invslope', key, `u is named wrong: ${got[1]}`);
        if (m1[6] !== { asin: 'sine', acos: 'cosine', atan: 'tangent' }[S.id]) fail('invslope', key, `the function is named wrong: ${got[1]}`);
        if (!near3(m1[5], x) || !near3(m1[8], x) || !near3(m1[11], x)) fail('invslope', key, `x is not ${S.g} u: ${got[1]}`);
        if ((m1[4] === '=') !== (r3(x) === x)) fail('invslope', key, `x is said to be exact when it is not, or the other way round: ${got[1]}`);
        if (Math.abs(F(x) - u) > 1e-9) fail('invslope', key, 'x does not undo u');
      }
      const m2 = got[2].match(/ (\(?−?[\d.]+\)?)²\)? ([=≈]) (\S+?)\.$|1 \+ (\(?−?[\d.]+\)?)² = (\S+)\.$/);
      if (!m2) fail('invslope', key, `f′ is not worked: ${got[2]}`);
      else { const v = num(m2[3] || m2[5]), sq = (m2[1] || m2[4]).replace(/[()]/g, '');
        if (sq !== U) fail('invslope', key, `f′ squares the wrong number: ${got[2]}`);
        if (Math.abs(v - r3(fpx)) > 1e-6 && !(wall && v === 0)) fail('invslope', key, `f′(x) is wrong: ${got[2]} but f′ is ${fpx}`); }
      if (!got[2].startsWith({ asin: 'f′(x) = cos x', acos: 'f′(x) = −sin x', atan: 'f′(x) = 1/cos²x' }[S.id])) fail('invslope', key, `f′ is the wrong derivative: ${got[2]}`);
      if (wall) {
        if (got.length !== 4 || got[3] !== `f′(x) = 0: f is flat here, so its mirror stands straight up, and g has no slope at u = ${U}: 1/0 is no number.`) fail('invslope', key, `the wall is not said plainly: ${got.slice(3).join(' ')}`);
      } else {
        const slip = mode === 1 ? fpx : mode === 2 ? 1 / fpu : right, caught = Math.abs(slip - right) > 1e-6;
        if (mode === 0) { const m = got[3].match(/^Mirroring in y = x swaps rise and run, so the slope flips: g′\((\S+)\) = 1\/f′\(x\) = 1\/(\(?\S+?\)?) ([=≈]) (\S+)\.$/);
          if (!m || m[1] !== U || Math.abs(num(m[2].replace(/[()]/g, '')) - r3(fpx)) > 1e-9 || !near3(m[4], right)) fail('invslope', key, `the flip is wrong: ${got[3]}`); }
        if (mode === 1) { const m = got[3].match(/^The slip forgets to flip: it takes f′\(x\) [=≈] (\S+) as the slope of g\. But that is the slope of f, the curve before the mirror\.$/);
          if (!m || !near3(m[1], fpx)) fail('invslope', key, `the unflipped slip is wrong: ${got[3]}`); }
        if (mode === 2) { const m = got[3].match(/^The slip flips f′ at u: 1\/f′\((\S+)\) = (.+?)(?: ([=≈]) (\S+)\. But|, but sin 0 = 0, so that is 1\/0, no number at all\. And) f′ belongs at x [=≈] (\S+), the point on f that mirrors to u, not at u itself\.$/);
          if (!m || m[1] !== U || !near3(m[5], x)) fail('invslope', key, `the wrong-point slip is wrong: ${got[3]}`);
          else if (Math.abs(fpu) < 1e-9) { if (m[4]) fail('invslope', key, `1/0 is given a value: ${got[3]}`); }
          else if (!m[4] || !near3(m[4], 1 / fpu)) fail('invslope', key, `1/f′(u) is wrong: ${got[3]}`);
          else { const ex = m[2].replace(/−/g, '-').replace(/\(|\)/g, '').replace(/cos² (\S+)/, 'Math.cos($1)**2').replace(/(cos|sin) (\S+)/, 'Math.$1($2)');
            if (Math.abs(Function('return ' + ex)() - 1 / fpu) > 1e-9) fail('invslope', key, `1/f′(u) is written wrong: ${m[2]}`); } }
        const m4 = got[4].match(/^Check with a nudge: from u = (\S+) to (\S+), g goes from (?:about )?(\S+) to (?:about )?(\S+), so Δg\/Δu ≈ (\S+)\.$/);
        if (!m4) fail('invslope', key, `the nudge is not worked: ${got[4]}`);
        else { const u1 = num(m4[1]), u2 = num(m4[2]);
          if (Math.abs(u1 - (u - 0.001)) > 1e-9 || Math.abs(u2 - (u + 0.001)) > 1e-9) fail('invslope', key, `the nudge is not either side of u: ${got[4]}`);
          if (Math.abs(num(m4[3]) - G(u1)) > 6e-7 || Math.abs(num(m4[4]) - G(u2)) > 6e-7) fail('invslope', key, `the nudge reads g wrong: ${got[4]}`);
          if (!near3(m4[5], (G(u2) - G(u1)) / (u2 - u1))) fail('invslope', key, `the nudge is wrong: ${got[4]}`); }
        const v = got.slice(5);
        if (mode === 0) {
          const rule = { asin: '1/√(1 − u²)', acos: '−1/√(1 − u²)', atan: '1/(1 + u²)' }[S.id], m = (v[0] || '').match(/^That agrees: the slope of (\w+) u is (.+) everywhere, and here g′\((\S+)\) [=≈] (\S+)\.$/);
          if (!m || m[1] !== S.g || m[2] !== rule || m[3] !== U || !near3(m[4], right)) fail('invslope', key, `the verdict is wrong: ${v[0]}`);
          const extra = S.id === 'acos' ? 'Arccos falls everywhere: cos falls from 0 to π, and the mirror of a falling curve falls too.' : S.id === 'atan' ? 'Arctan never stands straight up: tan is never flat, so 1/f′ is always a number.' : null;
          if (v.length !== (extra ? 2 : 1) || (extra && v[1] !== extra)) fail('invslope', key, `the closing sentence is wrong: ${v.slice(1).join(' ')}`);
        } else if (v.length !== 1) fail('invslope', key, `the readout has ${got.length} sentences`);
        else if (caught) {
          const m = v[0].match(mode === 1 ? /^So forgetting to flip is wrong: the slope of g is 1 over the slope of f, here (\S+)\.$/ : /^So flipping at u is wrong: f′ has to be taken at x [=≈] (\S+), which gives (\S+)\.$/);
          if (!m || !near3(m[m.length - 1], right) || (mode === 2 && !near3(m[1], x))) fail('invslope', key, `the slip is not caught: ${v[0]}`);
        } else if (v[0] !== (mode === 1 ? `It gets it right here by luck: f′(x) = ${r3(fpx) < 0 ? '−1' : '1'}, and 1/${r3(fpx) < 0 ? '(−1)' : '1'} = ${r3(fpx) < 0 ? '−1' : '1'}, so flipping changes nothing. Anywhere else it would be wrong.` : `It gets it right here only because x = u = ${U}: the wrong point is the right one. Anywhere else it would be wrong.`)) fail('invslope', key, `luck is not explained: ${v[0]}`);
        if (mode === 1 && caught !== (Math.abs(Math.abs(fpx) - 1) > 1e-9)) fail('invslope', key, 'forgetting to flip is caught when f′ is ±1, or not caught when it is not');
        if (mode === 2 && caught !== (Math.abs(x - u) > 1e-9)) fail('invslope', key, 'flipping at u is caught when x = u, or not caught when it is not');
      }
      // the drawing
      const svg = W.svg(), L = W.L, T = W.T, SZ = W.SZ, X = px => a + (px - L) / SZ * (b - a), Y = py => a + (T + SZ - py) / SZ * (b - a);
      const inBox = (px, py) => px >= L - 0.01 && px <= L + SZ + 0.01 && py >= T - 0.01 && py <= T + SZ + 0.01;
      for (const [kk, onIt] of [['f', (p, q) => Math.abs(F(p) - q) < 0.01 * (b - a)], ['g', (p, q) => Math.abs(F(q) - p) < 0.01 * (b - a)]]) {
        let c = 0;
        for (const pl of svg.matchAll(new RegExp(`data-k="${kk}" points="([^"]+)"`, 'g'))) for (const pt of pl[1].split(' ')) {
          const [px, py] = pt.split(',').map(Number); c++;
          if (!inBox(px, py) || !onIt(X(px), Y(py))) { fail('invslope', key, `${kk} leaves its curve at ${pt}`); break; } }
        if (c < 60) fail('invslope', key, `${kk} is hardly drawn`); pts += c; }
      const dot = k => { const m = svg.match(new RegExp(`data-k="${k}" cx="([\\d.-]+)" cy="([\\d.-]+)"`)); return m && [X(+m[1]), Y(+m[2])]; };
      const fp = dot('fpt'), gp = dot('gpt'), tol = 0.006 * (b - a);
      if (!fp || Math.abs(fp[0] - x) > tol || Math.abs(fp[1] - u) > tol) fail('invslope', key, 'the blue point is not (x, u) on f');
      if (!gp || Math.abs(gp[0] - u) > tol || Math.abs(gp[1] - x) > tol) fail('invslope', key, 'the gold point is not its mirror (u, x) on g');
      const line = k => { const m = svg.match(new RegExp(`data-k="${k}" x1="([\\d.-]+)" y1="([\\d.-]+)" x2="([\\d.-]+)" y2="([\\d.-]+)"`)); return m && m.slice(1).map(Number); };
      const slope = l => { const dx = X(l[2]) - X(l[0]), dy = Y(l[3]) - Y(l[1]); return Math.abs(dx) < 1e-9 ? Infinity : dy / dx; };
      const through = (l, p, q) => { const d = Math.abs((X(l[2]) - X(l[0])) * (Y(l[1]) - q) - (X(l[0]) - p) * (Y(l[3]) - Y(l[1]))) / Math.hypot(X(l[2]) - X(l[0]), Y(l[3]) - Y(l[1])); return d < tol; };
      const mir = line('mirror'); if (!mir || mir[0] !== L || mir[1] !== T + SZ || mir[2] !== L + SZ || mir[3] !== T) fail('invslope', key, 'the mirror line is not y = x');
      const lk = line('link'); if (!lk || Math.abs(X(lk[0]) - x) > tol || Math.abs(Y(lk[1]) - u) > tol || Math.abs(X(lk[2]) - u) > tol || Math.abs(Y(lk[3]) - x) > tol) fail('invslope', key, 'the dotted line does not join the point to its mirror');
      const gt = line('gtan'), ft = line('ftan'), st = line('slip');
      if (!gt || !through(gt, u, x) || (wall ? slope(gt) !== Infinity : Math.abs(slope(gt) - right) > 0.02 * Math.max(1, Math.abs(right)))) fail('invslope', key, `g’s tangent is drawn wrong`);
      if (!ft || !through(ft, x, u) || Math.abs(slope(ft) - fpx) > 0.02 * Math.max(1, Math.abs(fpx))) fail('invslope', key, `f’s tangent is drawn wrong`);
      const slipOn = !wall && mode > 0 && !(mode === 2 && Math.abs(fpu) < 1e-9), slipV = mode === 1 ? fpx : 1 / fpu;
      if (!!st !== slipOn) fail('invslope', key, `the slip’s line is ${st ? 'drawn' : 'missing'}`);
      if (st && (!through(st, u, x) || Math.abs(slope(st) - slipV) > 0.02 * Math.max(1, Math.abs(slipV)))) fail('invslope', key, 'the slip’s line is drawn with the wrong slope');
      for (const l of [gt, ft, st, lk]) if (l && (!inBox(l[0], l[1]) || !inBox(l[2], l[3]))) fail('invslope', key, 'a line runs off the chart');
      const meant = { one: si === 0 && mode === 0 && u === 0, wall: si === 0 && wall, gentle: si === 1 && mode === 0 && u === 0,
        half: si === 2 && mode === 0 && Math.abs(u) === 1, flip: mode === 1 && !wall && Math.abs(Math.abs(fpx) - 1) > 1e-9,
        point: mode === 2 && !wall && Math.abs(x - u) > 1e-9, luck: mode === 1 && !wall && Math.abs(Math.abs(fpx) - 1) < 1e-9 };
      for (const gl of W.GOALS) { if (!!gl.ok(W) !== meant[gl.id]) fail('invslope', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}`); if (gl.ok(W)) found[gl.id] = found[gl.id] || key; }
    }));
    reset(); W.si = si;
    for (let t = 0; t < 20; t++) W.moveU(1); if (W.k !== S.U.length - 1) fail('invslope', S.id, 'u does not stop at its last step');
    for (let t = 0; t < 20; t++) W.moveU(-1); if (W.k !== 0) fail('invslope', S.id, 'u does not stop at its first step');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('invslope', g.id, 'this goal cannot be found');
  reset();
  return { n, pts, goals: Object.keys(found).length };
})();

/* The tangent plane workshop: every surface, every height and both slopes.
   The surface's height and slopes are found here by nudging the surface
   itself, never from 2ax; every plane the readout writes is parsed back and
   evaluated; every number it works out is checked against the surface; every
   sentence's condition is decided independently; and both slices of the
   drawing are read back. */
const tanPlaneNotes = (() => {
  const W = TanPlane;
  const num = t => +t.replace(/−/g, '-');
  const calc = t => Function('return ' + t.replace(/−/g, '-').replace(/·/g, '*').replace(/(\([^()]*\)|[\d.]+|[a-z])²/g, '($1**2)').replace(/(\d)\(/g, '$1*('))();
  const parsePlane = t => { const m = t.match(/^z = (−?\d+) ([+−]) (\d+)(?:\(x ([+−]) (\d+)\)|x) ([+−]) (\d+)(?:\(y ([+−]) (\d+)\)|y)$/);
    if (!m) return null; const sg = c => c === '−' ? -1 : 1;
    const H = num(m[1]), P = sg(m[2]) * +m[3], X = m[4] ? -sg(m[4]) * +m[5] : 0, Q = sg(m[6]) * +m[7], Y = m[8] ? -sg(m[8]) * +m[9] : 0;
    return (x, y) => H + P * (x - X) + Q * (y - Y); };
  const same = (g, h) => [[0.3, -1.2], [2.1, 0.7], [-1.6, 2.4]].every(([x, y]) => Math.abs(g(x, y) - h(x, y)) < 1e-9);
  if (W.SETS.map(S => `${S.id}:${S.a}:${S.b}:${S.x0}:${S.y0}`).join() !== 'bowl:1:1:1:2,saddle:1:-1:2:1,lop:2:1:-1:1,dome:-1:-1:1:-1') fail('tanplane', 'sets', W.SETS.map(S => S.id).join());
  const reset = () => { W.touched = false; W.si = 0; W.start(); W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('tanplane', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.h = 3; W.p = -2; W.q = 5; W.pick(si);
    if (W.h || W.p || W.q) fail('tanplane', S.id, 'picking a surface does not start the plane flat again');
    for (const g of W.GOALS) if (g.ok(W)) fail('tanplane', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  const found = {}; let n = 0, drawn = 0;
  W.SETS.forEach((S, si) => {
    const Fz = (x, y) => S.a * x * x + S.b * y * y, e = 1e-5;
    const f = Fz(S.x0, S.y0), fx = Math.round((Fz(S.x0 + e, S.y0) - Fz(S.x0 - e, S.y0)) / (2 * e)), fy = Math.round((Fz(S.x0, S.y0 + e) - Fz(S.x0, S.y0 - e)) / (2 * e));
    const tan = (x, y) => f + fx * (x - S.x0) + fy * (y - S.y0);
    const [z0, z1] = S.z, Zi = py => z0 + (182 - py) / 160 * (z1 - z0);
    const pts = `(${S.x0 < 0 ? '−' + -S.x0 : S.x0}, ${S.y0 < 0 ? '−' + -S.y0 : S.y0})`;
    for (let h = -6; h <= 6; h++) for (let pp = -6; pp <= 6; pp++) for (let q = -6; q <= 6; q++) {
      reset(); W.si = si; W.h = h; W.p = pp; W.q = q; n++;
      const key = `${S.id} h=${h} p=${pp} q=${q}`, mine = (x, y) => h + pp * (x - S.x0) + q * (y - S.y0);
      const hOK = h === f, pOK = pp === fx, qOK = q === fy, all = hOK && pOK && qOK;
      const got = W.working(), txt = got.join(' ');
      if (!got[0].startsWith(`The surface is z = `) || !got[0].endsWith(`. Build the plane that touches it at ${pts}.`)) fail('tanplane', key, got[0]);
      else { const sf = got[0].slice(19, got[0].indexOf(',')); const g = (x, y) => calc(sf.replace(/x/g, `(${x})`).replace(/y/g, `(${y})`));
        if (!same(g, Fz)) fail('tanplane', key, `the surface is written wrong: ${sf}`); }
      const m1 = got[1].match(/^Your plane is (.+)\.$/);
      if (!m1 || !parsePlane(m1[1]) || !same(parsePlane(m1[1]), mine)) fail('tanplane', key, `the plane is written wrong: ${got[1]}`);
      const m2 = got[2].match(/^At \((.+)\) both brackets are 0, so your plane has height (\S+) there\. The surface has f\((.+)\) = (.+) = (\S+?)(: the heights match\.|, so your plane passes (\d+) (below|above) the point\.)$/);
      if (!m2) fail('tanplane', key, `the height line is not worked: ${got[2]}`);
      else {
        if (`(${m2[1]})` !== pts || `(${m2[3]})` !== pts || num(m2[2]) !== h) fail('tanplane', key, `the point or the plane's height is named wrong: ${got[2]}`);
        if (num(m2[5]) !== f || Math.abs(calc(m2[4]) - f) > 1e-9) fail('tanplane', key, `the surface's height is worked wrong: ${got[2]}`);
        if (!!m2[6].startsWith(':') !== hOK) fail('tanplane', key, `the heights are said to ${hOK ? 'differ' : 'match'}: ${got[2]}`);
        if (!hOK && (+m2[7] !== Math.abs(h - f) || m2[8] !== (h < f ? 'below' : 'above'))) fail('tanplane', key, `the gap is wrong: ${got[2]}`);
      }
      [[3, 'x', 'y', S.y0, S.x0, fx, pp, pOK, S.a], [4, 'y', 'x', S.x0, S.y0, fy, q, qOK, S.b]].forEach(([li, v, o, hold, at, tru, mineS, ok, c]) => {
        const m = got[li].match(new RegExp(`^Along ${v}, ${o} stays at (\\S+) and only the ${v}² term changes, so the slope is f_${v} = (−?\\d+)${v} = (\\S+) at ${v} = (\\S+)\\. Your plane has slope (\\S+) along ${v}(: that slice touches\\.|, so in that slice the line cuts across the curve\\.)$`));
        if (!m) { fail('tanplane', key, `the ${v} slope line is not worked: ${got[li]}`); return; }
        if (num(m[1]) !== hold || num(m[4]) !== at) fail('tanplane', key, `the slice is held or read at the wrong place: ${got[li]}`);
        if (num(m[2]) * at !== tru || num(m[3]) !== tru || num(m[2]) !== 2 * c) fail('tanplane', key, `the ${v} slope is worked wrong: ${got[li]}`);
        if (num(m[5]) !== mineS) fail('tanplane', key, `the plane's ${v} slope is named wrong: ${got[li]}`);
        if (m[6].startsWith(':') !== ok) fail('tanplane', key, `the ${v} slice is said to ${ok ? 'cut across' : 'touch'}: ${got[li]}`);
      });
      const ml = got.find(l => l.startsWith('All three match'));
      if (!!ml !== all) fail('tanplane', key, 'the tangent plane is announced at the wrong time');
      if (ml) { const m = ml.match(/^All three match, so this is the tangent plane: (.+?)\. It is y = f\(a\) \+ f′\(a\)\(x − a\) with a second slope/);
        if (!m || !parsePlane(m[1]) || !same(parsePlane(m[1]), tan)) fail('tanplane', key, `the tangent plane is written wrong: ${ml}`); }
      const up = S.a > 0 && S.b > 0, down = S.a < 0 && S.b < 0;
      if (/curves up away from the plane in every direction/.test(txt) !== (all && up)) fail('tanplane', key, 'the bowl sentence shows at the wrong time');
      if (/curves down away from the plane in every direction/.test(txt) !== (all && down)) fail('tanplane', key, 'the dome sentence shows at the wrong time');
      if (/a saddle crosses its own tangent plane/.test(txt) !== (all && !up && !down)) fail('tanplane', key, 'the saddle sentence shows at the wrong time');
      const swap = hOK && pp === fy && q === fx;
      if (/Those are the two slopes in each other’s places/.test(txt) !== swap) fail('tanplane', key, 'the swap is named at the wrong time');
      if (/Both slopes are right, so the plane is tilted correctly/.test(txt) !== (pOK && qOK && !hOK)) fail('tanplane', key, 'the height slip is named at the wrong time');
      if (/One slice touches and the other cuts across/.test(txt) !== (hOK && pOK !== qOK)) fail('tanplane', key, 'the one-slice sentence shows at the wrong time');
      if (got.length !== 5 + (all ? 2 : swap || (pOK && qOK && !hOK) || (hOK && pOK !== qOK) ? 1 : 0)) fail('tanplane', key, `the readout has ${got.length} sentences`);
      // the drawing
      const svg = W.svg();
      if (/both lines touch/.test(svg) !== all) fail('tanplane', key, 'the figure says the lines touch when they do not, or the other way round');
      for (const side of [0, 1]) {
        const [l, r] = side ? [188, 340] : [20, 172], U = px => (px - l) / (r - l) * 5 - 2.5;
        const crv = side ? u => Fz(S.x0, S.y0 + u) : u => Fz(S.x0 + u, S.y0), lin = side ? u => mine(S.x0, S.y0 + u) : u => mine(S.x0 + u, S.y0);
        const read = (k, fn) => { let c = 0;
          for (const pl of svg.matchAll(new RegExp(`data-k="${k}" points="([^"]+)"`, 'g'))) for (const pt of pl[1].split(' ')) {
            const [px, py] = pt.split(',').map(Number); c++;
            if (px < l - 0.01 || px > r + 0.01 || py < 21.99 || py > 182.01 || Math.abs(Zi(py) - fn(U(px))) > 0.002 * (z1 - z0)) { fail('tanplane', key, `${k} leaves its line at ${pt}`); break; }
          } return c; };
        if (read('curve' + side, crv) < 40) fail('tanplane', key, `slice ${side} of the surface is not drawn`);
        drawn += read('plane' + side, lin);
        const dot = svg.match(new RegExp(`data-k="point${side}" cx="([\\d.]+)" cy="([\\d.]+)"`));
        if (!dot || Math.abs(U(+dot[1])) > 0.01 || Math.abs(Zi(+dot[2]) - f) > 0.01 * (z1 - z0)) fail('tanplane', key, `the point is not on slice ${side} of the surface`);
      }
      const meant = { bowl: si === 0 && all, swap, lift: pOK && qOK && !hOK, edge: hOK && pOK !== qOK,
        saddle: si === 1 && all, lop: si === 2 && all, dome: si === 3 && all };
      for (const gl of W.GOALS) { if (!!gl.ok(W) !== meant[gl.id]) fail('tanplane', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}`); if (gl.ok(W)) found[gl.id] = found[gl.id] || key; }
    }
    reset(); W.si = si;
    for (const k of ['h', 'p', 'q']) {
      for (let t = 0; t < 20; t++) W.move(k, 1); if (W[k] !== 6) fail('tanplane', S.id, `${k} does not stop at 6`);
      for (let t = 0; t < 20; t++) W.move(k, -1); if (W[k] !== -6) fail('tanplane', S.id, `${k} does not stop at −6`);
    }
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('tanplane', g.id, 'this goal cannot be found');
  if (drawn < 1000) fail('tanplane', 'plane', 'the plane is hardly ever drawn');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The trig integral workshop: every target, both waves, every number in front.
   Whether a guess works is decided here by a nudge on F itself at four
   points, never by the chain rule; every wave the readout writes is parsed
   back into a function and checked against F, f and F′; every sentence's
   condition is decided independently; and the drawing is read back. */
const trigIntNotes = (() => {
  const W = TrigInt;
  const frac = t => { const q = t.replace(/−/g, '-').split('/'); return q.length === 2 ? +q[0] / +q[1] : +q[0]; };
  const unb = t => frac(t.replace(/[()]/g, ''));
  const argK = a => a === 'x' ? 1 : a === 'x/2' ? 0.5 : /^\d+x$/.test(a) ? +a.slice(0, -1) : NaN;
  const parseW = t => { const m = t.match(/^(−)?(?:(\d+)·|\((\d+\/\d+)\)·)?(sin|cos)\(([^)]+)\)$/);
    if (!m) return null; const a = (m[1] ? -1 : 1) * (m[2] ? +m[2] : m[3] ? frac(m[3]) : 1), k = argK(m[5]);
    return x => a * (m[4] === 'sin' ? Math.sin(k * x) : Math.cos(k * x)); };
  const XS = [0.3, 1.1, 2.0, 2.9];
  const sl = (h, x, e = 1e-6) => (h(x + e) - h(x - e)) / (2 * e);
  const same = (g, h) => XS.every(x => Math.abs(g(x) - h(x)) < 1e-4 * Math.max(1, Math.abs(h(x))));
  const fr = v => { const s = v < 0 ? '−' : '', a = Math.abs(v); for (let d = 1; d <= 12; d++) { const n = Math.round(a * d); if (Math.abs(n / d - a) < 1e-9) return s + (d === 1 ? n : n + '/' + d); } return s + a; };
  if (W.SETS.map(S => `${S.id}:${S.g}:${S.a}:${S.k}`).join() !== 'cos2:cos:1:2,sin3:sin:1:3,big:cos:6:3,half:sin:1:0.5') fail('trigint', 'sets', W.SETS.map(S => S.id).join());
  if (W.C.map(fr).join() !== '−3,−2,−1,−1/2,−1/3,1/3,1/2,1,2,3') fail('trigint', 'range', 'c should step −3, −2, −1, −1/2, −1/3, 1/3, 1/2, 1, 2, 3');
  const reset = () => { W.touched = false; W.si = 0; W.start(); W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('trigint', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.g = S.g; W.ci = 0; W.pick(si);
    if (W.g === S.g || W.c() !== 1) fail('trigint', S.id, 'picking a target does not start the guess again on the other wave with c = 1');
    for (const g of W.GOALS) if (g.ok(W)) fail('trigint', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  const found = {}; let n = 0;
  W.SETS.forEach((S, si) => {
    const tf = x => S.a * (S.g === 'sin' ? Math.sin(S.k * x) : Math.cos(S.k * x));
    const PXi = px => (px - 30) / 310 * S.X, PYi = py => S.y[0] + (188 - py) / 176 * (S.y[1] - S.y[0]);
    for (const g of ['sin', 'cos']) W.C.forEach((c, ci) => {
      reset(); W.si = si; W.g = g; W.ci = ci; n++;
      const key = `${S.id} ${g} c=${fr(c)}`, F = x => c * (g === 'sin' ? Math.sin(S.k * x) : Math.cos(S.k * x)), dF = x => sl(F, x);
      const works = same(dF, tf), sineF = Math.abs(dF(0)) < 1e-6, sineT = S.g === 'sin', rightWave = sineF === sineT;
      const r = rightWave ? Math.round(dF(1.1) / tf(1.1) * 36) / 36 : NaN;
      const got = W.working(), txt = got.join(' ');
      const t0 = got[0].match(/^The target is f\(x\) = (.+)\. Find an F whose slope is f: an antiderivative of f\.$/);
      if (!t0 || !parseW(t0[1]) || !same(parseW(t0[1]), tf)) fail('trigint', key, `the target is written wrong: ${got[0]}`);
      const t1 = got[1].match(/^Your guess is F\(x\) = (.+)\.$/);
      if (!t1 || !parseW(t1[1]) || !same(parseW(t1[1]), F)) fail('trigint', key, `the guess is written wrong: ${got[1]}`);
      const m2 = g === 'sin'
        ? got[2].match(/^Its slope by the chain rule: the slope of sin is cos, times the (\S+) inside, so F′\(x\) = (\S+) · (\S+) · cos\(([^)]+)\) = (.+)\.$/)
        : got[2].match(/^Its slope by the chain rule: the slope of cos is −sin, times the (\S+) inside, so F′\(x\) = −(\S+) · (\S+) · sin\(([^)]+)\) = (.+)\.$/);
      if (!m2) fail('trigint', key, `the chain rule line is not worked: ${got[2]}`);
      else {
        if (frac(m2[1]) !== S.k || unb(m2[3]) !== S.k || argK(m2[4]) !== S.k) fail('trigint', key, `the k inside is named wrong: ${got[2]}`);
        if (Math.abs(unb(m2[2]) - c) > 1e-9 || (/−|\//.test(m2[2]) && !/^\(.*\)$/.test(m2[2]))) fail('trigint', key, `c is named wrong, or a negative or a fraction without brackets: ${got[2]}`);
        if (!parseW(m2[5]) || !same(parseW(m2[5]), dF)) fail('trigint', key, `F′ is not the slope of F: ${got[2]}`);
      }
      const ml = got.find(l => l.startsWith('That is f exactly'));
      if (!!ml !== works) fail('trigint', key, `the guess ${works ? 'works' : 'does not work'}, but the readout says otherwise`);
      if (ml) { const m = ml.match(/^That is f exactly, so F is an antiderivative of f: ∫ (.+) dx = (.+) \+ C\.$/);
        if (!m || !parseW(m[1]) || !same(parseW(m[1]), tf) || !parseW(m[2]) || !same(parseW(m[2]), F)) fail('trigint', key, `the integral is written wrong: ${ml}`); }
      if (/dividing by 1\/2 doubles/.test(txt) !== (works && S.k === 0.5)) fail('trigint', key, 'the half sentence shows at the wrong time');
      if (/so integrating has to divide by it/.test(txt) !== (works && S.k !== 0.5)) fail('trigint', key, 'the divide sentence shows at the wrong time');
      const wl = got.find(l => l.startsWith('But F′ is a'));
      if (!!wl !== (!works && !rightWave)) fail('trigint', key, 'the wrong-wave sentence shows at the wrong time');
      if (wl && wl !== `But F′ is a ${sineF ? 'sine' : 'cosine'} where f is a ${sineT ? 'sine' : 'cosine'}: the slope of sin is cos and the slope of cos is −sin, so to land on a ${sineT ? 'sine' : 'cosine'}, F has to be a ${sineT ? 'cosine' : 'sine'}.`) fail('trigint', key, wl);
      const rl = got.find(l => l.startsWith('The wave is right'));
      if (!!rl !== (!works && rightWave)) fail('trigint', key, 'the right-wave sentence shows at the wrong time');
      if (rl) { const m = rl.match(/the number in front is (\S+) where f has (\S+): F′ is (.+)\.$/);
        const say = r === -1 ? 'minus f' : `${fr(Math.abs(r))} times f` + (r < 0 ? ' with its sign flipped' : '');
        if (!m || Math.abs(frac(m[1]) - r * S.a) > 1e-9 || frac(m[2]) !== S.a || m[3] !== say) fail('trigint', key, `F′ is ${r} times f: ${rl}`); }
      if (/carries a minus, so to land on/.test(txt) !== (r === -1 && sineT)) fail('trigint', key, 'the minus of cos is explained at the wrong time');
      if (/has no minus, so a minus in front of F stays in F′/.test(txt) !== (r === -1 && !sineT)) fail('trigint', key, 'the minus in front is explained at the wrong time');
      const slip = si === 0 && rightWave && r === 4;
      if (/Multiplying by the 2 inside is the slope run forwards/.test(txt) !== slip) fail('trigint', key, 'the multiply slip is named at the wrong time');
      // the drawing
      const svg = W.svg();
      if (/they lie on top of each other/.test(svg) !== works) fail('trigint', key, 'the figure says the curves meet when they do not, or the other way round');
      for (const m of svg.matchAll(/ (?:x1|x2|x)="(-?[\d.]+)"| (?:y1|y2|y)="(-?[\d.]+)"/g)) {
        if (m[1] !== undefined && (+m[1] < 0 || +m[1] > 360)) fail('trigint', key, `something is drawn off the side at x = ${m[1]}`);
        if (m[2] !== undefined && (+m[2] < 0 || +m[2] > 200)) fail('trigint', key, `something is drawn off the top or bottom at y = ${m[2]}`);
      }
      const curve = (kk, h) => { let pts = 0;
        for (const pl of svg.matchAll(new RegExp(`data-k="${kk}" points="([^"]+)"`, 'g'))) for (const pt of pl[1].split(' ')) {
          const [px, py] = pt.split(',').map(Number); pts++;
          if (px < 30 || px > 340 || py < 12 || py > 188 || Math.abs(PYi(py) - h(PXi(px))) > 0.002 * (S.y[1] - S.y[0])) { fail('trigint', key, `the ${kk} curve leaves its function at ${pt}`); break; }
        } return pts; };
      if (curve('target', tf) < 200) fail('trigint', key, 'the target is not drawn whole');
      if (curve('slope', dF) < 100) fail('trigint', key, 'the slope is not drawn');
      const ticks = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1]).join();
      if (ticks !== (S.X > 7 ? '2π,4π' : 'π,2π')) fail('trigint', key, `the axis is marked ${ticks}`);
      const meant = { cos2: si === 0 && works, slip, swap: !rightWave, sign: r === -1,
        sin3: si === 1 && works, big: si === 2 && works, half: si === 3 && works };
      for (const gl of W.GOALS) { if (!!gl.ok(W) !== meant[gl.id]) fail('trigint', key, `goal ${gl.id} is ${gl.ok(W) ? 'met' : 'not met'}`); if (gl.ok(W)) found[gl.id] = found[gl.id] || key; }
    });
    reset(); W.si = si;
    for (let t = 0; t < 20; t++) W.moveC(1); if (W.c() !== 3) fail('trigint', S.id, 'c does not stop at 3');
    for (let t = 0; t < 20; t++) W.moveC(-1); if (W.c() !== -3) fail('trigint', S.id, 'c does not stop at −3');
    W.fun('cos'); if (W.g !== 'cos') fail('trigint', S.id, 'the cos button does not make F a cosine');
    W.fun('sin'); if (W.g !== 'sin') fail('trigint', S.id, 'the sin button does not make F a sine');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('trigint', g.id, 'this goal cannot be found');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The diagonal workshop: every pair of columns on every matrix. Whether an
   arrow is an eigenvector is decided here from A·p and p directly; P⁻¹AP is
   worked here from the inverse formula in decimals, never from the
   workshop's adj(P)·A·P; every number the readout writes, fractions
   included, is parsed back and checked; each goal is decided independently;
   and the figure's arrows are read back from its spec. */
const diagNotes = (() => {
  const W = Diag;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const num = t => { t = t.trim().replace(/−/g, '-'); const m = t.match(/^(-?\d+)(?:\/(\d+))?$/); if (!m) return NaN;
    if (m[2] !== undefined) { const a = Math.abs(+m[1]), b = +m[2]; let x = a, y = b; while (y) [x, y] = [y, x % y];
      if (b < 2 || x !== 1) return NaN; }
    return m[2] === undefined ? +m[1] : +m[1] / +m[2]; };
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  if (W.SETS.map(S => S.id).join() !== 'sym,skew,shear') fail('diag', 'sets', W.SETS.map(S => S.id).join());
  const want = { sym: '2,1,1,2', skew: '4,1,2,3', shear: '1,1,0,1' };
  W.SETS.forEach(S => { if (S.A.flat().join() !== want[S.id]) fail('diag', S.id, 'the matrix is not the one the workshop is built round'); });
  const mul = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
  const isEig = (A, v) => { const w = mul(A, v); return Math.abs(w[0] * v[1] - w[1] * v[0]) < 1e-12; };
  // which palette arrows are eigenvectors, decided here
  const eigs = { sym: '1,1|1,-1|-1,1', skew: '1,1|1,-2', shear: '1,0' };
  W.SETS.forEach(S => { const got = W.PAL.filter(v => isEig(S.A, v)).map(v => v.join()).join('|');
    if (got !== eigs[S.id]) fail('diag', S.id, `the palette's eigenvectors are ${got}, not ${eigs[S.id]}`); });
  if (new Set(W.PAL.map(v => v.join())).size !== W.PAL.length) fail('diag', 'palette', 'an arrow is offered twice');
  const reset = () => { W.touched = false; W.si = 0; W.start(); W.done.clear(); W.seen.forEach(S => S.clear()); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('diag', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.pick((si + 1) % 3); W.col(0, 2); W.pick(si);
    if (W.si !== si || W.c.join() !== S.c.join()) fail('diag', S.id, 'picking a matrix does not start its columns afresh');
    for (const g of W.GOALS) if (g.ok(W)) fail('diag', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0; const found = {};
  const check = (key) => {
    n++;
    const S = W.SETS[W.si], A = S.A, P = [W.PAL[W.c[0]], W.PAL[W.c[1]]], sub = ['₁', '₂'];
    const e = P.map(v => isEig(A, v)), lam = P.map(v => { const w = mul(A, v); return (w[0] * v[0] + w[1] * v[1]) / (v[0] * v[0] + v[1] * v[1]); });
    const det = P[0][0] * P[1][1] - P[1][0] * P[0][1];
    let M = null;
    if (det !== 0) { // P⁻¹ = [[d, −b], [−c, a]] / det with P = [[a, b], [c, d]], columns p₁ = (a, c), p₂ = (b, d)
      const a = P[0][0], b = P[1][0], c = P[0][1], d = P[1][1];
      const Pi = [[d / det, -b / det], [-c / det, a / det]], AP = [mul(A, P[0]), mul(A, P[1])];
      M = [0, 1].map(i => [0, 1].map(j => Pi[i][0] * AP[j][0] + Pi[i][1] * AP[j][1])); }
    const L = W.working(), all = L.join('\n');
    if (!L[0].includes(`p₁ = (${neg(P[0][0])}, ${neg(P[0][1])}) and p₂ = (${neg(P[1][0])}, ${neg(P[1][1])})`)) fail('diag', key, `the columns are not named: ${L[0]}`);
    if (!L[0].includes(`rows (${neg(A[0][0])}, ${neg(A[0][1])}) and (${neg(A[1][0])}, ${neg(A[1][1])})`)) fail('diag', key, `A is not named: ${L[0]}`);
    for (const k of [0, 1]) { const line = L[1 + k], m = line.match(/^A·p[₁₂] = \((\S+), (\S+)\)/);
      const w = mul(A, P[k]);
      if (!m || num(m[1]) !== w[0] || num(m[2]) !== w[1]) fail('diag', key, `A·p${sub[k]} is wrong: ${line}`);
      const says = / is an eigenvector, with eigenvalue (\S+)\.$/.exec(line);
      if (!!says !== e[k] || / is not an eigenvector/.test(line) === e[k]) fail('diag', key, `p${sub[k]} is called the wrong thing: ${line}`);
      if (says && !near(num(says[1]), lam[k])) fail('diag', key, `the eigenvalue is wrong: ${line}`);
      if (says && !line.includes(`= ${says[1]}·p${sub[k]}`)) fail('diag', key, `A·p is not written as λ·p: ${line}`); }
    const dm = L[3].match(/^det P = \((\S+)\)\((\S+)\) − \((\S+)\)\((\S+)\) = (\S+)\.$/);
    if (!dm || num(dm[5]) !== det || num(dm[1]) !== P[0][0] || num(dm[2]) !== P[1][1] || num(dm[3]) !== P[1][0] || num(dm[4]) !== P[0][1]) fail('diag', key, `det P is wrong: ${L[3]}`);
    if (det === 0) {
      if (!/P has no inverse/.test(all) || /P⁻¹AP has rows/.test(all)) fail('diag', key, 'two columns on one line are not turned away');
    } else {
      const rm = all.match(/P⁻¹AP has rows \((\S+), (\S+)\) and \((\S+), (\S+)\)\./);
      if (!rm || ![1, 2, 3, 4].every(t => near(num(rm[t]), M[(t - 1) >> 1][(t - 1) & 1]))) fail('diag', key, `P⁻¹AP is wrong: ${rm ? rm[0] : all}`);
      const diagSays = /That is diagonal: D has (\S+) then (\S+) on its diagonal/.exec(all);
      if (!!diagSays !== (e[0] && e[1])) fail('diag', key, 'diagonal is said at the wrong time');
      if (diagSays && !(near(num(diagSays[1]), M[0][0]) && near(num(diagSays[2]), M[1][1]) && near(M[0][1], 0) && near(M[1][0], 0))) fail('diag', key, `D is wrong: ${diagSays[0]}`);
      const half = /Only p([₁₂]) is an eigenvector, so only column (\d) of P⁻¹AP is cleared: (\S+) on the diagonal and 0 beside it\. Column (\d) still has (\S+) off the diagonal\./.exec(all);
      if (!!half !== (e[0] !== e[1])) fail('diag', key, 'the one-column sentence shows at the wrong time');
      if (half) { const k = e[0] ? 0 : 1, j = 1 - k;
        if (half[1] !== sub[k] || +half[2] !== k + 1 || +half[4] !== j + 1 || !near(num(half[3]), M[k][k]) || !near(M[j][k], 0)
          || !near(num(half[5]), M[k][j]) || near(M[k][j], 0)) fail('diag', key, `the cleared column is wrong: ${half[0]}`); }
      if (/Neither column is an eigenvector/.test(all) !== (!e[0] && !e[1])) fail('diag', key, 'the neither sentence shows at the wrong time');
      if (/meet at a right angle/.test(all) !== (W.si === 0 && e[0] && e[1])) fail('diag', key, 'the right-angle sentence shows at the wrong time');
      if (/meet at a right angle/.test(all) && P[0][0] * P[1][0] + P[0][1] * P[1][1] !== 0) fail('diag', key, 'the eigenvectors said to meet at a right angle do not');
    }
    if (/not diagonalisable/.test(all) !== (W.si === 2 && det !== 0 && e[0] !== e[1])) fail('diag', key, 'the shear verdict shows at the wrong time');
    if ((W.si === 2) !== /shear/i.test(all)) fail('diag', key, 'the shear note shows on the wrong matrix');
    // the figure, read back from its spec
    const F = W.spec(); checkFigure(F, 'diag', key);
    const V = F.vecs.map(o => o.v.join()), wantV = [P[0], P[1], mul(A, P[0]), mul(A, P[1])].map(v => v.join());
    if (V.join('|') !== wantV.join('|') || F.lines.map(v => v.join()).join('|') !== [P[0], P[1]].map(v => v.join()).join('|'))
      fail('diag', key, 'the figure draws the wrong arrows');
    if (new Set(F.vecs.map(o => o.col)).size !== 4) fail('diag', key, 'two arrows share a colour');
    if (F.vecs.some(o => o.from && o.from.some(x => x !== 0))) fail('diag', key, 'an arrow is drawn from somewhere other than the origin');
    // the goals, decided here
    const truth = { diag: W.si === 0 && det !== 0 && e[0] && e[1], half: W.si !== 2 && det !== 0 && e[0] !== e[1], flat: det === 0,
      skew: W.si === 1 && det !== 0 && e[0] && e[1], shear: W.si === 2 && det !== 0 && e[0] !== e[1] };
    for (const g of W.GOALS) if (g.id in truth) { if (g.ok(W) !== truth[g.id]) fail('diag', g.id, `${key}: goal ${g.id} is ${g.ok(W) ? '' : 'not '}met`);
      if (truth[g.id]) found[g.id] = 1; }
  };
  W.SETS.forEach((S, si) => {
    for (let i = 0; i < W.PAL.length; i++) for (let j = 0; j < W.PAL.length; j++) {
      reset(); W.pick(si); W.col(0, i); W.col(1, j); check(`${S.id} p₁=${W.PAL[i]} p₂=${W.PAL[j]}`); }
  });
  // D follows P: both orders on one matrix, tracked here
  let seed = 11; const rnd = k => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * k); };
  for (let game = 0; game < 40; game++) {
    reset(); const seen = W.SETS.map(() => new Set());
    for (let step = 0; step < 60; step++) {
      if (rnd(8) === 0) W.pick(rnd(3)); else W.col(rnd(2), rnd(W.PAL.length));
      const A = W.SETS[W.si].A, P = [W.PAL[W.c[0]], W.PAL[W.c[1]]];
      const det = P[0][0] * P[1][1] - P[1][0] * P[0][1];
      if (det !== 0 && P.every(v => isEig(A, v))) seen[W.si].add(P.map(v => { const w = mul(A, v); return w[0] / v[0] || w[1] / v[1]; }).join());
      const o = W.GOALS.find(g => g.id === 'order');
      if (o.ok(W) !== seen.some(S => S.size >= 2)) fail('diag', 'order', `game ${game} step ${step}: goal order is ${o.ok(W) ? '' : 'not '}met`);
      if (o.ok(W)) found.order = 1;
      check(`game ${game} step ${step}`);
    }
  }
  for (const g of W.GOALS) if (!found[g.id]) fail('diag', g.id, 'this goal cannot be found');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The transpose workshop: thousands of games played at random, and every
   entry tried in every slot. Where each entry belongs is decided here from
   the definition, (Aᵀ)ₚq = A_qp, never by the workshop's own lookup; every
   slot that takes an entry must hold exactly that; every sentence's numbers
   and places are parsed back and checked against the matrix; each goal is
   decided independently; and both grids are read back cell by cell. */
const transposeNotes = (() => {
  const W = Transpose;
  const neg = n => (n < 0 ? '−' + Math.abs(n) : String(n)), num = t => +t.replace(/−/g, '-');
  if (W.SETS.map(S => S.id).join() !== 'wide,square,sym') fail('transpose', 'sets', W.SETS.map(S => S.id).join());
  const shape = S => [S.A.length, S.A[0].length];
  if (shape(W.SETS[0]).join() !== '2,3') fail('transpose', 'wide', 'the wide matrix should be 2×3');
  if (shape(W.SETS[1]).join() !== '2,2' || W.SETS[1].A[0][1] === W.SETS[1].A[1][0]) fail('transpose', 'square', 'the square matrix should be 2×2 and not symmetric');
  const isSym = A => A.length === A[0].length && A.every((row, i) => row.every((x, j) => x === A[j][i]));
  if (!isSym(W.SETS[2].A) || W.SETS[2].A.length !== 3) fail('transpose', 'sym', 'the symmetric matrix should be 3×3 and symmetric');
  if (new Set(W.SETS[0].A.flat()).size !== 6) fail('transpose', 'wide', 'the wide matrix needs six different entries, or a slip could fit by luck');
  let seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
  const reset = () => { W.touched = false; W.si = 0; W.start(); W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('transpose', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.pick(si); W.take(0, 0);
    W.pick(si);
    if (W.sel || W.last || W.fill.length !== S.A[0].length || W.fill[0].length !== S.A.length || W.fill.flat().some(x => x !== null) || W.used.flat().some(Boolean))
      fail('transpose', S.id, 'picking a matrix does not start it afresh, with an empty Aᵀ of the flipped shape');
    for (const g of W.GOALS) if (g.ok(W)) fail('transpose', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0; const found = {};
  /* everything the player can see, checked against the matrix and a record kept here */
  const check = (S, si, rec, key) => {
    n++;
    const A = S.A, r = A.length, c = A[0].length, N = r * c, got = W.working(), L = rec.last;
    const k = rec.fill.flat().filter(x => x !== null).length;
    if (W.count() !== k) fail('transpose', key, `${k} slots are filled, not ${W.count()}`);
    for (let p = 0; p < c; p++) for (let q = 0; q < r; q++) if (W.fill[p][q] !== rec.fill[p][q]) fail('transpose', key, `slot ${p},${q} holds ${W.fill[p][q]}, not ${rec.fill[p][q]}`);
    for (let p = 0; p < c; p++) for (let q = 0; q < r; q++) if (rec.fill[p][q] !== null && rec.fill[p][q] !== A[q][p]) fail('transpose', key, `row ${p + 1}, column ${q + 1} of Aᵀ holds ${rec.fill[p][q]}, but belongs to A's row ${q + 1}, column ${p + 1}`);
    const T = (p, q) => A[q][p];
    let li = 0;
    const op = r === c ? `A is ${r}×${c}, so Aᵀ is ${c}×${r} too.` : `A is ${r}×${c}, so Aᵀ is ${c}×${r}.`;
    if (!got[0].startsWith(op) || !got[0].endsWith('an entry in row i, column j of A moves to row j, column i.')) fail('transpose', key, `the opening has the wrong shape: ${got[0]}`);
    li = 1;
    const at = t => { const m = t.match(/^row (\d), column (\d)$/); return m ? [m[1] - 1, m[2] - 1] : null; };
    if (L) {
      const l = got[li++] || '', x = A[L.i][L.j];
      if (L.kind === 'good') {
        let m;
        if ((m = l.match(/^(−?\d+) sits on the main diagonal, in (row \d, column \d), where the row and column numbers match, so it stays put\.$/))) {
          const a = at(m[2]); if (num(m[1]) !== x || L.i !== L.j || a[0] !== L.i || a[1] !== L.j || L.p !== L.i || L.q !== L.j) fail('transpose', key, `the diagonal sentence is wrong: ${l}`);
        } else if ((m = l.match(/^Yes: (−?\d+) was in (row \d, column \d) of A, and now sits in (row \d, column \d) of Aᵀ\.$/))) {
          const a = at(m[2]), b = at(m[3]);
          if (num(m[1]) !== x || a[0] !== L.i || a[1] !== L.j || b[0] !== L.j || b[1] !== L.i || L.p !== L.j || L.q !== L.i || L.i === L.j) fail('transpose', key, `the flip sentence is wrong: ${l}`);
          if (W.fill[b[0]][b[1]] !== num(m[1])) fail('transpose', key, `the flip sentence names a slot that does not hold ${m[1]}`);
        } else if ((m = l.match(/^(−?\d+) fits: (row \d, column \d) of Aᵀ takes the entry from (row \d, column \d) of A, which is also (−?\d+)\.$/))) {
          const a = at(m[2]), b = at(m[3]);
          if (num(m[1]) !== x || num(m[4]) !== x || a[0] !== L.p || a[1] !== L.q || b[0] !== L.q || b[1] !== L.p || A[L.q][L.p] !== x || (L.p === L.j && L.q === L.i)) fail('transpose', key, `the lucky fit is wrong: ${l}`);
        } else fail('transpose', key, `no sentence for the entry just placed: ${l}`);
      } else {
        const m = l.match(/^(−?\d+) is in (row \d, column \d) of A, so it belongs in (row \d, column \d) of Aᵀ\. The slot you tapped, (row \d, column \d), takes the entry from (row \d, column \d) of A, which is (−?\d+)\.( That is the slip everybody makes once: copying an entry to the same spot instead of flipping it across the diagonal\.)?$/);
        if (!m) fail('transpose', key, `no sentence for the slot that turned an entry away: ${l}`);
        else {
          const a = at(m[2]), b = at(m[3]), t = at(m[4]), u = at(m[5]);
          if (num(m[1]) !== x || a.join() !== [L.i, L.j].join() || b.join() !== [L.j, L.i].join() || t.join() !== [L.p, L.q].join() || u.join() !== [L.q, L.p].join() || num(m[6]) !== T(L.p, L.q) || num(m[6]) === x)
            fail('transpose', key, `the turned-away sentence is wrong: ${l}`);
          if (!!m[7] !== (L.p === L.i && L.q === L.j)) fail('transpose', key, `the copy slip is ${m[7] ? 'named where it was not made' : 'not named'}: ${l}`);
        }
      }
    }
    if (rec.sel) { const [i, j] = rec.sel;
      if (got[li++] !== `You are holding ${neg(A[i][j])}, from row ${i + 1}, column ${j + 1} of A. Tap the slot in Aᵀ where it belongs.`) fail('transpose', key, `the held entry is not named: ${got[li - 1]}`);
    } else if (k < N && got[li++] !== 'Tap an entry of A to pick it up.') fail('transpose', key, `no prompt to pick an entry up: ${got[li - 1]}`);
    if (got[li++] !== `${k} of ${N} slots of Aᵀ filled.`) fail('transpose', key, `the count is wrong: ${got[li - 1]}`);
    const cols = [];
    if (k < N) for (let q = 0; q < r; q++) if (rec.fill.every(row => row[q] !== null)) cols.push(q);
    for (const q of cols) { const l = got[li++] || '', m = l.match(/^Column (\d) of Aᵀ reads (.+) going down, just as row (\d) of A reads (.+) going across\.$/);
      const down = rec.fill.map(row => row[q]), across = A[q];
      if (!m || +m[1] !== q + 1 || +m[3] !== q + 1 || m[2].split(', ').map(num).join() !== down.join() || m[4].split(', ').map(num).join() !== across.join()) fail('transpose', key, `the column sentence is wrong: ${l}`); }
    if (k === N) {
      if (got[li++] !== 'Aᵀ is complete: every row of A now stands as a column.') fail('transpose', key, 'a full Aᵀ is not called complete');
      const l = got[li++] || '';
      if (isSym(A)) { if (!/^And Aᵀ = A: the matrix is symmetric/.test(l)) fail('transpose', key, `a symmetric A is not said to equal its transpose: ${l}`); }
      else if (r === c) { const m = l.match(/^Aᵀ is not A: the diagonal entries (−?\d+) and (−?\d+) stayed put, while (−?\d+) and (−?\d+) swapped places\.$/);
        if (!m || num(m[1]) !== A[0][0] || num(m[2]) !== A[1][1] || num(m[3]) !== A[0][1] || num(m[4]) !== A[1][0] || W.fill[0][1] !== A[1][0]) fail('transpose', key, `the square summary is wrong: ${l}`); }
      else if (l !== `Aᵀ is not even the same shape as A: a ${r}×${c} matrix turns into a ${c}×${r}.`) fail('transpose', key, `the wide summary is wrong: ${l}`);
    }
    if (li !== got.length) fail('transpose', key, `an extra sentence: ${got.slice(li).join(' / ')}`);
    // the two grids, read back
    const h = W.grids();
    const gm = [...h.matchAll(/data-grid="(A|Aᵀ)" style="display:grid;grid-template-columns:repeat\((\d),40px\)/g)].map(m => m[1] + m[2]);
    if (gm.join() !== `A${c},Aᵀ${r}`) fail('transpose', key, `the grids have the wrong widths: ${gm.join()}`);
    const cells = [...h.matchAll(/<button[^>]*data-(a|t)="(\d),(\d)"[^>]*aria-label="([^"]+)" aria-pressed="(true|false)"( disabled)? style="([^"]*)">([^<]*)<\/button>/g)];
    const ac = cells.filter(m => m[1] === 'a'), tc = cells.filter(m => m[1] === 't');
    if (ac.length !== N || tc.length !== N) fail('transpose', key, `the grids show ${ac.length} and ${tc.length} cells, not ${N} each`);
    for (const m of ac) { const i = +m[2], j = +m[3], u = rec.used[i][j], on = !!rec.sel && rec.sel[0] === i && rec.sel[1] === j;
      if (num(m[8]) !== A[i][j] || m[4] !== `Row ${i + 1}, column ${j + 1} of A: ${neg(A[i][j])}${u ? ', already placed' : ''}` || (m[5] === 'true') !== on || !!m[6] !== u || /gold-dk/.test(m[7]) !== (i === j))
        fail('transpose', key, `A's cell ${i},${j} is drawn wrong`); }
    for (const m of tc) { const p = +m[2], q = +m[3], x = rec.fill[p][q], miss = !!L && L.kind === 'miss' && L.p === p && L.q === q;
      if (m[8] !== (x === null ? '·' : neg(x)) || m[4] !== `Row ${p + 1}, column ${q + 1} of Aᵀ: ${x === null ? 'empty' : neg(x)}` || !!m[6] !== (x !== null || !rec.sel) || /gold-dk/.test(m[7]) !== (p === q) || /border-color:#/.test(m[7]) !== miss)
        fail('transpose', key, `Aᵀ's cell ${p},${q} is drawn wrong`); }
    const full = rec.fill.flat().every(x => x !== null);
    const meant = { col: si === 0 && [0, 1].some(q => rec.fill.every(row => row[q] !== null)), wide: si === 0 && full,
      diag: !!L && L.kind === 'good' && L.i === L.j && L.p === L.i && L.q === L.j,
      slip: !!L && L.kind === 'miss' && L.p === L.i && L.q === L.j, square: si === 1 && full, sym: si === 2 && full };
    for (const g of W.GOALS) { if (!!g.ok(W) !== meant[g.id]) fail('transpose', key, `goal ${g.id} is ${g.ok(W) ? 'met' : 'not met'}`); if (g.ok(W)) found[g.id] = found[g.id] || key; }
  };
  W.SETS.forEach((S, si) => {
    const A = S.A, r = A.length, c = A[0].length;
    const fresh = () => ({ sel: null, last: null, fill: Array.from({ length: c }, () => Array(r).fill(null)), used: Array.from({ length: r }, () => Array(c).fill(false)) });
    // every entry tried in every slot of an empty Aᵀ
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) for (let p = 0; p < c; p++) for (let q = 0; q < r; q++) {
      reset(); W.pick(si); const rec = fresh();
      W.take(i, j); rec.sel = [i, j]; check(S, si, rec, `${S.id} holding ${i},${j}`);
      W.drop(p, q);
      if (A[i][j] === A[q][p]) { rec.fill[p][q] = A[i][j]; rec.used[i][j] = true; rec.sel = null; rec.last = { kind: 'good', i, j, p, q }; }
      else rec.last = { kind: 'miss', i, j, p, q };
      check(S, si, rec, `${S.id} ${i},${j} to ${p},${q}`);
    }
    // games played at random: picking up, putting back, dropping right and wrong, dropping on full slots
    for (let game = 0; game < 300; game++) {
      reset(); W.pick(si); const rec = fresh();
      for (let step = 0; step < 50 && !rec.fill.flat().every(x => x !== null); step++) {
        const key = `${S.id} game ${game} step ${step}`, roll = rnd(10);
        if (!rec.sel || roll < 2) { const i = rnd(r), j = rnd(c); W.take(i, j);
          if (!rec.used[i][j]) rec.sel = rec.sel && rec.sel[0] === i && rec.sel[1] === j ? null : [i, j]; }
        else { let p, q;
          if (roll < 6) { p = rec.sel[1]; q = rec.sel[0]; } else { p = rnd(c); q = rnd(r); }
          W.drop(p, q);
          if (rec.fill[p][q] === null) { const [i, j] = rec.sel;
            if (A[i][j] === A[q][p]) { rec.fill[p][q] = A[i][j]; rec.used[i][j] = true; rec.sel = null; rec.last = { kind: 'good', i, j, p, q }; }
            else rec.last = { kind: 'miss', i, j, p, q }; } }
        check(S, si, rec, key);
      }
    }
    // a drop with nothing held does nothing
    reset(); W.pick(si); W.drop(0, 0); if (W.count() || W.last) fail('transpose', S.id, 'a slot takes something with nothing held');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('transpose', g.id, 'this goal cannot be found');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The antiderivative workshop: every target, every guess.
   Whether a guess works is decided here by a nudge on F itself at three
   points, never by the power rule; every term the readout writes is parsed
   back into a number and a power and checked against F and its nudged slope;
   every sentence's condition is decided independently; and the drawing is
   read back: the target and the slope each on its own curve. */
const antiNotes = (() => {
  const W = Anti;
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  const frac = t => { const q = t.replace(/−/g, '-').split('/'); return q.length === 2 ? +q[0] / +q[1] : +q[0]; };
  const parseT = t => {
    if (!/x/.test(t)) return [frac(t), 0];
    const m = t.match(/^(?:\((−?[\d/]+)\)|(−?[\d/]+)|(−))?x(.*)$/);
    if (!m) return null;
    const k = m[1] !== undefined ? frac(m[1]) : m[2] !== undefined ? frac(m[2]) : m[3] ? -1 : 1;
    const p = m[4] === '' ? 1 : m[4].startsWith('^(') && m[4].endsWith(')') ? frac(m[4].slice(2, -1)) : +[...m[4]].map(ch => SUP[ch]).join('');
    return [k, p];
  };
  const XS = [0.5, 1.3, 2.2];
  const sl = (h, x, e = 1e-6) => (h(x + e) - h(x - e)) / (2 * e);
  if (W.SETS.map(S => `${S.id}:${S.k}:${S.p}`).join() !== 'sq:6:2,root:3:0.5,inv2:1:-2,inv:1:-1') fail('anti', 'sets', W.SETS.map(S => S.id).join());
  if (W.N.join() !== '-3,-2.5,-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,2.5,3,3.5,4' || W.CLO !== -3 || W.CHI !== 6 || W.SLO !== -2 || W.SHI !== 2) fail('anti', 'range', 'the steppers should run power −3 to 4 in halves, c −3 to 6 and C −2 to 2');
  const reset = () => { W.touched = false; W.si = 0; W.n = 1; W.c = 1; W.C = 0; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('anti', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.n = 3; W.c = 6; W.C = 2; W.pick(si);
    if (W.n !== 1 || W.c !== 1 || W.C !== 0) fail('anti', S.id, 'picking a target does not start the guess again');
    for (const g of W.GOALS) if (g.ok(W)) fail('anti', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  const found = {}; let n = 0;
  W.SETS.forEach((S, si) => {
    const tf = x => S.k * x ** S.p, PYi = py => S.y[0] + (188 - py) / 176 * (S.y[1] - S.y[0]), PXi = px => 0.25 + (px - 30) / 310 * 2.25;
    for (const pw of W.N) for (let c = W.CLO; c <= W.CHI; c++) for (let C = W.SLO; C <= W.SHI; C++) {
      reset(); W.si = si; W.n = pw; W.c = c; W.C = C; n++;
      const key = `${S.id} n=${pw} c=${c} C=${C}`, F = x => c * x ** pw + C, dF = x => sl(F, x);
      const works = XS.every(x => Math.abs(dF(x) - tf(x)) < 1e-4 * Math.max(1, Math.abs(tf(x)))), flat = XS.every(x => Math.abs(dF(x)) < 1e-6);
      const got = W.working(), txt = got.join(' ');
      if (got[0] !== `The target is f(x) = ${S.fs}. Find an F whose slope is f: an antiderivative of f.`) fail('anti', key, got[0]);
      const fm = got[1].match(/^Your guess is F\(x\) = (.+?)(?: ([+−]) (\d))?\.$/);
      if (!fm) fail('anti', key, got[1]);
      else { const t = parseT(fm[1]), add = fm[2] ? (fm[2] === '+' ? 1 : -1) * +fm[3] : 0;
        if (!t || XS.some(x => Math.abs(t[0] * x ** t[1] + add - F(x)) > 1e-9)) fail('anti', key, `the guess is written wrong: ${got[1]}`); }
      const pl = got.find(l => l.startsWith('Its slope by the power rule'));
      if (!!pl === flat) fail('anti', key, 'the power rule is worked on a flat F, or skipped on one that is not');
      if (pl) {
        const m = pl.match(/^Its slope by the power rule: bring the power down and drop it by one, F′\(x\) = (\(?−?[\d/]+\)?) · (\(?−?[\d/]+\)?) · (\S+) = (\S+)\.$/);
        const un = t => frac(t.replace(/[()]/g, ''));
        if (!m || un(m[1]) !== c || un(m[2]) !== pw || /^−/.test(m[1]) || /^−/.test(m[2])) fail('anti', key, `the power rule line names the wrong numbers, or a negative one without brackets: ${pl}`);
        else {
          const lp = parseT(m[3]), r = parseT(m[4]);
          if (!lp || lp[0] !== 1 || lp[1] !== pw - 1) fail('anti', key, `the power is not dropped by one: ${pl}`);
          if (!r || XS.some(x => Math.abs(r[0] * x ** r[1] - dF(x)) > 1e-4 * Math.max(1, Math.abs(dF(x))))) fail('anti', key, `F′ is not the slope of F: ${pl}`);
        }
      }
      if (/F is flat and F′\(x\) = 0/.test(txt) !== flat) fail('anti', key, 'the flat sentence shows at the wrong time');
      if (/a shift adds nothing to its slope/.test(txt) !== (C !== 0)) fail('anti', key, 'the shift sentence shows at the wrong time');
      if (/\d\/\d+x/.test(txt)) fail('anti', key, `a fraction runs into its x, which reads as dividing by x: ${txt}`);
      const il = txt.match(/In the notation of integrals, ∫ (\S+) dx = (\S+) \+ C\./);
      if (!!il !== works || (il && (il[1] !== S.fs.split(',')[0] || XS.some(x => Math.abs(parseT(il[2])[0] * x ** parseT(il[2])[1] - c * x ** pw) > 1e-9)))) fail('anti', key, `the integral line is wrong or shows at the wrong time: ${il && il[0]}`);
      if (/That is f exactly/.test(txt) !== works) fail('anti', key, `the guess ${works ? 'works' : 'does not work'}, but the readout says otherwise`);
      if (works && !(C !== 0 ? /every antiderivative of f is .+ \+ C/ : /always written with \+ C/).test(txt)) fail('anti', key, 'the + C is not explained');
      const gap = S.id === 'inv' && pw === 0 && c !== 0;
      if (/the one gap in the power rule/.test(txt) !== gap) fail('anti', key, 'the gap sentence shows at the wrong time');
      const k1 = c * pw, p1 = pw - 1, samePow = !flat && p1 === S.p && !works;
      if (/^The power is right/.test(got[got.length - 1] || '') !== samePow && !/Raising the power is only half/.test(txt)) fail('anti', key, 'the right-power sentence shows at the wrong time');
      if (samePow) {
        const l = got.find(x => x.startsWith('The power is right'));
        const m = l && l.match(/the number in front is (\S+) where f has (\S+): F′ is (.+)\.$/);
        const ratio = k1 / S.k;
        const say = ratio === -1 ? 'minus f' : (Math.abs(ratio) === 0.5 ? 'half of f' : `${Math.abs(ratio) % 1 ? Math.abs(ratio) * 2 + '/2' : Math.abs(ratio)} times f`) + (ratio < 0 ? ' with its sign flipped' : '');
        if (!m || frac(m[1]) !== k1 || frac(m[2]) !== S.k || m[3] !== say) fail('anti', key, `F′ is ${ratio} times f: ${l}`);
      }
      if (/Raising the power is only half/.test(txt) !== (S.id === 'sq' && pw === 3 && c === 6)) fail('anti', key, 'the forgot-to-divide sentence shows at the wrong time');
      const off = !flat && !works && p1 !== S.p && !gap;
      const ol = got.find(x => x.startsWith('The power is off'));
      if (!!ol !== off) fail('anti', key, 'the wrong-power sentence shows at the wrong time');
      if (ol) { const m = ol.match(/F′ has (\S+) where f has (\S+)\. Since the rule drops the power by one, F has to start one higher, at (\S+)\.$/);
        if (!m || parseT(m[1])[1] !== p1 || parseT(m[2])[1] !== S.p || parseT(m[3])[1] !== S.p + 1) fail('anti', key, ol); }
      if (flat && !gap && !works && !/A flat F has slope 0 everywhere/.test(txt)) fail('anti', key, 'a flat guess is not explained');
      // the drawing
      const svg = W.svg();
      for (const m of svg.matchAll(/ (?:x1|x2|x)="(-?[\d.]+)"| (?:y1|y2|y)="(-?[\d.]+)"/g)) {
        if (m[1] !== undefined && (+m[1] < 0 || +m[1] > 360)) fail('anti', key, `something is drawn off the side at x = ${m[1]}`);
        if (m[2] !== undefined && (+m[2] < 0 || +m[2] > 200)) fail('anti', key, `something is drawn off the top or bottom at y = ${m[2]}`);
      }
      const curve = (kk, h) => { let pts = 0;
        for (const pl2 of svg.matchAll(new RegExp(`data-k="${kk}" points="([^"]+)"`, 'g'))) for (const pt of pl2[1].split(' ')) {
          const [px, py] = pt.split(',').map(Number); pts++;
          if (px < 30 || px > 340 || py < 12 || py > 188 || Math.abs(PYi(py) - h(PXi(px))) > 0.002 * (S.y[1] - S.y[0])) { fail('anti', key, `the ${kk} curve leaves its function at ${pt}`); break; }
        } return pts; };
      if (!curve('target', tf)) fail('anti', key, 'the target is not drawn');
      const sp = curve('slope', dF), inView = [0.3, 1, 2].some(x => dF(x) > S.y[0] && dF(x) < S.y[1]);
      if (inView && !sp) fail('anti', key, 'the slope is not drawn though it is on the chart');
      const meant = { sq: si === 0 && works, slip: si === 0 && pw === 3 && c === 6, plusC: si === 0 && works && C !== 0,
        root: si === 1 && works, inv2: si === 2 && works, gap };
      for (const g of W.GOALS) { if (!!g.ok(W) !== meant[g.id]) fail('anti', key, `goal ${g.id} is ${g.ok(W) ? 'met' : 'not met'}`); if (g.ok(W)) found[g.id] = found[g.id] || key; }
    }
    reset(); W.si = si;
    for (let t = 0; t < 20; t++) W.moveN(1); if (W.n !== 4) fail('anti', S.id, 'the power does not stop at 4');
    for (let t = 0; t < 20; t++) W.moveN(-1); if (W.n !== -3) fail('anti', S.id, 'the power does not stop at −3');
    for (let t = 0; t < 20; t++) W.moveC(1); if (W.c !== 6) fail('anti', S.id, 'c does not stop at 6');
    for (let t = 0; t < 20; t++) W.moveC(-1); if (W.c !== -3) fail('anti', S.id, 'c does not stop at −3');
    for (let t = 0; t < 20; t++) W.moveS(1); if (W.C !== 2) fail('anti', S.id, 'C does not stop at 2');
    for (let t = 0; t < 20; t++) W.moveS(-1); if (W.C !== -2) fail('anti', S.id, 'C does not stop at −2');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('anti', g.id, 'this goal cannot be found');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The quotient workshop: every fraction, every x, every way of working it.
   The true slope is found here by a nudge on f/g itself, never by the rule,
   so a wrong rule cannot agree with itself; each set's f′ and g′ are checked
   the same way; every product in a worked line is evaluated as written and
   must use the values it names; each slip is checked to give what that slip
   really gives; every sentence's condition is decided independently; and the
   drawing is read back: the curve, the gap, the point and both lines. */
const quotNotes = (() => {
  const W = Quot;
  const num = t => +t.replace(/−/g, '-'), neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const sl = (h, x, e = 1e-5) => (h(x + e) - h(x - e)) / (2 * e);
  const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
  if (W.SETS.map(S => S.id).join() !== 'sq,recip,bump') fail('quotient', 'sets', W.SETS.map(S => S.id).join());
  if (W.X.join() !== '-3,-2.5,-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,2.5,3') fail('quotient', 'x', `x should step from −3 to 3 in halves: ${W.X.join()}`);
  if (W.MODES.join() !== 'Quotient rule,Swap the top,Forget the square') fail('quotient', 'modes', W.MODES.join());
  W.SETS.forEach(S => {
    for (let x = -3.2; x <= 3.2; x += 0.1) {
      if (!near(S.df(x), sl(S.f, x), 1e-5) || !near(S.dg(x), sl(S.g, x), 1e-5)) fail('quotient', S.id, `f′ or g′ is not the slope of f or g at x = ${x.toFixed(1)}`);
    }
  });
  const reset = () => { W.touched = false; W.si = 0; W.k = W.SETS[0].start; W.mode = 0; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('quotient', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.k = 0; W.mode = 2; W.pick(si);
    if (W.k !== S.start || W.mode !== 0 || W.X[W.k] !== (si === 2 ? 2 : 1)) fail('quotient', S.id, 'picking a fraction does not start x and the method again');
    for (const g of W.GOALS) if (g.ok(W)) fail('quotient', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  const found = {}; let n = 0;
  const Y0 = 188, Y1 = 12, PXi = px => -3.25 + (px - 20) / 320 * 6.5;
  W.SETS.forEach((S, si) => {
    const PYi = py => S.y[0] + (188 - py) / 176 * (S.y[1] - S.y[0]);
    for (let k = 0; k < W.X.length; k++) for (let mode = 0; mode < 3; mode++) {
      reset(); W.si = si; W.k = k; W.mode = mode; n++;
      const x = W.X[k], key = `${S.id} x=${x} mode ${mode}`, X = neg(x);
      const a = S.f(x), b = S.g(x), c = S.df(x), d = S.dg(x);
      const got = W.working(), txt = got.join(' ');
      if (got[0] !== `y = f/g with f(x) = ${S.fs} and g(x) = ${S.gs}, so f′(x) = ${S.dfs} and g′(x) = ${S.dgs}.`) fail('quotient', key, got[0]);
      const m2 = got[1].match(/^At x = (\S+): f\(\S+\) = (\S+), g\(\S+\) = (\S+), f′\(\S+\) = (\S+) and g′\(\S+\) = (\S+)\.$/);
      if (!m2 || m2[1] !== X || [a, b, c, d].some((v, i) => !near(num(m2[i + 2]), v))) fail('quotient', key, `the values at x are wrong: ${got[1]}`);
      if (b === 0) {
        if (got.length !== 3 || got[2] !== `g(${X}) = 0, so y = f/g is not defined at x = ${X}: the curve has a gap here, and there is no slope to find.`) fail('quotient', key, `the gap is not said plainly: ${got.slice(2).join(' ')}`);
      } else {
        const y = a / b, D = sl(x2 => S.f(x2) / S.g(x2), x, 1e-6);
        const m3 = got[2].match(/^So y = (\S+) ÷ (\S+) ([=≈]) (\S+)\.$/);
        if (!m3 || !near(num(m3[1]), a) || !near(num(m3[2]), b) || Math.abs(num(m3[4]) - y) > 5.0001e-5 || (m3[3] === '=') !== near(Math.round(y * 1e4) / 1e4, y, 1e-10)) fail('quotient', key, `y is ${y}: ${got[2]}`);
        // the worked slope, evaluated as written
        const pr = t => t.match(/\((−?[\d.]+)\)\((−?[\d.]+)\)/).slice(1).map(num);
        const lines = ['The quotient rule: dy/dx = (f′g − fg′)/g² = ', 'The slip swaps the top: (fg′ − f′g)/g² = ', 'The slip forgets to square g: (f′g − fg′)/g = '];
        const wl = got[3];
        if (!wl.startsWith(lines[mode])) fail('quotient', key, `the worked line is for the wrong method: ${wl}`);
        else {
          const m4 = wl.slice(lines[mode].length).match(/^\((\(\S+\)\(\S+\)) − (\(\S+\)\(\S+\))\)\/\((\S+)\)(²?) = (\S+)\/(\S+) ([=≈]) (\S+)\.$/);
          if (!m4) fail('quotient', key, wl);
          else {
            const [p1, p2] = [pr(m4[1]), pr(m4[2])], want = mode === 1 ? [[a, d], [c, b]] : [[c, b], [a, d]];
            if (![p1, p2].every((q, i) => near(q[0], want[i][0]) && near(q[1], want[i][1]))) fail('quotient', key, `the top uses the wrong values: ${wl}`);
            if ((m4[4] === '²') !== (mode !== 2) || !near(num(m4[3]), b)) fail('quotient', key, `the bottom is wrong: ${wl}`);
            const top = p1[0] * p1[1] - p2[0] * p2[1], bot = mode === 2 ? b : b * b, v = top / bot;
            if (!near(num(m4[5]), top) || !near(num(m4[6]), bot) || Math.abs(num(m4[8]) - v) > 5.0001e-5) fail('quotient', key, `the worked slope does not follow from its own line: ${wl}`);
            if (mode === 0 && Math.abs(v - D) > 1e-5) fail('quotient', key, `the quotient rule gives ${v} but the slope is ${D}`);
            if (mode === 1 && Math.abs(v + D) > 1e-5) fail('quotient', key, `the swapped top should give minus the slope, ${-D}, not ${v}`);
            if (mode === 2 && Math.abs(v - D * b) > 1e-5) fail('quotient', key, `dividing by g alone should give ${D * b}, not ${v}`);
          }
        }
        const m5 = got[4] && got[4].match(/^Check with a nudge: from x = (\S+) to (\S+), y goes from (?:about )?(\S+) to (?:about )?(\S+), so Δy\/Δx ≈ (\S+)\.$/);
        if (!m5 || !near(num(m5[1]), x - 0.001) || !near(num(m5[2]), x + 0.001) || Math.abs(num(m5[3]) - a / b - 0 + (a / b - S.f(x - 0.001) / S.g(x - 0.001))) > 5.0001e-7
          || Math.abs(num(m5[4]) - S.f(x + 0.001) / S.g(x + 0.001)) > 5.0001e-7 || Math.abs(num(m5[5]) - D) > 0.0006) fail('quotient', key, `the nudge is wrong: ${got[4]}`);
        const Dr = Math.round(D * 1e6) / 1e6, Wr = mode === 1 ? -Dr : mode === 2 ? Math.round(D * b * 1e6) / 1e6 : Dr, top0 = Math.abs(c * b - a * d) < 1e-9;
        const v6 = got[5] || '';
        if (mode === 0) {
          const tail = Dr === 0 ? ': the top f′g − fg′ is 0 here, so the tangent is flat.' : Dr > 0 ? ': y rises as x rises here.' : ': y falls as x rises here.';
          if (!v6.startsWith('That agrees with dy/dx ') || !v6.endsWith(tail)) fail('quotient', key, `the verdict on the rule is wrong: ${v6}`);
          if (/the reciprocal rule/.test(txt) !== (S.id === 'recip')) fail('quotient', key, 'the reciprocal sentence shows at the wrong time');
        } else if (Math.abs(Wr - Dr) > 1e-9) {
          if (!(mode === 1 ? /^So the swapped top is wrong: it gives exactly minus the slope\./ : /^So forgetting the square is wrong: the rule divides by g² = /).test(v6) || !v6.endsWith(`The slope is ${neg(Math.round(D * 1e4) / 1e4)}.`)) fail('quotient', key, `the slip is not caught: ${v6}`);
        } else if (top0) {
          if (v6 !== 'The slip gets it right here, but only because the top is 0, so every version gives 0.') fail('quotient', key, `a zero top is not explained: ${v6}`);
        } else if (!(b === 1 && v6 === `It gets it right here by luck: g(${X}) = 1, and 1² = 1, so squaring changes nothing. Anywhere else it would be wrong.`)) fail('quotient', key, `a lucky slip is not explained: ${v6}`);
        if (/reciprocal/.test(txt) && mode !== 0) fail('quotient', key, 'the reciprocal sentence shows with a slip');
      }
      // the drawing
      const svg = W.svg();
      for (const m of svg.matchAll(/ (?:x1|x2|cx)="(-?[\d.]+)"| (?:y1|y2|cy)="(-?[\d.]+)"/g)) {
        if (m[1] !== undefined && (+m[1] < 0 || +m[1] > 360)) fail('quotient', key, `something is drawn off the side at x = ${m[1]}`);
        if (m[2] !== undefined && (+m[2] < 0 || +m[2] > 200)) fail('quotient', key, `something is drawn off the top or bottom at y = ${m[2]}`);
      }
      for (const pl of svg.matchAll(/data-k="curve" points="([^"]+)"/g)) for (const pt of pl[1].split(' ')) {
        const [px, py] = pt.split(',').map(Number), t = PXi(px);
        if (px < 20 || px > 340 || py < 12 || py > 188 || Math.abs(PYi(py) - S.f(t) / S.g(t)) > 0.002 * (S.y[1] - S.y[0])) fail('quotient', key, `the curve leaves y = f/g at ${pt}`);
      }
      if (!/data-k="curve"/.test(svg)) fail('quotient', key, 'no curve is drawn');
      const hasGap = W.X.some(t => S.g(t) === 0);
      if (/data-k="gap(-here)?"/.test(svg) !== hasGap || /data-k="gap-here"/.test(svg) !== (b === 0)) fail('quotient', key, 'the gap line is wrong');
      const lineAt = kk => { const m = svg.match(new RegExp(`data-k="${kk}" x1="([\\d.-]+)" y1="([\\d.-]+)" x2="([\\d.-]+)" y2="([\\d.-]+)"`)); return m && m.slice(1).map(Number); };
      const tan = lineAt('tan'), slip = lineAt('slip'), pt = svg.match(/data-k="pt" cx="([\d.-]+)" cy="([\d.-]+)"/);
      if (!!tan !== (b !== 0) || !!pt !== (b !== 0) || !!slip !== (b !== 0 && mode > 0)) fail('quotient', key, 'the point or its lines show at the wrong time');
      if (b !== 0) {
        const y = a / b, D = sl(x2 => S.f(x2) / S.g(x2), x, 1e-6);
        if (!pt || Math.abs(PXi(+pt[1]) - x) > 0.01 || Math.abs(PYi(+pt[2]) - y) > 0.01 * (S.y[1] - S.y[0])) fail('quotient', key, 'the gold point is not on the curve at x');
        const chk = (L, want, nm) => { if (!L) return; const [x1, y1, x2, y2] = L, s2 = (PYi(y2) - PYi(y1)) / (PXi(x2) - PXi(x1));
          if (Math.abs(s2 - want) > 0.02 * Math.max(1, Math.abs(want))) fail('quotient', key, `the ${nm} is drawn with slope ${s2.toFixed(3)}, not ${want}`);
          const mid = (PYi(y1) + (PYi(y2) - PYi(y1)) * (x - PXi(x1)) / (PXi(x2) - PXi(x1)));
          if (Math.abs(mid - y) > 0.01 * (S.y[1] - S.y[0])) fail('quotient', key, `the ${nm} does not pass through the point`);
          if (PXi(x2) - PXi(x1) < 0.2) fail('quotient', key, `the ${nm} is too short to see`); };
        chk(tan, D, 'tangent');
        chk(slip, mode === 1 ? -D : D * b, "slip's line");
      }
      const y = b !== 0 ? a / b : NaN, D = b !== 0 ? Math.round(sl(x2 => S.f(x2) / S.g(x2), x, 1e-6) * 1e6) / 1e6 : NaN;
      const Wv = mode === 1 ? -D : mode === 2 ? Math.round(D * b * 1e6) / 1e6 : D, top = c * b - a * d;
      const meant = { flat: si === 0 && mode === 0 && b !== 0 && D === 0, hole: si === 0 && b === 0, rise: si === 1 && mode === 0 && D > 0,
        peak: si === 2 && mode === 0 && D === 0 && y > 0, swap: mode === 1 && b !== 0 && D !== 0, square: mode === 2 && b !== 0 && Wv !== D,
        luck: mode === 2 && b !== 0 && Wv === D && Math.abs(top) > 1e-9 };
      for (const g of W.GOALS) { W.touched = true; if (!!g.ok(W) !== meant[g.id]) fail('quotient', key, `goal ${g.id} is ${g.ok(W) ? 'met' : 'not met'}`); if (g.ok(W)) found[g.id] = found[g.id] || key; }
    }
    reset(); W.si = si; W.k = 0;
    for (let t = 0; t < 20; t++) W.moveX(1);
    if (W.k !== W.X.length - 1) fail('quotient', S.id, 'x does not stop at 3');
    for (let t = 0; t < 20; t++) W.moveX(-1);
    if (W.k !== 0) fail('quotient', S.id, 'x does not stop at −3');
    W.setMode(1); if (W.mode !== 1 || W.k !== 0) fail('quotient', S.id, 'choosing a slip moves x');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('quotient', g.id, 'this goal cannot be found');
  if (found.luck !== 'bump x=0 mode 2') fail('quotient', 'luck', `the lucky slip should be found only on x over x² + 1 at x = 0: ${found.luck}`);
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The cross product workshop: every u, every v, both orders.
   Each product is worked out here by the sign rule on the slots, never from
   the workshop's own sum; every product written in a worked line is
   evaluated as written and must use the slots it names; the square-to-both
   checks, the length and the target's general form are recomputed; every
   sentence's condition is decided independently; and the drawing is read
   back: each arrow's tip, the parallelogram and the drop lines all at the
   one 3D projection of the points they stand for. */
const crossNotes = (() => {
  const W = Cross;
  const num = t => +t.replace(/−/g, '-'), neg = n => (n < 0 ? '−' + Math.abs(n) : String(n));
  const SUB = ['₁', '₂', '₃'];
  /* the cross product by the sign rule: entry i is the sum over j, k of eps(i,j,k)·a_j·b_k */
  const eps = (i, j, k) => (i === j || j === k || i === k) ? 0 : ((j - i + 3) % 3 === 1 ? 1 : -1);
  const cr = (a, b) => [0, 1, 2].map(i => { let t = 0; for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) t += eps(i, j, k) * a[j] * b[k]; return t === 0 ? 0 : t; });
  const vec = t => t.replace(/[⟨⟩]/g, '').split(', ').map(num);
  if (W.SETS.map(S => S.id).join() !== 'floor,tilt,aim') fail('cross', 'sets', W.SETS.map(S => S.id).join());
  if (W.LO !== -3 || W.HI !== 3) fail('cross', 'range', `v's parts should run from −3 to 3, not ${W.LO} to ${W.HI}`);
  if (W.SETS[0].u.join() !== '2,0,0' || W.SETS[0].u[2] !== 0) fail('cross', 'floor', 'the floor u should be ⟨2, 0, 0⟩');
  const reset = () => { W.touched = false; W.si = 0; W.v = W.SETS[0].v.slice(); W.sw = false; W.done.clear(); };
  reset();
  for (const g of W.GOALS) if (g.ok(W)) fail('cross', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.v = [3, 3, 3]; W.sw = true; W.pick(si);
    if (W.v.join() !== S.v.join() || W.sw) fail('cross', S.id, 'picking a u does not start v and the order again');
    for (const g of W.GOALS) if (g.ok(W)) fail('cross', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0; const found = {};
  W.SETS.forEach((S, si) => {
    const R3 = []; for (let x = W.LO; x <= W.HI; x++) for (let y = W.LO; y <= W.HI; y++) for (let z = W.LO; z <= W.HI; z++) R3.push([x, y, z]);
    for (const v of R3) for (const sw of [false, true]) {
      reset(); W.si = si; W.v = v.slice(); W.sw = sw; W.touched = true; n++;
      const key = `${S.id}, v = ${v.join(',')}${sw ? ', swapped' : ''}`;
      const u = S.u, [a, b, A, B] = sw ? [v, u, 'v', 'u'] : [u, v, 'u', 'v'], w = cr(a, b), P = `${A} × ${B}`;
      const sq = w.reduce((t, c) => t + c * c, 0), vz = v.every(c => c === 0);
      if (W.w().join() !== w.join()) fail('cross', key, `${P} is ${w.join()}, not ${W.w().join()}`);
      const got = W.working(), txt = got.join('\n');
      if (!got[0].includes(`u = ⟨${u.map(neg).join(', ')}⟩ and v = ⟨${v.map(neg).join(', ')}⟩`) || !got[0].includes(sw ? 'so the green arrow is v × u.' : 'and the green arrow is u × v.')) fail('cross', key, `the opening names the wrong arrows: ${got[0]}`);
      ['First', 'Second', 'Third'].forEach((nm, k) => {
        const m = got[1 + k].match(/^(\w+) part, from the other two slots: ([uv])([₁₂₃])([uv])([₁₂₃]) − ([uv])([₁₂₃])([uv])([₁₂₃]) = \((−?\d+)\)\((−?\d+)\) − \((−?\d+)\)\((−?\d+)\) = (−?\d+)\.$/);
        if (!m || m[1] !== nm) { fail('cross', key, `no ${nm} part: ${got[1 + k]}`); return; }
        const i = (k + 1) % 3, j = (k + 2) % 3;
        if (m[2] !== A || m[4] !== B || m[6] !== A || m[8] !== B || m[3] !== SUB[i] || m[5] !== SUB[j] || m[7] !== SUB[j] || m[9] !== SUB[i]) fail('cross', key, `the ${nm} part uses the wrong slots: ${got[1 + k]}`);
        if (num(m[10]) !== a[i] || num(m[11]) !== b[j] || num(m[12]) !== a[j] || num(m[13]) !== b[i]) fail('cross', key, `the ${nm} part puts in the wrong numbers: ${got[1 + k]}`);
        if (num(m[10]) * num(m[11]) - num(m[12]) * num(m[13]) !== num(m[14]) || num(m[14]) !== w[k]) fail('cross', key, `the ${nm} part works out to ${w[k]}: ${got[1 + k]}`);
      });
      const so = got[4].match(/^So (. × .) = (⟨[^⟩]+⟩)\.$/);
      if (!so || so[1] !== P || vec(so[2]).join() !== w.join()) fail('cross', key, `the sum line is wrong: ${got[4]}`);
      const fl = got.find(l => l.startsWith('With u ='));
      if (!!fl !== !!S.aim) fail('cross', key, 'the general form shows on the wrong set');
      if (fl) {
        const fm = fl.match(/comes out as (⟨[^⟩]+⟩)\. The target is (⟨[^⟩]+⟩), and this (is it|is not it yet)\.$/);
        if (!fm) fail('cross', key, fl);
        else {
          const ev = fm[1].replace(/[⟨⟩]/g, '').split(', ').map(t => Function(`return (${t.replace(/−/g, '-').replace(/v₁/g, `(${v[0]})`).replace(/v₂/g, `(${v[1]})`).replace(/v₃/g, `(${v[2]})`)});`)());
          if (ev.map(c => c === 0 ? 0 : c).join() !== w.join()) fail('cross', key, `the general form gives ${ev.join()}, not ${w.join()}: ${fl}`);
          if (vec(fm[2]).join() !== S.aim.join() || cr(u, [0, 1, -2]).join() !== S.aim.join()) fail('cross', key, 'the target is not one u × v can reach');
          if ((fm[3] === 'is it') !== (w.join() === S.aim.join())) fail('cross', key, 'the target is called hit wrongly');
        }
      }
      if (got.some(l => l.startsWith('v is the zero vector')) !== vz) fail('cross', key, 'the zero-v sentence shows at the wrong time');
      const zl = got.find(l => /is the zero vector: v = /.test(l));
      if (!!zl !== (sq === 0 && !vz)) fail('cross', key, 'the along-u sentence shows at the wrong time');
      if (zl) { const k = num(zl.match(/v = (−?[\d.]+)·u/)[1]); if (v.join() !== u.map(c => k * c === 0 ? 0 : k * c).join()) fail('cross', key, `v is not ${k}·u: ${zl}`); }
      const dl = got.find(l => l.startsWith('It is square to both'));
      if (!!dl !== (sq > 0)) fail('cross', key, 'the square-to-both sentence shows at the wrong time');
      if (dl) {
        const parts = [...dl.matchAll(/([uv]) · \((. × .)\) = \((−?\d+)\)\((−?\d+)\) \+ \((−?\d+)\)\((−?\d+)\) \+ \((−?\d+)\)\((−?\d+)\) = (−?\d+)/g)];
        if (parts.length !== 2) fail('cross', key, dl);
        parts.forEach(m => {
          const p = m[1] === 'u' ? u : v, t = [3, 5, 7].map(o => num(m[o])), q = [4, 6, 8].map(o => num(m[o]));
          if (m[2] !== P || t.join() !== p.join() || q.join() !== w.join()) fail('cross', key, `the ${m[1]} check uses the wrong numbers: ${dl}`);
          if (t[0] * q[0] + t[1] * q[1] + t[2] * q[2] !== num(m[9]) || num(m[9]) !== 0) fail('cross', key, `the ${m[1]} check does not come to 0: ${dl}`);
        });
      }
      if (/points straight (up|down) the z-axis/.test(txt) !== (sq > 0 && w[0] === 0 && w[1] === 0)) fail('cross', key, 'the straight-up sentence shows at the wrong time');
      if (/points straight up/.test(txt) && !(w[2] > 0 && u[2] === 0 && v[2] === 0)) fail('cross', key, 'u and v are not both in the floor');
      const ll = got.find(l => l.startsWith('Its length'));
      if (!!ll !== (sq > 0)) fail('cross', key, 'the length sentence shows at the wrong time');
      if (ll) {
        const m = ll.match(/^Its length, √\((.+)\) = √(\d+) ([=≈]) ([\d.]+), is the area of the shaded parallelogram that u and v span\.$/);
        if (!m) fail('cross', key, ll);
        else {
          const terms = m[1].split(' + ').map(t => num(t.replace(/[()²]/g, '')));
          if (m[1].split(' + ').some(t => /^−/.test(t))) fail('cross', key, `a negative part is squared without brackets, which reads as minus a square: ${ll}`);
          if (terms.join() !== w.join() || +m[2] !== sq) fail('cross', key, `the length sums the wrong squares: ${ll}`);
          const L = Math.sqrt(sq), area = Math.hypot(...cr(u, v));
          if (Math.abs(+m[4] - L) > 5.0001e-5 || (m[3] === '=') !== Number.isInteger(L) || Math.abs(area - L) > 1e-9) fail('cross', key, `the length is ${L}: ${ll}`);
          const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v)))));
          if (Math.abs(Math.hypot(...u) * Math.hypot(...v) * Math.sin(ang) - L) > 1e-6) fail('cross', key, 'the length is not ‖u‖‖v‖ sin θ');
        }
      }
      const tl = got.find(l => l.startsWith('Swapping the order'));
      if (!!tl !== (sw && sq > 0)) fail('cross', key, 'the swap sentence shows at the wrong time');
      if (tl && vec(tl.match(/u × v = (⟨[^⟩]+⟩)\.$/)[1]).join() !== cr(u, v).join()) fail('cross', key, `u × v is ${cr(u, v).join()}: ${tl}`);
      // the drawing
      const svg = W.svg(), iso = p => [-0.5 * p[0] + 0.95 * p[1], 0.25 * p[0] - 0.1 * p[1] - p[2]];
      const R = Math.max(2, ...u.map(Math.abs), ...v.map(Math.abs), ...w.map(Math.abs));
      const xa = svg.match(/data-k="xaxis" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
      if (!xa) { fail('cross', key, 'no x-axis'); continue; }
      const ya = svg.match(/data-k="yaxis" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
      const O = [(+xa[1] + +xa[3]) / 2, (+xa[2] + +xa[4]) / 2], sc = ya ? (+ya[3] - +ya[1]) / (2 * R * 0.95) : 0;
      const at = p => [O[0] + iso(p)[0] * sc, O[1] + iso(p)[1] * sc], near = (q, p) => Math.abs(q[0] - p[0]) < 0.02 && Math.abs(q[1] - p[1]) < 0.02;
      for (const [k, e] of [['x', [R, 0, 0]], ['y', [0, R, 0]], ['z', [0, 0, R]]]) { const m = svg.match(new RegExp(`data-k="${k}axis" x1="([\\d.]+)" y1="([\\d.]+)" x2="([\\d.]+)" y2="([\\d.]+)"`));
        if (!m || !near([+m[3], +m[4]], at(e)) || !near([+m[1], +m[2]], at(e.map(c => -c)))) fail('cross', key, `the ${k}-axis is not drawn through the same origin at the same scale`); }
      for (const p of [u, v, w]) if (p.some(c => c !== 0) && Math.hypot(...iso(p)) * sc < 8) fail('cross', key, `the arrow to ${p.join(',')} is drawn nearly end on, hidden at the origin`);
      const head = k => { const m = svg.match(new RegExp(`data-k="${k}-head" points="([\\d.]+),([\\d.]+)`)); return m && [+m[1], +m[2]]; };
      for (const [k, p] of [['u', u], ['v', v]]) { const h = head(k), s2 = p.some(c => c !== 0);
        if (!!h !== s2 || (h && !near(h, at(p)))) fail('cross', key, `${k}'s tip is not at ${p.join(',')}`); }
      const hw = head('w');
      if (sq > 0 ? !(hw && near(hw, at(w))) : (hw || !/data-k="zero"/.test(svg))) fail('cross', key, `the green tip is not at ${w.join(',')}`);
      const ar = svg.match(/data-k="area" points="([^"]+)"/);
      if (!!ar !== (sq > 0)) fail('cross', key, 'the parallelogram is shaded at the wrong time');
      if (ar) { const pts = ar[1].split(' ').map(t => t.split(',').map(Number)), want = [[0, 0, 0], u, u.map((c, i) => c + v[i]), v];
        if (pts.length !== 4 || pts.some((q, i) => !near(q, at(want[i])))) fail('cross', key, 'the parallelogram is not the one u and v span'); }
      for (const [k, p] of [['u', u], ['v', v], ['w', w]]) {
        const m = svg.match(new RegExp(`data-k="drop-${k}" x1="([\\d.]+)" y1="([\\d.]+)" x2="([\\d.]+)" y2="([\\d.]+)"`));
        const want = p[2] !== 0 && p.some(c => c !== 0);
        if (!!m !== want || (m && (!near([+m[1], +m[2]], at(p)) || !near([+m[3], +m[4]], at([p[0], p[1], 0]))))) fail('cross', key, `${k}'s drop line is wrong`);
      }
      for (const m of svg.matchAll(/ (?:x1|x2|cx)="(-?[\d.]+)"| (?:y1|y2|cy)="(-?[\d.]+)"/g)) {
        if (m[1] !== undefined && (+m[1] < 0 || +m[1] > 360)) fail('cross', key, `something is drawn off the side at x = ${m[1]}`);
        if (m[2] !== undefined && (+m[2] < 0 || +m[2] > 204)) fail('cross', key, `something is drawn off the top or bottom at y = ${m[2]}`);
      }
      const meant = { up: si === 0 && sq > 0 && w[0] === 0 && w[1] === 0 && w[2] > 0, area: si === 0 && sq === 36,
        zero: si === 1 && !vz && sq === 0, aim: si === 2 && w.join() === '2,2,1', flip: sw && sq > 0 };
      for (const g of W.GOALS) { if (!!g.ok(W) !== meant[g.id]) fail('cross', key, `goal ${g.id} is ${g.ok(W) ? 'met' : 'not met'}`); if (g.ok(W)) found[g.id] = found[g.id] || key; }
    }
    for (let i = 0; i < 3; i++) {
      reset(); W.si = si; W.v = [0, 0, 0];
      for (let t = 0; t < 9; t++) W.moveV(i, 1);
      if (W.v[i] !== W.HI || W.v.some((c, j) => j !== i && c !== 0)) fail('cross', S.id, `part ${i + 1} of v does not stop at 3, or moves another part`);
      for (let t = 0; t < 9; t++) W.moveV(i, -1);
      if (W.v[i] !== W.LO) fail('cross', S.id, `part ${i + 1} of v does not stop at −3`);
    }
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('cross', g.id, 'this goal cannot be found');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The horizon workshop: every fraction, every stop.
   Where each fraction heads is worked out from the powers alone, never from
   the workshop's own sums; every worked line is evaluated as written and must
   give the number written after it; the biggest terms and the rest are
   checked by hand; every sentence's condition is worked out independently;
   and the drawing is read back: the stops at their powers of ten, on the
   curve or marked off the chart on the right side, the limit where it should
   be, and the curve itself on f. */
const horizonNotes = (() => {
  const W = Horizon;
  const num = t => +t.replace(/−/g, '-').replace(/,/g, '');
  const side = (T, x) => T.reduce((a, [c, p]) => a + c * Math.pow(x, p), 0);
  const calc = t => Function(`return (${t.replace(/−/g, '-').replace(/,/g, '').replace(/·/g, '*').replace(/²/g, '**2').replace(/³/g, '**3')});`)();
  const tol = v => 5.0001e-5 + Math.abs(v) * 1e-12;
  if (W.SETS.map(S => S.id).join() !== 'eq,low,high,slow') fail('horizon', 'sets', W.SETS.map(S => S.id).join());
  if (W.X.join() !== '1,10,100,1000,10000,100000,1000000') fail('horizon', 'x', `x should step by tens from 1 to a million, not ${W.X.join()}`);
  W.SETS.forEach(S => {
    const [ct, pt] = S.top[0], [cb, pb] = S.bot[0];
    if (S.top.some(([, p]) => p > pt) || S.bot.some(([, p]) => p > pb)) fail('horizon', S.id, 'the biggest power is not written first');
    const L = pt < pb ? 0 : pt === pb ? ct / cb : null;
    if (S.L !== L) fail('horizon', S.id, `f heads for ${L === null ? 'infinity' : L}, not ${S.L}`);
    const r = pt === pb ? `${ct / cb}` : pt === pb - 1 ? `${ct / cb}/x` : pt === pb + 1 ? `x/${cb / ct}` : '?';
    if (S.ratio !== r) fail('horizon', S.id, `the ratio of the biggest terms is ${r}, not ${S.ratio}`);
  });
  const reset = () => { W.touched = false; W.si = 0; W.k = W.START; W.done.clear(); };
  reset();
  if (W.x() !== 100) fail('horizon', 'start', 'the workshop should open at x = 100');
  for (const g of W.GOALS) if (g.ok(W)) fail('horizon', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.k = 6; W.pick(si); if (W.x() !== 100) fail('horizon', S.id, 'picking a fraction does not start again at x = 100');
    for (const g of W.GOALS) if (g.ok(W)) fail('horizon', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0; const found = {};
  W.SETS.forEach((S, si) => {
    for (let k = 0; k < W.X.length; k++) {
      reset(); W.si = si; W.k = k; W.touched = true; n++;
      const x = W.X[k], key = `${S.id} at x = ${x}`;
      const t = side(S.top, x), b = side(S.bot, x), f = t / b, L = S.L, gap = L === null ? Infinity : Math.abs(f - L);
      const got = W.working(), txt = got.join('\n');
      const wl = got[1].match(/^At x = ([\d,]+): the top is (.+) = (−?[\d,.]+) and the bottom is (.+) = (−?[\d,.]+), so f\([\d,]+\) ([=≈]) (−?[\d,.]+)\.$/);
      if (!wl) { fail('horizon', key, `no worked line: ${got[1]}`); continue; }
      if (num(wl[1]) !== x) fail('horizon', key, `the worked line is at ${wl[1]}`);
      if (calc(wl[2]) !== t || num(wl[3]) !== t) fail('horizon', key, `the top is ${t}: ${wl[2]} = ${wl[3]}`);
      if (calc(wl[4]) !== b || num(wl[5]) !== b) fail('horizon', key, `the bottom is ${b}: ${wl[4]} = ${wl[5]}`);
      if (Math.abs(num(wl[7]) - f) > tol(f)) fail('horizon', key, `f is ${f}, not ${wl[7]}`);
      if ((wl[6] === '=') !== (Math.abs(Math.round(f * 1e4) / 1e4 - f) < 1e-10)) fail('horizon', key, 'f is marked exact or not wrongly');
      const lt = S.top[0][0] * Math.pow(x, S.top[0][1]), lb = S.bot[0][0] * Math.pow(x, S.bot[0][1]);
      const bl = got[2].match(/here they make (−?[\d,.]+) and (−?[\d,.]+), while the rest add (−?[\d,.]+) and (−?[\d,.]+)\.$/);
      if (!bl) fail('horizon', key, `no biggest-terms line: ${got[2]}`);
      else if (num(bl[1]) !== lt || num(bl[2]) !== lb || num(bl[3]) !== t - lt || num(bl[4]) !== b - lb) fail('horizon', key, `the biggest terms make ${lt} and ${lb} with ${t - lt} and ${b - lb} left: ${got[2]}`);
      const loudT = Math.abs(t - lt) > Math.abs(lt), loudB = Math.abs(b - lb) > Math.abs(lb);
      const loud = got.find(l => /do not decide f yet/.test(l));
      if (!!loud !== (loudT || loudB)) fail('horizon', key, 'the not-yet sentence shows at the wrong time');
      if (loud && (/on top/.test(loud) !== loudT || /underneath/.test(loud) !== loudB)) fail('horizon', key, `the not-yet sentence names the wrong side: ${loud}`);
      if (/that is why f is below 0 here/.test(txt) !== ((loudT || loudB) && f < 0 && L > 0)) fail('horizon', key, 'the below-0 clause is wrong');
      const rl = got.find(l => l.startsWith('Their ratio is'));
      if (!rl) fail('horizon', key, 'no ratio sentence');
      else if (L === null) { const m = rl.match(/which is (−?[\d,.]+) here and keeps growing, so f has no limit/); if (!m || Math.abs(num(m[1]) - lt / lb) > tol(lt / lb)) fail('horizon', key, rl); }
      else if (S.top[0][1] === S.bot[0][1]) { if (!rl.includes(`= ${S.ratio}, the same at every x, so f heads for ${L}.`)) fail('horizon', key, rl); }
      else { const m = rl.match(/which is (−?[\d,.]+) here and shrinks toward 0, so f heads for 0\./); if (!m || Math.abs(num(m[1]) - lt / lb) > tol(lt / lb)) fail('horizon', key, rl); }
      const gl = got[got.length - 1];
      if (L === null) { if (/above|below|exactly/.test(gl)) fail('horizon', key, 'a fraction with no limit is measured against one'); }
      else {
        const m = gl.match(/^f\([\d,]+\) is (?:exactly (−?[\d.]+)|([\d,.]+) (above|below) (−?[\d.]+))(, within 0\.001 of it)?\.$/);
        if (!m) fail('horizon', key, `no gap sentence: ${gl}`);
        else if (m[1] !== undefined) { if (gap !== 0) fail('horizon', key, 'f is called exactly the limit'); }
        else {
          if (Math.abs(num(m[2]) - gap) > tol(gap) || num(m[4]) !== L) fail('horizon', key, `f is ${gap} from ${L}: ${gl}`);
          if ((m[3] === 'above') !== (f > L)) fail('horizon', key, `f is on the wrong side of ${L}`);
          if (!!m[5] !== (gap < 0.001)) fail('horizon', key, 'the within-0.001 note is wrong');
        }
      }
      // the drawing
      const svg = W.svg(), [y0, y1] = S.y, PX = v => 24 + Math.log10(v) / 6 * 312, PY = v => 180 - (v - y0) / (y1 - y0) * 168;
      const stops = [...svg.matchAll(/<(circle|polygon) data-k="(here|stop|here-off|off)"(?: data-up="(true|false)")? (?:cx="([\d.]+)" cy="([\d.]+)"|points="([\d.]+),([\d.]+))/g)];
      if (stops.length !== W.X.length) fail('horizon', key, `${stops.length} stops are drawn`);
      stops.forEach((m, i) => {
        const v = W.X[i], y = side(S.top, v) / side(S.bot, v), on = y >= y0 && y <= y1;
        if (/here/.test(m[2]) !== (i === k)) fail('horizon', key, `stop ${i} is marked ${m[2]}`);
        if ((m[1] === 'circle') !== on) fail('horizon', key, `stop ${i} is drawn ${on ? 'off' : 'on'} the chart`);
        const px = +(m[4] || m[6]); if (Math.abs(px - PX(v)) > 0.01) fail('horizon', key, `stop ${i} is not at x = ${v}`);
        if (on && Math.abs(+m[5] - PY(y)) > 0.01) fail('horizon', key, `stop ${i} is not on f`);
        if (!on && (m[3] === 'true') !== (y > y1)) fail('horizon', key, `stop ${i} points the wrong way off the chart`);
        if (!on && Math.abs(+m[7] - PY(y > y1 ? y1 : y0)) > 2.01) fail('horizon', key, `stop ${i} is not at the edge it ran off`);
      });
      const lim = svg.match(/data-k="limit" x1="24" y1="([\d.]+)"/);
      if (!!lim !== (L !== null) || (lim && Math.abs(+lim[1] - PY(L)) > 0.01)) fail('horizon', key, 'the limit line is wrong');
      for (const pl of svg.matchAll(/data-k="f" points="([^"]+)"/g)) for (const pt of pl[1].split(' ')) {
        const [px, py] = pt.split(',').map(Number), v = Math.pow(10, (px - 24) / 312 * 6), y = side(S.top, v) / side(S.bot, v);
        if (Math.abs(py - PY(y)) > 0.05 || py < 11.99 || py > 180.01) fail('horizon', key, `the curve leaves f or the chart at ${pt}`);
      }
      if (!/data-k="f"/.test(svg)) fail('horizon', key, 'no curve is drawn');
      const meant = { close: si === 0 && gap < 0.001, zero: si === 1 && gap < 0.001, away: si === 2 && f > 1000, fooled: si === 3 && f < 0, slow: si === 3 && gap < 0.001 };
      for (const g of W.GOALS) { if (!!g.ok(W) !== meant[g.id]) fail('horizon', key, `goal ${g.id} is ${g.ok(W) ? 'met' : 'not met'}`); if (g.ok(W)) found[g.id] = found[g.id] || key; }
    }
    reset(); W.si = si;
    for (let i = 0; i < 9; i++) W.moveX(1);
    if (W.k !== W.X.length - 1) fail('horizon', S.id, 'x does not stop at a million');
    for (let i = 0; i < 9; i++) W.moveX(-1);
    if (W.k !== 0) fail('horizon', S.id, 'x does not stop at 1');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('horizon', g.id, 'this goal cannot be found');
  reset();
  return { n, goals: Object.keys(found).length };
})();

/* The arrow workshop: every pair, every k, with and without v.
   Each sum is worked out by hand from u and v, never from the workshop's own
   arithmetic; every vector written in the readout is read back as numbers;
   each length is Pythagoras on the parts as written, and the root as written
   must be the length; the unit vector must point the same way with length 1;
   the lengths written for u and v must be their true lengths; every
   sentence's condition is worked out independently; and the drawing is read
   back: one scale both ways, v starting at the tip of k·u, w ending where v
   ends, the right triangle under w, and everything on the page. */
const arrowNotes = (() => {
  const W = Arrow;
  const num = t => +t.replace(/−/g, '-');
  const vecs = t => [...t.matchAll(/⟨(−?[\d.]+), (−?[\d.]+)⟩/g)].map(m => [num(m[1]), num(m[2])]);
  const root = t => (t.startsWith('√') ? Math.sqrt(num(t.slice(1))) : num(t));
  const near = (p, q, e = 1e-9) => Math.abs(p[0] - q[0]) < e && Math.abs(p[1] - q[1]) < e;
  if (W.SETS.map(S => S.id).join() !== 'a,b,c') fail('arrow', 'sets', W.SETS.map(S => S.id).join());
  W.SETS.forEach(S => {
    if (Math.abs(root(S.uL) - Math.hypot(...S.u)) > 1e-12) fail('arrow', S.id, `‖u‖ is written ${S.uL}`);
    if (Math.abs(root(S.vL) - Math.hypot(...S.v)) > 1e-12) fail('arrow', S.id, `‖v‖ is written ${S.vL}`);
  });
  if (W.K.join() !== '-2,-1.5,-1,-0.5,0,0.5,1,1.5,2') fail('arrow', 'k', `k should step by halves from −2 to 2, not ${W.K.join()}`);
  const reset = () => { W.touched = false; W.si = 0; W.k = W.START; W.m = false; W.done.clear(); };
  reset();
  if (W.kv() !== 1) fail('arrow', 'start', 'the workshop should open with k = 1');
  for (const g of W.GOALS) if (g.ok(W)) fail('arrow', g.id, 'met where the workshop opens');
  W.SETS.forEach((S, si) => { reset(); W.m = true; W.k = 0; W.pick(si); if (W.kv() !== 1 || W.m) fail('arrow', S.id, 'picking a pair does not start again at k = 1 without v');
    for (const g of W.GOALS) if (g.ok(W)) fail('arrow', g.id, `met where ${S.id} starts, so picking it gives the goal away`); });
  let n = 0; const found = {};
  W.SETS.forEach((S, si) => {
    const lu = Math.hypot(...S.u), lv = Math.hypot(...S.v);
    for (let ki = 0; ki < W.K.length; ki++) for (const m of [false, true]) {
      reset(); W.si = si; W.k = ki; W.m = m; W.touched = true; n++;
      const k = W.K[ki], key = `${S.id} k = ${k}${m ? ' + v' : ''}`;
      const ku = [k * S.u[0], k * S.u[1]], w = m ? [ku[0] + S.v[0], ku[1] + S.v[1]] : ku, L = Math.hypot(...w), zero = L < 1e-12;
      if (!near(W.w(), w)) fail('arrow', key, `w is ${W.w()}, but by hand it is ${w}`);
      if (Math.abs(W.len() - L) > 6e-5) fail('arrow', key, `the length reads ${W.len()}, but it is ${L}`);
      const got = W.working(), txt = got.join('\n');
      if (!near(vecs(got[0])[0], S.u) || !near(vecs(got[0])[1], S.v)) fail('arrow', key, got[0]);
      if (/w = k·u \+ v\./.test(got[0]) !== m) fail('arrow', key, 'the opening sentence names the wrong sum');
      const kv = vecs(got[1]); if (!near(kv[kv.length - 1], ku)) fail('arrow', key, `k·u should be ${ku}: ${got[1]}`);
      if (k !== 0 && k !== 1) {
        if (/the same way/.test(got[1]) !== (k > 0)) fail('arrow', key, 'the direction of k·u is wrong');
        const a = Math.abs(k), says = /just as long/.test(got[1]) ? 1 : /half as long/.test(got[1]) ? 0.5 : num((got[1].match(/(−?[\d.]+) times as long/) || [, 'NaN'])[1]);
        if (says !== a) fail('arrow', key, `k·u should be ${a} times as long: ${got[1]}`);
      }
      const wv = vecs(got[2]); if (!near(wv[wv.length - 1], w)) fail('arrow', key, `w should be ${w}: ${got[2]}`);
      if (/Walk v from the tip/.test(got[2]) !== m) fail('arrow', key, 'the walk sentence is wrong');
      if (m && (!near(wv[0], ku) || !near(wv[1], S.v))) fail('arrow', key, 'the parts added are not k·u and v');
      const len = got.find(l => l.startsWith('‖w‖ = √('));
      const pm = len && len.match(/^‖w‖ = √\((?:\((−?[\d.]+)\)|(−?[\d.]+))² \+ (?:\((−?[\d.]+)\)|(−?[\d.]+))²\) = (?:√(−?[\d.]+) [=≈] )?(−?[\d.]+)/);
      if (!pm) fail('arrow', key, `no length sentence: ${txt}`);
      else {
        const a = num(pm[1] || pm[2]), b = num(pm[3] || pm[4]);
        const sqw = c => { const q = Math.round(c * 1e4) / 1e4, t = (q < 0 ? '−' : '') + Math.abs(q); return q < 0 ? `(${t})²` : `${t}²`; };
        if (!len.startsWith(`‖w‖ = √(${sqw(w[0])} + ${sqw(w[1])})`)) fail('arrow', key, `the parts are not squared as ${sqw(w[0])} + ${sqw(w[1])}: ${len}`);
        if (!near([a, b], w)) fail('arrow', key, `the length is worked on ${a}, ${b}, not on w`);
        if (!zero && Math.abs(num(pm[5]) - (a * a + b * b)) > 1e-9) fail('arrow', key, `√${pm[5]} is not √(${a}² + ${b}²)`);
        if (Math.abs(num(pm[6]) - L) > 6e-5) fail('arrow', key, `the length is written ${pm[6]}, not ${L}`);
        if (!zero && (len.includes(`√${pm[5]} = `) !== (Math.abs(Math.round(L * 1e4) / 1e4 - L) < 1e-10))) fail('arrow', key, 'the length is marked exact or not wrongly');
      }
      if (/zero vector, with no length/.test(txt) !== zero) fail('arrow', key, 'the zero-vector sentence is wrong');
      if (/has no unit vector/.test(txt) !== zero) fail('arrow', key, 'the no-unit-vector sentence is wrong');
      if (/lies flat along the x-axis/.test(txt) !== (!zero && Math.abs(w[1]) < 1e-12)) fail('arrow', key, 'the flat sentence is wrong');
      if (/upright along the y-axis/.test(txt) !== (!zero && Math.abs(w[0]) < 1e-12)) fail('arrow', key, 'the upright sentence is wrong');
      const sc = txt.match(/That is \|k\| × ‖u‖ = ([\d.]+) × (√?[\d.]+) [=≈] ([\d.]+)/);
      if (!!sc !== (!m && !zero)) fail('arrow', key, 'the stretching sentence is wrong');
      if (sc && (num(sc[1]) !== Math.abs(k) || Math.abs(root(sc[2]) - lu) > 1e-9 || Math.abs(num(sc[3]) - Math.abs(k) * lu) > 6e-5 || Math.abs(Math.abs(k) * lu - L) > 1e-9)) fail('arrow', key, `|k| × ‖u‖ is worked wrongly: ${sc[0]}`);
      const tri = txt.match(/‖u‖ \+ ‖v‖ = (√?[\d.]+) \+ (√?[\d.]+) [=≈] ([\d.]+), more than ‖w‖ [=≈] ([\d.]+)/);
      if (!!tri !== (m && k === 1 && !zero)) fail('arrow', key, 'the lengths-do-not-add sentence is wrong');
      if (tri && (Math.abs(root(tri[1]) - lu) > 1e-9 || Math.abs(root(tri[2]) - lv) > 1e-9 || Math.abs(num(tri[3]) - (lu + lv)) > 6e-5 || Math.abs(num(tri[4]) - L) > 6e-5 || !(lu + lv > L + 1e-9))) fail('arrow', key, `the sum of lengths is worked wrongly: ${tri[0]}`);
      const unit = got.find(l => /unit vector/.test(l) && !/no unit vector/.test(l));
      if (!zero) {
        const isOne = Math.abs(L - 1) < 1e-9;
        if (/is a unit vector already/.test(txt) !== isOne) fail('arrow', key, 'the already-a-unit-vector sentence is wrong');
        if (!isOne) { const uv = vecs(unit); const hat = uv[uv.length - 1];
          if (!near(uv[0], w)) fail('arrow', key, 'the unit vector does not start from w');
          if (!hat || !near(hat, [w[0] / L, w[1] / L], 6e-5)) fail('arrow', key, `the unit vector should be ${[w[0] / L, w[1] / L]}: ${unit}`);
          else if (Math.abs(Math.hypot(...hat) - 1) > 2e-4 || hat[0] * w[0] + hat[1] * w[1] <= 0) fail('arrow', key, 'the unit vector does not have length 1 the same way');
          const by = unit.match(/÷ (√?[\d.]+) [=≈]/); if (!by || Math.abs(root(by[1]) - L) > 6e-5) fail('arrow', key, 'w is not divided by its length'); }
      }
      // the drawing
      const svg = W.svg();
      const ax = svg.match(/data-k="xaxis" x1="20" y1="([\d.-]+)"/), ay = svg.match(/data-k="yaxis" x1="([\d.-]+)"/);
      if (!ax || !ay) { fail('arrow', key, 'the axes are not drawn'); continue; }
      const O = [+ay[1], +ax[1]];
      const tip = k2 => { const h = svg.match(new RegExp(`data-k="${k2}-head" points="([\\d.-]+),([\\d.-]+)`)); return h && [+h[1], +h[2]]; };
      const start = k2 => { const h = svg.match(new RegExp(`data-k="${k2}" x1="([\\d.-]+)" y1="([\\d.-]+)"`)); return h && [+h[1], +h[2]]; };
      const scale = (pt, v) => [(pt[0] - O[0]) / v[0], -(pt[1] - O[1]) / v[1]];
      const B = W.box().sc;
      const at = (pt, v) => pt && Math.abs(pt[0] - (O[0] + v[0] * B)) < 0.02 && Math.abs(pt[1] - (O[1] - v[1] * B)) < 0.02;
      if (!at(tip('u'), S.u) || !near(start('u'), O, 0.02)) fail('arrow', key, 'u is not drawn from the start');
      if (k === 0) { if (tip('ku')) fail('arrow', key, 'k·u is drawn though it is nothing'); }
      else if (!at(tip('ku'), ku) || !near(start('ku'), O, 0.02)) fail('arrow', key, 'k·u is not drawn at its place');
      if (!!tip('v') !== m) fail('arrow', key, 'v shows at the wrong time');
      if (m && (!at(start('v'), ku) || !at(tip('v'), w))) fail('arrow', key, 'v is not walked from the tip of k·u');
      if (zero) { if (tip('w') || !/data-k="zero"/.test(svg)) fail('arrow', key, 'the zero vector is not drawn as a dot'); }
      else if (!at(tip('w'), w) || !near(start('w'), O, 0.02) || /data-k="zero"/.test(svg)) fail('arrow', key, 'w is not drawn from the start to where you land');
      const leg = svg.match(/data-k="leg" points="([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)"/);
      if (!!leg !== (Math.abs(w[0]) > 1e-12 && Math.abs(w[1]) > 1e-12)) fail('arrow', key, 'the right triangle shows at the wrong time');
      if (leg && !(near([+leg[1], +leg[2]], O, 0.02) && at([+leg[3], +leg[4]], [w[0], 0]) && at([+leg[5], +leg[6]], w))) fail('arrow', key, 'the right triangle is not under w');
      for (const [, x, y] of svg.matchAll(/points="([\d.-]+),([\d.-]+)/g)) if (+x < 0 || +x > 360 || +y < 0 || +y > 200) fail('arrow', key, 'an arrow runs off the drawing');
      const meant = { tip: si === 0 && m && k === 1, double: si === 0 && !m && Math.abs(L - 10) < 1e-9, flip: si === 0 && !m && k === -1,
        unit: si === 1 && Math.abs(L - 1) < 1e-9, cancel: si === 1 && m && zero, whole: si === 2 && m && !zero && Math.abs(L - Math.round(L)) < 1e-9 };
      for (const g of W.GOALS) { if (!!g.ok(W) !== meant[g.id]) fail('arrow', key, `goal ${g.id} is ${g.ok(W) ? 'met' : 'not met'}`); if (g.ok(W)) found[g.id] = found[g.id] || key; }
    }
    // the stepper stops at both ends, and the button adds and takes v off
    reset(); W.si = si;
    for (let i = 0; i < 12; i++) W.moveK(1);
    if (W.k !== W.K.length - 1) fail('arrow', S.id, 'k does not stop at its top');
    for (let i = 0; i < 12; i++) W.moveK(-1);
    if (W.k !== 0) fail('arrow', S.id, 'k does not stop at its bottom');
    W.toggle(); if (!W.m) fail('arrow', S.id, 'the button does not add v'); W.toggle(); if (W.m) fail('arrow', S.id, 'the button does not take v off');
  });
  for (const g of W.GOALS) if (!found[g.id]) fail('arrow', g.id, 'this goal cannot be found');
  reset();
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
console.log(`  f′ picked out     ${pad(slopeMatchNotes.rounds.toLocaleString(), 15)}  (rounds of which-is-f′, f′ checked as the slope of f by nudging f at ${slopeMatchNotes.n.toLocaleString()} points; every wrong graph checked to be its slip and caught where it breaks the rule, ${slopeMatchNotes.misses.toLocaleString()} misses explained; every graph told as words read back)`);
console.log(`  matrices picked   ${pad(matPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-matrix, each wrong matrix checked to be its slip by where it sends î and ĵ; ${matPickNotes.misses.toLocaleString()} wrong picks drawn and explained, ${matPickNotes.picks.toLocaleString()} right picks counted)`);
console.log(`  eigen spotted     ${pad(eigSpotNotes.rounds.toLocaleString(), 15)}  (rounds of spot-the-eigenvector, the kept arrow multiplied out and every other knocked a visible angle off its line; ${eigSpotNotes.misses.toLocaleString()} wrong picks worked and explained; every panel's arrows read back)`);
console.log(`  integrals picked  ${pad(intPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-integral, each worked again by Simpson's rule and every slip from what it gets wrong; ${intPickNotes.crossing.toLocaleString()} cross the axis inside the shading; ${intPickNotes.misses.toLocaleString()} wrong picks explained; every picture read back off its own ticks)`);
console.log(`  slopes picked     ${pad(chainPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-dy/dx, every formula read back as maths and checked against a nudge of y or against the slip it is named as; ${chainPickNotes.misses.toLocaleString()} wrong picks explained; ${chainPickNotes.lines.toLocaleString()} red lines read back off their ticks)`);
console.log(`  product slopes    ${pad(productPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-dy/dx in the product rule workshop, every formula read back as maths and checked against a nudge of y or against the slip it is named as; ${productPickNotes.misses.toLocaleString()} wrong picks explained; ${productPickNotes.lines.toLocaleString()} red lines read back off their ticks)`);
console.log(`  quotient slopes   ${pad(quotPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-dy/dx in the quotient rule workshop, every formula read back as maths and checked against a nudge of y or against the slip it is named as, with g kept clear of 0; ${quotPickNotes.misses.toLocaleString()} wrong picks explained; ${quotPickNotes.lines.toLocaleString()} red lines read back off their ticks)`);
console.log(`  dot products      ${pad(dotPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-u·v in the dot product workshop, every number checked against the sum it stands for and each slip worked out from the numbers on screen; ${dotPickNotes.misses.toLocaleString()} wrong picks explained; ${dotPickNotes.shadows.toLocaleString()} gold shadows read back off their ticks, dropped square onto v's line)`);
console.log(`  shadows picked    ${pad(gramPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-c in the Gram–Schmidt workshop, every number read back off its button as an exact fraction and checked against the slip it is named as, the right one alone leaving w square to u₁, ${gramPickNotes.fracs.toLocaleString()} of them fractions; ${gramPickNotes.misses.toLocaleString()} wrong picks worked through w · u₁, ${gramPickNotes.worked.toLocaleString()} sums worked again from their own numbers)`);
console.log(`  crushed arrows    ${pad(nullPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-is-crushed in the null space workshop, every arrow read back off its button and checked against the slip it is named as, the right one alone sent to ⟨0, 0⟩; ${nullPickNotes.misses.toLocaleString()} wrong picks checked against both rows, ${nullPickNotes.worked.toLocaleString()} dot products worked again from their own numbers)`);
console.log(`  undos picked      ${pad(undoPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-A⁻¹ in the undo workshop, every matrix read back from its name and its cells and checked against the slip it is named as, the right one alone sending Aî and Aĵ home; ${undoPickNotes.misses.toLocaleString()} wrong picks checked on the arrow that misses home, ${undoPickNotes.worked.toLocaleString()} arrows worked again from their own numbers)`);
console.log(`  cross products    ${pad(crossPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-u × v in the cross product workshop, every arrow checked against the slip it is named as, the right one alone being u × v and every slip but the swap failing the square test; ${crossPickNotes.misses.toLocaleString()} wrong picks checked, ${crossPickNotes.dotsWorked.toLocaleString()} dot products worked again from their own numbers)`);
console.log(`  transposes        ${pad(transPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-Aᵀ in the transpose workshop, every matrix read back from its name and its cells and checked against the slip it is named as, the right one alone being Aᵀ; ${transPickNotes.misses.toLocaleString()} wrong picks checked against A, their ${transPickNotes.reds.toLocaleString()} red cells exactly the entries out of place)`);
console.log(`  antiderivatives   ${pad(antiPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-F in the antiderivative workshop, every F read back as a power of x and checked against the slip it is named as, the right one alone having slope f; ${antiPickNotes.misses.toLocaleString()} wrong picks checked by their slope; ${antiPickNotes.curves.toLocaleString()} red slopes read back off their ticks)`);
console.log(`  eigenvalue pairs  ${pad(lamPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-λ in the eigenvalue detective, every matrix solved by the quadratic formula and every pair read back as its slip; ${lamPickNotes.misses.toLocaleString()} wrong picks explained; ${lamPickNotes.dots.toLocaleString()} red dots read back onto the curve; ${lamPickNotes.pairs} different pairs of eigenvalues)`);
console.log(`  span mixes        ${pad(spanPickNotes.rounds.toLocaleString(), 15)}  (rounds of which-mix in the span workshop, every mix read back as amounts of u and v and worked to where it lands, with u and v pointing different ways; ${spanPickNotes.misses.toLocaleString()} wrong picks explained; ${spanPickNotes.walks.toLocaleString()} red walks read back off their ticks)`);
console.log(`  ids               ${pad(idNotes.ids.toLocaleString(), 15)}  (ids written in the page and in the HTML its scripts build, each on one element only, bar the alternatives that fill one slot)`);
console.log(`  arrows walked           ${pad(arrowNotes.n.toLocaleString(), 10)}  (each sum worked by hand, every vector written read back, Pythagoras on the parts, the unit vector, every sentence, the drawing read back, ${arrowNotes.goals} goals findable)`);
console.log(`  horizons reached        ${pad(horizonNotes.n.toLocaleString(), 10)}  (where each fraction heads worked from its powers, every worked line evaluated as written, the biggest terms by hand, every sentence, the drawing read back, ${horizonNotes.goals} goals findable)`);
console.log(`  cross products crossed  ${pad(crossNotes.n.toLocaleString(), 10)}  (each worked by the sign rule, every product in every worked line evaluated with its slots, the square-to-both checks, the length as the area, the target's general form, every sentence, the drawing read back, ${crossNotes.goals} goals findable)`);
console.log(`  quotients divided       ${pad(quotNotes.n.toLocaleString(), 10)}  (each slope found by a nudge on f/g, never by the rule; every product in every worked line evaluated with its values, both slips checked to give what they give, every sentence, the curve, gap, point and lines read back, ${quotNotes.goals} goals findable)`);
console.log(`  antiderivatives guessed ${pad(antiNotes.n.toLocaleString(), 10)}  (each guess judged by a nudge on F, never by the power rule; every term written parsed back and checked against F and its slope, every sentence, both curves read back, ${antiNotes.goals} goals findable)`);
console.log(`  transpose moves played ${pad(transposeNotes.n.toLocaleString(), 10)}  (where each entry belongs decided from (Aᵀ)ₚq = A_qp, never by the workshop; every entry tried in every slot and 900 games at random, every sentence parsed back, both grids read cell by cell, ${transposeNotes.goals} goals findable)`);
console.log(`  diagonal workshop states ${pad(diagNotes.n.toLocaleString(), 10)}  (eigenvectors decided from A·p and p, P⁻¹AP from the inverse formula, never by the workshop; every pair of columns on every matrix and 40 games at random, every number parsed back, the figure read from its spec, ${diagNotes.goals} goals findable)`);
console.log(`  trig integral guesses ${pad(trigIntNotes.n.toLocaleString(), 10)}  (each guess judged by a nudge on F, never by the chain rule; every wave written parsed back and checked against F, f and F′, every sentence, both curves read back, ${trigIntNotes.goals} goals findable)`);
console.log(`  tangent planes ${pad(tanPlaneNotes.n.toLocaleString(), 17)}  (the height and slopes found by nudging the surface, never from 2ax; every plane written parsed back and evaluated, every number worked checked, every sentence, both slices read back, ${tanPlaneNotes.goals} goals findable)`);
console.log(`  inverse slopes ${pad(invSlopeNotes.n.toLocaleString(), 17)}  (true slopes found by nudging Math's own arcsin, arccos and arctan, never from the identities; every number worked checked, every sentence, ${invSlopeNotes.pts.toLocaleString()} curve points read back, ${invSlopeNotes.goals} goals findable)`);
console.log(`  log slopes ${pad(logDiffNotes.n.toLocaleString(), 21)}  (true slopes found by nudging Math's own x to its power, never from ln x + 1; every number worked checked, every sentence, ${logDiffNotes.pts.toLocaleString()} curve points read back, ${logDiffNotes.goals} goals findable)`);
console.log(`  path chain rates ${pad(pathChainNotes.n.toLocaleString(), 15)}  (true rates found by nudging z along Math's own path, each part by nudging the hill and the path; every number worked checked, every sentence, the bars read back, ${pathChainNotes.pts.toLocaleString()} curve points, ${pathChainNotes.goals} goals findable)`);
console.log(`  growth integrals ${pad(expIntNotes.n.toLocaleString(), 15)}  (whether F fits decided by nudging F against Math's own e^(kx) at many x; every number worked checked, every sentence, ${expIntNotes.dashes.toLocaleString()} field dashes and ${expIntNotes.pts.toLocaleString()} curve points read back, ${expIntNotes.goals} goals findable)`);
console.log(`  workshop index   ${pad(wsIndexNotes.chips.toLocaleString(), 15)}  (chips, each workshop once under the strand of the topic it was built for and in that strand's order, across ${wsIndexNotes.strands} strands; ${wsIndexNotes.cases} mastery states decided for its colour and its screen-reader name)`);
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
