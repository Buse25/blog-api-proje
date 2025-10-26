// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type User = { _id: string; email: string; username?: string; role?: string; createdAt?: string };

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await api<User[]>("/users", {}, true);
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Kullanıcılar alınamadı");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kullanıcılar</h1>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Kullanıcı</th>
              <th className="text-left p-3">Rol</th>
              <th className="text-left p-3">Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={3}>Yükleniyor…</td>
              </tr>
            ) : items.length ? (
              items.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{u.username || u.email.split("@")[0]}</div>
                    <div className="muted">{u.email}</div>
                  </td>
                  <td className="p-3">{u.role || "user"}</td>
                  <td className="p-3">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3" colSpan={3}>Hiç kullanıcı yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
