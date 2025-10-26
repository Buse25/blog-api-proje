// /src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function api<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = "İstek başarısız";
    try { const j = await res.json(); msg = j.message || JSON.stringify(j); }
    catch { msg = await res.text(); }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}
