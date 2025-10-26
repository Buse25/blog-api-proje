// NewPostForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { useAppDispatch } from "../app/hooks";
import { createPost } from "../app/features/postsSlice";

// SSR güvenli Quill
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

type Props = { open: boolean; onClose: () => void };

const CATEGORIES = [
  "Haber",
  "Duyuru",
  "Teknoloji",
  "Yapay Zeka",
  "Kişisel Blog",
  "Uzman Masası",
  "Ropörtajlar",
  "Eğitim",
];

export default function NewPostForm({ open, onClose }: Props) {
  const dispatch = useAppDispatch();

  const [title, setTitle] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const [cats, setCats] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "blockquote", "code-block"],
        [{ align: [] }],
        ["clean"],
      ],
    }),
    []
  );

  const plainLength = useMemo(() => {
    const el = typeof window !== "undefined" ? window.document.createElement("div") : null;
    if (!el) return 0;
    el.innerHTML = html || "";
    const text = el.textContent || (el as any).innerText || "";
    return text.trim().length;
  }, [html]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Modal kapanınca reset
  useEffect(() => {
    if (open) return;
    setTitle("");
    setHtml("");
    setCats([]);
    setImage(null);
    setErr(null);
    setLoading(false);
  }, [open]);

  const toggleCat = (c: string) =>
    setCats(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", html);
      cats.forEach(c => fd.append("categories[]", c)); // SADECE KATEGORİ
      if (image) fd.append("image", image);

      await dispatch(createPost(fd)).unwrap();
      onClose();
    } catch (ex: any) {
      setErr(ex?.message || "Kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div ref={dialogRef} className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Başlık */}
          <div className="px-5 py-4 border-b">
            <h3 className="text-lg font-semibold text-center">Yeni Gönderi</h3>
          </div>

          {/* Gövde (scrollable) */}
          <form onSubmit={submit} className="px-5 py-4 max-h-[70vh] overflow-auto space-y-4">
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Başlık"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
            />

            <div className="border rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={html}
                onChange={(val: string) => setHtml(val)}
                modules={modules}
                placeholder="İçeriği buraya yazın…"
              />
            </div>

            {/* Kapak görseli (opsiyonel) */}
            <div>
              <div className="text-sm font-medium mb-1">Kapak Görseli (isteğe bağlı)</div>
              <input
                type="file"
                accept="image/*"
                onChange={e => setImage(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              {image && <p className="text-xs opacity-70 mt-1">Seçilen: {image.name}</p>}
            </div>

            {/* Kategoriler (SADECE CHECKBOX) */}
            <div>
              <div className="text-sm font-medium mb-2">Kategoriler</div>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={cats.includes(c)}
                      onChange={() => toggleCat(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {/* Uyarılar */}
            {title && title.trim().length < 5 && (
              <p className="text-xs text-red-600">Başlık en az 5 karakter olmalı.</p>
            )}
            {plainLength > 0 && plainLength < 10 && (
              <p className="text-xs text-red-600">
                İçerik en az 10 karakter olmalı. (Şu an {plainLength})
              </p>
            )}
            {err && <p className="text-sm text-red-600">{err}</p>}
          </form>

          {/* Sticky footer */}
          <div className="px-5 py-3 border-t bg-white sticky bottom-0 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 border"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              formAction=""
              onClick={submit}
              disabled={loading || title.trim().length < 5 || plainLength < 10 || cats.length === 0}
              className="rounded-lg px-4 py-2 border bg-black text-white disabled:opacity-50"
              title={cats.length === 0 ? "En az bir kategori seçmelisin" : ""}
            >
              {loading ? "Kaydediliyor..." : "Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
