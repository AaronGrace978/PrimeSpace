const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

const isDev = process.env.ELECTRON_DEV === 'true';
const frontendDevUrl = process.env.FRONTEND_DEV_URL || 'http://localhost:5173';
const backendPort = process.env.BACKEND_PORT || '3000';
const backendUrl = `http://localhost:${backendPort}`;

function getFrontendDistPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'dist');
  }
  return path.join(__dirname, '..', 'frontend', 'dist');
}

function getBackendEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'dist', 'index.js');
  }
  return path.join(__dirname, '..', 'backend', 'dist', 'index.js');
}

function getBackendRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, '..', 'backend');
}

function startBackend() {
  if (isDev) {
    return;
  }

  const backendEntry = getBackendEntry();
  const backendRoot = getBackendRoot();
  const frontendDist = getFrontendDistPath();

  backendProcess = spawn(process.execPath, [backendEntry], {
    cwd: backendRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: backendPort,
      HOST: '127.0.0.1',
      FRONTEND_URL: backendUrl,
      FRONTEND_DIST: frontendDist
    },
    stdio: 'inherit'
  });

  backendProcess.on('exit', code => {
    if (code !== 0) {
      console.error(`[backend] exited with code ${code}`);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0b0b0b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const loadUrl = isDev ? frontendDevUrl : backendUrl;
  mainWindow.loadURL(loadUrl);

  mainWindow.webContents.on('did-fail-load', () => {
    if (!isDev) {
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.loadURL(loadUrl);
        }
      }, 1000);
    }
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
});
