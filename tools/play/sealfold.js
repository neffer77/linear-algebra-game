/* Sealed realms.
 *
 * Under the road, every realm kept a heading of its own on the map, so a new
 * knight scrolled past six headings for realms they cannot yet enter, each
 * already a dark stone on the road above. The next realm to open keeps its
 * heading; the ones past it wait behind one line that counts and names them,
 * which opens in place and stays open for the rest of the sitting. A stone
 * tapped on the road opens the fold on its way to the realm. These checks
 * read the map on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  UI.go('s-map');
  const d = document.getElementById('sealAll'), list = document.getElementById('mapList');
  const vis = el => !!el && !el.closest('details:not([open])') && el.getBoundingClientRect().height > 0;
  const kids = d ? [...d.children].filter(c => c.matches('details.realm')).map(c => c.id) : [];
  const top = [...list.querySelectorAll('details.realm')].filter(x => !x.closest('#sealAll')).map(x => x.id);
  return { here: !!d, open: d ? d.open : null, summary: d ? d.querySelector('summary').innerText.replace(/\s+/g, ' ').trim() : null,
    kids, top, shown: kids.filter(id => vis(document.getElementById(id))).length,
    all: document.querySelectorAll('#mapList details.realm').length,
    tall: Math.round(list.getBoundingClientRect().height / innerHeight * 10) / 10,
    wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'sealfold',
  title: 'Sealed realms · past the next realm to open, the sealed ones wait behind one line that counts and names them',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { Game.s.firstRun = 1; SealFold.open = false; });
    let r = await read(t);
    const shut = r.tall;
    t.ok('a new knight\'s six realms past the next are folded', r.here && r.open === false && r.kids.length === 6 && r.shown === 0, JSON.stringify(r));
    t.eq('the realm they are in and the next to open keep their headings', r.top, ['realm-0', 'realm-1']);
    t.ok('in order, and every realm is still on the page', r.kids.join() === 'realm-2,realm-3,realm-4,realm-5,realm-6,realm-7' && r.all === 8, JSON.stringify([r.kids, r.all]));
    const names = await t.ev(() => [REALMS[2].nm, REALMS[7].nm]);
    t.eq('one line counts them and says from where to where', r.summary, '＋ 6 more sealed realms ' + names[0] + ' to ' + names[1]);
    t.ok('nothing runs off the side', r.wide, 'the page scrolls sideways');

    // a stone tapped on the road opens the fold on its way to the realm
    await t.ev(() => document.querySelector('#realmPath .stone[data-realm="5"]').click());
    await sleep(500);
    r = await read(t);
    const opened = await t.ev(() => { const d = document.getElementById('realm-5'), b = d.getBoundingClientRect(); return { open: d.open, top: Math.round(b.top), inView: b.top >= -2 && b.top < innerHeight }; });
    t.ok('a sealed stone further on opens the fold and its realm', r.open === true && opened.open && opened.inView, JSON.stringify([r.open, opened]));
    t.ok('and the page grows to hold them', r.shown === 6 && r.tall > shut, JSON.stringify([r.shown, shut, r.tall]));

    // it stays open for the sitting
    await t.ev(() => UI.go('s-tome'));
    await sleep(200);
    r = await read(t);
    t.ok('back on the map later, it is still open', r.open === true && r.shown === 6, JSON.stringify([r.open, r.shown]));
    await t.ev(() => document.querySelector('#sealAll > summary').click());
    await sleep(200);
    r = await read(t);
    t.ok('closed again, it stays closed', r.open === false && r.shown === 0, JSON.stringify([r.open, r.shown]));

    // two champions down: the third realm is open, the fourth is next, four wait folded
    await t.ev(() => { for (const ri of [0, 1]) REALMS[ri].foes.forEach((f, fi) => { Game.s.cleared[ri + ':' + fi] = 'A'; }); });
    r = await read(t);
    t.ok('as realms open, fewer wait in the fold', r.kids.join() === 'realm-4,realm-5,realm-6,realm-7' && r.top.join() === 'realm-0,realm-1,realm-2,realm-3', JSON.stringify([r.top, r.kids]));
    t.ok('and its line counts the four', /^＋ 4 more sealed realms /.test(r.summary), r.summary);

    // with one sealed realm left there is nothing to fold
    await t.ev(() => { for (let ri = 0; ri < REALMS.length - 2; ri++) REALMS[ri].foes.forEach((f, fi) => { Game.s.cleared[ri + ':' + fi] = 'A'; }); });
    r = await read(t);
    t.ok('the last sealed realm is shown, not folded', !r.here && r.top.length === 8, JSON.stringify(r));
    await t.ev(() => { Game.s.cleared = {}; SealFold.open = false; });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
