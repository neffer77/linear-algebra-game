/* Calc room.
 *
 * The scratch pad's 🧮 button used to float in the bottom corner of a fight,
 * and on a phone it sat on top of the last skill or item in the bar until the
 * page was scrolled. In a fight the pad is now a chip at the end of the skill
 * bar, so nothing floats there and no strip is left under the screen. On the
 * training ground, where there is no bar, the corner button stays, and the
 * screen ends with a strip as tall as it. Where the pad is turned off, both go.
 * These checks read a real fight and a real practice on a phone. Nothing new
 * is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const b = document.getElementById('calcBtn'), r = b.getBoundingClientRect();
  const ctl = [...document.querySelectorAll('.screen.on #powerbar .pw, .screen.on #fleeBtn, .screen.on button, .screen.on .kbd')].filter(e => e.getBoundingClientRect().height > 0);
  const low = Math.max(...ctl.map(e => e.getBoundingClientRect().bottom));
  const chips = [...document.querySelectorAll('.screen.on #powerbar .pw')].map(e => e.innerText.trim());
  const hit = ctl.filter(e => { const c = e.getBoundingClientRect(); return c.right > r.left && c.left < r.right && c.bottom > r.top && c.top < r.bottom; }).map(e => e.innerText);
  return { shown: getComputedStyle(b).display !== 'none', room: document.body.classList.contains('calcRoom'), n: ctl.length,
    low: Math.round(low), top: Math.round(r.top), hit, chips, pad: parseFloat(getComputedStyle(document.querySelector('.screen.on')).paddingBottom),
    wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'calcroom',
  title: 'Calc room · in a fight the scratch pad is a chip in the skill bar; the corner button is for practice only',
  viewport: { width: 390, height: 700 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      Prefs.d.motion = false; Prefs.d.lessons = false; Prefs.d.calc = true;
      Object.assign(Game.s.items, { potion: 3, insight: 3, rage: 3, feather: 1 });
      Game.s.loadout = ['ward', 'sight', 'steady'];
      Elite.force = null; window.__ec = Elite.CHANCE; Elite.CHANCE = 0;
      Battle.begin(0, 0);
    });
    await sleep(600);
    let r = await read(t);
    t.ok('in a fight no button floats in the corner, and no strip is left', await t.screen() === 's-battle' && !r.shown && !r.room && r.pad < 72, JSON.stringify(r));
    t.ok('the scratch pad is the last chip in the skill bar', r.chips[r.chips.length - 1] === '🧮 Scratch pad' && r.chips.length >= 6, JSON.stringify(r.chips));
    t.ok('nothing in the bar is covered', r.hit.length === 0, JSON.stringify(r.hit));
    t.ok('the fight still fits the phone across', r.wide, 'the page scrolls sideways');
    await t.ev(() => document.querySelector('#powerbar [data-pw="calc"]').click());
    await sleep(200);
    const opened = await t.ev(() => ({ shown: Calc.shown, panel: getComputedStyle(document.getElementById('calcPanel')).display !== 'none' }));
    t.ok('tapping the chip opens the pad', opened.shown && opened.panel, JSON.stringify(opened));
    await t.ev(() => document.querySelector('#powerbar [data-pw="calc"]').click());
    await sleep(200);
    t.ok('tapping it again closes the pad', await t.ev(() => !Calc.shown), 'still open');

    await t.ev(() => { Battle.flee(); UI.go('s-train'); Train.startPool('det2'); });
    await sleep(500);
    r = await read(t);
    t.ok('on the training ground the corner button shows, with its strip', await t.screen() === 's-train' && r.shown && r.room && r.pad >= 72, JSON.stringify(r));
    t.ok('scrolled down, nothing there is under it', r.low <= r.top, JSON.stringify([r.low, r.top]));

    await t.ev(() => { Battle.flee(); UI.go('s-map'); });
    await sleep(400);
    r = await read(t);
    t.ok('on the map there is no button and no strip', !r.shown && !r.room && r.pad < 72, JSON.stringify(r));

    await t.ev(() => { Prefs.d.calc = false; Elite.CHANCE = 0; Battle.begin(0, 0); });
    await sleep(600);
    r = await read(t);
    t.ok('with the scratch pad turned off, no strip either', !r.shown && !r.room && r.pad < 72, JSON.stringify(r));
    t.ok('and no chip in the bar', !r.chips.includes('🧮 Scratch pad'), JSON.stringify(r.chips));
    await t.ev(() => { Battle.flee(); Prefs.d.calc = true; Elite.CHANCE = window.__ec; UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
