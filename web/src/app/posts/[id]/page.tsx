// app/posts/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  addComment,
  fetchPostById,
  toggleLike,
  updatePost,
  deletePost,
} from "../../../app/features/postsSlice";

const CATEGORIES = [
  "Haber","Duyuru","Teknoloji","Yapay Zeka","Kişisel Blog","Uzman Masası","Ropörtajlar","Eğitim",
];

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { current, currentLoading, currentError } = useAppSelector((s) => s.posts);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const buildImgSrc = (u?: string | null) =>
    !u ? null : u.startsWith("http") ? u : `${API_URL}${u}`;

  // edit state
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  // yorum state
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (id) dispatch(fetchPostById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (current && editMode) {
      setTitle(current.title || "");
      setContentHtml(current.content || "");
      // not: burada cat’ler “tag” gibi geliyor — backend isim->ID dönüşümü yapıyor
      setCats(current.tags || []);
    }
  }, [current, editMode]);

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", contentHtml);
      cats.forEach((c) => fd.append("tags[]", c));
      await dispatch(updatePost({ id, data: fd })).unwrap();
      setEditMode(false);
    } catch (e: any) {
      alert(e.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm("Bu gönderiyi silmek istiyor musun?")) return;
    setDelBusy(true);
    try {
      await dispatch(deletePost(id)).unwrap();
      router.push("/bloghome");
    } catch (e: any) {
      alert(e.message || "Silinemedi");
    } finally {
      setDelBusy(false);
    }
  };

  const onLike = async () => {
    if (!id) return;
    try {
      await dispatch(toggleLike(id)).unwrap();
    } catch {}
  };

  const onSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const trimmed = text.trim();
    if (!trimmed) return setErr("Yorum boş olamaz");
    setErr(null);
    setSending(true);
    try {
      await dispatch(addComment({ postId: id, text: trimmed })).unwrap();
      setText("");
    } catch (e: any) {
      setErr(e.message || "Yorum eklenemedi");
    } finally {
      setSending(false);
    }
  };

  if (currentLoading) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </main>
    );
  }
  if (currentError)
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">{currentError}</p>
        <button onClick={() => router.back()} className="mt-4 border px-3 py-1 rounded">
          Geri
        </button>
      </main>
    );
  if (!current) return null;

  const likeCount = current.likes?.length ?? 0;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Üst aksiyonlar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => router.back()} className="border px-3 py-1 rounded hover:bg-gray-100">
          ← Geri
        </button>
        <button
          onClick={onLike}
          className="px-3 py-1 rounded border bg-yellow-400/90 hover:bg-yellow-400 text-black"
          title="Beğen"
        >
          👍 Beğen ({likeCount})
        </button>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="border px-3 py-1 rounded hover:bg-gray-100"
        >
          {editMode ? "İptal" : "Düzenle"}
        </button>
        <button
          onClick={onDelete}
          disabled={delBusy}
          className="border px-3 py-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {delBusy ? "Siliniyor..." : "Sil"}
        </button>
      </div>

      {/* Okuma modu */}
      {!editMode ? (
        <article className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
          {/* Kapak görseli */}
          {buildImgSrc(current.imageUrl) && (
            <img
              src={buildImgSrc(current.imageUrl)!}
              alt={current.title}
              className="w-full max-h-96 object-cover rounded-xl"
            />
          )}
          <header>
            <h1 className="text-2xl font-bold">{current.title}</h1>
            <p className="mt-1 text-sm opacity-80">
              Yazar: {current.author?.username || current.author?.email} •{" "}
              {current.createdAt ? new Date(current.createdAt).toLocaleDateString() : ""}
            </p>
          </header>

          {/* Etiket/kategori chip’leri */}
          {!!current.tags?.length && (
            <div className="flex flex-wrap gap-2">
              {current.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs border rounded-full px-2 py-1 bg-gray-50 hover:bg-gray-100"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* HTML içerik */}
          <div
            className="leading-relaxed prose max-w-none"
            dangerouslySetInnerHTML={{ __html: current.content || "" }}
          />
        </article>
      ) : (
        // Edit modu
        <form onSubmit={onSave} className="space-y-3 bg-white rounded-xl border p-6 shadow-sm">
          <input
            className="w-full border rounded p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık"
          />
          <textarea
            className="w-full border rounded p-2 min-h-[140px]"
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
            placeholder="İçeriği HTML olarak düzenle"
          />
          <div>
            <p className="text-sm font-medium mb-1">Kategoriler</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cats.includes(cat)}
                    onChange={() => toggleCat(cat)}
                    className="accent-indigo-600"
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={saving} className="border px-3 py-1 rounded bg-black text-white">
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button type="button" onClick={() => setEditMode(false)} className="border px-3 py-1 rounded">
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Yorumlar */}
      <section className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="font-semibold mb-3">Yorumlar</h3>

        {!!current.comments?.length ? (
          <ul className="space-y-3">
            {current.comments.map((cm) => (
              <li key={cm._id} className="border rounded p-3">
                <p className="text-sm opacity-70">
                  {cm.author?.username || cm.author?.email || "Anonim"} •{" "}
                  {cm.createdAt ? new Date(cm.createdAt).toLocaleString() : ""}
                </p>
                <p className="mt-1">{cm.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="opacity-70">Henüz yorum yok.</p>
        )}

        <form onSubmit={onSubmitComment} className="mt-4 flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Yorum yaz…"
          />
          <button
            disabled={sending}
            className="rounded px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
        </form>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      </section>
    </main>
  );
}
