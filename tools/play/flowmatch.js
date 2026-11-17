/* Match the flow, the diagonal workshop's third mode.
 *
 * These checks open the workshop from the Tome, switch to the mode, and play
 * it through its buttons: the arrows of x′ = Ax and four matrices are shown
 * and the rule for reading them from the eigenvalues is stated first; a wrong
 * pick is shut and caught at the first arrow it turns, with its own arrow
 * drawn in blue; the right pick names its eigenvalues and offers the next
 * flow; first tries are counted and the goals found with toasts and a banner.
 * Every button is named, the hands-on workshop steps aside and comes back, it
 * fits a phone, and nothing is saved.
 */
'use strict';

const read = t => t.ev(() => document.getElementById('fwmRead').innerText.replace(/\s+/g, ' ').trim());
const found = t => t.ev(() => [...document.querySelectorAll('#fwmGoals .wsGoal.done')].map(g => g.dataset.goal).sort());
const opt = (t, L) => t.ev(L => document.querySelector(`#fwmPick button[data-opt="${L}"]`).click(), L);
const next = t => t.ev(() => document.getElementById('fwmNext').click());
const toast = t => t.ev(() => [...document.querySelectorAll('.toast')].map(d => d.innerText).join(' | '));
const pressed = t => t.ev(() => [...document.querySelectorAll('#dgTab button')].map(b => b.getAttribute('aria-pressed')).join());
const hidden = (t, id) => t.ev(id => { const e = document.getElementById(id); return !e || e.offsetParent === null; }, id);
const AWAY = ['dgSets', 'dgFig', 'dgCols', 'dgRead', 'dgGoalPanel'];
// the answer to each flow, in the order they come round
const ANS = ['A', 'C', 'B', 'C', 'D', 'A', 'B', 'D'];

