import { useState, useEffect } from "react";

const API = "http://localhost:5002/api";

const BUDGET_PRESETS = [
  { label: "₹10K", value: 10000 },
  { label: "₹25K", value: 25000 },
  { label: "₹50K", value: 50000 },
  { label: "₹1L",  value: 100000 },
  { label: "₹5L",  value: 500000 },
];

const USE_CASE_PRESETS = [
  "Employee welcome kits for onboarding",
  "Client gifting for Diwali/festivals",
  "Cafeteria/pantry sustainable supplies",
  "Marketing swag for product launches",
  "Office stationery and daily supplies",
];

export default function App() {
  const [form, setForm] = useState({ company_name: "", budget: "", requirements: "" });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("generate");

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab === "history") {
      fetch(`${API}/proposal/list`).then(r => r.json()).then(d => setHistory(d.proposals || [])).catch(() => {});
    }
  }, [tab]);

  const generate = async () => {
    if (!form.company_name || !form.budget || !form.requirements) {
      setError("All fields are required."); return;
    }
    setError(""); setResult(null); setLoading(true);
    try {
      const res = await fetch(`${API}/proposal/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, budget: parseFloat(form.budget) }),
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
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logoRow}>
            <span style={{ fontSize: 18 }}>📦</span>
            <span style={s.logoText}>rayeva</span>
            <span style={s.moduleTag}>MODULE 2</span>
          </div>
          <div style={s.tabs}>
            {["generate", "history"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                ...s.tabBtn,
                color: tab === t ? "#e6edf3" : "#6e7681",
                borderBottom: tab === t ? "2px solid #1f6feb" : "2px solid transparent",
              }}>
                {t === "generate" ? "📊 Generate Proposal" : "🗂 Past Proposals"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={s.body}>
        {tab === "generate" && (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, maxWidth: 1100 }}>
            {/* Left: Form */}
            <div>
              <div style={s.card}>
                <h2 style={s.cardTitle}>Client Details</h2>

                <Label text="Company Name" required />
                <input
                  style={s.input}
                  value={form.company_name}
                  onChange={e => set("company_name")(e.target.value)}
                  placeholder="e.g. Swiggy Procurement"
                />

                <Label text="Budget (₹)" required />
                <input
                  type="number"
                  style={s.input}
                  value={form.budget}
                  onChange={e => set("budget")(e.target.value)}
                  placeholder="50000"
                />
                <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 14 }}>
                  {BUDGET_PRESETS.map(p => (
                    <button key={p.label} onClick={() => set("budget")(p.value)} style={{
                      ...s.presetBtn,
                      background: parseFloat(form.budget) === p.value ? "#1f3a5f" : "#161b22",
                      color: parseFloat(form.budget) === p.value ? "#58a6ff" : "#6e7681",
                      border: `1px solid ${parseFloat(form.budget) === p.value ? "#1f6feb" : "#30363d"}`,
                    }}>
                      {p.label}
                    </button>
                  ))}
                </div>

                <Label text="Requirements / Use Case" required />
                <textarea
                  style={{ ...s.input, resize: "vertical", minHeight: 90 }}
                  value={form.requirements}
                  onChange={e => set("requirements")(e.target.value)}
                  placeholder="Describe the procurement goal, target audience, preferences..."
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {USE_CASE_PRESETS.map(p => (
                    <button key={p} onClick={() => set("requirements")(p)} style={{
                      ...s.presetBtn,
                      background: form.requirements === p ? "#1f2b1a" : "#161b22",
                      color: form.requirements === p ? "#3fb950" : "#6e7681",
                      border: `1px solid ${form.requirements === p ? "#238636" : "#30363d"}`,
                    }}>
                      {p}
                    </button>
                  ))}
                </div>

                {error && <div style={s.errorBox}>{error}</div>}

                <button onClick={generate} disabled={loading} style={s.primaryBtn}>
                  {loading
                    ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner />Generating proposal…</span>
                    : "📊  Generate Proposal"}
                </button>
              </div>
            </div>

            {/* Right: Result */}
            <div>
              {!result && !loading && (
                <div style={{ ...s.card, textAlign: "center", padding: "60px 24px", color: "#6e7681" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No proposal yet</div>
                  <div style={{ fontSize: 13 }}>Fill in the form and click Generate</div>
                </div>
              )}
              {loading && (
                <div style={{ ...s.card, textAlign: "center", padding: "60px 24px", color: "#6e7681" }}>
                  <Spinner large />
                  <div style={{ marginTop: 16, fontSize: 14 }}>Claude is building your proposal…</div>
                </div>
              )}
              {result && !loading && <ProposalResult result={result} company={form.company_name} />}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div style={{ maxWidth: 860 }}>
            <h2 style={{ ...s.cardTitle, marginBottom: 20 }}>Past Proposals</h2>
            {history.length === 0
              ? <div style={{ ...s.card, color: "#6e7681", textAlign: "center" }}>No proposals yet.</div>
              : history.map(p => <HistoryCard key={p.id} p={p} />)
            }
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalResult({ result, company }) {
  const ba = result.budget_allocation || {};
  const cb = result.cost_breakdown || {};
  const pct = ba.utilization_pct || 0;

  return (
    <div>
      {/* Budget Overview */}
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#e6edf3", fontSize: 16 }}>Budget Overview — {company}</h3>
          <span style={{ background: "#1f3a5f", color: "#58a6ff", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            ✓ Saved to DB
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            ["Total Budget", `₹${ba.total_budget?.toLocaleString("en-IN")}`, "#58a6ff"],
            ["Allocated", `₹${ba.allocated?.toLocaleString("en-IN")}`, "#e3b341"],
            ["Remaining", `₹${ba.remaining?.toLocaleString("en-IN")}`, "#3fb950"],
            ["Utilization", `${pct}%`, pct > 90 ? "#3fb950" : "#e3b341"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#0d1117", borderRadius: 8, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ color: "#6e7681", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>{l}</div>
              <div style={{ color: c, fontWeight: 700, fontSize: 17 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Utilization bar */}
        <div style={{ background: "#0d1117", borderRadius: 4, height: 6 }}>
          <div style={{ background: pct > 90 ? "#238636" : "#e3b341", width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 4, transition: "width 0.8s ease" }} />
        </div>
      </div>

      {/* Product Mix */}
      <div style={s.card}>
        <h3 style={{ ...s.cardTitle, marginBottom: 14 }}>Recommended Product Mix</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #21262d" }}>
                {["Product", "Qty", "Unit Price", "Line Total", "Why"].map(h => (
                  <th key={h} style={{ color: "#6e7681", padding: "8px 10px", textAlign: "left", fontWeight: 500, fontSize: 11, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.product_mix?.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #21262d30" }}>
                  <td style={{ padding: "12px 10px", color: "#e6edf3", fontWeight: 500 }}>{item.product_name}</td>
                  <td style={{ padding: "12px 10px", color: "#6e7681" }}>{item.quantity}</td>
                  <td style={{ padding: "12px 10px", color: "#6e7681" }}>₹{item.unit_price?.toLocaleString("en-IN")}</td>
                  <td style={{ padding: "12px 10px", color: "#3fb950", fontWeight: 600 }}>₹{item.line_total?.toLocaleString("en-IN")}</td>
                  <td style={{ padding: "12px 10px", color: "#8b949e", fontSize: 12 }}>{item.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div style={s.card}>
        <h3 style={{ ...s.cardTitle, marginBottom: 14 }}>Cost Breakdown</h3>
        {[
          ["Products Subtotal", cb.products_subtotal],
          ["GST @ 18%", cb.estimated_gst_18pct],
          ["Estimated Shipping", cb.estimated_shipping],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #21262d", color: "#8b949e", fontSize: 14 }}>
            <span>{label}</span>
            <span>₹{val?.toLocaleString("en-IN")}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14, fontWeight: 700, fontSize: 17 }}>
          <span style={{ color: "#e6edf3" }}>Grand Total</span>
          <span style={{ color: "#3fb950" }}>₹{cb.grand_total?.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Impact */}
      <div style={{ ...s.card, borderColor: "#238636" }}>
        <h3 style={{ ...s.cardTitle, color: "#3fb950", marginBottom: 12 }}>🌿 Impact Summary</h3>
        <p style={{ color: "#8b949e", lineHeight: 1.8, fontSize: 14, margin: "0 0 14px" }}>{result.impact_summary}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {result.sustainability_highlights?.map(h => (
            <span key={h} style={{ background: "#0d2b1a", color: "#3fb950", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>♻ {h}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ p }) {
  const [open, setOpen] = useState(false);
  const ba = p.budget_allocation || {};
  return (
    <div style={{ ...s.card, marginBottom: 10, cursor: "pointer" }} onClick={() => setOpen(!open)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e6edf3", fontWeight: 600 }}>{p.company_name}</div>
          <div style={{ color: "#6e7681", fontSize: 12 }}>{p.requirements?.slice(0, 80)}…</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#58a6ff", fontWeight: 600 }}>₹{p.budget?.toLocaleString("en-IN")}</div>
          <div style={{ color: "#6e7681", fontSize: 11 }}>{ba.utilization_pct}% utilized</div>
        </div>
        <div style={{ color: "#6e7681" }}>{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #21262d" }}>
          <div style={{ color: "#8b949e", fontSize: 13, lineHeight: 1.7 }}>{p.impact_summary}</div>
          <div style={{ color: "#6e7681", fontSize: 11, marginTop: 8 }}>{new Date(p.created_at).toLocaleString("en-IN")}</div>
        </div>
      )}
    </div>
  );
}

function Label({ text, required }) {
  return (
    <label style={{ display: "block", fontSize: 12, color: "#8b949e", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>
      {text.toUpperCase()} {required && <span style={{ color: "#f85149" }}>*</span>}
    </label>
  );
}

function Spinner({ large }) {
  const size = large ? 32 : 14;
  return (
    <span style={{
      width: size, height: size,
      border: `2px solid #ffffff25`,
      borderTopColor: large ? "#1f6feb" : "#fff",
      borderRadius: "50%", display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { background: "#161b22", borderBottom: "1px solid #21262d", position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoRow: { display: "flex", alignItems: "center", gap: 8, padding: "16px 0" },
  logoText: { fontWeight: 800, fontSize: 17, color: "#e6edf3", letterSpacing: -0.5 },
  moduleTag: { background: "#1f3a5f", color: "#58a6ff", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  tabs: { display: "flex", gap: 4 },
  tabBtn: { background: "none", border: "none", padding: "18px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s" },
  body: { maxWidth: 1200, margin: "0 auto", padding: "32px" },
  card: { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 22, marginBottom: 16 },
  cardTitle: { margin: 0, color: "#e6edf3", fontSize: 15, fontWeight: 700, letterSpacing: -0.3 },
  input: { width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "10px 13px", color: "#e6edf3", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 14 },
  primaryBtn: { width: "100%", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 },
  errorBox: { background: "#f8514918", border: "1px solid #f85149", borderRadius: 6, padding: "10px 14px", color: "#f85149", fontSize: 13, marginBottom: 12 },
  presetBtn: { padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid #30363d" },
};
