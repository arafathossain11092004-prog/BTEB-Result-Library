import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, Upload, File, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a PDF file to upload.");
      return;
    }
    setSaving(true);
    try {
      const fileRef = ref(storage, `notices/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          setSaving(false);
          alert("Failed to upload the file.");
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'notices'), {
            title,
            pdfUrl: downloadURL,
            storagePath: fileRef.fullPath,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setShowForm(false);
          setTitle(''); setFile(null); setUploadProgress(0);
          fetchNotices();
          setSaving(false);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notices');
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (confirm('Are you sure you want to delete this notice?')) {
       try {
         if (storagePath) {
           const fileRef = ref(storage, storagePath);
           await deleteObject(fileRef).catch(console.error); // Ignore error if file doesn't exist
         }
         await deleteDoc(doc(db, 'notices', id));
         fetchNotices();
       } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `notices/${id}`);
       }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manage Notices</h1>
          <p className="text-sm text-gray-500">Upload PDF notices for students.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Notice
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 max-w-lg space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Upload New Notice</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Title *</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Exam Start Date Update" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" accept="application/pdf" className="sr-only" onChange={e => {
                       if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                    }} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
                {file && <p className="text-sm font-medium text-blue-600 truncate mt-2 max-w-[200px]">{file.name}</p>}
              </div>
            </div>
          </div>
          
          {saving && (
             <div className="w-full bg-gray-200 rounded-full h-2.5">
               <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
             </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
             <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
             <button type="submit" disabled={saving || !file} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors flex items-center">
               {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
               Upload
             </button>
          </div>
        </form>
      )}

      {loading ? (
         <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {notices.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">No notices uploaded yet.</div>
           ) : (
             notices.map(n => (
               <div key={n.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col items-start">
                 <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-gray-900 mb-1 leading-snug line-clamp-2" title={n.title}>{n.title}</h3>
                 <p className="text-xs text-gray-500 mb-4">{new Date(n.createdAt).toLocaleDateString()}</p>
                 <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between w-full">
                    <a href={n.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View PDF
                    </a>
                    <button onClick={() => handleDelete(n.id, n.storagePath)} className="text-xs text-red-500 font-medium hover:text-red-700">
                      Delete
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      )}
    </div>
  );
}
