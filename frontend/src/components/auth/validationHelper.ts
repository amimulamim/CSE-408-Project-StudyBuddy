import { set } from "date-fns";
import { errors, firebaseError } from "./errors"

const validateForm = ({userData}):errors => {
    const newErrors: errors = {};
    let isValid = true;

    const { name, password } = userData;
    
    // Validate name
    if (!name.trim()) {
      newErrors.name = "Full name is required";
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      newErrors.password = "Password must include both uppercase and lowercase letters";
      isValid = false;
    } else if (!/(?=.*\d)/.test(password)) {
      newErrors.password = "Password must include at least one number";
      isValid = false;
    }
    
    // Validate terms agreement
    if (!userData?.agreedToTerms) {
      newErrors.terms = "You must agree to the terms and conditions";
      isValid = false;
    }
    
    return newErrors;
};

const getFirebaseError = (error: any): firebaseError => {
    let field = "";
    let message = "";

    switch (error.code) {
        case "auth/invalid-email":
            field = "email";
            message = "Invalid email address";
            break;
        case "auth/weak-password":
            field = "password";
            message = "The password is too weak";
            break;
        case "auth/email-already-in-use":
            field = "email";
            message = "Email already in use";
            break;
        case "auth/user-not-found":
            field = "email";
            message = "No user found with this email";
            break;
        case "auth/wrong-password":
            field = "password";
            message = "Incorrect password";
            break;
        case "auth/operation-not-allowed":
            field = "general";
            message = "Operation not allowed";
            break;
        case "auth/too-many-requests":
            field = "general";
            message = "Too many requests. Please try again later";
            break;
        case "auth/invalid-credential":
            field = "general";
            message = "Invalid credentials";
            break;
        default:
            field = "general";
            message = error.message || "An unknown error occurred";
    }

    return { field, message };
}

const clearFieldError = (setErrors: React.Dispatch<React.SetStateAction<errors>>, field: Array<string>) => {
    setErrors((prev) => {
        const newErrors = { ...prev };
        field.forEach((f) => {
          if (newErrors[f]) {
            delete newErrors[f];
          }
        });
        return newErrors;
    });
}

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export { validateForm, getFirebaseError, clearFieldError, validateEmail };