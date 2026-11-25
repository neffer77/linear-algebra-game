/* Calc room.
 *
 * The scratch pad's 🧮 button floats in the bottom corner of a fight, and on a
 * phone it sat on top of the last skill or item in the bar, so a Rune or an
 * Insight could be half hidden under it. While the button shows, the screen
 * now ends with a strip as tall as the button: scrolled to the bottom, every
 * skill, item and the Retreat sit wholly above it. Where the button is hidden
 * the strip goes too. These checks read a real fight on a phone. Nothing new
 * is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const b = document.getElementById('calcBtn'), r = b.getBoundingClientRect();
  const ctl = [...document.querySelectorAll('.screen.on #powerbar .pw, .screen.on #fleeBtn')].filter(e => e.getBoundingClientRect().height > 0);
  const low = Math.max(...ctl.map(e => e.getBoundingClientRect().bottom));
  const hit = ctl.filter(e => { const c = e.getBoundingClientRect(); return c.right > r.left && c.left < r.right && c.bottom > r.top && c.top < r.bottom; }).map(e => e.innerText);
  return { shown: getComputedStyle(b).display !== 'none', room: document.body.classList.contains('calcRoom'), n: ctl.length,
    low: Math.round(low), top: Math.round(r.top), hit, pad: parseFloat(getComputedStyle(document.querySelector('.screen.on')).paddingBottom),
    wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'calcroom',
  title: 'Calc room · the scratch pad button never sits on a skill, an item or the Retreat',
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
    t.ok('in a fight the scratch pad button shows', await t.screen() === 's-battle' && r.shown && r.room, JSON.stringify(r));
    t.ok('scrolled down, nothing in the bar is under it', r.n >= 5 && r.hit.length === 0, JSON.stringify(r.hit));
    t.ok('every skill, item and the Retreat end above the button', r.low <= r.top, JSON.stringify([r.low, r.top]));
    t.ok('the fight still fits the phone across', r.wide, 'the page scrolls sideways');

    await t.ev(() => { Battle.flee(); UI.go('s-map'); });
    await sleep(400);
    r = await read(t);
    t.ok('on the map there is no button and no strip', !r.shown && !r.room && r.pad < 72, JSON.stringify(r));

    await t.ev(() => { Prefs.d.calc = false; Elite.CHANCE = 0; Battle.begin(0, 0); });
    await sleep(600);
    r = await read(t);
    t.ok('with the scratch pad turned off, no strip either', !r.shown && !r.room && r.pad < 72, JSON.stringify(r));
    await t.ev(() => { Battle.flee(); Prefs.d.calc = true; Elite.CHANCE = window.__ec; UI.go('s-map'); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
