import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAf1oUFADpWudUlhXEfAv7_zXIgvEj1FRs",
  authDomain: "barometro-hotelero.firebaseapp.com",
  projectId: "barometro-hotelero",
  storageBucket: "barometro-hotelero.firebasestorage.app",
  messagingSenderId: "1090668450507",
  appId: "1:1090668450507:web:60700f92102fc9720d014e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
