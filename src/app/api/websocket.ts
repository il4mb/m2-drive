// pages/api/websocket/db-changes.ts (enhanced)
import { Server } from "socket.io";
import { getConnection } from 'typeorm';
import { NextApiRequest } from 'next';

interface Subscription {
  ws: WebSocket;
  collection: string;
  query?: string;
}

const subscriptions = new Map<WebSocket, Subscription[]>();

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.wss) {
    const server: Server = res.socket.server;
    const wss = new Server({ noServer: true });

    wss.on('connection', (ws: WebSocket) => {
      subscriptions.set(ws, []);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleSubscriptionMessage(ws, message);
        } catch (error) {
          console.error('Error parsing subscription message:', error);
        }
      });

      ws.on('close', () => {
        subscriptions.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        subscriptions.delete(ws);
      });
    });

    res.socket.server.wss = wss;
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/api/websocket/db-changes') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    setupDatabaseListeners();
  }

  res.end();
}

function handleSubscriptionMessage(ws: WebSocket, message: any) {
  if (message.type === 'SUBSCRIBE') {
    const subscription: Subscription = {
      ws,
      collection: message.collection,
      query: message.query
    };
    
    const currentSubs = subscriptions.get(ws) || [];
    currentSubs.push(subscription);
    subscriptions.set(ws, currentSubs);
  }
}

function broadcastToSubscribers(change: any) {
  subscriptions.forEach((subs, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      const matchingSubs = subs.filter(sub => 
        sub.collection === change.collection && 
        matchesQuery(change.data, sub.query)
      );
      
      if (matchingSubs.length > 0) {
        ws.send(JSON.stringify(change));
      }
    }
  });
}

function matchesQuery(data: any, query?: string): boolean {
  if (!query) return true;
  
  // Simplified query matching - in real implementation, you'd parse the query
  // and check if the data matches the conditions
  return true;
}