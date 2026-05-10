import './HomeSections.css';

export default function VideoShowcase() {
  return (
    <section className="home-section video-showcase-section" style={{ paddingTop: 0 }}>
      <div className="features-row">
        <div className="feature-item">
          <div className="feature-icon-wrapper">
             <span className="feature-icon">⚡</span>
          </div>
          <h3 className="feature-title">Real Skills</h3>
          <p className="feature-desc">Evaluate actual ability,<br/>not keywords</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon-wrapper">
             <span className="feature-icon">🔍</span>
          </div>
          <h3 className="feature-title">Deep Analysis</h3>
          <p className="feature-desc">GitHub, code, behavior<br/>& more</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon-wrapper">
             <span className="feature-icon">🎯</span>
          </div>
          <h3 className="feature-title">Better Hires</h3>
          <p className="feature-desc">Hire top talent with<br/>confidence</p>
        </div>
      </div>
    </section>
  );
}
