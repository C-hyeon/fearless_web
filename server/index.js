require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const mailRoutes = require("./routes/mail");
const itemRoutes = require("./routes/item");
const playtimeRoutes = require("./routes/playtime");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(authRoutes);
app.use(userRoutes);
app.use(mailRoutes);
app.use(itemRoutes);
app.use(playtimeRoutes);

app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 🚀 서버 실행 중: http://localhost:${PORT}`);
});
