const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const {promisify} = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const defaults = {
  templatePath: path.join(__dirname, 'template.ejs'),
  templateData: {
    additionalTypes: {},
    modelSuperClass: 'Model',
  },
  templateExtension: '.js.flow',
  translateField: translateField,
  preTemplateFn: null
};

// Storage for precompiled templates
const templateCache = {};

// This expects an object containing model definitions conforming to the Swagger spec.
// On a typical swagger.json this would be the 'definitions' key.
// See test/ for an example.
// On callback, if there is an error, it's either a template generation error or a file writing error.
async function generateDefinitions(schemataObj, options) {
  options = {
    ...defaults,
    ...options,
    templateData: {...defaults.templateData, ...options.templateData},
  };

  // Allow user to pass in a template function or a file path.
  if (!options.templateFn && options.templatePath) {
    if (!templateCache[options.templatePath]) {
      templateCache[options.templatePath] = ejs.compile((await readFile(options.templatePath)).toString('utf8'));
    }
    options.templateFn = templateCache[options.templatePath];
  }

  const results = generateAllResults(schemataObj, options);
  if (options.targetPath) {
    await writeAllResults(results, options);
  }
  return results;
}

function writeAllResults(results, options) {
  return Promise.all(Object.keys(results).map(function(modelName) {
    let filePath;
    if (typeof options.targetPath === 'function') {
      filePath = options.targetPath(modelName);
    } else {
      filePath = path.join(options.targetPath, modelName + options.templateExtension);
    }
    return writeFile(filePath, results[modelName]);
  }));
}

function generateAllResults(schemataObj, options) {
  return Object.keys(schemataObj).reduce(function(memo, modelName) {
    memo[modelName] = generateJS(modelName, schemataObj[modelName], options);
    return memo;
  }, {});
}

function generateJS(modelName, modelSchema, options) {
  const schema = translateSchema(modelSchema, options);
  let data = {...options.templateData, modelName: modelName, modelSchema: schema};
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
const refRegex = /\/([^/]+?)$/;
const translations = {'x-any': 'any'};
function translateField(field, options) {
  if (field.items) {
    return {type: 'Array<' + options.translateField(field.items, options).type + '>'};
  } else if (field.type === 'string' && (field.format === 'date' || field.format === 'date-time')) {
    return {type: 'Date'};
  } else if (field.$ref) {
    const match = field.$ref.match(refRegex);
    if (match && match.length >= 2) {
      return {type: translations[match[1]] || match[1]};
    }
  }
  return field;
}

module.exports = generateDefinitions;
module.exports.defaults = {...defaults};
