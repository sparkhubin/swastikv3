import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';

// Icons Import
import { 
  ShieldAlert, 
  Clock, 
  Package, 
  Users, 
  MessageSquare, 
  Smartphone, 
  Activity, 
  UserCheck,
  Tag,
  FolderOpen,
  FileText,
  Image,
  Share2,
  Calendar,
  Lock,
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  User,
  Trash2,
  Plus,
  Key,
  Shield,
  HelpCircle,
  X,
  CheckCircle,
  Edit3,
  Sun,
  Moon,
  ChevronDown,
  Globe,
  Menu,
  MapPin,
  Database,
  CreditCard
} from 'lucide-react';

// Modular child subtab managers
import ProductsManager from './ProductsManager';
import CategoriesManager from './CategoriesManager';
import OrdersManager from './OrdersManager';
import OffersManager from './OffersManager';
import CustomersManager from './CustomersManager';
import PartnersManager from './PartnersManager';
import ReviewsManager from './ReviewsManager';
import PagesManager from './PagesManager';
import SecurityManager from './SecurityManager';
import SliderManager from './SliderManager';
import PaymentReports from './PaymentReports';
import LocationGroupsManager from './LocationGroupsManager';
import MargIntegration from './MargIntegration';
import PaymentSettings from './PaymentSettings';

