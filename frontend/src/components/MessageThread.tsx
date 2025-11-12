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
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow, format, isSameDay } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import toast from 'react-hot-toast';

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
      case 'SENT':
      case 'PENDING':
        return <Check className="h-3 w-3" />;
      case 'DELIVERED':
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'FAILED':
        return <span className="text-red-500 text-xs">!</span>;
      default:
        return null;
    }
  };

  const renderMessage = (message: any, index: number) => {
    const isOutbound = message.direction === 'OUTBOUND';
    const prevMessage = messages[index - 1];
    const showDateDivider = !prevMessage || !isSameDay(new Date(message.createdAt), new Date(prevMessage.createdAt));

    return (
      <div key={message.id}>
        {showDateDivider && (
          <div className="flex justify-center my-4">
            <Badge variant="outline" className="bg-gray-100">
              {format(new Date(message.createdAt), 'MMMM d, yyyy')}
            </Badge>
          </div>
        )}
        
        <div className={`flex mb-4 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] ${isOutbound ? 'order-2' : 'order-1'}`}>
            <Card className={`p-3 ${isOutbound ? 'bg-blue-500 text-white' : 'bg-white'}`}>
              {message.type === 'TEXT' && (
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
              )}
              
              {message.type === 'IMAGE' && (
                <div>
                  <img 
                    src={message.mediaUrl} 
                    alt="Image" 
                    className="rounded max-w-full h-auto mb-2"
                  />
                  {message.caption && <p className="text-sm">{message.caption}</p>}
                </div>
              )}
              
              {message.type === 'VIDEO' && (
                <div>
                  <video 
                    src={message.mediaUrl} 
                    controls 
                    className="rounded max-w-full h-auto mb-2"
                  />
                  {message.caption && <p className="text-sm">{message.caption}</p>}
                </div>
              )}
              
              {message.type === 'AUDIO' && (
                <audio src={message.mediaUrl} controls className="w-full" />
              )}
              
              {message.type === 'DOCUMENT' && (
                <div>
                  <a 
                    href={message.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-300 underline"
                  >
                    📄 {message.filename || 'Download Document'}
                  </a>
                </div>
              )}

              <div className={`flex items-center justify-between mt-1 text-xs ${isOutbound ? 'text-blue-100' : 'text-gray-500'}`}>
                <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
                {isOutbound && (
                  <span className="ml-2 flex items-center">
                    {getStatusIcon(message.status)}
                  </span>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {conversation.contactName?.[0] || conversation.contactPhone?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="font-semibold">{conversation.contactName || conversation.contactPhone}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Phone className="h-3 w-3" />
              <span>{conversation.contactPhone}</span>
              {isConnected && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  Live
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleResolve}>
              Mark as Resolved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive} className="text-red-600">
              Archive Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <Card className="p-3 bg-white">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-none p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
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
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || isSending}>
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
