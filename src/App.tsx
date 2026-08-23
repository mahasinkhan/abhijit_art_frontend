import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatWidget from "./components/ChatWidget";
import ScrollToTop from "./components/ScrollToTop";
import SmoothScroll from "./components/SmoothScroll";
import ScrollProgress from "./components/ScrollProgress";

const Home             = lazy(() => import("./pages/Home"));
const Login            = lazy(() => import("./pages/Login"));
const Register         = lazy(() => import("./pages/Register"));
const Services         = lazy(() => import("./pages/Services"));
const About            = lazy(() => import("./pages/About"));
const Portfolio        = lazy(() => import("./pages/Portfolio"));
const SoftwareService  = lazy(() => import("./pages/SoftwareService"));
const DigitalMarketing = lazy(() => import("./pages/DigitalMarketing"));
const MyBookings       = lazy(() => import("./pages/MyBookings"));
const BookingDetails   = lazy(() => import("./pages/BookingDetails"));
const AdminDashboard   = lazy(() => import("./pages/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));

/* Renders the app chrome (header/footer/chat) on every page except the
   dashboard, employee portal, and auth pages. */
function Shell() {
  const location = useLocation();
  const bareRoutes = ["/login", "/register"];
  const bare =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/employee") ||
    bareRoutes.includes(location.pathname);

  return (
    <>
      {!bare && <Header />}
      <main>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/register"          element={<Register />} />
            <Route path="/services"          element={<Services />} />
            <Route path="/about"             element={<About />} />
            <Route path="/portfolio"         element={<Portfolio />} />
            <Route path="/software-service"  element={<SoftwareService />} />
            <Route path="/digital-marketing" element={<DigitalMarketing />} />
            <Route path="/my-bookings"       element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/my-bookings/:id"   element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
            <Route path="/admin"             element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            {/* Employee portal — bare page, no Header/Footer/Chat */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute employeeOnly>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
      {!bare && <ChatWidget />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SmoothScroll />
        <ScrollToTop />
        <ScrollProgress />
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
