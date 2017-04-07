app.modules.traits = (function(self) {
  let
    _formTemplate = require('../templates/traits_form.hbs'),
    _rowTemplate = require('../templates/traits_row.hbs'),
    _valueTemplate = require('../templates/traits_value.hbs'),
    _productRowTemplate = require('../templates/product_row.hbs');

  function _makeObjArray(array) {
    return array.reduce((obj, value) => {
      obj[value.name] = value.value;
      return obj;
    }, {});
  }

  function _serializeInputs($root) {
    return $root.find('input, select').serializeArray();
  }

  function _serializeRow($row) {
    let traitObj = _makeObjArray(_serializeInputs($row.find('.js-trait')));
    traitObj.values = [];
    $row.find('.js-trait-value').each(function() {
      traitObj.values.push(_makeObjArray(_serializeInputs($(this))));
    })

    return  traitObj;
  }

  function _serializeForm() {
    var formData = [];

    $('.js-trait-row').each(function() {
      formData.push(_serializeRow($(this)));
    });

    return formData;
  }

  function _findTrait(id) {
    return app.config.traits.data.find(trait => trait.id === id);
  }

  function _mergeTraits(newTraits) {
    newTraits.forEach((newTrait) => {
      if (newTrait.id !== '') {
        newTrait.id = +newTrait.id;

        let oldTrait = _findTrait(newTrait.id);
        Object.keys(oldTrait).forEach((key) => {
          if (!newTrait.hasOwnProperty(key)) {
            newTrait[key] = oldTrait[key];
          }
        });
      } else {
        delete newTrait.id;
        newTrait['allowed_products'] = [];
      }

      newTrait.values.forEach((value) => {
        if (value.id === '') {
          delete value.id;
        } else {
          value.id = +value.id;
        }
      });
    });
  }

  function _submitForm(event) {
    event.preventDefault();

    let newTraits = _serializeForm();
    _mergeTraits(newTraits);

    app.modules.ajax.api({
      url: '/api/traits',
      method: 'post',
      data: JSON.stringify(newTraits)
    }).then((response) => {
      app.config.traits = response;
      _renderTraits();
    });
  }

  function _deleteTraitValue() {
    $(this).closest('.js-trait-value').remove();
  }

  function _deleteTrait() {
    $(this).closest('.js-trait-row').remove();
  }

  function _addTraitValue() {
    $(this).closest('.js-trait-row').find('.js-trait-values').append(_valueTemplate());
  }

  function _addTrait() {
    var $traitRow = $(_rowTemplate());

    $traitRow
      .find('.js-trait-values').append(_valueTemplate()).end()
      .find('.js-assign-products').hide();

    $('.js-traits').append($traitRow);
  }

  function _renderTraits() {
    $('.js-traits-wrapper').html(_formTemplate({traits: app.config.traits.data}));
  }

  function _assignProducts() {
    let
      $popup = $('.js-popup-wrapper').empty(),
      traitId = $(this).data('id'),
      allowedProducts = _findTrait(traitId)['allowed_products'];

    app.config.products.data.forEach((product) => {
      $popup.append(_productRowTemplate({
        product: {
          id: product.id,
          name: product.name,
          checked: allowedProducts.indexOf(product.id) !== -1
        }
      }));
    });

    $popup.dialog({
      modal: true,
      buttons: [
        {
          text: 'Save',
          click: function() {
            _saveProductsAssignation.call(this, traitId, allowedProducts);
          }
        }
      ],
      classes: {
        'ui-dialog': 'products-assignment-popup'
      }
    });
  }

  function _getCheckedProducts($root) {
    return $root.find('.js-product-item:checked').map((idx, item) => +$(item).val()).get();
  }

  function _processAssignments(assignments, params) {
    assignments.forEach(function(id) {
      app.modules.ajax.api({
        url: '/api/traits/' + params.traitId + '/products/' + id,
        method: params.method
      }).then(function(response) {
        app.config.traits.data[params.traitIdx] = response;
      });
    });
  }

  function _saveProductsAssignation(traitId, oldProducts) {
    let
      newProducts = _getCheckedProducts($(this)),
      traitIdx = app.config.traits.data.indexOf(_findTrait(traitId));

    _processAssignments(oldProducts.diff(newProducts), {
      traitId,
      traitIdx,
      method: 'DELETE'
    });
    _processAssignments(newProducts.diff(oldProducts), {
      traitId,
      traitIdx,
      method: 'POST'
    });

    ($(this)).dialog('close');
  }

  function _init() {
    _renderTraits();
  }

  function _listener() {
    $(document)
      .on('click', '.js-traits-submit', _submitForm)
      .on('click', '.js-delete-trait-value', _deleteTraitValue)
      .on('click', '.js-delete-trait', _deleteTrait)
      .on('click', '.js-add-trait-value', _addTraitValue)
      .on('click', '.js-add-trait', _addTrait)
      .on('click', '.js-assign-products', _assignProducts);
  }

  self.load = function() {
    _init();
    _listener();
  };

  return self;
})(app.modules.traits || {});
