# Vue Bundler Performance Comparison

This monorepo demonstrates and measures the performance differences between Vite and Webpack when building Vue applications. It's designed to help teams make data-driven decisions when choosing between these bundlers.

## Project Structure
├── packages/
│   ├── shared/ # Shared components and utilities
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── DataTable.vue # Example shared component
│   │   │   │   ├── HelloWorld.vue # Example shared component
│   │   │   │   └── index.js
│   │   │   └── styles/
│   │   │       └── theme.css
│   ├── app-vite/ # Vite-based Vue application
│   └── app-webpack/ # Webpack-based Vue application
└── scripts/
    └── compareBuilds.js # Build comparison script

## What This Project Measures

1. **Build Performance**
   - Cold build time
   - Bundle size comparison
   - Chunk splitting efficiency
2. **Real-world Scenarios**
   - Handling shared dependencies
   - Processing of shared components
   - CSS processing
   - Third-party dependency handling

## Key Features

- Identical Vue applications built with different bundlers
- Shared component library with real-world complexity
- Third-party dependencies (@tanstack/vue-table, date-fns)
- Automated build comparison metrics

## Getting Started

1. Install dependencies:
   ```bash
   yarn install
   yarn build:all
  ```

## Understanding the Results
The comparison script (scripts/compare-builds.js) generates a report showing:

```bash
Build Comparison Results:
========================
Build Times:
Vite: XXXXms
Webpack: YYYYms
Difference: ZZZZms (XXX faster)

Total Bundle Sizes:
Vite: XX.XX KB
Webpack: YY.YY KB

Vite Output Analysis:
JavaScript Bundles:
  index.[hash].js: XX.XX KB
  vendor.[hash].js: XX.XX KB

Webpack Output Analysis:
  main.[hash].js: YY.YY KB
  vendors.[hash].js: YY.YY KB
```

## Use Cases
This project is useful for:

### Team Decision Making
- Providing objective metrics for bundler selection
- Understanding real-world performance implications

### Performance Optimization
- Identifying bottlenecks in build process
- Understanding chunk splitting effectiveness
- Analyzing dependency impact on bundle size

### Learning
- Understanding how different bundlers handle:
- Shared dependencies
- Code splitting
- CSS processing
- Development vs production builds

## Example Applications
Both applications include:

- A shared DataTable component with sorting capabilities
- Integration with third-party libraries
- Shared styling and theming
- Identical source code for fair comparison

## License
MIT