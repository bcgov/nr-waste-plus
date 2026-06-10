# District Volumes Import Pipeline

## Overview

This directory contains the client-side Excel/CSV parsing pipeline for importing district waste volume data. The pipeline is designed as a **4-layer architecture** with strict separation of concerns to ensure maintainability, testability, and reusability.

## 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4 — ImportResult                                      │
│ { validRecords: T[], errors: RowError[] }                   │
│ ↓ consumed by: Upload Form UI, notifications                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Layer 3 — Zod Validation Schema                             │
│ Validates typed DTOs + collects all RowError[] instances    │
│ Input: Record<string, unknown>[] (raw objects from Layer 1) │
│ Output: ImportResult<ValidatedDTO>                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Layer 2 — Mapper                                            │
│ Transforms raw Record[] → strongly-typed DTOs               │
│ Input: Record<string, unknown>[]                            │
│ Output: Record<string, unknown>[] (now with expected shape) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — ExcelReader                                       │
│ Reads file → first worksheet → raw Record<string, unknown>[]│
│ ✓ Uses SheetJS (xlsx)                                       │
│ ✓ Pure service: NO Zod, React, or UI imports               │
│ ✓ Throws ExcelReadError on file read failures               │
└─────────────────────────────────────────────────────────────┘
```

## Layers

### Layer 1: ExcelReader Service

**File:** `excelReader.ts`

**Responsibility:** Read the workbook file and return raw row data.

**Class:** `ExcelReader`

- **Method:** `async read(file: File, sheetName?: string): Promise<Record<string, unknown>[]>`
  - Accepts a browser `File` object (from file input)
  - Converts file to `ArrayBuffer` using `FileReader`
  - Uses `xlsx.read()` with `{ type: 'array' }` option
  - Selects first worksheet by default or uses provided `sheetName`
  - Converts rows to plain objects via `xlsx.utils.sheet_to_json<Record<string, unknown>>()`
  - Returns array of raw objects with column names as keys (no parsing, no typing)

- **Error Handling:** Throws `ExcelReadError` (custom error) on:
  - File cannot be read (corrupt, unsupported format)
  - Requested sheet not found
  - `FileReader` failures

**Why Layer 1 is pure:**
- ✗ Does NOT import Zod, React, or UI libraries
- ✗ Does NOT validate data
- ✗ Does NOT transform field values
- ✓ Only reads, selects sheet, and returns plain objects

### Layer 2: Mapper

**File:** Not yet created. Future task.

**Responsibility:** Transform raw `Record[]` → strongly-typed DTOs.

Example:
```typescript
export function mapWasteVolumeRow(raw: Record<string, unknown>): WasteVolumeDTO {
  return {
    district: String(raw['District'] ?? ''),
    volume: String(raw['Volume'] ?? ''),
    // ... field-by-field transformation
  };
}
```

### Layer 3: Zod Validation

**File:** Not yet created. Future task.

**Responsibility:** Validate typed DTOs and collect all errors.

Example:
```typescript
export async function validateWasteVolumes(
  rows: WasteVolumeDTO[]
): Promise<ImportResult<ValidatedWasteVolumeDTO>> {
  const validRecords: ValidatedWasteVolumeDTO[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, index) => {
    const result = wasteVolumeSchema.safeParse(row);
    if (result.success) {
      validRecords.push(result.data);
    } else {
      result.error.issues.forEach((issue) => {
        errors.push({
          row: index + 2, // +2 for header + 1-based indexing
          column: String(issue.path[0] ?? 'unknown'),
          message: issue.message,
        });
      });
    }
  });

  return { validRecords, errors };
}
```

### Layer 4: ImportResult Type

**File:** `importResult.ts`

**Responsibility:** Package the final output for UI consumption.

```typescript
export interface ImportResult<T> {
  readonly validRecords: readonly T[];
  readonly errors: readonly RowError[];
}

export interface RowError {
  readonly row: number;           // 1-based row number
  readonly column: string;        // Column header name
  readonly message: string;       // Validation error message
}
```

## Usage Flow

### Step 1: Read File (Layer 1)
```typescript
const reader = new ExcelReader();
const rawRows = await reader.read(fileInput);
// → [{ District: 'Interior', Volume: '123' }, ...]
```

### Step 2: Map Rows (Layer 2)
```typescript
const mappedRows = rawRows.map(mapWasteVolumeRow);
// → [{ district: 'Interior', volume: '123' }, ...]
```

### Step 3: Validate with Zod (Layer 3)
```typescript
const result = await validateWasteVolumes(mappedRows);
// → { validRecords: [...], errors: [...] }
```

### Step 4: Consume in UI (Layer 4)
```typescript
if (result.errors.length > 0) {
  // Highlight rows with errors
  displayRowErrors(result.errors);
}

// Proceed with valid records
uploadWasteVolumes(result.validRecords);
```

## Dependencies

- **SheetJS (xlsx):** MIT-licensed. Supports `.xlsx` and `.csv` formats. Installed via `npm install xlsx`.
- **Zod:** For downstream validation schemas (Layer 3, not included in this task).

## File Constraints

- **Supported formats:** `.csv`, `.xlsx`
- **Max file size:** 500 KB (enforced by UI, not this service)

## Future Tasks

1. **Layer 2 — Interior Mapper** (Issue #906): Transform raw rows → Interior DTO
2. **Layer 2 — Coast Mapper** (Issue #907): Transform raw rows → Coast DTO
3. **Layer 3 — Validation Schemas** (Issue #908): Zod schemas + error collection
4. **Layer 4 — Upload Form Page** (Issue #909): Full integration of all 4 layers

## References

- Architecture brief: Epic — District Average Waste Volume Tables configuration
- Figma design reference: Frame 8 (file upload), Frame 15 (error highlighting)
- Depends on: FileUploadInput component (Task 3)
- Unblocks: Interior mapper (Task 5), Coast mapper (Task 6)
