import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB8g43jdXYyKE4F66NhcFO58SSRuSQz0YQ",
  authDomain: "fearless-3e591.firebaseapp.com",
  projectId: "fearless-3e591",
  storageBucket: "fearless-3e591.firebasestorage.app",
  messagingSenderId: "850791888262",
  appId: "1:850791888262:web:4336ee62ac93533ef6a807",
  measurementId: "G-N0XL1PHCTP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { auth };