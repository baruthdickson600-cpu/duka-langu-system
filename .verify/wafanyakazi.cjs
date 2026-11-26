// ============================================================
// Jaribio la WAFANYAKAZI — kivinjari halisi, ukurasa halisi
//
// Linajaribu KINACHOWEZA KUHARIBU DATA au KUFUNGUA MLANGO,
// si vitufe:
//   1. orodha inaonekana, ukamilifu unahesabiwa
//   2. mimi mwenyewe sina kitufe cha "Ameacha kazi"
//   3. kufuta kabisa kunahitaji jina kuandikwa
//   4. kufuta kunapitia server NA kunapeleka token
//   5. server ikikataa — kosa linaonekana, safu haitoweki
//   6. NIDA fupi inaonya lakini HAIZUII kuhifadhi
//   7. simu mbovu INAZUIA kuhifadhi
//   8. safu zisizotarajiwa hazipiti kwenda database
//   9. jedwali/safu hazipo (SQL haijaendeshwa) -> ukurasa hauvunjiki
// ============================================================
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const ADM='u-adm', MKT='u-mkt', AG='u-ag', ACC='u-acc';

const baseDB=(o={})=>({
  businesses:[{id:'b-1',name:'Duka',owner_id:'u-o',plan:'premium',token_active:true,promo_code:'WK01'}],
  users:o.users||[
    {id:ADM,business_id:null,role:'admin',name:'Baruth Dickson',email:'ad@x.com',is_active:true,
     phone:'0617288752',nida:'19900101123450000112',tarehe_kuzaliwa:'1990-01-01',jinsia:'me',
     anwani:'Urambo',cheo_kazi:'Msimamizi Mkuu',tarehe_kuanza:'2024-01-01',
     ndugu_jina:'Mama',ndugu_simu:'0713000009'},
    {id:MKT,business_id:null,role:'marketing',name:'Asha Mwinyi',email:'m@x.com',is_active:true,phone:'0713000002'},
    {id:AG,business_id:null,role:'agent',name:'Juma Said',email:'a@x.com',is_active:true,phone:'0713000003',promo_code:'WK01'},
    {id:ACC,business_id:null,role:'accountant',name:'Neema',email:'h@x.com',is_active:false,phone:'0713000004'},
  ],
  products:[],sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],
  credit_transactions:[],wakala_lines:[],wakala_tx:[],wakala_days:[],wakala_settings:[],
  support_tickets:[],ticket_messages:[],settings:[],
});

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
    await p.waitForTimeout(600);
    const r=await fn(p);
    if(r&&r.bad){ok=false;ujumbe=r.bad}
  }catch(e){ok=false;ujumbe=e.message.slice(0,160)}
  if(errs.length){ok=false;ujumbe=(ujumbe?ujumbe+' | ':'')+'JS: '+errs.slice(0,2).join(' ; ')}
  console.log((ok?'  OK   ':'  FAIL ')+name+(ujumbe?' -> '+ujumbe:''));
  await b.close();
  return ok;
}

const seedi=(o={})=>({db:baseDB(o),uid:ADM,role:'admin',render:'wafanyakazi',...o.extra});

