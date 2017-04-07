'use strict';

let
  webpack = require('webpack'),
  autoprefixer = require('autoprefixer'),
  ExtractTextPlugin = require('extract-text-webpack-plugin'),
  fs = require('fs');

module.exports = {
  entry: [
    './app/application.js'
  ],
  output: {
    path: __dirname + '/public',
    publicPath: '/public/',
    filename: 'bundle.js'
  },
  devServer: {
    hot: true,
    contentBase: './',
    port: 3333,
    setup: (app) => {
      const
        BODY_PARSER = require('body-parser'),
        DB_ROUTE = __dirname + '/db';

      let
        _productsData = require(DB_ROUTE + '/products.json'),
        _traitsData = require(DB_ROUTE + '/traits.json');


      function _updateItem(id, body) {
        let
          data = Object.assign({id: parseInt(id)}, body),
          item = _productsData.data.find(item => item.id === data.id);

        item = Object.assign(item, data);

        //if (item.values.length === data.values.length) ???

        _saveToFile('products');
        return item;
      }

      function _toggleTraitAssignment(itemId, traitId, method) {
        let
          result, itemIndex, isItemIdPresent,
          trait = _traitsData.data.find(trait => trait.id === traitId);

        isItemIdPresent = !!trait['allowed_products'].filter((id, index) => {
          let expression = id === itemId;

          if (expression) {
            itemIndex = index;
          }

          return expression;
        }).length;

        switch (method) {
          case 'post':
            if (isItemIdPresent) {
              result = {error: 'Product with with id = ' + itemId + ' is already assigned, you should not make unnecessary requests'};
            } else {
              trait['allowed_products'].push(itemId);
              result = trait;
            }
            break;
          case 'delete':
            if (isItemIdPresent) {
              trait['allowed_products'].splice(itemIndex, 1);
              result = trait;
            } else {
              result = {error: 'There is no product with id = ' + itemId + ' to delete, you should not make unnecessary requests'};
            }
            break;
        }

        _saveToFile('traits');
        return result;
      }

      function _saveToFile(file) {
        switch (file) {
          case 'products':
            fs.writeFile(DB_ROUTE + '/products.json', JSON.stringify(_productsData), 'utf-8');
            break;
          case 'traits':
            fs.writeFile(DB_ROUTE + '/traits.json', JSON.stringify(_traitsData), 'utf-8');
            break;
        }
      }

      function _filterProductsData(query) {
        let filteredData = Object.assign({}, _productsData);

        filteredData.data = filteredData.data.filter((item) => {
          let
            key, match;

          for (key in query) {
            match = !!item.traits.find((trait) => {
              return (trait.slug === key) &&
                      !!trait.values.find(value => {
                        return query[key].includes(value.id.toString());
                      });
            });

            if (!match) { return false; }
          }

          return match;
        });

        return filteredData;
      }

      function _updateTraits(traits) {
        traits.forEach((trait) => {
          if (typeof trait.id === 'undefined') {
            trait.id = _generateId();
          }

          trait.values.forEach((value) => {
            if (typeof value.id === 'undefined') {
              value.id = _generateId();
            }
          });
        });

        _traitsData.data = traits;

        return _traitsData;
      }

      function _generateId() {
        return Math.floor((Math.random() * 1000000) + 1);
      }

      app.use(BODY_PARSER.json());
      app.use(BODY_PARSER.urlencoded({extended: true}));
      app.disable('etag');

      app
        .get('/', (req, res) => {
          res.sendFile(__dirname + '/index.html');
        })
        .get('/admin/traits', (req, res) => {
          res.sendFile(__dirname + '/traits.html');
        })
        .get('/api/products', (req, res) => {
          if (Object.keys(req.query).length) {
            let filteredData = _filterProductsData(req.query);
            res.json(filteredData);
          } else {
            res.json(_productsData);
          }
        })
        .put('/api/products/:product_id', (req, res) => {
          let result = _updateItem(req.params.id, req.body);
          res.status(result.error ? 422 : 200).json(result);
        })
        .get('/api/traits', (req, res) => {
          res.json(_traitsData);
        })
        .post('/api/traits', (req, res) => {
          let result = _updateTraits(req.body);
          res.status(result.error ? 422 : 200).json(result);
        })
        .delete('/api/traits/:trait_id/products/:product_id', (req, res) => {
          let result = _toggleTraitAssignment(parseInt(req.params['product_id']), parseInt(req.params['trait_id']), 'delete');
          res.status(result.error ? 422 : 200).json(result);
        })
        .post('/api/traits/:trait_id/products/:product_id', (req, res) => {
          let result = _toggleTraitAssignment(parseInt(req.params['product_id']), parseInt(req.params['trait_id']), 'post');
          res.status(result.error ? 422 : 200).json(result);
        });
    }
  },
  module: {
    loaders: [
      {
        test: /\.scss$/,
        exclude: /(node_modules)/,
        loader: ExtractTextPlugin.extract('style', ['css', 'postcss', 'sass'])
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader?presets[]=es2015'
      },
      {
        test: /\.hbs$/,
        exclude: /(node_modules)/,
        loader: 'handlebars-loader'
      }
    ]
  },
  postcss: function () {
    return [autoprefixer];
  },
  plugins: [
    new ExtractTextPlugin('package.css'),
    new webpack.HotModuleReplacementPlugin()
  ]
};
