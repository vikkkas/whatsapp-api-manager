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
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Download, 
  Upload,
  User,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  Loader2,
  Users,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { contactAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Contact {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  lastMessageAt?: string;
  totalMessages?: number;
  createdAt: string;
  updatedAt: string;
}

const ContactManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    name: '',
    email: '',
    company: '',
    notes: '',
    tags: [] as string[],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    fetchContacts();
  }, [pagination.page]);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const response = await contactAPI.list({
        page: pagination.page,
        limit: pagination.limit,
      });
      setContacts(response.contacts || []);
      setPagination(prev => ({ ...prev, total: response.total || 0 }));
    } catch (error) {
      toast.error('Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const filterContacts = () => {
    if (!searchQuery) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.phoneNumber.toLowerCase().includes(query) ||
      contact.name?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query)
    );
    setFilteredContacts(filtered);
  };

  const handleCreate = () => {
    setSelectedContact(null);
    setFormData({
      phoneNumber: '',
      name: '',
      email: '',
      company: '',
      notes: '',
      tags: [],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      phoneNumber: contact.phoneNumber,
      name: contact.name || '',
      email: contact.email || '',
      company: contact.company || '',
      notes: contact.notes || '',
      tags: contact.tags || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedContact) return;

    try {
      await contactAPI.delete(selectedContact.id);
      toast.success('Contact deleted successfully');
      fetchContacts();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (!formData.phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    // Format phone number
    const formattedPhone = formData.phoneNumber.startsWith('+') 
      ? formData.phoneNumber 
      : `+${formData.phoneNumber}`;

    const contactData = {
      ...formData,
      phoneNumber: formattedPhone,
    };

    try {
      if (selectedContact) {
        await contactAPI.update(selectedContact.id, contactData);
        toast.success('Contact updated successfully');
      } else {
        await contactAPI.create(contactData);
        toast.success('Contact created successfully');
      }
      setIsDialogOpen(false);
      fetchContacts();
    } catch (error) {
      toast.error(`Failed to ${selectedContact ? 'update' : 'create'} contact`);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await contactAPI.exportCSV();
      
      // Create blob and download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Contacts exported successfully');
    } catch (error) {
      toast.error('Failed to export contacts');
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Remove quotes
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const obj: any = {};
      // Split by comma, ignoring commas inside quotes
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

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const contacts = parseCSV(text);
        if (contacts.length === 0) {
          toast.error('No contacts found in CSV');
          return;
        }
        
        // Validate required fields
        const validContacts = contacts.filter((c: any) => c.phoneNumber);
        if (validContacts.length === 0) {
           toast.error('No valid contacts found. "phoneNumber" column is required.');
           return;
        }

        await contactAPI.importCSV(validContacts);
        toast.success(`${validContacts.length} contacts imported successfully`);
        setIsImportDialogOpen(false);
        setImportFile(null);
        fetchContacts();
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import contacts');
      }
    };
    reader.readAsText(importFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage and organize your customer database.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="bg-white border-gray-200">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="bg-white border-gray-200">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800 shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-black text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pagination.total}</div>
            <p className="text-xs text-gray-400 mt-1">Active database</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {contacts.filter(c => c.totalMessages && c.totalMessages > 0).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Engaged users</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">New This Month</CardTitle>
            <Plus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {contacts.filter(c => {
                const createdDate = new Date(c.createdAt);
                const now = new Date();
                return createdDate.getMonth() === now.getMonth() && 
                       createdDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Growth rate</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">With Email</CardTitle>
            <Mail className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {contacts.filter(c => c.email).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Enriched profiles</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 bg-gray-50 focus:bg-white transition-all"
          />
        </div>
        <Button variant="outline" className="border-gray-200">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Contacts Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium text-lg">No contacts found</p>
              <p className="text-gray-500 mb-6">Get started by adding your first contact.</p>
              <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="font-semibold text-gray-600">Name</TableHead>
                    <TableHead className="font-semibold text-gray-600">Phone</TableHead>
                    <TableHead className="font-semibold text-gray-600">Email</TableHead>
                    <TableHead className="font-semibold text-gray-600">Company</TableHead>
                    <TableHead className="font-semibold text-gray-600">Tags</TableHead>
                    <TableHead className="font-semibold text-gray-600">Messages</TableHead>
                    <TableHead className="font-semibold text-gray-600">Last Contact</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-gray-50/50 border-gray-100 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {contact.name ? contact.name[0].toUpperCase() : <User className="h-4 w-4" />}
                          </div>
                          <span className="text-gray-900 font-medium">{contact.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {contact.phoneNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            {contact.email}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            {contact.company}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none font-normal">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                          {contact.tags && contact.tags.length > 2 && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none font-normal">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-gray-600 border-gray-200">
                          {contact.totalMessages || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contact.lastMessageAt ? (
                          <span className="text-gray-600">{formatDate(contact.lastMessageAt)}</span>
                        ) : (
                          <span className="text-gray-300">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEdit(contact)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(contact)} className="cursor-pointer text-red-600 focus:text-red-600">
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

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="border-gray-200"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page * pagination.limit >= pagination.total}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="border-gray-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedContact ? 'Edit Contact' : 'Add New Contact'}
            </DialogTitle>
            <DialogDescription>
              {selectedContact ? 'Update contact information' : 'Add a new contact to your database'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="font-medium">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="font-medium">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Corp"
                  className="bg-gray-50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this contact..."
                rows={4}
                className="bg-gray-50 border-gray-200 focus:bg-white transition-all resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                {selectedContact ? 'Update Contact' : 'Create Contact'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedContact?.name || selectedContact?.phoneNumber}? 
              This action cannot be undone.
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with columns: phoneNumber, name, email, company, notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4 group-hover:text-blue-500 transition-colors" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <span className="font-medium text-gray-900 block mb-1">Click to upload</span>
                <span className="text-sm text-gray-500">or drag and drop CSV file here</span>
              </label>
              {importFile && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-600 font-medium bg-blue-50 py-2 px-4 rounded-lg inline-flex">
                  <CheckCircle2 className="h-4 w-4" />
                  {importFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleImportCSV} disabled={!importFile} className="bg-black text-white hover:bg-gray-800">
              Import Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactManagement;
