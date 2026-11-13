import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, Command, X, ChevronRight, Sparkles } from 'lucide-react';
import { label } from './config';
import './command-center.css';

// Client-side navigation only. The backend remains responsible for permissions.
// The list MUST be derived from the authenticated user's allowed menu entries.
const groups = {
  overview: 'Dashboard', platform: 'Platform', members: 'People', units: 'Properties',
  buildings: 'Properties', floors: 'Properties', unit_occupancies: 'Properties',
  visitor_passes: 'Visitor access', scanner: 'Visitor access', visitor_entries: 'Visitor access',
  complaints: 'Operations', maintenance: 'Operations', invoices: 'Finance', payments: 'Finance',
  facilities: 'Facilities', facility_bookings: 'Facilities', announcements: 'Community',
  community_events: 'Community', polls: 'Community', documents: 'Community',
  settings: 'Administration', reports: 'Analytics', audit_logs: 'Administration',
};
const descriptions = {
  overview: 'Your community at a glance',
  platform: 'Platform administration',
  visitor_passes: 'Issue and manage secure visitor passes',
  scanner: 'Check access passes at the gate',
  visitor_entries: 'Review gate entry history',
  complaints: 'Track service requests',
  maintenance: 'Manage assigned maintenance jobs',
  invoices: 'Review and issue community invoices',
  payments: 'Verify submitted payments',
  facility_bookings: 'Reserve shared spaces',
  announcements: 'Share community updates',
  reports: 'Explore community insights',
  audit_logs: 'Review administrative activity',
};
const searchScore = (item, query) => {
  if (!query) return 1;
  const title = item.title.toLowerCase(), all = `${item.title} ${item.description} ${item.group}`.toLowerCase();
  if (title === query) return 10;
  if (title.startsWith(query)) return 8;
  if (title.includes(query)) return 5;
  return query.split(/\s+/).every((part) => all.includes(part)) ? 2 : 0;
};

export function CommandCenter({ open, onClose, items, navigate }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef(null);
  const list = [...new Set(items)].map((key) => ({
    key, title: label(key), group: groups[key] || 'Workspace', description: descriptions[key] || `Open ${label(key).toLowerCase()}`,
  }));
  const normalized = query.trim().toLowerCase();
  const matches = list.map((item) => ({ ...item, rank: searchScore(item, normalized) }))
    .filter((item) => item.rank > 0).sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
    .slice(0, 12);
  useEffect(() => {
    if (!open) return;
    setQuery(''); setFocused(0);
    inputRef.current?.focus();
  }, [open]);
  useEffect(() => { setFocused(0); }, [query]);
  if (!open) return null;
  const go = (key) => { onClose(); navigate(key); };
  const keys = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(i => Math.min(Math.max(0,matches.length-1),i+1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(i => Math.max(0,i-1)); }
    if (e.key === 'Enter' && matches[focused]) { e.preventDefault(); go(matches[focused].key); }
  };
  return (
    <div className="cc-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="cc-panel" role="dialog" aria-modal="true" aria-label="Quick navigation" onKeyDown={keys}>
        <div className="cc-searchline">
          <Search size={20} aria-hidden="true" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            aria-label="Find a workspace page" placeholder="Where would you like to go?" />
          <button onClick={onClose} aria-label="Close quick navigation"><X size={17} /></button>
        </div>
        <div className="cc-meta"><span><Sparkles size={13} /> QUICK NAVIGATION</span><span>{matches.length} destinations</span></div>
        <div className="cc-results" role="listbox" aria-label="Available destinations">
          {matches.length ? matches.map((item, i) => (
            <button key={item.key} role="option" aria-selected={focused === i}
              className={'cc-result ' + (i === focused ? 'is-highlighted' : '')}
              onMouseEnter={() => setFocused(i)} onClick={() => go(item.key)}>
              <span className="cc-glyph"><ArrowUpRight size={18} /></span>
              <span className="cc-copy"><strong>{item.title}</strong><small>{item.group} · {item.description}</small></span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          )) : <div className="cc-empty">No matching pages in your authorized workspace. Try another search.</div>}
        </div>
        <div className="cc-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>
      </section>
    </div>
  );
}

export function WorkspaceLaunchpad({ role, navigate, items }) {
  const roleActions = {
    admin: [['visitor_passes','Visitor desk','Prepare passes and check-ins'],['complaints','Service pulse','Review maintenance needs'],['reports','Community insights','Explore live operational trends']],
    resident: [['visitor_passes','Invite a visitor','Create a safe guest pass'],['complaints','Request help','Report an issue in your home'],['facility_bookings','Book a facility','Reserve a shared space']],
    guard: [['scanner','Scan at the gate','Verify visitor access'],['visitor_entries','Entry timeline','Review recorded visits'],['security_incidents','Report an incident','Record security concerns']],
    maintenance: [['maintenance','My assigned jobs','Review your work queue'],['shifts','Duty schedule','See upcoming shifts'],['complaints','Service requests','Review reported issues']],
  };
  const actions = (roleActions[role] || []).filter(([key]) => items.includes(key));
  if (!actions.length) return null;
  return <section className="cc-launchpad" aria-label="Suggested workspace shortcuts">
    <div className="cc-launchpad-header"><span>MAKE YOUR NEXT MOVE</span><p>Quick routes to your everyday tasks</p></div>
    <div className="cc-launchpad-grid">{actions.map(([key,title,desc])=><button key={key} onClick={() => navigate(key)}>
      <span className="cc-launchpad-mark"><ArrowUpRight size={18}/></span>
      <strong>{title}</strong><small>{desc}</small><ChevronRight size={17} className="cc-launchpad-arrow" />
    </button>)}</div>
  </section>;
}
