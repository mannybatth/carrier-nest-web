import { NextPage } from 'next';
import { ReactNode } from 'react';

/**
 * Authentication configuration
 */
export interface AuthEnabledComponentConfig {
    authenticationEnabled: boolean;
}

export interface SkeletonConfig {
    skeletonLoader?: ReactNode;
}

/**
 * Next page with authentication configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageWithAuth<P = any, IP = P> = NextPage<P, IP> & AuthEnabledComponentConfig & SkeletonConfig;

/**
 * A component with authentication configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentWithAuth<P = any> = React.FC<P> & AuthEnabledComponentConfig;
