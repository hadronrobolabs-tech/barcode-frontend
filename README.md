# QRScan - Barcode Management Frontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.11.

## Requirements

- Node.js 18.9+ or higher
- npm 9.x or higher

## Development

### Install Dependencies
```bash
npm install
```

### Development Server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Environment Configuration
- **Development**: `src/environments/environment.ts` (uses `http://localhost:3000/`)
- **Production**: `src/environments/environment.prod.ts` (uses Hostinger backend URL)

## Build

### Production Build
```bash
npm run build
```
This will create optimized production files in `dist/qr-scan/` directory.

The production build:
- Uses `environment.prod.ts` automatically
- Enables optimization, AOT compilation, and build optimizer
- Generates hashed filenames for cache busting

### Development Build
```bash
npm run build -- --configuration development
```

## Deployment

See **[HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md)** for detailed deployment instructions to Hostinger.

### Quick Deployment Steps:
1. Build: `npm run build`
2. Upload contents of `dist/qr-scan/` to Hostinger `public_html/`
3. Upload `.htaccess` file to `public_html/`
4. Verify backend API URL in `environment.prod.ts`

## Code Scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Testing

### Unit Tests
Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### End-to-End Tests
Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further Help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
