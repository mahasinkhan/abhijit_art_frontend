import { useEffect, useState } from "react";
import {
  fetchAllHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  replaceHeroImage,
  reorderHeroSlides,
  deleteHeroSlide,
  type HeroSlide,
} from "../services/hero.api";

const ACCENT = "#d9542f";
const LINE   = "#e7dcc8";
const INK    = "#2a231d";
const MUTED  = "#7b7167";

type Draft = {
  alt: string;
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  subtitle: string;
};

const EMPTY: Draft = { alt: "", eyebrow: "", titleTop: "", titleBottom: "", subtitle: "" };

const toDraft = (s: HeroSlide): Draft => ({
  alt: s.alt,
  eyebrow: s.eyebrow,
  titleTop: s.titleTop,
  titleBottom: s.titleBottom,
  subtitle: s.subtitle,
});

const msg = (e: unknown, fallback: string): string => {
  const r = e as { response?: { data?: { message?: string } } };
  return r?.response?.data?.message || fallback;
};

export default function HeroSlides() {
  const [slides, setSlides]   = useState<HeroSlide[]>([]);
  const [edits, setEdits]     = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [notice, setNotice]   = useState("");

  const [file, setFile]   = useState<File | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const apply = (rows: HeroSlide[]) => {
    setSlides(rows);
    const next: Record<string, Draft> = {};
    rows.forEach((r) => { next[r.id] = toDraft(r); });
    setEdits(next);
  };

  const load = async () => {
    setLoading(true);
    try { apply(await fetchAllHeroSlides()); setError(""); }
    catch (e) { setError(msg(e, "Could not load hero slides")); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const onCreate = async () => {
    if (!file) { setError("Choose an image first"); return; }
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("alt", draft.alt);
      form.append("eyebrow", draft.eyebrow);
      form.append("titleTop", draft.titleTop);
      form.append("titleBottom", draft.titleBottom);
      form.append("subtitle", draft.subtitle);
      await createHeroSlide(form);
      setFile(null);
      setDraft(EMPTY);
      const input = document.getElementById("hero-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Slide added");
      await load();
    } catch (e) { setError(msg(e, "Upload failed")); }
    finally { setBusy(false); }
  };

  const onSave = async (id: string) => {
    setBusy(true); setError("");
    try { await updateHeroSlide(id, edits[id]); setNotice("Saved"); await load(); }
    catch (e) { setError(msg(e, "Save failed")); }
    finally { setBusy(false); }
  };

  const onToggle = async (s: HeroSlide) => {
    setBusy(true); setError("");
    try { await updateHeroSlide(s.id, { active: !s.active }); await load(); }
    catch (e) { setError(msg(e, "Could not change visibility")); }
    finally { setBusy(false); }
  };

  const onReplace = async (id: string, f: File) => {
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.append("image", f);
      await replaceHeroImage(id, form);
      setNotice("Image replaced");
      await load();
    } catch (e) { setError(msg(e, "Could not replace the image")); }
    finally { setBusy(false); }
  };

  const onMove = async (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const ids = slides.map((s) => s.id);
    const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    setBusy(true); setError("");
    try { const r = await reorderHeroSlides(ids); apply(r.data); }
    catch (e) { setError(msg(e, "Could not reorder")); }
    finally { setBusy(false); }
  };

  const onDelete = async (s: HeroSlide) => {
    if (!window.confirm("Delete this hero slide? The image is removed from Cloudinary too.")) return;
    setBusy(true); setError("");
    try { await deleteHeroSlide(s.id); setNotice("Slide deleted"); await load(); }
    catch (e) { setError(msg(e, "Delete failed")); }
    finally { setBusy(false); }
  };

  const newField = (key: keyof Draft, label: string, ph: string) => (
    <label style={st.lbl}>
      <span style={st.lblText}>{label}</span>
      <input
        style={st.input}
        value={draft[key]}
        placeholder={ph}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    </label>
  );

  const rowField = (id: string, key: keyof Draft, label: string) => (
    <label style={st.lbl}>
      <span style={st.lblText}>{label}</span>
      <input
        style={st.input}
        value={edits[id] ? edits[id][key] : ""}
        onChange={(e) =>
          setEdits((m) => ({ ...m, [id]: { ...m[id], [key]: e.target.value } }))
        }
      />
    </label>
  );

  const activeCount = slides.filter((s) => s.active).length;

  return (
    <div style={st.wrap}>
      <p style={st.hint}>
        Slides show on the homepage hero in this order. Leave a text box empty and that
        slide keeps the built&#8209;in wording. With no active slides the site falls back
        to the packaged image, so it never goes blank.
      </p>

      {error  && <div style={st.error}>{error}</div>}
      {notice && <div style={st.ok}>{notice}</div>}

      <section style={st.card}>
        <h3 style={st.h3}>Add a slide</h3>
        <input
          id="hero-file"
          type="file"
          accept="image/*"
          style={st.file}
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        />
        <div style={st.grid}>
          {newField("eyebrow", "Eyebrow", "Printing & Branding - Berhampore")}
          {newField("titleTop", "Headline, line 1", "Crafting quality")}
          {newField("titleBottom", "Headline, line 2 (gold italic)", "print & signage.")}
          {newField("alt", "Alt text", "Describes the photo for screen readers")}
        </div>
        {newField("subtitle", "Paragraph", "One or two lines under the headline")}
        <button style={st.primary} disabled={busy || !file} onClick={onCreate}>
          {busy ? "Working..." : "Upload slide"}
        </button>
      </section>

      <div style={st.countRow}>
        {loading
          ? "Loading slides..."
          : slides.length + " slide(s), " + activeCount + " visible on the site"}
      </div>

      {!loading && slides.length === 0 && (
        <p style={st.empty}>No slides yet. The homepage is using the packaged image.</p>
      )}

      {slides.map((s, i) => (
        <section key={s.id} style={{ ...st.card, opacity: s.active ? 1 : 0.62 }}>
          <div style={st.rowTop}>
            <img src={s.imageUrl} alt={s.alt || "Hero slide"} style={st.thumb} />
            <div style={st.rowMeta}>
              <div style={st.badges}>
                <span style={s.active ? st.badgeOn : st.badgeOff}>
                  {s.active ? "Visible" : "Hidden"}
                </span>
                <span style={st.pos}>Position {i + 1}</span>
              </div>
              <div style={st.btnRow}>
                <button style={st.ghost} disabled={busy || i === 0} onClick={() => onMove(i, -1)}>
                  &#8593; Up
                </button>
                <button
                  style={st.ghost}
                  disabled={busy || i === slides.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  &#8595; Down
                </button>
                <button style={st.ghost} disabled={busy} onClick={() => onToggle(s)}>
                  {s.active ? "Hide" : "Show"}
                </button>
                <label style={st.ghostLabel}>
                  Replace image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) onReplace(s.id, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button style={st.danger} disabled={busy} onClick={() => onDelete(s)}>
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div style={st.grid}>
            {rowField(s.id, "eyebrow", "Eyebrow")}
            {rowField(s.id, "titleTop", "Headline, line 1")}
            {rowField(s.id, "titleBottom", "Headline, line 2")}
            {rowField(s.id, "alt", "Alt text")}
          </div>
          {rowField(s.id, "subtitle", "Paragraph")}
          <button style={st.primary} disabled={busy} onClick={() => onSave(s.id)}>
            Save text
          </button>
        </section>
      ))}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap: { padding: "4px 2px 40px", color: INK },
  hint: { margin: "0 0 18px", color: MUTED, fontSize: 13.5, lineHeight: 1.7, maxWidth: 720 },
  card: {
    background: "#fffdf8", border: "1px solid " + LINE, borderRadius: 8,
    padding: 18, marginBottom: 16,
  },
  h3: { margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: INK },
  file: { display: "block", marginBottom: 14, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 },
  lbl: { display: "block", marginBottom: 12 },
  lblText: {
    display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
    color: MUTED, marginBottom: 5, fontWeight: 700,
  },
  input: {
    width: "100%", boxSizing: "border-box", padding: "9px 11px",
    border: "1px solid " + LINE, borderRadius: 4, fontSize: 13.5,
    background: "#fff", color: INK, fontFamily: "inherit",
  },
  primary: {
    background: ACCENT, color: "#fff", border: 0, borderRadius: 4,
    padding: "10px 20px", fontSize: 12.5, fontWeight: 700, letterSpacing: 1,
    textTransform: "uppercase", cursor: "pointer",
  },
  ghost: {
    background: "transparent", color: INK, border: "1px solid " + LINE,
    borderRadius: 4, padding: "7px 13px", fontSize: 12.5, cursor: "pointer",
  },
  ghostLabel: {
    background: "transparent", color: INK, border: "1px solid " + LINE,
    borderRadius: 4, padding: "7px 13px", fontSize: 12.5, cursor: "pointer",
    display: "inline-block",
  },
  danger: {
    background: "transparent", color: "#b23f1e", border: "1px solid #b23f1e55",
    borderRadius: 4, padding: "7px 13px", fontSize: 12.5, cursor: "pointer",
  },
  rowTop: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 },
  thumb: {
    width: 190, height: 110, objectFit: "cover", borderRadius: 6,
    border: "1px solid " + LINE, background: "#f2ebdd", flexShrink: 0,
  },
  rowMeta: { flex: 1, minWidth: 240 },
  badges: { display: "flex", gap: 10, alignItems: "center", marginBottom: 12 },
  badgeOn: {
    background: "#1d7a4c18", color: "#1d7a4c", borderRadius: 3,
    padding: "3px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
  },
  badgeOff: {
    background: "#7b716718", color: MUTED, borderRadius: 3,
    padding: "3px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
  },
  pos: { fontSize: 12, color: MUTED },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  countRow: { fontSize: 12.5, color: MUTED, margin: "22px 0 12px" },
  empty: { color: MUTED, fontSize: 13.5 },
  error: {
    background: "#b23f1e12", border: "1px solid #b23f1e44", color: "#b23f1e",
    borderRadius: 4, padding: "10px 13px", fontSize: 13, marginBottom: 14,
  },
  ok: {
    background: "#1d7a4c12", border: "1px solid #1d7a4c44", color: "#1d7a4c",
    borderRadius: 4, padding: "10px 13px", fontSize: 13, marginBottom: 14,
  },
};
