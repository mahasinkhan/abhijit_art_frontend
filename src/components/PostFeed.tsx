import { useEffect, useState } from "react";
import { fetchPosts, deletePost } from "../api";

interface Post {
  _id: string;
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  createdAt: string;
}

interface Props {
  isAdmin?: boolean;
  refreshKey?: number;
}

export default function PostFeed({ isAdmin = false, refreshKey = 0 }: Props) {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch {
      alert("Failed to delete post.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return (
    <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>
      Loading posts...
    </p>
  );

  if (!posts.length) return (
    <p style={{ color: "#666", textAlign: "center", padding: "40px 0" }}>
      No posts yet.
    </p>
  );

  return (
    <div style={s.feed}>
      {posts.map((post) => (
        <div key={post._id} style={s.card}>

          {/* Media */}
          {post.mediaType === "video" ? (
            <video src={post.mediaUrl} controls style={s.media} />
          ) : (
            <img src={post.mediaUrl} alt={post.caption} style={s.media} />
          )}

          {/* Body */}
          <div style={s.body}>
            <div style={s.header}>
              <div style={s.avatar}>AA</div>
              <div>
                <p style={s.shopName}>Avijit Art</p>
                <p style={s.date}>
                  {new Date(post.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              {/* Admin delete button */}
              {isAdmin && (
                <button
                  onClick={() => handleDelete(post._id)}
                  disabled={deleting === post._id}
                  style={{
                    ...s.deleteBtn,
                    opacity: deleting === post._id ? 0.5 : 1,
                    marginLeft: "auto",
                  }}
                >
                  {deleting === post._id ? "Deleting..." : "🗑 Delete"}
                </button>
              )}
            </div>

            {post.caption && (
              <p style={s.caption}>{post.caption}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  feed: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    maxWidth: 640,
    margin: "0 auto",
  },
  card: {
    background: "#1a1a2e",
    border: "1px solid #2a2a3e",
    borderRadius: 14,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    maxHeight: 500,
    objectFit: "cover",
    display: "block",
  },
  body:     { padding: "14px 16px 18px" },
  header:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: {
    width: 38, height: 38,
    background: "#e8552c",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 700, fontSize: 13,
    flexShrink: 0,
  },
  shopName: { color: "#fff", fontWeight: 600, fontSize: 14, margin: 0 },
  date:     { color: "#888", fontSize: 12, margin: 0 },
  caption:  { color: "#ccc", fontSize: 15, lineHeight: 1.6, margin: 0 },
  deleteBtn: {
    background: "transparent",
    border: "1px solid #e74c3c",
    color: "#e74c3c",
    padding: "5px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
};