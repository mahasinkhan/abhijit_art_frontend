import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); setMenuOpen(false); };

  return (
    <header className="header">
      {/* Top bar */}
      <div className="header-top">
        <span>📞 Call us for orders</span>
        <span>📍 Durgapur, West Bengal, India</span>
        <span>🕐 Mon–Sat: 9AM – 8PM</span>
      </div>

      {/* Main nav */}
      <nav className="nav">
        <Link to="/" className="brand">
          🎨 <span>Avijit Art</span>
        </Link>

        {/* Hamburger for mobile */}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link>
          <Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
          {user && user.role === "client" && (
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link>
          )}
          {user && user.role === "admin" && (
            <Link to="/admin" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          )}
          {!user && (
            <Link to="/login" className="btn" onClick={() => setMenuOpen(false)}>Login</Link>
          )}
          {user && (
            <>
              <span className="hello">Hi, {user.name.split(" ")[0]}</span>
              <button className="btn-ghost" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}