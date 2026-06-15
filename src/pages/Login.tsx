import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/services");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="card form-card">
      <h2>Login</h2>
      <p className="muted">For both clients and the shop admin.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn" type="submit">Login</button>
      </form>
      <p className="muted">No account? <Link to="/register">Register as a client</Link></p>
    </div>
  );
}