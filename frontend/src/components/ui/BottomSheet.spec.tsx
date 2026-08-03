/**
 * BottomSheet 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('renders title and children when open', () => {
    render(
      <BottomSheet open onClose={() => {}} title="Sheet title">
        Sheet body
      </BottomSheet>,
    );
    expect(screen.getByText('Sheet title')).toBeInTheDocument();
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="t">
        Body
      </BottomSheet>,
    );
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });
});