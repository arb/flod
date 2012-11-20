var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var uuid = require('node-uuid');

var Statistics = module.exports = function () {
  
};

Statistics.prototype.initStatistics = function () {

  this.benchmark = null; // stores the current benchmark
  this._startTime = null; // stores start time while other code might still be starting up
};

Statistics.prototype.now = function () {

  return Date.now() / 1000 >> 0;
};

Statistics.prototype.register = function (query) {

  this.debug('#register');
  var id = query.id || uuid.v4();
  if (this.benchmark !== null) {
    var msg = "Benchmark in progress, please wait until finished";
    this.debug("#register", msg);
    return msg;
  }
  
  delete query.id;
  this.benchmark = {
    id: id,
    query: query
  };
  this.debug('#register benchmark set')
  
  if (this._startTime !== null) {
    this.benchmark['started'] = this._startTime;
    this._startTime = null;
  }
  
  this.debug('#register return')
  return this.benchmark;
}

Statistics.prototype.unregister = function (id) {

  this.debug('#unregister', arguments);
  if (id == null || 
      (this.benchmark && this.benchmark.id && this.benchmark.id != id)) {
    var msg = "No such benchmark found by that id (" + id + ")";
    this.debug("#unregister", msg);
    return msg;
  }
  
  this.debug('#unregister before finalizeData');
  benchmark = this.finalizeData();
  this.debug('#unregister after finalizeData');
  // stats = this.statistics(benchmark);
  // return stats;
  
  return benchmark;
}

Statistics.prototype.statistics = function (data) {

  // TODO: 
  this.debug('#statistics');
  return data;
}

Statistics.prototype.finalizeData = function () {

  this.debug('#finalizeData');
  if (this.benchmark != null) {
    this.debug('#finalizeData benchmark != null');
    var benchmark = this.benchmark;
    // this.benchmark = null;
    this.backupToFile(benchmark);
    
    return benchmark;
  }
  return this.benchmark;
}


Statistics.prototype.aggregate = function (action, ts, id, value) {

  if (value == null) {
    value = 1;
  }
  
  if (this.benchmark == null || this.benchmark.id !== id) {
    return null;
  }
  
  if (!this.benchmark.hasOwnProperty(action)) {
    this.benchmark[action] = {};
  }
  
  if (!this.benchmark[action].hasOwnProperty(ts)) {
    this.benchmark[action][ts] = 0;
  }
  
  return this.benchmark[action][ts] += value;
}

Statistics.prototype.record = function (action, ts, data) {

  if (this.benchmark == null) {
    return null;
  }
  
  if (!this.benchmark.hasOwnProperty(action)) {
    this.benchmark[action] = {};
  }
  
  return this.benchmark[action][ts] = data;
}

Statistics.prototype.set = function (action, data) {

  if (this.benchmark == null) {
    return null;
  }
  
  return this.benchmark[action] = data;
}

Statistics.prototype.onMessage = function (m) {

  var ts = this.now();
  switch (m.action) {
    case 'request':
      return this.aggregate(m.action, ts, m.data);
    case 'mem':
    case 'load':
      return this.record(m.action, ts, m.data);
    case 'started':
      return this._startTime = ts;
    case 'ended':
      return this.set(m.action, ts);
    default:
      throw "unspecified action supplied to Daemon::Statistics: " + m.action;
  }
}

Statistics.prototype.pollMetrics = function () {

  if (this.server && this.server.send) {
    this.server.send({
      action: 'mem'
    });
    
    this.server.send({
      action: 'load'
    });
  }
}

///////////////////
// Backup Related
///////////////////

Statistics.prototype.backupFilename = function () {

  this.debug('backupFilename');
  var filepath = null;
  if (this.options.serverFile.indexOf(this.options.rootPath) >= 0) {
    filepath = this.options.serverFile;
  }
  else {
    filepath = path.join(this.options.rootPath, this.options.serverFile);
  }
  
  var data = require(filepath).__info;
  return ["bench", data.server, data.version, this.now()].join('-') + ".json";
  // return "bench-" + this.now() + ".json";
}

Statistics.prototype.backupToFile = function (contents) {

  this.debug('backupToFile');
  if (contents == null) {
    return;
  }
  
  var backupFilename = path.join(this.options.rootPath || __dirname, this.options.logPath, this.backupFilename());
  
  this.debug('will backup to', backupFilename);
  // fs.writeFileSync(backupFilename, JSON.stringify(contents));
}

///////////////////
// Math Related
///////////////////

Statistics.prototype.min = function (arr) {

  return Math.min.apply(this, arr);
}

Statistics.prototype.max = function (arr) {

  return Math.max.apply(this, arr);
}

Statistics.prototype.mean = function (arr) {

  return arr.reduce(function (a, b) { return a + b; }) / arr.length;
}

Statistics.prototype.median = function (arr) {

  var sortedArr = arr.slice(0).sort(function (a, b){ return a - b; });
  var midpoint = (sortedArr.length / 2) >> 0;
  
  if (sortedArr.length % 2 == 1) {
    return sortedArr[midpoint];
  }
  else {
    return this.mean([sortedArr[midpoint - 1], sortedArr[midpoint]]);
  }
}

Statistics.prototype.stdDev = function (a) {

  var arr = a.slice(0);
  var arrMean = this.mean(arr);
  var differences = arr.map(function(d){
    return +(Math.pow(d - arrMean, 2)).toFixed(2);
  });
  var sumDiff = differences.reduce(function (a,b) { return a + b; });
  var variance = (1 / (arr.length - 1)) * sumDiff;
  sdev = Math.sqrt(variance);
  return sdev;
}






