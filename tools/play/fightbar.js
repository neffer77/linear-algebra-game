/* Fight bar.
 *
 * On a phone a fight ran well past one screen. Three items with none left
 * took a row of the skill bar between them ("🔥 Rune ×0"), and the two quiet
 * doors under a question, a nudge and the whole working, took a full-width
 * line each. An empty item now shrinks to its icon and its nought, and keeps
 * its name for a reader and on a long press; the two doors share one row,
 * each with its price in small print. These checks read a real fight on a
 * phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const bar = t => t.ev(() => [...document.querySelectorAll('#powerbar .pw')].map(e => {
  const r = e.getBoundingClientRect();
  return { k: e.dataset.pw, txt: e.innerText.trim(), name: e.getAttribute('aria-label'), off: e.classList.contains('off'),
    w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
}));
const doors = t => t.ev(() => {
  const box = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect();
    return { top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), txt: e.innerText.replace(/\s+/g, ' ').trim() }; };
  const sw = document.getElementById('showwork').getBoundingClientRect().width;
  return { n: box('wnudge'), g: box('wgo'), sw: Math.round(sw), wide: document.documentElement.scrollWidth <= innerWidth + 1,
    shown: !!document.querySelector('#showwork .wnudge') };
});
const fresh = t => t.ev(() => {
  R.seed(4242); Battle.cur = buildQuestion('mag', 2); R.unseed();
  Battle.rite = null; Battle.lesson = null; Battle.nudged = null;
  Battle.answered = false; Battle.slamNext = false; Battle.ehp = 99999;
  Battle.renderStep();
});

module.exports = {
  name: 'fightbar',
  title: 'Fight bar · an empty item is its icon and nought, and the nudge and the working share a row',
  viewport: { width: 360, height: 700 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      Prefs.d.motion = false; Prefs.d.lessons = false; Prefs.d.calc = true;
      Object.assign(Game.s.items, { potion: 0, insight: 0, rage: 0, feather: 0 });
      Elite.force = null; window.__ec = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 0);
    });
    await sleep(600);
    let b = await bar(t);
    const by = k => b.find(x => x.k === k) || {};
    for (const [k, ic, nm] of [['potion', '🧪', 'Draught'], ['insight', '🔮', 'Insight'], ['rage', '🔥', 'Rune']]) {
      const c = by(k);
      t.ok(`an empty ${nm} shows only its icon and nought`, c.txt === ic + ' ×0' && c.off, JSON.stringify(c));
      t.ok(`and keeps its name for a reader`, c.name === nm + ' ×0, none left', JSON.stringify(c));
    }
    const small = Math.max(by('potion').w, by('insight').w, by('rage').w);
    t.ok('an empty item is a small chip on one line', small > 30 && small <= 70 && b.every(x => x.h <= 46), JSON.stringify(b));

    await t.ev(() => { Object.assign(Game.s.items, { potion: 2, insight: 3, rage: 1 }); Game.s.hp = Math.max(1, Game.s.maxHp - 20); Battle.renderPowers(); });
    await sleep(150);
    b = await bar(t);
    t.ok('an item in hand keeps its name', by('potion').txt === '🧪 Draught ×2' && by('insight').txt === '🔮 Insight ×3' && by('rage').txt === '🔥 Rune ×1', JSON.stringify(b));
    t.ok('and is wider than an empty one', by('rage').w > small, JSON.stringify([by('rage').w, small]));
    t.ok('and can be pressed', !by('potion').off && !by('rage').off && !by('potion').name, JSON.stringify(b));

    await fresh(t);
    await sleep(300);
    let d = await doors(t);
    t.ok('the nudge and the working are offered', d.n && d.g, JSON.stringify(d));
    t.ok('side by side in one row', d.n && d.g && Math.abs(d.n.top - d.g.top) <= 2 && d.n.w > 120 && d.g.w > 120 && d.n.w + d.g.w <= d.sw, JSON.stringify(d));
    t.ok('each says its price', d.n && /^💡 Nudge me the first step, for half the strike$/.test(d.n.txt) && /^🔎 Show the working costs the strike, not blood$/.test(d.g.txt), JSON.stringify(d));
    t.ok('neither runs past three lines', d.n && d.g && d.n.h < 80 && d.g.h < 80, JSON.stringify(d));
    t.ok('the fight still fits the phone across', d.wide, 'the page scrolls sideways');

    await t.ev(() => document.getElementById('wnudge').click());
    await sleep(250);
    d = await doors(t);
    t.ok('tapping the nudge shows the step, and the working alone takes the full width', d.shown && !d.n && d.g && d.g.w >= d.sw - 2 && /Show me the working — costs the strike/.test(d.g.txt), JSON.stringify(d));

    await t.ev(() => { Battle.flee(); Elite.CHANCE = window.__ec; UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
