/* A fight that shows up a weakness points to the workshop that fits it.
 *
 * These checks end a fight with topics that fell and see the summary offer
 * the matching workshop by name, the biggest fall first, one button per
 * workshop and two at most; a topic no workshop fits, or one that rose, is
 * offered nothing, and a fight with no fall shows no such buttons. A tap opens
 * the workshop, and its back button returns to the summary as it was. It fits
 * a phone and adds nothing to the save.
 */
'use strict';

const summary = (t, learned) => t.ev(l => {
  Battle.learned = l; Battle.mode = 'map';
  UI.go('s-result');
  document.getElementById('resultBody').innerHTML = `<div class="panel center">${Battle.learnedHtml()}</div>`;
  const b = [...document.querySelectorAll('#handsOn button')];
  return { ws: b.map(x => x.dataset.ws), topics: b.map(x => x.dataset.topic), text: b.map(x => x.innerText),
    head: (document.querySelector('#handsOn') || {}).innerText || '' };
}, learned);

module.exports = {
  name: 'handson',
  title: 'Fight summary · the workshop that fits a fall',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Isolde');
    const before = await t.ev(() => JSON.stringify(Game.s));

    // --- falls on two topics with workshops, one without, and a rise ---
    let s = await summary(t, {
      lhopital: { from: 0.6, to: 0.3 }, chainRule: { from: 0.5, to: 0.4 },
      limInf: { from: 0.7, to: 0.2 }, vecAdd: { from: 0.1, to: 0.4 }
    });
    t.ok('the summary offers a workshop for what fell', /See it work by hand/.test(s.head), s.head);
    t.eq('the biggest fall with a workshop comes first', s.topics, ['lhopital', 'chainRule']);
    t.eq('each button opens the workshop that fits', s.ws, ['Hopital', 'Chain']);
    t.eq('and names it as the Tome does, with the topic', s.text,
      ["🔬 L'Hôpital Workshop, for L'Hôpital's Rule", '⛓️ Chain Rule Workshop, for Chain Rule']);

    // --- one workshop per button, two at most ---
    s = await summary(t, {
      evalDeriv: { from: 0.6, to: 0.2 }, powerRule: { from: 0.6, to: 0.3 },
      dot: { from: 0.5, to: 0.35 }, solve2: { from: 0.5, to: 0.4 }
    });
    t.eq('two topics the same workshop fits share one button', s.ws, ['Slope', 'Dot']);
    t.eq('and no more than two are offered', s.ws.length, 2);

    // --- nothing fell, or nothing that fell has a workshop ---
    s = await summary(t, { lhopital: { from: 0.2, to: 0.5 } });
    t.eq('a topic that rose is offered nothing', s.ws, []);
    s = await summary(t, { limInf: { from: 0.6, to: 0.3 } });
    t.eq('nor is a fall no workshop fits', s.ws, []);
    t.eq('so the heading is not shown either', s.head, '');

    // --- a tap opens it, and back returns to the summary ---
    s = await summary(t, { lhopital: { from: 0.6, to: 0.3 } });
    await t.ev(() => document.querySelector('#handsOn button').click());
    t.eq('a tap opens the workshop', await t.screen(), 's-hopital');
    t.ok('and it is drawn', await t.ev(() => /L'Hôpital's rule/.test(document.getElementById('hpRead').innerText)));
    await t.ev(() => UI.back());
    t.eq('its back button returns to the summary', await t.screen(), 's-result');
    t.ok('as it was', await t.ev(() => !!document.querySelector('#handsOn button[data-ws="Hopital"]')));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.ev(() => { Battle.learned = {}; });
    t.ok('the offer changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => UI.go('s-title'));
  }
};
