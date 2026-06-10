import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// 🔧 הגדרות – החלף בערכים שלך מ-Google Cloud Console
// ─────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "186698196698-6ki6g5tir0cbvmcmae1daocbcikgc194.apps.googleusercontent.com";
const CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar";

const SECTIONS = ["notes", "calendar", "expenses", "shopping", "chores", "wishboard"];
const SECTION_META = {
  notes:     { label: "פתקים",  emoji: "📝", color: "#e8a87c" },
  calendar:  { label: "יומן",   emoji: "📅", color: "#7ec8a8" },
  expenses:  { label: "הוצאות", emoji: "💰", color: "#a87cc8" },
  shopping:  { label: "קניות",  emoji: "🛒", color: "#7ca8e8" },
  chores:    { label: "מטלות",  emoji: "🏠", color: "#e87c9a" },
  wishboard: { label: "חלומות", emoji: "✨", color: "#e8c87c" },
};

const SAMPLE_NOTES = [
  { id: 1, title: "סיסמת ה-WiFi",  content: "HomeSweet2024!",        author: "שירה", color: "#fef3c7", date: "היום" },
  { id: 2, title: "מספר השוכר",    content: "משה לוי: 050-1234567",  author: "גל",   color: "#dbeafe", date: "אתמול" },
  { id: 3, title: "זמני אשפה",     content: "ראשון ורביעי בבוקר",    author: "שירה", color: "#dcfce7", date: "שבוע שעבר" },
];
const SAMPLE_EXPENSES = [
  { id: 1, title: "שכירות יוני", amount: 4200, paidBy: "גל",   split: true,  date: "1.6", category: "דיור" },
  { id: 2, title: "סופר",        amount: 380,  paidBy: "שירה", split: true,  date: "5.6", category: "אוכל" },
  { id: 3, title: "חשמל",        amount: 290,  paidBy: "גל",   split: true,  date: "3.6", category: "חשבונות" },
  { id: 4, title: "נטפליקס",     amount: 55,   paidBy: "שירה", split: true,  date: "4.6", category: "בידור" },
  { id: 5, title: "תרופות",      amount: 120,  paidBy: "שירה", split: false, date: "7.6", category: "בריאות" },
];
const SAMPLE_SHOPPING = [
  { id: 1, text: "חלב",    done: false, addedBy: "שירה" },
  { id: 2, text: "לחם",    done: true,  addedBy: "גל" },
  { id: 3, text: "ביצים",  done: false, addedBy: "שירה" },
  { id: 4, text: "שמפו",   done: false, addedBy: "גל" },
  { id: 5, text: "קפה",    done: true,  addedBy: "שירה" },
  { id: 6, text: "אבוקדו", done: false, addedBy: "גל" },
];
const SAMPLE_CHORES = [
  { id: 1, task: "שטיפת כלים",  assignee: "גל",    frequency: "יומי",             done: false, lastDone: "אתמול" },
  { id: 2, task: "ניקיון שבועי", assignee: "שירה",  frequency: "שבועי",             done: false, lastDone: "שבוע שעבר" },
  { id: 3, task: "כביסה",       assignee: "שניהם", frequency: "פעמיים בשבוע",     done: true,  lastDone: "היום" },
  { id: 4, task: "אשפה",        assignee: "גל",    frequency: "פעמיים בשבוע",     done: false, lastDone: "3 ימים" },
  { id: 5, task: "קניות",       assignee: "שירה",  frequency: "שבועי",             done: false, lastDone: "שבוע שעבר" },
];
const SAMPLE_WISHBOARD = [
  { id: 1, title: "טיול לאיטליה", emoji: "🇮🇹", priority: "high",   notes: "פלורנס ורומא, קיץ 2025",  color: "#fef3c7" },
  { id: 2, title: "ספה חדשה",     emoji: "🛋️",  priority: "medium", notes: "כחול כהה, עד 3000 ש״ח",  color: "#dbeafe" },
  { id: 3, title: "קורס בישול",   emoji: "👨‍🍳", priority: "low",    notes: "ביחד, אולי סושי?",        color: "#dcfce7" },
  { id: 4, title: "חתול",         emoji: "🐱",  priority: "high",   notes: "לאחר שנה ראשונה",         color: "#fce7f3" },
];
const EXPENSE_CATEGORIES = { דיור:"🏠", אוכל:"🍕", חשבונות:"💡", בידור:"🎬", בריאות:"💊", אחר:"🏷️" };

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #eee",
  fontSize: 15, fontFamily: "'Noto Sans Hebrew', sans-serif", direction: "rtl",
  outline: "none", boxSizing: "border-box", background: "#fafafa",
};

