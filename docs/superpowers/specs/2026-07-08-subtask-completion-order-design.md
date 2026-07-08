# Subtask completion ordering — design

## Problem

On a scheduled day's `ActivityCard`, subtasks (`schedule_entry_sub_activities`) render in a
fixed list with no reordering. When a subtask is checked off, it stays in place instead of
sinking below the still-incomplete items. We want completed subtasks grouped below incomplete
ones, ordered by when they were completed (earliest-completed first, most-recent last), tracked
with a simple integer rather than a timestamp.

## Scope

Applies only to the daily schedule checklist (`schedule_entry_sub_activities`, rendered in
`components/scheduler/ActivityCard.tsx`). The Activity template editor (`activity_sub_activities`)
is out of scope.

## Data model

Add a nullable column to `schedule_entry_sub_activities`:

```sql
ALTER TABLE schedule_entry_sub_activities ADD COLUMN IF NOT EXISTS completed_order INTEGER;
```

- `NULL` when the subtask is incomplete.
- Set to a monotonically increasing integer when marked complete.
- Cleared back to `NULL` when unmarked.

Values come from a dedicated Postgres sequence rather than `MAX(completed_order) + 1`, to avoid
a race if two subtasks are completed in quick succession:

```sql
CREATE SEQUENCE IF NOT EXISTS schedule_entry_sub_activity_completion_seq;
```

Both statements are applied via this repo's existing self-healing pattern (guarded
`ensure...()` function called at the top of the relevant route handler — see
`ensureDaysOfWeekColumn` in `app/api/schedule/route.ts:8-22`), and mirrored into
`lib/schema.sql` so fresh installs get the column and sequence too.

## API changes

`app/api/schedule/[id]/sub-activities/route.ts` (PATCH handler, currently lines 40-57):

- When setting `completed = 1`: also set `completed_order = nextval('schedule_entry_sub_activity_completion_seq')`.
- When setting `completed = 0`: also set `completed_order = NULL`.
- Return the updated row (including `completed_order`) in the response so the client can
  reconcile its optimistic value with the authoritative one.

`app/api/schedule/route.ts` (`attachSubActivities`, currently `ORDER BY id`):

- Change to `ORDER BY completed ASC, completed_order ASC NULLS LAST, id ASC` so the initial
  page load already reflects the correct grouping.

## Client changes

`components/scheduler/ActivityCard.tsx`:

- Add `completed_order: number | null` to the `EntrySubActivity` interface.
- Before mapping `entry.entry_sub_activities` to checkbox rows, derive a sorted copy using the
  same rule as the server: incomplete items first in `id` order, then completed items ascending
  by `completed_order`. This is a pure client-side sort — no new state.

`components/scheduler/DayView.tsx` (`handleToggleSubActivity`, currently lines 301-322):

- On optimistic update when checking a box: assign a local stand-in `completed_order` value
  guaranteed higher than any value currently seen in that entry's subtasks (e.g. a `ref`-held
  counter seeded from the current max), so the item visually sinks to the bottom immediately
  instead of waiting for the PATCH round-trip.
- On unchecking: set `completed_order` to `null` immediately (returns to original `id` position).
- When the PATCH response resolves, overwrite the optimistic `completed_order` with the
  server's authoritative value. Because both are monotonically increasing, this swap never
  changes relative order — no visible jump.

## Behavior summary

- Checking a subtask: moves it to the bottom of the list, below any already-completed items,
  above nothing (it becomes the most-recently-completed).
- Unchecking a subtask: returns it to its original position among incomplete items, ordered by
  `id` (creation order) — not wherever it happened to be right before it was completed.
- Multiple subtasks completed in sequence stack in completion order: first-completed stays
  above later-completed ones.

## Out of scope / non-goals

- No change to `activity_sub_activities` (the per-Activity template list).
- No timestamps — ordering is a plain integer via a Postgres sequence.
- No manual drag-to-reorder; ordering is fully determined by completion state.
