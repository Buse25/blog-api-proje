"use client";
import { useEffect, useState } from "react";
import PostsList from "./PostsList";
import NewPostForm from "./NewPostForm";
import { Plus, Search, User, LogOut } from "lucide-react";
import { useAppDispatch } from "../app/hooks";
import { fetchPosts } from "../app/features/postsSlice";
import Link from "next/link";

type UserType = { _id: string; email: string; username?: string; role?: string };

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

export default function BlogHome() {
  const [user, setUser] = useState<UserType | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"latest" | "popular">("latest");
  const dispatch = useAppDispatch();

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  // 1) ilk yükleme + kategori/sekme değiştikçe ANINDA fetch
  useEffect(() => {
    dispatch(
      fetchPosts({
        page: 1,
        categories: selectedCats, // dizi olarak gönder
        sort: activeTab === "popular" ? "popular" : "-createdAt",
      })
    );
  }, [dispatch, selectedCats, activeTab]);

  // 2) sadece arama için debounce’lu fetch
  useEffect(() => {
    dispatch(
      fetchPosts({
        page: 1,
        search: debouncedSearch,
        categories: selectedCats,
        sort: activeTab === "popular" ? "popular" : "-createdAt",
      })
    );
  }, [dispatch, debouncedSearch]); // arama değişince tetikler

  // Artık dispatch'i burada çağırmıyoruz; sadece state set ediyoruz
  const toggleCat = (cat: string) =>
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );

  const setTab = (tab: "latest" | "popular") => setActiveTab(tab);

  const displayName =
    user?.username || (user?.email ? user.email.split("@")[0] : "") || "misafir";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <main className="min-h-screen bg-gray-50 relative">
      {/* Yeni post butonu */}
      <button
        onClick={() => setNewOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
        title="Yeni Blog Oluştur"
      >
        <Plus size={24} />
      </button>

      <section className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-6">
        {/* Sol kısım */}
        <div className="col-span-9 space-y-6">
          {/* Üst bar */}
                    <header className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">
              Hoş geldin, <span className="text-indigo-700">{displayName}</span>
            </h1>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center h-10 px-3 rounded-full bg-purple-600 text-white hover:bg-purple-700"
                title="Admin Panel"
              >
                Admin
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                title="Profilim"
              >
                <User size={18} />
              </Link>
              <button
                onClick={logout}
                title="Çıkış"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border hover:bg-gray-100"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>


          {/* Arama */}
          <div className="flex items-center gap-2 border rounded-lg bg-white px-3 py-2">
            <Search size={18} />
            <input
              type="text"
              placeholder="Arama yap..."
              className="flex-1 outline-none bg-transparent"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Sekmeler */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setTab("latest")}
              className={`px-4 py-2 rounded-lg border hover:bg-gray-100 ${activeTab === "latest" ? "bg-gray-100" : ""
                }`}
            >
              Son Yazılar
            </button>
            <button
              onClick={() => setTab("popular")}
              className={`px-4 py-2 rounded-lg border hover:bg-gray-100 ${activeTab === "popular" ? "bg-gray-100" : ""
                }`}
            >
              Popüler Bloglar
            </button>
          </div>

          {/* Liste */}
          <PostsList />
        </div>

        {/* Sağ filtre */}
        <aside className="col-span-3 bg-white p-4 rounded-xl shadow-sm h-fit">
          <h2 className="font-semibold mb-3 text-sm">Kategoriler</h2>
          <div className="space-y-2 text-sm">
            {CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCats.includes(cat)}
                  onChange={() => toggleCat(cat)}
                  className="accent-indigo-600"
                />
                {cat}
              </label>
            ))}
          </div>
        </aside>
      </section>

      <div className="text-center mt-8 pb-8">
        <button
          onClick={logout}
          className="inline-flex items-center rounded-lg border px-4 py-2"
        >
          Çıkış Yap
        </button>
      </div>

      <NewPostForm open={newOpen} onClose={() => setNewOpen(false)} />
    </main>
  );
}

/* debounce helper */
function useDebounce<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
