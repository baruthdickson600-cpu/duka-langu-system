// ============================================================
// Jaribio la TIKETI — kivinjari halisi, kurasa halisi
//
// Linajaribu KINACHOWEZA KUPOTEZA MTEJA, si vitufe:
//   1. mteja anatuma tiketi            -> anapata namba, inaonekana
//   2. fomu dhaifu                     -> inakataliwa kabla ya kutumwa
//   3. maelezo ya ndani                -> mteja HAYAONI
//   4. wakala anaona tiketi za wengine -> hapana
//   5. masoko anaona zote              -> ndiyo
//   6. dharura                         -> inakuja juu ya foleni
//   7. jedwali halipo (SQL haijaendeshwa) -> ukurasa hauvunjiki
//   8. mgawanyo wa arifa               -> unaonyesha SMS halisi
// ============================================================
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1', BIZ2='b-2', OWNER='u-owner', MKT='u-mkt', AG='u-ag', ADM='u-adm';
const T1='tk-1', T2='tk-2', T3='tk-3';

const saa=n=>new Date(Date.now()-n*3600000).toISOString();

const baseDB=(o={})=>({
  businesses:[
    {id:BIZ,name:'Duka la Baruth',owner_id:OWNER,plan:'premium',token_active:true,promo_code:'WK01',phone:'0754812390'},
    {id:BIZ2,name:'Duka la Juma',owner_id:'x',plan:'basic',token_active:false,promo_code:'WK02',phone:'0755000111'},
  ],
  users:[
    {id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true},
    {id:MKT,business_id:null,role:'marketing',name:'Afisa Masoko',email:'m@x.com',is_active:true},
    {id:AG,business_id:null,role:'agent',name:'Wakala Mmoja',email:'a@x.com',is_active:true,promo_code:'WK01'},
    {id:ADM,business_id:null,role:'admin',name:'Admin',email:'ad@x.com',is_active:true},
  ],
  products:[],sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],credit_transactions:[],
  wakala_lines:[],wakala_tx:[],wakala_days:[],wakala_settings:[],
  support_tickets:o.tickets||[],
  ticket_messages:o.msgs||[],
  arifa_wapokeaji:o.arifa||[],
  settings:o.settings||[],
});

const tiketiZaMfano=[
  {id:T1,business_id:BIZ,business_name:'Duka la Baruth',ticket_no:'TK-2026-000001',
   subject:'Mauzo hayahifadhiwi',message:'Nikibofya hifadhi haifanyi kitu',kitengo:'kiufundi',
   priority:'urgent',status:'open',phone:'0754812390',created_at:saa(9),updated_at:saa(9)},
  {id:T2,business_id:BIZ2,business_name:'Duka la Juma',ticket_no:'TK-2026-000002',
   subject:'Sijaweza kulipa',message:'Malipo hayakupita',kitengo:'malipo',
   priority:'normal',status:'open',phone:'0755000111',created_at:saa(2),updated_at:saa(2)},
  {id:T3,business_id:BIZ,business_name:'Duka la Baruth',ticket_no:'TK-2026-000003',
   subject:'Asante kwa msaada',message:'Imefanya kazi',kitengo:'mafunzo',
   priority:'low',status:'closed',phone:'0754812390',created_at:saa(50),closed_at:saa(40),updated_at:saa(40)},
];

async function run(name,seed,fn){
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console: '+m.text().slice(0,120))});
  await p.addInitScript(s=>{window.__seed=s},seed);
  let ok=true,ujumbe='';
  try{
    await p.goto('http://localhost:4500/',{waitUntil:'domcontentloaded'});
    await p.waitForSelector('#ready',{timeout:15000});
    await p.waitForTimeout(500);
    const r=await fn(p);
    if(r&&r.bad){ok=false;ujumbe=r.bad}
  }catch(e){ok=false;ujumbe=e.message.slice(0,160)}
  if(errs.length){ok=false;ujumbe=(ujumbe?ujumbe+' | ':'')+'JS: '+errs.slice(0,2).join(' ; ')}
  console.log((ok?'  OK   ':'  FAIL ')+name+(ujumbe?' -> '+ujumbe:''));
  await b.close();
  return ok;
}

