import React, { useState } from 'react';
import { FileText, Copy, Check, AlertCircle } from 'lucide-react';
import { translateBengaliNum } from '../../lib/pdfParser'; // Utilizing your existing local translations where possible

// We are implementing the exact schema and offline fallback per the prompt instructions.

export default function RoutineMarkdownGenerator() {
  const [inputText, setInputText] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  // Exact mappings without API
  const generateMarkdown = () => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let md = '| Exam Name | Date & Day | Time | Semester | Regulation | Subject Code | Subject Name | Technology |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
    
    let currentDate = '';
    let currentDay = '';
    let currentTime = '';
    let currentSemester = '';
    let currentRegulation = '';

    const dateRegexInfo = /(\d{2}\s*[-\/.]\s*\d{2}\s*[-\/.]\s*\d{4}|[০-৯]{2}\s*[-\/.]\s*[০-৯]{2}\s*[-\/.]\s*[০-৯]{4})/;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Date matching
      if (dateRegexInfo.test(line)) {
        currentDate = translateBengaliNum(line.match(dateRegexInfo)![0]);
        // Extract day
        if (line.includes("সোমবার") || line.includes("Monday")) currentDay = "Monday";
        if (line.includes("মঙ্গলবার") || line.includes("Tuesday")) currentDay = "Tuesday";
        if (line.includes("বুধবার") || line.includes("Wednesday")) currentDay = "Wednesday";
        if (line.includes("বৃহস্পতিবার") || line.includes("Thursday")) currentDay = "Thursday";
        if (line.includes("শুক্রবার") || line.includes("Friday")) currentDay = "Friday";
        if (line.includes("শনিবার") || line.includes("Saturday")) currentDay = "Saturday";
        if (line.includes("রবিবার") || line.includes("Sunday")) currentDay = "Sunday";
        
        // Extract time
        if (line.includes("সকাল") || line.includes("১০:০০") || line.includes("10:00")) currentTime = "10:00 AM";
        if (line.includes("বিকাল") || line.includes("০২:০০") || line.includes("2:00") || line.includes("02:00") || line.includes("দুপুর")) currentTime = "02:00 PM";
        continue;
      }

      // Semester & Regulation
      if (line.includes("পর্ব") || line.includes("Semester")) {
        let semEng = "Unknown Semester";
        if (line.includes("১ম") || line.includes("1st")) semEng = "1st Semester";
        if (line.includes("২য়") || line.includes("2nd")) semEng = "2nd Semester";
        if (line.includes("৩য়") || line.includes("3rd")) semEng = "3rd Semester";
        if (line.includes("৪র্থ") || line.includes("4th")) semEng = "4th Semester";
        if (line.includes("৫ম") || line.includes("5th")) semEng = "5th Semester";
        if (line.includes("৬ষ্ঠ") || line.includes("6th")) semEng = "6th Semester";
        if (line.includes("৭ম") || line.includes("7th")) semEng = "7th Semester";
        if (line.includes("৮ম") || line.includes("8th")) semEng = "8th Semester";
        currentSemester = semEng;

        if (line.includes("২০১৬") || line.includes("2016")) currentRegulation = "2016";
        if (line.includes("২০১০") || line.includes("2010")) currentRegulation = "2010";
        if (line.includes("২০২২") || line.includes("2022")) currentRegulation = "2022";
        continue;
      }

      // If it looks like a subject row starting with index or specific sequence
      // Many rows start with a number like "১." or "1."
      let match = line.match(/^(\d+|[০-৯]+)[\.।]?\s+(\d{4,5}|[০-৯]{4,5})\s+(.*)$/);
      if (match) {
        let codeRaw = match[2];
        let codeEng = translateBengaliNum(codeRaw);
        let restOfLine = match[3];

        let subjectName = "";
        let tech = "";

        // Rough split: often technology is at the end after some space or known keywords
        // Here we attempt a robust replace based on exact prompts without using API
        let techMap: Record<string, string> = {
          "আর্কিটেকচার": "Architecture",
          "অটোমোবাইল": "Automobile",
          "কেমিক্যাল": "Chemical",
          "সিভিল": "Civil",
          "সিভিল (উড)": "Civil (Wood)",
          "কম্পিউটার": "Computer",
          "ইলেকট্রিক্যাল": "Electrical",
          "ইলেকট্রনিক্স": "Electronics",
          "মেকানিক্যাল": "Mechanical",
          "পাওয়ার": "Power",
          "মেরিন": "Marine",
          "সার্ভেয়িং": "Surveying",
          "কনস্ট্রাকশন": "Construction",
          "গ্লাস": "Glass",
          "সিরামিক": "Ceramic",
          "ফুটওয়্যার": "Footwear",
          "প্রিন্টিং": "Printing",
          "গ্রাফিক্স": "Graphics",
          "ট্যুরিজম": "Tourism",
          "মেকাট্রনিক্স": "Mechatronics",
          "টেলিকমিউনিকেশন": "Telecommunication",
          "এ্যারোস্পেস": "Aerospace",
          "এভিওনিক্স": "Avionics",
          "ইলেকট্রোমেডিক্যাল": "Electromedical",
          "মাইনিং": "Mining",
          "এনভায়রনমেন্টাল": "Environmental",
          "এআইডিটি": "AIDT",
          "আইপিসিটি": "IPCT",
          "শীপ বিল্ডিং": "Ship Building",
          "শিপ বিল্ডিং": "Ship Building"
        };
        
        let foundTech = false;
        // Go through map to extract technology if ends with it
        for (const [ben, eng] of Object.entries(techMap)) {
            if (restOfLine.endsWith(ben)) {
                tech = eng;
                subjectName = restOfLine.replace(new RegExp(ben + "$"), "").trim();
                foundTech = true;
                break;
            }
        }
        if (!foundTech) {
            tech = "General/Other";
            subjectName = restOfLine;
        }

        // Further English translations of common words in subject name
        subjectName = subjectName
            .replace(/ডিজাইন/g, "Design")
            .replace(/সাসপেনশন/g, "Suspension")
            .replace(/এন্ড/g, "and")
            .replace(/এ্যান্ড/g, "and")
            .replace(/পাওয়ার/g, "Power")
            .replace(/ট্রান্সমিশন/g, "Transmission")
            .replace(/অপারেশন/g, "Operation")
            .replace(/প্রসেস/g, "Process");

        md += `| Diploma-in-Engineering Board Exam | ${currentDate}<br>(${currentDay}) | ${currentTime} | ${currentSemester} | ${currentRegulation} | ${codeEng} | ${subjectName} | ${tech} |\n`;
      }
    }
    
    setMarkdown(md);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 lg:px-0 px-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Markdown Table Generator (Offline)</h1>
          <p className="text-sm text-gray-500">Transform Bengali routine OCR directly to Markdown Table without API usage.</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4 text-blue-600">
            <AlertCircle className="w-5 h-5"/>
            <span className="font-medium text-sm">Process running 100% client-side (no backend APIs utilized).</span>
        </div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Paste raw Bengali OCR text here:</label>
        <textarea 
            className="w-full h-48 border border-gray-300 rounded-xl p-4 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            value={inputText} 
            onChange={e => setInputText(e.target.value)} 
            placeholder="০৮-১১-২০২১ সোমবার সকাল ১০:০০\n৫ম পর্ব (২০১৬ প্রবিধান)\n১. ৬৬১৫১ আর্কিটেকচারাল ডিজাইন-৪ আর্কিটেকচার..." 
        />
        <div className="mt-4 flex justify-end">
            <button 
                onClick={generateMarkdown}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all"
            >
                Generate Markdown Structure
            </button>
        </div>
      </div>

      {markdown && (
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                    onClick={handleCopy}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 hover:text-white"
                >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
            </div>
            <label className="block text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Generated Output</label>
            <textarea 
                className="w-full h-80 bg-transparent text-emerald-400 font-mono text-sm leading-relaxed border-none outline-none resize-none" 
                readOnly 
                value={markdown} 
            />
        </div>
      )}
    </div>
  );
}
