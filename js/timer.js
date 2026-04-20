const Timer = (() => {
  let interval = null;
  let elapsed = 0;
  let remaining = 0;
  let target = 0;
  let mode = null; // 'up' | 'down'
  let running = false;
  let onCompleteCb = null;

  function parseDuration(input) {
    if (!input) return null;
    input = input.trim();
    const hm = input.match(/^(\d+)h\s*(\d+)m?$/i);
    if (hm) return parseInt(hm[1]) * 3600 + parseInt(hm[2]) * 60;
    const h = input.match(/^(\d+)h$/i);
    if (h) return parseInt(h[1]) * 3600;
    const m = input.match(/^(\d+)m$/i);
    if (m) return parseInt(m[1]) * 60;
    const hms = input.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3]);
    const ms = input.match(/^(\d+):(\d{2})$/);
    if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2]);
    const plain = input.match(/^(\d+)$/);
    if (plain) return parseInt(plain[1]) * 60;
    return null;
  }

  function formatDisplay(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds < 1) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  function startCountUp(onTick) {
    if (running) return;
    mode = 'up';
    running = true;
    interval = setInterval(() => {
      elapsed++;
      onTick(formatDisplay(elapsed), elapsed);
    }, 1000);
  }

  function startCountDown(targetSeconds, onTick, onComplete) {
    if (running) return;
    mode = 'down';
    target = targetSeconds;
    remaining = targetSeconds;
    running = true;
    onCompleteCb = onComplete;
    interval = setInterval(() => {
      remaining--;
      const warning = remaining < 60;
      if (remaining <= 0) {
        _clearInterval();
        onTick(formatDisplay(0), 0, warning);
        if (onCompleteCb) onCompleteCb(target);
      } else {
        onTick(formatDisplay(remaining), remaining, warning);
      }
    }, 1000);
  }

  function pause() {
    if (!running) return;
    _clearInterval();
  }

  function resume(onTick, onComplete) {
    if (running) return;
    running = true;
    if (mode === 'up') {
      interval = setInterval(() => {
        elapsed++;
        onTick(formatDisplay(elapsed), elapsed);
      }, 1000);
    } else {
      onCompleteCb = onComplete;
      interval = setInterval(() => {
        remaining--;
        const warning = remaining < 60;
        if (remaining <= 0) {
          _clearInterval();
          onTick(formatDisplay(0), 0, warning);
          if (onCompleteCb) onCompleteCb(target);
        } else {
          onTick(formatDisplay(remaining), remaining, warning);
        }
      }, 1000);
    }
  }

  function _clearInterval() {
    clearInterval(interval);
    interval = null;
    running = false;
  }

  function stop() {
    const result = mode === 'up' ? elapsed : target;
    _clearInterval();
    elapsed = 0;
    remaining = 0;
    target = 0;
    mode = null;
    return result;
  }

  function reset() {
    _clearInterval();
    elapsed = 0;
    remaining = 0;
    target = 0;
    mode = null;
  }

  function isRunning() { return running; }
  function getMode() { return mode; }

  return { parseDuration, formatDisplay, formatDuration, startCountUp, startCountDown, pause, resume, stop, reset, isRunning, getMode };
})();
