# Onboarding Error Fix Guide

## Problem

You're getting this error:
```json
{
  "statusCode": 400,
  "message": "Invalid step: welcome",
  "error": "Bad Request"
}
```

## Root Cause

The onboarding session in your database (ID: `cmfugqov70035s02tpuisqh0i`) has an **incorrect `type` value**. 

The session type should be either:
- `'tenant_setup'` (for tenant admins) - includes 'welcome' step
- `'agent_welcome'` (for agents) - does NOT include 'welcome' step

Your session likely has a wrong type value (e.g., `'agent_onboarding'`, `'agent_welcome'` when it should be `'tenant_setup'`, or some other typo).

## Solution Options

### Option 1: Fix via API (Recommended)

Use the new fix endpoint to correct the session type:

```bash
curl -X PUT 'http://localhost:3000/api/onboarding/fix/cmfugqov70035s02tpuisqh0i' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "tenant_setup",
    "role": "tenant_admin"
  }'
```

This will:
- Reset the session type to `'tenant_setup'`
- Reset the role to `'tenant_admin'`
- Reset to the first step ('welcome')
- Clear completed steps and step data

### Option 2: Delete and Recreate

Delete the session from the database and start fresh:

```sql
-- Check the current session type
SELECT id, type, role, "currentStep" FROM "onboarding_sessions" 
WHERE id = 'cmfugqov70035s02tpuisqh0i';

-- Delete the problematic session
DELETE FROM "onboarding_sessions" WHERE id = 'cmfugqov70035s02tpuisqh0i';
```

Then restart the onboarding flow in the UI.

### Option 3: Direct Database Update

If you want to keep the session but just fix the type:

```sql
UPDATE "onboarding_sessions" 
SET 
  type = 'tenant_setup',
  role = 'tenant_admin',
  "currentStep" = 'welcome',
  "completedSteps" = '[]',
  "stepData" = '{}',
  "lastActivityAt" = NOW()
WHERE id = 'cmfugqov70035s02tpuisqh0i';
```

## Improvements Made

I've added the following improvements to prevent this issue:

1. **Better Error Messages**: The error now shows what the actual session type is and what steps are valid
2. **Type Validation**: Added validation when creating sessions to ensure only valid types are used
3. **Debug Logging**: Added logging to help diagnose type mismatches
4. **Fix Endpoint**: Added `/api/onboarding/fix/:sessionId` to correct session types without database access

## Valid Values

**Onboarding Types:**
- `tenant_setup` - 8-step comprehensive setup for tenant admins
- `agent_welcome` - 5-step training flow for agents

**Roles:**
- `tenant_admin` - For tenant owners/admins
- `agent` - For regular agents

**Tenant Setup Steps:**
1. `welcome` ← You're trying to access this
2. `stripe`
3. `channels`
4. `team`
5. `knowledge-base`
6. `ai-features`
7. `workflows`
8. `complete`

**Agent Steps:**
1. `profile`
2. `tour`
3. `sample-ticket`
4. `knowledge-base-intro`
5. `notifications`

## Next Steps

1. Run Option 1 (API fix) or Option 2 (delete and recreate)
2. Refresh your browser
3. The onboarding should now work correctly

If you continue to have issues, check the API logs - they will now show:
```
Session type: [actual type], Step: welcome, Valid steps: [list of valid steps]
```

This will tell you exactly what type the session has and why it's failing.
