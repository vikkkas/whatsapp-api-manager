# Frontend Documentation

## Architecture Overview

React 18 SPA with TypeScript, Vite build tool, TailwindCSS styling, Shadcn/ui components, and Zustand state management.

## Directory Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Shadcn/ui base components
│   │   ├── AppSidebar.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── MessageThread.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── AdminRoute.tsx
│   ├── contexts/         # React Context providers
│   │   ├── AuthContext.tsx     # Authentication state
│   │   └── WebSocketContext.tsx # Real-time updates
│   ├── hooks/            # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/              # Utilities and API client
│   │   ├── api.ts        # API client functions
│   │   ├── utils.ts      # Helper functions
│   │   └── phoneUtils.ts # Phone number formatting
│   ├── pages/            # Route components
│   │   ├── Login.tsx
│   │   ├── Index.tsx     # Dashboard
│   │   ├── Inbox.tsx
│   │   ├── SendMessage.tsx
│   │   ├── Templates.tsx
│   │   ├── Analytics.tsx
│   │   ├── Settings.tsx
│   │   └── UserManagement.tsx
│   ├── store/            # Zustand state stores
│   │   ├── authStore.ts
│   │   ├── conversationStore.ts
│   │   └── messageStore.ts
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
└── index.html            # HTML template
```

## State Management

### Zustand Stores

**authStore.ts** - Authentication state
```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user, token, refreshToken) => void;
  clearAuth: () => void;
}
```

**conversationStore.ts** - Conversations list and selected
```typescript
interface ConversationStore {
  conversations: Conversation[];
  selectedConversationId: string | null;
  setConversations: (conversations) => void;
  addConversation: (conversation) => void;
  updateConversation: (id, updates) => void;
  selectConversation: (id) => void;
}
```

**messageStore.ts** - Messages by conversation
```typescript
interface MessageStore {
  messagesByConversation: Record<string, Message[]>;
  addMessage: (conversationId, message) => void;
  updateMessage: (conversationId, messageId, updates) => void;
  setMessages: (conversationId, messages) => void;
}
```

## Context Providers

### AuthContext
Wraps auth store with convenient hooks and auto-restore from localStorage.

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  const handleLogin = async () => {
    await login(email, password);
  };
}
```

### WebSocketContext
Manages Socket.io connection and real-time event handling.

```tsx
import { useWebSocket } from '@/contexts/WebSocketContext';

function Component() {
  const { isConnected, joinConversation, leaveConversation } = useWebSocket();
  
  useEffect(() => {
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId]);
}
```

## API Client

Located in `src/lib/api.ts`. Provides typed API functions.

### Usage Example

```typescript
import { authAPI, messageAPI, analyticsAPI } from '@/lib/api';

// Login
const response = await authAPI.login(email, password);

// Send message
await messageAPI.send({
  to: '+1234567890',
  type: 'text',
  content: { text: 'Hello!' }
});

// Get analytics
const analytics = await analyticsAPI.getOverview(30);
```

### Available APIs

**authAPI**
- `login(email, password)` - User login
- `register(data)` - Create tenant
- `me()` - Get current user
- `refresh(refreshToken)` - Refresh token

**messageAPI**
- `list(params)` - List messages
- `get(id)` - Get message
- `send(data)` - Send message

**conversationAPI**
- `list(params)` - List conversations
- `get(id)` - Get conversation
- `update(id, data)` - Update conversation

**templateAPI**
- `list()` - List templates
- `create(data)` - Create template
- `get(id)` - Get template

**analyticsAPI**
- `getOverview(days)` - Get analytics
- `getMessages(days)` - Message analytics

**contactAPI**
- `list(params)` - List contacts
- `create(data)` - Create contact
- `export()` - Export CSV

**settingsAPI**
- `get()` - Get settings
- `update(data)` - Update settings

## Key Components

### DashboardLayout
Main layout wrapper with sidebar navigation.

```tsx
<DashboardLayout>
  <YourPageContent />
</DashboardLayout>
```

### ProtectedRoute
Route wrapper requiring authentication.

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### MessageThread
Real-time message list with auto-scroll and typing indicators.

**Props:**
```typescript
{
  conversationId: string;
  messages: Message[];
  onSendMessage: (text: string) => void;
}
```

### AppSidebar
Navigation sidebar with user menu and route links.

## Pages

### Login (`/login`)
User authentication form with email/password.

### Dashboard (`/`)
Overview with quick stats and recent activity.

### Inbox (`/inbox`)
Conversation list with message thread viewer.

**Features:**
- Real-time message updates
- Conversation search/filter
- Message composition
- Media upload support
- Typing indicators

### Send Message (`/send-message`)
Compose and send new messages.

**Features:**
- Multiple message types (text, image, video, audio, document)
- Template selection
- Contact picker
- Media upload with preview

### Templates (`/templates`)
WhatsApp message template management.

**Features:**
- Create/edit templates
- Template preview
- Status tracking (pending, approved, rejected)
- Category filter

### Analytics (`/analytics`)
Dashboard with charts and metrics.

