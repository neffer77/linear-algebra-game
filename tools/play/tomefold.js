/* Tome fold.
 *
 * Under its index of every workshop the Tome went on to give each one a card
 * of its own, forty-odd paragraphs, and the lessons at the foot of the page
 * sat thirty screens down on a phone. The cards that say what each workshop
 * does now wait behind one line that counts them; it opens in place and stays
 * open for the rest of the sitting. Every workshop still opens from its chip
 * or its card. These checks read the Tome on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => {
  const d = document.getElementById('tomeAll'), list = document.getElementById('tomeList');
  const vis = el => !!el && !el.closest('details:not([open])') && el.getBoundingClientRect().height > 0;
  const cards = d ? [...d.querySelectorAll('.panel')] : [];
  const lore = [...list.children].filter(c => c.classList.contains('panel') && !c.id && !c.querySelector('button'));
  return { here: !!d, open: d ? d.open : null, summary: d ? d.querySelector('summary').innerText : null, n: cards.length,
    btns: cards.filter(c => c.querySelector('button[id^="tome"]')).length, shown: cards.filter(vis).length,
    lore: lore.length, loreShown: lore.filter(vis).length, tall: Math.round(list.getBoundingClientRect().height / innerHeight * 10) / 10,
    index: [...list.children].findIndex(c => c.id === 'wsIndex'), wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'tomefold',
  title: 'Tome fold · the workshop cards wait behind one counted line, and the lessons come up the page',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => UI.go('s-tome'));
    await sleep(300);
    let r = await read(t);
    const shut = r.tall;
    t.ok('the workshop cards are folded', r.here && r.open === false && r.n >= 40 && r.shown === 0, JSON.stringify(r));
    t.ok('one line counts them', r.summary === '＋ What each of the ' + r.n + ' workshops does' && r.btns === r.n, r.summary);
    t.ok('the index still comes second, and the lessons are in view below the fold', r.index === 1 && r.lore >= 8 && r.loreShown === r.lore, JSON.stringify([r.index, r.lore, r.loreShown]));
    t.ok('the Tome is a few screens long, not thirty', shut <= 8, String(shut));

    // a folded card still opens its workshop
    await t.tap('tomeTaylor');
    await sleep(300);
    const went = await t.screen();
    t.ok('a folded card\'s button still opens its workshop', went !== 's-tome', went);

    // opened, it stays open for the sitting
    await t.ev(() => UI.go('s-tome'));
    await sleep(200);
    await t.ev(() => document.querySelector('#tomeAll > summary').click());
    await sleep(200);
    r = await read(t);
    t.ok('opened, every card is in view', r.open === true && r.shown === r.n, JSON.stringify([r.open, r.shown, r.n]));
    t.ok('and the page grows to hold them', r.tall > shut * 2, JSON.stringify([shut, r.tall]));
    await t.ev(() => UI.go('s-map'));
    await sleep(200);
    await t.ev(() => UI.go('s-tome'));
    await sleep(200);
    r = await read(t);
    t.ok('back in the Tome later, it is still open', r.open === true && r.shown === r.n, JSON.stringify([r.open, r.shown]));
    t.ok('nothing runs off the side', r.wide, 'the page scrolls sideways');
    await t.ev(() => { TomeFold.open = false; });
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
