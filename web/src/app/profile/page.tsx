// src/app/profile/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Post = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
};
type User = { _id: string; username?: string; email: string; role?: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// HTML'i özet metne çevir
const snippet = (html = "", max = 160) => {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"myposts" | "liked" | "comments">("myposts");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [commentedPosts, setCommentedPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/");
      return;
    }

    (async () => {
      try {
        // 🔴 düzeltildi: /user/me -> /users/me
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Yetkisiz veya sunucu hatası");

        const data = await res.json();
        const userObj: User | null = (data?.user as User) ?? (data as User) ?? null;
        if (!userObj) throw new Error("Kullanıcı bilgisi alınamadı");

        setUser(userObj);
        setMyPosts((data?.myPosts as Post[]) ?? []);
        setLikedPosts((data?.likedPosts as Post[]) ?? []);
        setCommentedPosts((data?.commentedPosts as Post[]) ?? []);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Profil yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <main className="p-6">Yükleniyor…</main>;

  if (error)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">{error}</p>
        <button onClick={() => router.push("/")} className="mt-3 border px-3 py-1 rounded">
          Ana sayfaya dön
        </button>
      </main>
    );

  if (!user)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p>Oturum bulunamadı.</p>
      </main>
    );

  const renderList = (list: Post[]) =>
    list.length ? (
      <div className="space-y-3">
        {list.map((p) => (
          <article key={p._id} className="border rounded-lg p-3">
            <h3 className="font-semibold text-lg">{p.title}</h3>
            <p className="text-sm opacity-80">{new Date(p.createdAt).toLocaleString()}</p>
            <p className="mt-1">{snippet(p.content, 160)}</p>
            <button
              onClick={() => router.push(`/posts/${p._id}`)}
              className="text-sm underline mt-2"
            >
              Görüntüle →
            </button>
          </article>
        ))}
      </div>
    ) : (
      <p className="opacity-70">Kayıt bulunamadı.</p>
    );

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <section className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">
          {user.username || user.email.split("@")[0]}
        </h1>
        <p className="opacity-80">{user.email}</p>
        {user.role && <p className="text-sm mt-1">Rol: {user.role}</p>}
      </section>

      <div className="flex gap-3 border-b pb-2">
        <button
          onClick={() => setTab("myposts")}
          className={`px-4 py-2 rounded ${tab === "myposts" ? "bg-gray-200" : ""}`}
        >
          Yazılarım
        </button>
        <button
          onClick={() => setTab("liked")}
          className={`px-4 py-2 rounded ${tab === "liked" ? "bg-gray-200" : ""}`}
        >
          Beğendiklerim
        </button>
        <button
          onClick={() => setTab("comments")}
          className={`px-4 py-2 rounded ${tab === "comments" ? "bg-gray-200" : ""}`}
        >
          Yorum Yaptıklarım
        </button>
      </div>

      {tab === "myposts" && renderList(myPosts)}
      {tab === "liked" && renderList(likedPosts)}
      {tab === "comments" && renderList(commentedPosts)}
    </main>
  );
}
