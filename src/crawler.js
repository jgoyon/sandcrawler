/**
 * Sandcrawler Crawler Class
 * ==========================
 *
 * The crawler class is the main interface to sandcrawler's utilities. It
 * enables the user to navigate through a series of webpage to retrieve
 * the needed data.
 */
var bothan = require('bothan'),
    path = require('path'),
    types = require('typology'),
    artoo = require('artoo-js'),
    tasks = require('./tasks');

// Constructor
function create(params, callback) {
  var spyParams = {
    bindings: path.join(__dirname, '..', 'phantom', 'bindings.js'),
    data: {
      paths: {
        artoo: artoo.paths.phantom,
        jquery: require.resolve('jquery')
      }
    }
  };

  bothan.deploy(spyParams, function(err, spy) {
    if (err)
      return callback(err);

    callback(null, new Crawler(spy));
  });
}

// Class
function Crawler(spy) {

  // Properties
  this.spy = spy;

  // Bootstrapping spy's event emitter
  this.on = this.spy.on.bind(this.spy);
  this.once = this.spy.once.bind(this.spy);
}

// Prototype
// TODO: multi and iterator and object list queue
Crawler.prototype.task = function(feed) {
  if (types.get(feed) === 'string')
    return new tasks.SingleUrl(this.spy, feed);
  else (types.get(feed) === 'array')
    return new tasks.MultiUrl(this.spy, fedd);
};

// TODO: middleware system
Crawler.prototype.use = function(middleware) {

};

module.exports = create;
