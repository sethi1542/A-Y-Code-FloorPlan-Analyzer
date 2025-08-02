import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Lock, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [validToken, setValidToken] = useState(null);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const response = await fetch(`/api/auth/reset-password/${token}/`, {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error('Invalid or expired token');
                }
                setValidToken(true);
            } catch (err) {
                setError(err.message);
                setValidToken(false);
            }
        };

        checkToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch(`/api/auth/reset-password/${token}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setMessage(data.message || 'Password reset successfully');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (validToken === null) {
        return (
            <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    if (!validToken) {
        return (
            <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
                <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
                <div className="relative z-10 container mx-auto max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg text-center"
                    >
                        <div className="text-red-400 mb-4 text-lg">{error}</div>
                        <p className="text-gray-400 mb-6">
                            The password reset link is invalid or has expired.
                        </p>
                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-full"
                        >
                            Request a new reset link
                        </Link>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
            <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
            <div className="relative z-10 container mx-auto max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg"
                >
                    <Link to="/login" className="flex items-center text-blue-400 hover:text-blue-300 mb-6">
                        <ArrowLeft className="h-5 w-5 mr-1" />
                        Back to login
                    </Link>

                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                        Reset Password
                    </h2>
                    <p className="text-gray-400 mb-6">
                        Enter your new password below.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/60 text-red-200 border border-red-600 rounded">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 bg-green-900/60 text-green-200 border border-green-600 rounded flex items-center">
                            <Check className="h-5 w-5 mr-2" />
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength="8"
                                    className="bg-gray-800 border border-gray-700 text-white pl-10 block w-full px-3 py-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength="8"
                                    className="bg-gray-800 border border-gray-700 text-white pl-10 block w-full px-3 py-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all duration-200 flex justify-center items-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}