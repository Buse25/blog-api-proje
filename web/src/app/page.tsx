import LoginForm from "../components/LoginForm";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-3 bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold text-center mb-4">Giriş Yap</h1>
        <LoginForm />
      </div>
    </main>
  );
}

