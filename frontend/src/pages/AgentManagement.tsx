import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
  Loader2,
  MessageSquare,
  TrendingUp,
  Circle,
} from 'lucide-react';
import { agentAPI } from '@/lib/api';
import { PermissionSelector } from '@/components/PermissionSelector';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  email: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  isOnline: boolean;
  maxConcurrentChats: number;
  skills: string[];
  permissions: string[];
  _count?: {
    assignedConversations: number;
  };
  createdAt: string;
}

const AgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    maxConcurrentChats: 10,
    skills: [] as string[],
    permissions: [] as string[],
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await agentAPI.list();
      setAgents(response.agents || []);
    } catch (error) {
      toast.error('Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAgent(null);
    setFormData({
      name: '',
      email: '',
      maxConcurrentChats: 10,
      skills: [],
      permissions: [],
    });
    setSkillInput('');
    setIsDialogOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      maxConcurrentChats: agent.maxConcurrentChats,
      skills: agent.skills || [],
      permissions: agent.permissions || [],
    });
    setSkillInput('');
    setIsDialogOpen(true);
  };

  const handleDelete = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAgent) return;

    try {
      await agentAPI.delete(selectedAgent.id);
      toast.success('Agent deleted successfully');
      fetchAgents();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      if (selectedAgent) {
        await agentAPI.update(selectedAgent.id, formData);
        toast.success('Agent updated successfully');
      } else {
        const response = await agentAPI.create(formData);
        if (response.temporaryPassword) {
          setTempPassword(response.temporaryPassword);
        }
        toast.success('Agent created successfully');
      }
      setIsDialogOpen(false);
      fetchAgents();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${selectedAgent ? 'update' : 'create'} agent`);
    }
  };

  const handleStatusChange = async (agentId: string, status: string) => {
    try {
      await agentAPI.updateStatus(agentId, status);
      toast.success('Agent status updated');
      fetchAgents();
    } catch (error) {
      toast.error('Failed to update agent status');
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill),
    });
  };

  const getStatusBadge = (status: string, isOnline: boolean) => {
    const statusConfig: Record<string, { color: string; icon: any; dotColor: string }> = {
      ONLINE: { color: 'bg-green-100 text-green-700 border-green-200', icon: UserCheck, dotColor: 'bg-green-500' },
      AWAY: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Users, dotColor: 'bg-yellow-500' },
      BUSY: { color: 'bg-red-100 text-red-700 border-red-200', icon: UserX, dotColor: 'bg-red-500' },
      OFFLINE: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: UserX, dotColor: 'bg-gray-400' },
    };

    const config = statusConfig[status] || statusConfig.OFFLINE;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border font-medium flex items-center gap-1.5`}>
        <Circle className={`h-2 w-2 ${config.dotColor} fill-current`} />
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onlineAgents = agents.filter(a => a.status !== 'OFFLINE').length;
  const totalChats = agents.reduce((sum, a) => sum + (a._count?.assignedConversations || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agent Management</h1>
          <p className="text-gray-500 mt-1">Manage your support team and their availability.</p>
        </div>
        <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agents.length}</div>
            <p className="text-xs text-blue-100 mt-1">Active team members</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Online Now</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{onlineAgents}</div>
            <p className="text-xs text-gray-500 mt-1">Available agents</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalChats}</div>
            <p className="text-xs text-gray-500 mt-1">Conversations assigned</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Load</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {agents.length > 0 ? Math.round(totalChats / agents.length) : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Chats per agent</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium text-lg">No agents yet</p>
              <p className="text-gray-500 mb-6">Add your first team member to get started.</p>
              <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-semibold text-gray-600">Agent</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="font-semibold text-gray-600">Active Chats</TableHead>
                  <TableHead className="font-semibold text-gray-600">Max Chats</TableHead>
                  <TableHead className="font-semibold text-gray-600">Skills</TableHead>
                  <TableHead className="font-semibold text-gray-600">Joined</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-gray-50/50 border-gray-100 transition-colors">
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-gray-900 font-medium">{agent.name}</div>
                        <div className="text-xs text-gray-500">{agent.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="cursor-pointer">
                            {getStatusBadge(agent.status, agent.isOnline)}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'ONLINE')}>
                            <Circle className="h-2 w-2 bg-green-500 fill-current mr-2" />
                            Online
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'AWAY')}>
                            <Circle className="h-2 w-2 bg-yellow-500 fill-current mr-2" />
                            Away
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'BUSY')}>
                            <Circle className="h-2 w-2 bg-red-500 fill-current mr-2" />
                            Busy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'OFFLINE')}>
                            <Circle className="h-2 w-2 bg-gray-400 fill-current mr-2" />
                            Offline
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-900 font-medium">{agent._count?.assignedConversations || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{agent.maxConcurrentChats}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.skills && agent.skills.length > 0 ? (
                          agent.skills.slice(0, 2).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs font-normal border-gray-200">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No skills</span>
                        )}
                        {agent.skills && agent.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs font-normal border-gray-200">
                            +{agent.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{formatDate(agent.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(agent)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(agent)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedAgent ? 'Edit Agent' : 'Add New Agent'}
            </DialogTitle>
            <DialogDescription>
              {selectedAgent ? 'Update agent details and permissions' : 'Add a new team member to your workspace'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxChats" className="font-medium">Max Concurrent Chats</Label>
              <Input
                id="maxChats"
                type="number"
                min="1"
                max="50"
                value={formData.maxConcurrentChats}
                onChange={(e) => setFormData({ ...formData, maxConcurrentChats: parseInt(e.target.value) })}
                className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
              />
              <p className="text-xs text-gray-500">Maximum number of simultaneous conversations</p>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill (e.g., Sales, Support)"
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Permissions</Label>
              <PermissionSelector
                selectedPermissions={formData.permissions}
                onChange={(permissions) => setFormData({ ...formData, permissions })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                {selectedAgent ? 'Update Agent' : 'Add Agent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agent Created Successfully!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Share these credentials with the agent:</p>
            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Temporary Password:</strong> <code className="bg-white px-2 py-1 rounded border border-gray-200 font-mono text-blue-600 font-bold">{tempPassword}</code></p>
            </div>
            <p className="text-sm text-gray-500">
              The agent will be required to change this password on first login.
            </p>
            <Button onClick={() => setTempPassword(null)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAgent?.name}"? This will unassign all their conversations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagement;
