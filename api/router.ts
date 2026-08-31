import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./routers/authRouter";
import { talentsRouter } from "./routers/talentsRouter";
import { matchesRouter } from "./routers/matchesRouter";
import { questionnairesRouter } from "./routers/questionnairesRouter";
import { meetingsRouter } from "./routers/meetingsRouter";
import { exchangesRouter } from "./routers/exchangesRouter";
import { assessmentsRouter } from "./routers/assessmentsRouter";
import { retentionRouter } from "./routers/retentionRouter";
import { recordsRouter } from "./routers/recordsRouter";
import { adminRouter } from "./routers/adminRouter";
import { vacanciesRouter } from "./routers/vacanciesRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  talents: talentsRouter,
  matches: matchesRouter,
  questionnaires: questionnairesRouter,
  meetings: meetingsRouter,
  exchanges: exchangesRouter,
  assessments: assessmentsRouter,
  retention: retentionRouter,
  records: recordsRouter,
  admin: adminRouter,
  vacancies: vacanciesRouter,
});

export type AppRouter = typeof appRouter;
