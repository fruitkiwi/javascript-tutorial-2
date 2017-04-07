app.modules.init = ((self) => {

  function _getProducts() {
    app.modules.ajax.api({url: '/api/products'}).then((response) => { app.config.products = response; });
  }

  function _getTraits() {
    app.modules.ajax.api({url: '/api/traits'}).then((response) => { app.config.traits = response; });
  }

  function _init() {
    Array.prototype.diff = function(a) {
      return this.filter(function(i) {return a.indexOf(i) < 0;});
    };
    _getProducts();
    _getTraits();
  }

  self.ready = () => {
    _init();
  };

  return self;
})(app.modules.init || {});
