/* Keyboards and screen readers.
 *
 * Much of the game is tapped on things that are not buttons: map nodes, the
 * doors to the working and the nudge, the settings rows, the walk-away links.
 * These checks walk the screens a player sees and assert that everything with
 * a click handler is a control a keyboard can reach and a screen reader can
 * name; that Enter and Space press it, with real key presses; that a key which
 * presses one control presses nothing else; that the keyboard can be seen
 * where it is; and that what a turn's verdict says is read out when it lands.
 */
'use strict';

const { sleep } = require('./harness');

/* Every visible element on the current screen with a click handler that is
   neither a native control nor marked as a button in the tab order. */
function strays(t) {
  return t.ev(() => {
    const NATIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY|OPTION)$/;
    const out = [], seen = { n: 0 };
    for (const el of document.querySelectorAll('body *')) {
      if (typeof el.onclick !== 'function' || NATIVE.test(el.tagName)) continue;
      if (!el.getClientRects().length) continue;           // not on screen
      seen.n++;
      if (el.getAttribute('role') !== 'button' || el.tabIndex !== 0)
        out.push(el.tagName + '.' + el.className + ' ' + (el.innerText || '').slice(0, 30));
    }
    return { out, n: seen.n };
  });
}

/* Put the keyboard on an element, then press a real key. */
async function press(t, sel, key) {
  await t.ev(sel => document.querySelector(sel).focus(), sel);
  await t.page.keyboard.press(key);
  await sleep(120);
}

