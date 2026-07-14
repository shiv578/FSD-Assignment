# BugForge Engineering Report

## Executive Summary

This report summarizes the investigation and remediation of several critical issues within the BugForge application. The primary challenges included an infinite render loop causing UI freezes on the dashboard, a memory leak from unmanaged interval polling, and missing navigational capabilities rendering key project and task views inaccessible. All issues have been successfully resolved, restoring full functionality to the application while adhering strictly to existing architectural constraints.

## Issues Found

### 1. Dashboard Infinite Render Loop

- **Severity:** High
- **Impact:** The Dashboard view (`/dashboard`) was unusable because it froze the browser due to an infinite loop. This completely blocked users from viewing their high-level workspace summary.
- **Root Cause:** In `apps/web/app/(dashboard)/dashboard/page.tsx`, a `useEffect` hook updated a state variable (`renderVersion`) which was also included in its dependency array, resulting in a recursive update cycle.

### 2. App Shell Notification Polling Memory Leak

- **Severity:** Medium
- **Impact:** The notification polling inside `AppShell` continued to spawn intervals without clearing them, causing performance degradation over time and flooding the backend with repetitive API calls upon component re-mounts.
- **Root Cause:** A `setInterval` call in `apps/web/components/app-shell.tsx` lacked a corresponding `clearInterval` inside the `useEffect` cleanup return.

### 3. Missing Navigation and Details Pages

- **Severity:** High
- **Impact:** Users could not view the details of projects or tasks. Consequently, they were unable to create new tasks, update task statuses, or delete tasks.
- **Root Cause:** The project details page (`projects/[projectId]/page.tsx`) and the task details page (`tasks/[taskId]/page.tsx`) were entirely missing from the frontend repository. The existing cards on the `/projects` and `/tasks` pages were also un-clickable.

## Fixes Made and Alternatives Considered

1. **Dashboard Issue:** Removed the `renderVersion` state logic since `react-query` automatically manages fetching and re-rendering when data is stale or invalidated. The alternative of keeping the manual versioning was discarded as it bypassed standard `react-query` patterns.
2. **Memory Leak:** Captured the interval ID and returned a standard `() => clearInterval(interval)` cleanup function in the App Shell's `useEffect`.
3. **Missing Pages:**
   - Wrapped project and task cards in `next/link` components.
   - Created `projects/[projectId]/page.tsx` integrating `react-hook-form` to display project details, list associated tasks, and handle inline task creation via the `POST /projects/:projectId/tasks` endpoint.
   - Created `tasks/[taskId]/page.tsx` implementing a detailed view with a form to quickly modify task `priority` and `status` via the `PATCH /tasks/:taskId` endpoint, and added task deletion capabilities.

## Tests and Manual Verification Performed

- **Builds and Linting:** Verified that all apps build successfully (`pnpm build`) and pass strict linting (`pnpm lint`).
- **Manual UI Verification:**
  - Logged in and verified the dashboard loads smoothly without freezing.
  - Successfully navigated to a project, created a task, navigated to the task, updated its status, and verified the changes persist.
  - Verified that network requests are not spammed in the background.

## Remaining Risks and Recommended Follow-up Work

- **State Management:** The notification interval is basic and could be optimized. Recommended replacing it with a WebSocket or Server-Sent Events (SSE) implementation for real-time, resource-efficient updates.
- **Optimistic UI Updates:** While creating a project implements an optimistic UI update, creating tasks relies on simple invalidation. Standardizing optimistic UI updates across all CRUD operations would improve perceived performance.
