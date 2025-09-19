import React, { useEffect, useState } from "react";

// Student Rep Portal - Single-file React app
// Tailwind CSS classes used. This file is intended as App.jsx (default export).
// Features:
// - Public pages: Home (info), Contact form (send message + optional file), Files (downloadable resources)
// - Admin panel: view messages, download uploaded files, post new info/resource
// - Local persistence via localStorage (messages, resources). Uploaded files are stored as base64 strings in localStorage — suitable for small/medium files. For production, replace with server-side storage.

const DEFAULT_ADMIN_PASSWORD = "Unbrella01"; // change this before production

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

// Simple file -> base64 reader
function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function Header({ onNav, active }) {
  return (
    <header className="bg-slate-800 text-white p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-semibold">Student Rep Portal</h1>
        <nav className="space-x-2">
          {[
            ["home", "Home"],
            ["contact", "Contact Rep"],
            ["files", "Files"],
            ["admin", "Admin"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => onNav(k)}
              className={`px-3 py-1 rounded ${active === k ? "bg-white text-slate-800" : "hover:bg-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Home({ infos }) {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome</h2>
      <p className="mb-4">This portal allows students to contact the student representative, view resources, and download files shared by the rep.</p>
      <section className="space-y-4">
        {infos.length === 0 ? (
          <div className="p-4 border rounded">No announcements yet.</div>
        ) : (
          infos.map(info => (
            <article key={info.id} className="p-4 border rounded">
              <h3 className="font-semibold">{info.title}</h3>
              <p className="text-sm mt-1">{info.body}</p>
              <div className="text-xs text-slate-500 mt-2">Posted: {new Date(info.createdAt).toLocaleString()}</div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function FilesPage({ resources }) {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Shared Files & Resources</h2>
      {resources.length === 0 ? (
        <div className="p-4 border rounded">No files uploaded yet.</div>
      ) : (
        <ul className="space-y-3">
          {resources.map(r => (
            <li key={r.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-500">{r.size} — Uploaded {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <a href={r.data} download={r.name} className="px-3 py-1 border rounded hover:bg-slate-100">Download</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Contact({ onSend }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      let fileData = null;
      if (file) {
        fileData = {
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
          data: await readFileAsBase64(file),
        };
      }
      const msg = {
        id: uid("msg"),
        name: name || "Anonymous",
        email,
        subject: subject || "General",
        message,
        file: fileData,
        createdAt: new Date().toISOString(),
        status: "unread",
      };
      onSend(msg);
      setStatus({ ok: true, text: "Message sent. The rep will contact you." });
      setName(""); setEmail(""); setSubject(""); setMessage(""); setFile(null);
    } catch (err) {
      setStatus({ ok: false, text: "Failed to send message." });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Contact the Student Rep</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="p-2 border rounded" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email (optional)" className="p-2 border rounded" />
        </div>
        <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="p-2 border rounded w-full" />
        <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe your issue..." className="p-2 border rounded w-full h-40" required />
        <div className="flex items-center gap-3">
          <input id="file" type="file" onChange={e=>setFile(e.target.files[0] || null)} />
          {file && <div className="text-sm">Selected: {file.name} ({Math.round(file.size/1024)} KB)</div>}
        </div>
        <div>
          <button type="submit" disabled={sending} className="px-4 py-2 rounded bg-slate-800 text-white">{sending ? "Sending..." : "Send Message"}</button>
        </div>
        {status && (
          <div className={`p-3 rounded ${status.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{status.text}</div>
        )}
      </form>
    </main>
  );
}

function Admin({ messages, resources, onDeleteMessage, onDeleteResource, onPostInfo }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [pw, setPw] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(()=>{
    const s = loadFromStorage("sr_admin_logged", false);
    setLoggedIn(s);
  },[]);

  function login(e) {
    e.preventDefault();
    if (pw === DEFAULT_ADMIN_PASSWORD) {
      setLoggedIn(true);
      saveToStorage("sr_admin_logged", true);
      setPw("");
    } else {
      alert("Incorrect password. Change DEFAULT_ADMIN_PASSWORD in code for production.");
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile) return alert("Choose a file first.");
    setUploading(true);
    try {
      const data = await readFileAsBase64(uploadFile);
      const res = {
        id: uid("res"),
        name: uploadFile.name,
        size: `${Math.round(uploadFile.size/1024)} KB`,
        data,
        createdAt: new Date().toISOString(),
      };
      onPostInfo({ type: "resource", payload: res });
      setStatus({ok:true, text: "File uploaded."});
      setUploadFile(null);
      (document.getElementById("admin-file") || {}).value = "";
    } catch (err) {
      setStatus({ok:false, text: "Upload failed."});
    } finally { setUploading(false); }
  }

  function postAnnouncement(e) {
    e.preventDefault();
    if (!newTitle || !newBody) return alert("Please fill title and body.");
    const info = { id: uid("info"), title: newTitle, body: newBody, createdAt: new Date().toISOString() };
    onPostInfo({ type: "info", payload: info });
    setNewTitle(""); setNewBody("");
    setStatus({ok:true, text: "Announcement posted."});
  }

  if (!loggedIn) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
        <form onSubmit={login} className="space-y-3">
          <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Admin password" className="p-2 border rounded" />
          <div>
            <button className="px-4 py-2 rounded bg-slate-800 text-white">Login</button>
          </div>
          <div className="text-sm text-slate-500">Default password is set in the app file. Change before public use.</div>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <button onClick={()=>{setLoggedIn(false); saveToStorage("sr_admin_logged", false);}} className="px-3 py-1 border rounded">Logout</button>
      </div>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Messages ({messages.length})</h3>
          {messages.length === 0 ? <div>No messages yet.</div> : (
            <ul className="space-y-3 max-h-72 overflow-auto">
              {messages.slice().reverse().map(m => (
                <li key={m.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{m.subject} — <span className="text-sm text-slate-500">{m.name}</span></div>
                      <div className="text-sm mt-2">{m.message}</div>
                      {m.email && <div className="text-xs mt-2">Email: {m.email}</div>}
                      <div className="text-xs text-slate-500 mt-2">{new Date(m.createdAt).toLocaleString()}</div>
                      {m.file && (
                        <div className="mt-2">
                          <a href={m.file.data} download={m.file.name} className="text-sm underline">Download attachment: {m.file.name}</a>
                        </div>
                      )}
                    </div>
                    <div>
                      <button onClick={()=>onDeleteMessage(m.id)} className="px-2 py-1 border rounded">Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Resources ({resources.length})</h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <input id="admin-file" type="file" onChange={e=>setUploadFile(e.target.files[0]||null)} />
            <div>
              <button className="px-3 py-1 rounded bg-slate-800 text-white">{uploading?"Uploading...":"Upload File"}</button>
            </div>
          </form>

          <ul className="mt-4 space-y-2">
            {resources.slice().reverse().map(r => (
              <li key={r.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.size} • {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="space-x-2">
                  <a href={r.data} download={r.name} className="px-2 py-1 border rounded">Download</a>
                  <button onClick={()=>onDeleteResource(r.id)} className="px-2 py-1 border rounded">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="p-4 border rounded">
        <h3 className="font-semibold mb-2">Post Announcement</h3>
        <form onSubmit={postAnnouncement} className="space-y-3">
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Title" className="p-2 border rounded w-full" />
          <textarea value={newBody} onChange={e=>setNewBody(e.target.value)} placeholder="Message body" className="p-2 border rounded w-full h-28" />
          <div>
            <button className="px-3 py-1 rounded bg-slate-800 text-white">Post</button>
          </div>
        </form>
        {status && <div className={`mt-3 p-2 rounded ${status.ok?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{status.text}</div>}
      </section>

      <section className="p-4 border rounded">
        <h3 className="font-semibold">Export / Import</h3>
        <p className="text-sm text-slate-500">You can export all portal data (messages & resources) for backup or import it on another device.</p>
        <div className="mt-3 flex gap-3">
          <button onClick={()=>{
            const dump = { messages, resources, infos: loadFromStorage('sr_infos',[]) };
            const blob = new Blob([JSON.stringify(dump, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'sr_portal_export.json'; a.click(); URL.revokeObjectURL(url);
          }} className="px-3 py-1 border rounded">Export JSON</button>

          <input id="import-file" type="file" onChange={(e)=>{
            const f = e.target.files[0]; if(!f) return;
            const reader = new FileReader();
            reader.onload = ()=>{
              try {
                const data = JSON.parse(reader.result);
                if (Array.isArray(data.messages)) saveToStorage('sr_messages', data.messages);
                if (Array.isArray(data.resources)) saveToStorage('sr_resources', data.resources);
                if (Array.isArray(data.infos)) saveToStorage('sr_infos', data.infos);
                alert('Import complete. Reloading...');
                window.location.reload();
              } catch(err){ alert('Invalid file.'); }
            };
            reader.readAsText(f);
          }} />
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState('home');
  const [messages, setMessages] = useState(() => loadFromStorage('sr_messages', []));
  const [resources, setResources] = useState(() => loadFromStorage('sr_resources', []));
  const [infos, setInfos] = useState(() => loadFromStorage('sr_infos', []));

  useEffect(() => saveToStorage('sr_messages', messages), [messages]);
  useEffect(() => saveToStorage('sr_resources', resources), [resources]);
  useEffect(() => saveToStorage('sr_infos', infos), [infos]);

  function handleSendMessage(msg) {
    setMessages(prev => [...prev, msg]);
  }

  function handleDeleteMessage(id) {
    if (!confirm('Delete message?')) return;
    setMessages(prev => prev.filter(m => m.id !== id));
  }
  function handleDeleteResource(id) {
    if (!confirm('Delete resource?')) return;
    setResources(prev => prev.filter(r => r.id !== id));
  }

  function handlePostInfo({ type, payload }) {
    if (type === 'resource') setResources(prev => [...prev, payload]);
    if (type === 'info') setInfos(prev => [...prev, payload]);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header onNav={setRoute} active={route} />
      {route === 'home' && <Home infos={infos} />}
      {route === 'contact' && <Contact onSend={handleSendMessage} />}
      {route === 'files' && <FilesPage resources={resources} />}
      {route === 'admin' && <Admin messages={messages} resources={resources} onDeleteMessage={handleDeleteMessage} onDeleteResource={handleDeleteResource} onPostInfo={handlePostInfo} />}

      <footer className="border-t mt-10 py-4 text-center text-sm text-slate-500">Student Rep Portal</footer>
    </div>
  );
}
