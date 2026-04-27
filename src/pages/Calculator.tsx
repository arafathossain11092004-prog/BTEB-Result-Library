import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calculator as CalcIcon, RefreshCw, Loader2 } from 'lucide-react';

const WEIGHTS: Record<string, number[]> = {
  '2010': [0.05, 0.05, 0.05, 0.15, 0.15, 0.20, 0.25, 0.10],
  '2016': [0.05, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.15],
  '2022': [0.05, 0.05, 0.10, 0.10, 0.20, 0.20, 0.20, 0.10],
};

const parseGPA = (val: string | undefined): string => {
  if (!val) return '';
  if (val.startsWith('{"type":"referred"')) return '';
  const gpa = parseFloat(val);
  return isNaN(gpa) ? '' : gpa.toFixed(2);
};

export default function Calculator() {
  const [regulation, setRegulation] = useState<string>('2022');
  const [gpas, setGpas] = useState<string[]>(Array(8).fill(''));
  const [cgpaResult, setCgpaResult] = useState<string | null>(null);

  // Autofill states
  const [curriculum, setCurriculum] = useState('');
  const [autoRegulation, setAutoRegulation] = useState('2022');
  const [rollNumber, setRollNumber] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const handleGpaChange = (index: number, value: string) => {
    const newGpas = [...gpas];
    newGpas[index] = value;
    setGpas(newGpas);
    setCgpaResult(null); // hide result on change
  };

  const resetCalculator = () => {
    setGpas(Array(8).fill(''));
    setCgpaResult(null);
  };

  const calculateCGPA = () => {
    const w = WEIGHTS[regulation];
    if (!w) return;

    let totalPoints = 0;
    let totalWeight = 0;

    for (let i = 0; i < 8; i++) {
      const val = parseFloat(gpas[i]);
      if (!isNaN(val) && val > 0 && val <= 4.0) {
        totalPoints += val * w[i];
        totalWeight += w[i];
      }
    }

    if (totalWeight === 0) {
      setCgpaResult('0.00');
    } else {
      // If we want exact CGPA proportion based on filled semesters:
      // totalPoints / totalWeight
      // e.g. filled only sem1 (5% wait). GPA=4.0 -> (4.0*0.05)/0.05 = 4.00
      setCgpaResult((totalPoints / totalWeight).toFixed(2));
    }
  };

  const handleAutofill = async () => {
    if (!curriculum || !autoRegulation || !rollNumber) {
      setError('Please fill all autofill fields.');
      return;
    }
    setError('');
    setFetching(true);
    try {
      const resultsRef = collection(db, 'results');
      const q = query(
        resultsRef,
        where('rollNumber', '==', rollNumber),
        where('curriculum', '==', curriculum),
        where('regulation', '==', autoRegulation)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('No results found for this Roll Number.');
      } else {
        const data = snapshot.docs[0].data();
        const newGpas = [
          parseGPA(data.semester1),
          parseGPA(data.semester2),
          parseGPA(data.semester3),
          parseGPA(data.semester4),
          parseGPA(data.semester5),
          parseGPA(data.semester6),
          parseGPA(data.semester7),
          parseGPA(data.semester8),
        ];
        setGpas(newGpas);
        setRegulation(autoRegulation);
        setCgpaResult(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch results.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CGPA Calculator Main Card */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm relative">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">CGPA Calculator</h1>
            <p className="text-sm text-gray-500">Calculate your Cumulative Grade Point Average</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Regulation</label>
            <select
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="2010">2010</option>
              <option value="2016">2016</option>
              <option value="2022">2022</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Semester
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={gpas[i]}
                  onChange={(e) => handleGpaChange(i, e.target.value)}
                  className="w-full px-3 py-2 text-center text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>

          {cgpaResult !== null && (
             <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
               <p className="text-sm text-blue-600 font-semibold uppercase tracking-wider mb-1">Your CGPA is</p>
               <h2 className="text-4xl font-black text-blue-700">{cgpaResult}</h2>
             </div>
          )}

          <div className="flex justify-between items-center bg-gray-50 -mx-6 md:-mx-8 -my-6 md:-my-8 mt-4 p-4 md:p-6 rounded-b-2xl border-t border-gray-100">
            <button
              onClick={calculateCGPA}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center"
            >
              <CalcIcon className="w-4 h-4 mr-2" /> Calculate
            </button>
            <button
              onClick={resetCalculator}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </button>
          </div>
        </div>

        {/* Autofill Card */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Autofill</h2>
          
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum / Exam *</label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select curriculum</option>
                <option value="Diploma in Engineering">Diploma in Engineering</option>
                <option value="Diploma in Tourism and Hospitality">Diploma in Tourism and Hospitality</option>
                <option value="Diploma in Textile Engineering">Diploma in Textile Engineering</option>
                <option value="Diploma in Agriculture">Diploma in Agriculture</option>
                <option value="Diploma in Fisheries">Diploma in Fisheries</option>
                <option value="Diploma in Forestry">Diploma in Forestry</option>
                <option value="Diploma in Medical Technology">Diploma in Medical Technology</option>
                <option value="Certificate in Marine Trade">Certificate in Marine Trade</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regulation *</label>
              <select
                value={autoRegulation}
                onChange={(e) => setAutoRegulation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="2010">2010</option>
                <option value="2016">2016</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Enter your roll number"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleAutofill}
              disabled={fetching}
              className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {fetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Fill Up Results"}
            </button>
          </div>
        </div>

      </div>

      {/* Priorities Table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-6 text-center md:text-left">Semester Wise GPA Priorities for Regulations</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 font-medium text-gray-600">Semester</th>
                <th className="py-3 px-4 font-medium text-gray-600">2010</th>
                <th className="py-3 px-4 font-medium text-gray-600">2016</th>
                <th className="py-3 px-4 font-medium text-gray-600">2022</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4">1st</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">2nd</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">3rd</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
                <td className="py-3 px-4 text-gray-600">5%</td>
                <td className="py-3 px-4 text-gray-600">10%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">4th</td>
                <td className="py-3 px-4 text-gray-600">15%</td>
                <td className="py-3 px-4 text-gray-600">10%</td>
                <td className="py-3 px-4 text-gray-600">10%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">5th</td>
                <td className="py-3 px-4 text-gray-600">15%</td>
                <td className="py-3 px-4 text-gray-600">15%</td>
                <td className="py-3 px-4 text-gray-600">20%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">6th</td>
                <td className="py-3 px-4 text-gray-600">20%</td>
                <td className="py-3 px-4 text-gray-600">20%</td>
                <td className="py-3 px-4 text-gray-600">20%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">7th</td>
                <td className="py-3 px-4 text-gray-600">25%</td>
                <td className="py-3 px-4 text-gray-600">25%</td>
                <td className="py-3 px-4 text-gray-600">20%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">8th</td>
                <td className="py-3 px-4 text-gray-600">10%</td>
                <td className="py-3 px-4 text-gray-600">15%</td>
                <td className="py-3 px-4 text-gray-600">10%</td>
              </tr>
              <tr className="font-bold bg-gray-50 border-t border-gray-200">
                <td className="py-3 px-4 text-gray-900">Total</td>
                <td className="py-3 px-4 text-gray-900">100%</td>
                <td className="py-3 px-4 text-gray-900">100%</td>
                <td className="py-3 px-4 text-gray-900">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
