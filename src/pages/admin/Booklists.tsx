import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, BookCopy, X, Folder, FolderOpen, Save, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CURRICULUM_DEPARTMENTS: Record<string, string[]> = {
  "Diploma In Engineering": [
    "61 Architecture Technology",
    "62 Automobile Technology",
    "63 Chemical Technology",
    "64 Civil Technology",
    "66 Civil (Wood) Technology",
    "67 Electrical Technology",
    "68 Electronics Technology",
    "69 Food Technology",
    "70 Mechanical Technology",
    "71 Power Technology",
    "72 Refrigeration and Air Conditioning (RAC) Technology",
    "76 Ceramic Technology",
    "77 Glass Technology",
    "78 Surveying Technology",
    "79 Marine Technology",
    "80 Shipbuilding Technology",
    "82 Aircraft Maintenance Technology (Aerospace)",
    "83 Aircraft Maintenance Technology (Avionics)",
    "85 Computer Science and Technology",
    "86 Electromedical Technology",
    "88 Construction Technology",
    "90 Environmental Technology",
    "92 Mechatronic Technology",
    "94 Telecommunication Technology",
    "95 Printing Technology",
    "96 Graphic Design Technology"
  ],
  "Diploma In Textile Engineering": [
    "Yarn Manufacturing Technology",
    "Fabric Manufacturing Technology",
    "Wet Process Technology",
    "Garments Design and Pattern Making Technology"
  ],
  "Diploma In Agriculture": [
    "Agriculture Technology"
  ],
  "Diploma In Fisheries": [
    "Fisheries Technology"
  ],
  "Diploma In Forestry": [
    "Forestry Technology"
  ],
  "Diploma In Livestock": [
    "Livestock Technology"
  ],
  "Diploma In Medical Technology": [
    "Medical Laboratory Technology",
    "Radiology and Imaging Technology",
    "Physiotherapy Technology",
    "Dental Technology",
    "Pharmacy Technology",
    "Radiotherapy Technology",
    "Operation Theatre Technology",
    "Nutrition and Food Technology",
    "Audiology Technology",
    "Biomedical Technology"
  ],
  "Diploma In Tourism And Hospitality": [
    "Tourism Technology",
    "Hotel Management and Hospitality Technology"
  ],
  "Diploma In Commerce": [
    "Accounting",
    "Management",
    "Marketing",
    "Finance, Banking and Insurance"
  ]
};

interface FormBlock {
  id: string;
  curriculum: string;
  customCurriculum: string;
  regulation: string;
  semester: string;
  department: string;
  customDepartment: string;
  departmentCode: string;
  subjects: { subjectName: string; subjectCode: string }[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const normalizeSemesterString = (sem: string): string => {
  const s = String(sem).toLowerCase();
  if (s.includes('1st') || s.includes('১ম') || s.includes('first')) return '1st';
  if (s.includes('2nd') || s.includes('২য়') || s.includes('second')) return '2nd';
  if (s.includes('3rd') || s.includes('৩য়') || s.includes('third')) return '3rd';
  if (s.includes('4th') || s.includes('৪র্থ') || s.includes('fourth')) return '4th';
  if (s.includes('5th') || s.includes('৫ম') || s.includes('fifth')) return '5th';
  if (s.includes('6th') || s.includes('৬ষ্ঠ') || s.includes('sixth')) return '6th';
  if (s.includes('7th') || s.includes('৭ম') || s.includes('seventh')) return '7th';
  if (s.includes('8th') || s.includes('৮ম') || s.includes('eighth')) return '8th';
  return sem.replace(/\s*semester/i, '').trim();
};

const normalizeDeptGroupKey = (deptStr: string, curriculum: string): string => {
  const cleanRaw = String(deptStr).trim().toLowerCase();
  const depts = CURRICULUM_DEPARTMENTS[curriculum] || [];
  for (const d of depts) {
    const match = d.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const deptName = match[2].toLowerCase();
      if (cleanRaw === deptName || cleanRaw.includes(deptName) || deptName.includes(cleanRaw)) {
        return d;
      }
      
      const nameWithoutTech = deptName.replace(/\s*technology/g, '').trim();
      const rawWithoutTech = cleanRaw.replace(/\s*technology/g, '').trim();
      if (rawWithoutTech === nameWithoutTech || rawWithoutTech.includes(nameWithoutTech) || nameWithoutTech.includes(rawWithoutTech)) {
        return d;
      }
    } else {
      if (cleanRaw === d.toLowerCase() || d.toLowerCase().includes(cleanRaw) || cleanRaw.includes(d.toLowerCase())) {
        return d;
      }
    }
  }
  return deptStr;
};

export default function AdminBooklists() {
  const [booklists, setBooklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ subjectName: '', subjectCode: '' });
  
