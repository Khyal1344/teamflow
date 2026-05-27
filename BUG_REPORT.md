# Debugging Requirement — Bug Report

## Bug: Missing `await` causes task count to return `[object Promise]`

### Location
`backend/src/controllers/task.controller.js` — `getTasks` function

### The Issue
In an earlier version of `getTasks`, the total count was computed without `await`:

```js
// ❌ BUGGY CODE
const tasks = await Task.find(filter).sort(sort).skip(skip).limit(limitNum);
const total = Task.countDocuments(filter); // missing await!

res.status(200).json({
  success: true,
  total,       // returns a Promise object, not a number!
  tasks,
});
```

### Root Cause
`Task.countDocuments()` returns a **Promise**. Without `await`, the variable
`total` holds the unresolved Promise object instead of the actual count number.

The API response would look like:
```json
{
  "success": true,
  "total": {},       // Promise object serialized as empty object
  "tasks": [...]
}
```

This caused:
- Pagination to break (totalPages calculated as NaN)
- Frontend showing "Page 1 of NaN"
- No error thrown — the bug was completely silent

### Why It's Hard to Catch
- No exception is thrown — JavaScript silently serializes the Promise as `{}`
- The tasks array still returns correctly
- Only pagination-dependent features break

### Fix Applied
Use `Promise.all` to run both queries concurrently AND correctly await both:

```js
// ✅ FIXED CODE
const [tasks, total] = await Promise.all([
  Task.find(filter).sort(sort).skip(skip).limit(limitNum)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email'),
  Task.countDocuments(filter),
]);
```

### Benefits of the Fix
1. Both queries run **in parallel** — faster than sequential awaits
2. `total` is now correctly a number
3. Pagination works correctly
4. `totalPages` calculates properly

### Lesson Learned
Always `await` async database operations. Use `Promise.all` when running
multiple independent queries for better performance.
