// src/components/IsAdmin.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function IsAdmin({ children }) {
  const { user, authToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        await axios.get(`${API_BASE_URL}/admin/dashboard/`, {
          headers: {
            Authorization: `Token ${authToken}`
          }
        });
        setIsAdmin(true);
      } catch (err) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (user && authToken) {
      checkAdminStatus();
    } else {
      navigate('/login');
    }
  }, [user, authToken, navigate]);

  if (loading) {
    return <div>Checking permissions...</div>;
  }

  return isAdmin ? children : null;
}