import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
      <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 font-medium max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
