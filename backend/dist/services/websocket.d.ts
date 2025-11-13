import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
export declare function setupWebSocket(server: HTTPServer): Server;
export declare function broadcastNewMessage(conversationId: string, message: any): void;
export declare function broadcastMessageStatus(conversationId: string, messageId: string, status: string): void;
export declare function broadcastConversationUpdate(conversationId: string, conversation: any): void;
export declare function notifyUser(userId: string, event: string, data: any): void;
export declare function getIO(): Server | null;
//# sourceMappingURL=websocket.d.ts.map