"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchPosts, toggleLike } from "../app/features/postsSlice";

export default function PostsList() {
  const dispatch = useAppDispatch();
  const { items, loading, error, page, hasMore, lastQuery } = useAppSelector(
    (s) => s.posts
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstLoadRef = useRef(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const buildImgSrc = (u?: string | null) =>
    !u ? null : u.startsWith("http") ? u : `${API_URL}${u}`;

  const stripHtml = (html = ""): string => {
    if (!html) return "";
    if (typeof window === "undefined") {
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || (tmp as any).innerText || "").trim();
  };

  const snippet = (html = "", max = 180): string => {
    const t = stripHtml(html);
    return t.length > max ? t.slice(0, max) + "…" : t;
  };

  useEffect(() => {
    if (isFirstLoadRef.current && items.length === 0 && !loading) {
      isFirstLoadRef.current = false;
      dispatch(fetchPosts({ ...lastQuery, page: 1 }));
    }
  }, [dispatch, items.length, loading, lastQuery]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && hasMore) {
          dispatch(fetchPosts({ ...lastQuery, page: page + 1, append: true }));
        }
      },
      { rootMargin: "200px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [dispatch, hasMore, loading, page, lastQuery]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!items.length && loading) return <p>Yükleniyor…</p>;
  if (!items.length) return <p>Henüz gönderi yok.</p>;

  return (
    <div className="space-y-5">
      {items.map((p) => {
        const imgSrc = buildImgSrc(p.imageUrl);

        return (
          <article
            key={p._id}
            className="rounded-xl border p-5 bg-white shadow-sm hover:shadow-md transition-all"
          >
            {/* Kapak görseli */}
            {imgSrc && (
              <Link href={`/posts/${p._id}`} className="block mb-3">
                <img
                  src={imgSrc}
                  alt={p.title || "Kapak"}
                  className="w-full h-52 object-cover rounded-lg"
                  loading="lazy"
                />
              </Link>
            )}

            <Link href={`/posts/${p._id}`}>
              <h3 className="font-semibold text-lg hover:text-indigo-700 transition-colors">
                {p.title}
              </h3>
            </Link>

            <p className="text-sm text-gray-500 mb-1">
              {p.author?.username || p.author?.email || "Anonim"}
            </p>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {snippet(p.content, 180)}
            </p>

            <div className="flex items-center gap-3">
              {/* Devam butonu */}
              <Link
                href={`/posts/${p._id}`}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
              >
                Devamını oku →
              </Link>

              {/* Beğen butonu */}
              <button
                onClick={() => dispatch(toggleLike(p._id))}
                className="text-sm px-3 py-1.5 rounded-lg bg-yellow-400/80 hover:bg-yellow-400 border border-yellow-500 text-black transition"
              >
                👍 Beğen ({p.likes?.length ?? 0})
              </button>
            </div>
          </article>
        );
      })}

      {/* sonsuz scroll tetikleyici */}
      <div ref={sentinelRef} />

      <div className="text-center py-3 text-sm">
        {loading && <span>Daha fazla yükleniyor…</span>}
        {!hasMore && <span>Hepsi bu kadar 🎉</span>}
      </div>
    </div>
  );
}
