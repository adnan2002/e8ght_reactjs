export default function AuthPage({ title, children, footer }) {
  return (
    <div className="auth-container">
      <h2 className="auth-title">{title}</h2>
      {children}
      {footer ? <p className="auth-footer">{footer}</p> : null}
    </div>
  );
}



