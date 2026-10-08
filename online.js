/* V16 Online Sync Layer: central shared database */
(function(){
 const SESSION_KEY='officeOnlineSession';
 let syncing=false, timer=null, dirty=new Map();
 const rawSet=Storage.prototype.setItem;
 const SYNC_KEYS=new Set(['officeClosingV4','officeClosingApprovals','officeClosingAudit','officeClosingUsers','officeClosingSettings']);
 const rawRemove=Storage.prototype.removeItem;
 function isAppKey(k){return SYNC_KEYS.has(String(k||''))}
 async function push(key,value,previousValue){
   const token=sessionStorage.getItem(SESSION_KEY)||localStorage.getItem(SESSION_KEY); if(!token||syncing)return;
   dirty.set(key,Date.now());
   try{const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','x-session':token},body:JSON.stringify({key,value,previousValue})}); if(r.ok)dirty.delete(key); else console.warn('Online sync rejected',r.status)}catch(e){console.warn('Online sync failed',e)}
 }
 Storage.prototype.setItem=function(k,v){const old=localStorage.getItem(k);rawSet.call(this,k,v); if(isAppKey(k)&&!syncing)push(k,v,old)};
 async function applyState(state){
   syncing=true; try{Object.entries(state||{}).forEach(([k,v])=>{if(isAppKey(k)&&Date.now()-(dirty.get(k)||0)>6000)rawSet.call(localStorage,k,typeof v==='string'?v:JSON.stringify(v));})}finally{syncing=false}}
 async function pull(){const token=sessionStorage.getItem(SESSION_KEY)||localStorage.getItem(SESSION_KEY);if(!token)return;try{const r=await fetch('/api/state',{headers:{'x-session':token}});if(r.status===401){sessionStorage.removeItem(SESSION_KEY);return}const j=await r.json();if(j.ok)await applyState(j.state)}catch(e){console.warn('Online pull failed',e)}}
 window.onlineLogin=async function(username,password){
   try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const j=await r.json();if(!j.ok)return j;
     sessionStorage.setItem(SESSION_KEY,j.token);await applyState(j.state);start();return j;
   }catch(e){return {ok:false,message:'Server haipatikani. Hakikisha internet/server ipo.'}}
 };
 window.onlineLogout=async function(){const t=sessionStorage.getItem(SESSION_KEY);try{if(t)await fetch('/api/logout',{method:'POST',headers:{'x-session':t}})}catch(e){}sessionStorage.removeItem(SESSION_KEY);if(timer)clearInterval(timer)};
 function start(){if(timer)clearInterval(timer);pull();timer=setInterval(pull,5000)}
 window.addEventListener('load',()=>{if(sessionStorage.getItem(SESSION_KEY))start()});
})();
