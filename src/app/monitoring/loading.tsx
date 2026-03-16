import { Loader2 } from 'lucide-react';

export default function MonitoringLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin text-[#0F6E56]" />
    </div>
  );
}