module.exports = {
  name: 'a11y',
  title: 'Keyboards and screen readers · every control can be reached, named and pressed',
  async run(t) {
    // --- the title screen, before a knight is chosen ---
    let s = await strays(t);
    t.eq('on the title screen, everything that can be tapped is a control', s.out, []);
    await t.newKnight('Ines');

    // --- every screen a knight walks through ---
    let total = 0;
    const bad = [];
    for (const id of ['s-map', 's-keep', 's-shop', 's-gear', 's-prefs', 's-train', 's-tome']) {
      await t.ev(id => UI.go(id), id);
      await sleep(80);
      s = await strays(t);
      total += s.n;
      for (const o of s.out) bad.push(id + ': ' + o);
    }
    t.eq('on every screen, nothing tappable is left out of the keyboard', bad, []);
    t.ok('and there was plenty to check', total >= 15, String(total));

    // --- and each is named for what it does ---
    const named = await t.ev(() => {
      UI.go('s-map');
      return [...document.querySelectorAll('#s-map [role=button]')]
        .filter(el => el.getClientRects().length && !(el.getAttribute('aria-label') || el.innerText || '').trim())
        .map(el => el.className);
    });
    t.eq('every one of them has words a screen reader can read', named, []);

    // --- Enter and Space press it, with real keys ---
    await t.ev(() => UI.go('s-shop'));
    await press(t, '#shopToKeep', 'Enter');
    t.eq('Enter on a map door goes through it', await t.screen(), 's-keep');
    const back = await t.ev(() => {
      const d = [...document.querySelectorAll('#s-keep .node')].find(n => /UI\.go\('s-shop'\)/.test(n.getAttribute('onclick') || ''));
      if (d) d.id = '__toShop';
      return !!d;
    });
    t.ok('the keep has a door back to the smithy', back);
    await press(t, '#__toShop', ' ');
    t.eq('and Space does the same', await t.screen(), 's-shop');

    // --- a setting is toggled from the keyboard ---
    const pref = await t.ev(() => {
      UI.go('s-prefs');
      const row = document.querySelector('#s-prefs .pref');
      row.id = '__pref';
      return { k: row.getAttribute('onclick').match(/'(\w+)'/)[1] };
    });
    const was = await t.ev(k => Prefs.d[k], pref.k);
    await press(t, '#__pref', 'Enter');
    t.ok('a settings row is switched by Enter', (await t.ev(k => Prefs.d[k], pref.k)) !== was, JSON.stringify(pref));
    await t.ev(([k, v]) => { Prefs.d[k] = v; }, [pref.k, was]);

    // --- in a fight: the doors added as the question is drawn are controls too ---
    await t.ev(() => { Prefs.d.lessons = false; Battle.begin(0, 0); });
    await sleep(350);
    const fight = await t.ev(() => {
      R.seed(4242); Battle.cur = buildQuestion('mag', 2); R.unseed();
      Battle.rite = null; Battle.lesson = null; Battle.nudged = null;
      Battle.answered = false; Battle.slamNext = false; Battle.ehp = 99999;
      Battle.renderStep();
      const n = document.getElementById('wnudge'), w = document.getElementById('wgo');
      return { nudge: n && n.getAttribute('role') + ' ' + n.tabIndex, work: w && w.getAttribute('role') + ' ' + w.tabIndex };
    });
    // Drawn after the page loaded, so only a watch on the page catches them.
    t.eq('the nudge door, drawn mid-fight, is a button in the tab order', fight.nudge, 'button 0');
    t.eq('and so is the door to the whole working', fight.work, 'button 0');
    await press(t, '#wnudge', 'Enter');
    const took = await t.ev(() => ({ nudged: !!Battle.nudged, answered: Battle.answered,
      box: !!document.querySelector('#showwork .wnudge') }));
    t.ok('Enter on it takes the nudge', took.nudged && took.box, JSON.stringify(took));
    t.ok('and answers nothing', !took.answered, JSON.stringify(took));

    // --- one key presses one control ---
    // On a battle screen Enter also means "continue". With the verdict up and
    // the keyboard resting on the working's door, Enter must open the door and
    // not also wave the turn on.
    const verdict = await t.ev(() => {
      Battle.answer(null, Battle.step().a);
      const e = document.getElementById('explain');
      // put a live door back beside the verdict, the way a stale tab would
      const d = document.createElement('div'); d.id = '__door'; d.textContent = 'door';
      window.__pressed = 0; d.onclick = () => { window.__pressed++; };
      e.parentNode.insertBefore(d, e);
      return { live: e.getAttribute('aria-live'), cont: !!document.getElementById('contBtn') };
    });
    t.eq("a turn's verdict is read out when it lands", verdict.live, 'polite');
    await sleep(60);
    const before = await t.ev(() => ({ s: document.querySelector('.screen.on').id, cont: !!document.getElementById('contBtn') }));
    await press(t, '#__door', 'Enter');
    const after = await t.ev(() => ({ pressed: window.__pressed, cont: !!document.getElementById('contBtn'),
      shown: document.getElementById('explain').style.display !== 'none' }));
    t.eq('Enter presses the control the keyboard is on, once', after.pressed, 1);
    t.ok('and nothing else: the verdict is still waiting to be read',
      before.cont && after.cont && after.shown, JSON.stringify([before, after]));
    await t.ev(() => { const d = document.getElementById('__door'); if (d) d.remove(); });

    // --- the answers themselves are still picked by number ---
    const keyed = await t.ev(() => {
      R.seed(77); Battle.cur = buildQuestion('dot', 2); R.unseed();
      Battle.rite = null; Battle.lesson = null; Battle.nudged = null;
      Battle.answered = false; document.getElementById('explain').style.display = 'none';
      Battle.renderStep();
      document.activeElement && document.activeElement.blur();
      return true;
    });
    await t.page.keyboard.press('1');
    await sleep(100);
    t.ok('a number key still picks an answer in a fight', keyed && await t.ev(() => Battle.answered));
    await t.ev(() => Battle.flee());

    // --- where the keyboard is can be seen ---
    const ring = await t.ev(() => {
      for (const sh of document.styleSheets) {
        let rules; try { rules = sh.cssRules; } catch (e) { continue; }
        for (const r of rules) if (r.selectorText && /:focus-visible/.test(r.selectorText) && /outline/.test(r.cssText)
          && !/outline:\s*none/.test(r.cssText)) return r.cssText;
      }
      return null;
    });
    t.ok('the keyboard leaves a visible ring on what it would press', !!ring, String(ring));

    // --- nothing is saved ---
    t.ok('none of it is written into the save',
      await t.ev(() => !/role|tabindex|aria/i.test(JSON.stringify(Game.s))));

    await t.ev(() => { Prefs.d.lessons = true; UI.go('s-title'); });
  }
};
