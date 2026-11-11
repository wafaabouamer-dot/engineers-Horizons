import { Component, type ReactNode } from 'react';

/** On the published site, a page error shows a short message instead of a blank page. Keep it in src/main.tsx. */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Still reported as an uncaught error, so anything watching the page hears it.
    if (typeof reportError === 'function') reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const es = document.documentElement.lang.toLowerCase().startsWith('es');
    return (
      <main
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeContent: 'center',
          gap: '1.25rem',
          padding: '1.5rem',
          textAlign: 'center',
          font: '16px/1.5 system-ui, sans-serif',
        }}
      >
        <p style={{ margin: 0 }}>{es ? 'Esta página no se pudo mostrar.' : 'This page could not be shown.'}</p>
        <p style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid currentColor',
              borderRadius: 9999,
              padding: '0.625rem 1.25rem',
              background: 'transparent',
              color: 'inherit',
              font: '600 14px/1.25 system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            {es ? 'Volver a cargar' : 'Reload'}
          </button>
          <a href="/" style={{ color: 'inherit', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {es ? 'Ir al inicio' : 'Go to the home page'}
          </a>
        </p>
      </main>
    );
  }
}
