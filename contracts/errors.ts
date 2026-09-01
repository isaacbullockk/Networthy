type AppError = { tag: "app_error"; status: number; message: string };

function appError(status: number, message: string): AppError {
  return { tag: "app_error", status, message };
}

export const Errors = {
  badRequest: (msg: string) => appError(400, msg),
  unauthorized: (msg: string) => appError(401, msg),
  forbidden: (msg: string) => appError(403, msg),
  notFound: (msg: string) => appError(404, msg),
  internal: (msg: string) => appError(500, msg),
} as const;

export type { AppError };

/**
 * Error message the recruiterQuery guard throws when the recruiter hasn't
 * verified their email. Shared contract: the frontend keys the verification
 * gate banner on this exact constant — never on a re-typed string.
 */
export const EMAIL_VERIFICATION_REQUIRED = "Confirm your email address first";
