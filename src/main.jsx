import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Trophy, Medal, ShieldCheck, LogIn, LogOut, Plus, Search, RefreshCw,
  Users, Award, X, Pencil, Trash2, ChevronDown, House, CircleHelp
} from "lucide-react";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const POINTS = { Gold: 2, Silver: 1 };

function App() {
  const [page, setPage] = useState("leaderboard");
  const [hostels, setHostels] = useState([]);
  const [sports, setSports] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sport_id: "", hostel_id: "", medal: "Gold", people: [{ name: "", year: "1st Year" }] });

  const configured = Boolean(supabase);

  async function loadData(showSpinner = true) {
    if (!supabase) { setLoading(false); return; }
    if (showSpinner) setRefreshing(true);
    setError("");
    const [h, sp, r, st] = await Promise.all([
      supabase.from("hostels").select("*").order("name"),
      supabase.from("sports").select("*").order("name"),
      supabase.from("results").select("*, sports(name), hostels(name)").order("created_at", { ascending: false }),
      supabase.from("result_students").select("*").order("name")
    ]);
    const failure = h.error || sp.error || r.error || st.error;
    if (failure) setError(failure.message);
    setHostels(h.data || []);
    setSports(sp.data || []);
    setResults(r.data || []);
    setStudents(st.data || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    loadData(false);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const studentsByResult = useMemo(() => {
    const map = {};
    for (const s of students) (map[s.result_id] ||= []).push(s);
    return map;
  }, [students]);

  const leaderboard = useMemo(() => {
    const base = hostels.map(h => {
      const hostelResults = results.filter(r => r.hostel_id === h.id);
      return {
        ...h,
        gold: hostelResults.filter(r => r.medal === "Gold").length,
        silver: hostelResults.filter(r => r.medal === "Silver").length,
        points: hostelResults.reduce((sum, r) => sum + (POINTS[r.medal] || 0), 0),
        results: hostelResults.length
      };
    });
    base.sort((a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver || a.name.localeCompare(b.name));
    return base.map((h, i) => ({ ...h, rank: i + 1 }));
  }, [hostels, results]);

  const totalGold = results.filter(r => r.medal === "Gold").length;
  const totalSilver = results.filter(r => r.medal === "Silver").length;
  const totalPoints = results.reduce((n, r) => n + (POINTS[r.medal] || 0), 0);

  const filteredResults = useMemo(() => results.filter(r => {
    const personNames = (studentsByResult[r.id] || []).map(s => s.name).join(" ");
    const haystack = `${r.sports?.name || ""} ${r.hostels?.name || ""} ${r.medal} ${personNames}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (sportFilter === "all" || r.sport_id === sportFilter);
  }), [results, studentsByResult, query, sportFilter]);

  function openNew() {
    setEditing(null);
    setForm({ sport_id: sports[0]?.id || "", hostel_id: hostels[0]?.id || "", medal: "Gold", people: [{ name: "", year: "1st Year" }] });
    setModal(true);
    setNotice("");
  }
  function openEdit(result) {
    const people = (studentsByResult[result.id] || []).map(s => ({ name: s.name, year: s.year }));
    setEditing(result);
    setForm({
      sport_id: result.sport_id, hostel_id: result.hostel_id, medal: result.medal,
      people: people.length ? people : [{ name: "", year: "1st Year" }]
    });
    setModal(true);
    setNotice("");
  }
  function updatePerson(index, key, value) {
    setForm(prev => ({ ...prev, people: prev.people.map((p, i) => i === index ? { ...p, [key]: value } : p) }));
  }
  function addPerson() {
    setForm(prev => ({ ...prev, people: [...prev.people, { name: "", year: "1st Year" }] }));
  }
  function removePerson(index) {
    setForm(prev => ({ ...prev, people: prev.people.filter((_, i) => i !== index) }));
  }

  async function saveResult(event) {
    event.preventDefault();
    if (!supabase || !session) return;
    if (!form.sport_id || !form.hostel_id || !form.medal) { setError("Please choose a sport, hostel and medal."); return; }
    const people = form.people.map(p => ({ name: p.name.trim(), year: p.year })).filter(p => p.name);
    setSaving(true); setError(""); setNotice("");
    try {
      let resultId = editing?.id;
      if (editing) {
        const { error: updateError } = await supabase.from("results").update({
          sport_id: form.sport_id, hostel_id: form.hostel_id, medal: form.medal, updated_at: new Date().toISOString()
        }).eq("id", editing.id);
        if (updateError) throw updateError;
        const { error: clearError } = await supabase.from("result_students").delete().eq("result_id", editing.id);
        if (clearError) throw clearError;
      } else {
        const { data: inserted, error: insertError } = await supabase.from("results").insert({
          sport_id: form.sport_id, hostel_id: form.hostel_id, medal: form.medal
        }).select().single();
        if (insertError) throw insertError;
        resultId = inserted.id;
      }
      if (people.length) {
        const { error: peopleError } = await supabase.from("result_students").insert(people.map(p => ({ ...p, result_id: resultId })));
        if (peopleError) throw peopleError;
      }
      setModal(false);
      setNotice(editing ? "Result updated successfully." : "Result published successfully.");
      await loadData(false);
    } catch (e) {
      setError(e.message || "Could not save result.");
    } finally { setSaving(false); }
  }

  async function deleteResult(result) {
    if (!confirm(`Delete ${result.medal} result for ${result.sports?.name || "this sport"}?`)) return;
    const { error: deleteError } = await supabase.from("results").delete().eq("id", result.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Result deleted."); await loadData(false); }
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true); setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (loginError) setError(loginError.message);
    else { setLoginPassword(""); setPage("admin"); setNotice("Admin login successful."); }
    setSaving(false);
  }
  async function signOut() {
    await supabase?.auth.signOut();
    setPage("leaderboard");
    setNotice("Signed out.");
  }

  const resultCards = filteredResults;
  const getMedalClass = medal => medal.toLowerCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage("leaderboard"); }}>
          <span className="brand-mark"><Trophy size={22} /></span>
          <span><strong>KIET <em>HPL 2026</em></strong><small>HOSTEL PREMIER LEAGUE · 2026</small></span>
        </a>
        <nav>
          <button className={page === "leaderboard" ? "nav-link active" : "nav-link"} onClick={() => setPage("leaderboard")}>Leaderboard</button>
          <button className={page === "results" ? "nav-link active" : "nav-link"} onClick={() => setPage("results")}>Results</button>
          {session ? (
            <>
              <button className={page === "admin" ? "nav-link active" : "nav-link"} onClick={() => setPage("admin")}>Admin</button>
              <button className="nav-admin" onClick={signOut}><LogOut size={15}/> Sign out</button>
            </>
          ) : (
            <button className="nav-admin" onClick={() => setPage("login")}><ShieldCheck size={15}/> Admin login</button>
          )}
        </nav>
      </header>

      <main className="container">
        {!configured && <div className="banner warning"><CircleHelp size={18}/><div><b>Database setup required</b><span>Add your Supabase URL and anon/publishable key to a local <code>.env</code> file or Vercel environment variables. Follow README.md.</span></div></div>}
        {error && <div className="banner error"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={16}/></button></div>}
        {notice && <div className="banner success"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}

        {page === "leaderboard" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><span className="live-dot"/> THE CAMPUS SHOWDOWN</div>
                <h1>One campus.<br/><span>Seven hostels.</span> One champion.</h1>
                <p>Every match matters. Track the medal race and see which hostel leads HPL 2026.</p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => setPage("results")}>Explore Results <ChevronDown size={17}/></button>
                  <button className="secondary-button" onClick={() => document.getElementById("leaderboard-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Explore Leaderboard <Trophy size={17}/></button>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
                <div className="hero-trophy"><Trophy size={94} strokeWidth={1.2}/></div>
                <div className="float-tag tag-gold"><Medal size={17}/> GOLD <b>+2</b></div>
                <div className="float-tag tag-silver"><Medal size={17}/> SILVER <b>+1</b></div>
                <div className="hero-star star-one">✦</div><div className="hero-star star-two">✦</div>
              </div>
              <div className="hero-bottom"><span><House size={15}/> KIET GROUP OF INSTITUTIONS · GHAZIABAD</span><span>PLAY HARD. EARN GLORY.</span></div>
            </section>



            <section className="section-block" id="leaderboard-section">
              <div className="section-heading"><div><div className="eyebrow">THE RACE TO THE TOP</div><h2>Hostel standings</h2><p>All hostels start at zero. Rankings update automatically after each result.</p></div><button className="icon-button" onClick={() => loadData()} title="Refresh"><RefreshCw size={17}/></button></div>
              {loading ? <Loading/> : leaderboard.length === 0 ? <Empty text="All participating hostels start at zero. Medal standings will update here after results are published."/> : (
                <div className="leaderboard-list">
                  {leaderboard.map((h, i) => (
                    <div className={`leader-row ${i === 0 && h.points > 0 ? "leader-first" : ""}`} key={h.id}>
                      <div className={`rank-badge rank-${h.rank}`}>{h.rank <= 3 && h.points > 0 ? <Trophy size={17}/> : `0${h.rank}`}</div>
                      <div className="hostel-avatar">{h.name.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()}</div>
                      <div className="hostel-info"><strong>{h.name}</strong><span>{h.results} medal {h.results === 1 ? "result" : "results"}</span></div>
                      <div className="medal-counts"><span className="gold-text"><i/> {h.gold} Gold</span><span className="silver-text"><i/> {h.silver} Silver</span></div>
                      <div className="points"><strong>{h.points}</strong><span>POINTS</span></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="points-note"><span><b>Scoring:</b> Gold = 2 points · Silver = 1 point</span><span>Equal points share the same rank.</span></div>
            </section>
            <section className="stats-grid">
              <Stat icon={<House/>} label="Participating hostels" value={hostels.length || "—"} note="Competing for the crown"/>
              <Stat icon={<Award/>} label="Gold medals" value={totalGold} note="2 points each" accent="gold"/>
              <Stat icon={<Medal/>} label="Silver medals" value={totalSilver} note="1 point each" accent="silver"/>
              <Stat icon={<Trophy/>} label="Total points awarded" value={totalPoints} note="Across all hostels"/>
            </section>
            <section className="bottom-cta"><div className="cta-icon"><Trophy size={27}/></div><div><h3>Every medal tells a story.</h3><p>Browse results to see the sports, winning hostels and student achievers.</p></div><button className="secondary-button" onClick={() => setPage("results")}>View all results <ChevronDown size={16}/></button></section>
          </>
        )}

        {page === "results" && (
          <section className="section-block results-page">
            <div className="section-heading"><div><div className="eyebrow">MEDAL ROOM</div><h2>Sports results</h2><p>Explore every published medal and the students behind it.</p></div><button className="icon-button" onClick={() => loadData()} title="Refresh"><RefreshCw size={17}/></button></div>
            <div className="filters"><label className="searchbox"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sport, hostel or student"/></label><select value={sportFilter} onChange={e => setSportFilter(e.target.value)}><option value="all">All sports</option>{sports.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></div>
            {loading ? <Loading/> : resultCards.length === 0 ? <Empty text="No matching results yet. Results will appear here after the admin publishes them."/> : (
              <div className="results-grid">{resultCards.map(r => <article className="result-card" key={r.id}>
                <div className="result-card-top"><span className={`medal-pill ${getMedalClass(r.medal)}`}><Medal size={15}/>{r.medal}</span><span className="result-points">+{POINTS[r.medal]} pts</span></div>
                <h3>{r.sports?.name || "Sport"}</h3><div className="result-hostel"><House size={15}/>{r.hostels?.name || "Hostel"}</div>
                <div className="student-list"><div className="student-list-label"><Users size={14}/> WINNING STUDENTS</div>
                  {(studentsByResult[r.id] || []).length ? (studentsByResult[r.id] || []).map(s => <div className="student-line" key={s.id}><span>{s.name}</span><small>{s.year}</small></div>) : <p className="no-students">Student names not added.</p>}
                </div>
              </article>)}</div>
            )}
          </section>
        )}

        {page === "login" && (
          <section className="login-wrap"><form className="login-card" onSubmit={signIn}>
            <div className="login-icon"><ShieldCheck size={28}/></div><div className="eyebrow">RESTRICTED ACCESS</div><h2>Admin portal</h2><p>Sign in to manage HPL 2026 medal results. Students can view the leaderboard without logging in.</p>
            <label>Email address<input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@college.edu" required autoComplete="username"/></label>
            <label>Password<input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter admin password" required autoComplete="current-password"/></label>
            <button className="primary-button full-button" disabled={saving || !configured}>{saving ? "Signing in…" : <><LogIn size={17}/> Sign in securely</>}</button>
            <span className="login-foot">Admin access only · Contact the SPL administrator for access.</span>
          </form></section>
        )}

        {page === "admin" && (
          <section className="section-block admin-page">
            {!session ? <div className="admin-locked"><ShieldCheck size={34}/><h2>Admin access required</h2><p>Sign in with the authorized admin account to manage results.</p><button className="primary-button" onClick={() => setPage("login")}>Go to admin login <LogIn size={16}/></button></div> : <>
              <div className="section-heading"><div><div className="eyebrow">CONTROL ROOM</div><h2>Manage results</h2><p>Publish a medal, choose one hostel and add all winning students.</p></div><button className="primary-button" onClick={openNew}><Plus size={17}/> Add result</button></div>
              <div className="admin-summary"><div><span>Published results</span><strong>{results.length}</strong></div><div><span>Sports listed</span><strong>{sports.length}</strong></div><div><span>Hostels competing</span><strong>{hostels.length}</strong></div></div>
              <div className="admin-table-wrap"><table><thead><tr><th>Sport</th><th>Hostel</th><th>Medal</th><th>Students</th><th>Points</th><th>Actions</th></tr></thead><tbody>
                {results.length ? results.map(r => <tr key={r.id}><td className="table-sport">{r.sports?.name}</td><td>{r.hostels?.name}</td><td><span className={`medal-pill ${getMedalClass(r.medal)}`}><Medal size={14}/>{r.medal}</span></td><td>{(studentsByResult[r.id] || []).length}</td><td><b>{POINTS[r.medal]}</b></td><td><div className="table-actions"><button onClick={() => openEdit(r)} title="Edit"><Pencil size={15}/></button><button onClick={() => deleteResult(r)} title="Delete" className="delete-action"><Trash2 size={15}/></button></div></td></tr>) : <tr><td colSpan="6" className="table-empty">No results added yet. Select “Add result” to get started.</td></tr>}
              </tbody></table></div>
            </>}
          </section>
        )}
      </main>

      <footer className="footer"><div className="footer-brand"><Trophy size={18}/><strong>KIET HPL 2026</strong></div><span>HOSTEL PREMIER LEAGUE · GHAZIABAD</span><span>Built for the spirit of competition.</span></footer>

      {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><form className="result-modal" onSubmit={saveResult}>
        <div className="modal-head"><div><div className="eyebrow">RESULT ENTRY</div><h2>{editing ? "Edit result" : "Add a result"}</h2></div><button type="button" className="icon-button" onClick={() => setModal(false)}><X size={19}/></button></div>
        <p className="modal-intro">Choose one sport, one winning hostel and a medal. Add every eligible student below.</p>
        <div className="form-grid">
          <label>Sport<select value={form.sport_id} onChange={e => setForm(p => ({ ...p, sport_id: e.target.value }))} required><option value="">Choose sport</option>{sports.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
          <label>Winning hostel<select value={form.hostel_id} onChange={e => setForm(p => ({ ...p, hostel_id: e.target.value }))} required><option value="">Choose hostel</option>{hostels.map(h => <option value={h.id} key={h.id}>{h.name}</option>)}</select></label>
          <label className="full-span">Medal<select value={form.medal} onChange={e => setForm(p => ({ ...p, medal: e.target.value }))} required><option value="Gold">Gold — 2 points</option><option value="Silver">Silver — 1 point</option></select></label>
        </div>
        <div className="students-form-head"><div><h3>Winning students</h3><p>Add one or more students. Names are optional if not yet confirmed.</p></div><button type="button" className="add-student" onClick={addPerson}><Plus size={15}/> Add student</button></div>
        <div className="people-fields">{form.people.map((person, index) => <div className="person-row" key={index}><span className="person-number">{String(index + 1).padStart(2, "0")}</span><input value={person.name} onChange={e => updatePerson(index, "name", e.target.value)} placeholder="Student full name"/><select value={person.year} onChange={e => updatePerson(index, "year", e.target.value)}>{YEARS.map(y => <option key={y}>{y}</option>)}</select><button type="button" onClick={() => removePerson(index)} className="remove-person" title="Remove student"><X size={16}/></button></div>)}</div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : <>{editing ? "Save changes" : "Publish result"} <Plus size={16}/></>}</button></div>
      </form></div>}
    </div>
  );
}

function Stat({ icon, label, value, note, accent }) {
  return <div className={`stat-card ${accent || ""}`}><div className="stat-top"><span className="stat-icon">{icon}</span><span className="stat-note">{note}</span></div><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span></div>;
}
function Loading() { return <div className="loading-state"><RefreshCw className="spin" size={20}/> Loading HPL 2026 data…</div>; }
function Empty({ text }) { return <div className="empty-state"><Trophy size={26}/><p>{text}</p></div>; }

createRoot(document.getElementById("root")).render(<App />);