// ─── Google Calendar helpers ───────────────────
function gapi() { return window.gapi; }

async function loadGapiScript() {
  return new Promise(resolve => {
    if (window.gapi) return resolve();
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.onload = resolve;
    document.body.appendChild(s);
  });
}

async function loadGisScript() {
  return new Promise(resolve => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve;
    document.body.appendChild(s);
  });
}

function parseGoogleEvents(items = []) {
  return items.map(ev => {
    const start = ev.start?.dateTime || ev.start?.date || "";
    const d = start ? new Date(start) : null;
    const dateStr = d ? `${d.getDate()}.${d.getMonth()+1}` : "";
    const timeStr = ev.start?.dateTime
      ? new Date(ev.start.dateTime).toLocaleTimeString("he-IL", { hour:"2-digit", minute:"2-digit" })
      : "כל היום";
    return {
      id: ev.id,
      googleId: ev.id,
      title: ev.summary || "(ללא כותרת)",
      date: dateStr,
      time: timeStr,
      who: "שניהם",
      color: "#7ec8a8",
      startISO: ev.start?.dateTime || ev.start?.date,
    };
  });
}

// ─── Main App ──────────────────────────────────
export default function App() {
  const [active, setActive]         = useState("notes");
  const [notes, setNotes]           = useState(SAMPLE_NOTES);
  const [events, setEvents]         = useState([]);
  const [expenses, setExpenses]     = useState(SAMPLE_EXPENSES);
  const [shopping, setShopping]     = useState(SAMPLE_SHOPPING);
  const [chores, setChores]         = useState(SAMPLE_CHORES);
  const [wishboard, setWishboard]   = useState(SAMPLE_WISHBOARD);

  const [gcalStatus, setGcalStatus] = useState("idle"); // idle | loading | connected | error | no_client_id
  const [gcalError, setGcalError]   = useState("");
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [syncing, setSyncing]       = useState(false);

  const [showAdd, setShowAdd]       = useState(false);
  const [newItem, setNewItem]       = useState({});
  const [editing, setEditing]       = useState(null); // { section, item }
  const [greeting, setGreeting]     = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("בוקר טוב");
    else if (h < 17) setGreeting("צהריים טובים");
    else if (h < 21) setGreeting("ערב טוב");
    else setGreeting("לילה טוב");
  }, []);

  // ── fetch events from Google ──
  const fetchGoogleEvents = useCallback(async (token) => {
    setSyncing(true);
    try {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 90*24*3600*1000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEvents(parseGoogleEvents(json.items || []));
    } catch (e) {
      setGcalError("שגיאה בטעינת אירועים: " + e.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  // ── init Google auth ──
  const initGoogle = useCallback(async () => {
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
      setGcalStatus("no_client_id");
      return;
    }
    setGcalStatus("loading");
    try {
      await Promise.all([loadGapiScript(), loadGisScript()]);

      await new Promise(resolve => gapi().load("client", resolve));
      await gapi().client.init({ discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"] });

      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: CALENDAR_SCOPES,
        callback: async (resp) => {
          if (resp.error) { setGcalError(resp.error); setGcalStatus("error"); return; }
          setAccessToken(resp.access_token);
          setGcalStatus("connected");
          await fetchGoogleEvents(resp.access_token);
        },
      });
      setTokenClient(tc);
      setGcalStatus("idle");
    } catch (e) {
      setGcalError(e.message);
      setGcalStatus("error");
    }
  }, [fetchGoogleEvents]);

  useEffect(() => { initGoogle(); }, [initGoogle]);

  const connectGoogle = () => {
    if (tokenClient) tokenClient.requestAccessToken();
  };

  // ── add event to Google Calendar ──
  const addEventToGoogle = async (item) => {
    if (!accessToken) return null;
    try {
      const [day, month] = (item.date || "1.1").split(".").map(Number);
      const year = new Date().getFullYear();
      const [hh, mm] = (item.time || "00:00").split(":").map(Number);
      const start = new Date(year, month - 1, day, hh || 0, mm || 0);
      const end   = new Date(start.getTime() + 60 * 60 * 1000);
      const body = {
        summary: item.title,
        start: item.time
          ? { dateTime: start.toISOString(), timeZone: "Asia/Jerusalem" }
          : { date: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}` },
        end: item.time
          ? { dateTime: end.toISOString(), timeZone: "Asia/Jerusalem" }
          : { date: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}` },
      };
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      return created.id;
    } catch (e) {
      alert("שגיאה בהוספת אירוע לגוגל: " + e.message);
      return null;
    }
  };

  // ── delete event from Google ──
  const deleteGoogleEvent = async (googleId) => {
    if (!accessToken || !googleId) return;
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (e) { console.warn("שגיאה במחיקה מגוגל:", e); }
  };

  // ── add item ──
  const addItem = async () => {
    const id = Date.now();
    let item;
    if (active === "notes")     item = { id, title: newItem.title||"פתק חדש", content: newItem.content||"", author:"אני", color:["#fef3c7","#dbeafe","#dcfce7","#fce7f3"][id%4], date:"עכשיו" };
    if (active === "expenses")  item = { id, title: newItem.title||"הוצאה", amount: Number(newItem.amount)||0, paidBy: newItem.paidBy||"אני", split: newItem.split!==false, date: newItem.date||"היום", category: newItem.category||"אחר" };
    if (active === "shopping")  item = { id, text: newItem.text||"פריט", done:false, addedBy:"אני" };
    if (active === "chores")    item = { id, task: newItem.task||"מטלה", assignee: newItem.assignee||"שניהם", frequency: newItem.frequency||"", done:false, lastDone:"טרם" };
    if (active === "wishboard") item = { id, title: newItem.title||"חלום", emoji: newItem.emoji||"⭐", priority: newItem.priority||"medium", notes: newItem.notes||"", color:"#fef3c7" };

    if (active === "calendar") {
      const ev = { id, title: newItem.title||"אירוע", date: newItem.date||"", time: newItem.time||"", who: newItem.who||"שניהם", color:"#7ec8a8" };
      if (accessToken) {
        setSyncing(true);
        const googleId = await addEventToGoogle(ev);
        if (googleId) ev.googleId = googleId;
        setSyncing(false);
      }
      setEvents(prev => [ev, ...prev]);
      setShowAdd(false); setNewItem({}); return;
    }

    if (item) {
      if (active==="notes")     setNotes(p=>[item,...p]);
      if (active==="expenses")  setExpenses(p=>[item,...p]);
      if (active==="shopping")  setShopping(p=>[item,...p]);
      if (active==="chores")    setChores(p=>[item,...p]);
      if (active==="wishboard") setWishboard(p=>[item,...p]);
    }
    setShowAdd(false); setNewItem({});
  };

  const toggleDone = (section, id) => {
    if (section==="shopping") setShopping(p=>p.map(i=>i.id===id?{...i,done:!i.done}:i));
    if (section==="chores")   setChores(p=>p.map(i=>i.id===id?{...i,done:!i.done}:i));
  };

  const deleteItem = async (section, id) => {
    if (section==="notes")     setNotes(p=>p.filter(i=>i.id!==id));
    if (section==="expenses")  setExpenses(p=>p.filter(i=>i.id!==id));
    if (section==="shopping")  setShopping(p=>p.filter(i=>i.id!==id));
    if (section==="chores")    setChores(p=>p.filter(i=>i.id!==id));
    if (section==="wishboard") setWishboard(p=>p.filter(i=>i.id!==id));
    if (section==="calendar") {
      const ev = events.find(e=>e.id===id);
      if (ev?.googleId) await deleteGoogleEvent(ev.googleId);
      setEvents(p=>p.filter(i=>i.id!==id));
    }
  };

  const saveEdit = () => {
    const { section, item } = editing;
    if (section==="notes")     setNotes(p=>p.map(n=>n.id===item.id?item:n));
    if (section==="calendar")  setEvents(p=>p.map(e=>e.id===item.id?item:e));
    if (section==="expenses")  setExpenses(p=>p.map(e=>e.id===item.id?item:e));
    if (section==="shopping")  setShopping(p=>p.map(i=>i.id===item.id?item:i));
    if (section==="chores")    setChores(p=>p.map(c=>c.id===item.id?item:c));
    if (section==="wishboard") setWishboard(p=>p.map(w=>w.id===item.id?item:w));
    setEditing(null);
  };

  const updateEditing = (field, value) =>
    setEditing(p => ({ ...p, item: { ...p.item, [field]: value } }));

  // ── derived expense stats ──
  const totalExpenses  = expenses.reduce((s,e)=>s+e.amount,0);
  const danPaid   = expenses.filter(e=>e.paidBy==="גל"  &&e.split).reduce((s,e)=>s+e.amount/2,0);
  const raiyaPaid = expenses.filter(e=>e.paidBy==="שירה"&&e.split).reduce((s,e)=>s+e.amount/2,0);
  const balance   = danPaid - raiyaPaid;

  // ── Google Calendar status banner ──
  const GCalBanner = () => {
    if (gcalStatus === "no_client_id") return (
      <div style={{background:"#fff8e1",border:"1px solid #ffe082",borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#795548",lineHeight:1.6}}>
        <b>🔧 להפעלת יומן גוגל:</b><br/>
        1. צרו פרויקט ב-<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{color:"#1976d2"}}>Google Cloud Console</a><br/>
        2. הפעילו <b>Google Calendar API</b><br/>
        3. צרו <b>OAuth 2.0 Client ID</b> (סוג: Web application)<br/>
        4. הוסיפו את כתובת האפליקציה ל-<b>Authorized JavaScript Origins</b><br/>
        5. החליפו את <code>GOOGLE_CLIENT_ID</code> בקוד בערך שקיבלתם
      </div>
    );
    if (gcalStatus === "error") return (
      <div style={{background:"#fce4ec",border:"1px solid #f48fb1",borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#c62828"}}>
        ❌ שגיאה בחיבור: {gcalError}
      </div>
    );
    if (gcalStatus === "loading") return (
      <div style={{background:"#e8f5e9",borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#388e3c"}}>
        ⏳ טוען Google API...
      </div>
    );
    if (gcalStatus === "connected") return (
      <div style={{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:14,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:13,color:"#2e7d32",fontWeight:600}}>✅ מחובר ליומן גוגל</span>
        <button onClick={()=>fetchGoogleEvents(accessToken)} disabled={syncing}
          style={{background:"#43a047",color:"white",border:"none",borderRadius:10,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",opacity:syncing?0.6:1}}>
          {syncing ? "מסנכרן..." : "🔄 רענן"}
        </button>
      </div>
    );
    // idle – show connect button
    return (
      <button onClick={connectGoogle}
        style={{width:"100%",background:"white",border:"2px solid #7ec8a8",borderRadius:14,padding:"14px",fontSize:14,fontWeight:700,cursor:"pointer",color:"#2e7d32",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{width:20,height:20}}/>
        התחבר עם Google Calendar
      </button>
    );
  };

  return (
    <div style={{fontFamily:"'Noto Sans Hebrew','Segoe UI',sans-serif",direction:"rtl",minHeight:"100vh",background:"linear-gradient(135deg,#fdf6f0 0%,#f0f7ff 100%)",display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#ff9a9e 0%,#fad0c4 50%,#ffecd2 100%)",padding:"24px 20px 16px",boxShadow:"0 4px 20px rgba(255,154,158,0.3)"}}>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{margin:0,fontSize:13,color:"rgba(100,60,60,0.7)",fontWeight:500}}>{greeting} ☀️</p>
              <h1 style={{margin:"4px 0 0",fontSize:26,fontWeight:800,color:"#5a2d2d",letterSpacing:-1}}>Our Song, Our Wave 🌊🎵</h1>
            </div>
            <div style={{background:"rgba(255,255,255,0.6)",borderRadius:16,padding:"8px 14px",textAlign:"center",backdropFilter:"blur(10px)"}}>
              <div style={{fontSize:20}}>👫</div>
              <div style={{fontSize:11,color:"#5a2d2d",fontWeight:600}}>Shira & Gal</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            {[
              {label:"הוצאות החודש", val:`₪${totalExpenses.toLocaleString()}`},
              {label:"אירועים קרובים", val:`${events.length} 📅`},
              {label:"לקניות", val:`${shopping.filter(i=>!i.done).length} 🛒`},
            ].map(s=>(
              <div key={s.label} style={{flex:1,background:"rgba(255,255,255,0.5)",borderRadius:12,padding:"8px 12px",backdropFilter:"blur(10px)"}}>
                <div style={{fontSize:11,color:"rgba(90,45,45,0.7)"}}>{s.label}</div>
                <div style={{fontSize:18,fontWeight:700,color:"#5a2d2d"}}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{background:"white",borderBottom:"1px solid rgba(0,0,0,0.06)",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",maxWidth:480,margin:"0 auto",padding:"0 4px"}}>
          {SECTIONS.map(s=>(
            <button key={s} onClick={()=>setActive(s)} style={{flex:"0 0 auto",padding:"12px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:active===s?SECTION_META[s].color:"#999",borderBottom:active===s?`2.5px solid ${SECTION_META[s].color}`:"2.5px solid transparent",transition:"all 0.2s",whiteSpace:"nowrap",fontFamily:"inherit"}}>
              {SECTION_META[s].emoji} {SECTION_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,maxWidth:480,margin:"0 auto",width:"100%",padding:"16px 16px 100px"}}>

        {/* NOTES */}
        {active==="notes" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {notes.map(n=>(
                <div key={n.id} onClick={()=>setEditing({section:"notes",item:{...n}})} style={{background:n.color,borderRadius:16,padding:14,position:"relative",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",minHeight:100,cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.02)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.13)"}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.08)"}}>
                  <button onClick={e=>{e.stopPropagation();deleteItem("notes",n.id)}} style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.1)",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  <div style={{position:"absolute",top:8,right:8,fontSize:11,color:"rgba(0,0,0,0.25)"}}>✏️</div>
                  <h3 style={{margin:"0 0 8px",fontSize:14,fontWeight:700,color:"#333",paddingLeft:24}}>{n.title}</h3>
                  <p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.4}}>{n.content}</p>
                  <div style={{marginTop:10,display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(0,0,0,0.4)"}}>
                    <span>{n.author}</span><span>{n.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {active==="calendar" && (
          <div>
            <GCalBanner />
            {syncing && <div style={{textAlign:"center",color:"#7ec8a8",fontSize:13,marginBottom:12}}>⏳ מסנכרן עם גוגל...</div>}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {events.length === 0 && !syncing && gcalStatus !== "connected" && (
                <div style={{textAlign:"center",color:"#bbb",padding:32,fontSize:14}}>
                  התחבר ליומן גוגל כדי לראות אירועים,<br/>או הוסף אירועים ידנית למטה
                </div>
              )}
              {[...events].sort((a,b)=>(a.startISO||a.date).localeCompare(b.startISO||b.date)).map(e=>(
                <div key={e.id} style={{background:"white",borderRadius:16,padding:16,display:"flex",alignItems:"center",gap:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderRight:`4px solid ${e.color}`}}>
                  <div style={{background:e.color+"30",borderRadius:12,padding:"10px 14px",textAlign:"center",minWidth:52}}>
                    <div style={{fontSize:16,fontWeight:800,color:e.color,lineHeight:1}}>{(e.date||"").split(".")[0]}</div>
                    <div style={{fontSize:11,color:e.color,opacity:0.8}}>{["","ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"][Number((e.date||"0.0").split(".")[1])]||""}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15,color:"#333"}}>{e.title}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:2}}>{e.time} · {e.who} {e.googleId ? "🗓" : ""}</div>
                  </div>
                  <button onClick={()=>setEditing({section:"calendar",item:{...e}})} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:15,padding:"4px"}}>✏️</button>
                  <button onClick={()=>deleteItem("calendar",e.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:16}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSES */}
        {active==="expenses" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)",borderRadius:20,padding:20,color:"white",marginBottom:16}}>
              <div style={{fontSize:13,opacity:0.8,marginBottom:4}}>יתרה בין שניכם</div>
              <div style={{fontSize:24,fontWeight:800}}>
                {Math.abs(balance)<1 ? "✅ קוי!" : balance>0 ? `שירה חייבת לגל ₪${Math.abs(balance).toFixed(0)}` : `גל חייב לשירה ₪${Math.abs(balance).toFixed(0)}`}
              </div>
              <div style={{display:"flex",gap:20,marginTop:14}}>
                <div><div style={{fontSize:11,opacity:0.7}}>גל שילם (חלק)</div><div style={{fontWeight:700}}>₪{danPaid.toFixed(0)}</div></div>
                <div><div style={{fontSize:11,opacity:0.7}}>שירה שילמה (חלק)</div><div style={{fontWeight:700}}>₪{raiyaPaid.toFixed(0)}</div></div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {expenses.map(e=>(
                <div key={e.id} style={{background:"white",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:24}}>{EXPENSE_CATEGORIES[e.category]||"🏷️"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{e.title}</div>
                    <div style={{fontSize:12,color:"#888"}}>{e.paidBy} · {e.date} {e.split?"· משותף":"· אישי"}</div>
                  </div>
                  <div style={{fontWeight:700,fontSize:16,color:"#5a2d2d"}}>₪{e.amount}</div>
                  <button onClick={()=>setEditing({section:"expenses",item:{...e}})} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:15,padding:"4px"}}>✏️</button>
                  <button onClick={()=>deleteItem("expenses",e.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc"}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHOPPING */}
        {active==="shopping" && (
          <div style={{background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 20px rgba(0,0,0,0.06)"}}>
            <div style={{padding:"14px 20px",background:"#f0f7ff",borderBottom:"1px solid #e0eeff"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#7ca8e8"}}>{shopping.filter(i=>!i.done).length} פריטים נותרו מתוך {shopping.length}</span>
            </div>
            {shopping.map((item,idx)=>(
              <div key={item.id} style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:14,borderBottom:idx<shopping.length-1?"1px solid #f5f5f5":"none",background:item.done?"#fafafa":"white",transition:"background 0.2s"}}>
                <button onClick={()=>toggleDone("shopping",item.id)} style={{width:26,height:26,borderRadius:"50%",border:`2.5px solid ${item.done?"#7ca8e8":"#ddd"}`,background:item.done?"#7ca8e8":"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                  {item.done&&<span style={{color:"white",fontSize:14,lineHeight:1}}>✓</span>}
                </button>
                <span style={{flex:1,fontSize:15,color:item.done?"#aaa":"#333",textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                <span style={{fontSize:11,color:"#ccc"}}>{item.addedBy}</span>
                <button onClick={()=>setEditing({section:"shopping",item:{...item}})} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:13,padding:"4px"}}>✏️</button>
                <button onClick={()=>deleteItem("shopping",item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd"}}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* CHORES */}
        {active==="chores" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {chores.map(c=>(
              <div key={c.id} style={{background:"white",borderRadius:16,padding:16,display:"flex",alignItems:"center",gap:14,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",opacity:c.done?0.6:1}}>
                <button onClick={()=>toggleDone("chores",c.id)} style={{width:32,height:32,borderRadius:"50%",border:`2.5px solid ${c.done?"#7ec8a8":"#ddd"}`,background:c.done?"#7ec8a8":"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16,transition:"all 0.2s"}}>
                  {c.done?"✓":""}
                </button>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:15,color:"#333",textDecoration:c.done?"line-through":"none"}}>{c.task}</div>
                  <div style={{fontSize:12,color:"#888",marginTop:2}}>{c.frequency} · בוצע לאחרונה: {c.lastDone}</div>
                </div>
                <div style={{background:c.assignee==="שניהם"?"#fef3c7":c.assignee==="גל"?"#dbeafe":"#fce7f3",color:"#666",borderRadius:10,padding:"4px 10px",fontSize:12,fontWeight:600}}>{c.assignee}</div>
                <button onClick={()=>setEditing({section:"chores",item:{...c}})} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:15,padding:"4px"}}>✏️</button>
                <button onClick={()=>deleteItem("chores",c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc"}}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* WISHBOARD */}
        {active==="wishboard" && (
          <div>
            <p style={{textAlign:"center",color:"#999",fontSize:13,marginBottom:16}}>החלומות והתכניות המשותפות שלנו ✨</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {wishboard.map(w=>(
                <div key={w.id} style={{background:w.color,borderRadius:20,padding:16,boxShadow:"0 4px 16px rgba(0,0,0,0.08)",position:"relative",minHeight:140}}>
                  <button onClick={()=>deleteItem("wishboard",w.id)} style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.1)",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:11}}>×</button>
                  <button onClick={()=>setEditing({section:"wishboard",item:{...w}})} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.08)",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:11}}>✏️</button>
                  <div style={{fontSize:36,textAlign:"center",marginBottom:8,marginTop:4}}>{w.emoji}</div>
                  <div style={{fontWeight:700,fontSize:14,color:"#333",textAlign:"center",marginBottom:6}}>{w.title}</div>
                  <div style={{fontSize:11,color:"#666",textAlign:"center",lineHeight:1.4}}>{w.notes}</div>
                  <div style={{marginTop:10,textAlign:"center"}}>
                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:8,background:w.priority==="high"?"#fecaca":w.priority==="medium"?"#fed7aa":"#d1fae5",color:w.priority==="high"?"#dc2626":w.priority==="medium"?"#ea580c":"#059669",fontWeight:600}}>
                      {w.priority==="high"?"🔥 עדיפות גבוהה":w.priority==="medium"?"⭐ בינוני":"🌱 בהמשך"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowAdd(false)}>
          <div style={{background:"white",borderRadius:"24px 24px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:24}}>{SECTION_META[active].emoji}</div>
              <h3 style={{margin:"8px 0 0",fontSize:18,fontWeight:700}}>הוסף ל{SECTION_META[active].label}</h3>
              {active==="calendar" && accessToken && <p style={{fontSize:12,color:"#7ec8a8",margin:"6px 0 0"}}>🗓 יתווסף אוטומטית ליומן גוגל</p>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {active==="notes" && <>
                <input placeholder="כותרת" value={newItem.title||""} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} style={inputStyle}/>
                <textarea placeholder="תוכן..." value={newItem.content||""} onChange={e=>setNewItem(p=>({...p,content:e.target.value}))} style={{...inputStyle,minHeight:80,resize:"none"}}/>
              </>}
              {active==="calendar" && <>
                <input placeholder="שם האירוע" value={newItem.title||""} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} style={inputStyle}/>
                <input placeholder="תאריך (לדוגמה: 20.6)" value={newItem.date||""} onChange={e=>setNewItem(p=>({...p,date:e.target.value}))} style={inputStyle}/>
                <input placeholder="שעה (לדוגמה: 18:00)" value={newItem.time||""} onChange={e=>setNewItem(p=>({...p,time:e.target.value}))} style={inputStyle}/>
                <select value={newItem.who||"שניהם"} onChange={e=>setNewItem(p=>({...p,who:e.target.value}))} style={inputStyle}>
                  <option>שניהם</option><option>שירה</option><option>גל</option>
                </select>
              </>}
              {active==="expenses" && <>
                <input placeholder="תיאור ההוצאה" value={newItem.title||""} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} style={inputStyle}/>
                <input placeholder="סכום (₪)" type="number" value={newItem.amount||""} onChange={e=>setNewItem(p=>({...p,amount:e.target.value}))} style={inputStyle}/>
                <select value={newItem.paidBy||"שירה"} onChange={e=>setNewItem(p=>({...p,paidBy:e.target.value}))} style={inputStyle}>
                  <option>שירה</option><option>גל</option>
                </select>
              </>}
              {active==="shopping" && <input placeholder="פריט לקנות..." value={newItem.text||""} onChange={e=>setNewItem(p=>({...p,text:e.target.value}))} style={inputStyle}/>}
              {active==="chores" && <>
                <input placeholder="שם המטלה" value={newItem.task||""} onChange={e=>setNewItem(p=>({...p,task:e.target.value}))} style={inputStyle}/>
                <select value={newItem.assignee||"שניהם"} onChange={e=>setNewItem(p=>({...p,assignee:e.target.value}))} style={inputStyle}>
                  <option>שניהם</option><option>שירה</option><option>גל</option>
                </select>
                <input placeholder="תדירות (לדוגמה: שבועי)" value={newItem.frequency||""} onChange={e=>setNewItem(p=>({...p,frequency:e.target.value}))} style={inputStyle}/>
              </>}
              {active==="wishboard" && <>
                <input placeholder="שם החלום" value={newItem.title||""} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} style={inputStyle}/>
                <input placeholder="אימוג׳י (לדוגמה: 🏝️)" value={newItem.emoji||""} onChange={e=>setNewItem(p=>({...p,emoji:e.target.value}))} style={inputStyle}/>
                <input placeholder="פרטים נוספים" value={newItem.notes||""} onChange={e=>setNewItem(p=>({...p,notes:e.target.value}))} style={inputStyle}/>
              </>}
            </div>
            <button onClick={addItem} style={{marginTop:20,width:"100%",background:`linear-gradient(135deg,${SECTION_META[active].color},${SECTION_META[active].color}aa)`,color:"white",border:"none",borderRadius:16,padding:"14px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ➕ הוסף
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)"}} onClick={()=>setEditing(null)}>
          <div style={{background:"white",borderRadius:"24px 24px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:24}}>{SECTION_META[editing.section].emoji}</div>
              <h3 style={{margin:"8px 0 0",fontSize:18,fontWeight:700}}>עריכת {SECTION_META[editing.section].label}</h3>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>

              {editing.section==="notes" && <>
                <input value={editing.item.title} onChange={e=>updateEditing("title",e.target.value)} placeholder="כותרת" style={inputStyle}/>
                <textarea value={editing.item.content} onChange={e=>updateEditing("content",e.target.value)} placeholder="תוכן..." style={{...inputStyle,minHeight:100,resize:"none"}}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["#fef3c7","#dbeafe","#dcfce7","#fce7f3","#f3e8ff","#ffedd5"].map(c=>(
                    <div key={c} onClick={()=>updateEditing("color",c)} style={{width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:editing.item.color===c?"3px solid #555":"3px solid transparent",transition:"border 0.15s"}}/>
                  ))}
                </div>
              </>}

              {editing.section==="calendar" && <>
                <input value={editing.item.title} onChange={e=>updateEditing("title",e.target.value)} placeholder="שם האירוע" style={inputStyle}/>
                <input value={editing.item.date} onChange={e=>updateEditing("date",e.target.value)} placeholder="תאריך (לדוגמה: 20.6)" style={inputStyle}/>
                <input value={editing.item.time} onChange={e=>updateEditing("time",e.target.value)} placeholder="שעה" style={inputStyle}/>
                <select value={editing.item.who} onChange={e=>updateEditing("who",e.target.value)} style={inputStyle}>
                  <option>שניהם</option><option>Shira</option><option>Gal</option>
                </select>
              </>}

              {editing.section==="expenses" && <>
                <input value={editing.item.title} onChange={e=>updateEditing("title",e.target.value)} placeholder="תיאור" style={inputStyle}/>
                <input type="number" value={editing.item.amount} onChange={e=>updateEditing("amount",Number(e.target.value))} placeholder="סכום" style={inputStyle}/>
                <select value={editing.item.paidBy} onChange={e=>updateEditing("paidBy",e.target.value)} style={inputStyle}>
                  <option>Shira</option><option>Gal</option>
                </select>
                <select value={editing.item.category} onChange={e=>updateEditing("category",e.target.value)} style={inputStyle}>
                  {Object.keys(EXPENSE_CATEGORIES).map(k=><option key={k}>{k}</option>)}
                </select>
              </>}

              {editing.section==="shopping" && <>
                <input value={editing.item.text} onChange={e=>updateEditing("text",e.target.value)} placeholder="פריט" style={inputStyle}/>
              </>}

              {editing.section==="chores" && <>
                <input value={editing.item.task} onChange={e=>updateEditing("task",e.target.value)} placeholder="מטלה" style={inputStyle}/>
                <select value={editing.item.assignee} onChange={e=>updateEditing("assignee",e.target.value)} style={inputStyle}>
                  <option>שניהם</option><option>Shira</option><option>Gal</option>
                </select>
                <input value={editing.item.frequency} onChange={e=>updateEditing("frequency",e.target.value)} placeholder="תדירות" style={inputStyle}/>
              </>}

              {editing.section==="wishboard" && <>
                <input value={editing.item.title} onChange={e=>updateEditing("title",e.target.value)} placeholder="שם החלום" style={inputStyle}/>
                <input value={editing.item.emoji} onChange={e=>updateEditing("emoji",e.target.value)} placeholder="אימוג׳י" style={inputStyle}/>
                <textarea value={editing.item.notes} onChange={e=>updateEditing("notes",e.target.value)} placeholder="פרטים" style={{...inputStyle,minHeight:70,resize:"none"}}/>
                <select value={editing.item.priority} onChange={e=>updateEditing("priority",e.target.value)} style={inputStyle}>
                  <option value="high">🔥 עדיפות גבוהה</option>
                  <option value="medium">⭐ בינוני</option>
                  <option value="low">🌱 בהמשך</option>
                </select>
              </>}

            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,background:"#f5f5f5",color:"#666",border:"none",borderRadius:16,padding:"14px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>ביטול</button>
              <button onClick={saveEdit} style={{flex:2,background:`linear-gradient(135deg,${SECTION_META[editing.section].color},${SECTION_META[editing.section].color}aa)`,color:"white",border:"none",borderRadius:16,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💾 שמור</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={()=>setShowAdd(true)} style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#ff9a9e,#fad0c4)",color:"white",border:"none",borderRadius:50,padding:"14px 32px",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(255,154,158,0.5)",fontFamily:"inherit",whiteSpace:"nowrap"}}>
        ➕ הוסף {SECTION_META[active].label}
      </button>
    </div>
  );
}
