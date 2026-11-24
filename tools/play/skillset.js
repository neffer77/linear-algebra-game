/* Skillset.
 *
 * Gear listed all ten skills at full length, three carried and seven more with
 * no use yet. The carried skills and any with a use stay in view; the rest wait
 * behind one line that counts them and opens in place, and each can still be
 * carried from there. A count of one topic reads "1 needs work". These checks
 * read it on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  const list = document.getElementById('gearList'), d = list.querySelector('details.skillRest');
  const vis = el => el.getBoundingClientRect().height > 0;
  const items = [...list.querySelectorAll('.panel')].find(p => /Skills/.test(p.querySelector('h2').innerText)).querySelectorAll('.item');
  return { shown: [...items].filter(vis).map(i => i.querySelector('.nm').childNodes[0].textContent.trim()), all: items.length,
    summary: d ? d.querySelector('summary').innerText : '', open: d ? d.open : null, text: list.innerText };
});

module.exports = {
  name: 'skillset',
  title: 'Skillset · Gear shows the skills carried or with a use, and folds the ones with none behind a count',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    const want = await t.ev(() => { Game.s.loadout = ['ward', 'sight', 'steady']; UI.go('s-gear');
      const ch = SKILL_ABILITIES.filter(a => Loadout.charges(a) > 0 || Game.s.loadout.includes(a.id)).map(a => a.nm);
      return { ch, total: SKILL_ABILITIES.length }; });
    await sleep(300);
    let r = await read(t);
    const rest = want.total - want.ch.length;
    t.ok('the skills carried or with a use are in view, the rest are not', JSON.stringify(r.shown) === JSON.stringify(want.ch) && r.all === want.total, JSON.stringify([r.shown, want.ch]));
    t.ok('one line counts the folded ones', rest >= 2 && r.summary === '＋ ' + rest + ' more skills with no uses yet' && r.open === false, r.summary);

    // open it: every skill there, and carrying one keeps the fold open
    await t.ev(() => document.querySelector('#gearList details.skillRest > summary').click());
    await sleep(200);
    r = await read(t);
    t.ok('opened, every skill is listed', r.shown.length === want.total && r.open, JSON.stringify(r.shown));
    const pick = await t.ev(() => { const a = SKILL_ABILITIES.find(x => !Game.s.loadout.includes(x.id) && !Loadout.charges(x)); Loadout.toggle(a.id); return a.nm; });
    await sleep(200);
    r = await read(t);
    t.ok('a folded skill can be carried, and the fold stays open', r.open !== false && r.shown.includes(pick) && /carried/.test(r.text), JSON.stringify([pick, r.open]));

    // one topic short reads "needs work"
    await t.ev(() => { const k = Object.keys(TOPIC_LABEL)[0]; Game.s.topicStats[k] = { c: 0, w: 3, m: 0.1, seen: 3, last: 0, t: Date.now() }; UI.go('s-gear'); });
    await sleep(200);
    r = await read(t);
    t.ok('one topic needing work reads "1 needs work"', /\b1 needs work\b/.test(r.text) && !/\b1 need work\b/.test(r.text), (r.text.match(/\d+ needs? work/g) || []).join());
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
