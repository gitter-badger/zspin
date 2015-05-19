'use strict';

app.controller('SettingsCtrl', ['$scope', 'DOMKeyboard', 'gamepads', 'settings', 'inputs', 'toastr', 'zspin',
  function($scope, DOMKeyboard, gamepads, settings, inputs, toastr, zspin) {

    var gpBinder = gamepads.bindTo($scope);
    var kbBinder = DOMKeyboard.bindTo($scope);
    // the purpose of this is to sort binds for displaying configuration fields
    $scope.sortedBinds = [
      {'name':'up',       'desc': 'Up navigation in menus'},
      {'name':'down',     'desc': 'Down navigation in menus'},
      {'name':'left',     'desc': 'Left navigation in menus'},
      {'name':'right',    'desc': 'Right navigation in menus'},
      {'name':'enter',    'desc': 'Select a menu'},
      {'name':'back',     'desc': 'Go back in a menu'},
      {'name':'home',     'desc': 'Global "show zspin" button, works when zspin is not focused'},
      {'name':'settings', 'desc': 'Go to settings menu'},
      {'name':'devtools', 'desc': 'Show the developer tools window'},
    ];

    var focus = undefined;

    $scope.focus = function(bind, idx) {
      focus = {bind: bind, idx: idx};
    };

    $scope.blur = function() {
      focus = undefined;
    };

    gpBinder.add({combo: '*', callback: function(input) {
      if (!focus) return;
      var binds = $scope.settings.binds;
      binds[focus.bind] = binds[focus.bind] || {};
      binds[focus.bind][focus.idx] = {source: 'gamepad', combo: input.combo};
      if (focus.bind === 'home')
        binds[focus.bind][focus.idx].global = true
      inputs.loadSettings();
    }});

    kbBinder.add({combo: '*', callback: function(input) {
      if (!focus) return;
      var binds = $scope.settings.binds;
      binds[focus.bind] = binds[focus.bind] || {};
      binds[focus.bind][focus.idx] = {source: 'keyboard', combo: input.combo};
      if (focus.bind === 'home')
        binds[focus.bind][focus.idx].global = true
      inputs.loadSettings();
    }});

    // Restore local settings to saved state
    $scope.reset = function() {
      angular.copy(settings.$obj, $scope.settings);
    };

    // Update global settings and persist to disk
    $scope.save = function() {
      if ($scope.settings.hsPath === '') {
        toastr.warning("You must configure HyperSpin.exe path !");
        return;
      }
      $scope.settings.firstRun = false;

      angular.copy($scope.settings, settings.$obj);
      settings.write();
      toastr.success('Settings saved !');
      inputs.loadSettings();
    };

    $scope.settings = {};
    $scope.reset();

    $scope.clear = function(input) {
      $scope.settings.binds[input] = {};
      inputs.loadSettings();
    };

    $scope.setPress = function(event) {
      inputs.unloadSettings();
      // event.currentTarget.value = '<press a key>';
    };

    $scope.cancelInput = function(event) {
      event.preventDefault();
    };

    $scope.updatePath = function() {
      $scope.settings[this.name] = this.value;
      $scope.$apply();
    };

    $scope.openData = function() {
      zspin.gui.Shell.openItem(settings.dataPath());
    };

    $scope.openHS = function() {
      zspin.gui.Shell.openItem(settings.hsPath());
    };

    $scope.openBinary = function() {
      zspin.gui.Shell.openItem(settings.binaryPath());
    };

    $scope.factoryReset = function() {
      settings.deleteSettingsFile();
      zspin.reloadApp();
    };

    if ($scope.settings.firstRun) {
      toastr.info("Welcome to Zspin !<br/>Please configure me !", {
        allowHtml: true,
        timeOut: 5000,
        extendedTimeOut: 5000,
      });
    }

  }
]);
