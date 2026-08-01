import mqtt from "mqtt";

const URL = "wss://broker.hivemq.com:8884/mqtt";

let client: any = null;
const subs = new Map<string, (msg: any) => void>();
const pendingTopics: string[] = [];
const statusCbs: ((connected: boolean) => void)[] = [];

function ensure() {
  if (client) return client;
  client = mqtt.connect(URL, {
    clientId: "ah-" + Math.random().toString(16).slice(2, 10),
    connectTimeout: 15000,
    keepalive: 30,
    reconnectPeriod: 3000,
  });
  client.on("connect", () => {
    pendingTopics.forEach((t) => client.subscribe(t));
    pendingTopics.length = 0;
    statusCbs.forEach((cb) => cb(true));
  });
  client.on("close", () => statusCbs.forEach((cb) => cb(false)));
  client.on("offline", () => statusCbs.forEach((cb) => cb(false)));
  client.on("message", (topic: string, payload: any) => {
    try {
      const msg = JSON.parse(payload.toString());
      subs.get(topic)?.(msg);
    } catch {
      /* ignore malformed */
    }
  });
  return client;
}

export function subscribe(topic: string, cb: (msg: any) => void) {
  const c = ensure();
  if (c.connected) c.subscribe(topic);
  else if (!pendingTopics.includes(topic)) pendingTopics.push(topic);
  subs.set(topic, cb);
}

export function unsubscribe(topic: string) {
  subs.delete(topic);
  const i = pendingTopics.indexOf(topic);
  if (i >= 0) pendingTopics.splice(i, 1);
  if (client && client.connected) client.unsubscribe(topic);
}

export function publish(topic: string, data: any) {
  const c = ensure();
  if (c.connected) c.publish(topic, JSON.stringify(data), { qos: 0 });
}

export function onConn(cb: (connected: boolean) => void) {
  statusCbs.push(cb);
}
