import { useState, useEffect, useCallback } from "react";

// ─── ZUSTAND-LIKE STATE (inline for artifact) ───────────────────────────────
function useStore() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("pb_theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pb_history") || "[]");
    } catch {
      return [];
    }
  });
  const [fields, setFields] = useState({
    subject: "",
    style: "",
    color: "",
    mood: "",
    lighting: "",
    camera: "",
    extra: "",
  });
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("pb_theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("pb_history", JSON.stringify(history));
    } catch {}
  }, [history]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const updateField = (key, val) => setFields((f) => ({ ...f, [key]: val }));
  const addToHistory = (prompt) => {
    const entry = {
      id: Date.now(),
      prompt,
      ts: new Date().toLocaleString(),
      fields: { ...fields },
    };
    setHistory((h) => [entry, ...h].slice(0, 30));
  };
  const deleteHistory = (id) => setHistory((h) => h.filter((e) => e.id !== id));
  const clearHistory = () => setHistory([]);
  const restoreFromHistory = (entry) => setFields({ ...entry.fields });
  const resetFields = () =>
    setFields({
      subject: "",
      style: "",
      color: "",
      mood: "",
      lighting: "",
      camera: "",
      extra: "",
    });

  const filteredHistory = history.filter((e) =>
    e.prompt.toLowerCase().includes(historySearch.toLowerCase()),
  );

  return {
    theme,
    toggleTheme,
    fields,
    updateField,
    resetFields,
    history: filteredHistory,
    addToHistory,
    deleteHistory,
    clearHistory,
    restoreFromHistory,
    historySearch,
    setHistorySearch,
  };
}

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
const OPTIONS = {
  subject: [
    "Logo",
    "Portrait",
    "Landscape",
    "Character",
    "Product",
    "Interior",
    "Abstract",
    "Architecture",
    "Animal",
    "Vehicle",
  ],
  style: [
    "Cyberpunk",
    "Watercolor",
    "Oil painting",
    "Pixel art",
    "Flat design",
    "Sketch",
    "Neon noir",
    "Surrealism",
    "Art Deco",
    "Minimalistic",
    "Photorealistic",
    "Anime",
    "Vaporwave",
    "Brutalist",
    "Impressionist",
  ],
  color: [
    "Blue tones",
    "Red & gold",
    "Monochrome",
    "Pastel palette",
    "Earthy tones",
    "Neon colors",
    "Black & white",
    "Purple & teal",
    "Warm sunset",
    "Cool arctic",
    "Emerald & black",
    "Rose gold",
  ],
  mood: [
    "Epic",
    "Mysterious",
    "Calm",
    "Energetic",
    "Dark",
    "Dreamy",
    "Nostalgic",
    "Futuristic",
    "Romantic",
    "Gritty",
    "Playful",
    "Sacred",
  ],
  lighting: [
    "Golden hour",
    "Neon glow",
    "Studio lighting",
    "Moonlight",
    "Dramatic shadows",
    "Backlit",
    "Soft diffused",
    "Bioluminescent",
    "Foggy",
    "Overcast",
    "Cinematic",
  ],
  camera: [
    "Wide angle",
    "Macro closeup",
    "Bird's eye",
    "Worm's eye",
    "Portrait lens",
    "Fish-eye",
    "Drone shot",
    "Isometric",
    "First person",
    "Bokeh blur",
  ],
};

const FIELD_META = [
  {
    key: "subject",
    label: "Subject",
    icon: "◈",
    placeholder: "e.g. A lone wolf...",
  },
  { key: "style", label: "Style", icon: "◉", placeholder: "Art style..." },
  { key: "color", label: "Color", icon: "◆", placeholder: "Color palette..." },
  { key: "mood", label: "Mood", icon: "◇", placeholder: "Atmosphere..." },
  {
    key: "lighting",
    label: "Lighting",
    icon: "◎",
    placeholder: "Light source...",
  },
  { key: "camera", label: "Camera", icon: "◐", placeholder: "Shot type..." },
  {
    key: "extra",
    label: "Extra",
    icon: "✦",
    placeholder: "Any extra details, modifiers...",
  },
];

