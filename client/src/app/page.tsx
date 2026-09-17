"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleUserRound, Download, Headphones, LoaderCircle, LogIn, Menu, Mic2, Pause, Play, Sparkles, Trash2, WandSparkles, X, Zap } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000";

type Voice = { id: string; name: string; language: string; code: string; style: string };
type User = { id: string; name: string; email: string };

const fallbackVoices: Voice[] = [
  { id: "Riya", name: "Riya", language: "English", code: "en-US", style: "Professional and clean female voice" },
  { id: "Graham", name: "Graham", language: "English", code: "en-US", style: "Authoritative British male voice" },
  { id: "Simon", name: "Simon", language: "English", code: "en-US", style: "Articulate and corporate male voice" },
  { id: "Nate", name: "Nate", language: "English", code: "en-US", style: "Conversational and friendly male voice" },
  { id: "Anjali", name: "Anjali", language: "English", code: "en-US", style: "Confident Indian female voice" },
  { id: "Ishaan", name: "Ishaan", language: "English", code: "en-US", style: "Natural Indian male voice" },
  { id: "Nour", name: "Nour", language: "English", code: "en-US", style: "Friendly Arabic female voice" },
  { id: "Matthias", name: "Matthias", language: "English", code: "en-US", style: "Resonant German male voice" },
  { id: "Renata", name: "Renata", language: "English", code: "en-US", style: "Calm Brazilian female voice" },
  { id: "Yulia", name: "Yulia", language: "English", code: "en-US", style: "Gentle Russian female voice" },
];

