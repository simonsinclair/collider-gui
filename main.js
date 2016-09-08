'use strict';

var collider = require('./lib/collider');
var cmds = require('./lib/commands');

// Electron
var electron = require('electron');
var app      = electron.app;
var ipcMain  = electron.ipcMain;
var dialog   = electron.dialog;

var os = require('os');
var path = require('path');

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

	var projectDir = '';
	var projectRunning = false;

	var gulp;


	// EVENTS
	//

	ipcMain.on('project-open', function () {
		dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }, function (dir) {

      // If a dir. wasn't selected, don't
      // attempt to load 'collider.json'.
      if (!dir) return;

      // Reduce 'dir' from array to string.
      dir = dir[0];

      collider.load(dir, function (err, data) {
        if (!err) {
          projectDir = dir;
          mainWindow.webContents.send('did-open-project', projectDir, data);
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            buttons: ['Okay'],
            defaultId: 0,
            message: "Unable to open the selected directory.",
            detail: "Please make sure it's a Collider project.",
          });
        }
      });
		});
	});

  ipcMain.on('project-new', function () {
    dialog.showSaveDialog(mainWindow, {
      defaultPath: os.homedir(),
      buttonLabel: 'Create'
    }, function (filename) {

      // If user clicked cancel, do nothing.
      if (!filename) return;

      // To do: verify 'filename' is a valid directory
      //        name before setting 'newProjectDir'.
      var newProjectDir = filename;
      var newProjectDirParsed = path.parse(newProjectDir);

      var cmd = cmds.new({
        name: newProjectDirParsed.name,
        dir: newProjectDirParsed.dir,
        author: 'Unknown',
        matterLibs: [],
      }, function (err) {
        if (err) throw err;

        collider.load(newProjectDir, function (err, data) {
          if (err) throw err;

          // Update 'projectDir' and open
          // the new project in the GUI.
          projectDir = newProjectDir;
          mainWindow.webContents.send('did-open-project', projectDir, data);
        });
      });

      cmd.on('download:progress', function (progress) {
        mainWindow.webContents.send('download:progress', progress);
      });
    });
  })

	ipcMain.on('project-run-stop', function () {
		if (projectRunning) {
			gulp.kill();
		} else {
			gulp = spawn(
				`${projectDir}/node_modules/.bin/gulp`,
				['--cwd', projectDir, '--no-color', 'default']
			);

			projectRunning = true;
			mainWindow.webContents.send('did-run-project');
		}

		gulp.stdout.on('data', function (data) {
			mainWindow.webContents.send('logOut', data.toString());
		});

		gulp.stderr.on('data', function (data) {
			mainWindow.webContents.send('logErr', data.toString());
		});

		gulp.on('error', function (err) {
			mainWindow.webContents.send('logErr', err);
		});

		gulp.on('close', function (code, signal) {
			projectRunning = false;
			mainWindow.webContents.send('did-stop-project', code, signal);
		});
	});

  ipcMain.on('matter:add', function (e, id) {
    collider.load(projectDir, function (err, project) {
      if (err) throw err;

      project.matterLibs.push(id);
      collider.save(projectDir, project, function (err) {
        if (err) throw err;
        mainWindow.webContents.send('project:updated', data);
      });
    });
  });

  ipcMain.on('matter:remove', function (e, id) {
    collider.load(projectDir, function (err, project) {
      if (err) throw err;

      project.matterLibs.push(id);
      collider.save(projectDir, project, function (err) {
        if (err) throw err;
        mainWindow.webContents.send('project:updated', data);
      });
    });
  });

});