module.exports = {
  name: 'flowmatch',
  title: 'Match the flow · pick which matrix drew the arrows of x′ = Ax',
  viewport: { width: 390, height: 844 },
  async run(t) {
    await t.newKnight('Laudine');
    const before = await t.ev(() => JSON.stringify(Game.s));

    await t.ev(() => UI.go('s-tome'));
    t.ok('the Tome says a flow can be matched', await t.ev(() =>
      /or which of four matrices drew the arrows of x′ = Ax\./.test(document.getElementById('s-tome').innerText)));
    await t.tap('tomeDiag');
    t.eq('the diagonal workshop opens', await t.screen(), 's-diag');
    t.eq('building P by hand is the pressed mode', await pressed(t), 'true,false,false');
    await t.tapText(/Match the flow/);
    t.eq('match the flow is now the pressed mode', await pressed(t), 'false,false,true');
    let away = true; for (const id of AWAY) away = away && await hidden(t, id);
    t.ok('the matrices, drawing, columns of P, readout and goals step aside', away);

    // --- the first flow: a sink ---
    t.ok('the question is asked', (await t.ev(() => document.getElementById('pwBox').innerText)).startsWith('Flow 1 of 8. Which A drew these arrows of x′ = Ax?'));
    t.eq('80 arrows are drawn', await t.ev(() => document.querySelectorAll('#fwmFig line[data-k="arr"]').length), 80);
    t.eq('the arrow at (1, 0) points along A times (1, 0)', await t.ev(() => {
      const l = document.querySelector('#fwmFig line[data-k="arr"][data-x="1"][data-y="0"]');
      return Math.sign(l.getAttribute('x2') - l.getAttribute('x1')) + ',' + Math.sign(l.getAttribute('y2') - l.getAttribute('y1'));
    }), '-1,0');
    const labels = await t.ev(() => [...document.querySelectorAll('#fwmPick button')].map(b => b.getAttribute('aria-label')));
    t.eq('four matrices are offered', labels.join(' | '), 'A: A = [−1, 0; 0, −2] | B: A = [−2, 1; 1, −2] | C: A = [1, 0; 0, −1] | D: A = [0, −1; 1, 0]');
    let r = await read(t);
    t.ok('the rule comes before any pick', r.startsWith('Each arrow shows which way x′ = Ax pushes at its point. The eigenvalues of A decide the picture'), r);
    t.eq('nothing is found before anything is pressed', await found(t), []);

    // --- a wrong pick: another sink, caught at the first arrow it turns ---
    await opt(t, 'B');
    r = await read(t);
    t.ok('the wrong pick is caught at one arrow', r.startsWith('B, A = [−2, 1; 1, −2], is not it: at (1, 0) it pushes along (−2, 1), but the arrow drawn there points along (−1, 0). Its own arrow is drawn in blue.'), r);
    t.ok('its own arrow and a ring are drawn there', await t.ev(() => !!document.querySelector('#fwmFig line[data-k="wrong"][data-x="1"][data-y="0"]') && !!document.querySelector('#fwmFig circle[data-k="ring"]')));
    t.ok('and that choice is shut', await t.ev(() => { const b = document.querySelector('#fwmPick button[data-opt="B"]'); return b.disabled && b.getAttribute('aria-label') === 'B: A = [−2, 1; 1, −2]. Not this flow'; }));
    t.ok('no next flow yet', await t.ev(() => !document.getElementById('fwmNext')));
    t.eq('the catch is found', await found(t), ['catch']);
    t.ok('with a toast', /✓ Caught a wrong matrix at one arrow/.test(await toast(t)), await toast(t));

    // --- the right pick ---
    await opt(t, 'A');
    r = await read(t);
    t.ok('the match is explained by its eigenvalues', r.startsWith('Yes, this flow is A = [−1, 0; 0, −2]. Its eigenvalues are −1 and −2: both below 0, so every path flows in to (0, 0): a sink. At (1, 2) it pushes along (−1, −4), the way the arrow there points.'), r);
    t.ok('a match after a miss is not a first try', /0 matched on the first try this visit\.$/.test(r), r);
    t.ok('the wrong arrow is gone', await t.ev(() => !document.querySelector('#fwmFig [data-k="wrong"], #fwmFig [data-k="ring"]')));
    t.ok('every choice is now shut', await t.ev(() => [...document.querySelectorAll('#fwmPick button')].every(b => b.disabled)));
    t.eq('a sink is found', await found(t), ['catch', 'settle']);

    // --- three first tries in a row: a saddle, a spiral and a source ---
    const banners = [];
    for (let i = 1; i <= 3; i++) {
      await next(t);
      t.ok(`flow ${i + 1} is dealt`, (await t.ev(() => document.getElementById('pwBox').innerText)).startsWith(`Flow ${i + 1} of 8.`));
      const b = await t.ev(L => {
        const seen = [], real = Celebrate.banner;
        Celebrate.banner = (title, sub) => { seen.push(title + ' / ' + sub); };
        try { document.querySelector(`#fwmPick button[data-opt="${L}"]`).click(); } finally { Celebrate.banner = real; }
        return seen;
      }, ANS[i]);
      banners.push(...b);
    }
    r = await read(t);
    t.ok('the run is counted', /3 matched on the first try this visit, 3 in a row\.$/.test(r), r);
    t.eq('every goal can be found with the buttons', await found(t), ['catch', 'one', 'saddle', 'settle', 'three', 'turn']);
    t.eq('the last one found brings a banner', banners.join(), 'FLOW READER / every arrow read');
    t.ok('the count says so', /6 of 6 found/.test(await t.ev(() => document.getElementById('fwmGoals').innerText)));

    // --- named, fits, comes back ---
    const unnamed = await t.ev(() => [...document.querySelectorAll('#dgTab button, #fwmPick button, #fwmNext')]
      .filter(b => !(b.getAttribute('aria-label') || '').trim()).length);
    t.eq('each button says what it does', unnamed, 0);
    t.eq('the drawing is named for a screen reader', await t.ev(() => document.querySelector('#fwmFig svg').getAttribute('aria-label')),
      'The arrows of x′ = Ax for x and y from −2 to 2, flow 4 of 8, drawn by A = [1, 0; 0, 2]');
    const fit = await t.ev(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    t.ok('nothing runs off the side of a phone', fit.w <= fit.vw, JSON.stringify(fit));
    await t.tapText(/Build P by hand/);
    let back = true; for (const id of AWAY) back = back && !(await hidden(t, id));
    t.ok('the hand workshop comes back', back);
    t.ok('and the flow is put away', await t.ev(() => !document.getElementById('fwmPick')));
    t.ok('matching flows changes nothing in the save', await t.ev(b => JSON.stringify(Game.s) === b, before));
    await t.ev(() => { Diag.tab = 'hand'; UI.go('s-title'); });
  }
};
