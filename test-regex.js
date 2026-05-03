const textBlock = `
59063 - MAGURA POLYTECHNIC INSTITUTE ,MAGURA
1. Diploma in Engineering
3rd Semester
2022 Regulation
123456 (3.50) 123457 (4.00) 123458 { 2123, 2125(T) } 123459 { 2123 }
`;

console.log("Starting regex");
const instituteRegex = /(\d{4,5})\s*-\s*([A-Za-z\s,]+)/;
const instMatch = textBlock.match(instituteRegex);
console.log("Institute:", instMatch?.[1], instMatch?.[2]);

const resultsRegex = /\b(\d{6})\b\s*(?:\(\s*([\d\.]+|Pass)\s*\)|\{\s*([^}]+)\})/g;
let match;
while ((match = resultsRegex.exec(textBlock)) !== null) {
  const roll = match[1];
  const gpa = match[2];
  const ref = match[3];
  console.log(roll, "GPA:", gpa, "REF:", ref);
}
