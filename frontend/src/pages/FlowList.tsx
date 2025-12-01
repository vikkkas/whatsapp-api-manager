import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Play, Pause, GitBranch } from 'lucide-react';
import { flowAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FlowList = () => {
  const [flows, setFlows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFlowData, setNewFlowData] = useState({
    name: '',
    description: '',
    triggerType: 'KEYWORD',
    trigger: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setIsLoading(true);
      const response = await flowAPI.list();
      setFlows(response.flows || []);
    } catch (error) {
      toast.error('Failed to fetch flows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newFlowData.name) {
      toast.error('Name is required');
      return;
    }

    try {
      const flow = await flowAPI.create(newFlowData);
      toast.success('Flow created');
      setIsCreateDialogOpen(false);
      navigate(`/flows/${flow.id}`);
    } catch (error) {
      toast.error('Failed to create flow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;
    try {
      await flowAPI.delete(id);
      toast.success('Flow deleted');
      fetchFlows();
    } catch (error) {
      toast.error('Failed to delete flow');
    }
  };

  const toggleActive = async (flow: any) => {
    try {
      await flowAPI.update(flow.id, { isActive: !flow.isActive });
      toast.success(`Flow ${flow.isActive ? 'paused' : 'activated'}`);
      fetchFlows();
    } catch (error) {
      toast.error('Failed to update flow status');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automation Flows</h1>
          <p className="text-gray-500 mt-1">Build automated conversation flows and chatbots.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-black text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Flow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {flows.map((flow) => (
          <Card key={flow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold">{flow.name}</CardTitle>
                <Badge variant={flow.isActive ? 'default' : 'secondary'} className={flow.isActive ? 'bg-green-100 text-green-700' : ''}>
                  {flow.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{flow.description || 'No description'}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GitBranch className="h-4 w-4" />
                  <span>Trigger: {flow.triggerType} {flow.trigger ? `(${flow.trigger})` : ''}</span>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/flows/${flow.id}`)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(flow)}>
                    {flow.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(flow.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Flow Name</Label>
              <Input 
                value={newFlowData.name} 
                onChange={(e) => setNewFlowData({...newFlowData, name: e.target.value})}
                placeholder="e.g., Welcome Message"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={newFlowData.description} 
                onChange={(e) => setNewFlowData({...newFlowData, description: e.target.value})}
                placeholder="Handles new customers..."
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select 
                value={newFlowData.triggerType} 
                onValueChange={(val) => setNewFlowData({...newFlowData, triggerType: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEYWORD">Keyword Match</SelectItem>
                  <SelectItem value="NEW_MESSAGE">New Message (Any)</SelectItem>
                  <SelectItem value="CONVERSATION_OPENED">Conversation Opened</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newFlowData.triggerType === 'KEYWORD' && (
              <div className="space-y-2">
                <Label>Keyword</Label>
                <Input 
                  value={newFlowData.trigger} 
                  onChange={(e) => setNewFlowData({...newFlowData, trigger: e.target.value})}
                  placeholder="e.g., hello, help, price"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Flow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowList;
