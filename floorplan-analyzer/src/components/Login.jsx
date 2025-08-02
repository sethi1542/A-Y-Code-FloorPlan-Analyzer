import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Loader2, Lock, Mail, ArrowRight, XCircle } from 'lucide-react'; // Added XCircle import
import { motion } from 'framer-motion';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState({
        email: false,
        password: false
    });
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password);
            
            if (result.requiresVerification) {
                navigate('/verify', {
                    state: {
                        user_id: result.user_id,
                        device_id: result.device_id
                    }
                });
            } else if (result.success) {
                navigate('/dashboard');
            } else if (result.error) {
                setError(result.error);
            }
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.error || 'Login failed';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 p-4">
            {/* Carbon fiber background with dark overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Glowing border container */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative bg-gray-900 rounded-xl p-8 border border-gray-800">
                        {/* Logo/Header */}
                        <div className="flex flex-col items-center mb-8">
                            <motion.div
                                animate={{ 
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{ 
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4"
                            >
                                <Lock className="h-8 w-8 text-white" />
                            </motion.div>
                            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                Welcome Back
                            </h2>
                            <p className="text-gray-400 mt-2">
                                Sign in to your account
                            </p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center"
                            >
                                <XCircle className="h-5 w-5 mr-2" />
                                {error}
                            </motion.div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Email
                                </label>
                                <div className={`relative transition-all duration-200 ${isFocused.email ? 'ring-2 ring-blue-500/50' : ''}`}>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className={`h-5 w-5 ${isFocused.email ? 'text-blue-400' : 'text-gray-500'} transition-colors`} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setIsFocused({...isFocused, email: true})}
                                        onBlur={() => setIsFocused({...isFocused, email: false})}
                                        required
                                        className="block w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 transition-all"
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-400">
                                        Password
                                    </label>
                                    <Link 
                                        to="/forgot-password" 
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className={`relative transition-all duration-200 ${isFocused.password ? 'ring-2 ring-blue-500/50' : ''}`}>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className={`h-5 w-5 ${isFocused.password ? 'text-blue-400' : 'text-gray-500'} transition-colors`} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setIsFocused({...isFocused, password: true})}
                                        onBlur={() => setIsFocused({...isFocused, password: false})}
                                        required
                                        className="block w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full py-3 px-6 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all ${loading ? 'bg-blue-700' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'}`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Footer */}
                        <div className="mt-6 text-center">
                            <p className="text-gray-500 text-sm">
                                Don't have an account?{' '}
                                <Link 
                                    to="/signup" 
                                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Floating particles animation */}
            <div className="absolute inset-0 overflow-hidden z-0">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * 100,
                            y: Math.random() * 100,
                            opacity: 0
                        }}
                        animate={{
                            x: [null, Math.random() * 100],
                            y: [null, Math.random() * 100],
                            opacity: [0, 0.3, 0]
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            repeatType: "reverse"
                        }}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}