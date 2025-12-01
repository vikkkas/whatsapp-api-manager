import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  Loader2,
  MessageSquare,
  Search,
  Zap,
} from 'lucide-react';
import { cannedResponseAPI } from '@/lib/api';
import { toast } from 'sonner';

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut: string;
  category?: string;
  isPublic: boolean;
  createdAt: string;
}

const CannedResponses = () => {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    shortcut: '',
    category: '',
    isPublic: true,
  });

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      setIsLoading(true);
      const response = await cannedResponseAPI.list();
      setResponses(response.responses || []);
    } catch (error) {
      toast.error('Failed to fetch canned responses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedResponse(null);
    setFormData({
      title: '',
      content: '',
      shortcut: '',
      category: '',
      isPublic: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (response: CannedResponse) => {
    setSelectedResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut,
      category: response.category || '',
      isPublic: response.isPublic,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (response: CannedResponse) => {
    setSelectedResponse(response);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedResponse) return;

    try {
      await cannedResponseAPI.delete(selectedResponse.id);
      toast.success('Canned response deleted');
      fetchResponses();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete canned response');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.shortcut) {
      toast.error('Title, content, and shortcut are required');
      return;
    }

    if (!formData.shortcut.startsWith('/')) {
      toast.error('Shortcut must start with /');
      return;
    }

    try {
      if (selectedResponse) {
        await cannedResponseAPI.update(selectedResponse.id, formData);
        toast.success('Canned response updated');
      } else {
        await cannedResponseAPI.create(formData);
        toast.success('Canned response created');
      }
      setIsDialogOpen(false);
      fetchResponses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save canned response');
    }
  };

  const filteredResponses = responses.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.shortcut.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Canned Responses</h1>
          <p className="text-gray-500 mt-1">Quick reply templates for faster customer support.</p>
        </div>
        <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800 shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          New Response
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">Total Responses</p>
                <p className="text-3xl font-bold mt-2">{responses.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Public</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {responses.filter(r => r.isPublic).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Categories</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {new Set(responses.filter(r => r.category).map(r => r.category)).size}
                </p>
              </div>
              <Search className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search responses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
        />
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium text-lg">No responses found</p>
              <p className="text-gray-500 mb-6">Create your first quick reply template.</p>
              <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                New Response
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-semibold text-gray-600">Title</TableHead>
                  <TableHead className="font-semibold text-gray-600">Shortcut</TableHead>
                  <TableHead className="font-semibold text-gray-600">Content</TableHead>
                  <TableHead className="font-semibold text-gray-600">Category</TableHead>
                  <TableHead className="font-semibold text-gray-600">Visibility</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id} className="hover:bg-gray-50/50 border-gray-100">
                    <TableCell className="font-medium text-gray-900">{response.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs border-blue-200 text-blue-700">
                        {response.shortcut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 truncate max-w-md">{response.content}</p>
                    </TableCell>
                    <TableCell>
                      {response.category ? (
                        <Badge variant="secondary" className="font-normal">
                          {response.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">No category</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={response.isPublic ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>
                        {response.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(response)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(response)} className="text-red-600">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedResponse ? 'Edit Response' : 'New Canned Response'}
            </DialogTitle>
            <DialogDescription>
              Create a quick reply template for faster customer support
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Welcome Message"
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut *</Label>
                <Input
                  id="shortcut"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  placeholder="/welcome"
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white font-mono"
                />
                <p className="text-xs text-gray-500">Must start with /</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Hi! Thanks for reaching out. How can I help you today?"
                required
                rows={4}
                className="bg-gray-50 border-gray-200 focus:bg-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Greetings"
                  className="bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.isPublic}
                      onChange={() => setFormData({ ...formData, isPublic: true })}
                      className="text-black"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.isPublic}
                      onChange={() => setFormData({ ...formData, isPublic: false })}
                      className="text-black"
                    />
                    <span className="text-sm">Private</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                {selectedResponse ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Canned Response</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedResponse?.title}"?
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

export default CannedResponses;
