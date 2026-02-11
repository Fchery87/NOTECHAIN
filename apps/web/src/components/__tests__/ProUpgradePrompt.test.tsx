import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProUpgradePrompt, ProUpgradePromptProps } from '../ProUpgradePrompt';

describe('Pro Upgrade Prompt', () => {
  const defaultProps: ProUpgradePromptProps = {
    feature: 'pdf_signing',
    config: {
      name: 'PDF Signing',
      description: 'Digitally sign PDF documents',
      requiredTier: 'pro' as const,
    },
    onUpgrade: jest.fn(),
    onDismiss: jest.fn(),
  };

  it('should render compact prompt', () => {
    render(<ProUpgradePrompt {...defaultProps} compact />);

    expect(screen.getByText('Pro Feature')).toBeInTheDocument();
    expect(screen.getByText(/PDF Signing/)).toBeInTheDocument();
  });

  it('should render full prompt', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    expect(screen.getByText('Unlock PDF Signing')).toBeInTheDocument();
    expect(screen.getByText('This feature requires Pro subscription')).toBeInTheDocument();
    expect(screen.getByText('$4.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('should render Premium add-on prompt', () => {
    render(
      <ProUpgradePrompt
        {...defaultProps}
        feature="templates"
        config={{
          name: 'Note Templates',
          description: 'Use pre-made note templates',
          requiredTier: 'premium' as const,
          premiumAddOn: true,
        }}
      />
    );

    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(screen.getByText('Premium add-on feature')).toBeInTheDocument();
  });

  it('should call onUpgrade when upgrade button clicked', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    const upgradeButton = screen.getByText(/Upgrade to Pro/);
    fireEvent.click(upgradeButton);

    expect(defaultProps.onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when maybe later clicked', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    const dismissButton = screen.getByText('Maybe later');
    fireEvent.click(dismissButton);

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should display pricing for Pro', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    expect(screen.getByText('$4.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('Save $50%')).toBeInTheDocument();
  });

  it('should display pricing for Premium', () => {
    render(
      <ProUpgradePrompt
        {...defaultProps}
        feature="templates"
        config={{
          name: 'Note Templates',
          description: 'Use pre-made note templates',
          requiredTier: 'premium' as const,
          premiumAddOn: true,
        }}
      />
    );

    expect(screen.getByText('$14.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('Save $35%')).toBeInTheDocument();
  });

  it('should display Pro features list', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    expect(screen.getByText('Unlimited folders & tags')).toBeInTheDocument();
    expect(screen.getByText('PDF signing & annotations')).toBeInTheDocument();
    expect(screen.getByText('Advanced full-text search')).toBeInTheDocument();
  });

  it('should display Premium features list', () => {
    render(
      <ProUpgradePrompt
        {...defaultProps}
        feature="templates"
        config={{
          name: 'Note Templates',
          description: 'Use pre-made note templates',
          requiredTier: 'premium' as const,
          premiumAddOn: true,
        }}
      />
    );

    expect(screen.getByText('All Pro features')).toBeInTheDocument();
    expect(screen.getByText('Weekly analytics reports')).toBeInTheDocument();
    expect(screen.getByText('Note templates & custom themes')).toBeInTheDocument();
  });

  it('should display trust badges', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    expect(screen.getByText('Encrypted')).toBeInTheDocument();
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
    expect(screen.getByText('Audited')).toBeInTheDocument();
  });

  it('should display annual billing option', () => {
    render(<ProUpgradePrompt {...defaultProps} />);

    expect(screen.getByText('Annual billing')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('Save 17% with annual billing')).toBeInTheDocument();
  });
});
