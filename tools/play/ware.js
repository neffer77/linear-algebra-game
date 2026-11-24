/* Ware.
 *
 * The Smithy listed every blade and coat at full length and said what each did,
 * but not what it would do for the knight holding a Vector Saber. Each row now
 * says what it adds over what is worn, or what going back to it would cost, and
 * the list runs only to the next two out of reach, the dearer ones behind a
 * fold that says how many and how dear. These checks read it on a phone.
 * Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const read = t => t.ev(() => [...document.querySelectorAll('#shopList .panel')].slice(0, 2).map(p => ({
  rows: [...p.querySelectorAll('.item')].map(r => ({ nm: r.querySelector('.nm').innerText, vs: (r.querySelector('.vs') || {}).innerText || '', up: !!r.querySelector('.vs.up'),
    fits: r.getBoundingClientRect().right <= innerWidth + 1 })),
  more: (p.querySelector('.wareMore') || {}).innerText || ''
})));

module.exports = {
  name: 'ware',
  title: 'Ware · each piece in the Smithy says what it adds over what is worn, and the dear ones wait behind a fold',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => { const g = Game.s; g.gold = 731; g.owned.w1 = 1; g.owned.w2 = 1; g.weapon = 'w2'; UI.go('s-shop'); UI.renderShop(); });
    await sleep(300);
    let [w, a] = await read(t);
    t.ok('the blades run to the next two out of reach, the Integral Greatsword last', w.rows.length === 7 && w.rows[6].nm === 'Integral Greatsword', JSON.stringify(w.rows.map(r => r.nm)));
    t.ok('and the fold says how many more and how dear they get', w.more === '＋ 3 dearer blades, up to 🪙 5200', w.more);
    const by = n => w.rows.find(r => r.nm === n);
    t.ok('a better blade says what it adds over the Saber, in green', by('Determinant Cleaver').vs === '+7 damage, +2% crit over your Vector Saber' && by('Determinant Cleaver').up, JSON.stringify(by('Determinant Cleaver')));
    t.ok('a weaker blade says what going back to it costs, not in green', by('Iron Shortsword').vs === '6 less damage, 2% less crit than your Vector Saber' && !by('Iron Shortsword').up, JSON.stringify(by('Iron Shortsword')));
    t.ok('the blade in hand compares with nothing', by('Vector Saber').vs === '', by('Vector Saber').vs);
    t.ok('the coats are measured against the Tunic worn', a.rows.find(r => r.nm === 'Leather Jerkin').vs === '+2 defence, +10 health over your Peasant Tunic', JSON.stringify(a.rows.slice(0, 3)));
    t.ok('the coats fold too, past the next two out of reach', a.rows.length === 7 && a.rows[6].nm === 'Diagonal Ward' && a.more === '＋ 2 dearer coats, up to 🪙 4000', JSON.stringify([a.rows.map(r => r.nm), a.more]));
    t.ok('every row fits the phone', w.rows.concat(a.rows).every(r => r.fits), 'a row runs off the screen');

    // open the blades: all ten, and the fold stays open when one is bought
    await t.ev(() => document.getElementById('wareMorew').click());
    await sleep(200);
    [w, a] = await read(t);
    t.ok('opened, every blade is listed and the fold is gone', w.rows.length === 10 && w.more === '' && a.rows.length === 7, JSON.stringify([w.rows.length, w.more, a.rows.length]));
    await t.ev(() => Shop.buy('w', 'w4', 520));
    await sleep(200);
    [w, a] = await read(t);
    t.ok('bought and worn, every line now measures against the Halberd', w.rows.length === 10 && w.rows.find(r => r.nm === 'Eigenblade').vs === '+10 damage, +5% crit over your Gradient Halberd'
      && w.rows.find(r => r.nm === 'Vector Saber').vs === '15 less damage, 5% less crit than your Gradient Halberd', JSON.stringify(w.rows.map(r => r.vs)));

    // a rich knight sees every coat, unfolded
    await t.ev(() => { Ware.open = {}; Game.s.gold = 99999; UI.renderShop(); });
    await sleep(200);
    [w, a] = await read(t);
    t.ok('with gold for all of them, nothing is folded', w.rows.length === 10 && a.rows.length === 9 && !w.more && !a.more, JSON.stringify([w.rows.length, a.rows.length]));
    t.ok('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()) === keys, 'a key was added to the save');
  }
};
