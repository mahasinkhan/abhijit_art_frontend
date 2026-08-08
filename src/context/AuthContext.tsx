import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { login as loginApi, register as registerApi, getCurrentUser } from "../api";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (form: { name: string; email: string; phone: string; password: string }) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getCurrentUser()
        .then((res) => {
          setUser(res.data);
        })
        .catch((err) => {
          console.error("Token validation failed:", err.message);
          // Only logout if 401, not on network errors
          if (err.response?.status === 401) {
            localStorage.removeItem("token");
          }
          // Keep token if network error — user will try again
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginApi(email, password);
    const { user, token } = response.data;
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  };

  const register = async (form: { name: string; email: string; phone: string; password: string }) => {
    const response = await registerApi(form.email, form.password, form.name, form.phone);
    const { user, token } = response.data;
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}