(function ($) {
  var methods = {
    init: function () {
      var $that = this;
      var $showbtn = _getButton();

      $showbtn.insertAfter(this).on('click', function (e) {
        methods.showValue(e, $that);
      });
      $showbtn.wrap('<div class="input-group-append"></div>');

      return this;
    },
    showValue: function (e, $field) {
      var $this = $(e.currentTarget);

      e.stopPropagation();

      if ($field.attr('type') === 'password') {
        if ($field.val() === 'placeholder') $field.val('');
        $field.attr('type', 'text');
        $this.text('Hide');
      } else {
        $field.attr('type', 'password');
        $this.text('Show');
      }
    }
  };

  $.fn.reveal = function (arg) {
    if (this.length <= 0) return false;

    if (typeof methods[arg] === 'function') {
      return methods[arg].apply(
        this,
        Array.prototype.slice.call(arguments, 1)
      );
    } else if (typeof arg === 'object' || !arg) {
      return methods.init.apply(this, arguments);
    }

    return ['Sorry, method', arg,
      'does not exist on the Reveal plugin'].join('');
  };

  $.fn.reveal.defaults = {

  };

  function _getButton() {
    var $btn = $([
      '<button type="button" class="btn border"',
      'data-action="revealPassword">Show</button>'
    ].join(''));

    return $btn;
  }
})(jQuery);
