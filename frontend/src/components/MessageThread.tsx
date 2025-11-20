import { useEffect, useRef, useState, useCallback } from 'react';
import { conversationAPI, messageAPI, settingsAPI, type Conversation } from '../lib/api';
import { useConversationStore } from '../store/conversationStore';
import { useMessageStore } from '../store/messageStore';
import { useWebSocket } from '../contexts/WebSocketContext';
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
  MessageSquare,
  Edit3,
  X
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
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
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { messagesByConversation, isSending, setMessages, setSending, addMessage } = useMessageStore();
  const { typingUsers, resetUnreadCount, updateConversation: updateConversationStore } = useConversationStore();
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

  useEffect(() => {
    setContactNameInput(conversation?.contactName || '');
  }, [conversation?.contactName]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.get();
        setPhoneNumberId(response.settings?.waba?.phoneNumberId || '');
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    };

    fetchSettings();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom('auto');
  }, [conversationId]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
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
    if (!phoneNumberId) {
      toast.error('Configure your WhatsApp number in Settings first.');
      return;
    }

    setSending(true);
    stopTyping(conversationId);

    try {
      const sentMessage = await messageAPI.send({
        phoneNumberId,
        to: conversation.contactPhone,
        type: 'text',
        text: newMessage,
      });

      setNewMessage('');
      inputRef.current?.focus();
      addMessage(conversationId, sentMessage);
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              lastMessageAt: sentMessage.createdAt,
              messages: prev.messages ? [...prev.messages, sentMessage] : [sentMessage],
            }
          : prev
      );
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

  const handleUpdateContactName = async () => {
    if (!conversation) return;
    if (!contactNameInput.trim()) {
      toast.error('Contact name cannot be empty');
      return;
    }

    setUpdatingName(true);
    try {
      const updated = await conversationAPI.update(conversationId, {
        contactName: contactNameInput.trim(),
      });
      setConversation((prev) => (prev ? { ...prev, contactName: updated.contactName } : prev));
      updateConversationStore(conversationId, { contactName: updated.contactName });
      toast.success('Contact name updated');
      setIsEditingName(false);
    } catch (error) {
      toast.error('Failed to update contact name');
      setContactNameInput(conversation.contactName || '');
    } finally {
      setUpdatingName(false);
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

  const renderTemplateMessage = (message: any) => {
    const params = Array.isArray(message.templateParams) ? message.templateParams : [];
    const bodyParams =
      params.find((component) => (component.type || '').toLowerCase() === 'body')
        ?.parameters || [];

    return (
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
          Template • {message.templateName || 'WhatsApp Template'}
        </div>
        {message.text ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
        ) : (
          <p className="text-sm italic opacity-75">Template sent</p>
        )}
        {bodyParams.length > 0 && (
          <div className="rounded-md border border-white/20 bg-white/10 p-2 text-xs">
            {bodyParams.map((param: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="text-gray-500">Variable {index + 1}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {param.text || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
            <Badge variant="secondary" className="bg-white text-slate-600 shadow-sm px-3 py-1 text-xs font-medium">
              {format(new Date(message.createdAt), 'MMMM d, yyyy')}
            </Badge>
          </div>
        )}
        
        <div className={`flex mb-2 px-4 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`max-w-[75%] sm:max-w-[65%] ${isOutbound ? 'ml-auto' : 'mr-auto'}`}
          >
            {!isOutbound && (
              <p className="text-xs font-medium text-gray-500 mb-1">
                {conversation.contactName || message.from}
              </p>
            )}
            <div 
              className={`
                relative px-4 py-2 rounded-2xl shadow-sm
                ${isOutbound 
                  ? 'bg-[#e4e0ff] text-slate-900 rounded-br-md border border-[#d5cffb]'
                  : 'bg-white text-slate-900 rounded-bl-md border border-gray-200'
                }
                ${showTail && isOutbound ? 'rounded-br-sm' : ''}
                ${showTail && !isOutbound ? 'rounded-bl-sm' : ''}
              `}
            >
              {/* Message content */}
              {message.type === 'TEXT' && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.text}
                </p>
              )}
              {message.type === 'TEMPLATE' && renderTemplateMessage(message)}
              {message.type !== 'TEXT' && message.type !== 'TEMPLATE' && renderMediaPreview(message)}

              {/* Timestamp and status */}
              <div className={`flex items-center justify-end gap-1 mt-1 ${
                isOutbound ? 'text-[#6d5ae0]' : 'text-slate-500'
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
      <div className="flex flex-col items-center justify-center h-full bg-[#f6f7fb] text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-[#7c6cf0] mb-4" />
        <p className="font-medium">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f9f9ff]">
      {/* Header */}
      <div className="flex-none px-4 py-4 bg-gradient-to-r from-[#f6f3ff] to-white text-slate-900 shadow-sm flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-white">
            <AvatarFallback className="bg-[#ede9ff] text-[#4c47ff] font-semibold">
              {conversation.contactName?.[0]?.toUpperCase() || conversation.contactPhone?.[0] || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-1">
            {!isEditingName ? (
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-semibold text-slate-900 truncate">
                  {conversation.contactName || 'Unknown'}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={contactNameInput}
                  onChange={(e) => setContactNameInput(e.target.value)}
                  className="h-9"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  disabled={updatingName}
                  onClick={handleUpdateContactName}
                  className="bg-[#4c47ff] text-white hover:bg-[#3c3add]"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingName(false);
                    setContactNameInput(conversation.contactName || '');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Phone className="h-3 w-3" />
              <span className="truncate">{conversation.contactPhone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && (
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
              Live
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
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

      {/* Messages Area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto py-6 px-2 sm:px-6"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(247,244,255,0.7) 0%, rgba(249,249,255,0.4) 35%, #f9f9ff 100%)",
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md border border-slate-100">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-700 mb-2">No messages yet</p>
              <p className="text-sm text-slate-500">
                Start the conversation by sending a message below
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {messages.map((message, index) => renderMessage(message, index))}
            </div>
            
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

      {/* Input Area */}
      <div className="flex-none px-4 py-4 bg-white border-t border-slate-100">
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
              className="pr-10 py-6 rounded-2xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-[#4c47ff] focus:border-transparent"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className="rounded-2xl h-12 w-12 p-0 bg-[#4c47ff] hover:bg-[#3c3add] text-white shadow-lg disabled:opacity-50"
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
