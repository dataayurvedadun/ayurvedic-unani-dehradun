import React from 'react';
import { MonthlyProgressReport } from '../../types';
import { MPR_DISEASE_LIST } from '../../constants/mprDiseases';
import { Printer, Download, X } from 'lucide-react';

interface PrintableMprReportProps {
  report: MonthlyProgressReport;
  onClose?: () => void;
  reportTypeTitle?: string;
  periodLabel?: string;
}

export const PrintableMprReport: React.FC<PrintableMprReportProps> = ({
  report,
  onClose,
  reportTypeTitle,
  periodLabel,
}) => {
  const metrics = report.other_metrics || {};
  const newOpd = metrics.new_opd || { male: 0, female: 0, other: 0, total: 0 };
  const oldOpd = metrics.old_opd || { male: 0, female: 0, other: 0, total: 0 };
  const ipd = metrics.ipd_patients || { male: 0, female: 0, other: 0, total: 0 };
  const panchakarma = metrics.panchakarma_patients || { male: 0, female: 0, other: 0, total: 0 };
  const levi = metrics.levi || { opd_levi: 0, panchakarma_levi: 0, medical_levi: 0, other_levi: 0, total_levi: 0 };
  const campBen = metrics.camp_beneficiaries || { male: 0, female: 0, other: 0, children: 0, total: 0 };
  const yogaBen = metrics.yoga_beneficiaries || { male: 0, female: 0, other: 0, total: 0 };
  const diseaseMap = metrics.disease_details || {};

  // Split 38 diseases into 2 columns (19 each) for compact single-page layout
  const col1 = MPR_DISEASE_LIST.slice(0, 19);
  const col2 = MPR_DISEASE_LIST.slice(19, 38);

  const totalDiseaseNew = MPR_DISEASE_LIST.reduce((acc, d) => acc + (diseaseMap[d.id]?.new_cases || 0), 0);
  const totalDiseaseOld = MPR_DISEASE_LIST.reduce((acc, d) => acc + (diseaseMap[d.id]?.old_cases || 0), 0);
  const totalDiseaseCases = totalDiseaseNew + totalDiseaseOld;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 print:border-none print:shadow-none print:max-w-none print:rounded-none overflow-hidden my-auto">
        {/* Action Header (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between no-print border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">
              {reportTypeTitle || 'Official Monthly Progress Report (MPR) - Print & PDF Export'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download / Save as PDF</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* PRINTABLE PAGE CONTENT */}
        <div id="printable-mpr-document" className="p-6 sm:p-8 print:p-4 text-slate-900 font-sans text-xs bg-white">
          {/* Government Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
            <div className="text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
              कार्यालय जिला आयुर्वेदिक एवं यूनानी अधिकारी, देहरादून (उत्तराखंड)
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
              OFFICE OF THE DISTRICT AYURVEDIC & UNANI OFFICER, DEHRADUN
            </div>
            <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-xs text-slate-800">
              {reportTypeTitle || 'मासिक प्रगति आख्या (MONTHLY PROGRESS REPORT - MPR)'}
            </div>
          </div>

          {/* Facility & Period Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-300 text-[11px]">
            <div>
              <span className="text-slate-500 font-semibold block">चिकित्सालय / Facility:</span>
              <span className="font-bold text-slate-900">{report.hospital_name}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">{periodLabel || 'माह / Reporting Month'}:</span>
              <span className="font-bold text-emerald-800">{report.month_year}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">प्रभारी अधिकारी / Officer:</span>
              <span className="font-bold text-slate-900">{report.officer_name}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">दिनांक / Submitted At:</span>
              <span className="font-bold text-slate-800">
                {new Date(report.submitted_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Table 1: Patient Footfall & Demographics */}
          <div className="mb-3">
            <div className="font-bold text-[11px] text-slate-800 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">
              1. रोगी विवरण (Patient Demographics & Service Utilization)
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-center font-bold">
                  <th className="border border-slate-300 p-1 text-left">श्रेणी / Patient Category</th>
                  <th className="border border-slate-300 p-1 w-20">पुरुष (Male)</th>
                  <th className="border border-slate-300 p-1 w-20">महिला (Female)</th>
                  <th className="border border-slate-300 p-1 w-20">अन्य (Other)</th>
                  <th className="border border-slate-300 p-1 w-24 bg-slate-200">कुल (Total)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-1 font-medium">नवीन ओ.पी.डी. रोगी (New OPD Patients)</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{newOpd.male}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{newOpd.female}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{newOpd.other}</td>
                  <td className="border border-slate-300 p-1 text-center font-bold bg-slate-50">{newOpd.total}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-1 font-medium">पुरातन ओ.पी.डी. रोगी (Old OPD Patients)</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{oldOpd.male}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{oldOpd.female}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{oldOpd.other}</td>
                  <td className="border border-slate-300 p-1 text-center font-bold bg-slate-50">{oldOpd.total}</td>
                </tr>
                <tr className="bg-emerald-50/50 font-bold">
                  <td className="border border-slate-300 p-1 text-emerald-950">कुल ओ.पी.डी. रोगी (Total OPD)</td>
                  <td className="border border-slate-300 p-1 text-center text-emerald-900">{newOpd.male + oldOpd.male}</td>
                  <td className="border border-slate-300 p-1 text-center text-emerald-900">{newOpd.female + oldOpd.female}</td>
                  <td className="border border-slate-300 p-1 text-center text-emerald-900">{newOpd.other + oldOpd.other}</td>
                  <td className="border border-slate-300 p-1 text-center text-emerald-950 font-extrabold bg-emerald-100/70">
                    {report.opd_count}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-1 font-medium">आई.पी.डी. भर्ती रोगी (IPD Patients)</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{ipd.male}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{ipd.female}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{ipd.other}</td>
                  <td className="border border-slate-300 p-1 text-center font-bold bg-slate-50">{ipd.total}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-1 font-medium">पंचकर्म रोगी (Panchakarma Patients)</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{panchakarma.male}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{panchakarma.female}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{panchakarma.other}</td>
                  <td className="border border-slate-300 p-1 text-center font-bold bg-slate-50">{panchakarma.total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2: Financial Levy, Digital Seeding & Outreach */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Levy & Origin */}
            <div>
              <div className="font-bold text-[11px] text-slate-800 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">
                2. लेवी (राजस्व) एवं पंजीकरण विवरण (Levy & Seeding)
              </div>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">OPD लेवी संग्रह (₹)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">₹{levi.opd_levi}</td>
                    <td className="border border-slate-300 p-1 font-medium">मोबाइल सीडेड (Mobile)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">{metrics.mobile_seeded || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">पंचकर्म लेवी संग्रह (₹)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">₹{levi.panchakarma_levi}</td>
                    <td className="border border-slate-300 p-1 font-medium">आधार सीडेड (Aadhaar)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">{metrics.aadhaar_seeded || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">चिकित्सा प्रमाण पत्र लेवी (₹)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">₹{levi.medical_levi}</td>
                    <td className="border border-slate-300 p-1 font-medium">देहरादून से बाहर के रोगी</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">{metrics.patients_outside_dehradun || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">अन्य लेवी संग्रह (₹)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">₹{levi.other_levi}</td>
                    <td className="border border-slate-300 p-1 font-medium">विदेशी रोगी (Foreigners)</td>
                    <td className="border border-slate-300 p-1 text-right font-semibold">{metrics.patients_foreigners || 0}</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-1 text-slate-900">कुल लेवी संग्रह (Total)</td>
                    <td className="border border-slate-300 p-1 text-right font-extrabold text-emerald-800">₹{levi.total_levi}</td>
                    <td className="border border-slate-300 p-1 font-medium text-slate-700">कुल आयोजित शिविर</td>
                    <td className="border border-slate-300 p-1 text-right font-bold text-slate-900">{metrics.total_camps || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Camps & Yoga */}
            <div>
              <div className="font-bold text-[11px] text-slate-800 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">
                3. शिविर एवं योग लाभार्थी (Outreach & Yoga Beneficiaries)
              </div>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-center font-bold">
                    <th className="border border-slate-300 p-1 text-left">कार्यक्रम</th>
                    <th className="border border-slate-300 p-1">पुरुष</th>
                    <th className="border border-slate-300 p-1">महिला</th>
                    <th className="border border-slate-300 p-1">अन्य</th>
                    <th className="border border-slate-300 p-1">बच्चे</th>
                    <th className="border border-slate-300 p-1 bg-slate-200">कुल</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">शिविर लाभार्थी (Camp)</td>
                    <td className="border border-slate-300 p-1 text-center">{campBen.male}</td>
                    <td className="border border-slate-300 p-1 text-center">{campBen.female}</td>
                    <td className="border border-slate-300 p-1 text-center">{campBen.other}</td>
                    <td className="border border-slate-300 p-1 text-center">{campBen.children}</td>
                    <td className="border border-slate-300 p-1 text-center font-bold bg-slate-50">{campBen.total}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 font-medium">योग लाभार्थी (Yoga)</td>
                    <td className="border border-slate-300 p-1 text-center">{yogaBen.male}</td>
                    <td className="border border-slate-300 p-1 text-center">{yogaBen.female}</td>
                    <td className="border border-slate-300 p-1 text-center">{yogaBen.other}</td>
                    <td className="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td className="border border-slate-300 p-1 text-center font-bold bg-slate-50">{yogaBen.total}</td>
                  </tr>
                </tbody>
              </table>

              {/* Shortage notes if any */}
              {metrics.stock_shortage_notes && (
                <div className="mt-2 p-1.5 border border-amber-300 bg-amber-50 rounded text-[10px]">
                  <span className="font-bold text-amber-900">औषधि अभाव विवरण / Shortage Notes: </span>
                  <span className="text-slate-800">{metrics.stock_shortage_notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Table 3: 38 Disease-Wise Morbidity Classification */}
          <div className="mb-4">
            <div className="flex items-center justify-between font-bold text-[11px] text-slate-800 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">
              <span>4. रोगवार ओ.पी.डी. विवरण (Disease-wise Morbidity - 38 Categories)</span>
              <span className="text-emerald-800">
                कुल रोगी: {totalDiseaseCases} (नवीन: {totalDiseaseNew}, पुरातन: {totalDiseaseOld})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {/* Left Column (1 to 19) */}
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-slate-300 p-0.5 w-6">क्र.</th>
                    <th className="border border-slate-300 p-0.5 text-left">रोग का नाम (हिन्दी/English)</th>
                    <th className="border border-slate-300 p-0.5 w-10">नवीन</th>
                    <th className="border border-slate-300 p-0.5 w-10">पुरातन</th>
                    <th className="border border-slate-300 p-0.5 w-12 bg-slate-200">योग</th>
                  </tr>
                </thead>
                <tbody>
                  {col1.map((d) => {
                    const row = diseaseMap[d.id] || { new_cases: 0, old_cases: 0, total_cases: 0 };
                    return (
                      <tr key={d.id} className={row.total_cases > 0 ? 'bg-emerald-50/30' : ''}>
                        <td className="border border-slate-300 p-0.5 text-center font-semibold">{d.sNo}</td>
                        <td className="border border-slate-300 p-0.5">
                          <span className="font-bold">{d.hindi}</span>{' '}
                          <span className="text-slate-500 text-[9px]">({d.english})</span>
                        </td>
                        <td className="border border-slate-300 p-0.5 text-center">{row.new_cases}</td>
                        <td className="border border-slate-300 p-0.5 text-center">{row.old_cases}</td>
                        <td className="border border-slate-300 p-0.5 text-center font-bold bg-slate-50">
                          {row.total_cases}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Right Column (20 to 38) */}
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-slate-300 p-0.5 w-6">क्र.</th>
                    <th className="border border-slate-300 p-0.5 text-left">रोग का नाम (हिन्दी/English)</th>
                    <th className="border border-slate-300 p-0.5 w-10">नवीन</th>
                    <th className="border border-slate-300 p-0.5 w-10">पुरातन</th>
                    <th className="border border-slate-300 p-0.5 w-12 bg-slate-200">योग</th>
                  </tr>
                </thead>
                <tbody>
                  {col2.map((d) => {
                    const row = diseaseMap[d.id] || { new_cases: 0, old_cases: 0, total_cases: 0 };
                    return (
                      <tr key={d.id} className={row.total_cases > 0 ? 'bg-emerald-50/30' : ''}>
                        <td className="border border-slate-300 p-0.5 text-center font-semibold">{d.sNo}</td>
                        <td className="border border-slate-300 p-0.5">
                          <span className="font-bold">{d.hindi}</span>{' '}
                          <span className="text-slate-500 text-[9px]">({d.english})</span>
                        </td>
                        <td className="border border-slate-300 p-0.5 text-center">{row.new_cases}</td>
                        <td className="border border-slate-300 p-0.5 text-center">{row.old_cases}</td>
                        <td className="border border-slate-300 p-0.5 text-center font-bold bg-slate-50">
                          {row.total_cases}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Verification & Signatures */}
          <div className="mt-4 pt-3 border-t-2 border-slate-800 text-[11px]">
            <p className="italic text-slate-700 mb-6">
              "प्रमाणित किया जाता है कि उपरोक्त मासिक प्रगति आख्या चिकित्सालय के दैनिक ओ.पी.डी./आई.पी.डी. पंजिका एवं कैश बुक के आधार पर पूर्णतः सत्य एवं सत्यापित है।"
            </p>

            <div className="flex justify-between items-end">
              <div>
                <div className="text-slate-600 font-semibold">हस्ताक्षर फार्मेसिस्ट / सहायक:</div>
                <div className="h-8 border-b border-dashed border-slate-400 w-44 mt-1"></div>
                <div className="text-[10px] text-slate-500 mt-1">दिनांक: __________________</div>
              </div>

              <div className="text-right">
                <div className="h-10 border-b border-slate-600 w-64 mb-1.5 ml-auto"></div>
                <div className="font-extrabold text-slate-900 text-xs uppercase">
                  {report.officer_name}
                </div>
                <div className="text-slate-700 font-semibold">चिकित्साधिकारी प्रभारी (In-Charge Medical Officer)</div>
                <div className="text-slate-600">{report.hospital_name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">हस्ताक्षर एवं पदमुहर (Seal & Signature)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
