import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, BookCopy, X } from 'lucide-react';

export default function AdminBooklists() {
  const [booklists, setBooklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [semester, setSemester] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [regulation, setRegulation] = useState('');
  const [subjects, setSubjects] = useState([{ subjectName: '', subjectCode: '' }]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBooklists().catch(console.error);
  }, []);

  const fetchBooklists = async () => {
    setLoading(true);
    try {
      // Order by createdAt descending for recent entries
      const q = query(collection(db, 'booklists'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      setBooklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectField = () => {
    setSubjects([...subjects, { subjectName: '', subjectCode: '' }]);
  };

  const handleRemoveSubjectField = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, field: string, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalDept = department === 'Other' ? customDepartment : department;
      const batch = writeBatch(db);
      subjects.forEach(subject => {
         const newDocRef = doc(collection(db, 'booklists'));
         batch.set(newDocRef, {
           regulation,
           semester,
           department: finalDept,
           departmentCode,
           ...subject,
           createdAt: Date.now(),
           updatedAt: Date.now()
         });
      });
      await batch.commit();

      setShowForm(false);
      setRegulation('');
      setSemester('');
      setDepartment('');
      setCustomDepartment('');
      setDepartmentCode('');
      setSubjects([{ subjectName: '', subjectCode: '' }]);
      fetchBooklists().catch(console.error);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'booklists');
      } catch (e) {}
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteDoc(doc(db, 'booklists', id));
        fetchBooklists().catch(console.error);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, `booklists/${id}`);
        } catch (e) {}
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manage Booklists</h1>
          <p className="text-sm text-gray-500">Add or remove booklists by semester.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setSubjects([{ subjectName: '', subjectCode: '' }]);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subjects
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Add Subjects</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Regulation *</label>
              <select required value={regulation} onChange={e => setRegulation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                 <option value="">Select Regulation</option>
                 {['2022', '2016', '2010'].map(r => <option key={r} value={r}>{r} Probidhan</option>)}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select required value={semester} onChange={e => setSemester(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                 <option value="">Select Semester</option>
                 {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => <option key={s} value={s}>{s} Semester</option>)}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                 <option value="">Select Department</option>
                 {['Civil', 'Computer', 'Electrical', 'Mechanical', 'Power', 'Electronics', 'Architecture', 'Automobile', 'Food', 'Environment', 'Telecommunication', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            {department === 'Other' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Department *</label>
                <input required type="text" value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} placeholder="Enter department name" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            )}
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Code (Optional)</label>
              <input type="text" value={departmentCode} onChange={e => setDepartmentCode(e.target.value)} placeholder="e.g. 666" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
          </div>

          <div className="space-y-4">
            {subjects.map((subject, index) => (
              <div key={index} className="flex gap-4 items-end p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                {subjects.length > 1 && (
                   <button 
                     type="button" 
                     onClick={() => handleRemoveSubjectField(index)}
                     className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-200 p-1.5 rounded-full transition-colors z-10 shadow-sm"
                     title="Remove Subject"
                   >
                     <X className="w-4 h-4" />
                   </button>
                )}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject Name *</label>
                  <input required type="text" value={subject.subjectName} onChange={e => handleSubjectChange(index, 'subjectName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject Code *</label>
                  <input required type="text" value={subject.subjectCode} onChange={e => handleSubjectChange(index, 'subjectCode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-start">
             <button 
               type="button" 
               onClick={handleAddSubjectField}
               className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
             >
               <Plus className="w-4 h-4 mr-2" />
               Add More Subject
             </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
             <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center shadow-sm">
               {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
               Save {subjects.length > 1 ? `All ${subjects.length} Subjects` : 'Subject'}
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
                <th className="py-3 px-4 font-medium">Regulation</th>
                <th className="py-3 px-4 font-medium">Semester</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">Subject</th>
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {booklists.length === 0 ? (
                 <tr><td colSpan={6} className="py-8 text-center text-gray-500">No booklists found.</td></tr>
              ) : (
                booklists.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-900 font-medium">{r.regulation || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{r.semester}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {r.department || 'N/A'}
                      {r.departmentCode && <span className="block text-xs text-blue-600 font-semibold">{r.departmentCode}</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{r.subjectName}</td>
                    <td className="py-3 px-4 text-gray-600">{r.subjectCode}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
