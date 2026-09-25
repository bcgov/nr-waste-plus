import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  formulaConfigurationKeys,
  useFormulaSetList,
  useEffectiveFormulaSet,
  useFormulaSetDetail,
  useCurrentOpenEndedFormulaSet,
  useFormulaVariables,
  useCreateFormulaSet,
  useUpdateFormulaSet,
  useDeleteFormulaSet,
} from './index';

import type {
  FormulaSetResponse,
  FormulaSetEffectiveParams,
  CurrentFormulaSetParams,
  FormulaVariablesParams,
} from '@/services/formulaConfiguration.types';

// Mock the API module
vi.mock('@/services/APIs', () => {
  const mockApi = {
    formulaConfiguration: {
      getFormulaSets: vi.fn(),
      getEffectiveFormulaSet: vi.fn(),
      getFormulaSet: vi.fn(),
      getCurrentOpenEndedFormulaSet: vi.fn(),
      getVariables: vi.fn(),
      createFormulaSet: vi.fn(),
      updateFormulaSet: vi.fn(),
      deleteFormulaSet: vi.fn(),
    },
  };
  return {
    default: mockApi,
  };
});

// Mock react-query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn(),
    })),
  };
});

import API from '@/services/APIs';

const formulaConfiguration = API.formulaConfiguration;

