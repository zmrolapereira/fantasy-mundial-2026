const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require("fs");

const firebaseConfig = {
  apiKey: "AIzaSyDiC2TFrfkFhgjkuqB6fK3zhis0wA_qUXI",
  authDomain: "fantasy-mundial-2026.firebaseapp.com",
  projectId: "fantasy-mundial-2026",
  storageBucket: "fantasy-mundial-2026.firebasestorage.app",
  messagingSenderId: "814775466865",
  appId: "1:814775466865:web:44c80fdf23e7d7732294d0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportFantasyEntries() {
  const snapshot = await getDocs(collection(db, "fantasyEntries"));

  const entries = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  fs.writeFileSync(
    "fantasyEntries-export.json",
    JSON.stringify(entries, null, 2),
    "utf8"
  );

  console.log(`Exportadas ${entries.length} fantasy entries.`);
}

exportFantasyEntries();