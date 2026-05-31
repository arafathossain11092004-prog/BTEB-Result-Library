import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, CalendarRange, X } from 'lucide-react';

export default function AdminExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const [semester, setSemester] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [customCurriculum, setCustomCurriculum] = useState('');
  const [regulation, setRegulation] = useState('');
  const [subjects, setSubjects] = useState([{ subjectName: '', subjectCode: '', date: '', day: '', time: '' }]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoutines().catch(console.error);
  }, []);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'examRoutines'), orderBy('date', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    
    try {
      // Lazy load to avoid bundle size issues
      const { parsePdfToRoutines } = await import('../../lib/pdfParser');
      const routines = await parsePdfToRoutines(file);

      if (routines && routines.length > 0) {
        try {
          const chunks = [];
          for (let i = 0; i < routines.length; i += 400) {
            chunks.push(routines.slice(i, i + 400));
          }
          
          let count = 0;
          for (const chunk of chunks) {
            const batch = writeBatch(db);
            for (const item of chunk) {
              const newDocRef = doc(collection(db, 'examRoutines'));
              batch.set(newDocRef, {
                curriculum: item.Curriculum || 'Diploma in Engineering',
                regulation: item.Regulation || '2016 Probidhan',
                semester: item.Semester || '1st Semester',
                department: item.Department || 'Other',
                departmentCode: item.Department_Code || '',
                subjectName: item.Subject_Name || '',
                subjectCode: item.Subject_Code || '',
                date: item.Date || '',
                day: item.Day || '',
                time: item.Time || '',
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
              count++;
            }
            await batch.commit();
          }
          
          alert(`Successfully parsed and saved ${count} exam routines from the PDF!`);
          setShowForm(false);
          fetchRoutines().catch(console.error);
        } catch (e) {
          console.error("Batch save error", e);
          alert("Error saving parsed routines to Firebase.");
        }
      } else {
        alert('No valid routines found in this PDF.');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error processing file.');
    } finally {
      setIsParsing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddSubjectField = () => {
    setSubjects([...subjects, { subjectName: '', subjectCode: '', date: '', day: '', time: '' }]);
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
      const finalCurr = curriculum === 'Other' ? customCurriculum : curriculum;
      const batch = writeBatch(db);
      subjects.forEach(subject => {
         const newDocRef = doc(collection(db, 'examRoutines'));
         batch.set(newDocRef, {
           curriculum: finalCurr,
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
      setCurriculum('');
      setCustomCurriculum('');
      setRegulation('');
      setSemester('');
      setDepartment('');
      setCustomDepartment('');
      setDepartmentCode('');
      setSubjects([{ subjectName: '', subjectCode: '', date: '', day: '', time: '' }]);
      fetchRoutines().catch(console.error);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'examRoutines');
      } catch (e) {}
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this routine?')) {
      try {
        await deleteDoc(doc(db, 'examRoutines', id));
        fetchRoutines().catch(console.error);
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, `examRoutines/${id}`);
        } catch (e) {}
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manage Exam Routines</h1>
          <p className="text-sm text-gray-500">Add or remove exam routines by semester.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
              title="Upload Routine PDF"
            />
            <button
              type="button"
              className={`inline-flex items-center px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors ${isParsing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarRange className="w-4 h-4 mr-2" />}
              {isParsing ? 'Parsing PDF...' : 'Import from PDF'}
            </button>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setSubjects([{ subjectName: '', subjectCode: '', date: '', time: '' }]);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Subject
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Add Subjects</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum *</label>
              <select required value={curriculum} onChange={e => setCurriculum(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                 <option value="">Select Curriculum</option>
                 <option value="Diploma in Engineering">Diploma in Engineering</option>
                 <option value="Diploma in Textile Engineering">Diploma in Textile Engineering</option>
                 <option value="Diploma in Agriculture">Diploma in Agriculture</option>
                 <option value="Diploma in Fisheries">Diploma in Fisheries</option>
                 <option value="Diploma in Forestry">Diploma in Forestry</option>
                 <option value="Diploma in Livestock">Diploma in Livestock</option>
                 <option value="Basic Trade (360 hrs)">Basic Trade (360 hrs)</option>
                 <option value="Other">Other</option>
              </select>
            </div>

            {curriculum === 'Other' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Curriculum *</label>
                <input required type="text" value={customCurriculum} onChange={e => setCustomCurriculum(e.target.value)} placeholder="Enter curriculum name" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            )}

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
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
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
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject Name *</label>
                  <input required type="text" value={subject.subjectName} onChange={e => handleSubjectChange(index, 'subjectName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject Code *</label>
                  <input required type="text" value={subject.subjectCode} onChange={e => handleSubjectChange(index, 'subjectCode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                  <input required type="date" value={subject.date} onChange={e => handleSubjectChange(index, 'date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Day *</label>
                  <select required value={subject.day} onChange={e => handleSubjectChange(index, 'day', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                    <option value="">Select Day</option>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time *</label>
                  <input required type="time" value={subject.time} onChange={e => handleSubjectChange(index, 'time', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
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
                <th className="py-3 px-4 font-medium">Curriculum</th>
                <th className="py-3 px-4 font-medium">Regulation</th>
                <th className="py-3 px-4 font-medium">Semester</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">Subject</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Code</th>
                <th className="py-3 px-4 font-medium">Date, Day & Time</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {routines.length === 0 ? (
                 <tr><td colSpan={8} className="py-8 text-center text-gray-500">No routines found.</td></tr>
              ) : (
                routines.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-900 font-medium">{r.curriculum || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{r.regulation || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{r.semester}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {r.department || 'N/A'}
                      {r.departmentCode && <span className="block text-xs text-blue-600 font-semibold">{r.departmentCode}</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{r.subjectName}</td>
                    <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">{r.subjectCode}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {r.date} {r.day && `(${r.day})`} <span className="text-gray-400">at</span> {r.time}
                    </td>
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

