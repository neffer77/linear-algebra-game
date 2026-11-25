/* Road.
 *
 * A good win could meet the whole road at once: a scout, a wayfarer, a
 * campfire, a peddler and a dicer, five cards stacked between the victory and
 * the way back to the map, and on a phone the map button sat four screens
 * down. Now the first two stay in view and the rest wait behind one line that
 * counts them and opens in place, and stays open while the card redraws.
 * "Fight again" and "Smithy" share one row. These checks win a real fight on
 * a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const win = async (t) => {
  await t.ev(() => {
    Battle.flee();
    Prefs.d.motion = false; Prefs.d.lessons = false;
    Elite.force = null;
    const e = Elite.CHANCE; Elite.CHANCE = 0;
    Battle.begin(0, 0);
    Elite.CHANCE = e;
    Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
    Battle.beastLeft = 0; Battle.wardUp = false;
    Satchel.n = 0; Boon.open = false; Boon.held = null;
    if (typeof Familiar !== 'undefined') { Familiar.n = 0; Familiar.kind = null; }
  });
  for (let i = 0; i < 5 && await t.screen() !== 's-result'; i++) {
    await t.ev(() => {
      if (!Battle.cur) return;
      const cs = Combat.strike; Combat.strike = () => 1;
      Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
      Battle.ehp = 1;
      Battle.answer(null, Battle.cur.a);
      Combat.strike = cs;
    }).catch(() => null);
    await sleep(1200);
    await t.ev(() => { Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
    for (let j = 0; j < 12 && await t.screen() !== 's-result'; j++) await sleep(250);
  }
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
};

const read = t => t.ev(() => {
  const body = document.getElementById('resultBody'), d = document.getElementById('roadMore');
  const vis = el => !!el && !el.closest('details:not([open])') && el.getBoundingClientRect().height > 0;
  const ids = ['road1', 'road2', 'road3', 'road4', 'road5'];
  const a = document.getElementById('againBtn'), s = document.getElementById('smithyBtn');
  const ra = a ? a.getBoundingClientRect() : null, rs = s ? s.getBoundingClientRect() : null;
  const map = [...body.querySelectorAll('button.btn')].find(b => /To the map|Onward/.test(b.innerText));
  return { here: ids.map(i => !!document.getElementById(i)), shown: ids.map(i => vis(document.getElementById(i))),
    summary: d ? d.querySelector('summary').innerText : null, open: d ? d.open : null,
    row: ra && rs ? { sameTop: Math.abs(ra.top - rs.top) < 2, w: [Math.round(ra.width), Math.round(rs.width)], h: [Math.round(ra.height), Math.round(rs.height)],
      fits: ra.left >= 0 && rs.right <= innerWidth + 1 } : null,
    mapH: map ? Math.round(map.getBoundingClientRect().height) : 0, wide: body.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'road',
  title: 'Road · a win that meets the whole road shows two and folds the rest; Fight again and Smithy share a row',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    // five road cards at once: each offer drawn as a plain card of its own
    await t.ev(() => {
      window.__road = [Scout.html, Wayfarer.html, Campfire.html, Peddler.html, Dicer.html];
      [Scout, Wayfarer, Campfire, Peddler, Dicer].forEach((m, i) => { m.html = () => `<div class="panel" id="road${i + 1}">A card on the road, number ${i + 1}</div>`; });
    });
    await win(t);
    t.ok('a victory card', await t.screen() === 's-result', await t.screen());
    let r = await read(t);
    t.ok('all five road cards are on the card', r.here.every(Boolean), JSON.stringify(r.here));
    t.ok('the first two are in view, the other three behind one line', JSON.stringify(r.shown) === '[true,true,false,false,false]' && r.summary === '＋ 3 more on the road' && r.open === false, JSON.stringify([r.shown, r.summary]));

    // open it, and a redraw keeps it open
    await t.ev(() => document.querySelector('#roadMore > summary').click());
    await sleep(200);
    r = await read(t);
    t.ok('opened, all five are in view', r.shown.every(Boolean) && r.open === true, JSON.stringify([r.shown, r.open]));
    const kept = await t.ev(() => Road.open === true && /id="roadMore" open /.test(Road.group(['a', 'b', 'c', 'd'])));
    t.ok('and a redraw of the card keeps it open', kept, 'the fold forgets it was opened');

    t.ok('Fight again and Smithy share one row on a phone', !!r.row && r.row.sameTop && r.row.fits && r.row.w.every(w => w > 140), JSON.stringify(r.row));
    t.ok('neither wraps to a second line', !!r.row && r.row.h.every(h => h <= r.mapH + 2) && r.wide, JSON.stringify([r.row && r.row.h, r.mapH]));

    // a road of three folds nothing: one more is shown, not hidden
    await t.ev(() => { Dicer.html = () => ''; Peddler.html = () => ''; });
    await win(t);
    r = await read(t);
    t.ok('three road cards are all in view, with no fold', JSON.stringify(r.shown) === '[true,true,true,false,false]' && r.summary === null, JSON.stringify([r.shown, r.summary]));

    // the next fight's road starts folded again
    await t.ev(() => { [Scout, Wayfarer, Campfire, Peddler, Dicer].forEach((m, i) => { m.html = () => `<div class="panel" id="road${i + 1}">A card on the road, number ${i + 1}</div>`; }); });
    await win(t);
    r = await read(t);
    t.ok('a new win folds the road again', r.open === false && r.summary === '＋ 3 more on the road', JSON.stringify([r.open, r.summary]));

    await t.ev(() => { [Scout, Wayfarer, Campfire, Peddler, Dicer].forEach((m, i) => { m.html = window.__road[i]; }); });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
