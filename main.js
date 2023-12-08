const { app, BrowserWindow } = require('electron');

const createWindow = () => {
    const win = new BrowserWindow({
      width: 700,
      height: 600,
      maximizable: false,
      fullscreenable: false,
      resizable: false,
      useContentSize: true,
      frame: false,
      
    
       webPreferences: {
        nodeIntegration: true
       }
    });
  
    win.loadFile('src/index.html');
    // win.webContents.openDevTools();
  }

  try {
    require('electron-reloader') (module)

  } catch(_) {}

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
