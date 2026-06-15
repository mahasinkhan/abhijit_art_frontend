import { useRef, useState } from "react";
import { createPost } from "../api";

interface Props {
  onPostCreated: () => void;
}

export default function AdminPostUpload({ onPostCreated }: Props) {
  const [file, setFile]         = useState<File | null>(null);
  const [caption, setCaption]   = useState("");
  const [preview, setPreview]   = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // ── enforce size limits client-side ──────────────────────
    const isVideo    = selected.type.startsWith("video/");
    const limitMB    = isVideo ? 30 : 10;
    const limitBytes = limitMB * 1024 * 1024;

    if (selected.size > limitBytes) {
      setError(`File too large. Max ${limitMB}MB for ${isVideo ? "videos" : "images"}.`);
      return;
    }

    setError("");
    setSuccess(false);
    setFile(selected);
    setFileType(isVideo ? "video" : "image");
    setPreview(URL.createObjectURL(selected));
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) return setError("Please select a photo or video.");
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("media", file);
      formData.append("caption", caption.trim());

      await createPost(formData, fileType);

      // reset
      setFile(null);
      setCaption("");
      setPreview(null);
      setSuccess(true);
      if (inputRef.current) inputRef.current.value = "";
      onPostCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Upload failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fileSizeLabel = file
    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    : null;

  return (
    <div style={s.card}>
      <h3 style={s.title}>📸 Create a Post</h3>

      {/* ── Drop zone ── */}
      <div style={s.dropZone} onClick={() => !preview && inputRef.current?.click()}>
        {preview ? (
          <>
            {fileType === "video" ? (
              <video src={preview} style={s.preview} controls />
            ) : (
              <img src={preview} alt="preview" style={s.preview} />
            )}

            {/* file info bar */}
            <div style={s.fileInfo}>
              <span style={s.fileName}>{file?.name}</span>
              <span style={s.fileSize}>{fileSizeLabel}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                style={s.removeBtn}
              >
                ✕ Remove
              </button>
            </div>
          </>
        ) : (
          <div style={s.placeholder}>
            <span style={{ fontSize: 40 }}>📁</span>
            <span style={{ color: "#ccc", fontSize: 15, fontWeight: 500 }}>
              Click to select photo or video
            </span>
            <span style={{ color: "#666", fontSize: 12 }}>
              Images: JPG, PNG, WebP — max 10MB &nbsp;|&nbsp; Videos: MP4, MOV — max 30MB
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* ── Caption ── */}
      <textarea
        placeholder="Write a caption... (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
        style={s.textarea}
      />

      {/* ── Compression note ── */}
      {file && fileType === "image" && (
        <p style={s.hint}>
          ✅ Image will be auto-compressed to WebP before upload — saves storage cost.
        </p>
      )}
      {file && fileType === "video" && (
        <p style={s.hint}>
          ✅ Video will be transcoded to 720p / 500kbps on Cloudinary — saves bandwidth cost.
        </p>
      )}

      {/* ── Error / success ── */}
      {error   && <p style={s.error}>{error}</p>}
      {success && <p style={s.successMsg}>✅ Post uploaded successfully!</p>}

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        style={{
          ...s.btn,
          opacity: loading || !file ? 0.55 : 1,
          cursor:  loading || !file ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <span style={s.btnInner}>
            <span style={s.spinner} /> Uploading...
          </span>
        ) : (
          "Post"
        )}
      </button>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  card: {
    background:   "#1a1a2e",
    border:       "1px solid #2a2a3e",
    borderRadius: 12,
    padding:      24,
    marginBottom: 32,
  },
  title: {
    color:        "#fff",
    fontSize:     18,
    fontWeight:   600,
    marginBottom: 16,
    marginTop:    0,
  },
  dropZone: {
    border:        "2px dashed #333",
    borderRadius:  10,
    overflow:      "hidden",
    marginBottom:  12,
    cursor:        "pointer",
    transition:    "border-color 0.2s",
  },
  placeholder: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    padding:        "44px 20px",
  },
  preview: {
    width:      "100%",
    maxHeight:  340,
    objectFit:  "cover",
    display:    "block",
  },
  fileInfo: {
    display:        "flex",
    alignItems:     "center",
    gap:            10,
    padding:        "8px 12px",
    background:     "rgba(0,0,0,0.5)",
  },
  fileName: {
    color:     "#ccc",
    fontSize:  13,
    flex:      1,
    overflow:  "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    color:     "#888",
    fontSize:  12,
    flexShrink: 0,
  },
  removeBtn: {
    background:   "transparent",
    border:       "1px solid #555",
    color:        "#aaa",
    padding:      "3px 10px",
    borderRadius: 5,
    cursor:       "pointer",
    fontSize:     12,
    flexShrink:   0,
  },
  textarea: {
    width:       "100%",
    background:  "#0d0d1a",
    border:      "1px solid #333",
    borderRadius: 8,
    padding:     "10px 12px",
    color:       "#fff",
    fontSize:    14,
    resize:      "vertical",
    boxSizing:   "border-box",
    fontFamily:  "inherit",
    lineHeight:  1.5,
  },
  hint: {
    color:     "#4caf87",
    fontSize:  12,
    margin:    "6px 0 0",
  },
  error: {
    color:   "#e74c3c",
    fontSize: 13,
    margin:  "8px 0 0",
  },
  successMsg: {
    color:   "#2ecc71",
    fontSize: 13,
    margin:  "8px 0 0",
  },
  btn: {
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    marginTop:    14,
    background:   "#e8552c",
    color:        "#fff",
    border:       "none",
    padding:      "11px 32px",
    borderRadius: 8,
    fontWeight:   600,
    fontSize:     15,
    transition:   "opacity 0.2s",
    minWidth:     120,
  },
  btnInner: {
    display:    "flex",
    alignItems: "center",
    gap:        8,
  },
  spinner: {
    display:     "inline-block",
    width:       14,
    height:      14,
    border:      "2px solid rgba(255,255,255,0.3)",
    borderTop:   "2px solid #fff",
    borderRadius: "50%",
    animation:   "spin 0.7s linear infinite",
  },
};

// inject spinner keyframes once
if (typeof document !== "undefined") {
  const id = "aa-spinner-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}