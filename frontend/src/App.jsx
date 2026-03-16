import { useState, useEffect } from "react";

const API = "http://localhost:5001/api";

const SUSTAINABILITY_COLORS = {
  "plastic-free":      { bg: "#0d2137", text: "#58a6ff" },
  "compostable":       { bg: "#0d2b1a", text: "#3fb950" },
  "vegan":             { bg: "#1f1435", text: "#bc8cff" },
  "recycled":          { bg: "#1a2b0d", text: "#7ee787" },
  "zero-waste":        { bg: "#2b1a0d", text: "#ffa657" },
  "organic":           { bg: "#0d2b1a", text: "#56d364" },
  "fair-trade":        { bg: "#1a1a0d", text: "#e3b341" },
  "biodegradable":     { bg: "#0d2b2b", text: "#39d3bb" },
  "upcycled":          { bg: "#2b1a1a", text: "#ff7b72" },
  "locally-sourced":   { bg: "#2b2b0d", text: "#f0e68c" },
  "cruelty-free":      { bg: "#2b0d2b", text: "#f778ba" },
  "carbon-neutral":    { bg: "#0d1f2b", text: "#79c0ff" },
  "refillable":        { bg: "#1a2b2b", text: "#76e3ea" },
  "natural-ingredients": { bg: "#2b1f0d", text: "#ffca64" },
};

const CATEGORY_ICONS = {
  "Food & Beverage":        "🥗",
  "Personal Care & Beauty": "✨",
  "Home & Living":          "🏡",
  "Clothing & Apparel":     "👕",
  "Office & Stationery":    "📎",
  "Electronics & Accessories": "🔌",
  "Health & Wellness":      "💚",
  "Baby & Kids":            "🧸",
  "Outdoor & Garden":       "🌱",
  "Gifts & Lifestyle":      "🎁",
};

