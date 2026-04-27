import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, ArrowLeft, Loader2, Printer, BookOpen, Calendar, Building, Calculator, Heart, Copy, Share2, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';

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
  
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roll && !instituteCode) {
      setError('Invalid search parameters.');
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const resultsRef = collection(db, 'results');
        let clauses = [];
        
        if (type === 'institute' && instituteCode) {
          clauses.push(where('instituteCode', '==', instituteCode.trim()));
        } else if (type === 'group' && roll) {
          const rollsList = roll.split(/[,\n]/).map(r => r.trim()).filter(Boolean);
          if (rollsList.length > 30) {
            clauses.push(where('rollNumber', 'in', rollsList.slice(0, 30)));
          } else {
            clauses.push(where('rollNumber', 'in', rollsList));
          }
        } else if (roll) {
          clauses.push(where('rollNumber', '==', roll.trim()));
        }
        
        if (curriculum) clauses.push(where('curriculum', '==', curriculum));
        if (regulation) clauses.push(where('regulation', '==', regulation));
        
        const q = query(resultsRef, ...clauses, limit(100)); // allow more for institute
        
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError('No results found.');
        } else {
          const res = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
          res.sort((a: any, b: any) => parseInt(a.rollNumber) - parseInt(b.rollNumber));
          setResults(res);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch results.');
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

  const formatSemester = (val: string) => {
    if (!val || val === '-' || val === 'undefined') return '-';
    if (val.startsWith('{"type":"referred"')) {
      try {
        const parsed = JSON.parse(val);
        const subjects: any[] = parsed.subjects || [];
        if (subjects.length > 0) {
          return (
            <div className="text-red-600 flex flex-col items-center">
               <span className="font-bold text-sm">Referred:</span>
               <ul className="text-xs mt-0.5 list-none text-center">
                 {subjects.map((sub, i) => <li key={i}>{sub.code} ({sub.type})</li>)}
               </ul>
            </div>
          );
        }
        return <span className="text-red-600 font-bold">Referred</span>;
      } catch (e) {
        return <span className="text-green-600 font-bold">{val}</span>;
      }
    }
    return <span className="text-green-600 font-bold">{val}</span>;
  };

  const parseSemester = (val: string) => {
    if (!val || val === '-' || val === 'undefined') return null;
    if (val.startsWith('{"type":"referred"')) {
      try {
        const parsed = JSON.parse(val);
        const subjects: any[] = parsed.subjects || [];
        return { type: 'referred', subjects, total: subjects.length, gpa: parsed.gpa || null };
      } catch (e) {
        return { type: 'passed', gpa: val };
      }
    }
    return { type: 'passed', gpa: val };
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
        {results.length === 1 && type === 'individual' ? (
           <div className="max-w-2xl mx-auto space-y-4">
              <div className="text-center pb-4">
                 <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-2"># {results[0].rollNumber}</h1>
                 <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
                   <span className="flex items-center"><BookOpen className="w-4 h-4 mr-1.5"/> {results[0].curriculum || 'Diploma in Engineering'}</span>
                   <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5"/> {results[0].regulation ? `Regulation ${results[0].regulation}` : 'Regulation N/A'}</span>
                 </div>
                 <div className="flex items-center justify-center text-sm text-gray-600 mt-1.5">
                   <Building className="w-4 h-4 mr-1.5"/> {results[0].instituteName}
                 </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-2 mb-6 print:hidden" data-html2canvas-ignore="true">
                <button onClick={() => {
                   const sems = [
                     parseSemester(results[0].semester1),
                     parseSemester(results[0].semester2),
                     parseSemester(results[0].semester3),
                     parseSemester(results[0].semester4),
                     parseSemester(results[0].semester5),
                     parseSemester(results[0].semester6),
                     parseSemester(results[0].semester7),
                     parseSemester(results[0].semester8)
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
                }} className="px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center transition-colors">
                  <Calculator className="w-4 h-4 mr-2"/> CGPA
                </button>
                <button onClick={handleDownload} className="px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center transition-colors">
                   <Download className="w-4 h-4 mr-2"/> Download
                </button>
                <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Result View: ' + results[0].rollNumber,
                      url: window.location.href
                    }).catch(console.error);
                  } else {
                    alert('Sharing is not supported on this browser.');
                  }
                }} className="px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center transition-colors">
                   <Share2 className="w-4 h-4 mr-2"/> Share
                </button>
              </div>

              {/* Overall referred warning */}
              {(() => {
                const semestersList = [
                  { label: '8th Semester', value: results[0].semester8 },
                  { label: '7th Semester', value: results[0].semester7 },
                  { label: '6th Semester', value: results[0].semester6 },
                  { label: '5th Semester', value: results[0].semester5 },
                  { label: '4th Semester', value: results[0].semester4 },
                  { label: '3rd Semester', value: results[0].semester3 },
                  { label: '2nd Semester', value: results[0].semester2 },
                  { label: '1st Semester', value: results[0].semester1 },
                ].filter(s => parseSemester(s.value) !== null);

                const totalReferredCount = semestersList.reduce((acc, curr) => {
                  const p = parseSemester(curr.value);
                  return (p && p.type === 'referred') ? acc + p.total : acc;
                }, 0);

                return (
                  <>
                    {totalReferredCount > 0 && (
                      <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-center mb-6 font-semibold text-sm">
                        {totalReferredCount} subject{totalReferredCount > 1 ? 's' : ''} yet to pass
                      </div>
                    )}
                    <div className="space-y-4">
                      {semestersList.map((sem, i) => {
                         const parsed = parseSemester(sem.value);
                         if (!parsed) return null;
                         const isPassed = parsed.type === 'passed';
                         
                         return (
                           <div key={i} className="bg-white border text-left border-gray-200 rounded-xl p-4 shadow-sm break-inside-avoid print:break-inside-avoid">
                              <div className="flex justify-between items-center mb-3">
                                 <div className="flex items-center gap-2 font-semibold text-gray-900">
                                   <GraduationCap className="w-5 h-5 text-blue-600" />
                                   {sem.label}
                                 </div>
                                 {isPassed ? (
                                   <div className="flex items-center text-green-600 text-sm font-semibold">
                                     <CheckCircle2 className="w-4 h-4 mr-1.5" /> Passed
                                   </div>
                                 ) : (
                                   <div className="flex items-center text-red-500 text-sm font-semibold">
                                     <XCircle className="w-4 h-4 mr-1.5" /> {parsed.total} subject{parsed.total > 1 ? 's' : ''} yet to pass
                                   </div>
                                 )}
                              </div>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-blue-500 font-medium mb-3 gap-2">
                                <div className="flex items-center">
                                   <Calendar className="w-3.5 h-3.5 mr-1" /> Published: N/A
                                </div>
                              </div>

                              {isPassed || parsed.gpa ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-3">
                                   <span className="text-gray-500 font-semibold mr-2 text-sm">GPA</span>
                                   <span className="text-green-600 font-bold text-xl">{parsed.gpa}</span>
                                </div>
                              ) : null}
                              {!isPassed && (
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden text-sm divide-y divide-gray-100">
                                   {parsed.subjects.map((sub: any, idx: number) => (
                                     <div key={idx} className="p-3 bg-white flex items-center justify-between">
                                        <div className="text-gray-900 font-normal">
                                          <span className="text-purple-700 mr-2">{sub.code}</span>
                                          {sub.name}
                                        </div>
                                        <span className="text-gray-500 font-medium px-2 py-0.5 border border-gray-200 rounded-full bg-white text-xs">
                                           {sub.type}
                                        </span>
                                     </div>
                                   ))}
                                   {parsed.subjects.length === 0 && (
                                     <div className="p-3 text-center text-gray-500 italic">No subject details provided</div>
                                   )}
                                </div>
                              )}
                           </div>
                         );
                      })}
                    </div>
                  </>
                );
              })()}
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
    </div>
  );
}
