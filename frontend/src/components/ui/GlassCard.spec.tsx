/**
 * GlassCard 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { GlassCard } from './GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Card content</GlassCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies glass-card class by default', () => {
    render(<GlassCard data-testid="gc">x</GlassCard>);
    expect(screen.getByTestId('gc')).toHaveClass('glass-card');
  });

  it('applies hover variant when prop set', () => {
    render(<GlassCard data-testid="gc" hover>x</GlassCard>);
    expect(screen.getByTestId('gc')).toHaveClass('glass-card-hover');
  });
});