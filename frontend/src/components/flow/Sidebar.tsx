import { MessageSquare, GitBranch, Clock, Tag } from 'lucide-react';

const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-16 border-r bg-white flex flex-col items-center py-4 gap-4 z-10 shadow-sm">
      <div 
        className="p-3 rounded-lg hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors"
        onDragStart={(event) => onDragStart(event, 'message')}
        draggable
        title="Send Message"
      >
        <MessageSquare className="h-6 w-6 text-blue-600" />
      </div>
      
      {/* Future nodes */}
      <div className="p-3 rounded-lg hover:bg-gray-50 cursor-not-allowed opacity-40" title="Condition (Coming Soon)">
        <GitBranch className="h-6 w-6 text-purple-600" />
      </div>
      <div className="p-3 rounded-lg hover:bg-gray-50 cursor-not-allowed opacity-40" title="Delay (Coming Soon)">
        <Clock className="h-6 w-6 text-orange-600" />
      </div>
       <div className="p-3 rounded-lg hover:bg-gray-50 cursor-not-allowed opacity-40" title="Action (Coming Soon)">
        <Tag className="h-6 w-6 text-green-600" />
      </div>
    </div>
  );
};

export default Sidebar;
