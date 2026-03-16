(function () {
  window.createDroppyAudioSystem = function createDroppyAudioSystem() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return {
        ensureStarted() {},
        setIntensity() {},
        suspend() {},
        resume() {},
      };
    }

    let context = null;
    let master = null;
    let breezeGain = null;
    let chirpGain = null;
    let breezeFilter = null;
    let breezeSource = null;
    let birdTimer = null;

    function createNoiseBuffer(ctx) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.04 * white) / 1.04;
        data[i] = last * 2.2;
      }
      return buffer;
    }

    function chirpBird() {
      if (!context) return;
      const start = context.currentTime + 0.02;
      const duration = 0.14 + Math.random() * 0.08;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(920 + Math.random() * 260, start);
      osc.frequency.exponentialRampToValueAtTime(1480 + Math.random() * 240, start + duration * 0.7);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.02, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(chirpGain);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    function scheduleBirds() {
      if (!context) return;
      clearTimeout(birdTimer);
      birdTimer = window.setTimeout(() => {
        chirpBird();
        if (Math.random() > 0.55) {
          window.setTimeout(() => chirpBird(), 120 + Math.random() * 120);
        }
        scheduleBirds();
      }, 2600 + Math.random() * 3400);
    }

    function ensureStarted() {
      if (context) return;
      context = new AudioCtx();
      master = context.createGain();
      master.gain.value = 0.0001;
      master.connect(context.destination);

      breezeGain = context.createGain();
      breezeGain.gain.value = 0.012;
      chirpGain = context.createGain();
      chirpGain.gain.value = 0.018;
      breezeFilter = context.createBiquadFilter();
      breezeFilter.type = "bandpass";
      breezeFilter.frequency.value = 420;
      breezeFilter.Q.value = 0.3;

      const noise = context.createBufferSource();
      noise.buffer = createNoiseBuffer(context);
      noise.loop = true;
      noise.connect(breezeFilter);
      breezeFilter.connect(breezeGain);
      breezeGain.connect(master);
      chirpGain.connect(master);
      noise.start();
      breezeSource = noise;
      scheduleBirds();
    }

    function setIntensity(value) {
      if (!context) return;
      const intensity = Math.min(Math.max(value, 0), 1);
      master.gain.setTargetAtTime(0.028 + intensity * 0.022, context.currentTime, 0.4);
      breezeGain.gain.setTargetAtTime(0.01 + intensity * 0.014, context.currentTime, 0.35);
      chirpGain.gain.setTargetAtTime(0.012 + (1 - intensity) * 0.01, context.currentTime, 0.35);
      breezeFilter.frequency.setTargetAtTime(360 + intensity * 220, context.currentTime, 0.35);
    }

    function suspend() {
      if (context && context.state === "running") {
        context.suspend().catch(() => {});
      }
    }

    function resume() {
      ensureStarted();
      if (context && context.state !== "running") {
        context.resume().catch(() => {});
      }
    }

    return {
      ensureStarted,
      setIntensity,
      suspend,
      resume,
    };
  };
})();
