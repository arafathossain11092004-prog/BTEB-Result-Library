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

function getDepartmentBySubjectCode(code: string, regulation: string): { department: string; departmentCode: string } | null {
  const cleanCode = code.trim();
  const regStr = String(regulation);
  const is2016 = regStr.includes("2016");

  if (is2016) {
    if (cleanCode.startsWith("657") || cleanCode.startsWith("658") || cleanCode.startsWith("659")) {
      return { department: "All Department", departmentCode: "" };
    }
    if (cleanCode.length >= 5 && cleanCode.length <= 7 && cleanCode.startsWith("6")) {
      const prefix = cleanCode.substring(0, 3);
      for (const dept of KNOWN_ENGINEERING_DEPTS) {
        if (dept.startsWith(prefix) && dept.startsWith("6")) {
          return { department: dept, departmentCode: prefix };
        }
      }
    }
  } else {
    // 2022 regulation
    if (cleanCode.startsWith("257") || cleanCode.startsWith("258") || cleanCode.startsWith("259")) {
      return { department: "All Department", departmentCode: "" };
    }
    if (cleanCode.length >= 5 && cleanCode.length <= 7 && cleanCode.startsWith("2")) {
      const techCode = cleanCode.substring(1, 3);
      for (const dept of KNOWN_ENGINEERING_DEPTS) {
        const match = dept.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const code2 = match[1];
          if (code2.length === 2 && code2 === techCode) {
            return { department: dept, departmentCode: code2 };
          }
        }
      }
    }
  }
  return null;
}

