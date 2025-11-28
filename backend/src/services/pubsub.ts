import { createRedisConnection } from '../config/redis.js';
import { log } from '../utils/logger.js';

const redis = createRedisConnection();
const CHANNEL = 'websocket:events';

export interface WebSocketEvent {
  type: 'message:new' | 'conversation:new' | 'conversation:updated' | 'notification:new';
  data: any;
}

/**
 * Publish a WebSocket event to Redis
 * This allows workers to trigger WebSocket broadcasts
 */
export async function publishWebSocketEvent(event: WebSocketEvent): Promise<void> {
  try {
    await redis.publish(CHANNEL, JSON.stringify(event));
    log.info('Published WebSocket event to Redis', { type: event.type });
  } catch (error: any) {
    log.error('Failed to publish WebSocket event', { error: error.message });
  }
}

/**
 * Subscribe to WebSocket events from Redis
 * The main server uses this to receive events from workers
 */
export function subscribeToWebSocketEvents(
  callback: (event: WebSocketEvent) => void
): void {
  const subscriber = createRedisConnection();
  
  subscriber.subscribe(CHANNEL, (err) => {
    if (err) {
      log.error('Failed to subscribe to WebSocket events', { error: err.message });
      return;
    }
    log.info('Subscribed to WebSocket events channel');
  });

  subscriber.on('message', (channel, message) => {
    if (channel === CHANNEL) {
      try {
        const event: WebSocketEvent = JSON.parse(message);
        callback(event);
      } catch (error: any) {
        log.error('Failed to parse WebSocket event', { error: error.message, message });
      }
    }
  });

  subscriber.on('error', (error) => {
    log.error('Redis subscriber error', { error: error.message });
  });
}
