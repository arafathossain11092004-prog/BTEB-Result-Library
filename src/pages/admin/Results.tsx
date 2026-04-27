import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Edit2, Upload, Loader2, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import * as xlsx from 'xlsx';

const SemesterInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
  const [mode, setMode] = useState<'gpa' | 'referred'>('gpa');
  const [gpa, setGpa] = useState('');
  const [subjects, setSubjects] = useState<{code: string, name: string, type: string}[]>([]);

  // Parse incoming string to init state
  useEffect(() => {
    if (!value) {
      setMode('gpa'); setGpa(''); setSubjects([]);
      return;
    }
    if (value.startsWith('{"type":"referred"')) {
      try {
        const parsed = JSON.parse(value);
        setMode('referred');
        setSubjects(parsed.subjects || []);
        setGpa('');
      } catch (e) {
        setMode('gpa'); setGpa(value);
      }
    } else {
      setMode('gpa'); setGpa(value); setSubjects([]);
    }
  }, [value]);

  const triggerChange = (newMode: 'gpa' | 'referred', newGpa: string, newSubjects: {code: string, name: string, type: string}[]) => {
    if (newMode === 'gpa') {
      onChange(newGpa);
    } else {
      if (newSubjects.length === 0) {
        onChange('');
      } else {
        onChange(JSON.stringify({ type: 'referred', subjects: newSubjects }));
      }
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'gpa' | 'referred';
    setMode(newMode);
    if (newMode === 'referred' && subjects.length === 0) {
      const initSubjects = [{code: '', name: '', type: 'Theory'}];
      setSubjects(initSubjects);
      triggerChange('referred', gpa, initSubjects);
    } else {
      triggerChange(newMode, gpa, subjects);
    }
  };

  const updateSubject = (index: number, field: string, val: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: val };
    setSubjects(newSubjects);
    triggerChange('referred', gpa, newSubjects);
  };

  const addSubject = () => {
    const newSubjects = [...subjects, {code: '', name: '', type: 'Theory'}];
    setSubjects(newSubjects);
    triggerChange('referred', gpa, newSubjects);
  };

  const removeSubject = (index: number) => {
    const newSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(newSubjects);
    triggerChange('referred', gpa, newSubjects);
  };

  return (
    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
        <select 
          value={mode} 
          onChange={handleModeChange}
          className="text-xs bg-white border border-gray-300 rounded px-1 min-w-[70px] outline-none"
        >
          <option value="gpa">GPA / Passed</option>
          <option value="referred">Referred</option>
        </select>
      </div>
      
      {mode === 'gpa' ? (
        <input 
          type="text" 
          value={gpa} 
          onChange={e => {
            setGpa(e.target.value);
            triggerChange('gpa', e.target.value, subjects);
          }} 
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white" 
          placeholder="GPA (e.g. 3.50)" 
        />
      ) : (
        <div className="flex flex-col gap-2">
          {subjects.map((sub, i) => (
            <div key={i} className="flex flex-wrap gap-1 items-center bg-white p-2 rounded border border-gray-200">
               <input 
                 type="text" 
                 value={sub.code} 
                 onChange={e => updateSubject(i, 'code', e.target.value)}
                 className="flex-1 min-w-[60px] px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500" 
                 placeholder="Code" 
               />
               <input 
                 type="text" 
                 value={sub.name} 
                 onChange={e => updateSubject(i, 'name', e.target.value)}
                 className="flex-[2] min-w-[100px] px-2 py-1 text-xs border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500" 
                 placeholder="Subject Name" 
               />
               <select
                 value={sub.type}
                 onChange={e => updateSubject(i, 'type', e.target.value)}
                 className="px-1 py-1 text-xs border border-gray-300 rounded outline-none bg-white"
               >
                 <option value="Theory">Theory</option>
                 <option value="Practical">Practical</option>
               </select>
               <button type="button" onClick={() => removeSubject(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
            </div>
          ))}
          <button type="button" onClick={addSubject} className="text-xs text-blue-600 font-medium hover:underline flex items-center mt-1">
             <Plus className="w-3 h-3 mr-1" /> Add Subject
          </button>
        </div>
      )}
    </div>
  );
};

export default function AdminResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form State
  const [curriculum, setCurriculum] = useState('');
  const [regulation, setRegulation] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [semester1, setSemester1] = useState('');
  const [semester2, setSemester2] = useState('');
  const [semester3, setSemester3] = useState('');
  const [semester4, setSemester4] = useState('');
  const [semester5, setSemester5] = useState('');
  const [semester6, setSemester6] = useState('');
  const [semester7, setSemester7] = useState('');
  const [semester8, setSemester8] = useState('');

  const [saving, setSaving] = useState(false);
  const [searchingRoll, setSearchingRoll] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const handleRollBlur = async () => {
    if (!rollNumber || isEditing) return; // Don't auto-fill if already explicitly editing
    setSearchingRoll(true);
    try {
      const q = query(collection(db, 'results'), where('rollNumber', '==', rollNumber), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const result = snapshot.docs[0].data();
        setCurriculum(result.curriculum || '');
        setRegulation(result.regulation || '');
        setInstituteCode(result.instituteCode || '');
        setInstituteName(result.instituteName || '');
        setSemester1(result.semester1 || '');
        setSemester2(result.semester2 || '');
        setSemester3(result.semester3 || '');
        setSemester4(result.semester4 || '');
        setSemester5(result.semester5 || '');
        setSemester6(result.semester6 || '');
        setSemester7(result.semester7 || '');
        setSemester8(result.semester8 || '');
        setIsEditing(true);
        setEditId(snapshot.docs[0].id);
        // We notify the user implicitly by changing the form title to "Edit Result"
      }
    } catch (error) {
      console.error("Error searching roll:", error);
    } finally {
      setSearchingRoll(false);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'results'), orderBy('updatedAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (result: any) => {
    setCurriculum(result.curriculum || '');
    setRegulation(result.regulation || '');
    setRollNumber(result.rollNumber || '');
    setInstituteCode(result.instituteCode || '');
    setInstituteName(result.instituteName || '');
    setSemester1(result.semester1 || '');
    setSemester2(result.semester2 || '');
    setSemester3(result.semester3 || '');
    setSemester4(result.semester4 || '');
    setSemester5(result.semester5 || '');
    setSemester6(result.semester6 || '');
    setSemester7(result.semester7 || '');
    setSemester8(result.semester8 || '');
    setIsEditing(true);
    setEditId(result.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setCurriculum(''); setRegulation(''); setRollNumber(''); setInstituteCode(''); setInstituteName('');
    setSemester1(''); setSemester2(''); setSemester3(''); setSemester4('');
    setSemester5(''); setSemester6(''); setSemester7(''); setSemester8('');
    setIsEditing(false);
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Base object
    const dataObj = {
        curriculum,
        regulation,
        rollNumber,
        instituteCode,
        instituteName,
        semester1, semester2, semester3, semester4,
        semester5, semester6, semester7, semester8,
        updatedAt: Date.now()
    };
    
    try {
      if (isEditing && editId) {
         await updateDoc(doc(db, 'results', editId), dataObj);
      } else {
         await addDoc(collection(db, 'results'), {
           ...dataObj,
           createdAt: Date.now(),
         });
      }
      
      // Clear specific fields to allow consecutive data entry without closing the form
      setRollNumber('');
      setSemester1(''); setSemester2(''); setSemester3(''); setSemester4('');
      setSemester5(''); setSemester6(''); setSemester7(''); setSemester8('');
      setIsEditing(false);
      setEditId(null);
      
      fetchResults();
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'results');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this result?')) {
      try {
        await deleteDoc(doc(db, 'results', id));
        fetchResults();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `results/${id}`);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        
        let added = 0;
        for (const row of data as any[]) {
          if (row.rollNumber && row.instituteName && row.curriculum) {
             await addDoc(collection(db, 'results'), {
               curriculum: String(row.curriculum),
               regulation: row.regulation ? String(row.regulation) : '',
               rollNumber: String(row.rollNumber),
               instituteName: String(row.instituteName),
               semester1: row.semester1 ? String(row.semester1) : '',
               semester2: row.semester2 ? String(row.semester2) : '',
               semester3: row.semester3 ? String(row.semester3) : '',
               semester4: row.semester4 ? String(row.semester4) : '',
               semester5: row.semester5 ? String(row.semester5) : '',
               semester6: row.semester6 ? String(row.semester6) : '',
               semester7: row.semester7 ? String(row.semester7) : '',
               semester8: row.semester8 ? String(row.semester8) : '',
               createdAt: Date.now(),
               updatedAt: Date.now()
             });
             added++;
          }
        }
        alert(`Successfully imported ${added} results.`);
        fetchResults();
      };
      reader.readAsBinaryString(file);
    } catch (error) {
       console.error("Error uploading file", error);
       alert("Error processing file. Required columns: rollNumber, instituteName, curriculum");
    } finally {
       setSaving(false);
       if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manage Results</h1>
          <p className="text-sm text-gray-500">Add, edit, or remove student results.</p>
        </div>
        <div className="flex gap-3">
           <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
           </label>
           <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Result
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 lg:col-span-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{isEditing ? 'Edit Result' : 'Add New Result'}</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum/Exam *</label>
            <select required value={curriculum} onChange={e => setCurriculum(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="" disabled>Select Curriculum</option>
              <option value="Diploma in Engineering">Diploma in Engineering</option>
              <option value="Diploma in Textile">Diploma in Textile</option>
              <option value="Diploma in Agriculture">Diploma in Agriculture</option>
              <option value="Diploma in Fisheries">Diploma in Fisheries</option>
              <option value="Diploma in Forestry">Diploma in Forestry</option>
              <option value="Diploma in Medical Technology">Diploma in Medical Technology</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regulation *</label>
            <select required value={regulation} onChange={e => setRegulation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="" disabled>Select Regulation</option>
              <option value="2022">2022</option>
              <option value="2016">2016</option>
              <option value="2010">2010</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Roll Number * {searchingRoll && <span className="text-blue-500 text-xs ml-2 animate-pulse">Searching...</span>}
            </label>
            <input required type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)} onBlur={handleRollBlur} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter Roll Number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institute Code</label>
            <input type="text" value={instituteCode} onChange={e => setInstituteCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Code" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name *</label>
            <input 
              required 
              type="text" 
              list="institute-list"
              value={instituteName} 
              onChange={e => setInstituteName(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Select from dropdown or type manually" 
            />
            <datalist id="institute-list">
              <option value="Dhaka Polytechnic Institute" />
              <option value="Chittagong Polytechnic Institute" />
              <option value="Rajshahi Polytechnic Institute" />
              <option value="Khulna Polytechnic Institute" />
              <option value="Bogra Polytechnic Institute" />
              <option value="Sylhet Polytechnic Institute" />
              <option value="Barisal Polytechnic Institute" />
              <option value="Mymensingh Polytechnic Institute" />
              <option value="Rangpur Polytechnic Institute" />
              <option value="Comilla Polytechnic Institute" />
              <option value="Faridpur Polytechnic Institute" />
              <option value="Kushtia Polytechnic Institute" />
              <option value="Pabna Polytechnic Institute" />
              <option value="Dinajpur Polytechnic Institute" />
              <option value="Feni Polytechnic Institute" />
              <option value="Patuakhali Polytechnic Institute" />
              <option value="Tangail Polytechnic Institute" />
              <option value="Jessore Polytechnic Institute" />
              <option value="Noakhali Polytechnic Institute" />
              <option value="Brahmanbaria Polytechnic Institute" />
              <option value="Thakurgaon Polytechnic Institute" />
              <option value="Satkhira Polytechnic Institute" />
              <option value="Sirajganj Polytechnic Institute" />
              <option value="Kurigram Polytechnic Institute" />
              <option value="Magura Polytechnic Institute" />
              <option value="Bhola Polytechnic Institute" />
              <option value="Habiganj Polytechnic Institute" />
              <option value="Sherpur Polytechnic Institute" />
              <option value="Cox's Bazar Polytechnic Institute" />
              <option value="Jhenaidah Polytechnic Institute" />
              <option value="Munshiganj Polytechnic Institute" />
              <option value="Narsingdi Polytechnic Institute" />
              <option value="Chandpur Polytechnic Institute" />
              <option value="Shariatpur Polytechnic Institute" />
              <option value="Barguna Polytechnic Institute" />
              <option value="Gopalganj Polytechnic Institute" />
              <option value="Lakshmipur Polytechnic Institute" />
              <option value="Nilphamari Polytechnic Institute" />
              <option value="Kishoreganj Polytechnic Institute" />
              <option value="Chapainawabganj Polytechnic Institute" />
              <option value="Lalmonirhat Polytechnic Institute" />
              <option value="Panchagarh Polytechnic Institute" />
              <option value="Chittagong Mohila Polytechnic Institute" />
              <option value="Feni Computer Institute" />
              <option value="Rajshahi Mohila Polytechnic Institute" />
              <option value="Dhaka Mohila Polytechnic Institute" />
              <option value="Khulna Mohila Polytechnic Institute" />
              <option value="Bangladesh Sweden Polytechnic Institute" />
              <option value="Graphic Arts Institute, Dhaka" />
              <option value="Govt. Graphic Arts Institute, Dhaka" />
            </datalist>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-5 mt-2">
            <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-2">Semester Results (Optional)</h3>
          </div>
          
          <SemesterInput label="1st Semester" value={semester1} onChange={setSemester1} />
          <SemesterInput label="2nd Semester" value={semester2} onChange={setSemester2} />
          <SemesterInput label="3rd Semester" value={semester3} onChange={setSemester3} />
          <SemesterInput label="4th Semester" value={semester4} onChange={setSemester4} />
          <SemesterInput label="5th Semester" value={semester5} onChange={setSemester5} />
          <SemesterInput label="6th Semester" value={semester6} onChange={setSemester6} />
          <SemesterInput label="7th Semester" value={semester7} onChange={setSemester7} />
          <SemesterInput label="8th Semester" value={semester8} onChange={setSemester8} />
          
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-3 mt-4">
             <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
             <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center">
               {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
               {isEditing ? 'Update Result' : 'Save Result'}
             </button>
          </div>
        </form>
      )}

      {loading ? (
         <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-left">
                <tr>
                  <th className="py-3 px-4 font-medium">Roll Number</th>
                  <th className="py-3 px-4 font-medium">Curriculum</th>
                  <th className="py-3 px-4 font-medium">Regulation</th>
                  <th className="py-3 px-4 font-medium">Institute</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.length === 0 ? (
                   <tr><td colSpan={5} className="py-8 text-center text-gray-500">No results found.</td></tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{r.rollNumber}</td>
                      <td className="py-3 px-4 text-gray-600">{r.curriculum}</td>
                      <td className="py-3 px-4 text-gray-600">{r.regulation}</td>
                      <td className="py-3 px-4 text-gray-600">{r.instituteName}</td>
                      <td className="py-3 px-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit(r)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
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
        </div>
      )}
    </div>
  );
}
