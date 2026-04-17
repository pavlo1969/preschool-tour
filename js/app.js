// ─────────────────────────────────────────────────────────────────────────────
// Preschool Wayfinding Tour — App
// Loads config.json, then runs: intro video → photo sequence → outro video
// ─────────────────────────────────────────────────────────────────────────────

class PreschoolTour {
  constructor(config) {
    this.config     = config;
    this.photos     = config.photos;
    this.photoIndex = 0;
    this.state      = null;

    // DOM refs
    this.videoScreen  = document.getElementById('video-screen');
    this.photoScreen  = document.getElementById('photo-screen');
    this.video        = document.getElementById('tour-video');
    this.videoSrc     = document.getElementById('video-src');
    this.videoLabel   = document.getElementById('video-label');
    this.photo        = document.getElementById('tour-photo');
    this.hotspot      = document.getElementById('hotspot');
    this.dots         = document.getElementById('progress-dots');
    this.progressLbl  = document.getElementById('progress-label');
    this.overlay      = document.getElementById('transition-overlay');

    this._buildDots();
    this._bindEvents();
    this._start();
  }

  // ── Boot ────────────────────────────────────────────────────────────────

  _start() {
    this._playVideo(this.config.introVideo, 'Introduction', () => {
      this._fadeOut(() => {
        this._setState('photo');
        this._showPhoto(0);
        this._fadeIn();
      });
    });
  }

  // ── State ────────────────────────────────────────────────────────────────

  _setState(state) {
    this.state = state;
    this.videoScreen.classList.toggle('active', state === 'video');
    this.photoScreen.classList.toggle('active', state === 'photo');
  }

  // ── Video playback ───────────────────────────────────────────────────────

  _playVideo(src, label, onEnd) {
    this._setState('video');
    this.videoLabel.textContent = label || '';
    this.videoSrc.src = src;
    this.video.load();
    this.video.play().catch(() => {
      // Autoplay blocked — wait for user tap
      const resume = () => { this.video.play(); this.video.removeEventListener('click', resume); };
      this.video.addEventListener('click', resume);
    });
    this._onVideoEnd = onEnd;
  }

  // ── Photo sequence ───────────────────────────────────────────────────────

  _showPhoto(index) {
    const step = this.photos[index];
    this.photoIndex = index;

    // Set photo src
    this.photo.src = step.src;

    // Position hotspot via CSS custom properties
    const hx = step.hotspot?.x ?? 50;
    const hy = step.hotspot?.y ?? 75;
    this.hotspot.style.setProperty('--hx', hx);
    this.hotspot.style.setProperty('--hy', hy);

    // Update progress
    this._updateProgress(index);
  }

  _advance() {
    const next = this.photoIndex + 1;
    if (next < this.photos.length) {
      this._fadeOut(() => {
        this._showPhoto(next);
        this._fadeIn();
      });
    } else {
      // Last photo done → play outro
      this._fadeOut(() => {
        this._playVideo(this.config.outroVideo, 'You have arrived', () => {
          this._setState('video'); // stay on video screen, tour complete
        });
        this._fadeIn();
      });
    }
  }

  // ── Progress indicator ───────────────────────────────────────────────────

  _buildDots() {
    this.dots.innerHTML = '';
    this.photos.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.dataset.index = i;
      this.dots.appendChild(dot);
    });
  }

  _updateProgress(index) {
    const total = this.photos.length;
    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.classList.toggle('done',   i < index);
    });
    this.progressLbl.textContent = `Step ${index + 1} of ${total}`;
  }

  // ── Transitions ──────────────────────────────────────────────────────────

  _fadeOut(cb) {
    this.overlay.classList.add('visible');
    this.overlay.addEventListener('transitionend', cb, { once: true });
  }

  _fadeIn() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.overlay.classList.remove('visible');
    }));
  }

  // ── Events ───────────────────────────────────────────────────────────────

  _bindEvents() {
    // Video ended
    this.video.addEventListener('ended', () => {
      if (this._onVideoEnd) this._onVideoEnd();
    });

    // Hotspot click / tap
    this.hotspot.addEventListener('click', () => this._advance());

    // Keyboard: space / enter / right arrow also advance
    document.addEventListener('keydown', e => {
      if (['ArrowRight', 'Space', 'Enter'].includes(e.code) && this.state === 'photo') {
        e.preventDefault();
        this._advance();
      }
    });
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  fetch('config.json')
    .then(r => r.json())
    .then(config => new PreschoolTour(config))
    .catch(err => {
      document.body.innerHTML = `<div style="color:#fff;padding:40px;font-family:sans-serif">
        <h2>Config error</h2><p>${err.message}</p>
        <p>Make sure config.json exists and the app is served over HTTP (not file://).</p>
      </div>`;
    });
});
