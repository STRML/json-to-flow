'use strict';
var data = require('./swagger.json');
var jsonToFlow = require('../index');
var path = require('path');
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
/*eslint-env node, mocha */

var EXPECTED = path.join(__dirname, 'expected');
var RESULTS = path.join(__dirname, 'results');

// Data is like:
// {Model: {
//   id: {
//     type: 'number'
//   },
//   username: {
//     type: 'string'
//   }
// }, ...}
var models = ['Order', 'Instrument', 'User', 'ApiKey'];
var schemata = _(data.definitions)
.pick(models)
.mapValues('properties')
.value();

before(function() {
  fs.readdirSync(RESULTS).forEach(function(fileName) {
    if (path.extname(fileName) === ".flow") fs.unlinkSync(path.join(RESULTS, fileName));
  });
});

describe('json-to-flow', function() {
  it('generates definitions without error', function(done) {
    jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      targetPath: path.join(__dirname, 'results')
    }, function(err, results) {
      assert.equal(err, null);
      assert.equal(_.isEqual(Object.keys(results), models), true);
      done();
    });
  });

  it('generates definition templates equal to spec', function() {
    models.forEach(function(model) {
      var expected = fs.readFileSync(path.join(EXPECTED, model + '.js.flow')).toString();
      var result = fs.readFileSync(path.join(RESULTS, model + '.js.flow')).toString();
      assert.equal(expected, result);
    });
  });

  it('supports targetPath function', function(done) {
    jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      targetPath: function(modelName) {
        return path.join(RESULTS, modelName.toLowerCase() + '.es6.flow');
      }
    }, function(err, results) {
      assert.equal(err, null);
      assert.equal(_.isEqual(Object.keys(results), models), true);
      Object.keys(results).forEach(function(modelName) {
        assert.doesNotThrow(function() {
          fs.accessSync(path.join(RESULTS, modelName.toLowerCase() + '.es6.flow'));
        });
      });
      done();
    });
  });

  it('supports a custom templatePath', function(done) {
    jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      templatePath: path.join(__dirname, 'fixtures', 'customTemplate.ejs')
    }, function(err, results) {
      assert.equal(err, null);
      assert.equal(_.isEqual(Object.keys(results), models), true);
      assert.equal(results.User, fs.readFileSync(path.join(EXPECTED, 'User.custom.js.flow')).toString());
      done();
    });
  });

  it('supports a custom template fn', function(done) {
    jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      templateFn: function(data) {
        return 'custom template for ' + data.modelName;
      }
    }, function(err, results) {
      assert.equal(err, null);
      assert.equal(_.isEqual(Object.keys(results), models), true);
      assert.equal(results.User, 'custom template for User');
      done();
    });
  });

  it('supports a preTemplateFn', function(done) {
    jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      preTemplateFn: function(data) {
        data.modelName = 'Me';
        return data;
      },
      templateFn: function(data) {
        return 'custom template for ' + data.modelName;
      }
    }, function(err, results) {
      assert.equal(err, null);
      assert.equal(_.isEqual(Object.keys(results), models), true);
      assert.equal(results.User, 'custom template for Me');
      done();
    });
  });

  it('supports a custom translateField', function(done) {
    jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      translateField: function translateField(field, options) {
        if (field.items) {
          return {type: 'Array<' + options.translateField(field.items, options).type + '>'};
        }
        // Removed date ref translation
        return field;
      }
    }, function(err, results) {
      assert.equal(err, null);
      var expected = fs.readFileSync(path.join(EXPECTED, 'ApiKey-noDate.js.flow')).toString();
      assert.equal(expected, results.ApiKey);
      done();
    });
  });
});


