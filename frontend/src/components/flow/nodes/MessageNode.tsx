import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Image as ImageIcon } from 'lucide-react';

const MessageNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`w-64 shadow-md rounded-lg bg-white border-2 transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="bg-gray-50 p-3 rounded-t-lg border-b border-gray-100 flex items-center gap-2">
        <div className="bg-blue-100 p-1.5 rounded-md">
          <MessageSquare className="h-4 w-4 text-blue-600" />
        </div>
        <span className="font-semibold text-sm text-gray-700">Send Message</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {data.mediaUrl && (
          <div className="rounded-md overflow-hidden bg-gray-100 h-32 flex items-center justify-center relative">
            <img src={data.mediaUrl} alt="Media" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3 min-h-[1.5rem]">
          {data.content || <span className="text-gray-400 italic">Enter message text...</span>}
        </div>

        {/* Buttons Preview */}
        {data.buttons && data.buttons.length > 0 && (
          <div className="space-y-2 pt-2">
            {data.buttons.map((btn: any, index: number) => (
              <div key={index} className="relative group">
                <div className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-center text-xs font-medium text-blue-600 hover:bg-gray-100 transition-colors">
                  {btn.label}
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`button-${index}`}
                  className="!bg-blue-500 !w-3 !h-3 !-right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ top: '50%' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-3 !h-3 !-left-1.5" />
      
      {/* Default Output Handle (if no buttons or "Next Step") */}
      {(!data.buttons || data.buttons.length === 0) && (
        <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3 !-right-1.5" />
      )}
    </div>
  );
};

export default memo(MessageNode);
