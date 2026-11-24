/* A rival.
 *
 * Once the strongest plain foe of a realm is beaten, a campaign victory there
 * finds Sir Corvin waiting: the victory card offers the duel. The duel is
 * said as it starts, against a knight a tenth harder than that foe with twice
 * its gold. Won, he yields with a word on the card and offers no duel again
 * in that realm this sitting. These checks win real fights with real answers
 * on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

const prep = (t) => t.ev(() => {
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
});
const answer = async (t, last) => {
  await t.ev(last => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = last ? 1 : 1e6;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  }, last).catch(() => {});
  await sleep(1200);
  await t.ev(() => { Game.s.maxHp = Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
const finish = async (t) => {
  await answer(t, false); await answer(t, true);
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
};
const fight = async (t, fi) => {
  await t.ev(fi => {
    Battle.flee();
    Prefs.d.motion = false; Prefs.d.lessons = false;
    Elite.force = null;
    const odds = Elite.CHANCE; Elite.CHANCE = 0;
    window.__toasts = [];
    Battle.begin(0, fi);
    Elite.CHANCE = odds;
  }, fi);
  await prep(t);
};
const card = (t) => t.ev(() => {
  const $ = id => document.getElementById(id);
  return { box: $('rival') ? $('rival').innerText : null, go: $('rivalGo') ? $('rivalGo').innerText : null,
    won: $('rivalWon') ? $('rivalWon').innerText : null, next: !!$('nextGo'),
    first: [...document.querySelectorAll('#resultBody button')].map(b => b.id || b.innerText.trim())[0],
    wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});

module.exports = {
  name: 'rival',
  title: 'A rival · Sir Corvin waits on the road of each realm\'s strongest foe and offers a duel for double gold',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of, UI.toast];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      const toast = UI.toast; UI.toast = function (m) { (window.__toasts = window.__toasts || []).push(m); return toast.apply(this, arguments); };
    });
    const ri = await t.ev(() => Rival.fi(0));
    const tpl = await t.ev(fi => REALMS[0].foes[fi], ri);

    // before the strongest plain foe falls: no one waits
    await fight(t, 0); await finish(t);
    let c = await card(t);
    t.ok('before the realm\'s strongest foe is beaten, no rival waits', c.box === null, JSON.stringify(c));

    // after it falls: he waits on every victory in the realm
    await t.ev(fi => { Game.s.cleared['0:' + fi] = 'B'; }, ri);
    await fight(t, 0); await finish(t);
    c = await card(t);
    t.ok('once it is beaten, the victory card offers the duel by name', !!c.box && c.box.includes('Sir Corvin') && !!c.go && c.go.includes('Duel Sir Corvin'), JSON.stringify(c));
    t.ok('below the way on, which stays first', c.first === 'nextGo', JSON.stringify(c));
    t.ok('and fits a phone', c.wide);

    await t.ev(() => document.getElementById('rivalGo').click());
    await sleep(600); await prep(t);
    const s = await t.ev(() => ({ nm: Battle.foe.nm, rival: !!Battle.foe.rival, gold: Battle.foe.gold, atk: Battle.foe.atk, hp: Battle.foe.hp,
      fi: Battle.fi, name: document.getElementById('foeName').innerText, toasts: window.__toasts.slice() }));
    t.ok('the duel is said as it starts', s.rival && s.nm === 'Sir Corvin' && s.name.includes('🛡️') && s.toasts.some(m => m.includes('Sir Corvin')), JSON.stringify(s));
    t.ok('a tenth harder than that foe, for twice its gold', s.fi === ri && s.hp === tpl.hp && s.atk === Math.round(tpl.atk * 1.1) && s.gold === tpl.gold * 2, JSON.stringify([s, tpl]));
    await finish(t);
    c = await card(t);
    t.ok('won, he yields with a word on the card', !!c.won && c.won.includes('Sir Corvin yields') && c.box === null, JSON.stringify(c));

    await fight(t, 0); await finish(t);
    c = await card(t);
    t.ok('and offers no duel again in that realm this sitting', c.box === null, JSON.stringify(c));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of, UI.toast] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
