import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { BusinessSettingsProvider } from './hooks/useBusinessSettings';
import AdminLayout from './layouts/AdminLayout';
import Home from './pages/Home';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import Categories from './pages/admin/Categories';
import Banners from './pages/admin/Banners';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/admin/Orders';
import Tables from './pages/admin/Tables';
import Customers from './pages/admin/Customers';
import Coupons from './pages/admin/Coupons';
import Settings from './pages/admin/Settings';
import AIAgent from './pages/admin/AIAgent';
import Kitchen from './pages/admin/Kitchen';
import Reports from './pages/admin/Reports';
import DeliveryZones from './pages/admin/DeliveryZones';
import FloatingCart from './components/FloatingCart';
import TableBanner from './components/TableBanner';

function App() {
  return (
    <Router>
      <CartProvider>
        <BusinessSettingsProvider>
          <ThemeProvider>
            <div className="bg-stone-50 dark:bg-stone-950 min-h-screen font-sans transition-colors duration-300">
              <TableBanner />
              <Routes>

                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/order/:id" element={<OrderTracking />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<Login />} />

                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="tables" element={<Tables />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/new" element={<ProductForm />} />
                  <Route path="products/:id" element={<ProductForm />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="banners" element={<Banners />} />
                  <Route path="coupons" element={<Coupons />} />
                  <Route path="kitchen" element={<Kitchen />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="delivery-zones" element={<DeliveryZones />} />
                  <Route path="ai-agent" element={<AIAgent />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
              <FloatingCart />
            </div>
          </ThemeProvider>
        </BusinessSettingsProvider>
      </CartProvider>
    </Router>
  );
}

export default App;
