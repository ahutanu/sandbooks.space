import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';
import { useNotesStore } from '../../../store/notesStore';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    // Reset store state
    useNotesStore.setState({
      isOnline: true,
      offlineQueue: [],
    });
  });

  it('should not render when online', () => {
    useNotesStore.setState({ isOnline: true });
    
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when offline', () => {
    useNotesStore.setState({ isOnline: false, offlineQueue: [] });
    
    render(<OfflineIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show queue count when offline with queued items', () => {
    useNotesStore.setState({
      isOnline: false,
      offlineQueue: [
        { noteId: '1', blockId: '1', code: 'print("test")', language: 'python', timestamp: Date.now() },
        { noteId: '2', blockId: '2', code: 'console.log("test")', language: 'javascript', timestamp: Date.now() },
      ],
    });
    
    render(<OfflineIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('2 queued')).toBeInTheDocument();
  });

  it('should not show queue count when queue is empty', () => {
    useNotesStore.setState({ isOnline: false, offlineQueue: [] });
    
    render(<OfflineIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.queryByText(/queued/)).not.toBeInTheDocument();
  });
});

