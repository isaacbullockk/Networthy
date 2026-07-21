import { relations } from "drizzle-orm";
import { users, sessions, talents, matches, questionnaires, meetings, exchanges } from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  talent: one(talents, { fields: [users.talentId], references: [talents.id] }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const talentsRelations = relations(talents, ({ many }) => ({
  matches: many(matches),
  questionnaires: many(questionnaires),
  meetings: many(meetings),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  talent: one(talents, { fields: [matches.talentId], references: [talents.id] }),
  recruiter: one(users, { fields: [matches.recruiterId], references: [users.id] }),
}));

export const questionnairesRelations = relations(questionnaires, ({ one }) => ({
  talent: one(talents, { fields: [questionnaires.talentId], references: [talents.id] }),
  recruiter: one(users, { fields: [questionnaires.recruiterId], references: [users.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  talent: one(talents, { fields: [meetings.talentId], references: [talents.id] }),
  recruiter: one(users, { fields: [meetings.recruiterId], references: [users.id] }),
}));

export const exchangesRelations = relations(exchanges, ({ one }) => ({
  match: one(matches, { fields: [exchanges.matchId], references: [matches.id] }),
  talent: one(talents, { fields: [exchanges.talentId], references: [talents.id] }),
  recruiter: one(users, { fields: [exchanges.recruiterId], references: [users.id] }),
}));
