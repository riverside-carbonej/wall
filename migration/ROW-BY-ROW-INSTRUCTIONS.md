# ROW-BY-ROW PROCESSING INSTRUCTIONS

## IMPORTANT: READ THIS BEFORE EVERY ROW

### Process for Each Row:

1. **STATE THE ROW NUMBER**
   - "Processing CSV Row #X of 561"

2. **SHOW THE CSV DATA**
   ```
   CSV Row #X:
   - Name: [First] [Last]
   - Graduation Year: [Year]
   - Branch: [Branch]
   - Rank: [Rank]
   - Service Years: [Years]
   - Status: [Status]
   - Notes: [Notes]
   ```

3. **FIND THE FIREBASE MATCH**
   - Search for the veteran in Firebase by name
   - If found, show their current Firebase data:
   ```
   Firebase Match:
   - ID: [Firebase ID]
   - Name: [Current Name]
   - Graduation Year: [Current Year]
   - Branch: [Current Branch]
   - Rank: [Current Rank]
   - Military Entry: [Current Entry Date]
   - Military Exit: [Current Exit Date]
   ```
   - If NOT found, state: "No match in Firebase - NEW VETERAN"

4. **SHOW THE DIFFERENTIAL**
   ```
   PROPOSED CHANGES:
   ✅ Safe Additions (empty → value):
   - [field]: adding "[value]"
   
   ⚠️ Modifications (value → different value):
   - [field]: "[current]" → "[proposed]"
   
   ❌ Issues Found:
   - [Any typos, conflicts, or concerns]
   ```

5. **ASK FOR APPROVAL**
   ```
   Should I:
   a) Apply these changes as shown
   b) Fix the typo and apply (e.g., "unkniwn" → "unknown")
   c) Skip this row
   d) Apply only certain fields
   ```

6. **WAIT FOR USER RESPONSE**
   - Do NOT proceed to next row until user responds
   - Apply the approved changes
   - Confirm what was done

### Data Quality Checks for Each Row:

- **Branch**: Check for typos (unkniwn → unknown, airforce → Air Force)
- **Dates**: Verify format is correct
- **Names**: Check capitalization is proper
- **Graduation Year**: Flag if year seems wrong (like 2040)
- **Rank**: Standardize formatting

### Current Progress Tracking:

- Store current row number in a variable
- Update after each row is processed
- Can resume from specific row if needed

### CRITICAL RULES:

1. **NEVER** apply data with obvious typos without asking
2. **NEVER** overwrite good data with empty/null
3. **NEVER** proceed to next row without confirmation
4. **ALWAYS** show both current and proposed values for modifications
5. **ALWAYS** re-read this file before processing each row

### Resume Instructions:

If session is interrupted, ask: "What row number should I resume from?"

---

## Start Command:

"Please start processing from Row #1 following the ROW-BY-ROW-INSTRUCTIONS.md"