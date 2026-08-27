import "@firebase/analytics";
import { FirebaseFirestore } from "@firebase/firestore-types";
import firebase, { analytics } from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.WEBPACK_FIREBASE_API_KEY,
  appId: process.env.WEBPACK_FIREBASE_APP_ID,
  authDomain: process.env.WEBPACK_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.WEBPACK_FIREBASE_DATABASE_URL,
  measurementId: process.env.WEBPACK_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.WEBPACK_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.WEBPACK_FIREBASE_PROJECT_ID,
  storageBucket: process.env.WEBPACK_FIREBASE_STORAGE_BUCKET,
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

analytics.isSupported().then((supported) => {
  if (supported) {
    firebase.analytics();
  }
});

const firestore: FirebaseFirestore = firebase.firestore();

export { firebase, firestore };

export default firestore;
