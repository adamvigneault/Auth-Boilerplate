'use strict';

var methods = {
  init: function () {
    $('#disableAccount').on('click', function (e) {
      var msg = 'Disabling your account will make it invisible throughout the service.';

      e.stopPropagation();

      return (confirm(msg));
    });
  }
};

window.bundle = window.bundle || {};
Object.assign(window.bundle, methods);
module.exports = methods;
