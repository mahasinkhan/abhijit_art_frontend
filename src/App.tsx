import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatWidget from "./components/ChatWidget"; // ✅ floating chatbot
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Services from "./pages/Services";
import Products from "./pages/Products";
import About from "./pages/About";
import SoftwareService from "./pages/SoftwareService";
import DigitalMarketing from "./pages/DigitalMarketing";
import MyBookings from "./pages/MyBookings";
import AdminDashboard from "./pages/AdminDashboard";

/* Renders the app chrome (header/footer/chat) on every page except the dashboard. */
function Shell() {
  const location = useLocation();
  const bare = location.pathname.startsWith("/admin"); // dashboard = no marketing chrome

  return (
    <>
      {!bare && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<Services />} />
          <Route path="/products" element={<Products />} />
          <Route path="/about" element={<About />} />
          <Route path="/software-service" element={<SoftwareService />} />
          <Route path="/digital-marketing" element={<DigitalMarketing />} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
      {!bare && <Footer />}
      {!bare && <ChatWidget />} {/* floats on every page except the dashboard */}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}