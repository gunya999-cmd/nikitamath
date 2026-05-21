import { FormEvent, useEffect, useMemo, useState } from 'react';
import { INITIAL_DIAGNOSTIC_QUESTIONS, findSkillByCode } from '@/data/diagnostic';
import { supabase } from '@/lib/supabase';

type Page = '/' | '/login' | '/dashboard' | '/diagnostic' | '/chat';
type User = { id: string; email: string } | null;
const pages: Page[] = ['/', '/login', '/dashboard', '/diagnostic', '/chat'];

const getPath = (): Page => (pages.includes(window.location.pathname as Page) ? (window.location.pathname as Page) : '/');
const go = (path: Page) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); };

function NavButton({ path, label }: { path: Page; label: string }) { return <button className="hover:underline" onClick={() => go(path)}>{label}</button>; }

export function App() {
  const [page, setPage] = useState<Page>(getPath());
  const [user, setUser] = useState<User>(null);
  useEffect(() => { const h = () => setPage(getPath()); window.addEventListener('popstate', h); return () => window.removeEventListener('popstate', h); }, []);

  const protectedPage = (page === '/dashboard' || page === '/diagnostic' || page === '/chat') && !user;
  const current = protectedPage ? '/login' : page;

  return <div className="min-h-screen bg-slate-50 text-slate-900"><nav className="border-b bg-white"><div className="mx-auto flex max-w-4xl gap-4 px-6 py-3"><NavButton path="/" label="Home" /><NavButton path="/dashboard" label="Dashboard" /><NavButton path="/diagnostic" label="Diagnostic" /><NavButton path="/chat" label="Chat" /></div></nav>
    {current === '/' && <Landing />}
    {current === '/login' && <Login onLogin={setUser} />}
    {current === '/dashboard' && <Dashboard />}
    {current === '/diagnostic' && <Diagnostic />}
    {current === '/chat' && <Chat />}
  </div>;
}
// components from previous
function Landing(){return <div className="mx-auto max-w-4xl px-6 py-20"><h1 className="text-5xl font-semibold">NikitaMath AI Tutor</h1><p className="mt-6 text-lg text-slate-600">A calm, premium tutoring space to diagnose skills, track progress, and keep math practice focused.</p><button className="mt-8 rounded-lg bg-slate-900 px-6 py-3 text-white" onClick={()=>go('/login')}>Login / Start Learning</button></div>}
function Login({onLogin}:{onLogin:(u:User)=>void}){const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [mode,setMode]=useState<'login'|'register'>('login');async function submit(e:FormEvent){e.preventDefault();setError('');if(!supabase){setError('Missing Supabase env vars');return;}const r=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(r.error){setError(r.error.message);return;}onLogin(r.data.user?{id:r.data.user.id,email:r.data.user.email??email}:null);go('/dashboard');}return <div className="mx-auto max-w-md px-6 py-16"><h2 className="text-3xl font-semibold">{mode==='login'?'Login':'Create account'}</h2><form className="mt-6 space-y-3" onSubmit={submit}><input className="w-full rounded border p-3" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /><input className="w-full rounded border p-3" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} />{error&&<p className="text-red-600">{error}</p>}<button className="w-full rounded bg-slate-900 p-3 text-white" type="submit">{mode==='login'?'Login':'Register'}</button></form><button className="mt-4 text-sm" onClick={()=>setMode(mode==='login'?'register':'login')}>Switch to {mode==='login'?'register':'login'}</button></div>}
function Dashboard(){return <div className="mx-auto max-w-4xl px-6 py-10"><h2 className="text-3xl font-semibold">Dashboard</h2><p className="mt-2 text-slate-600">Lesson of the day: Fractions simplification.</p><p className="mt-2 text-slate-600">Progress: mastery 62%, strong arithmetic, weak linear equations.</p><div className="mt-4 flex gap-2"><button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={()=>go('/diagnostic')}>Start diagnostic</button><button className="rounded border px-4 py-2" onClick={()=>go('/chat')}>Continue chat</button></div></div>}
function Diagnostic(){const [answers,setAnswers]=useState<Record<string,string>>({});const [submitted,setSubmitted]=useState(false);const result=useMemo(()=>{const checked=INITIAL_DIAGNOSTIC_QUESTIONS.map((q)=>({q,ok:(answers[q.id]??'').trim().replace(',', '.')===q.answer}));const score=checked.filter((x)=>x.ok).length;const bySkill=checked.reduce<Record<string,{total:number;ok:number}>>((a,i)=>{a[i.q.skillCode]??={total:0,ok:0};a[i.q.skillCode].total++;if(i.ok)a[i.q.skillCode].ok++;return a;},{});const ranked=Object.entries(bySkill).map(([skillCode,stats])=>({skillCode,ratio:stats.ok/stats.total}));return {score,total:checked.length,strong:ranked.filter((r)=>r.ratio>=0.75),weak:ranked.filter((r)=>r.ratio<0.5)};},[answers]);return <div className="mx-auto max-w-3xl px-6 py-10"><h2 className="text-3xl font-semibold">Diagnostic</h2>{INITIAL_DIAGNOSTIC_QUESTIONS.map((q)=><div key={q.id} className="mt-3 rounded border bg-white p-3"><p>{q.prompt}</p><input className="mt-2 w-full rounded border p-2" value={answers[q.id]??''} onChange={(e)=>setAnswers((p)=>({...p,[q.id]:e.target.value}))}/></div>)}<button className="mt-4 rounded bg-slate-900 px-4 py-2 text-white" onClick={()=>setSubmitted(true)}>Submit</button>{submitted&&<div className="mt-4 rounded border bg-white p-3"><p>Score: {result.score}/{result.total}</p><p>Strong: {result.strong.map((x)=>findSkillByCode(x.skillCode)?.title??x.skillCode).join(', ')||'None'}</p><p>Weak: {result.weak.map((x)=>findSkillByCode(x.skillCode)?.title??x.skillCode).join(', ')||'None'}</p></div>}</div>}
function Chat(){return <div className="mx-auto max-w-3xl px-6 py-10"><h2 className="text-3xl font-semibold">Tutor Chat</h2><div className="mt-4 rounded border bg-white p-4">Placeholder chat is enabled for safe static deploy when AI keys are not configured.</div></div>}
