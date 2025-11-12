# WebSocket Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the WebSocket real-time messaging functionality end-to-end.

## ✅ Prerequisites

1. **Backend Running**
   - MongoDB connected
   - Redis connected
   - WebSocket server initialized (check for "🔌 WebSocket server initialized" log)

2. **Frontend Running**
   - Development server on port 5173
   - All dependencies installed

3. **Admin User Created**
   - Use `npm run create-admin` in backend
   - Note the email and password

## 🧪 Test Scenarios

### Test 1: Login and WebSocket Connection

**Objective:** Verify WebSocket connects after successful login

**Steps:**
1. Open browser DevTools (F12) → Network tab → WS filter
2. Navigate to `http://localhost:5173/login`
3. Login with admin credentials
4. Check Network tab for WebSocket connection to `ws://localhost:5000`
5. Check Console for `[WebSocket] Connected successfully` log

**Expected Results:**
- ✅ WebSocket connection established
- ✅ "Live" badge appears in Inbox header
- ✅ No connection errors in console

**Troubleshooting:**
- If no WebSocket connection: Check backend logs for JWT auth errors
- If connection drops: Check CORS settings in backend
- If "Live" badge doesn't appear: Check WebSocketProvider in App.tsx

---

### Test 2: Real-time Message Broadcasting

**Objective:** Verify new messages broadcast to all connected clients

**Steps:**
1. Open 2 browser windows side by side (Window A and Window B)
2. Login to both windows with same admin account
3. In Window A: Open a conversation
4. In Window B: Keep Inbox view open
5. In Window A: Send a text message
6. Watch Window B inbox

**Expected Results:**
- ✅ Message appears in Window A MessageThread immediately
- ✅ Window B Inbox shows updated preview
- ✅ Window B unread count increases
- ✅ No page refresh needed
- ✅ Toast notification in Window B: "New message from [contact]"

**Troubleshooting:**
- If message doesn't appear: Check `message:new` event in WebSocket service
- If toast doesn't show: Check WebSocketContext event handlers
- If unread count wrong: Check conversationStore.incrementUnreadCount

---

### Test 3: Typing Indicators

**Objective:** Verify typing indicators show in real-time

**Steps:**
1. Open 2 windows (A and B) with same conversation open
2. In Window A: Focus message input and start typing
3. Watch Window B MessageThread

**Expected Results:**
- ✅ Window B shows animated "..." indicator within 500ms
- ✅ Indicator disappears 2 seconds after typing stops
- ✅ No indicator shown in Window A (self)

**Troubleshooting:**
- If indicator doesn't show: Check `typing:start` event emission in MessageThread
- If indicator doesn't disappear: Check `typing:stop` event and 2s timeout
- If self-indicator appears: Check userId filtering in event handler

---

### Test 4: Message Status Updates

**Objective:** Verify message status updates (sent → delivered → read)

**Steps:**
1. Open conversation in MessageThread
2. Send a message
3. Watch the message checkmark icon

**Expected Results:**
- ✅ Single gray check (✓) when sent
- ✅ Double blue checks (✓✓) when delivered
- ✅ Status updates without page refresh

**Troubleshooting:**
- If status doesn't update: Check `message:status` event in WebSocket
- If wrong icon: Check getStatusIcon function in MessageThread
- Backend issue: Check WhatsApp webhook for delivery receipts

---

### Test 5: Connection Recovery

**Objective:** Verify WebSocket reconnects after network interruption

**Steps:**
1. Login and verify WebSocket connected
2. Open DevTools → Network tab → Offline mode
3. Wait 5 seconds
4. Turn network back online
5. Watch connection status

**Expected Results:**
- ✅ "Live" badge disappears when offline
- ✅ Toast notification: "Connection lost. Retrying..."
- ✅ "Live" badge reappears when reconnected
- ✅ Toast notification: "Reconnected successfully"
- ✅ All messages sync after reconnection

**Troubleshooting:**
- If doesn't reconnect: Check maxReconnectAttempts in websocket.ts
- If takes too long: Check reconnectDelay and exponential backoff
- If messages don't sync: Check conversation reload on reconnect

---

### Test 6: Multiple Conversations

**Objective:** Verify room-based messaging works correctly

**Steps:**
1. Open 2 conversations in separate tabs (Conv A, Conv B)
2. Send message in Conv A
3. Check Conv B doesn't receive it
4. Open another window with Conv A
5. Send message in original Conv A
6. Verify new window receives it

**Expected Results:**
- ✅ Messages only broadcast to users in same conversation room
- ✅ No cross-conversation leaks
- ✅ All users in same conversation receive updates

**Troubleshooting:**
- If wrong room receives: Check joinConversation/leaveConversation calls
- If message doesn't broadcast: Check conversation room name format
- Backend issue: Check Socket.IO room membership

