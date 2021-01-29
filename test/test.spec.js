'use strict';
const data = require('./swagger.json');
const jsonToFlow = require('../index');
const path = require('path');
const _ = require('lodash');
const assert = require('assert');
const fs = require('fs');
/*eslint-env node, mocha */

const EXPECTED = path.join(__dirname, 'expected');
const RESULTS = path.join(__dirname, 'results');

// Data is like:
// {Model: {
//   id: {
//     type: 'number'
//   },
//   username: {
//     type: 'string'
//   }
// }, ...}
const models = ['Order', 'Instrument', 'User', 'ApiKey'];
const schemata = _(data.definitions)
.pick(models)
.mapValues('properties')
.value();

before(function() {
  fs.readdirSync(RESULTS).forEach(function(fileName) {
    if (path.extname(fileName) === ".flow") fs.unlinkSync(path.join(RESULTS, fileName));
  });
});

describe('json-to-flow', function() {
  it('generates definitions without error', async function() {
    const results = await jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      targetPath: path.join(__dirname, 'results')
    });
    assert.equal(_.isEqual(Object.keys(results), models), true);
  });

  it('generates definition templates equal to spec', function() {
    models.forEach(function(model) {
      var expected = fs.readFileSync(path.join(EXPECTED, model + '.js.flow')).toString();
      var result = fs.readFileSync(path.join(RESULTS, model + '.js.flow')).toString();
      assert.equal(expected, result);
    });
  });

  it('supports targetPath function', async function() {
    const results = await jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      targetPath: function(modelName) {
        return path.join(RESULTS, modelName.toLowerCase() + '.es6.flow');
      }
    });
    assert.equal(_.isEqual(Object.keys(results), models), true);
    Object.keys(results).forEach(function(modelName) {
      assert.doesNotThrow(function() {
        fs.accessSync(path.join(RESULTS, modelName.toLowerCase() + '.es6.flow'));
      });
    });
  });

  it('supports a custom templatePath', async function() {
    const results = await jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      templatePath: path.join(__dirname, 'fixtures', 'customTemplate.ejs')
    });
    assert.equal(_.isEqual(Object.keys(results), models), true);
    assert.equal(results.User, fs.readFileSync(path.join(EXPECTED, 'User.custom.js.flow')).toString());
  });

  it('supports a custom template fn', async function() {
    const results = await jsonToFlow(schemata, {
      templateData: {
        modelSuperClass: 'Model',
        modelSuperClassPath: 'models/_model',
      },
      templateFn: function(data) {
        return 'custom template for ' + data.modelName;
      }
    });
    assert.equal(_.isEqual(Object.keys(results), models), true);
    assert.equal(results.User, 'custom template for User');
  });

  it('supports a preTemplateFn', async function() {
    const results = await jsonToFlow(schemata, {
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
    });
    assert.equal(_.isEqual(Object.keys(results), models), true);
    assert.equal(results.User, 'custom template for Me');
  });

  it('supports a custom translateField', async function() {
    const results = await jsonToFlow(schemata, {
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
    });
    const expected = fs.readFileSync(path.join(EXPECTED, 'ApiKey-noDate.js.flow')).toString();
    assert.equal(expected, results.ApiKey);
  });
});


