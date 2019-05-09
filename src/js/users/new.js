'use strict';

var methods;
var moment
  = require('moment-timezone/builds/moment-timezone-with-data-2012-2022');
require('../utilities/plugins/reveal.jquery');

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
  preselectTZ: function () {
    if ($('#timeZone option[selected]').length <= 0) {
      $('#timeZone option[value="' + moment.tz.guess() + '"]')
        .attr('selected', 'selected');
    }
  },
  enhancePassword: function () {
    var $pass = $('#password');
    var $confirm = $('#confirmPass');

    $pass.reveal().on('keyup', function () {
      $confirm.val($pass.val());
    });

    $confirm.closest('.form-group').hide();
  },
  highlightSelection: function () {
    $('input[type=radio][data-toggle=radio]').on('click', function () {
      var $this = $(this);

      $('.list-group-item').removeClass('active');
      $($this.data('target')).toggleClass('active', $this.prop('checked'));
    });
  }
};

window.bundle = window.bundle || {};
Object.assign(window.bundle, methods);
module.exports = methods;
