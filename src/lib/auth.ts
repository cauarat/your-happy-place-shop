const AUTH_KEY = "villaoro_admin_auth";

export const loginAdmin = (password: string) => {
  if (password === "password") {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
};

export const logoutAdmin = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const isAuthenticated = () => {
  return localStorage.getItem(AUTH_KEY) === "true";
};
