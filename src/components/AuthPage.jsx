export default function AuthPage({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-page__bg"></div>
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">{title}</h2>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </div>
        <div className="auth-content">
          {children}
        </div>
        {footer ? <p className="auth-footer">{footer}</p> : null}
      </div>
    </div>
  );
}
