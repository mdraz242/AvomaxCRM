import {
  Activity,
  Building2,
  CreditCard,
  FileCheck2,
  GraduationCap,
  Plane,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getApiErrorMessage } from '../services/api.js';
import { dashboardApi } from '../services/crmServices.js';
import { formatDateTime } from '../utils/formatters.js';

const CHART_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'];

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [statsRes, chartsRes, actRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getCharts(),
          dashboardApi.getActivity()
        ]);
        if (!mounted) return;
        setStats(statsRes.data);
        setCharts(chartsRes.data);
        setActivity(actRes.data || []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load dashboard data'));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  if (loading) {
    return <LoadingSpinner label="Loading live dashboard metrics..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time international student admission, visa, flight, and accommodation telemetry.
          </p>
        </div>
        <Link to="/students" className="btn-primary self-start">
          <Users className="h-4 w-4" /> Manage Students
        </Link>
      </div>

      {/* 7 Required Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard title="Total Students" value={stats?.totalStudents} icon={Users} accent="indigo" />
        <StatCard
          title="Admission Confirmed"
          value={stats?.admissionConfirmed}
          icon={GraduationCap}
          accent="emerald"
        />
        <StatCard
          title="Admission Fee Paid"
          value={stats?.admissionFeePaid}
          icon={CreditCard}
          accent="teal"
        />
        <StatCard
          title="Compiling Visa Docs"
          value={stats?.compilingVisaDocuments}
          icon={FileCheck2}
          accent="sky"
        />
        <StatCard
          title="Eligible for Visa"
          value={stats?.eligibleForVisa}
          icon={ShieldCheck}
          accent="violet"
        />
        <StatCard
          title="Flight Tickets Booked"
          value={stats?.flightTicketsBooked}
          icon={Plane}
          accent="amber"
        />
        <StatCard
          title="Accommodation Reserved"
          value={stats?.accommodationReserved}
          icon={Building2}
          accent="emerald"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Admission Status Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.admissionDistribution || []} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Students" fill="#4F46E5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Visa Processing Status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.visaProcessing || []} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-18} textAnchor="end" interval={0} height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Students" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Flight Booking Statistics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.flightStatistics || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {(charts?.flightStatistics || []).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Accommodation Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.accommodationDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {(charts?.accommodationDistribution || []).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Monthly Admission Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="confirmed"
                  name="Confirmed"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.22}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <Link to="/activity-logs" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all logs
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {activity.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No recent activity recorded yet.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{item.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    By <span className="font-medium text-slate-700">{item.actor?.full_name || 'System'}</span>
                    {item.student && (
                      <>
                        {' • '}
                        <Link to={`/students/${item.student.id}`} className="text-indigo-600 hover:underline">
                          {item.student.student_code} ({item.student.full_name})
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{formatDateTime(item.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