(async()=>{
  const m=[];

  // ---- 1. Orodha + ukamilifu ----
  m.push(await run('1. orodha inaonekana, ukamilifu unahesabiwa',seedi(),async p=>{
    const t=await p.evaluate(()=>document.body.innerText);
    for(const j of ['Baruth Dickson','Asha Mwinyi','Juma Said'])
      if(!t.includes(j))return{bad:'hajaonekana: '+j};
    if(t.includes('Neema'))return{bad:'aliyeacha kazi anaonekana kwenye orodha kuu'};
    if(!/100% imejazwa/.test(t))return{bad:'ukamilifu 100% haujahesabiwa kwa aliyejaza yote'};
    if(!/Walioacha kazi \(1\)/.test(t))return{bad:'sehemu ya walioacha kazi haipo'};
    return{};
  }));

  // ---- 2. Mimi mwenyewe sina "Ameacha kazi" ----
  // (Nikijizima, nafungiwa nje ya mfumo wangu mwenyewe.)
  m.push(await run('2. msimamizi hawezi kujizima mwenyewe',seedi(),async p=>{
    const r=await p.evaluate(()=>{
      const safu=[...document.querySelectorAll('div')].filter(d=>
        d.innerText&&d.innerText.startsWith('Baruth Dickson')&&d.querySelector('button'));
      const yangu=safu[safu.length-1];
      return {ina:!!yangu&&/Ameacha kazi/.test(yangu.innerText), wewe:/wewe/.test(document.body.innerText)};
    });
    if(r.ina)return{bad:'kitufe cha kujizima kipo'};
    if(!r.wewe)return{bad:'alama "wewe" haipo'};
    return{};
  }));

  // ---- 3+4. Kufuta kabisa: jina lahitajika, kunapitia server na token ----
  m.push(await run('3. kufuta kunahitaji jina + token ya server',seedi(),async p=>{
    // Fungua walioacha kazi
    await p.evaluate(()=>{
      [...document.querySelectorAll('button')].find(b=>/Walioacha kazi/.test(b.innerText))?.click();
    });
    await p.waitForTimeout(200);
    await p.evaluate(()=>{
      [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Futa kabisa')?.click();
    });
    await p.waitForTimeout(300);

    // Kitufe kiwe kimezimwa kabla jina kuandikwa
    const kabla=await p.evaluate(()=>{
      const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()==='Futa kabisa').pop();
      return b?b.disabled:null;
    });
    if(kabla!==true)return{bad:'kufuta kunaruhusiwa bila kuandika jina'};

    // Jina lisilo sahihi — bado kimezimwa
    await p.evaluate(()=>{
      const i=[...document.querySelectorAll('input')].pop();
      const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      s.call(i,'Nee');i.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await p.waitForTimeout(150);
    const nusu=await p.evaluate(()=>[...document.querySelectorAll('button')]
      .filter(x=>x.innerText.trim()==='Futa kabisa').pop().disabled);
    if(nusu!==true)return{bad:'jina pungufu limekubalika'};

    // Jina sahihi
    await p.evaluate(()=>{
      const i=[...document.querySelectorAll('input')].pop();
      const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      s.call(i,'Neema');i.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await p.waitForTimeout(150);
    await p.evaluate(()=>[...document.querySelectorAll('button')]
      .filter(x=>x.innerText.trim()==='Futa kabisa').pop().click());
    await p.waitForTimeout(500);

    const r=await p.evaluate(()=>({
      ombi:window.__api.admin||[],
      maandishi:document.body.innerText,
    }));
    if(!r.ombi.length)return{bad:'server haikuombwa — kufuta kulifanywa kivinjari pekee'};
    const o=r.ombi[0];
    if(o.body.action!=='delete_employee')return{bad:'action si delete_employee: '+o.body.action};
    if(!/^Bearer tok-/.test(o.auth))return{bad:'token haijatumwa: '+o.auth};
    if(o.body.role!==undefined)return{bad:'cheo kinatumwa na kivinjari — server inakiamini'};
    if(/Walioacha kazi \(/.test(r.maandishi))return{bad:'bado yupo kwenye orodha baada ya kufutwa'};
    if(!/amefutwa kabisa/.test(r.maandishi))return{bad:'uthibitisho haukuonekana'};
    return{};
  }));

  // ---- 5. Server ikikataa — kosa linaonekana, safu haitoweki ----
  m.push(await run('5. server ikikataa, kosa linaonekana na safu inabaki',
    seedi({extra:{adminJibu:{success:false,error:'Hauruhusiwi kufanya kitendo hiki.'}}}),
    async p=>{
      await p.evaluate(()=>{
        [...document.querySelectorAll('button')].find(b=>/Walioacha kazi/.test(b.innerText))?.click();
      });
      await p.waitForTimeout(200);
      await p.evaluate(()=>{
        [...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Futa kabisa')?.click();
      });
      await p.waitForTimeout(300);
      await p.evaluate(()=>{
        const i=[...document.querySelectorAll('input')].pop();
        const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
        s.call(i,'Neema');i.dispatchEvent(new Event('input',{bubbles:true}));
      });
      await p.waitForTimeout(150);
      await p.evaluate(()=>[...document.querySelectorAll('button')]
        .filter(x=>x.innerText.trim()==='Futa kabisa').pop().click());
      await p.waitForTimeout(500);
      const t=await p.evaluate(()=>document.body.innerText);
      if(!t.includes('Hauruhusiwi'))return{bad:'kosa la server halionekani'};
      if(!t.includes('Neema'))return{bad:'safu imetoweka ingawa server ilikataa'};
      return{};
    }));

  // ---- 6+7+8. Fomu: NIDA inaonya, simu inazuia, safu haziingii ----
  m.push(await run('6. NIDA fupi inaonya lakini haizuii; simu mbovu inazuia',seedi(),async p=>{
    // Fungua fomu ya Asha Mwinyi mahsusi — si safu ya kwanza
    const nimefungua=await p.evaluate(()=>{
      const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()==='Hariri');
      // Safu YAKE pekee: ina jina lake na HAINA jina la mwingine
      const wake=b.find(x=>{
        let n=x.parentElement;
        for(let i=0;i<4&&n;i++,n=n.parentElement){
          const t=n.innerText||'';
          if(t.includes('Asha Mwinyi')&&!t.includes('Baruth Dickson'))return true;
        }
        return false;
      });
      if(!wake)return false;
      wake.click();return true;
    });
    if(!nimefungua)return{bad:'kitufe cha Hariri cha Asha hakipatikani'};
    await p.waitForTimeout(300);
    const jinaFomu=await p.evaluate(()=>document.querySelector('.modal-content')?.innerText||'');
    if(!jinaFomu.includes('Asha Mwinyi'))return{bad:'fomu iliyofunguka si ya Asha'};

    const weka=async(lab,thamani)=>p.evaluate(({lab,thamani})=>{
      const l=[...document.querySelectorAll('label')].find(x=>x.innerText.includes(lab));
      const i=l?l.parentElement.querySelector('input'):null;
      if(!i)return false;
      const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      s.call(i,thamani);i.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    },{lab,thamani});

    if(!await weka('NIDA','1990010112345'))return{bad:'sehemu ya NIDA haipo kwenye fomu'};
    await p.waitForTimeout(200);
    let t=await p.evaluate(()=>document.body.innerText);
    if(!/tarakimu 20/.test(t))return{bad:'onyo la NIDA halionekani'};

    // Simu mbovu lazima IZUIE
    if(!await weka('Namba ya simu','071300'))return{bad:'sehemu ya simu haipo'};
    await p.waitForTimeout(200);
    await p.evaluate(()=>[...document.querySelectorAll('button')]
      .find(b=>/Hifadhi/.test(b.innerText))?.click());
    await p.waitForTimeout(400);
    t=await p.evaluate(()=>document.body.innerText);
    if(!/simu si sahihi/i.test(t))return{bad:'simu mbovu imekubalika'};

    // Simu sahihi + NIDA fupi: lazima IHIFADHIWE (onyo si kizuizi)
    await weka('Namba ya simu','0713000002');
    await p.waitForTimeout(200);
    await p.evaluate(()=>[...document.querySelectorAll('button')]
      .find(b=>/Hifadhi/.test(b.innerText))?.click());
    await p.waitForTimeout(600);

    const r=await p.evaluate(()=>({
      maandishi:document.body.innerText,
      mtu:(window.__db?.users||[]).find(u=>u.id==='u-mkt')||{},
    }));
    if(!/zimehifadhiwa/.test(r.maandishi))return{bad:'haikuhifadhiwa ingawa simu ni sahihi'};
    if(r.mtu.nida!=='1990010112345')return{bad:'NIDA haikuhifadhiwa: '+r.mtu.nida};
    if(r.mtu.phone!=='0713000002')return{bad:'simu haikuhifadhiwa: '+r.mtu.phone};
    // Cheo na hali hazipaswi kubadilishwa na fomu hii
    if(r.mtu.role!=='marketing')return{bad:'cheo kimebadilishwa: '+r.mtu.role};
    if(r.mtu.is_active!==true)return{bad:'hali imebadilishwa: '+r.mtu.is_active};
    return{};
  }));

  // ---- 9. Safu hazipo (SQL haijaendeshwa) -> hauvunjiki ----
  m.push(await run('9. SQL haijaendeshwa — ukurasa hauvunjiki',
    {...seedi(),schemaDrop:['nida','tarehe_kuzaliwa','jinsia','anwani','cheo_kazi',
      'tarehe_kuanza','ndugu_jina','ndugu_simu','maelezo'].map(c=>['users',c])},
    async p=>{
      const t=await p.evaluate(()=>document.body.innerText);
      if(!t.includes('Wafanyakazi'))return{bad:'ukurasa haujajitokeza'};
      if(!t.includes('Asha Mwinyi'))return{bad:'orodha haijapakiwa'};
      return{};
    }));

  const bad=m.filter(x=>!x).length;
  console.log(bad?`\n${bad}/${m.length} zimeshindwa`:`\nZote ${m.length} ni sawa`);
  process.exit(bad?1:0);
})();
