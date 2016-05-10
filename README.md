# json-to-flow

Convert [swagger](http://swagger.io)-style model schemata into
Flow [declaration files](http://flowtype.org/blog/2015/12/01/Version-0.19.0.html#declaration-files) (.js.flow).

### Usage

See [the template](template.ejs) for more details.

You can use your own custom template via the `templateFile` property, or your own template function
via the `templateFn` property.

```js
var jsonToFlow = require('json-to-flow');

// You can generate this yourself from tooling,
// or use the `definitions` property on a Swagger spec.
var schema = {
  User: {
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
  }
};
jsonToFlow(schema, {
  modelSuperClass: 'Model',
  modelSuperClassPath: 'models/_model'
  targetPath: path.join(__dirname, 'models'),
  // templatePath: string, // Pass an optional abs ejs file path, or
  // template: (data: {modelName: string, modelSchema: string,
  //                   modelSuperClass: string, ...options}) => string
}, function(err, results) {
  if (err) return console.error(err);
  console.log(results);
})
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
