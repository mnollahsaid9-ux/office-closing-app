const AUDIT_KEY="officeClosingAudit";
function getAudit(){try{const x=JSON.parse(localStorage.getItem(AUDIT_KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
function logAudit(action,details={}){const u=currentUser();const a=getAudit();a.unshift({id:Date.now()+Math.random(),time:new Date().toLocaleString("sw-TZ"),username:u?.username||"SYSTEM",role:u?.role||"system",action,details});localStorage.setItem(AUDIT_KEY,JSON.stringify(a.slice(0,5000)))}
function showAudit(){if(!requireLogin()||!isAdmin())return;["home","formSection","comparisonSection","historySection","closingDetailSection","dashboard","monthlyReport","backupSection","dailyReport","settingsSection","approvalSection"].forEach(id=>{const el=$(id);if(el)el.classList.add("hidden")});$("auditSection").classList.remove("hidden");renderAudit();window.scrollTo({top:0,behavior:"smooth"})}
function auditHome(){$("auditSection").classList.add("hidden");$("home").classList.remove("hidden")}
function renderAudit(){if(!isAdmin())return;const box=$("auditList"),af=$("auditActionFilter"),uf=$("auditUserFilter"),q=($("auditSearch").value||"").toLowerCase();const all=getAudit();const actions=[...new Set(all.map(x=>x.action))];const users=[...new Set(all.map(x=>x.username))];const oldA=af.value,oldU=uf.value;af.innerHTML='<option value="">Vitendo vyote</option>'+actions.map(x=>`<option>${x}</option>`).join("");uf.innerHTML='<option value="">Users wote</option>'+users.map(x=>`<option>${x}</option>`).join("");if(actions.includes(oldA))af.value=oldA;if(users.includes(oldU))uf.value=oldU;const a=all.filter(x=>(!af.value||x.action===af.value)&&(!uf.value||x.username===uf.value)&&(!q||JSON.stringify(x).toLowerCase().includes(q)));if(!a.length){box.innerHTML='<p>Hakuna audit inayolingana.</p>';return}box.innerHTML=a.map(x=>`<div class="audit-item"><div class="top"><span class="audit-action">${x.action}</span><span>${x.time}</span></div><div class="audit-meta">👤 ${x.username} (${x.role})</div><div class="audit-details">${Object.entries(x.details||{}).map(([k,v])=>`${k}: ${v}`).join("\n")}</div></div>`).join("")}
function exportAudit(){if(!isAdmin())return;const rows=[["Time","Username","Role","Action","Details"]];getAudit().forEach(x=>rows.push([x.time,x.username,x.role,x.action,Object.entries(x.details||{}).map(([k,v])=>`${k}: ${v}`).join(" | ")]));const esc=v=>'"'+String(v??"").replaceAll('"','""')+'"';const csv=rows.map(r=>r.map(esc).join(",")).join("\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="office_closing_audit.csv";a.click();URL.revokeObjectURL(a.href)}

const CLOSINGS_KEY="officeClosingApprovals";
function getClosingApprovals(){try{const x=JSON.parse(localStorage.getItem(CLOSINGS_KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
function saveClosingApprovals(x){localStorage.setItem(CLOSINGS_KEY,JSON.stringify(x))}
function syncApprovalRecord(rec){
  const a=getClosingApprovals(); const i=a.findIndex(x=>String(x.id)===String(rec.id));
  if(i>=0)a[i]=rec; else a.unshift(rec);
  saveClosingApprovals(a.slice(0,730));
}
function removeApprovalRecord(id){saveClosingApprovals(getClosingApprovals().filter(x=>String(x.id)!==String(id)))}
function statusOf(r){return r.status||"LOCKED"}
function setLockNotice(text,kind="locked"){
 const el=$("closingLockNotice"); if(!el)return;
 el.textContent=text; el.className="lock-notice"+(kind==="approved"?" status-approved":"");
}
function showApprovals(){
 if(!requireLogin()||!isAdmin())return;
 ["home","formSection","comparisonSection","historySection","closingDetailSection","dashboard","monthlyReport","backupSection","dailyReport","settingsSection","auditSection"].forEach(id=>{const el=$(id);if(el)el.classList.add("hidden")});
 $("approvalSection").classList.remove("hidden"); renderApprovals(); window.scrollTo({top:0,behavior:"smooth"});
}
function approvalHome(){$("approvalSection").classList.add("hidden");$("home").classList.remove("hidden")}
function renderApprovals(){
 if(!isAdmin())return; const box=$("approvalList"); if(!box)return;
 const list=getClosingApprovals();
 if(!list.length){box.innerHTML="<p>Hakuna closing zilizohifadhiwa bado.</p>";return}
 box.innerHTML=list.map((r,i)=>{
  const s=statusOf(r), cls=s==="APPROVED"?"status-approved":s==="EDIT"?"status-edit":"status-locked";
  return `<div class="approval-card"><div class="row"><div><b>${r.closingNo||"Closing"}</b> — ${r.type==="morning"?"🌅 Morning":"🌆 Evening"}</div><span class="status-pill ${cls}">${s}</span></div>
  <div class="muted">Tarehe: ${r.date||"—"} | Cashier: ${r.cashier||"—"} | Saved: ${r.savedAt||"—"}</div>
  <div class="muted">Mtaji Halisi: ${money(r.data?.capital||0)} TSh | Difference: ${r.difference==null?"—":(r.difference>=0?"+":"")+money(r.difference)+" TSh"}</div>
  ${r.approvedBy?`<div class="muted">Approved by: ${r.approvedBy} | ${r.approvedAt||""}</div>`:""}
  ${r.reopenReason?`<div class="muted">Re-open reason: ${r.reopenReason}</div>`:""}
  <div class="approval-actions">${s!=="APPROVED"?`<button type="button" class="save" onclick="approveClosing(${i})">✅ Approve & Lock</button>`:""}${s==="APPROVED"?`<button type="button" class="secondary" onclick="reopenClosing(${i})">✏️ Re-open</button>`:""}</div></div>`
 }).join("");
}
function approveClosing(i){if(!isAdmin())return;const a=getClosingApprovals(),r=a[i];if(!r)return;r.status="APPROVED";r.approvedBy=currentUser().username;r.approvedAt=new Date().toLocaleString("sw-TZ");syncMainRecord(r);logAudit("APPROVE_CLOSING",{closingNo:r.closingNo,type:r.type,date:r.date,cashier:r.cashier});saveClosingApprovals(a);createAutoBackup("Approval changed");renderApprovals();}
function reopenClosing(i){if(!isAdmin())return;const a=getClosingApprovals(),r=a[i];if(!r)return;const reason=prompt("Andika sababu ya kufungua closing hii tena:");if(!reason||!reason.trim())return;r.status="EDIT";r.reopenedBy=currentUser().username;r.reopenedAt=new Date().toLocaleString("sw-TZ");r.reopenReason=reason.trim();syncMainRecord(r);logAudit("REOPEN_CLOSING",{closingNo:r.closingNo,type:r.type,date:r.date,reason:r.reopenReason});saveClosingApprovals(a);renderApprovals();alert("Closing imefunguliwa tena. Sasa Admin anaweza kuirekebisha.");}
function syncMainRecord(rec){const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]"),i=h.findIndex(x=>String(x.id)===String(rec.id));if(i>=0){h[i]=rec;localStorage.setItem("officeClosingV4",JSON.stringify(h.slice(0,730)));}}


const AUTO_BACKUP_KEY="officeClosingAutoBackups";
const AUTO_BACKUP_LIMIT=30;
function getAutoBackups(){try{const x=JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
function collectBackupData(reason){
 const data={};
 Object.keys(localStorage).filter(k=>k.startsWith("officeClosing")).forEach(k=>{try{data[k]=JSON.parse(localStorage.getItem(k))}catch(e){data[k]=localStorage.getItem(k)}});
 data.officeClosingBackupMeta={reason:reason||"Manual",createdAt:new Date().toISOString()};
 return data;
}
function createAutoBackup(reason="Manual"){
 const snaps=getAutoBackups();
 snaps.unshift({id:Date.now()+Math.random(),createdAt:new Date().toISOString(),reason,data:collectBackupData(reason)});
 localStorage.setItem(AUTO_BACKUP_KEY,JSON.stringify(snaps.slice(0,AUTO_BACKUP_LIMIT)));
 renderBackupSnapshots();
 const s=$("autoBackupStatus");if(s)s.innerHTML='<div class="backup-ok">Backup snapshot imehifadhiwa ✅ — '+reason+'</div>';
}
function restoreSnapshot(i){
 if(!isAdmin())return;const snaps=getAutoBackups(),snap=snaps[i];if(!snap)return;
 if(!confirm("Restore snapshot ya "+new Date(snap.createdAt).toLocaleString("sw-TZ")+"? Data ya sasa itabadilishwa."))return;
 Object.keys(snap.data||{}).forEach(k=>localStorage.setItem(k,typeof snap.data[k]==="string"?snap.data[k]:JSON.stringify(snap.data[k])));
 logAudit("RESTORE_LOCAL_SNAPSHOT",{createdAt:snap.createdAt,reason:snap.reason});
 alert("Restore imefanikiwa. Mfumo uta-refresh sasa.");location.reload();
}
function downloadSnapshot(i){
 const snap=getAutoBackups()[i];if(!snap)return;
 const blob=new Blob([JSON.stringify({app:"Office Closing",version:"V14",...snap},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="office_closing_snapshot_"+snap.createdAt.slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderBackupSnapshots(){
 const box=$("backupSnapshots");if(!box)return;const snaps=getAutoBackups();
 if(!snaps.length){box.innerHTML="<p>Hakuna automatic snapshot bado.</p>";return}
 box.innerHTML=snaps.map((s,i)=>`<div class="backup-snap"><div class="row"><b>🛡️ ${new Date(s.createdAt).toLocaleString("sw-TZ")}</b><span>${s.reason}</span></div><div class="muted">Snapshot #${i+1} — data ya ndani ya computer hii</div><div class="backup-actions"><button type="button" class="secondary" onclick="downloadSnapshot(${i})">⬇️ Download</button><button type="button" class="secondary" onclick="restoreSnapshot(${i})">♻️ Restore</button></div></div>`).join("");
}

const ACCOUNTS=["Cash","NMB","CRDB","Vodacom","Yas","Halotel","Airtel","Lipa kwa Simu","Nyingine"];
const money=n=>new Intl.NumberFormat("en-TZ").format(Math.round(n||0));
const num=e=>Math.max(0,Number(String(e.value||"").replace(/,/g,""))||0);
const formatMoneyInput=e=>{
 const raw=String(e.value||"").replace(/,/g,"").replace(/[^0-9]/g,"");
 if(raw===""){e.value="";return;}
 e.value=new Intl.NumberFormat("en-TZ").format(Number(raw));
};
const $=id=>document.getElementById(id);

function initApprovalStore(){const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");const a=getClosingApprovals();const map=new Map(a.map(x=>[String(x.id),x]));h.forEach(r=>{if(!r.status)r.status="LOCKED";if(!map.has(String(r.id)))map.set(String(r.id),r)});localStorage.setItem("officeClosingV4",JSON.stringify(h));saveClosingApprovals([...map.values()].slice(0,730));}
const AUTH_KEY="officeClosingAuth";
const USERS_KEY="officeClosingUsers";
const defaultUsers=[
 {username:"admin",password:"admin123",role:"admin"},
 {username:"cashier",password:"cashier123",role:"cashier"}
];
function getUsers(){
 try{
   const x=JSON.parse(localStorage.getItem(USERS_KEY));
   if(Array.isArray(x)&&x.length)return x;
 }catch(e){}
 localStorage.setItem(USERS_KEY,JSON.stringify(defaultUsers));
 return defaultUsers.slice();
}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u));createAutoBackup("Users changed")}
function currentUser(){
 try{return JSON.parse(sessionStorage.getItem(AUTH_KEY)||"null")}catch(e){return null}
}
function isAdmin(){return currentUser()?.role==="admin"}
async function login(){
 const u=$("loginUsername").value.trim(),p=$("loginPassword").value;
 if(window.onlineLogin){
   const result=await window.onlineLogin(u,p);
   if(!result.ok){$("loginMessage").innerHTML='<div class="login-error">'+(result.message||'Username au password si sahihi.')+'</div>';return;}
   const found=result.user; sessionStorage.setItem(AUTH_KEY,JSON.stringify({username:found.username,role:found.role}));
 }else{
   const found=getUsers().find(x=>x.username.toLowerCase()===u.toLowerCase()&&x.password===p);
   if(!found){$("loginMessage").innerHTML='<div class="login-error">Username au password si sahihi.</div>';return;}
   sessionStorage.setItem(AUTH_KEY,JSON.stringify({username:found.username,role:found.role}));
 }
 logAudit("LOGIN",{result:"Success"});
 $("loginScreen").style.display="none";$("loginMessage").innerHTML="";applyPermissions();updateBranding();
}
async function logout(){
 if(window.onlineLogout)await window.onlineLogout();
 sessionStorage.removeItem(AUTH_KEY);location.reload();
}
function requireLogin(){
 const u=currentUser();
 if(!u){$("loginScreen").style.display="flex";return false}
 $("loginScreen").style.display="none";applyPermissions();return true;
}
function applyPermissions(){
 const admin=isAdmin();
 const ab=$("approvalBtn"); if(ab)ab.style.display=admin?"":"none";const at=$("auditBtn");if(at)at.style.display=admin?"":"none";
 ["dashboardBtn","monthlyBtn","backupBtn","settingsBtn"].forEach(id=>{
   const el=$(id); if(el)el.style.display=admin?"":"none";
 });
 const user=currentUser();
 const title=document.querySelector("#home h2");
 if(title&&user) title.title="Logged in: "+user.username+" ("+user.role+")";
}
function renderUsers(){
 const box=$("userList"), users=getUsers(), me=currentUser();
 if(!box)return;
 box.innerHTML=users.map((u,i)=>{
   const cannotDelete=u.username==="admin" || (me&&u.username===me.username);
   return `<div class="user-item"><span>👤 <b>${u.username}</b></span><span class="user-role">${u.role.toUpperCase()}</span>
   ${cannotDelete?"":`<button type="button" class="secondary danger" onclick="removeUser(${i})">Ondoa</button>`}</div>`;
 }).join("");
}
function showSettingsUsers(){renderUsers()}
function addUser(){
 const username=$("newUsername").value.trim(),password=$("newUserPassword").value,role=$("newUserRole").value;
 if(username.length<3||password.length<4){alert("Username iwe angalau herufi 3 na password angalau herufi 4.");return}
 const users=getUsers();
 if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){alert("Username huyo tayari yupo.");return}
 users.push({username,password,role});saveUsers(users);logAudit("ADD_USER",{username,role});
 $("newUsername").value="";$("newUserPassword").value="";
 renderUsers();
}
function removeUser(i){
 const users=getUsers(),u=users[i];
 if(!u||u.username==="admin"||u.username===currentUser()?.username)return;
 if(!confirm("Ondoa user "+u.username+"?"))return;
 users.splice(i,1);saveUsers(users);logAudit("REMOVE_USER",{username:u.username,role:u.role});renderUsers();
}

let currentType=null;

const defaultSettings={officeName:"Office Closing",officeBranch:"",officePhone:"",officeAddress:"",cashiers:[]};
function getSettings(){
 try{return {...defaultSettings,...JSON.parse(localStorage.getItem("officeClosingSettings")||"{}")}}
 catch(e){return {...defaultSettings}}
}
function saveSettingsData(s){localStorage.setItem("officeClosingSettings",JSON.stringify(s))}
function loadCashiers(){
 const s=getSettings(), sel=$("cashier");
 if(!sel)return;
 const current=sel.value;
 sel.innerHTML="";
 if(!s.cashiers.length){
   const o=document.createElement("option");o.value="";o.textContent="-- Weka Cashier kupitia Settings --";sel.appendChild(o);
 }else{
   s.cashiers.forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n;sel.appendChild(o)});
   if(current&&s.cashiers.includes(current))sel.value=current;
 }
}
function renderCashierList(){
 const box=$("cashierList"),s=getSettings();
 box.innerHTML=s.cashiers.length?s.cashiers.map((n,i)=>`<div class="cashier-item"><span>👤 ${n}</span><button type="button" class="secondary" onclick="removeCashier(${i})">Ondoa</button></div>`).join(""):"<p>Hakuna cashier aliyeongezwa bado.</p>";
}
function removeCashier(i){
 const s=getSettings();
 if(!s.cashiers[i])return;
 if(!confirm("Ondoa cashier "+s.cashiers[i]+"?"))return;
 s.cashiers.splice(i,1);saveSettingsData(s);logAudit("REMOVE_CASHIER",{cashier:s.cashiers[i]||""});renderCashierList();loadCashiers();
}
function showSettings(){if(!requireLogin())return;
 $("home").classList.add("hidden");$("formSection").classList.add("hidden");
 $("comparisonSection").classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");
 $("dashboard").classList.add("hidden");$("monthlyReport").classList.add("hidden");
 $("backupSection").classList.add("hidden");$("dailyReport").classList.add("hidden");
 const s=getSettings();
 $("officeName").value=s.officeName||"";
 $("officeBranch").value=s.officeBranch||"";
 $("officePhone").value=s.officePhone||"";
 $("officeAddress").value=s.officeAddress||"";
 renderCashierList();renderUsers();
 $("settingsMessage").innerHTML="<div class=\"notice\">Umeingia kama: <b>"+(currentUser()?.username||"")+" ("+(currentUser()?.role||"")+")</b></div>";
 $("settingsSection").classList.remove("hidden");
 window.scrollTo({top:0,behavior:"smooth"});
}
function settingsHome(){ $("settingsSection").classList.add("hidden");$("home").classList.remove("hidden"); }
function saveSettings(){
 const name=$("officeName").value.trim()||"Office Closing";
 const s=getSettings();
 s.officeName=name;s.officeBranch=$("officeBranch").value.trim();s.officePhone=$("officePhone").value.trim();s.officeAddress=$("officeAddress").value.trim();
 saveSettingsData(s);loadCashiers();createAutoBackup("Settings changed");logAudit("SAVE_SETTINGS",{office:s.officeName,branch:s.officeBranch});
 $("settingsMessage").innerHTML='<div class="notice">Settings zimehifadhiwa ✅</div>';
 updateBranding();
}
function addCashier(){
 const input=$("newCashierName"),name=input.value.trim();
 if(!name){alert("Weka jina la Cashier.");return}
 const s=getSettings();
 if(s.cashiers.some(x=>x.toLowerCase()===name.toLowerCase())){alert("Cashier huyo tayari yupo.");return}
 s.cashiers.push(name);s.cashiers.sort((a,b)=>a.localeCompare(b));saveSettingsData(s);logAudit("ADD_CASHIER",{cashier:name});
 input.value="";renderCashierList();loadCashiers();
}
function updateBranding(){
 const s=getSettings();
 const h=document.querySelector("header h1"),p=document.querySelector("header p");
 if(h)h.textContent="💰 "+(s.officeName||"Office Closing");
 if(p)p.textContent=(s.officeBranch?s.officeBranch+" — ":"")+"Financial Closing System";
 const ph=document.querySelector(".print-header");
 if(ph)ph.innerHTML="<h1>"+(s.officeName||"Office Closing")+"</h1><div>"+(s.officeBranch||"Daily / Monthly Financial Closing Report")+"</div>";
}


function buildAccounts(){
  const box=$("accounts"); box.innerHTML="";
  ACCOUNTS.forEach(name=>{
    const d=document.createElement("div");d.className="field";
    d.innerHTML=`<label>${name}</label><input type="text" inputmode="numeric" autocomplete="off" value="0" data-account="${name}" class="money-input">`;
    const input=d.querySelector("input");
    input.addEventListener("input",()=>{formatMoneyInput(input);calculate();});
    box.appendChild(d);
  });
}
function addPerson(type,name="",amount="",note=""){
  const box=$(type==="claims"?"claims":"debts");
  const row=document.createElement("div");row.className="person";
  row.innerHTML=`<input type="text" placeholder="Jina" value="${name}">
    <input type="text" inputmode="numeric" autocomplete="off" placeholder="Kiasi" value="${amount?new Intl.NumberFormat("en-TZ").format(Number(String(amount).replace(/,/g,""))):""}" class="money-input">
    <input type="text" placeholder="Maelezo (hiari)" value="${note}">
    <button type="button" class="remove">Ondoa</button>`;
  row.querySelectorAll("input").forEach(x=>{
  x.addEventListener("input",()=>{if(x.classList.contains("money-input"))formatMoneyInput(x);calculate();});
 });
  row.querySelector(".remove").onclick=()=>{row.remove();calculate()};
  box.appendChild(row);calculate();
}
function getPeople(id){
 return [...$(id).querySelectorAll(".person")].map(r=>{
  const i=r.querySelectorAll("input");
  return {name:i[0].value.trim(),amount:num(i[1]),note:i[2].value.trim()};
 }).filter(x=>x.name||x.amount||x.note);
}
function getData(){
 const accounts={};
 $("accounts").querySelectorAll("input[data-account]").forEach(e=>accounts[e.dataset.account]=num(e));
 const total=Object.values(accounts).reduce((a,b)=>a+b,0);
 const claims=getPeople("claims"),debts=getPeople("debts");
 const ct=claims.reduce((a,x)=>a+x.amount,0),dt=debts.reduce((a,x)=>a+x.amount,0);
 return {accounts,total,claims,debts,claimsTotal:ct,debtsTotal:dt,capital:total+ct-dt};
}
function calculate(){
 const d=getData();$("total").textContent=money(d.total);$("capital").textContent=money(d.capital)+" TSh";return d;
}
function makeNo(date,type){
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const prefix=type==="morning"?"M":"E";
 const count=h.filter(x=>x.date===date&&x.type===type).length+1;
 return `${prefix}-${date.replaceAll("-","")}-${String(count).padStart(3,"0")}`;
}
function openNew(type){
 if(!requireLogin())return;
 currentType=type;
 $("home").classList.add("hidden");$("approvalSection")?.classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");$("comparisonSection").classList.add("hidden");$("dashboard").classList.add("hidden");$("monthlyReport").classList.add("hidden");$("formSection").classList.remove("hidden");
 $("formTitle").textContent=type==="morning"?"🌅 Morning Closing":"🌆 Evening Closing";
 $("closingTypeLabel").textContent=type==="morning"?"MORNING":"EVENING";
 $("date").value=new Date().toISOString().slice(0,10);
 loadCashiers();$("cashier").value=getSettings().cashiers[0]||"";$("notes").value="";setLockNotice("🔓 Closing bado haijahifadhiwa");
 $("closingNo").value=makeNo($("date").value,type);
 $("claims").innerHTML="";$("debts").innerHTML="";
 buildAccounts();calculate();window.scrollTo({top:0,behavior:"smooth"});
}
function save(){
 if(!requireLogin())return;
 const date=$("date").value,cashier=$("cashier").value.trim();
 if(!date){alert("Weka tarehe.");return} if(!cashier){alert("Weka jina la Cashier.");return}
 const d=calculate(), h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const idx=h.findIndex(x=>x.date===date&&x.type===currentType);
 if(idx>=0){
   const old=h[idx], st=statusOf(old);
   if(!isAdmin() || st==="APPROVED"){
     alert("Closing hii imefungwa 🔒. Cashier hawezi kuibadilisha. Admin anatakiwa kuifungua kwanza.");return;
   }
   if(st==="LOCKED"){alert("Closing hii tayari imefungwa 🔒. Admin anatakiwa kuifungua kwanza.");return;}
   if(!confirm("Closing hii iko kwenye EDIT mode. Ibadilishe sasa?"))return;
 }
 const rec={id:idx>=0?h[idx].id:Date.now(),date,type:currentType,cashier,closingNo:$("closingNo").value,notes:$("notes").value.trim(),savedAt:new Date().toLocaleString("sw-TZ"),status:"LOCKED",data:d};
 if(idx>=0){rec.reopenReason=h[idx].reopenReason;rec.reopenedBy=h[idx].reopenedBy;rec.reopenedAt=h[idx].reopenedAt;h[idx]=rec}else h.unshift(rec);
 localStorage.setItem("officeClosingV4",JSON.stringify(h.slice(0,730)));syncApprovalRecord(rec);createAutoBackup("Closing saved");logAudit("SAVE_CLOSING",{closingNo:rec.closingNo,type:rec.type,date:rec.date,cashier:rec.cashier,status:rec.status,capital:rec.data.capital});renderDashboard();
 $("message").innerHTML='<div class="notice">Closing '+rec.closingNo+' imehifadhiwa na imefungwa 🔒</div>';
 setLockNotice("🔒 Closing imefungwa — inahitaji Admin ku-approve au kuifungua tena","locked");
 showComparison(date);renderHistory();$("dailyReport").classList.add("hidden");renderDashboard();
}
function showComparison(date){
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const m=h.find(x=>x.date===date&&x.type==="morning"),e=h.find(x=>x.date===date&&x.type==="evening");
 $("comparisonSection").classList.remove("hidden");
 if(!m||!e){$("comparison").innerHTML=`<p>Bado tunahitaji <b>${m?"Evening":"Morning"}</b> Closing ya tarehe ${date} ili kufanya comparison.</p>`;return}
 const diff=e.data.capital-m.data.capital;
 let status=diff===0?`<div class="status">SAWA ✅ — 0 TSh</div>`:diff<0?`<div class="status shortage">SHORTAGE / MAPUNGUFU 🔴 — ${money(Math.abs(diff))} TSh</div>`:`<div class="status surplus">SURPLUS / MAZIDI 🟢 — ${money(diff)} TSh</div>`;
 $("comparison").innerHTML=`<p>Morning: <b>${money(m.data.capital)} TSh</b> — ${m.cashier}</p>
 <p>Evening: <b>${money(e.data.capital)} TSh</b> — ${e.cashier}</p>${status}
 <p><b>Maelezo:</b> ${e.notes||m.notes||"Hakuna maelezo."}</p>`;
}

function todayISO(){return new Date().toISOString().slice(0,10)}
function monthKey(d){return String(d||"").slice(0,7)}
function renderDashboard(){
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const today=todayISO();
 const m=h.find(x=>x.date===today&&x.type==="morning");
 const e=h.find(x=>x.date===today&&x.type==="evening");
 $("dashMorning").textContent=m?money(m.data.capital)+" TSh":"—";
 $("dashEvening").textContent=e?money(e.data.capital)+" TSh":"—";
 const latest=(e||m);
 $("dashCapital").textContent=latest?money(latest.data.capital)+" TSh":"—";

 let shortage=0,surplus=0;
 h.forEach(r=>{
   if(r.type!=="evening") return;
   const m2=h.find(x=>x.date===r.date&&x.type==="morning");
   if(!m2) return;
   const diff=r.data.capital-m2.data.capital;
   if(diff<0) shortage+=Math.abs(diff); else surplus+=diff;
 });
 $("dashShortage").textContent=money(shortage)+" TSh";
 $("dashSurplus").textContent=money(surplus)+" TSh";
 $("dashCount").textContent=h.length;

 const mk=today.slice(0,7);
 const mh=h.filter(x=>monthKey(x.date)===mk);
 const monthShort=mh.filter(x=>x.type==="evening").reduce((s,e)=>{
   const mm=mh.find(x=>x.date===e.date&&x.type==="morning");
   if(!mm)return s;
   const d=e.data.capital-mm.data.capital;
   return s+(d<0?Math.abs(d):0);
 },0);
 const monthSurp=mh.filter(x=>x.type==="evening").reduce((s,e)=>{
   const mm=mh.find(x=>x.date===e.date&&x.type==="morning");
   if(!mm)return s;
   const d=e.data.capital-mm.data.capital;
   return s+(d>0?d:0);
 },0);
 const days=new Set(mh.map(x=>x.date)).size;
 $("dashMonth").innerHTML=
   `<b>${mk}</b><br>Siku zilizofungwa: ${days}<br>Closings: ${mh.length}<br>
    Shortage: <b>${money(monthShort)} TSh</b><br>
    Surplus: <b>${money(monthSurp)} TSh</b>`;
}
function showDashboard(){if(!requireLogin())return;
 $("home").classList.add("hidden");$("settingsSection").classList.add("hidden");$("dailyReport").classList.add("hidden");$("formSection").classList.add("hidden");
 $("comparisonSection").classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");$("monthlyReport").classList.add("hidden");$("dailyReport").classList.add("hidden");
 $("dashboard").classList.remove("hidden");renderDashboard();
 window.scrollTo({top:0,behavior:"smooth"});
}
function dashboardHome(){ $("dashboard").classList.add("hidden"); $("home").classList.remove("hidden"); }


function showBackup(){if(!requireLogin()||!isAdmin())return;
 $("home").classList.add("hidden");$("settingsSection").classList.add("hidden");$("dailyReport").classList.add("hidden");$("formSection").classList.add("hidden");
 $("comparisonSection").classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");
 $("dashboard").classList.add("hidden");$("monthlyReport").classList.add("hidden");$("dailyReport").classList.add("hidden");
 $("backupSection").classList.remove("hidden");$("backupMessage").innerHTML="";
 renderBackupSnapshots();window.scrollTo({top:0,behavior:"smooth"});
}
function backupHome(){ $("backupSection").classList.add("hidden");$("home").classList.remove("hidden"); }
function downloadBackup(){
 const data=localStorage.getItem("officeClosingV4")||"[]";
 const payload={
   app:"Office Closing",
   version:"V8",
   exportedAt:new Date().toISOString(),
   closings:JSON.parse(data)
 };
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 const stamp=new Date().toISOString().slice(0,10);
 a.href=url;a.download=`office_closing_backup_${stamp}.json`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $("backupMessage").innerHTML='<div class="notice">Backup imepakuliwa vizuri ✅</div>';
}
function restoreBackup(){
 const file=$("restoreFile").files[0];
 if(!file){alert("Chagua backup file kwanza.");return}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const parsed=JSON.parse(reader.result);
   const incoming=Array.isArray(parsed)?parsed:parsed.closings;
   if(!Array.isArray(incoming))throw new Error("Invalid backup");
   const current=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
   const map=new Map();
   [...current,...incoming].forEach(r=>{
     if(r&&r.id!=null)map.set(String(r.id),r);
   });
   const merged=[...map.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   localStorage.setItem("officeClosingV4",JSON.stringify(merged.slice(0,730)));
   renderHistory();renderDashboard();
   $("backupMessage").innerHTML=`<div class="notice">Restore imefanikiwa ✅ — Closings ${merged.length}</div>`;
  }catch(err){
   $("backupMessage").innerHTML='<div class="notice" style="background:#ffe9e9;color:#a40000">Backup file si sahihi au imeharibika.</div>';
  }
 };
 reader.readAsText(file);
}

function accountRows(d){
 return Object.entries(d.accounts).map(([k,v])=>`<tr><td>${k}</td><td>${money(v)} TSh</td></tr>`).join("");
}
function peopleRows(title,items){
 if(!items.length)return `<tr><td colspan="2">${title}: Hakuna</td></tr>`;
 return items.map(x=>`<tr><td>${title} — ${x.name}${x.note?" ("+x.note+")":""}</td><td>${money(x.amount)} TSh</td></tr>`).join("");
}
function dailyRecord(date){
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const m=h.find(x=>x.date===date&&x.type==="morning");
 const e=h.find(x=>x.date===date&&x.type==="evening");
 return {m,e};
}
function showDailyReport(date){
 const {m,e}=dailyRecord(date);
 const r=e||m; const settings=getSettings();
 if(!r)return;
 $("home").classList.add("hidden");$("dashboard").classList.add("hidden");
 $("backupSection").classList.add("hidden");$("monthlyReport").classList.add("hidden");
 $("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");$("formSection").classList.add("hidden");
 $("comparisonSection").classList.add("hidden");$("dailyReport").classList.remove("hidden");
 let sections="";
 [m,e].forEach(x=>{
   if(!x)return;
   sections+=`<h3>${x.type==="morning"?"🌅 Morning Closing":"🌆 Evening Closing"}</h3>
   <table class="report-table">
   <tr><th>Cashier</th><td>${x.cashier}</td></tr>
   <tr><th>Closing Number</th><td>${x.closingNo}</td></tr>
   ${accountRows(x.data)}
   <tr><th>Jumla ya Cash na Float</th><td><b>${money(x.data.total)} TSh</b></td></tr>
   ${peopleRows("Madai",x.data.claims)}
   ${peopleRows("Madaiwa",x.data.debts)}
   <tr><th>Mtaji Halisi</th><td><b>${money(x.data.capital)} TSh</b></td></tr>
   <tr><th>Maelezo</th><td>${x.notes||"Hakuna"}</td></tr>
   </table>`;
 });
 let diff="";
 if(m&&e){
   const d=e.data.capital-m.data.capital;
   diff=`<div class="report-total">${d===0?"SAWA":d>0?"SURPLUS / MAZIDI":"SHORTAGE / MAPUNGUFU"}: <b>${d>=0?"+":""}${money(d)} TSh</b></div>`;
 }
 $("dailyReportBody").innerHTML=`<div class="daily-head"><h1>${settings.officeName||"OFFICE CLOSING"}</h1><div class="sub">${settings.officeBranch||""} — Daily Financial Closing Report — ${date}</div></div>${sections}${diff}`;
 window.scrollTo({top:0,behavior:"smooth"});
}
function printDaily(){window.print()}

function showMonthlyReport(){if(!requireLogin())return;
 $("home").classList.add("hidden");$("settingsSection").classList.add("hidden");$("dailyReport").classList.add("hidden");$("formSection").classList.add("hidden");
 $("comparisonSection").classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");
 $("dashboard").classList.add("hidden");$("dailyReport").classList.add("hidden");$("monthlyReport").classList.remove("hidden");
 if(!$("reportMonth").value)$("reportMonth").value=new Date().toISOString().slice(0,7);
 renderMonthlyReport();window.scrollTo({top:0,behavior:"smooth"});
}
function renderMonthlyReport(){
 const month=$("reportMonth").value;
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const rows=[];
 const dates=[...new Set(h.filter(x=>x.date&&x.date.slice(0,7)===month).map(x=>x.date))].sort();
 let shortage=0,surplus=0,days=0,net=0;
 dates.forEach(date=>{
   const m=h.find(x=>x.date===date&&x.type==="morning");
   const e=h.find(x=>x.date===date&&x.type==="evening");
   if(!m||!e)return;
   days++;
   const diff=e.data.capital-m.data.capital;net+=diff;
   if(diff<0)shortage+=Math.abs(diff);else surplus+=diff;
   const status=diff===0?'<span class="badge gray">SAWA</span>':
     diff<0?'<span class="badge red">SHORTAGE</span>':'<span class="badge green">SURPLUS</span>';
   rows.push({date,m,e,diff,status});
 });
 const ss=getSettings(); const ph=document.querySelector(".print-header"); if(ph) ph.innerHTML="<h1>"+(ss.officeName||"OFFICE CLOSING")+"</h1><div>"+(ss.officeBranch||"")+" — Monthly Financial Closing Report — "+month+"</div>";
 $("reportSummary").innerHTML=
  `<div class="report-stat"><span>Siku zilizofungwa</span><b>${days}</b></div>
   <div class="report-stat"><span>Total Shortage</span><b>${money(shortage)} TSh</b></div>
   <div class="report-stat"><span>Total Surplus</span><b>${money(surplus)} TSh</b></div>
   <div class="report-stat"><span>Net Difference</span><b>${net>=0?"+":""}${money(net)} TSh</b></div>`;
 const tbody=$("monthlyTable").querySelector("tbody");
 tbody.innerHTML=rows.length?rows.map(r=>`
   <tr>
    <td>${r.date}</td>
    <td>${money(r.m.data.capital)} TSh</td>
    <td>${money(r.e.data.capital)} TSh</td>
    <td>${r.diff>=0?"+":""}${money(r.diff)} TSh</td>
    <td>${r.status}</td>
    <td><button type="button" class="secondary" onclick="toggleMonthlyDetail('${r.date}')">View Details</button></td>
   </tr>
   <tr id="detail-${r.date}" style="display:none"><td colspan="6"><div class="detailbox" id="detailbox-${r.date}"></div></td></tr>
 `).join(""):'<tr><td colspan="6">Hakuna siku iliyofungwa kikamilifu kwa mwezi huu.</td></tr>';
}
function toggleMonthlyDetail(date){
 const row=$("detail-"+date), box=$("detailbox-"+date);
 if(row.style.display==="table-row"){row.style.display="none";return}
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const m=h.find(x=>x.date===date&&x.type==="morning"),e=h.find(x=>x.date===date&&x.type==="evening");
 const formatAccounts=d=>Object.entries(d.accounts).map(([k,v])=>`${k}: ${money(v)} TSh`).join(" | ");
 const people=d=>[...d.claims.map(x=>"Madai "+x.name+": "+money(x.amount)),...d.debts.map(x=>"Madaiwa "+x.name+": "+money(x.amount))].join(" | ")||"Hakuna";
 const diff=e.data.capital-m.data.capital;
 box.innerHTML=`<b>${date}</b><br>
 Morning Cash/Float: ${money(m.data.total)} TSh — Cashier: ${m.cashier}<br>
 Morning accounts: ${formatAccounts(m.data)}<br>
 Morning Madai/Madaiwa: ${people(m.data)}<br>
 Evening Cash/Float: ${money(e.data.total)} TSh — Cashier: ${e.cashier}<br>
 Evening accounts: ${formatAccounts(e.data)}<br>
 Evening Madai/Madaiwa: ${people(e.data)}<br>
 Difference: <b>${diff>=0?"+":""}${money(diff)} TSh</b><br>
 Notes: ${e.notes||m.notes||"Hakuna"}`;
 row.style.display="table-row";
}

function filteredHistory(){
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const q=($("historySearch")?.value||"").trim().toLowerCase();
 const type=$("historyType")?.value||"";
 const status=$("historyStatus")?.value||"";
 return h.filter(r=>{
   const hay=[r.date,r.type,r.cashier,r.closingNo,r.notes,r.status,r.approvedBy,r.reopenReason].join(" ").toLowerCase();
   return (!q||hay.includes(q))&&(!type||r.type===type)&&(!status||statusOf(r)===status);
 });
}
function renderHistory(){
 const box=$("history"), all=filteredHistory();
 if(!all.length){box.innerHTML='<div class="empty">Hakuna closing inayolingana na filter.</div>';return}
 const admin=isAdmin();
 box.innerHTML=all.map(r=>{
   const st=statusOf(r);
   return `<div class="history-item">
     <b>${r.date}</b> — ${r.type==="morning"?"🌅 Morning":"🌆 Evening"}<br>
     Closing No: <b>${r.closingNo}</b><br>
     Cashier: ${r.cashier}<br>
     Mtaji: <b>${money(r.data.capital)} TSh</b><br>
     Status: <span class="status-pill ${st==="APPROVED"?"status-approved":st==="EDIT"?"status-edit":"status-locked"}">${st}</span>
     <div class="history-actions">
       <button type="button" class="secondary" onclick="viewClosingDetails('${String(r.id)}')">🔎 Details</button>
       ${admin||st==="EDIT"?`<button type="button" onclick="loadRecord(${r.id})">${st==="EDIT"?"✏️ Fungua / Edit":"Fungua"}</button>`:`<button class="disabled-btn" disabled>🔒 Locked</button>`}
       ${admin?`<button type="button" class="danger" onclick="deleteRecord(${r.id})">Futa</button>`:""}
     </div>
   </div>`;
 }).join("");
}
function showHistory(){if(!requireLogin())return;
 $("home").classList.add("hidden");$("settingsSection").classList.add("hidden");$("dailyReport").classList.add("hidden");
 $("formSection").classList.add("hidden");$("comparisonSection").classList.add("hidden");$("dashboard").classList.add("hidden");
 $("monthlyReport").classList.add("hidden");$("closingDetailSection").classList.add("hidden");
 $("historySection").classList.remove("hidden");renderHistory();
}
function closeClosingDetails(){
 $("closingDetailSection").classList.add("hidden");
 $("historySection").classList.remove("hidden");
}
function accountDetailRows(d){
 return Object.entries(d.accounts||{}).map(([k,v])=>`<tr><td>${k}</td><td>${money(v)} TSh</td></tr>`).join("");
}
function peopleDetailRows(title,items){
 if(!items?.length)return `<tr><td>${title}</td><td>Hakuna</td></tr>`;
 return items.map(x=>`<tr><td>${title} — ${x.name}${x.note?" ("+x.note+")":""}</td><td>${money(x.amount)} TSh</td></tr>`).join("");
}
function viewClosingDetails(id){
 if(!requireLogin())return;
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");
 const r=h.find(x=>String(x.id)===String(id));
 if(!r)return;
 $("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");$("closingDetailSection").classList.remove("hidden");
 const st=statusOf(r), admin=isAdmin();
 const d=r.data||{};
 $("closingDetail").innerHTML=`
   <div class="detail-grid">
     <div class="detail-card"><b>📅 Tarehe</b><br>${r.date||"—"}</div>
     <div class="detail-card"><b>🔢 Closing Number</b><br>${r.closingNo||"—"}</div>
     <div class="detail-card"><b>👤 Cashier</b><br>${r.cashier||"—"}</div>
     <div class="detail-card"><b>📌 Status</b><br><span class="status-pill ${st==="APPROVED"?"status-approved":st==="EDIT"?"status-edit":"status-locked"}">${st}</span></div>
   </div>
   <div class="detail-card">
     <h3>💵 Cash na Float</h3>
     <table class="detail-table"><thead><tr><th>Account</th><th>Amount</th></tr></thead><tbody>
       ${accountDetailRows(d)}
     </tbody></table>
     <div class="detail-total">Jumla ya Cash na Float: ${money(d.total||0)} TSh</div>
   </div>
   <div class="detail-grid">
     <div class="detail-card"><h3>➕ Madai — Ofisi inadai</h3><table class="detail-table"><tbody>${peopleDetailRows("Madai",d.claims||[])}</tbody></table></div>
     <div class="detail-card"><h3>➖ Madaiwa — Ofisi inadaiwa</h3><table class="detail-table"><tbody>${peopleDetailRows("Madaiwa",d.debts||[])}</tbody></table></div>
   </div>
   <div class="detail-card">
     <h3>💰 Mtaji Halisi</h3>
     <div class="detail-total">${money(d.capital||0)} TSh</div>
     <p><b>Saved:</b> ${r.savedAt||"—"}</p>
     ${r.approvedBy?`<p><b>Approved by:</b> ${r.approvedBy} — ${r.approvedAt||"—"}</p>`:""}
     ${r.reopenedBy?`<p><b>Re-opened by:</b> ${r.reopenedBy} — ${r.reopenedAt||"—"}</p><p><b>Reason:</b> ${r.reopenReason||"—"}</p>`:""}
     <p><b>Notes:</b> ${r.notes||"Hakuna"}</p>
   </div>
   <div class="detail-actions">
     ${admin&&st==="EDIT"?`<button type="button" onclick="loadRecord(${r.id})">✏️ Fungua / Edit</button>`:""}
     ${admin?`<button type="button" class="secondary" onclick="showApprovals()">🔐 Approvals</button>`:""}
     <button type="button" class="secondary" onclick="printSingleClosing('${String(r.id)}')">🖨️ Print Closing</button>
   </div>`;
}
function printSingleClosing(id){
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]"),r=h.find(x=>String(x.id)===String(id));if(!r)return;
 const s=getSettings(),d=r.data||{};
 const rows=Object.entries(d.accounts||{}).map(([k,v])=>`<tr><td>${k}</td><td>${money(v)} TSh</td></tr>`).join("");
 const claims=(d.claims||[]).map(x=>`<tr><td>Madai — ${x.name}</td><td>${money(x.amount)} TSh</td></tr>`).join("");
 const debts=(d.debts||[]).map(x=>`<tr><td>Madaiwa — ${x.name}</td><td>${money(x.amount)} TSh</td></tr>`).join("");
 const w=window.open("","_blank","width=900,height=800");
 if(!w){alert("Browser imezuia popup. Ruhusu popups kisha jaribu tena.");return}
 w.document.write(`<html><head><title>${r.closingNo}</title><style>body{font-family:Arial;padding:30px}h1{margin-bottom:3px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}.total{font-size:18px;font-weight:bold}.sig{display:flex;justify-content:space-between;margin-top:60px}</style></head><body>
 <h1>${s.officeName||"OFFICE CLOSING"}</h1><div>${s.officeBranch||""}</div><h2>${r.type==="morning"?"Morning":"Evening"} Closing Report</h2>
 <p><b>Tarehe:</b> ${r.date} &nbsp; <b>Closing No:</b> ${r.closingNo}</p><p><b>Cashier:</b> ${r.cashier} &nbsp; <b>Status:</b> ${statusOf(r)}</p>
 <h3>Cash na Float</h3><table><tr><th>Account</th><th>Amount</th></tr>${rows}</table><p class="total">Jumla ya Cash na Float: ${money(d.total||0)} TSh</p>
 <table>${claims}${debts}</table><p class="total">Mtaji Halisi: ${money(d.capital||0)} TSh</p><p><b>Notes:</b> ${r.notes||"Hakuna"}</p>
 <div class="sig"><span>Cashier Signature: __________________</span><span>Supervisor: __________________</span></div>
 <script>window.onload=()=>window.print()</script></body></html>`);
 w.document.close();
}
function loadRecord(id){
 if(!requireLogin())return;
 const h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]"),r=h.find(x=>x.id===id);if(!r)return;
 const st=statusOf(r); if(!isAdmin() || st!=="EDIT"){alert("Closing hii imefungwa 🔒. Admin ndiye anaweza kuifungua baada ya kuweka sababu.");return;}
 currentType=r.type;$("home").classList.add("hidden");$("approvalSection")?.classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");$("formSection").classList.remove("hidden");
 $("formTitle").textContent=r.type==="morning"?"🌅 Morning Closing":"🌆 Evening Closing";$("closingTypeLabel").textContent=r.type.toUpperCase();$("date").value=r.date;loadCashiers();$("cashier").value=r.cashier;$("closingNo").value=r.closingNo;$("notes").value=r.notes||"";
 $("claims").innerHTML="";$("debts").innerHTML="";buildAccounts();$("accounts").querySelectorAll("input[data-account]").forEach(e=>{e.value=r.data.accounts[e.dataset.account]||0;formatMoneyInput(e);});
 r.data.claims.forEach(x=>addPerson("claims",x.name,x.amount,x.note));r.data.debts.forEach(x=>addPerson("debts",x.name,x.amount,x.note));calculate();setLockNotice("✏️ EDIT MODE — baada ya Save closing itafungwa tena 🔒","locked");window.scrollTo({top:0,behavior:"smooth"});
}
function deleteRecord(id){if(!isAdmin()){alert("Admin pekee ndiye anaweza kufuta closing.");return}if(!confirm("Futa closing hii?"))return;const old=JSON.parse(localStorage.getItem("officeClosingV4")||"[]").find(x=>x.id===id);logAudit("DELETE_CLOSING",{closingNo:old?.closingNo||"",type:old?.type||"",date:old?.date||""});let h=JSON.parse(localStorage.getItem("officeClosingV4")||"[]");h=h.filter(x=>x.id!==id);localStorage.setItem("officeClosingV4",JSON.stringify(h));removeApprovalRecord(id);renderHistory();renderDashboard()}
function home(){currentType=null;$("closingDetailSection")?.classList.add("hidden");$("auditSection")?.classList.add("hidden");$("settingsSection").classList.add("hidden");$("dailyReport").classList.add("hidden");$("backupSection").classList.add("hidden");$("formSection").classList.add("hidden");$("comparisonSection").classList.add("hidden");$("historySection").classList.add("hidden");$("closingDetailSection")?.classList.add("hidden");$("dashboard").classList.add("hidden");$("monthlyReport").classList.add("hidden");$("home").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function showHistory(){if(!requireLogin())return;$("home").classList.add("hidden");$("settingsSection").classList.add("hidden");$("dailyReport").classList.add("hidden");$("formSection").classList.add("hidden");$("comparisonSection").classList.add("hidden");$("dashboard").classList.add("hidden");$("monthlyReport").classList.add("hidden");$("historySection").classList.remove("hidden");renderHistory()}
$("newMorning").onclick=()=>openNew("morning");$("loginBtn").onclick=login;$("logoutBtn").onclick=logout;$("approvalBtn").onclick=showApprovals;$("approvalHomeBtn").onclick=approvalHome;$("loginPassword").addEventListener("keydown",e=>{if(e.key==="Enter")login()});$("addUser").onclick=addUser;$("settingsBtn").onclick=showSettings;$("settingsHomeBtn").onclick=settingsHome;$("saveSettings").onclick=saveSettings;$("addCashier").onclick=addCashier;$("printDaily").onclick=printDaily;$("dailyReportHome").onclick=home;$("backupBtn").onclick=showBackup;$("backupHomeBtn").onclick=backupHome;$("exportBackup").onclick=downloadBackup;$("createBackupNow").onclick=()=>createAutoBackup("Manual");$("restoreBackup").onclick=restoreBackup;$("newEvening").onclick=()=>openNew("evening");$("monthlyBtn").onclick=showMonthlyReport;$("reportHomeBtn").onclick=home;$("refreshReport").onclick=renderMonthlyReport;$("printMonthly").onclick=()=>window.print();$("dashboardBtn").onclick=showDashboard;$("dashboardHomeBtn").onclick=dashboardHome;
$("addClaim").onclick=()=>addPerson("claims");$("addDebt").onclick=()=>addPerson("debts");
$("saveBtn").onclick=save;$("backBtn").onclick=home;$("historyBtn").onclick=showHistory;$("homeBtn").onclick=home;$("closingDetailBack").onclick=closeClosingDetails;$("historySearch").addEventListener("input",renderHistory);$("historyType").addEventListener("change",renderHistory);$("historyStatus").addEventListener("change",renderHistory);$("clearHistoryFilters").onclick=()=>{$("historySearch").value="";$("historyType").value="";$("historyStatus").value="";renderHistory()};
$("date").addEventListener("change",()=>{if(currentType)$("closingNo").value=makeNo($("date").value,currentType)});loadCashiers();updateBranding();initApprovalStore();if(!localStorage.getItem(AUDIT_KEY))localStorage.setItem(AUDIT_KEY,JSON.stringify([])); const ls=document.querySelector("#loginOfficeName"); if(ls)ls.textContent=getSettings().officeName||"Office Closing"; requireLogin();
renderHistory();
