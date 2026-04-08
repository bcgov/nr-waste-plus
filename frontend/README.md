# Harvest Residue System - Waste

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-frontend)

Report logging waste and residue data for billing and cut control

## Development

For more developer information visit the [documentation](https://github.com/bcgov/nr-waste-plus/wiki/Project-Structure) for a broader documentation.

### Component Structure

Every component lives in its own folder with an `index.tsx` and an optional `index.scss`:

```
src/components/MyComponent/
├── index.tsx
├── index.scss
└── index.unit.test.tsx
```

**`index.tsx`** — the component implementation:

```tsx
import type { FC } from 'react';
import './index.scss';

const MyComponent: FC = () => {
  return <div className="my-component">Hello</div>;
};

export default MyComponent;
```

**`index.scss`** — component styles. If you use a Carbon component whose SCSS hasn't been imported yet, add `@use` at the top of this file. Sass deduplicates modules, so it will only be emitted once in the final bundle regardless of how many files import it:

```scss
@use '@carbon/styles/scss/components/toggle';
@use '@carbon/react/scss/spacing' as *;

.my-component {
  padding: $spacing-05;
}
```

> The full list of available component SCSS modules lives in
> `node_modules/@carbon/styles/scss/components/`. The module name matches the
> folder name (e.g. `toggle`, `data-table`, `ui-shell`). Some components like
> `data-table` have sub-modules (`action`, `expandable`, `skeleton`, `sort`).

### Image Usage

All images live in `public/img/` and are served as static assets with deterministic URLs (no content hash). This allows `<link rel="preload">` in `index.html` to discover them immediately — before any JS executes.

#### Format guidelines

| Format | Use for |
|---|---|
| **SVG** | Logos, icons, illustrations — infinitely scalable at any resolution |
| **WebP** | Photos, hero images — 25-35% smaller than PNG/JPEG |

#### Converting photos to WebP

Use any tool that supports WebP output. On macOS with Python 3 + Pillow:

```bash
pip3 install Pillow

python3 -c "
from PIL import Image
img = Image.open('source.png')
img.save('output.webp', 'WebP', quality=50, method=6)
"
```

Or use an online converter such as [squoosh.app](https://squoosh.app).

#### Requirements

| Requirement | Guideline |
|---|---|
| **Format** | SVG for logos/icons, WebP for photos. Avoid PNG/JPEG. |
| **Location** | Place images in `public/img/`. Reference via static paths (e.g., `/img/logo.svg`). |
| **Preload** | Add `<link rel="preload">` in `index.html` for above-the-fold images. |
| **`width` and `height`** | Always set explicit `width` and `height` on `<img>` to prevent layout shifts (CLS). |
| **`fetchPriority`** | Add `fetchPriority="high"` to above-the-fold hero/LCP images. |
| **Quality** | For WebP photos, use `quality=50, method=6` for best compression. |

#### Example

```tsx
{/* SVG logo — scales to any size */}
<img
  src="/img/bc-gov-logo.svg"
  alt="BCGov Logo"
  width={160}
  height={62}
/>

{/* WebP hero image — preloaded in index.html */}
<img
  src="/img/landing.webp"
  alt="Landing cover"
  fetchPriority="high"
/>
```
