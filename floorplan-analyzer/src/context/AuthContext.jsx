import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        user: null,
        token: null,
        isAuthenticated: false,
        requiresVerification: false,
        verificationData: null,
        loading: true
    });

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (token && user) {
                axios.defaults.headers.common['Authorization'] = `Token ${token}`;
                setAuthState({
                    user,
                    token,
                    isAuthenticated: true,
                    requiresVerification: false,
                    verificationData: null,
                    loading: false
                });
            } else {
                setAuthState(prev => ({ ...prev, loading: false }));
            }
        };
        
        initializeAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/auth/login/', { email, password });
            
            if (response.data.requiresVerification) {
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    requiresVerification: true,
                    verificationData: {
                        user_id: response.data.user_id,
                        device_id: response.data.device_id,
                        email: response.data.email
                    },
                    loading: false
                });
                return { requiresVerification: true };
            }

            // Handle successful login
            const { token, ...userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            axios.defaults.headers.common['Authorization'] = `Token ${token}`;
            
            setAuthState({
                user: userData,
                token,
                isAuthenticated: true,
                requiresVerification: false,
                verificationData: null,
                loading: false
            });
            
            return { success: true };
        } catch (error) {
            setAuthState(prev => ({ ...prev, loading: false }));
            return { error: error.response?.data?.error || 'Login failed' };
        }
    };

    const signup = async (username, email, password) => {
        try {
            const response = await axios.post('/api/auth/signup/', { username, email, password });
            setAuthState({
                user: null,
                token: null,
                isAuthenticated: false,
                requiresVerification: true,
                verificationData: {
                    user_id: response.data.user_id,
                    device_id: response.data.device_id,
                    email: response.data.email
                },
                loading: false
            });
            return { requiresVerification: true };
        } catch (error) {
            return { error: error.response?.data?.error || 'Signup failed' };
        }
    };

    const verifyCode = async (code) => {
        try {
            const response = await axios.post('/api/auth/verify/', {
                ...authState.verificationData,
                code
            });
            
            const { token, ...userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            axios.defaults.headers.common['Authorization'] = `Token ${token}`;
            
            setAuthState({
                user: userData,
                token,
                isAuthenticated: true,
                requiresVerification: false,
                verificationData: null,
                loading: false
            });
            
            return { success: true };
        } catch (error) {
            return { error: error.response?.data?.error || 'Verification failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            requiresVerification: false,
            verificationData: null,
            loading: false
        });
    };

    return (
        <AuthContext.Provider value={{
            ...authState,
            login,
            signup,
            verifyCode,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);