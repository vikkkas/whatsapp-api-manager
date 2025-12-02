import { MessageSquare, Clock, GitBranch, Zap } from 'lucide-react';

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes = [
    { type: 'message', label: 'Send Message', icon: MessageSquare, color: 'text-blue-500' },
    { type: 'delay', label: 'Delay', icon: Clock, color: 'text-orange-500' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'text-purple-500' },
    { type: 'action', label: 'Action', icon: Zap, color: 'text-yellow-500' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Nodes</h3>
      <div className="space-y-2">
        {nodeTypes.map(({ type, label, icon: Icon, color }) => (
          <div
            key={type}
            className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-move hover:bg-gray-50 hover:border-blue-400 transition-colors"
            draggable
            onDragStart={(e) => onDragStart(e, type)}
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Drag nodes onto the canvas to build your automation flow.
        </p>
      </div>
    </div>
  );
}

export default Sidebar;
