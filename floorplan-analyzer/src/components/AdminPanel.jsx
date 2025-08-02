import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  UserCheck, 
  UserX,
  Loader2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminPanel = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ 
    email: '', 
    password: '', 
    username: '',
    is_staff: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/admin/users/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to fetch users');
      
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const createAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password) {
      setError('Email and password are required');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/admin/users/create/', newAdmin, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });

      setNewAdmin({ email: '', password: '', username: '', is_staff: true });
      setError(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating admin');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (id === user?.id) {
      setError('You cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setLoading(true);
      await axios.delete(`/api/admin/users/${id}/delete/`, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      setError(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting user');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    try {
      setLoading(true);
      await axios.put(`/api/admin/users/${userId}/`, {
        is_staff: !currentStatus
      }, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      setError(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.is_staff) {
      navigate('/login');
      return;
    }

    if (token) {
      fetchUsers();
    }
  }, [token, isAuthenticated, user]);

  if (!user?.is_staff) {
    return (
      <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
        <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
        <div className="relative z-10 container mx-auto text-center p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-md max-w-2xl">
          <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500 mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-6">You must be an administrator to access this page.</p>
          <Link 
            to="/" 
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-full"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
        <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
        <div className="relative z-10 container mx-auto text-center p-6">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Loading Admin Panel...
            </h2>
            <p className="text-gray-400">Please wait while we load user data</p>
          </div>
        </div>
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
          <div className="mb-8 flex items-center">
            <Shield className="h-8 w-8 mr-2 text-blue-400" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Admin Panel
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/60 text-red-200 border border-red-600 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div className="mb-8 bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
              <UserPlus className="h-5 w-5 mr-2 text-blue-400" />
              Create New Admin
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Username"
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="email"
                  placeholder="Email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="password"
                  placeholder="Password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
            </div>
            <button
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 flex items-center"
              onClick={createAdmin}
              disabled={loading || !newAdmin.email || !newAdmin.password}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Admin
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
              <Users className="h-5 w-5 mr-2 text-blue-400" />
              All Users
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-800">
                  {users.map(u => (
                    <motion.tr 
                      key={u.id} 
                      whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                      className={u.id === user?.id ? 'bg-blue-900/20' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.plan || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{u.credits || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          onClick={() => toggleAdminStatus(u.id, u.is_staff)}
                          className={`px-3 py-1 rounded-full text-xs flex items-center ${
                            u.is_staff 
                              ? 'bg-green-900/50 text-green-400 border border-green-800' 
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {u.is_staff ? (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Make Admin
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {u.id !== user?.id && (
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPanel;