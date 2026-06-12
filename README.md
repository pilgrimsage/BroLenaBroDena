# BroLenaBroDena

BroLenaBroDena is a split-expense and balance-tracking app built as a Laravel API with a React + TypeScript frontend. It helps users manage money with friends and guest contacts, track transactions, settle balances, and receive notifications.

## What It Does

- OTP-based authentication
- Friend requests and friend management
- Shared transactions and running balances
- Settlement suggestions and settlement requests
- Guest contact tracking and guest ledgers
- In-app notifications and push notification support
- Mobile-ready UI with Capacitor

## Tech Stack

- Backend: Laravel 12, Sanctum, Firebase integration, queue workers
- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4
- State and data: Zustand, TanStack Query, Axios
- Mobile: Capacitor for Android and iOS

## Project Structure

- `backend/` contains the Laravel API, database migrations, models, notifications, and server-side business logic.
- `frontend/` contains the React app, pages, components, hooks, stores, and Capacitor configuration.

## Requirements

- PHP 8.2 or newer
- Composer
- Node.js and npm
- A database supported by Laravel

## Setup

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

### Frontend

```bash
cd frontend
npm install
```

## Run Locally

### Backend development

```bash
cd backend
composer run dev
```

This starts the Laravel server, queue listener, log viewer, and Vite dev server together.

### Frontend development

```bash
cd frontend
npm run dev
```

## Available Scripts

### Backend

- `composer run setup` - install dependencies, generate the app key, run migrations, install frontend dependencies, and build assets
- `composer run dev` - start the backend development stack
- `composer run test` - run the Laravel test suite

### Frontend

- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build for production
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build

## App Areas

- Authentication and profile management
- Dashboard for current balances and activity
- Ledger views for friends and guest contacts
- Friends management
- Guest contacts and guest-specific ledgers

## Notes

- The Laravel routes serve the React SPA for non-API paths.
- API routes are protected with Sanctum where authentication is required.
- Push notifications and native mobile UI helpers are wired through the frontend Capacitor layer.