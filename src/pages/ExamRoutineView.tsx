import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, BookOpen, Calendar as CalendarIcon, Clock, Hash, Printer, Share2, Download } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function ExamRoutineView() {
  const location = useLocation();
  const navigate = useNavigate();

  const targetPath = location.pathname.replace('/exam-routines', '');
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRoutineData() {
      try {
        const response = await fetch(`/api/bteb-exam-routines-scrape?path=${encodeURIComponent(targetPath)}`);
        if (!response.ok) throw new Error("Failed to load routine data");
        const json = await response.json();
        if (json.success) {
          setData(json);
        } else {
          throw new Error(json.error || "Failed to load");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRoutineData();
  }, [targetPath]);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSemester = (sIdx: number) => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #routine-print-container-${sIdx}, #routine-print-container-${sIdx} * { visibility: visible; }
        #routine-print-container-${sIdx} { position: absolute; left: 0; top: 0; width: 100%; border: none !important; margin: 0 !important; }
        .print-hide { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }, 1000);
  };

  const handleDownloadSemester = async (sIdx: number, semesterName: string) => {
    const element = document.getElementById(`routine-print-container-${sIdx}`);
    if (!element) return;
    
    // Hide buttons temporarily
    const buttons = element.querySelectorAll('button');
    buttons.forEach(b => b.style.display = 'none');
    
    try {
      const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data?.title || 'routine'}-${semesterName}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to download PDF.");
    } finally {
      // Show buttons again
      buttons.forEach(b => b.style.display = '');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.title || 'Exam Routine',
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById('routine-content');
    if (!element) return;
    try {
      const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data?.title || 'routine'}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to download PDF.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-white border-b border-slate-200 print:hidden hidden sm:block sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button 
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium" 
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex-grow ml-2 truncate">
            {data?.title || "Exam Routine"}
          </h1>
          
          {data?.type === 'technology' && (
            <div className="flex items-center gap-2">
               <button onClick={handleShare} className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-colors" title="Share Routine">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Share</span>
               </button>
               <button onClick={handlePrint} className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-colors" title="Print Routine">
                  <Printer className="w-4 h-4" />
                  <span className="hidden lg:inline">Print</span>
               </button>
               <button onClick={handleDownload} className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors" title="Download PDF">
                  <Download className="w-4 h-4" />
                  <span className="hidden lg:inline">Download</span>
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:py-0">
        <div className="sm:hidden mb-6 flex items-center justify-between print:hidden">
          <button 
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-medium shadow-sm" 
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          {data?.type === 'technology' && (
            <div className="flex gap-2">
              <button onClick={handleShare} className="bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:bg-slate-50"><Share2 className="w-5 h-5" /></button>
              <button onClick={handlePrint} className="bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:bg-slate-50"><Printer className="w-5 h-5" /></button>
              <button onClick={handleDownload} className="bg-blue-600 text-white p-2 rounded-lg"><Download className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10 bg-red-50 rounded-2xl border border-red-200">
            <p>{error}</p>
          </div>
        ) : data?.type === 'program' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((item: any, i: number) => (
              <Link key={i} to={item.href} className="group block h-full">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col transition-all hover:shadow-md hover:border-blue-200 cursor-pointer">
                  <div className="p-5 pb-5 flex-none flex flex-row items-start gap-4 space-y-0 relative pr-10">
                    <div className="flex flex-col gap-2 flex-grow">
                      <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      {item.badge && (
                        <div>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                            {item.badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute right-4 top-6">
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : data?.type === 'technology' ? (
          <div id="routine-content" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
            <div className="p-6 border-b border-slate-100 hidden sm:block print:block text-center sm:text-left">
               <h2 className="text-2xl font-bold text-slate-900">{data.title || "Exam Routine"}</h2>
               <p className="text-slate-500 mt-1 print:block hidden">Generated via Dashboard</p>
            </div>
            <div className="p-0 sm:p-6 sm:pt-2 flex flex-col gap-8 print:p-0 print:gap-4 mt-6">
               {data.data.map((semData: any, sIdx: number) => (
                 <div key={sIdx} id={`routine-print-container-${sIdx}`} className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:break-inside-avoid">
                   <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 print:bg-slate-50 flex items-center justify-between sm:text-left flex-wrap gap-3">
                     <h3 className="font-semibold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
                       <BookOpen className="w-4 h-4 text-slate-500" />
                       {semData.semester}
                     </h3>
                     <div className="flex items-center gap-1.5 print-hide">
                       <button onClick={() => handleShare()} className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md p-1.5 transition-colors" title="Share Semester">
                          <Share2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handlePrintSemester(sIdx)} className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md p-1.5 transition-colors" title="Print Semester">
                          <Printer className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDownloadSemester(sIdx, semData.semester)} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-md p-1.5 border border-blue-600 transition-colors" title="Download Semester PDF">
                          <Download className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 uppercase text-xs font-semibold print:bg-transparent">
                         <tr>
                           <th scope="col" className="px-4 py-3 whitespace-nowrap">Date & Day</th>
                           <th scope="col" className="px-4 py-3 whitespace-nowrap">Subject Code</th>
                           <th scope="col" className="px-4 py-3">Subject Name</th>
                           <th scope="col" className="px-4 py-3 whitespace-nowrap">Time</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {semData.routine.map((row: any, i: number) => (
                           <tr key={i} className="hover:bg-blue-50/30 transition-colors print:hover:bg-transparent">
                             <td className="px-4 py-3">
                               <div className="font-medium text-slate-900 whitespace-nowrap flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-slate-400 print:hidden"/>{row.date}</div>
                               <div className="text-slate-500 text-xs mt-0.5 ml-5 print:ml-0">{row.day}</div>
                             </td>
                             <td className="px-4 py-3 font-mono text-slate-700">
                               <div className="flex items-center gap-1.5">
                                 <Hash className="w-3.5 h-3.5 text-slate-400 print:hidden" />
                                 {row.code}
                               </div>
                             </td>
                             <td className="px-4 py-3">
                               <div className="font-medium text-slate-800">{row.subject}</div>
                             </td>
                             <td className="px-4 py-3">
                               <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md w-fit whitespace-nowrap border border-amber-100/50 print:bg-transparent print:border-none print:p-0 print:text-slate-800">
                                 <Clock className="w-3.5 h-3.5 print:hidden" />
                                 <span className="font-medium text-xs print:text-sm">{row.time}</span>
                               </div>
                             </td>
                           </tr>
                         ))}
                         {semData.routine.length === 0 && (
                           <tr>
                             <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                               No exams found for this semester
                             </td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               ))}
               
               {data.data.length === 0 && (
                 <div className="text-center py-10 text-slate-500 border border-slate-200 rounded-xl">
                    No routine data available
                 </div>
               )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
