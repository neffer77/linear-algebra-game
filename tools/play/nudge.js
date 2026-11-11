/* A nudge before the whole working.
 *
 * Being shown the working (S13) ends the turn: the problem is worked in front
 * of you and the strike is spent. Most players who are stuck need far less —
 * the way in, not the way through. A nudge is the first step of the working on
 * its own, cut short wherever it would go on to give the answer away.
 *
 * So most of these checks are about that cut. Across every topic at every
 * difficulty, the nudge must never contain the answer; where the first step
 * runs on to the answer, the sum is set up and left open; where nothing
 * survives the cut, the topic's rule stands in; and where even the rule would
 * leak, no nudge is offered at all. The rest is the price: a right answer
 * after a nudge lands for half the damage and moves mastery by half, and
 * nothing about it is saved.
 */
'use strict';

const { sleep } = require('./harness');

/* Stand a fight up on one known question, the way the shell would ask it. */
function pose(t, key, seed) {
  return t.ev(([key, seed]) => {
    R.seed(seed); Battle.cur = buildQuestion(key, 2); R.unseed();
    Battle.rite = null; Battle.lesson = null; Battle.nudged = null;
    Battle.answered = false; Battle.shownWork = false; Battle.slamNext = false;
    Battle.ehp = 99999;                        // no question here may end the fight
    Battle.renderStep();
    const n = document.getElementById('wnudge');
    return { offered: !!n, label: n ? n.innerText : null, cur: Battle.cur.a };
  }, [key, seed]);
}

