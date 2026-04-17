import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const listenToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);
  const existingUser = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "Utilizador",
      createdAt: existingUser.exists()
        ? existingUser.data().createdAt
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
      hasPaidAccess: existingUser.exists()
        ? existingUser.data().hasPaidAccess ?? false
        : false,
      paymentStatus: existingUser.exists()
        ? existingUser.data().paymentStatus ?? "pending"
        : "pending",
      paidAt: existingUser.exists()
        ? existingUser.data().paidAt ?? null
        : null,
    },
    { merge: true }
  );

  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};