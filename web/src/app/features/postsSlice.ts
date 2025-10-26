"use client";

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";

/* ===================== TYPES ===================== */

export type Author = {
  _id: string;
  username?: string;
  email: string;
};

export type Comment = {
  _id: string;
  content: string;
  author?: { username?: string; email?: string; _id?: string };
  createdAt?: string;
};

export type Post = {
  _id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  tags?: string[];
  author?: { username?: string; email?: string; _id?: string };
  likes?: string[];           // sende nasıl tutuluyorsa
  createdAt?: string;
  comments?: Comment[];
};

type ListResponse = {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

type Query = {
  page?: number;
  search?: string;
  sort?: string;             // "-createdAt" | "popular" | "-likes" vb.
  tags?: string[];           // ["js","node"] -> "js,node"
  categories?: string[];     // YENİ: ["Haber","Teknoloji"] -> "Haber,Teknoloji"
  append?: boolean;          // sonsuz scroll için
  limit?: number;            // örn. 5
};

/* ===================== THUNKS ===================== */

// Yorum ekleme (örnek)
export const addComment = createAsyncThunk(
  "posts/addComment",
  async (
    payload: { postId: string; text: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await api<Comment>(
        `/posts/${payload.postId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ text: payload.text }),
        },
        true
      );
      return { postId: payload.postId, comment: data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Yorum eklenemedi");
    }
  }
);

// Liste (filtre/sayfa)
export const fetchPosts = createAsyncThunk(
  "posts/fetch",
  async (params: Query = {}) => {
    const q = new URLSearchParams();

    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.sort) q.set("sort", params.sort);

    if (params.tags?.length) q.set("tags", params.tags.join(","));
    if (params.categories?.length) q.set("categories", params.categories.join(",")); // YENİ

    const data = await api<ListResponse>(`/posts?${q.toString()}`);
    return {
      ...data,
      __append: !!params.append,
      __query: {
        search: params.search,
        sort: params.sort,
        tags: params.tags,
        categories: params.categories, // YENİ
      },
    };
  }
);

// Yeni post oluştur
export const createPost = createAsyncThunk<Post, FormData, { rejectValue: string }>(
  "posts/create",
  async (fd, { rejectWithValue, getState }) => {
    try {
      const state: any = getState();
      const token =
        state?.auth?.token ||
        (typeof window !== "undefined" ? localStorage.getItem("token") : "");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/posts`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd, // FormData: Content-Type set etme
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e: any) {
      return rejectWithValue(e.message || "Oluşturulamadı");
    }
  }
);

// UPDATE (opsiyonel yeni resim)
export const updatePost = createAsyncThunk<
  Post,
  { id: string; data: FormData },
  { rejectValue: string }
>("posts/update", async ({ id, data }, { rejectWithValue, getState }) => {
  try {
    const state: any = getState();
    const token =
      state?.auth?.token ||
      (typeof window !== "undefined" ? localStorage.getItem("token") : "");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/posts/${id}`,
      {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: data,
      }
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e: any) {
    return rejectWithValue(e.message || "Güncellenemedi");
  }
});

// Like / Unlike (toggle)
export const toggleLike = createAsyncThunk(
  "posts/toggleLike",
  async (postId: string, { rejectWithValue }) => {
    try {
      const data = await api<{ likes: number; liked: boolean }>(
        `/posts/${postId}/like`,
        { method: "POST" },
        true
      );
      return { postId, ...data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Beğeni işlemi başarısız");
    }
  }
);

// Tekil post (detay)
export const fetchPostById = createAsyncThunk(
  "posts/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await api<Post>(`/posts/${id}`);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Detay yüklenemedi");
    }
  }
);

// DELETE
export const deletePost = createAsyncThunk(
  "posts/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api<void>(`/posts/${id}`, { method: "DELETE" }, true);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Silinemedi");
    }
  }
);

/* ===================== SLICE ===================== */

type PostsState = {
  items: Post[];
  loading: boolean;
  error: string | null;

  page: number;
  pages: number;
  hasMore: boolean;
  lastQuery: Omit<Query, "page" | "append">;

  current: Post | null;
  currentLoading: boolean;
  currentError: string | null;
};

const initialState: PostsState = {
  items: [],
  loading: false,
  error: null,

  page: 1,
  pages: 1,
  hasMore: true,
  lastQuery: {},

  current: null,
  currentLoading: false,
  currentError: null,
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    resetPosts: () => initialState,
    clearCurrent: (s) => {
      s.current = null;
      s.currentError = null;
      s.currentLoading = false;
    },
  },
  extraReducers: (b) => {
    /* ---- LISTE ---- */
    b.addCase(fetchPosts.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(
      fetchPosts.fulfilled,
      (
        s,
        a: PayloadAction<
          ListResponse & {
            __append: boolean;
            __query: {
              search?: string;
              sort?: string;
              tags?: string[];
              categories?: string[]; // YENİ
            };
          }
        >
      ) => {
        s.loading = false;

        const { items, page, pages, __append, __query } = a.payload;
        s.lastQuery = { ...(__query || {}) };

        if (__append) {
          const map = new Map(s.items.map((p) => [p._id, p]));
          for (const it of items) map.set(it._id, it);
          s.items = Array.from(map.values());
        } else {
          s.items = items;
        }

        s.page = page;
        s.pages = pages;
        s.hasMore = page < pages;
      }
    );
    b.addCase(fetchPosts.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) || a.error.message || "Hata";
    });

    /* ---- CREATE ---- */
    b.addCase(createPost.fulfilled, (s, a: PayloadAction<Post>) => {
      s.items = [a.payload, ...s.items];
    });

    /* ---- UPDATE ---- */
    b.addCase(updatePost.fulfilled, (s, a: PayloadAction<Post>) => {
      const i = s.items.findIndex((x) => x._id === a.payload._id);
      if (i !== -1) s.items[i] = a.payload;
      if (s.current && s.current._id === a.payload._id) s.current = a.payload;
    });

    /* ---- DELETE ---- */
    b.addCase(deletePost.fulfilled, (s, a: PayloadAction<string>) => {
      s.items = s.items.filter((x) => x._id !== a.payload);
      if (s.current && s.current._id === a.payload) s.current = null;
    });

    /* ---- LIKE TOGGLE ---- */
    b.addCase(
      toggleLike.fulfilled,
      (s, a: PayloadAction<{ postId: string; likes: number; liked: boolean }>) => {
        const p = s.items.find((x) => x._id === a.payload.postId);
        if (p) {
          const currentLen = p.likes?.length ?? 0;
          const targetLen = a.payload.likes;
          if (currentLen !== targetLen) {
            p.likes = new Array(targetLen).fill("x") as any;
          }
        }
        if (s.current && s.current._id === a.payload.postId) {
          const currentLen = s.current.likes?.length ?? 0;
          const targetLen = a.payload.likes;
          if (currentLen !== targetLen) {
            s.current.likes = new Array(targetLen).fill("x") as any;
          }
        }
      }
    );

    /* ---- SINGLE (DETAIL) ---- */
    b.addCase(fetchPostById.pending, (s) => {
      s.currentLoading = true;
      s.currentError = null;
      s.current = null;
    });
    b.addCase(fetchPostById.fulfilled, (s, a: PayloadAction<Post>) => {
      s.currentLoading = false;
      s.current = a.payload;
    });
    b.addCase(fetchPostById.rejected, (s, a) => {
      s.currentLoading = false;
      s.currentError = (a.payload as string) || a.error.message || "Hata";
    });
  },
});

export const { resetPosts, clearCurrent } = postsSlice.actions;
export default postsSlice.reducer;
