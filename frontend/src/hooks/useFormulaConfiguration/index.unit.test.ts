import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import API from '@/services/APIs';

const formulaConfiguration = API.formulaConfiguration;

describe('useFormulaConfiguration hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

      const params = { page: 0, size: 20, sort: ['startDate,DESC'] };
      const { result } = renderHook(() =>
        useFormulaSetList(params as unknown as Parameters<typeof useFormulaSetList>[0]),
      );

      // The queryKey includes the params object directly, so we check the structure
      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.queryKey).toEqual([
        'formulaConfiguration',
        'list',
        { page: 0, size: 20, sort: ['startDate,DESC'] },
      ]);
      expect(callArgs.queryFn).toEqual(expect.any(Function));
      expect(callArgs.placeholderData).toBeDefined();
      expect(result.current.data).toEqual(mockData);
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
  });

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
  });

  describe('useFormulaSetDetail', () => {
    it('should call useQuery with correct key and query function when id is provided', () => {
      const mockData: FormulaSetResponse = {
        id: 5,
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

      renderHook(() => useFormulaSetDetail(5));

      const callArgs = (useQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.queryKey).toEqual(['formulaConfiguration', 'detail', 5]);
      expect(callArgs.queryFn).toEqual(expect.any(Function));
      expect(callArgs.enabled).toBe(true);
    });

    it('should be disabled when id is undefined', () => {
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
  });

  describe('useCurrentOpenEndedFormulaSet', () => {
    it('should call useQuery with correct key when enabled', () => {
      const mockData: FormulaSetResponse = {
        id: 12,
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

      const params: CurrentFormulaSetParams = { area: 'INTERIOR' };
      const { result } = renderHook(() => useCurrentOpenEndedFormulaSet(params, true));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'current', params],
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

      const params: CurrentFormulaSetParams = { area: 'INTERIOR' };
      renderHook(() => useCurrentOpenEndedFormulaSet(params, false));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'current', params],
        queryFn: expect.any(Function),
        enabled: false,
      });
    });

    it('should be disabled when area is empty', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { area: '' } as unknown as CurrentFormulaSetParams;
      renderHook(() => useCurrentOpenEndedFormulaSet(params, true));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'current', params],
        queryFn: expect.any(Function),
        enabled: false,
      });
    });
  });

  describe('useFormulaVariables', () => {
    it('should call useQuery with correct key and staleTime when enabled', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params: FormulaVariablesParams = { date: '2026-11-03', area: 'INTERIOR' };
      renderHook(() => useFormulaVariables(params, true));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'variables', params],
        queryFn: expect.any(Function),
        enabled: true,
        staleTime: 5 * 60 * 1000,
      });
    });

    it('should not fetch when disabled', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params: FormulaVariablesParams = { date: '2026-11-03', area: 'INTERIOR' };
      renderHook(() => useFormulaVariables(params, false));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'variables', params],
        queryFn: expect.any(Function),
        enabled: false,
        staleTime: 5 * 60 * 1000,
      });
    });

    it('should be disabled when date is empty', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { date: '', area: 'INTERIOR' } as FormulaVariablesParams;
      renderHook(() => useFormulaVariables(params, true));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'variables', params],
        queryFn: expect.any(Function),
        enabled: false,
        staleTime: 5 * 60 * 1000,
      });
    });

    it('should be disabled when area is empty', () => {
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const params = { date: '2026-11-03', area: '' } as unknown as FormulaVariablesParams;
      renderHook(() => useFormulaVariables(params, true));

      expect(useQuery).toHaveBeenCalledWith({
        queryKey: ['formulaConfiguration', 'variables', params],
        queryFn: expect.any(Function),
        enabled: false,
        staleTime: 5 * 60 * 1000,
      });
    });
  });
});
