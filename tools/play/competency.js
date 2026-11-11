/* The competency map: the whole curriculum on one screen, and where you are.
 *
 * Seventy topics in seven strands, each topic on the ladder the lessons climb.
 * These checks seed a knight with topics at every rung (one fresh and fluent,
 * one long untouched, several never met) and assert that the map places each
 * one by what is known today, that the strands and their prerequisites are
 * drawn as they really are, that every topic appears exactly once, and that it
 * all fits a phone and adds nothing to the save.
 */
'use strict';

const DAY = 864e5;

/* m is what they knew the day they left; ago is days since they last saw it. */
const SEED = {
  dot:      { m: 0.95, seen: 12, ago: 0 },    // fluent
  vecAdd:   { m: 0.90, seen: 10, ago: 0 },    // fluent
  det2:     { m: 0.50, seen: 6,  ago: 0 },    // choose
  mag:      { m: 0.25, seen: 3,  ago: 0 },    // true or false
  orth:     { m: 0.05, seen: 2,  ago: 0 },    // first meeting
  cross:    { m: 0.95, seen: 10, ago: 20 },   // was fluent; has faded
  powerRule:{ m: 0.80, seen: 8,  ago: 0 }     // fluent, calculus side
};
const WANT = { dot: 4, vecAdd: 4, det2: 2, mag: 1, orth: 0, powerRule: 4, transpose: -1 };

