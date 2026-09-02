# Fat Buddha KOT Printer Agent

Dedicated desktop print automation agent for **The Fat Buddha Delight Restro & Cafe**.  
Built with **Electron**, **Node.js**, **Firebase Firestore**, and native Windows thermal printer spooling.

---

## 🗂 Project Structure

```
Fat-Buddha-KOT-Agent/
├── package.json              # App metadata, Electron scripts, electron-builder NSIS packaging
├── firebase-config.json      # Client-side Firebase credentials (No private admin keys)
├── README.md                 # Setup, configuration, build, and troubleshooting guide
├── assets/
│   └── icon.png              # App icon & Windows tray icon
└── src/
    ├── main/
    │   ├── main.js           # Electron Main Process (Single instance, Tray, IPC, Window Lifecycle)
    │   ├── printerService.js # Windows printer enumeration & silent thermal receipt spooler
    │   ├── configStore.js    # Persistent local configuration manager (UserData)
    │   └── logStore.js       # Persistent local print audit logs (UserData)
    ├── preload/
    │   └── preload.js        # Secure contextBridge exposing electronAPI to renderer
    └── renderer/
        ├── index.html        # Modern POS desktop interface (Setup, Dashboard, Audit Logs)
        ├── styles.css        # Restaurant theme, high contrast status dots, dark slate UI
        ├── firebaseService.js# Real-time Firestore onSnapshot & Atomic Claim Transaction
        └── renderer.js       # UI state, printer validation, audio alert, retry queue
```

---

## 🚀 Quick Start (Development Mode)

### Step 1: Install Dependencies
Open a command prompt in the `Fat-Buddha-KOT-Agent` folder:
```bash
cd Fat-Buddha-KOT-Agent
npm install
```

### Step 2: Run the Application
```bash
npm start
```
*Or in development watch mode:*
```bash
npm run dev
```

---

## 📦 Building the Windows .exe Installer

To generate a standalone Windows NSIS installer (`Fat-Buddha-KOT-Agent-Setup.exe`):

```bash
npm run dist
```
*For 64-bit Windows specifically:*
```bash
npm run dist:x64
```

The output installer will be located in:
```
Fat-Buddha-KOT-Agent/dist-installer/Fat-Buddha-KOT-Agent-Setup.exe
```

---

## ⚙️ Configuration Guide

### 1. Where is the Firebase Configuration Located?
The Firebase configuration is located at:
`Fat-Buddha-KOT-Agent/firebase-config.json`

```json
{
  "projectId": "foody-rest",
  "appId": "1:1084112632127:web:e3a07bad0ecdf509e0bb8a",
  "apiKey": "AIzaSyAkmkL4VMCMvP_949gsaiz1R7xOCFupC2M",
  "authDomain": "foody-rest.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-thefatbuddhadeli-18e48495-7c67-4342-966f-526215108def",
  "storageBucket": "foody-rest.firebasestorage.app",
  "messagingSenderId": "1084112632127"
}
```

> 🔒 **Security Notice**: This uses safe client-side authorization. No Firebase Admin SDK service account JSON, private keys, or elevated credentials are included inside the application.

---

### 2. How to Configure the KITCHEN Computer
1. Launch **Fat Buddha KOT Printer Agent** on the Kitchen PC.
2. In the **Settings** view:
   - **Restaurant Name**: `The Fat Buddha Delight Restro & Cafe`
   - **Agent Destination**: Select **`KITCHEN`**
   - **Available Windows Thermal Printer**: Select your kitchen thermal printer (e.g., `Xprinter XP-80C`, `Epson TM-T82`, `POS-80`).
   - **Paper Width**: `80mm Standard` (or `58mm Compact`).
   - Check `[✓] Start Fat Buddha KOT Agent with Windows`.
   - Check `[✓] Automatically retry failed print jobs`.
   - Check `[✓] Play audio chime when new KOT arrives`.
3. Click **[ Test Print Slip ]** to confirm physical printing.
4. Click **[ Save Configuration ]**.
5. The Kitchen Agent will now monitor and print only orders intended for the **KITCHEN**.

---

### 3. How to Configure the RECEPTION / BAR Computer
1. Launch **Fat Buddha KOT Printer Agent** on the Reception / Bar PC.
2. In the **Settings** view:
   - **Restaurant Name**: `The Fat Buddha Delight Restro & Cafe`
   - **Agent Destination**: Select **`RECEPTION`**
   - **Available Windows Thermal Printer**: Select the reception/bar thermal printer.
   - **Paper Width**: `80mm Standard` (or `58mm Compact`).
   - Check `[✓] Start Fat Buddha KOT Agent with Windows`.
3. Click **[ Test Print Slip ]** to confirm physical printing.
4. Click **[ Save Configuration ]**.
5. The Reception Agent will now monitor and print only beverages, bar items, and reception orders.

---

## 💻 Installing on Another Windows Computer

1. Copy `Fat-Buddha-KOT-Agent-Setup.exe` onto a USB drive or download it on the target Windows computer.
2. Double-click `Fat-Buddha-KOT-Agent-Setup.exe`.
3. The installer will:
   - Install the agent into `%LOCALAPPDATA%\Programs\Fat-Buddha-KOT-Agent`
   - Create a desktop shortcut
   - Create a Start Menu shortcut
   - Configure automatic startup with Windows
4. When the app opens, select the Destination (`KITCHEN` or `RECEPTION`) and the local thermal printer.
5. Click **Test Print** to verify.

---

## 🔒 Idempotency & Duplicate Print Protection

The agent guarantees that a KOT is **never printed twice**:
1. When a `PENDING` print job arrives from Firestore, the agent executes an **Atomic Firestore Transaction** on `printJobs/{jobId}`.
2. If another agent or process already marked it `PRINTING` or `PRINTED`, the transaction safely aborts.
3. The agent claims the job by setting `status = 'PRINTING'`.
4. After the physical Windows printer spooler accepts the job, the status is updated to `PRINTED` and `printedAt` is recorded.
5. If the agent restarts or the internet reconnects, `PRINTED` jobs are ignored and never reprinted.

---

## 🛠 Troubleshooting

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Printer Status shows "Offline"** | Printer turned off, USB disconnected, or driver not found | Ensure the thermal printer is powered on and plugged in. Click **"Refresh List"** in Settings. |
| **Firebase shows "Disconnected"** | Internet down or firewall blocking port 443 | Check network connection. The agent will automatically reconnect when internet returns. |
| **Test Print prints blank paper** | Thermal roll inserted upside down | Open the printer lid and ensure the heat-sensitive side of the roll faces the thermal print head. |
| **KOT prints cut off on right side** | Paper width mismatch | If using 58mm printer, change **Paper Format** to `58mm Compact` in Settings. |
| **Jobs stuck in "Failed"** | Printer ran out of paper or paper jam | Fix paper roll, then click **"Retry Failed Jobs"** on the Dashboard. |
| **App closed by accident** | Windows close button clicked | The app minimizes to the Windows System Tray near the clock. Double-click the tray icon to restore. |
