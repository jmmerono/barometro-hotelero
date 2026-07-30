import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let db: Firestore | undefined;

export function getAdminDb(): Firestore {
  if (!db) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS!)),
        });
    db = getFirestore(app);
  }
  return db;
}