---

### Test 7: Authentication Expiry

**Objective:** Verify WebSocket handles JWT expiration gracefully

**Steps:**
1. Login and connect WebSocket
2. Wait for JWT to expire (or manually invalidate token)
3. Try sending a message
4. Watch for auth error

**Expected Results:**
- ✅ WebSocket disconnects when JWT expires
- ✅ Toast notification: "Authentication expired. Please login again."
- ✅ Redirect to login page
- ✅ No crash or error boundary

**Troubleshooting:**
- If no disconnect: Check JWT expiry time in backend
- If no redirect: Check auth error handler in WebSocketContext
- If error boundary shows: Add try-catch in disconnect handler

---

### Test 8: High Message Volume

**Objective:** Verify performance with rapid messages

**Steps:**
1. Open conversation
2. Send 20 messages rapidly (type and hit send repeatedly)
3. Watch for lag, memory leaks, or UI freezing

**Expected Results:**
- ✅ All messages appear in order
- ✅ No duplicate messages
- ✅ No UI lag or freezing
- ✅ Smooth scrolling to bottom
- ✅ No console errors

**Troubleshooting:**
- If duplicates: Check message deduplication in messageStore
- If lag: Check message rendering optimization (React.memo, virtualization)
- If memory leak: Check event listener cleanup in useEffect

---

### Test 9: Conversation Status Updates

**Objective:** Verify conversation metadata updates in real-time

**Steps:**
1. Open 2 windows with same conversation
2. In Window A: Change conversation status to "RESOLVED"
3. Watch Window B

**Expected Results:**
- ✅ Status badge updates in Window B Inbox
- ✅ No page refresh needed
- ✅ Toast notification (optional)

**Troubleshooting:**
- If status doesn't update: Check `conversation:updated` event
- If wrong conversation updates: Check conversationId in event payload
- Backend issue: Check broadcastConversationUpdate call

---

### Test 10: User Presence

**Objective:** Verify online/offline status tracking

**Steps:**
1. Open 2 windows (A and B)
2. Close Window B
3. Check Window A for offline indicator
4. Reopen Window B
5. Check Window A for online indicator

**Expected Results:**
- ✅ "Online" badge appears when user connects
- ✅ "Offline" badge appears when user disconnects
- ✅ Real-time updates without refresh

**Troubleshooting:**
- If status doesn't update: Check `user:online` and `user:offline` events
- If wrong user: Check userId in event payload
- Backend issue: Check disconnect handler in websocket.ts

---

## 🔍 Debugging Tools

### Browser DevTools

**Network Tab:**
- Filter by "WS" to see WebSocket connections
- Check "Frames" to see message payloads
- Look for connection errors (401, 403, 500)

**Console:**
- Check for WebSocket logs (enable verbose logging)
- Look for React errors or warnings
- Monitor toast notifications

**Application Tab:**
- Check LocalStorage for auth tokens
- Verify Zustand store persistence
- Clear storage to test fresh login

### Backend Logs

**WebSocket Events:**
```bash
# In backend terminal
npm run dev

# Look for:
🔌 WebSocket server initialized
🔌 [WebSocket] Client connected: {userId}
🔌 [WebSocket] Client joined conversation: {conversationId}
🔌 [WebSocket] Broadcasting new message: {messageId}
```

**Database Queries:**
```bash
# Check message creation
📝 [Message] Created: {messageId}

# Check conversation updates
💬 [Conversation] Updated: {conversationId}
```

### Network Monitoring

**Check WebSocket Traffic:**
```bash
# Chrome DevTools → Network → WS → Select connection → Messages tab
# Look for:
- message:new
- message:status
- typing:start
- typing:stop
- conversation:updated
```

---

## 📊 Performance Benchmarks

### Expected Latencies

| Event | Expected Latency |
|-------|-----------------|
| Message send → receive | < 100ms |
| Typing indicator | < 200ms |
| Status update | < 500ms |
| Reconnection | < 3s |
| Initial connection | < 1s |

### Resource Usage

| Metric | Acceptable Range |
|--------|-----------------|
| WebSocket connections | 1 per browser tab |
| Memory per tab | < 100MB |
| CPU during idle | < 5% |
| CPU during typing | < 10% |

---

## 🐛 Common Issues

### Issue 1: WebSocket Doesn't Connect

**Symptoms:**
- No "Live" badge
- Console error: "WebSocket connection failed"

**Solutions:**
1. Check backend is running on correct port
2. Verify CORS settings allow WebSocket
3. Check JWT token is valid
4. Ensure Socket.IO versions match (client and server)

**Fix:**
```typescript
// backend/src/server.ts
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});
```

### Issue 2: Messages Not Broadcasting

