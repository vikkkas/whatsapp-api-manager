import { useEffect } from 'react';
import { conversationAPI } from '../lib/api';
import { useConversationStore } from '../store/conversationStore';
import { useMessageStore } from '../store/messageStore';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader2, Search, MessageSquare, Filter, RefreshCw, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MessageThread } from '../components/MessageThread';
import { toast } from 'sonner';

export default function Inbox() {
  const {
    conversations,
    selectedConversationId,
    searchQuery,
    statusFilter,
    isLoading,
    typingUsers,
    setConversations,
    selectConversation,
    setSearchQuery,
    setStatusFilter,
    setLoading,
  } = useConversationStore();

  const { isConnected } = useWebSocket();

  useEffect(() => {
    loadConversations();
  }, [statusFilter]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      
      const data = await conversationAPI.list(params);
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.contactName?.toLowerCase().includes(query) ||
      conv.contactPhone.toLowerCase().includes(query)
    );
  });

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return phone?.substring(0, 2).toUpperCase() || '??';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-500';
      case 'PENDING':
        return 'bg-yellow-500';
      case 'RESOLVED':
        return 'bg-blue-500';
      case 'ARCHIVED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypingIndicator = (conversationId: string) => {
    const users = typingUsers.get(conversationId);
    if (!users || users.size === 0) return null;
    
    return (
      <span className="text-xs text-gray-500 italic">
        typing...
      </span>
    );
  };

  if (selectedConversationId) {
    return (
      <MessageThread
        conversationId={selectedConversationId}
        onBack={() => selectConversation(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Modern */}
      <div className="flex-none px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
              <p className="text-sm text-gray-600">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadConversations}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['ALL', 'OPEN', 'PENDING', 'RESOLVED'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status as 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'ARCHIVED')}
                className={`flex-shrink-0 ${
                  statusFilter === status 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : ''
                }`}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600 font-medium">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 px-4">
            <div className="bg-gray-50 p-12 rounded-2xl text-center max-w-md">
              <MessageSquare className="h-20 w-20 mb-6 opacity-20 mx-auto" />
              <p className="text-xl font-semibold text-gray-700 mb-2">No conversations found</p>
              <p className="text-sm text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search or filters' 
                  : 'New conversations will appear here'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => {
              const typingIndicator = getTypingIndicator(conversation.id);
              
              return (
                <div
                  key={conversation.id}
                  className="cursor-pointer hover:bg-gray-50 transition-all duration-200 border-l-4 border-transparent hover:border-l-blue-500"
                  onClick={() => selectConversation(conversation.id)}
                >
                  <div className="px-6 py-4 flex gap-4">
                    <Avatar className="h-14 w-14 flex-shrink-0 ring-2 ring-gray-100">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold text-lg">
                        {getInitials(conversation.contactName, conversation.contactPhone)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate text-lg">
                          {conversation.contactName || conversation.contactPhone}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2 font-medium">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {typingIndicator || (
                            <span className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {conversation.contactPhone}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(conversation.status)} text-white border-0 text-xs px-2 py-0.5 font-medium`}
                          >
                            {conversation.status}
                          </Badge>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {conversation.assignedAgent && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                          Assigned to: {conversation.assignedAgent.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
