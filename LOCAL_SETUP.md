# Sybella Systems CORE // Local Execution Manifest

This document outlines the protocols for initializing the Sybella Systems administration platform on a local workstation.

## 1. System Requirements
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm or yarn

## 2. Infrastructure Initialization

### Clone & Install
```bash
# Navigate to project root
npm install
```

### Environment Synchronization
Create a `.env` file in the root directory and synchronize the following credentials:

```env
VITE_SUPABASE_URL=https://idzskawjpmuxbvpnimoo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_phxvXS2C7zR2YjefgDCgng_GMTTGm9b
```

## 3. Launch Sequence
To initialize the development server with Hot Module Replacement (HMR) capabilities:

```bash
npm run dev
```

The platform will be accessible at `http://localhost:3000` (or the port specified in your console output).

## 4. Operational Features
- **Mock Authentication**: Use the "Development Bypass" on the login screen to access the platform without Supabase connectivity.
- **Dynamic Registry**: Access over 200 interconnected operational nodes via the Workspace Engine.
- **Autonomous Core**: Monitor system health and protocol integrity in the Protocols module.

## 5. Security & Integrity
All local sessions are temporary. To persist data, ensure Supabase connectivity is verified via the `lib/supabase.ts` initialization logic.
