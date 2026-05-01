import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Folder, FolderOpen, BookCopy, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';

export default function Booklists() {
  const [booklists, setBooklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedSem, setExpandedSem] = useState<string | null>(null);

  useEffect(() => {
    fetchBooklists().catch(console.error);
  }, []);

  const fetchBooklists = async () => {
    try {
      const q = query(collection(db, 'booklists'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      setBooklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const grouped = booklists.reduce((acc, curr) => {
    if (!acc[curr.department]) acc[curr.department] = { code: curr.departmentCode || '', semesters: {} };
    if (!acc[curr.department].semesters[curr.semester]) acc[curr.department].semesters[curr.semester] = [];
    acc[curr.department].semesters[curr.semester].push(curr);
    return acc;
  }, {});

  const handlePrint = (dept: string, sem: string) => {
    const printContent = document.getElementById(`booklist-${dept}-${sem}`);
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // To restore event listeners
    }
  };

  const handleDownloadPNG = async (dept: string, sem: string) => {
    const printContent = document.getElementById(`booklist-${dept}-${sem}`);
    if (printContent) {
      // Temporarily make it visible for html2canvas
      printContent.parentElement!.classList.remove('hidden');
      printContent.style.display = 'block';
      printContent.style.position = 'absolute';
      printContent.style.top = '-9999px';
      
      try {
        const canvas = await html2canvas(printContent, {
          scale: 2, // Higher resolution
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `${dept}-${sem}-Booklist.png`;
        link.click();
      } catch (err) {
        console.error("Error generating screenshot", err);
      } finally {
        // Restore hidden state
        printContent.parentElement!.classList.add('hidden');
        printContent.style.display = 'none';
        printContent.style.position = '';
        printContent.style.top = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-blue-700">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="mt-4 font-medium text-gray-600">Loading booklists...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full px-4 sm:px-6 py-12 font-sans">
      <div className="w-full max-w-4xl space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center print:hidden">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booklists</h1>
          <p className="text-gray-500">Browse and download booklists by department and semester.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
          {Object.keys(grouped).length === 0 ? (
            <div className="p-8 text-center text-gray-500">No booklists found.</div>
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
                    {grouped[dept].code && (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-wider">
                        Code: {grouped[dept].code}
                      </span>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedDept === dept && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-gray-50/50 border-t border-gray-100 overflow-hidden"
                      >
                        {Object.keys(grouped[dept].semesters).map(sem => (
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
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                      <h3 className="font-bold text-gray-800">{dept} - {sem} Semester Booklist</h3>
                                      <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                          onClick={() => handlePrint(dept, sem)}
                                          className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                          <Printer className="w-4 h-4" /> Print
                                        </button>
                                        <button
                                          onClick={() => handleDownloadPNG(dept, sem)}
                                          className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                          <Download className="w-4 h-4" /> Download PNG
                                        </button>
                                      </div>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                      <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 uppercase text-[11px] tracking-wider">
                                          <tr>
                                            <th className="px-4 py-3 border-b font-semibold">Subject Name</th>
                                            <th className="px-4 py-3 border-b font-semibold">Subject Code</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {grouped[dept].semesters[sem].map((subject: any) => (
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
            Object.keys(grouped[dept].semesters).map(sem => (
              <div key={`print-${dept}-${sem}`} id={`booklist-${dept}-${sem}`} className="bg-white p-8" style={{ width: '800px', display: 'none' }}>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-700 font-bold text-2xl mb-3">
                    B
                  </div>
                  <h1 className="text-2xl font-bold mb-2 text-gray-900">Booklist</h1>
                  <h2 className="text-xl font-semibold text-gray-700">{dept} - {sem} Semester</h2>
                  {grouped[dept].code && <p className="text-sm text-gray-500 mt-1">Department Code: {grouped[dept].code}</p>}
                </div>
                <table className="w-full text-sm text-left border-collapse border border-gray-300">
                  <thead className="bg-gray-100 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 border border-gray-300 font-semibold">Subject Name</th>
                      <th className="px-4 py-3 border border-gray-300 font-semibold">Subject Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[dept].semesters[sem].map((subject: any) => (
                      <tr key={`print-row-${subject.id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border border-gray-300 font-medium">{subject.subjectName}</td>
                        <td className="px-4 py-3 border border-gray-300 font-mono text-gray-600">{subject.subjectCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-8 text-center text-xs font-medium text-gray-400 uppercase tracking-widest border-t pt-4">
                  Downloaded from BTEB Result Library
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
