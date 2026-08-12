'use strict';
/*
 * A small expression evaluator for the verification harness.
 *
 * The generators emit answers as display HTML — fractions as nested spans,
 * powers as <sup> or unicode superscripts, minus as U+2212. To check an answer
 * numerically we need to turn that back into something evaluable. The previous
 * harness parsed polynomials only, which covered eight of thirty-eight
 * generators; this covers anything scalar-valued.
 *
 *   const f = compile('3cos(3x)');
 *   f({x: 1.4})            // -2.05...
 *
 * Returns null for answers that are not scalar expressions ("Does not exist",
 * "∞", vectors, matrices) so callers can skip them deliberately.
 */

const SUP = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  ln: Math.log, log: Math.log, exp: Math.exp,
  sqrt: Math.sqrt, abs: Math.abs
};
const CONSTS = { e: Math.E, pi: Math.PI };

/** Turn display HTML into plain infix. */
function normalize(html) {
  let s = String(html);

  // Fractions are nested spans: <span class="frac"><span>a</span><span>b</span></span>
  // Run repeatedly so nested fractions unwrap from the inside out.
  const FRAC = /<span class="frac"><span>((?:(?!<\/span>).)*)<\/span><span>((?:(?!<\/span>).)*)<\/span><\/span>/;
  for (let i = 0; i < 12 && FRAC.test(s); i++) s = s.replace(FRAC, '(($1)/($2))');

  s = s.replace(/<sup>(.*?)<\/sup>/g, '^($1)');
  s = s.replace(/<[^>]+>/g, '');                       // drop any remaining markup
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

  // Unicode superscript runs become explicit powers.
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => '^(' + [...m].map(c => SUP[c]).join('') + ')');

  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/[·×]/g, '*');
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/\s+/g, '');
  return s;
}

/** True when the string is something we deliberately do not evaluate. */
function isNonNumeric(s) {
  return /⟨|mtx|∞|Doesnotexist|Impossible|Yes|No|Only|You|x=/i.test(s) || s === '';
}

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ k: 'num', v: parseFloat(src.slice(i, j)) }); i = j; continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (FUNCS[word] || word in CONSTS) {
        out.push({ k: 'id', v: word });
      } else {
        // A run of letters is a product of single-letter variables, emitted
        // separately so a following exponent binds only to the last of them:
        // xy³ is x·y³, not (x·y)³.
        for (const ch of word) out.push({ k: 'id', v: ch });
      }
      i = j; continue;
    }
    if ('+-*/^(),'.includes(c)) { out.push({ k: c }); i++; continue; }
    throw new Error(`unexpected character ${JSON.stringify(c)} in ${JSON.stringify(src)}`);
  }
  return out;
}

function parse(tokens, src) {
  let p = 0;
  const peek = () => tokens[p];
  const next = () => tokens[p++];
  const fail = m => { throw new Error(`${m} in ${JSON.stringify(src)}`); };

  function expr() {
    let v = term();
    while (peek() && (peek().k === '+' || peek().k === '-')) {
      const op = next().k, r = term(), l = v;
      v = op === '+' ? e => l(e) + r(e) : e => l(e) - r(e);
    }
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.k === '*' || t.k === '/') {
        const op = next().k, r = unary(), l = v;
        v = op === '*' ? e => l(e) * r(e) : e => l(e) / r(e);
        continue;
      }
      // Implicit multiplication: 3x, 2sin(x), (x+1)(x+2)
      if (t.k === 'num' || t.k === 'id' || t.k === '(') {
        const r = unary(), l = v;
        v = e => l(e) * r(e);
        continue;
      }
      break;
    }
    return v;
  }
  function unary() {
    if (peek() && peek().k === '-') { next(); const r = unary(); return e => -r(e); }
    if (peek() && peek().k === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() && peek().k === '^') { next(); const ex = unary(); return e => Math.pow(base(e), ex(e)); }
    return base;
  }
  function primary() {
    const t = next();
    if (!t) fail('unexpected end of expression');
    if (t.k === 'num') { const v = t.v; return () => v; }
    if (t.k === '(') {
      const v = expr();
      if (!peek() || next().k !== ')') fail('expected )');
      return v;
    }
    if (t.k === 'id') {
      const name = t.v;
      if (FUNCS[name]) {
        if (!peek() || peek().k !== '(') fail(`expected ( after ${name}`);
        next();
        const a = expr();
        if (!peek() || next().k !== ')') fail('expected )');
        return e => FUNCS[name](a(e));
      }
      if (name in CONSTS) { const v = CONSTS[name]; return () => v; }
      // Variables are single letters, so a run like `xy` is a product.
      // C is the constant of integration and contributes nothing numerically.
      const letters = [...name];
      return e => letters.reduce((acc, ch) => acc * (ch === 'C' ? 0 : (ch in e ? e[ch] : NaN)), 1);
    }
    fail(`unexpected token ${t.k}`);
  }

  const fn = expr();
  if (p !== tokens.length) fail('trailing input');
  return fn;
}

/** Compile display HTML into f(vars) -> number, or null if not scalar. */
function compile(html) {
  const src = normalize(html);
  if (isNonNumeric(src)) return null;
  try {
    return parse(tokenize(src), src);
  } catch (e) {
    const err = new Error(`${e.message}\n  from: ${JSON.stringify(String(html))}`);
    err.normalized = src;
    throw err;
  }
}

/** Numeric derivative of a compiled expression with respect to one variable. */
function ddx(f, v, at, h) {
  h = h || 1e-5;
  const up = Object.assign({}, at); up[v] = at[v] + h;
  const dn = Object.assign({}, at); dn[v] = at[v] - h;
  return (f(up) - f(dn)) / (2 * h);
}

/** Relative comparison that tolerates the scale of the values involved. */
function close(a, b, tol) {
  tol = tol || 2e-4;
  if (!isFinite(a) || !isFinite(b)) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

module.exports = { compile, normalize, ddx, close, isNonNumeric };
