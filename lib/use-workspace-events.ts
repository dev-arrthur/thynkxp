'use client';

import { useEffect, useRef, useState } from 'react';

type Connection = 'connecting' | 'live' | 'reconnecting';
type Listener = { refresh: () => void; status: (state: Connection) => void };
const listeners = new Set<Listener>();
let source: EventSource | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let status: Connection = 'connecting';
function setStatus(value: Connection) { status = value; listeners.forEach(listener => listener.status(value)); }
function refresh() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => listeners.forEach(listener => listener.refresh()), 180);
}
function connect() {
  if (source || document.hidden || !listeners.size) return;
  const role = window.location.pathname.startsWith('/cliente') ? 'client' : 'admin';
  source = new EventSource(`/api/workspace/events?role=${role}`);
  source.addEventListener('ready', () => { setStatus('live'); refresh(); });
  source.addEventListener('workspace', () => { setStatus('live'); refresh(); });
  source.addEventListener('auth', () => {
    disconnect();
    window.location.assign(role === 'client' ? '/cliente' : '/admin/login');
  });
  source.onerror = () => setStatus('reconnecting');
}
function disconnect() { source?.close(); source = null; }
function visibility() {
  if (document.hidden) { disconnect(); setStatus('connecting'); }
  else { connect(); refresh(); }
}

/** One authenticated SSE connection per browser tab, shared by every workspace. */
export function useWorkspaceEvents(onRefresh: () => void, enabled = true): Connection {
  const callback = useRef(onRefresh);
  callback.current = onRefresh;
  const [connection, setConnection] = useState<Connection>('connecting');
  useEffect(() => {
    if (!enabled) return;
    const listener = { refresh: () => callback.current(), status: setConnection };
    listeners.add(listener);
    setConnection(status);
    if (listeners.size === 1) document.addEventListener('visibilitychange', visibility);
    connect();
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        disconnect();
        if (timer) clearTimeout(timer);
        document.removeEventListener('visibilitychange', visibility);
        status = 'connecting';
      }
    };
  }, [enabled]);
  return connection;
}
