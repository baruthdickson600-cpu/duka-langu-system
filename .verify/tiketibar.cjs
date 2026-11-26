// ============================================================
// Jaribio la KADI YA TIKETI JUU YA DASHIBODI
//
// Baruth aliomba: "itoe side bar ya ticket iweke kwenye
// dashibodi niwe naiona vizuri, na iwe na notification ya
// kunionyesha tiketi mpya imeingia."
//
// Kinachojaribiwa ni kile kinachoweza kumpotezea mteja:
//   1. dharura inakuja juu ya foleni
//   2. alama ya MPYA inaonekana, na inaisha baada ya kuzifungua
//   3. wakala haoni tiketi za duka lingine
//   4. tiketi zilizofungwa hazihesabiwi
//   5. jedwali halipo (SQL haijaendeshwa) -> hauvunjiki
// ============================================================
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1',BIZ2='b-2',ADM='u-adm',AG='u-ag';
const saa=n=>new Date(Date.now()-n*3600000).toISOString();

const tiketi=[
  {id:'t1',business_id:BIZ,business_name:'Duka la Baruth',ticket_no:'TK-2026-000001',
   subject:'Mauzo hayahifadhiwi',kitengo:'kiufundi',priority:'normal',status:'open',created_at:saa(3)},
  {id:'t2',business_id:BIZ2,business_name:'Duka la Juma',ticket_no:'TK-2026-000002',
   subject:'Mfumo umesimama kabisa',kitengo:'kiufundi',priority:'urgent',status:'open',created_at:saa(1)},
  {id:'t3',business_id:BIZ,business_name:'Duka la Baruth',ticket_no:'TK-2026-000003',
   subject:'Asante kwa msaada',kitengo:'mafunzo',priority:'low',status:'closed',created_at:saa(40)},
];

const db=(o={})=>({
  businesses:[{id:BIZ,name:'Duka la Baruth',owner_id:'o1',promo_code:'WK01',token_active:true},
              {id:BIZ2,name:'Duka la Juma',owner_id:'o2',promo_code:'WK02',token_active:true}],
  users:[{id:ADM,role:'admin',name:'Baruth',email:'ad@x.com',is_active:true},
         {id:AG,role:'agent',name:'Juma',email:'a@x.com',is_active:true,promo_code:'WK01'}],
  support_tickets:o.tiketi||tiketi,ticket_messages:[],
  products:[],sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],
  credit_transactions:[],wakala_lines:[],wakala_tx:[],wakala_days:[],wakala_settings:[],settings:[],
});

async function run(jina,seed,fn){
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console: '+m.text().slice(0,120))});
  await p.addInitScript(s=>{window.__seed=s},seed);
  let ok=true,uj='';
  try{
    await p.goto('http://localhost:4500/',{waitUntil:'domcontentloaded'});
    await p.waitForSelector('#ready',{timeout:15000});
    await p.waitForTimeout(600);
    const r=await fn(p);
    if(r&&r.bad){ok=false;uj=r.bad}
  }catch(e){ok=false;uj=e.message.slice(0,160)}
  if(errs.length){ok=false;uj=(uj?uj+' | ':'')+'JS: '+errs.slice(0,2).join(' ; ')}
  console.log((ok?'  OK   ':'  FAIL ')+jina+(uj?' -> '+uj:''));
  await b.close();return ok;
}

const bofyaZifungue=p=>p.evaluate(()=>
  [...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Zifungue')?.click());

(async()=>{
  const m=[];

  m.push(await run('1. inaonyesha hesabu na alama ya MPYA',
    {db:db(),uid:ADM,role:'admin',render:'tiketibar2'},async p=>{
      const t=await p.evaluate(()=>document.body.innerText);
      if(!/Tiketi za Wateja/.test(t))return{bad:'kadi haipo'};
      if(!/MPYA 2/.test(t))return{bad:'alama ya mpya haionyeshi 2: '+t.slice(0,120)};
      if(!/Wazi 2/.test(t))return{bad:'hesabu ya wazi si 2'};
      if(!/dharura 1/.test(t))return{bad:'dharura haijahesabiwa'};
      return{};
    }));

  m.push(await run('2. dharura inakuja juu ya foleni',
    {db:db(),uid:ADM,role:'admin',render:'tiketibar2'},async p=>{
      await bofyaZifungue(p);await p.waitForTimeout(300);
      const t=await p.evaluate(()=>document.body.innerText);
      if(t.indexOf('TK-2026-000002')>t.indexOf('TK-2026-000001'))
        return{bad:'dharura iko chini ya tiketi ya kawaida'};
      return{};
    }));

  m.push(await run('3. alama ya MPYA inaisha baada ya kuzifungua',
    {db:db(),uid:ADM,role:'admin',render:'tiketibar2'},async p=>{
      await bofyaZifungue(p);await p.waitForTimeout(400);
      const t=await p.evaluate(()=>document.body.innerText);
      if(/MPYA/.test(t))return{bad:'bado inasema MPYA baada ya kuzifungua'};
      const alama=await p.evaluate(()=>localStorage.getItem('tiketi_niliona_u-adm'));
      if(!alama)return{bad:'alama haijahifadhiwa — zitarudi MPYA kesho'};
      return{};
    }));

  m.push(await run('4. wakala haoni tiketi za duka lingine',
    {db:db(),uid:AG,role:'agent',render:'tiketibar2'},async p=>{
      await p.evaluate(()=>{
        const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Zifungue');
        if(b)b.click();
      });
      await p.waitForTimeout(300);
      const t=await p.evaluate(()=>document.body.innerText);
      if(/TK-2026-000002/.test(t))return{bad:'anaona tiketi ya duka lingine'};
      if(!/Wazi 1/.test(t))return{bad:'hesabu si 1 kwa wakala'};
      return{};
    }));

  m.push(await run('5. tiketi iliyofungwa haihesabiwi',
    {db:db({tiketi:[tiketi[2]]}),uid:ADM,role:'admin',render:'tiketibar2'},async p=>{
      const t=await p.evaluate(()=>document.body.innerText);
      if(!/Hakuna tiketi wazi/.test(t))return{bad:'iliyofungwa inahesabiwa kama wazi'};
      if(/MPYA/.test(t))return{bad:'iliyofungwa inaonyeshwa kama mpya'};
      return{};
    }));

  m.push(await run('6. jedwali halipo — kadi haivunjiki',
    {db:db(),uid:ADM,role:'admin',render:'tiketibar2',dropTiketi:true},async p=>{
      const t=await p.evaluate(()=>document.body.innerText);
      if(!/Tiketi za Wateja/.test(t))return{bad:'kadi imevunjika'};
      return{};
    }));

  const bad=m.filter(x=>!x).length;
  console.log(bad?`\n${bad}/${m.length} zimeshindwa`:`\nZote ${m.length} ni sawa`);
  process.exit(bad?1:0);
})();
