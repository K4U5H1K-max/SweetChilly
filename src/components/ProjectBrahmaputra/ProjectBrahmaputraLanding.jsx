import React, { useState, useEffect, useRef } from 'react';
import { initBrahmaputraWaterShader } from './BrahmaputraWaterShader';
import './ProjectBrahmaputraLanding.css';

export default function ProjectBrahmaputraLanding({ onProceed }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isShaderReady, setIsShaderReady] = useState(false);
  const webglCanvasRef = useRef(null);
  const starsCanvasRef = useRef(null);

  // Smooth Interactive Exit Transition Flow
  const handleProceed = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      if (onProceed) onProceed();
    }, 850);
  };

  // Keyboard accessibility: Enter or Space triggers Proceed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExiting]);

  // ==========================================================================
  // 1. GPU WEBGL LIVING RIVER SURFACE ADVECTION ENGINE
  // Animates the actual photographed water texture inside the masked river channels
  // ==========================================================================
  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    // Respect reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const shaderInstance = initBrahmaputraWaterShader(
      canvas,
      '/assets/brahmaputra_hero.jpg',
      () => setIsShaderReady(true)
    );

    return () => {
      if (shaderInstance) shaderInstance.destroy();
    };
  }, []);

  // ==========================================================================
  // 2. SUBTLE CELESTIAL STARRY SKY (Top 35% Sky Zone Only)
  // Clean astronomical twinkles strictly in space - zero particles on land or river
  // ==========================================================================
  useEffect(() => {
    const canvas = starsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Stars strictly generated in the upper space sector (y < 35% height)
    const stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.35),
      radius: Math.random() * 1.0 + 0.3,
      baseAlpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.01 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    const renderStars = (time) => {
      ctx.clearRect(0, 0, width, height);

      stars.forEach((s) => {
        const flicker = Math.sin(time * s.speed + s.phase);
        const alpha = Math.max(0.08, s.baseAlpha + flicker * 0.25);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(renderStars);
    };

    animationFrameId = requestAnimationFrame(renderStars);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={`pb-landing-viewport ${isExiting ? 'pb-exiting' : ''}`}
      role="region"
      aria-label="Project Brahmaputra Welcome Experience"
    >
      {/* Fallback & Base Static Photographic Landscape */}
      <div className="pb-background-layer" aria-hidden="true" />

      {/* GPU WebGL Living River Surface Engine (Masked strictly to actual water channels) */}
      <canvas
        ref={webglCanvasRef}
        className={`pb-webgl-water-layer ${isShaderReady ? 'pb-shader-active' : ''}`}
        aria-hidden="true"
      />

      {/* Astronomical Sky Stardust Canvas (Upper 35% Sky Only) */}
      <canvas ref={starsCanvasRef} className="pb-sky-stars-layer" aria-hidden="true" />

      {/* Atmospheric Cosmic & Vignette Tint */}
      <div className="pb-atmosphere-overlay" aria-hidden="true" />

      {/* Subtle Horizontal Horizon Beam */}
      <div className="pb-horizon-glow" aria-hidden="true" />

      {/* Foreground Content Stage */}
      <div className="pb-stage-content">
        {/* ==================== TOP HUD BAR ==================== */}
        <header className="pb-top-hud">
          {/* Geodetic Coordinates (Upper Left) */}
          <div className="pb-geo-badge" title="Brahmaputra Basin Datum">
            <span className="pb-geo-pulse" aria-hidden="true" />
            <span className="tracking-wider">26.2006° N, 92.9376° E</span>
          </div>

          {/* Telemetry HUD Badges (Upper Right) */}
          <div className="pb-telemetry-cluster" aria-label="System Capabilities">
            {/* Satellite */}
            <div className="pb-hud-pill" title="Satellite Orbital Telemetry">
              <div className="pb-hud-icon-frame">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="pb-hud-label">Satellite</span>
            </div>

            {/* Resilience */}
            <div className="pb-hud-pill" title="Terrain & Infrastructure Resilience">
              <div className="pb-hud-icon-frame">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="pb-hud-label">Resilience</span>
            </div>

            {/* Connectivity */}
            <div className="pb-hud-pill" title="Multi-modal Arterial Connectivity">
              <div className="pb-hud-icon-frame">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="pb-hud-label">Connectivity</span>
            </div>
          </div>
        </header>

        {/* ==================== CENTER MONUMENTAL HERO ==================== */}
        <main className="pb-hero-core">
          {/* Celestial River Wave Emblem */}
          <div className="pb-emblem-container" aria-hidden="true">
            <div className="pb-emblem-aura" />
            <svg className="pb-emblem-svg w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 100 100" fill="none">
              {/* Radiant 4-Point Celestial Star */}
              <path
                d="M50 12 L53 23 L64 26 L53 29 L50 40 L47 29 L36 26 L47 23 Z"
                fill="#38BDF8"
                filter="drop-shadow(0 0 8px #00F0FF)"
              />
              <circle cx="50" cy="26" r="2" fill="#FFFFFF" />

              {/* Four Undulating Braided River Streamlines */}
              <path
                d="M22 46 C32 40, 42 52, 54 46 C66 40, 72 48, 80 44"
                stroke="#38BDF8"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M18 57 C30 50, 44 64, 58 57 C68 51, 74 60, 84 55"
                stroke="#00F0FF"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M24 68 C34 62, 46 74, 60 68 C70 63, 76 71, 82 67"
                stroke="#0284C7"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M30 79 C38 75, 48 83, 58 79 C66 75, 72 81, 76 78"
                stroke="#0369A1"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Celestial Accent Dust */}
              <circle cx="68" cy="38" r="1.5" fill="#38BDF8" />
              <circle cx="32" cy="38" r="1.2" fill="#38BDF8" />
              <circle cx="50" cy="88" r="1.5" fill="#38BDF8" />
            </svg>
          </div>

          {/* Sub-Headline Prefix */}
          <div className="pb-title-prefix">Project</div>

          {/* Dominant Monumental Title */}
          <h1 className="pb-monumental-title">Brahmaputra</h1>

          {/* Radiant Horizontal Flare Streak */}
          <div className="pb-radiant-streak" aria-hidden="true">
            <div className="pb-flare-point" />
          </div>

          {/* Subtitle Statement */}
          <p className="pb-hero-tagline">
            Intelligent logistics. Connected Northeast. Resilient future.
          </p>

          {/* Central Luminous CTA Button */}
          <div className="pb-cta-container">
            <button
              id="pb-proceed-btn"
              className="pb-proceed-btn"
              onClick={handleProceed}
              disabled={isExiting}
              autoFocus
              aria-label="Proceed to NER Logistics Command Center"
            >
              <span>Proceed</span>
              <span className="pb-arrow-icon" aria-hidden="true">
                <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </button>
          </div>
        </main>

        {/* ==================== BOTTOM HUD & TEAM CREDIT ==================== */}
        <footer className="pb-bottom-hud">
          {/* Left Regional Pillar */}
          <div className="pb-feature-card">
            <div className="pb-feature-title">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
              Northeast India
            </div>
            <ul className="pb-feature-list">
              <li className="pb-feature-item">
                <span className="pb-feature-bullet">•</span> Real-time Intelligence
              </li>
              <li className="pb-feature-item">
                <span className="pb-feature-bullet">•</span> Disruption Monitoring
              </li>
              <li className="pb-feature-item">
                <span className="pb-feature-bullet">•</span> Logistics Coordination
              </li>
            </ul>
          </div>

          {/* Center Signature: By Team Sweet Chili */}
          <div className="pb-team-credit-box">
            <div className="pb-credit-text">BY TEAM SWEET CHILI</div>
            <div className="pb-credit-flourish" aria-hidden="true">
              <span className="pb-flourish-line" />
              <span>✦</span>
              <span className="pb-flourish-line" />
            </div>
          </div>

          {/* Right Regional Pillar */}
          <div className="pb-feature-card">
            <div className="pb-feature-title">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
              Brahmaputra Basin
            </div>
            <ul className="pb-feature-list">
              <li className="pb-feature-item">
                <span className="pb-feature-bullet">•</span> Dynamic Rivers
              </li>
              <li className="pb-feature-item">
                <span className="pb-feature-bullet">•</span> Diverse Terrain
              </li>
              <li className="pb-feature-item">
                <span className="pb-feature-bullet">•</span> Unified Operations
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
