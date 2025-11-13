'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { getAccessToken } from '@/lib/auth/token';
import { Button } from '@/components/ui/button';
import { Link } from 'lucide-react';

type Level = 'LOG' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE';
const LEVELS: Level[] = ['LOG', 'ERROR', 'WARN', 'DEBUG', 'VERBOSE'];

type IncomingEvent = {
  level?: Level;
  message?: any;
  traceId?: string;
  timestamp?: number; // epoch millis
  params?: any[];
};

type LogItem = {
  id: string;
  level: Level | 'UNKNOWN';
  message?: any;
  traceId?: string;
  timestamp: number; // epoch millis
  params?: any[];
  rawText?: string; // when JSON parse fails
};

type ConnStatus = 'Connecting' | 'Open' | 'Closed' | 'Error';

const RETRY_DELAY_MS = 3000;

const levelColors: Record<Level | 'UNKNOWN', string> = {
  LOG: '#22c55e', // green
  ERROR: '#ef4444', // red
  WARN: '#f59e0b', // yellow
  DEBUG: '#06b6d4', // cyan
  VERBOSE: '#a855f7', // magenta
  UNKNOWN: '#9ca3af', // gray
};

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function safeStringify(value: any): string {
  if (value == null) return '';
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[unstringifiable]';
    }
  }
}

function matchesSearch(item: LogItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();

  // If rawText exists, search within it
  if (item.rawText) {
    return item.rawText.toLowerCase().includes(q);
  }

  const msg = safeStringify(item.message).toLowerCase();
  if (msg.includes(q)) return true;

  if (item.params?.length) {
    const paramsStr = item.params.map(safeStringify).join(' ').toLowerCase();
    if (paramsStr.includes(q)) return true;
  }

  return false;
}

