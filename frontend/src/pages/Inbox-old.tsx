import { useState, useEffect } from 'react';
import { conversationAPI, type Conversation } from '../lib/api';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Loader2, Search, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MessageThread } from '../components/MessageThread';

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
    // Poll for new conversations every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const data = await conversationAPI.list({ limit: 50 });
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contactPhone.includes(searchQuery)
  );

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return phone?.substring(0, 2) || '??';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversation List */}
      <div className="w-96 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations
          </h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedId === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {getInitials(conv.contactName, conv.contactPhone)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold truncate text-gray-900">
                          {conv.contactName || conv.contactPhone}
                        </h3>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2 flex-shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 truncate">{conv.contactPhone}</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                        </p>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(conv.status)}`} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedId ? (
          <MessageThread 
            conversationId={selectedId} 
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Select a conversation to view messages</p>
              <p className="text-sm mt-2">Choose a conversation from the list to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
