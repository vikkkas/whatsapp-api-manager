import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  node: any;
  onChange: (nodeId: string, data: any) => void;
  onClose: () => void;
}

const PropertiesPanel = ({ node, onChange, onClose }: PropertiesPanelProps) => {
  const [localData, setLocalData] = useState(node.data);

  useEffect(() => {
    setLocalData(node.data);
  }, [node.id]);

  const updateData = (updates: any) => {
    const newData = { ...localData, ...updates };
    setLocalData(newData);
    onChange(node.id, newData);
  };

  // START NODE
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

  // MESSAGE NODE
  if (node.type === 'message') {
    const content = localData.content || '';
    const buttons = localData.buttons || [];
    const mediaUrl = localData.mediaUrl || '';

    const addButton = () => {
      if (buttons.length >= 3) return;
      updateData({ buttons: [...buttons, { id: `btn-${Date.now()}`, label: 'New Button' }] });
    };

    const updateButton = (index: number, label: string) => {
      const newButtons = [...buttons];
      newButtons[index] = { ...newButtons[index], label };
      updateData({ buttons: newButtons });
    };

    const removeButton = (index: number) => {
      updateData({ buttons: buttons.filter((_: any, i: number) => i !== index) });
    };

    return (
      <div className="w-80 border-l bg-white h-full flex flex-col shadow-xl z-20">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-lg">Edit Message</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <Label>Message Text</Label>
            <Textarea
              value={content}
              onChange={(e) => updateData({ content: e.target.value })}
              placeholder="Enter your message..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Image URL (Optional)</Label>
            <Input
              value={mediaUrl}
              onChange={(e) => updateData({ mediaUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Buttons ({buttons.length}/3)</Label>
              <Button variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3} className="h-7">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            
            <div className="space-y-2">
              {buttons.map((btn: any, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={btn.label}
                    onChange={(e) => updateButton(index, e.target.value)}
                    placeholder="Button Label"
                    maxLength={20}
                  />
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeButton(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {buttons.length === 0 && <p className="text-xs text-gray-400 italic">No buttons added.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DELAY NODE
  if (node.type === 'delay') {
    const delayMs = localData.delayMs || 1000;
    const delaySeconds = delayMs / 1000;

    return (
      <div className="w-80 border-l bg-white h-full p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Delay Node</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Delay Duration (seconds)</Label>
            <Input
              type="number"
              min="1"
              max="300"
              value={delaySeconds}
              onChange={(e) => updateData({ delayMs: parseInt(e.target.value) * 1000 })}
            />
            <p className="text-xs text-gray-500">Wait time before continuing to next node (1-300 seconds)</p>
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>Note:</strong> The flow will pause for {delaySeconds} seconds before proceeding.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // CONDITION NODE
  if (node.type === 'condition') {
    const field = localData.field || 'messageBody';
    const operator = localData.operator || 'contains';
    const value = localData.value || '';

    return (
      <div className="w-80 border-l bg-white h-full p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Condition Node</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Field to Check</Label>
            <Select value={field} onValueChange={(val) => updateData({ field: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="messageBody">Message Body</SelectItem>
                <SelectItem value="buttonClick">Button Click</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Operator</Label>
            <Select value={operator} onValueChange={(val) => updateData({ operator: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="ends_with">Ends With</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              value={value}
              onChange={(e) => updateData({ value: e.target.value })}
              placeholder="Enter value to compare..."
            />
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-800">
              <strong>True path:</strong> Green handle (left)<br />
              <strong>False path:</strong> Red handle (right)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ACTION NODE
  if (node.type === 'action') {
    return (
      <div className="w-80 border-l bg-white h-full p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Action Node</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Coming Soon!</strong><br />
            Actions like updating contact properties, adding tags, or triggering webhooks will be available in a future update.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default PropertiesPanel;
