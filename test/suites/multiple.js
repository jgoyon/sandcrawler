/**
 * Sandcrawler Multiple Spiders Tests
 * ===================================
 *
 * Testing some spiders fetching a discrete series of urls.
 */
var assert = require('assert'),
    async = require('async'),
    sandcrawler = require('../../index.js'),
    samples = require('../samples.js');

var phantom;

describe('When running multi-url spiders', function() {
  this.timeout(3000);

  before(function(done) {

    // Spawning a custom phantom for the tests
    sandcrawler.spawn({autoClose: false}, function(err, spawn) {
      if (err) throw err;

      phantom = spawn;
      done();
    });
  });

  describe('Series', function() {

    it('should work correctly.' , function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {
          count++;

          assert(err === null);
          assert.deepEqual(res.data, samples.basic);
        });

      phantom.run(spider, function(err) {
        assert(count === 2);
        done();
      });
    });

    it('should be possible to increase concurrency.' , function(done) {
      var count = 0,
          check = false;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          {url: 'http://localhost:7337/resources/basic.html'},
          {url: 'http://localhost:7337/resources/basic.html'},
          {url: 'http://localhost:7337/resources/basic.html'}
        ])
        .config({concurrency: 2})
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {
          count++;

          assert(err === null);
          assert.deepEqual(res.data, samples.basic);
        });

      phantom.run(spider, function(err) {
        assert(count === 3);
        done();
      });
    });

    it('should be possible to get the remains back after the spider has been fulfilled.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          {url: 'http://localhost:7337/resources/basic.html'},
          {url: 'http://localhost:7337/resources/basic.html'},
          {url: 'http://localhost:7337/resources/404.html'}
        ])
        .config({concurrency: 3, timeout: 300})
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {
          count++;
        })
        .on('spider:end', function(status, remains) {
          assert.strictEqual(status, 'success');
          assert(remains.length === 1);
        });

      phantom.run(spider, function(err, remains) {
        assert(remains.length === 1);
        assert(count === 3);
        assert.strictEqual(remains[0].error.message, 'status-404');
        done();
      });
    });
  });

  describe('Iterator', function() {

    it('should be possible to use a function as iterator.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .iterate(function(i, req, res) {
          if (i === 3)
            return false;

          return !i ?
            'http://localhost:7337/resources/basic.html' :
            res.data.nextPage;
        })
        .scraper(function($, done) {
          done(null, {nextPage: 'http://localhost:7337/resources/basic.html'});
        })
        .result(function(err, req, res) {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 3);
        done();
      });
    });

    it('should be possible to set a limit to the iterator.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .iterate(function(i, req, res) {
          return 'http://localhost:7337/resources/basic.html';
        })
        .config({limit: 3})
        .scraper(function($, done) {
          done();
        })
        .result(function() {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 3);
        done();
      });
    });

    it('should be possible to use the limit shorthand.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .iterate(function(i, req, res) {
          return 'http://localhost:7337/resources/basic.html';
        })
        .limit(3)
        .scraper(function($, done) {
          done();
        })
        .result(function() {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 3);
        done();
      });
    });

    it('should be possible to start from a single url.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .url('http://localhost:7337/resources/basic.html')
        .iterate(function(i, req, res) {
          if (i === 3)
            return false;

          return res.data.nextPage;
        })
        .scraper(function($, done) {
          done(null, {nextPage: 'http://localhost:7337/resources/basic.html'});
        })
        .result(function(err, req, res) {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 3);
        done();
      });
    });

    it('should be possible to start from a list of urls.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .iterate(function(i, req, res) {
          if (i === 5)
            return false;

          return res.data.nextPage;
        })
        .scraper(function($, done) {
          done(null, {nextPage: 'http://localhost:7337/resources/basic.html'});
        })
        .result(function(err, req, res) {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 5);
        done();
      });
    });

    it('should be possible to limit non iterating spiders all the same.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .limit(1)
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function() {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 1);
        done();
      });
    });
  });

  describe('Pausing', function() {

    it('should be possible to pause the spider.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .config({limit: 3})
        .iterate(function(i, req, res) {
          return 'http://localhost:7337/resources/basic.html';
        })
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {
          var self = this;

          count++;

          assert(err === null);
          assert.deepEqual(res.data, samples.basic);

          if (count === 2) {
            this.pause();
            setTimeout(function() {
              self.resume();
            }, 300);
          }
        });

      phantom.run(spider, function(err, remains) {
        assert(count === 3);
        done();
      });
    });
  });

  describe('Expansion', function() {

    it('should be possible to add new jobs to the stack.', function(done) {
      var i = 0,
          count = 0,
          eventCount = 0;

      var spider = new sandcrawler.phantomSpider()
        .url('http://localhost:7337/resources/basic.html')
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {
          count++;

          assert(err === null);
          assert.deepEqual(res.data, samples.basic);

          // Expanding
          if (i < 2)
            this.addUrl('http://localhost:7337/resources/basic.html');

          i++;
        })
        .on('job:add', function(job) {
          eventCount++;
          assert.strictEqual(job.req.url, 'http://localhost:7337/resources/basic.html');
        });

      phantom.run(spider, function(err, remains) {
        assert(count === 3);
        assert(eventCount === 2);
        done();
      });
    });
  });

  describe('Before', function() {

    it('should be possible to discard some jobs before they are executed.', function(done) {
      var count = 0,
          discardedCount = 0;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .scraper(require('../resources/scrapers/basic.js'))
        .beforeScraping(function(req, next) {
          if (this.index > 1)
            return next(new Error('too-far'));
          next(null);
        })
        .on('job:discard', function(err, job) {
          assert.strictEqual(err.message, 'too-far');
          discardedCount++;
        })
        .result(function(err, req, res) {
          count++;
        });

      phantom.run(spider, function(err, remains) {
        assert.strictEqual(remains.length, 0);
        assert.strictEqual(count, 2);
        assert.strictEqual(discardedCount, 2);
        done();
      });
    });
  });

  describe('Retries', function() {

    it('should be possible to retry some jobs.', function(done) {
      var eventCount = 0,
          resultCount = 0;

      var spider = new sandcrawler.phantomSpider()
        .url('http://localhost:7337/retries')
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {
          if (err) {
            assert(typeof req.retry === 'function');
            assert(typeof req.retryLater === 'function');
            assert(typeof req.retryNow === 'function');
          }

          resultCount++;
          if (err) req.retryLater();
        })
        .on('job:retry', function(job) {
          eventCount++;
          assert(job.req.retries === 1);
          assert.strictEqual(job.req.url, 'http://localhost:7337/retries');
        });

      phantom.run(spider, function(err, remains) {
        assert(resultCount === 2);
        assert(eventCount === 1);
        done();
      });
    });

    it('should be possible to set a max retries parameter.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .url('http://localhost:7337/404.html')
        .config({maxRetries: 2})
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req) {
          count++;
          return req.retry();
        });

      phantom.run(spider, function() {
        assert(count === 3);
        done();
      });
    });

    it('should be possible to use the autoRetry setting.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .url('http://localhost:7337/404.html')
        .config({maxRetries: 2, autoRetry: true})
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req) {
          count++;
        });

      phantom.run(spider, function() {
        assert(count === 3);
        done();
      });
    });
  });

  describe('Statistics', function() {

    it('should properly record some basic counts.', function(done) {
      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .scraper(require('../resources/scrapers/basic.js'))
        .result(function(err, req, res) {

          assert(err === null);
          assert.deepEqual(res.data, samples.basic);
        });

      phantom.run(spider, function(err) {
        assert(spider.stats.done === 3);
        assert(spider.stats.completion === 100);
        assert(spider.stats.successes === 3);
        assert(spider.stats.failures === 0);
        done();
      });
    });

    it('should properly record an error index.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .scraper(require('../resources/scrapers/basic.js'))
        .afterScraping(function(req, res, next) {
          if (count > 1)
            next(new Error('alert'));
          else
            next(new Error('achtung'));

          count++;
        });

      phantom.run(spider, function(err) {
        assert.deepEqual(
          spider.stats.errorIndex,
          {
            alert: 1,
            achtung: 2
          }
        );
        done();
      });
    });
  });

  describe('Throttling', function() {

    it('should be possible to throttle in an uniform way.', function(done) {
      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .throttle(10)
        .scraper(require('../resources/scrapers/basic.js'));

      phantom.run(spider, done);
    });

    it('should be possible to throttle by supplying a min and max value.', function(done) {
      var spider = new sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html',
          'http://localhost:7337/resources/basic.html'
        ])
        .throttle(10, 20)
        .scraper(require('../resources/scrapers/basic.js'));

      phantom.run(spider, done);
    });
  });

  describe('Cookies', function() {

    it('should be possible to use a cookie jar.', function(done) {
      var spider = sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/set-cookie',
          'http://localhost:7337/check-cookie'
        ])
        .config({jar: true})
        .scraper(function($, done) {
          done(null, $('body').text());
        })
        .result(function(err, req, res) {
          assert.strictEqual(res.data, 'Yay!');
        });

      phantom.run(spider, done);
    });

    it('should be possible to use a cookie jar file storage.', function(done) {
      var spider = sandcrawler.phantomSpider()
        .urls([
          'http://localhost:7337/set-cookie',
          'http://localhost:7337/check-cookie'
        ])
        .config({jar: __dirname + '/../.tmp/phantom-cookies.json'})
        .scraper(function($, done) {
          done(null, $('body').text());
        })
        .result(function(err, req, res) {
          assert.strictEqual(res.data, 'Yay!');
        });

      phantom.run(spider, done);
    });

    it('should be able to restart from a saved jar.', function(done) {
      var spider = sandcrawler.phantomSpider()
        .url('http://localhost:7337/check-cookie')
        .config({jar: __dirname + '/../.tmp/phantom-cookies.json'})
        .scraper(function($, done) {
          done(null, $('body').text());
        })
        .result(function(err, req, res) {
          assert.strictEqual(res.data, 'Yay!');
        });

      // NOTE: purposedly using a different phantom here
      sandcrawler.run(spider, done);
    });

    it('should be able to send a specific set of cookies.', function(done) {
      sandcrawler.spawn({autoClose: false}, function(err, customPhantom) {

        async.series({
          configString: function(next) {
            var spider = sandcrawler.phantomSpider()
              .url('http://localhost:7337/check-cookie')
              .config({cookies: ['hello=world']})
              .scraper(function($, done) {
                done(null, $('body').text());
              })
              .result(function(err, req, res) {
                assert.strictEqual(res.data, 'Yay!');
              });

            customPhantom.run(spider, next);
          },
          configObject: function(next) {
            var spider = sandcrawler.phantomSpider()
              .url('http://localhost:7337/check-cookie')
              .config({cookies: [{key: 'hello', value: 'world'}]})
              .scraper(function($, done) {
                done(null, $('body').text());
              })
              .result(function(err, req, res) {
                assert.strictEqual(res.data, 'Yay!');
              });

            customPhantom.run(spider, next);
          },
          jobString: function(next) {
            var spider = sandcrawler.phantomSpider()
              .url({url: 'http://localhost:7337/check-cookie', cookies: ['hello=world']})
              .scraper(function($, done) {
                done(null, $('body').text());
              })
              .result(function(err, req, res) {
                assert.strictEqual(res.data, 'Yay!');
              });

            customPhantom.run(spider, next);
          },
          jobObject: function(next) {
            var spider = sandcrawler.phantomSpider()
              .url({url: 'http://localhost:7337/check-cookie', cookies: [{key: 'hello', value: 'world'}]})
              .scraper(function($, done) {
                done(null, $('body').text());
              })
              .result(function(err, req, res) {
                assert.strictEqual(res.data, 'Yay!');
              });

            customPhantom.run(spider, next);
          }
        }, function(err) {
          customPhantom.close();
          return done(err);
        });
      });
    });
  });

  describe('Exiting', function() {

    it('should be possible to exit the spider.', function(done) {
      var count = 0;

      var spider = new sandcrawler.phantomSpider()
        .url([
          {url: 'http://localhost:7337/resources/basic.html'},
          {url: 'http://localhost:7337/resources/basic.html'},
          {url: 'http://localhost:7337/resources/basic.html'}
        ])
        .scraper(function($, done) {
          done();
        })
        .result(function() {
          count++;
          this.exit();
        });

      phantom.run(spider, function(err, remains) {
        assert.strictEqual(err.message, 'exited');
        assert(count === 1);
        assert(remains.length === 2);
        assert.strictEqual(remains[0].error.message, 'spider-exit');
        done();
      });
    });
  });

  after(function() {

    // Now closing the phantom
    phantom.close();
  });
});
