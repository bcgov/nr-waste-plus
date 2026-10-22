import { createFileRoute } from '@tanstack/react-router';

/**
 * TEMPORARY minimal landing route (S1 foundation).
 *
 * Exists only so `VITE_ROUTER_IMPL=next` boots and renders after the switch is
 * in place. S2 replaces this with the public-only landing behavior; S3 wires
 * the real `LandingPage` and `staticData`.
 */
function PlaceholderLanding() {
  return (
    <div className="cds--grid">
      <div className="cds--row">
        <div className="cds--col">
          <h1>Waste Plus</h1>
          <p>File-based routing placeholder (next router).</p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: PlaceholderLanding,
});
