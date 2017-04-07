app.modules.ajax = (function(self) {

  self.api = function(data) {
    return $.ajax({
      url: data.url,
      data: data.data,
      contentType: 'application/json',
      dataType: 'json',
      method: data.method || 'GET',
      beforeSend: data.beforeSend
    });
  }

  return self;
})(app.modules.ajax || {});
