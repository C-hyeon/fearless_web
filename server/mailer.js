const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,     // 예: your_email@gmail.com
    pass: process.env.EMAIL_PASS      // 앱 비밀번호 또는 SMTP 비번
  }
});

async function sendVerificationEmail(to, code) {
  await transporter.sendMail({
    from: `"FearLess 인증" <${process.env.EMAIL_USER}>`,
    to,
    subject: "이메일 인증 코드",
    html: `<h3>인증 코드: ${code}</h3><p>5분 이내에 입력해주세요.</p>`
  });
}

module.exports = { sendVerificationEmail };