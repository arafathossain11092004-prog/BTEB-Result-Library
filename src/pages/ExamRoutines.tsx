import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Folder, FolderOpen, FileText, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedSem, setExpandedSem] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutines().catch(console.error);
  }, []);

  const fetchRoutines = async () => {
    try {
      const q = query(collection(db, 'examRoutines'), orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const grouped = routines.reduce((acc, curr) => {
    if (!acc[curr.department]) acc[curr.department] = {};
    if (!acc[curr.department][curr.semester]) acc[curr.department][curr.semester] = [];
    acc[curr.department][curr.semester].push(curr);
    return acc;
  }, {});

  const handlePrint = (dept: string, sem: string) => {
    const printContent = document.getElementById(`routine-${dept}-${sem}`);
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // To restore event listeners
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-blue-700">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="mt-4 font-medium text-gray-600">Loading routines...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center print:hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Routines</h1>
        <p className="text-gray-500">Browse and download exam schedules by department and semester.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No exam routines found.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {Object.keys(grouped).map(dept => (
              <li key={dept}>
                <button
                  onClick={() => {
                    setExpandedDept(expandedDept === dept ? null : dept);
                    setExpandedSem(null);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedDept === dept ? (
                      <FolderOpen className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Folder className="w-6 h-6 text-blue-500" />
                    )}
                    <span className="font-semibold text-gray-800">{dept}</span>
                  </div>
                </button>
                
                <AnimatePresence>
                  {expandedDept === dept && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-gray-50/50 border-t border-gray-100 overflow-hidden"
                    >
                      {Object.keys(grouped[dept]).map(sem => (
                        <li key={sem} className="pl-12">
                          <button
                            onClick={() => setExpandedSem(expandedSem === sem ? null : sem)}
                            className="w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              {expandedSem === sem ? (
                                <FolderOpen className="w-5 h-5 text-orange-400" />
                              ) : (
                                <Folder className="w-5 h-5 text-orange-400" />
                              )}
                              <span className="font-medium text-gray-700">{sem} Semester</span>
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {expandedSem === sem && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="pl-6 pr-4 pb-4 overflow-hidden"
                              >
                                <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden mt-2 p-4">
                                  <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800">{dept} - {sem} Semester Routine</h3>
                                    <button
                                      onClick={() => handlePrint(dept, sem)}
                                      className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      <Printer className="w-4 h-4" /> Download / Print
                                    </button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                                        <tr>
                                          <th className="px-4 py-3 border-b">Date</th>
                                          <th className="px-4 py-3 border-b">Time</th>
                                          <th className="px-4 py-3 border-b">Subject Name</th>
                                          <th className="px-4 py-3 border-b">Subject Code</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {grouped[dept][sem].map((subject: any) => (
                                          <tr key={subject.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap">{subject.date}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{subject.time}</td>
                                            <td className="px-4 py-3 font-medium">{subject.subjectName}</td>
                                            <td className="px-4 py-3 text-gray-500">{subject.subjectCode}</td>
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
          </ul>
        )}
      </div>

      {/* Hidden print templates */}
      <div className="hidden">
        {Object.keys(grouped).map(dept => 
          Object.keys(grouped[dept]).map(sem => (
            <div key={`print-${dept}-${sem}`} id={`routine-${dept}-${sem}`} className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Exam Routine</h1>
                <h2 className="text-xl font-semibold text-gray-700">{dept} - {sem} Semester</h2>
              </div>
              <table className="w-full text-sm text-left border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 border border-gray-300">Date</th>
                    <th className="px-4 py-3 border border-gray-300">Time</th>
                    <th className="px-4 py-3 border border-gray-300">Subject Name</th>
                    <th className="px-4 py-3 border border-gray-300">Subject Code</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[dept][sem].map((subject: any) => (
                    <tr key={`print-row-${subject.id}`}>
                      <td className="px-4 py-3 border border-gray-300">{subject.date}</td>
                      <td className="px-4 py-3 border border-gray-300">{subject.time}</td>
                      <td className="px-4 py-3 border border-gray-300 font-medium">{subject.subjectName}</td>
                      <td className="px-4 py-3 border border-gray-300">{subject.subjectCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-8 text-center text-xs text-gray-500">
                Downloaded from BTEB Result Library
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
