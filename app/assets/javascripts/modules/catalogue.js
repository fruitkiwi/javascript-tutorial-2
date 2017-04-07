app.modules.catalogue = (function(self) {
  let
    _filter = {},
    _productTemplate = require('../templates/product.hbs'),
    _filterTemplate = require('../templates/filter_block.hbs'),
    _allowedTraitTemplate = require('../templates/allowed_trait.hbs'),
    _$productsContainer,
    _$filtersContainer;

  function _updateFilter($checkbox) {
    var
      name = $checkbox.prop('name'), // Название фильтра
      value = parseInt($checkbox.val()), // Значение фильтра
      checked = $checkbox.is(':checked'); // Флаг, по которому мы поймем добавить или удалить

    if (checked) {
      // При добавлении сначала проверяем есть ли в данный момент фильтр с таким названием
      if (_filter.hasOwnProperty(name)) {
        // Если есть, проверяем есть ли в нем уже значение, которое мы пытаемся добавить
        // Теоретически его там нету, но всегда полезно не доверять данным
        // Если значения, добавляем его в массив значений
        !_filter[name].includes(value) && _filter[name].push(value);
      } else {
        // Если же такого фильтра нету, создаем. И сразу присваиваем ему массив с единственным значением
        _filter[name] = [value];
      }
    } else {
      // Если же нам надо удалить, так же проверяем есть ли такой фильтр уже
      _filter[name] && _filter[name].forEach(function(filterValue, index) {
        // Потом итерируем значения и удаляем нужное нам, если оно есть в массиве
        (filterValue === value) && _filter[name].splice(index, 1);
      });
    }

    // Отправляем запрос на сервер, чтобы обновить товары. Про него ниже.
    _refreshProducts();
  }

  function _refreshProducts() {
    app.modules.ajax.api({
      url: '/api/products',
      data: _filter,
    }).then(function(response) {
      // Получаем новые данные, перезаписываем объект с товарами
      app.config.products = response;
      // Рендерим новый список товаров
      _renderProducts();
    });
  }

  function _renderProducts() {
    _$productsContainer.empty();

    app.config.products.data.forEach(product => {
      _$productsContainer.append(_productTemplate({product}));
    });
  }

  function _renderTraits() {
    app.config.traits.data.forEach(trait => {
      _$filtersContainer.append(_filterTemplate({trait}));
    });
  }

  function _findProduct(id) {
    return app.config.products.data.find(product => product.id === id);
  }

  function _getAllowedTraits(productId) {
    return app.config.traits.data
      .filter(trait => trait['allowed_products'].indexOf(productId) !== -1)
      .map(trait => ({
        id: trait.id,
        name: trait.name,
        slug: trait.slug,
        values: trait.values.map(value => $.extend({}, value))
      }));
  }

  function _getNewTraits(allowedTraits) {
    return $('.js-allowed-trait').get().reduce((arr, traitBlock) => {
      let
        $traitBlock = $(traitBlock),
        traitId = $traitBlock.data('id'),
        trait = $.extend(true, {}, allowedTraits.find(allowedTrait => allowedTrait.id === traitId)),
        values = $traitBlock.find('.js-allowed-trait-value:checked').map((idx, item) => +$(item).val()).get();

      trait.values = trait.values.filter(value => values.indexOf(value.id) !== -1)
        .map(value => ({id: value.id, value: value.value}));
      trait.values.length && arr.push(trait);
      return arr;
    }, []);
  }

  function _assignTraits() {
    let
      $popup = $('.js-popup-wrapper').empty(),
      productId = $(this).data('id'),
      product = $.extend(true, {}, _findProduct(productId)),
      allowedTraits = _getAllowedTraits(productId);

    product.traits.forEach((productTrait) => {
      let allowedTrait = allowedTraits.find(allowedTrait => productTrait.id === allowedTrait.id);

      if (allowedTrait) {
        productTrait.values.forEach((traitValue) => {
          allowedTrait.values.find(allowedTraitValue => allowedTraitValue.id === traitValue.id).checked = true;
        });
      }
    });

    $popup
      .html(_allowedTraitTemplate({traits: allowedTraits}))
      .dialog({
        modal: true,
        buttons: [
          {
            text: 'Save',
            click: function() {
              _sendProduct(product, productId, allowedTraits);
            }
          }
        ],
        classes: {
          'ui-dialog': 'products-assignment-popup'
        }
      });
  }

  function _sendProduct(product, productId, allowedTraits) {
    product.traits = _getNewTraits(allowedTraits);
    app.modules.ajax.api({
      url: `/api/products/${productId}`,
      method: 'PUT',
      data: JSON.stringify(product)
    }).then((response) => {
      app.config.products.data.splice(
        app.config.products.data.findIndex(product => product.id === productId),
        1,
        response
      );
    });
  }

  function _init() {
    _$productsContainer = $('.js-catalogue-products-wrapper');
    _$filtersContainer = $('.js-catalogue-filter-wrapper');

    _renderTraits();
    _renderProducts();
  }

  function _listener() {
    $(document)
      .on('change', '.js-filter', function() {
        _updateFilter($(this));
      })
      .on('click', '.js-catalogue-product', _assignTraits);
  }

  self.load = function() {
    _init();
    _listener();
  }

  return self;
})(app.modules.catalogue || {});
