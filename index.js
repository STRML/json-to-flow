var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var templateText = fs.readFileSync(path.join(__dirname, 'template.ejs')).toString('utf8');
var template = ejs.compile(templateText);

var defaults = {
  modelSuperClass: 'Model',
  additionalTypes: []
};

// This expects an object containing model definitions conforming to the Swagger spec.
// On a typical swagger.json this would be the 'definitions' key.
// See test/ for an example.
// On callback, if there is an error, it's either a template generation error or a file writing error.
function generateDefinitions(schemataObj, options, cb) {
  var results;
  try {
    results = generateAllResults(schemataObj, options);
  } catch(e) {
    return process.nextTick(function() { cb(e); }); // don't release zalgo
  }
  if (options.targetPath) {
    writeAllResults(results, options, cb);
  } else {
    process.nextTick(function() { cb(null, results); });
  }
}

function writeAllResults(results, options, cb) {
  var keys = Object.keys(results), counter = 0;
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
      filePath = path.join(options.targetPath, modelName + '.js.flow');
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
  var schema = translateSchema(modelSchema);
  var data = Object.assign({}, defaults, options, {modelName: modelName, modelSchema: schema});
  return template(data);
}

// Translates $refs
var refRegex = /\/(\w+?)$/;
function translateSchema(modelSchema) {
  return Object.keys(modelSchema).reduce(function(memo, key) {
    memo[key] = translateField(modelSchema[key]);
    return memo;
  }, {});
}

function translateField(field) {
  if (field.items) {
    return {type: 'Array<' + translateField(field.items).type + '>'};
  } else {
    return {type: field.$ref ? field.$ref.match(refRegex)[1] : field.type};
  }

}

module.exports = generateDefinitions;
