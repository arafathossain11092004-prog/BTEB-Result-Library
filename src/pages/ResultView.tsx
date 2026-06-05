import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, ArrowLeft, Loader2, Printer, BookOpen, Calendar, Building, Calculator, Heart, Copy, Share2, GraduationCap, CheckCircle2, XCircle, ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
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

  const generateImageAndDownload = async (exportType: 'jpg' | 'pdf') => {
    if (exportType === 'jpg' && type === 'group') {
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
    
    const footerElement = element.querySelector('#print-footer') as HTMLElement;
    if (footerElement) {
      footerElement.classList.remove('hidden', 'print:flex');
      footerElement.classList.add('flex');
    }
    
    // Force A4 layouts
    let styleEl: HTMLStyleElement | null = null;
    let prevWidth = element.style.width;
    let prevMaxWidth = element.style.maxWidth;
    let prevMinHeight = element.style.minHeight;
    let prevBorderRadius = element.style.borderRadius;
    
    element.style.width = '794px';
    element.style.maxWidth = '794px';
    element.style.minHeight = '1123px';
    element.style.borderRadius = '0px';

    styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .lg\\:block { display: block !important; }
      .lg\\:col-span-3 { grid-column: span 3 / span 3 !important; }
      .lg\\:col-span-9 { grid-column: span 9 / span 9 !important; }
      .lg\\:hidden { display: none !important; }
      .lg\\:px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .lg\\:py-10 { padding-top: 2.5rem !important; padding-bottom: 2.5rem !important; }
      .sm\\:block { display: block !important; }
      .sm\\:border-b-0 { border-bottom-width: 0px !important; }
      .sm\\:border-r { border-right-width: 1px !important; }
      .sm\\:col-span-4 { grid-column: span 4 / span 4 !important; }
      .sm\\:col-span-8 { grid-column: span 8 / span 8 !important; }
      .sm\\:flex-row { flex-direction: row !important; }
      .sm\\:gap-1 { gap: 0.25rem !important; }
      .sm\\:gap-3 { gap: 0.75rem !important; }
      .sm\\:gap-4 { gap: 1rem !important; }
      .sm\\:grid { display: grid !important; }
      .sm\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
      .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      .sm\\:h-3 { height: 0.75rem !important; }
      .sm\\:inline { display: inline !important; }
      .sm\\:items-center { align-items: center !important; }
      .sm\\:items-start { align-items: flex-start !important; }
      .sm\\:justify-between { justify-content: space-between !important; }
      .sm\\:justify-start { justify-content: flex-start !important; }
      .sm\\:leading-normal { line-height: 1.5 !important; }
      .sm\\:max-w-\\[200px\\] { max-width: 200px !important; }
      .sm\\:mb-0 { margin-bottom: 0px !important; }
      .sm\\:mb-1 { margin-bottom: 0.25rem !important; }
      .sm\\:mr-2 { margin-right: 0.5rem !important; }
      .sm\\:mt-0 { margin-top: 0px !important; }
      .sm\\:mx-0 { margin-left: 0px !important; margin-right: 0px !important; }
      .sm\\:p-10 { padding: 2.5rem !important; }
      .sm\\:p-3 { padding: 0.75rem !important; }
      .sm\\:p-4 { padding: 1rem !important; }
      .sm\\:p-5 { padding: 1.25rem !important; }
      .sm\\:p-8 { padding: 2rem !important; }
      .sm\\:px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
      .sm\\:px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
      .sm\\:px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .sm\\:px-5 { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
      .sm\\:px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
      .sm\\:py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
      .sm\\:py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
      .sm\\:py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
      .sm\\:rounded-lg { border-radius: 0.5rem !important; }
      .sm\\:text-4xl { font-size: 2.25rem !important; line-height: 2.5rem !important; }
      .sm\\:text-\\[10px\\] { font-size: 10px !important; }
      .sm\\:text-\\[11px\\] { font-size: 11px !important; }
      .sm\\:text-base { font-size: 1rem !important; line-height: 1.5 !important; }
      .sm\\:text-left { text-align: left !important; }
      .sm\\:text-slate-700 { color: #334155 !important; }
      .sm\\:text-sm { font-size: 0.875rem !important; line-height: 1.25 !important; }
      .sm\\:text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
      .sm\\:w-3 { width: 0.75rem !important; }
      .sm\\:w-48 { width: 12rem !important; }
    `;
    document.head.appendChild(styleEl);
    
    try {
      const dataUrl = await toJpeg(element, {
        cacheBust: true,
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        style: {
          width: '794px',
          minWidth: '794px'
        },
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset?.html2canvasIgnore === 'true') {
            return false;
          }
          return true;
        }
      });
      
      const targetHeight = element.offsetHeight;
      
      element.style.width = prevWidth;
      element.style.maxWidth = prevMaxWidth;
      element.style.minHeight = prevMinHeight;
      element.style.borderRadius = prevBorderRadius;

      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
      if (footerElement) {
        footerElement.classList.remove('flex');
        footerElement.classList.add('hidden', 'print:flex');
      }

      if (exportType === 'jpg') {
        download(dataUrl, `Result_${roll || instituteCode || 'group'}.jpg`);
      } else if (exportType === 'pdf') {
        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = (targetHeight * pdfWidth) / 794;
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [pdfWidth, pdfHeight]
        });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Result_${roll || instituteCode || 'group'}.pdf`);
      }
    } catch(err) {
      element.style.width = prevWidth;
      element.style.maxWidth = prevMaxWidth;
      element.style.minHeight = prevMinHeight;
      element.style.borderRadius = prevBorderRadius;

      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
      if (footerElement) {
        footerElement.classList.remove('flex');
        footerElement.classList.add('hidden', 'print:flex');
      }
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
      <div className={`${type === 'group' || type === 'institute' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto pb-10 mt-2 lg:px-4 print:my-0 print:pb-0 print:px-0 print:max-w-none print:mx-0`}>
        <div className="mb-6 flex gap-3 justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-xl border border-white/60 shadow-lg shadow-slate-200/50 print:hidden flex-wrap w-full">
        <button onClick={() => window.history.back()} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-wrap gap-2">
          {type !== 'institute' && (
            <>
              <button 
                onClick={() => generateImageAndDownload('jpg')}
                className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95"
              >
                <Download className="w-5 h-5 mr-0 sm:mr-2" /> <span className="hidden sm:inline">{type === 'group' ? 'Download CSV' : 'Download JPG'}</span>
              </button>
              <button 
                onClick={() => generateImageAndDownload('pdf')}
                className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95"
              >
                <Printer className="w-5 h-5 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Download PDF</span>
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
        className={`bg-white/95 backdrop-blur-3xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-200/50 print:shadow-none print:border-transparent relative w-full ${type === 'institute' ? 'p-0 overflow-hidden' : type === 'group' ? 'p-4 sm:p-6 lg:p-8 overflow-hidden' : 'p-6 sm:p-10 print:p-4'}`}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 rounded-t-3xl print:hidden"></div>
        {type === 'individual' ? (
           <div className="space-y-12 print:space-y-6">
             {results.filter((_, i) => i === selectedResultIndex).map((resultItem, mapIndex) => (
               <div key={resultItem.id} className="max-w-3xl w-full mx-auto space-y-6 print:space-y-4">
                  {/* Modern Result Header */}
                  <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-emerald-900 p-6 sm:p-8 rounded-3xl text-white relative overflow-hidden shrink-0 shadow-lg mb-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
                    <div className="absolute top-8 right-8 opacity-10 pointer-events-none">
                      <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zM12 14l9 5-9 5-9-5 9-5z"></path></svg>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1 uppercase">
                              Academic Result
                            </h2>
                            <p className="text-blue-100/80 font-medium text-sm tracking-wide">
                              BTEB Result Library
                            </p>
                          </div>
                          <div className="hidden sm:block text-right">
                            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-white/90 text-sm font-medium backdrop-blur-md">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              btebresultlibrary.vercel.app
                            </span>
                          </div>
                        </div>
                     </div>
                  </div>

                   <div className="pb-6 border-b border-indigo-100 print:pb-4">
                     <div className="bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm print:shadow-none print:border-none print:bg-transparent print:p-0">
                       <div className="flex flex-col divide-y divide-slate-100 print:divide-gray-200">
                         <div className="flex flex-col sm:flex-row py-3 px-2 sm:px-4 hover:bg-slate-50 transition-colors print:bg-transparent text-center sm:text-left items-center sm:items-start">
                           <div className="font-bold text-slate-500 sm:text-slate-700 w-full sm:w-48 uppercase tracking-wider text-[11px] sm:text-sm mb-0.5 sm:mb-0">Roll No</div>
                           <div className="font-extrabold text-indigo-900 print:text-black text-[22px] sm:text-base leading-none sm:leading-normal"><span className="hidden sm:inline mr-1">:</span>{resultItem.rollNumber}</div>
                         </div>
                         <div className="flex flex-col sm:flex-row py-3 px-2 sm:px-4 hover:bg-slate-50 transition-colors print:bg-transparent text-center sm:text-left items-center sm:items-start">
                           <div className="font-bold text-slate-500 sm:text-slate-700 w-full sm:w-48 uppercase tracking-wider text-[11px] sm:text-sm mb-0.5 sm:mb-0">Institute</div>
                           <div className="font-bold text-slate-800 print:text-black text-lg sm:text-base leading-tight sm:leading-normal"><span className="hidden sm:inline mr-1">:</span>{resultItem.instituteName}</div>
                         </div>
                         <div className="flex flex-col sm:flex-row py-3 px-2 sm:px-4 hover:bg-slate-50 transition-colors print:bg-transparent text-center sm:text-left items-center sm:items-start">
                           <div className="font-bold text-slate-500 sm:text-slate-700 w-full sm:w-48 uppercase tracking-wider text-[11px] sm:text-sm mb-0.5 sm:mb-0">Curriculum</div>
                           <div className="font-semibold text-slate-800 print:text-black text-base sm:text-base"><span className="hidden sm:inline mr-1">:</span>{resultItem.curriculum || 'Diploma in Engineering'}</div>
                         </div>
                         <div className="flex flex-col sm:flex-row py-3 px-2 sm:px-4 hover:bg-slate-50 transition-colors print:bg-transparent text-center sm:text-left items-center sm:items-start">
                           <div className="font-bold text-slate-500 sm:text-slate-700 w-full sm:w-48 uppercase tracking-wider text-[11px] sm:text-sm mb-0.5 sm:mb-0">Regulation</div>
                           <div className="font-semibold text-slate-800 print:text-black text-base sm:text-base"><span className="hidden sm:inline mr-1">:</span>{resultItem.regulation || 'N/A'}</div>
                         </div>
                       </div>
                     </div>
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
                        <div className="mt-8 print:mt-4 border border-indigo-100/80 rounded-2xl shadow-md print:shadow-none bg-white overflow-hidden">
                          <div className="hidden sm:grid sm:grid-cols-12 bg-indigo-50/50 border-b border-indigo-100 text-indigo-900 text-left items-stretch">
                            <div className="sm:col-span-4 lg:col-span-3 py-4 px-4 sm:px-5 font-bold border-r border-slate-100 uppercase tracking-wider text-xs flex items-center justify-start">Semester</div>
                            <div className="sm:col-span-8 lg:col-span-9 py-4 px-3 sm:px-5 font-bold uppercase tracking-wider text-xs flex items-center justify-start">Result Details</div>
                          </div>
                          <div className="flex flex-col divide-y divide-slate-100 print:divide-gray-200">
                              {semestersList.map((sem, i) => {
                                 const parsed = parseSemester(sem.value);
                                 if (!parsed) return null;
                                 const isPassed = parsed.type === 'passed';
                                 
                                 return (
                                   <div key={i} className="flex flex-col sm:grid sm:grid-cols-12 hover:bg-indigo-50/30 transition-colors print:bg-transparent print:break-inside-avoid group/tr text-center sm:text-left">
                                     <div className="sm:col-span-4 lg:col-span-3 py-4 px-4 sm:px-5 print:py-2 print:px-3 border-b sm:border-b-0 sm:border-r border-slate-100 print:border-gray-200 align-top print:bg-transparent transition-colors flex flex-col items-center sm:items-start justify-center">
                                       <div className="font-extrabold text-slate-800 leading-snug text-[15px] sm:text-base whitespace-nowrap">{sem.label}</div>
                                       {parsed.date && (
                                         <div className="text-[11px] print:text-[10px] text-indigo-600 mt-2 flex items-center bg-white print:bg-transparent px-2.5 py-1.5 print:p-0 rounded-md border border-indigo-100 print:border-none w-fit shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] print:shadow-none group-hover/tr:bg-indigo-50/50 transition-colors mx-auto sm:mx-0">
                                            <Calendar className="w-3.5 h-3.5 print:w-3 print:h-3 mr-1.5 text-indigo-500 print:text-slate-600 shrink-0" />
                                            <span className="font-bold tracking-wide leading-tight whitespace-nowrap">
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
                                            </span>
                                         </div>
                                       )}
                                     </div>
                                     <div className="sm:col-span-8 lg:col-span-9 py-4 px-3 sm:px-5 print:py-2 print:px-3 align-top print:bg-transparent transition-colors flex flex-col items-center sm:items-start justify-center">
                                        {isPassed || parsed.gpa ? (
                                          <div className="font-bold border border-emerald-200 text-emerald-800 bg-emerald-50 print:bg-transparent inline-flex items-center px-4 py-2 rounded-xl shadow-sm print:shadow-none print:border-none whitespace-nowrap">
                                            <span className="flex items-center gap-2">
                                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 print:hidden shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                              Passed
                                            </span>
                                            {parsed.gpa && parsed.gpa !== 'Passed' && (
                                              <>
                                                <span className="text-emerald-300 font-semibold mx-3 print:text-black">/</span> <span className="font-black text-emerald-900">GPA: {parsed.gpa}</span>
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-rose-700 bg-rose-50/50 print:bg-transparent rounded-xl border border-rose-100 print:border-none p-4 sm:p-5 print:p-0 w-full text-left">
                                            <div className="font-bold text-sm mb-4 flex items-center justify-center sm:justify-start print:text-black whitespace-nowrap">
                                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2.5 animate-pulse print:hidden shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                              Referred in {parsed.total} Subject{parsed.total > 1 ? 's' : ''}:
                                            </div>
                                            <ul className="flex flex-col gap-3">
                                              {(Array.isArray(parsed.subjects) ? parsed.subjects : []).map((sub: any, idx: number) => (
                                                <li key={idx}>
                                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 print:p-0 rounded-xl border border-rose-100/60 print:border-none bg-white print:bg-transparent shadow-sm print:shadow-none transition-colors hover:border-rose-200 group text-center sm:text-left">
                                                    <div className="font-bold text-slate-800 text-sm break-words leading-snug flex-1 print:text-sm">
                                                      {sub.subName || sub.name || 'Subject'}
                                                    </div>
                                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1 sm:mt-0 shrink-0">
                                                      <span className="font-mono text-slate-600 bg-slate-50 print:bg-transparent print:border-none px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold border border-slate-200 whitespace-nowrap group-hover:bg-rose-50/50 transition-colors">
                                                        {sub.code || sub.subCode}
                                                      </span>
                                                      <span className="text-[10px] uppercase tracking-widest font-black text-rose-600 bg-rose-50 print:bg-transparent print:border-none px-2 py-1 rounded border border-rose-100/80 whitespace-nowrap">
                                                        {sub.type === 'T' ? 'Theory' : sub.type === 'P' ? 'Practical' : sub.type}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </li>
                                              ))}
                                              {(!parsed.subjects || parsed.subjects.length === 0) && (
                                                <li className="text-red-400 italic text-sm py-2 text-center sm:text-left">No subject details provided</li>
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                     </div>
                                   </div>
                                 );
                              })}
                          </div>
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
                                  <a key={pidx} href={pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 p-4 rounded-xl hover:from-red-100 hover:to-rose-100 hover:border-red-200 hover:shadow-md hover:-translate-y-0.5 text-left transition-all group">
                                     <div className="w-12 h-12 bg-white text-red-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-red-50 group-hover:scale-110 transition-transform">
                                       <Folder className="w-6 h-6 fill-red-50" />
                                     </div>
                                     <div className="flex-1 overflow-hidden">
                                       <div className="font-bold text-gray-900 truncate">{pdf.split('/').pop()}</div>
                                       <div className="text-xs text-red-500 mt-1 uppercase tracking-wider font-semibold">Official PDF Document</div>
                                     </div>
                                     <div className="bg-white border border-gray-100 text-blue-600 p-2.5 rounded-full shadow-sm group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-colors">
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
              {/* Modern Group Result Header */}
              <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-indigo-800 p-6 sm:p-8 rounded-3xl text-white relative overflow-hidden shrink-0 shadow-lg mb-6 w-full">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
                <div className="absolute top-8 right-8 opacity-10 pointer-events-none">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1 uppercase">
                          Group Results
                        </h2>
                        <p className="text-blue-100/80 font-medium text-sm tracking-wide">
                          Multiple Roll View - BTEB Result Library
                        </p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-white/90 text-sm font-medium backdrop-blur-md">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          btebresultlibrary.vercel.app
                        </span>
                      </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-indigo-400/30 flex flex-wrap gap-4 items-center">
                    <span className="bg-indigo-950/40 text-blue-100 px-3 py-1.5 rounded-lg text-sm font-bold border border-indigo-400/20 backdrop-blur-md flex items-center shadow-sm">
                      <BookOpen className="w-4 h-4 mr-2 opacity-70"/> {results[0]?.curriculum || 'Diploma in Engineering'}
                    </span>
                    <span className="bg-indigo-950/40 text-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold border border-indigo-400/20 backdrop-blur-md flex items-center shadow-sm">
                      <Calendar className="w-4 h-4 mr-2 opacity-70"/> Regulation {results[0]?.regulation || 'N/A'}
                    </span>
                </div>
              </div>

              <div className="w-full pb-4">
                 {/* Desktop Table View */}
                 <div className="bg-white rounded-xl border border-indigo-100 shadow-sm w-full overflow-x-auto hidden lg:block print:block">
                   <table className="w-full text-left text-sm bg-white min-w-[600px]">
                     <thead className="bg-[#f8fafc] border-b-2 border-indigo-100 text-indigo-900 tracking-wider text-[10px] sm:text-[11px] font-bold">
                       <tr>
                         <th className="py-2 px-2 sm:py-4 sm:px-4 border-r border-indigo-100/50 uppercase">Roll No & Institute</th>
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
                           <tr key={r.id || r.rollNumber} className="hover:bg-blue-50/20 transition-colors print:break-inside-avoid">
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
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden print:hidden">
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
                       <div key={r.id || r.rollNumber} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                         <div className="mb-4 pb-4 border-b border-indigo-50">
                            <div className="font-extrabold tracking-tight text-indigo-900 text-xl mb-1.5">{r.rollNumber || r.roll || '--'}</div>
                            <div className="text-xs text-slate-500 font-semibold flex items-center gap-2" title={r.instituteName}>
                               <Building className="w-4 h-4 shrink-0 text-indigo-500" />
                               <span className="truncate">{r.instituteName || (r.institute && r.institute.name) || 'Unknown Institute'}</span>
                            </div>
                         </div>
                         <div className="grid grid-cols-4 sm:grid-cols-3 gap-2.5">
                            {sortedSems.map(semNum => {
                               const semData = r[`semester${semNum}`];
                               const parsed = semData ? parseSemester(semData) : null;
                               
                               return (
                                 <div key={semNum} className="flex flex-col items-center justify-center p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{semNum === 1 ? '1st' : semNum === 2 ? '2nd' : semNum === 3 ? '3rd' : `${semNum}th`}</span>
                                   {parsed ? (
                                     parsed.type === 'passed' ? (
                                       <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] border border-emerald-100/50">{parsed.gpa || parsed.cgpa || '-'}</span>
                                     ) : (
                                       <div className="group relative">
                                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest cursor-help bg-rose-50 px-1.5 py-0.5 rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] border border-rose-100/50">Fail({parsed.total})</span>
                                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-xl p-3 z-50 pointer-events-none shadow-xl border border-slate-700">
                                            <div className="font-bold mb-2 border-b border-slate-700 pb-1.5 text-rose-400 uppercase tracking-wider text-[10px]">Failed Subjects:</div>
                                            <ul className="text-left list-disc pl-3 flex flex-col gap-1">
                                              {(Array.isArray(parsed.subjects) ? parsed.subjects : []).map((sub: any, idx: number) => (
                                                <li key={idx} className="truncate text-slate-200">
                                                  {sub.subName || sub.name || 'Subject'} <span className="font-mono text-slate-400 ml-1 text-[10px]">({sub.code || sub.subCode})</span>
                                                </li>
                                              ))}
                                            </ul>
                                         </div>
                                       </div>
                                     )
                                   ) : (
                                     <span className="text-slate-300 font-bold">-</span>
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

        <div id="print-footer" className="mt-16 pt-6 flex justify-between items-end hidden print:flex relative" data-html2canvas-ignore="false">
          <div className="flex flex-col gap-1 items-start w-1/3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
              <span className="text-blue-800 font-bold tracking-tight text-xl leading-none">BTEB Result Library</span>
            </div>
          </div>

          <div className="w-1/3 text-center pb-1"></div>

          <div className="w-1/3 flex justify-end">
            {typeof window !== 'undefined' && (
              <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                <div className="text-right">
                  <div className="text-xs font-bold text-indigo-900 mb-0.5">Verify Online</div>
                  <div className="text-[9px] text-slate-500 leading-tight">Scan this QR code<br/>to open live page</div>
                </div>
                <div className="w-[60px] h-[60px] bg-white rounded p-1">
                  <QRCodeSVG value={window.location.href} size={52} fgColor="#1e1b4b" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {bannerConfig?.bannerUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="mt-12 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100 print:hidden"
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
