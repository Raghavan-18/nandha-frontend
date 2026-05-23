// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBD-_c1ixS8uNTXemeywK16pKKGit2n4UU",
  authDomain: "smart-oilseed-advisor.firebaseapp.com",
  projectId: "smart-oilseed-advisor",
  storageBucket: "smart-oilseed-advisor.firebasestorage.app",
  messagingSenderId: "1015916471848",
  appId: "1:1015916471848:web:816ea8bad411aebb18771d",
  measurementId: "G-YJEMPD9KMN"
};

// Initialize Firebase using the global/compat SDK loaded via scripts
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  console.log("Firebase initialized successfully.");
} else {
  console.warn("Firebase SDK not loaded yet.");
}
