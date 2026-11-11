/* The same slip twice is named as a pattern; walking past it is named too.
 *
 * A wrong answer already gets its own diagnosis ("You chose 5: the two
 * products were subtracted…"). What one diagnosis cannot say is that this is
 * the second time. These checks drive the training yard and a fight the way a
 * player would, choosing the same misconception again and again, and assert
 * when the game says so, when it stays quiet, and that none of it is saved.
 */
'use strict';

const { sleep } = require('./harness');

const SUBTRACTED = 'the two products were subtracted';   // one of the dot product's traps
const CROSSED = 'the components got crossed';             // another

/* In the yard, with step-by-step lessons off so every question offers four
   answers: draw dot-product questions until one offers the trap named, then
   answer it — with the trap, or correctly — and report what was said. */
async function yard(t, trap, right) {
  return t.ev(([trap, right]) => {
    for (let i = 0; i < 60; i++) {
      Train.next();
      const btns = [...document.querySelectorAll('#tChoices .choice')];
      const hit = btns.find(b => (Train.cur.why[b.innerHTML] || '').startsWith(trap));
      if (!hit) continue;
      (right ? btns.find(b => b.dataset.correct === '1') : hit).click();
      const e = document.getElementById('tExplain');
      const slip = e.querySelector('.miss.slip'), dodge = e.querySelector('.miss.dodge');
      return { slip: slip ? slip.innerText : null, dodge: dodge ? dodge.innerText : null,
               reason: !right && e.innerText.includes(trap) };
    }
    return { none: true };
  }, [trap, !!right]);
}

module.exports = {
  name: 'slips',
  title: 'Slips · the same mistake twice is named, and so is walking past it',
  async run(t) {
    await t.newKnight('Ada');
    await t.ev(() => { Prefs.d.lessons = false; UI.go('s-train'); Train.startPool('dot'); });

    // --- once is just a mistake ---
    let r = await yard(t, SUBTRACTED);
    t.ok('the first slip is explained as usual', r.reason, JSON.stringify(r));
    t.ok('and is not called a pattern', r.slip === null, JSON.stringify(r));

    // --- twice is a pattern, named for the topic ---
    r = await yard(t, SUBTRACTED);
    t.ok('the same slip again is named as the same slip',
      r.slip && /same slip as last time/i.test(r.slip), JSON.stringify(r));
    t.ok('in the topic it happened in', r.slip && r.slip.includes('Dot Product'), JSON.stringify(r));

    r = await yard(t, SUBTRACTED);
    t.ok('a third time says how many', r.slip && /3 times now/.test(r.slip), JSON.stringify(r));

    // --- a different slip in the same topic is its own count ---
    r = await yard(t, CROSSED);
    t.ok('a different misconception is not called a repeat', r.reason && r.slip === null, JSON.stringify(r));

    // --- answering right with the old trap on offer is worth saying ---
    r = await yard(t, SUBTRACTED, true);
    t.ok('walking past a trap that caught you before is named',
      r.dodge && /not caught this time/i.test(r.dodge), JSON.stringify(r));
    t.ok('with no slip note beside it', r.slip === null, JSON.stringify(r));
    r = await yard(t, SUBTRACTED, true);
    t.ok('but only the first time it is walked past', r.dodge === null, JSON.stringify(r));
    r = await yard(t, SUBTRACTED);
    t.ok('and a slip after that starts counting again', r.reason && r.slip === null, JSON.stringify(r));

    // --- a slip is the misconception, not the numbers it came with ---
    const sig = await t.ev(() => ({
      same: Slips.sig('divided by ‖v‖² = 25 instead of ‖v‖ = 5')
         === Slips.sig('divided by ‖v‖² = 169 instead of ‖v‖ = 13'),
      neg: Slips.sig('put x = −3, which leaves −3 − (−1) underneath')
         === Slips.sig('put x = 4, which leaves 4 − 2 underneath'),
      differ: Slips.sig('the fraction is upside down') !== Slips.sig('the sign is backwards')
    }));
    t.ok('the same misconception with other numbers is the same slip', sig.same && sig.neg, JSON.stringify(sig));
    t.ok('and different misconceptions stay different', sig.differ);

    // --- topics and knights each keep their own ---
    const apart = await t.ev(() => {
      const r = 'the two products were subtracted — the dot product adds them';
      const other = Slips.slip('det2', r);
      return { other };
    });
    t.eq('the same words in another topic start at one', apart.other, 1);

    // --- in a fight, the note sits with the diagnosis ---
    const fight = await t.ev(trap => {
      Battle.beginDaily();
      const said = [];
      for (let n = 0, g = 0; n < 2 && g < 200; g++) {
        const q = buildQuestion('vecAdd', 1);
        const pick = q.choices.find(c => (q.why[c] || '').startsWith(trap));
        if (!pick) continue;
        Battle.cur = q; Battle.shownWork = false; Battle.lastSlam = 0;
        Battle.showExplain(false, pick, q);
        const e = document.getElementById('explain'), note = e.querySelector('.miss.slip');
        said.push({ reason: e.innerText.includes(trap), slip: note ? note.innerText : null });
        n++;
      }
      Battle.flee();
      return said;
    }, 'that subtracts v instead of adding it');
    t.ok('a first slip in a fight carries no note', fight[0] && fight[0].reason && fight[0].slip === null, JSON.stringify(fight));
    t.ok('the same slip again in a fight is named beside the diagnosis',
      fight[1] && fight[1].slip && /same slip as last time/i.test(fight[1].slip), JSON.stringify(fight));

    // --- another knight starts clean ---
    await t.ev(() => { Game.save(); Profiles.create('Brin'); Game.load(); Prefs.d.lessons = false; UI.go('s-train'); Train.startPool('dot'); });
    await sleep(100);
    r = await yard(t, SUBTRACTED);
    t.ok("one knight's slips never count as another's", r.reason && r.slip === null, JSON.stringify(r));
    r = await yard(t, SUBTRACTED);
    t.ok('a second knight is told on their own second slip', r.slip && /same slip/i.test(r.slip), JSON.stringify(r));
    t.eq('each knight keeps a separate book', await t.ev(() => Object.keys(Slips.log).length), 2);

    // --- nothing is saved: a new sitting starts clean ---
    const stored = await t.ev(() => {
      Game.save();
      let all = '';
      for (let i = 0; i < localStorage.length; i++) all += localStorage.getItem(localStorage.key(i));
      return all;
    });
    t.ok('no slip is written into the save', !stored.includes('products were subtracted') && !stored.includes('subtracts v instead'));
    await t.reload();
    await t.ev(() => { Prefs.d.lessons = false; UI.go('s-train'); Train.startPool('dot'); });
    r = await yard(t, SUBTRACTED);
    t.ok('after a reload the next slip is a first slip again', r.reason && r.slip === null, JSON.stringify(r));

    await t.ev(() => UI.go('s-title'));
  }
};
