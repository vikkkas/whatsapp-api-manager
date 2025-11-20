import { useEffect } from 'react';
import { conversationAPI } from '../lib/api';
import { useConversationStore } from '../store/conversationStore';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader2, Search, MessageSquare, RefreshCw } from 'lucide-react';
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
    return <span className="text-xs text-[#4c47ff]">typing…</span>;
  };

  const renderConversationList = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin text-[#7c6cf0] mb-4" />
          <p>Loading conversations…</p>
        </div>
      );
    }

    if (filteredConversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 px-4">
          <div className="bg-slate-50 p-10 rounded-3xl text-center max-w-md border border-slate-100">
            <MessageSquare className="h-14 w-14 mb-4 text-slate-300 mx-auto" />
            <p className="text-lg font-semibold mb-1 text-slate-800">No conversations found</p>
            <p className="text-sm text-slate-500">
              {searchQuery ? 'Try adjusting your search or filters' : 'New conversations will appear here'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => selectConversation(conversation.id)}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-2xl border border-transparent transition ${
              selectedConversationId === conversation.id
                ? 'bg-[#f2f0ff] border-[#e0ddff]'
                : 'bg-white hover:border-[#ece9ff]'
            }`}
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-[#ede9ff] text-[#4c47ff]">
                {getInitials(conversation.contactName, conversation.contactPhone)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold truncate text-slate-900">
                  {conversation.contactName || conversation.contactPhone}
                </p>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-slate-500 truncate">
                {conversation.status === 'RESOLVED' ? 'Resolved' : 'Tap to view messages'}
              </p>
              {getTypingIndicator(conversation.id)}
            </div>
            {conversation.unreadCount > 0 && (
              <span className="bg-[#f04f87]/10 text-[#f04f87] rounded-full px-2 py-1 text-xs font-semibold">
                {conversation.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full bg-[#f6f7fb] text-slate-900 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Conversations column */}
      <div
        className={`${showThread ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[360px] bg-white border-r border-slate-100 overflow-hidden`}
      >
        <div className="flex-none px-4 py-4 border-b border-slate-100 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#efe9ff] rounded-2xl text-[#4c47ff]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Conversations</h1>
                <p className="text-sm text-slate-500">
                  {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadConversations}
                className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={`flex-shrink-0 rounded-full border ${
                    statusFilter === status
                      ? 'bg-[#4c47ff] border-[#4c47ff] text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">{renderConversationList()}</div>
      </div>

      {/* Message column */}
      <div className={`${showThread ? 'flex' : 'hidden md:flex'} flex-1 min-h-0 bg-[#f9f9ff] overflow-hidden`}>
        {showThread ? (
          <div className="flex-1 min-h-0">
            <MessageThread conversationId={selectedConversationId!} onBack={() => selectConversation(null)} />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-slate-400">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-lg font-medium text-slate-700">Select a conversation to start messaging</p>
              <p className="text-sm text-slate-500">Choose a chat from the left to view the full timeline.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
