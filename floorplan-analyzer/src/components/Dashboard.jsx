import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  FileText, Download, Upload, User, Star, CreditCard, Calendar, RefreshCw,
  Shield, Mail, Clock, CheckCircle, XCircle, Info
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { user, token } = useContext(AuthContext);
    const [uploads, setUploads] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloadLoading, setDownloadLoading] = useState(null);
    const [userDetails, setUserDetails] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [dashboardRes, userRes] = await Promise.all([
                    axios.get('/api/dashboard/', {
                        headers: { Authorization: `Token ${token}` }
                    }),
                    axios.get('/api/auth/user/', {
                        headers: { Authorization: `Token ${token}` }
                    })
                ]);
                setUploads(dashboardRes.data.uploads || []);
                setSubscription(dashboardRes.data.subscription || null);
                setUserDetails(userRes.data || null);
                setError(null);
            } catch (error) {
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [token]);

    const handleDownload = async (filePath, fileName, uploadId) => {
        setDownloadLoading(uploadId);
        setError(null);
        try {
            const response = await axios.post(
                '/api/dashboard/',
                { file_path: filePath },
                {
                    headers: {
                        Authorization: `Token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'blob'
                }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'analysis_results.xlsx');
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            const errorMsg = error.response?.data?.error ||
                error.response?.statusText ||
                'Download failed';
            setError(errorMsg);
        } finally {
            setDownloadLoading(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSubscriptionStatus = () => {
        if (!subscription) return 'No active subscription';
        const now = new Date();
        const expiry = new Date(subscription.expiry_date);

        if (expiry < now) {
            return 'Expired';
        } else if (subscription.auto_renew) {
            return 'Active (Auto-renew enabled)';
        } else {
            return 'Active (Will not renew)';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-black text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
            <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
            <div className="relative z-10 container mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Dashboard</h1>
                        <div className="mt-2 flex items-center text-gray-300">
                            <User className="h-5 w-5 mr-2 text-blue-400" />
                            <span>Welcome back, <strong>{user?.username}</strong></span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/60 text-red-200 border border-red-600 rounded flex items-center">
                            <XCircle className="h-5 w-5 mr-2" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Cards */}
                        {[
                            {
                                icon: <User className="h-5 w-5 mr-2 text-blue-400" />,
                                title: 'User Information',
                                content: (
                                    <div className="space-y-3">
                                        <div className="flex items-center"><Mail className="h-4 w-4 mr-2" /><span>{userDetails?.email}</span></div>
                                        <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" /><span>Joined: {formatDate(userDetails?.date_joined)}</span></div>
                                        <div className="flex items-center"><Shield className="h-4 w-4 mr-2" /><span>Status: {userDetails?.is_active ? 'Active' : 'Inactive'}</span></div>
                                    </div>
                                )
                            },
                            {
                                icon: <CreditCard className="h-5 w-5 mr-2 text-blue-400" />,
                                title: 'Subscription Details',
                                content: subscription ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-400" /> Plan: {subscription.plan}</div>
                                        <div className="flex items-center"><RefreshCw className="h-4 w-4 mr-2" /> Billing: {subscription.billing_cycle || 'monthly'}</div>
                                        <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Auto-renew: {subscription.auto_renew ? 'Enabled' : 'Disabled'}</div>
                                        <div className="flex items-center"><Clock className="h-4 w-4 mr-2" /> Status: {getSubscriptionStatus()}</div>
                                        <div className="flex items-center"><Info className="h-4 w-4 mr-2" /> Credits: {subscription.remaining_credits}</div>
                                        <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" /> Expires: {formatDate(subscription.expiry_date)}</div>
                                    </div>
                                ) : (
                                    <div className="text-center text-sm">
                                        <p>No active subscription</p>
                                        <Link to="/subscription" className="inline-block mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full">Subscribe Now</Link>
                                    </div>
                                )
                            },
                            {
                                icon: <FileText className="h-5 w-5 mr-2 text-blue-400" />,
                                title: 'Usage Statistics',
                                content: (
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><span>Total Analyses:</span><span>{uploads.length}</span></div>
                                        {subscription && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Credits Used:</span>
                                                    <span>{subscription.credits_used || 0} / {subscription.credits_used + subscription.remaining_credits}</span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{
                                                        width: `${((subscription.credits_used || 0) / ((subscription.credits_used || 0) + subscription.remaining_credits)) * 100}%`
                                                    }}></div>
                                                </div>
                                            </>
                                        )}
                                        <p className="text-sm text-gray-400">Last analysis: {uploads.length > 0 ? formatDate(uploads[0].uploaded_at) : 'Never'}</p>
                                    </div>
                                )
                            }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-md">
                                <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                                    {card.icon}
                                    {card.title}
                                </h2>
                                {card.content}
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-md">
                            <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                                <Upload className="h-5 w-5 mr-2 text-blue-400" />
                                Upload New Drawing
                            </h2>
                            <p className="mb-4 text-gray-400">Analyze your architectural drawings</p>
                            <Link to="/upload" className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-full">
                                Go to Upload
                            </Link>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-md">
                            <h2 className="text-xl font-semibold mb-4 text-white">Recent Analyses</h2>
                            {uploads.length === 0 ? (
                                <p className="text-gray-500">No analyses yet</p>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {uploads.map(upload => (
                                        <div key={upload.id} className="p-4 border border-gray-800 rounded-lg hover:bg-gray-800">
                                            <div className="flex items-start">
                                                <FileText className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                                                <div className="ml-3 flex-1">
                                                    <h3 className="font-medium text-white">{upload.pdf_name}</h3>
                                                    <p className="text-sm text-gray-400">{formatDate(upload.uploaded_at)}</p>
                                                    <div className="mt-2 flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">{upload.drawing_type} • {upload.mode}</span>
                                                        <button
                                                            onClick={() => handleDownload(upload.excel_path, upload.excel_name, upload.id)}
                                                            disabled={downloadLoading === upload.id}
                                                            className={`flex items-center text-sm ${
                                                                downloadLoading === upload.id
                                                                    ? 'text-gray-500'
                                                                    : 'text-blue-400 hover:text-blue-300'
                                                            }`}
                                                        >
                                                            {downloadLoading === upload.id ? (
                                                                <>
                                                                    <span className="animate-spin h-4 w-4 border-t-2 border-blue-500 rounded-full mr-1"></span>
                                                                    Downloading...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Download className="h-4 w-4 mr-1" />
                                                                    Download
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
