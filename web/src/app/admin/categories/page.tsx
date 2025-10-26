// app/admin/categories/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";

type Category = { _id: string; name: string; slug?: string };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "/";
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      if (user && user.role && user.role !== "admin") {
        window.location.href = "/bloghome";
      }
    } catch {}
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await api<Category[]>("/categories");
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Kategoriler alınamadı");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const slugFrom = useMemo(
    () => (txt: string) =>
      txt
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-ğüşöçı]/g, ""),
    []
  );

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const nm = name.trim();
    if (!nm) return;
    setBusy(true);
    setErr(null);
    try {
      const body = { name: nm, slug: slugFrom(nm) };
      const created = await api<Category>("/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }, true);
      setItems((prev) => [created, ...prev]);
      setName("");
    } catch (e: any) {
      setErr(e.message || "Kategori eklenemedi");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Bu kategoriyi silmek istiyor musun?")) return;
    setBusy(true);
    setErr(null);
    try {
      await api<void>(`/categories/${id}`, { method: "DELETE" }, true);
      setItems((prev) => prev.filter((c) => c._id !== id));
    } catch (e: any) {
      setErr(e.message || "Silinemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kategoriler</h1>

      <form onSubmit={onAdd} className="card p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium">Kategori Adı</label>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Teknoloji"
          />
          {name && (
            <p className="text-xs muted mt-1">
              slug: <code>{slugFrom(name)}</code>
            </p>
          )}
        </div>
        <button className="btn" disabled={busy || !name.trim()}>
          {busy ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Ad</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-right p-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={3}>Yükleniyor…</td>
              </tr>
            ) : items.length ? (
              items.map((c) => (
                <tr key={c._id} className="border-t">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.slug}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDelete(c._id)}
                      className="btn-subtle"
                      disabled={busy}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3" colSpan={3}>Hiç kategori yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