module.exports = {
  name: 'nudge',
  title: 'Nudge · the first step of the working, stopped short of the answer',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Noor');

    // --- across the whole game, a nudge never gives the answer away ---
    const cover = await t.ev(() => {
      const out = { n: 0, none: [], leaks: [], whole: [], from: { ladder: 0, explanation: 0, rule: 0 } };
      const flat = s => Working.plain(s).replace(/\s+/g, '');
      // How often the answer appears as a number of its own, not inside a
      // longer one (x−4 holds no −4, and −4 is not 4). Seen in the question, it may be
      // seen again in the nudge as often, and no more.
      const count = (txt, a) => (txt.match(new RegExp('(?<![0-9A-Za-z.−])'
        + a.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '(?![0-9A-Za-z¹²³⁰-⁹])', 'g')) || []).length;
      for (const key of Object.keys(GEN)) {
        for (const d of [1, 2, 3]) for (const seed of [7, 1234, 9001]) {
          R.seed(seed + d); const q = buildQuestion(key, d); R.unseed();
          out.n++;
          const nu = Working.nudge(q);
          if (!nu) { out.none.push(key + ' d' + d); continue; }
          out.from[nu.from]++;
          const a = flat(q.a), txt = flat(nu.text);
          if (a && count(txt, a) > count(flat(q.q), a)) out.leaks.push(key + ' d' + d + ': ' + nu.text);
          // and it is a first step, not the working with its last line
          const w = Working.forStep(q), last = w.steps[w.steps.length - 1];
          if (w.steps.length > 1 && flat(last.why || last.ask) === txt) out.whole.push(key + ' d' + d);
        }
      }
      return out;
    });
    t.ok('every question in the game gets a nudge', cover.none.length === 0 && cover.n >= 600,
      `${cover.n} questions; none for ${cover.none.join(', ')}`);
    t.eq('and no nudge contains the answer', cover.leaks, []);
    t.eq('none of them is the working entire', cover.whole, []);
    t.ok('most are the first step of this very question',
      cover.from.explanation + cover.from.ladder > cover.from.rule * 4, JSON.stringify(cover.from));
    t.ok('a ladder nudges with its first rung', cover.from.ladder > 0, JSON.stringify(cover.from));

    // --- where the first step runs on to the answer, the sum is left open ---
    const cut = await t.ev(() => {
      const find = (key, test) => {
        for (let s = 1; s < 400; s++) {
          R.seed(s); const q = buildQuestion(key, 2); R.unseed();
          const first = Working.sentences(q.ex)[0] || '';
          if (test(first, q)) return { q, first, nudge: Working.nudge(q) };
        }
        return null;
      };
      const plainA = q => Working.plain(q.a);
      const mag = find('mag', (f, q) => f.includes('√(') && f.trim().endsWith(plainA(q) + '.'));
      const dot = find('dot', (f, q) => f.includes(plainA(q)));
      const pow = find('powerRule', f => f.includes('→'));
      R.seed(4242); const uSub = buildQuestion('uSub', 2); R.unseed();
      return {
        mag: mag && mag.nudge.text, magA: mag && plainA(mag.q),
        dot: dot && dot.nudge.text, dotA: dot && plainA(dot.q),
        pow: pow && pow.nudge.text, powA: pow && plainA(pow.q),
        lad: Working.nudge(uSub), rung: Working.plain(uSub.motes[0].q), got: Working.plain(uSub.motes[0].a)
      };
    });
    t.ok('a length is set up under the root and left there',
      cut.mag && /^Length is Pythagoras: √\(.*\) = …$/.test(cut.mag) && !cut.mag.includes(cut.magA), JSON.stringify(cut));
    t.ok('a dot product shows the products to add, not their sum',
      cut.dot && /\)\(.*\) = …$/.test(cut.dot) && !cut.dot.includes(' ' + cut.dotA), JSON.stringify(cut));
    t.ok('a derivative shows the first term to bring down, not where it lands',
      cut.pow && /→ …$/.test(cut.pow) && !cut.pow.includes(cut.powA), JSON.stringify(cut));
    t.ok("a ladder's nudge asks its first rung, without the rung's answer",
      cut.lad && cut.lad.from === 'ladder' && cut.lad.text === cut.rung && !cut.lad.text.includes(cut.got), JSON.stringify(cut));

    // --- when nothing survives the cut, the rule stands in; when that leaks, nothing ---
    const edge = await t.ev(() => ({
      rule: Working.nudge({ q: 'What is 2 + 3?', a: '5', ex: '2 + 3 = 5.', codex: { rule: 'Add the two numbers together.' } }),
      none: Working.nudge({ q: 'What is it?', a: '42', ex: 'It is 42.', codex: { rule: 'The answer is always 42.' } }),
      minus: Working.at('4 + (−2) = …', '2'),
      plain: Working.at('the sum is 2.', '2'),
      inQ: Working.leaks({ q: 'Find ⟨12, 4⟩ + ⟨0, 7⟩', a: '⟨12, 11⟩' }).map(x => x.tok),
      result: Working.firstLeak('(−5)(4) + (−2)(1) = −2', Working.leaks({ q: 'Find ⟨−5, −2⟩ · ⟨4, 1⟩', a: '−2' })),
      spaced: Working.at('you get 4 x − 4 = A', '4 x−4')
    }));
    t.ok('a first step that is all answer gives way to the rule',
      edge.rule && edge.rule.from === 'rule' && edge.rule.text === 'Add the two numbers together.', JSON.stringify(edge));
    t.eq('and a rule that would leak means no nudge at all', edge.none, null);
    t.eq('a number after a minus sign is a different number', edge.minus, -1);
    t.ok('while the number itself is found, even before a full stop', edge.plain > 0, JSON.stringify(edge));
    t.ok('a piece of the answer the question already shows is not a leak',
      !edge.inQ.includes('12') && edge.inQ.includes('11'), JSON.stringify(edge.inQ));
    t.eq('the answer that the question shows too gives it away only where a sum lands on it',
      edge.result, '(−5)(4) + (−2)(1) = −2'.lastIndexOf('−2'));
    t.eq('and an answer is found however it is spaced', edge.spaced, 8);

    // --- in a fight: offered, taken, and shown above the choices ---
    await t.ev(() => { Prefs.d.lessons = false; Battle.begin(0, 0); });
    await sleep(300);
    let p = await pose(t, 'mag', 4242);
    t.ok('a fight offers the nudge beside the working', p.offered && /Nudge me/.test(p.label), JSON.stringify(p));
    const keysBefore = await t.ev(() => Object.keys(Game.s).sort().join());
    const saveBefore = await t.ev(() => JSON.stringify(Game.s));
    const took = await t.ev(() => {
      document.getElementById('wnudge').click();
      const box = document.querySelector('#showwork .wnudge');
      return { box: box ? box.innerText : null, want: Working.nudge(Battle.cur).text,
               again: !!document.getElementById('wnudge'), work: !!document.getElementById('wgo'),
               choices: document.querySelectorAll('#choices .choice').length, answered: Battle.answered,
               sw: document.documentElement.scrollWidth, w: window.innerWidth,
               keys: Object.keys(Game.s).sort().join(), save: JSON.stringify(Game.s) };
    });
    t.ok('tapping it shows the first step', took.box && took.box.includes(took.want), JSON.stringify(took));
    t.ok('and is offered only once a question', !took.again, JSON.stringify(took));
    t.ok('the whole working is still there if the nudge is not enough', took.work);
    t.ok('and the question is still open to answer', took.choices === 4 && !took.answered, JSON.stringify(took));
    t.ok('it fits a phone', took.sw <= took.w, JSON.stringify(took));

    // --- the price: half the strike, half the credit ---
    await t.ev(() => {
      window.__seen = [];
      const strike = Combat.strike, record = Game.recordAnswer;
      Combat.strike = function (...a) { window.__seen.push({ bonus: a[5] }); return strike.apply(this, a); };
      Game.recordAnswer = function (...a) { window.__seen.push({ weight: a[2] }); return record.apply(this, a); };
    });
    const nudged = await t.ev(() => {
      Battle.answer(null, Battle.step().a);
      const e = document.getElementById('explain').innerText;
      return { seen: window.__seen.splice(0), note: /Nudged: half the strike/.test(e) && e.includes('Vector Length') };
    });
    // The shell's own next question leaves the nudge behind.
    t.eq('a nudge does not follow into the next question',
      await t.ev(() => { Battle.nextQuestion(); return Battle.nudged; }), null);
    p = await pose(t, 'mag', 4243);
    t.ok('the next question offers it afresh', p.offered, JSON.stringify(p));
    const plain = await t.ev(() => {
      Battle.answer(null, Battle.step().a);
      return { seen: window.__seen.splice(0), note: /Nudged/.test(document.getElementById('explain').innerText) };
    });
    const pick = (s, k) => (s.find(x => k in x) || {})[k];
    t.eq('a nudged strike lands for half', pick(nudged.seen, 'bonus'), 0.5);
    t.eq('an un-nudged one in full', pick(plain.seen, 'bonus'), 1);
    t.ok('and a nudged answer moves mastery by half as much',
      pick(nudged.seen, 'weight') * 2 === pick(plain.seen, 'weight'), JSON.stringify([nudged.seen, plain.seen]));
    t.ok('the panel says what the nudge cost, in the topic', nudged.note);
    t.ok('and says nothing of it when no nudge was taken', !plain.note);

    // --- a wrong answer after a nudge is an ordinary miss ---
    p = await pose(t, 'dot', 31);
    const wrong = await t.ev(() => {
      document.getElementById('wnudge').click();
      const bad = Battle.cur.choices.find(c => c !== Battle.cur.a);
      Battle.answer(null, bad);
      const e = document.getElementById('explain').innerText;
      return { seen: window.__seen.splice(0), said: /The answer was/.test(e), note: /Nudged/.test(e) };
    });
    t.ok('a miss after a nudge is told like any miss', wrong.said && !wrong.note, JSON.stringify(wrong));

    // --- not where it does not belong ---
    const where = await t.ev(() => {
      const out = {};
      R.seed(777); Battle.cur = buildQuestion('uSub', 2); R.unseed();
      Battle.answered = false; Battle.nudged = null; Battle.lesson = null;
      Battle.rite = { motes: Battle.cur.motes, i: 0, clean: 0, trail: [], parent: Battle.cur };
      Battle.renderStep();
      out.ladder = !!document.getElementById('wnudge');
      Battle.rite = null;
      R.seed(5); Battle.cur = buildQuestion('dot', 2); R.unseed();
      for (const f of ['meet', 'tf']) {
        Battle.lesson = { format: f }; Battle.renderWork();
        out[f] = !!document.getElementById('wnudge');
      }
      Battle.lesson = null; Battle.renderWork();
      out.free = !!document.getElementById('wnudge');
      Battle.flee();
      return out;
    });
    t.ok('not on a ladder, which is already in steps', !where.ladder, JSON.stringify(where));
    t.ok('not on a first meeting or a true-or-false rung', !where.meet && !where.tf, JSON.stringify(where));
    t.ok('but on an ordinary question, yes', where.free, JSON.stringify(where));

    await sleep(200);
    const daily = await t.ev(async () => {
      Battle.beginDaily();
      await new Promise(r => setTimeout(r, 300));
      const out = { nudge: !!document.getElementById('wnudge'), can: Battle.canNudge() };
      Battle.flee();
      return out;
    });
    t.ok('and not in the daily, which is the same contest for everyone', !daily.nudge && !daily.can, JSON.stringify(daily));

    // --- nothing new is stored ---
    t.eq('taking a nudge adds nothing to the save', took.keys, keysBefore);
    t.ok('and changes nothing in it', took.save === saveBefore);

    await t.ev(() => { Prefs.d.lessons = true; UI.go('s-title'); });
  }
};
