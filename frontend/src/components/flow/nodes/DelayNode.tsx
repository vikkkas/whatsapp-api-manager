import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

interface DelayNodeProps {
  data: {
    label?: string;
    delayMs?: number;
  };
  selected?: boolean;
}

export function DelayNode({ data, selected }: DelayNodeProps) {
  const delaySeconds = (data.delayMs || 1000) / 1000;

  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-sm min-w-[200px]
        ${selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'}
      `}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-gray-700">Delay</span>
        </div>
        
        <div className="text-sm text-gray-600">
          Wait {delaySeconds}s
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
