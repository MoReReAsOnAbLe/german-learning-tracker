const Effects = (() => {
  function burst() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = ['#f59e0b', '#d97706', '#fbbf24', '#fafaf9', '#78716c', '#b45309'];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 4 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      alpha: 1
    }));

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rotation += p.rotSpeed;
        if (frame > 120) p.alpha = Math.max(0, p.alpha - 0.02);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < 180) {
        requestAnimationFrame(animate);
      } else {
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    animate();
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 528;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio unavailable:', e);
    }
  }

  function celebrate() {
    burst();
    beep();
  }

  return { burst, beep, celebrate };
})();
