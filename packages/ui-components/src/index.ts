import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
}

export declare function Button(
  props: ButtonProps
): JSX.Element;

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'text' | 'email' | 'password';
  error?: string;
  disabled?: boolean;
}

export declare function Input(
  props: InputProps
): JSX.Element;

export interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export declare function Card(
  props: CardProps
): JSX.Element;

export interface TextProps {
  children: React.ReactNode;
  variant?: 'heading' | 'subheading' | 'body' | 'caption';
  color?: 'primary' | 'secondary' | 'danger';
}

export declare function Text(
  props: TextProps
): JSX.Element;

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export declare function Icon(props: IconProps): JSX.Element;

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export declare function LoadingSpinner(
  props: LoadingSpinnerProps
): JSX.Element;