**Features:**
- Message volume charts
- Delivery rate statistics
- Daily activity graph
- Status distribution

### Settings (`/settings`)
Tenant and WhatsApp configuration.

**Features:**
- WhatsApp API credentials
- Webhook configuration
- Business profile settings
- User preferences

### User Management (`/users`)
Manage tenant users (Admin/Owner only).

**Features:**
- User list
- Create/edit users
- Role assignment (Owner, Admin, Agent)
- User status

## Styling

### TailwindCSS
Utility-first CSS framework.

```tsx
<div className="flex items-center gap-4 p-6 bg-card rounded-lg shadow-md">
  <Button variant="default" size="lg">Click Me</Button>
</div>
```

### Shadcn/ui Components
Pre-built accessible components in `src/components/ui/`.

**Available Components:**
- Button, Input, Textarea, Select
- Card, Alert, Badge, Avatar
- Dialog, Sheet, Popover, Tooltip
- Table, Tabs, Accordion
- Form, Calendar, Command
- And many more...

**Usage:**
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button onClick={handleClick}>Action</Button>
  </CardContent>
</Card>
```

### Theme
CSS variables in `src/index.css` for theming.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}
```

## Routing

React Router v6 with nested routes.

```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={
    <ProtectedRoute>
      <DashboardLayout>
        <Index />
      </DashboardLayout>
    </ProtectedRoute>
  } />
  {/* More routes... */}
</Routes>
```

## Real-Time Features

### WebSocket Connection

Automatically connects when user is authenticated.

```typescript
// Auto-connects in WebSocketContext
const socket = io(BACKEND_URL, {
  auth: { token }
});

// Listen for events
socket.on('message:new', (message) => {
  // Add to store
  addMessage(message.conversationId, message);
  
  // Show notification
  toast.success(`New message from ${message.from}`);
});
```

### Event Handling

**Incoming Events:**
- `message:new` - New message received
- `message:status` - Status updated
- `conversation:updated` - Conversation changed
- `typing:start` / `typing:stop` - Typing indicators

**Outgoing Events:**
- `join-conversation` - Join room for updates
- `leave-conversation` - Leave room
- `typing-start` / `typing-stop` - Broadcast typing

## Forms

Using React Hook Form + Zod for validation.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });
  
  const onSubmit = async (data) => {
    await authAPI.login(data.email, data.password);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="email" control={form.control} />
        <FormField name="password" control={form.control} />
        <Button type="submit">Login</Button>
      </form>
    </Form>
  );
}
```

## Toast Notifications

Using Sonner for toast notifications.

```tsx
import { toast } from 'sonner';

toast.success('Message sent!');
toast.error('Failed to send message');
toast.loading('Sending...');
toast.info('Processing your request');
```

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup

Create `.env` file:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `AppSidebar.tsx`
4. Protect route if needed with `ProtectedRoute`

### Adding New Shadcn Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
# etc.
```

## Performance Optimization

### Code Splitting

Use lazy loading for routes:

```tsx
import { lazy, Suspense } from 'react';

const Analytics = lazy(() => import('./pages/Analytics'));

<Suspense fallback={<Loading />}>
  <Analytics />
</Suspense>
```

### Memo and Callbacks

```tsx
import { memo, useCallback, useMemo } from 'react';

const MemoizedComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    expensiveOperation(data), 
    [data]
  );
  
  const handleClick = useCallback(() => {
    doSomething();
  }, []);
  
  return <div onClick={handleClick}>{processedData}</div>;
});
```

## Testing

```bash
# Run tests
npm test

# Coverage
npm run test:coverage
```

## Building for Production

```bash
# Build
npm run build

# Output in dist/ folder
# Serve with any static server:
npx serve dist
```

## Deployment

### Vercel
```bash
vercel deploy
```

### Netlify
```bash
netlify deploy --prod
```

### Static Server
Serve the `dist/` folder with nginx, Apache, or any static file server.

**Nginx config:**
```nginx
server {
  listen 80;
  root /path/to/dist;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Environment Variables

Required:
- `VITE_BACKEND_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket server URL

Optional:
- None currently

## Troubleshooting

### Build Errors
- Clear `node_modules` and reinstall
- Delete `.vite` cache folder
- Check Node.js version (18+)

### WebSocket Not Connecting
- Verify `VITE_WS_URL` matches backend
- Check CORS settings on backend
- Verify JWT token is valid

### API Errors
- Check browser console and Network tab
- Verify `VITE_BACKEND_URL` is correct
- Ensure backend is running
- Check authentication token

## Best Practices

1. **Component Organization** - Keep components small and focused
2. **State Management** - Use Zustand for global state, local state for UI
3. **Type Safety** - Always define TypeScript interfaces
4. **Error Handling** - Use try/catch and show user-friendly errors
5. **Loading States** - Show loading indicators for async operations
6. **Accessibility** - Use semantic HTML and ARIA attributes
7. **Performance** - Lazy load routes, memo expensive components
8. **Code Style** - Follow ESLint rules, use Prettier
9. **Git Commits** - Write clear, descriptive commit messages
10. **Testing** - Write tests for critical user flows
