import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, CalendarRange, X, Save, SaveAll, Folder, FolderOpen, BookCopy, Edit } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
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

interface RoutineSemester {
  id: string;
  semesterName: string;
  departments: string[];
}

interface RoutineSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  semesters: RoutineSemester[];
}

interface RoutineTimeSlot {
  id: string;
  timeShift: string;
  subjects: RoutineSubject[];
}

interface RoutineDateBlock {
  id: string;
  examDate: string;
  day: string;
  regulation?: string;
  curriculum?: string;
  timeSlots: RoutineTimeSlot[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateEmptySemester = (): RoutineSemester => ({ id: generateId(), semesterName: '1st Semester', departments: [] });
const generateEmptySubject = (): RoutineSubject => ({ id: generateId(), subjectCode: '', subjectName: '', semesters: [] });
const generateEmptyTimeSlot = (): RoutineTimeSlot => ({ id: generateId(), timeShift: '10:00 AM', subjects: [generateEmptySubject()] });
const generateEmptyDateBlock = (): RoutineDateBlock => ({ 
  id: generateId(), 
  examDate: '', 
  day: '', 
  regulation: '2022',
  curriculum: 'Diploma In Engineering',
  timeSlots: [generateEmptyTimeSlot()] 
});

export default function AdminExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ subjectName: '', subjectCode: '', date: '', time: '', day: '' });
  
  const [expandedCurr, setExpandedCurr] = useState<string | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [expandedSem, setExpandedSem] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Global Meta State
  const [globalPublishDate, setGlobalPublishDate] = useState('');
  
  // Hierarchical State
  const [dateBlocks, setDateBlocks] = useState<RoutineDateBlock[]>([generateEmptyDateBlock()]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoutines().catch(console.error);
  }, []);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'examRoutines'), orderBy('createdAt', 'desc'), limit(150));
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
                curriculum: item.Curriculum || 'Diploma In Engineering',
                regulation: item.Regulation || '2016',
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

  // --- Handlers for Hierarchical Form ---

  const handleUpdateDateBlock = (dIndex: number, field: keyof RoutineDateBlock, value: string) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex] = { ...newBlocks[dIndex], [field]: value };
    
    if (field === 'examDate' && value) {
      const d = new Date(value);
      newBlocks[dIndex].day = d.toLocaleDateString('en-US', { weekday: 'long' }); // Storing as english day for standard
    } else if (field === 'examDate' && !value) {
      newBlocks[dIndex].day = '';
    }
    setDateBlocks(newBlocks);
  };

  const addDateBlock = () => setDateBlocks([...dateBlocks, generateEmptyDateBlock()]);
  const removeDateBlock = (dIndex: number) => {
    if (confirm('Delete entire date block?')) {
      setDateBlocks(dateBlocks.filter((_, i) => i !== dIndex));
    }
  };

  const handleUpdateTimeSlot = (dIndex: number, tsIndex: number, field: keyof RoutineTimeSlot, value: string) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex] = { ...newBlocks[dIndex].timeSlots[tsIndex], [field]: value };
    setDateBlocks(newBlocks);
  };

  const addTimeSlot = (dIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots.push(generateEmptyTimeSlot());
    setDateBlocks(newBlocks);
  };
  
  const removeTimeSlot = (dIndex: number, tsIndex: number) => {
    if (confirm('Delete this time slot and all related semesters/subjects?')) {
      const newBlocks = structuredClone(dateBlocks);
      newBlocks[dIndex].timeSlots.splice(tsIndex, 1);
      setDateBlocks(newBlocks);
    }
  };

  const handleUpdateSubject = (dIndex: number, tsIndex: number, subIndex: number, field: keyof RoutineSubject, value: any) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex].subjects[subIndex] = { 
      ...newBlocks[dIndex].timeSlots[tsIndex].subjects[subIndex], 
      [field]: value 
    };
    setDateBlocks(newBlocks);
  };

  const handleAddSemester = (dIndex: number, tsIndex: number, subIndex: number, semesterName: string) => {
    const newBlocks = structuredClone(dateBlocks);
    const subject = newBlocks[dIndex].timeSlots[tsIndex].subjects[subIndex];
    if (!subject.semesters.find(s => s.semesterName === semesterName)) {
      subject.semesters.push({ id: generateId(), semesterName, departments: [] });
      setDateBlocks(newBlocks);
    }
  };

  const handleRemoveSemester = (dIndex: number, tsIndex: number, subIndex: number, semIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    const subject = newBlocks[dIndex].timeSlots[tsIndex].subjects[subIndex];
    subject.semesters.splice(semIndex, 1);
    setDateBlocks(newBlocks);
  };

  const handleToggleSemesterDepartment = (dIndex: number, tsIndex: number, subIndex: number, semIndex: number, department: string) => {
    const newBlocks = structuredClone(dateBlocks);
    const sem = newBlocks[dIndex].timeSlots[tsIndex].subjects[subIndex].semesters[semIndex];
    if (sem.departments.includes(department)) {
      sem.departments = sem.departments.filter(d => d !== department);
    } else {
      sem.departments.push(department);
    }
    setDateBlocks(newBlocks);
  };

  const handleUpdateSemesterDepartment = (dIndex: number, tsIndex: number, subIndex: number, semIndex: number, text: string) => {
    const newBlocks = structuredClone(dateBlocks);
    const subject = newBlocks[dIndex].timeSlots[tsIndex].subjects[subIndex];
    subject.semesters[semIndex].departments = [text];
    setDateBlocks(newBlocks);
  };

  const addSubject = (dIndex: number, tsIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex].subjects.push(generateEmptySubject());
    setDateBlocks(newBlocks);
  };

  const removeSubject = (dIndex: number, tsIndex: number, subIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    const ts = newBlocks[dIndex].timeSlots[tsIndex];
    if (ts.subjects.length > 1) {
      ts.subjects.splice(subIndex, 1);
    } else {
      alert("Cannot remove the last subject. Remove the Time Block instead.");
      return;
    }
    setDateBlocks(newBlocks);
  };

  const handleSave = async () => {
    // Validate minimally
    let valid = true;
    for (let dbk of dateBlocks) {
      if (!dbk.examDate) valid = false;
      for (let ts of dbk.timeSlots) {
        if (!ts.timeShift) valid = false;
        for (let sub of ts.subjects) {
          if (!sub.subjectCode || !sub.subjectName || sub.semesters.length === 0) valid = false;
        }
      }
    }
    if (!valid) {
      alert("Please fill all required fields (Date, Time, Subject Code, Subject Name, at least one Semester).");
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      dateBlocks.forEach(dateBlock => {
        const inputDate = dateBlock.examDate; 
        let formattedDate = inputDate; 
        if (inputDate.includes('-')) {
          const [yyyy, mm, dd] = inputDate.split('-');
          formattedDate = `${dd}-${mm}-${yyyy}`; 
        }

        dateBlock.timeSlots.forEach(timeSlot => {
          timeSlot.subjects.forEach(sub => {
            const newDocRef = doc(collection(db, 'examRoutines'));
            batch.set(newDocRef, {
              curriculum: dateBlock.curriculum || 'Diploma In Engineering',
              regulation: dateBlock.regulation || '2022',
              semester: sub.semesters.map(s => s.semesterName).join(', '),
              department: sub.semesters.map(s => s.departments.join(', ') || 'All Department').join(' | '),
              subjectName: sub.subjectName,
              subjectCode: sub.subjectCode,
              date: formattedDate,
              day: dateBlock.day,
              time: timeSlot.timeShift,
              publishDate: globalPublishDate,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          });
        });
      });

      await batch.commit();
      setShowForm(false);
      setDateBlocks([generateEmptyDateBlock()]);
      fetchRoutines().catch(console.error);
    } catch (error) {
      console.error(error);
      alert('Failed to save routine hierarchy.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this routine entry?')) {
       try {
         await deleteDoc(doc(db, 'examRoutines', id));
         fetchRoutines().catch(console.error);
       } catch (error) {
         try { handleFirestoreError(error, OperationType.DELETE, `examRoutines/${id}`); } catch (e) {}
       }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'examRoutines', editingItem.id), {
        subjectName: editForm.subjectName,
        subjectCode: editForm.subjectCode,
        date: editForm.date,
        time: editForm.time,
        day: editForm.day,
        updatedAt: Date.now()
      });
      setEditingItem(null);
      await fetchRoutines();
    } catch (error) {
      alert("Failed to update. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you absolutely sure you want to delete ALL exam routines? This action cannot be undone.')) {
      try {
        setLoading(true);
        const batchSize = 100;
        let hasMore = true;
        let totalDeleted = 0;

        while (hasMore) {
          const q = query(collection(db, 'examRoutines'), limit(batchSize));
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

        alert(`Successfully deleted ${totalDeleted} exam routines.`);
        await fetchRoutines();
      } catch (error) {
        console.error("Error deleting all:", error);
        alert("Failed to delete all. See console for details.");
      } finally {
        setLoading(false);
      }
    }
  };

  const grouped = routines.reduce((acc, curr) => {
    const curriculum = curr.curriculum || 'Unknown';
    const regulation = curr.regulation || 'Unknown';
    const semester = curr.semester || 'Unknown';
    const dept = curr.department || 'Unknown';

    if (!acc[curriculum]) acc[curriculum] = {};
    if (!acc[curriculum][regulation]) acc[curriculum][regulation] = {};
    if (!acc[curriculum][regulation][semester]) acc[curriculum][regulation][semester] = {};
    if (!acc[curriculum][regulation][semester][dept]) acc[curriculum][regulation][semester][dept] = { subjects: [] };
    
    acc[curriculum][regulation][semester][dept].subjects.push(curr);
    return acc;
  }, {} as any);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 lg:px-0 px-4">
      <Helmet>
        <title>Manage Routines Admin | BTEB Result Library</title>
      </Helmet>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-6 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manage Exam Routines</h1>
          <p className="text-sm text-gray-500 mt-1">Add or remove exam routines. Support hierarchical nested tables exactly like official formats.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
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
              className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition-all shadow-sm ${isParsing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarRange className="w-4 h-4 mr-2 text-slate-500" />}
              {isParsing ? 'Parsing PDF...' : 'Import from PDF'}
            </button>
          </div>
          {routines.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm && dateBlocks.length === 0) {
                setDateBlocks([generateEmptyDateBlock()]);
              }
            }}
            className="inline-flex flex-1 justify-center items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Close Builder' : 'New Routine Builder'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-3xl border border-gray-200 shadow-sm mb-6 flex flex-col gap-6 pb-32">
          
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Routine Builder</h3>
              <p className="text-sm text-slate-500">Configure routine blocks below.</p>
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-bold text-slate-700 mb-2">Publish Date (Global)</label>
              <input type="date" value={globalPublishDate} onChange={e => setGlobalPublishDate(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 shadow-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white" />
            </div>
          </div>

          <div className="space-y-8">
            {dateBlocks.map((dateBlock, dIndex) => (
              <div key={dateBlock.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                {/* Date Block Header - Metadata */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-col gap-4 relative">
                  <div className="absolute top-4 right-4">
                    {dateBlocks.length > 1 && (
                      <button onClick={() => removeDateBlock(dIndex)} className="text-xs text-red-600 font-semibold hover:text-red-800 flex items-center bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors border border-red-100">
                         <Trash2 className="w-4 h-4 mr-1.5" /> Remove Block
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-32">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date *</label>
                      <input type="date" value={dateBlock.examDate} onChange={e => handleUpdateDateBlock(dIndex, 'examDate', e.target.value)} className="w-full p-2.5 border border-indigo-200 shadow-sm rounded-lg text-sm outline-none focus:border-indigo-500 font-bold bg-indigo-50/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Day</label>
                      <input type="text" placeholder="Auto-filled" value={dateBlock.day} readOnly className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-sm cursor-not-allowed outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Regulation *</label>
                      <select value={dateBlock.regulation || '2022'} onChange={e => handleUpdateDateBlock(dIndex, 'regulation', e.target.value)} className="w-full p-2.5 border border-purple-200 shadow-sm rounded-lg text-sm outline-none focus:border-purple-500 font-semibold bg-purple-50/20">
                         <option value="2022">2022</option>
                         <option value="2016">2016</option>
                         <option value="2010">2010</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Curriculum *</label>
                      <select value={dateBlock.curriculum || 'Diploma In Engineering'} onChange={e => handleUpdateDateBlock(dIndex, 'curriculum', e.target.value)} className="w-full p-2.5 border border-orange-200 shadow-sm rounded-lg text-sm outline-none focus:border-orange-500 font-semibold bg-orange-50/20">
                        <option value="Diploma In Engineering">Diploma In Engineering</option>
                        <option value="Diploma In Engineering (Army)">Diploma In Engineering (Army)</option>
                        <option value="Diploma In Engineering (Naval)">Diploma In Engineering (Naval)</option>
                        <option value="Diploma In Textile Engineering">Diploma In Textile Engineering</option>
                        <option value="Diploma In Tourism And Hospitality">Diploma In Tourism And Hospitality</option>
                        <option value="Diploma In Agriculture">Diploma In Agriculture</option>
                        <option value="Diploma In Fisheries">Diploma In Fisheries</option>
                        <option value="Diploma In Forestry">Diploma In Forestry</option>
                        <option value="Diploma In Livestock">Diploma In Livestock</option>
                        <option value="Certificate In Marine Trade">Certificate In Marine Trade</option>
                        <option value="Diploma In Medical Technology">Diploma In Medical Technology</option>
                        <option value="Advanced Certificate Course">Advanced Certificate Course</option>
                        <option value="National Skill Standard Basic Certificate Course">Basic Certificate Course</option>
                        <option value="One Year Certificate Course">One Year Certificate Course</option>
                        <option value="Diploma In Commerce">Diploma In Commerce</option>
                        <option value="Certificate In Medical Ultrasound">Medical Ultrasound</option>
                        <option value="HSC (Business Management)">HSC (Business Management)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Block Body - Time & Subjects Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wide">
                        <th className="p-3 font-bold w-40 border-r border-slate-200">Time/Shift</th>
                        <th className="p-3 font-bold w-32 border-r border-slate-200">Subject Code</th>
                        <th className="p-3 font-bold min-w-[200px] border-r border-slate-200">Subject Name</th>
                        <th className="p-3 font-bold w-64 border-r border-slate-200">Semester & Departments</th>
                        <th className="p-3 font-bold w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dateBlock.timeSlots.map((timeSlot, tsIndex) => {
                        const totalSubjectsInTimeSlot = timeSlot.subjects.length;
                        
                        return timeSlot.subjects.map((sub, subIndex) => {
                          const isFirstSubInTime = subIndex === 0;

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Time Slot (Rowspan mapped) */}
                              {isFirstSubInTime && (
                                <td rowSpan={totalSubjectsInTimeSlot} className="border-r border-slate-200 p-3 sm:p-4 bg-white/50 w-40 align-top">
                                  <div className="flex flex-col gap-3 relative h-full">
                                    <input type="text" placeholder="e.g. 10:00 AM" value={timeSlot.timeShift} onChange={e => handleUpdateTimeSlot(dIndex, tsIndex, 'timeShift', e.target.value)} className="w-full p-2.5 border border-sky-200 bg-sky-50/30 rounded-lg text-sm outline-none focus:border-sky-500 shadow-sm" />
                                    
                                    <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-2">
                                      <button onClick={() => addSubject(dIndex, tsIndex)} className="text-[12px] text-white bg-slate-800 hover:bg-slate-900 font-semibold flex items-center justify-center p-1.5 rounded-md transition-colors shadow-sm mb-1">
                                        <Plus className="w-3 h-3 mr-1" /> Add Subject
                                      </button>
                                      <button onClick={() => addTimeSlot(dIndex)} className="text-[11px] text-sky-600 font-semibold hover:text-sky-800 flex items-center w-full justify-center bg-sky-50 p-1.5 rounded-md hover:bg-sky-100 transition-colors border border-sky-100">
                                        <Plus className="w-3 h-3 mr-1" /> Add Time
                                      </button>
                                      {dateBlock.timeSlots.length > 1 && (
                                        <button onClick={() => removeTimeSlot(dIndex, tsIndex)} className="text-[11px] text-rose-600 font-semibold hover:text-rose-800 flex items-center w-full justify-center p-1.5 rounded-md hover:bg-rose-50 transition-colors">
                                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}

                              {/* Subject Code */}
                              <td className="border-r border-slate-200 p-3 sm:p-4 w-32 align-top">
                                <input type="text" placeholder="e.g. 66151" value={sub.subjectCode} onChange={e => handleUpdateSubject(dIndex, tsIndex, subIndex, 'subjectCode', e.target.value)} className="w-full p-2.5 border border-slate-300 shadow-sm rounded-lg text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white" />
                              </td>

                              {/* Subject Name */}
                              <td className="border-r border-slate-200 p-3 sm:p-4 min-w-[200px] align-top">
                                <textarea rows={2} placeholder="Subject Name" value={sub.subjectName} onChange={e => handleUpdateSubject(dIndex, tsIndex, subIndex, 'subjectName', e.target.value)} className="w-full p-2.5 border border-slate-300 shadow-sm rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none font-medium"></textarea>
                              </td>

                              {/* Semester & Departments */}
                              <td className="border-r border-slate-200 p-3 sm:p-4 w-64 align-top bg-emerald-50/5">
                                <div className="flex flex-col gap-3 h-full">
                                  {sub.semesters.map((sem, semIndex) => (
                                     <div key={sem.id} className="border border-emerald-200 bg-white rounded-lg p-2.5 shadow-sm relative group/sem">
                                       <div className="font-bold text-sm text-emerald-800 flex justify-between items-center mb-2">
                                         <span>{sem.semesterName}</span>
                                         <button onClick={() => handleRemoveSemester(dIndex, tsIndex, subIndex, semIndex)} className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50" title="Remove Semester">
                                           <X className="w-3.5 h-3.5" />
                                         </button>
                                       </div>
                                       {dateBlock.curriculum && Object.keys(CURRICULUM_DEPARTMENTS).includes(dateBlock.curriculum) ? (
                                         <div className="flex flex-col gap-2 mt-1">
                                           <div className="flex flex-wrap gap-1">
                                             {sem.departments.map(dept => (
                                                <span key={dept} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-semibold rounded border border-sky-200" title={dept}>
                                                  {dept.replace(/^\d+\s/, '').replace(' Technology', '')} 
                                                  <button onClick={() => handleToggleSemesterDepartment(dIndex, tsIndex, subIndex, semIndex, dept)} className="hover:text-red-600"><X className="w-2.5 h-2.5" /></button>
                                                </span>
                                             ))}
                                           </div>
                                           <select value="" onChange={e => { if(e.target.value) handleToggleSemesterDepartment(dIndex, tsIndex, subIndex, semIndex, e.target.value); }} className="w-full px-1.5 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all bg-white font-medium cursor-pointer">
                                              <option value="" disabled>+ Add Dept</option>
                                              {!sem.departments.includes("All Department") && (
                                                <option value="All Department">All Department</option>
                                              )}
                                              {(CURRICULUM_DEPARTMENTS[dateBlock.curriculum] || []).filter(d => !sem.departments.includes(d)).map(d => {
                                                const match = d.match(/^(\d+)\s+(.+)$/);
                                                const display = match ? `${match[2]} (${match[1]})` : d;
                                                return <option key={d} value={d}>{display}</option>;
                                              })}
                                           </select>
                                         </div>
                                       ) : (
                                         <textarea
                                           rows={1}
                                           placeholder="e.g. Civil, Computer, Food"
                                           value={sem.departments.join(', ')}
                                           onChange={e => handleUpdateSemesterDepartment(dIndex, tsIndex, subIndex, semIndex, e.target.value)}
                                           className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all bg-slate-50 resize-none font-medium"
                                         />
                                       )}
                                     </div>
                                  ))}
                                  
                                  <select value="" onChange={e => { if(e.target.value) handleAddSemester(dIndex, tsIndex, subIndex, e.target.value); }} className="w-full mt-auto p-2 border border-emerald-200 border-dashed rounded-lg text-xs font-semibold text-emerald-600 outline-none focus:border-emerald-500 tracking-wide bg-emerald-50/30 cursor-pointer">
                                     <option value="" disabled>+ Add Semester</option>
                                     {['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'].filter(s => !sub.semesters.find(x => x.semesterName === s)).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                     ))}
                                  </select>
                                </div>
                              </td>

                              {/* Action */}
                              <td className="p-3 sm:p-4 text-center w-12 align-middle">
                                <button onClick={() => removeSubject(dIndex, tsIndex, subIndex)} className="text-rose-400 hover:text-rose-600 transition-colors p-1" title="Remove Subject Row">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-200 pt-6 mt-2">
             <button 
               type="button" 
               onClick={addDateBlock}
               className="w-full sm:w-auto px-6 py-3 font-semibold text-slate-700 bg-white border-2 border-slate-300 shadow-sm hover:border-slate-400 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center active:scale-95"
             >
               <Plus className="w-5 h-5 mr-2 text-slate-500" />
               Add Another Date Block
             </button>

             <button 
                type="button" 
                onClick={handleSave}
                disabled={saving} 
                className="w-full sm:w-auto px-8 py-3 font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-75 md:text-lg"
             >
               {saving ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <SaveAll className="w-5 h-5 mr-3" />}
               {saving ? 'Saving Full Routine...' : 'Save Complete Routine'}
             </button>
          </div>
        </div>
      )}

      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {Object.keys(grouped).length === 0 ? (
            <div className="p-8 text-center text-gray-500">No exam routines found.</div>
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
                                <span className="font-medium text-gray-700">{reg} Regulation</span>
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
                                          <span className="text-sm font-medium text-gray-700">{sem}</span>
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
                                                </button>

                                                <AnimatePresence>
                                                  {expandedDept === `${curr}-${reg}-${sem}-${dept}` && (
                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="pl-6 pr-4 pb-4 overflow-hidden">
                                                      <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden mt-2 p-4">
                                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                                          <h3 className="font-bold text-gray-800">{dept} - {sem}</h3>
                                                        </div>
                                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                          <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-gray-700 uppercase text-[11px] tracking-wider">
                                                              <tr>
                                                                <th className="px-4 py-3 border-b font-semibold">Subject</th>
                                                                <th className="px-4 py-3 border-b font-semibold">Date & Time</th>
                                                                <th className="px-4 py-3 border-b font-semibold text-right">Actions</th>
                                                              </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                              {grouped[curr][reg][sem][dept].subjects.map((subject: any) => (
                                                                <tr key={subject.id} className="hover:bg-blue-50/50 transition-colors">
                                                                  <td className="px-4 py-3 align-top">
                                                                    <div className="text-slate-900 font-bold whitespace-normal">{subject.subjectName}</div>
                                                                    <div className="flex gap-2 mt-1.5 flex-wrap">
                                                                      <code className="text-slate-600 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Code: {subject.subjectCode}</code>
                                                                    </div>
                                                                  </td>
                                                                  <td className="px-4 py-3 align-top">
                                                                    <div className="text-slate-900 font-bold bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg inline-flex items-center text-xs">
                                                                      <CalendarRange className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                                      {subject.date}
                                                                    </div>
                                                                    <div className="text-slate-500 font-medium text-xs mt-2 pl-1">
                                                                      {subject.day && `${subject.day} • `}{subject.time}
                                                                    </div>
                                                                  </td>
                                                                  <td className="px-4 py-3 text-right align-top">
                                                                    <button onClick={() => { setEditingItem(subject); setEditForm({ subjectName: subject.subjectName || '', subjectCode: subject.subjectCode || '', date: subject.date || '', time: subject.time || '', day: subject.day || '' }); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors mr-2" title="Edit">
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
                <h3 className="font-bold text-gray-800">Edit Routine Entry</h3>
                <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <form onSubmit={handleUpdate} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                  <input required type="text" value={editForm.subjectName} onChange={e => setEditForm({...editForm, subjectName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                    <input required type="text" value={editForm.subjectCode} onChange={e => setEditForm({...editForm, subjectCode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input required type="text" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input required type="text" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <input type="text" value={editForm.day} onChange={e => setEditForm({...editForm, day: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50">
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