export default function LogsPage() {
  const [status, setStatus] = useState<ConnStatus>('Connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [bufferSize, setBufferSize] = useState(500);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<Record<Level, boolean>>({
    LOG: true,
    ERROR: true,
    WARN: true,
    DEBUG: true,
    VERBOSE: true,
  });
  const [logs, setLogs] = useState<LogItem[]>([]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Trim logs when buffer size changes
  useEffect(() => {
    setLogs((prev) => (prev.length > bufferSize ? prev.slice(prev.length - bufferSize) : prev));
  }, [bufferSize]);

  // SSE lifecycle
  useEffect(() => {
    // If paused, ensure connection is closed
    if (paused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setStatus("Closed")
      return
    }

    setStatus("Connecting")
    setErrorBanner(null)

    const token = getAccessToken()
    const url = `${process.env.NEXT_PUBLIC_API_URL}/custom-logger/stream`

    const src = new EventSourcePolyfill(url, {
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    eventSourceRef.current = src

    const toLogItem = (data: any): LogItem => {
      const now = Date.now()
      const ts = typeof data?.timestamp === "number" ? data.timestamp : now
      const lvl = LEVELS.includes(data?.level) ? (data.level as Level) : "UNKNOWN"
      return {
        id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
        level: lvl,
        message: data?.message,
        traceId: data?.traceId,
        timestamp: ts,
        params: Array.isArray(data?.params) ? data.params : undefined,
      }
    }

    const handleEvent = (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(evt.data)
        const item = toLogItem(parsed)
        setLogs((prev) => {
          const next = [...prev, item]
          return next.length > bufferSize ? next.slice(next.length - bufferSize) : next
        })
      } catch {
        const now = Date.now()
        const item: LogItem = {
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          level: "UNKNOWN",
          timestamp: now,
          rawText: evt.data,
        }
        setLogs((prev) => {
          const next = [...prev, item]
          return next.length > bufferSize ? next.slice(next.length - bufferSize) : next
        })
      }
    }

    const onOpen = () => {
      setStatus("Open")
      setErrorBanner(null)
    }

    const onError = async (err: any) => {
      console.error("SSE Error:", err)
      setStatus("Error")
      setIsConnected(false)

      // Close current stream
      try {
        src.close()
      } catch {}

      eventSourceRef.current = null

      // Try to refresh token and reconnect once
      const refreshed = await (async () => {
        try {
          return await (await import("@/lib/auth/token")).refreshAccessTokenSingleton()
        } catch (e) {
          console.error("Token refresh attempt failed:", e)
          return false
        }
      })()

      if (refreshed) {
        // Trigger reconnection with new token
        setRetryCount((c) => c + 1)
        return
      }

      // If refresh failed, show banner and retry after delay
      setErrorBanner("Stream connection encountered an error. Retrying shortly...")
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        setRetryCount((c) => c + 1)
      }, RETRY_DELAY_MS)
    }

    src.addEventListener("open", onOpen)
    // Default messages
    src.addEventListener("message", handleEvent)
    // Named event types
    ;["LOG", "ERROR", "WARN", "DEBUG", "VERBOSE"].forEach((type) => {
      src.addEventListener(type, handleEvent as any)
    })

    // Track connection UI state
    src.onopen = () => setIsConnected(true)
    src.onerror = (e: any) => onError(e)

    return () => {
      src.removeEventListener("open", onOpen)
      src.removeEventListener("message", handleEvent)
      ;["LOG", "ERROR", "WARN", "DEBUG", "VERBOSE"].forEach((type) => {
        src.removeEventListener(type, handleEvent as any)
      })
      try {
        src.close()
      } catch {}
      eventSourceRef.current = null
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [paused, retryCount, bufferSize])

    const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const eventSource = new EventSourcePolyfill(
      `${process.env.NEXT_PUBLIC_API_URL}/custom-logger/stream`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
   

    eventSource.onopen = () => {
      console.log('SSE Connected');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      setEvents((prev) => [...prev, data]);
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);


  // Auto-scroll
  useEffect(() => {
    if (!autoScroll) return;
    const el = listRef.current;
    if (!el) return;
    // Only scroll if already near bottom or autoScroll is enabled
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [logs, autoScroll]);

  const toggleLevel = (lvl: Level) => {
    setLevelFilter((prev) => ({ ...prev, [lvl]: !prev[lvl] }));
  };

  const visibleLogs = useMemo(() => {
    const filtered = logs.filter((l) => {
      const levelOk = l.level === 'UNKNOWN' ? true : levelFilter[l.level];
      const searchOk = matchesSearch(l, searchQuery);
      return levelOk && searchOk;
    });
    return filtered;
  }, [logs, levelFilter, searchQuery]);

  const clearVisible = () => {
    setLogs((prev) => prev.filter((l) => !visibleLogs.includes(l)));
  };

  const pauseResume = () => {
    setPaused((p) => !p);
  };

  const statusColor =
    status === 'Open'
      ? '#22c55e'
      : status === 'Connecting'
      ? '#f59e0b'
      : status === 'Error'
      ? '#ef4444'
      : '#9ca3af';

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    height: '100%',
    maxHeight: 'calc(100vh - 120px)',
    gap: '12px',
    padding: '12px',
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  };

  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  };

  const listStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
    overflow: 'auto',
    background: '#ffffff',
  };

  const itemStyleBase: React.CSSProperties = {
    padding: '6px 8px',
    borderBottom: '1px solid #f3f4f6',
    lineHeight: 1.4,
  };

  const bannerStyle: React.CSSProperties = {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    padding: '8px',
    borderRadius: '6px',
  };

  return (
    <main aria-label="Logs page" style={containerStyle}>
      {/* Back to Dashboard button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
      <header style={statusBarStyle}>
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: statusColor,
            display: "inline-block",
          }}
        />
        <span aria-live="polite" aria-atomic="true">
          Status: {isConnected ? "Connected" : "Disconnected"}
        </span>
        {!isConnected && (
          <span style={{ color: "#6b7280" }}>
            {status === "Error"
              ? `Retrying in ${Math.round(RETRY_DELAY_MS / 1000)}s (attempt ${retryCount})`
              : status === "Connecting"
              ? "Connecting to /custom-logger/stream…"
              : "Stream closed"}
          </span>
        )}
      </header>

      <section aria-label="Controls" style={controlsStyle}>
        <button
          type="button"
          onClick={pauseResume}
          aria-label={paused ? 'Resume stream' : 'Pause stream'}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: paused ? '#f9fafb' : '#ffffff',
            cursor: 'pointer',
          }}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            aria-label="Toggle auto-scroll to bottom"
          />
          Auto-scroll
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Buffer size</span>
          <select
            value={bufferSize}
            onChange={(e) => setBufferSize(Number(e.target.value))}
            aria-label="Select buffer size"
            style={{ padding: '4px 6px' }}
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={2000}>2000</option>
          </select>
        </label>

        <label style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search message or params"
            aria-label="Text search"
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
            }}
          />
        </label>

        <button
          type="button"
          onClick={clearVisible}
          aria-label="Clear visible logs"
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          Clear Visible
        </button>

        <div role="group" aria-label="Filter by level" style={{ display: 'flex', gap: '10px' }}>
          {LEVELS.map((lvl) => (
            <label key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={levelFilter[lvl]}
                onChange={() => toggleLevel(lvl)}
                aria-label={`Filter ${lvl}`}
              />
              <span style={{ color: levelColors[lvl], fontWeight: 600 }}>{lvl}</span>
            </label>
          ))}
        </div>
      </section>

      {errorBanner && (
        <div role="status" aria-live="polite" style={bannerStyle}>
          {errorBanner}
        </div>
      )}

      <section
        aria-label="Log entries"
        ref={listRef}
        style={{
          ...listStyle,
          // Reserve space for logs; scrollable
          minHeight: '300px',
        }}
      >
        <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visibleLogs.map((log) => {
            const timeStr = formatTime(log.timestamp);
            const color = levelColors[log.level];
            const header = `[${timeStr}] [${log.level}] [${log.traceId ?? '-'}]`;
            const messageBody =
              log.rawText != null ? log.rawText : safeStringify(log.message ?? '');
            const paramsBody =
              log.params && log.params.length
                ? log.params.map((p) => safeStringify(p)).join(' ')
                : '';

            return (
              <li key={log.id} style={itemStyleBase}>
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12px',
                    color,
                    marginBottom: '4px',
                  }}
                >
                  {header}
                </div>
                <div style={{ fontSize: '13px', color: '#111827' }}>
                  {messageBody}
                  {paramsBody ? <span style={{ color: '#6b7280' }}> {' '}{paramsBody}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}