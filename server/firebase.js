const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Firebase 서비스 계정 키 JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "fearless-3e591.appspot.com" // 실제 버킷 주소로 변경
});

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { db, auth, bucket };
