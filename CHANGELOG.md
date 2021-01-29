1.0.1 (Jan 29, 2021)
-----

- Add CLI.

1.0.0 (Jan 29, 2021)
-----

### Breaking Chanages

- Modernize the codebase to promises and remove synchronous i/o. Exports now return Promises and do not accept callbacks.
  - See README for more.
- Input to functions now expects a full OpenAPI schema of the following shape:
  ```js
  type FullSwaggerSchema = {[key: string]: SwaggerModelSchema};
  type SwaggerModelSchema = {
    properties: {[key: string]: Field},
    required?: string[],
    additionalProperties?: boolean,
  };
  type Field = {type: string, $ref?: string, format?: string, items?: Field};
  ```
  Previous versions accepted only the `properties` object.
- Output fields now include `required`, and the default template uses this to determine if it should write a maybe type (e.g. `?string`).
  - That full type:
  ```js
  async function generateDefinitions(schemataObj: FullSwaggerSchema, options: Options): AllModelSchemata

  type AllModelSchemata = {[modelName: string]: ModelSchema};
  type ModelSchema = {[key: string]: FieldOutput};
  type FieldOutput = {type: string, $ref?: string, format?: string, required: boolean};
  ```
- The function `translateField` now accepts two more parameters, `modelSchema` and `key`. The full signature:
  ```js
  function translateField(field: Field, options: Options, modelSchema: SwaggerModelSchema, key: string): FieldOutput
  ```

#### Migrating

- If you were passing `swaggerSpec.definitions.properties` into `jsonToFlow.generateDefinitions()`, now pass the full `swaggerSpec.definitions` object instead.
- Templates:
  - If you are using a custom template, you may update it to use `field.required` if you would like to take advantage of maybe types.
  - If you *were not* using a custom template, and relied upon the old behavior, you can either:
    - Override `translateField` to always return `required: true`, or
    - Use the [template embedded in the 0.3.1 codebase](https://github.com/STRML/json-to-flow/blob/c0ff3ac1d4e07ec8935943128a389bd5199e6e37/template.ejs).

0.3.1 (Sep 18, 2016)
-----

- Bugfix: Don't crash on `#/definitions/x-any`

0.3.0 (Jun 22, 2016)
-----

- Add preTemplateFn and hookable translateField.

0.2.0 (Jun 21, 2016)
-----

- Rework options and data, simplify a bit.

0.1.0 (May 10, 2016)
-----

- Support custom template files via `templateFile` and template functions via `templateFn`.

0.0.1 (Dec 12, 2015)
-----

- Initial commit.
