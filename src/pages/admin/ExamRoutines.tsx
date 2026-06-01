import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Trash2, Loader2, CalendarRange, X, Save, SaveAll } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface RoutineSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  department: string;
}

interface RoutineSemester {
  id: string;
  semesterPhase: string;
  subjects: RoutineSubject[];
}

interface RoutineTimeSlot {
  id: string;
  timeShift: string;
  semesters: RoutineSemester[];
}

interface RoutineDateBlock {
  id: string;
  examDate: string;
  day: string;
  timeSlots: RoutineTimeSlot[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateEmptySubject = (): RoutineSubject => ({ id: generateId(), subjectCode: '', subjectName: '', department: '' });
const generateEmptySemester = (): RoutineSemester => ({ id: generateId(), semesterPhase: '', subjects: [generateEmptySubject()] });
const generateEmptyTimeSlot = (): RoutineTimeSlot => ({ id: generateId(), timeShift: '10:00 AM', semesters: [generateEmptySemester()] });
const generateEmptyDateBlock = (): RoutineDateBlock => ({ id: generateId(), examDate: '', day: '', timeSlots: [generateEmptyTimeSlot()] });

export default function AdminExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Global Meta State
  const [globalRegulation, setGlobalRegulation] = useState('2022');
  const [globalCurriculum, setGlobalCurriculum] = useState('Diploma in Engineering');
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

  const handleUpdateSemester = (dIndex: number, tsIndex: number, sIndex: number, field: keyof RoutineSemester, value: string) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex].semesters[sIndex] = { ...newBlocks[dIndex].timeSlots[tsIndex].semesters[sIndex], [field]: value };
    setDateBlocks(newBlocks);
  };

  const addSemester = (dIndex: number, tsIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex].semesters.push(generateEmptySemester());
    setDateBlocks(newBlocks);
  };

  const removeSemester = (dIndex: number, tsIndex: number, sIndex: number) => {
    if (confirm('Delete this semester and all its subjects?')) {
      const newBlocks = structuredClone(dateBlocks);
      newBlocks[dIndex].timeSlots[tsIndex].semesters.splice(sIndex, 1);
      setDateBlocks(newBlocks);
    }
  };

  const handleUpdateSubject = (dIndex: number, tsIndex: number, sIndex: number, subIndex: number, field: keyof RoutineSubject, value: string) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex].semesters[sIndex].subjects[subIndex] = { 
      ...newBlocks[dIndex].timeSlots[tsIndex].semesters[sIndex].subjects[subIndex], 
      [field]: value 
    };
    setDateBlocks(newBlocks);
  };

  const addSubject = (dIndex: number, tsIndex: number, sIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    newBlocks[dIndex].timeSlots[tsIndex].semesters[sIndex].subjects.push(generateEmptySubject());
    setDateBlocks(newBlocks);
  };

  const removeSubject = (dIndex: number, tsIndex: number, sIndex: number, subIndex: number) => {
    const newBlocks = structuredClone(dateBlocks);
    const sem = newBlocks[dIndex].timeSlots[tsIndex].semesters[sIndex];
    if (sem.subjects.length > 1) {
      sem.subjects.splice(subIndex, 1);
    } else {
      if (newBlocks[dIndex].timeSlots[tsIndex].semesters.length > 1) {
         newBlocks[dIndex].timeSlots[tsIndex].semesters.splice(sIndex, 1);
      } else {
        alert("Cannot remove the last subject of the last semester. Remove the Date or Time Block instead.");
        return;
      }
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
        for (let sem of ts.semesters) {
          if (!sem.semesterPhase) valid = false;
          for (let sub of sem.subjects) {
            if (!sub.subjectCode || !sub.subjectName) valid = false;
          }
        }
      }
    }
    if (!valid) {
      alert("Please fill all required fields (Date, Time, Semester, Subject Code, Subject Name).");
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      dateBlocks.forEach(dateBlock => {
        // Format date string from YYYY-MM-DD to standard if needed, or preserve Date object
        const inputDate = dateBlock.examDate; 
        let formattedDate = inputDate; 
        if (inputDate.includes('-')) {
          const [yyyy, mm, dd] = inputDate.split('-');
          formattedDate = `${dd}-${mm}-${yyyy}`; // Align to BTEB PDF format often logged as DD-MM-YYYY
        }

        dateBlock.timeSlots.forEach(timeSlot => {
          timeSlot.semesters.forEach(sem => {
            sem.subjects.forEach(sub => {
              const newDocRef = doc(collection(db, 'examRoutines'));
              batch.set(newDocRef, {
                curriculum: globalCurriculum,
                regulation: globalRegulation.includes('Probidhan') ? globalRegulation : `${globalRegulation} Probidhan`,
                semester: sem.semesterPhase,
                department: sub.department || 'Other',
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

  // Rendering table logic
  const renderRoutineTableBody = () => {
    const rows: JSX.Element[] = [];
    
    dateBlocks.forEach((dateBlock, dIndex) => {
      const totalSubjectsInDateBlock = dateBlock.timeSlots.reduce((sum1, ts) => 
        sum1 + ts.semesters.reduce((sum2, sem) => sum2 + sem.subjects.length, 0)
      , 0);

      dateBlock.timeSlots.forEach((timeSlot, tsIndex) => {
        const totalSubjectsInTimeSlot = timeSlot.semesters.reduce((sum, sem) => sum + sem.subjects.length, 0);

        timeSlot.semesters.forEach((sem, sIndex) => {
          const totalSubjectsInSem = sem.subjects.length;

          sem.subjects.forEach((sub, subIndex) => {
            const isFirstSubInSem = subIndex === 0;
            const isFirstSemInTime = sIndex === 0;
            const isFirstTimeInDate = tsIndex === 0;

            const isFirstRowInSem = isFirstSubInSem;
            const isFirstRowInTime = isFirstSubInSem && isFirstSemInTime;
            const isFirstRowInDate = isFirstSubInSem && isFirstSemInTime && isFirstTimeInDate;

            rows.push(
              <tr key={sub.id} className="border-b border-gray-200 hover:bg-slate-50/50 transition-colors">
                {/* Date Block */}
                {isFirstRowInDate && (
                  <td rowSpan={totalSubjectsInDateBlock} className="border-r border-gray-200 p-3 sm:p-4 bg-white w-48 align-top group/date">
                    <div className="flex flex-col gap-3 relative h-full">
                      <input type="date" value={dateBlock.examDate} onChange={e => handleUpdateDateBlock(dIndex, 'examDate', e.target.value)} className="w-full p-2.5 border border-indigo-200 shadow-sm rounded-lg text-sm outline-none focus:border-indigo-500 font-bold bg-indigo-50/20" />
                      <input type="text" placeholder="Day" value={dateBlock.day} readOnly className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-sm cursor-not-allowed outline-none font-medium" />
                      <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-2">
                        {dateBlocks.length > 1 && (
                          <button onClick={() => removeDateBlock(dIndex)} className="text-[11px] text-red-600 font-semibold hover:text-red-800 flex items-center bg-red-50 p-1.5 rounded-md hover:bg-red-100 transition-colors w-full justify-center border border-red-100">
                             <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Date
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                )}
                
                {/* Time Slot */}
                {isFirstRowInTime && (
                  <td rowSpan={totalSubjectsInTimeSlot} className="border-r border-gray-200 p-3 sm:p-4 bg-white w-40 align-top group/time">
                     <div className="flex flex-col gap-3 relative h-full">
                       <input type="text" placeholder="e.g. 10:00 AM" value={timeSlot.timeShift} onChange={e => handleUpdateTimeSlot(dIndex, tsIndex, 'timeShift', e.target.value)} className="w-full p-2.5 border border-sky-200 bg-sky-50/30 rounded-lg text-sm outline-none focus:border-sky-500 shadow-sm" />
                       
                       <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-2">
                         <button onClick={() => addTimeSlot(dIndex)} className="text-[11px] text-sky-600 font-semibold hover:text-sky-800 flex items-center w-full justify-center bg-sky-50 p-1.5 rounded-md hover:bg-sky-100 transition-colors border border-sky-100">
                           <Plus className="w-3.5 h-3.5 mr-1" /> Add Time
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

                {/* Semester */}
                {isFirstRowInSem && (
                  <td rowSpan={totalSubjectsInSem} className="border-r border-gray-200 p-3 sm:p-4 bg-white w-48 align-top group/sem">
                    <div className="flex flex-col gap-3 relative h-full">
                      <select value={sem.semesterPhase} onChange={e => handleUpdateSemester(dIndex, tsIndex, sIndex, 'semesterPhase', e.target.value)} className="w-full p-2.5 border border-emerald-200 shadow-sm rounded-lg text-sm outline-none focus:border-emerald-500 bg-emerald-50/30 font-semibold cursor-pointer">
                        <option value="" disabled>Select Semester</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                        <option value="3rd Semester">3rd Semester</option>
                        <option value="4th Semester">4th Semester</option>
                        <option value="5th Semester">5th Semester</option>
                        <option value="6th Semester">6th Semester</option>
                        <option value="7th Semester">7th Semester</option>
                        <option value="8th Semester">8th Semester</option>
                      </select>
                      
                      <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-2">
                        <button onClick={() => addSubject(dIndex, tsIndex, sIndex)} className="text-[12px] text-white bg-slate-800 hover:bg-slate-900 font-semibold flex items-center justify-center p-1.5 rounded-md transition-colors shadow-sm">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Subj/Row
                        </button>
                        
                        {timeSlot.semesters.length - 1 === sIndex && (
                          <button onClick={() => addSemester(dIndex, tsIndex)} className="text-[11px] text-emerald-700 font-semibold hover:text-emerald-900 flex items-center justify-center p-1.5 bg-emerald-50 border border-emerald-100 rounded-md hover:bg-emerald-100 transition-colors mt-1">
                            <Plus className="w-3 h-3 mr-1" /> Semester
                          </button>
                        )}
                         {timeSlot.semesters.length > 1 && (
                           <button onClick={() => removeSemester(dIndex, tsIndex, sIndex)} className="text-[11px] text-orange-600 font-semibold hover:text-orange-800 flex items-center w-full justify-center p-1.5 rounded-md hover:bg-orange-50 transition-colors">
                             <Trash2 className="w-3 h-3 mr-1" /> Remove
                           </button>
                         )}
                      </div>
                    </div>
                  </td>
                )}

                {/* Subject Code */}
                <td className="border-r border-gray-200 p-3 sm:p-4 w-32 align-top">
                  <input type="text" placeholder="e.g. 66151" value={sub.subjectCode} onChange={e => handleUpdateSubject(dIndex, tsIndex, sIndex, subIndex, 'subjectCode', e.target.value)} className="w-full p-2.5 border border-gray-300 shadow-sm rounded-lg text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white" />
                </td>

                {/* Subject Name */}
                <td className="border-r border-gray-200 p-3 sm:p-4 min-w-[200px] align-top">
                  <textarea rows={2} placeholder="Subject Name" value={sub.subjectName} onChange={e => handleUpdateSubject(dIndex, tsIndex, sIndex, subIndex, 'subjectName', e.target.value)} className="w-full p-2.5 border border-gray-300 shadow-sm rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none font-medium"></textarea>
                </td>

                {/* Department */}
                <td className="border-r border-gray-200 p-3 sm:p-4 w-40 align-top">
                  <input type="text" placeholder="e.g. Civil" value={sub.department} onChange={e => handleUpdateSubject(dIndex, tsIndex, sIndex, subIndex, 'department', e.target.value)} className="w-full p-2.5 border border-gray-300 shadow-sm rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white" />
                </td>

                {/* Action */}
                <td className="p-3 sm:p-4 text-center w-16 align-middle">
                  <button onClick={() => removeSubject(dIndex, tsIndex, sIndex, subIndex)} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg border border-rose-100 transition-all shadow-sm" title="Remove Subject Row">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          });
        });
      });
    });

    return rows;
  }

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
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-3xl border border-gray-200 shadow-sm mb-6 flex flex-col gap-8 pb-32">
          
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-100 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Default Regulation *</label>
              <select value={globalRegulation} onChange={e => setGlobalRegulation(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white shadow-sm">
                 <option value="2022">2022 Probidhan</option>
                 <option value="2016">2016 Probidhan</option>
                 <option value="2010">2010 Probidhan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Default Curriculum *</label>
              <input type="text" value={globalCurriculum} onChange={e => setGlobalCurriculum(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 shadow-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Publish Date (Optional)</label>
              <input type="date" value={globalPublishDate} onChange={e => setGlobalPublishDate(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 shadow-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white" />
            </div>
          </div>

          <div className="overflow-x-auto shadow-sm ring-1 ring-black ring-opacity-5 rounded-2xl pb-4">
            <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-200 tracking-wide">
                  <th className="p-4 font-bold text-xs uppercase w-48 border-r border-slate-200">Date & Day</th>
                  <th className="p-4 font-bold text-xs uppercase w-40 border-r border-slate-200">Time/Shift</th>
                  <th className="p-4 font-bold text-xs uppercase w-48 border-r border-slate-200">Semester/Phase</th>
                  <th className="p-4 font-bold text-xs uppercase w-32 border-r border-slate-200">Subject Code</th>
                  <th className="p-4 font-bold text-xs uppercase min-w-[200px] border-r border-slate-200">Subject Name</th>
                  <th className="p-4 font-bold text-xs uppercase w-40 border-r border-slate-200">Department</th>
                  <th className="p-4 font-bold text-xs uppercase w-16 text-center">Row</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {renderRoutineTableBody()}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-200 pt-6 mt-4">
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-slate-200 text-slate-600 text-left">
                <tr>
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">Curriculum & Regulation</th>
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs hidden md:table-cell">Semester & Dept</th>
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">Subject</th>
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">Date & Time</th>
                  <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routines.length === 0 ? (
                   <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-base">No routines found in the database.</td></tr>
                ) : (
                  routines.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 px-5 align-top">
                        <div className="text-slate-900 font-bold max-w-[200px] truncate">{r.curriculum || 'N/A'}</div>
                        <div className="text-indigo-600 font-semibold text-[11px] mt-1 bg-indigo-50 px-2 py-0.5 rounded inline-block border border-indigo-100">{r.regulation || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-5 align-top hidden md:table-cell">
                        <div className="text-slate-900 font-bold">{r.semester}</div>
                        <div className="text-slate-600 mt-1 max-w-[150px] truncate" title={r.department}>{r.department || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="text-slate-900 font-bold whitespace-normal max-w-[250px]">{r.subjectName}</div>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <code className="text-slate-600 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Code: {r.subjectCode}</code>
                          <span className="md:hidden text-indigo-600 font-semibold text-[11px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{r.semester} | {r.department}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="text-slate-900 font-bold bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg inline-flex items-center">
                          <CalendarRange className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {r.date}
                        </div>
                        <div className="text-slate-500 font-medium text-xs mt-2 pl-1">
                          {r.day && `${r.day} • `}{r.time}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right align-top">
                        <button onClick={() => handleDelete(r.id)} className="p-2 text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 rounded-lg transition-all shadow-sm opacity-50 xl:opacity-0 group-hover:opacity-100" title="Delete">
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
