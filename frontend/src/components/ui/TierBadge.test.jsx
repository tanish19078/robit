import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TierBadge from './TierBadge';

describe('TierBadge', () => {
  it.each([
    ['Green', 'below both thresholds'],
    ['Amber', 'analyst review'],
    ['Red', 'act now'],
    ['Critical', 'cash already leaving'],
  ])('shows a label and a distinct glyph for %s', (tier, meaning) => {
    const { container } = render(<TierBadge tier={tier} />);
    expect(screen.getByText(tier)).toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden='true']")).toBeInTheDocument();
    expect(container.querySelector('[title]')).toHaveAttribute('title', `${tier} — ${meaning}`);
  });

  it('shows a clear fallback for an unknown tier', () => {
    render(<TierBadge tier="Unknown" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