// ─── PROMPT GENERATOR ────────────────────────────────────────────────────────
function generatePrompt(fields) {
  const parts = [];
  if (fields.subject) parts.push(fields.subject);
  if (fields.style) parts.push(`in ${fields.style} style`);
  if (fields.color) parts.push(`with ${fields.color}`);
  if (fields.mood) parts.push(`${fields.mood} mood`);
  if (fields.lighting) parts.push(`${fields.lighting} lighting`);
  if (fields.camera) parts.push(`${fields.camera} shot`);
  if (fields.extra) parts.push(fields.extra);
  return parts.join(", ");
}

// ─── COPY HOOK ───────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return { copied, copy };
}

// ─── TAG CHIPS ───────────────────────────────────────────────────────────────
function TagChips({ options, value, onChange, dark }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        marginTop: "6px",
      }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(active ? "" : opt)}
            style={{
              padding: "4px 11px",
              borderRadius: "20px",
              border: active
                ? "1.5px solid #f0c040"
                : `1.5px solid ${dark ? "#333" : "#ddd"}`,
              background: active ? "#f0c040" : dark ? "#1a1a1a" : "#f5f5f5",
              color: active ? "#0a0a0a" : dark ? "#aaa" : "#555",
              fontSize: "12px",
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
              transition: "all 0.15s",
              fontWeight: active ? "700" : "400",
              letterSpacing: "0.02em",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── FIELD BLOCK ─────────────────────────────────────────────────────────────
function FieldBlock({ meta, value, onChange, dark }) {
  const hasOpts = OPTIONS[meta.key];
  return (
    <div
      style={{
        background: dark ? "#111" : "#fff",
        border: `1px solid ${dark ? "#222" : "#e5e5e5"}`,
        borderRadius: "12px",
        padding: "14px 16px",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <span style={{ color: "#f0c040", fontSize: "14px" }}>{meta.icon}</span>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            color: dark ? "#e0e0e0" : "#222",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {meta.label}
        </span>
        {value && (
          <span
            style={{
              marginLeft: "auto",
              background: "#f0c04022",
              color: "#f0c040",
              borderRadius: "10px",
              padding: "1px 8px",
              fontSize: "11px",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ✓ set
          </span>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(meta.key, e.target.value)}
        placeholder={meta.placeholder}
        style={{
          width: "100%",
          background: dark ? "#0a0a0a" : "#f9f9f9",
          border: `1px solid ${dark ? "#2a2a2a" : "#e0e0e0"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          color: dark ? "#fff" : "#111",
          fontSize: "13px",
          fontFamily: "'DM Mono', monospace",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {hasOpts && (
        <TagChips
          options={OPTIONS[meta.key]}
          value={value}
          onChange={(v) => onChange(meta.key, v)}
          dark={dark}
        />
      )}
    </div>
  );
}

// ─── PROMPT OUTPUT ───────────────────────────────────────────────────────────
function PromptOutput({ prompt, onSave, dark }) {
  const { copied, copy } = useCopy();
  const empty = !prompt;

  return (
    <div
      style={{
        background: dark ? "#0d0d0d" : "#fffdf5",
        border: `2px solid ${empty ? (dark ? "#222" : "#eee") : "#f0c040"}`,
        borderRadius: "14px",
        padding: "20px",
        minHeight: "80px",
        position: "relative",
        transition: "border-color 0.3s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "'Syne',sans-serif",
            fontWeight: 800,
            fontSize: "11px",
            letterSpacing: "0.1em",
            color: "#f0c040",
            textTransform: "uppercase",
          }}
        >
          ✦ Generated Prompt
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => !empty && onSave(prompt)}
            disabled={empty}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              border: `1px solid ${dark ? "#333" : "#ddd"}`,
              background: empty ? "transparent" : dark ? "#1a1a1a" : "#f0f0f0",
              color: empty ? (dark ? "#444" : "#ccc") : dark ? "#aaa" : "#555",
              fontSize: "11px",
              fontFamily: "'DM Mono',monospace",
              cursor: empty ? "default" : "pointer",
            }}
          >
            Save
          </button>
          <button
            onClick={() => !empty && copy(prompt)}
            disabled={empty}
            style={{
              padding: "5px 14px",
              borderRadius: "8px",
              border: "1.5px solid #f0c040",
              background: copied ? "#f0c040" : "transparent",
              color: copied ? "#0a0a0a" : "#f0c040",
              fontSize: "11px",
              fontFamily: "'DM Mono',monospace",
              cursor: empty ? "default" : "pointer",
              fontWeight: 700,
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <p
        style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: "14px",
          color: empty ? (dark ? "#333" : "#bbb") : dark ? "#f0f0f0" : "#111",
          lineHeight: "1.7",
          margin: 0,
          wordBreak: "break-word",
          fontStyle: empty ? "italic" : "normal",
        }}
      >
        {empty ? "Fill in the fields above to generate your prompt…" : prompt}
      </p>
    </div>
  );
}

// ─── HISTORY PANEL ────────────────────────────────────────────────────────────
function HistoryPanel({
  history,
  onDelete,
  onClear,
  onRestore,
  search,
  setSearch,
  dark,
}) {
  const { copy } = useCopy();
  return (
    <div
      style={{
        background: dark ? "#0a0a0a" : "#fafafa",
        border: `1px solid ${dark ? "#1e1e1e" : "#e8e8e8"}`,
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontFamily: "'Syne',sans-serif",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.1em",
            color: "#f0c040",
            textTransform: "uppercase",
          }}
        >
          ◈ History ({history.length})
        </span>
        {history.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#555" : "#aaa",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            clear all
          </button>
        )}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search history…"
        style={{
          width: "100%",
          marginBottom: "12px",
          boxSizing: "border-box",
          background: dark ? "#111" : "#fff",
          border: `1px solid ${dark ? "#2a2a2a" : "#e0e0e0"}`,
          borderRadius: "8px",
          padding: "7px 12px",
          color: dark ? "#fff" : "#111",
          fontSize: "12px",
          fontFamily: "'DM Mono',monospace",
          outline: "none",
        }}
      />

      {history.length === 0 ? (
        <p
          style={{
            color: dark ? "#333" : "#ccc",
            fontSize: "12px",
            fontFamily: "'DM Mono',monospace",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          No history yet
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {history.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: dark ? "#141414" : "#fff",
                border: `1px solid ${dark ? "#222" : "#eee"}`,
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: "12px",
                  color: dark ? "#d0d0d0" : "#222",
                  margin: "0 0 6px 0",
                  lineHeight: "1.6",
                  wordBreak: "break-word",
                }}
              >
                {entry.prompt}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: dark ? "#444" : "#aaa",
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {entry.ts}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => onRestore(entry)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f0c040",
                      fontSize: "10px",
                      cursor: "pointer",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    ↺ restore
                  </button>
                  <button
                    onClick={() => copy(entry.prompt)}
                    style={{
                      background: "none",
                      border: "none",
                      color: dark ? "#555" : "#aaa",
                      fontSize: "10px",
                      cursor: "pointer",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    copy
                  </button>
                  <button
                    onClick={() => onDelete(entry.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#c04040",
                      fontSize: "10px",
                      cursor: "pointer",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PromptBuilder() {
  const store = useStore();
  const dark = store.theme === "dark";
  const prompt = generatePrompt(store.fields);
  const filledCount = Object.values(store.fields).filter(Boolean).length;

  // Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap";
    document.head.appendChild(link);
  }, []);

  const bg = dark ? "#050505" : "#f7f6f2";
  const text = dark ? "#e8e8e8" : "#111";
  const card = dark ? "#0f0f0f" : "#fff";
  const border = dark ? "#1c1c1c" : "#e8e8e8";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: text,
        fontFamily: "'DM Mono', monospace",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: `1px solid ${border}`,
          background: dark ? "#080808" : "#fefefe",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>✦</span>
          <span
            style={{
              fontFamily: "'Syne',sans-serif",
              fontWeight: 800,
              fontSize: "18px",
              letterSpacing: "-0.02em",
            }}
          >
            Prompt<span style={{ color: "#f0c040" }}>Builder</span>
          </span>
          {filledCount > 0 && (
            <span
              style={{
                background: "#f0c04022",
                color: "#f0c040",
                borderRadius: "12px",
                padding: "2px 10px",
                fontSize: "11px",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {filledCount}/7 fields
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={store.resetFields}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${dark ? "#2a2a2a" : "#ddd"}`,
              background: "transparent",
              color: dark ? "#666" : "#888",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Reset
          </button>
          <button
            onClick={store.toggleTheme}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: `1px solid ${dark ? "#2a2a2a" : "#ddd"}`,
              background: dark ? "#111" : "#f0f0f0",
              color: dark ? "#f0c040" : "#555",
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "28px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Intro */}
          <div
            style={{
              background: dark ? "#0c0c0c" : "#fff",
              border: `1px solid ${border}`,
              borderRadius: "14px",
              padding: "20px 22px",
            }}
          >
            <h1
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: "26px",
                fontWeight: 800,
                margin: "0 0 6px 0",
                letterSpacing: "-0.03em",
              }}
            >
              AI Image <span style={{ color: "#f0c040" }}>Prompt Builder</span>
            </h1>
            <p
              style={{
                margin: 0,
                color: dark ? "#666" : "#888",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            >
              Select options or type custom values. Your prompt auto-generates
              below.
            </p>
          </div>

          {/* Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {FIELD_META.slice(0, 6).map((meta) => (
              <FieldBlock
                key={meta.key}
                meta={meta}
                value={store.fields[meta.key]}
                onChange={store.updateField}
                dark={dark}
              />
            ))}
          </div>

          {/* Extra (full width) */}
          <FieldBlock
            meta={FIELD_META[6]}
            value={store.fields.extra}
            onChange={store.updateField}
            dark={dark}
          />

          {/* Output */}
          <PromptOutput
            prompt={prompt}
            onSave={store.addToHistory}
            dark={dark}
          />

          {/* Token estimate */}
          {prompt && (
            <div
              style={{
                display: "flex",
                gap: "16px",
                padding: "12px 16px",
                background: dark ? "#0c0c0c" : "#fff",
                border: `1px solid ${border}`,
                borderRadius: "10px",
                fontSize: "11px",
                color: dark ? "#555" : "#aaa",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              <span>
                ◈ Words:{" "}
                <strong style={{ color: dark ? "#888" : "#555" }}>
                  {prompt.split(/\s+/).length}
                </strong>
              </span>
              <span>
                ◉ Chars:{" "}
                <strong style={{ color: dark ? "#888" : "#555" }}>
                  {prompt.length}
                </strong>
              </span>
              <span>
                ◆ Fields:{" "}
                <strong style={{ color: "#f0c040" }}>{filledCount}/7</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right Column: History */}
        <div style={{ position: "sticky", top: "80px" }}>
          <HistoryPanel
            history={store.history}
            onDelete={store.deleteHistory}
            onClear={store.clearHistory}
            onRestore={store.restoreFromHistory}
            search={store.historySearch}
            setSearch={store.setHistorySearch}
            dark={dark}
          />
        </div>
      </main>

      {/* Mobile responsive: stack columns */}
      <style>{`
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr !important; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        input:focus { border-color: #f0c040 !important; box-shadow: 0 0 0 2px #f0c04033; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
