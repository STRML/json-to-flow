# json-to-flow

Convert [swagger](http://swagger.io) model schemata into
Flow [declaration files](http://flowtype.org/blog/2015/12/01/Version-0.19.0.html#declaration-files) (.js.flow).

### Usage

See [the template](template.ejs) for more details.

You can use your own custom template via the `templatePath` property, or your own template function
via the `templateFn` property. See the [Options](#options) below.

```js
const jsonToFlow = require('json-to-flow');

// You can generate this yourself from tooling,
// or use the `definitions` property on a Swagger spec.
// Note that this has changed to include the full definition object
// as of 1.0.0.
const schema = {
  User: {
    properties: {
      // primitives
      id: {type: 'number'},
      fullname: {type: 'string'},
      verified: {type: 'boolean'},
      // builtins
      created: {type: 'Date'},
      matcher: {type: 'RegExp'},

      // custom types
      childObj: {type: 'CustomType'},

      // arrays (uses swagger array spec)
      array: {
        type: 'array',
        items: {
          type: 'string' // could be a custom type or builtin too
        }
      },
      arrayModels: {
        type: 'array',
        items: {
          // will translate this into type: 'Pet'
          $ref:  '#/definitions/Pet'
        }
      },

      // Not part of swagger, but illustrating you can put anything in
      literal: {
        type: 'Promise<Array<Foo>>'
      }
    },
    required: [
      "id",
      "fullname"
    ],
    // If true, will export an inexact object (`{...}`)
    additionalProperties: false
  }
};
jsonToFlow(schema, {
  templateData: {
    modelSuperClass: 'Model',
    modelSuperClassPath: 'models/_model'
  },
  targetPath: path.join(__dirname, 'models'),
  // templatePath: string, // Pass an optional abs ejs file path, or
  // templateFn: (data: {modelName: string, modelSchema: string,
  //                   modelSuperClass: string, ...options}) => string
}).then((results) => {
  console.log(results);
})
.catch(console.error);
```

You can also use the CLI:

```
yarn json-to-flow --help

Options:
  --help               Show help                                       [boolean]
  --version            Show version number                             [boolean]
  --superClass         The name of the class your generated models should
                       extend.                       [string] [default: "Model"]
  --superClassPath     The import path for the generated model superclass.
                                             [string] [default: "models/_model"]
  --templatePath       Optional template file override.                 [string]
  --targetPath         The target path for generated files.  [string] [required]
  --templateExtension  The output file extension. [string] [default: ".js.flow"]
  --inputPath          The input Swagger/OpenAPI JSON file path.
                                                             [string] [required]

$ yarn json-to-flow --inputPath swagger.json --targetPath types/auto-generated/
```

#### Options

```js

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
// Note you can add your own fields to this, if your template knows to expect them.
export type TemplateData = {
  // In the default template, this is a map of types to add to the top of the file
  additionalTypes: {[key: string]: Field},
  // In default template, this is what the exported class extends
  modelSuperClass: string,
  // This is the file location of that extended class
  modelSuperClassPath: string,
  modelName: string, // automatically filled in
  modelSchema: ModelSchema, // automatically filled in
};
export type Field = {type: string, $ref?: string, format?: string, items?: Field};
export type FieldOutput = {type: string, $ref?: string, format?: string, required: boolean};

export type Options = {
  // The path to the default template. You can override this. The entirety of the options
  // object is passed to the template so you can add anything you like.
  templatePath: string = path.join(__dirname, 'template.ejs'),

  //
  // Variables used in default template.
  // Note that `modelName` and `modelSchema` is automatically merged into this on every iteration.
  //
  templateData: $Shape<TemplateData> = {modelSuperClass: 'Model', modelSuperClassPath: 'models/_model'},

  // If present, defines where the output goes. You can also pass a function.
  // If not present, will call back with compiled template.
  targetPath?: string | (modelName: string) => string,

  // The default target file extension. Note the leading `.`, intentional so you can add suffixes etc.
  templateExtension: string = '.js.flow',

  // By default, this translator takes in Swagger spec data and translates it to JS as closely
  // as is reasonable. You may not like how it does or may want to add your own hooks - do it here.
  // You can access the default translator at require('json-to-flow').defaults.translateField.
  translateField: (Field, Options, SwaggerModelSchema, string) => FieldOutput = defaults.fieldTranslator,

  // Optional hook for transforming data right before it is passed to templateFn.
  preTemplateFn?: ?(TemplateData) => TemplateData,

  // This is populated at runtime with an ejs.compile() call. Replace this if you want to use another
  // template engine.
  templateFn: (TemplateData) => string,
};
```

#### Example Output

```js
import {Model} from 'models/_model';

export class UserModel extends Model {
  id: number;
  fullname: string;
  verified: boolean;
  created: Date;
  matcher: RegExp;
  childObj: CustomType;
  optionalType: ?string,
  array: Array<string>;
  arrayModels: Array<Pet>;
  literal: Promise<Array<Foo>>;
}
```
