'use strict';

var methods;
var { preselectTZ, highlightSelection, enhancePassword }
  = require('../users/new');

methods = {
  init: function () {
    var formChanged = false;

    $('button[data-action=save]').on('click', function () {
      $(window).off('beforeunload');
    });
    $('a[data-action=cancel]').on('click', function () {
      var msg = 'Are you sure? All changes will be lost.';

      if (formChanged && !confirm(msg)) return false;

      $(window).off('beforeunload');
      return true;
    });
    $('form').on('change keyup paste', ':input', _.once(function () {
      formChanged = true;
      $(window).on('beforeunload', function () { return true; });
    }));
  },
  preselectTZ: preselectTZ,
  highlightSelection: highlightSelection,
  enhancePassword: enhancePassword
};

window.bundle = window.bundle || {};
Object.assign(window.bundle, methods);
module.exports = methods;
