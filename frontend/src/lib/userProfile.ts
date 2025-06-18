import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase"; // adjust path as needed
import { User } from "firebase/auth"; // type

const saveUserProfile = async (user: User) => {
  try {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      onboardingDone: false,
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
};

const fetchUserProfileData = async (field: string): Promise<any> => {
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("No authenticated user.");
    }
  
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);
  
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      return userData[field] ?? null;
    } else {
      console.warn("User document does not exist.");
      return null;
    }
};

async function updateUserField(field: string, value: any): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("No authenticated user.");
    }

    const userRef = doc(db, "users", user.uid);

    try {
        await updateDoc(userRef, {
        [field]: value,
        });
    } catch (error) {
        console.error("Error updating user field:", error);
        throw error;
    }
}

export { saveUserProfile, updateUserField, fetchUserProfileData };