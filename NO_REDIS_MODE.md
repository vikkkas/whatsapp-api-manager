# 🚀 Quick Start - NO REDIS Required

## Problem
The server won't start because Redis isn't running and keeps trying to connect.

## Solution
Add this to your `.env` file:

```env
ENABLE_REDIS=false
ENABLE_QUEUES=false
```

Then the server will start WITHOUT queue support.

## What Will Work

✅ Authentication (register, login)  
✅ REST API routes  
✅ Database operations  
✅ Direct message sending (sync)  
✅ All CRUD operations  

## What Won't Work (Until You Install Redis)

❌ Async webhook processing  
❌ Background workers  
❌ Job queues  
❌ Rate limiting (will use basic fallback)  

## For Now

This is perfect for development! You can:
1. Build and test the frontend
2. Create API endpoints
3. Test authentication
4. Work with database

## When You're Ready

Later, install Redis and set:
```env
ENABLE_REDIS=true
ENABLE_QUEUES=true
```

And all async features will work!

---

**Let's proceed with NO-REDIS mode and complete Phase 1!** 🎉
