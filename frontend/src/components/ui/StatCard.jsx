export default function StatCard({ title, value, icon: Icon, accent = 'indigo', subtitle }) {
  const accentStyles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    teal: 'bg-teal-50 text-teal-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  return (
    <div className="card p-4 sm:p-5 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{title}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value ?? 0}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accentStyles[accent] || accentStyles.indigo}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

