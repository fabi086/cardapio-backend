import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { BusinessSettingsProvider } from './hooks/useBusinessSettings';
import Home from './pages/Home';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import Categories from './pages/admin/Categories';
import Banners from './pages/admin/Banners';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/admin/Orders';
import Customers from './pages/admin/Customers';
import Coupons from './pages/admin/Coupons';
import Settings from './pages/admin/Settings';
import OrderNotificationListener from './components/OrderNotificationListener';
import AIAgent from './pages/admin/AIAgent';




function App() {
  return (
    <CartProvider>
      <BusinessSettingsProvider>
        <Router>
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
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="categories" element={<Categories />} />
              <Route path="banners" element={<Banners />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="ai-agent" element={<AIAgent />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <OrderNotificationListener />
        </Router>
      </BusinessSettingsProvider>
    </CartProvider>
  );
}

export default App;
