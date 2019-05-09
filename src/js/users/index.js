'use strict';

var methods = {
  init: function () {
    $('button[data-action=delete]').on('click', function (e) {
      var msg = 'Are you sure you want to delete this user?';
      e.stopPropagation();

      return (confirm(msg));
    });
  }
};

window.bundle = window.bundle || {};
Object.assign(window.bundle, methods);
module.exports = methods;