function mapShortDeptToLongDept(shortDept: string, regulation: string): { name: string; code: string } {
  const regStr = String(regulation);
  const is2016 = regStr.includes("2016");
  const targetWords = getCoreWords(shortDept);

  let bestDept = "Other";
  let bestCode = "";
  let highestScore = 0;

  for (const dept of KNOWN_ENGINEERING_DEPTS) {
    const isDept2016 = dept.match(/^\d{3}\s+/);
    if (is2016 && !isDept2016) continue;
    if (!is2016 && isDept2016) continue;

    const match = dept.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const code = match[1];
      const deptName = match[2];
      const candidateWords = getCoreWords(deptName);
      const score = getJaccardSimilarity(targetWords, candidateWords);
      if (score > highestScore) {
        highestScore = score;
        bestDept = dept;
        bestCode = code;
      }
    }
  }

  if (highestScore > 0) {
    return { name: bestDept, code: bestCode };
  }

  return { name: "Other", code: "" };
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
  let currentRegulation = "2016";
  
  const dateRegexInfo = /(\d{2}-\d{2}-\d{4}|[০-৯]{2}-[০-৯]{2}-[০-৯]{4})/;
  const subjectCodeRegex = /^(\d{4,7}|[০-৯]{4,7})$/;
  
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
       if (context.includes("২০১৬") || context.includes("2016")) currentRegulation = "2016";
       if (context.includes("২০১০") || context.includes("2010")) currentRegulation = "2010";
       if (context.includes("২০২২") || context.includes("2022")) currentRegulation = "2022";
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
      if (token.length >= 4 && token.length <= 7) {
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
        
        const parsedCodeResult = getDepartmentBySubjectCode(code, currentRegulation);
        let tech = "Other";
        let techCode = "";

        if (parsedCodeResult) {
          tech = parsedCodeResult.department;
          techCode = parsedCodeResult.departmentCode;
        } else {
          // Fallback to text matching
          let matchedShort = "Other";
          if (subjectName.includes("আরকডদটকিাি") || subjectName.includes("আর্কিটেকচার") || subjectName.includes("Architecture")) { matchedShort = "Architecture"; subjectName = subjectName.replace(/আরকডদটকিাি|আর্কিটেকচার|Architecture/g, '').trim(); }
          else if (subjectName.includes("অদটাদমাবাইল") || subjectName.includes("অটোমোবাইল") || subjectName.includes("Automobile")) { matchedShort = "Automobile"; subjectName = subjectName.replace(/অদটাদমাবাইল|অটোমোবাইল|Automobile/g, '').trim(); }
          else if (subjectName.includes("বকরমকুাল") || subjectName.includes("কেমিক্যাল") || subjectName.includes("Chemical")) { matchedShort = "Chemical"; subjectName = subjectName.replace(/বকরমকুাল|কেমিক্যাল|Chemical/g, '').trim(); }
          else if (
            subjectName.includes("Civil (Wood)") || 
            subjectName.includes("Civil(Wood)") || 
            subjectName.includes("সিভিল (উড)") || 
            subjectName.includes("সিভিল(উড)") ||
            subjectName.includes("Civil Wood") || 
            subjectName.includes("সিভিল উড") || 
            subjectName.includes("Wood Technology") || 
            subjectName.includes("উড টেকনোলজি") ||
            subjectName.includes("Wood") ||
            subjectName.includes("উড")
          ) { 
            matchedShort = "Civil (Wood)"; 
            subjectName = subjectName.replace(/Civil\s*\(?\s*Wood\s*\)?|সিভিল\s*\(?\s*উড\s*\)?|Wood Technology|উড টেকনোলজি|Wood|উড|সিভিল|Civil/gi, '').trim(); 
          }
          else if (subjectName.includes("রিরভল") || subjectName.includes("সিভিল") || subjectName.includes("Civil")) { matchedShort = "Civil"; subjectName = subjectName.replace(/রিরভল|সিভিল|Civil/g, '').trim(); }
          else if (subjectName.includes("করিউটাি") || subjectName.includes("কম্পিউটার") || subjectName.includes("Computer")) { matchedShort = "Computer"; subjectName = subjectName.replace(/করিউটাি|কম্পিউটার|Computer/g, '').trim(); }
          else if (subjectName.includes("ইদলকরট্রকুাল") || subjectName.includes("ইলেকট্রিক্যাল") || subjectName.includes("Electrical")) { matchedShort = "Electrical"; subjectName = subjectName.replace(/ইদলকরট্রকুাল|ইলেকট্রিক্যাল|Electrical/g, '').trim(); }
          else if (subjectName.includes("ইদলকট্ররিক্স") || subjectName.includes("ইলেকট্রনিক্স") || subjectName.includes("Electronics")) { matchedShort = "Electronics"; subjectName = subjectName.replace(/ইদলকট্ররিক্স|ইলেকট্রনিক্স|Electronics/g, '').trim(); }
          else if (subjectName.includes("বমকারিকুাল") || subjectName.includes("মেকানিক্যাল") || subjectName.includes("Mechanical")) { matchedShort = "Mechanical"; subjectName = subjectName.replace(/বমকারিকুাল|মেকানিক্যাল|Mechanical/g, '').trim(); }
          else if (subjectName.includes("পাওয়াি") || subjectName.includes("পাওয়ার") || subjectName.includes("Power")) { matchedShort = "Power"; subjectName = subjectName.replace(/পাওয়াি|পাওয়ার|Power/g, '').trim(); }

          if (matchedShort !== "Other") {
            const mapped = mapShortDeptToLongDept(matchedShort, currentRegulation);
            tech = mapped.name;
            techCode = mapped.code;
          }
        }
        
        if (subjectName.endsWith(',')) subjectName = subjectName.slice(0, -1);
        if (subjectName.trim() === '') subjectName = `Subject ${code}`;
        
        if (currentDate) {
          routines.push({
            Curriculum: "Diploma In Engineering",
            Regulation: currentRegulation,
            Semester: currentSemester,
            Department: tech,
            Department_Code: techCode,
            Subject_Name: subjectName.trim(),
            Subject_Code: code,
            Date: currentDate.replace(/\s+/g, ''),
            Day: currentDay || "Monday",
            Time: currentTime || "10:00 AM"
          });
        }
      }
    }
  }
  return routines;
}

