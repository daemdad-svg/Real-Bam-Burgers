import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Contexts
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";

// Layouts
import { CustomerLayout } from "./layouts/CustomerLayout";
import { AdminLayout } from "./layouts/AdminLayout";

// Customer Pages
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import AuthPage from "./pages/AuthPage";
import LoyaltyPage from "./pages/LoyaltyPage";

// Admin Pages
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import POSPage from "./pages/admin/POSPage";
import KDSPage from "./pages/admin/KDSPage";
import MenuManagementPage from "./pages/admin/MenuManagementPage";
import ReportsPage from "./pages/admin/ReportsPage";
import CouponsPage from "./pages/admin/CouponsPage";

// API
import { seedAPI } from "./lib/api";

// Protected route wrapper for admin
const AdminProtectedRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }
  
  if (!admin) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Customer routes wrapper
const CustomerRoutes = () => {
  return (
    <CartProvider>
      <CustomerLayout>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="track/:orderNumber" element={<TrackOrderPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CustomerLayout>
    </CartProvider>
  );
};

// Admin routes wrapper
const AdminRoutes = () => {
  return (
    <Routes>
      <Route index element={<AdminLoginPage />} />
      <Route
        path="dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="pos"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <POSPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="kds"
        element={
          <AdminProtectedRoute>
            <KDSPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="menu"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <MenuManagementPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="reports"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <ReportsPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="coupons"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <div className="p-6">
                <h1 className="font-bebas text-4xl text-[#1e3a5f] mb-4">Coupons</h1>
                <p className="text-slate-500">Coupon management coming soon...</p>
              </div>
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="loyalty"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <div className="p-6">
                <h1 className="font-bebas text-4xl text-[#1e3a5f] mb-4">Loyalty Settings</h1>
                <p className="text-slate-500">Loyalty program settings coming soon...</p>
              </div>
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="customers"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <div className="p-6">
                <h1 className="font-bebas text-4xl text-[#1e3a5f] mb-4">Customers</h1>
                <p className="text-slate-500">Customer management coming soon...</p>
              </div>
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="settings"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <div className="p-6">
                <h1 className="font-bebas text-4xl text-[#1e3a5f] mb-4">Settings</h1>
                <p className="text-slate-500">Integration settings coming soon...</p>
              </div>
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

function App() {
  // Seed initial data on first load
  useEffect(() => {
    const initData = async () => {
      try {
        await seedAPI.seed();
        console.log("Initial data seeded");
      } catch (error) {
        // Data already seeded or other error
        console.log("Seed completed or already exists");
      }
    };
    initData();
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <Routes>
              {/* Admin routes */}
              <Route path="/admin/*" element={<AdminRoutes />} />
              
              {/* Customer routes */}
              <Route path="/*" element={<CustomerRoutes />} />
            </Routes>
            
            {/* Global Toast */}
            <Toaster 
              position="top-right" 
              richColors 
              closeButton
              toastOptions={{
                duration: 3000,
              }}
            />
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
