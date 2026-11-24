/* The sitting's tale.
 *
 * Every campaign victory's ballad is written into the tale of the sitting,
 * kept folded on the map under the sitting's tally: newest verse first, with
 * the foe and the grade it was won at, and the count of verses on the fold.
 * With no victory yet there is no tale. These checks win real fights with
 * real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, stance) => t.ev(stance => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  WarPath.n = 0;
  Battle.begin(0, 0);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
  for (let i = 0; stance && i < 3 && Battle.stance !== stance; i++) Stance.turn(Battle);
}, stance || null);
/* One answer, right or wrong, struck softly unless it is the last. */
const answer = async (t, right, last, hp) => {
  await t.ev(([right, last, hp]) => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = last ? 1 : 1e6;
    Game.s.maxHp = 1000; Game.s.hp = hp;
    Battle.answer(null, right ? Battle.cur.a : Battle.cur.choices.find(c => c !== Battle.cur.a));
    Combat.strike = cs;
  }, [right, last, hp]).catch(() => null);
  await sleep(1200);
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  await sleep(400);
};
/* A fight won after some misses, ending at the health asked for. */
const win = async (t, misses, hp, stance) => {
  await fight(t, stance);
  for (let i = 0; i < misses; i++) await answer(t, false, false, 1000);
  await answer(t, true, false, 1000);
  await answer(t, true, true, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  const c = await t.ev(() => {
    const el = document.getElementById('ballad'), gold = document.getElementById('rGold');
    return { k: el ? el.dataset.k : null, text: el ? el.innerText : null, foe: Battle.foe.nm, missed: Battle.missed,
      after: !!el && !!el.previousElementSibling && /falls before your blade/.test(el.previousElementSibling.innerText),
      wide: document.getElementById('resultBody').scrollWidth <= innerWidth + 1, screen: document.querySelector('.screen.on') && document.querySelector('.screen.on').id };
  });
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return c;
};

const tale = (t) => t.ev(() => {
  UI.go('s-map');
  const d = document.getElementById('tale');
  if (!d) return null;
  d.open = true;
  return { fold: d.querySelector('summary').innerText, rows: [...d.querySelectorAll('.taleRow')].map(r => ({ k: r.dataset.k, text: r.innerText })),
    node: d.classList.contains('node') || !!d.querySelector('.node'), wide: document.body.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'tale',
  title: "The sitting's tale · every campaign victory's verse kept on the map, newest first",
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Tale.log = []; Tale.n = 0;
    });
    t.ok('with no victory yet the map keeps no tale', await tale(t) === null);

    const one = await win(t, 0, 1000);
    let c = await tale(t);
    t.ok('a victory writes its verse into the tale, said on the fold', !!c && /This sitting's tale · 1 verse$/.test(c.fold.trim()) && c.rows.length === 1, JSON.stringify(c));
    t.ok('the verse is the one sung on the card, with the foe and its grade', !!c && c.rows[0].k === one.k && c.rows[0].text.includes(one.text.replace(/^🎶 /, '')) && /^[SABC] · /.test(c.rows[0].text) && c.rows[0].text.includes(one.foe), JSON.stringify([one, c]));

    const two = await win(t, 3, 1000);
    c = await tale(t);
    t.ok('the next victory is written above it', !!c && /2 verses$/.test(c.fold.trim()) && c.rows.length === 2 && c.rows[0].k === two.k && c.rows[1].k === one.k, JSON.stringify([two.k, one.k, c]));
    t.ok('and it fits a phone, and is no foe on the map', !!c && c.wide && !c.node, JSON.stringify(c));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