export async function parsePdfToBooklists(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let lines: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let items = textContent.items as any[];
    
    items.sort((a, b) => {
       if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
          return b.transform[5] - a.transform[5]; // Y descending
       }
       return a.transform[4] - b.transform[4]; // X ascending
    });

    let currentLineY = -1;
    let currentLineStr = "";
    for (const item of items) {
       if (item.str.trim() === "") {
          currentLineStr += item.str;
          continue;
       }
       if (currentLineY === -1) currentLineY = item.transform[5];
       if (Math.abs(currentLineY - item.transform[5]) > 5) {
          lines.push(currentLineStr.trim());
          currentLineStr = "";
          currentLineY = item.transform[5];
       }
       currentLineStr += item.str + " ";
    }
    if (currentLineStr.trim().length > 0) lines.push(currentLineStr.trim());
  }

  return processBooklistLines(lines);
}

export async function parseDocxToBooklists(file: File) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  
  const lines = (result.value || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  return processBooklistLines(lines);
}

const KNOWN_ENGINEERING_DEPTS = [
  // Regulation 2022
  "82 Aircraft Maintenance Technology (Aerospace)",
  "83 Aircraft Maintenance Technology (Avionics)",
  "14 Apparel Manufacturing Technology",
  "61 Architecture Technology",
  "62 Automobile Technology",
  "76 Ceramic Technology",
  "63 Chemical Technology",
  "64 Civil Technology",
  "65 Civil (Wood) Technology",
  "85 Computer Science & Technology",
  "88 Construction Technology",
  "23 Diploma in Agriculture",
  "74 Diploma in Fisheries",
  "20 Diploma in Forestry",
  "72 Diploma in Livestock",
  "67 Electrical Technology",
  "86 Electromedical Technology",
  "68 Electronics Technology",
  "90 Environmental Technology",
  "12 Fabric Manufacturing Technology",
  "16 Fashion Design Technology",
  "69 Food Technology",
  "98 Footwear Technology",
  "77 Glass Technology",
  "96 Graphic Design Technology",
  "15 Jute Product Manufacturing",
  "679 Marine Technology",
  "70 Mechanical Technology",
  "92 Mechatronics Technology",
  "17 Merchandising & Marketing",
  "71 Power Technology",
  "95 Printing Technology",
  "72 RAC Technology",
  "80 Shipbuilding Engineering",
  "78 Surveying Technology",
  "94 Telecommunication Technology",
  "18 Textile Machine Design & Maintenance",
  "13 Wet Processing Technology",
  "11 Yarn Manufacturing Technology",

  // Regulation 2016
  "682 Aircraft Maintenance (Aerospace) Technology",
  "683 Aircraft Maintenance (Avionics) Technology",
  "661 Architecture Technology",
  "687 Architecture & Interior Design Technology",
  "662 Automobile Technology",
  "676 Ceramic Technology",
  "663 Chemical Technology",
  "664 Civil Technology",
  "665 Civil (Wood) Technology",
  "685 Computer Science & Technology",
  "666 Computer Technology",
  "688 Construction Technology",
  "684 Data Telecommunication & Network Technology",
  "667 Electrical Technology",
  "686 Electromedical Technology",
  "668 Electronics Technology",
  "690 Environmental Technology",
  "669 Food Technology",
  "677 Glass Technology",
  "696 Graphic Design Technology",
  "691 Instrumentation & Process Control Technology",
  "670 Mechanical Technology",
  "692 Mechatronics Technology",
  "693 Mining & Mine Survey Technology",
  "671 Power Technology",
  "695 Printing Technology",
  "672 Refrigeration & Air Conditioning (RAC) Technology",
  "680 Shipbuilding Technology",
  "678 Surveying Technology",
  "694 Telecommunication Technology",
  "99 Tourism & Hospitality"
];

