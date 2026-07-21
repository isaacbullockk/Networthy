import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

type Client = WebSocket & { room?: string };

type SignalMessage =
  | { kind: "join"; room: string }
  | { kind: "signal"; room: string; data: unknown };

function createSignaling(wss: WebSocketServer) {
  const rooms = new Map<string, Set<Client>>();

  function send(ws: WebSocket, msg: unknown) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function broadcast(room: string, msg: unknown, except?: Client) {
    for (const peer of rooms.get(room) ?? []) {
      if (peer !== except) send(peer, msg);
    }
  }

  wss.on("connection", (ws: Client) => {
    ws.on("message", (raw) => {
      let msg: SignalMessage;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (msg.kind === "join") {
        const room = msg.room;
        ws.room = room;
        if (!rooms.has(room)) rooms.set(room, new Set());
        const peers = rooms.get(room)!;
        if (peers.size >= 2) {
          send(ws, { kind: "room-full" });
          return;
        }
        const isFirst = peers.size === 0;
        peers.add(ws);
        send(ws, { kind: "joined", peers: peers.size });
        if (!isFirst) {
          // Both peers present: tell the first peer to initiate the offer.
          broadcast(room, { kind: "ready", initiator: true }, ws);
          send(ws, { kind: "ready", initiator: false });
        }
        return;
      }

      if (msg.kind === "signal" && ws.room) {
        broadcast(ws.room, { kind: "signal", data: msg.data }, ws);
      }
    });

    ws.on("close", () => {
      if (ws.room && rooms.has(ws.room)) {
        rooms.get(ws.room)!.delete(ws);
        broadcast(ws.room, { kind: "peer-left" });
        if (rooms.get(ws.room)!.size === 0) rooms.delete(ws.room);
      }
    });
  });

  return wss;
}

/** Attach signaling to an existing HTTP server (production, path /ws). */
export function attachSignaling(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  createSignaling(wss);
  console.log("WebRTC signaling attached at /ws");
}

/** Standalone signaling server (development). */
export function startSignalingServer(port: number) {
  const wss = new WebSocketServer({ port });
  createSignaling(wss);
  console.log(`WebRTC signaling listening on :${port}`);
}
