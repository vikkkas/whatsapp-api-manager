import { useEffect, useRef, useState, useCallback } from 'react';
import { conversationAPI, messageAPI, settingsAPI, cannedResponseAPI, type Conversation } from '../lib/api';
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
  X,
  Smile,
  Mic,
  MousePointerClick
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { mediaAPI } from '../lib/api';
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

  // Canned Responses State
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [filteredResponses, setFilteredResponses] = useState<any[]>([]);

  // Interactive Message State
  const [isInteractiveDialogOpen, setIsInteractiveDialogOpen] = useState(false);
  const [interactiveBody, setInteractiveBody] = useState('');
  const [interactiveButtons, setInteractiveButtons] = useState(['', '', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Only re-run when conversationId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

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
    fetchSettings();
  }, []);

  // Load canned responses
  useEffect(() => {
    const loadCannedResponses = async () => {
      try {
        const response = await cannedResponseAPI.list();
        setCannedResponses(response.responses || []);
      } catch (error) {
        console.error('Failed to load canned responses', error);
      }
    };
    loadCannedResponses();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

  // Initial scroll on conversation load
  useEffect(() => {
    scrollToBottom('auto');
  }, [conversationId]);

  // Debug log for messages
  useEffect(() => {
    console.log('Messages updated:', messages.map(m => ({
      id: m.id,
      type: m.type,
      interactiveData: m.interactiveData,
      interactive: (m as any).interactive
    })));
  }, [messages]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!phoneNumberId) {
      toast.error('Configure your WhatsApp number in Settings first.');
      return;
    }

    setSending(true);
    try {
      const response = await mediaAPI.upload(file);
      const { url, mimetype, originalname } = response.data;
      
      let type: any = 'document';
      if (mimetype.startsWith('image/')) type = 'image';
      else if (mimetype.startsWith('video/')) type = 'video';
      else if (mimetype.startsWith('audio/')) type = 'audio';

      const sentMessage = await messageAPI.send({
        phoneNumberId,
        to: conversation!.contactPhone,
        type,
        mediaUrl: url,
        caption: originalname,
        filename: originalname,
      });
      
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
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to send file');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendInteractive = async () => {
    if (!interactiveBody.trim()) {
      toast.error('Body text is required');
      return;
    }
    
    if (!phoneNumberId) {
      toast.error('Configure your WhatsApp number in Settings first.');
      return;
    }

    const buttons = interactiveButtons
      .map((b, i) => ({ label: b.trim(), id: `btn-${Date.now()}-${i}` }))
      .filter(b => b.label);

    if (buttons.length === 0) {
      toast.error('Add at least one button');
      return;
    }

    // Validate button label length
    const invalidButton = buttons.find(b => b.label.length > 20);
    if (invalidButton) {
      toast.error(`Button label "${invalidButton.label}" is too long (max 20 chars)`);
      return;
    }

    // Validate duplicate buttons
    const labels = buttons.map(b => b.label.toLowerCase());
    if (new Set(labels).size !== labels.length) {
      toast.error('Button labels must be unique');
      return;
    }

    setSending(true);
    try {
      const sentMessage = await messageAPI.send({
        phoneNumberId,
        to: conversation!.contactPhone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: interactiveBody },
          action: {
            buttons: buttons.map(b => ({
              type: 'reply',
              reply: {
                id: b.id,
                title: b.label
              }
            }))
          }
        }
      });
      
      setIsInteractiveDialogOpen(false);
      setInteractiveBody('');
      setInteractiveButtons(['', '', '']);
      
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
    } catch (error) {
      console.error('Interactive message error:', error);
      toast.error('Failed to send buttons');
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-3 w-3 text-white/70" />;
      case 'SENT':
        return <Check className="h-3 w-3 text-white/70" />;
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3 text-white/70" />;
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-200" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-red-300" />;
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
          <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
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
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
          >
            <File className="h-8 w-8" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{message.filename || 'Document'}</p>
              <p className="text-xs opacity-70">Click to download</p>
            </div>
          </a>
        );

      case 'INTERACTIVE':
        return (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
            <div className="text-[10px] uppercase tracking-wider font-bold opacity-70 mt-1 flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" />
              Interactive Message
            </div>
          </div>
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
        <div className="text-[10px] uppercase tracking-wider font-bold opacity-70 mb-1">
          TEMPLATE: {message.templateName}
        </div>
        {message.text ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
        ) : (
          <p className="text-sm italic opacity-75">Template sent</p>
        )}
        {bodyParams.length > 0 && (
          <div className="rounded-md border border-white/20 bg-white/10 p-2 text-xs mt-2">
            {bodyParams.map((param: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="opacity-70">Variable {index + 1}</span>
                <span className="font-bold">
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
    // Debug logging
    if (message.type === 'INTERACTIVE') {
      console.log('Rendering INTERACTIVE message:', {
        id: message.id,
        direction: message.direction,
        text: message.text,
        interactiveData: message.interactiveData
      });
    }

    const isOutbound = message.direction === 'OUTBOUND';
    const prevMessage = messages[index - 1];
    const showDateDivider = !prevMessage || !isSameDay(new Date(message.createdAt), new Date(prevMessage.createdAt));
    const showTail = index === messages.length - 1 || messages[index + 1]?.direction !== message.direction;

    // Ensure interactiveData is an object
    let interactiveData = message.interactiveData;
    if (typeof interactiveData === 'string') {
      try {
        interactiveData = JSON.parse(interactiveData);
      } catch (e) {
        console.error('Failed to parse interactiveData', e);
      }
    }
    // Merge with optimistic interactive data if available
    if (!interactiveData && message.interactive) {
      interactiveData = message.interactive;
    }

    return (
      <div key={message.id}>
        {showDateDivider && (
          <div className="flex justify-center my-6">
            <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 shadow-none px-3 py-1 text-xs font-bold border border-gray-200">
              {format(new Date(message.createdAt), 'MMMM d, yyyy')}
            </Badge>
          </div>
        )}
        
        <div className={`flex mb-2 px-4 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`max-w-[75%] sm:max-w-[65%] ${isOutbound ? 'ml-auto' : 'mr-auto'}`}
          >
            {!isOutbound && (
              <p className="text-xs font-bold text-gray-400 mb-1 ml-1">
                {conversation.contactName || message.from}
              </p>
            )}
            <div 
              className={`
                relative px-4 py-3 shadow-sm text-sm
                ${isOutbound 
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-100'
                }
              `}
            >
              {/* Message content */}
              {message.type === 'TEXT' && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.text}
                </p>
              )}
              {message.type === 'INTERACTIVE' && (
                <div className="space-y-2">
                  {/* Handle Inbound Button Reply */}
                  {interactiveData?.type === 'button_reply' ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 text-blue-600 p-1.5 rounded-full">
                        <MousePointerClick className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs opacity-70 mb-0.5">Selected Option</p>
                        <p className="font-bold">
                          {interactiveData.button_reply?.title || message.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Handle Outbound Button Message OR Legacy/Fallback */
                    <>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {interactiveData?.body?.text || message.text || 'Please select an option:'}
                      </p>
                      
                      {/* Display buttons if available (Outbound) */}
                      {interactiveData?.action?.buttons?.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {interactiveData.action.buttons.map((btn: any, index: number) => (
                            <button
                              key={index}
                              disabled
                              className={`
                                w-full px-4 py-2.5 text-sm font-medium rounded-lg border
                                transition-colors cursor-not-allowed text-left flex justify-between items-center
                                ${isOutbound 
                                  ? 'bg-blue-500/10 border-blue-400/30 text-blue-100' 
                                  : 'bg-white border-gray-300 text-gray-700'
                                }
                              `}
                            >
                              <span>{btn.reply?.title || btn.label}</span>
                              <MousePointerClick className="h-3 w-3 opacity-50" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* Fallback for legacy messages or missing button data */
                        isOutbound && !interactiveData && (
                          <div className="mt-2 pt-2 border-t border-gray-200/20">
                            <p className="text-xs opacity-75 italic">
                              📱 Interactive message
                            </p>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              )}
              {message.type === 'TEMPLATE' && renderTemplateMessage(message)}
              {message.type !== 'TEXT' && message.type !== 'TEMPLATE' && message.type !== 'INTERACTIVE' && renderMediaPreview(message)}

              {/* Timestamp and status */}
              <div className={`flex items-center justify-end gap-1 mt-1 ${
                isOutbound ? 'text-blue-100' : 'text-gray-400'
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
      <div className="flex flex-col items-center justify-center h-full bg-white text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-none px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 md:hidden text-gray-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10 flex-shrink-0 border border-gray-100">
            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
              {conversation.contactName?.[0]?.toUpperCase() || conversation.contactPhone?.[0] || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {!isEditingName ? (
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-bold text-gray-900 truncate text-lg">
                  {conversation.contactName || 'Unknown'}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-gray-900"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={contactNameInput}
                  onChange={(e) => setContactNameInput(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="h-8 w-8 bg-black text-white hover:bg-gray-800"
                  disabled={updatingName}
                  onClick={handleUpdateContactName}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsEditingName(false);
                    setContactNameInput(conversation.contactName || '');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Phone className="h-3 w-3" />
              <span className="truncate">{conversation.contactPhone}</span>
              {isConnected && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Online
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-black">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-black">
            <Video className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-black">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleResolve} className="cursor-pointer font-medium">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark as Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive} className="text-red-600 cursor-pointer font-medium">
                <XCircle className="h-4 w-4 mr-2" />
                Archive Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto py-6 px-2 sm:px-6 scroll-smooth bg-gray-50/30"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md border border-gray-100">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">
                Start the conversation by sending a message below.
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
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none px-6 py-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2 pb-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-black hover:bg-gray-100 rounded-full"
              title="Attach File"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*,video/*";
                  fileInputRef.current.click();
                }
              }}
              className="text-gray-400 hover:text-black hover:bg-gray-100 rounded-full"
              title="Send Image/Video"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            
            <Dialog open={isInteractiveDialogOpen} onOpenChange={setIsInteractiveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-black hover:bg-gray-100 rounded-full"
                  title="Send Buttons"
                >
                  <MousePointerClick className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Interactive Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Message Body</Label>
                    <Input
                      value={interactiveBody}
                      onChange={(e) => setInteractiveBody(e.target.value)}
                      placeholder="Enter your message text..."
                      maxLength={1024}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Buttons (Max 3)</Label>
                    {interactiveButtons.map((btn, idx) => (
                      <div key={idx} className="relative">
                        <Input
                          value={btn}
                          onChange={(e) => {
                            const newButtons = [...interactiveButtons];
                            newButtons[idx] = e.target.value;
                            setInteractiveButtons(newButtons);
                          }}
                          placeholder={`Button ${idx + 1} Label`}
                          maxLength={20}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                          {btn.length}/20
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInteractiveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSendInteractive} disabled={isSending}>Send Message</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 relative">
            {showCannedResponses && (
              <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-50">
                {filteredResponses.map((response) => (
                  <button
                    key={response.id}
                    type="button"
                    onClick={() => {
                      const newValue = newMessage.replace(/\/([\w-]*)$/, response.content);
                      setNewMessage(newValue);
                      setShowCannedResponses(false);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-blue-600">{response.shortcut}</span>
                      {response.category && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{response.category}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{response.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{response.content}</p>
                  </button>
                ))}
              </div>
            )}
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);
                handleTyping();

                // Check for canned response trigger "/"
                const match = value.match(/\/([\w-]*)$/);
                if (match) {
                  const query = match[1].toLowerCase();
                  const filtered = cannedResponses.filter(
                    (r) => 
                      r.shortcut.toLowerCase().includes(query) || 
                      r.title.toLowerCase().includes(query)
                  );
                  setFilteredResponses(filtered);
                  setShowCannedResponses(filtered.length > 0);
                } else {
                  setShowCannedResponses(false);
                }
              }}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="pr-12 py-6 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className="rounded-xl h-12 w-12 p-0 bg-black hover:bg-gray-800 text-white shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
