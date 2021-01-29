# json-to-flow

Convert [swagger](http://swagger.io)-style model schemata into
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
    "required": [
      "id",
      "fullname"
    ],
    // If true, will export an inexact object (`{...}`)
    "additionalProperties": false
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

#### Options

```js
// (Shown with type and default value)
type JSONToFlowOptions = {

  // The path to the default template. You can override this. The entirety of the options
  // object is passed to the template so you can add anything you like.
  templatePath: string = path.join(__dirname, 'template.ejs'),

  // The default file extension. Note the leading `.`, intentional so you can add suffixes etc.
  templateExtension: string = '.js.flow',

  // This is populated at runtime with an ejs.compile() call. Replace this if you want to use another
  // template engine.
  templateFn: ?(data: Object) => string = void,

  // Optional hook for transforming data right before it is passed to templateFn.
  preTemplateFn: ?(data: Object) => Object = void,

  // By default, this translator takes in Swagger spec data and translates it to JS as closely
  // as is reasonable. You may not like how it does or may want to add your own hooks - do it here.
  // You can access the default translator at require('json-to-flow').defaults.translateField.
  translateField: (field: {type?: string, $ref?: string, format?: string}, options: JSONToFlowOptions) =>
    {type: string} = defaults.fieldTranslator,

  // If present, defines where the output goes. You can also pass a function.
  // If not present, will call back with compiled template.
  targetPath: ?(string | (modelName: string) => string) = void,

  //
  // Variables used in default template.
  // Note that `modelName` and `modelSchema` is automatically merged into this on every iteration.
  //
  templateData: Object = {
    // In default template, this is what the exported class extends
    modelSuperClass: string = 'Model',
    // In the default template, this is a map of types to add to the top of the file
    additionalTypes: Object = {},
  }
}
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
  array: Array<string>;
  arrayModels: Array<Pet>;
  literal: Promise<Array<Foo>>;
}
```
