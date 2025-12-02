import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

interface ActionNodeProps {
  data: {
    label?: string;
    actionType?: string;
  };
  selected?: boolean;
}

export function ActionNode({ data, selected }: ActionNodeProps) {
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
          <Zap className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-gray-700">Action</span>
        </div>
        
        <div className="text-sm text-gray-600">
          {data.actionType || 'Configure action'}
        </div>
        
        <div className="mt-2 text-xs text-gray-400">
          Coming soon
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
