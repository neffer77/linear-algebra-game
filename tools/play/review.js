/* What has faded while you were away is brought back, and the list ends.
 *
 * Mastery already fades with time, and the Ledger already shows it. What a
 * returning player did not have was a way in: the fade was buried in the
 * Ledger and the yard's pick screen. These checks seed a knight who has been
 * away — some topics long untouched, one fresh, one barely known — and assert
 * that the map names exactly the topics that have slipped, that the yard reads
 * what you know now, and that a review round shrinks to nothing and says so.
 */
'use strict';

const DAY = 864e5;

/* A knight back after time away. Stored mastery is what they knew the day they
   left; `ago` is how many days since they last saw the topic. */
const SEED = {
  dot:   { m: 0.95, seen: 10, ago: 20 },   // slipped most
  det2:  { m: 0.90, seen: 10, ago: 12 },
  cross: { m: 0.90, seen: 10, ago: 8 },    // slipped least of the three
  mag:   { m: 0.85, seen: 10, ago: 0 },    // seen today: nothing has faded
  proj:  { m: 0.90, seen: 10, ago: 2 },    // slipped a little, not yet past its review point
  orth:  { m: 0.05, seen: 3,  ago: 30 }    // barely known, so nothing to lose
};
const FADING = ['dot', 'det2', 'cross'];

/* Answer whatever the yard is asking — rightly or not — and report what it said. */
function answer(t, right) {
  return t.ev(right => {
    const btns = [...document.querySelectorAll('#tChoices .choice')];
    const pick = right ? btns.find(b => b.dataset.correct === '1') : btns.find(b => b.dataset.correct !== '1');
    if (!pick) return { none: true, n: btns.length };
    const key = Train.cur.key;
    pick.click();
    const e = document.getElementById('tExplain');
    const back = e.querySelector('.miss.back'), go = e.querySelector('.btn.gold');
    return { key, back: back ? back.innerText : null, go: go ? go.innerText : null,
             pool: Train.pool.slice(), fading: Mastery.fading() };
  }, !!right);
}

