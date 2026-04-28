import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, ArrowLeft, Loader2, Printer, BookOpen, Calendar, Building, Calculator, Heart, Copy, Share2, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResultView() {
  const [searchParams] = useSearchParams();
  const roll = searchParams.get('roll');
  const instituteCode = searchParams.get('instituteCode');
  const type = searchParams.get('type') || 'individual';
  const curriculum = searchParams.get('curriculum') || '';
  const regulation = searchParams.get('regulation') || '';
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bannerConfig, setBannerConfig] = useState<{bannerUrl: string, bannerLink: string} | null>(null);
  
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bannerUrl) {
            setBannerConfig({
              bannerUrl: data.bannerUrl,
              bannerLink: data.bannerLink || ''
            });
          }
        }
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
           console.warn("Could not fetch banner settings: Firebase Client is offline. App will continue without it.");
        } else {
           console.error("Error fetching settings:", error);
        }
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!roll && !instituteCode) {
      setError('Invalid search parameters.');
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        let firebaseResults: any[] = [];
        
        try {
          if (type === 'institute' && instituteCode) {
             const q = query(collection(db, 'results'), where('instituteCode', '==', instituteCode));
             const snap = await getDocs(q);
             snap.forEach(d => firebaseResults.push({ id: d.id, ...d.data() }));
          } else if (roll) {
             const rollsList = roll.split(/[,\s]+/).map(r => r.trim()).filter(Boolean);
             const chunks = [];
             for (let i = 0; i < rollsList.length; i += 10) {
                 chunks.push(rollsList.slice(i, i + 10));
             }
             for (const chunk of chunks) {
                 const q = query(collection(db, 'results'), where('rollNumber', 'in', chunk));
                 const snap = await getDocs(q);
                 snap.forEach(d => firebaseResults.push({ id: d.id, ...d.data() }));
             }
          }
        } catch (dbErr) {
           console.warn("Firebase query failed:", dbErr);
        }

        if (firebaseResults.length > 0) {
           setResults(firebaseResults);
           setLoading(false);
           return;
        }

        let apiUrl = '/api/results?';
        const queryParams = new URLSearchParams();
        
        if (type === 'institute' && instituteCode) {
          queryParams.append('type', 'institute');
          queryParams.append('instituteCode', instituteCode);
        } else if (roll) {
          queryParams.append('type', type);
          queryParams.append('roll', roll);
        }

        if (curriculum) queryParams.append('curriculumId', curriculum);
        if (regulation) queryParams.append('regulation', regulation);

        apiUrl += queryParams.toString();

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch from server');
        }

        const json = await response.json();
        
        if (!json.success || !json.data || json.data.length === 0) {
          setError('No results found for this roll number.');
          setLoading(false);
          return;
        }

        const mappedResults = json.data.map((item: any) => {
          const mapped: any = {
            id: item.roll + '_' + item.curriculumId,
            rollNumber: item.roll.toString(),
            instituteName: item.institute?.name || '',
            curriculum: item.curriculumId === 'diploma_in_engineering' ? 'Diploma in Engineering' : 
                        item.curriculumId === 'diploma_in_textile' ? 'Diploma in Textile Engineering' :
                        item.curriculumId === 'diploma_in_agriculture' ? 'Diploma in Agriculture' :
                        item.curriculumId === 'diploma_in_marine' ? 'Diploma in Marine Engineering' :
                        item.curriculumId === 'hsc_bm' ? 'HSC (Business Management)' :
                        item.curriculumId === 'hsc_voc' ? 'HSC (Vocational)' : item.curriculumId,
            regulation: item.regulation?.toString() || '',
          };

          const currentFailed = item.currentFailedSubjects || [];

          item.semesterResults?.forEach((sem: any) => {
            let valStr = '';
            const failedInThisSem = currentFailed.filter((f: any) => f.originSemester === sem.semester);
            const latestResult = sem.results?.[0] || {};
            
            if (failedInThisSem.length === 0) {
              let foundGpa = null;
              for (const r of sem.results || []) {
                if (r.cgpa || r.gpa) {
                  foundGpa = r.cgpa || r.gpa;
                  break;
                }
              }
              valStr = JSON.stringify({ type: 'passed', gpa: foundGpa || 'Passed', date: latestResult.date });
            } else {
              valStr = JSON.stringify({ type: 'referred', subjects: failedInThisSem, gpa: null, date: latestResult.date });
            }
            mapped[`semester${sem.semester}`] = valStr;
          });

          return mapped;
        });

        setResults(mappedResults);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [roll, instituteCode, type, curriculum, regulation]);

  const handleDownload = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  const parseSemester = (val: string) => {
    if (!val || val === '-' || val === 'undefined') return null;
    try {
      const parsed = JSON.parse(val);
      if (parsed.type === 'referred') {
        const subjects: any[] = parsed.subjects || [];
        return { type: 'referred', subjects, total: subjects.length, gpa: parsed.gpa || null, date: parsed.date };
      }
      return { type: 'passed', gpa: parsed.gpa || null, date: parsed.date };
    } catch (e) {
      // In case it's an old format
      if (val.startsWith('{"type":"referred"')) {
        return { type: 'referred', subjects: [], total: 0, gpa: null, date: null };
      }
      return { type: 'passed', gpa: val, date: null };
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Fetching Results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg border border-red-200 mb-6 font-medium">
          {error}
        </div>
        <button onClick={() => window.history.back()} className="inline-flex items-center text-blue-700 hover:text-blue-800 font-medium bg-blue-50 px-4 py-2 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10 mt-6 lg:px-4">
      <div className="mb-4 flex gap-2 justify-between items-center bg-gray-50 p-3 rounded border border-gray-200 print:hidden flex-wrap">
        <button onClick={() => window.history.back()} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 mr-2 hidden sm:block" /> Download
          </button>
          <button 
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2 hidden sm:block" /> Print
          </button>
        </div>
      </div>

      <div 
        ref={resultRef}
        className="bg-white rounded border border-gray-200 shadow-sm print:shadow-none print:border-transparent p-6 sm:p-10 relative"
      >
        {type === 'individual' ? (
           <div className="space-y-12">
             {results.map((resultItem, mapIndex) => (
               <div key={resultItem.id} className="max-w-3xl mx-auto space-y-4">
                  <div className="pb-6 border-b border-gray-200">
                     <div className="text-center mb-8">
                       <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-gray-800">Academic Result</h2>
                     </div>
                     <table className="w-full text-left text-sm sm:text-base">
                       <tbody>
                         <tr>
                           <td className="py-1.5 font-semibold text-gray-600 w-32 sm:w-48 align-top">Roll No</td>
                           <td className="py-1.5 font-bold text-gray-900 border-b border-gray-100">: {resultItem.rollNumber}</td>
                         </tr>
                         <tr>
                           <td className="py-1.5 font-semibold text-gray-600 align-top">Institute</td>
                           <td className="py-1.5 text-gray-800 border-b border-gray-100">: {resultItem.instituteName}</td>
                         </tr>
                         <tr>
                           <td className="py-1.5 font-semibold text-gray-600 align-top">Curriculum</td>
                           <td className="py-1.5 text-gray-800 border-b border-gray-100">: {resultItem.curriculum || 'Diploma in Engineering'}</td>
                         </tr>
                         <tr>
                           <td className="py-1.5 font-semibold text-gray-600 align-top">Regulation</td>
                           <td className="py-1.5 text-gray-800 border-b border-gray-100">: {resultItem.regulation || 'N/A'}</td>
                         </tr>
                       </tbody>
                     </table>
                  </div>

                  {/* Actions */}
                  {mapIndex === 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-6 print:hidden py-2" data-html2canvas-ignore="true">
                      <button onClick={() => {
                         const sems = [
                           parseSemester(resultItem.semester1),
                           parseSemester(resultItem.semester2),
                           parseSemester(resultItem.semester3),
                           parseSemester(resultItem.semester4),
                           parseSemester(resultItem.semester5),
                           parseSemester(resultItem.semester6),
                           parseSemester(resultItem.semester7),
                           parseSemester(resultItem.semester8)
                         ];
                         let total = 0;
                         let count = 0;
                         let isReferred = false;
                         for (const s of sems) {
                           if (s) {
                             if (s.type === 'referred') isReferred = true;
                             else if (s.type === 'passed' && !isNaN(Number(s.gpa))) {
                               total += Number(s.gpa);
                               count++;
                             }
                           }
                         }
                         if (isReferred) alert("Cannot calculate CGPA: Student has referred subjects.");
                         else if (count === 0) alert("Cannot calculate CGPA: No GPA data available.");
                         else alert(`Approximate Average CGPA: ${(total/count).toFixed(2)}\nNote: Official BTEB CGPA applies weightage per semester.`);
                      }} className="px-3 py-1.5 bg-white border border-gray-300 shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center transition-colors">
                        <Calculator className="w-4 h-4 mr-2 text-blue-600"/> Estimate CGPA
                      </button>
                      <button onClick={handlePrint} className="px-3 py-1.5 bg-white border border-gray-300 shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center transition-colors">
                         <Printer className="w-4 h-4 mr-2 text-blue-600"/> Print
                      </button>
                      <button onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Result View: ' + resultItem.rollNumber,
                            url: window.location.href
                          }).catch(console.error);
                        } else {
                          alert('Sharing is not supported on this browser.');
                        }
                      }} className="px-3 py-1.5 bg-white border border-gray-300 shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center transition-colors">
                         <Share2 className="w-4 h-4 mr-2 text-blue-600"/> Share
                      </button>
                    </div>
                  )}

                  {/* Overall referred warning */}
                  {(() => {
                    const semestersList = [
                      { label: '8th Semester', value: resultItem.semester8 },
                      { label: '7th Semester', value: resultItem.semester7 },
                      { label: '6th Semester', value: resultItem.semester6 },
                      { label: '5th Semester', value: resultItem.semester5 },
                      { label: '4th Semester', value: resultItem.semester4 },
                      { label: '3rd Semester', value: resultItem.semester3 },
                      { label: '2nd Semester', value: resultItem.semester2 },
                      { label: '1st Semester', value: resultItem.semester1 },
                    ].filter(s => parseSemester(s.value) !== null);

                    const totalReferredCount = semestersList.reduce((acc, curr) => {
                      const p = parseSemester(curr.value);
                      return (p && p.type === 'referred') ? acc + p.total : acc;
                    }, 0);

                    return (
                      <>
                        {totalReferredCount > 0 && (
                          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-4 text-center mb-6 font-semibold shadow-sm">
                            ⚠️ Student has {totalReferredCount} referred subject{totalReferredCount > 1 ? 's' : ''} in total.
                          </div>
                        )}
                        <div className="mt-8 border border-gray-300 overflow-hidden rounded-md shadow-sm">
                          <table className="w-full text-left text-sm sm:text-base bg-white">
                            <thead className="bg-[#f2f2f2] border-b border-gray-300 text-gray-800">
                              <tr>
                                <th className="py-3 px-4 font-semibold border-r border-gray-300 w-1/3">Semester</th>
                                <th className="py-3 px-4 font-semibold">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {semestersList.map((sem, i) => {
                                 const parsed = parseSemester(sem.value);
                                 if (!parsed) return null;
                                 const isPassed = parsed.type === 'passed';
                                 
                                 return (
                                   <tr key={i} className="hover:bg-gray-50 transition-colors">
                                     <td className="py-3 px-4 border-r border-gray-200 align-top bg-white">
                                       <div className="font-semibold text-gray-800">{sem.label}</div>
                                       {parsed.date && (
                                         <div className="text-xs text-gray-500 mt-1 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {(() => {
                                              try {
                                                const [year, month, day] = parsed.date.split('T')[0].split('-');
                                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
                                              } catch(e) {
                                                return parsed.date.split('T')[0];
                                              }
                                            })()}
                                         </div>
                                       )}
                                     </td>
                                     <td className="py-3 px-4 align-top">
                                        {isPassed || parsed.gpa ? (
                                          <div className="font-bold text-green-700">Passed <span className="text-black font-semibold mx-1">/</span> GPA: {parsed.gpa}</div>
                                        ) : (
                                          <div className="text-red-600 font-medium space-y-1.5">
                                            <div>Referred ({parsed.total} Subject{parsed.total > 1 ? 's' : ''}):</div>
                                            <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-800 font-normal">
                                              {parsed.subjects.map((sub: any, idx: number) => (
                                                <li key={idx}>
                                                  {sub.subName || sub.name || 'Subject'} <span className="font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded text-xs ml-1 font-semibold">{sub.code || sub.subCode}</span>
                                                  {' '} ({sub.type === 'T' ? 'Theory' : sub.type === 'P' ? 'Practical' : sub.type})
                                                </li>
                                              ))}
                                              {parsed.subjects.length === 0 && (
                                                <li className="text-gray-500 italic">No subject details provided</li>
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                     </td>
                                   </tr>
                                 );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
               </div>
             ))}
           </div>
        ) : (
           <div className="space-y-8">
              <div className="text-center pb-6 border-b border-gray-100">
                 <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                   {type === 'institute' ? 'Institute Results' : 'Group Results'}
                 </div>
                 <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                   {type === 'institute' ? results[0]?.instituteName || instituteCode : 'Multiple Roll Results'}
                 </h1>
                 <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-600">
                   <span className="flex items-center font-medium"><BookOpen className="w-4 h-4 mr-2 text-blue-500"/> {results[0]?.curriculum || 'Diploma in Engineering'}</span>
                   <span className="flex items-center font-medium"><Calendar className="w-4 h-4 mr-2 text-blue-500"/> {results[0]?.regulation ? `Regulation ${results[0]?.regulation}` : 'Regulation N/A'}</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 mx-auto lg:grid-cols-3 gap-5">
                 {results.map((r) => {
                   const sems = [r.semester1, r.semester2, r.semester3, r.semester4, r.semester5, r.semester6, r.semester7, r.semester8];
                   let referredCount = 0;
                   
                   for (let i = 0; i < sems.length; i++) {
                     const parsed = parseSemester(sems[i]);
                     if (parsed && parsed.type === 'referred') {
                       referredCount += parsed.total;
                     }
                   }
                   
                   const s8 = parseSemester(r.semester8);
                   const s8Display = s8 ? (
                     s8.type === 'passed' ? (
                       <span className="text-green-600">{s8.gpa}</span>
                     ) : (
                       <span className="text-red-600">{s8.total} Sub</span>
                     )
                   ) : '-';

                   return (
                     <div key={r.id} className="bg-white border text-left border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col group print:break-inside-avoid print:shadow-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent -mr-8 -mt-8 opacity-60 rounded-full transition-transform group-hover:scale-110"></div>
                        
                        <div className="flex justify-between items-start mb-5 relative z-10">
                           <div>
                             <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5 opacity-80">Roll Number</p>
                             <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{r.rollNumber}</h3>
                           </div>
                           <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide shadow-sm border ${referredCount > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                             {referredCount > 0 ? 'Referred' : 'Passed'}
                           </div>
                        </div>

                        {type === 'group' && (
                          <div className="flex items-center text-xs text-gray-500 mb-5 line-clamp-2 relative z-10 font-medium">
                             <Building className="w-3.5 h-3.5 mr-2 flex-shrink-0 text-gray-400" />
                             <span className="line-clamp-2">{r.instituteName}</span>
                          </div>
                        )}

                        <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 relative z-10">
                           <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                              <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">8th Sem Result</p>
                              <div className="font-bold text-base text-gray-800">{s8Display}</div>
                           </div>
                           <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                              <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Total Due</p>
                              <div className={`font-bold text-base ${referredCount > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                {referredCount > 0 ? referredCount : '-'}
                              </div>
                           </div>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>
        )}

        <div className="mt-16 text-center border-t border-gray-200 pt-6">
           <p className="text-xs text-gray-500 font-medium">
             The information is provided by BTEB Result Hub. This is an electronic copy of the exact board result.
           </p>
           <p className="text-xs text-gray-400 mt-1">
             Generated on: {new Date().toLocaleString()}
           </p>
        </div>
      </div>

      {bannerConfig?.bannerUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="mt-12 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100 print:hidden"
        >
          {bannerConfig.bannerLink ? (
             <a href={bannerConfig.bannerLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                <img src={bannerConfig.bannerUrl} alt="Ad Banner" className="w-full object-cover" />
             </a>
          ) : (
             <img src={bannerConfig.bannerUrl} alt="Ad Banner" className="w-full object-cover" />
          )}
        </motion.div>
      )}
    </div>
  );
}
