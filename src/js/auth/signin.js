'use strict';

var methods;
require('bootstrap/js/dist/modal');

methods = {
  promptKey: function () {
    var $modalPrompt = jQuery('#keyPrompt');

    $modalPrompt
      .modal('show')
      .on('hide.bs.modal', function () {
        return false;
      });

    $('#groupA').keydown(_.debounce(function () {
      if ($(this).val().length >= 4) $('#groupB').focus();
    }, 100));
  }
};

window.bundle = window.bundle || {};
Object.assign(window.bundle, methods);
module.exports = methods;
