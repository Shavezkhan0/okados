import admin from 'firebase-admin';

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

let firebaseAdmin;

export const initFirebase = () => {
  if (!admin.apps.length) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: firebaseConfig.databaseURL,
    });
    console.log('Firebase Admin initialized');
  }
  return admin;
};

export { admin, firebaseAdmin };
export default { admin, initFirebase };
