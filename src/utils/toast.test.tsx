import { showToast } from './toast';
import toast from 'react-hot-toast';
import { vi } from 'vitest';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        custom: vi.fn(),
        dismiss: vi.fn(),
    },
}));

describe('toast utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls toast.custom for success', () => {
        showToast.success('Success message');
        expect(toast.custom).toHaveBeenCalled();
    });

    it('calls toast.custom for error', () => {
        showToast.error('Error message');
        expect(toast.custom).toHaveBeenCalled();
    });

    it('calls toast.custom for loading', () => {
        showToast.loading('Loading message');
        expect(toast.custom).toHaveBeenCalled();
    });

    it('calls toast.custom for custom', () => {
        showToast.custom('Custom message');
        expect(toast.custom).toHaveBeenCalled();
    });

    it('calls toast.dismiss', () => {
        showToast.dismiss('test-id');
        expect(toast.dismiss).toHaveBeenCalledWith('test-id');
    });

    it('calls toast.dismiss without id', () => {
        showToast.dismiss();
        expect(toast.dismiss).toHaveBeenCalledWith(undefined);
    });

    it('passes options to toast.custom for success', () => {
        const options = { duration: 5000 };
        showToast.success('Success message', options);
        expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), options);
    });

    it('passes options to toast.custom for error', () => {
        const options = { duration: 3000 };
        showToast.error('Error message', options);
        expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), options);
    });

    it('passes options to toast.custom for loading', () => {
        const options = { id: 'loading-toast' };
        showToast.loading('Loading message', options);
        expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), options);
    });

    it('passes options to toast.custom for custom', () => {
        const options = { duration: 2000 };
        showToast.custom('Custom message', options);
        expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), options);
    });

    it('returns value from toast.custom', () => {
        const mockReturn = 'toast-id';
        vi.mocked(toast.custom).mockReturnValue(mockReturn);
        const result = showToast.success('Test');
        expect(result).toBe(mockReturn);
    });

    it('handles React node as custom message', () => {
        const reactNode = <div>Custom React Node</div>;
        showToast.custom(reactNode);
        expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), undefined);
    });

    it('handles undefined options', () => {
        showToast.success('Test', undefined);
        expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), undefined);
    });
});