describe('useFormulaConfiguration hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Query Keys ────────────────────────────────────────────────────────────

  describe('formulaConfigurationKeys', () => {
    it('should build the all key', () => {
      expect(formulaConfigurationKeys.all).toEqual(['formulaConfiguration']);
    });

    it('should build the lists key', () => {
      expect(formulaConfigurationKeys.lists()).toEqual(['formulaConfiguration', 'list']);
    });

    it('should build the list key with params', () => {
      const params = { page: 0, size: 20, sort: { startDate: 'DESC' as const } };
      expect(formulaConfigurationKeys.list(params)).toEqual([
        'formulaConfiguration',
        'list',
        params,
      ]);
    });

    it('should build the effective key with params', () => {
      const params: FormulaSetEffectiveParams = { date: '2026-01-01', area: 'INTERIOR' };
      expect(formulaConfigurationKeys.effective(params)).toEqual([
        'formulaConfiguration',
        'effective',
        params,
      ]);
    });

    it('should build the detail key with id', () => {
      expect(formulaConfigurationKeys.detail(42)).toEqual(['formulaConfiguration', 'detail', 42]);
    });

    it('should build the current key with params', () => {
      const params: CurrentFormulaSetParams = { area: 'COASTAL' };
      expect(formulaConfigurationKeys.current(params)).toEqual([
        'formulaConfiguration',
        'current',
        params,
      ]);
    });

    it('should build the variables key with params', () => {
      const params: FormulaVariablesParams = {
        date: '2026-01-01',
        area: 'INTERIOR',
        districtCode: 'DKM',
      };
      expect(formulaConfigurationKeys.variables(params)).toEqual([
        'formulaConfiguration',
        'variables',
        params,
      ]);
    });
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  describe('useFormulaSetList', () => {
    it('should call useQuery with correct key and query function', () => {
      const mockData = {
        content: [],
        page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
      };
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const params = { page: 0, size: 20, sort: { startDate: 'DESC' as const } };
      const { result } = renderHook(() => useFormulaSetList(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.queryKey).toEqual([
        'formulaConfiguration',
        'list',
        { page: 0, size: 20, sort: { startDate: 'DESC' } },
      ]);
      expect(callArgs.queryFn).toEqual(expect.any(Function));
      expect(callArgs.placeholderData).toBeDefined();
      expect(result.current.data).toEqual(mockData);
    });

    it('should execute queryFn and call API', async () => {
      const mockData = {
        content: [],
        page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
      };
      (formulaConfiguration.getFormulaSets as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation(({ queryFn }) => ({
        data: queryFn(),
        isLoading: false,
        isError: false,
      }));

      const params = { page: 0, size: 20, sort: { startDate: 'DESC' as const } };
      renderHook(() => useFormulaSetList(params));

      expect(formulaConfiguration.getFormulaSets).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        sort: expect.any(Array),
      });
    });
  });

  describe('useEffectiveFormulaSet', () => {
    it('should call useQuery with correct key when enabled', () => {
      const mockData: FormulaSetResponse = {
        id: 1,
        area: 'INTERIOR',
        startDate: '2026-06-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const params: FormulaSetEffectiveParams = { date: '2026-11-03', area: 'INTERIOR' };
      const { result } = renderHook(() => useEffectiveFormulaSet(params, true));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'effective', params],
        queryFn: expect.any(Function),
        enabled: true,
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('should not fetch when disabled', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params: FormulaSetEffectiveParams = { date: '2026-11-03', area: 'INTERIOR' };
      renderHook(() => useEffectiveFormulaSet(params, false));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'effective', params],
        queryFn: expect.any(Function),
        enabled: false,
      });
    });

    it('should be disabled when date is missing', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { date: '', area: 'INTERIOR' as const };
      renderHook(() => useEffectiveFormulaSet(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should be disabled when area is missing', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { date: '2026-01-01', area: '' as unknown as 'INTERIOR' };
      renderHook(() => useEffectiveFormulaSet(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should execute queryFn and call API', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 1,
        area: 'INTERIOR',
        startDate: '2026-01-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (formulaConfiguration.getEffectiveFormulaSet as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse,
      );
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation(({ queryFn }) => ({
        data: queryFn(),
        isLoading: false,
        isError: false,
      }));

      const params: FormulaSetEffectiveParams = { date: '2026-01-01', area: 'INTERIOR' };
      renderHook(() => useEffectiveFormulaSet(params));

      expect(formulaConfiguration.getEffectiveFormulaSet).toHaveBeenCalledWith(params);
    });
  });

  describe('useFormulaSetDetail', () => {
    it('should call useQuery with correct key when id is a number', () => {
      const mockData: FormulaSetResponse = {
        id: 42,
        area: 'INTERIOR',
        startDate: '2026-01-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useFormulaSetDetail(42));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'detail', 42],
        queryFn: expect.any(Function),
        enabled: true,
        meta: undefined,
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('should use disabled key when id is undefined', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useFormulaSetDetail(undefined));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.queryKey).toEqual(['formulaConfiguration', 'detail', 'disabled']);
      expect(callArgs.enabled).toBe(false);
    });

    it('should set meta when notificationTarget is provided', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useFormulaSetDetail(1, { notificationTarget: 'test-target' }));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.meta).toEqual({ notificationTarget: 'test-target' });
    });

    it('should not set meta when notificationTarget is not provided', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useFormulaSetDetail(1));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.meta).toBeUndefined();
    });

    it('should execute queryFn and call API', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 42,
        area: 'COASTAL',
        startDate: '2026-01-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (formulaConfiguration.getFormulaSet as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse,
      );
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation(({ queryFn }) => ({
        data: queryFn(),
        isLoading: false,
        isError: false,
      }));

      renderHook(() => useFormulaSetDetail(42));

      expect(formulaConfiguration.getFormulaSet).toHaveBeenCalledWith(42);
    });
  });

  describe('useCurrentOpenEndedFormulaSet', () => {
    it('should call useQuery with correct key and queryFn', () => {
      const mockData: FormulaSetResponse = {
        id: 5,
        area: 'INTERIOR',
        startDate: '2026-01-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const params: CurrentFormulaSetParams = { area: 'INTERIOR' };
      const { result } = renderHook(() => useCurrentOpenEndedFormulaSet(params));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'current', params],
        queryFn: expect.any(Function),
        enabled: true,
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('should be disabled when area is missing', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { area: '' as unknown as 'INTERIOR' };
      renderHook(() => useCurrentOpenEndedFormulaSet(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should respect explicit enabled=false', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params: CurrentFormulaSetParams = { area: 'INTERIOR' };
      renderHook(() => useCurrentOpenEndedFormulaSet(params, false));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should execute queryFn and call API', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 5,
        area: 'INTERIOR',
        startDate: '2026-01-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (
        formulaConfiguration.getCurrentOpenEndedFormulaSet as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockResponse);
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation(({ queryFn }) => ({
        data: queryFn(),
        isLoading: false,
        isError: false,
      }));

      const params: CurrentFormulaSetParams = { area: 'INTERIOR' };
      renderHook(() => useCurrentOpenEndedFormulaSet(params));

      expect(formulaConfiguration.getCurrentOpenEndedFormulaSet).toHaveBeenCalledWith(params);
    });
  });

  describe('useFormulaVariables', () => {
    it('should call useQuery with correct key and queryFn', () => {
      const mockData = {
        effectiveDate: '2026-01-01',
        area: 'INTERIOR',
        namespaces: {},
        flat: { 'da.mature.value': 100 },
        schema: {},
        catalog: [],
      };
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const params: FormulaVariablesParams = {
        date: '2026-01-01',
        area: 'INTERIOR',
        districtCode: 'DKM',
      };
      const { result } = renderHook(() => useFormulaVariables(params));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'variables', params],
        queryFn: expect.any(Function),
        enabled: true,
        staleTime: 300000,
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('should be disabled when date is missing', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { date: '', area: 'INTERIOR' as const, districtCode: 'DKM' };
      renderHook(() => useFormulaVariables(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should be disabled when area is missing', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { date: '2026-01-01', area: '' as unknown as 'INTERIOR', districtCode: 'DKM' };
      renderHook(() => useFormulaVariables(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should be disabled when district code is empty', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params: FormulaVariablesParams = {
        date: '2026-01-01',
        area: 'INTERIOR',
        districtCode: '',
      };
      renderHook(() => useFormulaVariables(params));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should respect explicit enabled=false', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params: FormulaVariablesParams = {
        date: '2026-01-01',
        area: 'INTERIOR',
        districtCode: 'DKM',
      };
      renderHook(() => useFormulaVariables(params, false));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('should execute queryFn and call API', async () => {
      const mockResponse = {
        effectiveDate: '2026-01-01',
        area: 'INTERIOR',
        namespaces: {},
        flat: { 'da.mature.value': 42 },
        schema: {},
        catalog: [],
      };
      (formulaConfiguration.getVariables as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse,
      );
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation(({ queryFn }) => ({
        data: queryFn(),
        isLoading: false,
        isError: false,
      }));

      const params: FormulaVariablesParams = {
        date: '2026-01-01',
        area: 'INTERIOR',
        districtCode: 'DKM',
      };
      renderHook(() => useFormulaVariables(params));

      expect(formulaConfiguration.getVariables).toHaveBeenCalledWith(params);
    });
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  describe('useCreateFormulaSet', () => {
    it('should call useMutation with correct mutation function', () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 10 });
      (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({ invalidateQueries: vi.fn() });

      const { result } = renderHook(() => useCreateFormulaSet());

      expect(useMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      });

      const dto = {
        area: 'INTERIOR' as const,
        startDate: '2026-09-11',
        endDate: null,
        formulas: [],
      };
      result.current.mutateAsync(dto);

      expect(mockMutateAsync).toHaveBeenCalledWith(dto);
    });

    it('should call formulaConfiguration.createFormulaSet', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 10,
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (formulaConfiguration.createFormulaSet as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse,
      );
      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(({ mutationFn }) => ({
        mutateAsync: mutationFn,
        isPending: false,
      }));
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({ invalidateQueries: vi.fn() });

      const { result } = renderHook(() => useCreateFormulaSet());

      const dto = {
        area: 'INTERIOR' as const,
        startDate: '2026-09-11',
        endDate: null,
        formulas: [],
      };
      await result.current.mutateAsync(dto);

      expect(formulaConfiguration.createFormulaSet).toHaveBeenCalledWith(dto);
    });

    it('should invalidate list queries on success', async () => {
      const mockInvalidate = vi.fn();
      const mockResponse: FormulaSetResponse = {
        id: 10,
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };
      (formulaConfiguration.createFormulaSet as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse,
      );

      let capturedOnSuccess: ((data: FormulaSetResponse) => void) | undefined;
      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { mutateAsync: vi.fn(), isPending: false };
      });
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({
        invalidateQueries: mockInvalidate,
      });

      renderHook(() => useCreateFormulaSet());

      capturedOnSuccess!(mockResponse);

      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['formulaConfiguration', 'list'] });
    });
  });

  describe('useUpdateFormulaSet', () => {
    it('should call useMutation with correct mutation function', () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 5 });
      (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({
        invalidateQueries: vi.fn(),
        setQueryData: vi.fn(),
      });

      const { result } = renderHook(() => useUpdateFormulaSet());

      expect(useMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      });

      const dto = {
        area: 'INTERIOR' as const,
        startDate: '2026-09-11',
        endDate: null,
        formulas: [],
      };
      result.current.mutateAsync({ id: 5, dto });

      expect(mockMutateAsync).toHaveBeenCalledWith({ id: 5, dto });
    });

    it('should invalidate list queries and set detail cache on success', async () => {
      const mockInvalidate = vi.fn();
      const mockSetQueryData = vi.fn();
      const mockResponse: FormulaSetResponse = {
        id: 5,
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '',
        updatedAt: '',
      };

      let capturedOnSuccess: ((data: FormulaSetResponse) => void) | undefined;
      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { mutateAsync: vi.fn(), isPending: false };
      });
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({
        invalidateQueries: mockInvalidate,
        setQueryData: mockSetQueryData,
      });

      renderHook(() => useUpdateFormulaSet());

      capturedOnSuccess!(mockResponse);

      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['formulaConfiguration', 'list'] });
      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['formulaConfiguration', 'detail', 5],
        mockResponse,
      );
    });
  });

  describe('useDeleteFormulaSet', () => {
    it('should call useMutation with correct mutation function', () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      (useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({
        invalidateQueries: vi.fn(),
        removeQueries: vi.fn(),
      });

      const { result } = renderHook(() => useDeleteFormulaSet());

      expect(useMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      });

      result.current.mutateAsync(5);

      expect(mockMutateAsync).toHaveBeenCalledWith(5);
    });

    it('should invalidate list queries and remove detail cache on success', async () => {
      const mockInvalidate = vi.fn();
      const mockRemoveQueries = vi.fn();

      let capturedOnSuccess: ((data: undefined, id: number) => void) | undefined;
      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(({ onSuccess }) => {
        capturedOnSuccess = onSuccess;
        return { mutateAsync: vi.fn(), isPending: false };
      });
      (useQueryClient as ReturnType<typeof vi.fn>).mockReturnValue({
        invalidateQueries: mockInvalidate,
        removeQueries: mockRemoveQueries,
      });

      renderHook(() => useDeleteFormulaSet());

      capturedOnSuccess!(undefined, 5);

      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['formulaConfiguration', 'list'] });
      expect(mockRemoveQueries).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'detail', 5],
      });
    });
  });
});
