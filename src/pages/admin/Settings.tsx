import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Save, Loader2, Image as ImageIcon } from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBannerUrl(data.bannerUrl || '');
        setBannerLink(data.bannerLink || '');
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'general');
      await setDoc(docRef, {
        bannerUrl,
        bannerLink,
        updatedAt: Date.now()
      }, { merge: true });
      alert('Settings saved successfully!');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'settings/general');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage global application settings</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gray-500" />
              Bottom Banner
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">Provide a direct URL to an image. Leave blank to hide the banner.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Link URL (Optional)
                </label>
                <input
                  type="url"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">Where should the banner link to when clicked?</p>
              </div>
            </div>

            {bannerUrl && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                  <img src={bannerUrl} alt="Banner Preview" className="max-w-full h-auto rounded" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
