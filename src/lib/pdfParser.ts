import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const bengaliToEnglishNumbers: { [key: string]: string } = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

function translateBengaliNum(str: string): string {
  return str.replace(/[০-৯]/g, (match) => bengaliToEnglishNumbers[match]);
}

export async function parsePdfToRoutines(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((s: any) => s.str).join(" ") + " ";
  }
  
  fullText = fullText.replace(/\n/g, " ");

  const routines: any[] = [];
  const tokens = fullText.split(/\s+/).filter((t: string) => t.length > 0);
  
  let currentDate = "";
  let currentDay = "";
  let currentTime = "";
  let currentSemester = "1st Semester";
  let currentRegulation = "2016 Probidhan";
  
  const dateRegexInfo = /(\d{2}-\d{2}-\d{4}|[০-৯]{2}-[০-৯]{2}-[০-৯]{4})/;
  const subjectCodeRegex = /^(\d{4,5}|[০-৯]{4,5})$/;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (dateRegexInfo.test(token)) {
      currentDate = translateBengaliNum(token.match(dateRegexInfo)![0]);
      for (let j = i; j < i + 10 && j < tokens.length; j++) {
          if (tokens[j].includes("বিামবাি") || tokens[j].includes("সোমবাি") || tokens[j] === "Monday") currentDay = "Monday";
          if (tokens[j].includes("মঙ্গলবাি") || tokens[j] === "Tuesday") currentDay = "Tuesday";
          if (tokens[j].includes("বুধবাি") || tokens[j] === "Wednesday") currentDay = "Wednesday";
          if (tokens[j].includes("বৃহেরতবাি") || tokens[j].includes("বৃহস্পতিবার") || tokens[j] === "Thursday") currentDay = "Thursday";
          if (tokens[j].includes("শুক্রবাি") || tokens[j].includes("শুক্রবার") || tokens[j] === "Friday") currentDay = "Friday";
          if (tokens[j].includes("শরিবাি") || tokens[j].includes("শনিবার") || tokens[j] === "Saturday") currentDay = "Saturday";
          if (tokens[j].includes("িরববাি") || tokens[j].includes("রবিবার") || tokens[j] === "Sunday") currentDay = "Sunday";
          if (tokens[j].includes("১০:০০") || tokens[j].includes("10:00") || tokens[j].includes("সকাল")) currentTime = "10:00 AM";
          if (tokens[j].includes("০২:০০") || tokens[j].includes("02:00") || tokens[j].includes("২:০০") || tokens[j].includes("বিকাল") || tokens[j].includes("PM")) currentTime = "02:00 PM";
      }
    }
    
    if (token.includes("পব") || token.includes("পর্ব") || token.includes("Semester")) {
       let context = token + " " + (tokens[i+1]||"") + " " + (tokens[i+2]||"") + " " + (tokens[i-1]||"");
       if (context.includes("২০১৬") || context.includes("2016")) currentRegulation = "2016 Probidhan";
       if (context.includes("২০১০") || context.includes("2010")) currentRegulation = "2010 Probidhan";
       if (context.includes("২০২২") || context.includes("2022")) currentRegulation = "2022 Probidhan";
       if (context.includes("১ম") || context.includes("1st")) currentSemester = "1st Semester";
       if (context.includes("২য়") || context.includes("2nd")) currentSemester = "2nd Semester";
       if (context.includes("৩য়") || context.includes("3rd")) currentSemester = "3rd Semester";
       if (context.includes("৪র্") || context.includes("4th")) currentSemester = "4th Semester";
       if (context.includes("৫ম") || context.includes("5th")) currentSemester = "5th Semester";
       if (context.includes("৬ষ্ঠ") || context.includes("6th")) currentSemester = "6th Semester";
       if (context.includes("৭ম") || context.includes("7th")) currentSemester = "7th Semester";
       if (context.includes("৮ম") || context.includes("8th")) currentSemester = "8th Semester";
    }
    
    if (subjectCodeRegex.test(token)) {
      if (token.length >= 4 && token.length <= 5) {
        const code = translateBengaliNum(token);
        let rest = [];
        for (let j = i + 1; j < tokens.length; j++) {
            if (/^(?:\d+|[০-৯]+)[\.।]$/.test(tokens[j])) break; 
            if (/^(\d{4,5}|[০-৯]{4,5})$/.test(tokens[j])) break; 
            if (dateRegexInfo.test(tokens[j])) break; 
            if (tokens[j] === "িাং") break;
            rest.push(tokens[j]);
        }
        let subjectName = rest.join(' ').trim();
        
        let tech = "All";
        if (subjectName.includes("আরকডদটকিাি") || subjectName.includes("আর্কিটেকচার") || subjectName.includes("Architecture")) { tech = "আর্কিটেকচার"; subjectName = subjectName.replace(/আরকডদটকিাি|আর্কিটেকচার|Architecture/g, '').trim(); }
        else if (subjectName.includes("অদটাদমাবাইল") || subjectName.includes("অটোমোবাইল") || subjectName.includes("Automobile")) { tech = "অটোমোবাইল"; subjectName = subjectName.replace(/অদটাদমাবাইল|অটোমোবাইল|Automobile/g, '').trim(); }
        else if (subjectName.includes("বকরমকুাল") || subjectName.includes("কেমিক্যাল") || subjectName.includes("Chemical")) { tech = "কেমিক্যাল"; subjectName = subjectName.replace(/বকরমকুাল|কেমিক্যাল|Chemical/g, '').trim(); }
        else if (subjectName.includes("রিরভল") || subjectName.includes("সিভিল") || subjectName.includes("Civil")) { tech = "সিভিল"; subjectName = subjectName.replace(/রিরভল|সিভিল|Civil/g, '').trim(); }
        else if (subjectName.includes("করিউটাি") || subjectName.includes("কম্পিউটার") || subjectName.includes("Computer")) { tech = "কম্পিউটার"; subjectName = subjectName.replace(/করিউটাি|কম্পিউটার|Computer/g, '').trim(); }
        else if (subjectName.includes("ইদলকরট্রকুাল") || subjectName.includes("ইলেকট্রিক্যাল") || subjectName.includes("Electrical")) { tech = "ইলেকট্রিক্যাল"; subjectName = subjectName.replace(/ইদলকরট্রকুাল|ইলেকট্রিক্যাল|Electrical/g, '').trim(); }
        else if (subjectName.includes("ইদলকট্ররিক্স") || subjectName.includes("ইলেকট্রনিক্স") || subjectName.includes("Electronics")) { tech = "ইলেকট্রনিক্স"; subjectName = subjectName.replace(/ইদলকট্ররিক্স|ইলেকট্রনিক্স|Electronics/g, '').trim(); }
        else if (subjectName.includes("বমকারিকুাল") || subjectName.includes("মেকানিক্যাল") || subjectName.includes("Mechanical")) { tech = "মেকানিক্যাল"; subjectName = subjectName.replace(/বমকারিকুাল|মেকানিক্যাল|Mechanical/g, '').trim(); }
        else if (subjectName.includes("পাওয়াি") || subjectName.includes("পাওয়ার") || subjectName.includes("Power")) { tech = "পাওয়ার"; subjectName = subjectName.replace(/পাওয়াি|পাওয়ার|Power/g, '').trim(); }
        
        if (subjectName.endsWith(',')) subjectName = subjectName.slice(0, -1);
        if (subjectName.trim() === '') subjectName = `Subject ${code}`;
        
        let banglaSemester = currentSemester
            .replace("1st", "১ম")
            .replace("2nd", "২য়")
            .replace("3rd", "৩য়")
            .replace("4th", "৪র্থ")
            .replace("5th", "৫ম")
            .replace("6th", "৬ষ্ঠ")
            .replace("7th", "৭ম")
            .replace("8th", "৮ম")
            .replace("Semester", "পর্ব");
            
        let banglaDay = currentDay;
        if(currentDay === "Monday") banglaDay = "সোমবার";
        if(currentDay === "Tuesday") banglaDay = "মঙ্গলবার";
        if(currentDay === "Wednesday") banglaDay = "বুধবার";
        if(currentDay === "Thursday") banglaDay = "বৃহস্পতিবার";
        if(currentDay === "Friday") banglaDay = "শুক্রবার";
        if(currentDay === "Saturday") banglaDay = "শনিবার";
        if(currentDay === "Sunday") banglaDay = "রবিবার";
        
        let banglaTime = currentTime;
        if(currentTime === "10:00 AM") banglaTime = "সকাল ১০:০০";
        if(currentTime === "02:00 PM") banglaTime = "বিকাল ০২:০০";

        let banglaDate = currentDate.replace(/[0-9]/g, (match) => "০১২৩৪৫৬৭৮৯"[parseInt(match)]);
        
        let banglaRegulation = currentRegulation
            .replace("2016 Probidhan", "২০১৬ প্রবিধান")
            .replace("2010 Probidhan", "২০১০ প্রবিধান")
            .replace("2022 Probidhan", "২০২২ প্রবিধান");

        if (currentDate) {
          routines.push({
            exam_type: "ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং",
            date_day_time: `${banglaDate} ${banglaDay} ${banglaTime}`,
            regulation: banglaRegulation,
            semester: banglaSemester,
            subject_code: translateBengaliNum(code),
            subject_name: subjectName.trim(),
            technology: tech
          });
        }
      }
    }
  }
  return routines;
}
