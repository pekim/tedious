'use strict';

var parse;

parse = require('../../src/instance-lookup').parseBrowserResponse;

exports.oneInstanceFound = function(test) {
  var response;
  response = 'ServerName;WINDOWS2;InstanceName;SQLEXPRESS;IsClustered;No;Version;10.50.2500.0;tcp;1433;;';
  test.strictEqual(parse(response, 'sqlexpress'), 1433);
  return test.done();
};

exports.twoInstancesFoundInFirst = function(test) {
  var response;
  response = 'ServerName;WINDOWS2;InstanceName;SQLEXPRESS;IsClustered;No;Version;10.50.2500.0;tcp;1433;;' + 'ServerName;WINDOWS2;InstanceName;XXXXXXXXXX;IsClustered;No;Version;10.50.2500.0;tcp;0;;';
  test.strictEqual(parse(response, 'sqlexpress'), 1433);
  return test.done();
};

exports.twoInstancesFoundInSecond = function(test) {
  var response;
  response = 'ServerName;WINDOWS2;InstanceName;XXXXXXXXXX;IsClustered;No;Version;10.50.2500.0;tcp;0;;' + 'ServerName;WINDOWS2;InstanceName;SQLEXPRESS;IsClustered;No;Version;10.50.2500.0;tcp;1433;;';
  test.strictEqual(parse(response, 'sqlexpress'), 1433);
  return test.done();
};

exports.twoInstancesNotFound = function(test) {
  var response;
  response = 'ServerName;WINDOWS2;InstanceName;XXXXXXXXXX;IsClustered;No;Version;10.50.2500.0;tcp;0;;' + 'ServerName;WINDOWS2;InstanceName;YYYYYYYYYY;IsClustered;No;Version;10.50.2500.0;tcp;0;;';
  test.strictEqual(parse(response, 'sqlexpress'), void 0);
  return test.done();
};
