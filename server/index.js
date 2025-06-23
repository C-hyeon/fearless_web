require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY;  // 환경변수 설정
let verificationCodes = {};                 // 메모리 저장

app.use(cors({
    origin: "http://localhost:5173",    // 클라이언트 주소
    credentials: true                   // 쿠키 전송 허용
}));
app.use(bodyParser.json());
app.use(cookieParser());

const USERS_FILE = path.join(__dirname, "users.json");

// JSON 파일 초기화
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
}

// 토큰 검증 미들웨어
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if(!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if(err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}


// 회원가입
app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    const data = JSON.parse(fs.readFileSync(USERS_FILE));
    const existing = data.users.find((u) => u.email === email);

    if (existing) {
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

    // token 생성
    const token = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: "1h" });
    
    // HTTP-Only 쿠키에 JWT 저장
    res.cookie("token", token, {
        httpOnly: true,
        secure: false,      // 배포(HTTPS)시 true
        sameSite: "lax",    // 대부분 ok
        maxAge: 3600000,    // 3600000 = 1시간
    });

    res.json({ message: "로그인 성공!", user });
});


// 로그아웃
app.post("/signout", (req, res) => {
    res.clearCookie("token");   // 쿠키 삭제
    res.json({ message: "로그아웃 성공!" });
});


// 쿠키 기반 로그인 상태 확인
app.get("/status", authenticateToken, (req, res) => {
    const data = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = data.users.find((u) => u.email === req.user.email);
    if(!user) return res.status(404).json({ loggedIn: false });
    res.json({ loggedIn: true, user });
});


// 이메일 인증 코드 요청
app.post("/request-verification", async(req, res)=>{
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 코드
    
    // 이메일 발송 설정
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "FearLess 인증코드",
        text: `인증코드는 ${code} 입니다.`
    };

    try{
        await transporter.sendMail(mailOptions);
        verificationCodes[email] = code;
        setTimeout(() => delete verificationCodes[email], 5*60*1000); // 5분후 만료
        res.json({ message: "인증코드 전송됨..." });
    } catch(err) {
        res.status(500).json({ message: "이메일 전송 실패!" });
    }
});


// 이메일 인증 코드 확인
app.post("/verify-code", (req, res)=>{
    const { email, code } = req.body;
    if(verificationCodes[email] === code) {
        return res.json({ success: true });
    } else {
        return res.status(400).json({ success: false, message: "인증 코드가 틀렸습니다!" });
    }
});


app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
