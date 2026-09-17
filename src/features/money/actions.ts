/* The two writes that happen straight from a list row.
 *
 * Both go through commit() and neither reports success before it resolves.
 * "Send reminder" is one tap because it is reversible for five seconds; the
 * recipient and channel are printed on the row that fires it, so nothing
 * reaches a customer unseen. */
import { useDB, useEntities } from "../../data/store";
import { useToast } from "../../ui/primitives";
import { NOW } from "../../data/clock";
import { money, phone } from "../../lib/format";
import { haptic } from "../../lib/haptics";
import type { Invoice } from "../../data/types";
import { outstandingOf, recordPayment } from "./model";

export function useInvoiceActions() {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();

  /** How the reminder actually goes out, in the customer's own preference. */
  const channelFor = (invoice: Invoice) => {
    const job = e.job(invoice.jobId);
    const customer = e.customer(job.customerId);
    const pref = customer.preferredContact;
    return {
      customer,
      verb: pref === "email" ? "Emailed" : pref === "call" ? "Called" : "Texted",
      noun: pref === "email" ? "email" : pref === "call" ? "a call" : "text",
      to: pref === "email" ? (customer.email ?? phone(customer.phone)) : phone(customer.phone),
    };
  };

  const remind = async (invoice: Invoice) => {
    const { customer, verb, to } = channelFor(invoice);
    const id = `act-${db.activity.length + 1}`;
    haptic("medium");
    const ok = await commit((d) => {
      d.activity.push({
        id,
        jobId: invoice.jobId,
        at: NOW.toISOString(),
        actorId: d.me,
        kind: "payment",
        text: `Payment reminder sent to ${customer.name} for ${invoice.number}`,
        meta: `${money(outstandingOf(invoice))} · ${to}`,
      });
      return d;
    });
    if (!ok) {
      toast({ text: `Couldn't send the reminder to ${customer.name}. Retry.`, tone: "danger" });
      return false;
    }
    toast({
      text: `${verb} ${customer.name} about ${invoice.number}`,
      tone: "success",
      undo: () => {
        void commit((d) => {
          d.activity = d.activity.filter((a) => a.id !== id);
          return d;
        });
        toast({ text: "Reminder pulled back" });
      },
    });
    return true;
  };

  /** Record money already in hand. The confirm that precedes it names the
   *  amount and the customer — this only runs once that is agreed. */
  const markPaid = async (invoice: Invoice) => {
    const job = e.job(invoice.jobId);
    const customer = e.customer(job.customerId);
    const balance = outstandingOf(invoice);
    haptic("medium");
    const ok = await commit((d) => {
      recordPayment(d, {
        invoiceId: invoice.id,
        amountCents: balance,
        method: "check",
        reference: "Marked paid in the field — check in hand",
        feeCents: 0,
        state: "settled",
      });
      d.activity.push({
        id: `act-${d.activity.length + 1}`,
        jobId: invoice.jobId,
        at: NOW.toISOString(),
        actorId: d.me,
        kind: "payment",
        text: `${invoice.number} marked paid by check`,
        meta: money(balance),
      });
      return d;
    });
    if (!ok) {
      toast({ text: `Couldn't mark ${invoice.number} paid. Retry.`, tone: "danger" });
      return false;
    }
    haptic("success");
    toast({ text: `${money(balance)} recorded from ${customer.name}`, tone: "success" });
    return true;
  };

  return { remind, markPaid, channelFor };
}
