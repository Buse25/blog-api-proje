require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// ============ DATABASE BAĞLANTISI ============
connectDB();

// ============ CORS AYARLARI ============
const allowedOrigins = [
  process.env.CLIENT_URL ||  'http://localhost:3000',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS izni yok'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// ============ STATIC FILES ============
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ============ HEALTH CHECK ============
app.get("/", (req, res) => {
  res.json({ message: "++++Server ayakta++++" });
});

// ============ ROUTES ============
// const authRoutes = require("./routes/auth");
// const userRoutes = require("./routes/user");
// const postRoutes = require("./routes/post");
// const commentRoutes = require("./routes/comment");
// const categoryRoutes = require("./routes/category");
// const tagRoutes = require("./routes/tag");


// app.use("/categories", categoryRoutes); // FE: /categories
// app.use("/users", userRoutes);          // FE: /users

// app.use("/categories", categoryRoutes);
// app.use("/tags", tagRoutes);



// app.use("/auth", authRoutes);
// // app.use("/user", userRoutes);
// // app.use("/posts", postRoutes);
// app.use("/posts/:id/comments", commentRoutes);
// app.use("/user", require("./routes/user"));
// app.use("/posts", require("./routes/post"));
// --- ROUTES: her biri sadece 1 kez tanımlansın ---
const authRoutes     = require("./routes/auth");       // varsa
const postRoutes     = require("./routes/post");
const categoryRoutes = require("./routes/category");
const tagRoutes      = require("./routes/tag");        // varsa
const userRoutes     = require("./routes/user");
const commentRoutes  = require("./routes/comment");    // varsa

// --- MOUNT: her biri sadece 1 kez kullanılsın ---
app.use("/auth", authRoutes);          // /auth/login, /auth/register vs. (varsa)
app.use("/posts", postRoutes);
app.use("/categories", categoryRoutes);
app.use("/tags", tagRoutes);           // varsa
app.use("/users", userRoutes);
app.use("/comments", commentRoutes);   // varsa




// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint bulunamadı" });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  if (err.message === 'CORS izni yok') {
    return res.status(403).json({ message: "CORS izni yok" });
  }
  console.error("Hata:", err.message);
  res.status(err.status || 500).json({ message: "Sunucu hatası" });
});

// ============ SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server çalışıyor: http://localhost:${PORT}`);
});