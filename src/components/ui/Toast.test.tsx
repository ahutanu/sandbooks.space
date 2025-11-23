import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';
import { toast as hotToast } from 'react-hot-toast';
import { vi } from 'vitest';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    toast: {
        dismiss: vi.fn(),
    },
}));

describe('Toast Component', () => {
    const mockToast = {
        id: 'test-id',
        visible: true,
        type: 'blank',
        message: 'Test Message',
        pauseDuration: 0,
        ariaProps: {
            role: 'status',
            'aria-live': 'polite',
        },
        createdAt: Date.now(),
    } as unknown as import('react-hot-toast').Toast;

    it('renders message correctly', () => {
        render(<Toast t={mockToast} message="Hello World" />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders success icon', () => {
        const { container } = render(<Toast t={mockToast} type="success" message="Success" />);
        // Check for check icon (from react-icons/vsc)
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders error icon', () => {
        const { container } = render(<Toast t={mockToast} type="error" message="Error" />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders loading icon', () => {
        const { container } = render(<Toast t={mockToast} type="loading" message="Loading" />);
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('calls dismiss when close button is clicked', () => {
        render(<Toast t={mockToast} message="Dismiss me" />);
        const button = screen.getByRole('button', { name: /dismiss/i });
        fireEvent.click(button);
        expect(hotToast.dismiss).toHaveBeenCalledWith('test-id');
    });

    it('applies visible class when visible is true', () => {
        const { container } = render(<Toast t={{ ...mockToast, visible: true }} message="Visible" />);
        expect(container.firstChild).toHaveClass('translate-y-0');
        expect(container.firstChild).toHaveClass('opacity-100');
    });

    it('applies hidden class when visible is false', () => {
        const { container } = render(<Toast t={{ ...mockToast, visible: false }} message="Hidden" />);
        expect(container.firstChild).toHaveClass('translate-y-2');
        expect(container.firstChild).toHaveClass('opacity-0');
    });

    it('renders string messages in a p tag', () => {
        const { container } = render(<Toast t={mockToast} message="String message" />);
        const pTag = container.querySelector('p');
        expect(pTag).toBeInTheDocument();
        expect(pTag).toHaveTextContent('String message');
    });

    it('renders React nodes in a div tag to avoid invalid nesting', () => {
        const reactNode = (
            <div className="flex items-center gap-3">
                <span>React node content</span>
            </div>
        );
        const { container } = render(<Toast t={mockToast} message={reactNode} />);
        // Should not have a p tag wrapping the div
        const pTag = container.querySelector('p');
        expect(pTag).not.toBeInTheDocument();
        // Should have a div wrapper instead
        const messageDiv = container.querySelector('.ml-3.flex-1 > div');
        expect(messageDiv).toBeInTheDocument();
        expect(messageDiv).toHaveTextContent('React node content');
    });
});
