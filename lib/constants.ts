export const appUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
export const apiUrl = `${appUrl}/api`;

export const BASIC_PLAN_MAX_DRIVERS = parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_MAX_DRIVERS);
export const BASIC_PLAN_AI_RATECON_IMPORTS = parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_AI_RATECON_IMPORTS);
export const BASIC_PLAN_TOTAL_LOADS = parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_TOTAL_LOADS);
export const BASIC_PLAN_MAX_STORAGE_MB = parseInt(process.env.NEXT_PUBLIC_BASIC_PLAN_MAX_STORAGE_MB);

export const PRO_PLAN_COST_PER_DRIVER = parseInt(process.env.NEXT_PUBLIC_PRO_PLAN_COST_PER_DRIVER);
export const PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER = parseInt(
    process.env.NEXT_PUBLIC_PRO_PLAN_AI_RATECON_IMPORTS_PER_DRIVER,
);
export const PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER = parseInt(process.env.NEXT_PUBLIC_PRO_PLAN_MAX_STORAGE_GB_PER_DRIVER);
