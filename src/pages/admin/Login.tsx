import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user && isAdmin) {
        navigate('/admin');
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const safeUserId = userId.trim().toLowerCase();
    const loginEmail = safeUserId.includes('@') ? safeUserId : `${safeUserId}@bteb.gov.bd`;

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err: any) {
      // Auto-bootstrap master admin if it doesn't exist yet
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (safeUserId === 'btebbd' && password === 'Bteb@2026') {
          try {
            await createUserWithEmailAndPassword(auth, loginEmail, password);
            return;
          } catch (createErr: any) {
            console.error("Setup failed", createErr);
            if (createErr.code === 'auth/operation-not-allowed') {
              setError("Email/Password authentication is not enabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.");
            } else {
              setError(createErr.message || "Failed to initialize master admin.");
            }
          }
        } else {
          setError("Invalid credentials.");
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password authentication is not enabled. Please enable it in the Firebase Console -> Authentication -> Sign-in method.");
      } else {
        setError(err.message || "An error occurred during login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-sm text-gray-500">
            Sign in with your admin credentials to access the dashboard.
          </p>
        </div>

        {user && !isAdmin ? (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg mb-6 border border-red-100 text-center">
            You are signed in as {user.email}, but do not have admin access.
          </div>
        ) : null}

        {error ? (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg mb-6 border border-red-100">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input 
              type="text" 
              required
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Enter User ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium text-white disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
