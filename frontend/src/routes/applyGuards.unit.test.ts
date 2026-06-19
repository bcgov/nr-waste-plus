import { type ComponentType } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { RouteDescription } from '@/routes/routePaths';

import { applyGuards } from '@/routes/applyGuards';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockOfflineWrapper = vi.fn();
const mockProtectedWrapper = vi.fn();
const mockFeatureFlagWrapper = vi.fn();

vi.mock('@/routes/guards/withOfflineSupport', () => ({
  withOfflineSupport: (Component: ComponentType, options: unknown) =>
    mockOfflineWrapper(Component, options),
}));

vi.mock('@/routes/guards/withProtected', () => ({
  withProtected: (Component: ComponentType, roles: unknown) =>
    mockProtectedWrapper(Component, roles),
}));

vi.mock('@/routes/guards/withFeatureFlag', () => ({
  withFeatureFlag: (Component: ComponentType, isEnabled: boolean | undefined) =>
    mockFeatureFlagWrapper(Component, isEnabled),
}));

vi.mock('@/env', () => ({
  featureFlags: {
    'test-flag-enabled': true,
    'test-flag-disabled': false,
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const BaseComponent = () => null;
const OfflineWrapped = () => null;
const ProtectedWrapped = () => null;
const FeatureFlagWrapped = () => null;

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
    mockFeatureFlagWrapper.mockReturnValue(FeatureFlagWrapped);
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
    const roles = [{ role: 'ROLE_USER', clients: [] }] as unknown as RouteDescription['roles'];
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

  it('shouldWrapWithFeatureFlag_whenFeatureFlagIsSet', () => {
    const result = applyGuards(makeDesc({ featureFlag: 'test-flag-enabled' }));
    expect(mockFeatureFlagWrapper).toHaveBeenCalledWith(BaseComponent, true);
    expect(result).toBe(FeatureFlagWrapped);
  });

  it('shouldPassCorrectFlagValue_whenFlagIsDisabled', () => {
    const result = applyGuards(makeDesc({ featureFlag: 'test-flag-disabled' }));
    expect(mockFeatureFlagWrapper).toHaveBeenCalledWith(BaseComponent, false);
    expect(result).toBe(FeatureFlagWrapped);
  });

  it('shouldNotWrapWithFeatureFlag_whenFeatureFlagIsAbsent', () => {
    applyGuards(makeDesc());
    expect(mockFeatureFlagWrapper).not.toHaveBeenCalled();
  });

  it('shouldApplyFeatureFlagFirst_thenOffline_thenProtected_thenCustomGuards_inCorrectOrder', () => {
    const CustomWrapped = () => null;
    const customGuard = vi.fn().mockReturnValue(CustomWrapped);

    const result = applyGuards(
      makeDesc({
        featureFlag: 'test-flag-enabled',
        offlineReady: true,
        protected: true,
        guards: [customGuard],
      }),
    );

    // 1. featureFlag wraps base
    expect(mockFeatureFlagWrapper).toHaveBeenCalledWith(BaseComponent, true);
    // 2. offline wraps the featureFlag output
    expect(mockOfflineWrapper).toHaveBeenCalledWith(
      FeatureFlagWrapped,
      expect.objectContaining({ offlineReady: true }),
    );
    // 3. protected wraps the offline output
    expect(mockProtectedWrapper).toHaveBeenCalledWith(OfflineWrapped, undefined);
    // 4. custom guard wraps the protected output
    expect(customGuard).toHaveBeenCalledWith(ProtectedWrapped);
    expect(result).toBe(CustomWrapped);
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
