import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");

  const change = (e: React.ChangeEvent<HTMLInputElement>) => 
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/services");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="card form-card">
      <h2>Create a client account</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label>Full name</label>
        <input name="name" value={form.name} onChange={change} required />
        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={change} required />
        <label>Phone</label>
        <input name="phone" value={form.phone} onChange={change} />
        <label>Password</label>
        <input type="password" name="password" value={form.password} onChange={change} required />
        <button className="btn" type="submit">Register</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}