module.exports = {
  name: 'competency',
  title: 'Competency map · the curriculum on one screen, every topic on its rung',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ines');

    // --- a knight who has met nothing has no map node yet ---
    t.ok('a brand-new knight is not shown an empty map',
      await t.ev(() => { UI.go('s-map'); return !document.getElementById('compNode'); }));

    await t.ev(([seed, DAY]) => {
      for (const [k, v] of Object.entries(seed)) {
        const r = Mastery.rec(k);
        Object.assign(r, { m: v.m, seen: v.seen, c: Math.round(v.seen * v.m), w: v.seen - Math.round(v.seen * v.m),
                           last: Game.s.qCount, t: Date.now() - v.ago * DAY });
      }
      Game.save();
    }, [SEED, DAY]);

    // --- each topic sits on its rung, read off what is known today ---
    const rungs = await t.ev(keys => Object.fromEntries(keys.map(k => [k, Competency.rung(k)])), Object.keys(WANT));
    t.eq('every topic is on the rung its mastery puts it', rungs, WANT);
    const faded = await t.ev(() => ({ rung: Competency.rung('cross'), eff: Mastery.eff('cross') }));
    t.ok('a topic that has faded drops down the ladder', faded.rung < 4 && faded.eff < 0.75, JSON.stringify(faded));
    const off = await t.ev(() => { Prefs.d.lessons = false; const r = Competency.rung('det2'); Prefs.d.lessons = true; return r; });
    t.eq('and the rung is the same with lessons switched off', off, 2);

    // --- a strand's score counts what you have not met as nothing ---
    const sc = await t.ev(() => {
      const ks = STRANDS.find(s => s[0] === 'Vectors')[1];
      const seen = ks.filter(k => Game.s.topicStats[k] && Game.s.topicStats[k].seen);
      return { score: Competency.score('Vectors'),
               whole: ks.reduce((a, k) => a + Mastery.eff(k), 0) / ks.length,
               tried: seen.reduce((a, k) => a + Mastery.eff(k), 0) / seen.length };
    });
    t.ok('a strand is scored over all its topics, unmet ones counting zero',
      Math.abs(sc.score - sc.whole) < 1e-9 && sc.score < sc.tried, JSON.stringify(sc));

    // --- the map names how far you have come ---
    const node = await t.ev(() => {
      UI.go('s-map');
      const n = document.getElementById('compNode');
      return n ? n.innerText : null;
    });
    t.ok('the map shows the competency map once anything is met', !!node, node);
    t.ok('with how many topics are fluent out of all seventy', node && /3 of 70 fluent/.test(node), node);
    t.ok('and how many are still being learned', node && /4 learning/.test(node) && /63 not met yet/.test(node), node);

    // --- one tap opens it, with every topic exactly once ---
    const map = await t.ev(() => {
      document.getElementById('compNode').click();
      const scr = document.querySelector('.screen.on').id;
      const chips = [...document.querySelectorAll('#compList .cchip')];
      const strands = [...document.querySelectorAll('#compList .cstrand')].map(s => s.dataset.strand);
      const keys = chips.map(c => c.dataset.key);
      return { scr, strands, keys, n: chips.length,
               every: Object.keys(TOPIC_LABEL).every(k => keys.includes(k)),
               rungsMatch: chips.every(c => +c.dataset.rung === Competency.rung(c.dataset.key)),
               labelled: chips.every(c => (c.getAttribute('aria-label') || '').startsWith(TOPIC_LABEL[c.dataset.key])),
               text: document.getElementById('compList').innerText };
    });
    t.ok('tapping it opens the competency map', map.scr === 's-comp', map.scr);
    t.eq('the seven strands appear in curriculum order', map.strands,
      ['Vectors', 'Matrices', 'Eigen & Subspaces', 'Limits & Derivatives', 'Integrals', 'Applications', 'Multivariable & Series']);
    t.ok('every topic in the game appears', map.every, JSON.stringify(map.keys));
    t.eq('and none appears twice', new Set(map.keys).size, map.n);
    t.ok('each topic shows the rung it is on', map.rungsMatch);
    t.ok('and says it in words to a screen reader', map.labelled);
    t.ok('the two tracks are named', /Linear algebra/i.test(map.text) && /Calculus/i.test(map.text), map.text.slice(0, 300));

    // --- the prerequisites are drawn as they are ---
    const links = await t.ev(() => {
      const needs = nm => document.querySelector(`.cstrand[data-strand="${nm}"] .cneeds`).innerText;
      return { matrices: needs('Matrices'), multi: needs('Multivariable & Series'), apps: needs('Applications'),
               vectors: needs('Vectors'), arrows: document.querySelectorAll('#compList .clink').length,
               here: [...document.querySelectorAll('.cstrand.here')].map(s => s.dataset.strand) };
    });
    t.ok('a strand says what it builds on', /Builds on Vectors/.test(links.matrices), links.matrices);
    t.ok('the meeting of the tracks builds on both', /Vectors/.test(links.multi) && /Limits & Derivatives/.test(links.multi), links.multi);
    t.ok('Applications builds on derivatives, not integrals', /Limits & Derivatives/.test(links.apps) && !/Integrals/.test(links.apps), links.apps);
    t.ok('the first strand builds on nothing', !/Builds on/.test(links.vectors), links.vectors);
    t.eq('an arrow joins only a strand to what it builds on', links.arrows, 3);
    t.eq('each track marks where you are', links.here, ['Vectors', 'Limits & Derivatives']);

    // --- what has faded is marked where it sits ---
    const cross = await t.ev(() => {
      const c = document.querySelector('.cchip[data-key="cross"]');
      return { text: c.innerText, label: c.getAttribute('aria-label') };
    });
    t.ok('a faded topic is marked as fading', /↓/.test(cross.text) && /fading/.test(cross.label), JSON.stringify(cross));

    // --- it fits a phone ---
    const fit = await t.ev(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth,
      small: [...document.querySelectorAll('#compList .cchip')].filter(c => c.getBoundingClientRect().height < 44).length }));
    t.ok('the map fits a phone without sideways scrolling', fit.sw <= fit.w, JSON.stringify(fit));
    t.eq('and every topic is a full-size target', fit.small, 0);

    // --- a topic is one tap from practice ---
    const train = await t.ev(() => {
      document.querySelector('.cchip[data-key="det2"]').click();
      return { scr: document.querySelector('.screen.on').id, pool: Train.pool.slice(),
               run: document.getElementById('trainRun').style.display !== 'none' };
    });
    t.ok('tapping a topic starts practising it', train.scr === 's-train' && train.run && train.pool.join() === 'det2', JSON.stringify(train));

    // --- the Ledger leads here too ---
    t.ok('the Ledger opens the competency map', await t.ev(() => {
      UI.go('s-gear');
      const b = document.getElementById('ledgerComp');
      if (!b) return false;
      b.click();
      return document.querySelector('.screen.on').id === 's-comp';
    }));

    // --- nothing new is stored ---
    const store = await t.ev(() => {
      const before = JSON.stringify(Game.s);
      UI.go('s-comp'); UI.go('s-map');
      return { same: JSON.stringify(Game.s) === before };
    });
    t.ok('opening the map changes nothing in the save', store.same);
    await t.reload();
    t.eq('and a reload places every topic on the same rung',
      await t.ev(keys => Object.fromEntries(keys.map(k => [k, Competency.rung(k)])), Object.keys(WANT)), WANT);

    await t.ev(() => UI.go('s-title'));
  }
};
