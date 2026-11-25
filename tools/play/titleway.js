/* Title way.
 *
 * A locked title said what it asked for and nothing of how far off it was:
 * "Solve 250 riddles" read the same at 3 as at 249. Each title that can be
 * counted now says where the knight stands, and the one nearest to earning is
 * marked. These checks read the titles page on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  const m = {};
  document.querySelectorAll('#s-prefs .medal').forEach(e => {
    const w = e.querySelector('.tway');
    m[e.dataset.title] = { way: w ? w.innerText.trim() : null, got: e.classList.contains('got'), near: e.classList.contains('near') };
  });
  return { m, near: [...document.querySelectorAll('#s-prefs .medal.near')].length, wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'titleway',
  title: 'Title way · each locked title says how far off it is, and the nearest is marked',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      Game.s.titles = { first: 1 }; Game.s.stats.wins = 1;
      Game.s.stats.correct = 40; Game.s.stats.best = 9; Game.s.arenaBest = 3;
      UI.go('s-prefs');
    });
    await sleep(300);
    let r = await read(t);
    t.ok('a title already earned shows no count', r.m.first && r.m.first.got && r.m.first.way === null, JSON.stringify(r.m.first));
    t.ok('riddles solved count toward three titles', r.m.squire.way === '40/50' && r.m.errant.way === '40/250' && r.m.scholar.way === '40/1000', JSON.stringify([r.m.squire, r.m.errant, r.m.scholar]));
    t.ok('the best streak and the arena count too', r.m.form.way === '9/15' && r.m.arena10.way === '3/10' && r.m.arena20.way === '3/20', JSON.stringify([r.m.form, r.m.arena10]));
    t.ok('a title that cannot be counted says nothing', r.m.dragon.way === null && r.m.paragon.way === null, JSON.stringify([r.m.dragon, r.m.paragon]));
    t.ok('the nearest one is marked, and only it', r.near === 1 && r.m.squire.near, JSON.stringify(r.m.squire));

    // more riddles: the mark moves on when another gets nearer
    await t.ev(() => { Game.s.stats.correct = 20; Game.s.stats.best = 14; UI.go('s-prefs'); });
    await sleep(200);
    r = await read(t);
    t.ok('when the streak is nearer, the mark moves to it', r.near === 1 && r.m.form.near && r.m.form.way === '14/15' && !r.m.squire.near, JSON.stringify([r.m.form, r.m.squire]));
    t.ok('nothing runs off the side', r.wide, 'the page scrolls sideways');
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
