# WhatsApp Number API Manager - Platform Documentation

## 1. Overview
The WhatsApp Number API Manager is a comprehensive solution for managing WhatsApp Business communications. It allows businesses to handle customer conversations, run bulk messaging campaigns, and manage contacts efficiently, all while enforcing strict security and role-based access control.

---

## 2. User Roles & Permissions

### Tenant Admin
- **Access**: Full access to the entire platform.
- **Capabilities**:
  - Manage Agents (Create, Edit, Delete).
  - Configure WABA (WhatsApp Business API) credentials.
  - View all analytics and reports.
  - Manage billing and subscription (if applicable).
  - Access all other features (Campaigns, Contacts, Inbox).

### Agent
- **Access**: Restricted based on assigned permissions.
- **Capabilities**:
  - **Junior Agent**: View and reply to assigned conversations.
  - **Senior Agent**: Manage contacts, close conversations, and view basic stats.
  - **Team Lead**: Access campaigns, templates, and team analytics.
  - **Custom**: Permissions can be granularly assigned by the Admin.
- **Restrictions**:
  - Cannot access Settings or view WABA secrets.
  - Cannot manage other agents.

---

## 3. Authentication
- **Admin Login**: `/login` - Standard email/password login.
- **Agent Login**: `/agent-login` - Specialized portal for agents.
- **Security**:
  - Passwords are hashed using bcrypt.
  - JWT (JSON Web Tokens) are used for session management.
  - Automatic session timeout and refresh token rotation.

---

## 4. Contact Management
Manage your customer database efficiently.

### Features
- **List View**: View all contacts with search and filter options.
- **Add Contact**: Manually add a single contact.
- **Import Contacts**: Bulk upload contacts via CSV.
  - **Required Column**: `phoneNumber`
  - **Optional Columns**: `name`, `email`, `company`, `notes`, `tags`
- **Export Contacts**: Download your entire contact list as CSV.
- **Edit/Delete**: Modify or remove contact details.

---

## 5. Campaign Management
Run targeted bulk messaging campaigns.

### Creating a Campaign
1. **Name & Description**: Define internal identifiers.
2. **Message Type**:
   - **Template**: Use pre-approved WhatsApp templates (required for initiating conversations).
   - **Text**: Free-form text (only for existing 24h windows, though usually restricted for bulk).
3. **Select Contacts**:
   - Choose from existing contacts.
   - **NEW: Import CSV**: Upload a CSV directly within the campaign builder to add and select contacts instantly.
4. **Schedule**: Send immediately or pick a future date/time.

### Analytics
- View real-time stats: Sent, Delivered, Read, Failed.
- Track engagement rates.

---

## 6. Inbox & Conversations
The central hub for customer interaction.

### Features
- **Real-time Messaging**: Instant updates via WebSocket.
- **Assignment**: Assign conversations to specific agents.
- **Status Management**: Mark chats as Open, Resolved, or Archived.
- **Rich Media**: Send/receive images, documents, and templates.
- **Canned Responses**: Quick replies for common questions (`/` shortcut).

---

## 7. Templates
Manage WhatsApp Message Templates.

- **Sync**: Pull the latest templates from your Meta Business Account.
- **Create**: Design new templates (requires Meta approval).
- **Categories**: Marketing, Utility, Authentication.
- **Languages**: Support for multiple languages.

---

## 8. Settings (Admin Only)
Configure the connection to WhatsApp.

- **WABA Credentials**:
  - Phone Number ID
  - Business Account ID
  - Access Token (System User Token)
- **Webhook**: Verify webhook configuration for real-time updates.

---

## 9. Technical Architecture
- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js, Express, Prisma (PostgreSQL).
- **Security**: RBAC Middleware, Input Validation (Zod), Rate Limiting.
