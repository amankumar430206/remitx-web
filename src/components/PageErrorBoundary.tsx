import { Component, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/molecules/ErrorState'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page failed to load"
          description={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
