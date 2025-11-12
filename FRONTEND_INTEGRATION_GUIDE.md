# 🚀 Frontend Integration - Quick Start Guide

## Current Status
✅ Backend API complete and running on `http://localhost:3000`  
✅ New API client created at `frontend/src/lib/api-new.ts`  
🔄 Frontend needs to be connected to backend

---

## Step-by-Step Frontend Integration

### Step 1: Switch to New API Client (5 minutes)

```bash
cd frontend/src/lib
mv api.ts api-old.ts
mv api-new.ts api.ts
```

Or manually:
1. Rename `api.ts` to `api-old.ts` (backup)
2. Rename `api-new.ts` to `api.ts`

---

### Step 2: Update Login Page (10 minutes)

**File:** `frontend/src/pages/Login.tsx`

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(email, password);
      console.log('Login successful:', response.user);
      navigate('/inbox');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">WhatsApp SaaS Login</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={email}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <p>Demo Credentials:</p>
          <p>Email: admin@demo.com</p>
          <p>Password: admin123</p>
        </div>
      </Card>
    </div>
  );
}
```

---

### Step 3: Update Inbox Page (15 minutes)

**File:** `frontend/src/pages/Inbox.tsx`

```tsx
import { useState, useEffect } from 'react';
import { conversationAPI, type Conversation } from '../lib/api';
import { Card } from '../components/ui/card';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
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

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Conversation List */}
      <div className="w-1/3 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Conversations</h2>
        </div>

        <div className="divide-y">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                selectedId === conv.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-full h-full flex items-center justify-center text-white font-bold">
                    {conv.contactName?.[0] || conv.contactPhone[0]}
                  </div>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate">
                      {conv.contactName || conv.contactPhone}
                    </h3>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 truncate">{conv.contactPhone}</p>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                  </p>
                </div>

                <Badge variant={conv.status === 'OPEN' ? 'default' : 'secondary'}>
                  {conv.status}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        {selectedId ? (
          <p>Select a conversation to view messages</p>
        ) : (
          <p className="text-gray-500">No conversation selected</p>
        )}
      </div>
    </div>
  );
}
```

---

### Step 4: Test the Integration (5 minutes)

1. **Start Backend** (if not running):
```bash
cd backend
npm run dev
```

2. **Start Frontend**:
```bash
cd frontend
npm run dev
```

3. **Test Login**:
   - Go to `http://localhost:5173/login`
   - Use credentials: `admin@demo.com` / `admin123`
   - Should redirect to `/inbox`

4. **Verify Conversations Load**:
   - Check browser console for API calls
   - Should see 5 demo conversations

---

### Step 5: Add Message Thread View (20 minutes)

Create a new component: `frontend/src/components/MessageThread.tsx`

```tsx
import { useState, useEffect } from 'react';
import { conversationAPI, messageAPI, type Conversation, type Message } from '../lib/api';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  conversationId: string;
}

export function MessageThread({ conversationId }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    const data = await conversationAPI.get(conversationId);
    setConversation(data);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation) return;

    setSending(true);
    try {
      await messageAPI.send({
        phoneNumberId: '1234567890', // Replace with actual phone number ID
        to: conversation.contactPhone,
        type: 'text',
        text: newMessage,
      });

      setNewMessage('');
      loadConversation(); // Reload to show new message
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-bold">{conversation.contactName || conversation.contactPhone}</h2>
        <p className="text-sm text-gray-600">{conversation.contactPhone}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[70%] p-3 ${
                msg.direction === 'OUTBOUND'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <p>{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-gray-500'}`}>
                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
              </p>
            </Card>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
```

Then update `Inbox.tsx` to use it:

```tsx
// Add to imports
import { MessageThread } from '../components/MessageThread';

// Replace the "Message Thread" section:
<div className="flex-1">
  {selectedId ? (
    <MessageThread conversationId={selectedId} />
  ) : (
    <div className="flex items-center justify-center h-full text-gray-500">
      Select a conversation to view messages
    </div>
  )}
</div>
```

---

## 🎯 Success Checklist

After completing the above steps, you should be able to:

- ✅ Login with demo credentials
- ✅ See list of 5 conversations
- ✅ Click on a conversation to view messages
- ✅ Send a new message (will fail with dummy credentials, but UI works)
- ✅ See message timestamps
- ✅ Navigate between conversations

---

## 🐛 Troubleshooting

### CORS Error
If you see CORS errors:
1. Check backend `.env` has `FRONTEND_URL=http://localhost:5173`
2. Restart backend server
3. Clear browser cache

### 401 Unauthorized
If API calls fail with 401:
1. Check localStorage has `authToken`
2. Verify token isn't expired (tokens last 7 days)
3. Try logging in again

### No Data Showing
If conversations don't load:
1. Open browser dev tools > Network tab
2. Check API calls to `/api/conversations`
3. Verify backend is running on port 3000
4. Check backend logs for errors

---

## 📦 Required Packages

Frontend should already have these, but if missing:

```bash
npm install date-fns  # For time formatting
```

---

## 🚀 Next Steps

After basic integration works:

1. **Add Real-time Updates** - Poll every 5 seconds or use WebSockets
2. **Add Image Upload** - For sending media messages
3. **Add Templates** - UI for sending template messages
4. **Add Analytics** - Dashboard charts
5. **Add Settings** - Configure WABA credentials
6. **Add User Management** - Invite agents

---

**Estimated Time:** 1-2 hours for full basic integration  
**Difficulty:** Moderate  
**Support:** Backend running and ready to test against!
