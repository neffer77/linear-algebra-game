const path=require('path');
const {loadPlaywright,launchOptions,sleep}=require('../play/harness');
(async()=>{
  const {chromium}=loadPlaywright();
  const b=await chromium.launch(launchOptions());
  for(const [tag,scheme] of [['light','light'],['dark','dark']]){
    const c=await b.newContext({viewport:{width:900,height:1200},colorScheme:scheme,deviceScaleFactor:1});
    const p=await c.newPage();
    const errs=[];
    p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
    await p.goto('file://'+__dirname+'/muster-built.html');
    await sleep(1200);
    const r=await p.evaluate(()=>{
      const imgs=[...document.querySelectorAll('img')].map(i=>({id:i.id,w:i.naturalWidth}));
      return {broken:imgs.filter(i=>!i.w).map(i=>i.id), count:imgs.length,
        rows:[...document.querySelectorAll('.row')].length,
        lit:[...document.querySelectorAll('.row.lit')].length,
        absent:[...document.querySelectorAll('.row.absent')].length,
        scores:[...document.querySelectorAll('.channel-head .score')].map(x=>x.textContent.trim()),
        tally:[...document.querySelectorAll('.tally b')].map(x=>x.textContent.trim()),
        foot:[...document.querySelectorAll('.foot span')].map(x=>x.textContent.trim()),
        overflow: document.documentElement.scrollWidth > window.innerWidth};
    });
    console.log('---',tag,'--- errors:',errs.length?errs:'none');
    console.log('  images',r.count,'broken:',r.broken);
    console.log('  rows',r.rows,'lit',r.lit,'absent',r.absent,'| scores:',r.scores.join(' '));
    console.log('  tally:',r.tally.slice(0,4).join(' '));
    console.log('  foot:',r.foot.join(' · '),'| overflow:',r.overflow);
    await p.screenshot({path:__dirname+`/render-${tag}.png`});
    await c.close();
  }
  await b.close();
})();
