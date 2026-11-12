import { BarChart3, Download } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getApiErrorMessage } from '../services/api.js';
import { reportApi, triggerBlobDownload } from '../services/crmServices.js';

const REPORT_OPTIONS = [
  { id: 'student-admission', label: 'Student Admission Report' },
  { id: 'fee-collection', label: 'Fee Collection Report' },
  { id: 'pending-payment', label: 'Pending Payment Report' },
  { id: 'visa-processing', label: 'Visa Processing Report' },
  { id: 'visa-eligibility', label: 'Visa Eligibility Report' },
  { id: 'flight-booking', label: 'Flight Booking Report' },
  { id: 'accommodation', label: 'Accommodation Report' },
  { id: 'country-wise', label: 'Country-wise Student Report' },
  { id: 'counselor-performance', label: 'Counselor Performance Report' }
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState('student-admission');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportApi.get(selectedType);
      setReport(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  }, [selectedType, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async (format) => {
    try {
      const blob = await reportApi.exportFile(selectedType, format);
      triggerBlobDownload(blob, `${selectedType}_report.${format}`);
      toast.success(`Downloaded ${format.toUpperCase()} report`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Generate operational reports across admissions, payments, visas, flights, accommodation, and counselor KPIs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleExport('csv')} className="btn-secondary text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button type="button" onClick={() => handleExport('xlsx')} className="btn-primary text-xs">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="card p-3 flex flex-wrap gap-2">
        {REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedType(opt.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedType === opt.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">{report?.title || 'Report'}</h2>
          </div>
          <span className="text-xs text-slate-500">{report?.rows?.length || 0} rows</span>
        </div>

        {loading ? (
          <LoadingSpinner label="Generating report..." />
        ) : !report?.rows?.length ? (
          <EmptyState title="No data in this report" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  {report.columns.map((col) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {report.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {report.columns.map((col) => (
                      <td key={col} className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