export default function App() {
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("generate");

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API}/category/products`);
      const data = await res.json();
      setHistory(data.products || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const generate = async () => {
    if (!form.name || !form.description || !form.price) {
      setError("All fields are required.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/category/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: parseFloat(form.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ fontSize: 22, marginRight: 8 }}>🌿</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#e6edf3", letterSpacing: -0.5 }}>rayeva</div>
            <div style={{ fontSize: 11, color: "#6e7681", letterSpacing: 0.5 }}>MODULE 1</div>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          {[
            { id: "generate", icon: "✦", label: "Generate Tags" },
            { id: "history",  icon: "⏱", label: "Product History" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.navBtn,
                background: activeTab === t.id ? "#21262d" : "transparent",
                color: activeTab === t.id ? "#e6edf3" : "#8b949e",
                borderLeft: activeTab === t.id ? "2px solid #3fb950" : "2px solid transparent",
              }}
            >
              <span style={{ marginRight: 10, fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.sidebarInfo}>
          <div style={{ color: "#3fb950", fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>WHAT THIS DOES</div>
          <div style={{ color: "#6e7681", fontSize: 12, lineHeight: 1.7 }}>
            Auto-assigns categories, generates SEO tags, and detects sustainability attributes from product info using Claude AI.
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {activeTab === "generate" && (
          <div style={{ maxWidth: 720 }}>
            <div style={styles.pageHeader}>
              <h1 style={styles.h1}>AI Category & Tag Generator</h1>
              <p style={styles.subtitle}>Enter product details — Claude assigns the category, tags, and sustainability filters automatically.</p>
            </div>

            {/* Form */}
            <div style={styles.card}>
              <Field label="Product Name" required>
                <input
                  style={styles.input}
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="e.g. Bamboo Toothbrush Set"
                />
              </Field>
              <Field label="Description" required>
                <textarea
                  style={{ ...styles.input, resize: "vertical", minHeight: 90 }}
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder="Describe materials, origin, use case, packaging..."
                />
              </Field>
              <Field label="Price (₹)" required>
                <input
                  type="number"
                  style={{ ...styles.input, maxWidth: 200 }}
                  value={form.price}
                  onChange={(e) => set("price")(e.target.value)}
                  placeholder="149"
                />
              </Field>

              {error && <div style={styles.errorBox}>{error}</div>}

              <button onClick={generate} disabled={loading} style={styles.primaryBtn}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Spinner /> Generating with Claude…
                  </span>
                ) : "✦  Generate Tags"}
              </button>
            </div>

            {/* Result */}
            {result && <ResultCard result={result} />}
          </div>
        )}

        {activeTab === "history" && (
          <div style={{ maxWidth: 860 }}>
            <div style={styles.pageHeader}>
              <h1 style={styles.h1}>Product History</h1>
              <p style={styles.subtitle}>All products tagged via the AI module, stored in Supabase.</p>
            </div>
            {loadingHistory ? (
              <div style={{ color: "#6e7681", paddingTop: 40, textAlign: "center" }}>Loading…</div>
            ) : history.length === 0 ? (
              <div style={{ ...styles.card, color: "#6e7681", textAlign: "center" }}>No products yet. Generate some tags first.</div>
            ) : (
              history.map((p) => <HistoryCard key={p.id} product={p} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ResultCard({ result }) {
  const icon = CATEGORY_ICONS[result.primary_category] || "📦";
  return (
    <div style={{ ...styles.card, borderColor: "#238636", marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <div>
          <div style={{ color: "#3fb950", fontWeight: 700, fontSize: 18 }}>{result.primary_category}</div>
          <div style={{ color: "#8b949e", fontSize: 14 }}>{result.sub_category}</div>
        </div>
        <span style={{ marginLeft: "auto", background: "#238636", color: "#aff5b4", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          ✓ Saved to DB
        </span>
      </div>

      <Section label="SEO Tags">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {result.seo_tags?.map((t) => (
            <span key={t} style={{ background: "#1f3a5f", color: "#79c0ff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontFamily: "monospace" }}>
              #{t}
            </span>
          ))}
        </div>
      </Section>

      <Section label="Sustainability Filters">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {result.sustainability_filters?.map((f) => {
            const c = SUSTAINABILITY_COLORS[f] || { bg: "#1a2b1a", text: "#56d364" };
            return (
              <span key={f} style={{ background: c.bg, color: c.text, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                ♻ {f}
              </span>
            );
          })}
        </div>
      </Section>

      {result.reasoning && (
        <Section label="AI Reasoning">
          <p style={{ color: "#8b949e", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{result.reasoning}</p>
        </Section>
      )}

      <Section label="Raw JSON Output">
        <pre style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: 14, fontSize: 12, color: "#e6edf3", overflow: "auto", margin: 0 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </Section>
    </div>
  );
}

function HistoryCard({ product }) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[product.primary_category] || "📦";
  return (
    <div style={{ ...styles.card, marginBottom: 12, cursor: "pointer" }} onClick={() => setOpen(!open)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e6edf3", fontWeight: 600 }}>{product.name}</div>
          <div style={{ color: "#8b949e", fontSize: 13 }}>{product.primary_category} · {product.sub_category}</div>
        </div>
        <div style={{ color: "#3fb950", fontSize: 12 }}>₹{product.price}</div>
        <div style={{ color: "#6e7681", fontSize: 12 }}>{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #21262d" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {product.seo_tags?.map((t) => (
              <span key={t} style={{ background: "#1f3a5f", color: "#79c0ff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: "monospace" }}>#{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {product.sustainability_filters?.map((f) => {
              const c = SUSTAINABILITY_COLORS[f] || { bg: "#1a2b1a", text: "#56d364" };
              return <span key={f} style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>♻ {f}</span>;
            })}
          </div>
          <div style={{ color: "#6e7681", fontSize: 11, marginTop: 10 }}>{new Date(product.created_at).toLocaleString("en-IN")}</div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, color: "#8b949e", marginBottom: 6, fontWeight: 500 }}>
        {label} {required && <span style={{ color: "#f85149" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, color: "#6e7681", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, border: "2px solid #ffffff40", borderTopColor: "#fff",
      borderRadius: "50%", display: "inline-block",
      animation: "spin 0.6s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

const styles = {
  root: { display: "flex", minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  sidebar: { width: 240, background: "#161b22", borderRight: "1px solid #21262d", padding: "24px 0", display: "flex", flexDirection: "column", flexShrink: 0 },
  logo: { display: "flex", alignItems: "center", padding: "0 20px 0", marginBottom: 8 },
  navBtn: { display: "flex", alignItems: "center", width: "100%", padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, textAlign: "left", transition: "all 0.15s" },
  sidebarInfo: { marginTop: "auto", padding: "20px", borderTop: "1px solid #21262d" },
  main: { flex: 1, padding: "40px 48px", overflowY: "auto" },
  pageHeader: { marginBottom: 28 },
  h1: { margin: 0, fontSize: 24, fontWeight: 700, color: "#e6edf3", letterSpacing: -0.5 },
  subtitle: { color: "#6e7681", fontSize: 14, marginTop: 6, marginBottom: 0 },
  card: { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 24, marginBottom: 16 },
  input: { width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "10px 14px", color: "#e6edf3", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  primaryBtn: { background: "#238636", color: "#fff", border: "none", borderRadius: 6, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8, letterSpacing: 0.3 },
  errorBox: { background: "#f8514918", border: "1px solid #f85149", borderRadius: 6, padding: "10px 14px", color: "#f85149", fontSize: 13, marginBottom: 12 },
};
