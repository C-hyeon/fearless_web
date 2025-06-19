const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const USERS_FILE = path.join(__dirname, "users.json");

// JSON 파일 초기화
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [], loggedInUser: null }, null, 2));
}

// 회원가입
app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    const data = JSON.parse(fs.readFileSync(USERS_FILE));
    const existingUser = data.users.find((user) => user.email === email);

    if (existingUser) {
        return res.status(400).json({ message: "이미 존재하는 이메일입니다." });
    }

    data.users.push({ name, email, password });
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

    res.json({ message: "회원가입 성공!" });
});

// 로그인
app.post("/signin", (req, res) => {
    const { email, password } = req.body;

    const data = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = data.users.find((u) => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    data.loggedInUser = email;
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

    res.json({ message: "로그인 성공!", user });
});

// 로그아웃
app.post("/signout", (req, res) => {
    const data = JSON.parse(fs.readFileSync(USERS_FILE));
    data.loggedInUser = null;
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    res.json({ message: "로그아웃 성공!" });
});

// 로그인 상태 확인
app.get("/status", (req, res) => {
    const data = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = data.users.find((u) => u.email === data.loggedInUser);
    res.json({ loggedIn: !!data.loggedInUser, user });
});

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
