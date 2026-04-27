import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type PrizePaymentMethod = "mbway" | "revolut" | "";

export type AppUserProfile = {
  uid: string;
  email: string;
  displayName: string;
  hasPaidAccess?: boolean;
  paymentStatus?: "pending" | "approved" | "rejected";
  paidAt?: unknown | null;

  phoneNumber?: string;
  prizePaymentMethod?: PrizePaymentMethod;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type PaymentRequest = {
  userId: string;
  email: string;
  displayName: string;
  amount: number;
  method: "mbway" | "revolut";
  paymentMethod?: "mbway" | "revolut";
  mbwayNumber?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt?: unknown;
  updatedAt?: unknown;
  approvedAt?: unknown | null;
  rejectedAt?: unknown | null;
};

export const getUserProfile = async (userId: string) => {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as AppUserProfile;
};

export const submitPaymentRequest = async (params: {
  userId: string;
  email: string;
  displayName: string;
  paymentMethod: "mbway" | "revolut";
}) => {
  const paymentRef = doc(db, "payments", params.userId);
  const paymentSnap = await getDoc(paymentRef);

  if (paymentSnap.exists()) {
    const existingPayment = paymentSnap.data() as PaymentRequest;

    if (existingPayment.status === "pending") {
      return { ok: true, status: "already_pending" as const };
    }

    if (existingPayment.status === "approved") {
      return { ok: true, status: "already_approved" as const };
    }

    if (existingPayment.status === "rejected") {
      await updateDoc(paymentRef, {
        email: params.email,
        displayName: params.displayName,
        amount: 10,
        method: params.paymentMethod,
        paymentMethod: params.paymentMethod,
        mbwayNumber: "918888416",
        status: "pending",
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        approvedAt: null,
        rejectedAt: null,
      });

      return { ok: true, status: "resent_after_rejected" as const };
    }
  }

  await setDoc(paymentRef, {
    userId: params.userId,
    email: params.email,
    displayName: params.displayName,
    amount: 10,
    method: params.paymentMethod,
    paymentMethod: params.paymentMethod,
    mbwayNumber: "918888416",
    status: "pending",
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedAt: null,
    rejectedAt: null,
  });

  const userRef = doc(db, "users", params.userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(
      userRef,
      {
        uid: params.userId,
        email: params.email,
        displayName: params.displayName,
        hasPaidAccess: false,
        paymentStatus: "pending",
        paidAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await setDoc(
      userRef,
      {
        uid: params.userId,
        email: params.email,
        displayName: params.displayName,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return { ok: true, status: "created" as const };
};

export const getPendingPayments = async () => {
  const q = query(collection(db, "payments"), where("status", "==", "pending"));
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => docSnap.data() as PaymentRequest);
};

export const getAllPayments = async () => {
  const snap = await getDocs(collection(db, "payments"));
  return snap.docs.map((docSnap) => docSnap.data() as PaymentRequest);
};

export const approvePayment = async (userId: string) => {
  const paymentRef = doc(db, "payments", userId);
  const userRef = doc(db, "users", userId);

  await updateDoc(paymentRef, {
    status: "approved",
    approvedAt: serverTimestamp(),
    rejectedAt: null,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(userRef, {
    hasPaidAccess: true,
    paymentStatus: "approved",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const rejectPayment = async (userId: string) => {
  const paymentRef = doc(db, "payments", userId);
  const userRef = doc(db, "users", userId);

  await updateDoc(paymentRef, {
    status: "rejected",
    rejectedAt: serverTimestamp(),
    approvedAt: null,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(userRef, {
    hasPaidAccess: false,
    paymentStatus: "rejected",
    paidAt: null,
    updatedAt: serverTimestamp(),
  });
};