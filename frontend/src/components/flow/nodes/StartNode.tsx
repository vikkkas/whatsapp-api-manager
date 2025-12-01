import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play } from 'lucide-react';

const StartNode = ({ selected }: NodeProps) => {
  return (
    <div className={`w-40 shadow-md rounded-full bg-green-50 border-2 transition-all flex items-center p-2 gap-3 ${selected ? 'border-green-500 ring-2 ring-green-200' : 'border-green-200'}`}>
      <div className="bg-green-500 p-2 rounded-full text-white">
        <Play className="h-4 w-4 fill-current" />
      </div>
      <span className="font-bold text-sm text-green-900">Start Flow</span>
      
      <Handle type="source" position={Position.Right} className="!bg-green-500 !w-3 !h-3 !-right-1.5" />
    </div>
  );
};

export default memo(StartNode);
