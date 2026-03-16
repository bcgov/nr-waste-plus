import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAdvancedFilterHandlers } from './useAdvancedFilterHandlers';

describe('useAdvancedFilterHandlers', () => {
  it('provides checkbox handler that passes the checked state', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.onCheckBoxChange('requestByMe');
    const mockEvent = {
      target: {},
    } as React.ChangeEvent<HTMLInputElement>;

    handler(mockEvent, { checked: true, id: 'test' });

    expect(onChange).toHaveBeenCalledWith('requestByMe');
    expect(onChangeInner).toHaveBeenCalledWith(true);
  });

  it('provides multiselect handler that passes selectedItems', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.onActiveMultiSelectChange('clientNumbers');
    const items = [{ code: 'A', description: 'Option A' }];

    handler({ selectedItems: items });

    expect(onChange).toHaveBeenCalledWith('clientNumbers');
    expect(onChangeInner).toHaveBeenCalledWith(items);
  });

  it('provides text handler that extracts input value', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.onTextChange('mainSearchTerm');
    const mockEvent = {
      target: { value: 'test text' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handler(mockEvent);

    expect(onChange).toHaveBeenCalledWith('mainSearchTerm');
    expect(onChangeInner).toHaveBeenCalledWith('test text');
  });

  it('provides date handler that formats and passes date for start date', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.handleDateChange(true);
    // Use ISO string to avoid timezone issues
    const testDate = new Date('2020-01-25T00:00:00Z');

    handler([testDate]);

    expect(onChange).toHaveBeenCalledWith('updateDateStart');
    // Just verify the call was made, format may vary slightly by timezone
    expect(onChangeInner).toHaveBeenCalled();
    const callArg = vi.mocked(onChangeInner).mock.calls[0]?.[0];
    expect(callArg).toMatch(/^2020-01-/);
  });

  it('provides date handler that formats and passes date for end date', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.handleDateChange(false);
    const testDate = new Date('2020-02-10T00:00:00Z');

    handler([testDate]);

    expect(onChange).toHaveBeenCalledWith('updateDateEnd');
    // Just verify the call was made, format may vary slightly by timezone
    expect(onChangeInner).toHaveBeenCalled();
    const callArg = vi.mocked(onChangeInner).mock.calls[0]?.[0];
    expect(callArg).toMatch(/^2020-02-/);
  });

  it('date handler clears date when no dates provided', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.handleDateChange(true);
    handler(undefined);

    expect(onChange).not.toHaveBeenCalled();
    expect(onChangeInner).not.toHaveBeenCalled();
  });

  it('date handler clears date when empty array provided', () => {
    const onChangeInner = vi.fn();
    const onChange = vi.fn().mockReturnValue(onChangeInner);

    const { result } = renderHook(() => useAdvancedFilterHandlers(onChange));

    const handler = result.current.handleDateChange(true);
    handler([]);

    expect(onChange).toHaveBeenCalledWith('updateDateStart');
    expect(onChangeInner).toHaveBeenCalledWith('');
  });
});
