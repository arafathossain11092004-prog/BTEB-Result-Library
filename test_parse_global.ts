const text = `
(ক) রলরখত পিীক্ষাি িময়সূিী: 
িাং 
তারিখ, বাি 
ও িময় 
পব ড িাং 
রবষয় 
বকার্ 
রবষদয়ি িাম বটকদিালরজ 
০৮-১১-২০২১
বিামবাি
িকাল ১০:০০
৫ম 
পব ড(২০১৬ প্ররবধাি)
1. ৬৬১৫১ আরকডদটকিািাল রর্জাইি-৪ আরকডদটকিাি
2. ৬৬২৫১ অদটাদমাটিভ িািদপিশি এুান্ড পাওয়াি 
ট্রান্সরমশি রিদেম
অদটাদমাবাইল 
3. ৬৬৩৫১ বকরমকুাল ইরিরিয়ারিাং অপাদিশি-৩ বকরমকুাল 
4. ৬৬৪৫১ কন্সট্রাকশি প্রদিি-২ রিরভল, রিরভল (উর্) 
`;

const translateBengaliNum = (str: string) => {
    const benToEng: any = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    return str.replace(/[০-৯]/g, match => benToEng[match]);
};

function parseGlobal(text: string) {
    const routines: any[] = [];
    let currentDate = "";
    let currentSemesterRaw = "";
    let currentRegulationRaw = "";
    let currentDay = "";
    let currentTime = "";

    const dateRegexInfo = /(\d{2}-\d{2}-\d{4}|[০-৯]{2}-[০-৯]{2}-[০-৯]{4})/;
    const tokens = text.split(/\s+/).filter(t => t.length > 0);
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        if (dateRegexInfo.test(token)) {
            currentDate = translateBengaliNum(token.match(dateRegexInfo)![0]);
            
            for (let j = i; j < i + 10 && j < tokens.length; j++) {
                if (tokens[j].includes("বিামবাি") || tokens[j] === "Monday") currentDay = "Monday";
                if (tokens[j].includes("মঙ্গলবাি") || tokens[j] === "Tuesday") currentDay = "Tuesday";
                if (tokens[j].includes("১০:০০") || tokens[j].includes("10:00") || tokens[j].includes("সকাল")) currentTime = "10:00 AM";
                if (tokens[j].includes("০২:০০") || tokens[j].includes("02:00") || tokens[j].includes("২:০০") || tokens[j].includes("বিকাল") || tokens[j].includes("PM")) currentTime = "02:00 PM";
            }
        }
        
        if (token.includes("পব ড") || token.includes("পর্ব") || token.includes("Semester")) {
           let context = token + " " + (tokens[i+1]||"") + " " + (tokens[i+2]||"");
           currentSemesterRaw = context;
           if (context.includes("২০১৬") || context.includes("2016")) currentRegulationRaw = "2016 Probidhan";
           if (context.includes("২০১০") || context.includes("2010")) currentRegulationRaw = "2010 Probidhan";
           if (context.includes("২০২২") || context.includes("2022")) currentRegulationRaw = "2022 Probidhan";
        }
        
        const subjectCodeRegex = /^(\d{4,5}|[০-৯]{4,5})$/;
        if (subjectCodeRegex.test(token)) {
            const code = translateBengaliNum(token);
            let rest = [];
            for (let j = i + 1; j < tokens.length; j++) {
                if (/^(?:\d+|[০-৯]+)[\.।]$/.test(tokens[j])) break;
                if (/^(\d{4,5}|[০-৯]{4,5})$/.test(tokens[j]) && tokens[j].length === 5) break; 
                if (/^(\d{2}-\d{2}-\d{4}|[০-৯]{2}-[০-৯]{2}-[০-৯]{4})$/.test(tokens[j])) break;
                if (tokens[j].includes("পব ড") || tokens[j].includes("পর্ব") || tokens[j] === "Semester" || tokens[j] === "িাং") {
                    break;
                }
                rest.push(tokens[j]);
            }
            const restStr = rest.join(' ');
            
            routines.push({
                code: code,
                rest: restStr,
                date: currentDate,
                day: currentDay,
                time: currentTime,
                semester: currentSemesterRaw,
                regulation: currentRegulationRaw
            });
        }
    }
    
    console.log(JSON.stringify(routines, null, 2));
}

parseGlobal(text);