export default function Home() {
  const [text, setText] = useState("Welcome to Echo. Turn your words into a voice that feels natural, clear, and completely yours.");
  const [voices, setVoices] = useState<Voice[]>(fallbackVoices);
  const [language, setLanguage] = useState("en-US");
  const [voice, setVoice] = useState("Ashley");
  const [format, setFormat] = useState("MP3");
  const [audio, setAudio] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "account">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const availableLanguages = useMemo(() => [...new Map(voices.map((item) => [item.code, item.language])).entries()], [voices]);
  const availableVoices = useMemo(() => {
    const matches = voices.filter((item) => item.code === language);
    return matches.length ? matches : voices.filter((item) => item.code === "en-US");
  }, [language, voices]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!availableVoices.some((item) => item.id === voice)) {
      setVoice(availableVoices[0]?.id || "");
    }
  }, [availableVoices, voice]);

  useEffect(() => {
    fetch(`${API_URL}/api/voices`).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.voices?.length) setVoices(data.voices);
    }).catch(() => undefined);
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" }).then((response) => response.json()).then((data) => setUser(data.user)).catch(() => undefined);
  }, []);

  async function generateSpeech() {
    setError("");
    if (!text.trim()) return setError("Add a little text first so Echo has something to say.");
    setIsGenerating(true);
    setAudio("");
    try {
      const response = await fetch(`${API_URL}/api/speech`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language, voice, format }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Speech generation failed.");
      setAudio(data.audio);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Speech generation failed. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/${authMode === "login" ? "login" : "register"}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete that request.");
      setUser(data.user);
      setAuthOpen(false);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : "Could not complete that request.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  }

  return (
    <main className="site-shell">
      <nav className="topbar">
        <a className="brand" href="#studio" aria-label="Echo home"><span className="brand-mark"><Headphones size={18} /></span><span>echo<span className="accent">.</span></span></a>
        <div className={`nav-links ${mobileOpen ? "open" : ""}`}>
          <a href="#studio" onClick={() => setMobileOpen(false)}>Studio</a>
          <a href="#how-it-works" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="#about" onClick={() => setMobileOpen(false)}>About</a>
          <button className="nav-login" onClick={() => { setAuthMode(user ? "account" : "login"); setAuthOpen(true); setMobileOpen(false); }}>{user ? <CircleUserRound size={16} /> : <LogIn size={16} />}{user ? user.name : "Sign in"}</button>
        </div>
        <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </nav>

      <section className="hero" id="studio">
        <div className="hero-copy reveal-up">
          <div className="eyebrow"><span className="eyebrow-dot" /> Voice, reimagined</div>
          <h1>Give your words <em>a pulse.</em></h1>
          <p className="hero-intro">Create warm, expressive audio from any text. Built for focus, accessibility, and the moments when listening just makes more sense.</p>
          <div className="hero-proof"><div className="avatar-stack"><span>AK</span><span>RM</span><span>JP</span></div><span>Trusted by curious minds</span><span className="proof-line" /><span className="rating">★★★★★</span></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><Mic2 size={34} /></div><span className="orbit-label label-one">listen</span><span className="orbit-label label-two">focus</span><span className="orbit-label label-three">create</span></div>
      </section>

      <section className="studio-grid" aria-label="Text to speech studio">
        <div className="composer-panel panel reveal-up delay-one">
          <div className="panel-heading"><div><span className="section-kicker">01 / Compose</span><h2>What should Echo say?</h2></div><span className="live-badge"><span /> ready</span></div>
          <div className="textarea-wrap"><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={5000} placeholder="Paste an article, write a note, or start with an idea..." aria-label="Text to convert to speech" /><button className="clear-button" aria-label="Clear text" onClick={() => setText("")}><Trash2 size={16} /></button><div className="text-meta"><span>{words} words</span><span>{text.length.toLocaleString()} / 5,000</span></div></div>
          <div className="quick-row"><button className="quiet-button" onClick={() => setText("A good story does not rush. It gives each word enough room to arrive.")}><WandSparkles size={15} /> Try an example</button><span>Tip: short paragraphs sound best</span></div>
        </div>

        <div className="settings-panel panel reveal-up delay-two">
          <div className="panel-heading"><div><span className="section-kicker">02 / Tune</span><h2>Shape the sound</h2></div><Sparkles size={20} className="muted-icon" /></div>
          <label className="field-label" htmlFor="language">Language</label>
          <div className="select-wrap"><select id="language" value={language} onChange={(event) => { const nextLanguage = event.target.value; setLanguage(nextLanguage); setVoice(voices.find((item) => item.code === nextLanguage)?.id || ""); }}>{availableLanguages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select><ChevronDown size={17} /></div>
          <label className="field-label" htmlFor="voice">Voice</label>
          <div className="voice-select"><select id="voice" value={voice} onChange={(event) => setVoice(event.target.value)}>{availableVoices.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.style}</option>)}</select><ChevronDown size={17} /></div>
          <div className="format-row"><span className="field-label">Export format</span><div className="segmented"><button className="active" onClick={() => setFormat("MP3")}>MP3</button></div></div>
          <button className="generate-button" onClick={generateSpeech} disabled={isGenerating}>{isGenerating ? <LoaderCircle size={19} className="spin" /> : <Zap size={18} />}{isGenerating ? "Creating your audio..." : "Generate speech"}<ArrowRight size={18} /></button>
          {error && <div className="error-message" role="alert">{error}</div>}
        </div>
      </section>

      {audio && <section className="audio-result panel reveal-up" aria-label="Generated audio"><div className="result-icon"><Check size={19} /></div><div className="result-copy"><span className="section-kicker">03 / Your audio</span><h2>Ready to listen</h2><p>{voice} · {format} · {text.length.toLocaleString()} characters</p></div><audio src={audio} controls onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} /><a className="download-button" href={audio} download={`echo-${voice.toLowerCase()}.${format.toLowerCase()}`} aria-label="Download audio"><Download size={17} /></a><span className="playing-mark">{isPlaying ? <Pause size={15} /> : <Play size={15} />}</span></section>}

      <section className="feature-strip" id="how-it-works"><div><span className="feature-number">01</span><h3>Write freely</h3><p>Drop in an article, a draft, or the thought you cannot stop thinking about.</p></div><div><span className="feature-number">02</span><h3>Find your tone</h3><p>Pick a voice that makes the words feel like they belong to you.</p></div><div><span className="feature-number">03</span><h3>Press play</h3><p>Listen, download, and let your attention move where it needs to go.</p></div></section>

      <footer id="about" className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand" href="#studio"><span className="brand-mark"><Headphones size={18} /></span><span>echo<span className="accent">.</span></span></a>
            <p>Thoughtful text-to-speech for creators, teams, and people who work with words every day.</p>
            <div className="footer-contact-inline">
              <a href="mailto:developersaurabh001@gmail.com">developersaurabh001@gmail.com</a>
              <a href="tel:+918720026790">+91 8720026790</a>
            </div>
          </div>

          <div className="footer-column">
            <h4>Company</h4>
            <a href="#studio">Studio</a>
            <a href="#how-it-works">How it works</a>
            <button onClick={() => { setAuthMode(user ? "account" : "register"); setAuthOpen(true); }}>{user ? "My account" : "Create account"}</button>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <a href="#how-it-works">Help center</a>
            <a href="#about">Privacy</a>
            <a href="#about">Terms</a>
          </div>

          <div className="footer-column">
            <h4>Follow</h4>
            <a href="https://www.linkedin.com/in/saurabhpandey-/" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://github.com/SaurabhPandey016" target="_blank" rel="noreferrer">GitHub</a>
            <a href="mailto:developersaurabh001@gmail.com">Email</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Echo</span>
          <span>Made with ❤️ by Saurabh Pandey</span>
        </div>
      </footer>

      {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={19} /></button>{user && authMode === "account" ? <><span className="section-kicker">Your account</span><h2 id="auth-title">Welcome back, {user.name.split(" ")[0]}.</h2><p>Your listening room is ready and your recent audio stays saved.</p><div className="account-panel"><div className="account-summary"><span className="account-pill"><CircleUserRound size={16} /></span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><button className="account-action">Manage profile</button><button className="account-action">Recent generations</button><button className="generate-button account-logout" onClick={logout}>Sign out</button></div></> : <><span className="section-kicker">Your listening room</span><h2 id="auth-title">{authMode === "login" ? "Welcome back." : "Make Echo yours."}</h2><p>{authMode === "login" ? "Sign in to keep your recent audio close." : "Create an account to keep a private generation history."}</p><form onSubmit={submitAuth}>{authMode === "register" && <input required minLength={2} placeholder="Your name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />}<input required type="email" placeholder="Email address" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /><input required minLength={8} type="password" placeholder="Password · 8 characters minimum" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />{authError && <div className="error-message">{authError}</div>}<button className="generate-button" disabled={authBusy}>{authBusy ? <LoaderCircle size={18} className="spin" /> : <LogIn size={17} />}{authBusy ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}</button></form><button className="switch-auth" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>{user && <button className="switch-auth" onClick={logout}>Sign out</button>}</>}</div></div>}
    </main>
  );
}
