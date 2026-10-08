const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) console.warn('WARNING: DATABASE_URL haijawekwa. V18 inahitaji PostgreSQL kwa production.');

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: /render\.com|\.internal\./i.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined, max: 5 }) : null;

const defaultState = {
  officeClosingV4: [],
  officeClosingApprovals: [],
  officeClosingAudit: [],
  officeClosingUsers: [
    {username:'admin',password:'admin123',role:'admin'},
    {username:'cashier',password:'cashier123',role:'cashier'}
  ],
  officeClosingSettings: {officeName:'Office Closing',officeBranch:'',officePhone:'',officeAddress:'',cashiers:[]}
};

async function initDb(){
  if(!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS app_state_updated_at_idx ON app_state(updated_at);
  `);
  const {rows} = await pool.query('SELECT COUNT(*)::int AS count FROM app_state');
  if(rows[0].count === 0){
    for(const [key,value] of Object.entries(defaultState)){
      const v=key==='officeClosingUsers' ? await hashUsers(value) : value;
      await pool.query('INSERT INTO app_state(key,value) VALUES($1,$2::jsonb)',[key,JSON.stringify(v)]);
    }
  } else {
    for(const [key,value] of Object.entries(defaultState)){
      const v=key==='officeClosingUsers' ? await hashUsers(value) : value;
      await pool.query('INSERT INTO app_state(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO NOTHING',[key,JSON.stringify(v)]);
    }
  }
}

async function hashUsers(users){
  return Promise.all((users||[]).map(async u=>{
    const copy={...u};
    if(copy.password && !String(copy.password).startsWith('$2')) copy.password=await bcrypt.hash(String(copy.password),12);
    return copy;
  }));
}

async function loadState(){
  if(!pool) return {...defaultState};
  const {rows}=await pool.query('SELECT key,value FROM app_state');
  const state={...defaultState};
  for(const r of rows) state[r.key]=r.value;
  return state;
}


function mergeById(current,incoming,previous){
  if(!Array.isArray(current)||!Array.isArray(incoming)) return incoming;
  const prev=Array.isArray(previous)?previous:[];
  const prevIds=new Set(prev.map(x=>String(x.id)));
  const incomingIds=new Set(incoming.map(x=>String(x.id)));
  const deletedIds=new Set(prev.filter(x=>x&&x.id!=null&&!incomingIds.has(String(x.id))).map(x=>String(x.id)));
  const map=new Map(current.filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]));
  for(const x of incoming){ if(x&&x.id!=null) map.set(String(x.id),x); }
  for(const id of deletedIds){ if(prevIds.has(id)) map.delete(id); }
  return [...map.values()].sort((a,b)=>(Number(b.id)||0)-(Number(a.id)||0));
}

async function mergeState(key,incoming,previous){
  const current=(await loadState())[key];
  if(['officeClosingV4','officeClosingApprovals','officeClosingAudit'].includes(key)) return mergeById(current,incoming,previous);
  return incoming;
}

async function setState(key,value){
  if(!pool) throw new Error('DATABASE_URL missing');
  await pool.query(`INSERT INTO app_state(key,value,updated_at) VALUES($1,$2::jsonb,NOW())
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,[key,JSON.stringify(value)]);
}

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SYNC_KEYS = new Set(['officeClosingV4','officeClosingApprovals','officeClosingAudit','officeClosingUsers','officeClosingSettings']);
const CASHIER_WRITE_KEYS = new Set(['officeClosingV4']);
const ADMIN_WRITE_KEYS = SYNC_KEYS;
function publicState(state, role){
  const out={...state};
  delete out.officeClosingUsers;
  delete out.officeClosingAutoBackups;
  delete out.officeClosingBackupMeta;
  delete out.officeClosingAuth;
  if(role!=='admin') delete out.officeClosingAudit;
  return out;
}
function token(){return crypto.randomBytes(32).toString('hex')}
function send(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>5_000_000) req.destroy()});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
function auth(req){const t=req.headers['x-session'];if(!t||!sessions.has(t))return null;const s=sessions.get(t);if(Date.now()-s.last>SESSION_TTL_MS){sessions.delete(t);return null;}s.last=Date.now();return s}
function safeUser(u){return {username:u.username,role:u.role}}

function serve(req,res){
  let u=new URL(req.url,'http://localhost');let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';
  const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found')}
  const ext=path.extname(f);const ct={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'}[ext]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/health'&&req.method==='GET'){
      if(!pool) return send(res,503,{ok:false,service:'office-closing-app',database:'missing',message:'DATABASE_URL haijawekwa'});
      await pool.query('SELECT 1');
      return send(res,200,{ok:true,service:'office-closing-app',database:'postgresql',time:new Date().toISOString()});
    }
    if(req.url==='/api/login'&&req.method==='POST'){
      const b=await body(req);const state=await loadState();
      const u=(state.officeClosingUsers||[]).find(x=>String(x.username).toLowerCase()===String(b.username||'').trim().toLowerCase());
      const passwordOk=u ? await bcrypt.compare(String(b.password||''),String(u.password||'')) : false;
      if(!u || !passwordOk)return send(res,401,{ok:false,message:'Username au password si sahihi.'});
      const t=token();sessions.set(t,{username:u.username,role:u.role,last:Date.now()});
      return send(res,200,{ok:true,token:t,user:safeUser(u),state:publicState(state,u.role)});
    }
    if(req.url==='/api/state'&&req.method==='GET'){
      if(!auth(req))return send(res,401,{ok:false});
      return send(res,200,{ok:true,state:publicState(await loadState(),s.role)});
    }
    if(req.url==='/api/state'&&req.method==='PUT'){
      const s=auth(req);if(!s)return send(res,401,{ok:false});
      const b=await body(req);
      if(!SYNC_KEYS.has(b.key))return send(res,400,{ok:false,message:'Invalid state key'});
      if(s.role==='admin'){
        if(b.key==='officeClosingUsers') b.value=await hashUsers(b.value);
      } else if(!CASHIER_WRITE_KEYS.has(b.key)){
        return send(res,403,{ok:false,message:'Cashier hana ruhusa ya kubadilisha sehemu hii.'});
      }
      b.value=await mergeState(b.key,b.value,b.previousValue);
      await setState(b.key,b.value);return send(res,200,{ok:true,updatedAt:new Date().toISOString()});
    }
    if(req.url==='/api/logout'&&req.method==='POST'){sessions.delete(req.headers['x-session']);return send(res,200,{ok:true})}
    serve(req,res);
  }catch(e){console.error(e);send(res,500,{ok:false,message:'Server error',detail:process.env.NODE_ENV==='production'?undefined:e.message})}
});

(async()=>{
  try{await initDb();server.listen(PORT,'0.0.0.0',()=>console.log(`Office Closing V18 running on port ${PORT}`));}
  catch(e){console.error('Database initialization failed:',e);process.exit(1)}
})();
