import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="header" style={{ position: "sticky", top: 0, zIndex: 1000 }}>
      {/* Main nav */}
      <nav className="nav">
        {/* Logo */}
        <Link to="/" className="brand">
          <img
            src="/images/abhijit_art_logo.png"
            alt="Abhijit Art — For all printing solutions"
            className="brand-logo"
            style={{ height: 52, width: "auto", display: "block" }}
          />
        </Link>

        {/* Hamburger for mobile */}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* Nav links */}
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <Link to="/" className={isActive("/") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/services" className={isActive("/services") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>Services</Link>
          <Link to="/products" className={isActive("/products") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>Products</Link>
          <Link to="/about" className={isActive("/about") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/digital-marketing" className={isActive("/digital-marketing") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>Digital Marketing</Link>
          <Link to="/software-service" className={isActive("/software-service") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>Software Service</Link>

          {user && user.role === "client" && (
            <Link to="/my-bookings" className={isActive("/my-bookings") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>My Bookings</Link>
          )}
          {user && user.role === "admin" && (
            <Link to="/admin" className={isActive("/admin") ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>Dashboard</Link>
          )}

          <div className="nav-divider" />

          {!user && (
            <Link to="/login" className="nav-btn-outline" onClick={() => setMenuOpen(false)}>Login</Link>
          )}
          {!user && (
            <Link to="/register" className="nav-btn-solid" onClick={() => setMenuOpen(false)}>Register Free</Link>
          )}
          {user && (
            <>
              <div className="nav-user">
                <div className="nav-avatar">{user.name[0].toUpperCase()}</div>
                <span className="nav-username">{user.name.split(" ")[0]}</span>
              </div>
              <button className="nav-btn-outline" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}