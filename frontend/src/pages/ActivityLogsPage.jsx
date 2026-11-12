import { Activity } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getApiErrorMessage } from '../services/api.js';
import { activityApi } from '../services/crmServices.js';
import { formatDateTime } from '../utils/formatters.js';

const ENTITY_TYPES = ['student', 'admission', 'payment', 'visa', 'visa_document', 'flight', 'accommodation', 'document', 'staff', 'auth', 'settings'];

export default function ActivityLogsPage() {
  const { toast } = useToast();
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activityApi.list({
        page,
        limit: 25,
        ...(entityType ? { entity_type: entityType } : {})
      });
      setLogs(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load activity logs'));
    } finally {
      setLoading(false);
    }
  }, [page, entityType, toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity & Audit Logs</h1>
          <p className="text-sm text-slate-500">Immutable chronological log of system changes and staff actions.</p>
        </div>

        <select
          className="input-field sm:w-56"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Modules</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading audit trail..." />
        ) : logs.length === 0 ? (
          <EmptyState icon={Activity} title="No activity logs found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Student</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{log.actor?.full_name || 'System'}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{log.description}</td>
                      <td className="py-3 px-4">
                        {log.student ? (
                          <Link to={`/students/${log.student.id}`} className="text-indigo-600 hover:underline font-medium">
                            {log.student.student_code} — {log.student.full_name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

