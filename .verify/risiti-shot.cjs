const {chromium}=require('playwright');
const path=require('path');
const DIST='http://localhost:4501/';

const seeds={
  duka:{render:'risiti',
    row:{risiti_no:'DL-2026-000418',amount:15000,days:30,plan:'basic',status:'paid',
      paid_at:'2026-11-24T06:14:00Z',phone:'0754812390',user_email:'mwajuma@gmail.com',
      business_name:'DUKA LA MAMA JOHN',channel:'mpesa',provider:'snippe',
      external_id:'CJ26112409KX',provider_ref:'DL-7F3A91C4',inaisha:'2026-12-24T06:14:00Z'},
    biz:{name:'DUKA LA MAMA JOHN',region:'Tabora',district:'Urambo',akaunti_aina:'zote'}},
  uwakala:{render:'risiti',hadhara:true,
    row:{risiti_no:'DL-2026-000419',amount:18300,days:30,status:'paid',
      paid_at:'2026-11-24T06:20:00Z',phone:'0754****90',provider:'snippe',
      provider_ref:'WK-8821XZ',inaisha:'2027-01-05T06:20:00Z',aina:'uwakala'},
    biz:{name:'WAKALA WA MWAJUMA',region:'Tabora',district:'Urambo',akaunti_aina:'uwakala'}},
};

(async()=>{
  const b=await chromium.launch();
  for(const [name,seed] of Object.entries(seeds)){
    const p=await b.newPage({viewport:{width:760,height:1500},deviceScaleFactor:2});
    const errs=[];
    p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
    await p.addInitScript(s=>{window.__seed=s},seed);
    await p.goto(DIST);
    await p.waitForSelector('#ready',{timeout:15000});
    await p.waitForTimeout(500);
    await p.screenshot({path:`/tmp/pgwork/risiti-${name}.png`,fullPage:true});
    // ukaguzi wa maandishi
    const txt=await p.innerText('body');
    console.log(`--- ${name} ---`);
    console.log('  namba:', txt.includes(seed.row.risiti_no)?'OK':'HAIPO');
    console.log('  QR   :', await p.locator('svg[role=img]').count()?'OK':'HAIPO');
    console.log('  barua:', txt.includes('mwajuma@gmail.com'));
    console.log('  errs :', errs.length?errs.slice(0,3):'hakuna');
    // simu ndogo
    const m=await b.newPage({...require('playwright').devices['iPhone 12']});
    await m.addInitScript(s=>{window.__seed=s},seed);
    await m.goto(DIST); await m.waitForSelector('#ready'); await m.waitForTimeout(400);
    const w=await m.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);
    console.log('  simu :', w[0]<=w[1]+1?'hakuna kusogea kwa upana':`KUSOGEA! ${w[0]}>${w[1]}`);
    await m.screenshot({path:`/tmp/pgwork/risiti-${name}-simu.png`,fullPage:true});
    await m.close(); await p.close();
  }
  await b.close();
})();
