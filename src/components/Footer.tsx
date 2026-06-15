import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">

        {/* Brand */}
        <div className="footer-col">
          <h3>🎨 Avijit Art</h3>
          <p className="muted">
            Your trusted printing and design shop in Durgapur, West Bengal.
            Quality work, fast delivery, best prices.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/products">Products</Link>
          <Link to="/about">About Us</Link>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
        </div>

        {/* Services */}
        <div className="footer-col">
          <h4>Our Services</h4>
          <p className="muted">🖼️ Flex Printing</p>
          <p className="muted">🔆 Laser Cutting</p>
          <p className="muted">🖨️ Digital Printing</p>
          <p className="muted">✂️ Sticker Cutting</p>
          <p className="muted">📑 Stamp Making</p>
          <p className="muted">💳 PVC Card</p>
        </div>

        {/* Contact */}
        <div className="footer-col">
          <h4>Contact Us</h4>
          <p className="muted">📌 Durgapur, West Bengal, India</p>
          <p className="muted">📧 admin@avijitart.com</p>
          <p className="muted">🕐 Mon–Sat: 9:00 AM – 8:00 PM</p>
          <p className="muted">🕐 Sunday: 10:00 AM – 4:00 PM</p>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Avijit Art. All rights reserved.</p>
        <p>Made with ❤️ in Durgapur</p>
      </div>
    </footer>
  );
}