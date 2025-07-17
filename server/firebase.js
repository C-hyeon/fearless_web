const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Firebase 서비스 계정 키 JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const bucket = admin.storage().bucket("fearless-3e591.firebasestorage.app"); 

module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth(),
  bucket,
};
