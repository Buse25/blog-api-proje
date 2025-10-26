"use client";

import { useEffect } from "react";
import BlogHome from "../../components/BlogHome";

export default function BlogHomePage() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "/"; // token yoksa girişe
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <BlogHome />
    </main>
  );
}
