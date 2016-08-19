'use strict';

// Electron
var electron = require('electron');
var app      = electron.app;
var ipcMain  = electron.ipcMain;
var dialog   = electron.dialog;

require('electron-debug')();
require('fix-path')();

var spawn = require('child_process').spawn;

var mainWindow;

function onClosed() {
	mainWindow = null;
}

function createMainWindow() {
	var win = new electron.BrowserWindow({
		width: 800,
		height: 600,
		titleBarStyle: 'hidden',
	});

	win.loadURL(`file://${__dirname}/index.html`);
	win.on('closed', onClosed);

	return win;
}

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', function () {
	mainWindow = createMainWindow();

	// Collider
	//

	var projectDirPath = '';
	var projectRunning = false;

	var gulp;

	// EVENTS
	//

	ipcMain.on('project-open', function () {
		dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }, function (dir) {
			projectDirPath = dir;

			// If projectDirPath has a collider.json file, then emit
			// event and send contents of collider.json file also.
			mainWindow.webContents.send('did-open-project', dir);
		});
	});

	ipcMain.on('project-run-stop', function () {
		if (projectRunning) {
			gulp.kill();
		} else {
			gulp = spawn(
				`${projectDirPath}/node_modules/.bin/gulp`,
				['--cwd', projectDirPath, '--no-color', 'default']
			);

			projectRunning = true;
			mainWindow.webContents.send('did-run-project');
		}

		gulp.stdout.on('data', function (data) {
			mainWindow.webContents.send('consoleOut', data.toString());
		});

		gulp.stderr.on('data', function (data) {
			mainWindow.webContents.send('consoleErr', data.toString());
		});

		gulp.on('error', function (err) {
			mainWindow.webContents.send('consoleErr', err);
		});

		gulp.on('close', function (code, signal) {
			projectRunning = false;
			mainWindow.webContents.send('did-stop-project', code, signal);
		});
	});
});
