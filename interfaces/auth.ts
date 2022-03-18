import { NextPage } from 'next';

/**
 * Authentication configuration
 */
export interface AuthEnabledComponentConfig {
    authenticationEnabled: boolean;
}

/**
 * Next page with authentication configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageWithAuth<PropsType = any> = NextPage<PropsType> & AuthEnabledComponentConfig;

/**
 * A component with authentication configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentWithAuth<PropsType = any> = React.FC<PropsType> & AuthEnabledComponentConfig;
