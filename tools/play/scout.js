/* Scouting.
 *
 * The victory card offers to scout the next foe on the road: it shows the
 * rule of the topic that foe cannot stand, then asks one question on it. A
 * miss shows the answer and offers another question; a right answer says the
 * knight is prepared. The next fight against that foe says so as it starts,
 * and a right answer on its weak point lands twice as hard, with the chip
 * saying ×2. That fight spends it: the one after is plain again. These checks
 * win real fights with real answers on a phone. Nothing new is saved.
 */
'use strict';

const { sleep } = require('./harness');

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
const prep = (t) => t.ev(() => {
  Game.s.maxHp = Game.s.hp = 1000; Game.s.lvl = 40; Game.s.xp = 0;
  Battle.beastLeft = 0; Battle.wardUp = false; Battle.ehp = 1e6;
  Satchel.n = 0; Boon.open = false; Boon.held = null;
});
const answer = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.ehp = 1e6;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(900);
  await t.ev(() => { Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  await sleep(400);
};
const finish = async (t) => {
  await t.ev(() => {
    const cs = Combat.strike; Combat.strike = () => 1;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false; Battle.charge = 0; Battle.coup = false;
    Battle.ehp = 1;
    Battle.answer(null, Battle.cur.a);
    Combat.strike = cs;
  });
  await sleep(1400);
  await t.ev(() => { Game.s.maxHp = 1000; Game.s.hp = 1000; const b = document.querySelector('#explain button'); if (b) b.click(); });
  for (let i = 0; i < 30 && await t.screen() !== 's-result'; i++) await sleep(250);
  await sleep(1800);
  await t.ev(() => { if (document.getElementById('chest').classList.contains('on')) document.getElementById('cbtn').click(); else if (Chest.pending) Chest.close(); });
  await sleep(300);
};
const card = (t) => t.ev(() => {
  const $ = id => document.getElementById(id);
  return { go: $('scoutGo') ? $('scoutGo').innerText : null, ready: $('scoutReady') ? $('scoutReady').innerText : null,
    card: $('scoutCard') ? $('scoutCard').innerText : null, q: $('scoutQ') ? $('scoutQ').innerText : null,
    choices: document.querySelectorAll('#scoutChoices .choice').length, again: !!$('scoutAgain'),
    out: $('scoutOut') ? $('scoutOut').innerText : null, wide: $('resultBody').scrollWidth <= innerWidth + 1 };
});
/* One question on the weak point, struck with a known strike: the damage it multiplies by. */
const weakHit = (t) => t.ev(() => {
  const k = Weak.of(Battle);
  Battle.cur = buildQuestion(k, 1);
  const chip = Weak.chip(Battle);
  return { bonus: Weak.bonus(Battle), chip, prepared: !!Battle.prepared };
});

module.exports = {
  name: 'scout',
  title: 'Scouting · study the next foe\'s weak point on the victory card, and strikes on it land twice as hard',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Ada');
    const keys = await t.ev(() => Object.keys(Game.s).sort().join());
    await t.ev(() => {
      window.__keep = [Bounty.bump, Bounty.claim, Quarry.of, UI.toast];
      Bounty.bump = () => {}; Bounty.claim = () => {}; Quarry.of = () => null;
      const toast = UI.toast; UI.toast = function (m) { (window.__toasts = window.__toasts || []).push(m); return toast.apply(this, arguments); };
    });
    const next = await t.ev(() => ({ nm: REALMS[0].foes[1].nm, k: Weak.OF[REALMS[0].foes[1].nm] }));
    const label = await t.ev(k => TOPIC_LABEL[k], next.k);

    await fight(t, 0); await answer(t); await finish(t);
    let c = await card(t);
    t.ok('the victory card offers to scout the next foe by name', !!c.go && c.go.includes('Scout ' + next.nm) && c.ready === null, JSON.stringify(c));
    t.ok('and fits a phone', c.wide);
    const was = await t.ev(k => (Game.s.topicStats[k] || { seen: 0 }).seen, next.k);
    await t.ev(() => document.getElementById('scoutGo').click());
    await sleep(300);
    c = await card(t);
    t.ok('scouting names the weak point and shows its rule before one question', !!c.card && c.card.includes(label) && c.card.includes('Study the rule') && !!c.q && c.choices === 4, JSON.stringify(c));
    t.ok('and still fits a phone', c.wide);
    await t.ev(() => document.querySelector('#scoutChoices .choice:not([data-correct="1"])').click());
    await sleep(300);
    c = await card(t);
    t.ok('a miss shows the answer, prepares nothing and offers another', !!c.out && c.out.includes('The answer was') && c.again && c.ready === null, JSON.stringify(c));
    await t.ev(() => document.getElementById('scoutAgain').click());
    await sleep(300);
    c = await card(t);
    t.ok('another question comes', !!c.q && c.choices === 4 && !c.again, JSON.stringify(c));
    await t.ev(() => document.querySelector('#scoutChoices .choice[data-correct="1"]').click());
    await sleep(300);
    c = await card(t);
    t.ok('a right answer prepares the knight, said on the card', !!c.ready && c.ready.includes('Prepared for ' + next.nm) && c.ready.includes('×2'), JSON.stringify(c));
    t.eq('both answers count toward the topic', await t.ev(k => Game.s.topicStats[k].seen, next.k), was + 2);

    // the scouted foe, fought prepared
    await t.ev(() => document.getElementById('nextGo').click());
    await sleep(600); await prep(t);
    let s = await t.ev(() => ({ fi: Battle.fi, prepared: !!Battle.prepared, toasts: window.__toasts.slice() }));
    t.ok('the next fight against it says the knight is prepared', s.fi === 1 && s.prepared && s.toasts.some(m => m.includes('Prepared') && m.includes(next.nm)), JSON.stringify(s));
    let w = await weakHit(t);
    t.ok('and a right answer on its weak point lands twice as hard, said on the question', w.bonus === 2 && w.chip.includes('×2'), JSON.stringify(w));
    await answer(t); await finish(t);

    // spent: the fight after is plain again
    await fight(t, 1);
    w = await weakHit(t);
    t.ok('the fight after is plain again', !w.prepared && w.bonus === 1.5 && w.chip.includes('×1.5'), JSON.stringify(w));

    await t.ev(() => { Battle.flee(); [Bounty.bump, Bounty.claim, Quarry.of, UI.toast] = window.__keep; UI.go('s-title'); });
    t.eq('nothing new is saved', await t.ev(() => Object.keys(Game.s).sort().join()), keys);
  },
};
