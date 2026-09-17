/* Field conditions for the frozen day. Fixture data — a real build would read
   a forecast API. Exterior trades schedule around rain, so this is a decision
   input on Today, not decoration. */
export const CONDITIONS = {
  tempF: 58,
  summary: "Light rain until 11 am",
  icon: "weather" as const,
  rainRisk: "medium" as "low" | "medium" | "high",
  /** what it means for today's work, in the crew's words */
  impact: "Two exterior tear-offs exposed — Tino is tarping until it clears.",
};
