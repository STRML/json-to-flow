#!/usr/bin/env node

// @flow
const path = require('path');
const jsonToFlow = require('./index');
// $FlowIgnore
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

/*:: import type {Options} from './index' */


const argv = yargs(hideBin(process.argv))
  .option('superClass', {
    type: 'string',
    default: 'Model',
    description: 'The name of the class your generated models should extend.'
  })
  .option('superClassPath', {
    type: 'string',
    default: 'models/_model',
    description: 'The import path for the generated model superclass.'
  })
  .option('templatePath', {
    type: 'string',
    description: 'Optional template file override.'
  })
  .option('targetPath', {
    type: 'string',
    description: 'The target path for generated files.'
  })
  .option('templateExtension', {
    type: 'string',
    default: '.js.flow',
    description: 'The output file extension.'
  })
  .option('inputPath', {
    type: 'string',
    description: 'The input Swagger/OpenAPI JSON file path.'
  })
  .demandOption(['inputPath', 'targetPath'])
  .argv;

const config/*: $Shape<Options> */ = {
  templatePath: argv.templatePath,
  templateData: ({
    modelSuperClass: argv.superClass,
    modelSuperClassPath: argv.superClassPath,
  }/*: $Shape<$PropertyType<Options, 'templateData'>> */),
  templateExtension: argv.templateExtension,
  targetPath: argv.targetPath,
};

// So we don't override defaults
function trimNullUndefined(obj/*: Object */)/*: Object */ {
  return Object.keys(obj).reduce((memo, key) => {
    if (obj[key] != null) memo[key] = obj[key];
    return memo;
  }, {});
}

// $FlowIgnore
const fileContents = require(path.join(__dirname, argv.inputPath));
jsonToFlow('definitions' in fileContents ? fileContents.definitions : fileContents, trimNullUndefined(config));

module.exports = config;
