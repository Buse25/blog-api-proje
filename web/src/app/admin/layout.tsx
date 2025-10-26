// app/admin/layout.tsx
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-12">
      {/* Sidebar */}
      <aside className="col-span-3 bg-white border-r p-4">
        <h2 className="font-bold text-lg mb-4">Admin Panel</h2>
        <nav className="space-y-2">
          <Link href="/admin" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
            Gösterge Paneli
          </Link>
          <Link href="/admin/categories" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
            Kategoriler
          </Link>
          <Link href="/admin/users" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
            Kullanıcılar
          </Link>
          <Link href="/bloghome" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
            ← Blog’a dön
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <main className="col-span-9 p-6">{children}</main>
    </div>
  );
}
