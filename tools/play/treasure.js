/* A treasure map.
 *
 * A campaign victory graded A or better turns up a scrap of a treasure map,
 * said on the victory card; a lower grade finds nothing. The third scrap
 * makes the map whole, and X marks an old realm the knight has fought in,
 * not the one just won in, said on the card and shown on that realm's
 * heading on the map. A win elsewhere digs nothing up; the next win in the
 * marked realm digs up a hoard worth its boss's gold, said on the card, and
 * the mark is gone. These checks win real fights with real answers on a
 * phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const fight = (t, ri, fi) => t.ev(([ri, fi]) => {
  Battle.flee();
  Prefs.d.motion = false; Prefs.d.lessons = false;
  Elite.force = null;
  const odds = Elite.CHANCE; Elite.CHANCE = 0;
  Battle.begin(ri, fi);
  Elite.CHANCE = odds;
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
}, [ri, fi]);
/* One answer, right or wrong, struck softly unless it is the last. */
const answer = async (t, right, last, hp) => {
  await t.ev(([right, last]) => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = last ? 1 : 1e6;
    Battle.answer(null, right ? Battle.cur.a : Battle.cur.choices.find(c => c !== Battle.cur.a));
    Combat.strike = cs;
  }, [right, last]).catch(() => null);
  await sleep(1200);
  await t.ev(hp => { Game.s.maxHp = 1000; Game.s.hp = hp; const b = document.querySelector('#explain button'); if (b) b.click(); }, hp);
  await sleep(400);
};
/* A fight won: clean and hale for an A, or with a miss and low for a C. */
const win = async (t, ri, fi, well) => {
  await fight(t, ri, fi);
  if (!well) await answer(t, false, false, 1000);
  await answer(t, true, false, 1000);
  const hp = well ? 1000 : 100;
  await t.ev(hp => { Game.s.hp = hp; }, hp);
  await answer(t, true, true, hp);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
  return t.ev(() => {
    const $ = id => document.getElementById(id), txt = id => $(id) ? $(id).innerText : null;
    return { grade: $('gradeCard') ? $('gradeCard').innerText : '', scrap: txt('treasureScrap'), whole: txt('treasureWhole'), won: txt('treasureWon'),
      n: Treasure.n, at: Treasure.at, gold: Game.s.gold, wide: $('resultBody').scrollWidth <= innerWidth + 1 };
  });
};
const map = (t) => t.ev(() => {
  UI.go('s-map');
  const tag = ri => { const d = document.getElementById('realm-' + ri); return !!(d && d.querySelector('summary .treasureTag')); };
  return { vale: tag(0), marches: tag(1), wide: document.documentElement.scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'treasure',
  title: 'A treasure map · three wins at A or better make a map, and a win where X marks digs up a hoard',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      Treasure.n = 0; Treasure.at = null; Campfire.slips = [];
      // the Vale beaten, the Marches begun
      for (const k of ['0:0', '0:1', '0:2', '0:3', '1:0']) Game.s.cleared[k] = 'A';
    });

    let w = await win(t, 1, 0, false);
    t.ok('a win below A finds no scrap', !w.scrap && !w.whole && !w.won && w.n === 0, JSON.stringify(w));

    w = await win(t, 1, 0, true);
    t.ok('a win at A or better finds the first scrap, said on the card', /A scrap of a treasure map, 1\/3\./.test(w.scrap || '') && w.n === 1, JSON.stringify(w));
    t.ok('and the card fits a phone', w.wide);
    w = await win(t, 1, 0, true);
    t.ok('the second', /2\/3/.test(w.scrap || '') && w.n === 2, JSON.stringify(w));
    w = await win(t, 1, 0, true);
    t.ok('the third makes the map whole, and X marks the old realm, not the one just won in',
      w.at === 0 && /The map is whole! X marks Vale of Vectors: win any fight there to dig up its hoard of 🪙 110\./.test(w.whole || ''), JSON.stringify(w));
    let m = await map(t);
    t.ok('the map marks that realm\'s heading, and no other', m.vale && !m.marches && m.wide, JSON.stringify(m));

    w = await win(t, 1, 0, true);
    t.ok('a win elsewhere digs nothing up and finds no scrap', !w.scrap && !w.whole && !w.won && w.at === 0 && w.n === 3, JSON.stringify(w));
    const before = w.gold;
    w = await win(t, 0, 1, false);
    t.ok('a win where X marks digs up the hoard, at any grade, said on the card',
      /X marked the spot: you dig up the hoard of Vale of Vectors, \+110 gold\./.test(w.won || '') && w.at === null && w.n === 0, JSON.stringify(w));
    t.ok('and pays it', w.gold - before >= 110, JSON.stringify([before, w.gold]));
    m = await map(t);
    t.ok('the mark is gone from the map', !m.vale && !m.marches, JSON.stringify(m));

    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
    await t.ev(() => { [Bounty.bump, Bounty.claim, Quarry.of] = window.__keep; Battle.flee(); UI.go('s-title'); });
  }
};
