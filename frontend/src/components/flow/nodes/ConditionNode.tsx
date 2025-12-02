import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface ConditionNodeProps {
  data: {
    label?: string;
    field?: string;
    operator?: string;
    value?: string;
  };
  selected?: boolean;
}

export function ConditionNode({ data, selected }: ConditionNodeProps) {
  const getConditionText = () => {
    if (!data.field || !data.operator || !data.value) {
      return 'Configure condition';
    }
    
    const operatorMap: Record<string, string> = {
      equals: '=',
      contains: 'contains',
      starts_with: 'starts with',
      ends_with: 'ends with',
      greater_than: '>',
      less_than: '<',
    };
    
    return `${data.field} ${operatorMap[data.operator] || data.operator} "${data.value}"`;
  };

  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-sm min-w-[220px]
        ${selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'}
      `}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-purple-500" />
          <span className="font-semibold text-gray-700">Condition</span>
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          {getConditionText()}
        </div>
        
        <div className="flex justify-between text-xs">
          <span className="text-green-600 font-medium">✓ True</span>
          <span className="text-red-600 font-medium">✗ False</span>
        </div>
      </div>

      {/* True path */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 bg-green-500"
        style={{ left: '30%' }}
      />
      
      {/* False path */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500"
        style={{ left: '70%' }}
      />
    </div>
  );
}
