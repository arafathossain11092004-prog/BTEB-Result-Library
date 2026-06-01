import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, BookCopy, X, Folder, FolderOpen, Save } from 'lucide-react';
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

export default function AdminBooklists() {
  const [booklists, setBooklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [expandedCurr, setExpandedCurr] = useState<string | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [expandedSem, setExpandedSem] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  
  const [formBlocks, setFormBlocks] = useState<FormBlock[]>([]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBooklists().catch(console.error);
  }, []);

  const fetchBooklists = async () => {
    setLoading(true);
    try {
      // Fetch without orderBy to prevent index requirement issues
      const q = query(collection(db, 'booklists'), limit(100));
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

  const grouped = booklists.reduce((acc, curr) => {
    const curriculum = curr.curriculum || 'Unknown';
    const regulation = curr.regulation || 'Unknown';
    const semester = curr.semester || 'Unknown';
    const dept = curr.department || 'Unknown';

    if (!acc[curriculum]) acc[curriculum] = {};
    if (!acc[curriculum][regulation]) acc[curriculum][regulation] = {};
    if (!acc[curriculum][regulation][semester]) acc[curriculum][regulation][semester] = {};
    if (!acc[curriculum][regulation][semester][dept]) acc[curriculum][regulation][semester][dept] = { code: curr.departmentCode || '', subjects: [] };
    
    acc[curriculum][regulation][semester][dept].subjects.push(curr);
    return acc;
  }, {});

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
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department Code</label>
                  <input type="text" value={block.departmentCode} onChange={e => handleBlockChange(block.id, 'departmentCode', e.target.value)} placeholder="e.g. 666" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
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
                                  {Object.keys(grouped[curr][reg]).map(sem => (
                                    <li key={sem} className="pl-6 border-t border-gray-100">
                                      <button
                                        onClick={() => setExpandedSem(expandedSem === `${curr}-${reg}-${sem}` ? null : `${curr}-${reg}-${sem}`)}
                                        className="w-full flex items-center p-4 hover:bg-orange-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          {expandedSem === `${curr}-${reg}-${sem}` ? <FolderOpen className="w-4 h-4 text-orange-400" /> : <Folder className="w-4 h-4 text-orange-400" />}
                                          <span className="text-sm font-medium text-gray-700">{sem} Semester</span>
                                        </div>
                                      </button>

                                      <AnimatePresence>
                                        {expandedSem === `${curr}-${reg}-${sem}` && (
                                          <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            {Object.keys(grouped[curr][reg][sem]).map(dept => (
                                              <li key={dept} className="pl-6 border-t border-gray-100">
                                                <button
                                                  onClick={() => setExpandedDept(expandedDept === `${curr}-${reg}-${sem}-${dept}` ? null : `${curr}-${reg}-${sem}-${dept}`)}
                                                  className="w-full flex items-center justify-between p-4 hover:bg-green-50 transition-colors"
                                                >
                                                  <div className="flex items-center gap-3">
                                                    {expandedDept === `${curr}-${reg}-${sem}-${dept}` ? <FolderOpen className="w-4 h-4 text-green-500" /> : <Folder className="w-4 h-4 text-green-500" />}
                                                    <span className="text-sm font-medium text-gray-700">{dept}</span>
                                                  </div>
                                                  {grouped[curr][reg][sem][dept].code && (
                                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                      Code: {grouped[curr][reg][sem][dept].code}
                                                    </span>
                                                  )}
                                                </button>

                                                <AnimatePresence>
                                                  {expandedDept === `${curr}-${reg}-${sem}-${dept}` && (
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
                                                              {grouped[curr][reg][sem][dept].subjects.map((subject: any) => (
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
    </div>
  );
}