**Symptoms:**
- Message appears in sender window only
- No toast notification in other windows

**Solutions:**
1. Check conversation room join/leave logic
2. Verify broadcastNewMessage is called after message creation
3. Check event name matches (message:new)
4. Ensure all clients joined same conversation room

**Fix:**
```typescript
// frontend/src/components/MessageThread.tsx
useEffect(() => {
  joinConversation(conversationId);
  return () => {
    leaveConversation(conversationId);
  };
}, [conversationId]);
```

### Issue 3: Duplicate Messages

**Symptoms:**
- Same message appears multiple times
- Rapid refreshing shows duplicates

**Solutions:**
1. Check deduplication logic in messageStore
2. Verify message IDs are unique
3. Ensure no duplicate event listeners

**Fix:**
```typescript
// frontend/src/store/messageStore.ts
addMessage: (conversationId, message) => {
  const messages = get().messagesByConversation.get(conversationId) || [];
  
  // Prevent duplicates
  if (messages.some(m => m.id === message.id)) {
    return;
  }
  
  // Add message
  // ...
}
```

### Issue 4: Typing Indicator Stuck

**Symptoms:**
- "..." never disappears
- Shows for user who stopped typing

**Solutions:**
1. Check stopTyping timeout (2 seconds)
2. Verify typing:stop event emission
3. Ensure removeTypingUser is called

**Fix:**
```typescript
// frontend/src/components/MessageThread.tsx
const handleTyping = () => {
  startTyping(conversationId);
  
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }
  
  typingTimeoutRef.current = setTimeout(() => {
    stopTyping(conversationId);
  }, 2000);
};
```

---

## ✅ Test Checklist

Use this checklist to verify all features:

- [ ] Login establishes WebSocket connection
- [ ] "Live" badge appears when connected
- [ ] Messages broadcast to all clients in real-time
- [ ] Toast notifications appear for new messages
- [ ] Typing indicators show and hide correctly
- [ ] Message status updates (sent/delivered/read)
- [ ] Connection recovers after network interruption
- [ ] Room-based messaging (no cross-conversation leaks)
- [ ] JWT expiration handled gracefully
- [ ] High message volume doesn't cause lag
- [ ] Conversation status updates in real-time
- [ ] User presence tracking works
- [ ] No memory leaks after prolonged use
- [ ] Mobile browser compatibility
- [ ] Multiple tabs sync correctly

---

## 📝 Test Report Template

```markdown
## WebSocket Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** Development/Staging/Production

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| Login & Connection | ✅/❌ | |
| Message Broadcasting | ✅/❌ | |
| Typing Indicators | ✅/❌ | |
| Status Updates | ✅/❌ | |
| Connection Recovery | ✅/❌ | |
| Multiple Conversations | ✅/❌ | |
| Auth Expiry | ✅/❌ | |
| High Volume | ✅/❌ | |
| Conversation Updates | ✅/❌ | |
| User Presence | ✅/❌ | |

### Issues Found

1. **Issue:** Description
   - **Severity:** Critical/High/Medium/Low
   - **Steps to Reproduce:** 1, 2, 3...
   - **Expected:** What should happen
   - **Actual:** What happened
   - **Fix:** Proposed solution

### Performance Metrics

- **Average Latency:** XXms
- **Memory Usage:** XXMB
- **CPU Usage:** XX%
- **Reconnection Time:** XXs

### Recommendations

- ...
- ...

### Overall Assessment

✅ Ready for production / ⚠️ Needs fixes / ❌ Not ready
```

---

## 🚀 Production Readiness

Before deploying to production, ensure:

1. **Security**
   - [ ] JWT tokens use secure secrets
   - [ ] WebSocket auth middleware enforces permissions
   - [ ] Rate limiting on WebSocket events
   - [ ] Input sanitization for messages

2. **Performance**
   - [ ] Load testing with 100+ concurrent users
   - [ ] Memory profiling shows no leaks
   - [ ] Database queries optimized
   - [ ] Message pagination implemented

3. **Monitoring**
   - [ ] WebSocket connection metrics logged
   - [ ] Error tracking (Sentry, LogRocket)
   - [ ] Performance monitoring (New Relic, Datadog)
   - [ ] Uptime monitoring

4. **Scalability**
   - [ ] Redis adapter for multi-server Socket.IO
   - [ ] Horizontal scaling tested
   - [ ] Database connection pooling
   - [ ] CDN for static assets

---

## 📚 Additional Resources

- **Socket.IO Docs:** https://socket.io/docs/v4/
- **Zustand Docs:** https://docs.pmnd.rs/zustand/
- **React Query Docs:** https://tanstack.com/query/latest
- **WebSocket RFC:** https://tools.ietf.org/html/rfc6455

---

**Happy Testing! 🎉**
