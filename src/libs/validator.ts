export function isEmailValid(email: string): boolean {
    return /^[a-z][a-z0-9-_.]+\@[a-z][a-z0-9]+\.([a-z-_]{2,}|[a-z]{2,}\.[a-z-_]{2,})$/.test(email);
}

export function getPasswordErrors(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 8) errors.push("Kata sandi minimal 8 karakter");
    if (!/[A-Z]/.test(password)) errors.push("Harus mengandung huruf kapital");
    if (!/[0-9]/.test(password)) errors.push("Harus mengandung angka");
    if (!/[^A-Za-z0-9]/.test(password)) errors.push("Harus mengandung simbol");
    return errors;
}