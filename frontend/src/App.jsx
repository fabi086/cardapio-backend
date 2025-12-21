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
import Marketing from './pages/admin/Marketing';
import Settings from './pages/admin/Settings';

// ... (inside Routes)
                  <Route path="ai-agent" element={<AIAgent />} />
                  <Route path="marketing" element={<Marketing />} />
                  <Route path="settings" element={<Settings />} />

export default App;
