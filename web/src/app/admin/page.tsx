// app/admin/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminHome() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "/"; // giriş yoksa login'e
    // (opsiyonel) admin rol kontrolü:
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      if (user && user.role && user.role !== "admin") {
        window.location.href = "/bloghome";
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Gösterge Paneli</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/categories" className="card p-5 hover:shadow-md transition">
          <h3 className="font-semibold text-lg">Kategoriler</h3>
          <p className="muted mt-1">Kategori ekle/sil, isim düzenle</p>
        </Link>

        <Link href="/admin/users" className="card p-5 hover:shadow-md transition">
          <h3 className="font-semibold text-lg">Kullanıcılar</h3>
          <p className="muted mt-1">Kullanıcı listesini görüntüle</p>
        </Link>
      </div>
    </div>
  );
}
