export const Colors = {
  bg: '#F5F4F0', white: '#FFFFFF', navy: '#06195e',
  blue: '#0B2D91', blue3: '#2563EB', blueLt: '#EFF4FF',
  gold: '#F5C842', ink: '#111827', slate: '#374151',
  muted: '#9CA3AF', border: '#E5E7EB', surface: '#F9FAFB',
  red: '#DC2626', green: '#16A34A', amber: '#D97706',
};

export function getScoreColor(score: number): string {
  if (score >= 70) return Colors.green;
  if (score >= 40) return Colors.amber;
  return Colors.red;
}

export const OutcomeLabels: Record<string, { label: string; color: string }> = {
  awaiting_update:    { label: 'Awaiting Update',   color: Colors.muted  },
  appeal_sent:        { label: 'Appeal Sent',        color: Colors.blue3  },
  partial_settlement: { label: 'Partial Settlement', color: Colors.amber  },
  won:                { label: 'Won',                color: Colors.green  },
  lost:               { label: 'Closed',             color: Colors.red    },
};

export const INSURERS = [
  'Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Bajaj Allianz',
  'United India', 'New India', 'National Insurance', 'Oriental Insurance',
  'Niva Bupa', 'Aditya Birla Health', 'Care Health', 'ManipalCigna',
  'Tata AIG', 'Reliance Health', 'SBI Health', 'Cholamandalam',
  'Digit Insurance', 'Go Digit', 'Acko', 'Other',
];
