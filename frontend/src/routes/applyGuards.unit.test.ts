import { type ComponentType } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { applyGuards } from '@/routes/applyGuards';
import type { RouteDescription } from '@/routes/routePaths';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockOfflineWrapper = vi.fn();
const mockProtectedWrapper = vi.fn();

vi.mock('@/routes/guards/withOfflineSupport', () => ({
  withOfflineSupport: (Component: ComponentType, options: unknown) =>
    mockOfflineWrapper(Component, options),
}));

vi.mock('@/routes/guards/withProtected', () => ({
  withProtected: (Component: ComponentType, roles: unknown) =>
    mockProtectedWrapper(Component, roles),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const BaseComponent = () => null;
const OfflineWrapped = () => null;
const ProtectedWrapped = () => null;

function makeDesc(overrides: Partial<RouteDescription> = {}): RouteDescription {
  return {
    path: '/test',
    id: 'Test',
    component: BaseComponent,
    isSideMenu: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('applyGuards', () => {
  beforeEach(() => {
    mockOfflineWrapper.mockReturnValue(OfflineWrapped);
    mockProtectedWrapper.mockReturnValue(ProtectedWrapped);
  });

  it('shouldReturnOriginalComponent_whenNoGuardsConfigured', () => {
    const result = applyGuards(makeDesc());
    expect(result).toBe(BaseComponent);
    expect(mockOfflineWrapper).not.toHaveBeenCalled();
    expect(mockProtectedWrapper).not.toHaveBeenCalled();
  });

  it('shouldWrapWithOfflineSupport_whenOfflineReadyIsTrue', () => {
    const result = applyGuards(makeDesc({ offlineReady: true }));
    expect(mockOfflineWrapper).toHaveBeenCalledWith(
      BaseComponent,
      expect.objectContaining({ offlineReady: true }),
    );
    expect(result).toBe(OfflineWrapped);
  });

  it('shouldWrapWithOfflineSupport_whenOfflineOnlyIsTrue', () => {
    const result = applyGuards(makeDesc({ offlineOnly: true }));
    expect(mockOfflineWrapper).toHaveBeenCalledWith(
      BaseComponent,
      expect.objectContaining({ offlineOnly: true }),
    );
    expect(result).toBe(OfflineWrapped);
  });

  it('shouldWrapWithProtected_whenProtectedIsTrue', () => {
    const result = applyGuards(makeDesc({ protected: true }));
    expect(mockProtectedWrapper).toHaveBeenCalledWith(BaseComponent, undefined);
    expect(result).toBe(ProtectedWrapped);
  });

  it('shouldPassRolesToProtected_whenRolesProvided', () => {
    const roles = [{ role: 'ROLE_USER' }] as RouteDescription['roles'];
    const result = applyGuards(makeDesc({ protected: true, roles }));
    expect(mockProtectedWrapper).toHaveBeenCalledWith(BaseComponent, roles);
    expect(result).toBe(ProtectedWrapped);
  });

  it('shouldNotWrapWithProtected_whenProtectedIsFalseOrAbsent', () => {
    applyGuards(makeDesc({ protected: false }));
    expect(mockProtectedWrapper).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mockOfflineWrapper.mockReturnValue(OfflineWrapped);

    applyGuards(makeDesc());
    expect(mockProtectedWrapper).not.toHaveBeenCalled();
  });

  it('shouldApplyCustomGuard_whenGuardsArrayHasOneEntry', () => {
    const GuardedComp = () => null;
    const customGuard = vi.fn().mockReturnValue(GuardedComp);
    const result = applyGuards(makeDesc({ guards: [customGuard] }));
    expect(customGuard).toHaveBeenCalledWith(BaseComponent);
    expect(result).toBe(GuardedComp);
  });

  it('shouldApplyCustomGuardsLeftToRight_whenMultipleGuardsProvided', () => {
    const FirstWrapped = () => null;
    const SecondWrapped = () => null;
    const guardA = vi.fn().mockReturnValue(FirstWrapped);
    const guardB = vi.fn().mockReturnValue(SecondWrapped);

    const result = applyGuards(makeDesc({ guards: [guardA, guardB] }));

    expect(guardA).toHaveBeenCalledWith(BaseComponent);
    expect(guardB).toHaveBeenCalledWith(FirstWrapped);
    expect(result).toBe(SecondWrapped);
  });

  it('shouldApplyOfflineThenProtectedThenCustomGuards_inCorrectOrder', () => {
    const CustomWrapped = () => null;
    const customGuard = vi.fn().mockReturnValue(CustomWrapped);

    const result = applyGuards(
      makeDesc({ offlineReady: true, protected: true, guards: [customGuard] }),
    );

    // 1. offlineSupport wraps base
    expect(mockOfflineWrapper).toHaveBeenCalledWith(
      BaseComponent,
      expect.objectContaining({ offlineReady: true }),
    );
    // 2. protected wraps the offline wrapper output
    expect(mockProtectedWrapper).toHaveBeenCalledWith(OfflineWrapped, undefined);
    // 3. custom guard wraps the protected wrapper output
    expect(customGuard).toHaveBeenCalledWith(ProtectedWrapped);
    expect(result).toBe(CustomWrapped);
  });
});
