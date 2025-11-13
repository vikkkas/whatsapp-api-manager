import { useEffect, useRef, useState, useCallback } from 'react';
import { conversationAPI, messageAPI, type Conversation } from '../lib/api';
import { useConversationStore } from '../store/conversationStore';
import { useMessageStore } from '../store/messageStore';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Phone, 
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  XCircle,
  Paperclip,
  Image as ImageIcon,
  Video,
  File,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow, format, isSameDay } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';

interface Props {
  conversationId: string;
  onBack?: () => void;
}

export function MessageThread({ conversationId, onBack }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { messagesByConversation, isSending, setMessages, setSending } = useMessageStore();
  const { typingUsers, resetUnreadCount } = useConversationStore();
  const { joinConversation, leaveConversation, startTyping, stopTyping, isConnected } = useWebSocket();

  const messages = messagesByConversation.get(conversationId) || [];
  const typingUserIds = typingUsers.get(conversationId);
  const isTyping = typingUserIds && typingUserIds.size > 0;

  // Load conversation and messages
  const loadConversation = useCallback(async () => {
    try {
      const data = await conversationAPI.get(conversationId);
      setConversation(data);
      
      if (data.messages) {
        setMessages(conversationId, data.messages);
      }
      
      // Reset unread count
      resetUnreadCount(conversationId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId, setMessages, resetUnreadCount]);

  // Join conversation room on mount
  useEffect(() => {
    loadConversation();
    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
      stopTyping(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, loadConversation, stopTyping]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    // Start typing indicator
    startTyping(conversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !conversation || isSending) return;

    setSending(true);
    stopTyping(conversationId);

    try {
      await messageAPI.send({
        phoneNumberId: '1234567890', // TODO: Get from settings/WABA credentials
        to: conversation.contactPhone,
        type: 'text',
        text: newMessage,
      });

      setNewMessage('');
      inputRef.current?.focus();
      
      // Reload conversation to get the new message
      setTimeout(() => loadConversation(), 500);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleArchive = async () => {
    try {
      await conversationAPI.archive(conversationId);
      toast.success('Conversation archived');
      onBack?.();
    } catch (error) {
      toast.error('Failed to archive conversation');
    }
  };

  const handleResolve = async () => {
    try {
      await conversationAPI.update(conversationId, { status: 'RESOLVED' });
      toast.success('Conversation resolved');
      loadConversation();
    } catch (error) {
      toast.error('Failed to resolve conversation');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'SENT':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const renderMediaPreview = (message: any) => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <div className="relative group">
            <img 
              src={message.mediaUrl} 
              alt="Image" 
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '300px', objectFit: 'cover' }}
            />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        );
      
      case 'VIDEO':
        return (
          <div>
            <video 
              src={message.mediaUrl} 
              controls 
              className="rounded-lg max-w-full h-auto"
              style={{ maxHeight: '300px' }}
            />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        );
      
      case 'AUDIO':
        return (
          <div className="flex items-center gap-2 p-2 bg-white bg-opacity-10 rounded-lg">
            <div className="flex-1">
              <audio src={message.mediaUrl} controls className="w-full" />
            </div>
          </div>
        );
      
      case 'DOCUMENT':
        return (
          <a 
            href={message.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all"
          >
            <File className="h-8 w-8" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{message.filename || 'Document'}</p>
              <p className="text-xs opacity-70">Click to download</p>
            </div>
          </a>
        );
      
      default:
        return null;
    }
  };

  const renderMessage = (message: any, index: number) => {
    const isOutbound = message.direction === 'OUTBOUND';
    const prevMessage = messages[index - 1];
    const showDateDivider = !prevMessage || !isSameDay(new Date(message.createdAt), new Date(prevMessage.createdAt));
    const showTail = index === messages.length - 1 || messages[index + 1]?.direction !== message.direction;

    return (
      <div key={message.id}>
        {showDateDivider && (
          <div className="flex justify-center my-6">
            <Badge variant="secondary" className="bg-white shadow-sm px-3 py-1 text-xs font-medium">
              {format(new Date(message.createdAt), 'MMMM d, yyyy')}
            </Badge>
          </div>
        )}
        
        <div className={`flex mb-2 px-4 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`max-w-[75%] sm:max-w-[65%] ${isOutbound ? 'ml-auto' : 'mr-auto'}`}
          >
            <div 
              className={`
                relative px-4 py-2 rounded-2xl shadow-sm
                ${isOutbound 
                  ? 'bg-blue-500 text-white rounded-br-md' 
                  : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                }
                ${showTail && isOutbound ? 'rounded-br-sm' : ''}
                ${showTail && !isOutbound ? 'rounded-bl-sm' : ''}
              `}
            >
              {/* Message content */}
              {message.type === 'TEXT' ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.text}
                </p>
              ) : (
                renderMediaPreview(message)
              )}

              {/* Timestamp and status */}
              <div className={`flex items-center justify-end gap-1 mt-1 ${
                isOutbound ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span className="text-[10px] font-medium">
                  {format(new Date(message.createdAt), 'HH:mm')}
                </span>
                {isOutbound && (
                  <span className="flex items-center">
                    {getStatusIcon(message.status)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 font-medium">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header - Modern WhatsApp-like */}
      <div className="flex-none px-4 py-3 bg-white border-b shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-blue-100">
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
              {conversation.contactName?.[0]?.toUpperCase() || conversation.contactPhone?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {conversation.contactName || 'Unknown'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Phone className="h-3 w-3" />
              <span className="truncate">{conversation.contactPhone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
              Live
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleResolve} className="cursor-pointer">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark as Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive} className="text-red-600 cursor-pointer">
                <XCircle className="h-4 w-4 mr-2" />
                Archive Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area - WhatsApp-like background */}
      <div 
        className="flex-1 overflow-y-auto py-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#f0f2f5'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">
                Start the conversation by sending a message below
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start mb-4 px-4">
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Modern design */}
      <div className="flex-none px-4 py-3 bg-white border-t shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="pr-10 py-6 rounded-full border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className="rounded-full h-12 w-12 p-0 bg-blue-500 hover:bg-blue-600 shadow-lg disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
