import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Eye,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Send,
  FileText,
  RefreshCw
} from 'lucide-react';
import { templateAPI, templateMessageAPI, settingsAPI } from '../lib/api';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  metaName?: string;
  category: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
  rejectionReason?: string | null;
  components: {
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{ type: string; text: string }>;
  }[];
  createdAt: string;
  updatedAt: string;
}

const TemplateManagement = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendPhoneNumber, setSendPhoneNumber] = useState('');
  const [sendLanguage, setSendLanguage] = useState('en_US');
  const [sendParams, setSendParams] = useState<Record<number, string>>({});
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    bodyText: '',
    headerText: '',
    footerText: '',
    buttons: [] as { type: string; text: string }[],
  });
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  useEffect(() => {
    fetchTemplates(true);
    (async () => {
      try {
        const settings = await settingsAPI.get();
        const templateCredential = settings.settings?.waba?.phoneNumberId;
        if (templateCredential) {
          setPhoneNumberId(templateCredential);
        }
      } catch (error) {
        toast.error('Failed to fetch settings');
      }
    })();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, categoryFilter, statusFilter, templates]);

  const fetchTemplates = async (autoSync: boolean = false) => {
    try {
      setIsLoading(true);
      if (autoSync && !hasAutoSynced) {
        try {
          await templateAPI.sync();
          setHasAutoSynced(true);
        } catch (error) {
          toast.error('Failed to sync with Meta. Showing cached templates.');
        }
      }
      const response = await templateAPI.getAll();
      setTemplates(response.templates || []);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleSyncWithMeta = async () => {
    try {
      setIsSyncing(true);
      await templateAPI.sync();
      toast.success('Templates synced with Meta');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to sync templates');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      category: 'MARKETING',
      language: 'en',
      bodyText: '',
      headerText: '',
      footerText: '',
      buttons: [],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    const footerComponent = template.components.find(c => c.type === 'FOOTER');
    const buttonsComponent = template.components.find(c => c.type === 'BUTTONS');

    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      bodyText: bodyComponent?.text || '',
      headerText: headerComponent?.text || '',
      footerText: footerComponent?.text || '',
      buttons: buttonsComponent?.buttons || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (template: Template) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const openSendDialog = (template: Template) => {
    setSelectedTemplate(template);
    setSendPhoneNumber('');
    setSendLanguage(template.language);
    setSendParams({});
    setIsSendDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      await templateAPI.delete(selectedTemplate.id);
      toast.success('Template deleted successfully');
      fetchTemplates();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const components = [
      {
        type: 'BODY',
        text: formData.bodyText,
      }
    ];

    if (formData.headerText) {
      components.unshift({
        type: 'HEADER',
        text: formData.headerText,
      });
    }

    if (formData.footerText) {
      components.push({
        type: 'FOOTER',
        text: formData.footerText,
      });
    }

    if (formData.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: formData.buttons,
      } as typeof components[0]);
    }

    const templateData = {
      name: formData.name,
      category: formData.category,
      language: formData.language,
      components,
    };

    try {
      if (selectedTemplate) {
        await templateAPI.update(selectedTemplate.id, templateData);
        toast.success('Template updated successfully');
      } else {
        await templateAPI.create(templateData);
        toast.success('Template created successfully');
      }
      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast.error(`Failed to ${selectedTemplate ? 'update' : 'create'} template`);
    }
  };

  const addButton = () => {
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { type: 'QUICK_REPLY', text: '' }],
    });
  };

  const removeButton = (index: number) => {
    const newButtons = formData.buttons.filter((_, i) => i !== index);
    setFormData({ ...formData, buttons: newButtons });
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...formData.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setFormData({ ...formData, buttons: newButtons });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'DISABLED':
        return <Badge className="bg-gray-400">Disabled</Badge>;
      default:
        return null;
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = text.matchAll(regex);
    return Array.from(matches, m => m[1]);
  };

  const renderTemplatePreview = (template: Template) => {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    const footerComponent = template.components.find(c => c.type === 'FOOTER');
    const buttonsComponent = template.components.find(c => c.type === 'BUTTONS');

    return (
      <div className="border rounded-lg p-4 bg-white max-w-md mx-auto">
        <div className="mb-3 text-xs uppercase tracking-wide text-gray-400">
          Meta Name: {template.metaName || 'N/A'}
        </div>
        {headerComponent && (
          <div className="font-semibold text-lg mb-2">
            {headerComponent.text}
          </div>
        )}
        {bodyComponent && (
          <div className="mb-2 whitespace-pre-wrap">
            {bodyComponent.text}
          </div>
        )}
        {footerComponent && (
          <div className="text-xs text-gray-500 mt-2">
            {footerComponent.text}
          </div>
        )}
        {template.rejectionReason && (
          <div className="mt-3 rounded border border-red-100 bg-red-50 p-3 text-xs text-red-600">
            Rejection reason: {template.rejectionReason}
          </div>
        )}
        {buttonsComponent && buttonsComponent.buttons && (
          <div className="mt-3 space-y-2">
            {buttonsComponent.buttons.map((button, idx) => (
              <button
                key={idx}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {button.text}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate) return;
    if (!phoneNumberId) {
      toast.error('No sending phone number configured. Update Settings first.');
      return;
    }
    const normalizedPhone = sendPhoneNumber.trim();
    if (!normalizedPhone) {
      toast.error('Enter a destination phone number');
      return;
    }

    setIsSendingTemplate(true);
    try {
      const templateComponents: Array<{
        type: 'header' | 'body' | 'button';
        parameters: Array<{ type: string; text: string }>;
      }> = [];

      const bodyText = selectedTemplate.components.find((c) => c.type === 'BODY')?.text || '';
      const bodyVariables = extractVariables(bodyText);
      if (bodyVariables.length > 0) {
        templateComponents.push({
          type: 'body',
          parameters: bodyVariables.map((index) => ({
            type: 'text',
            text: sendParams[Number(index)] || '',
          })),
        });
      }

      const headerText = selectedTemplate.components.find((c) => c.type === 'HEADER')?.text || '';
      const headerVariables = extractVariables(headerText);
      if (headerVariables.length > 0) {
        templateComponents.push({
          type: 'header',
          parameters: headerVariables.map((index) => ({
            type: 'text',
            text: sendParams[Number(index)] || '',
          })),
        });
      }

      await templateMessageAPI.send({
        phoneNumberId,
        to: normalizedPhone,
        templateName: selectedTemplate.metaName || selectedTemplate.name,
        languageCode: sendLanguage || selectedTemplate.language,
        templateComponents,
      });

      toast.success('Template message sent');
      setIsSendDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send template');
    } finally {
      setIsSendingTemplate(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-gray-600 mt-1">Create, sync, and monitor your WhatsApp Business templates</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleSyncWithMeta} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync with Meta
              </>
            )}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="UTILITY">Utility</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500 text-lg">No templates found</p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.category} • {template.language.toUpperCase()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(template.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 line-clamp-3">
                    {template.components.find(c => c.type === 'BODY')?.text || 'No content'}
                  </div>
                  {template.rejectionReason && (
                    <div className="rounded border border-red-100 bg-red-50 p-2 text-xs text-red-600">
                      Rejection reason: {template.rejectionReason}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Meta ID: {template.metaName || 'N/A'}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handlePreview(template)} className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openSendDialog(template)}>
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(template)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Create message templates with variables like {`{{1}}, {{2}}`} for personalization
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="welcome_message"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language *</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header">Header (Optional)</Label>
              <Input
                id="header"
                value={formData.headerText}
                onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                placeholder="Welcome to our service!"
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body Text *</Label>
              <Textarea
                id="body"
                value={formData.bodyText}
                onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                placeholder="Hi {{1}}, your order {{2}} has been confirmed!"
                rows={6}
                maxLength={1024}
                required
              />
              <p className="text-xs text-gray-500">
                Use {`{{1}}, {{2}}, {{3}}`} for variables. {formData.bodyText.length}/1024 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Footer (Optional)</Label>
              <Input
                id="footer"
                value={formData.footerText}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                placeholder="Thank you for choosing us!"
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Buttons (Optional)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addButton}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Button
                </Button>
              </div>
              {formData.buttons.map((button, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={button.text}
                    onChange={(e) => updateButton(index, 'text', e.target.value)}
                    placeholder="Button text"
                    maxLength={20}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => removeButton(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              How your template will appear to recipients
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && renderTemplatePreview(selectedTemplate)}
        </DialogContent>
      </Dialog>

      {/* Send Template Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Template Message</DialogTitle>
            <DialogDescription>
              Send {selectedTemplate?.name} to a new phone number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="e.g. +15551234567"
                value={sendPhoneNumber}
                onChange={(e) => setSendPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Language Code</Label>
              <Input
                placeholder="en_US"
                value={sendLanguage}
                onChange={(e) => setSendLanguage(e.target.value)}
              />
            </div>
            {selectedTemplate && (
              <div className="space-y-2">
                <Label>Template Variables</Label>
                {extractVariables(selectedTemplate.components.find((c) => c.type === 'BODY')?.text || '').length === 0 ? (
                  <p className="text-xs text-gray-500">No variables required for this template.</p>
                ) : (
                  extractVariables(
                    selectedTemplate.components.find((c) => c.type === 'BODY')?.text || ''
                  ).map((variable) => (
                    <div key={variable} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{'{{'}{variable}{'}}'}:</span>
                      <Input
                        value={sendParams[Number(variable)] || ''}
                        onChange={(e) =>
                          setSendParams((prev) => ({ ...prev, [Number(variable)]: e.target.value }))
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTemplate} disabled={isSendingTemplate}>
              {isSendingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
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

export default TemplateManagement;
