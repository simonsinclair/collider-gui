// index.js
//

'use strict';

var pkg = require('./package.json');

// Electron.
var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;

var tildify = require('tildify');
var Vue = require('vue');
var $ = require('jquery');

Vue.config.devtools = true;
Vue.config.debug = true;


// STATE
//

var state = {
  isStartingProject: false,
  isRunning: false,
  isLoaded: false,

  location: '',

  logText: '',

  matterLibIndex: [],

  // 'collider.json' contents.
  project: {},

  workspaceView: 'matter',

  download: {
    progress: 0
  },

  extract: {
    progress: 0
  },
};


// VIEWS
//

// ADD/REMOVE MATTER
//

Vue.component('workspace-matter', {
  template: '#workspace-matter-tpl',

  props: ['state', 'send'],

  methods: {
    isLibAdded: function (id) {
      var idxOfLib = this.state.project.matterLibs.indexOf(id);
      if (idxOfLib !== -1) {
        return true;
      }
      return false;
    },

    addLib: function (id) {
      this.send('matter:add', id);
    },

    removeLib: function (id) {
      this.send('matter:remove', id);
    },
  },
});


// GENERATE MATTER
//

Vue.component('workspace-generate', {
  template: '#workspace-generate-tpl',

  data: function () {
    return {
      type: '',
      name: '',
      usesData: false,
      destLib: '',
    }
  },

  methods: {
    generate: function () {
      console.log(this.type, this.name, this.usesData, this.destLib);
    }
  },
});


// CONSOLE/LOG
//

Vue.component('workspace-log', {
  template: '#workspace-log-tpl',

  data: function () {
    return { text: '' }
  },

  methods: {
    updateScrollTop: function (scroll) {
      this.$el.scrollTop = this.$el.scrollHeight;
    }
  },

  events: {
    'log:change': function (str) {
      this.text += str;

      // Wait for Vue to update the DOM
      // before calling updateScrollTop().
      this.$nextTick(this.updateScrollTop);
    }
  },
});


// COMPONENTS
//

Vue.component('modal', {
  template: '#modal-tpl',
});


// APP
//

var app = new Vue({
  el: '#app',

  data: {
    state: state,

    collider: {
      version: pkg.version
    },
  },

  // Lifecycle Hook -
  // At this stage all directives have been linked
  // so data changes will trigger DOM updates.
  compiled: function() {
    var app = this;
    $.get('http://getcollider.com/matter.json', function (data, status) {
      if (status === 'success') {
        app.state.matterLibIndex = data.libs;
      }
    }, 'json');
  },

  methods: {
    send: ipcRenderer.send,

    projectRunStop: function () {
      this.send('project-run-stop');

      // Switch to the log on project run.
      if (!this.state.isRunning) {
        this.state.workspaceView = 'log';
      }
    },
  },
});



// EVENTS
//

ipcRenderer.on('download:progress', function (e, progress) {
  state.download.progress = progress;
});

ipcRenderer.on('extract:progress', function (e, progress) {
  state.extract.progress = progress;
});

// Fired on:
// - New, and
// - Open
ipcRenderer.on('did-open-project', function (e, dir, data) {
	state.isLoaded = true;
  state.location = {
    rel: tildify(dir),
    abs: dir,
  };
  state.project = data;
});

// Log.
ipcRenderer.on('logOut', function (e, str) {
  app.$broadcast('log:change', str);
});

ipcRenderer.on('logErr', function (e, str) {
  app.$broadcast('log:change', str);
});

ipcRenderer.on('project:updated', function (e, data) {
  state.project = data;
});

// Run
ipcRenderer.on('starting-project', function (e, data) {
  state.isStartingProject = true;
});

ipcRenderer.on('did-run-project', function (e, args) {
  state.isStartingProject = false;
  state.isRunning = true;
});

ipcRenderer.on('did-stop-project', function (e, args) {
  state.isRunning = false;
});
