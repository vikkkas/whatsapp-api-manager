import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Loader2,
  Target,
  TrendingUp,
  TrendingUp,
  Eye,
  Upload,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { campaignAPI, contactAPI, templateAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  messageType: string;
  totalContacts: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  messagesRead: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    messageType: 'TEMPLATE' as 'TEXT' | 'TEMPLATE' | 'INTERACTIVE',
    templateId: '',
    messageText: '',
    interactiveType: 'button' as 'button' | 'list',
    scheduledAt: '',
  });

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const obj: any = {};
      const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ''));

      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) {
          obj[headers[j]] = currentline[j];
        }
      }
      result.push(obj);
    }
    return result;
  };

  const handleImportContacts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const parsedContacts = parseCSV(text);
        if (parsedContacts.length === 0) {
           toast.error('No contacts found in CSV');
           return;
        }
        
        const validContacts = parsedContacts.filter((c: any) => c.phoneNumber);
        if (validContacts.length === 0) {
           toast.error('No valid contacts found. "phoneNumber" column is required.');
           return;
        }

        const response = await contactAPI.importCSV(validContacts);
        
        if (response.success) {
           const newContactIds = response.createdContacts.map((c: any) => c.id);
           setSelectedContacts(prev => [...new Set([...prev, ...newContactIds])]);
           await fetchContacts(); // Refresh list
           toast.success(`Imported and selected ${newContactIds.length} contacts`);
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import contacts');
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const response = await campaignAPI.list();
      setCampaigns(response.campaigns || []);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contactAPI.list({ limit: 1000 });
      setContacts(response.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await templateAPI.getAll();
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates');
    }
  };

  const handleCreate = () => {
    setSelectedCampaign(null);
    setFormData({
      name: '',
      description: '',
      messageType: 'TEMPLATE',
      templateId: '',
      messageText: '',
      interactiveType: 'button',
      scheduledAt: '',
    });
    setSelectedContacts([]);
    setIsDialogOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      messageType: campaign.messageType as any,
      templateId: '',
      messageText: '',
      interactiveType: 'button',
      scheduledAt: campaign.scheduledAt || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCampaign) return;

    try {
      await campaignAPI.delete(selectedCampaign.id);
      toast.success('Campaign deleted successfully');
      fetchCampaigns();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Campaign name is required');
      return;
    }

    const campaignData: any = {
      name: formData.name,
      description: formData.description,
      messageType: formData.messageType,
      contactIds: selectedContacts,
    };

    if (formData.messageType === 'TEMPLATE' && formData.templateId) {
      campaignData.templateId = formData.templateId;
    } else if (formData.messageType === 'TEXT' && formData.messageText) {
      campaignData.messageText = formData.messageText;
    }

    if (formData.scheduledAt) {
      campaignData.scheduledAt = new Date(formData.scheduledAt).toISOString();
    }

    try {
      if (selectedCampaign) {
        await campaignAPI.update(selectedCampaign.id, campaignData);
        toast.success('Campaign updated successfully');
      } else {
        await campaignAPI.create(campaignData);
        toast.success('Campaign created successfully');
      }
      setIsDialogOpen(false);
      fetchCampaigns();
    } catch (error) {
      toast.error(`Failed to ${selectedCampaign ? 'update' : 'create'} campaign`);
    }
  };

  const handleExecute = async (campaign: Campaign) => {
    if (!confirm(`Are you sure you want to execute campaign "${campaign.name}"? This will send messages to ${campaign.totalContacts} contacts.`)) {
      return;
    }

    try {
      const response = await campaignAPI.execute(campaign.id);
      toast.success(`Campaign executed! Sent: ${response.sent}, Failed: ${response.failed}`);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to execute campaign');
    }
  };

  const handleViewAnalytics = async (campaign: Campaign) => {
    try {
      const response = await campaignAPI.getAnalytics(campaign.id);
      setAnalytics(response.analytics);
      setSelectedCampaign(campaign);
      setIsAnalyticsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Edit },
      SCHEDULED: { color: 'bg-blue-100 text-blue-700', icon: Clock },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
      COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      PAUSED: { color: 'bg-orange-100 text-orange-700', icon: Pause },
      CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-none font-medium`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-gray-500 mt-1">Create and manage bulk messaging campaigns.</p>
        </div>
        <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-blue-100 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {campaigns.filter(c => c.status === 'IN_PROGRESS').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Running now</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {campaigns.filter(c => c.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Successfully finished</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {campaigns.reduce((sum, c) => sum + c.messagesSent, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Messages delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium text-lg">No campaigns yet</p>
              <p className="text-gray-500 mb-6">Create your first campaign to get started.</p>
              <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="font-semibold text-gray-600">Type</TableHead>
                  <TableHead className="font-semibold text-gray-600">Contacts</TableHead>
                  <TableHead className="font-semibold text-gray-600">Sent</TableHead>
                  <TableHead className="font-semibold text-gray-600">Delivered</TableHead>
                  <TableHead className="font-semibold text-gray-600">Created</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-gray-50/50 border-gray-100 transition-colors">
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-gray-900 font-medium">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-xs text-gray-500 mt-1">{campaign.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-gray-600 border-gray-200">
                        {campaign.messageType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 font-medium">{campaign.totalContacts}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-900 font-medium">{campaign.messagesSent}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">{campaign.messagesDelivered}</span>
                        {campaign.messagesSent > 0 && (
                          <span className="text-xs text-gray-500">
                            ({Math.round((campaign.messagesDelivered / campaign.messagesSent) * 100)}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{formatDate(campaign.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExecute(campaign)}
                            className="border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Execute
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAnalytics(campaign)}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Analytics
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(campaign)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
            <DialogDescription>
              {selectedCampaign ? 'Update campaign details' : 'Set up a new bulk messaging campaign'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Promotion 2024"
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your campaign..."
                  rows={3}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="messageType" className="font-medium">Message Type *</Label>
                <Select
                  value={formData.messageType}
                  onValueChange={(value: any) => setFormData({ ...formData, messageType: value })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Text Message</SelectItem>
                    <SelectItem value="TEMPLATE">Template Message</SelectItem>
                    <SelectItem value="INTERACTIVE">Interactive Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.messageType === 'TEMPLATE' && (
                <div className="space-y-2">
                  <Label htmlFor="template" className="font-medium">Select Template *</Label>
                  <Select
                    value={formData.templateId}
                    onValueChange={(value) => setFormData({ ...formData, templateId: value })}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.displayName || template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.messageType === 'TEXT' && (
                <div className="space-y-2">
                  <Label htmlFor="messageText" className="font-medium">Message Text *</Label>
                  <Textarea
                    id="messageText"
                    value={formData.messageText}
                    onChange={(e) => setFormData({ ...formData, messageText: e.target.value })}
                    placeholder="Enter your message..."
                    rows={4}
                    className="bg-gray-50 border-gray-200 focus:bg-white transition-all resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="scheduledAt" className="font-medium">Schedule (Optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Select Contacts ({selectedContacts.length} selected)</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportContacts}
                      className="hidden"
                      id="campaign-contact-import"
                    />
                    <Label
                      htmlFor="campaign-contact-import"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      Import CSV
                    </Label>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.includes(contact.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts([...selectedContacts, contact.id]);
                          } else {
                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`contact-${contact.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium text-gray-900">{contact.name || contact.phoneNumber}</span>
                        {contact.name && (
                          <span className="text-sm text-gray-500 ml-2">{contact.phoneNumber}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                {selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCampaign?.name}"? This action cannot be undone.
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

      {/* Analytics Dialog */}
      <Dialog open={isAnalyticsDialogOpen} onOpenChange={setIsAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Campaign Analytics</DialogTitle>
            <DialogDescription>
              Performance metrics for "{selectedCampaign?.name}"
            </DialogDescription>
          </DialogHeader>
          {analytics && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-none shadow-sm bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">Total Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">{analytics.totalContacts}</div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700">Messages Sent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">{analytics.messagesSent}</div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">Delivered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900">{analytics.messagesDelivered}</div>
                    <p className="text-xs text-purple-600 mt-1">{analytics.deliveryRate.toFixed(1)}% rate</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-yellow-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-700">Read</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-900">{analytics.messagesRead}</div>
                    <p className="text-xs text-yellow-600 mt-1">{analytics.readRate.toFixed(1)}% rate</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-900">{analytics.messagesFailed}</div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gray-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{analytics.conversations}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsAnalyticsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManagement;
