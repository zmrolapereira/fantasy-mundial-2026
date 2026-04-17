import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const listenToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

async function ensureUserDocument(user: User) {
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
}

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  await ensureUserDocument(user);

  return user;
};

export const registerWithEmail = async (
  name: string,
  email: string,
  password: string
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;

  if (name.trim()) {
    await updateProfile(user, {
      displayName: name.trim(),
    });
  }

  await ensureUserDocument({
    ...user,
    displayName: name.trim() || user.displayName || "Utilizador",
  } as User);

  return result.user;
};

export const loginWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(result.user);
  return result.user;
};

export const resetUserPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const logoutUser = async () => {
  await signOut(auth);
};