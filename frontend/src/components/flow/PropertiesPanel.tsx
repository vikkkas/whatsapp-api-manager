import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  node: any;
  onChange: (nodeId: string, data: any) => void;
  onClose: () => void;
}

const PropertiesPanel = ({ node, onChange, onClose }: PropertiesPanelProps) => {
  const [content, setContent] = useState(node.data.content || '');
  const [buttons, setButtons] = useState<any[]>(node.data.buttons || []);
  const [mediaUrl, setMediaUrl] = useState(node.data.mediaUrl || '');

  // Update local state when node changes (e.g. selection change)
  useEffect(() => {
    setContent(node.data.content || '');
    setButtons(node.data.buttons || []);
    setMediaUrl(node.data.mediaUrl || '');
  }, [node.id]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange(node.id, { ...node.data, content: newContent });
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setMediaUrl(newUrl);
    onChange(node.id, { ...node.data, mediaUrl: newUrl });
  };

  const addButton = () => {
    if (buttons.length >= 3) return; // WhatsApp limit
    const newButtons = [...buttons, { type: 'reply', label: 'New Button' }];
    setButtons(newButtons);
    onChange(node.id, { ...node.data, buttons: newButtons });
  };

  const updateButton = (index: number, label: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], label };
    setButtons(newButtons);
    onChange(node.id, { ...node.data, buttons: newButtons });
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    setButtons(newButtons);
    onChange(node.id, { ...node.data, buttons: newButtons });
  };

  if (node.type === 'start') {
    return (
      <div className="w-80 border-l bg-white h-full p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Start Node</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-sm text-gray-500">This is the starting point of your flow.</p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-white h-full flex flex-col shadow-xl z-20">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="font-bold text-lg">Edit Message</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Message Text */}
        <div className="space-y-2">
          <Label>Message Text</Label>
          <Textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Enter your message..."
            rows={5}
            className="resize-none"
          />
        </div>

        {/* Media URL */}
        <div className="space-y-2">
          <Label>Image URL (Optional)</Label>
          <Input
            value={mediaUrl}
            onChange={handleMediaChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Buttons ({buttons.length}/3)</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addButton} 
              disabled={buttons.length >= 3}
              className="h-7"
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          
          <div className="space-y-2">
            {buttons.map((btn, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={btn.label}
                  onChange={(e) => updateButton(index, e.target.value)}
                  placeholder="Button Label"
                  maxLength={20}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeButton(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {buttons.length === 0 && (
              <p className="text-xs text-gray-400 italic">No buttons added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
