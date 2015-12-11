'use strict';
var Opt = require('opt');
var opt = Opt.create();

var config = {
  modelSuperClass: 'Model',
  modelSuperClassPath: 'models/_model'
};

// TODO finish this
opt.optionHelp("USAGE json-to-flow",
    "SYNOPSIS\n\n\t\t Converts JSON model definitions into Flow types.",
    "OPTIONS");

opt.option(['--super-class'], function(modelSuperClass) {
  config.modelSuperClass = modelSuperClass;
}, "The name of the class your generated models should extend.");

opt.option(['--super-class-path'], function(modelSuperClassPath) {
  config.modelSuperClassPath = modelSuperClassPath;
}, "The import path for the generated model superclass.");

opt.option(['--target-path'], function(targetPath) {
  config.targetPath = targetPath;
}, "The target path for generated files.");

opt.option(['-h', '--help'], function() { opt.usage(); }, "This help document");

opt.optionWith(process.argv);

console.log(JSON.stringify(config, undefined, 2));

module.exports = config;
