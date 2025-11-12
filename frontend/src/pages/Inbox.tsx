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
import { Loader2, Search, MessageSquare, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MessageThread } from '../components/MessageThread';
import toast from 'react-hot-toast';

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Conversations</h1>
            {isConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadConversations}>
            Refresh
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'OPEN', 'PENDING', 'RESOLVED'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status as any)}
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
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No conversations found</p>
            <p className="text-sm">
              {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const typingIndicator = getTypingIndicator(conversation.id);
              
              return (
                <Card
                  key={conversation.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors border-0 border-b rounded-none"
                  onClick={() => selectConversation(conversation.id)}
                >
                  <div className="p-4 flex gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getInitials(conversation.contactName, conversation.contactPhone)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">
                          {conversation.contactName || conversation.contactPhone}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {typingIndicator || conversation.contactPhone}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(conversation.status)} text-white border-0 text-xs`}
                          >
                            {conversation.status}
                          </Badge>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {conversation.assignedAgent && (
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned to: {conversation.assignedAgent.name}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