export default function AdminDashboard({ onViewChange }) {
  const { isHindi } = useLanguage();
  const { 
    products, 
    categories,
    orders, 
    offers,
    customers,
    partners, 
    reviews, 
    contactMessages,
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    changeStaffPassword,
    userRole, 
    setUserRole,
    slides,
    locationGroups
  } = useData();

  // Authentication State
  const [loggedInStaff, setLoggedInStaff] = useState(() => {
    try {
      const saved = localStorage.getItem('swastik_logged_in_staff');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to parse swastik_logged_in_staff from localStorage:", e);
      return null;
    }
  });

  // Login Form States
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change Password Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [modalOldPassword, setModalOldPassword] = useState('');
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [modalStatus, setModalStatus] = useState({ success: null, message: '' });

  // Password Recovery Drawer States
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Enter phone, 2: OTP, 3: Password Update
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [incomingOTP, setIncomingOTP] = useState('');
  const [userTypedOTP, setUserTypedOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryLogs, setRecoveryLogs] = useState('');

  // Isolated Dashboard Date Range States (Requirement 2)
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-30');

  // Active Tab State (Auto-assigned inside useEffect based on permissions)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Theme Configuration State (Light/Dark Toggle)
  const [isAdminDark, setIsAdminDark] = useState(() => {
    const saved = localStorage.getItem('swastik_admin_theme');
    return saved !== 'light'; // Default is Dark mode
  });

  // 2. Multilevel menu tracker
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const toggleAdminTheme = () => {
    const nextVal = !isAdminDark;
    setIsAdminDark(nextVal);
    localStorage.setItem('swastik_admin_theme', nextVal ? 'dark' : 'light');
  };

  // Staff creation form states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffPerms, setNewStaffPerms] = useState(['orders']); // default to orders permission
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [newStaffStatus, setNewStaffStatus] = useState('enabled');

  // Synchronize and clamp active tab when staff logging logs in or shifts roles
  useEffect(() => {
    if (loggedInStaff) {
      const perms = loggedInStaff.permissions || [];
      if (perms.length > 0 && !perms.includes(activeTab)) {
        setActiveTab(perms[0]); // Defend routing leaks
      }
    }
  }, [loggedInStaff]);

  // Login Submission
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    const matched = staff.find(
      s => s.mobile.replace(/\s+/g, '') === loginMobile.replace(/\s+/g, '') && s.password === loginPassword
    );

    if (matched) {
      if (matched.status === 'disabled') {
        setLoginError('This staff workspace account has been disabled by Administrator nodes.');
        return;
      }
      setLoggedInStaff(matched);
      localStorage.setItem('swastik_logged_in_staff', JSON.stringify(matched));
      setUserRole(matched.permissions.includes('staff') ? 'admin' : 'manager');
    } else {
      setLoginError('Invalid credentials. Access Denied.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setLoggedInStaff(null);
    localStorage.removeItem('swastik_logged_in_staff');
    setUserRole('customer');
  };

  // Request Recovery OTP on WhatsApp (Requirement 8)
  const handleRequestOTP = () => {
    if (!recoveryPhone) {
      setRecoveryLogs('Please fill up your registered mobile coordinate.');
      return;
    }
    const matched = staff.find(s => s.mobile.replace(/\s+/g, '') === recoveryPhone.replace(/\s+/g, ''));
    if (!matched) {
      setRecoveryLogs('⚠️ This mobile number is not registered on the Swastik staff directory.');
      return;
    }

    const randomOTP = Math.floor(1000 + Math.random() * 9000).toString();
    setIncomingOTP(randomOTP);
    setRecoveryLogs(`[Meta API WA Debug Logs] 💬 Sent Outbound WhatsApp OTP to +91 ${recoveryPhone}: "Your Swastik staff security code is ${randomOTP}. Valid 5 mins."`);
    setRecoveryStep(2);
  };

  const verifyOTP = () => {
    if (userTypedOTP === incomingOTP) {
      setRecoveryLogs('✓ Security OTP matches successfully! Enter your new password below.');
      setRecoveryStep(3);
    } else {
      setRecoveryLogs('❌ Incorrect verification code. Check log output in green console.');
    }
  };

  const updateStaffForgotPass = () => {
    if (!newPassword) {
      setRecoveryLogs('Please select a non-empty password entry.');
      return;
    }
    const matched = staff.find(s => s.mobile.replace(/\s+/g, '') === recoveryPhone.replace(/\s+/g, ''));
    if (matched) {
      updateStaff(matched.id, { password: newPassword });
      setRecoveryLogs('✓ Success! Your system password has been reset. Proceed to login.');
      setTimeout(() => {
        setRecoveryStep(1);
        setShowForgot(false);
        setLoginMobile(recoveryPhone);
        setLoginPassword(newPassword);
      }, 2000);
    }
  };

  // Staff creation Super Admin CRUD
  const handleCreateStaffSubmit = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffMobile || !newStaffPassword) {
      alert('Please fill out all staff credentials.');
      return;
    }

    const payload = {
      name: newStaffName,
      mobile: newStaffMobile,
      password: newStaffPassword,
      permissions: newStaffPerms,
      status: newStaffStatus
    };

    if (editingStaffId) {
      updateStaff(editingStaffId, payload);
      setEditingStaffId(null);
      alert('✓ Staff Member permissions updated successfully.');
    } else {
      addStaff(payload);
      alert('✓ Staff Member registered on local Swastik Directory.');
    }

    setNewStaffName('');
    setNewStaffMobile('');
    setNewStaffPassword('');
    setNewStaffStatus('enabled');
    setNewStaffPerms(['orders']);
  };

  const handleStartStaffEdit = (s) => {
    setEditingStaffId(s.id);
    setNewStaffName(s.name);
    setNewStaffMobile(s.mobile);
    setNewStaffPassword(s.password);
    setNewStaffPerms(s.permissions || []);
    setNewStaffStatus(s.status || 'enabled');
  };

  const handleCancelStaffEdit = () => {
    setEditingStaffId(null);
    setNewStaffName('');
    setNewStaffMobile('');
    setNewStaffPassword('');
    setNewStaffPerms(['orders']);
    setNewStaffStatus('enabled');
  };

  const handleTogglePerm = (permKey) => {
    setNewStaffPerms(prev => 
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  const handleDeleteStaff = (id) => {
    if (id === 1) {
      alert('Cannot delete the root backup Super Admin.');
      return;
    }
    if (window.confirm('Strike off this staff identity from Swastik nodes?')) {
      deleteStaff(id);
    }
  };

  // Render Login state gate
  if (!loggedInStaff) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        
        {/* Background ambient lighting blobs */}
        <div className="absolute top-[-10%] left-[-10%] h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] h-80 w-80 rounded-full bg-pink-500/10 blur-[100px]"></div>

        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
          
          <div className="text-center space-y-1.5">
            <span className="text-[10px] bg-cyan-400/15 border border-cyan-400/20 text-cyan-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Restricted gate access</span>
            </span>
            <h1 className="text-2xl font-black text-white mt-2">Swastik Staff Vault</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Authentication required for administrative dashboard nodes</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Staff Registered Mobile</label>
              <input 
                type="text"
                required
                placeholder="e.g. 9999999999"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 px-4 py-3 rounded-xl text-xs placeholder-slate-700 font-mono focus:border-cyan-400/40 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Access PIN / Password</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForgot(true);
                    setRecoveryLogs('');
                    setRecoveryStep(1);
                  }}
                  className="text-[10px] text-cyan-400 font-extrabold hover:underline"
                >
                  Forgot Code?
                </button>
              </div>
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 px-4 py-3 rounded-xl text-xs placeholder-slate-700 focus:border-cyan-400/40 outline-none transition-all"
              />
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-[11px] font-bold text-center">
                ⚠️ {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 border border-cyan-300 transition-all active:scale-95"
            >
              Verify Credentials & Enter Panel
            </button>
          </form>

        </div>

        {/* Dynamic Forgot Password OTP Reset Drawer (Requirement 8) */}
        {showForgot && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-white/12 p-6 rounded-3xl space-y-5 relative shadow-2xl">
              
              <button 
                onClick={() => setShowForgot(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-all active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-white/10 pb-2.5 flex items-center gap-1.5">
                <Smartphone className="h-4.5 w-4.5 text-cyan-300" />
                <span>WhatsApp OTP Recover</span>
              </h3>

              {/* Step 1: Input registered mobile */}
              {recoveryStep === 1 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-normal">Enter your registered Swastik systems mobile number. We will dispatch a 4-digit reset OTP via simulated WhatsApp API.</p>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Registered phone (10-digit)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 9999999999"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs font-mono text-white"
                    />
                  </div>
                  <button 
                    onClick={handleRequestOTP}
                    className="w-full py-2 bg-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-cyan-500"
                  >
                    Send code via WhatsApp API
                  </button>
                </div>
              )}

              {/* Step 2: Code Verification */}
              {recoveryStep === 2 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-normal">OTP code is sent to your device. Review the green simulated Meta API logs outbox console below to copy the randomly generated OTP digits!</p>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Enter digits</label>
                    <input 
                      type="text" 
                      maxLength="4"
                      placeholder="e.g. 4910"
                      value={userTypedOTP}
                      onChange={(e) => setUserTypedOTP(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 px-3.5 py-2.5 rounded-xl text-center text-base tracking-widest font-mono font-black text-cyan-400"
                    />
                  </div>
                  <button 
                    onClick={verifyOTP}
                    className="w-full py-2 bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-emerald-500"
                  >
                    Confirm Validation OTP
                  </button>
                </div>
              )}

              {/* Step 3: Enter new password update */}
              {recoveryStep === 3 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-normal">Approved! Key in your new Swastik staff security gate password passcode below.</p>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">New system password</label>
                    <input 
                      type="password" 
                      placeholder="e.g. secretPass91"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                  <button 
                    onClick={updateStaffForgotPass}
                    className="w-full py-2 bg-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-cyan-500"
                  >
                    Confirm password modification
                  </button>
                </div>
              )}

              {/* Green Sandbox WA logger */}
              {recoveryLogs && (
                <div className="bg-slate-950 border border-emerald-500/20 p-3 rounded-xl font-mono text-[9px] text-emerald-400 leading-normal">
                  {recoveryLogs}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    );
  }

  // Get active staff layout parameters
  const authorizedTabs = loggedInStaff.permissions || [];

  return (
    <div className={`min-h-screen font-sans selection:bg-cyan-500 selection:text-slate-900 pb-20 transition-colors duration-200 ${isAdminDark ? 'bg-slate-950 text-white admin-theme-dark' : 'bg-slate-50 text-slate-900 admin-theme-light'}`}>
      
      {/* Dynamic CSS theme overrides */}
      <style>{`
        .admin-theme-light {
          background-color: #f8fafc !important;
          color: #0d1527 !important;
        }
        .admin-theme-light .bg-slate-900 {
          background-color: #ffffff !important;
        }
        .admin-theme-light .bg-slate-950 {
          background-color: #f1f5f9 !important;
        }
        .admin-theme-light .bg-slate-900\\/50,
        .admin-theme-light .bg-slate-900\\/55,
        .admin-theme-light .bg-slate-900\\/60,
        .admin-theme-light .bg-slate-950\\/20,
        .admin-theme-light .bg-slate-950\\/60,
        .admin-theme-light .bg-slate-950\\/80 {
          background-color: #f1f5f9 !important;
        }
        .admin-theme-light .border-white\\/10,
        .admin-theme-light .border-white\\/5,
        .admin-theme-light .border-white\\/12,
        .admin-theme-light .border-white\\/20 {
          border-color: #dee2e6 !important;
        }
        .admin-theme-light .text-white,
        .admin-theme-light .text-slate-100,
        .admin-theme-light .text-slate-200,
        .admin-theme-light .text-gray-150,
        .admin-theme-light .text-gray-200,
        .admin-theme-light .text-gray-300,
        .admin-theme-light .text-white\\/95,
        .admin-theme-light .text-white\\/90,
        .admin-theme-light .text-white\\/85,
        .admin-theme-light .text-white\\/80,
        .admin-theme-light .text-white\\/75,
        .admin-theme-light .text-white\\/70 {
          color: #0f172a !important; /* Slate 900 */
        }
        .admin-theme-light .text-slate-300,
        .admin-theme-light .text-slate-400,
        .admin-theme-light .text-white\\/60,
        .admin-theme-light .text-white\\/50 {
          color: #334155 !important; /* Slate 700 */
        }
        .admin-theme-light .text-slate-555,
        .admin-theme-light .text-slate-500,
        .admin-theme-light .text-white\\/40,
        .admin-theme-light .text-white\\/30 {
          color: #64748b !important; /* Slate 500 */
        }
        .admin-theme-light .bg-white\\/5 {
          background-color: #ffffff !important;
          border-color: #dee2e6 !important;
        }
        .admin-theme-light input,
        .admin-theme-light select,
        .admin-theme-light textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
          border-width: 1px !important;
        }
        .admin-theme-light table th, 
        .admin-theme-light table thead {
          background-color: #f8fafc !important;
          color: #0f172a !important;
          border-color: #dee2e6 !important;
        }
        .admin-theme-light tr:hover {
          background-color: #f1f5f9 !important;
        }
        .admin-theme-light .text-cyan-300,
        .admin-theme-light .text-cyan-400 {
          color: #0284c7 !important;
        }
        .admin-theme-light .text-amber-400 {
          color: #b45309 !important;
        }
        .admin-theme-light .text-emerald-450,
        .admin-theme-light .text-emerald-400 {
          color: #047857 !important;
        }
        .admin-theme-light .bg-cyan-500\\/10 {
          background-color: #e0f2fe !important;
          color: #0369a1 !important;
        }
        .admin-theme-light .bg-slate-950\\/60 {
          background-color: #f1f5f9 !important;
        }
      `}</style>
      
      {/* 1. Full Width Separate Dashboard Navbar */}
      <div className={`border-b px-4 sm:px-6 py-3 transition-all duration-200 sticky top-0 z-50 backdrop-blur-md ${isAdminDark ? 'bg-slate-950/90 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <div className="mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          
          {/* A. Left Core branding / title node & Mobile menu toggle button */}
          <div className="flex items-center justify-between lg:justify-start gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-left font-bold uppercase tracking-wider">
                <span className={`block font-black leading-none ${isAdminDark ? 'text-white' : 'text-slate-900'}`}>Swastik Operations Node</span>
                <span className="text-[8px] text-slate-400 font-mono font-black">Authorized Section 34A • Noida Sec-15</span>
              </div>
            </div>

            {/* Mobile/Tablet Operational Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
              title="Toggle Operations Navigation Menu"
            >
              <Menu className="h-4.5 w-4.5 text-cyan-400" />
            </button>
          </div>

          {/* B. Middle: Core Operations Navigation Menu (Responsive) */}
          <div className={`w-full lg:w-auto lg:flex items-center gap-2.5 transition-all ${isAdminMenuOpen ? 'flex flex-col lg:flex-row mt-3 lg:mt-0 border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0' : 'hidden lg:flex'}`} id="admin-operations-menu">
            
            {/* Backdrop behind active dropdowns to capture clicks outside */}
            {openMenuId && (
              <button 
                type="button"
                className="fixed inset-0 bg-transparent h-full w-full cursor-default z-35 focus:outline-none hidden lg:block" 
                onClick={() => setOpenMenuId(null)}
                aria-label="Close Menu"
              />
            )}

            {/* Group 1: Overview Tab */}
            {authorizedTabs.includes('dashboard') && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setOpenMenuId(null);
                  setIsAdminMenuOpen(false);
                }}
                className={`w-full lg:w-auto px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border flex items-center justify-between lg:justify-start gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-cyan-500/15 text-cyan-500 border-cyan-400/35 shadow-inner font-extrabold'
                    : 'border-transparent hover:bg-slate-500/10 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5"><Activity className="h-4 w-4" /> {isHindi ? "डैशबोर्ड (Dashboard)" : "Dashboard / डैशबोर्ड"}</span>
              </button>
            )}

            {/* Group 2: Storefront Catalog */}
            {['products', 'categories', 'sliders', 'offers'].some(t => authorizedTabs.includes(t)) && (
              <div className="relative w-full lg:w-auto z-40">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === 'catalog' ? null : 'catalog')}
                  className={`w-full lg:w-auto px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border flex items-center justify-between lg:justify-start gap-1.5 cursor-pointer ${
                    ['products', 'categories', 'sliders', 'offers'].includes(activeTab)
                      ? 'bg-cyan-500/15 text-cyan-500 border-cyan-400/35 shadow-inner font-extrabold'
                      : 'border-transparent hover:bg-slate-500/10 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Package className="h-4 w-4" /> {isHindi ? "कैटलॉग और दुकान" : "Catalog / कैटलॉग"}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openMenuId === 'catalog' ? 'rotate-180' : ''}`} />
                </button>
                {(openMenuId === 'catalog' || isAdminMenuOpen) && (
                  <div className={`lg:absolute lg:left-0 lg:mt-2 lg:w-64 rounded-xl p-1.5 shadow-2xl z-50 space-y-1 text-xs border ${
                    isAdminMenuOpen ? 'w-full bg-slate-900/40 border-white/5 pl-4 mt-1' : (isAdminDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200')
                  }`}>
                    {authorizedTabs.includes('products') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('products'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'products' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><Package className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "सामान और स्टॉक (Products)" : "Products & Stock / सामान"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{products.length}</span>
                      </button>
                    )}
                    {authorizedTabs.includes('categories') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('categories'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'categories' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "कैटेगरी (Categories)" : "Categories / कैटेगरी"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{categories.length}</span>
                      </button>
                    )}
                    {(authorizedTabs.includes('pages') || authorizedTabs.includes('sliders')) && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('sliders'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'sliders' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                        id="nav-sliders-tab"
                      >
                        <span className="flex items-center gap-2"><Image className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "होम बैनर फोटो (Banners)" : "Home Banners / होम बैनर"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{slides ? slides.length : 0}</span>
                      </button>
                    )}
                    {authorizedTabs.includes('offers') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('offers'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'offers' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "ऑफर और कूपन (Offers)" : "Offers & Coupons / कूपन"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{offers.length}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group 3: Operations & Logistics */}
            {['orders', 'payment-reports', 'locations', 'partners'].some(t => authorizedTabs.includes(t) || (t === 'payment-reports' && authorizedTabs.includes('orders')) || (t === 'locations' && authorizedTabs.includes('offers'))) && (
              <div className="relative w-full lg:w-auto z-40">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === 'logistics' ? null : 'logistics')}
                  className={`w-full lg:w-auto px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border flex items-center justify-between lg:justify-start gap-1.5 cursor-pointer ${
                    ['orders', 'payment-reports', 'locations', 'partners'].includes(activeTab)
                      ? 'bg-cyan-500/15 text-cyan-500 border-cyan-400/35 shadow-inner font-extrabold'
                      : 'border-transparent hover:bg-slate-500/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {isHindi ? "ऑर्डर और डिलीवरी" : "Orders & Delivery / ऑर्डर"}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openMenuId === 'logistics' ? 'rotate-180' : ''}`} />
                </button>
                {(openMenuId === 'logistics' || isAdminMenuOpen) && (
                  <div className={`lg:absolute lg:left-0 lg:mt-2 lg:w-64 rounded-xl p-1.5 shadow-2xl z-50 space-y-1 text-xs border ${
                    isAdminMenuOpen ? 'w-full bg-slate-900/40 border-white/5 pl-4 mt-1' : (isAdminDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200')
                  }`}>
                    {authorizedTabs.includes('orders') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('orders'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'orders' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "ऑर्डर लिस्ट (Orders)" : "Customer Orders / ऑर्डर"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{orders.length}</span>
                      </button>
                    )}
                    {authorizedTabs.includes('orders') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('payment-reports'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'payment-reports' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "पेमेंट रिपोर्ट (Payments)" : "Payment Reports / पेमेंट रिपोर्ट"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Ledger</span>
                      </button>
                    )}
                    {authorizedTabs.includes('offers') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('locations'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'locations' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "डिलीवरी एरिया (Delivery Areas)" : "Delivery Areas / डिलीवरी एरिया"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{locationGroups ? locationGroups.length : 0}</span>
                      </button>
                    )}
                    {authorizedTabs.includes('partners') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('partners'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'partners' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><Share2 className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "डिलीवरी पार्टनर्स (Drivers)" : "Delivery Partners / पार्टनर्स"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{partners.length}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group 4: Customers & Marketing */}
            {['customers', 'reviews'].some(t => authorizedTabs.includes(t)) && (
              <div className="relative w-full lg:w-auto z-40">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === 'customers-marketing' ? null : 'customers-marketing')}
                  className={`w-full lg:w-auto px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border flex items-center justify-between lg:justify-start gap-1.5 cursor-pointer ${
                    ['customers', 'reviews'].includes(activeTab)
                      ? 'bg-cyan-500/15 text-cyan-500 border-cyan-400/35 shadow-inner font-extrabold'
                      : 'border-transparent hover:bg-slate-500/10 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {isHindi ? "ग्राहक और फीडबैक" : "Customers & CRM / ग्राहक"}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openMenuId === 'customers-marketing' ? 'rotate-180' : ''}`} />
                </button>
                {(openMenuId === 'customers-marketing' || isAdminMenuOpen) && (
                  <div className={`lg:absolute lg:left-0 lg:mt-2 lg:w-64 rounded-xl p-1.5 shadow-2xl z-50 space-y-1 text-xs border ${
                    isAdminMenuOpen ? 'w-full bg-slate-900/40 border-white/5 pl-4 mt-1' : (isAdminDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200')
                  }`}>
                    {authorizedTabs.includes('customers') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('customers'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'customers' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5'}`}
                      >
                        <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "व्हाट्सएप ब्रॉडकास्ट (WhatsApp)" : "WhatsApp Broadcast / व्हाट्सएप"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-350' : 'bg-slate-100 text-slate-500'}`}>CRM</span>
                      </button>
                    )}
                    {authorizedTabs.includes('reviews') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('reviews'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'reviews' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "कस्टमर रिव्यू (Reviews)" : "Customer Reviews / कस्टमर रिव्यू"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{reviews.length}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group 5: Administration & Integrations */}
            {['staff', 'marg-billing', 'pages'].some(t => authorizedTabs.includes(t) || (t === 'marg-billing' && authorizedTabs.includes('offers'))) && (
              <div className="relative w-full lg:w-auto z-40">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === 'system-settings' ? null : 'system-settings')}
                  className={`w-full lg:w-auto px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border flex items-center justify-between lg:justify-start gap-1.5 cursor-pointer ${
                    ['staff', 'marg-billing', 'pages'].includes(activeTab)
                      ? 'bg-cyan-500/15 text-cyan-500 border-cyan-400/35 shadow-inner'
                      : 'border-transparent hover:bg-slate-500/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> {isHindi ? "सेटिंग्स और स्टाफ" : "Settings & Staff / सेटिंग्स"}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openMenuId === 'system-settings' ? 'rotate-180' : ''}`} />
                </button>
                {(openMenuId === 'system-settings' || isAdminMenuOpen) && (
                  <div className={`lg:absolute lg:left-0 lg:mt-2 lg:w-64 rounded-xl p-1.5 shadow-2xl z-50 space-y-1 text-xs border ${
                    isAdminMenuOpen ? 'w-full bg-slate-900/40 border-white/5 pl-4 mt-1' : (isAdminDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200')
                  }`}>
                    {authorizedTabs.includes('staff') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('staff'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'staff' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "स्टाफ मेंबर्स (Manage Staff)" : "Manage Staff / स्टाफ मेंबर्स"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{staff.length}</span>
                      </button>
                    )}
                    {authorizedTabs.includes('staff') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('payment-settings'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'payment-settings' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "भुगतान सेटिंग्स (Payment Settings)" : "Payment Gateway Settings / भुगतान सेटिंग्स"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>CF PG</span>
                      </button>
                    )}
                    {authorizedTabs.includes('offers') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('marg-billing'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'marg-billing' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><Database className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "मार्ग बिलिंग (MARG ERP)" : "MARG ERP Billing / मार्ग बिलिंग"}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase font-sans">Active</span>
                      </button>
                    )}
                    {authorizedTabs.includes('pages') && (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('pages'); setOpenMenuId(null); setIsAdminMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-[11px] font-bold cursor-pointer ${activeTab === 'pages' ? 'bg-cyan-500/20 text-cyan-500 font-extrabold' : 'hover:bg-slate-500/5 text-slate-400'}`}
                      >
                        <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? "कस्टम पेज (Custom Pages)" : "Custom Pages / कस्टम पेज"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* C. Right Actions controllers & User profile */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            
            {/* Go to Client Storefront */}
            {onViewChange && (
              <button 
                type="button"
                onClick={() => onViewChange('home')}
                className="px-2.5 py-1.5 border border-emerald-500/10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[9px] uppercase font-black font-sans"
                title="Return to Retail Customer Store App"
              >
                <Globe className="h-3 w-3" />
                <span>Store</span>
              </button>
            )}

            {/* Theme Toggle Switch */}
            <button 
              type="button"
              onClick={toggleAdminTheme}
              className={`p-1.5 rounded-xl border transition-all flex items-center gap-1 focus:outline-none ${isAdminDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'}`}
              title="Toggle Light or Dark Mode Layout"
            >
              {isAdminDark ? (
                <>
                  <Sun className="h-3 w-3 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3 w-3 text-cyan-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <span className="h-4 w-px bg-slate-500/20" />

            {/* Profile detail */}
            <div className="text-right hidden sm:block">
              <span className={`font-black font-sans block ${isAdminDark ? 'text-cyan-300' : 'text-cyan-705'}`}>{loggedInStaff.name}</span>
            </div>

            <button 
              onClick={() => setShowChangePasswordModal(true)}
              title="Change Passcode / PIN"
              className={`p-1.5 border rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 uppercase font-black ${
                isAdminDark 
                  ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300' 
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700 font-sans'
              }`}
            >
              <Key className="h-3 w-3" />
              <span>PIN</span>
            </button>

            <button 
              onClick={handleLogout}
              title="Disconnect Administrative Gate"
              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 uppercase font-black"
            >
              <LogOut className="h-3 w-3" />
              <span>Quit</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Fluid Area - 100% full width, no narrow restriction container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 space-y-8 max-w-none">
        
        {/* 2. Workspace Title Layout */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border p-6 rounded-3xl backdrop-blur-md ${isAdminDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="space-y-1">
            <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isAdminDark ? 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300' : 'bg-cyan-100 border-cyan-300 text-cyan-700'}`}>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Identity-Aware Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Swastik Administrative HQ
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Management modules governed by active staff clearances
            </p>
          </div>

          <div className={`flex items-center gap-2 border p-3 rounded-2xl ${isAdminDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
            <Activity className="h-5 w-5 text-cyan-550 animate-pulse text-cyan-400" />
            <div className="text-[10px] font-bold uppercase text-slate-400 leading-tight">
              <span>ACTIVE ROLE:</span>
              <span className={`block text-xs font-black ${isAdminDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{loggedInStaff.permissions.includes('staff') ? 'SUPER ADMIN' : 'WORKSPACE OPERATOR'}</span>
            </div>
          </div>
        </div>

        {/* 4. Active View Box - Expanded to 100% full width layout with border custom classes */}
        <div className={`border rounded-[32px] p-6 shadow-xl relative min-h-[550px] w-full max-w-none ${isAdminDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow'}`}>
            
            {/* Tab: Isolated Dashboard Analysis (Requirement 2) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Date filter selectors */}
                <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">1. Dashboard Analytics Filter</span>
                    <span className="text-[10px] bg-cyan-500/15 border border-cyan-400/20 px-2 py-0.5 rounded text-cyan-300 font-mono tracking-wider font-semibold">SEGMENT INDEX</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Data stream From Date</label>
                      <input 
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-white uppercase font-mono outline-none"
                      />
                    </div>

                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Data stream To Date</label>
                      <input 
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-white uppercase font-mono outline-none"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={() => alert('✓ Refreshing dynamic parameters for selected date coordinates...')}
                      className="sm:col-span-2 bg-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl border border-cyan-300 hover:bg-cyan-500 transition-all active:scale-95"
                    >
                      Filter Logs
                    </button>
                  </div>
                </div>

                {/* Dashboard statistics totals bento (Only on Dashboard page) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Products Listed", count: products.length, icon: Package, color: "text-cyan-400" },
                    { label: "Transit Volumes", count: orders.filter(x => x.isActive).length, icon: Clock, color: "text-amber-400" },
                    { label: "Active Partners", count: partners.length, icon: Share2, color: "text-emerald-400" },
                    { label: "Customer Feedbacks", count: reviews.length, icon: MessageSquare, color: "text-pink-400" }
                  ].map((stat, idx) => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={idx} className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">{stat.label}</span>
                          <span className="text-xl font-mono font-black text-white">{stat.count}</span>
                        </div>
                        <StatIcon className={`h-4 w-4 shrink-0 ${stat.color}`} />
                      </div>
                    );
                  })}
                </div>

                {/* Performance Graphs / Charts simulated layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Sales Delivery Trends */}
                  <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Operational Dispatch SLA Split (Transit Status split)</span>
                    <div className="relative h-44 flex items-end justify-between px-6 border-b border-white/10 pb-2">
                      
                      {/* Bar 1: Confirmed */}
                      <div className="flex flex-col items-center gap-1.5 w-12">
                        <div className="w-full bg-cyan-400/40 border border-cyan-400 rounded-t-lg transition-all hover:brightness-110" style={{ height: `${orders.filter(o => o.status === 'Confirmed' || !o.status).length * 40 || 25}px` }}></div>
                        <span className="text-[8px] font-black uppercase text-slate-400">Confirmed ({orders.filter(o => o.status === 'Confirmed' || !o.status).length})</span>
                      </div>

                      {/* Bar 2: In transit */}
                      <div className="flex flex-col items-center gap-1.5 w-12">
                        <div className="w-full bg-amber-400/40 border border-amber-400 rounded-t-lg transition-all hover:brightness-110 animate-pulse" style={{ height: `${orders.filter(o => o.status === 'In Transit' || o.status === 'Dispatched').length * 45 || 15}px`, minHeight: '10px' }}></div>
                        <span className="text-[8px] font-black uppercase text-slate-400">Transit ({orders.filter(o => o.status === 'In Transit' || o.status === 'Dispatched').length})</span>
                      </div>

                      {/* Bar 3: Delivered SUCCESS */}
                      <div className="flex flex-col items-center gap-1.5 w-12">
                        <div className="w-full bg-emerald-400/40 border border-emerald-400 rounded-t-lg transition-all hover:brightness-110" style={{ height: `${orders.filter(o => o.status === 'Delivered').length * 40 || 45}px` }}></div>
                        <span className="text-[8px] font-black uppercase text-emerald-400">Delivered ({orders.filter(o => o.status === 'Delivered').length})</span>
                      </div>

                    </div>
                  </div>

                  {/* Chart 2: Category volume split */}
                  <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">In-Stock Store departments count split</span>
                    <div className="space-y-2.5 pt-2">
                      {categories.map((c, index) => {
                        const count = products.filter(p => p.category === c.id).length;
                        const pct = Math.min(100, Math.round((count / (products.length || 1)) * 100));
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-white uppercase flex items-center gap-1 text-[9px] font-black">
                                <span>{c.icon || '📦'}</span> 
                                <span>{c.nameEn}</span>
                              </span>
                              <span className="text-slate-400 font-mono text-[9px]">{count} items ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                              <div className="bg-gradient-to-r from-cyan-400 to-pink-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* ITEM HIGH DEMAND / LOW DEMAND WIDGET (Requirement 2!) */}
                <div className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
                  <div className="border-b border-white/5 pb-2.5">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
                      <span>Inventory Demand & Stock-taking recommendations</span>
                    </h3>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Assesses item sales velocity index to avoid stockout or offer promotional rates</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* High Demand List (Green) */}
                    <div className="bg-slate-950 border border-emerald-500/20 p-4 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block border-b border-white/5 pb-1 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>High-demand (stock warnings index)</span>
                      </span>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold">
                          <div>
                            <p className="text-white">Amul Buffalo Fresh Milk (500ml)</p>
                            <p className="text-[9px] text-slate-500">Department: Dairy Essentials</p>
                          </div>
                          <span className="text-emerald-400 h-fit bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest animate-pulse">
                            VELOCITY: 98%
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] font-bold">
                          <div>
                            <p className="text-white">Fresh Premium Red Tomato (Desi)</p>
                            <p className="text-[9px] text-slate-500">Department: Farm Vegetables</p>
                          </div>
                          <span className="text-emerald-400 h-fit bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest">
                            VELOCITY: 85%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Low Demand List (Red coupon suggestions!) */}
                    <div className="bg-slate-950 border border-red-500/20 p-4 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-red-400 block border-b border-white/5 pb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Low-demand (clearance candidates)</span>
                      </span>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold">
                          <div>
                            <p className="text-white">Premium Hass Avocado (Gold)</p>
                            <p className="text-[9px] text-slate-500">Action: Run flat 30% discount code</p>
                          </div>
                          <span className="text-pink-400 h-fit bg-pink-500/10 border border-pink-500/25 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest leading-none">
                            VELOCITY: 12%
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] font-bold">
                          <div>
                            <p className="text-white">Imported Organic Crown Broccoli</p>
                            <p className="text-[9px] text-slate-500">Action: Bundle with cottage cheese</p>
                          </div>
                          <span className="text-pink-400 h-fit bg-pink-500/10 border border-pink-500/25 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest leading-none">
                            VELOCITY: 19%
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {activeTab === 'products' && (
              <ProductsManager 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                userRole={userRole}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesManager
                userRole={userRole}
              />
            )}
            
            {activeTab === 'orders' && (
              <OrdersManager 
                userRole={userRole}
              />
            )}

            {activeTab === 'payment-reports' && (
              <PaymentReports />
            )}

            {activeTab === 'offers' && (
              <OffersManager
                userRole={userRole}
              />
            )}

            {activeTab === 'locations' && (
              <LocationGroupsManager
                userRole={userRole}
              />
            )}

            {activeTab === 'marg-billing' && (
              <MargIntegration />
            )}

            {activeTab === 'customers' && (
              <CustomersManager
                userRole={userRole}
              />
            )}

            {activeTab === 'partners' && (
              <PartnersManager 
                userRole={userRole}
              />
            )}

            {activeTab === 'reviews' && (
              <ReviewsManager 
                userRole={userRole}
              />
            )}

            {activeTab === 'pages' && (
              <PagesManager
                userRole={userRole}
              />
            )}

            {activeTab === 'sliders' && (
              <SliderManager
                userRole={userRole}
              />
            )}

            {activeTab === 'payment-settings' && (
              <PaymentSettings isAdminDark={isAdminDark} />
            )}

            {/* Render Super-Admin specific Staff security gate tools (Requirement 8) */}
            {activeTab === 'staff' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Heading */}
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-lg font-black text-cyan-300 flex items-center gap-1.5">
                    <UserCheck className="h-5 w-5" />
                    <span>Simple Staff & Workspace Roles Index</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Add operational staff identities and assign checkbox checklist permissions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Register New Staff Member Form */}
                  <form onSubmit={handleCreateStaffSubmit} className="bg-slate-900 border border-white/10 p-5 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1 border-b border-white/5 pb-2.5 justify-between">
                      <span className="flex items-center gap-1">
                        <Plus className="h-4 w-4" />
                        <span>{editingStaffId ? `Amend Staff Clearance: ID ${editingStaffId}` : "Register Staff Account"}</span>
                      </span>
                      {editingStaffId && (
                        <button 
                          type="button" 
                          onClick={handleCancelStaffEdit}
                          className="text-red-400 font-extrabold text-[9px] uppercase hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </h4>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 block">Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Aman Patil (Logistics lead)"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block">Mobile contact</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. 9123456789"
                          value={newStaffMobile}
                          onChange={(e) => setNewStaffMobile(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs font-mono text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block">System password PIN</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            placeholder="staff123"
                            value={newStaffPassword}
                            onChange={(e) => setNewStaffPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs font-mono text-cyan-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Select: Enable / Disable options */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 block">Operational Status</label>
                      <select
                        value={newStaffStatus}
                        onChange={(e) => setNewStaffStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      >
                        <option value="enabled">🟢 Enabled / Authorized active</option>
                        <option value="disabled">🔴 Disabled / Suspended credentials</option>
                      </select>
                    </div>

                    {/* Checkbox Checklist of permissions (Requirement 8) */}
                    <div className="space-y-1.5 bg-slate-950 border border-white/10 p-4 rounded-2xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 block border-b border-white/5 pb-1">Define Clearances Checklist:</span>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
                        {[
                          { key: 'dashboard', label: '📊 Dashboard Charts' },
                          { key: 'products', label: '📦 Products Catalog' },
                          { key: 'categories', label: '🥦 Categories Manager' },
                          { key: 'orders', label: '🚚 Orders & Receipt Bills' },
                          { key: 'offers', label: '🏷️ Deals & Coupons' },
                          { key: 'customers', label: '👥 Manage Customer' },
                          { key: 'partners', label: '🧑‍🌾 Team & partners' },
                          { key: 'reviews', label: '💬 Reviews Moderator' },
                          { key: 'pages', label: '📄 Page Layouts Manager' },
                          { key: 'staff', label: '⚠️ Staff Roles Editor' }
                        ].map((pOpt) => {
                          const hasPerm = newStaffPerms.includes(pOpt.key);
                          return (
                            <label key={pOpt.key} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                              <input 
                                type="checkbox"
                                checked={hasPerm}
                                onChange={() => handleTogglePerm(pOpt.key)}
                                className="accent-cyan-400"
                              />
                              <span className={hasPerm ? "text-cyan-300 font-extrabold" : "text-slate-400 font-semibold"}>
                                {pOpt.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        className="w-full bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl border border-cyan-300 hover:bg-cyan-500 transition-all active:scale-95 cursor-pointer"
                      >
                        {editingStaffId ? "Save Configurations" : "Save Staff permissions clearance"}
                      </button>
                      {editingStaffId && (
                        <button 
                          type="button"
                          onClick={handleCancelStaffEdit}
                          className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {/* List registered staff */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-white pb-2.5 border-b border-white/10">Active systems directory ({staff.length})</h4>
                    
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {staff.map((s) => (
                        <div key={s.id} className="bg-slate-900 border border-white/10 p-4 rounded-2xl space-y-2 flex justify-between items-start">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-black text-white">{s.name}</h5>
                              {s.status === 'disabled' ? (
                                <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 text-[8px] font-mono uppercase rounded font-black">Suspended</span>
                              ) : (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[8px] font-mono uppercase rounded font-black">Active</span>
                              )}
                            </div>
                            <p className="font-mono text-[10px] text-slate-400">Mobile: +91 {s.mobile} • Password: <span className="text-cyan-300 font-bold bg-white/5 border border-white/5 px-1 py-0.5 rounded">{s.password}</span></p>
                            
                            <div className="flex flex-wrap gap-1 pt-1">
                              {s.permissions.map((pSub) => (
                                <span key={pSub} className="bg-slate-950 border border-white/5 text-slate-400 font-bold font-mono text-[8px] px-1.5 py-0.5 rounded tracking-tighter uppercase">
                                  {pSub}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleStartStaffEdit(s)}
                              title="Update member details & status"
                              className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-300 transition shrink-0"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {s.id !== 1 && (
                              <button 
                                onClick={() => handleDeleteStaff(s.id)}
                                title="Strike off partner identity"
                                className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-405 hover:bg-red-500/20 transition-all shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

          {/* Change Password Modal */}
          {showChangePasswordModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`w-full max-w-sm rounded-3xl p-6 border ${isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-950'} space-y-4 shadow-2xl`}>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-cyan-400" />
                    <span>Change Password PIN</span>
                  </h3>
                  <button 
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setModalStatus({ success: null, message: '' });
                      setModalOldPassword('');
                      setModalNewPassword('');
                    }}
                    className="text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-slate-400 block font-black mb-1">Registered Staff Mobile</label>
                    <input 
                      type="text" 
                      disabled
                      value={loggedInStaff.mobile}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold ${isAdminDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-slate-400 block font-black mb-1">Current Password / PIN</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={modalOldPassword}
                      onChange={(e) => setModalOldPassword(e.target.value)}
                      className={`w-full border px-3.5 py-2.5 rounded-xl outline-none text-xs font-bold ${isAdminDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-350 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-slate-400 block font-black mb-1">New Password / PIN</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={modalNewPassword}
                      onChange={(e) => setModalNewPassword(e.target.value)}
                      className={`w-full border px-3.5 py-2.5 rounded-xl outline-none text-xs font-bold ${isAdminDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-350 text-slate-900'}`}
                    />
                  </div>
                  {modalStatus.message && (
                    <p className={`text-[11px] font-bold ${modalStatus.success ? 'text-emerald-400' : 'text-rose-455'}`}>
                      {modalStatus.message}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowChangePasswordModal(false);
                        setModalStatus({ success: null, message: '' });
                        setModalOldPassword('');
                        setModalNewPassword('');
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-wider border ${isAdminDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-100'}`}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={async () => {
                        if (!modalOldPassword || !modalNewPassword) {
                          setModalStatus({ success: false, message: 'Please cover all password parameters.' });
                          return;
                        }
                        const payload = await changeStaffPassword(loggedInStaff.mobile, modalOldPassword, modalNewPassword);
                        if (payload.success) {
                          setModalStatus({ success: true, message: '✓ PIN Updated!' });
                          const updated = { ...loggedInStaff, password: modalNewPassword };
                          setLoggedInStaff(updated);
                          localStorage.setItem('swastik_logged_in_staff', JSON.stringify(updated));
                          setTimeout(() => {
                            setShowChangePasswordModal(false);
                            setModalStatus({ success: null, message: '' });
                            setModalOldPassword('');
                            setModalNewPassword('');
                          }, 1500);
                        } else {
                          setModalStatus({ success: false, message: `❌ ${payload.error || 'Identity mismatch rejection.'}` });
                        }
                      }}
                      className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>

        </div>

      </div>
  );
}
