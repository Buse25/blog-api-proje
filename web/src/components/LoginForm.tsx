"use client";

import { useState } from "react";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);




  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/bloghome";

    } catch (err: any) {
      setError(err.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-3 bg-white p-6 rounded-2xl shadow">
      <h1 className="text-2xl font-bold">Giriş Yap</h1>

      <label className="block text-sm">
        E-posta
        <input
          className="input"
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
          className="input"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          required
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        className="btn"
        type="submit"
        disabled={loading}
        // className="w-full rounded-xl p-2 bg-black text-white disabled:opacity-50"
      >
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>

      <p className="btn">
        Hesabın yok mu? <a className="underline" href="/register">Kayıt ol</a>
      </p>
    </form>
  );
}
