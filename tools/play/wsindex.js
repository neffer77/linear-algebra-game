/* The workshop index at the top of the Tome.
 *
 * These checks open the Tome and read the index: it sits right under the
 * opening's card, lists all forty-eight workshops once each under the seven
 * strands, and a chip opens the same screen as the workshop's own card further
 * down. A new knight's chips are all plain; with both of the bend workshop's
 * topics solid its chip turns green with a ✓, with one of them needing work it
 * is ringed in gold, and a screen reader hears both. Every chip is named, the
 * rows wrap on a phone, and opening the index changes nothing in the save.
 */
'use strict';

const chips = t => t.ev(() => [...document.querySelectorAll('#wsIndex .wiChip')].map(b => b.dataset.ws));
const chip = (t, ws) => t.ev(ws => {
  const b = document.querySelector(`#wsIndex .wiChip[data-ws="${ws}"]`);
  return b ? { text: b.innerText.trim(), state: b.dataset.state, cls: b.className, label: b.getAttribute('aria-label') } : null;
}, ws);
const setTopics = (t, m) => t.ev(m => {
  for (const k in m) Game.s.topicStats[k] = Object.assign({}, Game.s.topicStats[k] || {}, { seen: 5, m: m[k], t: Date.now() });
  UI.go('s-tome');
}, m);

module.exports = {
  name: 'wsindex',
  title: 'Workshop index · every workshop one tap from the top of the Tome',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Odile');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.eq('the index is the Tome\'s second card, under the opening', await t.ev(() =>
      [...document.getElementById('tomeList').children].findIndex(c => c.id === 'wsIndex')), 1);
    t.ok('it is on screen when the Tome opens', await t.ev(() => {
      const r = document.getElementById('wsIndex').getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    }));
    const ws = await chips(t);
    t.eq('it lists forty-eight workshops', ws.length, 48);
    t.eq('each one once', new Set(ws).size, 48);
    t.eq('and says how many', await t.ev(() => /^48 hands-on workshops\./.test(document.querySelector('#wsIndex .sub').innerText)), true);
    t.eq('under the seven strands, in order', await t.ev(() => [...document.querySelectorAll('#wsIndex .wiStrand')].map(d => d.textContent).join(' | ')),
      'Vectors | Matrices | Eigen & Subspaces | Limits & Derivatives | Integrals | Applications | Multivariable & Series');
    t.eq('every workshop with a card below has a chip', await t.ev(ws => {
      const cards = [...document.querySelectorAll('#tomeList .panel:not(#wsIndex) button[onclick$=".open()"]')]
        .map(b => b.getAttribute('onclick').replace('.open()', '')).filter(m => m !== 'Opening');
      return cards.filter(m => Object.values(WORKSHOP_FOR).some(w => w.mod === m) && !ws.includes(m));
    }, ws), []);
    t.eq('the vectors row runs in the strand\'s order', await t.ev(() =>
      [...document.querySelectorAll('#wsIndex .wiRow')[0].querySelectorAll('.wiChip')].map(b => b.innerText.trim()).join(' ')),
      '➡️ Arrow 🧭 Span 🎯 Dot Product ✖️ Cross Product');

    // A new knight: every chip plain.
    t.eq('a new knight\'s chips are all plain', await t.ev(() =>
      [...document.querySelectorAll('#wsIndex .wiChip')].filter(b => b.dataset.state).length), 0);
    let c = await chip(t, 'Bend');
    t.eq('the bend workshop\'s chip', c && c.text, '〰️ Bend');
    t.eq('is named for a screen reader', c && c.label, 'Open Bend Workshop');

    // A chip opens what the card opens.
    await t.tap('tomeBend');
    const viaCard = await t.screen();
    await t.ev(() => UI.go('s-tome'));
    await t.ev(() => document.querySelector('#wsIndex .wiChip[data-ws="Bend"]').click());
    t.eq('tapping it opens the bend workshop, as its card does', await t.screen(), viaCard);
    t.ok('which is not the Tome', viaCard !== 's-tome', viaCard);
    await t.ev(() => UI.go('s-tome'));

    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    t.ok('chips sit side by side, not one to a line', await t.ev(() => {
      const [a, b] = document.querySelectorAll('#wsIndex .wiChip');
      return a.offsetTop === b.offsetTop && a.offsetWidth < innerWidth / 2;
    }));
    t.eq('the rows wrap', await t.ev(() => getComputedStyle(document.querySelector('#wsIndex .wiRow')).flexWrap), 'wrap');
    t.eq('every chip has a name', await t.ev(() =>
      [...document.querySelectorAll('#wsIndex .wiChip')].filter(b => !(b.getAttribute('aria-label') || '').startsWith('Open ')).length), 0);
    t.ok('the index changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));

    // Mastery colours the chip.
    await setTopics(t, { secondDeriv: 0.95 });
    c = await chip(t, 'Bend');
    t.eq('one topic solid of two leaves it plain', c && c.state, '');
    await setTopics(t, { inflection: 0.95 });
    c = await chip(t, 'Bend');
    t.eq('both solid turns it green', c && c.state, 'solid');
    t.ok('with a ✓', c && / ✓$/.test(c.text), c && c.text);
    t.eq('and says so to a screen reader', c && c.label, 'Open Bend Workshop, every topic it covers solid');
    t.eq('drawn with the green ring', await t.ev(() =>
      getComputedStyle(document.querySelector('#wsIndex .wiChip[data-ws="Bend"]')).borderTopColor), 'rgb(87, 204, 122)');
    await setTopics(t, { inflection: 0.3 });
    c = await chip(t, 'Bend');
    t.eq('one that needs work rings it in gold', c && c.state, 'weak');
    t.ok('with no ✓', c && !/✓/.test(c.text), c && c.text);
    t.eq('and says a topic needs work', c && c.label, 'Open Bend Workshop, a topic it covers needs work');
    t.eq('the other chips stay plain', await t.ev(() =>
      [...document.querySelectorAll('#wsIndex .wiChip')].filter(b => b.dataset.state && b.dataset.ws !== 'Bend').length), 0);
  }
};
