import { useEffect } from 'react';
import { conversationAPI } from '../lib/api';
import { useConversationStore } from '../store/conversationStore';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader2, Search, MessageSquare, RefreshCw, Filter, MoreHorizontal, Phone, Video, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MessageThread } from '../components/MessageThread';
import { toast } from 'sonner';

const STATUS_TABS: Array<'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED'> = ['ALL', 'OPEN', 'PENDING', 'RESOLVED'];

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
  const showThread = Boolean(selectedConversationId);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
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
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return phone?.substring(0, 2).toUpperCase() || '??';
  };

  const getTypingIndicator = (conversationId: string) => {
    const users = typingUsers.get(conversationId);
    if (!users || users.size === 0) return null;
    return <span className="text-xs font-bold text-blue-600 animate-pulse">typing...</span>;
  };

  const renderConversationList = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="font-medium">Loading chats...</p>
        </div>
      );
    }

    if (filteredConversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-900 mb-1">No conversations</p>
          <p className="text-sm">
            {searchQuery ? 'Try adjusting your search' : 'New chats will appear here'}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => selectConversation(conversation.id)}
            className={`w-full text-left px-4 py-4 flex items-start gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedConversationId === conversation.id ? 'bg-blue-50/50 hover:bg-blue-50/50' : ''
            }`}
          >
            <div className="relative">
              <Avatar className="h-12 w-12 border border-gray-100">
                <AvatarFallback className={`font-bold ${
                  selectedConversationId === conversation.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {getInitials(conversation.contactName, conversation.contactPhone)}
                </AvatarFallback>
              </Avatar>
              {conversation.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className={`font-bold truncate ${
                  conversation.unreadCount > 0 ? 'text-black' : 'text-gray-700'
                }`}>
                  {conversation.contactName || conversation.contactPhone}
                </p>
                <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <p className={`text-sm truncate pr-2 ${
                  conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'
                }`}>
                  {getTypingIndicator(conversation.id) || (
                    conversation.status === 'RESOLVED' ? 'Resolved' : 'Tap to view messages'
                  )}
                </p>
                {conversation.status === 'OPEN' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* Conversations List Column */}
      <div
        className={`${showThread ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] border-r border-gray-200 bg-white h-full`}
      >
        {/* Header */}
        <div className="flex-none px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">Inbox</h1>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold border-0">
                {filteredConversations.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {isConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" title="Connected" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={loadConversations}
                className="h-8 w-8 text-gray-500 hover:text-black hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-black hover:bg-gray-100"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all font-medium"
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {STATUS_TABS.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {renderConversationList()}
        </div>
      </div>

      {/* Chat Area Column */}
      <div className={`${showThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-white relative`}>
        {showThread ? (
          <MessageThread conversationId={selectedConversationId!} onBack={() => selectConversation(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Select a conversation</h2>
            <p className="text-gray-500 max-w-sm">
              Choose a chat from the list to view messages, media, and contact details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
