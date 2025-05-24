interface errors {
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
    general?: string;
}

interface firebaseError {
    field: string;
    message: string;
}

export type { errors, firebaseError };