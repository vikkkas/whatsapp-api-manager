export interface Message {
  id: string;
  text: string;
  timestamp: string;
  isIncoming: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  status: "approved" | "pending" | "rejected";
}

export interface AnalyticsData {
  totalConversations: number;
  activeUsers: number;
  messagesPerDay: { day: string; messages: number }[];
  topCampaigns: { name: string; messages: number }[];
}

export const dummyContacts: Contact[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    phone: "+1 234 567 8901",
    lastMessage: "Thanks for the quick response!",
    timestamp: "10:30 AM",
    unread: 2,
  },
  {
    id: "2",
    name: "Michael Chen",
    phone: "+1 234 567 8902",
    lastMessage: "When will my order arrive?",
    timestamp: "9:15 AM",
    unread: 0,
  },
  {
    id: "3",
    name: "Emma Davis",
    phone: "+1 234 567 8903",
    lastMessage: "Perfect, I'll check it out",
    timestamp: "Yesterday",
    unread: 1,
  },
  {
    id: "4",
    name: "James Wilson",
    phone: "+1 234 567 8904",
    lastMessage: "Can I get a refund?",
    timestamp: "Yesterday",
    unread: 0,
  },
  {
    id: "5",
    name: "Olivia Martinez",
    phone: "+1 234 567 8905",
    lastMessage: "Great service!",
    timestamp: "2 days ago",
    unread: 0,
  },
];

export const dummyMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "1",
      text: "Hi, I have a question about your product",
      timestamp: "10:25 AM",
      isIncoming: true,
    },
    {
      id: "2",
      text: "Hello! I'd be happy to help. What would you like to know?",
      timestamp: "10:27 AM",
      isIncoming: false,
    },
    {
      id: "3",
      text: "Does it come with a warranty?",
      timestamp: "10:28 AM",
      isIncoming: true,
    },
    {
      id: "4",
      text: "Yes, all our products come with a 2-year warranty.",
      timestamp: "10:29 AM",
      isIncoming: false,
    },
    {
      id: "5",
      text: "Thanks for the quick response!",
      timestamp: "10:30 AM",
      isIncoming: true,
    },
  ],
  "2": [
    {
      id: "1",
      text: "When will my order arrive?",
      timestamp: "9:15 AM",
      isIncoming: true,
    },
    {
      id: "2",
      text: "Let me check your order status. Could you provide your order number?",
      timestamp: "9:17 AM",
      isIncoming: false,
    },
  ],
  "3": [
    {
      id: "1",
      text: "I saw your ad on Facebook",
      timestamp: "Yesterday",
      isIncoming: true,
    },
    {
      id: "2",
      text: "Great! What would you like to know about our services?",
      timestamp: "Yesterday",
      isIncoming: false,
    },
    {
      id: "3",
      text: "Perfect, I'll check it out",
      timestamp: "Yesterday",
      isIncoming: true,
    },
  ],
};

export const dummyTemplates: Template[] = [
  {
    id: "1",
    name: "Welcome Message",
    content: "Hello {{name}}! Welcome to our service. How can we help you today?",
    status: "approved",
  },
  {
    id: "2",
    name: "Order Confirmation",
    content: "Your order #{{order_id}} has been confirmed. Expected delivery: {{date}}",
    status: "approved",
  },
  {
    id: "3",
    name: "Support Response",
    content: "Thank you for contacting us. Our team will get back to you within 24 hours.",
    status: "pending",
  },
  {
    id: "4",
    name: "Follow Up",
    content: "Hi {{name}}, just checking in. Is there anything else we can help you with?",
    status: "approved",
  },
];

export const dummyAnalytics: AnalyticsData = {
  totalConversations: 1247,
  activeUsers: 892,
  messagesPerDay: [
    { day: "Mon", messages: 145 },
    { day: "Tue", messages: 189 },
    { day: "Wed", messages: 234 },
    { day: "Thu", messages: 178 },
    { day: "Fri", messages: 267 },
    { day: "Sat", messages: 123 },
    { day: "Sun", messages: 111 },
  ],
  topCampaigns: [
    { name: "Facebook Ads", messages: 456 },
    { name: "Instagram Ads", messages: 389 },
    { name: "Google Ads", messages: 267 },
    { name: "Email Campaign", messages: 135 },
  ],
};
