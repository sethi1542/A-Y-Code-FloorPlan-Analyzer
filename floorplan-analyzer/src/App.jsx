import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import VerifyCode from "./components/VerifyCode";
import Dashboard from "./components/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import UploadForm from "./components/UploadForm";
import ResultsDisplay from "./components/ResultsDisplay";
import LoadingSpinner from "./components/LoadingSpinner";
import FeedbackForm from "./components/FeedbackForm";
import Subscription from "./components/Subscription";
import AdminPanel from './components/AdminPanel';
import AdminRoute from './components/AdminRoute';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  return (
    <div className="min-h-screen  bg-gray-900">
      <Navbar />
      <br />
      <br />
      <Routes>
        <Route path="/" element={
          <div className="p-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 text-white">
              🚪 ⊞ Window & Door Analyzer
            </h1>
            <UploadForm setLoading={setLoading} setResults={setResults} />
            {loading ? <LoadingSpinner /> : <ResultsDisplay results={results} />}
            <div className="mt-12">
              <h2 className="text-2xl font-semibold text-center text-gray-700 mb-4 text-white">
                💬 Suggest a Feature
              </h2>
              <FeedbackForm />
            </div>
          </div>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyCode />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/admin" element={
                <AdminRoute>z
                    <AdminPanel />
                </AdminRoute>
            } />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/subscription" element={
  <PrivateRoute>
    <Subscription />
  </PrivateRoute>
} />

      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}