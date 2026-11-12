/** Chip tones from the Software Factory status palette. */
export const StatusTone = {
  Backlog: "backlog",
  Ready: "ready",
  InProgress: "in-progress",
  InReview: "in-review",
  Blocked: "blocked",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type StatusTone = (typeof StatusTone)[keyof typeof StatusTone];

const TONE_CLASSES: Record<StatusTone, { chip: string; dot: string }> = {
  backlog: { chip: "bg-status-backlog-bg text-status-backlog-fg", dot: "bg-status-backlog-border" },
  ready: { chip: "bg-status-ready-bg text-status-ready-fg", dot: "bg-status-ready-border" },
  "in-progress": {
    chip: "bg-status-in-progress-bg text-status-in-progress-fg",
    dot: "bg-status-in-progress-border",
  },
  "in-review": {
    chip: "bg-status-in-review-bg text-status-in-review-fg",
    dot: "bg-status-in-review-border",
  },
  blocked: { chip: "bg-status-blocked-bg text-status-blocked-fg", dot: "bg-status-blocked-border" },
  completed: {
    chip: "bg-status-completed-bg text-status-completed-fg",
    dot: "bg-status-completed-border",
  },
  cancelled: {
    chip: "bg-status-cancelled-bg text-status-cancelled-fg",
    dot: "bg-status-cancelled-border",
  },
};

const KEYWORDS: [RegExp, StatusTone][] = [
  [/(cancel|reject|duplicate|won.?t|abandon|closed without)/i, StatusTone.Cancelled],
  [/(block|changes requested|fail)/i, StatusTone.Blocked],
  [/(done|merged|complete|resolved|approved|confirmed|shipped|closed|linked)/i, StatusTone.Completed],
  [/(review|qa|adjusted|verify)/i, StatusTone.InReview],
  [/(progress|doing|active|started|triaged)/i, StatusTone.InProgress],
  [/(ready|open|todo|to do)/i, StatusTone.Ready],
  [/(draft|backlog|new|proposed|idea)/i, StatusTone.Backlog],
];

/** Repositories name their own statuses, so infer a tone from the words, then from position. */
export function statusTone(status: string, statuses: readonly string[]): StatusTone {
  for (const [pattern, tone] of KEYWORDS) {
    if (pattern.test(status)) return tone;
  }
  const index = statuses.indexOf(status);
  if (index <= 0) return StatusTone.Backlog;
  if (index === statuses.length - 1) return StatusTone.Completed;
  return StatusTone.InProgress;
}

export function statusClasses(status: string, statuses: readonly string[]) {
  return TONE_CLASSES[statusTone(status, statuses)];
}
