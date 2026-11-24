/* Revenge.
 *
 * A campaign foe that fells the knight holds the gold lost in the retreat.
 * The defeat says so, the map marks that foe and no other, and beating it
 * wins the gold back on top of the win's own, said on the victory card and
 * counted into the gold shown. A second win pays nothing more, and a fall to
 * another foe is held by that foe. These checks fight on a phone. Nothing new
 * is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, fi) => t.ev(fi => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(0, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false;
}, fi);
const fall = async (t, fi, gold) => {
  await fight(t, fi);
  await t.ev(gold => { Game.s.gold = gold; Battle.lose(); }, gold);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(400);
  return t.ev(() => { const e = document.getElementById('revengeOwed'); return { owed: e ? e.innerText : null, gold: Game.s.gold }; });
};
const map = (t) => t.ev(() => {
  UI.go('s-map');
  const tags = [...document.querySelectorAll('#revengeTag')];
  return { n: tags.length, text: tags.map(e => e.innerText).join('|'),
    foe: tags.map(e => e.closest('.foe, .node, [onclick]') ? e.closest('.foe, .node, [onclick]').innerText.split('\n')[0] : '').join('|') };
});
/* A win with one right answer that fells the foe; then the victory card. */
const win = async (t, fi) => {
  await fight(t, fi);
  await t.ev(() => {
    window.__gold0 = Game.s.gold;
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1500);   // the gold counts up on the card
  const r = await t.ev(() => {
    const l = document.getElementById('revengeWon');
    return { line: l ? l.innerText : null, counted: +document.getElementById('rGold').innerText, paid: Game.s.gold - window.__gold0,
      nm: Battle.foe.nm, wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1 };
  });
  await t.ev(() => { const b = document.getElementById('cbtn'); if (b) b.click(); else if (Chest.pending) Chest.close(); });
  await sleep(400);
  return r;
};

module.exports = {
  name: 'revenge',
  title: 'Revenge · the foe that felled you holds your lost gold until you beat it',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    // other gold on a win is its own business: these sums are the revenge's
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Overkill.CAP, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Overkill.CAP = 0; Quarry.of = () => null;
      Game.s.cleared = { '0:0': 'B', '0:1': 'B' }; WarPath.n = 0;
    });

    let m = await map(t);
    t.eq('the map marks no foe before a fall', m.n, 0);

    let f = await fall(t, 0, 1000);
    t.eq('a fall loses the retreat\'s gold as ever', f.gold, 850);
    t.ok('and the defeat says the foe holds it', !!f.owed && f.owed.includes('150 gold') && /win it back/.test(f.owed), JSON.stringify(f));
    f = await fall(t, 0, 1000);
    t.ok('a second fall to the same foe adds to what it holds', !!f.owed && f.owed.includes('300 gold'), JSON.stringify(f));

    m = await map(t);
    t.ok('the map marks that foe, and only it', m.n === 1 && m.text.includes('300'), JSON.stringify(m));

    await t.ev(() => { WarPath.n = 0; });
    let w = await win(t, 1);
    t.ok('a win over another foe wins none of it back', w.line === null, JSON.stringify(w));

    await t.ev(() => { WarPath.n = 0; });
    const plain = (await t.ev(() => Math.round(REALMS[0].foes[0].gold * 0.45)));
    w = await win(t, 0);
    t.ok('beating the foe that holds it says so on the victory card', !!w.line && w.line.includes('300 gold') && w.line.includes(w.nm), JSON.stringify(w));
    t.eq('and pays it back on top of the win\'s own gold', w.paid, plain + 300);
    t.eq('counted into the gold the card shows', w.counted, w.paid);
    t.ok('and the card fits a phone', w.wide);

    m = await map(t);
    t.eq('the mark is gone from the map', m.n, 0);
    await t.ev(() => { WarPath.n = 0; });
    w = await win(t, 0);
    t.ok('a second win pays nothing more', w.line === null && w.paid === plain, JSON.stringify(w));

    await t.ev(() => {
      [Bounty.bump, Bounty.claim, Overkill.CAP, Quarry.of] = window.__keep;
      Battle.flee(); UI.go('s-title');
    });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    t.ok('and nothing held is in the save', !(await t.ev(() => JSON.stringify(Game.s))).includes('owed'));
  },
};
