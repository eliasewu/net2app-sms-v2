import { Component } from 'react';

export class ErrorBoundary extends Component<{children: any}, {error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: 40, textAlign: 'center'}}>
          <h1 style={{color: 'red'}}>App Error</h1>
          <pre style={{background: '#fee', padding: 20, borderRadius: 8, textAlign: 'left', maxWidth: 800, margin: '20px auto', overflow: 'auto'}}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
