/**
 * FAB 组件 smoke 测试
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { FAB } from './FAB';

describe('FAB', () => {
  it('renders button', () => {
    render(<FAB aria-label="add" />);
    expect(screen.getByRole('button', { name: 'add' })).toBeInTheDocument();
  });

  it('calls onClick', () => {
    const onClick = vi.fn();
    render(<FAB aria-label="add" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});