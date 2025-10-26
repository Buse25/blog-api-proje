"use client";

import { useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RegisterForm() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

 const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);
    try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form), // { email, password }
    });

    if (!res.ok) {
      // JSON mu text mi geldiyse yakala
      let msg = "Giriş başarısız";
      try {
        const j = await res.json();
        msg = j.message || JSON.stringify(j);
      } catch {
        msg = await res.text();
      }
      throw new Error(msg);
    }

    const data = await res.json(); // <-- BE: { token, user } bekliyoruz
    // emin olmak için bir kez bak:
    // console.log("login response:", data);

    // ÖNEMLİ: tarayıcı oturumunu kur
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // girişten sonra yönlendir
    window.location.href = "/bloghome";
  } catch (err: any) {
    setError(err.message || "Giriş hatası");
  } finally {
    setLoading(false);
  }
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-3 bg-white p-6 rounded-2xl shadow">
      <h1 className="text-2xl font-bold">Kayıt Ol</h1>

      <label className="block text-sm">
        Kullanıcı adı
        <input
          className="w-full border rounded p-2 mt-1"
          name="username"
          value={form.username}
          onChange={onChange}
          required
        />
      </label>

      <label className="block text-sm">
        E-posta
        <input
          className="w-full border rounded p-2 mt-1"
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          required
        />
      </label>

      <label className="block text-sm">
        Şifre
        <input
          className="w-full border rounded p-2 mt-1"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          minLength={6}
          required
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl p-2 bg-black text-white disabled:opacity-50"
      >
        {loading ? "Kaydediliyor..." : "Kayıt Ol"}
      </button>

      <p className="text-sm text-center">
        Hesabın var mı? <a className="underline" href="/">Giriş yap</a>
      </p>
    </form>
  );
}
