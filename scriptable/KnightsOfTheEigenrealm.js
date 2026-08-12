// Knights of the Eigenrealm — a knight-battler that teaches
// linear algebra and calculus.
//
// GENERATED FILE. Edit index.html and re-run `node build-scriptable.js`.
//
// How to use:
//   1. Copy this whole file.
//   2. Open Scriptable on iOS, tap +, paste, and name it
//      "Knights of the Eigenrealm".
//   3. Tap ▶ to play. Add it to your home screen via the Shortcuts app
//      ("Run Script") for one-tap launching.
//
// Everything runs offline inside a WebView. Progress is saved to the
// WebView's local storage and also mirrored to iCloud/local Scriptable
// storage so it survives the app being closed.

// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chess-knight;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#120d1c">
<title>Knights of the Eigenrealm</title>
<style>
:root{
  --bg:#120d1c; --bg2:#1c1430; --panel:#221a38; --panel2:#2c2249;
  --ink:#f3ecd8; --dim:#a99ccb; --gold:#f2c14e; --gold2:#c9962c;
  --red:#e5484d; --green:#57cc7a; --blue:#5aa9e6; --purple:#a06bd6;
  --edge:#3d3163;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;height:100%}
body{
  background:radial-gradient(120% 80% at 50% 0%,#2a1f45 0%,var(--bg) 60%,#0b0812 100%);
  color:var(--ink);
  font-family:"Trebuchet MS","Avenir Next",Avenir,system-ui,-apple-system,sans-serif;
  overscroll-behavior:none; user-select:none; -webkit-user-select:none;
}
#app{max-width:520px;margin:0 auto;padding:env(safe-area-inset-top) 10px calc(env(safe-area-inset-bottom) + 10px);min-height:100%}
.screen{display:none;animation:fade .25s ease}
.screen.on{display:block}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

h1,h2,h3{margin:0;font-weight:800;letter-spacing:.5px}
h1{font-size:26px;color:var(--gold);text-shadow:0 2px 0 #6b4a10,0 0 18px rgba(242,193,78,.35)}
h2{font-size:18px}
.sub{color:var(--dim);font-size:13px;line-height:1.45}

.panel{background:linear-gradient(180deg,var(--panel) 0%,var(--panel2) 100%);
  border:1px solid var(--edge);border-radius:14px;padding:12px;margin:10px 0;
  box-shadow:0 6px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06)}

.btn{display:block;width:100%;padding:13px 14px;margin:8px 0;border-radius:12px;cursor:pointer;
  border:1px solid var(--edge);background:linear-gradient(180deg,#3a2e5e,#2a2148);color:var(--ink);
  font:inherit;font-size:16px;font-weight:700;text-align:left;
  box-shadow:0 4px 0 rgba(0,0,0,.4);transition:transform .06s,filter .12s}
.btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
.btn.gold{background:linear-gradient(180deg,#f2c14e,#c9962c);color:#2a1c00;border-color:#8a6612}
.btn.ghost{background:linear-gradient(180deg,#241c3c,#1b1530);color:var(--dim)}
.btn.sm{padding:9px 11px;font-size:14px;margin:5px 0}
.btn[disabled]{opacity:.4;pointer-events:none}
.row{display:flex;gap:8px}.row>*{flex:1}
.center{text-align:center}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;
  background:#372b5c;color:var(--dim);border:1px solid var(--edge)}
.tag.g{background:#2f4a33;color:#9ee8b3;border-color:#3f6a46}
.tag.r{background:#4a2b2f;color:#ffb3b6;border-color:#6a3c41}

/* top bar */
.hud{display:flex;align-items:center;gap:8px;padding:8px 10px;margin-top:6px;
  background:rgba(20,14,36,.85);border:1px solid var(--edge);border-radius:12px;font-size:13px;font-weight:700}
.hud .sp{flex:1}
.hud>span{white-space:nowrap}
.coin{color:var(--gold)}

/* battle */
#sceneWrap{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--edge);
  box-shadow:0 6px 0 rgba(0,0,0,.35)}
canvas{display:block;width:100%;height:auto;image-rendering:auto}
.bars{display:flex;gap:10px;margin:8px 0 2px}
.bar{flex:1}
.bar .lbl{display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:3px}
.track{height:12px;border-radius:8px;background:#140f24;border:1px solid var(--edge);overflow:hidden}
.fill{height:100%;width:100%;transition:width .35s cubic-bezier(.2,.8,.3,1)}
.fill.hp{background:linear-gradient(90deg,#57cc7a,#2f9c55)}
.fill.foe{background:linear-gradient(90deg,#e5484d,#8c2226)}
.fill.time{background:linear-gradient(90deg,#f2c14e,#e07b39);transition:width .1s linear}
.track.thin{height:7px}

#qbox{font-size:19px;font-weight:800;line-height:1.5;text-align:center;padding:6px 2px 10px}
#qtopic{font-size:11px;color:var(--dim);text-align:center;letter-spacing:1px;text-transform:uppercase}
.choice{font-size:17px;text-align:center;font-weight:800}
.choice.right{background:linear-gradient(180deg,#3fa564,#2b7a49);border-color:#59d089;color:#eafff1}
.choice.wrong{background:linear-gradient(180deg,#b3383c,#7d2427);border-color:#e5484d;color:#ffe9ea}
.choice.faded{opacity:.25;pointer-events:none}

/* matrices & math */
.mtx{display:inline-grid;grid-auto-flow:column;gap:0 10px;vertical-align:middle;position:relative;
  padding:2px 9px;margin:0 2px}
.mtx .col{display:grid;gap:2px;text-align:center}
.mtx:before,.mtx:after{content:"";position:absolute;top:0;bottom:0;width:6px;border:2px solid var(--gold)}
.mtx:before{left:0;border-right:0;border-radius:3px 0 0 3px}
.mtx:after{right:0;border-left:0;border-radius:0 3px 3px 0}
.vecb{color:var(--gold)}
.frac{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:.8em;line-height:1.1;margin:0 2px}
.frac span:first-child{border-bottom:1.5px solid currentColor;padding:0 3px}

/* explain card */
#explain{border-left:4px solid var(--gold);font-size:15px;line-height:1.6}
#explain .head{font-weight:900;margin-bottom:6px;font-size:16px}
#telegraph{background:rgba(229,72,77,.16);border:1px solid var(--red);border-radius:10px;
  padding:8px 10px;margin-bottom:8px;font-size:13px;font-weight:700;text-align:center;
  animation:pulse 1s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(229,72,77,.5)}50%{box-shadow:0 0 0 6px rgba(229,72,77,0)}}
.pips{font-size:11px;color:var(--red);letter-spacing:1px}
.mtag{float:right;font-size:11px;font-weight:800;opacity:.85}
.rev{display:inline-block;padding:1px 7px;border-radius:999px;background:#3a2f5e;
  border:1px solid var(--purple);color:#d9b8ff;font-size:10px;letter-spacing:.5px;margin-left:4px}
.miss{background:rgba(229,72,77,.13);border:1px solid rgba(229,72,77,.4);border-radius:9px;
  padding:8px 10px;margin:8px 0;font-size:14px;line-height:1.5}
.miss b{color:#ffb3b6}

/* map */
.node{display:flex;align-items:center;gap:10px;padding:11px;margin:7px 0;border-radius:12px;
  border:1px solid var(--edge);background:linear-gradient(180deg,#2b2247,#211a39);cursor:pointer;
  box-shadow:0 4px 0 rgba(0,0,0,.4)}
.node:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
.node.locked{opacity:.45;pointer-events:none}
.node.done{border-color:#3f6a46}
.node .ico{width:44px;height:44px;flex:none;border-radius:10px;background:#171129;display:grid;place-items:center}
.node .nm{font-weight:800;font-size:15px}
.node .dt{font-size:12px;color:var(--dim)}
.realmhdr{display:flex;align-items:center;gap:8px;margin-top:14px}
.realmhdr .dot{width:10px;height:10px;border-radius:50%}

/* items */
.item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;margin:6px 0;
  border:1px solid var(--edge);background:#241c3e}
.item .ic{font-size:24px;width:34px;text-align:center}
.item .nm{font-weight:800;font-size:14px}
.item .ds{font-size:12px;color:var(--dim)}
.item.equipped{border-color:var(--gold);box-shadow:inset 0 0 0 1px rgba(242,193,78,.3)}
.pill{padding:6px 10px;border-radius:10px;background:#332957;border:1px solid var(--edge);font-size:12px;font-weight:800}

#powerbar{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px}
#powerbar .pw{padding:10px 12px;border-radius:10px;border:1px solid var(--edge);background:#2b2247;
  font-size:13px;font-weight:800;cursor:pointer;min-height:38px;display:flex;align-items:center}
#powerbar .pw:active{transform:translateY(2px)}
#powerbar .pw.off{opacity:.35;pointer-events:none}

.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:50;
  background:#2b2247;border:1px solid var(--gold);color:var(--ink);padding:10px 16px;border-radius:12px;
  font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.6);animation:pop .3s ease}
@keyframes pop{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
.small{font-size:12px;color:var(--dim)}
hr{border:0;border-top:1px solid var(--edge);margin:10px 0}
.crest{font-size:46px;text-align:center;line-height:1}
.kbd{display:inline-block;padding:1px 6px;border-radius:5px;background:#332957;border:1px solid var(--edge);font-size:12px}

/* ---- juice ---- */
.track{position:relative}
.track .ghost{position:absolute;left:0;top:0;bottom:0;width:100%;
  background:rgba(255,255,255,.5);transition:width .55s ease .3s}
.track .fill{position:relative;z-index:1}
#sceneWrap{position:relative}
#flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:#fff;mix-blend-mode:screen}
#bigBanner{position:fixed;left:0;right:0;top:34%;z-index:60;pointer-events:none;
  text-align:center;opacity:0;transition:opacity .16s}
#bigBanner.on{opacity:1}
#bigBanner .bnr{display:inline-block;text-align:center;transform:scale(.7);
  max-width:78vw;min-width:0;padding:0 8px;box-sizing:border-box;
  animation:bpop .42s cubic-bezier(.2,1.25,.4,1) forwards}
#bigBanner .bt{font-size:clamp(21px,7.4vw,34px);font-weight:900;letter-spacing:.5px;color:var(--bc);
  text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 26px var(--bc);line-height:1.12;
  overflow-wrap:break-word}
#bigBanner .bs{margin-top:4px;font-size:clamp(12px,3.4vw,14px);font-weight:800;color:var(--ink);
  text-shadow:0 2px 6px rgba(0,0,0,.9);overflow-wrap:break-word}
/* The pop overshoots past its keyframe, so max-width leaves room for the peak. */
@keyframes bpop{0%{transform:scale(.62) rotate(-3deg)}60%{transform:scale(1.08) rotate(.8deg)}100%{transform:scale(1) rotate(0)}}
.choice.right{animation:rpop .34s cubic-bezier(.2,1.4,.4,1)}
@keyframes rpop{0%{transform:scale(1)}45%{transform:scale(1.05)}100%{transform:scale(1)}}
.choice.wrong{animation:shake .34s}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
#comboTxt.hot{color:var(--gold);font-weight:900;text-shadow:0 0 10px rgba(242,193,78,.6)}
#comboTxt.blaze{color:#ff9c3d;font-weight:900;text-shadow:0 0 14px rgba(255,120,40,.8)}
.xpwrap{flex:none;width:52px}
.xptrack{height:5px;border-radius:4px;background:#140f24;border:1px solid var(--edge);overflow:hidden}
.xptrack div{height:100%;background:linear-gradient(90deg,#5aa9e6,#a06bd6);transition:width .5s ease}
.pref{display:flex;align-items:center;gap:10px;padding:11px;border-radius:12px;margin:6px 0;
  border:1px solid var(--edge);background:#241c3e;cursor:pointer}
.pref .sw{width:46px;height:26px;border-radius:99px;background:#3a3160;position:relative;flex:none;
  transition:background .2s}
.pref .sw i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;
  background:#8f85b8;transition:transform .2s,background .2s}
.pref.on .sw{background:#2f7a4c}
.pref.on .sw i{transform:translateX(20px);background:#eafff1}
.medal{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;margin:4px 4px 0 0;
  background:#2b2247;border:1px solid var(--edge);font-size:12px;font-weight:800}
.medal.got{border-color:var(--gold);background:#3a2f16;color:var(--gold)}
.streakbox{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;
  background:linear-gradient(90deg,#3a2416,#241c3e);border:1px solid #6b4a10}
.streakbox .n{font-size:26px;font-weight:900;color:var(--gold);line-height:1}
@media (prefers-reduced-motion: reduce){
  .choice.right,.choice.wrong,#bigBanner .bnr{animation:none}
}

/* ---- loot reveal ---- */
#chest{position:fixed; inset:0; z-index:80; display:none; align-items:center; justify-content:center;
  background:rgba(8,6,16,.86); padding:20px;}
#chest.on{display:flex;}
#chest .cbox{position:relative; text-align:center; max-width:19rem; width:100%;}
#chest .clid{font-size:64px; line-height:1; animation:shk .16s ease-in-out infinite;}
#chest .clid.pop{animation:lidpop .45s cubic-bezier(.2,1.6,.4,1) forwards;}
@keyframes shk{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes lidpop{0%{transform:scale(1)}45%{transform:scale(1.5) translateY(-16px)}
  100%{transform:scale(.2) translateY(-46px); opacity:0}}
#chest .cburst{position:absolute; left:50%; top:34px; width:8px; height:8px; margin-left:-4px;
  border-radius:50%; opacity:0; box-shadow:0 0 0 0 var(--rc);}
#chest .cburst.go{animation:burst .6s ease-out forwards;}
@keyframes burst{0%{opacity:.9; box-shadow:0 0 12px 4px var(--rc)}
  100%{opacity:0; box-shadow:0 0 8px 130px rgba(0,0,0,0)}}
#chest .ccard{margin-top:8px; padding:18px 16px; border-radius:14px; opacity:0; transform:scale(.8);
  background:linear-gradient(180deg,#2a2246,#1c1636); border:2px solid var(--rc);
  box-shadow:0 0 34px -6px var(--rc); position:relative; overflow:hidden;}
#chest .ccard.go{animation:cardin .5s cubic-bezier(.2,1.35,.4,1) forwards;}
@keyframes cardin{to{opacity:1; transform:scale(1)}}
#chest .ccard:after{content:""; position:absolute; inset:0; transform:translateX(-120%);
  background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.32) 50%,transparent 62%);}
#chest .ccard.go:after{animation:sheen .9s .35s ease-out;}
@keyframes sheen{to{transform:translateX(120%)}}
#chest .crar{font-size:11px; font-weight:900; letter-spacing:2px; text-transform:uppercase; color:var(--rc);}
#chest .cic{font-size:46px; line-height:1.2; margin:2px 0 4px;}
#chest .cnm{font-size:18px; font-weight:900; color:var(--ink);}
#chest .cds{font-size:13px; color:var(--dim); margin-top:4px; line-height:1.5;}
#chest .cnew{font-size:10px; font-weight:900; letter-spacing:1px; padding:2px 6px; border-radius:5px;
  background:var(--gold); color:#2a1c00; vertical-align:middle;}

/* ---- near death ---- */
#vignette{position:fixed; inset:0; z-index:40; pointer-events:none; opacity:0;
  background:radial-gradient(ellipse at center, transparent 42%, rgba(180,20,28,.85) 100%);
  transition:opacity .4s;}
#vignette.on{opacity:calc(var(--vi,.5) * .8); animation:beat 1.15s ease-in-out infinite;}
#vignette.crit{animation-duration:.62s;}
@keyframes beat{0%,100%{filter:brightness(.75)}18%{filter:brightness(1.5)}36%{filter:brightness(.9)}}
@media (prefers-reduced-motion: reduce){#vignette.on{animation:none}}

/* ================= heraldic pass ================= */
:root{
  --serif: Georgia,"Iowan Old Style","Palatino Linotype",Palatino,"Times New Roman",serif;
  --gold-lt:#ffe6ae; --gold-dk:#7d5c10;
}

/* Gold-leaf headings. A gradient fill needs drop-shadow rather than
   text-shadow, which paints behind the clipped text and shows through. */
h1,h2{font-family:var(--serif); letter-spacing:.015em;}
h1{
  background:linear-gradient(180deg,var(--gold-lt) 0%,var(--gold) 46%,#b07d16 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  text-shadow:none; filter:drop-shadow(0 2px 0 rgba(0,0,0,.55));
}
.crest{filter:drop-shadow(0 3px 6px rgba(0,0,0,.6));}

/* Panel titles become pennants with a swallowtail notch. */
.panel h2{
  display:inline-block; max-width:calc(100% + 12px);
  margin:-12px 0 10px -12px; padding:7px 30px 7px 14px;
  background:linear-gradient(180deg,#3b3063,#291f47);
  border:1px solid var(--gold-dk); border-left:3px solid var(--gold);
  border-radius:0 0 4px 0;
  clip-path:polygon(0 0, 100% 0, calc(100% - 11px) 50%, 100% 100%, 0 100%);
  font-size:16px;
}
.panel h2:first-child{margin-top:-12px;}

/* Divider: a gold hairline broken for a lozenge. */
hr{border:0; height:16px; position:relative; margin:12px 0;}
hr:before{content:""; position:absolute; left:0; right:0; top:50%; height:1px;
  background:linear-gradient(90deg,transparent,var(--gold-dk) 16%,transparent 45%,
    transparent 55%,var(--gold-dk) 84%,transparent);}
hr:after{content:"◆"; position:absolute; left:50%; top:50%;
  transform:translate(-50%,-52%); color:var(--gold); font-size:9px; line-height:1;}

/* Panels get an inner rule, like a ruled page. */
.panel{box-shadow:0 6px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06),
  inset 0 0 0 1px rgba(242,193,78,.07);}

/* Buttons read as cast metal rather than flat plates. */
.btn{
  background:linear-gradient(180deg,#3d3160,#281f45);
  border:1px solid #4b3d78;
  box-shadow:0 4px 0 #150e28, inset 0 1px 0 rgba(255,255,255,.10),
             inset 0 -2px 0 rgba(0,0,0,.32);
}
.btn:active{box-shadow:0 1px 0 #150e28, inset 0 1px 0 rgba(255,255,255,.08);}
.btn.gold{
  background:linear-gradient(180deg,#ffdf90,#f2c14e 42%,#c9962c 100%);
  border-color:var(--gold-dk); color:#2a1c00;
  text-shadow:0 1px 0 rgba(255,255,255,.35);
  box-shadow:0 4px 0 #5f4110, inset 0 1px 0 rgba(255,255,255,.6),
             inset 0 -2px 0 rgba(0,0,0,.18);
}
.btn.gold:active{box-shadow:0 1px 0 #5f4110, inset 0 1px 0 rgba(255,255,255,.5);}
.btn.ghost{background:linear-gradient(180deg,#262040,#1b1531); border-color:#332a55;}

/* The question card is framed like an illuminated page: corner brackets only,
   so nothing can clip the text at narrow widths. */
#qpanel{position:relative; border-color:rgba(242,193,78,.34);}
#qpanel:before,#qpanel:after{
  content:""; position:absolute; width:15px; height:15px; border:2px solid var(--gold);
  opacity:.8; pointer-events:none;}
#qpanel:before{top:5px; left:5px; border-right:0; border-bottom:0; border-radius:4px 0 0 0;}
#qpanel:after{bottom:5px; right:5px; border-left:0; border-top:0; border-radius:0 0 4px 0;}
#qtopic{font-family:var(--serif); font-size:12px; letter-spacing:.16em; color:var(--gold);
  opacity:.85;}

/* HUD becomes a ruled banner strip. */
.hud{border-top:2px solid var(--gold-dk); border-bottom:2px solid var(--gold-dk);
  border-left:1px solid var(--edge); border-right:1px solid var(--edge);
  background:linear-gradient(180deg,#241b3d,#1a1430); border-radius:8px;}
.hud .coin{font-family:var(--serif); font-size:15px;}

/* Map nodes: a gilt edge and a plate behind the sigil. */
.node{border-left:3px solid var(--gold-dk);}
.node.done{border-left-color:#3f6a46;}
.node .ico{border:1px solid var(--gold-dk); background:linear-gradient(180deg,#1d1633,#120d24);}
.realmhdr h2{font-family:var(--serif);}

.tag,.pill,.medal{font-family:var(--serif); letter-spacing:.02em;}

/* Screen change: a sword-glint sweeps across. */
#wipe{position:fixed; inset:0; z-index:70; pointer-events:none; overflow:hidden; display:none;}
#wipe.go{display:block;}
#wipe i{position:absolute; top:-20%; left:-45%; width:30%; height:140%;
  transform:skewX(-16deg);
  background:linear-gradient(90deg,transparent,rgba(242,193,78,.5),rgba(255,246,222,.8),
    rgba(242,193,78,.5),transparent);
  animation:sweep .34s ease-out forwards;}
@keyframes sweep{to{left:125%}}
.screen.on{animation:fadeIn .26s cubic-bezier(.2,.7,.3,1);}
@keyframes fadeIn{from{opacity:0; transform:translateY(9px) scale(.992)}to{opacity:1; transform:none}}
@media (prefers-reduced-motion: reduce){
  #wipe{display:none!important}
  .screen.on{animation:none}
}
</style>
</head>
<body>
<div id="app">

  <!-- ============ TITLE ============ -->
  <div class="screen on" id="s-title">
    <div style="height:14px"></div>
    <div class="crest">⚔️🛡️</div>
    <div class="center" style="margin-top:8px">
      <h1>Knights of the Eigenrealm</h1>
      <div class="sub" style="margin-top:6px">Battle foes with linear algebra &amp; calculus.<br>Solve to strike. Miss and bleed.</div>
    </div>
    <div class="panel">
      <button class="btn gold" onclick="Game.start()">⚔️ Begin the Quest</button>
      <button class="btn" onclick="UI.go('s-map')" id="btnContinue" style="display:none">🏰 Continue Journey</button>
      <button class="btn ghost" onclick="UI.go('s-tome')">📖 Tome of Lore (learn first)</button>
      <button class="btn ghost" onclick="UI.go('s-train')">🎯 Training Grounds</button>
      <button class="btn ghost" onclick="UI.go('s-prefs')">⚙️ Settings &amp; Titles</button>
    </div>
    <div class="panel sub">
      <b style="color:var(--gold)">How it works</b><br>
      • Each turn you get a math riddle — tap one of four answers.<br>
      • <b style="color:var(--green)">Correct</b> → your knight strikes. Faster answers hit harder.<br>
      • <b style="color:var(--red)">Wrong</b> → the foe strikes you, and you're shown exactly why.<br>
      • Win gold &amp; loot → forge better blades, plate, and relics.
    </div>
    <div id="streakRow"></div>
    <div class="center small" id="resetRow" style="display:none">
      <span class="kbd" onclick="Game.hardReset()">Erase save</span>
    </div>
  </div>

  <!-- ============ MAP ============ -->
  <div class="screen" id="s-map">
    <div id="hud" class="hud"></div>
    <div class="panel" style="padding:10px">
      <div class="row">
        <button class="btn sm" onclick="UI.go('s-shop')">🏪 Smithy</button>
        <button class="btn sm" onclick="UI.go('s-gear')">🎒 Gear</button>
        <button class="btn sm" onclick="UI.go('s-tome')">📖 Tome</button>
      </div>
      <div class="row">
        <button class="btn sm ghost" onclick="UI.go('s-train')">🎯 Training</button>
        <button class="btn sm ghost" onclick="Game.rest()">🔥 Camp &amp; Rest</button>
        <button class="btn sm ghost" onclick="UI.go('s-prefs')">⚙️ Settings</button>
      </div>
    </div>
    <div id="mapList"></div>
    <div style="height:20px"></div>
  </div>

  <!-- ============ BATTLE ============ -->
  <div class="screen" id="s-battle">
    <div class="bars">
      <div class="bar">
        <div class="lbl"><span>🛡️ You</span><span id="pHpTxt">100/100</span></div>
        <div class="track"><div class="ghost" id="pGhost"></div><div class="fill hp" id="pHp"></div></div>
      </div>
      <div class="bar">
        <div class="lbl"><span id="foeName">Foe</span><span id="eHpTxt">100/100</span></div>
        <div class="track"><div class="ghost" id="eGhost"></div><div class="fill foe" id="eHp"></div></div>
      </div>
    </div>
    <div id="sceneWrap"><canvas id="scene" width="800" height="400"></canvas><div id="flash"></div></div>
    <div class="track thin" style="margin-top:6px"><div class="fill time" id="timeBar"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span class="small" id="comboTxt">Combo ×1.0</span>
      <span class="small" id="speedTxt">Swift strike bonus active</span>
    </div>

    <div class="panel" id="qpanel">
      <div id="telegraph" style="display:none"></div>
      <div id="qtopic"></div>
      <div id="qbox"></div>
      <div id="choices"></div>
    </div>

    <div class="panel" id="explain" style="display:none"></div>
    <div id="powerbar"></div>
    <div class="center" style="margin-top:8px">
      <span class="kbd" id="fleeBtn" onclick="Battle.flee()">🏃 Retreat</span>
    </div>
    <div style="height:16px"></div>
  </div>

  <!-- ============ RESULT ============ -->
  <div class="screen" id="s-result">
    <div style="height:20px"></div>
    <div id="resultBody"></div>
  </div>

  <!-- ============ SHOP ============ -->
  <div class="screen" id="s-shop">
    <div id="hud2" class="hud"></div>
    <div class="panel"><h2>🏪 The Smithy</h2><div class="sub">Spend gold won in battle. Equip from Gear.</div></div>
    <div id="shopList"></div>
    <button class="btn ghost" onclick="UI.go('s-map')">← Back to the map</button>
    <div style="height:20px"></div>
  </div>

  <!-- ============ GEAR ============ -->
  <div class="screen" id="s-gear">
    <div id="hud3" class="hud"></div>
    <div id="gearList"></div>
    <button class="btn ghost" onclick="UI.go('s-map')">← Back to the map</button>
    <div style="height:20px"></div>
  </div>

  <!-- ============ TOME ============ -->
  <div class="screen" id="s-tome">
    <div class="panel"><h2>📖 Tome of Lore</h2><div class="sub">Every spell in this game is real mathematics. Read a page, then go swing a sword at it.</div></div>
    <div id="tomeList"></div>
    <button class="btn ghost" onclick="UI.back()">← Back</button>
    <div style="height:20px"></div>
  </div>

  <!-- ============ SETTINGS ============ -->
  <div class="screen" id="s-prefs">
    <div id="prefList"></div>
    <button class="btn ghost" onclick="UI.back()">← Back</button>
    <div style="height:20px"></div>
  </div>

  <!-- ============ TRAINING ============ -->
  <div class="screen" id="s-train">
    <div class="panel"><h2>🎯 Training Grounds</h2><div class="sub">Practise freely. No damage taken, no gold earned — just repetitions.</div></div>
    <div id="trainPick"></div>
    <div id="trainRun" style="display:none">
      <div class="panel">
        <div id="tTopic" class="small center"></div>
        <div id="tQ" style="font-size:19px;font-weight:800;text-align:center;padding:8px 2px 10px;line-height:1.5"></div>
        <div id="tChoices"></div>
      </div>
      <div class="panel" id="tExplain" style="display:none;border-left:4px solid var(--gold);font-size:15px;line-height:1.6"></div>
      <div class="center small" id="tScore"></div>
      <button class="btn ghost" onclick="Train.quit()">← Leave the yard</button>
    </div>
    <button class="btn ghost" id="trainBack" onclick="UI.back()">← Back</button>
    <div style="height:20px"></div>
  </div>

  <div id="bigBanner"></div>
  <div id="vignette"></div>
  <div id="wipe"><i></i></div>
  <div id="chest"></div>
</div>

<script>
"use strict";
/* =========================================================================
   Knights of the Eigenrealm
   A turn-based knight battler where the combat system is linear algebra
   and calculus. Pure vanilla JS, no dependencies, single file.
   ========================================================================= */

/* ---------------------------------- utils ------------------------------- */
const R = {
  // _r is swapped for a seeded generator during the daily skirmish, so the
  // same date produces the same twelve problems on every device.
  _r: Math.random,
  seed(n){ let x=(n>>>0)||1; R._r=()=>{ x=(x*1664525+1013904223)>>>0; return x/4294967296; }; },
  unseed(){ R._r=Math.random; },
  i:(a,b)=>Math.floor(R._r()*(b-a+1))+a,
  nz:(a,b)=>{let v=0;let g=0;while(v===0&&g++<40)v=R.i(a,b);return v||1;},
  pick:a=>a[Math.floor(R._r()*a.length)],
  shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R._r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;},
  chance:p=>R._r()<p
};
const SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺'};
const sup = n => String(n).split('').map(c=>SUP[c]||c).join('');
const neg = n => (n<0? '−'+Math.abs(n) : String(n));      // true minus sign
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// column-major HTML matrix: mat([[a,b],[c,d]]) with rows given as rows
function mat(rows){
  const cols = rows[0].length;
  let out='<span class="mtx">';
  for(let c=0;c<cols;c++){
    out+='<span class="col">';
    for(let r=0;r<rows.length;r++) out+='<span>'+neg(rows[r][c])+'</span>';
    out+='</span>';
  }
  return out+'</span>';
}
const vec = a => mat(a.map(x=>[x]));                       // column vector
const vecR= a => '⟨'+a.map(neg).join(', ')+'⟩';            // inline row vector
const frac= (a,b)=>\`<span class="frac"><span>\${neg(a)}</span><span>\${neg(b)}</span></span>\`;

// polynomial from [[coef,power],...]
function poly(terms,v='x'){
  const t = terms.filter(t=>t[0]!==0);
  if(!t.length) return '0';
  let s='';
  t.forEach(([c,p],i)=>{
    const a=Math.abs(c);
    let body = p===0 ? String(a) : (a===1?'':String(a)) + v + (p===1?'':sup(p));
    if(i===0) s += (c<0?'−':'') + body;
    else      s += (c<0?' − ':' + ') + body;
  });
  return s;
}
const dPoly = t => t.map(([c,p])=>[c*p,p-1]).filter(([c,p])=>p>=0 && c!==0);
const evalPoly=(t,x)=>t.reduce((s,[c,p])=>s+c*Math.pow(x,p),0);

/* --------------------------- problem generators -------------------------- */
/* Each generator returns {q, a, d:[distractors], ex} where \`a\` is the exact
   correct answer string and \`ex\` is a plain-language explanation.           */

const GEN = {

/* ---------- Realm 1 : vectors ---------- */
vecAdd(d){
  const k=[6,9,12][d-1]||9;
  const u=[R.nz(-k,k),R.nz(-k,k)], v=[R.nz(-k,k),R.nz(-k,k)];
  const s=[u[0]+v[0],u[1]+v[1]];
  return {topic:'Vector Addition',
    q:\`\${vecR(u)} + \${vecR(v)} = ?\`,
    a:vecR(s),
    d:[[vecR([u[0]-v[0],u[1]-v[1]]),'that subtracts v instead of adding it'],
       [vecR([u[0]+v[1],u[1]+v[0]]),'the components got crossed — first pairs with first, second with second'],
       [vecR([u[0]*v[0],u[1]*v[1]]),'that multiplies the components; addition is what was asked'],
       vecR([s[0],s[1]+R.nz(-3,3)])],
    ex:\`Add matching slots, nothing else. \${neg(u[0])}+\${neg(v[0])} = \${neg(s[0])} on top, \${neg(u[1])}+\${neg(v[1])} = \${neg(s[1])} below. Geometrically you walk along u, then walk along v from wherever you landed.\`};
},
vecScale(d){
  const c=R.nz(-4-d,4+d), v=[R.nz(-8,8),R.nz(-8,8)];
  const s=[c*v[0],c*v[1]];
  return {topic:'Scalar Multiplication',
    q:\`\${neg(c)} · \${vecR(v)} = ?\`,
    a:vecR(s),
    d:[[vecR([c*v[0],v[1]]),'only the first component got scaled — a scalar multiplies every component'],
       [vecR([c+v[0],c+v[1]]),'the scalar was added to each component instead of multiplied'],
       [vecR([-s[0],-s[1]]),'the direction is flipped — check the sign of the scalar'],
       vecR([s[1],s[0]])],
    ex:\`A scalar stretches every component by the same factor: \${neg(c)}·\${neg(v[0])} = \${neg(s[0])} and \${neg(c)}·\${neg(v[1])} = \${neg(s[1])}. \${c<0?'The negative sign flips the arrow to point the opposite way.':'The arrow keeps its direction and changes length by a factor of '+c+'.'}\`};
},
vecCombo(d){
  const a=R.i(2,3+d), b=R.i(2,3+d), u=[R.nz(-6,6),R.nz(-6,6)], v=[R.nz(-6,6),R.nz(-6,6)];
  const s=[a*u[0]-b*v[0], a*u[1]-b*v[1]];
  return {topic:'Linear Combination',
    q:\`u = \${vecR(u)}, v = \${vecR(v)}<br>\${a}u − \${b}v = ?\`,
    a:vecR(s),
    d:[[vecR([a*u[0]+b*v[0],a*u[1]+b*v[1]]),'that adds the two scaled vectors — the problem subtracts'],
       [vecR([a*u[0]-b*v[1],a*u[1]-b*v[0]]),"v's components got crossed"],
       [vecR([-s[0],-s[1]]),'the whole result is negated — you computed '+b+'v − '+a+'u'],
       vecR([s[0]+R.nz(-4,4),s[1]])],
    ex:\`Scale first, then add. \${a}u = \${vecR([a*u[0],a*u[1]])} and \${b}v = \${vecR([b*v[0],b*v[1]])}. Subtracting gives \${vecR(s)}. Any expression like this is a "linear combination" — the whole subject is built out of them.\`};
},
dot(d){
  const k=[6,9,12][d-1]||9;
  const u=[R.nz(-k,k),R.nz(-k,k)], v=[R.nz(-k,k),R.nz(-k,k)];
  const s=u[0]*v[0]+u[1]*v[1];
  return {topic:'Dot Product',
    q:\`\${vecR(u)} · \${vecR(v)} = ?\`,
    a:neg(s),
    d:[[neg(u[0]*v[0]-u[1]*v[1]),'the two products were subtracted — the dot product adds them'],
       [neg(u[0]*v[1]+u[1]*v[0]),'the components got crossed; multiply first with first, second with second'],
       [neg(-s),'a sign slipped somewhere in the products'],
       neg(s+R.nz(-6,6))],
    ex:\`Multiply matching slots and add the results: (\${neg(u[0])})(\${neg(v[0])}) + (\${neg(u[1])})(\${neg(v[1])}) = \${neg(u[0]*v[0])} + \${neg(u[1]*v[1])} = \${neg(s)}. The dot product is a single number, never a vector — it measures how much the two arrows point the same way.\`};
},
mag(){
  const t=R.pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[20,21,29]]);
  const sx=R.chance(.5)?1:-1, sy=R.chance(.5)?1:-1;
  const v=[t[0]*sx,t[1]*sy];
  return {topic:'Vector Length',
    q:\`‖\${vecR(v)}‖ = ?\`,
    a:String(t[2]),
    d:[[String(t[0]+t[1]),'that just adds the components — length needs the square root of the sum of squares'],
       [String(Math.abs(t[0]-t[1])),'the components were subtracted; they must be squared and added'],
       [String(t[2]*2),'twice the correct length — the square root was never taken properly'],
       String(t[2]+1)],
    ex:\`Length is Pythagoras: √(\${t[0]}² + \${t[1]}²) = √(\${t[0]*t[0]} + \${t[1]*t[1]}) = √\${t[2]*t[2]} = \${t[2]}. Signs vanish because the components get squared — length is never negative.\`};
},
orth(){
  const u=[R.nz(-6,6),R.nz(-6,6)];
  const wantPerp=R.chance(.5);
  const v = wantPerp ? [-u[1],u[0]] : [R.nz(-6,6),R.nz(-6,6)];
  const s=u[0]*v[0]+u[1]*v[1];
  const truth = s===0;
  return {topic:'Orthogonality',
    q:\`Are u = \${vecR(u)} and v = \${vecR(v)} perpendicular?\`,
    a: truth ? 'Yes — they are perpendicular' : 'No — they are not perpendicular',
    d:[ truth ? ['No — they are not perpendicular',\`their dot product is 0, and a zero dot product is exactly what perpendicular means\`]
              : ['Yes — they are perpendicular',\`their dot product is \${neg(s)}, not 0\`],
        ['Only if both are unit vectors','length is irrelevant here — perpendicularity is decided by the dot product alone'],
        ['You would need the angle between them','you never need the angle; the dot product settles it'],
        ['Only if they have the same length','equal length has nothing to do with meeting at a right angle']],
    ex:\`Two vectors are perpendicular exactly when their dot product is zero. Here u·v = (\${neg(u[0])})(\${neg(v[0])}) + (\${neg(u[1])})(\${neg(v[1])}) = \${neg(s)}, so they \${truth?'are':'are not'} perpendicular.\`};
},

/* ---------- Realm 2 : matrices ---------- */
matVec(d){
  const k=[5,7,9][d-1]||7;
  const A=[[R.nz(-k,k),R.nz(-k,k)],[R.nz(-k,k),R.nz(-k,k)]], v=[R.nz(-6,6),R.nz(-6,6)];
  const s=[A[0][0]*v[0]+A[0][1]*v[1], A[1][0]*v[0]+A[1][1]*v[1]];
  return {topic:'Matrix × Vector',
    q:\`\${mat(A)}\${vec(v)} = ?\`,
    a:vec(s),
    d:[[vec([A[0][0]*v[0]+A[1][0]*v[1], A[0][1]*v[0]+A[1][1]*v[1]]),'that dotted the vector with the columns — each output entry uses a row'],
       [vec([s[1],s[0]]),'the two output components are in the wrong order'],
       [vec([A[0][0]*v[0],A[1][1]*v[1]]),'only the diagonal entries were used — each row contributes both of its terms'],
       vec([s[0]+R.nz(-5,5),s[1]])],
    ex:\`Each output row is that row dotted with the vector. Top: (\${neg(A[0][0])})(\${neg(v[0])}) + (\${neg(A[0][1])})(\${neg(v[1])}) = \${neg(s[0])}. Bottom: (\${neg(A[1][0])})(\${neg(v[0])}) + (\${neg(A[1][1])})(\${neg(v[1])}) = \${neg(s[1])}.\`};
},
det2(d){
  const k=[5,8,11][d-1]||8;
  const A=[[R.nz(-k,k),R.i(-k,k)],[R.i(-k,k),R.nz(-k,k)]];
  const s=A[0][0]*A[1][1]-A[0][1]*A[1][0];
  return {topic:'Determinant (2×2)',
    q:\`det \${mat(A)} = ?\`,
    a:neg(s),
    d:[[neg(A[0][0]*A[1][1]+A[0][1]*A[1][0]),'the two products were added — the determinant subtracts the second'],
       [neg(-s),'the subtraction ran backwards; it is ad − bc, in that order'],
       [neg(A[0][0]+A[1][1]),'that is the trace (the diagonal sum), not the determinant'],
       neg(s+R.nz(-7,7))],
    ex:\`For a 2×2 it's (top-left)(bottom-right) − (top-right)(bottom-left) = (\${neg(A[0][0])})(\${neg(A[1][1])}) − (\${neg(A[0][1])})(\${neg(A[1][0])}) = \${neg(s)}. That number is the signed area scaling factor of the transformation; zero would mean it squashes the plane flat.\`};
},
transpose(){
  const A=[[R.nz(-9,9),R.i(-9,9)],[R.i(-9,9),R.nz(-9,9)]];
  const T=[[A[0][0],A[1][0]],[A[0][1],A[1][1]]];
  return {topic:'Transpose',
    q:\`\${mat(A)}<sup>T</sup> = ?\`,
    a:mat(T),
    d:[[mat([[A[1][1],A[0][1]],[A[1][0],A[0][0]]]),'that swapped the diagonal entries — transposing leaves those alone and swaps the other two'],
       [mat([[A[0][0],A[0][1]],[A[1][0],A[1][1]]]),'that is the original matrix, unchanged'],
       [mat([[-A[0][0],-A[1][0]],[-A[0][1],-A[1][1]]]),'transposing never changes any signs'],
       mat([[A[1][0],A[0][0]],[A[1][1],A[0][1]]])],
    ex:\`Transposing flips the matrix across its main diagonal: rows become columns. The diagonal entries \${neg(A[0][0])} and \${neg(A[1][1])} stay put, while \${neg(A[0][1])} and \${neg(A[1][0])} swap places.\`};
},
matMul(d){
  const k=[3,5,7][d-1]||5;
  const A=[[R.nz(-k,k),R.i(-k,k)],[R.i(-k,k),R.nz(-k,k)]];
  const B=[[R.nz(-k,k),R.i(-k,k)],[R.i(-k,k),R.nz(-k,k)]];
  const C=[[A[0][0]*B[0][0]+A[0][1]*B[1][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]],
           [A[1][0]*B[0][0]+A[1][1]*B[1][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]]];
  const W=[[A[0][0]*B[0][0],A[0][1]*B[0][1]],[A[1][0]*B[1][0],A[1][1]*B[1][1]]];
  return {topic:'Matrix Multiplication',
    q:\`\${mat(A)}\${mat(B)} = ?\`,
    a:mat(C),
    d:[[mat(W),'that multiplied matching entries — matrix multiplication dots each row against each column'],
       [mat([[C[0][0],C[1][0]],[C[0][1],C[1][1]]]),'this is the transpose of the correct product'],
       [mat([[C[1][1],C[0][1]],[C[1][0],C[0][0]]]),'the right numbers, but in the wrong positions'],
       mat([[C[0][0]+R.nz(-4,4),C[0][1]],[C[1][0],C[1][1]]])],
    ex:\`Entry (row i, col j) = row i of the first matrix dotted with column j of the second. Top-left: (\${neg(A[0][0])})(\${neg(B[0][0])}) + (\${neg(A[0][1])})(\${neg(B[1][0])}) = \${neg(C[0][0])}. Repeat for the other three. Note it is <i>not</i> entrywise multiplication.\`};
},
trace(){
  const A=[[R.nz(-9,9),R.i(-9,9)],[R.i(-9,9),R.nz(-9,9)]];
  const s=A[0][0]+A[1][1];
  return {topic:'Trace',
    q:\`tr \${mat(A)} = ?\`,
    a:neg(s),
    d:[[neg(A[0][1]+A[1][0]),'that sums the off-diagonal entries — the trace uses the main diagonal'],
       [neg(A[0][0]*A[1][1]),'the diagonal entries were multiplied instead of added'],
       [neg(A[0][0]*A[1][1]-A[0][1]*A[1][0]),'that is the determinant, not the trace'],
       neg(-s)],
    ex:\`The trace is just the sum down the main diagonal: \${neg(A[0][0])} + \${neg(A[1][1])} = \${neg(s)}. It also equals the sum of the eigenvalues, which is why it shows up everywhere.\`};
},
solve2(d){
  const x=R.nz(-5,5), y=R.nz(-5,5);
  const a=R.nz(-4,4), b=R.nz(-4,4), c=R.nz(-4,4);
  let e=R.nz(-4,4);
  if(a*e-b*c===0) e=e+ (e>0?1:-1) + (a*(e+1)-b*c===0?1:0);
  const p=a*x+b*y, q2=c*x+e*y;
  return {topic:'Solving a 2×2 System',
    q:\`\${poly([[a,1]],'x')} \${b<0?'−':'+'} \${Math.abs(b)===1?'':Math.abs(b)}y = \${neg(p)}<br>\${poly([[c,1]],'x')} \${e<0?'−':'+'} \${Math.abs(e)===1?'':Math.abs(e)}y = \${neg(q2)}\`,
    a:\`x = \${neg(x)}, y = \${neg(y)}\`,
    d:[[\`x = \${neg(y)}, y = \${neg(x)}\`,'the right two numbers, but x and y are swapped'],
       [\`x = \${neg(-x)}, y = \${neg(y)}\`,'the sign of x is wrong — substitute back into the first equation and it fails'],
       ['No solution','the determinant is not zero, so there is exactly one solution'],
       \`x = \${neg(x+1)}, y = \${neg(y-1)}\`],
    ex:\`Written as a matrix equation this is \${mat([[a,b],[c,e]])}\${vec(['x','y'])} = \${vec([p,q2])}. Since the determinant \${neg(a*e-b*c)} is not zero there is exactly one solution, and it is x = \${neg(x)}, y = \${neg(y)}. Substitute back to check both equations.\`};
},
inv2(){
  let A, det;
  do{ A=[[R.nz(-5,5),R.i(-5,5)],[R.i(-5,5),R.nz(-5,5)]]; det=A[0][0]*A[1][1]-A[0][1]*A[1][0]; }
  while(det===0 || Math.abs(det)>6);
  const adj=[[A[1][1],-A[0][1]],[-A[1][0],A[0][0]]];
  const show=m=>\`\${frac(1,det)} \${mat(m)}\`;
  return {topic:'Inverse of a 2×2',
    q:\`\${mat(A)}<sup>−1</sup> = ?\`,
    a:show(adj),
    d:[[show([[A[0][0],A[0][1]],[A[1][0],A[1][1]]]),'the entries were left where they were — you must swap the diagonal and negate the off-diagonal'],
       [show([[A[1][1],A[0][1]],[A[1][0],A[0][0]]]),'the diagonal was swapped but the off-diagonal entries were never negated'],
       [\`\${frac(1,-det)} \${mat(adj)}\`,'the right matrix, but divided by −det instead of det'],
       show([[-A[1][1],A[0][1]],[A[1][0],-A[0][0]]])],
    ex:\`The recipe: swap the diagonal entries, flip the sign of the other two, then divide by the determinant. det = \${neg(det)}, so the inverse is \${frac(1,det)} times \${mat(adj)}. If the determinant were 0 no inverse would exist.\`};
},
det3(){
  const A=[[R.nz(-4,4),R.i(-3,3),R.i(-3,3)],[R.i(-3,3),R.nz(-4,4),R.i(-3,3)],[R.i(-3,3),R.i(-3,3),R.nz(-4,4)]];
  const m=(r,c)=>{const rs=[0,1,2].filter(i=>i!==r), cs=[0,1,2].filter(i=>i!==c);
    return A[rs[0]][cs[0]]*A[rs[1]][cs[1]]-A[rs[0]][cs[1]]*A[rs[1]][cs[0]];};
  const s=A[0][0]*m(0,0)-A[0][1]*m(0,1)+A[0][2]*m(0,2);
  return {topic:'Determinant (3×3)',
    q:\`det \${mat(A)} = ?\`,
    a:neg(s),
    d:[[neg(-s),'the alternating signs ran the wrong way — the pattern is + − +'],
       [neg(A[0][0]*A[1][1]*A[2][2]),'that is only the diagonal product; a 3×3 determinant needs all the cofactor terms'],
       [neg(A[0][0]*m(0,0)+A[0][1]*m(0,1)+A[0][2]*m(0,2)),'the middle term must be subtracted, not added'],
       neg(s+R.nz(-9,9))],
    ex:\`Expand along the top row with alternating signs + − +: \${neg(A[0][0])}·\${neg(m(0,0))} − \${neg(A[0][1])}·\${neg(m(0,1))} + \${neg(A[0][2])}·\${neg(m(0,2))} = \${neg(s)}. Each small number is the 2×2 determinant left after deleting that entry's row and column.\`};
},
cross(){
  const u=[R.nz(-4,4),R.nz(-4,4),R.nz(-4,4)], v=[R.nz(-4,4),R.nz(-4,4),R.nz(-4,4)];
  const s=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  return {topic:'Cross Product',
    q:\`\${vecR(u)} × \${vecR(v)} = ?\`,
    a:vecR(s),
    d:[[vecR([-s[0],-s[1],-s[2]]),'that is v × u — swapping the order reverses the sign'],
       [vecR([u[0]*v[0],u[1]*v[1],u[2]*v[2]]),'componentwise multiplication is not the cross product'],
       [neg(u[0]*v[0]+u[1]*v[1]+u[2]*v[2]),'that is the dot product — a single number, not a vector'],
       vecR([s[1],s[2],s[0]])],
    ex:\`Component by component: (u₂v₃−u₃v₂, u₃v₁−u₁v₃, u₁v₂−u₂v₁) = \${vecR(s)}. Unlike the dot product this returns a <i>vector</i>, and it is perpendicular to both inputs.\`};
},
rank(){
  const indep=R.chance(.5);
  const c1=[R.nz(-5,5),R.nz(-5,5)];
  const k=R.nz(-3,3);
  const c2= indep ? [R.nz(-5,5),R.nz(-5,5)] : [k*c1[0],k*c1[1]];
  const A=[[c1[0],c2[0]],[c1[1],c2[1]]];
  const det=A[0][0]*A[1][1]-A[0][1]*A[1][0];
  const truth=det!==0;
  return {topic:'Linear Independence',
    q:\`Are the columns of \${mat(A)} linearly independent?\`,
    a: truth ? 'Yes — the determinant is not zero' : 'No — one column is a multiple of the other',
    d:[ truth ? ['No — one column is a multiple of the other',\`no scalar turns one column into the other here; the determinant is \${neg(det)}, which is not zero\`]
              : ['Yes — the determinant is not zero',\`the determinant is 0 here, so the columns are dependent\`],
        ['Yes — both columns are nonzero','being nonzero is not enough; two nonzero vectors can still sit on the same line'],
        ['Only square matrices can have independent columns','independence is defined for any collection of vectors, square or not'],
        ['Only if the columns are perpendicular','perpendicular vectors are independent, but independence does not require right angles']],
    ex:\`Columns of a square matrix are independent exactly when the determinant is nonzero. Here det = \${neg(det)}, so they \${truth?'are independent and span the whole plane':'are dependent — the second column is just a scaled copy of the first, so together they only span a line'}.\`};
},
eigen2(){
  const l1=R.nz(-5,5); let l2=R.nz(-5,5); if(l2===l1) l2=l1+1;
  const b=R.i(1,4);
  const A=[[l1,b],[0,l2]];                 // triangular ⇒ eigenvalues on diagonal
  return {topic:'Eigenvalues',
    q:\`Eigenvalues of \${mat(A)}?\`,
    a:\`\${neg(Math.min(l1,l2))} and \${neg(Math.max(l1,l2))}\`,
    d:[[\`\${neg(l1+l2)} and \${neg(l1*l2)}\`,'those are the trace and the determinant — related to the eigenvalues, but not them'],
       [\`\${neg(-l1)} and \${neg(-l2)}\`,'the signs are flipped; solve (λ − a)(λ − d) = 0, not (λ + a)(λ + d) = 0'],
       [\`\${neg(b)} and \${neg(0)}\`,'those are the off-diagonal entries, which do not set the eigenvalues of a triangular matrix'],
       \`\${neg(l1*l2)} only\`],
    ex:\`This matrix is triangular (a zero below the diagonal), and a triangular matrix wears its eigenvalues on the diagonal: \${neg(l1)} and \${neg(l2)}. Check with the characteristic equation det(A − λI) = (\${neg(l1)} − λ)(\${neg(l2)} − λ) = 0. Eigenvalues tell you how much each special direction is stretched.\`};
},
proj(){
  const t=R.pick([[3,4,5],[6,8,10],[5,12,13]]);
  const v=[t[0],t[1]], u=[R.nz(-6,6),R.nz(-6,6)];
  const dp=u[0]*v[0]+u[1]*v[1];
  return {topic:'Scalar Projection',
    q:\`How much of u = \${vecR(u)} points along v = \${vecR(v)}?<br><span class="small">(the scalar projection u·v / ‖v‖)</span>\`,
    a: frac(dp,t[2]),
    d:[[frac(dp,t[2]*t[2]),'that divides by ‖v‖², which is the coefficient for the vector projection, not the scalar one'],
       [neg(dp),'that is just u·v — it still needs dividing by the length of v'],
       [frac(t[2],dp),'the fraction is upside down'],
       frac(-dp,t[2])],
    ex:\`Scalar projection = u·v / ‖v‖. Here u·v = \${neg(dp)} and ‖v‖ = √(\${t[0]}²+\${t[1]}²) = \${t[2]}, giving \${frac(dp,t[2])}. It is the length of u's shadow cast onto the line through v.\`};
},

/* ---------- Realm 3 : limits & derivatives ---------- */
limPoly(){
  const t=[[R.nz(1,4),2],[R.nz(-6,6),1],[R.i(-8,8),0]];
  const a=R.nz(-3,3);
  const s=evalPoly(t,a);
  return {topic:'Limit by Substitution',
    q:\`lim<sub>x→\${neg(a)}</sub> ( \${poly(t)} ) = ?\`,
    a:neg(s),
    d:[[neg(evalPoly(dPoly(t),a)),'that evaluates the derivative — a limit of a continuous function is plain substitution'],
       ['Does not exist','polynomials are continuous everywhere, so this limit always exists'],
       [neg(-s),'a sign slipped — watch the negative value being squared'],
       neg(s+R.nz(-6,6))],
    ex:\`Polynomials are continuous everywhere, so you may simply plug in x = \${neg(a)}: \${t.map(([c,p])=>\`(\${neg(c)})(\${neg(a)})\${p?sup(p):'⁰'}\`).join(' + ')} = \${neg(s)}. Substitution only fails when it produces something like 0/0.\`};
},
limRational(){
  const a=R.nz(1,6);
  const s=2*a;
  return {topic:'Limit (0/0 form)',
    q:\`lim<sub>x→\${neg(a)}</sub> \${frac(\`x² − \${a*a}\`,\`x − \${a}\`)} = ?\`,
    a:neg(s),
    d:[[neg(a),\`that is x itself; after cancelling you are left with x + \${a}, not x\`],
       ['0','both parts vanish, but their ratio does not — factor before you judge'],
       ['Does not exist','the 0/0 form only means substitution is premature; factoring reveals a perfectly good limit'],
       neg(a*a)],
    ex:\`Substituting gives 0/0, so factor first: x² − \${a*a} = (x − \${a})(x + \${a}). Cancel the (x − \${a}) and you're left with x + \${a}, which at x = \${a} equals \${neg(s)}. The hole in the graph doesn't affect the limit.\`};
},
limInf(){
  const a=R.i(2,9), b=R.i(2,9);
  const k=R.pick([1,2]);
  if(k===1){
    return {topic:'Limit at Infinity',
      q:\`lim<sub>x→∞</sub> \${frac(\`\${a}x² + \${R.i(1,9)}x\`,\`\${b}x² − \${R.i(1,9)}\`)} = ?\`,
      a:frac(a,b),
      d:[['∞','top and bottom grow at the same rate, so the ratio stays finite'],
         ['0','the numerator does not vanish — both sides grow like x²'],
         [frac(b,a),'the ratio is upside down; it is the top leading coefficient over the bottom one'],
         neg(a-b)],
      ex:\`When top and bottom have the same highest power, the limit is the ratio of those leading coefficients: \${a}/\${b}. Everything of lower degree becomes negligible once x is enormous.\`};
  }
  return {topic:'Limit at Infinity',
    q:\`lim<sub>x→∞</sub> \${frac(\`\${a}x + \${R.i(1,9)}\`,\`\${b}x² + \${R.i(1,9)}\`)} = ?\`,
    a:'0',
    d:[['∞','the denominator grows faster, so the fraction shrinks rather than blows up'],
       [frac(a,b),'that would be right if the powers matched, but the bottom is a whole power higher'],
       ['1','the two sides grow at different rates, so the ratio never settles at 1'],
       frac(b,a)],
    ex:\`The bottom grows like x² while the top only grows like x, so the denominator wins by a whole power of x and the fraction is crushed to 0.\`};
},
powerRule(d){
  const n=R.i(2,3+d);
  const t=[[R.nz(2,9),n],[R.nz(-9,9),n>2?2:1],[R.i(-9,9),0]];
  const dt=dPoly(t);
  return {topic:'Derivative (Power Rule)',
    q:\`\${frac('d','dx')} ( \${poly(t)} ) = ?\`,
    a:poly(dt),
    d:[[poly(t.map(([c,p])=>[c*p,p])),'the coefficients were multiplied by the power but the exponents never dropped'],
       [poly(t.map(([c,p])=>[c,p-1]).filter(x=>x[1]>=0)),'the exponents dropped but the coefficients were never multiplied by them'],
       [poly(dPoly(dt)),'that is the second derivative — differentiated once too often'],
       poly(t.map(([c,p])=>[c*(p+1),p+1]))],
    ex:\`Bring the power down and drop it by one: \${t.filter(x=>x[0]).map(([c,p])=>p===0?\`the constant \${neg(c)} → 0\`:\`\${neg(c)}x\${p===1?'':sup(p)} → \${neg(c*p)}\${p-1===0?'':'x'+(p-1===1?'':sup(p-1))}\`).join(', ')}. Result: \${poly(dt)}.\`};
},
evalDeriv(){
  const t=[[R.nz(1,4),3],[R.nz(-6,6),2],[R.nz(-8,8),1],[R.i(-9,9),0]];
  const dt=dPoly(t), a=R.nz(-3,3), s=evalPoly(dt,a);
  return {topic:'Derivative at a Point',
    q:\`f(x) = \${poly(t)}<br>f′(\${neg(a)}) = ?\`,
    a:neg(s),
    d:[[neg(evalPoly(t,a)),'that is f(a) — the height of the curve, not its slope'],
       [neg(evalPoly(dPoly(dt),a)),'that is f″(a), the second derivative'],
       [neg(-s),'a sign slipped while substituting a negative value'],
       neg(s+R.nz(-9,9))],
    ex:\`First differentiate: f′(x) = \${poly(dt)}. Then substitute x = \${neg(a)} to get \${neg(s)}. That number is the slope of the curve at that exact point — and the instantaneous rate of change.\`};
},
trigDeriv(){
  const k=R.i(2,6);
  const which=R.pick(['sin','cos']);
  const q = which==='sin' ? \`sin(\${k}x)\` : \`cos(\${k}x)\`;
  const a = which==='sin' ? \`\${k}cos(\${k}x)\` : \`−\${k}sin(\${k}x)\`;
  return {topic:'Derivative of Trig',
    q:\`\${frac('d','dx')} \${q} = ?\`,
    a,
    d:[[which==='sin'?\`cos(\${k}x)\`:\`−sin(\${k}x)\`,\`the chain rule was skipped — the inner \${k}x contributes a factor of \${k}\`],
       [which==='sin'?\`−\${k}cos(\${k}x)\`:\`\${k}sin(\${k}x)\`,'the sign is wrong: sin differentiates to +cos, cos differentiates to −sin'],
       [\`\${frac(1,k)}\${which==='sin'?'cos':'sin'}(\${k}x)\`,\`dividing by \${k} is what integrating does; differentiating multiplies by it\`],
       \`\${k}\${which}(\${k}x)\`],
    ex:\`sin differentiates to cos, cos differentiates to −sin. The inner function \${k}x has derivative \${k}, and the chain rule says multiply by it — so the answer is \${a}.\`};
},
expLog(){
  const k=R.i(2,7);
  if(R.chance(.5)) return {topic:'Derivative of eˣ',
    q:\`\${frac('d','dx')} e<sup>\${k}x</sup> = ?\`,
    a:\`\${k}e<sup>\${k}x</sup>\`,
    d:[[\`e<sup>\${k}x</sup>\`,\`the chain rule was skipped — the inner \${k}x contributes a factor of \${k}\`],
       [\`\${k}x·e<sup>\${k}x</sup>\`,'the exponent was brought down as if this were a power; exponentials do not behave that way'],
       [\`\${frac(1,k)}e<sup>\${k}x</sup>\`,\`dividing by \${k} is what integrating does; differentiating multiplies by it\`],
       \`e<sup>\${k}</sup>\`],
    ex:\`e<sup>u</sup> differentiates to e<sup>u</sup> times u′. With u = \${k}x, u′ = \${k}, so the answer is \${k}e<sup>\${k}x</sup>. The exponential is the one function that essentially reproduces itself.\`};
  return {topic:'Derivative of ln',
    q:\`\${frac('d','dx')} ln(\${k}x) = ?\`,
    a:frac(1,'x'),
    d:[[frac(1,k+'x'),\`the chain rule gives \${k} on top, and it cancels the \${k} underneath — leaving 1/x\`],
       [frac(k,'x'),\`the \${k} was applied on top without cancelling the \${k} in the denominator\`],
       [\`\${k}ln(x)\`,'that is not a derivative at all — ln does not survive differentiation'],
       frac('1','ln x')],
    ex:\`Chain rule: derivative of ln(u) is u′/u = \${k}/(\${k}x), and the \${k}s cancel to give 1/x. Interesting fact: ln(\${k}x) = ln \${k} + ln x, and the constant ln \${k} has derivative 0 — same answer.\`};
},
productRule(){
  const a=R.nz(2,5), b=R.nz(-6,6), c=R.nz(2,5), e=R.nz(-6,6);
  const A=2*a*c, B=a*e+b*c;
  return {topic:'Product Rule',
    q:\`\${frac('d','dx')} (\${poly([[a,1],[b,0]])})(\${poly([[c,1],[e,0]])}) = ?\`,
    a:poly([[A,1],[B,0]]),
    d:[[poly([[a*c,1],[b*e,0]]),'that multiplied the two derivatives together — the rule is f′g + fg′, not f′g′'],
       [poly([[a+c,1],[b+e,0]]),'the two factors were added rather than differentiated as a product'],
       [poly([[a*c,1],[0,0]]),'only one cross term survived; both f′g and fg′ contribute'],
       poly([[A,1],[-B,0]])],
    ex:\`(fg)′ = f′g + fg′. Here f′ = \${a} and g′ = \${c}, so we get \${a}(\${poly([[c,1],[e,0]])}) + (\${poly([[a,1],[b,0]])})(\${c}) = \${poly([[A,1],[B,0]])}. Expanding first and differentiating gives the same thing — the rule just saves work when expanding is ugly.\`};
},
quotient(){
  const a=R.nz(2,6);
  return {topic:'Quotient Rule',
    q:\`\${frac('d','dx')} \${frac('x',\`x + \${a}\`)} = ?\`,
    a:frac(a,\`(x + \${a})²\`),
    d:[[frac(-a,\`(x + \${a})²\`),'the numerator ran backwards; it is f′g − fg′, in that order'],
       ['1','the derivative of a quotient is not the quotient of the derivatives'],
       [frac(\`2x + \${a}\`,\`(x + \${a})²\`),'the x terms cancel in the numerator — recompute f′g − fg′'],
       frac(1,\`(x + \${a})²\`)],
    ex:\`(f/g)′ = (f′g − fg′)/g². With f = x, g = x + \${a}: numerator = 1·(x + \${a}) − x·1 = \${a}. So the derivative is \${a}/(x + \${a})², which is always positive — the function is increasing everywhere it's defined.\`};
},
chainRule(){
  const a=R.i(2,5), b=R.nz(-6,6), n=R.i(2,4);
  const inner=poly([[a,1],[b,0]]);
  return {topic:'Chain Rule',
    q:\`\${frac('d','dx')} (\${inner})\${sup(n)} = ?\`,
    a:\`\${n*a}(\${inner})\${sup(n-1)}\`,
    d:[[\`\${n}(\${inner})\${sup(n-1)}\`,\`the inner derivative was forgotten — differentiating \${inner} gives \${a}\`],
       [\`\${n*a}(\${inner})\${sup(n)}\`,'the outer power was never reduced by one'],
       [\`\${a}(\${inner})\${sup(n-1)}\`,'the outer power was never brought down as a factor'],
       \`\${n*a}(\${a})\${sup(n-1)}\`],
    ex:\`Outside first, then inside. The outer power gives \${n}(inner)\${sup(n-1)}; the inner function \${inner} has derivative \${a}. Multiply: \${n*a}(\${inner})\${sup(n-1)}. Forgetting that inner \${a} is the single most common calculus slip.\`};
},
tangent(){
  const t=[[R.nz(1,4),2],[R.nz(-7,7),1],[R.i(-7,7),0]];
  const a=R.nz(-3,3), dt=dPoly(t), m=evalPoly(dt,a), y=evalPoly(t,a);
  return {topic:'Tangent Line',
    q:\`f(x) = \${poly(t)}<br>Slope of the tangent line at x = \${neg(a)}?\`,
    a:neg(m),
    d:[[neg(y),'that is f at that point — the height of the curve, not the slope of the tangent'],
       [neg(-m),'a sign slipped while substituting'],
       [neg(evalPoly(t,a)+m),'the function value and the slope were added together'],
       neg(m+R.nz(-6,6))],
    ex:\`The tangent slope <i>is</i> the derivative. f′(x) = \${poly(dt)}, so f′(\${neg(a)}) = \${neg(m)}. (The full tangent line would be y − \${neg(y)} = \${neg(m)}(x − \${neg(a)}).)\`};
},

/* ---------- Realm 4 : integrals ---------- */
indefPower(){
  const n=R.i(1,4), c=(n+1)*R.i(1,4);
  return {topic:'Indefinite Integral',
    q:\`∫ \${poly([[c,n]])} dx = ?\`,
    a:\`\${poly([[c/(n+1),n+1]])} + C\`,
    d:[[\`\${poly([[c,n+1]])} + C\`,'the power went up but the coefficient was never divided by the new power'],
       [\`\${poly([[c*n,n-1]])} + C\`,'that differentiates instead of integrating — the power went down'],
       [\`\${poly([[c/(n+1),n]])} + C\`,'the coefficient was divided but the power never rose'],
       \`\${poly([[c*(n+1),n+1]])} + C\`],
    ex:\`Reverse the power rule: raise the power by one, then divide by the new power. x\${sup(n)} → x\${sup(n+1)}/\${n+1}, so \${c}x\${sup(n)} → \${c/(n+1)}x\${sup(n+1)}. Never forget the + C — every constant differentiates to zero, so infinitely many antiderivatives fit.\`};
},
defPoly(){
  const c=R.i(1,4)*2, b=R.nz(-5,5), hi=R.i(2,4);
  const t=[[c,1],[b,0]];
  const F=[[c/2,2],[b,1]];
  const s=evalPoly(F,hi)-evalPoly(F,0);
  return {topic:'Definite Integral',
    q:\`∫<sub>0</sub><sup>\${hi}</sup> (\${poly(t)}) dx = ?\`,
    a:neg(s),
    d:[[neg(evalPoly(t,hi)),'that evaluates the integrand at the top limit — you must antidifferentiate first'],
       [neg(evalPoly([[c,2],[b,1]],hi)),\`the x² term was not divided by 2 when antidifferentiating\`],
       [neg(-s),'the limits were subtracted the wrong way; it is F(top) − F(bottom)'],
       neg(s+R.nz(-8,8))],
    ex:\`Antidifferentiate: F(x) = \${poly(F)}. Then the Fundamental Theorem says evaluate F at the top and subtract F at the bottom: F(\${hi}) − F(0) = \${neg(evalPoly(F,hi))} − \${neg(evalPoly(F,0))} = \${neg(s)}. That's the signed area under the curve.\`};
},
uSub(){
  const n=R.i(2,4), a=R.i(1,5);
  return {topic:'u-Substitution',
    q:\`∫ 2x(x² + \${a})\${sup(n)} dx = ?\`,
    a:\`\${frac(1,n+1)}(x² + \${a})\${sup(n+1)} + C\`,
    d:[[\`\${frac(1,n)}(x² + \${a})\${sup(n)} + C\`,'the power was never raised by one'],
       [\`2x(x² + \${a})\${sup(n+1)} + C\`,'the 2x was left in place, but it is exactly the du that gets consumed'],
       [\`(x² + \${a})\${sup(n+1)} + C\`,'the division by the new power is missing'],
       \`\${frac(1,n+1)}(x² + \${a})\${sup(n)} + C\`],
    ex:\`Let u = x² + \${a}; then du = 2x dx, which is exactly the rest of the integrand. The problem becomes ∫u\${sup(n)} du = u\${sup(n+1)}/\${n+1}. Substitute back to get \${frac(1,n+1)}(x² + \${a})\${sup(n+1)} + C.\`};
},
intTrig(){
  const k=R.i(2,6);
  const which=R.pick(['sin','cos']);
  const a = which==='sin' ? \`−\${frac(1,k)}cos(\${k}x) + C\` : \`\${frac(1,k)}sin(\${k}x) + C\`;
  return {topic:'Integrating Trig',
    q:\`∫ \${which}(\${k}x) dx = ?\`,
    a,
    d:[[which==='sin'?\`\${frac(1,k)}cos(\${k}x) + C\`:\`−\${frac(1,k)}sin(\${k}x) + C\`,'the sign is wrong: ∫sin = −cos and ∫cos = +sin'],
       [which==='sin'?\`−\${k}cos(\${k}x) + C\`:\`\${k}sin(\${k}x) + C\`,\`multiplied by \${k} instead of divided — integrating undoes the chain rule, so you divide\`],
       [\`\${which}(\${k}x) + C\`,'integrating swaps sin and cos; the function cannot come back unchanged'],
       \`−\${which}(\${k}x) + C\`],
    ex:\`Antiderivatives run the derivative rules backwards: ∫sin = −cos, ∫cos = sin. Because the inside is \${k}x you must also divide by \${k} to undo the chain rule. Answer: \${a}.\`};
},
intExp(){
  const k=R.i(2,6);
  return {topic:'Integrating eˣ',
    q:\`∫ e<sup>\${k}x</sup> dx = ?\`,
    a:\`\${frac(1,k)}e<sup>\${k}x</sup> + C\`,
    d:[[\`e<sup>\${k}x</sup> + C\`,\`the \${k} from the inner function was never divided out\`],
       [\`\${k}e<sup>\${k}x</sup> + C\`,\`multiplied by \${k} instead of divided — that is what differentiating does\`],
       [\`\${frac(1,k+1)}e<sup>\${k+1}x</sup> + C\`,'the exponent was raised as if this were the power rule; exponentials keep their exponent'],
       [\`x·e<sup>\${k}x</sup> + C\`,'multiplying by x is what you do for a constant, not for an exponential']],
    ex:\`Differentiating e<sup>\${k}x</sup> multiplies by \${k}, so integrating must divide by \${k}. Check by differentiating the answer: \${frac(1,k)}·\${k}e<sup>\${k}x</sup> = e<sup>\${k}x</sup>. ✓\`};
},
area(){
  const a=R.i(2,4);
  const s=a*a*a/3;
  const nice = Number.isInteger(s) ? String(s) : frac(a*a*a,3);
  return {topic:'Area Under a Curve',
    q:\`Area between y = x² and the x-axis from 0 to \${a}?\`,
    a:nice,
    d:[[String(a*a*a),'the antiderivative x³/3 was used without dividing by 3'],
       [frac(a*a,2),'that is the area under y = x, not y = x²'],
       [frac(a*a*a,2),'divided by 2 instead of 3 — the antiderivative of x² is x³/3'],
       String(a*a*a*2)],
    ex:\`Area = ∫₀\${sup(a)} x² dx = [x³/3]₀\${sup(a)} = \${a}³/3 = \${a*a*a}/3. Notice it's a third of the \${a}×\${a*a} bounding rectangle — the parabola leaves two thirds empty.\`};
},

/* ---------- Realm 5 : mixed mastery ---------- */
secondDeriv(){
  const t=[[R.nz(1,4),4],[R.nz(-5,5),3],[R.nz(-6,6),2],[R.i(-9,9),1]];
  const d1=dPoly(t), d2=dPoly(d1);
  return {topic:'Second Derivative',
    q:\`f(x) = \${poly(t)}<br>f″(x) = ?\`,
    a:poly(d2),
    d:[[poly(d1),'that is the first derivative — differentiate once more'],
       [poly(dPoly(d2)),'that is the third derivative — one differentiation too many'],
       [poly(t),'that is the original function, undifferentiated'],
       poly(d1.map(([c,p])=>[c*2,p]))],
    ex:\`Differentiate twice. f′(x) = \${poly(d1)}, then f″(x) = \${poly(d2)}. The second derivative measures concavity — positive means the curve bends upward like a bowl.\`};
},
critical(){
  const r1=R.nz(-4,4);
  let r2=R.nz(-4,4), guard=0;
  while((r2===r1 || r2===0) && guard++<30) r2=R.nz(-4,4);
  if(r2===r1||r2===0) r2 = r1===3?-3:3;
  const a=Math.min(r1,r2), b=Math.max(r1,r2);
  return {topic:'Critical Points',
    q:\`f′(x) = 3(x \${a<0?'+':'−'} \${Math.abs(a)})(x \${b<0?'+':'−'} \${Math.abs(b)})<br>Where are the critical points?\`,
    a:\`x = \${neg(a)} and x = \${neg(b)}\`,
    d:[[\`x = \${neg(-a)} and x = \${neg(-b)}\`,'the signs are flipped — a factor (x − 3) vanishes at x = 3, not x = −3'],
       ['x = 0 only','a product is zero wherever any factor is zero, and neither factor here vanishes at 0'],
       [\`x = \${neg(a+b)}\`,'the two roots were added together instead of being read off separately'],
       [\`x = 3 and x = \${neg(a*b)}\`,'the 3 out front is a coefficient, not a root — it never vanishes']],
    ex:\`Critical points are where the derivative is zero (or fails to exist). A product is zero when a factor is zero, so x = \${neg(a)} and x = \${neg(b)}. These are the candidates for peaks and valleys of f.\`};
},
partial(){
  const a=R.nz(2,5), b=R.nz(2,5), c=R.nz(-6,6);
  const sgn=c<0?'−':'+', ac=Math.abs(c);
  return {topic:'Partial Derivative',
    q:\`f(x,y) = \${a}x²y \${sgn} \${ac}xy\${sup(3)}<br>∂f/∂x = ?\`,
    a:\`\${2*a}xy \${sgn} \${ac}y\${sup(3)}\`,
    d:[[\`\${a}x² \${sgn} \${Math.abs(3*c)}xy²\`,'that differentiated with respect to y instead of x'],
       [\`\${2*a}xy \${sgn} \${Math.abs(3*c)}xy²\`,'the first term is right, but the second was differentiated with respect to y'],
       [\`\${2*a}x \${sgn} \${ac}y\${sup(3)}\`,'the y was dropped from the first term — y is held constant, not set to zero'],
       [\`\${a}x²y \${sgn} \${ac}y\${sup(3)}\`,'the first term was never differentiated at all']],
    ex:\`Differentiate with respect to x and treat y as a frozen constant. \${a}x²y → \${2*a}xy, and \${neg(c)}xy³ → \${neg(c)}y³ (the x had power 1). This is the bridge from calculus to gradients, and gradients are how machines learn.\`};
},

};

/* ------------------------------ topic metadata --------------------------- */
const TOPIC_LABEL = {
  vecAdd:'Vector Addition', vecScale:'Scalar Multiplication', vecCombo:'Linear Combinations',
  dot:'Dot Product', mag:'Vector Length', orth:'Orthogonality',
  matVec:'Matrix × Vector', det2:'2×2 Determinant', transpose:'Transpose',
  matMul:'Matrix Multiplication', trace:'Trace', solve2:'Linear Systems',
  inv2:'Matrix Inverse', det3:'3×3 Determinant', cross:'Cross Product',
  rank:'Linear Independence', eigen2:'Eigenvalues', proj:'Projection',
  limPoly:'Limits by Substitution', limRational:'Limits (0/0)', limInf:'Limits at Infinity',
  powerRule:'Power Rule', evalDeriv:'Derivative at a Point', trigDeriv:'Trig Derivatives',
  expLog:'e and ln Derivatives', productRule:'Product Rule', quotient:'Quotient Rule',
  chainRule:'Chain Rule', tangent:'Tangent Lines',
  indefPower:'Indefinite Integrals', defPoly:'Definite Integrals', uSub:'u-Substitution',
  intTrig:'Integrating Trig', intExp:'Integrating eˣ', area:'Area Under Curves',
  secondDeriv:'Second Derivatives', critical:'Critical Points', partial:'Partial Derivatives'
};

/* ------------------------------- mastery --------------------------------- */
/* Per-topic mastery drives three things: which topic comes up next, how hard
   the problem is, and what the Chronicle reports. The model is a plain
   exponential moving average of recent outcomes plus a spaced-repetition
   interval that stretches as a topic becomes solid.

   A record is {c, w, m, seen, last}: lifetime correct/wrong for reporting,
   mastery m in [0,1], and \`last\` = the value of qCount when the topic was
   last asked.                                                              */
const Mastery = {
  rec(key){
    const t=Game.s.topicStats;
    return t[key] || (t[key]={c:0,w:0,m:0,seen:0,last:-999});
  },
  update(key, ok){
    const r=this.rec(key);
    const was=r.m;
    r.seen++;
    if(ok) r.c++; else r.w++;
    const alpha = r.seen<4 ? 0.45 : 0.25;      // adapt fast at first, settle later
    r.m = clamp(r.m + alpha*((ok?1:0) - r.m), 0, 1);
    r.last = Game.s.qCount;
    // Crossing into "solid" is the moment worth celebrating: it is real learning.
    // A latch rather than an edge test — the crossing and the minimum-exposure
    // gate can otherwise be satisfied on different answers and never coincide.
    let justMastered=false;
    if(r.m>=0.85 && r.seen>=5 && !r.mastered){ r.mastered=1; justMastered=true; }
    else if(r.m<0.6) r.mastered=0;            // it can be lost, and re-earned
    return {mastered:justMastered, was};
  },
  // How many questions should pass before a topic is worth revisiting.
  dueIn(r){ return 3 + Math.round(r.m*r.m*22); },
  overdue(key){
    const r=Game.s.topicStats[key];
    if(!r || !r.seen) return true;
    return (Game.s.qCount - r.last) >= this.dueIn(r);
  },
  weight(key){
    const r=Game.s.topicStats[key];
    if(!r || !r.seen) return 5;                          // unseen: introduce it
    const elapsed = Game.s.qCount - r.last;
    if(elapsed < 2) return 0.05;                         // never ask twice in a row
    const need = Math.pow(1-r.m, 2)*4 + 0.3;             // weak topics dominate
    const due  = Math.min(elapsed/this.dueIn(r), 2.5);   // overdue topics resurface
    return need * (0.4 + due);
  },
  pick(pool){
    if(!pool.length) return null;
    if(!Game.s) return R.pick(pool);
    const ws=pool.map(k=>this.weight(k));
    let t=ws.reduce((a,b)=>a+b,0)*R._r();
    for(let i=0;i<pool.length;i++){ t-=ws[i]; if(t<=0) return pool[i]; }
    return pool[pool.length-1];
  },
  // Ease off where a player is struggling; push harder where they are solid.
  adjustDiff(key, base){
    const r=Game.s&&Game.s.topicStats[key];
    if(!r || r.seen<3) return Math.min(base,2);          // go gently on new material
    if(r.m < 0.45) return 1;
    if(r.m > 0.85) return clamp(base+1,1,3);
    return base;
  },
  // Is this a weak topic being deliberately brought back?
  isReview(key){
    const r=Game.s&&Game.s.topicStats[key];
    return !!(r && r.seen>=3 && r.m<0.6);
  },
  label(m){ return m>=0.85?'solid' : m>=0.6?'steady' : m>=0.35?'shaky' : 'weak'; },
  colour(m){ return m>=0.85?'var(--green)' : m>=0.6?'var(--gold)' : 'var(--red)'; },
  all(){
    return Object.keys(TOPIC_LABEL)
      .map(k=>({k, r:Game.s.topicStats[k]}))
      .filter(x=>x.r && x.r.seen>0);
  },
  weakest(n){
    return this.all().sort((a,b)=>a.r.m-b.r.m).slice(0,n).map(x=>x.k);
  },
  dueList(){
    return this.all().filter(x=>this.overdue(x.k)).map(x=>x.k);
  }
};

/* --------------------------- tome (lesson pages) ------------------------- */
const TOME = [
 {t:'⚔️ Vectors are arrows with bookkeeping',
  b:'A vector like ⟨3, −2⟩ is an instruction: go 3 right, 2 down. Adding vectors means following one instruction then the other. Multiplying by a scalar stretches the arrow (and flips it if the scalar is negative). Its length comes straight from Pythagoras: ‖⟨3,−4⟩‖ = √(9+16) = 5.'},
 {t:'🎯 The dot product measures agreement',
  b:'u·v multiplies matching components and adds them up, producing a single number. Big and positive means the arrows point roughly the same way; negative means roughly opposite; exactly zero means perpendicular. That last case is the workhorse — "perpendicular" and "dot product is zero" are the same sentence in two languages.'},
 {t:'🛡️ A matrix is a machine that moves space',
  b:'Multiplying a matrix by a vector transforms that vector — rotating, stretching, shearing, or reflecting it. To compute it, dot each row of the matrix with the vector. Multiplying two matrices means doing one transformation after the other, which is why order matters: AB is usually not BA.'},
 {t:'📐 The determinant is the area factor',
  b:'For a 2×2 matrix, det = ad − bc. It tells you how much the transformation scales areas. A determinant of 3 triples areas; a determinant of −1 flips orientation without changing size; a determinant of 0 collapses the plane onto a line, destroying information — which is exactly why such matrices have no inverse.'},
 {t:'👑 Eigenvectors are the directions that survive',
  b:'Most vectors get knocked off their line when a matrix acts on them. An eigenvector is a rare direction that stays on its own line, only stretched by a factor λ — the eigenvalue. Find them by solving det(A − λI) = 0. For a triangular matrix the eigenvalues are simply the diagonal entries.'},
 {t:'🌫️ A limit is where a function is headed',
  b:'lim(x→a) f(x) asks what value f approaches near a — not necessarily what it equals at a. For continuous things like polynomials you can just substitute. When substitution gives 0/0 the expression is hiding a cancellation: factor, cancel, then substitute. That single trick powers the entire definition of the derivative.'},
 {t:'📈 The derivative is instantaneous change',
  b:'f′(x) is the slope of the tangent line — how fast f changes right now. The power rule handles most of it: bring the exponent down, drop it by one. Then three combining rules: product (f′g + fg′), quotient ((f′g − fg′)/g²), and chain (outside derivative × inside derivative). The chain rule is the one people forget.'},
 {t:'🏺 The integral accumulates',
  b:'An integral adds up infinitely many infinitesimal slices, which geometrically is the area under a curve. Antidifferentiation reverses the power rule: raise the power, divide by the new power, add C. The Fundamental Theorem then ties both halves of calculus together: ∫ₐᵇ f = F(b) − F(a).'},
 {t:'🔗 Where the two subjects meet',
  b:'Take a function of several variables and differentiate it with respect to each one in turn, holding the others still. Stack those partial derivatives into a vector and you have the gradient — a vector that points in the direction of steepest increase. Linear algebra supplies the vector, calculus supplies the slopes. Every neural network on Earth is trained by walking downhill along that vector.'}
];

/* ------------------------------- content --------------------------------- */
const WEAPONS = [
  {id:'w0', nm:'Rusted Trainer',       ic:'🗡️', dmg:9,  crit:.05, cost:0,    ds:'A blunt practice blade. It has seen better centuries.'},
  {id:'w1', nm:'Iron Shortsword',      ic:'⚔️', dmg:14, crit:.08, cost:60,   ds:'Honest steel, honestly sharpened.'},
  {id:'w2', nm:'Vector Saber',         ic:'🗡️', dmg:20, crit:.10, cost:150,  ds:'Strikes along the direction of greatest harm.'},
  {id:'w3', nm:'Determinant Cleaver',  ic:'🪓', dmg:27, crit:.12, cost:300,  ds:'Scales its damage by the area it sweeps.'},
  {id:'w4', nm:'Gradient Halberd',     ic:'🔱', dmg:35, crit:.15, cost:520,  ds:'Always finds the steepest path into armour.'},
  {id:'w5', nm:'Eigenblade',           ic:'⚔️', dmg:45, crit:.20, cost:850,  ds:'Cuts only along directions that do not turn.'},
  {id:'w6', nm:'Integral Greatsword',  ic:'🗡️', dmg:58, crit:.24, cost:1400, ds:'Accumulates every wound it has ever dealt.'}
];
const ARMORS = [
  {id:'a0', nm:'Peasant Tunic',      ic:'👕', def:0,  hp:0,  cost:0,    ds:'Cloth. Purely decorative in a fight.'},
  {id:'a1', nm:'Leather Jerkin',     ic:'🥋', def:2,  hp:10, cost:70,   ds:'Boiled leather, cheap and cheerful.'},
  {id:'a2', nm:'Chainmail Hauberk',  ic:'🛡️', def:4,  hp:20, cost:170,  ds:'Thousands of tiny rings, each doing its part.'},
  {id:'a3', nm:'Orthogonal Plate',   ic:'🛡️', def:7,  hp:35, cost:340,  ds:'Deflects blows at perfect right angles.'},
  {id:'a4', nm:'Identity Aegis',     ic:'🛡️', def:11, hp:55, cost:620,  ds:'Leaves you exactly as you were.'},
  {id:'a5', nm:'Laplace Bulwark',    ic:'🛡️', def:16, hp:80, cost:1050, ds:'Expands to meet whatever strikes it.'}
];
const ITEMS = {
  potion:{nm:'Healing Draught', ic:'🧪', cost:40,  ds:'Restores 45% of your maximum health.'},
  insight:{nm:"Sage's Insight",  ic:'🔮', cost:55,  ds:'Burns away two wrong answers.'},
  rage:{nm:'Berserker Rune',    ic:'🔥', cost:70,  ds:'Your next correct strike deals 2.5× damage.'},
  feather:{nm:'Phoenix Feather',ic:'🪶', cost:200, ds:'Automatically revives you once at half health.'}
};

const REALMS = [
  {nm:'Vale of Vectors', col:'#57cc7a', sky:['#1e3b2c','#0d1a14'],
   bg:{key:'vale', seed:11, sky:['#1d4a34','#123021','#0a1a12'],
       far:'crags', farCol:'#11311f', near:'conifers', nearCol:'#07180f',
       ground:['#1c3626','#08130d'], rim:'rgba(160,255,190,.16)', haze:'rgba(14,42,29,.82)',
       glow:'#dff7e2', weather:'fireflies', accent:'#a8ffbe'},
   pool:['vecAdd','vecScale','dot','mag','vecCombo','orth'],
   foes:[
     {nm:'Meadow Slime', art:'slime', hp:52,  atk:9,  gold:22, xp:12, col:'#6fd39a'},
     {nm:'Bramble Goblin',art:'goblin',hp:78, atk:12, gold:34, xp:20, col:'#8bd46a'},
     {nm:'Thicket Brute', art:'goblin',hp:104,atk:15, gold:46, xp:28, col:'#4fae74'},
     {nm:'The Vector Wyrm',art:'dragon',hp:165,atk:20,gold:110,xp:70, col:'#39c47a', boss:true}
   ]},
  {nm:'Matrix Marches', col:'#5aa9e6', sky:['#1b2c47','#0b1220'],
   bg:{key:'marches', seed:23, sky:['#22405f','#152740','#080f1a'],
       far:'crags', farCol:'#13263e', near:'towers', nearCol:'#091524',
       ground:['#182c44','#070d16'], rim:'rgba(150,200,255,.16)', haze:'rgba(12,26,44,.82)',
       glow:'#dbe9ff', weather:'rain', accent:'#9fc4e8'},
   pool:['matVec','det2','transpose','matMul','trace','solve2'],
   foes:[
     {nm:'Rank-One Skeleton', art:'skeleton',hp:120,atk:18, gold:52, xp:34, col:'#cfe3f5'},
     {nm:'Row Reducer',       art:'golem',   hp:150,atk:22, gold:66, xp:44, col:'#6f9ed6'},
     {nm:'Shear Sentinel',    art:'skeleton',hp:180,atk:26, gold:80, xp:52, col:'#9ecbf0'},
     {nm:'The Determinant Golem',art:'golem',hp:270,atk:33, gold:190,xp:120,col:'#4a7fc4', boss:true}
   ]},
  {nm:'Cliffs of Change', col:'#f2c14e', sky:['#4a2f1c','#180f0a'],
   bg:{key:'cliffs', seed:37, sky:['#5f3818','#38200f','#150b06'],
       far:'crags', farCol:'#3c2212', near:'crags', nearCol:'#20110a',
       ground:['#3a2415','#120a05'], rim:'rgba(255,200,130,.18)', haze:'rgba(46,26,13,.82)',
       glow:'#ffe6bd', weather:'embers', accent:'#ffb163'},
   pool:['limPoly','limRational','limInf','powerRule','evalDeriv','trigDeriv','expLog','tangent','productRule'],
   foes:[
     {nm:'Asymptote Wisp',  art:'wisp',  hp:190,atk:28, gold:88, xp:60, col:'#ffe08a'},
     {nm:'Secant Harpy',    art:'harpy', hp:225,atk:33, gold:104,xp:72, col:'#f0a94e'},
     {nm:'Slope Stalker',   art:'wisp',  hp:260,atk:38, gold:120,xp:84, col:'#ffd166'},
     {nm:'The Tangent Wraith',art:'wraith',hp:390,atk:47,gold:280,xp:190,col:'#e8b13a', boss:true}
   ]},
  {nm:'Integral Abyss', col:'#a06bd6', sky:['#2c1b44','#0e0817'],
   bg:{key:'abyss', seed:53, sky:['#37234f','#1f1333','#0b0715'],
       far:'spires', farCol:'#261644', near:'spires', nearCol:'#140b26',
       ground:['#271840','#0a0614'], rim:'rgba(200,160,255,.17)', haze:'rgba(26,15,44,.82)',
       glow:'#e6d5ff', weather:'ash', accent:'#c9b6e8'},
   pool:['indefPower','defPoly','uSub','intTrig','intExp','area','chainRule','quotient'],
   foes:[
     {nm:'Riemann Shade',   art:'wraith',hp:290,atk:42, gold:130,xp:100, col:'#c39af0'},
     {nm:'Abyssal Chimera', art:'dragon',hp:340,atk:48, gold:155,xp:120, col:'#9a5fd4'},
     {nm:'Constant of Dread',art:'wisp', hp:380,atk:54, gold:175,xp:135, col:'#b58af0'},
     {nm:'The Lich of Limits',art:'lich',hp:540,atk:66, gold:400,xp:300, col:'#8e4ed6', boss:true}
   ]},
  {nm:'Eigen Citadel', col:'#e5484d', sky:['#43202a','#150a0e'],
   bg:{key:'citadel', seed:71, sky:['#53232c','#2e1219','#12070a'],
       far:'crags', farCol:'#351621', near:'keep', nearCol:'#1c0b12',
       ground:['#361a22','#100608'], rim:'rgba(255,170,180,.17)', haze:'rgba(40,16,22,.82)',
       glow:'#ffdde1', weather:'snow', accent:'#ffe9ec'},
   pool:['inv2','det3','cross','rank','eigen2','proj','secondDeriv','critical','partial','solve2','chainRule'],
   foes:[
     {nm:'Basis Knight',    art:'knightfoe',hp:420,atk:58, gold:200,xp:170, col:'#f08a8d'},
     {nm:'Nullspace Drake', art:'dragon',   hp:480,atk:66, gold:235,xp:200, col:'#d4585c'},
     {nm:'Spectral Champion',art:'knightfoe',hp:540,atk:74,gold:270,xp:230, col:'#ff9ea1'},
     {nm:'The Eigen Dragon',art:'dragon',   hp:820,atk:92, gold:650,xp:520, col:'#e5484d', boss:true}
   ]}
];

/* -------------------------------- state ---------------------------------- */
const SAVE_KEY = 'eigenrealm.v1';
const Game = {
  s:null,
  fresh(){
    return {
      hp:100, maxHp:100, gold:0, xp:0, lvl:1,
      weapon:'w0', armor:'a0',
      owned:{w0:1,a0:1},
      items:{potion:2, insight:1, rage:0, feather:0},
      cleared:{},          // "realm:index" -> true
      realm:0,
      stats:{wins:0, correct:0, wrong:0, best:0},
      qCount:0,            // questions answered ever; the clock for spaced repetition
      arenaBest:0,         // deepest arena wave reached
      streak:{days:0,last:null},   // consecutive days practised
      bounties:[],         // three rotating goals
      daily:null,          // daily skirmish scores
      titles:{},           // earned milestone ids
      topicStats:{}        // topic -> {c, w, m, seen, last}  (see Mastery)
    };
  },
  load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);
      if(raw){ this.s=Object.assign(this.fresh(),JSON.parse(raw)); this.migrate(); return true; }
    }catch(e){}
    return false;
  },
  // Older saves stored only {c,w}; seed the mastery model from that history.
  migrate(){
    const t=this.s.topicStats||(this.s.topicStats={});
    let total=0;
    for(const k of Object.keys(t)){
      const r=t[k];
      r.c=r.c||0; r.w=r.w||0;
      if(typeof r.seen!=='number') r.seen=r.c+r.w;
      if(typeof r.m!=='number')    r.m = r.seen? r.c/r.seen : 0;
      if(typeof r.last!=='number') r.last=-999;
      total+=r.seen;
    }
    // In normal play qCount and the sum of \`seen\` advance together, so a
    // shortfall means this save predates the mastery model.
    if(typeof this.s.qCount!=='number' || this.s.qCount<total) this.s.qCount=total;
  },
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); }catch(e){} },
  hardReset(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} location.reload(); },
  start(){ this.s=this.fresh(); this.touchStreak(); this.save(); UI.go('s-map'); },
  rest(){
    const cost = 25 + this.s.lvl*5;
    if(this.s.hp>=this.s.maxHp){ UI.toast('You are already at full health.'); return; }
    if(this.s.gold<cost){ UI.toast(\`A night's camp costs \${cost} gold.\`); return; }
    this.s.gold-=cost; this.s.hp=this.s.maxHp; this.save(); UI.renderMap();
    UI.toast(\`🔥 Rested by the fire. Full health for \${cost} gold.\`);
  },
  // Returns the new streak length if today is a fresh day, else null.
  touchStreak(){
    const st=this.s.streak||(this.s.streak={days:0,last:null});
    const today=dayKey(new Date());
    if(st.last===today) return null;
    const yest=dayKey(new Date(Date.now()-864e5));
    st.days = (st.last===yest) ? st.days+1 : 1;
    st.last = today;
    this.save();
    return st.days;
  },
  weapon(){ return WEAPONS.find(w=>w.id===this.s.weapon); },
  armor(){ return ARMORS.find(a=>a.id===this.s.armor); },
  maxHp(){
    const base = 100 + (this.s.lvl-1)*18 + this.armor().hp;
    const mul = (typeof Arena!=='undefined' && Arena.active) ? Arena.mods.hpMul : 1;
    return Math.round(base*mul);
  },
  xpNeeded(){ return 60 + (this.s.lvl-1)*45; },
  gainXp(n){
    this.s.xp += n;
    let ups=0;
    while(this.s.xp >= this.xpNeeded()){ this.s.xp -= this.xpNeeded(); this.s.lvl++; ups++; }
    if(ups){
      const before=this.s.maxHp;
      this.s.maxHp=this.maxHp();
      // A free full heal every level would undo the arena's attrition.
      if(typeof Arena!=='undefined' && Arena.active)
        this.s.hp=Math.min(this.s.maxHp, this.s.hp + Math.max(0,this.s.maxHp-before));
      else this.s.hp=this.s.maxHp;
    }
    return ups;
  },
  recordAnswer(topic, ok){
    if(ok) this.s.stats.correct++; else this.s.stats.wrong++;
    const res=Mastery.update(topic, ok);
    this.s.qCount++;
    return res;
  }
};

/* ------------------------------ preferences ------------------------------ */
const PREF_KEY='eigenrealm.prefs';
const Prefs = {
  d:{sound:true, motion:true, haptics:true},
  load(){
    let stored=null;
    try{ stored=localStorage.getItem(PREF_KEY); if(stored) Object.assign(this.d, JSON.parse(stored)); }catch(e){}
    // Honour the OS setting the first time, before the player has chosen.
    if(!stored && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) this.d.motion=false;
  },
  save(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(this.d)); }catch(e){} },
  toggle(k){ this.d[k]=!this.d[k]; this.save(); if(k==='sound'&&this.d.sound) Sfx.good(0); UI.renderPrefs(); }
};

/* -------------------------------- haptics -------------------------------- */
const Haptic = {
  fire(pattern){
    if(!Prefs.d.haptics || !navigator.vibrate) return;
    try{ navigator.vibrate(pattern); }catch(e){}
  },
  tap(){ this.fire(12); },
  hit(){ this.fire(22); },
  crit(){ this.fire([28,40,55]); },
  hurt(){ this.fire([50,30,50]); },
  win(){ this.fire([30,50,30,50,90]); }
};

/* --------------------------------- audio --------------------------------- */
const Sfx = {
  ctx:null, ok:true,
  init(){ if(!this.ctx){ try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ this.ok=false; } } },
  play(freq, dur, type, vol, when){
    if(!this.ok || !Prefs.d.sound) return;
    this.init(); if(!this.ctx) return;
    try{
      const t=this.ctx.currentTime+(when||0);
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type||'triangle'; o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(vol||.06, t+.012);
      g.gain.exponentialRampToValueAtTime(.0001, t+dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t+dur+.02);
    }catch(e){}
  },
  // A short downward sweep — used for impacts, which need weight rather than pitch.
  thud(f0, f1, dur, type, vol){
    if(!this.ok || !Prefs.d.sound) return;
    this.init(); if(!this.ctx) return;
    try{
      const t=this.ctx.currentTime;
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type||'sawtooth';
      o.frequency.setValueAtTime(f0,t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20,f1), t+dur);
      g.gain.setValueAtTime(vol||.08,t);
      g.gain.exponentialRampToValueAtTime(.0001, t+dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t+dur+.02);
    }catch(e){}
  },
  hit(){ this.thud(320,90,.16,'square',.07); this.play(140,.2,'sawtooth',.05,.02); },
  crit(){ this.thud(520,70,.26,'sawtooth',.10); this.play(1200,.1,'square',.05); this.play(1600,.14,'triangle',.04,.06); },
  hurt(){ this.thud(180,50,.3,'sawtooth',.08); },
  slam(){ this.thud(240,40,.42,'sawtooth',.11); this.play(70,.35,'square',.06,.03); },
  // Rising with the streak: the reward literally climbs as you build a combo.
  good(combo){
    const step=Math.min(combo||0, 14);
    const base=590*Math.pow(1.0595, step);            // one semitone per hit
    this.play(base,.09,'triangle',.055);
    this.play(base*1.5,.13,'triangle',.045,.07);
  },
  bad(){ this.play(220,.14,'square',.05); this.play(165,.22,'square',.045,.1); },
  milestone(){ [0,1,2,3].forEach(i=>this.play(523*Math.pow(1.26,i),.16,'triangle',.06,i*.06)); },
  mastered(){ [523,659,784,1046,1318].forEach((f,i)=>this.play(f,.28,'triangle',.06,i*.08)); },
  win(){ [523,659,784,1046].forEach((f,i)=>this.play(f,.22,'triangle',.06,i*.11)); },
  level(){ [392,523,659,784,1046].forEach((f,i)=>this.play(f,.3,'triangle',.07,i*.09)); },
  coin(n){ const t=(n||0)*.045; this.play(1050,.06,'square',.045,t); this.play(1560,.09,'square',.035,t+.05); },
  chestShake(){ [0,.16,.32,.48].forEach((t,i)=>this.play(150+i*8,.07,'square',.035,t)); },
  chestOpen(){ this.thud(420,120,.2,'square',.06); [784,988,1175].forEach((f,i)=>this.play(f,.2,'triangle',.055,i*.07)); },
  heart(){ this.thud(96,44,.16,'sine',.13); this.thud(80,38,.13,'sine',.09,.19); }
};

/* ------------------------------ celebration ------------------------------ */
/* One place to fire a full-screen callout. Every dopamine beat routes here so
   reduced-motion and sound preferences are honoured in a single spot.       */
const Celebrate = {
  q:[], showing:false,
  banner(text, sub, colour, sound){
    // Keep the queue short: a stale "NICE!" arriving three hits later is worse
    // than dropping it, because the callout should describe the current moment.
    this.q.push({text, sub, colour, sound});
    if(this.q.length>2) this.q.splice(0, this.q.length-2);
    if(!this.showing) this._next();
  },
  _next(){
    const item=this.q.shift();
    if(!item){ this.showing=false; return; }
    this.showing=true;
    const el=document.getElementById('bigBanner');
    el.innerHTML=\`<div class="bnr" style="--bc:\${item.colour||'var(--gold)'}">
        <div class="bt">\${item.text}</div>\${item.sub?\`<div class="bs">\${item.sub}</div>\`:''}</div>\`;
    el.classList.add('on');
    if(item.sound) item.sound();
    const hold = (Prefs.d.motion ? 950 : 620) / (this.q.length?1.6:1);   // catch up when stacked
    setTimeout(()=>{ el.classList.remove('on'); setTimeout(()=>this._next(), 180); }, hold);
  }
};

/* Animated number roll-up — watching a total climb is half the reward. */
function countUp(el, to, dur, prefix){
  if(!el) return;
  if(!Prefs.d.motion){ el.textContent=(prefix||'')+to; return; }
  const t0=performance.now(), from=0;
  (function step(now){
    const k=clamp((now-t0)/dur,0,1);
    const eased=1-Math.pow(1-k,3);
    el.textContent=(prefix||'')+Math.round(from+(to-from)*eased);
    if(k<1) requestAnimationFrame(step);
  })(t0);
}

/* ------------------------------- rendering -------------------------------- */
const cv = document.getElementById('scene');
const cx = cv.getContext('2d');
const W = 800, H = 400;

function fitCanvas(){
  const dpr = Math.min(window.devicePixelRatio||1, 2.5);
  const w = cv.clientWidth || 400;
  cv.width  = Math.round(w*dpr);
  cv.height = Math.round(w*dpr*H/W);
  cx.setTransform(dpr*w/W,0,0,dpr*w/W,0,0);
}
window.addEventListener('resize', fitCanvas);

/* --- small drawing helpers --- */
/* Sprites are drawn twice: once flat and dark at four offsets to lay down an
   outline, then normally on top. SIL carries the outline colour, and every
   fill in the sprite code routes through setFill/paint so the pass works
   without duplicating any of the drawing logic. */
let SIL = null;

function setFill(c){ cx.fillStyle = SIL || c; }
function setStroke(c){ cx.strokeStyle = SIL || c; }

// A vertical gradient derived from the base colour: lit on top, falling to shadow.
function paint(c,y,h){
  if(SIL) return SIL;
  if(typeof c!=='string') return c;
  const g=cx.createLinearGradient(0,y,0,y+h);
  g.addColorStop(0,   shadeCol(c, 30));
  g.addColorStop(.52, c);
  g.addColorStop(1,   shadeCol(c,-34));
  return g;
}
function rr(x,y,w,h,r){ cx.beginPath(); cx.moveTo(x+r,y);
  cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r);
  cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); }
function fillRR(x,y,w,h,r,c){ cx.fillStyle=paint(c,y,h); rr(x,y,w,h,r); cx.fill(); }
function circle(x,y,r,c){
  cx.beginPath(); cx.arc(x,y,r,0,7);
  if(SIL) cx.fillStyle=SIL;
  else{
    const g=cx.createRadialGradient(x-r*.34,y-r*.4,r*.08,x,y,r*1.05);
    g.addColorStop(0, shadeCol(c,46)); g.addColorStop(.55,c); g.addColorStop(1,shadeCol(c,-32));
    cx.fillStyle=g;
  }
  cx.fill();
}
// Flat fill — for particles, where a gradient per dot is wasted work.
function dot(x,y,r,c){ cx.beginPath(); cx.arc(x,y,r,0,7); cx.fillStyle=c; cx.fill(); }
function toRGBA(hex,a){
  const n=parseInt(hex.slice(1),16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
// Soft light. Auras and flames need a falloff to transparent, not a filled disc.
function glow(x,y,r,c,a){
  if(SIL) return;
  const g=cx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,toRGBA(c,a)); g.addColorStop(.45,toRGBA(c,a*.42)); g.addColorStop(1,toRGBA(c,0));
  cx.fillStyle=g; cx.beginPath(); cx.arc(x,y,r,0,7); cx.fill();
}
// Soft contact shadow that spreads as the sprite rises.
function contactShadow(x,y,rx,lift){
  if(SIL) return;
  const k=clamp(1-lift/26,.55,1);
  cx.save(); cx.globalAlpha=.5*k;
  const g=cx.createRadialGradient(x,y,1,x,y,rx*k);
  g.addColorStop(0,'rgba(0,0,0,.95)'); g.addColorStop(.65,'rgba(0,0,0,.45)'); g.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=g;
  cx.beginPath(); cx.ellipse(x,y,rx*k,rx*k*.32,0,0,7); cx.fill();
  cx.restore();
}
// Outline pass, then the real pass.
function withOutline(drawAt){
  SIL='#0a0812';
  const o=2.7;
  for(const [dx,dy] of [[-o,0],[o,0],[0,-o],[0,o]]){
    cx.save(); cx.translate(dx,dy); drawAt(); cx.restore();
  }
  SIL=null;
  drawAt();
}

/* --- knight (the player) --- */
function drawKnight(x,y,s,lunge,hurt,dead){
  cx.save();
  cx.translate(x + lunge*70, y);
  if(dead){ cx.rotate(-0.9); cx.globalAlpha=.55; }
  cx.scale(s,s);

  // shadow
  contactShadow(0,4,36,0);

  const skin = hurt>0 ? '#ff8b8b' : '#c9d3e0';
  const dark = hurt>0 ? '#c05c5c' : '#8b97a8';
  const cape = '#7a2f8f';

  // cape
  cx.save();
  cx.beginPath();
  const sw = Math.sin(Anim.t*3)*6;
  cx.moveTo(-6,-72); cx.quadraticCurveTo(-46+sw,-30,-30+sw,10);
  cx.quadraticCurveTo(-10,4,6,-70);
  setFill(cape); cx.fill();
  cx.restore();

  // legs
  fillRR(-20,-30,15,34,5,dark);
  fillRR(5,-30,15,34,5,dark);
  fillRR(-23,-2,20,9,4,'#4a4038');
  fillRR(3,-2,20,9,4,'#4a4038');

  // body
  fillRR(-24,-78,48,52,10,skin);
  // tabard
  setFill(cape); cx.fillRect(-9,-78,18,50);
  setFill('#f2c14e');
  cx.beginPath(); cx.moveTo(0,-66); cx.lineTo(6,-56); cx.lineTo(0,-46); cx.lineTo(-6,-56); cx.closePath(); cx.fill();
  // pauldrons
  circle(-26,-72,12,dark); circle(26,-72,12,dark);
  circle(-26,-72,7,skin);  circle(26,-72,7,skin);

  // helmet
  fillRR(-19,-118,38,40,13,skin);
  setFill('#1a1622'); cx.fillRect(-14,-106,28,8);
  setFill('#5ad1ff'); cx.fillRect(-12,-104,9,4); cx.fillRect(3,-104,9,4);
  // plume
  cx.beginPath(); cx.moveTo(0,-120);
  cx.quadraticCurveTo(16+Math.sin(Anim.t*4)*4,-136,4,-146);
  cx.quadraticCurveTo(10,-130,-2,-122);
  setFill('#e5484d'); cx.fill();

  // shield (left arm)
  cx.save(); cx.translate(-38,-58); cx.rotate(-0.15);
  cx.beginPath(); cx.moveTo(-14,-20); cx.lineTo(14,-20); cx.lineTo(14,8); cx.quadraticCurveTo(0,24,-14,8); cx.closePath();
  setFill('#3f6bb5'); cx.fill(); cx.lineWidth=3; setStroke('#f2c14e'); cx.stroke();
  setFill('#f2c14e'); cx.font='bold 15px serif'; cx.textAlign='center'; cx.fillText('λ',0,2);
  cx.restore();

  // sword (right arm) — swings with the lunge
  cx.save();
  cx.translate(36,-58);
  cx.rotate(0.22 + lunge*2.2);   // rests clear of the helm, slashes forward
  setFill('#6b5a3e'); cx.fillRect(-4,-6,9,20);          // grip
  setFill('#f2c14e'); cx.fillRect(-13,-10,28,7);        // crossguard
  const g=cx.createLinearGradient(0,-70,0,-8);
  g.addColorStop(0,'#ffffff'); g.addColorStop(.5,'#dfe8f5'); g.addColorStop(1,'#93a3ba');
  setFill(g);
  cx.beginPath(); cx.moveTo(-6,-10); cx.lineTo(6,-10); cx.lineTo(4,-64); cx.lineTo(0,-74); cx.lineTo(-4,-64); cx.closePath(); cx.fill();
  cx.restore();

  cx.restore();
}

/* --- enemies --- */
function drawFoe(x,y,s,art,col,lunge,hurt,dead){
  cx.save();
  cx.translate(x - lunge*70, y);
  if(dead){ cx.rotate(0.9); cx.globalAlpha=.5; }
  cx.scale(s,s);                     // sprites are authored facing left, toward the knight
  const c = hurt>0 ? '#ffffff' : col;
  const bob = Math.sin(Anim.t*2.2)*4;

  contactShadow(0,4,36,Math.abs(bob));
  cx.translate(0,bob);

  const shade = shadeCol(c,-40);

  if(art==='slime'){
    const sq = 1 + Math.sin(Anim.t*3)*.07;
    cx.save(); cx.scale(1/sq, sq);
    cx.beginPath(); cx.moveTo(-42,2);
    cx.quadraticCurveTo(-46,-64,0,-64); cx.quadraticCurveTo(46,-64,42,2);
    cx.closePath(); setFill(c); cx.fill();
    cx.globalAlpha=.35; circle(-14,-40,9,'#fff'); cx.globalAlpha=1;
    circle(-14,-28,6,'#1a1622'); circle(14,-28,6,'#1a1622');
    circle(-15,-30,2.5,'#fff'); circle(13,-30,2.5,'#fff');
    cx.restore();
  }
  else if(art==='goblin'){
    fillRR(-16,-34,13,36,5,shade); fillRR(3,-34,13,36,5,shade);
    fillRR(-24,-74,48,44,12,c);
    // ears
    cx.beginPath(); cx.moveTo(-24,-92); cx.lineTo(-48,-104); cx.lineTo(-24,-78); setFill(c); cx.fill();
    cx.beginPath(); cx.moveTo(24,-92); cx.lineTo(48,-104); cx.lineTo(24,-78); cx.fill();
    fillRR(-20,-108,40,34,11,c);
    circle(-10,-94,5,'#1a1622'); circle(10,-94,5,'#1a1622');
    circle(-11,-95,2,'#f2c14e'); circle(9,-95,2,'#f2c14e');
    setFill('#fff');
    cx.beginPath(); cx.moveTo(-8,-84); cx.lineTo(-4,-76); cx.lineTo(0,-84); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(2,-84); cx.lineTo(6,-76); cx.lineTo(10,-84); cx.closePath(); cx.fill();
    // club
    cx.save(); cx.translate(-32,-58); cx.rotate(0.5 - lunge*2.2);
    setFill('#6b5a3e'); cx.fillRect(-4,-40,8,44); fillRR(-11,-56,22,20,7,'#8b7350'); cx.restore();
  }
  else if(art==='skeleton'){
    setStroke(c); cx.lineWidth=7; cx.lineCap='round';
    cx.beginPath(); cx.moveTo(0,-30); cx.lineTo(-14,2); cx.moveTo(0,-30); cx.lineTo(14,2); cx.stroke();
    cx.beginPath(); cx.moveTo(0,-30); cx.lineTo(0,-76); cx.stroke();
    for(let i=0;i<4;i++){ cx.beginPath(); cx.moveTo(-15,-70+i*11); cx.lineTo(15,-70+i*11); cx.stroke(); }
    cx.beginPath(); cx.moveTo(0,-70); cx.lineTo(-26,-46); cx.moveTo(0,-70); cx.lineTo(26,-46); cx.stroke();
    fillRR(-19,-112,38,36,13,c);
    circle(-9,-96,6,'#1a1622'); circle(9,-96,6,'#1a1622');
    circle(-9,-96,2.5,'#e5484d'); circle(9,-96,2.5,'#e5484d');
    setFill('#1a1622'); cx.fillRect(-8,-84,16,4);
    cx.save(); cx.translate(-30,-56); cx.rotate(0.4-lunge*2.2);
    setFill('#b9c6d6'); cx.fillRect(-3,-58,6,52); cx.fillRect(-12,-14,24,6); cx.restore();
  }
  else if(art==='golem'){
    fillRR(-30,-40,24,44,6,shade); fillRR(6,-40,24,44,6,shade);
    fillRR(-40,-104,80,68,14,c);
    fillRR(-52,-98,16,44,7,shade); fillRR(36,-98,16,44,7,shade);
    setFill('#1a1622'); cx.fillRect(-24,-88,18,9); cx.fillRect(6,-88,18,9);
    circle(-15,-84,4,'#f2c14e'); circle(15,-84,4,'#f2c14e');
    setStroke(shade); cx.lineWidth=3;
    cx.beginPath(); cx.moveTo(-40,-64); cx.lineTo(40,-64); cx.moveTo(0,-104); cx.lineTo(0,-64); cx.stroke();
    setFill('rgba(255,255,255,.15)');
    cx.fillRect(-34,-98,26,26);
  }
  else if(art==='wisp' || art==='wraith'){
    const a=Anim.t*2;
    glow(Math.sin(a)*5, -60+Math.cos(a)*5, 74, c, .5);
    cx.globalAlpha=1;
    cx.beginPath();
    cx.moveTo(-30,-58); cx.quadraticCurveTo(-34,-116,0,-116);
    cx.quadraticCurveTo(34,-116,30,-58);
    cx.quadraticCurveTo(20,-4,0,-14); cx.quadraticCurveTo(-20,-4,-30,-58);
    setFill(c); cx.fill();
    circle(-11,-84,7,'#1a1622'); circle(11,-84,7,'#1a1622');
    circle(-11,-84,3,'#fff'); circle(11,-84,3,'#fff');
    if(art==='wraith'){
      cx.save(); cx.translate(-34,-70); cx.rotate(0.3-lunge*2);
      setStroke('#e8e8ff'); cx.lineWidth=4; cx.beginPath();
      cx.moveTo(0,0); cx.quadraticCurveTo(-24,-30,-8,-58); cx.stroke(); cx.restore();
    }
  }
  else if(art==='harpy'){
    // wings
    cx.save();
    const f=Math.sin(Anim.t*6)*.4;
    [-1,1].forEach(sgn=>{
      cx.save(); cx.translate(sgn*24,-76); cx.rotate(sgn*(0.5+f));
      cx.beginPath(); cx.moveTo(0,0);
      cx.quadraticCurveTo(sgn*54,-30,sgn*66,10);
      cx.quadraticCurveTo(sgn*34,-4,0,20); cx.closePath();
      setFill(shade); cx.fill(); cx.restore();
    });
    cx.restore();
    fillRR(-22,-90,44,58,16,c);
    fillRR(-17,-122,34,34,12,c);
    cx.beginPath(); cx.moveTo(-16,-104); cx.lineTo(-34,-98); cx.lineTo(-16,-94); cx.closePath();
    setFill('#f2c14e'); cx.fill();
    circle(-6,-108,5,'#1a1622'); circle(9,-108,5,'#1a1622');
    setStroke('#f2c14e'); cx.lineWidth=4; cx.lineCap='round';
    cx.beginPath(); cx.moveTo(-9,-32); cx.lineTo(-13,2); cx.moveTo(9,-32); cx.lineTo(13,2); cx.stroke();
  }
  else if(art==='dragon'){
    // wings
    [-1,1].forEach(sgn=>{
      cx.save(); cx.translate(0,-88); cx.rotate(sgn*(0.35+Math.sin(Anim.t*3)*.2));
      cx.beginPath(); cx.moveTo(0,0);
      cx.quadraticCurveTo(sgn*70,-56,sgn*92,-2);
      cx.quadraticCurveTo(sgn*52,-14,0,26); cx.closePath();
      setFill(shade); cx.fill(); cx.restore();
    });
    // tail
    cx.beginPath(); cx.moveTo(26,-24);
    cx.quadraticCurveTo(78,-14,66,-64); cx.quadraticCurveTo(72,-26,26,-8);
    setFill(c); cx.fill();
    fillRR(-28,-38,20,40,6,shade); fillRR(10,-38,20,40,6,shade);
    fillRR(-32,-100,64,64,18,c);
    // belly
    fillRR(-18,-84,36,44,12, shadeCol(c,50));
    // head
    cx.save(); cx.translate(-30,-112);
    fillRR(-26,-24,52,40,14,c);
    cx.beginPath(); cx.moveTo(-26,-6); cx.lineTo(-52,4); cx.lineTo(-26,12); cx.closePath(); setFill(c); cx.fill();
    // horns
    cx.beginPath(); cx.moveTo(6,-24); cx.lineTo(16,-46); cx.lineTo(20,-22); cx.closePath(); setFill('#f2c14e'); cx.fill();
    cx.beginPath(); cx.moveTo(-8,-24); cx.lineTo(-2,-44); cx.lineTo(4,-22); cx.closePath(); cx.fill();
    circle(-10,-8,6,'#1a1622'); circle(-11,-9,2.5,'#f2c14e');
    cx.restore();
  }
  else if(art==='lich'){
    glow(0,-70,82,c,.45);
    cx.globalAlpha=1;
    cx.beginPath(); cx.moveTo(-34,-40); cx.lineTo(-24,-108); cx.lineTo(24,-108); cx.lineTo(34,-40);
    cx.quadraticCurveTo(0,-22,-34,-40); cx.closePath(); setFill(c); cx.fill();
    // hood
    cx.beginPath(); cx.moveTo(-26,-104); cx.quadraticCurveTo(0,-152,26,-104); cx.quadraticCurveTo(0,-118,-26,-104);
    setFill(shade); cx.fill();
    fillRR(-16,-130,32,30,11,'#e8e2f0');
    circle(-7,-116,5,'#1a1622'); circle(7,-116,5,'#1a1622');
    circle(-7,-116,2.5,'#7cf'); circle(7,-116,2.5,'#7cf');
    // staff
    cx.save(); cx.translate(-38,-60); cx.rotate(0.15-lunge*1.6);
    setFill('#4a3a5e'); cx.fillRect(-3,-70,6,86);
    glow(0,-78,26,'#77ccff',.85); circle(0,-78,11,'#7cf'); cx.restore();
  }
  else if(art==='knightfoe'){
    fillRR(-20,-32,16,36,5,shade); fillRR(4,-32,16,36,5,shade);
    fillRR(-26,-80,52,52,11,c);
    circle(-28,-74,12,shade); circle(28,-74,12,shade);
    fillRR(-20,-120,40,42,13,c);
    setFill('#1a1622'); cx.fillRect(-15,-108,30,9);
    setFill('#e5484d'); cx.fillRect(-13,-106,10,5); cx.fillRect(3,-106,10,5);
    cx.beginPath(); cx.moveTo(-6,-122); cx.lineTo(0,-142); cx.lineTo(6,-122); cx.closePath();
    setFill(shade); cx.fill();
    cx.save(); cx.translate(-34,-62); cx.rotate(0.5-lunge*2.3);
    setFill('#6b5a3e'); cx.fillRect(-4,-6,8,18);
    setFill('#c0c8d4'); cx.fillRect(-12,-10,25,6);
    cx.beginPath(); cx.moveTo(-6,-10); cx.lineTo(6,-10); cx.lineTo(0,-70); cx.closePath();
    setFill('#d8e0ec'); cx.fill(); cx.restore();
  }
  cx.restore();
}
function shadeCol(hex,amt){
  const n=parseInt(hex.slice(1),16);
  const r=clamp((n>>16)+amt,0,255), g=clamp(((n>>8)&255)+amt,0,255), b=clamp((n&255)+amt,0,255);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

/* ------------------------------ backgrounds ------------------------------- */
/* Each realm owns a skyline, a ground tint and a weather system. The two
   silhouette layers are painted once into offscreen canvases and then blitted
   with parallax, so the per-frame cost is two draw calls rather than a few
   hundred paths.                                                             */

function seeded(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }

function makeLayer(w,h,fn){
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  fn(c.getContext('2d'), w, h);
  return c;
}

/* --- skyline painters. Each fills from \`base\` downward. --- */
const SKYLINE = {
  conifers(g,w,h,col,rnd,base){
    g.fillStyle=col;
    for(let i=0;i<30;i++){
      const x=rnd()*w, ht=48+rnd()*96, wd=20+rnd()*24;
      g.beginPath(); g.moveTo(x,base-ht*1.34);
      g.lineTo(x+wd*.34,base-ht*.62); g.lineTo(x-wd*.34,base-ht*.62); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x,base-ht);
      g.lineTo(x+wd*.5,base); g.lineTo(x-wd*.5,base); g.closePath(); g.fill();
    }
    g.fillRect(0,base,w,h-base);
  },
  crags(g,w,h,col,rnd,base){
    g.fillStyle=col; g.beginPath(); g.moveTo(0,h);
    let x=0, y=base-40;
    g.lineTo(0,y);
    while(x<w){
      const step=34+rnd()*70;
      x+=step; y=base-30-rnd()*130;
      g.lineTo(x-step*.5, y-rnd()*26);
      g.lineTo(x, y);
    }
    g.lineTo(w,h); g.closePath(); g.fill();
  },
  towers(g,w,h,col,rnd,base){
    g.fillStyle=col;
    for(let i=0;i<7;i++){
      const x=rnd()*w, ht=90+rnd()*110, wd=34+rnd()*26;
      g.fillRect(x,base-ht,wd,ht+(h-base));
      for(let k=0;k<Math.floor(wd/12);k++) g.fillRect(x+k*12, base-ht-9, 7, 9);   // crenellations
      g.beginPath(); g.moveTo(x-7,base-ht-9); g.lineTo(x+wd/2,base-ht-46);
      g.lineTo(x+wd+7,base-ht-9); g.closePath(); g.fill();
    }
    g.fillRect(0,base,w,h-base);
  },
  spires(g,w,h,col,rnd,base){
    g.fillStyle=col;
    for(let i=0;i<14;i++){
      const x=rnd()*w, ht=70+rnd()*150, wd=9+rnd()*16, lean=(rnd()-.5)*26;
      g.beginPath();
      g.moveTo(x-wd/2,base); g.lineTo(x+wd/2,base);
      g.quadraticCurveTo(x+wd/2+lean*.4, base-ht*.6, x+lean, base-ht);
      g.quadraticCurveTo(x-wd/2+lean*.4, base-ht*.6, x-wd/2, base);
      g.closePath(); g.fill();
    }
    g.fillRect(0,base,w,h-base);
  },
  keep(g,w,h,col,rnd,base){
    g.fillStyle=col;
    for(let i=0;i<5;i++){
      const x=rnd()*w, ht=70+rnd()*120, wd=70+rnd()*80;
      g.fillRect(x,base-ht,wd,ht+(h-base));
      for(let k=0;k<Math.floor(wd/18);k++) g.fillRect(x+k*18, base-ht-11, 11, 11);
      const ax=x+wd/2;                                        // gate arch
      g.beginPath(); g.moveTo(ax-13,base); g.lineTo(ax-13,base-26);
      g.arc(ax,base-26,13,Math.PI,0); g.lineTo(ax+13,base); g.closePath();
      g.globalCompositeOperation='destination-out'; g.fill();
      g.globalCompositeOperation='source-over'; g.fillStyle=col;
    }
    g.fillRect(0,base,w,h-base);
  },
  arcs(g,w,h,col,rnd,base){
    g.fillStyle=col;
    const ht=110, n=9, wd=w/n;
    g.fillRect(0,base-ht,w,ht+(h-base));
    g.globalCompositeOperation='destination-out';
    for(let i=0;i<n;i++){
      const ax=i*wd+wd/2;
      g.beginPath(); g.moveTo(ax-wd*.3,base); g.lineTo(ax-wd*.3,base-52);
      g.arc(ax,base-52,wd*.3,Math.PI,0); g.lineTo(ax+wd*.3,base); g.closePath(); g.fill();
    }
    g.globalCompositeOperation='source-over';
    g.fillStyle=col;
    for(let k=0;k<Math.floor(w/22);k++) g.fillRect(k*22, base-ht-10, 13, 10);
  }
};

const BgLayers = {key:null, far:null, near:null};
function buildLayers(bg){
  if(BgLayers.key===bg.key) return;
  const rndF=seeded(bg.seed), rndN=seeded(bg.seed*7+13);
  BgLayers.far  = makeLayer(W,H,(g,w,h)=>SKYLINE[bg.far ](g,w,h,bg.farCol, rndF, H-150));
  BgLayers.near = makeLayer(W,H,(g,w,h)=>SKYLINE[bg.near](g,w,h,bg.nearCol,rndN, H-118));
  BgLayers.key=bg.key;
}
function blit(layer, offset){
  const x=-(offset % W);
  cx.drawImage(layer, x, 0);
  cx.drawImage(layer, x+W, 0);
}

/* -------------------------------- weather --------------------------------- */
const Weather = {
  kind:null, p:[], accent:'#fff',
  set(kind, accent){
    if(this.kind===kind && this.accent===accent) return;
    this.kind=kind; this.accent=accent; this.p=[];
  },
  cap(){ return Prefs.d.motion ? 46 : 0; },
  spawn(){
    const r=Math.random;
    switch(this.kind){
      case 'fireflies': return {x:r()*W, y:H-320+r()*250, vx:(r()-.5)*14, vy:(r()-.5)*10, r:1.6+r()*1.8, ph:r()*7, life:4+r()*5};
      case 'embers':    return {x:r()*W, y:H-90+r()*40,  vx:(r()-.5)*22, vy:-24-r()*40, r:1.2+r()*1.9, ph:r()*7, life:3+r()*3};
      case 'ash':       return {x:r()*W, y:-10,          vx:(r()-.5)*10, vy:12+r()*20,  r:1.1+r()*1.5, ph:r()*7, life:12};
      case 'snow':      return {x:r()*W, y:-10,          vx:(r()-.5)*14, vy:22+r()*26,  r:1.2+r()*1.7, ph:r()*7, life:11};
      case 'rain':      return {x:r()*W*1.3-W*.15, y:-20, vx:-90, vy:430+r()*130, r:1, ph:0, life:2, len:12+r()*10};
      case 'dust':      return {x:r()*W, y:r()*H,        vx:(r()-.5)*8,  vy:-4-r()*8,   r:1+r()*1.6, ph:r()*7, life:6+r()*5};
    }
    return null;
  },
  step(dt){
    const cap=this.cap();
    if(!this.kind || !cap){ if(this.p.length) this.p.length=0; return; }
    while(this.p.length<cap){
      const q=this.spawn(); if(!q) return;
      q.age=Math.random()*q.life;
      // advance along its own path so the field is already populated on the first frame
      const t=Math.random()*3.2;
      q.x+=q.vx*t; q.y+=q.vy*t;
      if(q.y>H) q.y-=H+24;
      if(q.y<-24) q.y+=H+24;
      this.p.push(q);
    }
    for(const q of this.p){
      q.age+=dt;
      q.x+=q.vx*dt; q.y+=q.vy*dt; q.ph+=dt*2.2;
      if(this.kind==='ash'||this.kind==='snow') q.x+=Math.sin(q.ph*.7)*12*dt;
      if(this.kind==='embers') q.vy-=6*dt;
      if(q.age>q.life || q.y>H+16 || q.y<-30 || q.x<-30 || q.x>W+30){
        Object.assign(q, this.spawn(), {age:0});
      }
    }
  },
  draw(){
    if(!this.kind || !this.p.length) return;
    cx.save();
    if(this.kind==='rain'){
      cx.strokeStyle=this.accent; cx.lineWidth=1.3; cx.globalAlpha=.34;
      cx.beginPath();
      for(const q of this.p){ cx.moveTo(q.x,q.y); cx.lineTo(q.x-q.vx*.03, q.y-q.len); }
      cx.stroke(); cx.restore(); return;
    }
    for(const q of this.p){
      const fade=Math.min(1, q.age*2, (q.life-q.age)*2);
      const pulse = this.kind==='fireflies' ? .35+.65*Math.abs(Math.sin(q.ph)) : 1;
      cx.globalAlpha=clamp(fade*pulse*(this.kind==='ash'?.5:.75),0,1);
      if(this.kind==='fireflies'||this.kind==='embers'){
        const a2=cx.globalAlpha; cx.globalAlpha=1;
        glow(q.x,q.y,q.r*5,this.accent,a2*.5);
        cx.globalAlpha=clamp(fade*pulse,0,1);
      }
      dot(q.x,q.y,q.r,this.accent);
    }
    cx.restore();
  }
};

/* ------------------------------ the painter ------------------------------- */
function drawBg(bg){
  bg = bg || REALMS[0].bg;
  // sky
  const g=cx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,bg.sky[0]); g.addColorStop(.58,bg.sky[1]); g.addColorStop(1,bg.sky[2]);
  cx.fillStyle=g; cx.fillRect(0,0,W,H);

  // moon and stars
  if(bg.moon!==false){
    cx.save();
    glow(658,74,86,bg.glow,.22);
    cx.globalAlpha=.6; dot(658,74,33,bg.glow);
    cx.globalAlpha=.12; dot(650,67,24,'#ffffff');
    cx.restore();
  }
  cx.fillStyle='rgba(255,255,255,.55)';
  for(let i=0;i<26;i++){
    const x=(i*151)%W, y=(i*67)%170;
    cx.globalAlpha=(.35+.65*Math.abs(Math.sin(Anim.t*1.2+i)))*.5;
    cx.fillRect(x,y,2,2);
  }
  cx.globalAlpha=1;

  // parallax skylines
  buildLayers(bg);
  blit(BgLayers.far,  Anim.t*2.2);
  blit(BgLayers.near, Anim.t*6.5);

  // horizon haze: separates the skyline from the field the fight happens on
  const hz=cx.createLinearGradient(0,H-190,0,H-100);
  hz.addColorStop(0,'rgba(0,0,0,0)'); hz.addColorStop(1,bg.haze);
  cx.fillStyle=hz; cx.fillRect(0,H-190,W,90);

  // ground — lit enough that sprites and their shadows read against it
  const gy=H-120;
  const gg=cx.createLinearGradient(0,gy,0,H);
  gg.addColorStop(0,bg.ground[0]); gg.addColorStop(1,bg.ground[1]);
  cx.fillStyle=gg; cx.fillRect(0,gy,W,120);
  cx.strokeStyle=bg.rim; cx.lineWidth=2;
  cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(W,gy); cx.stroke();

  // torches
  [90,710].forEach(x=>{
    cx.fillStyle='#3a2c1e'; cx.fillRect(x-4,H-190,8,74);
    const fl=8+Math.sin(Anim.t*8+x)*3;
    cx.save();
    glow(x,H-196,fl*4.2,'#e07b39',.5);
    cx.globalAlpha=.95; dot(x,H-196,fl,'#f2c14e');
    cx.globalAlpha=1;   dot(x,H-198,fl*.5,'#fff3cf');
    cx.restore();
  });

  Weather.draw();
}

/* --- animation driver --- */
const Anim = {
  t:0, raf:null, last:0,
  pl:0, el:0,           // lunge amounts 0..1
  ph:0, eh:0,           // hurt flash timers
  shake:0,
  hitstop:0,            // freeze-frame: the thing that makes a hit feel heavy
  slow:1,               // time scale, dipped for a killing blow
  cam:{z:1, fx:400, fy:230},
  flash:0,
  floats:[], parts:[],
  pending:null,
  reset(){
    this.pl=this.el=this.ph=this.eh=this.shake=0;
    this.hitstop=0; this.slow=1; this.flash=0; this.cam.z=1;
    this.floats=[]; this.parts=[]; this.pending=null;
  },
  // Punch the camera toward a point, then let it drift back.
  punch(x,y,z){ if(!Prefs.d.motion) return; this.cam.fx=x; this.cam.fy=y; this.cam.z=z; },
  freeze(sec){ if(Prefs.d.motion) this.hitstop=Math.max(this.hitstop,sec); },
  float(x,y,txt,col,big){ this.floats.push({x,y,txt,col,life:1.2,big:!!big}); },
  burst(x,y,col,n){
    let count=n||18;
    if(!Prefs.d.motion) count=Math.min(count,6);
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2, sp=60+Math.random()*260;
      this.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-70,life:.5+Math.random()*.5,col,r:2+Math.random()*4});
    }
  },
  // Gold coins arcing off a defeated foe.
  coins(x,y,n){
    const count=Prefs.d.motion?(n||14):4;
    for(let i=0;i<count;i++){
      const a=-Math.PI/2+(Math.random()-.5)*1.7, sp=180+Math.random()*260;
      this.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1+Math.random()*.6,col:'#f2c14e',r:3.5+Math.random()*2.5});
    }
  },
  strike(who, dmg, crit, label, kill){
    // who: 'p' player attacks, 'e' enemy attacks
    this.pending={who,dmg,crit,label,kill,fired:false};
    if(who==='p') this.pl=0.001; else this.el=0.001;
  },
  loop(ts){
    const real = Math.min(.05,(ts-Anim.last)/1000||.016); Anim.last=ts;
    let dt = real;
    if(Anim.hitstop>0){ Anim.hitstop-=real; dt*=0.05; }   // the freeze-frame
    dt *= Anim.slow;
    Anim.t+=dt;
    // camera and time scale ease back to rest
    Anim.cam.z += (1-Anim.cam.z)*Math.min(1, real*5);
    Anim.slow  += (1-Anim.slow )*Math.min(1, real*1.6);
    Anim.flash  = Math.max(0, Anim.flash - real*3.2);
    const fl=document.getElementById('flash');
    if(fl) fl.style.opacity=Anim.flash.toFixed(3);
    // lunges
    const step=(v)=> v>0 ? Math.min(1.0001, v+dt*3.2) : 0;
    if(Anim.pl>0){ Anim.pl=step(Anim.pl); if(Anim.pl>=1) Anim.pl=0; }
    if(Anim.el>0){ Anim.el=step(Anim.el); if(Anim.el>=1) Anim.el=0; }
    Anim.ph=Math.max(0,Anim.ph-dt); Anim.eh=Math.max(0,Anim.eh-dt);
    Anim.shake=Math.max(0,Anim.shake-dt*2.6);

    // impact moment
    const P=Anim.pending;
    if(P && !P.fired){
      const prog = P.who==='p' ? Anim.pl : Anim.el;
      if(prog>=.42){
        P.fired=true;
        const tx = P.who==='p' ? 560 : 250;
        const slam = P.label==='SLAM';
        Anim.burst(tx, H-190, P.crit?'#f2c14e':'#ffffff', P.crit?34:18);
        Anim.float(tx, H-230, (P.label?P.label+' ':(P.crit?'CRIT ':''))+'-'+P.dmg,
                   P.who==='p'?'#ffd166':'#ff8b8b', P.crit);
        Anim.shake = (P.crit?1.5:.9) * (Prefs.d.motion?1:.35);
        Anim.freeze(P.crit?.13:.06);
        Anim.punch(tx, H-200, P.crit?1.14:1.05);
        if(P.crit) Anim.flash=.55;
        if(P.kill){                                   // the killing blow gets the full treatment
          Anim.slow=Prefs.d.motion?0.28:1;
          Anim.freeze(.2); Anim.punch(tx,H-200,1.3);
          Anim.flash=.8; Anim.shake=1.8*(Prefs.d.motion?1:.35);
          Anim.coins(tx,H-190,16);
        }
        if(P.who==='p'){
          Anim.eh=.35;
          if(P.crit){ Sfx.crit(); Haptic.crit(); } else { Sfx.hit(); Haptic.hit(); }
        } else {
          Anim.ph=.35; Anim.flash=Math.max(Anim.flash,slam?.5:.28);
          if(slam) Sfx.slam(); else Sfx.hurt();
          Haptic.hurt();
        }
      }
    }

    // particles / floats
    Weather.step(dt);
    Anim.parts.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=620*dt; p.life-=dt; });
    Anim.parts=Anim.parts.filter(p=>p.life>0);
    Anim.floats.forEach(f=>{ f.y-=52*dt; f.life-=dt; });
    Anim.floats=Anim.floats.filter(f=>f.life>0);

    Anim.draw();
    Anim.raf=requestAnimationFrame(Anim.loop);
  },
  draw(){
    const B=Battle;
    cx.save();
    if(Anim.cam.z!==1){
      cx.translate(Anim.cam.fx, Anim.cam.fy);
      cx.scale(Anim.cam.z, Anim.cam.z);
      cx.translate(-Anim.cam.fx, -Anim.cam.fy);
    }
    if(Anim.shake>0){ cx.translate((Math.random()-.5)*Anim.shake*16,(Math.random()-.5)*Anim.shake*16); }
    drawBg(B.realm ? B.realm.bg : null);
    const gy = H-120;
    const pLunge=Anim.pl>0?Math.sin(Anim.pl*Math.PI):0;
    withOutline(()=>drawKnight(205, gy, 1.32, pLunge, Anim.ph, B.over==='lose'));
    if(B.foe && B.slamNext && !B.over){
      const r=1+Math.sin(Anim.t*6)*.5;
      cx.save(); cx.globalAlpha=.25+r*.2; cx.strokeStyle='#e5484d'; cx.lineWidth=3+r*2;
      cx.beginPath(); cx.ellipse(605, gy-70, 74+r*8, 96+r*8, 0, 0, 7); cx.stroke(); cx.restore();
    }
    if(B.foe){
      const eLunge=Anim.el>0?Math.sin(Anim.el*Math.PI):0;
      withOutline(()=>drawFoe(605, gy, B.foe.boss?1.55:1.28, B.foe.art, B.foe.col,
                              eLunge, Anim.eh, B.over==='win'));
    }
    // particles
    Anim.parts.forEach(p=>{ cx.globalAlpha=clamp(p.life,0,1); dot(p.x,p.y,p.r,p.col); });
    cx.globalAlpha=1;
    // floats
    Anim.floats.forEach(f=>{
      cx.globalAlpha=clamp(f.life,0,1);
      cx.font=\`bold \${f.big?40:30}px "Trebuchet MS",sans-serif\`;
      cx.textAlign='center'; cx.lineWidth=6; cx.strokeStyle='rgba(0,0,0,.7)';
      cx.strokeText(f.txt,f.x,f.y); cx.fillStyle=f.col; cx.fillText(f.txt,f.x,f.y);
    });
    cx.globalAlpha=1;
    cx.restore();
  },
  go(){ if(!this.raf){ this.last=performance.now(); this.raf=requestAnimationFrame(this.loop); } },
  stop(){ if(this.raf){ cancelAnimationFrame(this.raf); this.raf=null; } }
};

/* ------------------------------- questions -------------------------------- */
/* A distractor is either a bare string or [text, "the mistake it represents"].
   The tagged ones let the game name the error a player actually made. */
function buildQuestion(key, diff){
  const gen = GEN[key];
  const p = gen(diff||1);
  const why = {};
  const ds = (p.d||[]).map(x=>{
    if(Array.isArray(x)){ why[x[0]] = x[1]; return x[0]; }
    return x;
  });
  const ch=[p.a];
  for(const x of R.shuffle(ds)) if(ch.length<4 && !ch.includes(x)) ch.push(x);
  let guard=0;
  while(ch.length<4 && guard++<40){ const x=String(R.i(-25,25)); if(!ch.includes(x)) ch.push(x); }
  delete why[p.a];                      // never explain the right answer as a mistake
  return {key, topic:p.topic, q:p.q, a:p.a, ex:p.ex, why, choices:R.shuffle(ch)};
}

/* -------------------------------- battle ---------------------------------- */
const Battle = {
  realm:null, foe:null, ri:0, fi:0,
  ehp:0, emax:0, combo:0, over:null,
  qStart:0, timer:null, rage:false, answered:false, cur:null, usedFeather:false,

  begin(ri, fi){
    this.mode='campaign';
    this.realm=REALMS[ri]; this.ri=ri; this.fi=fi;
    this._start(this.realm.foes[fi]);
  },
  beginDaily(){
    this.mode='daily';
    this.realm=REALMS[0]; this.ri=0; this.fi=2;
    this._start({nm:'Straw Knight', art:'knightfoe', col:'#c9b8a0',
                 hp:999999, atk:0, gold:0, xp:0, dummy:true});
  },
  beginArena(foe, wave){
    this.mode='arena';
    this.realm=Arena.realm; this.ri=0; this.fi=Math.min(6, wave);
    this._start(foe);
  },
  _start(f){
    this.foe=f; this.emax=f.hp; this.ehp=f.hp;
    this.combo=0; this.over=null; this.rage=false; this.usedFeather=false;
    this.charge=0; this.slamNext=false; this.lastSlam=0; this.missed=0;
    this.chargeMax=(f.boss?2:3) + (this.mode==='arena'?Arena.mods.charge:0);
    this.token=(this.token||0)+1;   // invalidates pending timers from a previous fight
    const bg=this.realm.bg;
    if(bg) Weather.set(bg.weather, bg.accent);
    Anim.reset();
    UI.go('s-battle');
    fitCanvas(); Anim.go();
    this.updateBars();
    this.nextQuestion();
  },
  // Weapon and armour as they stand right now, including any arena boons.
  wStats(){
    const w=Game.weapon(), m=this.mode==='arena'?Arena.mods:null;
    return {dmg:w.dmg*(m?m.dmg:1), crit:w.crit+(m?m.crit:0)};
  },
  defStat(){ return Game.armor().def + (this.mode==='arena'?Arena.mods.def:0); },

  updateBars(){
    const g=Game.s;
    const pPct=clamp(g.hp/g.maxHp*100,0,100), ePct=clamp(this.ehp/this.emax*100,0,100);
    document.getElementById('pHp').style.width  = pPct+'%';
    document.getElementById('eHp').style.width  = ePct+'%';
    document.getElementById('pGhost').style.width = pPct+'%';   // trails behind, showing the wound
    document.getElementById('eGhost').style.width = ePct+'%';
    document.getElementById('pHpTxt').textContent = Math.max(0,Math.round(g.hp))+'/'+g.maxHp;
    document.getElementById('eHpTxt').textContent = Math.max(0,Math.round(this.ehp))+'/'+this.emax;
    this.tension(g.hp/g.maxHp);
    const pips = this.slamNext ? '⚡ WIND-UP'
      : '●'.repeat(this.charge)+'○'.repeat(Math.max(0,this.chargeMax-this.charge));
    document.getElementById('foeName').innerHTML =
      (this.foe.boss?'👑 ':'')+this.foe.nm+' <span class="pips">'+pips+'</span>';
    document.getElementById('comboTxt').textContent =
      (this.mode==='arena' ? \`🏟️ Wave \${Arena.wave}  ·  \` : '') +
      (this.mode==='daily' ? \`🗡️ \${Math.min(Daily.n+1,Daily.LEN)}/\${Daily.LEN}  ·  \${Daily.score} pts  ·  \` : '') +
      \`Combo ×\${(1+Math.min(this.combo,7)*.15).toFixed(2)}  ·  streak \${this.combo}\`;
    const ct=document.getElementById('comboTxt');
    ct.classList.toggle('hot',   this.combo>=3 && this.combo<8);
    ct.classList.toggle('blaze', this.combo>=8);
    const fb=document.getElementById('fleeBtn');
    if(fb) fb.textContent = this.mode==='arena' ? '🚪 Retire with your winnings' : '🏃 Retreat';
    this.renderPowers();
  },

  // A red pulse that quickens as health falls — the most visceral feedback a game has.
  tension(frac){
    const v=document.getElementById('vignette');
    if(!v) return;
    const low = frac<0.3 && !this.over && Game.s.hp>0;
    v.classList.toggle('on', low);
    v.classList.toggle('crit', frac<0.15 && low);
    if(low) v.style.setProperty('--vi', clamp(1-frac/0.3, .25, 1).toFixed(2));
    if(low && !this._wasLow) Sfx.heart();
    this._wasLow = low;
  },

  renderPowers(){
    const bar=document.getElementById('powerbar'); const it=Game.s.items;
    bar.innerHTML='';
    const add=(k,label,enabled,fn)=>{
      const d=document.createElement('div');
      d.className='pw'+(enabled?'':' off'); d.innerHTML=label;
      d.onclick=fn; bar.appendChild(d);
    };
    add('potion', \`\${ITEMS.potion.ic} Draught ×\${it.potion}\`, it.potion>0 && Game.s.hp<Game.s.maxHp, ()=>Battle.usePotion());
    add('insight',\`\${ITEMS.insight.ic} Insight ×\${it.insight}\`, it.insight>0 && !this.answered, ()=>Battle.useInsight());
    add('rage',   \`\${ITEMS.rage.ic} Rune ×\${it.rage}\`, it.rage>0 && !this.rage, ()=>Battle.useRage());
    if(it.feather>0) add('feather', \`\${ITEMS.feather.ic} Feather ×\${it.feather}\`, false, ()=>{});
  },

  usePotion(){
    const g=Game.s; if(g.items.potion<1) return;
    g.items.potion--; const heal=Math.round(g.maxHp*.45);
    g.hp=Math.min(g.maxHp,g.hp+heal);
    Anim.float(220,H-240,'+'+heal,'#7bffa8'); Sfx.good();
    Game.save(); this.updateBars();
  },
  useInsight(){
    const g=Game.s; if(g.items.insight<1||this.answered) return;
    g.items.insight--;
    const btns=[...document.querySelectorAll('#choices .choice')].filter(b=>b.dataset.correct!=='1' && !b.classList.contains('faded'));
    R.shuffle(btns).slice(0,2).forEach(b=>b.classList.add('faded'));
    Sfx.coin(); Game.save(); this.renderPowers();
  },
  useRage(){
    const g=Game.s; if(g.items.rage<1||this.rage) return;
    g.items.rage--; this.rage=true;
    Anim.float(220,H-260,'RAGE!','#ff9c3d',true); Sfx.good();
    Game.save(); this.renderPowers();
  },

  nextQuestion(){
    if(this.over) return;
    this.answered=false;
    const ex=document.getElementById('explain');
    ex.style.display='none'; ex.innerHTML='';     // drop the stale Continue button
    let key, diff;
    if(this.mode==='daily'){
      // Fixed pool, fixed difficulty, seeded draw — the run has to be identical
      // on every device, which rules out mastery weighting entirely.
      key = R.pick(DAILY_POOL);
      diff = 2;
    } else {
      // Topic choice is weighted by mastery: weak and overdue topics surface more.
      let pool=this.realm.pool;
      if(this.foe.boss && R.chance(.3) && this.ri>0) pool=REALMS[R.i(0,this.ri-1)].pool;
      key=Mastery.pick(pool);
      const base = this.mode==='arena' ? 3
                 : clamp(1 + Math.floor(this.fi/2) + (this.foe.boss?1:0), 1, 3);
      diff = Mastery.adjustDiff(key, base);
    }
    this.cur = buildQuestion(key, diff);
    const tg=document.getElementById('telegraph');
    if(this.slamNext){
      tg.style.display='block';
      tg.innerHTML=\`⚡ <b>\${this.foe.nm}</b> is winding up — answer correctly to brace the blow!\`;
    } else tg.style.display='none';
    document.getElementById('qtopic').innerHTML = this.cur.topic +
      (Mastery.isReview(this.cur.key) ? ' <span class="rev">⟳ review</span>' : '');
    document.getElementById('qbox').innerHTML = this.cur.q;
    const box=document.getElementById('choices'); box.innerHTML='';
    this.cur.choices.forEach(c=>{
      const b=document.createElement('button');
      b.className='btn choice'; b.innerHTML=c;
      if(c===this.cur.a) b.dataset.correct='1';
      b.onclick=()=>this.answer(b,c);
      box.appendChild(b);
    });
    if(Game.s.hp/Game.s.maxHp < 0.3) Sfx.heart();
    this.qStart=performance.now();
    this.startTimer();
    this.renderPowers();
  },

  startTimer(){
    clearInterval(this.timer);
    const bar=document.getElementById('timeBar');
    const LIMIT=22000;
    this.timer=setInterval(()=>{
      const el=performance.now()-this.qStart;
      const pct=clamp(100-el/LIMIT*100,0,100);
      bar.style.width=pct+'%';
      document.getElementById('speedTxt').textContent =
        el<7000 ? '⚡ Swift strike ×1.5' : el<14000 ? '✦ Steady strike ×1.2' : 'Measured strike ×1.0';
      if(pct<=0) clearInterval(this.timer);
    },100);
  },

  answer(btn, choice){
    if(this.answered) return;
    this.answered=true; clearInterval(this.timer);
    const ok = choice===this.cur.a;
    const el = performance.now()-this.qStart;
    document.querySelectorAll('#choices .choice').forEach(b=>{
      b.onclick=null;
      if(b.dataset.correct==='1') b.classList.add('right');
      else if(b===btn) b.classList.add('wrong');
      else b.classList.add('faded');
    });
    this.lastMastery = Game.recordAnswer(this.cur.key, ok);

    Haptic.tap();
    if(this.mode==='daily'){
      this.combo = ok ? this.combo+1 : 0;
      const pts=Daily.award(ok, el, this.combo);
      if(ok){
        this.ehp=Math.max(0,this.ehp-1);
        Anim.strike('p', pts, this.combo>=5, 'PTS');
        Sfx.good(this.combo); this.comboBeat();
      } else { Anim.strike('e', 0, false, 'MISS'); Sfx.bad(); }
      Game.save();
      setTimeout(()=>this.updateBars(),420);
      this.showExplain(ok, choice);
      return;
    }
    if(ok){
      this.combo++;
      Game.s.stats.best=Math.max(Game.s.stats.best,this.combo);
      const w=this.wStats();
      const speed = el<7000?1.5 : el<14000?1.2 : 1.0;
      const comboMul = 1 + Math.min(this.combo,7)*.15;
      const crit = R.chance(w.crit + this.combo*0.02);
      let dmg = w.dmg * speed * comboMul * (crit?2:1) * (this.rage?2.5:1);
      dmg = Math.round(dmg * (0.9+Math.random()*0.2));
      this.rage=false;
      this.ehp=Math.max(0,this.ehp-dmg);
      Anim.strike('p',dmg,crit,null,this.ehp<=0);
      Sfx.good(this.combo);                       // pitch climbs with the streak
      this.comboBeat();
      Bounty.bump('solve',1);
      Bounty.bump('topic',1,this.cur.key);
      Bounty.bump('streak',this.combo);
      if(crit) Bounty.bump('crit',1);
    } else {
      this.combo=0;
      const def=this.defStat();
      let dmg=Math.max(4, Math.round((this.foe.atk*(0.85+Math.random()*0.3)) - def));
      Game.s.hp=Math.max(0,Game.s.hp-dmg);
      Anim.strike('e',dmg,false);
      Sfx.bad();
      this.missed++;
    }
    // Crossing a topic into "solid" is the payoff the whole game is built around.
    if(this.lastMastery && this.lastMastery.mastered){
      setTimeout(()=>Celebrate.banner('MASTERED', TOPIC_LABEL[this.cur.key]||this.cur.topic,
        'var(--green)', ()=>{Sfx.mastered(); Haptic.win();}), 700);
    }

    // The foe fights on its own clock: it winds up over a few turns and then
    // slams regardless of your answer. A correct answer braces the blow rather
    // than avoiding it, so armour and draughts always matter.
    this.lastSlam=0; this.lastBraced=ok;
    if(this.slamNext){
      this.slamNext=false;
      const raw=this.foe.atk*1.7*(ok?0.35:1);
      this.lastSlam=Math.max(3, Math.round(raw - this.defStat()));
      Game.s.hp=Math.max(0, Game.s.hp - this.lastSlam);
      const delay = ok?620:900, amt=this.lastSlam, tok=this.token;
      setTimeout(()=>{
        if(this.over || this.token!==tok) return;
        Anim.strike('e', amt, true, 'SLAM');
        Sfx.hurt();
        setTimeout(()=>this.updateBars(),420);
      }, delay);
    } else if(++this.charge >= this.chargeMax){
      this.charge=0; this.slamNext=true;
    }

    Game.save();
    setTimeout(()=>this.updateBars(),420);
    this.showExplain(ok, choice);
  },

  // Streak milestones: escalating callouts so a hot run feels like one.
  comboBeat(){
    const c=this.combo;
    const M={3:['NICE!','three in a row'],5:['ON FIRE!','×1.75 damage'],
             8:['UNSTOPPABLE!','×2.05 damage — the cap'],12:['LEGENDARY!','twelve straight'],
             16:['IMMORTAL!','sixteen straight'],25:['GODLIKE!','twenty-five straight']};
    const hit = M[c] || (c>25 && c%10===0 ? ['GODLIKE ×'+Math.floor(c/10),c+' straight'] : null);
    if(hit) Celebrate.banner(hit[0], hit[1], c>=8?'#ff9c3d':'var(--gold)', ()=>{Sfx.milestone(); Haptic.win();});
  },

  showExplain(ok, picked){
    const e=document.getElementById('explain');
    const miss = !ok && this.cur.why[picked];
    e.style.display='block';
    e.innerHTML =
      \`<div class="head" style="color:\${ok?'var(--green)':'var(--red)'}">\${ok?'⚔️ A clean strike!':'🩸 The blow lands on you.'}</div>\`+
      (ok?'':\`<div style="margin-bottom:6px">The answer was <b style="color:var(--gold)">\${this.cur.a}</b>.</div>\`)+
      (miss?\`<div class="miss">You chose <b>\${picked}</b>: \${miss}.</div>\`:'')+
      (this.lastSlam?\`<div class="miss">⚡ \${this.foe.nm} unleashed its wind-up for <b>\${this.lastSlam}</b> damage\${this.lastBraced?' — braced, so you took a fraction of it':''}.</div>\`:'')+
      \`<div>\${this.cur.ex}</div>\`+
      \`<button class="btn gold" style="margin-top:10px" id="contBtn">Continue ▶</button>\`;
    const btn=document.getElementById('contBtn');
    btn.onclick=()=>{ btn.onclick=null; btn.disabled=true; this.afterTurn(); };
    e.scrollIntoView({behavior:'smooth',block:'nearest'});
  },

  afterTurn(){
    if(this.over) return;                       // battle already resolved
    if(this.mode==='daily'){
      Daily.n++;
      if(Daily.n>=Daily.LEN){ this.over='daily'; clearInterval(this.timer); Daily.finish(); return; }
      this.nextQuestion(); return;
    }
    if(this.ehp<=0){ this.win(); return; }
    if(Game.s.hp<=0){
      if(Game.s.items.feather>0 && !this.usedFeather){
        Game.s.items.feather--; this.usedFeather=true;
        Game.s.hp=Math.round(Game.s.maxHp*.5);
        Anim.float(220,H-250,'REVIVED','#ffd166',true);
        Anim.burst(200,H-190,'#ffd166',34); Sfx.win();
        Game.save(); this.updateBars();
        document.getElementById('explain').style.display='none';
        this.nextQuestion(); return;
      }
      this.lose(); return;
    }
    this.nextQuestion();
  },

  win(){
    if(this.over) return;
    this.tension(1);
    this.over='win'; clearInterval(this.timer);
    Anim.burst(610,H-190,this.foe.col,42); Sfx.win();
    if(this.mode==='arena'){ const f=this.foe; setTimeout(()=>{Anim.stop(); Arena.cleared(f);},1100); return; }
    const g=Game.s;
    const key=this.ri+':'+this.fi;
    const first=!g.cleared[key];
    g.cleared[key]=true; g.stats.wins++;
    Bounty.bump('wins',1);
    if(this.missed===0) Bounty.bump('flaw',1);
    const gold=Math.round(this.foe.gold*(first?1:0.45));
    const xp=Math.round(this.foe.xp*(first?1:0.4));
    g.gold+=gold;
    const ups=Game.gainXp(xp);

    // loot — rolled now, revealed by the chest once the victory panel is up
    const drop = R.chance(this.foe.boss?1:.5)
      ? Loot.roll({boss:this.foe.boss, tier:Math.min(6, this.ri+2)}) : null;
    const loot = drop ? \`<span style="color:\${RARITY[drop.rar].col}">\${drop.ic} \${drop.nm}</span>\` : null;
    // boss unlocks the next realm
    let unlocked=null;
    if(this.foe.boss && first && this.ri+1<REALMS.length) unlocked=REALMS[this.ri+1].nm;
    Game.save();

    setTimeout(()=>{
      UI.go('s-result');
      document.getElementById('resultBody').innerHTML=\`
        <div class="center crest">🏆</div>
        <div class="panel center">
          <h1 style="font-size:22px">Victory!</h1>
          <div class="sub" style="margin-top:6px">\${this.foe.nm} falls before your blade.</div>
          <hr>
          <div style="font-size:16px;font-weight:800;line-height:1.9">
            <div class="coin">+<span id="rGold">0</span> gold</div>
            <div style="color:var(--blue)">+<span id="rXp">0</span> experience</div>
            \${loot?\`<div style="color:var(--purple)">Looted \${loot}</div>\`:''}
            \${ups?\`<div style="color:var(--gold)">⬆️ Level \${g.lvl}! Health restored to \${g.maxHp}.</div>\`:''}
            \${unlocked?\`<div style="color:var(--green)">🗺️ \${unlocked} now lies open.</div>\`:''}
          </div>
          <hr>
          <div class="small">Longest streak this battle: \${g.stats.best}</div>
        </div>
        <button class="btn gold" onclick="UI.go('s-map')">🗺️ Onward</button>
        <button class="btn" onclick="Battle.begin(\${this.ri},\${this.fi})">↻ Fight again</button>
        <button class="btn ghost" onclick="UI.go('s-shop')">🏪 Visit the Smithy</button>\`;
      if(drop) setTimeout(()=>Chest.open(drop), 700);
      countUp(document.getElementById('rGold'), gold, 900);
      countUp(document.getElementById('rXp'),   xp,   900);
      for(let i=0;i<Math.min(8,Math.ceil(gold/25));i++) Sfx.coin(i);
      Haptic.win();
      if(ups) Celebrate.banner('LEVEL '+g.lvl, 'Maximum health now '+g.maxHp, 'var(--gold)', ()=>Sfx.level());
      Titles.check();
      Anim.stop();
    },1200);
  },

  lose(){
    if(this.over) return;
    this.tension(1);
    this.over='lose'; clearInterval(this.timer); Sfx.hurt();
    if(this.mode==='arena'){ const f=this.foe; setTimeout(()=>{Anim.stop(); Arena.ended(f);},900); return; }
    const g=Game.s;
    const lost=Math.round(g.gold*.15);
    g.gold-=lost; g.hp=Math.max(1,Math.round(g.maxHp*.4));
    Game.save();
    setTimeout(()=>{
      UI.go('s-result');
      document.getElementById('resultBody').innerHTML=\`
        <div class="center crest">💀</div>
        <div class="panel center">
          <h1 style="font-size:22px;color:var(--red)">You have fallen</h1>
          <div class="sub" style="margin-top:6px">\${this.foe.nm} stands over your shield. You are dragged back to camp.</div>
          <hr>
          <div style="font-weight:800">−\${lost} gold lost in the retreat</div>
          <div class="sub" style="margin-top:10px">Nothing else is lost. Study the Tome, buy a draught, and return.</div>
        </div>
        <button class="btn gold" onclick="Battle.begin(\${this.ri},\${this.fi})">⚔️ Try again</button>
        <button class="btn" onclick="UI.go('s-tome')">📖 Study the Tome</button>
        <button class="btn ghost" onclick="UI.go('s-map')">🗺️ Back to the map</button>\`;
      Anim.stop();
    },900);
  },

  flee(){
    clearInterval(this.timer); this.over='flee'; Anim.stop(); this.tension(1);
    if(this.mode==='arena'){ Arena.retire(); return; }
    UI.go('s-map');
    UI.toast('🏃 You slip away into the trees.');
  }
};

/* -------------------------------- titles --------------------------------- */
/* Milestones worth chasing. Most are tied to actually learning something
   rather than merely grinding, so the reward tracks the point of the game.  */
const TITLES = [
  {id:'first',    ic:'⚔️', nm:'First Blood',     ds:'Win your first battle',        t:g=>g.stats.wins>=1},
  {id:'squire',   ic:'🛡️', nm:'Squire',          ds:'Solve 50 riddles',             t:g=>g.stats.correct>=50},
  {id:'errant',   ic:'🐎', nm:'Knight-Errant',   ds:'Solve 250 riddles',            t:g=>g.stats.correct>=250},
  {id:'scholar',  ic:'📚', nm:'Scholar',         ds:'Solve 1000 riddles',           t:g=>g.stats.correct>=1000},
  {id:'form',     ic:'🔥', nm:'Perfect Form',    ds:'Reach a streak of 15',         t:g=>g.stats.best>=15},
  {id:'realm',    ic:'🗺️', nm:'Realm Walker',    ds:'Clear an entire realm',
    t:g=>REALMS.some((r,ri)=>r.foes.every((f,fi)=>g.cleared[ri+':'+fi]))},
  {id:'dragon',   ic:'🐉', nm:'Dragonslayer',    ds:'Fell the Eigen Dragon',        t:g=>!!g.cleared['4:3']},
  {id:'arena10',  ic:'🏟️', nm:'Gladiator',       ds:'Reach arena wave 10',          t:g=>(g.arenaBest||0)>=10},
  {id:'arena20',  ic:'👑', nm:'Arena Champion',  ds:'Reach arena wave 20',          t:g=>(g.arenaBest||0)>=20},
  {id:'poly',     ic:'🧠', nm:'Polymath',        ds:'Master 10 topics',
    t:()=>Mastery.all().filter(x=>x.r.m>=0.85).length>=10},
  {id:'magister', ic:'✨', nm:'Grand Magister',  ds:'Master every topic in the game',
    t:()=>Mastery.all().filter(x=>x.r.m>=0.85).length>=Object.keys(TOPIC_LABEL).length},
  {id:'devoted',  ic:'📅', nm:'Devoted',         ds:'Practise seven days running',
    t:g=>(g.streak&&g.streak.days)>=7}
];

const Titles = {
  check(){
    const g=Game.s; if(!g) return;
    g.titles=g.titles||{};
    let got=false;
    for(const t of TITLES){
      if(g.titles[t.id]) continue;
      let earned=false;
      try{ earned=!!t.t(g); }catch(e){}
      if(earned){
        g.titles[t.id]=1; got=true;
        Celebrate.banner(t.ic+' '+t.nm, t.ds, 'var(--gold)', ()=>{Sfx.mastered(); Haptic.win();});
      }
    }
    if(got) Game.save();
  },
  count(){ const g=Game.s; return g&&g.titles ? Object.keys(g.titles).length : 0; },
  latest(){
    const g=Game.s; if(!g||!g.titles) return null;
    const owned=TITLES.filter(t=>g.titles[t.id]);
    return owned.length? owned[owned.length-1] : null;
  }
};

/* Local-date key, so the streak rolls over at the player's midnight. */
function dayKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }

/* --------------------------------- loot ---------------------------------- */
/* A drop used to be a 42% roll printing one line of text. It is now a rarity
   roll with a reveal, and rare tiers can drop gear — which until now was only
   ever bought, so the shop was the sole source of upgrades.                  */
const RARITY = {
  common:    {nm:'Common',    col:'#9aa6b5'},
  uncommon:  {nm:'Uncommon',  col:'#57cc7a'},
  rare:      {nm:'Rare',      col:'#5aa9e6'},
  epic:      {nm:'Epic',      col:'#a06bd6'},
  legendary: {nm:'Legendary', col:'#f2c14e'}
};

const Loot = {
  // Gear the player does not yet own, capped so realm one cannot drop the best blade.
  gearPool(tier){
    const out=[];
    WEAPONS.forEach((w,i)=>{ if(i>0 && i<=tier && !Game.s.owned[w.id]) out.push(w); });
    ARMORS .forEach((a,i)=>{ if(i>0 && i<=tier && !Game.s.owned[a.id]) out.push(a); });
    return out;
  },
  rollRarity(luck){
    const w=[['common',100],['uncommon',46*luck],['rare',19*luck],['epic',5.5*luck],['legendary',1.3*luck]];
    let t=w.reduce((s,x)=>s+x[1],0)*Math.random();
    for(const [id,v] of w){ t-=v; if(t<=0) return id; }
    return 'common';
  },
  roll(ctx){
    const luck = ctx.boss ? 2.6 : 1;
    let rar = this.rollRarity(luck);
    if(ctx.boss && rar==='common') rar='uncommon';     // a boss always gives something
    const pool = this.gearPool(ctx.tier);

    // The high tiers hand over gear whenever any is still unowned.
    if((rar==='rare'||rar==='epic'||rar==='legendary') && pool.length){
      const idx = rar==='legendary' ? pool.length-1
                : rar==='epic'      ? Math.min(pool.length-1, Math.floor(pool.length*0.66))
                : Math.floor(Math.random()*pool.length);
      const g = pool[idx];
      const isWeapon = WEAPONS.indexOf(g)>=0;
      return {rar, ic:g.ic, nm:g.nm, ds:g.ds, tagNew:true,
        apply(){
          Game.s.owned[g.id]=1;
          if(isWeapon) Game.s.weapon=g.id;
          else { Game.s.armor=g.id; Game.s.maxHp=Game.maxHp(); Game.s.hp=Math.min(Game.s.maxHp,Game.s.hp+g.hp); }
        }};
    }
    if(rar==='legendary'||rar==='epic'){                     // nothing left to find — pay out
      const n = rar==='legendary'?2:1;
      return {rar, ic:'🪶', nm:n>1?'Phoenix Feathers':'Phoenix Feather',
        ds:'Revives you once at half health.', count:n,
        apply(){ Game.s.items.feather+=n; }};
    }
    if(rar==='rare'){
      const gold = 120 + ctx.tier*70;
      return {rar, ic:'💰', nm:'Buried Purse', ds:gold+' gold, and a rune besides.',
        apply(){ Game.s.gold+=gold; Game.s.items.rage++; }};
    }
    if(rar==='uncommon'){
      const pick=R.pick(['potions','insight','rage']);
      if(pick==='potions') return {rar, ic:'🧪', nm:'Draughts ×2', ds:'Two Healing Draughts.',
        apply(){ Game.s.items.potion+=2; }};
      if(pick==='insight') return {rar, ic:'🔮', nm:"Sage's Insight ×2", ds:'Burns away two wrong answers.',
        apply(){ Game.s.items.insight+=2; }};
      return {rar, ic:'🔥', nm:'Berserker Rune', ds:'Next correct strike deals 2.5× damage.',
        apply(){ Game.s.items.rage++; }};
    }
    return R.chance(.5)
      ? {rar, ic:'🧪', nm:'Healing Draught', ds:'Restores 45% of your health.', apply(){ Game.s.items.potion++; }}
      : {rar, ic:'🔮', nm:"Sage's Insight", ds:'Burns away two wrong answers.', apply(){ Game.s.items.insight++; }};
  }
};

/* The reveal. Chest shakes, bursts in the rarity colour, card sweeps in. */
const Chest = {
  pending:null, after:null,
  open(item, after){
    // The reveal is deferred by a beat, and the player may have moved on in the
    // meantime — advancing an arena wave, say. Never open over a live fight.
    const now=document.querySelector('.screen.on');
    if(!now || now.id!=='s-result'){ item.apply(); Game.save(); if(after) after(); return; }
    // A second drop must not silently discard the first.
    if(this.pending){ this.pending.apply(); Game.save(); }
    this.pending=item; this.after=after||null;
    const col=RARITY[item.rar].col;
    const el=document.getElementById('chest');
    el.style.setProperty('--rc', col);
    el.innerHTML=\`<div class="cbox">
        <div class="clid" id="clid">🎁</div>
        <div class="cburst" id="cburst"></div>
        <div class="ccard" id="ccard">
          <div class="crar">\${RARITY[item.rar].nm}</div>
          <div class="cic">\${item.ic}</div>
          <div class="cnm">\${item.nm}\${item.tagNew?' <span class="cnew">NEW</span>':''}</div>
          <div class="cds">\${item.ds}</div>
        </div>
        <button class="btn gold" id="cbtn" style="display:none;max-width:16rem;margin:14px auto 0">Collect</button>
      </div>\`;
    el.classList.add('on');
    document.getElementById('cbtn').onclick=()=>this.close();
    Sfx.chestShake();
    const wait = Prefs.d.motion ? 780 : 220;
    setTimeout(()=>this.burst(), wait);
  },
  burst(){
    const el=document.getElementById('chest'); if(!el.classList.contains('on')) return;
    document.getElementById('clid').classList.add('pop');
    document.getElementById('cburst').classList.add('go');
    document.getElementById('ccard').classList.add('go');
    document.getElementById('cbtn').style.display='';
    const rar=this.pending.rar;
    if(rar==='legendary'||rar==='epic'){ Sfx.mastered(); Haptic.win(); }
    else { Sfx.chestOpen(); Haptic.hit(); }
  },
  close(){
    const el=document.getElementById('chest');
    el.classList.remove('on');
    const it=this.pending, cb=this.after;
    this.pending=null; this.after=null;
    if(it){ it.apply(); Game.save(); }
    if(cb) cb();
  }
};

/* ------------------------------- bounties -------------------------------- */
/* Three rotating goals so a session always has a reason beyond the next node.
   Completing one pays out and immediately rolls a replacement.              */
const BOUNTY_KINDS = [
  {id:'wins',   mk:()=>({n:R.i(2,4)}),
   txt:b=>\`Win \${b.n} battles\`,                              gold:b=>70*b.n},
  {id:'streak', mk:()=>({n:R.pick([8,12,16])}), peak:true,
   txt:b=>\`Reach a streak of \${b.n}\`,                        gold:b=>20*b.n},
  {id:'crit',   mk:()=>({n:R.i(4,9)}),
   txt:b=>\`Land \${b.n} critical strikes\`,                    gold:b=>32*b.n},
  {id:'flaw',   mk:()=>({n:R.i(1,2)}),
   txt:b=>\`Win \${b.n} fight\${b.n>1?'s':''} without a single miss\`, gold:b=>170*b.n},
  {id:'solve',  mk:()=>({n:R.i(15,30)}),
   txt:b=>\`Solve \${b.n} riddles\`,                            gold:b=>7*b.n},
  {id:'topic',  mk:()=>({n:R.i(4,8), k:R.pick(Object.keys(TOPIC_LABEL))}),
   txt:b=>\`Solve \${b.n} × \${TOPIC_LABEL[b.k]||b.k}\`,         gold:b=>18*b.n}
];

const Bounty = {
  kind(id){ return BOUNTY_KINDS.find(k=>k.id===id); },
  ensure(){
    const g=Game.s; if(!g) return;
    g.bounties = g.bounties || [];
    let guard=0;
    while(g.bounties.length<3 && guard++<30) g.bounties.push(this.make(g.bounties));
  },
  make(existing){
    let kind, guard=0;
    do{ kind=R.pick(BOUNTY_KINDS); } while(existing.some(b=>b.id===kind.id) && guard++<25);
    const b=Object.assign({id:kind.id, p:0}, kind.mk());
    b.gold=kind.gold(b);
    return b;
  },
  txt(b){ const k=this.kind(b.id); return k?k.txt(b):''; },
  // Counters accumulate; 'streak' instead records a high-water mark.
  bump(id, amount, meta){
    const g=Game.s; if(!g||!g.bounties) return;
    let done=false;
    for(const b of g.bounties){
      if(b.id!==id || b.p>=b.n) continue;
      if(id==='topic' && meta!==b.k) continue;
      const k=this.kind(id);
      b.p = k && k.peak ? Math.max(b.p, amount) : Math.min(b.n, b.p+amount);
      if(b.p>=b.n) done=true;
    }
    if(done) this.claim();
  },
  claim(){
    const g=Game.s;
    const done=g.bounties.filter(b=>b.p>=b.n);
    if(!done.length) return;
    const gold=done.reduce((s,b)=>s+b.gold,0);
    g.gold+=gold;
    g.bounties=g.bounties.filter(b=>b.p<b.n);
    this.ensure();
    Game.save();
    Celebrate.banner('BOUNTY CLAIMED', '+'+gold+' gold', 'var(--gold)',
      ()=>{Sfx.milestone(); Haptic.win();});
  },
  // The cheapest thing you cannot yet afford — a visible next step.
  nextUnlock(){
    const g=Game.s; if(!g) return null;
    const all=WEAPONS.concat(ARMORS).filter(x=>x.cost>0 && !g.owned[x.id]);
    all.sort((a,b)=>a.cost-b.cost);
    return all[0]||null;
  }
};

/* ---------------------------- daily skirmish ------------------------------ */
/* Twelve questions from a seed derived from the date, so the run is the same
   everywhere that day and a score means something. No health, no death — the
   only thing at stake is the number.                                        */
// Realms one to four: varied, but stops short of the hardest set so a daily is
// approachable for someone who has not finished the campaign.
const DAILY_POOL = REALMS.slice(0,4).reduce((a,r)=>a.concat(r.pool), []);

const Daily = {
  LEN:12,
  seedFor(d){ d=d||new Date(); return (d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate())>>>0; },
  today(){ return dayKey(new Date()); },
  state(){
    const g=Game.s;
    g.daily = g.daily || {day:null, best:0, runs:0, allTimeBest:0};
    if(g.daily.day!==this.today()){ g.daily.day=this.today(); g.daily.best=0; g.daily.runs=0; }
    return g.daily;
  },
  start(){
    this.state();
    this.score=0; this.n=0;
    R.seed(this.seedFor());
    Battle.beginDaily();
  },
  // Points reward accuracy first, then speed, then the streak.
  award(ok, ms, combo){
    if(!ok) return 0;
    const speed = ms<6000?1.5 : ms<12000?1.25 : ms<22000?1.05 : 1;
    const pts=Math.round(100*speed*(1+Math.min(combo,10)*0.06));
    this.score+=pts;
    return pts;
  },
  finish(){
    R.unseed();
    const st=this.state();
    st.runs++;
    const record = this.score>st.best;
    if(record) st.best=this.score;
    if(this.score>(st.allTimeBest||0)) st.allTimeBest=this.score;
    Game.save();
    Titles.check();
    Anim.stop();
    UI.go('s-result');
    document.getElementById('resultBody').innerHTML=\`
      <div class="center crest">🗡️</div>
      <div class="panel center">
        <h1 style="font-size:22px">Daily Skirmish</h1>
        <div class="sub" style="margin-top:6px">\${this.LEN} riddles, the same for everyone today.</div>
        <hr>
        <div style="font-size:34px;font-weight:900;color:var(--gold)" id="dScore">0</div>
        <div class="small">points</div>
        \${record?'<div style="color:var(--green);font-weight:800;margin-top:8px">🏅 Best of the day!</div>':
          \`<div class="small" style="margin-top:8px">Today's best: \${st.best}</div>\`}
        <hr>
        <div class="small">All-time best: \${st.allTimeBest} · runs today: \${st.runs}</div>
      </div>
      <button class="btn gold" onclick="Daily.start()">↻ Run it again</button>
      <button class="btn ghost" onclick="UI.go('s-map')">🗺️ Back to the map</button>
      <div style="height:20px"></div>\`;
    countUp(document.getElementById('dScore'), this.score, 1100);
    if(record){ Celebrate.banner('NEW BEST', this.score+' points', 'var(--gold)', ()=>{Sfx.mastered(); Haptic.win();}); }
    else Sfx.win();
  }
};

/* -------------------------------- arena ---------------------------------- */
/* Endless mode, unlocked once the Eigen Dragon falls. Waves scale, you never
   heal for free, and the run ends when you do. Problems are drawn from every
   topic in the game, still weighted by mastery — so the deeper you push, the
   more it hunts for your weak spots.                                        */
const ARENA_ADJ = ['Spectral','Nullspace','Divergent','Singular','Recursive','Asymptotic',
  'Orthogonal','Degenerate','Infinite','Convergent','Transposed','Unbounded','Nilpotent'];
const ARENA_NOUN = ['Revenant','Warden','Colossus','Serpent','Harbinger','Devourer',
  'Sentinel','Phantom','Behemoth','Aberration','Tyrant','Herald'];
const ARENA_ART = ['slime','goblin','skeleton','golem','wisp','harpy','wraith','dragon','lich','knightfoe'];
const ARENA_COL = ['#e5484d','#a06bd6','#5aa9e6','#57cc7a','#f2c14e','#e07b39','#6fd3c4','#f06bb0'];

/* Run-scoped boons, drafted three at a time. They stack. */
const BOONS = [
  {ic:'🩸', nm:'Vigour',     ds:'+25% maximum health, and heal that much now',
   go(){ const b=Game.s.maxHp; Arena.mods.hpMul*=1.25; Game.s.maxHp=Game.maxHp();
         Game.s.hp=Math.min(Game.s.maxHp, Game.s.hp+(Game.s.maxHp-b)); }},
  {ic:'⚔️', nm:'Whetstone',  ds:'+25% weapon damage for this run',
   go(){ Arena.mods.dmg += .25; }},
  {ic:'🛡️', nm:'Bulwark',    ds:'+7 defence for this run',
   go(){ Arena.mods.def += 7; }},
  {ic:'🔥', nm:'Fury',       ds:'+12% critical chance for this run',
   go(){ Arena.mods.crit += .12; }},
  {ic:'⏳', nm:'Tempo',      ds:'foes need one extra turn to wind up',
   go(){ Arena.mods.charge += 1; }},
  {ic:'🧪', nm:'Supplies',   ds:'+3 Healing Draughts',
   go(){ Game.s.items.potion += 3; }},
  {ic:'🔮', nm:'Foresight',  ds:'+3 Sage\\'s Insights',
   go(){ Game.s.items.insight += 3; }},
  {ic:'💰', nm:'Avarice',    ds:'+60% gold from this run',
   go(){ Arena.mods.gold += .6; }},
  {ic:'❤️‍🩹', nm:'Second Wind', ds:'restore health to full right now',
   go(){ Game.s.hp = Game.s.maxHp; }},
  {ic:'🪶', nm:'Plumage',    ds:'+1 Phoenix Feather',
   go(){ Game.s.items.feather += 1; }}
];

const Arena = {
  active:false, wave:0, earned:0, mods:null,
  realm:{nm:'The Arena', col:'#f2c14e', sky:['#4a2410','#0d0705'], pool:null,
    bg:{key:'arena', seed:97, sky:['#5a3616','#33200d','#120a04'],
        far:'towers', farCol:'#3c2612', near:'arcs', nearCol:'#22150a',
        ground:['#422913','#140c05'], rim:'rgba(255,210,140,.2)', haze:'rgba(44,27,12,.82)',
        glow:'#ffeccd', weather:'dust', accent:'#f2c14e'}},

  unlocked(){ return !!(Game.s && Game.s.cleared[(REALMS.length-1)+':'+(REALMS[REALMS.length-1].foes.length-1)]); },

  start(){
    this.active=true; this.wave=0; this.earned=0;
    this.mods={dmg:1, def:0, crit:0, gold:1, charge:0, hpMul:1};
    this.realm.pool = Object.keys(TOPIC_LABEL);
    Game.s.maxHp = Game.maxHp();
    Game.s.hp = Game.s.maxHp;          // you enter fresh; you will not be topped up again
    Game.save();
    this.nextWave();
  },

  foeFor(w){
    const champion = w%5===0;
    const hp  = Math.round((200 + w*95) * (champion?1.7:1));
    const atk = Math.round(30 * Math.pow(1.085, w-1) * (champion?1.25:1));
    return {
      nm:(champion?'':R.pick(ARENA_ADJ)+' ')+R.pick(ARENA_NOUN),
      art:R.pick(ARENA_ART), col:R.pick(ARENA_COL),
      hp, atk, boss:champion,
      gold:Math.round((50 + w*18)*(champion?2:1)),
      xp:Math.round((30 + w*10)*(champion?2:1))
    };
  },

  nextWave(){
    this.wave++;
    Battle.beginArena(this.foeFor(this.wave), this.wave);
  },

  // Called by Battle.win() when a wave falls.
  cleared(foe){
    const gold=Math.round(foe.gold*this.mods.gold);
    Game.s.gold += gold; this.earned += gold;
    const ups=Game.gainXp(foe.xp);
    let healed=0;
    if(this.wave%5===0){                      // a breather after each champion
      healed=Math.round(Game.s.maxHp*.25);
      Game.s.hp=Math.min(Game.s.maxHp, Game.s.hp+healed);
    }
    if(this.wave>(Game.s.arenaBest||0)) Game.s.arenaBest=this.wave;
    Bounty.bump('wins',1);
    if(Battle.missed===0) Bounty.bump('flaw',1);
    Game.save();

    const drop = R.chance(foe.boss?1:.34)
      ? Loot.roll({boss:foe.boss, tier:Math.min(6, 2+Math.floor(this.wave/4))}) : null;
    if(drop) setTimeout(()=>Chest.open(drop), 700);
    const draft = this.wave%3===0 ? R.shuffle(BOONS).slice(0,3) : null;
    this.pending = draft;
    UI.go('s-result');
    document.getElementById('resultBody').innerHTML=\`
      <div class="center crest">\${foe.boss?'👑':'⚔️'}</div>
      <div class="panel center">
        <h1 style="font-size:20px">Wave \${this.wave} cleared</h1>
        <div class="sub" style="margin-top:6px">\${foe.nm} falls. The gate grinds open again.</div>
        <hr>
        <div style="font-size:15px;font-weight:800;line-height:1.8">
          <div class="coin">+<span id="aGold">0</span> gold</div>
          <div style="color:var(--blue)">+<span id="aXp">0</span> experience</div>
          \${ups?\`<div style="color:var(--gold)">⬆️ Level \${Game.s.lvl}!</div>\`:''}
          \${healed?\`<div style="color:var(--green)">🩹 The crowd throws down a poultice: +\${healed} health</div>\`:''}
        </div>
        <hr>
        <div class="small">❤️ \${Math.round(Game.s.hp)}/\${Game.s.maxHp} · 🪙 \${this.earned} earned this run · best wave \${Game.s.arenaBest}</div>
      </div>
      \${draft?\`<div class="panel"><h2 style="font-size:16px;color:var(--gold)">Choose a boon</h2>
        <div class="sub" style="margin-bottom:6px">It lasts the rest of the run.</div>
        \${draft.map((b,i)=>\`<button class="btn" onclick="Arena.take(\${i})">
          <span style="font-size:18px">\${b.ic}</span> <b>\${b.nm}</b>
          <span class="small" style="font-weight:400"><br>\${b.ds}</span></button>\`).join('')}
      </div>\`
      :\`<button class="btn gold" onclick="Arena.nextWave()">⚔️ Wave \${this.wave+1} →</button>
        <button class="btn ghost" onclick="Arena.retire()">🚪 Retire with your winnings</button>\`}
      <div style="height:20px"></div>\`;
    countUp(document.getElementById('aGold'), gold, 800);
    countUp(document.getElementById('aXp'), foe.xp, 800);
    for(let i=0;i<Math.min(8,Math.ceil(gold/25));i++) Sfx.coin(i);
    Haptic.win();
    if(ups) Celebrate.banner('LEVEL '+Game.s.lvl, 'Maximum health now '+Game.s.maxHp, 'var(--gold)', ()=>Sfx.level());
    if(this.wave%5===0) Celebrate.banner('WAVE '+this.wave, 'champion felled', '#ff9c3d', ()=>Sfx.milestone());
    Titles.check();
  },

  take(i){
    const b=this.pending&&this.pending[i];
    if(!b) return;
    this.pending=null;
    b.go(); Game.save(); Sfx.win();
    UI.toast(\`\${b.ic} \${b.nm} claimed.\`);
    this.nextWave();
  },

  // Called by Battle.lose().
  ended(foe){
    this.active=false;
    const record = this.wave >= (Game.s.arenaBest||0);
    Game.s.hp=Math.max(1, Math.round(Game.s.maxHp*.4));
    Game.s.maxHp=Game.maxHp();                 // drop any Vigour stacking
    Game.s.hp=Math.min(Game.s.hp, Game.s.maxHp);
    Game.save();
    UI.go('s-result');
    document.getElementById('resultBody').innerHTML=\`
      <div class="center crest">💀</div>
      <div class="panel center">
        <h1 style="font-size:20px;color:var(--red)">The Arena claims you</h1>
        <div class="sub" style="margin-top:6px">\${foe.nm} ends your run on wave \${this.wave}.</div>
        <hr>
        <div style="font-size:16px;font-weight:800;line-height:1.9">
          <div>Waves survived: <span style="color:var(--gold)">\${this.wave-1}</span></div>
          <div class="coin">\${this.earned} gold carried out</div>
          \${record?'<div style="color:var(--green)">🏅 A new record!</div>':\`<div class="small">Best: wave \${Game.s.arenaBest}</div>\`}
        </div>
        <hr>
        <div class="sub">You keep every coin. The gold is yours whether you walk out or are carried.</div>
      </div>
      <button class="btn gold" onclick="Arena.start()">↻ Enter again</button>
      <button class="btn" onclick="UI.go('s-shop')">🏪 Spend it at the Smithy</button>
      <button class="btn ghost" onclick="UI.go('s-map')">🗺️ Back to the map</button>
      <div style="height:20px"></div>\`;
  },

  retire(){
    this.active=false;
    Game.s.maxHp=Game.maxHp();
    Game.s.hp=Math.min(Game.s.hp, Game.s.maxHp);
    Game.save();
    UI.go('s-map');
    UI.toast(\`🚪 Retired on wave \${this.wave} with \${this.earned} gold.\`);
  }
};

/* ---------------------------------- UI ------------------------------------ */
const UI = {
  hist:[],
  go(id, noPush){
    const cur=document.querySelector('.screen.on');
    if(cur && cur.id!==id && Prefs.d.motion) this.glint();
    if(cur && cur.id!==id && !noPush) this.hist.push(cur.id);
    document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));
    window.scrollTo(0,0);
    if(id!=='s-battle') Anim.stop();
    if(id==='s-map') this.renderMap();
    if(id==='s-shop') this.renderShop();
    if(id==='s-gear') this.renderGear();
    if(id==='s-tome') this.renderTome();
    if(id==='s-train') Train.renderPick();
    if(id==='s-prefs') this.renderPrefs();
  },
  back(){ const p=this.hist.pop()||'s-title'; this.go(p, true); },
  glint(){
    const w=document.getElementById('wipe'); if(!w) return;
    w.classList.remove('go'); void w.offsetWidth;      // restart the animation
    w.classList.add('go');
    setTimeout(()=>w.classList.remove('go'), 380);
  },
  toast(msg){
    const d=document.createElement('div'); d.className='toast'; d.innerHTML=msg;
    document.body.appendChild(d);
    setTimeout(()=>{ d.style.transition='opacity .3s'; d.style.opacity=0; setTimeout(()=>d.remove(),320); },1800);
  },
  hud(){
    const g=Game.s;
    const pct=clamp(Math.round(g.xp/Game.xpNeeded()*100),0,100);
    const days=(g.streak&&g.streak.days)||0;
    return \`<span>🛡️ \${g.lvl}</span><span>❤️ \${Math.round(g.hp)}/\${g.maxHp}</span>
            \${days>1?\`<span title="day streak">🔥 \${days}</span>\`:''}
            <span class="sp"></span>
            <span class="xpwrap"><div class="xptrack"><div style="width:\${pct}%"></div></div></span>
            <span class="coin">🪙 \${g.gold}</span>\`;
  },
  renderPrefs(){
    const row=(k,ic,nm,ds)=>\`<div class="pref \${Prefs.d[k]?'on':''}" onclick="Prefs.toggle('\${k}')">
        <div style="font-size:20px">\${ic}</div>
        <div style="flex:1"><div style="font-weight:800;font-size:14px">\${nm}</div>
        <div class="small">\${ds}</div></div><div class="sw"><i></i></div></div>\`;
    document.getElementById('prefList').innerHTML=\`
      <div class="panel"><h2>⚙️ Settings</h2>
        \${row('sound','🔊','Sound','Strikes, streak tones and fanfares')}
        \${row('motion','✨','Full motion','Screen shake, hit-stop, particles and slow-motion')}
        \${row('haptics','📳','Haptics','Vibration on hits, where the device supports it')}
      </div>
      <div class="panel"><h2>🏅 Titles</h2>
        <div class="sub" style="margin-bottom:6px">\${Titles.count()} of \${TITLES.length} earned.</div>
        \${TITLES.map(t=>{const got=Game.s&&Game.s.titles&&Game.s.titles[t.id];
          return \`<span class="medal \${got?'got':''}">\${got?t.ic:'🔒'} \${t.nm}
            <span class="small" style="font-weight:400">— \${t.ds}</span></span>\`;}).join('')}
      </div>\`;
  },
  renderMap(){
    if(!Game.s) return;
    Game.s.maxHp=Game.maxHp();
    Game.s.hp=Math.min(Game.s.hp,Game.s.maxHp);
    ['hud','hud2','hud3'].forEach(id=>{const el=document.getElementById(id); if(el) el.innerHTML=this.hud();});
    const g=Game.s, list=document.getElementById('mapList');
    Bounty.ensure();
    const st=Daily.state(), nx=Bounty.nextUnlock();
    let out=\`<div class="panel" style="padding:11px">
      <div class="node" style="margin:0 0 8px" onclick="Daily.start()">
        <div class="ico" style="font-size:24px">🗡️</div>
        <div style="flex:1">
          <div class="nm">Daily Skirmish \${st.best?\`<span class="tag g">best \${st.best}</span>\`:'<span class="tag">new today</span>'}</div>
          <div class="dt">\${Daily.LEN} riddles from today's seed · same for everyone</div>
        </div>
        <div style="font-size:20px;color:var(--dim)">▶</div>
      </div>
      <div class="small" style="margin:8px 0 4px;font-weight:800;color:var(--gold)">📜 Bounties</div>
      \${g.bounties.map(b=>{
        const pct=Math.round(b.p/b.n*100);
        return \`<div style="margin:6px 0">
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span>\${Bounty.txt(b)}</span>
            <span class="coin">🪙 \${b.gold} <span class="small">\${b.p}/\${b.n}</span></span></div>
          <div class="track thin"><div class="fill" style="width:\${pct}%;background:var(--gold)"></div></div>
        </div>\`;}).join('')}
      \${nx?\`<hr><div style="display:flex;justify-content:space-between;font-size:12px">
          <span>Next unlock: <b>\${nx.ic} \${nx.nm}</b></span>
          <span class="coin">\${g.gold}/\${nx.cost}</span></div>
        <div class="track thin"><div class="fill" style="width:\${clamp(g.gold/nx.cost*100,0,100)}%;background:linear-gradient(90deg,#5aa9e6,#a06bd6)"></div></div>\`
        :'<hr><div class="small">Every weapon and every plate is yours.</div>'}
    </div>\`;
    REALMS.forEach((r,ri)=>{
      const prevBossKey=(ri-1)+':'+(REALMS[ri-1]?REALMS[ri-1].foes.length-1:0);
      const unlocked = ri===0 || !!g.cleared[prevBossKey];
      out+=\`<div class="realmhdr"><span class="dot" style="background:\${r.col}"></span>
            <h2 style="color:\${r.col}">\${r.nm}</h2>\${unlocked?'':'<span class="tag">🔒 sealed</span>'}</div>
            <div class="small" style="margin:2px 0 4px">\${r.pool.map(k=>TOPIC_LABEL[k]).join(' · ')}</div>\`;
      r.foes.forEach((f,fi)=>{
        const done=!!g.cleared[ri+':'+fi];
        const prevDone = fi===0 || !!g.cleared[ri+':'+(fi-1)];
        const open = unlocked && prevDone;
        out+=\`<div class="node \${open?'':'locked'} \${done?'done':''}" onclick="Battle.begin(\${ri},\${fi})">
          <div class="ico" style="font-size:24px">\${f.boss?'👑':'👾'}</div>
          <div style="flex:1">
            <div class="nm">\${f.nm} \${done?'<span class="tag g">cleared</span>':''}\${f.boss?'<span class="tag r">boss</span>':''}</div>
            <div class="dt">❤️ \${f.hp} · ⚔️ \${f.atk} · 🪙 \${f.gold}</div>
          </div>
          <div style="font-size:20px;color:var(--dim)">\${open?'▶':'🔒'}</div>
        </div>\`;
      });
    });
    // The Arena sits past the campaign, opened by the last boss.
    const aOpen=Arena.unlocked(), best=g.arenaBest||0;
    out+=\`<div class="realmhdr"><span class="dot" style="background:var(--gold)"></span>
          <h2 style="color:var(--gold)">The Arena</h2>\${aOpen?'':'<span class="tag">🔒 sealed</span>'}</div>
      <div class="small" style="margin:2px 0 4px">Endless waves drawing on every topic in the game. No free healing. You keep the gold either way.</div>
      <div class="node \${aOpen?'':'locked'}" onclick="Arena.start()">
        <div class="ico" style="font-size:24px">🏟️</div>
        <div style="flex:1">
          <div class="nm">Endless Waves \${best?\`<span class="tag g">best: wave \${best}</span>\`:''}</div>
          <div class="dt">\${aOpen?'Scaling foes · boons every 3 waves · a breather every 5':'Defeat the Eigen Dragon to open the gates'}</div>
        </div>
        <div style="font-size:20px;color:var(--dim)">\${aOpen?'▶':'🔒'}</div>
      </div>\`;
    list.innerHTML=out;
  },
  renderShop(){
    const g=Game.s, out=[];
    const buy=(kind,id,cost,owned)=>\`onclick="Shop.buy('\${kind}','\${id}',\${cost})"\`;
    out.push('<div class="panel"><h2>⚔️ Weapons</h2>');
    WEAPONS.forEach(w=>{
      const owned=!!g.owned[w.id], eq=g.weapon===w.id;
      out.push(\`<div class="item \${eq?'equipped':''}">
        <div class="ic">\${w.ic}</div>
        <div style="flex:1"><div class="nm">\${w.nm}</div><div class="ds">\${w.ds}</div>
          <div class="ds">⚔️ \${w.dmg} damage · \${Math.round(w.crit*100)}% crit</div></div>
        \${eq?'<span class="pill">equipped</span>':
          owned?\`<button class="btn sm" style="width:auto" onclick="Shop.equip('w','\${w.id}')">Equip</button>\`:
          \`<button class="btn sm gold" style="width:auto" \${buy('w',w.id,w.cost)}>🪙 \${w.cost}</button>\`}
      </div>\`);
    });
    out.push('</div><div class="panel"><h2>🛡️ Armour</h2>');
    ARMORS.forEach(a=>{
      const owned=!!g.owned[a.id], eq=g.armor===a.id;
      out.push(\`<div class="item \${eq?'equipped':''}">
        <div class="ic">\${a.ic}</div>
        <div style="flex:1"><div class="nm">\${a.nm}</div><div class="ds">\${a.ds}</div>
          <div class="ds">🛡️ \${a.def} defence · ❤️ +\${a.hp} health</div></div>
        \${eq?'<span class="pill">equipped</span>':
          owned?\`<button class="btn sm" style="width:auto" onclick="Shop.equip('a','\${a.id}')">Equip</button>\`:
          \`<button class="btn sm gold" style="width:auto" \${buy('a',a.id,a.cost)}>🪙 \${a.cost}</button>\`}
      </div>\`);
    });
    out.push('</div><div class="panel"><h2>🧪 Relics &amp; Draughts</h2>');
    Object.entries(ITEMS).forEach(([k,it])=>{
      out.push(\`<div class="item">
        <div class="ic">\${it.ic}</div>
        <div style="flex:1"><div class="nm">\${it.nm} <span class="tag">held ×\${g.items[k]}</span></div>
        <div class="ds">\${it.ds}</div></div>
        <button class="btn sm gold" style="width:auto" onclick="Shop.buyItem('\${k}',\${it.cost})">🪙 \${it.cost}</button>
      </div>\`);
    });
    out.push('</div>');
    document.getElementById('shopList').innerHTML=out.join('');
    document.getElementById('hud2').innerHTML=this.hud();
  },
  renderGear(){
    const g=Game.s, w=Game.weapon(), a=Game.armor();
    const acc=g.stats.correct+g.stats.wrong;
    const rows=Object.entries(g.topicStats).filter(([k,v])=>v.seen>0).sort((x,y)=>x[1].m-y[1].m);
    const solid=rows.filter(([k,v])=>v.m>=0.85).length;
    const shaky=rows.filter(([k,v])=>v.m<0.6).length;
    const dueN=Mastery.dueList().length;
    const untouched=Object.keys(TOPIC_LABEL).length-rows.length;
    document.getElementById('hud3').innerHTML=this.hud();
    document.getElementById('gearList').innerHTML=\`
      <div class="panel"><h2>🎒 Your Gear</h2>
        <div class="item equipped"><div class="ic">\${w.ic}</div>
          <div style="flex:1"><div class="nm">\${w.nm}</div><div class="ds">⚔️ \${w.dmg} damage · \${Math.round(w.crit*100)}% crit</div></div></div>
        <div class="item equipped"><div class="ic">\${a.ic}</div>
          <div style="flex:1"><div class="nm">\${a.nm}</div><div class="ds">🛡️ \${a.def} defence · ❤️ +\${a.hp} health</div></div></div>
        <hr>
        <div class="row" style="flex-wrap:wrap">
          \${Object.entries(ITEMS).map(([k,it])=>\`<span class="pill">\${it.ic} \${g.items[k]}</span>\`).join('')}
        </div>
      </div>
      <div class="panel"><h2>📜 Chronicle</h2>
        <div class="sub">Battles won: <b>\${g.stats.wins}</b> · Riddles solved: <b>\${g.stats.correct}</b> ·
        Accuracy: <b>\${acc?Math.round(g.stats.correct/acc*100):0}%</b> · Best streak: <b>\${g.stats.best}</b></div>
        <hr>
        <div class="small" style="margin-bottom:6px">
          Mastery, weakest first. The game uses this to choose what to ask you next.<br>
          <b style="color:var(--green)">\${solid} solid</b> ·
          <b style="color:var(--red)">\${shaky} need work</b> ·
          <b style="color:var(--purple)">\${dueN} due for review</b>\${untouched?\` · \${untouched} not yet seen\`:''}
        </div>
        \${rows.length?rows.map(([k,v])=>{
          const pct=Math.round(v.m*100), col=Mastery.colour(v.m);
          const due=Mastery.overdue(k);
          return \`<div style="margin:6px 0">
            <div style="display:flex;justify-content:space-between;font-size:12px">
              <span>\${TOPIC_LABEL[k]||k}\${due?' <span class="rev">⟳ due</span>':''}</span>
              <span style="color:\${col}">\${Mastery.label(v.m)} \${pct}%
                <span class="small">(\${v.c}/\${v.seen})</span></span></div>
            <div class="track thin"><div class="fill" style="width:\${pct}%;background:\${col}"></div></div></div>\`;
        }).join(''):'<div class="small">No riddles answered yet.</div>'}
        \${rows.length?\`<button class="btn sm" style="margin-top:10px"
           onclick="UI.go('s-train');Train.startPool('weak')">⚠️ Drill my weakest topics</button>\`:''}
      </div>\`;
  },
  renderTome(){
    document.getElementById('tomeList').innerHTML =
      TOME.map(p=>\`<div class="panel"><h2 style="font-size:16px;color:var(--gold)">\${p.t}</h2>
        <div class="sub" style="margin-top:6px;font-size:14px">\${p.b}</div></div>\`).join('');
  }
};

const Shop = {
  buy(kind,id,cost){
    const g=Game.s;
    if(g.owned[id]) return;
    if(g.gold<cost){ UI.toast('Not enough gold, knight.'); return; }
    g.gold-=cost; g.owned[id]=1;
    if(kind==='w') g.weapon=id;
    else { g.armor=id; g.maxHp=Game.maxHp(); g.hp=Math.min(g.maxHp, g.hp + ARMORS.find(a=>a.id===id).hp); }
    Sfx.coin(); Game.save(); UI.renderShop();
    UI.toast('Purchased and equipped.');
  },
  equip(kind,id){
    const g=Game.s;
    if(kind==='w') g.weapon=id;
    else { g.armor=id; g.maxHp=Game.maxHp(); g.hp=Math.min(g.hp,g.maxHp); }
    Sfx.coin(); Game.save(); UI.renderShop();
  },
  buyItem(k,cost){
    const g=Game.s;
    if(g.gold<cost){ UI.toast('Not enough gold, knight.'); return; }
    g.gold-=cost; g.items[k]++; Sfx.coin(); Game.save(); UI.renderShop();
    UI.toast(\`\${ITEMS[k].ic} \${ITEMS[k].nm} acquired.\`);
  }
};

/* ------------------------------- training --------------------------------- */
const Train = {
  pool:[], title:'', c:0, w:0, cur:null,
  renderPick(){
    document.getElementById('trainRun').style.display='none';
    document.getElementById('trainPick').style.display='';
    document.getElementById('trainBack').style.display='';
    const groups=[
      ['Vectors',['vecAdd','vecScale','vecCombo','dot','mag','orth']],
      ['Matrices',['matVec','det2','transpose','matMul','trace','solve2','inv2','det3','rank','eigen2','cross','proj']],
      ['Limits & Derivatives',['limPoly','limRational','limInf','powerRule','evalDeriv','trigDeriv','expLog','productRule','quotient','chainRule','tangent','secondDeriv','critical','partial']],
      ['Integrals',['indefPower','defPoly','uSub','intTrig','intExp','area']]
    ];
    // Adaptive drills, offered first — they need no decision from the player.
    const weak = Game.s ? Mastery.weakest(6) : [];
    const due  = Game.s ? Mastery.dueList()  : [];
    let head = '<div class="panel"><h2 style="font-size:15px;color:var(--gold)">Sharpen where it counts</h2>';
    if(weak.length){
      head += \`<button class="btn sm" onclick="Train.startPool('weak')">⚠️ Drill my weakest
        <span class="small" style="font-weight:400"><br>\${weak.slice(0,4).map(k=>TOPIC_LABEL[k]).join(' · ')}\${weak.length>4?' …':''}</span></button>\`;
    }
    if(due.length){
      head += \`<button class="btn sm" onclick="Train.startPool('due')">⟳ Review what's due
        <span class="small" style="font-weight:400"><br>\${due.length} topic\${due.length>1?'s':''} ready to come back</span></button>\`;
    }
    if(!weak.length && !due.length){
      head += '<div class="sub">Answer a few riddles anywhere and the game will start tracking which topics need work.</div>';
    }
    head += '</div>';

    document.getElementById('trainPick').innerHTML = head + groups.map(([nm,keys])=>
      \`<div class="panel"><h2 style="font-size:15px;color:var(--gold)">\${nm}</h2>
        \${keys.map(k=>{
          const r=Game.s&&Game.s.topicStats[k];
          const tag = r&&r.seen ? \`<span class="mtag" style="color:\${Mastery.colour(r.m)}">\${Mastery.label(r.m)}</span>\` : '';
          return \`<button class="btn sm" onclick="Train.startPool('\${k}')">\${TOPIC_LABEL[k]}\${tag}</button>\`;
        }).join('')}
      </div>\`).join('');
  },
  startPool(what){
    if(what==='weak'){ this.pool=Mastery.weakest(6); this.title='Weakest topics'; }
    else if(what==='due'){ this.pool=Mastery.dueList(); this.title='Due for review'; }
    else { this.pool=[what]; this.title=TOPIC_LABEL[what]; }
    if(!this.pool.length){ UI.toast('Nothing to drill yet — play a few rounds first.'); return; }
    this.c=0; this.w=0;
    document.getElementById('trainPick').style.display='none';
    document.getElementById('trainBack').style.display='none';
    document.getElementById('trainRun').style.display='';
    this.next();
  },
  next(){
    document.getElementById('tExplain').style.display='none';
    const key = this.pool.length>1 ? Mastery.pick(this.pool) : this.pool[0];
    const diff = Game.s ? Mastery.adjustDiff(key, 2) : R.i(1,3);
    this.cur=buildQuestion(key, diff);
    document.getElementById('tTopic').innerHTML =
      (this.pool.length>1 ? this.title+' — ' : '') + this.cur.topic +
      (Game.s&&Mastery.isReview(key) ? ' <span class="rev">⟳ review</span>' : '');
    document.getElementById('tQ').innerHTML=this.cur.q;
    const box=document.getElementById('tChoices'); box.innerHTML='';
    this.cur.choices.forEach(c=>{
      const b=document.createElement('button');
      b.className='btn choice'; b.innerHTML=c;
      if(c===this.cur.a) b.dataset.correct='1';
      b.onclick=()=>this.answer(b,c);
      box.appendChild(b);
    });
    document.getElementById('tScore').textContent=\`✅ \${this.c}   ❌ \${this.w}\`;
  },
  answer(btn,choice){
    const ok=choice===this.cur.a;
    document.querySelectorAll('#tChoices .choice').forEach(b=>{
      b.onclick=null;
      if(b.dataset.correct==='1') b.classList.add('right');
      else if(b===btn) b.classList.add('wrong'); else b.classList.add('faded');
    });
    if(ok){ this.c++; Sfx.good(); } else { this.w++; Sfx.bad(); }
    if(Game.s){ Game.recordAnswer(this.cur.key, ok); Game.save(); }
    const e=document.getElementById('tExplain');
    const miss = !ok && this.cur.why[choice];
    e.style.display='block';
    e.innerHTML=\`<div style="font-weight:900;color:\${ok?'var(--green)':'var(--red)'};margin-bottom:6px">
        \${ok?'Correct.':'Not quite — the answer was <span style="color:var(--gold)">'+this.cur.a+'</span>.'}</div>
      \${miss?\`<div class="miss">You chose <b>\${choice}</b>: \${miss}.</div>\`:''}
      <div>\${this.cur.ex}</div>
      <button class="btn gold" style="margin-top:10px" onclick="Train.next()">Next riddle ▶</button>\`;
    document.getElementById('tScore').textContent=\`✅ \${this.c}   ❌ \${this.w}\`;
  },
  quit(){ this.renderPick(); }
};

/* -------------------------------- boot ------------------------------------ */
(function boot(){
  Prefs.load();
  if(Game.load()){
    document.getElementById('btnContinue').style.display='';
    document.getElementById('resetRow').style.display='';
    const days=Game.touchStreak();
    const st=Game.s.streak||{days:0};
    document.getElementById('streakRow').innerHTML = st.days>0
      ? \`<div class="streakbox"><div class="n">\${st.days}</div>
         <div><div style="font-weight:800;font-size:14px">day\${st.days===1?'':'s'} in a row</div>
         <div class="small">\${st.days>1?'Keep the fire lit — come back tomorrow.':'A streak begins.'}</div></div></div>\`
      : '';
    if(days && days>1) setTimeout(()=>Celebrate.banner('🔥 '+days+' DAY STREAK','welcome back','#ff9c3d',
      ()=>{Sfx.milestone(); Haptic.win();}), 400);
    Titles.check();
  }
  fitCanvas();
  const wake=()=>Sfx.init();
  document.addEventListener('touchstart',wake,{once:true});
  document.addEventListener('click',wake,{once:true});
  // prevent iOS double-tap zoom on rapid answering
  let lastTouch=0;
  document.addEventListener('touchend',e=>{
    const now=Date.now();
    if(now-lastTouch<=300){ e.preventDefault(); }
    lastTouch=now;
  },{passive:false});
})();
</script>
</body>
</html>
`;

const SAVE_FILE = "eigenrealm-save.json";
const fm = FileManager.local();
const savePath = fm.joinPath(fm.documentsDirectory(), SAVE_FILE);

// Pull any previously saved progress off disk so it survives app restarts.
let restored = "null";
if (fm.fileExists(savePath)) {
  try { restored = fm.readString(savePath) || "null"; } catch (e) { restored = "null"; }
}

// Bridge: seed localStorage before the game boots, and hand progress back
// to Scriptable whenever it changes.
const BRIDGE = `
(function(){
  var KEY = "eigenrealm.v1";
  var seed = ${JSON.stringify(restored)};
  try {
    if (seed && seed !== "null" && !localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, seed);
    }
  } catch(e) {}
  // Mirror every write back out so the native side can persist it.
  window.__lastSave = null;
  setInterval(function(){
    try { window.__lastSave = localStorage.getItem(KEY); } catch(e) {}
  }, 1000);
})();
`;

const wv = new WebView();
await wv.loadHTML(HTML);
await wv.evaluateJavaScript(BRIDGE, false);
await wv.present(true);

// After the player closes the view, write their progress to disk.
try {
  const finalSave = await wv.evaluateJavaScript(
    'completion(localStorage.getItem("eigenrealm.v1"))', true
  );
  if (finalSave) fm.writeString(savePath, finalSave);
} catch (e) {
  // Nothing to persist — the player may have closed before any progress.
}

Script.complete();
