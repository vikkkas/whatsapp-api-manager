# WhatsApp Manager - Tenant Admin Guide

## 🚀 Getting Started

### Accessing the Platform
- **Tenant Admin Login**: [http://localhost:5173/login](http://localhost:5173/login)
  - Use your admin credentials to access the full dashboard.
- **Agent Login**: [http://localhost:5173/agent-login](http://localhost:5173/agent-login)
  - Share this link with your support team.

> 📚 **[View Full Platform Documentation](./PLATFORM_DOCUMENTATION.md)**

---

## 👥 Agent Management

As a Tenant Admin, you have full control over your team.

### Creating an Agent
1. Navigate to **Agents** in the sidebar.
2. Click **"Add Agent"**.
3. Fill in the details:
   - **Name & Email**: Required for login.
   - **Role/Permissions**:
     - **Junior Agent**: Can view and reply to conversations.
     - **Senior Agent**: Can also manage contacts and close conversations.
     - **Team Lead**: Full access to campaigns, templates, and analytics.
     - **Custom**: Select specific permissions as needed.
4. **Password**: A temporary password will be generated. **Copy and share this with the agent.**

### Managing Access
- **Edit Permissions**: Click the "Edit" icon on any agent to modify their access rights instantly.
- **Revoke Access**: Delete an agent to immediately block their access.

---

## ⚙️ Configuration (WABA)

Before sending messages, you must configure your WhatsApp Business Account.

1. Go to **Settings**.
2. Enter your Meta credentials:
   - **Phone Number ID**
   - **Access Token** (System User Token recommended)
   - **Business Account ID**
3. Click **Save**.
   - *Note: These credentials are encrypted and hidden from Agents.*

---

## 📢 Campaigns & Messaging

### Running a Campaign
1. Go to **Campaigns** -> **Create Campaign**.
2. Select a **Template** (must be approved by Meta).
3. Choose your **Audience** (Contacts or Tags).
4. **Schedule** or **Send Now**.

### Managing Templates
- Go to **Templates** to sync, create, or delete WhatsApp templates.
- *Note: New templates require Meta approval before use.*

---

## 🔒 Security & Permissions

This platform enforces strict **Role-Based Access Control (RBAC)**:
- **Tenant Admins**: Full access to all settings, billing, and user management.
- **Agents**: Restricted access based on assigned permissions.
  - Cannot view WABA secrets (Access Tokens).
  - Cannot access pages they don't have permission for (e.g., Settings, Campaigns).
  - Attempting to access unauthorized areas will redirect them to the Inbox.

---

## 🆘 Support

For technical issues or system errors, please check the **Analytics** dashboard for error logs or contact the system administrator.
