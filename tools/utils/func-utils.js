// Return a function that coalesceses calls to fn that occur within delay
// milliseconds of each other, and prevents overlapping invocations of fn
// by postponing the next invocation until after fn's fiber finishes.
exports.coalesce = function(delayMs, callback, context) {
  var pending = false;
  var inProgress = 0;

  delayMs = delayMs || 100;

  function coalescingWrapper() {
    var self = context || this;

    if (inProgress) {
      // Indicate that coalescingWrapper should be called again after the
      // callback is no longer in progress.
      ++inProgress;
      return;
    }

    if (pending) {
      // Defer to the already-pending timer.
      return;
    }

    new Promise(
      resolve => setTimeout(resolve, delayMs)
    ).then(function thenCallback() {
      // Now that the timeout has fired, set inProgress to 1 so that
      // (until the callback is complete and we set inProgress to 0 again)
      // any calls to coalescingWrapper will increment inProgress to
      // indicate that at least one other caller wants fiberCallback to be
      // called again when the original callback is complete.
      pending = false;
      inProgress = 1;

      try {
        callback.call(self);
      } finally {
        if (inProgress > 1) {
          Promise.resolve().then(thenCallback);
          pending = true;
        }
        inProgress = 0;
      }
    });
  }

  return wrap(coalescingWrapper, callback);
};

function wrap(wrapper, wrapped) {
  // Allow the wrapper to be used as a constructor function, just in case
  // the wrapped function was meant to be used as a constructor.
  wrapper.prototype = wrapped.prototype;

  // https://medium.com/@cramforce/on-the-awesomeness-of-fn-displayname-9511933a714a
  var name = wrapped.displayName || wrapped.name;
  if (name) {
    wrapper.displayName = name;
  }

  return wrapper;
}
