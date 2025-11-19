import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { useOutsideClick } from './index';

const TestComponent = ({ callback, enabled = true }: { callback: () => void; enabled?: boolean }) => {
	const ref = useRef<HTMLDivElement | null>(null);
	useOutsideClick(ref, callback, enabled);
	return (
		<div>
			<div data-testid="inside" ref={ref}>inside</div>
			<div data-testid="outside">outside</div>
		</div>
	);
};

describe('useOutsideClick', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('invokes callback when clicking outside after listener mounts', () => {
		const callback = vi.fn();
		render(<TestComponent callback={callback} />);

		// Click outside before timers flush (listener not yet attached)
		fireEvent.click(screen.getByTestId('outside'));
		expect(callback).not.toHaveBeenCalled();

		// Flush the setTimeout(0) that adds the listener
		vi.runAllTimers();

		fireEvent.click(screen.getByTestId('outside'));
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('does not invoke callback when clicking inside', () => {
		const callback = vi.fn();
		render(<TestComponent callback={callback} />);
		vi.runAllTimers();

		fireEvent.click(screen.getByTestId('inside'));
		expect(callback).not.toHaveBeenCalled();
	});

	it('does not invoke callback when disabled', () => {
		const callback = vi.fn();
		render(<TestComponent callback={callback} enabled={false} />);
		vi.runAllTimers();

		fireEvent.click(screen.getByTestId('outside'));
		expect(callback).not.toHaveBeenCalled();
	});
});

