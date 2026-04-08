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

All images **must** be in WebP format. WebP provides 25-35% smaller files than PNG and is supported by all modern browsers.

#### Converting images

Use any tool that supports WebP output. On macOS with Python 3 + Pillow:

```bash
pip3 install Pillow

python3 -c "
from PIL import Image
img = Image.open('source.png')
img.save('output.webp', 'WebP', quality=80)
"
```

Or use an online converter such as [squoosh.app](https://squoosh.app).

#### Requirements

| Requirement | Guideline |
|---|---|
| **Format** | WebP (`.webp`). Avoid PNG/JPEG unless a transparency edge-case requires PNG. |
| **Dimensions** | Size the source image to **3× the displayed CSS size** for retina support and no larger. For example, a 160×62 CSS image needs a 480×186 source. |
| **Quality** | Use `quality=80` for photos, `lossless=True` for logos/icons with sharp edges or text. |
| **`width` and `height`** | Always set explicit `width` and `height` attributes on `<img>` elements to prevent layout shifts (CLS). |
| **`fetchPriority`** | Add `fetchPriority="high"` to above-the-fold hero/LCP images so the browser prioritises them. |
| **Location** | Place images in `src/assets/img/`. Vite hashes them into `build/assets/` automatically. |

#### Example

```tsx
import heroImg from '@/assets/img/hero.webp';

<img
  src={heroImg}
  alt="Descriptive alt text"
  width={600}
  height={400}
  fetchPriority="high"
/>
```
