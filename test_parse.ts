import fs from 'fs';

const textLines = [
"০৮-১১-২০২১",
"বিামবাি",
"িকাল ১০:০০",
"৫ম ",
"পব ড(২০১৬ প্ররবধাি)",
"1. ৬৬১৫১ আরকডদটকিািাল রর্জাইি-৪ আরকডদটকিাি",
"2. ৬৬২৫১ অদটাদমাটিভ িািদপিশি এুান্ড পাওয়াি",
"ট্রান্সরমশি রিদেম",
"অদটাদমাবাইল",
"3. ৬৬৩৫১ বকরমকুাল ইরিরিয়ারিাং অপাদিশি-৩ বকরমকুাল",
];

const translateBengaliNum = (str: string) => {
    const benToEng: any = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    return str.replace(/[০-৯]/g, match => benToEng[match]);
};

const dateRegex = /^(\d{2}-\d{2}-\d{4}|[০-৯]{2}-[০-৯]{2}-[০-৯]{4})/;
const subjectRegex = /^(?:(?:\d+|[০-৯]+)[\.।]?\s*)?(\d{4,5}|[০-৯]{4,5})[ \t]+(.+)$/;

let currentDate = "";
let currentSemesterRaw = "";
let currentRegulationRaw = "";
const routines: any[] = [];
let currentDay = "";
let currentTime = "";

for (let i = 0; i < textLines.length; i++) {
  const line = textLines[i];
  
  const dateMatch = line.match(dateRegex);
  if (dateMatch) {
    currentDate = translateBengaliNum(dateMatch[1]);
    let context = line + " " + (textLines[i + 1] || "") + " " + (textLines[i + 2] || "") + " " + (textLines[i + 3] || "");
    if (context.includes("বিামবাি") || context.includes("Monday")) currentDay = "Monday";
    if (context.includes("১০:০০") || context.includes("10:00")) currentTime = "10:00 AM";
    continue;
  }
  
  if (line.includes("পব ড") || line.includes("পর্ব") || line.includes("Semester")) {
     currentSemesterRaw = line;
     if (line.includes("২০১৬")) currentRegulationRaw = "2016 Probidhan";
     continue;
  }
  
  const subMatch = line.match(subjectRegex);
  if (subMatch) {
     const rawCode = translateBengaliNum(subMatch[1]);
     const rest = subMatch[2].trim();
     routines.push({ rawCode, rest, currentDate, currentSemesterRaw });
  }
}

console.log(JSON.stringify(routines, null, 2));
