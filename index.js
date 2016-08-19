var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;
var $ = require('jquery');

// RENDERER EVENTS
//

$('#js-open').on('click', function () {
	ipcRenderer.send('project-open');
});

$('#js-run-stop').on('click', function () {
	ipcRenderer.send('project-run-stop');
});


// MAIN EVENTS
//

var console = '';

ipcRenderer.on('did-open-project', function (e, args) {
	$('#js-run-stop')
		.addClass('enabled')
		.prop('disabled', false);
});

ipcRenderer.on('did-run-project', function (e, args) {
	$('#js-run-stop').text('Stop');
});

ipcRenderer.on('did-stop-project', function (e, args) {
	$('#js-run-stop').text('Run');
});

// Console
ipcRenderer.on('consoleOut', function (e, str) {
	console += str;
	$('#js-console').text(console);
});

ipcRenderer.on('consoleErr', function (e, str) {
	console += str;
	$('#js-console').text(console);
});
