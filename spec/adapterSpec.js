require('../index.js');
var webdriver = require('selenium-webdriver');

/**
 * Tests for the WebDriverJS Jasmine-Node Adapter. These tests use
 * WebDriverJS's control flow and promises without setting up the whole
 * webdriver.
 */

var getFakeDriver = function() {
  var flow = webdriver.promise.controlFlow();
  var retryPromiseTestCounter = 0;
  var soonToBeAbsentReverseCounter = 4;
  return {
    controlFlow: function() {
      return flow;
    },
    sleep: function(ms) {
      return flow.timeout(ms);
    },
    setUp: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled('setup done');
      });
    },
    getValueA: function() {
      return flow.execute(function() {
        return webdriver.promise.delayed(500).then(function() {
          return webdriver.promise.fulfilled('a');
        });
      });
    },
    getRetryPromiseTestCounter: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled(++retryPromiseTestCounter);
      });
    },
    getOtherValueA: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled('a');
      });
    },
    getValueB: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled('b');
      });
    },
    getBigNumber: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled(1111);
      });
    },
    getDecimalNumber: function() {
        return flow.execute(function() {
          return webdriver.promise.fulfilled(3.14159);
        });
      },
    getDisplayedElement: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled({
          isDisplayed: function() {
            return webdriver.promise.fulfilled(true);
          }
        });
      });
    },
    getSoonToBeAbsentElement: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled({
          isPresent: function() {
            return webdriver.promise.fulfilled(true);
          },
          isDisplayed: function() {
            return webdriver.promise.fulfilled(
              !!(--soonToBeAbsentReverseCounter));
          }
        });
      });
    },
    getHiddenElement: function() {
      return flow.execute(function() {
        return webdriver.promise.fulfilled({
          isDisplayed: function() {
            return webdriver.promise.fulfilled(false);
          }
        });
      });
    }
  };
};

var fakeDriver = getFakeDriver();

describe('webdriverJS Jasmine adapter plain', function() {
  it('should pass normal synchronous tests', function() {
    expect(true).toBe(true);
  });
});


