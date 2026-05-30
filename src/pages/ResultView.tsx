import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, ArrowLeft, Loader2, Printer, BookOpen, Calendar, Building, Calculator, Heart, Copy, Share2, GraduationCap, CheckCircle2, XCircle, ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { Helmet } from 'react-helmet-async';

export default function ResultView() {
  const [searchParams] = useSearchParams();
  const params = useParams<{ instituteCode?: string }>();
  const roll = searchParams.get('roll');
  const instituteCode = params.instituteCode || searchParams.get('instituteCode');
  const type = params.instituteCode ? 'institute' : (searchParams.get('type') || 'individual');
  const curriculum = searchParams.get('curriculum') || 'diploma_in_engineering';
  const regulation = searchParams.get('regulation') || '2022';
  
  const [results, setResults] = useState<any[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [instituteDates, setInstituteDates] = useState<any[]>([]);
  const [instituteName, setInstituteName] = useState<string | null>(null);
  const [institutePDFs, setInstitutePDFs] = useState<string[]>([]);
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [instituteTree, setInstituteTree] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [selectedPublishDate, setSelectedPublishDate] = useState<string | null>(null);
  const [selectedFileKey, setSelectedFileKey] = useState<string | null>(null);
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
        if(error instanceof Error && String(error.message).includes('the client is offline')) {
           console.warn("Could not fetch banner settings: Firebase Client is offline. App will continue without it.");
        } else if (String(error).includes('the client is offline')) {
           console.warn("Could not fetch banner settings: Firebase Client is offline. App will continue without it.");
        } else {
           console.error("Error fetching settings:", error);
        }
      }
    };
    fetchSettings().catch(console.error);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!roll && !instituteCode) {
      setError('Invalid search parameters.');
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      setLoading(true);
      setError('');
      
      if (type === 'institute') {
        try {
          const res = await fetch(`/api/bteb/institute-results/${instituteCode}`);
          const json = await res.json();
          if (!isMounted) return;
          if (json.success && json.data) {
             setInstituteDates(json.data);
             if (json.instituteName) setInstituteName(json.instituteName);
          } else {
             setError(json.error || 'Failed to load institute results');
          }
        } catch(e) {
          if (!isMounted) return;
          setError('Failed to fetch institute results');
        }
        setLoading(false);
        return;
      }
      try {
        let firebaseResults: any[] = [];
        
        try {
          if (roll && type !== 'institute') {
             const rollsList = roll.split(/[,\s]+/).map(r => r.trim()).filter(Boolean);
             const chunks = [];
             for (let i = 0; i < rollsList.length; i += 10) {
                 chunks.push(rollsList.slice(i, i + 10));
             }
             for (const chunk of chunks) {
                 let q = query(collection(db, 'results'), where('rollNumber', 'in', chunk));
                 const snap = await getDocs(q);
                 snap.forEach(d => {
                   const data = d.data();
                   if (!curriculum || data.curriculum === curriculum || data.curriculumId === curriculum) {
                     firebaseResults.push({ id: d.id, ...data });
                   }
                 });
             }
          }
        } catch (dbErr) {
           console.warn("Firebase query failed:", dbErr);
        }

        if (firebaseResults.length > 0 && roll && type !== 'institute') {
             const requestedRolls = roll.split(/[,\s]+/).map(r => r.trim()).filter(Boolean);
             if (firebaseResults.length === requestedRolls.length) {
                 if (!isMounted) return;
                 setSelectedResultIndex(0);
                 setResults([...firebaseResults]);
                 setLoading(false);
                 return;
             }
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
        if (!isMounted) return;
        if (!response.ok) {
          let errorMsg = 'Failed to fetch from server';
          try {
             const errJson = await response.json();
             if (errJson && errJson.error) {
                errorMsg = errJson.error;
             }
          } catch(e) {}
          throw new Error(errorMsg);
        }

        const json = await response.json();
        if (!isMounted) return;
        
        if (!json.success || !json.data || json.data.length === 0) {
          setError('No results found for this query.');
          setLoading(false);
          return;
        }

        const getCurriculumName = (id: string) => {
          const map: Record<string, string> = {
            'diploma_in_engineering': 'Diploma In Engineering',
            'diploma_in_engineering_army': 'Diploma In Engineering (Army)',
            'diploma_in_engineering_naval': 'Diploma In Engineering (Naval)',
            'diploma_in_textile': 'Diploma In Textile Engineering',
            'diploma_in_tourism': 'Diploma In Tourism And Hospitality',
            'diploma_in_agriculture': 'Diploma In Agriculture',
            'diploma_in_fisheries': 'Diploma In Fisheries',
            'diploma_in_forestry': 'Diploma In Forestry',
            'diploma_in_livestock': 'Diploma In Livestock',
            'certificate_in_marine_trade': 'Certificate In Marine Trade',
            'diploma_in_marine': 'Diploma In Marine Engineering', // fallback
            'diploma_in_medical_technology': 'Diploma In Medical Technology',
            'advanced_certificate_course': 'Advanced Certificate Course',
            'national_skill_standard_basic': 'National Skill Standard Basic Certificate Course',
            'one_year_certificate': 'One Year Certificate Course',
            'diploma_in_commerce': 'Diploma In Commerce',
            'certificate_in_medical_ultrasound': 'Certificate In Medical Ultrasound',
            'hsc_bm': 'HSC (Business Management)',
            'hsc_voc': 'HSC (Vocational)',
          };
          if (map[id]) return map[id];
          return id ? id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown Curriculum';
        };

        // Process tree structure for institute type
        if (type === 'institute') {
          const tree: any = {};
          json.data.forEach((student: any) => {
              // Extract data regardless of if it's from Firebase (flat) or BTEB proxy (nested)
              const instName = student.instituteName || (student.institute?.name 
                ? `${student.institute.name}${student.institute.district ? `, ${student.institute.district}` : ''}`
                : instituteCode || 'Unknown Institute');
                
              if (!tree[instName]) tree[instName] = {};

              const currId = student.curriculumId || student.curriculum || 'unknown';
              const currName = getCurriculumName(currId);
              const reg = student.regulation ? student.regulation.toString() : 'Unknown Regulation';

              // If nested BTEB server results
              if (student.semesterResults && student.semesterResults.length > 0) {
                 student.semesterResults.forEach((sem: any) => {
                     const originalResult = sem.results?.find((r: any) => r.republished === false) || sem.results?.[0] || {};
                     let rawDate = originalResult.date || originalResult.publishDate || sem.date || sem.publishDate || 'Unknown Date';
                     const dateStr = rawDate !== 'Unknown Date' ? rawDate.split('T')[0] : 'Unknown Date';
                     
                     if (!tree[instName][dateStr]) tree[instName][dateStr] = {};
                     const fileKey = `${currName}__${reg}__${sem.semester}`;
                     if (!tree[instName][dateStr][fileKey]) {
                        tree[instName][dateStr][fileKey] = {
                            curriculumName: currName,
                            regulation: reg,
                            semester: sem.semester,
                            passed: [],
                            referred: []
                        };
                     }

                     const currentFailed = student.currentFailedSubjects || [];
                     const failedInThisSem = currentFailed.filter((f: any) => f.originSemester === sem.semester);

                     if (failedInThisSem.length === 0) {
                         tree[instName][dateStr][fileKey].passed.push(student.roll || student.rollNumber);
                     } else {
                         const failedSubCodes = failedInThisSem.map((f: any) => f.subCode || f.code || f.subName);
                         tree[instName][dateStr][fileKey].referred.push({
                             roll: student.roll || student.rollNumber,
                             subjects: failedSubCodes
                         });
                     }
                 });
              } else {
                 // Flat Firebase style results
                 const dateStr = student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : 'Unknown Date';
                 if (!tree[instName][dateStr]) tree[instName][dateStr] = {};

                 const sems = Object.keys(student).filter(k => k.startsWith('semester') && !isNaN(parseInt(k.replace('semester', ''))));
                 sems.forEach(semKey => {
                     const semNum = semKey.replace('semester', '');
                     const resultStr = student[semKey] || '';
                     if (!resultStr) return; // Skip empty semesters
                     
                     const fileKey = `${currName}__${reg}__${semNum}`;
                     if (!tree[instName][dateStr][fileKey]) {
                        tree[instName][dateStr][fileKey] = {
                            curriculumName: currName,
                            regulation: reg,
                            semester: semNum,
                            passed: [],
                            referred: []
                        };
                     }

                     const isFailed = resultStr.toLowerCase().includes('fail') || resultStr.toLowerCase().includes('referred') || resultStr.toLowerCase().includes('ref');
                     if (!isFailed && resultStr.trim() !== '') {
                         tree[instName][dateStr][fileKey].passed.push(student.rollNumber || student.roll);
                     } else if (isFailed) {
                         // Fallback for flat structure, try to parse subjects from string if possible.
                         // Often it looks like "Referred: 1234, 5678" or similar
                         let subjects: string[] = [];
                         if (resultStr.includes('{') && resultStr.includes('}')) {
                             const match = resultStr.match(/\{([^}]+)\}/);
                             if (match) subjects = match[1].split(',').map(s => s.trim());
                         }
                         tree[instName][dateStr][fileKey].referred.push({
                             roll: student.rollNumber || student.roll,
                             subjects: subjects
                         });
                     }
                 });
              }
          });
          
          if (!isMounted) return;
          setInstituteTree(tree);
          setResults([]); // We don't need flat results for institute
          setLoading(false);
          return;
        }

        const mappedResults = json.data.map((item: any, index: number) => {
          const mapped: any = {
            id: item.roll + '_' + item.curriculumId + '_' + index,
            rollNumber: item.roll.toString(),
            instituteName: item.institute?.name ? `${item.institute.name}${item.institute.district ? `, ${item.institute.district}` : ''}` : '',
            curriculum: getCurriculumName(item.curriculumId),
            regulation: item.regulation?.toString() || '',
          };

          const currentFailed = item.currentFailedSubjects || [];
          
          let semsToProcess = item.semesterResults || [];
          if (semsToProcess.length === 0 && item.latestResults && item.latestResults.length > 0) {
             // Fallback to latest results if semesterResults is empty
             const latSem = item.latestResults[0].semester;
             if (latSem) {
               semsToProcess = [{
                 semester: latSem,
                 status: item.latestResults[0].failedSubjects?.length ? 'failed' : 'passed',
                 results: item.latestResults
               }];
             }
          }

          semsToProcess.forEach((sem: any) => {
            let valStr = '';
            const failedInThisSem = currentFailed.filter((f: any) => f.originSemester === sem.semester);
            const originalResult = sem.results?.find((r: any) => r.republished === false) || sem.results?.[0] || {};
            const pubDate = originalResult.date || originalResult.publishDate || sem.date || sem.publishDate || null;
            
            if (failedInThisSem.length === 0) {
              let foundGpa = null;
              let foundCgpa = null;
              for (const r of sem.results || []) {
                if (r.gpa) foundGpa = r.gpa;
                if (r.cgpa) foundCgpa = r.cgpa;
                if (!foundGpa && !foundCgpa && (r.cgpa || r.gpa)) {
                  foundGpa = r.cgpa || r.gpa;
                }
              }
              valStr = JSON.stringify({ type: 'passed', gpa: foundGpa || 'Passed', cgpa: foundCgpa, date: pubDate });
            } else {
              valStr = JSON.stringify({ type: 'referred', subjects: failedInThisSem, gpa: null, date: pubDate });
            }
            mapped[`semester${sem.semester}`] = valStr;
          });

          return mapped;
        });

        if (!isMounted) return;
        setSelectedResultIndex(0);
        setResults(mappedResults);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError('Failed to fetch results. Please try again later.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResult().catch(console.error);
    
    return () => {
      isMounted = false;
    };
  }, [roll, instituteCode, type, curriculum, regulation]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
  };

  const handleDownload = async () => {
    if (type === 'group') {
      try {
        let csvContent = "data:text/csv;charset=utf-8,";
        let headers = ["Roll Number", "Curriculum", "Regulation", "Institute"];
        
        // Find all possible semester keys across all results
        const allSems = new Set<string>();
        results.forEach(r => {
          Object.keys(r).filter(k => k.startsWith('semester')).forEach(k => allSems.add(k));
        });
        const semKeys = Array.from(allSems).sort((a, b) => parseInt(a.replace('semester', '')) - parseInt(b.replace('semester', '')));
        
        semKeys.forEach(k => {
          headers.push(k.replace('semester', 'Sem '));
        });
        
        csvContent += headers.join(",") + "\n";
        
        results.forEach(r => {
          let row = [
            r.rollNumber || r.roll || "",
            r.curriculum || "",
            r.regulation || "",
            `"${(r.instituteName || (r.institute && r.institute.name) || "").replace(/"/g, '""')}"`
          ];
          
          semKeys.forEach(k => {
            if (r[k]) {
              const parsed = parseSemester(r[k]);
              if (parsed) {
                if (parsed.type === 'passed') {
                  row.push("GPA " + parsed.gpa);
                } else {
                  row.push("Fail (" + parsed.total + ")");
                }
              } else {
                row.push("N/A");
              }
            } else {
              row.push("");
            }
          });
          
          csvContent += row.join(",") + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `group_results_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error("Failed to generate CSV:", err);
      }
    }

    if (!resultRef.current) return;
    
    // Add downloading class
    const element = resultRef.current;
    
    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset?.html2canvasIgnore === 'true') {
            return false;
          }
          return true;
        }
      });
      download(dataUrl, `Result_${roll || instituteCode || 'group'}.png`);
    } catch(err) {
      console.error("Failed to generate image:", err);
      alert("Failed to download image. Try printing instead.");
    }
  };

  const loadInstitutePdfs = async (dateStr: string) => {
    if (activeDateStr === dateStr) {
      setActiveDateStr(null);
      return; // toggle off
    }
    setActiveDateStr(dateStr);
    setLoadingPdfs(true);
    setInstitutePDFs([]);
    try {
      const res = await fetch(`/api/bteb/institute-results/${instituteCode}/${dateStr}`);
      const json = await res.json();
      if (json.success && json.pdfs) {
        setInstitutePDFs(json.pdfs);
      }
    } catch(e) {
      console.error(e);
    }
    setLoadingPdfs(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const parseSemester = (val: string) => {
    if (!val || val === '-' || val === 'undefined') return null;
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'number' || typeof parsed === 'string') {
        return { type: 'passed', gpa: String(parsed), cgpa: null, date: null };
      }
      if (parsed.type === 'referred') {
        const subjects: any[] = parsed.subjects || [];
        return { type: 'referred', subjects, total: subjects.length, gpa: parsed.gpa || null, cgpa: parsed.cgpa || null, date: parsed.date };
      }
      return { type: 'passed', gpa: parsed.gpa || null, cgpa: parsed.cgpa || null, date: parsed.date };
    } catch (e) {
      // In case it's an old format
      if (val.startsWith('{"type":"referred"')) {
        return { type: 'referred', subjects: [], total: 0, gpa: null, cgpa: null, date: null };
      }
      return { type: 'passed', gpa: val, cgpa: null, date: null };
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
    <div className="w-full font-sans px-4 sm:px-6 py-6 sm:py-8 lg:py-10 print:py-0 print:px-0 print:m-0">
      <Helmet>
        <title>{type === 'institute' ? `Results for Institute ${instituteCode} | BTEB Result Library` : `Result for Roll ${roll} | BTEB Result Library`}</title>
        <meta name="description" content={type === 'institute' ? `Check the BTEB examination results, pass rates, and PDFs for institute ${instituteCode}.` : `View the complete diploma academic result for roll number ${roll} from Bangladesh Technical Education Board (BTEB).`} />
        <link rel="canonical" href={`https://btebresultlibrary.vercel.app/result?roll=${roll}&type=${type}&curriculum=${curriculum}&regulation=${regulation}`} />
      </Helmet>
      <div className="max-w-5xl mx-auto pb-10 mt-2 lg:px-4 print:my-0 print:pb-0 print:px-0">
        <div className="mb-6 flex gap-3 justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-xl border border-white/60 shadow-lg shadow-slate-200/50 print:hidden flex-wrap w-full">
        <button onClick={() => window.history.back()} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-wrap gap-2">
          {type !== 'institute' && (
            <>
              <button 
                onClick={handleDownload}
                className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-black transition-colors shadow-md shadow-slate-900/10"
              >
                <Download className="w-4 h-4 mr-2 hidden sm:block" /> {type === 'group' ? 'Download CSV' : 'Download Image'}
              </button>
              <button 
                onClick={handlePrint}
                className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2 hidden sm:block" /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {type === 'individual' && results.length > 1 && (
        <div className="mb-4 bg-white p-2 sm:p-3 rounded border border-blue-100 shadow-sm print:hidden">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 ml-1">Multiple Results Found</div>
          <div className="flex flex-wrap gap-2">
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setSelectedResultIndex(i)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  selectedResultIndex === i 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {r.curriculum}{r.regulation ? ` (${r.regulation})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div 
        ref={resultRef}
        className={`bg-white/95 backdrop-blur-3xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-200/50 print:shadow-none print:border-transparent relative w-full ${type === 'institute' ? 'p-0 overflow-hidden' : 'p-6 sm:p-10 print:p-4'}`}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl print:hidden"></div>
        {type === 'individual' ? (
           <div className="space-y-12 print:space-y-6">
             {results.filter((_, i) => i === selectedResultIndex).map((resultItem, mapIndex) => (
               <div key={resultItem.id} className="max-w-3xl mx-auto space-y-4 print:space-y-4">
                  <div className="pb-6 print:pb-4 border-b border-gray-200">
                     <div className="text-center mb-8 print:mb-4">
                       <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-gray-800 print:text-xl">Academic Result</h2>
                     </div>
                     <table className="w-full text-left text-sm sm:text-base print:text-base">
                       <tbody>
                         <tr>
                           <td className="py-1.5 print:py-2 font-semibold text-gray-600 w-32 sm:w-48 align-top">Roll No</td>
                           <td className="py-1.5 print:py-2 font-bold text-gray-900 border-b border-gray-100">: {resultItem.rollNumber}</td>
                         </tr>
                         <tr>
                           <td className="py-1.5 print:py-2 font-semibold text-gray-600 align-top">Institute</td>
                           <td className="py-1.5 print:py-2 text-gray-800 border-b border-gray-100">: {resultItem.instituteName}</td>
                         </tr>
                         <tr>
                           <td className="py-1.5 print:py-2 font-semibold text-gray-600 align-top">Curriculum</td>
                           <td className="py-1.5 print:py-2 text-gray-800 border-b border-gray-100">: {resultItem.curriculum || 'Diploma in Engineering'}</td>
                         </tr>
                         <tr>
                           <td className="py-1.5 print:py-2 font-semibold text-gray-600 align-top">Regulation</td>
                           <td className="py-1.5 print:py-2 text-gray-800 border-b border-gray-100">: {resultItem.regulation || 'N/A'}</td>
                         </tr>
                       </tbody>
                     </table>
                  </div>

                  {/* Actions */}
                  {mapIndex === 0 && (
                    <div className="flex flex-wrap justify-center gap-3 mb-6 print:hidden py-2" data-html2canvas-ignore="true">
                      <button onClick={() => {
                         const sems = Object.keys(resultItem)
                           .filter(k => k.startsWith('semester') && !isNaN(parseInt(k.replace('semester', ''))))
                           .map(k => parseSemester(resultItem[k]));
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
                    const semestersList =  Object.keys(resultItem)
                      .filter(k => k.startsWith('semester') && !isNaN(parseInt(k.replace('semester', ''))))
                      .map(k => {
                        const semNum = parseInt(k.replace('semester', ''));
                        let label = `${semNum}th `;
                        if (semNum === 1) label = '1st ';
                        else if (semNum === 2) label = '2nd ';
                        else if (semNum === 3) label = '3rd ';

                        const isYearly = resultItem.curriculum?.toLowerCase().includes('hsc') || resultItem.curriculum?.toLowerCase().includes('year') || resultItem.curriculum?.toLowerCase().includes('advanced');
                        if (isYearly) {
                          label += 'Year/Part';
                        } else {
                          label += 'Semester';
                        }
                        
                        return { num: semNum, label, value: resultItem[k] };
                      })
                      .filter(s => parseSemester(s.value) !== null)
                      .sort((a, b) => b.num - a.num);

                    const totalReferredCount = semestersList.reduce((acc, curr) => {
                      const p = parseSemester(curr.value);
                      return (p && p.type === 'referred') ? acc + p.total : acc;
                    }, 0);

                    const cgpaValue = semestersList.map(s => parseSemester(s.value)).find(p => p && p.cgpa)?.cgpa;

                    return (
                      <>
                        {cgpaValue && (
                          <div className="bg-green-50 text-green-700 border border-green-200 rounded p-4 print:p-3 text-center mb-6 print:mb-4 font-bold text-lg print:text-base shadow-sm print:shadow-none">
                            Congratulation Your Total CGPA is : {cgpaValue}
                          </div>
                        )}
                        {totalReferredCount > 0 && (
                          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-4 print:p-3 text-center mb-6 print:mb-4 font-semibold print:text-sm shadow-sm print:shadow-none">
                            ⚠️ Student has {totalReferredCount} referred subject{totalReferredCount > 1 ? 's' : ''} in total.
                          </div>
                        )}
                        <div className="mt-8 print:mt-4 border border-gray-300 overflow-hidden rounded-md shadow-sm print:shadow-none">
                          <table className="w-full text-left text-sm sm:text-base print:text-base bg-white">
                            <thead className="bg-[#f2f2f2] border-b border-gray-300 text-gray-800">
                              <tr>
                                <th className="py-3 px-4 print:py-2 print:px-3 font-semibold border-r border-gray-300 w-1/3">Semester</th>
                                <th className="py-3 px-4 print:py-2 print:px-3 font-semibold">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {semestersList.map((sem, i) => {
                                 const parsed = parseSemester(sem.value);
                                 if (!parsed) return null;
                                 const isPassed = parsed.type === 'passed';
                                 
                                 return (
                                   <tr key={i} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                                     <td className="py-3 px-4 print:py-2 print:px-3 border-r border-gray-200 align-top bg-white">
                                       <div className="font-semibold text-gray-800">{sem.label}</div>
                                       {parsed.date && (
                                         <div className="text-xs print:text-xs text-gray-500 mt-1 flex items-center">
                                            <Calendar className="w-3 h-3 print:w-3 print:h-3 mr-1" />
                                            {(() => {
                                              try {
                                                const dateStr = parsed.date.split('T')[0];
                                                if (dateStr.includes('-')) {
                                                  const parts = dateStr.split('-');
                                                  // Only handle YYYY-MM-DD
                                                  if (parts.length === 3 && parts[0].length === 4) {
                                                    const [year, month, day] = parts;
                                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                    const monthInt = parseInt(month, 10);
                                                    if (monthInt >= 1 && monthInt <= 12) {
                                                       return `${day} ${months[monthInt - 1]} ${year}`;
                                                    }
                                                  }
                                                }
                                                return dateStr;
                                              } catch(e) {
                                                return parsed.date;
                                              }
                                            })()}
                                         </div>
                                       )}
                                     </td>
                                     <td className="py-3 px-4 print:py-2 print:px-3 align-top">
                                        {isPassed || parsed.gpa ? (
                                          <div className="font-bold border border-green-200 text-green-700 bg-green-50 inline-flex items-center px-2 py-1 rounded">
                                            Passed
                                            {parsed.gpa && parsed.gpa !== 'Passed' && (
                                              <>
                                                <span className="text-black font-semibold mx-1">/</span> GPA: {parsed.gpa}
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-red-600 font-medium space-y-1.5">
                                            <div>Referred ({parsed.total} Subject{parsed.total > 1 ? 's' : ''}):</div>
                                            <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-800 font-normal">
                                              {(Array.isArray(parsed.subjects) ? parsed.subjects : []).map((sub: any, idx: number) => (
                                                <li key={idx}>
                                                  {sub.subName || sub.name || 'Subject'} <span className="font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded text-xs ml-1 font-semibold">{sub.code || sub.subCode}</span>
                                                  {' '} ({sub.type === 'T' ? 'Theory' : sub.type === 'P' ? 'Practical' : sub.type})
                                                </li>
                                              ))}
                                              {(!parsed.subjects || parsed.subjects.length === 0) && (
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

                        <div className="hidden print:block text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200">
                          Printed from <strong className="text-gray-700">BTEB Result Library</strong> &bull; {window.location.origin}
                        </div>
                      </>
                    );
                  })()}
               </div>
             ))}
           </div>
        ) : type === 'institute' ? (
           <div className="w-full space-y-8">
              <div className="flex flex-col items-center p-10 bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform translate-x-1/4 -translate-y-1/4"><Building className="w-64 h-64" /></div>
                 <div className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100 shadow-sm relative z-10">
                   Institute Analytics
                 </div>
                 <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 relative z-10 text-center tracking-tight">
                   {instituteName || `Institute ${instituteCode}`}
                 </h1>
                 <p className="text-gray-500 text-lg max-w-xl mx-auto text-center relative z-10">
                   Explore historical result data, pass rates, and official PDF documents. All data is synchronized securely.
                 </p>
              </div>

              {instituteDates.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-gray-500">No dates available or still loading...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {instituteDates.map((item, idx) => (
                    <div key={idx} className="bg-white border text-left border-gray-200/60 shadow-sm rounded-2xl overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all">
                      <button 
                        onClick={() => loadInstitutePdfs(item.dateStr)}
                        className="w-full text-left p-5 flex flex-col justify-between focus:outline-none focus:bg-gray-50/50"
                      >
                         <div className="w-full">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <div className="text-sm font-semibold text-gray-900">{item.dateStr}</div>
                              </div>
                              <div className="shrink-0 flex items-center justify-center w-8 h-8 bg-gray-50 rounded-full text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                {activeDateStr === item.dateStr ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                              </div>
                            </div>
                            
                            {item.stats.passed && (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                   <span className="font-medium">Pass Rate</span>
                                   <span className="font-bold text-gray-900">{item.stats.passed.split(' ')[0]}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden flex">
                                   <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: item.stats.passed.split(' ')[0] }}></div>
                                   {item.stats.failed && (
                                     <div className="h-full bg-red-400 transition-all duration-1000 ease-out" style={{ width: item.stats.failed.split(' ')[0] }}></div>
                                   )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-100">
                               {item.stats.passed && (
                                 <div className="text-sm">
                                   <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Passed</span>
                                   <span className="font-bold text-gray-900">{item.stats.passed.match(/\((\d+)\)/)?.[1] || '-'}</span>
                                 </div>
                               )}
                               {item.stats.failed && (
                                 <div className="text-sm">
                                   <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Failed</span>
                                   <span className="font-bold text-gray-900">{item.stats.failed.match(/\((\d+)\)/)?.[1] || '-'}</span>
                                 </div>
                               )}
                               {item.stats.total && (
                                 <div className="text-sm">
                                   <span className="text-gray-500 block text-[10px] uppercase tracking-wider mb-0.5">Total</span>
                                   <span className="font-bold text-gray-900">{item.stats.total}</span>
                                 </div>
                               )}
                            </div>
                         </div>
                      </button>

                      {activeDateStr === item.dateStr && (
                        <div className="border-t border-gray-100 p-5 bg-slate-50/50">
                           {loadingPdfs ? (
                             <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
                           ) : institutePDFs.length === 0 ? (
                             <div className="text-center text-gray-500 text-sm py-4">No PDF files found for this date.</div>
                           ) : (
                             <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Result Files ({institutePDFs.length})</h4>
                                {institutePDFs.map((pdf, pidx) => (
                                  <a key={pidx} href={pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl hover:border-indigo-400 hover:shadow text-left transition-all group">
                                     <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                       <Folder className="w-5 h-5" />
                                     </div>
                                     <div className="flex-1 overflow-hidden">
                                       <div className="font-medium text-sm text-gray-800 truncate">{pdf.split('/').pop()}</div>
                                       <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Official BTEB Document</div>
                                     </div>
                                     <div className="text-gray-300 group-hover:text-indigo-600 transition-colors">
                                       <Download className="w-4 h-4" />
                                     </div>
                                  </a>
                                ))}
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
           </div>
        ) : (
           <div className="space-y-8">
              <div className="text-center pb-6 border-b border-gray-100">
                 <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                   Group Results
                 </div>
                 <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                   Multiple Roll Results
                 </h1>
                 <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-600">
                   <span className="flex items-center font-medium"><BookOpen className="w-4 h-4 mr-2 text-blue-500"/> {results[0]?.curriculum || 'Diploma in Engineering'}</span>
                   <span className="flex items-center font-medium"><Calendar className="w-4 h-4 mr-2 text-blue-500"/> {results[0]?.regulation ? `Regulation ${results[0]?.regulation}` : 'Regulation N/A'}</span>
                 </div>
              </div>

              <div className="w-full pb-4">
                 {/* Desktop Table View */}
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full overflow-hidden hidden lg:block">
                   <table className="w-full text-left text-sm bg-white">
                     <thead className="bg-[#f8fafc] border-b border-gray-200 text-gray-500 tracking-wider text-[10px] sm:text-[11px] font-bold">
                       <tr>
                         <th className="py-2 px-2 sm:py-4 sm:px-4 border-r border-gray-100 uppercase">Roll No & Institute</th>
                         {(() => {
                           // Find all possible semester keys across all results
                           const allSems = new Set<number>();
                           results.forEach(r => {
                             Object.keys(r)
                               .filter(k => k.startsWith('semester') && !isNaN(parseInt(k.replace('semester', ''))))
                               .forEach(k => allSems.add(parseInt(k.replace('semester', ''))));
                           });
                           const sortedSems = Array.from(allSems).sort((a, b) => a - b);
                           
                           return sortedSems.map(semNum => (
                             <th key={semNum} className="py-2 px-1 sm:py-4 sm:px-2 border-r border-gray-100 text-center uppercase whitespace-nowrap">
                               {semNum === 1 ? '1st' : semNum === 2 ? '2nd' : semNum === 3 ? '3rd' : `${semNum}th`}
                             </th>
                           ));
                         })()}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                       {results.map((r) => {
                         // Find all possible semester keys across all results again for row mapping
                         const allSems = new Set<number>();
                         results.forEach(res => {
                           Object.keys(res)
                             .filter(k => k.startsWith('semester') && !isNaN(parseInt(k.replace('semester', ''))))
                             .forEach(k => allSems.add(parseInt(k.replace('semester', ''))));
                         });
                         const sortedSems = Array.from(allSems).sort((a, b) => a - b);

                         return (
                           <tr key={r.id || r.rollNumber} className="hover:bg-blue-50/20 transition-colors">
                             <td className="py-3 px-2 sm:py-4 sm:px-4 border-r border-gray-50 align-top max-w-[120px] sm:max-w-[200px]">
                               <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="min-w-0 w-full">
                                    <div className="font-bold text-gray-900 text-sm sm:text-base leading-tight mb-0.5 sm:mb-1">{r.rollNumber || r.roll || '--'}</div>
                                    <div className="text-[9px] sm:text-[11px] text-gray-500 font-medium truncate flex items-center gap-1 sm:gap-1.5" title={r.instituteName}>
                                       <Building className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                       <span className="truncate">{r.instituteName || (r.institute && r.institute.name) || 'Unknown Institute'}</span>
                                    </div>
                                  </div>
                               </div>
                             </td>
                             {sortedSems.map(semNum => {
                               const semData = r[`semester${semNum}`];
                               const parsed = semData ? parseSemester(semData) : null;
                               
                               return (
                                 <td key={semNum} className="py-2 px-0.5 sm:px-1.5 border-r border-gray-50 align-middle text-center">
                                   {parsed ? (
                                     parsed.type === 'passed' ? (
                                       <div className="inline-flex text-center items-center justify-center px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded sm:rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs sm:text-sm border border-emerald-100/50 shadow-sm min-w-[2.5rem] whitespace-nowrap">
                                         {parsed.gpa || parsed.cgpa || '-'}
                                       </div>
                                     ) : (
                                       <div className="group relative inline-flex flex-col items-center justify-center">
                                         <div className="px-1.5 py-1 sm:px-2 sm:py-1.5 rounded sm:rounded-lg bg-red-50 text-red-600 font-bold text-[9px] sm:text-[11px] uppercase border border-red-100/50 shadow-sm tracking-widest cursor-help whitespace-nowrap">
                                           Fail ({parsed.total})
                                         </div>
                                         <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 sm:w-48 bg-gray-900 text-white text-[10px] sm:text-xs rounded p-2 z-50 pointer-events-none">
                                            <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Failed Subjects:</div>
                                            <ul className="text-left list-disc pl-3">
                                              {(Array.isArray(parsed.subjects) ? parsed.subjects : []).map((sub: any, idx: number) => (
                                                <li key={idx} className="truncate">
                                                  {sub.subName || sub.name || 'Subject'} <span className="font-mono text-gray-300 ml-1 text-[9px] sm:text-[10px]">({sub.code || sub.subCode})</span>
                                                </li>
                                              ))}
                                            </ul>
                                         </div>
                                       </div>
                                     )
                                   ) : (
                                     <span className="text-gray-300 font-medium">-</span>
                                   )}
                                 </td>
                               );
                             })}
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>

                 {/* Mobile Grid View */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                   {results.map((r) => {
                     // Find all possible semester keys across all results again for card mapping
                     const allSems = new Set<number>();
                     results.forEach(res => {
                       Object.keys(res)
                         .filter(k => k.startsWith('semester') && !isNaN(parseInt(k.replace('semester', ''))))
                         .forEach(k => allSems.add(parseInt(k.replace('semester', ''))));
                     });
                     const sortedSems = Array.from(allSems).sort((a, b) => a - b);

                     return (
                       <div key={r.id || r.rollNumber} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                         <div className="mb-4 pb-3 border-b border-gray-100">
                            <div className="font-bold text-gray-900 text-lg mb-1">{r.rollNumber || r.roll || '--'}</div>
                            <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5" title={r.instituteName}>
                               <Building className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                               <span className="truncate">{r.instituteName || (r.institute && r.institute.name) || 'Unknown Institute'}</span>
                            </div>
                         </div>
                         <div className="grid grid-cols-4 sm:grid-cols-3 gap-2">
                            {sortedSems.map(semNum => {
                               const semData = r[`semester${semNum}`];
                               const parsed = semData ? parseSemester(semData) : null;
                               
                               return (
                                 <div key={semNum} className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                                   <span className="text-[10px] text-slate-500 font-semibold uppercase mb-1">{semNum === 1 ? '1st' : semNum === 2 ? '2nd' : semNum === 3 ? '3rd' : `${semNum}th`}</span>
                                   {parsed ? (
                                     parsed.type === 'passed' ? (
                                       <span className="text-xs font-bold text-emerald-700">{parsed.gpa || parsed.cgpa || '-'}</span>
                                     ) : (
                                       <div className="group relative">
                                          <span className="text-[10px] font-bold text-red-600 uppercase cursor-help bg-red-100 px-1 py-0.5 rounded">Fail({parsed.total})</span>
                                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-50 pointer-events-none">
                                            <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Failed Subjects:</div>
                                            <ul className="text-left list-disc pl-3">
                                              {(Array.isArray(parsed.subjects) ? parsed.subjects : []).map((sub: any, idx: number) => (
                                                <li key={idx} className="truncate">
                                                  {sub.subName || sub.name || 'Subject'} <span className="font-mono text-gray-300 ml-1 text-[10px]">({sub.code || sub.subCode})</span>
                                                </li>
                                              ))}
                                            </ul>
                                         </div>
                                       </div>
                                     )
                                   ) : (
                                     <span className="text-gray-300 font-medium">-</span>
                                   )}
                                 </div>
                               );
                            })}
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
           </div>
        )}

        <div className="mt-16 text-center border-t border-gray-200 pt-6">
           <p className="text-xs text-gray-500 font-medium">
             The information is provided by BTEB Result Library. This is an electronic copy of the exact board result.
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
                <img src={bannerConfig.bannerUrl} alt="Highlight" className="w-full object-cover" />
             </a>
          ) : (
             <img src={bannerConfig.bannerUrl} alt="Highlight" className="w-full object-cover" />
          )}
        </motion.div>
      )}
      </div>
    </div>
  );
}