module.exports = {
  name: 'review',
  title: 'Review · what has faded is named on the map, and brought back',
  async run(t) {
    await t.newKnight('Cato');
    await t.ev(([seed, DAY]) => {
      Prefs.d.lessons = false;
      for (const [k, v] of Object.entries(seed)) {
        const r = Mastery.rec(k);
        Object.assign(r, { m: v.m, seen: v.seen, c: Math.round(v.seen * v.m), w: v.seen - Math.round(v.seen * v.m),
                           last: Game.s.qCount, t: Date.now() - v.ago * DAY });
      }
      Game.save();
    }, [SEED, DAY]);

    // --- the queue: slipped, and past its review point ---
    t.eq('the topics that have slipped are fading, most slipped first',
      await t.ev(() => Mastery.fading()), FADING);
    // It is read off fields the save already had, so a reload finds the same.
    await t.reload();
    t.eq('and it is the same after a reload, because nothing new is stored',
      await t.ev(() => Mastery.fading()), FADING);
    // Every question below in the four-answer form, whatever rung it would be taught at.
    await t.ev(() => { Prefs.d.lessons = false; });

    // --- the map names them, with what each fell from ---
    const map = await t.ev(() => {
      UI.go('s-map');
      const n = document.getElementById('fadingNode');
      return n ? n.innerText : null;
    });
    t.ok('the map shows what is fading', map && /Fading/.test(map) && /3 topics/.test(map), map);
    t.ok('naming each topic and what it fell from',
      map && map.includes('Dot Product') && map.includes('↓ from 95%') && map.includes('2×2 Determinant'), map);
    t.ok('and leaving out what has not slipped',
      map && !map.includes('Vector Length') && !map.includes('Projection') && !map.includes('Orthogonality'), map);

    // --- the Ledger marks the same topics ---
    // Only "Needs you most" is open; the strands below it are folded away.
    const ledger = await t.ev(() => {
      UI.go('s-gear');
      const txt = document.getElementById('gearList').innerText;
      return { marks: (txt.match(/↓ from/g) || []).length, dot: txt.includes('↓ from 95%') };
    });
    // The three fading, and Projection, which has slipped but is not due yet.
    t.eq('the Ledger marks every topic that has slipped', ledger.marks, FADING.length + 1);
    t.ok('and puts the most slipped among what needs you most', ledger.dot, JSON.stringify(ledger));

    // --- the yard reads what you know now ---
    const yard = await t.ev(() => {
      UI.go('s-train');
      const pick = document.getElementById('trainPick');
      const btn = [...pick.querySelectorAll('button')].find(b => /what's fading/.test(b.innerText));
      const dot = pick.querySelector(`.strandBody button[onclick="Train.startPool('dot')"] .mtag`);
      return { btn: btn ? btn.innerText : null, dotTag: dot ? dot.textContent : null,
               weakest: Mastery.weakest(2) };
    });
    t.ok('the yard offers to bring back what is fading', yard.btn && yard.btn.includes('Dot Product'), JSON.stringify(yard));
    t.ok('a topic that has slipped is labelled by what you know now', yard.dotTag && yard.dotTag !== 'solid', JSON.stringify(yard));
    t.eq('and the weakest are the weakest now, not the day you left', yard.weakest, ['orth', 'dot']);

    // --- one tap from the map goes straight in ---
    const into = await t.ev(() => {
      UI.go('s-map');
      document.getElementById('fadingNode').click();
      return { screen: document.querySelector('.screen.on').id, run: document.getElementById('trainRun').style.display !== 'none',
               topic: document.getElementById('tTopic').innerText, pool: Train.pool.slice() };
    });
    t.ok('tapping it starts the review in the yard', into.screen === 's-train' && into.run, JSON.stringify(into));
    t.ok('asking only the fading topics',
      into.pool.slice().sort().join() === FADING.slice().sort().join() && /^Fading/.test(into.topic), JSON.stringify(into));

    // --- a wrong answer keeps a topic in ---
    let r = await answer(t, false);
    t.ok('a wrong answer says nothing about bringing it back', !r.none && r.back === null, JSON.stringify(r));
    t.eq('and leaves it in the round', r.pool.length, 3);
    await t.ev(() => Train.next());

    // --- each right answer brings one back, and the list gets shorter ---
    r = await answer(t, true);
    t.ok('a right answer brings that topic back', r.back && /is back/.test(r.back) && /2 more/.test(r.back), JSON.stringify(r));
    t.ok('and it leaves the round', !r.pool.includes(r.key) && r.pool.length === 2, JSON.stringify(r));
    t.ok('and is no longer fading anywhere', !r.fading.includes(r.key), JSON.stringify(r));
    const got = [r.key];
    for (let i = 0; i < 12 && r.pool.length; i++) {
      await t.ev(() => Train.next());
      r = await answer(t, true);
      if (r.back) got.push(r.key);
    }
    t.eq('every fading topic is brought back once', got.slice().sort(), FADING.slice().sort());
    t.ok('the last one says nothing is fading now', r.back && /nothing is fading now/.test(r.back), JSON.stringify(r));
    t.ok('and the round ends instead of asking more', r.go && /Back to the yard/.test(r.go), JSON.stringify(r));

    // --- and the map no longer mentions it ---
    const after = await t.ev(() => {
      document.querySelector('#tExplain .btn.gold').click();
      const pick = document.getElementById('trainPick').style.display !== 'none';
      UI.go('s-map');
      return { pick, node: !!document.getElementById('fadingNode') };
    });
    t.ok('the yard is back at its pick screen', after.pick, JSON.stringify(after));
    t.ok('and the map has nothing fading to show', !after.node, JSON.stringify(after));

    await t.ev(() => UI.go('s-title'));
  }
};
