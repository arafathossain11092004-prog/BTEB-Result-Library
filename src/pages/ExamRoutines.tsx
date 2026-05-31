import SeoBlocks from "../components/SeoBlocks";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, ChevronRight } from "lucide-react";

export default function ExamRoutines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRoutines() {
      try {
        const response = await fetch("/api/bteb-exam-routines");
        if (!response.ok) throw new Error("Failed to load routines");
        const json = await response.json();
        if (json.success) {
          setRoutines(json.data);
        } else {
          throw new Error(json.error || "Failed to load");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRoutines();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Exam Routine
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Find your latest academic examination schedules below.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10 bg-red-50 rounded-2xl border border-red-200">
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {routines.map((routine, i) => {
               // Extract regulations and semesters from bottomText
               const bottomText = routine.bottomText || "";
               let regulations = "";
               let semesters = "";
               if (bottomText.includes("Regulations:")) {
                 const parts = bottomText.split("Semesters:");
                 regulations = parts[0].replace("Regulations:", "").trim();
                 semesters = parts[1] ? parts[1].trim() : "";
               }
               
               return (
                <Link key={i} to={routine.href} className="group block h-full">
                  <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 p-0 flex flex-col transition-all hover:shadow-md hover:border-blue-200 cursor-pointer">
                    <div className="pb-3 px-6 pt-6 border-b border-slate-100 flex-none">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {routine.title}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </div>
                    <div className="p-6 pt-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarIcon className="w-4 h-4 text-slate-500" />
                          <span>{routine.dates}</span>
                        </div>
                        {(regulations || semesters) && (
                          <div className="flex flex-col gap-1 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 mt-4">
                            {regulations && (
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-slate-700 min-w-[80px]">Regs:</span>
                                <span className="text-slate-600">{regulations}</span>
                              </div>
                            )}
                            {semesters && (
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-slate-700 min-w-[80px]">Semesters:</span>
                                <span className="text-slate-600">{semesters}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

       <div className="print:hidden">
          <SeoBlocks 
            pageTitle="BTEB Exam Routine 2026 | Full Polytechnic Schedule"
            metaDescription="Search and download your BTEB diploma exam routines instantly. Organized by technology and semester for easy scanning."
            aboutTitle="About Exam Routine"
            aboutContent={
              <>
                <p>
                  This portal simplifies finding your <strong>BTEB polytechnic exam schedule</strong>. 
                  Say goodbye to manually scrolling through hundreds of pages of PDFs. View your routine and download exactly what you need.
                </p>
              </>
            }
            howItWorksSteps={[
              { title: "Select Filters", desc: "Choose your Technology, Probidhan, and Semester." },
              { title: "Search Instantly", desc: "Use the search bar to find exact subjects or codes." },
              { title: "Download Format", desc: "Print as PDF or download a PNG image of your routine." }
            ]}
            faqs={[
              { q: "How accurate is this routine?", a: "We provide the most up-to-date and accurate board routines." },
              { q: "Can I download routines for offline use?", a: "Yes, you can save routines directly to your device." }
            ]}
            keywordBoostText="Get your accurate diploma engineering exam routine here. Easy to filter, fast to download."
          />
       </div>
    </div>
  );
}