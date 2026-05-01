import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, firebaseConfig } from '../../lib/firebase';
import { Plus, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminUsers() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAdmins().catch(console.error);
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSaving(true);
    try {
      const safeEmail = email.includes('@') ? email.trim() : `${email.trim()}@bteb.gov.bd`;
      const loweredEmail = safeEmail.toLowerCase();
      
      // Create user in Firebase Auth using secondary app to prevent log-out of primary app
      const secondaryApp = initializeApp(firebaseConfig, "Secondary_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      await createUserWithEmailAndPassword(secondaryAuth, loweredEmail, password);
      await fbSignOut(secondaryAuth);
      
      await setDoc(doc(db, 'admins', loweredEmail), {
        email: loweredEmail,
        createdAt: Date.now(),
      });
      
      setShowForm(false);
      setEmail('');
      setPassword('');
      fetchAdmins().catch(console.error);
    } catch (error: any) {
       console.error("User creation error", error);
       if (error.code === 'auth/operation-not-allowed') {
         alert("Email/Password accounts are not enabled in Firebase. Please enable the Email/Password sign-in method in your Firebase console.");
       } else {
         alert(error.message);
       }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, adminEmail: string) => {
    if (adminEmail === user?.email) {
      alert("You cannot remove yourself.");
      return;
    }
    if (confirm(`Are you sure you want to remove ${adminEmail} from admins?\n\nNote: This only restricts dashboard access. It does not delete their Firebase Auth account.`)) {
       try {
         await deleteDoc(doc(db, 'admins', id));
         fetchAdmins().catch(console.error);
       } catch (error) {
         try {
           handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
         } catch (e) {}
       }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-6">
        <div>
          <h2 className="text-xl font-bold font-heading text-gray-900">Manage Admins</h2>
          <p className="text-sm text-gray-500">Add or remove administrator access.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Admin
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 max-w-lg space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Add New Admin</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID / Email *</label>
            <input required type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. staff123" />
            <p className="text-xs text-gray-500 mt-2">If you enter a username without @ domain, it will be mapped to username@bteb.gov.bd.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Minimum 6 characters" minLength={6} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
             <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
             <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center">
               {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
               Add Admin
             </button>
          </div>
        </form>
      )}

      {loading ? (
         <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-left">
              <tr>
                <th className="py-3 px-4 font-medium pl-6">Admin Account</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Added On</th>
                <th className="py-3 px-4 font-medium text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admins.length === 0 ? (
                 <tr><td colSpan={3} className="py-8 text-center text-gray-500">No admins found.</td></tr>
              ) : (
                admins.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-gray-900 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                         <ShieldCheck className="w-4 h-4" />
                      </div>
                      {a.email}
                      {a.email === user?.email && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase">You</span>}
                    </td>
                    <td className="py-4 px-6 text-gray-500 hidden sm:table-cell">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {a.email !== user?.email && (
                        <button onClick={() => handleDelete(a.id, a.email)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors font-medium">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