function normalizeSemester(semStr: string): string {
  const s = String(semStr).toLowerCase();
  if (s.includes('1st') || s.includes('১ম') || s.includes('first')) return '1st';
  if (s.includes('2nd') || s.includes('২য়') || s.includes('second')) return '2nd';
  if (s.includes('3rd') || s.includes('৩য়') || s.includes('third')) return '3rd';
  if (s.includes('4th') || s.includes('৪র্থ') || s.includes('fourth')) return '4th';
  if (s.includes('5th') || s.includes('৫ম') || s.includes('fifth')) return '5th';
  if (s.includes('6th') || s.includes('৬ষ্ঠ') || s.includes('sixth')) return '6th';
  if (s.includes('7th') || s.includes('৭ম') || s.includes('seventh')) return '7th';
  if (s.includes('8th') || s.includes('৮ম') || s.includes('eighth')) return '8th';
  return semStr.replace(/\s*semester/i, '').trim();
}

function getCoreWords(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[()&,:\-\[\]"']/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w && !['technology', 'dept', 'department', 'in', 'engineering', 'and', 'diploma', 'of', 'class', 'course'].includes(w));
}

function getJaccardSimilarity(inputWords: string[], candidateWords: string[]): number {
  if (inputWords.length === 0 || candidateWords.length === 0) return 0;
  let matches = 0;
  for (const w of candidateWords) {
    if (inputWords.includes(w)) {
      matches++;
    }
  }
  if (matches === 0) return 0;
  const unionSize = new Set([...inputWords, ...candidateWords]).size;
  return matches / unionSize;
}

function normalizeDepartment(rawDept: string): { name: string; code: string } {
  let cleanRaw = rawDept.trim().toLowerCase();
  
  // Translate common Bengali words to English to facilitate matching
  if (cleanRaw.includes("সিভিল") || cleanRaw.includes("রিরভল")) {
    cleanRaw += " civil";
  }
  if (cleanRaw.includes("উড")) {
    cleanRaw += " wood";
  }
  if (cleanRaw.includes("কম্পিউটার") || cleanRaw.includes("করিউটাি")) {
    cleanRaw += " computer";
  }
  if (cleanRaw.includes("আর্কিটেকচার") || cleanRaw.includes("আরকডদটکیাি")) {
    cleanRaw += " architecture";
  }
  if (cleanRaw.includes("অটোমোবাইল") || cleanRaw.includes("অদটাদমাবাইল")) {
    cleanRaw += " automobile";
  }
  if (cleanRaw.includes("কেমিক্যাল") || cleanRaw.includes("বকরমকুাল")) {
    cleanRaw += " chemical";
  }
  if (cleanRaw.includes("ইলেকট্রিক্যাল") || cleanRaw.includes("ইদলকরট্রকুাল")) {
    cleanRaw += " electrical";
  }
  if (cleanRaw.includes("ইলেকট্রনিক্স") || cleanRaw.includes("ইদলকট্ররিক্স")) {
    cleanRaw += " electronics";
  }
  if (cleanRaw.includes("মেকানিক্যাল") || cleanRaw.includes("বমকারিকুাল")) {
    cleanRaw += " mechanical";
  }
  if (cleanRaw.includes("পাওয়ার") || cleanRaw.includes("পাওয়াি")) {
    cleanRaw += " power";
  }
  if (cleanRaw.includes("টেকনোলজি") || cleanRaw.includes("প্রযুক্তি")) {
    cleanRaw += " technology";
  }
  
  // Try matching by exact/subset code first
  const numMatch = cleanRaw.match(/\d+/);
  if (numMatch) {
    const inputNum = numMatch[0];
    for (const dept of KNOWN_ENGINEERING_DEPTS) {
      const match = dept.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const code2 = match[1];
        let code3 = "";
        if (code2.length === 2) {
          const firstDigit = code2[0];
          const secondDigit = code2[1];
          if (secondDigit === '0') {
            code3 = code2 + "0"; // e.g., "70" -> "700"
          } else {
            code3 = code2 + secondDigit; // e.g., "66" -> "666"
          }
        }
        
        if (inputNum === code2 || inputNum === code3) {
          return { name: dept, code: code2 };
        }
      }
    }
  }

  // Matching by core-words similarity
  const inputWords = getCoreWords(cleanRaw);
  let bestDept = "";
  let bestCode = "";
  let highestScore = 0;

  for (const dept of KNOWN_ENGINEERING_DEPTS) {
    const match = dept.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const code = match[1];
      const deptName = match[2];
      const candidateWords = getCoreWords(deptName);
      
      const score = getJaccardSimilarity(inputWords, candidateWords);
      if (score > highestScore) {
        highestScore = score;
        bestDept = dept;
        bestCode = code;
      }
    }
  }

  // Threshold: at least some word must match
  if (highestScore > 0.2) {
    return { name: bestDept, code: bestCode };
  }
  
  const codeMatch = rawDept.match(/^(\d+)[\s\-]+(.+)$/);
  if (codeMatch) {
    return { name: rawDept, code: codeMatch[1] };
  }
  
  return { name: rawDept, code: "" };
}