describe('webdriverJS Jasmine adapter', function() {
  // Shorten this and you should see tests timing out.
  jasmine.getEnv().defaultTimeoutInterval = 2000;

  beforeEach(function() {
    // 'this' should work properly to add matchers.
    this.addMatchers({
      toBeLotsMoreThan: function(expected) {
        return this.actual > expected + 100;
      },
      // e.g. custom matcher returning a promise that resolves to true/false.
      toBeDisplayed: function() {
        return this.actual.isDisplayed();
      },
      // Example custom matcher returning a promise that resolves to 
      // true after 3 retries
      toBeGreaterThanThree: function() {
        return this.actual > 3;
      },
      toBeAbsent: function(exp) {
        exp = (exp == null ? true : false);
        if (!exp) throw "Custom matcher toBeAbsent doesn't " +
                        "support false expectation";

        var elmFinder = this.actual;

        this.message = function message() {
          return "Expected the thing to be absent or at least not visible.";
        };
        
        return elmFinder.isPresent().then(function isPresent(present) {
          if (present) {
            return elmFinder.isDisplayed().
            then(function isDisplayed(visible) {
              return !visible;
            });
          } else {
            return true;
          }
        });
      }
    });
  });

  beforeEach(function() {
    fakeDriver.setUp().then(function(value) {
      console.log('This should print before each test: ' + value);
    });
  });

  it('should pass normal synchronous tests', function() {
    expect(true).toEqual(true);
  });

  it('should compare a promise to a primitive', function() {
    expect(fakeDriver.getValueA()).toEqual('a');
    expect(fakeDriver.getValueB()).toEqual('b');
  });

  it('should wait till the expect to run the flow', function() {
    var promiseA = fakeDriver.getValueA();
    expect(promiseA.isPending()).toBe(true);
    expect(promiseA).toEqual('a');
    expect(promiseA.isPending()).toBe(true);
  });

  it('should compare a promise to a promise', function() {
    expect(fakeDriver.getValueA()).toEqual(fakeDriver.getOtherValueA());
  });

  it('should still allow use of the underlying promise', function() {
    var promiseA = fakeDriver.getValueA();
    promiseA.then(function(value) {
      expect(value).toEqual('a');
    });
  });

  it('should allow scheduling of tasks', function() {
    fakeDriver.sleep(300);
    expect(fakeDriver.getValueB()).toEqual('b');
  });

  it('should allow the use of custom matchers', function() {
    expect(500).toBeLotsMoreThan(3);
    expect(fakeDriver.getBigNumber()).toBeLotsMoreThan(33);
  });

  it('should allow custom matchers to return a promise', function() {
    expect(fakeDriver.getDisplayedElement()).toBeDisplayed();
    expect(fakeDriver.getHiddenElement()).not.toBeDisplayed();
  });

  it('should pass multiple arguments to matcher', function() {
      // Passing specific precision
      expect(fakeDriver.getDecimalNumber()).toBeCloseTo(3.1, 1);
      expect(fakeDriver.getDecimalNumber()).not.toBeCloseTo(3.1, 2);

      // Using default precision (2)
      expect(fakeDriver.getDecimalNumber()).not.toBeCloseTo(3.1);
      expect(fakeDriver.getDecimalNumber()).toBeCloseTo(3.14);
    });

  describe('not', function() {
    it('should still pass normal synchronous tests', function() {
      expect(4).not.toEqual(5);
    });

    it('should compare a promise to a primitive', function() {
      expect(fakeDriver.getValueA()).not.toEqual('b');
    });

    it('should compare a promise to a promise', function() {
      expect(fakeDriver.getValueA()).not.toEqual(fakeDriver.getValueB());
    });
  });

  it('should log just a warning with a WebElement actual value', function() {
    var webElement = new webdriver.WebElement(fakeDriver, 'idstring');

    expect(function() {
      expect(webElement).toBeDefined();
    }).not.toThrow();
  });

  // Uncomment to see timeout failures.
  // ddescribe('Timeout Failures', function() {
  //   it('should timeout after 200ms', function() {
  //     expect(fakeDriver.getValueA()).toEqual('a');
  //   }, 300);

  //   it('should timeout after 300ms', function() {
  //     fakeDriver.sleep(9999);
  //     expect(fakeDriver.getValueB()).toEqual('b');
  //   }, 300);

  //   it('should pass errors from done callback', function(done) {
  //     done('an error');
  //   });
  // });

  it('should pass after the timed out tests', function() {
    expect(fakeDriver.getValueA()).toEqual('a');
  });

  describe('Supports {detailTestLevel: N} option', function() {
    it('should execute and pass given we are not skipping tests', function() {
      expect(3).not.toEqual(7);
    });

    it('should also execute and pass given we are not skipping tests', function() {
      expect(4).not.toEqual(7);
    }, null, {detailTestLevel: 0});

    ifjF(0, function() {
      rit('should also execute and pass given detail level 0 is not skippable', 
      function() {
        expect(5).not.toEqual(7);
      });
    });

    jasmine.getEnv().setDetailTestLevel(1);

    it('should execute and pass given the set detailTestLevel is <= current', function() {
      expect(5).not.toEqual(8);
    }, null, {detailTestLevel: 1});

    ifjF(1, function() {
      rit('should execute and pass given the set detailTestLevel is <= 1', 
      function() {
        expect(6).not.toEqual(8);
      });
    });
    
    it('skip this failing test since is marked as {detailTestLevel: 2}', function() {
      expect(6).toEqual(9);
    }, null, {detailTestLevel: 2});
    
    rit('should also skip rit failing test {detailTestLevel: 3}', function() {
      expect(7).toEqual(10);
    }, null, {detailTestLevel: 3});

    ifjF(2, function() {
      rit('should also skip rit failing test with ifjF(2)', function() {
        expect(8).toEqual(10);
      });
    });

    ifjF(3, function() {
      rit('should also skip rit failing test with ifjF(3)', function() {
        expect(9).toEqual(10);
      });
    });

    jF(0, function() { _someTestsLevel(0); });
    jF(1, function() { _someTestsLevel(1); });
    jF(2, function() { _someTestsLevel(2); });
  });

  describe('works for both synchronous and asynchronous tests', function() {
    var x;

    beforeEach(function() {
      x = 0;
    });

    afterEach(function() {
      expect(x).toBe(1);
    });

    it('should execute a synchronous test', function() {
      x = 1;
    });

    it('should execute an asynchronous test', function(done) {
      setTimeout(function(){
        x = 1;
        done();
      }, 500);
    });
  });

  describe('should support retry method rit()', function() {
    var count = 0;

    rit('should retry until counter reaches 3', function() {
      count++;
      console.log(' <<< Current count: ' + count + ' >>>');
      expect(count).toBe(3);
    });

    it('should have updated count to 3 after previous rit()', function() {
      expect(count).toBe(3);
    });

    rit('allows custom matchers to retry an absent fake element', function() {
      console.log(' << Absent fake element iteration: ' + 
                  this.currentWaitIteration + ' >>');
      expect(fakeDriver.getSoonToBeAbsentElement()).toBeAbsent();
    });

    rit('should allow custom matchers to retry a promise', function() {
      console.log(' << Trying to retry on a promise counter, iteration: ' + 
                  this.currentWaitIteration + ' >>');
      expect(fakeDriver.getRetryPromiseTestCounter()).toBeGreaterThanThree();
    });
  });

  // TODO
  xdescribe('should support retry describe() through rdescribe()', function() {
    var countDescribe1 = 0;
    rdescribe('rdescribe() retries until counter==3 using it()', function() {
      countDescribe1++;
      it('this time number: ' + countDescribe1, function() {
        console.log( '<< Describe count: ' + countDescribe1 + ' >>');
        expect(countDescribe1).toBe(3);
      });
    });
    
    var countDescribe2 = 0;
    rdescribe('rdescribe() retries until counter==3 using rit()', function() {
      countDescribe2++;
      rit('this time number: ' + countDescribe2, function() {
        console.log( '<< Describe count: ' + countDescribe2 + ' >>');
        expect(countDescribe2).toBe(3);
      });
    });
  });
});

function _someTestsLevel(numLevel) {
  it('should execute this test level ' + numLevel, function() {
    expect(numLevel).not.toBe(numLevel + 1);
  }, null, {detailTestLevel: numLevel});
  
  it('should NOT execute this test level ' + numLevel + 1, function() {
    expect(numLevel).toBe(numLevel - 1);
  }, null, {detailTestLevel: numLevel + 1});
  
  it('should NOT execute this test level ' + numLevel + 2, function() {
    expect(numLevel).toBe(numLevel - 2);
  }, null, {detailTestLevel: numLevel + 2});
}
