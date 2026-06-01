import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

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
    <div className="flex flex-col items-center justify-center w-full px-4 sm:px-6 py-12 font-sans">
      <div className="w-full max-w-md pb-12 mt-8 sm:mt-0">
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20 rotate-3 transition-transform hover:rotate-0"
          >
            <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-3"
          >
            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Portal</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-500 text-lg sm:text-lg font-medium"
          >
            Sign in with your admin credentials.
          </motion.p>
        </div>

        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
          className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-3xl border border-white/60 p-6 sm:p-8 relative"
        >
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl"></div>

          {user && !isAdmin ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl mb-6 border border-red-100 text-center">
              You are signed in as {user.email}, but do not have admin access.
            </div>
          ) : null}

          {error ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl mb-6 border border-red-100 text-center">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">User ID</label>
              <input 
                type="text" 
                required
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-900 text-base rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white placeholder:text-slate-400 transition-colors"
                placeholder="Enter User ID"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 text-slate-900 text-base rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white placeholder:text-slate-400 transition-colors"
                placeholder="Enter password"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex items-center justify-center gap-2 py-4 px-4 text-base font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-lg shadow-slate-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all overflow-hidden disabled:opacity-70"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Log In'}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"></div>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
