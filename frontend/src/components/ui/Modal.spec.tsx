/**
 * Modal 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders children when open', () => {
    render(<Modal open onClose={() => {}}>Modal content</Modal>);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}}>Hidden</Modal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});