function processBooklistLines(lines: string[]) {
  const booklists = [];
  let currentCurriculum = "Diploma In Engineering";
  let currentRegulation = "2022";
  let currentDept = "Other";
  let currentDeptCode = "";
  let currentSemester = "1st";
  let isCurrentOptional = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Remove extra spaces
    line = line.replace(/\s+/g, " ");

    if (line.toLowerCase().startsWith("curriculum:")) {
      currentCurriculum = line.substring(11).trim();
    } else if (line.toLowerCase().startsWith("regulation:")) {
      currentRegulation = line.substring(11).trim();
    } else if (line.toLowerCase().startsWith("department:")) {
      const parsedDept = line.substring(11).trim();
      const { name, code } = normalizeDepartment(parsedDept);
      currentDept = name;
      currentDeptCode = code;
    } 
    else if (/optional|option|অপশনাল|ঐচ্ছিক/i.test(line) && line.length < 60) {
      isCurrentOptional = true;
      const semMatch = line.match(/(?:1st|2nd|3rd|4th|5th|6th|7th|8th|১ম|২য়|৩য়|৪র্থ|৫ম|৬ষ্ঠ|৭ম|৮ম|First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth)/i);
      if (semMatch) {
        currentSemester = normalizeSemester(semMatch[0]);
      }
    }
    else if (/(?:1st|2nd|3rd|4th|5th|6th|7th|8th|১ম|২য়|৩য়|৪র্থ|৫ম|৬ষ্ঠ|৭ম|৮ম|First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth)\s*(?:Semester|পর্ব)/i.test(line)) {
       if (line.length < 50) {
         currentSemester = normalizeSemester(line);
         isCurrentOptional = false;
       }
    }
    else if (/^(\d{4,7}|[০-৯]{4,7})/.test(line)) {
       const match = line.match(/^(\d{4,7}|[০-৯]{4,7})\s+(.+)$/);
       if (match) {
         booklists.push({
            Curriculum: currentCurriculum,
            Regulation: currentRegulation,
            Semester: currentSemester,
            Department: currentDept,
            Department_Code: currentDeptCode,
            Subject_Code: translateBengaliNum(match[1]),
            Subject_Name: match[2].trim(),
            isOptional: isCurrentOptional
         });
       } else {
         // Fallback if Subject code is on its own line and Subject name is on the next line
         // pdf parsing sometimes does this
         const code = line.trim();
         if (code.length >= 4 && code.length <= 7 && i + 1 < lines.length) {
            booklists.push({
               Curriculum: currentCurriculum,
               Regulation: currentRegulation,
               Semester: currentSemester,
               Department: currentDept,
               Department_Code: currentDeptCode,
               Subject_Code: translateBengaliNum(code),
               Subject_Name: lines[i+1].trim(),
               isOptional: isCurrentOptional
            });
            i++; // skip next line since it was the subject name
         }
       }
    }
  }
  return booklists;
}
