/**
 * Tag 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { Tag } from './Tag';

describe('Tag', () => {
  it('renders children', () => {
    render(<Tag>Active</Tag>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Tag variant="success">S</Tag>);
    expect(screen.getByText('S')).toHaveClass('tag-success');
    rerender(<Tag variant="warning">W</Tag>);
    expect(screen.getByText('W')).toHaveClass('tag-warning');
  });
});