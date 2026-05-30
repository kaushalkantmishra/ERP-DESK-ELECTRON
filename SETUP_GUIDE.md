# ERP Desk Electron Setup Guide

This project is an Electron + React desktop app.

The backend runs separately in a Node.js + Drizzle + PostgreSQL project.

The frontend app currently calls this API:

```txt
http://localhost:5000/api
```

So before using the desktop app, make sure the backend is also running on the same machine.

## 1. What You Need To Download

Install these tools first:

1. Node.js
2. npm
3. PostgreSQL
4. Git

Recommended:

1. Node.js 20+ or 22+
2. Latest npm that comes with Node.js
3. PostgreSQL 14+

To verify installation, run:

```powershell
node -v
npm -v
git --version
psql --version
```

## 2. Project Structure

You will typically have 2 separate projects:

1. Electron React frontend
2. Node.js backend with Drizzle and PostgreSQL

Example:

```txt
ERP-DESK-ELECTRON     -> desktop frontend
ERP-DESK-BACKEND      -> backend API
```

## 3. Frontend Setup

Open terminal in the Electron frontend project:

```powershell
cd E:\kaushal_dev\kaushal\electron\ERP-DESK-ELECTRON
```

Install dependencies:

```powershell
npm install
```

## 4. Backend Setup

Open terminal in your backend project.

Install backend dependencies:

```powershell
npm install
```

Make sure PostgreSQL is installed and running.

Create a database for the project.

Example:

```txt
Database name: erp_db
Username: postgres
Password: your_password
Port: 5432
```

Configure your backend `.env` file with your actual PostgreSQL values.

Typical backend values look like this:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/erp_db
PORT=5000
```

If your backend uses Drizzle migrations, run them from the backend project:

```powershell
npx drizzle-kit generate
npx drizzle-kit migrate
```

If your backend already has scripts, use those instead.

Example:

```powershell
npm run migrate
```

## 5. Start The Backend

From the backend project:

```powershell
npm run dev
```

Make sure the backend starts on:

```txt
http://localhost:5000
```

You can test the API in browser or Postman if your backend exposes a route.

## 6. Start The Electron Frontend In Development

From this project:

```powershell
cd E:\kaushal_dev\kaushal\electron\ERP-DESK-ELECTRON
npm run electron:dev
```

This does two things:

1. Starts the Vite React frontend
2. Starts the Electron desktop app

## 7. Important API Note

This frontend is currently configured in [src/services/api.ts](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/src/services/api.ts) to call:

```txt
http://localhost:5000/api
```

That means:

1. The backend must be running
2. It must use port `5000`
3. It must be reachable from the same machine where the Electron app is running

If your backend runs on a different port or machine, update `src/services/api.ts`.

## 8. Build The Frontend

To build the React frontend only:

```powershell
npm run build
```

This creates the production frontend files in:

```txt
dist
```

## 9. Build Windows Installer And Portable EXE

From this project:

```powershell
npm run electron:build
```

This builds:

1. Windows installer `.exe`
2. Portable `.exe`

Generated output is usually created in:

```txt
dist-electron
```

If you use a custom output path while building, the files may appear in another folder such as:

```txt
dist-release
```

## 10. Current Build Outputs In This Project

The latest generated files are:

1. [ERP Procurement & Inventory Setup 1.0.0.exe](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/dist-release/ERP%20Procurement%20%26%20Inventory%20Setup%201.0.0.exe)
2. [ERP Procurement & Inventory 1.0.0.exe](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/dist-release/ERP%20Procurement%20%26%20Inventory%201.0.0.exe)

## 11. Installer Behavior

The installer is configured to:

1. Ask for install location
2. Create Start Menu shortcut
3. Create Desktop shortcut
4. Install with uninstaller support

## 12. White Screen Fix Already Applied

The packaged Electron app was updated to use `HashRouter` in production so it works correctly after installation.

That fix is in:

1. [src/App.tsx](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/src/App.tsx)

## 13. Common Problems

### npm not running in PowerShell

If PowerShell blocks `npm`, use:

```powershell
npm.cmd install
npm.cmd run electron:dev
npm.cmd run electron:build
```

### White screen after install

Check these:

1. Use the latest build generated after the router fix
2. Make sure backend is running on `http://localhost:5000`
3. Open the packaged app again after backend starts

### API not working

Check these:

1. PostgreSQL is running
2. Backend server is running
3. Backend port is `5000`
4. `src/services/api.ts` matches the backend URL

### Installer build fails

Check these:

1. Close any running packaged app before rebuilding
2. Make sure enough disk space is available
3. Run terminal as normal user or admin if Windows blocks packaging tools

## 14. Recommended Daily Workflow

1. Start PostgreSQL
2. Start backend project
3. Start Electron frontend with `npm run electron:dev`
4. Test the app
5. Build `.exe` files with `npm run electron:build` when needed

## 15. Files You Should Know

Important files in this frontend project:

1. [package.json](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/package.json)
2. [src/App.tsx](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/src/App.tsx)
3. [src/services/api.ts](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/src/services/api.ts)
4. [electron/main.js](e:/kaushal_dev/kaushal/electron/ERP-DESK-ELECTRON/electron/main.js)

## 16. Final Note

This desktop app does not currently bundle the backend inside the installer.

So for now, deployment means:

1. Install the Electron app
2. Keep the backend running separately
3. Keep PostgreSQL configured correctly

If needed later, the next improvement would be:

1. use environment-based API URLs
2. package the backend separately as a service
3. create a full installer flow for both app and backend
