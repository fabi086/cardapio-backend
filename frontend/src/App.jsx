import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Marketing from './pages/admin/Marketing';
import Settings from './pages/admin/Settings';
import AIAgent from './pages/admin/AIAgent';

function App() {
    return (
        <ThemeProvider>
            <BusinessSettingsProvider>
                <CartProvider>
                    <Router>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Home />} />
                            <Route path="/order/:orderId" element={<OrderTracking />} />
                            <Route path="/admin/login" element={<Login />} />

                            {/* Admin Routes */}
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="products" element={<Products />} />
                                <Route path="products/new" element={<ProductForm />} />
                                <Route path="products/:id" element={<ProductForm />} />
                                <Route path="categories" element={<Categories />} />
                                <Route path="banners" element={<Banners />} />
                                <Route path="orders" element={<Orders />} />
                                <Route path="tables" element={<Tables />} />
                                <Route path="customers" element={<Customers />} />
                                <Route path="coupons" element={<Coupons />} />
                                <Route path="ai-agent" element={<AIAgent />} />
                                <Route path="marketing" element={<Marketing />} />
                                <Route path="settings" element={<Settings />} />
                            </Route>

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Router>
                </CartProvider>
            </BusinessSettingsProvider>
        </ThemeProvider>
    );
}

export default App;
