/**
 * Hook to bridge AI proposals to the calendar ghost slots.
 * Reads proposals from a shared state so WeekCalendar can show them.
 */

import { useState, useCallback } from 'react';
import type { Proposal } from '../types';

// Simple module-level store for proposals (avoids Zustand boilerplate for a transient state)
let _proposals: Proposal[] = [];
let _studentId: string | null = null;
const _listeners: Array<() => void> = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function setGlobalProposals(proposals: Proposal[], studentId: string | null) {
  _proposals = proposals;
  _studentId = studentId;
  notify();
}

export function useProposals() {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.push(listener);
    return () => {
      const idx = _listeners.indexOf(listener);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }, []);

  // Subscribe on first render
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  return {
    proposals: _proposals,
    selectedStudentId: _studentId,
  };
}
