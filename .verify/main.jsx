import React from 'react';
import {createRoot} from 'react-dom/client';
import {__db,__cfg} from './fakeSupabase';
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
