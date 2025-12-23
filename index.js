// @flow
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const {promisify} = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/*::
export type FullSwaggerSchema = {
  [key: string]: SwaggerModelSchema,
};
export type SwaggerModelSchema = {
  properties: {[key: string]: Field},
  required?: string[],
  additionalProperties?: boolean,
};
export type ModelSchema = {
  [key: string]: FieldOutput;
};
export type AllModelSchemata = {
  [modelName: string]: ModelSchema
};
export type TemplateData = {
  additionalTypes: {[key: string]: Field},
  modelSuperClass: string,
  modelSuperClassPath: string,
  modelName: string,
  modelSchema: ModelSchema,
};
export type Options = {
  templatePath: string,
  templateData: TemplateData,
  templateExtension: string,
  targetPath?: string | (modelName: string) => string,
  translateField: (Field, Options, SwaggerModelSchema, string) => FieldOutput,
  preTemplateFn?: ?(TemplateData) => TemplateData,
  templateFn: (TemplateData) => string,
};
export type Field = {type: string, $ref?: string, format?: string, items?: Field};
export type FieldOutput = {type: string, $ref?: string, format?: string, required: boolean};
export type $DeepShape<O: Object> = Object & $Shape<
  $ObjMap<O, (<V: Object>(V) => $DeepShape<V>) | (<V>(V) => V)>
>;

*/
const defaults = {
  templatePath: (path.join(__dirname, 'template.ejs')/*: string */),
  templateData: {
    additionalTypes: ({}/*: Object */),
    modelSuperClass: 'Model',
    modelSuperClassPath: 'models/_model',
  },
  templateExtension: '.js.flow',
  translateField: translateField,
  preTemplateFn: null,
};

// Storage for precompiled templates
const templateCache = {};

// This expects an object containing model definitions conforming to the Swagger spec.
// On a typical swagger.json this would be the 'definitions' key.
// See test/ for an example.
// On callback, if there is an error, it's either a template generation error or a file writing error.
async function generateDefinitions(schemataObj/*: FullSwaggerSchema */, options/*: $DeepShape<Options> */)/*: AllModelSchemata */ {
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
    await writeAllResults(options.targetPath, results, options.templateExtension);
  }
  return results;
}

function writeAllResults(targetPath, results, templateExtension) {
  return Promise.all(Object.keys(results).map(function(modelName) {
    let filePath;
    if (typeof targetPath === 'function') {
      filePath = targetPath(modelName);
    } else {
      filePath = path.join(targetPath, modelName + templateExtension);
    }
    return writeFile(filePath, results[modelName]);
  }));
}

// Given the full schema object, parse each model's definition.
function generateAllResults(schemataObj/*: FullSwaggerSchema */, options)/*: AllModelSchemata */ {
  return Object.keys(schemataObj).reduce(function(memo, modelName) {
    memo[modelName] = generateJS(modelName, schemataObj[modelName], options);
    return memo;
  }, {});
}

// Given each model, generate a definition.
function generateJS(modelName/*: string */, modelSchema/*: SwaggerModelSchema */, options) {
  const schema = translateSchema(modelSchema, options);
  let data = {...options.templateData, modelName: modelName, modelSchema: schema};
  if (options.preTemplateFn) data = options.preTemplateFn(data);
  return options.templateFn(data);
}

// Given a schema, turn the `type` field into something Flow-writable, and add `required.`
function translateSchema(modelSchema/*: SwaggerModelSchema */, options)/*: ModelSchema */ {
  return Object.keys(modelSchema.properties || {}).reduce(function(memo, key) {
    memo[key] = options.translateField(modelSchema.properties[key], options, modelSchema, key);
    return memo;
  }, {});
}

// Translates $refs
const refRegex = /\/([^/]+?)$/;
const translations = {'x-any': 'any'};
function translateField(field/*: Field */, options/*: Options */, modelSchema/*: SwaggerModelSchema */, key/*: string */)/*: FieldOutput */ {
  const fieldDef = {
    ...field,
    // Marks a field as required or optional.
    // Swagger/OpenAPI schemata have a `required` array of keys.
    required: (modelSchema && modelSchema.required ? modelSchema.required : []).includes(key),
  };
  if (field.items) {
    fieldDef.type = 'Array<' + options.translateField(field.items, options, modelSchema, key).type + '>';
  } else if (field.type === 'string' && (field.format === 'date' || field.format === 'date-time')) {
    fieldDef.type = 'Date';
  } else if (field.$ref) {
    const match = field.$ref.match(refRegex);
    if (match && match.length >= 2) {
      fieldDef.type = translations[match[1]] || match[1];
    }
  }
  return fieldDef;
}


module.exports = generateDefinitions;
module.exports.defaults = {...defaults};
