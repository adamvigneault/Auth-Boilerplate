'use strict';

var methods;

methods = {
  init: function () {
    $('a[data-action=cancel]').on('click', function (e) {
      e.preventDefault();

      history.back();
    });
  }
};

window.bundle = window.bundle || {};
Object.assign(window.bundle, methods);
module.exports = methods;
