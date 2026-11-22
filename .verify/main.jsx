import React from 'react';
import {createRoot} from 'react-dom/client';
import {__db,__cfg} from './fakeSupabase';
import * as __offlineDB from '../src/utils/offlineDB';
window.__offlineDB=__offlineDB;

// Njia ya sync inatumia fetch moja kwa moja (si supabase-js).
// Tunaiga PostgREST hapa pia, vinginevyo sync haijaribiwi kamwe.
const _fetch = window.fetch.bind(window);
window.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (u.includes('/rest/v1/sales') && (opt.method || 'GET').toUpperCase() === 'POST') {
    let row = {}; try { row = JSON.parse(opt.body || '{}') } catch (_) {}
    const cols = __cfg.schema.sales || [];
    for (const k of Object.keys(row))
      if (!cols.includes(k))
        return new Response(JSON.stringify({ code:'PGRST204',
          message:`Could not find the '${k}' column of 'sales' in the schema cache` }),
          { status:400, headers:{'Content-Type':'application/json'} });
    if (row.offline_id != null && (__db.sales||[]).some(x =>
        x.business_id === row.business_id && x.offline_id === row.offline_id))
      return new Response(JSON.stringify({ code:'23505',
        message:'duplicate key value violates unique constraint' }), { status:409 });
    __db.sales.push({ id:'s-'+Math.random().toString(36).slice(2,9),
      created_at: row.created_at || new Date().toISOString(), ...row });
    return new Response(null, { status:201 });
  }
  return _fetch(url, opt);
};

window.__db=__db; window.__cfg=__cfg;
// Weka data ya jaribio KABLA ya React kuanza
const seed=window.__seed;
if(seed){
  Object.entries(seed.db||{}).forEach(([t,rows])=>{__db[t]=rows});
  if(seed.schemaDrop)seed.schemaDrop.forEach(([t,c])=>{__cfg.schema[t]=__cfg.schema[t].filter(x=>x!==c)});
  if(seed.schemaAdd)seed.schemaAdd.forEach(([t,c])=>{if(!__cfg.schema[t].includes(c))__cfg.schema[t].push(c)});
  if(seed.rpcs)seed.rpcs.forEach(r=>__cfg.rpcs.add(r));
  __cfg.rls=!!seed.rls; __cfg.views=!!seed.views; __cfg.role=seed.role||'office'; __cfg.uid=seed.uid||null;
}
import('../src/context/AppContext').then(({AppProvider,useApp})=>{
  function Probe(){ const app=useApp(); window.__app=app; return <div id="ready">ready</div>; }
  createRoot(document.getElementById('root')).render(<AppProvider><Probe/></AppProvider>);
});
