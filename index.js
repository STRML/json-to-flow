var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var assign = require('object-assign');

var defaults = {
  templatePath: path.join(__dirname, 'template.ejs'),
  templateData: {
    additionalTypes: {},
    modelSuperClass: 'Model',
  },
  templateExtension: '.js.flow',
  translateField: translateField,
  preTemplateFn: null
};

var templateCache = {};
templateCache[defaults.templatePath] = ejs.compile(fs.readFileSync(defaults.templatePath).toString('utf8'));

// This expects an object containing model definitions conforming to the Swagger spec.
// On a typical swagger.json this would be the 'definitions' key.
// See test/ for an example.
// On callback, if there is an error, it's either a template generation error or a file writing error.
function generateDefinitions(schemataObj, options, cb) {

  options.templateData = assign({}, defaults.templateData, options.templateData || {});
  options = assign({}, defaults, options);

  // Allow user to pass in a template function or a file path.
  if (!options.templateFn && options.templatePath) {
    if (!templateCache[options.templatePath]) {
      templateCache[options.templatePath] = ejs.compile(fs.readFileSync(options.templatePath).toString('utf8'));
    }
    options.templateFn = templateCache[options.templatePath];
  }

  var results;
  try {
    results = generateAllResults(schemataObj, options);
  } catch (e) {
    return process.nextTick(function() { cb(e); }); // don't release zalgo
  }
  if (options.targetPath) {
    writeAllResults(results, options, cb);
  } else {
    process.nextTick(function() { cb(null, results); });
  }
}

function writeAllResults(results, options, cb) {
  var keys = Object.keys(results);
  var counter = 0;
  function done(err) {
    if (counter === -1) return;
    if (++counter === keys.length || err) {
      counter = -1;
      return cb(err, results);
    }
  }
  keys.forEach(function(modelName) {
    var filePath;
    if (typeof options.targetPath === 'function') {
      filePath = options.targetPath(modelName);
    } else {
      filePath = path.join(options.targetPath, modelName + options.templateExtension);
    }
    fs.writeFile(filePath, results[modelName], done);
  });
}

function generateAllResults(schemataObj, options) {
  return Object.keys(schemataObj).reduce(function(memo, modelName) {
    memo[modelName] = generateJS(modelName, schemataObj[modelName], options);
    return memo;
  }, {});
}

function generateJS(modelName, modelSchema, options) {
  var schema = translateSchema(modelSchema, options);
  var data = assign({}, options.templateData, {modelName: modelName, modelSchema: schema});
  if (options.preTemplateFn) data = options.preTemplateFn(data);
  return options.templateFn(data);
}

function translateSchema(modelSchema, options) {
  return Object.keys(modelSchema).reduce(function(memo, key) {
    memo[key] = options.translateField(modelSchema[key], options);
    return memo;
  }, {});
}

// Translates $refs
var refRegex = /\/([^\/]+?)$/;
var translations = {'x-any': 'any'};
function translateField(field, options) {
  if (field.items) {
    return {type: 'Array<' + options.translateField(field.items, options).type + '>'};
  } else if (field.type === 'string' && (field.format === 'date' || field.format === 'date-time')) {
    return {type: 'Date'};
  } else if (field.$ref) {
    var match = field.$ref.match(refRegex);
    if (match && match.length >= 2) {
      return {type: translations[match[1]] || match[1]};
    }
  }
  return field;
}

module.exports = generateDefinitions;
module.exports.defaults = assign({}, defaults);