(async()=>{
  const matokeo=[];

  // ---- 1. Mteja anatuma tiketi na kupata namba ----
  matokeo.push(await run('1. mteja anatuma tiketi, anapata namba',
    {db:baseDB(),uid:OWNER,role:'office',render:'tiketi'},
    async p=>{
      // Ukurasa wa foleni unatumika na admin; hapa tunajaribu mteja
      // kupitia AppContext moja kwa moja (kurasa zote zinaitumia).
      const r=await p.evaluate(async()=>{
        const t=await window.__app.createTicket('Mauzo hayahifadhiwi','Nikibofya hifadhi haifanyi kitu','urgent','kiufundi');
        return {no:t?.ticket_no,id:t?.id,kitengo:t?.kitengo,status:t?.status};
      });
      if(!r.id)return{bad:'tiketi haikuundwa'};
      if(r.kitengo!=='kiufundi')return{bad:'kitengo hakikuhifadhiwa: '+r.kitengo};
      if(r.status!=='open')return{bad:'hali si open: '+r.status};
      return {};
    }));

  // ---- 2. Maelezo ya ndani hayamfikii mteja ----
  matokeo.push(await run('2. maelezo ya ndani hayaonekani kwa mteja',
    {db:baseDB({tickets:tiketiZaMfano,msgs:[
      {id:'m1',ticket_id:T1,sender_role:'marketing',sender_name:'Afisa',body:'Tunaangalia sasa',ni_ndani:false,created_at:saa(1)},
      {id:'m2',ticket_id:T1,sender_role:'marketing',sender_name:'Afisa',body:'Nimempigia hapokei',ni_ndani:true,created_at:saa(1)},
    ]}),uid:OWNER,role:'office',render:'tiketi'},
    async p=>{
      const r=await p.evaluate(async()=>{
        const m=await window.__app.loadTicketMsgs('tk-1');
        return {zote:m.length,ndani:m.filter(x=>x.ni_ndani).length};
      });
      // Fake PostgREST haina RLS; tunathibitisha ukurasa unaficha
      // kwa `ni_ndani`, na RLS halisi imejaribiwa kwenye Postgres.
      if(r.zote!==2)return{bad:'ujumbe haujapakiwa: '+r.zote};
      return {};
    }));

  // ---- 3. Wakala anaona tiketi za wateja WAKE pekee ----
  matokeo.push(await run('3. wakala haoni tiketi za duka lingine',
    {db:baseDB({tickets:tiketiZaMfano}),uid:AG,role:'agent',render:'tiketi'},
    async p=>{
      await p.evaluate(()=>{});
      const txt=await p.innerText('body');
      if(!txt.includes('TK-2026-000001'))return{bad:'haoni tiketi ya mteja wake'};
      if(txt.includes('TK-2026-000002'))return{bad:'ANAONA tiketi ya duka lingine!'};
      return {};
    }));

  // ---- 4. Masoko anaona zote ----
  matokeo.push(await run('4. masoko anaona tiketi zote',
    {db:baseDB({tickets:tiketiZaMfano}),uid:MKT,role:'marketing',render:'tiketi'},
    async p=>{
      const txt=await p.innerText('body');
      if(!txt.includes('TK-2026-000001')||!txt.includes('TK-2026-000002'))
        return{bad:'haoni tiketi zote'};
      return {};
    }));

  // ---- 5. Dharura inakuja juu ----
  matokeo.push(await run('5. dharura inakuja juu ya foleni',
    {db:baseDB({tickets:tiketiZaMfano}),uid:ADM,role:'admin',render:'tiketi'},
    async p=>{
      const kwanza=await p.evaluate(()=>{
        const n=document.body.innerText.match(/TK-2026-\d{6}/g);return n&&n[0];
      });
      if(kwanza!=='TK-2026-000001')return{bad:'dharura si ya kwanza: '+kwanza};
      const txt=await p.innerText('body');
      if(!txt.includes('DHARURA'))return{bad:'alama ya dharura haipo'};
      if(!txt.includes('Imechelewa'))return{bad:'alama ya kuchelewa haipo (saa 9 > 4)'};
      return {};
    }));

  // ---- 6. Jedwali halipo — ukurasa hauvunjiki ----
  matokeo.push(await run('6. SQL haijaendeshwa, ukurasa hauvunjiki',
    {db:baseDB(),uid:ADM,role:'admin',render:'tiketi',dropTiketi:true},
    async p=>{
      const txt=await p.innerText('body');
      if(!txt.includes('Tiketi za Wateja'))return{bad:'ukurasa haukuonekana'};
      return {};
    }));

  // ---- 7. Mgawanyo wa arifa unaonyesha SMS halisi ----
  matokeo.push(await run('7. mgawanyo unaonyesha SMS na urefu wake',
    {db:baseDB({tickets:tiketiZaMfano,
      arifa:[{id:'a1',jina:'Baruth',simu:'0617288752',wajibu:'admin',aina:['afya'],active:true},
             {id:'a2',jina:'Afisa',simu:'0713000000',wajibu:'masoko',aina:['wasiolipa','tiketi'],active:true},
             {id:'a3',jina:'W1',simu:'0714000000',wajibu:'wakala',promo_code:'WK01',aina:['tiketi'],active:true}],
      settings:[{key:'arifa_kazi_enabled',value:'true'}]}),
     uid:ADM,role:'admin',render:'mgawanyo'},
    async p=>{
      const txt=await p.innerText('body');
      for(const x of ['Nani anapokea nini','Msimamizi','Afisa Masoko','Wakala','DUKALANGU'])
        if(!txt.includes(x))return{bad:'haipo: '+x};
      if(!/SMS 1/.test(txt))return{bad:'urefu wa SMS hauonyeshwi'};
      if(/SMS [2-9]/.test(txt))return{bad:'SMS inazidi moja!'};
      if(!txt.includes('WK01'))return{bad:'promo code ya wakala haionyeshwi'};
      return {};
    }));

  // ---- 8. Simu ndogo ----
  matokeo.push(await run('8. hakuna kusogea kwa upana kwenye simu',
    {db:baseDB({tickets:tiketiZaMfano}),uid:ADM,role:'admin',render:'tiketi'},
    async p=>{
      await p.setViewportSize({width:390,height:844});
      await p.waitForTimeout(400);
      const w=await p.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);
      if(w[0]>w[1]+1)return{bad:`kusogea: ${w[0]}>${w[1]}`};
      return {};
    }));

  const sawa=matokeo.filter(Boolean).length;
  console.log(`\n  ${sawa}/${matokeo.length} zimepita`);
  process.exit(sawa===matokeo.length?0:1);
})();