  const [expandedCurr, setExpandedCurr] = useState<string | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [expandedSem, setExpandedSem] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  
  const [formBlocks, setFormBlocks] = useState<FormBlock[]>([]);
  
  const [saving, setSaving] = useState(false);

  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    fetchBooklists().catch(console.error);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    
    try {
      const { parsePdfToBooklists, parseDocxToBooklists } = await import('../../lib/pdfParser');
      let booklistsParsed: any[] = [];
      
      if (file.name.endsWith('.pdf')) {
        booklistsParsed = await parsePdfToBooklists(file);
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        booklistsParsed = await parseDocxToBooklists(file);
      } else {
        alert("Unsupported file format. Please upload PDF or DOCX.");
        return;
      }

      if (booklistsParsed && booklistsParsed.length > 0) {
        try {
          const chunks = [];
          for (let i = 0; i < booklistsParsed.length; i += 400) {
            chunks.push(booklistsParsed.slice(i, i + 400));
          }
          
          let count = 0;
          for (const chunk of chunks) {
            const batch = writeBatch(db);
            for (const item of chunk) {
              const newDocRef = doc(collection(db, 'booklists'));
              batch.set(newDocRef, {
                curriculum: item.Curriculum || 'Diploma In Engineering',
                regulation: item.Regulation || '2016',
                semester: item.Semester || '1st Semester',
                department: item.Department || 'Other',
                departmentCode: item.Department_Code || '',
                subjectName: item.Subject_Name || '',
                subjectCode: item.Subject_Code || '',
                orderIndex: count,
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
              count++;
            }
            await batch.commit();
          }
          alert(`Successfully imported ${count} books from document.`);
          await fetchBooklists();
        } catch (error) {
          console.error("Error batch writing imported booklists:", error);
          alert("Failed to save imported booklists.");
        }
      } else {
        alert("No booklists found in the document.");
      }
    } catch (error) {
      console.error("Error parsing document:", error);
      alert("Failed to parse document. See console for details.");
    } finally {
      setIsParsing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const fetchBooklists = async () => {

    setLoading(true);
    try {
      // Fetch with a large enough limit to get all booklists
      const q = query(collection(db, 'booklists'), limit(3000));
      const snapshot = await getDocs(q);
      setBooklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = () => {
    setFormBlocks([...formBlocks, {
      id: generateId(),
      curriculum: '',
      customCurriculum: '',
      regulation: '',
      semester: '',
      department: '',
      customDepartment: '',
      departmentCode: '',
      subjects: [{ subjectName: '', subjectCode: '' }]
    }]);
  };

  const handleRemoveBlock = (blockId: string) => {
    setFormBlocks(formBlocks.filter(b => b.id !== blockId));
  };

  const handleBlockChange = (blockId: string, field: keyof FormBlock, value: any) => {
    setFormBlocks(formBlocks.map(block => {
      if (block.id !== blockId) return block;
      
      const newBlock = { ...block, [field]: value };
      
      // Auto-extract department code if matched
      if (field === 'department' && value !== 'Other') {
        const match = value.match(/^(\d+)\s+(.+)$/);
        if (match) {
          newBlock.departmentCode = match[1];
        } else {
          newBlock.departmentCode = '';
        }
      }
      
      return newBlock;
    }));
  };

  const handleAddSubjectField = (blockId: string) => {
    setFormBlocks(formBlocks.map(block => {
      if (block.id !== blockId) return block;
      return { ...block, subjects: [...block.subjects, { subjectName: '', subjectCode: '' }] };
    }));
  };

  const handleRemoveSubjectField = (blockId: string, index: number) => {
    setFormBlocks(formBlocks.map(block => {
      if (block.id !== blockId) return block;
      return { ...block, subjects: block.subjects.filter((_, i) => i !== index) };
    }));
  };

  const handleSubjectChange = (blockId: string, index: number, field: string, value: string) => {
    setFormBlocks(formBlocks.map(block => {
      if (block.id !== blockId) return block;
      const newSubjects = [...block.subjects];
      newSubjects[index] = { ...newSubjects[index], [field]: value };
      return { ...block, subjects: newSubjects };
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formBlocks.length === 0) return;
    
    setSaving(true);
    try {
      const batch = writeBatch(db);
      formBlocks.forEach(block => {
        const finalDept = block.department === 'Other' ? block.customDepartment : block.department;
        const finalCurr = block.curriculum === 'Other' ? block.customCurriculum : block.curriculum;
        
        block.subjects.forEach(subject => {
           const newDocRef = doc(collection(db, 'booklists'));
           batch.set(newDocRef, {
             curriculum: finalCurr,
             regulation: block.regulation,
             semester: block.semester,
             department: finalDept,
             departmentCode: block.departmentCode,
             ...subject,
             createdAt: Date.now(),
             updatedAt: Date.now()
           });
        });
      });
      await batch.commit();

      setShowForm(false);
      setFormBlocks([]);
      fetchBooklists().catch(console.error);
    } catch (error) {
      alert("Failed to save. See console for details.");
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'booklists', editingItem.id), {
        subjectName: editForm.subjectName,
        subjectCode: editForm.subjectCode,
        updatedAt: Date.now()
      });
      setEditingItem(null);
      await fetchBooklists();
    } catch (error) {
      alert("Failed to update. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you absolutely sure you want to delete ALL booklists? This action cannot be undone.')) {
      try {
        setLoading(true);
        const batchSize = 100;
        let lastVisible = null;
        let hasMore = true;
        let totalDeleted = 0;

        while (hasMore) {
          const q = query(collection(db, 'booklists'), limit(batchSize));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            hasMore = false;
            break;
          }
          
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          totalDeleted += snapshot.docs.length;
        }

        alert(`Successfully deleted ${totalDeleted} booklists.`);
        await fetchBooklists();
      } catch (error) {
        console.error("Error deleting all:", error);
        alert("Failed to delete all. See console for details.");
      } finally {
        setLoading(false);
      }
    }
  };

  const grouped = booklists.reduce((acc, curr) => {
    const curriculum = curr.curriculum || 'Unknown';
    const regulation = curr.regulation || 'Unknown';
    const rawDept = curr.department || 'Unknown';
    const dept = normalizeDeptGroupKey(rawDept, curriculum);
    const semester = normalizeSemesterString(curr.semester || '1st');

    let deptCode = curr.departmentCode || '';
    if (!deptCode && dept) {
      const matchCode = dept.match(/^(\d+)/);
      if (matchCode) {
        deptCode = matchCode[1];
      }
    }

    if (!acc[curriculum]) acc[curriculum] = {};
    if (!acc[curriculum][regulation]) acc[curriculum][regulation] = {};
    if (!acc[curriculum][regulation][dept]) acc[curriculum][regulation][dept] = {};
    if (!acc[curriculum][regulation][dept][semester]) acc[curriculum][regulation][dept][semester] = { code: deptCode, subjects: [] };
    
    acc[curriculum][regulation][dept][semester].subjects.push(curr);
    return acc;
  }, {} as any);

  // Sort subjects by orderIndex within each leaf group
  Object.keys(grouped).forEach(currKey => {
    Object.keys(grouped[currKey]).forEach(regKey => {
      Object.keys(grouped[currKey][regKey]).forEach(deptKey => {
        Object.keys(grouped[currKey][regKey][deptKey]).forEach(semKey => {
          grouped[currKey][regKey][deptKey][semKey].subjects.sort((a: any, b: any) => {
            const aIdx = typeof a.orderIndex === 'number' ? a.orderIndex : (a.createdAt || 0);
            const bIdx = typeof b.orderIndex === 'number' ? b.orderIndex : (b.createdAt || 0);
            return aIdx - bIdx;
          });
        });
      });
    });
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-6 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manage Booklists</h1>
          <p className="text-sm text-gray-500 mt-1">Add or remove booklists by semester.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
              title="Upload Booklist PDF or DOCX"
            />
            <button
              type="button"
              className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-all shadow-sm ${isParsing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookCopy className="w-4 h-4 mr-2 text-slate-500" />}
              {isParsing ? 'Parsing Doc...' : 'Import from Doc/PDF'}
            </button>
          </div>
          {booklists.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm && formBlocks.length === 0) {
                handleAddBlock();
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Hide Form' : 'Add Subjects'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="space-y-6 mb-6">
          {formBlocks.map((block, blockIndex) => (
            <div key={block.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-6 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Block {blockIndex + 1}</h2>
                <button type="button" onClick={() => handleRemoveBlock(block.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum *</label>
                  <select required value={block.curriculum} onChange={e => handleBlockChange(block.id, 'curriculum', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                     <option value="">Select Curriculum</option>
                     {Object.keys(CURRICULUM_DEPARTMENTS).map(c => <option key={c} value={c}>{c}</option>)}
                     <option value="Basic Trade (360 hrs)">Basic Trade (360 hrs)</option>
                     <option value="Other">Other</option>
                  </select>
                </div>

                {block.curriculum === 'Other' && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Curriculum *</label>
                    <input required type="text" value={block.customCurriculum} onChange={e => handleBlockChange(block.id, 'customCurriculum', e.target.value)} placeholder="Enter curriculum name" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regulation *</label>
                  <select required value={block.regulation} onChange={e => handleBlockChange(block.id, 'regulation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                     <option value="">Select Regulation</option>
                     {['2022', '2016', '2010'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                  <select required value={block.semester} onChange={e => handleBlockChange(block.id, 'semester', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                     <option value="">Select Semester</option>
                     {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => <option key={s} value={s}>{s} Semester</option>)}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select required value={block.department} onChange={e => handleBlockChange(block.id, 'department', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                     <option value="">Select Department</option>
                     <option value="All Department">All Department</option>
                     {(CURRICULUM_DEPARTMENTS[block.curriculum] || []).map(d => {
                       const match = d.match(/^(\d+)\s+(.+)$/);
                       const display = match ? `${match[2]} (${match[1]})` : d;
                       return <option key={d} value={d}>{display}</option>;
                     })}
                     <option value="Other">Other</option>
                  </select>
                </div>
                
                {block.department === 'Other' && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Department *</label>
                    <input required type="text" value={block.customDepartment} onChange={e => handleBlockChange(block.id, 'customDepartment', e.target.value)} placeholder="Enter department name" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {block.subjects.map((subject, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                    {block.subjects.length > 1 && (
                       <button 
                         type="button" 
                         onClick={() => handleRemoveSubjectField(block.id, index)}
                         className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-200 p-1.5 rounded-full transition-colors z-10 shadow-sm"
                         title="Remove Subject"
                       >
                         <X className="w-4 h-4" />
                       </button>
                    )}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subject Name *</label>
                      <input required type="text" value={subject.subjectName} onChange={e => handleSubjectChange(block.id, index, 'subjectName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subject Code *</label>
                      <input required type="text" value={subject.subjectCode} onChange={e => handleSubjectChange(block.id, index, 'subjectCode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-start">
                 <button 
                   type="button" 
                   onClick={() => handleAddSubjectField(block.id)}
                   className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Add More Subject
                 </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <button type="button" onClick={handleAddBlock} className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Block
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={saving || formBlocks.length === 0} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save All
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
         <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {Object.keys(grouped).length === 0 ? (
            <div className="p-8 text-center text-gray-500">No booklists found.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {Object.keys(grouped).map(curr => (
                <li key={curr}>
                  <button
                    onClick={() => setExpandedCurr(expandedCurr === curr ? null : curr)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCurr === curr ? <FolderOpen className="w-6 h-6 text-blue-500" /> : <Folder className="w-6 h-6 text-blue-500" />}
                      <span className="font-semibold text-gray-800">{curr}</span>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedCurr === curr && (
                      <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-gray-50/50 border-t border-gray-100 overflow-hidden">
                        {Object.keys(grouped[curr]).map(reg => (
                          <li key={reg} className="pl-6 border-b border-gray-100 last:border-b-0">
                            <button
                              onClick={() => setExpandedReg(expandedReg === `${curr}-${reg}` ? null : `${curr}-${reg}`)}
                              className="w-full flex items-center p-4 hover:bg-blue-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {expandedReg === `${curr}-${reg}` ? <FolderOpen className="w-5 h-5 text-indigo-400" /> : <Folder className="w-5 h-5 text-indigo-400" />}
                                <span className="font-medium text-gray-700">{reg}</span>
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {expandedReg === `${curr}-${reg}` && (
                                <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                  {Object.keys(grouped[curr][reg]).map(dept => (
                                    <li key={dept} className="pl-6 border-t border-gray-100">
                                      <button
                                        onClick={() => setExpandedDept(expandedDept === `${curr}-${reg}-${dept}` ? null : `${curr}-${reg}-${dept}`)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-green-50/50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          {expandedDept === `${curr}-${reg}-${dept}` ? <FolderOpen className="w-4 h-4 text-green-500" /> : <Folder className="w-4 h-4 text-green-500" />}
                                          <span className="text-sm font-medium text-gray-700">{dept}</span>
                                        </div>
                                      </button>

                                      <AnimatePresence>
                                        {expandedDept === `${curr}-${reg}-${dept}` && (
                                          <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            {Object.keys(grouped[curr][reg][dept]).map(sem => (
                                              <li key={sem} className="pl-6 border-t border-gray-150">
                                                <button
                                                  onClick={() => setExpandedSem(expandedSem === `${curr}-${reg}-${dept}-${sem}` ? null : `${curr}-${reg}-${dept}-${sem}`)}
                                                  className="w-full flex items-center justify-between p-4 hover:bg-orange-50/50 transition-colors"
                                                >
                                                  <div className="flex items-center gap-3">
                                                    {expandedSem === `${curr}-${reg}-${dept}-${sem}` ? <FolderOpen className="w-4 h-4 text-orange-400" /> : <Folder className="w-4 h-4 text-orange-400" />}
                                                    <span className="text-sm font-medium text-gray-700">{sem} Semester</span>
                                                  </div>
                                                  {grouped[curr][reg][dept][sem].code && (
                                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                      Code: {grouped[curr][reg][dept][sem].code}
                                                    </span>
                                                  )}
                                                </button>

                                                <AnimatePresence>
                                                  {expandedSem === `${curr}-${reg}-${dept}-${sem}` && (
                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="pl-6 pr-4 pb-4 overflow-hidden">
                                                      <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden mt-2 p-4">
                                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                                          <h3 className="font-bold text-gray-800">{dept} - {sem} Semester</h3>
                                                        </div>
                                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                          <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-gray-700 uppercase text-[11px] tracking-wider">
                                                              <tr>
                                                                <th className="px-4 py-3 border-b font-semibold">Subject Name</th>
                                                                <th className="px-4 py-3 border-b font-semibold">Subject Code</th>
                                                                <th className="px-4 py-3 border-b font-semibold text-right">Actions</th>
                                                              </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                              {grouped[curr][reg][dept][sem].subjects.map((subject: any) => (
                                                                <tr key={subject.id} className="hover:bg-blue-50/50 transition-colors">
                                                                  <td className="px-4 py-3 font-medium text-gray-800">
                                                                    <div className="flex gap-2 items-center">
                                                                      <BookCopy className="w-4 h-4 text-gray-400" />
                                                                      {subject.subjectName}
                                                                    </div>
                                                                  </td>
                                                                  <td className="px-4 py-3">
                                                                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                                      {subject.subjectCode}
                                                                    </span>
                                                                  </td>
                                                                  <td className="px-4 py-3 text-right">
                                                                    <button onClick={() => { setEditingItem(subject); setEditForm({ subjectName: subject.subjectName, subjectCode: subject.subjectCode }); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors mr-2" title="Edit">
                                                                      <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleDelete(subject.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                                      <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                  </td>
                                                                </tr>
                                                              ))}
                                                            </tbody>
                                                          </table>
                                                        </div>
                                                      </div>
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </li>
                                            ))}
                                          </motion.ul>
                                        )}
                                      </AnimatePresence>
                                    </li>
                                  ))}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Edit Subject</h3>
                <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <form onSubmit={handleUpdate} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                  <input required type="text" value={editForm.subjectName} onChange={e => setEditForm({...editForm, subjectName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                  <input required type="text" value={editForm.subjectCode} onChange={e => setEditForm({...editForm, subjectCode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
