/** Dropdown lists from the workbook _Lists sheet. */

export const SOURCE_TYPE_LIST = [
  'Bill / Invoice',
  'Credit Card Charge',
  'Debit Card Charge',
  'Check',
  'Cash Purchase',
  'ACH / Wire',
  'Payroll',
  'Deposit / Revenue',
  'Refund',
  'Journal Entry',
] as const

export const PAYMENT_METHOD_LIST = [
  'Unpaid / AP',
  'Check',
  'Credit Card',
  'Debit Card',
  'ACH / Wire',
  'Cash',
  'Auto-Pay',
  'Deposit',
  'Billed / AR',
] as const

export const COST_TYPE_LIST = [
  'Labor',
  'Equipment',
  'Materials',
  'Subcontractor',
  'Overhead',
  'Revenue',
  'Asset',
  'Liability',
  'Equity',
  'Other Expense',
] as const

export const PO_STATUS_LIST = [
  'Matched to PO',
  'No PO Required',
  'Missing - Get Approval',
  'Pending Match',
  'Not Applicable',
] as const

export const APPROVAL_STATUS_LIST = [
  'Ready for Accountant',
  'Needs Approval',
  'Hold / Dispute',
  'Paid',
  'Entered Only',
] as const

export const OWNERSHIP_LIST = ['Owned', 'Leased', 'Rented', 'RPO'] as const

/** COA categories on the Line Item Map (cost-code / crosscode map). */
export const LINE_ITEM_CATEGORY_LIST = [
  'Site Clearing',
  'Earthwork',
  'Erosion Control',
  'Sanitary Sewer',
  'Storm Drainage',
  'Water Main',
  'Aggregate & Stone',
  'Concrete & Structures',
  'Grease Trap',
  'Sewer',
  'Payroll',
  'Other',
] as const

export const EQUIPMENT_TYPE_LIST = [
  'Excavator',
  'Dozer',
  'Loader',
  'Backhoe',
  'Skid Steer',
  'Mini Excavator',
  'Compactor',
  'Roller',
  'Dump Truck',
  'Water Truck',
  'Lowboy',
  'Pickup Truck',
  'Service Truck',
  'Trailer',
  'Generator',
  'Pump',
  'Laser / Survey',
  'Other',
] as const

export const VENDOR_TYPE_LIST = [
  'Material Supplier',
  'Equipment Rental',
  'Fuel',
  'Subcontractor',
  'Utility',
  'Insurance',
  'Professional Service',
  'Office / Overhead',
  'Government / Permit',
  'Other',
] as const

export const TERMS_LIST = [
  'Due on Receipt',
  'Net 10',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Credit Card',
  'COD',
  'Other',
] as const

export const JOB_STATUS_LIST = ['Active', 'Complete', 'On Hold', 'Overhead'] as const

export const MONTH_END_STATUS_LIST = ['Not Started', 'In Progress', 'Complete', 'N/A'] as const

export const REPORTS = [
  {
    id: 'job-costing',
    label: 'Job Costing',
    blurb: 'Pick a job. Costs by line item, plus accounting vs field-equipment memo.',
  },
  {
    id: 'job-cost-by-account',
    label: 'Job Cost by Account',
    blurb: 'Where a job’s money went in the chart of accounts.',
  },
  {
    id: 'pnl-monthly',
    label: 'P&L Monthly',
    blurb: 'Company profit and loss, one column per month. Revenue shown as positive.',
  },
  {
    id: 'pnl-by-job',
    label: 'P&L by Job',
    blurb: 'Same P&L, filtered to one job.',
  },
  {
    id: 'balance-sheet',
    label: 'Balance Sheet',
    blurb: 'Opening balances plus every posted allocation and offset, month-end.',
  },
  {
    id: 'cash-flow',
    label: 'Cash Flow',
    blurb: 'Where cash actually moved, from the offset account on each transaction.',
  },
  {
    id: 'wip-schedule',
    label: 'WIP Schedule',
    blurb: 'Cost vs billed vs contract. Over / under billed by job.',
  },
  {
    id: 'ap-aging',
    label: 'AP Aging',
    blurb: 'What you owe each vendor on 2000, split by how overdue it is.',
  },
  {
    id: 'ar-aging',
    label: 'AR Aging',
    blurb: 'What each job still owes you on 1100.',
  },
  {
    id: 'account-summary',
    label: 'Account Summary',
    blurb: 'Money out / money in / net for every account.',
  },
  {
    id: 'coa-report',
    label: 'COA Report',
    blurb: 'Every account grouped by category, with net activity.',
  },
  {
    id: 'accountant-handoff',
    label: 'Accountant Handoff',
    blurb: 'Totals for the accountant. Field equipment stays a memo.',
  },
  {
    id: 'month-end',
    label: 'Month-End Checklist',
    blurb: 'Complete before sending supporting documents to the accountant.',
  },
  {
    id: 'walkthrough',
    label: 'Walkthrough',
    blurb: 'Office workflow: setup, invoices, POs, splits, payments.',
  },
  {
    id: 'chart-of-accounts',
    label: 'Chart of Accounts',
    blurb: 'Reference list. Job-cost 5000–5290 are by activity, not by job name.',
  },
] as const

export type ReportId = (typeof REPORTS)[number]['id']
