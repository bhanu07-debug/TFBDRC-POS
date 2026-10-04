import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, ExpensePaymentMethod } from '../../types';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  Receipt,
  FileText,
  AlertCircle,
  Tag,
  ArrowDownRight,
  User,
  UserCheck
} from 'lucide-react';

export type ExpenseDateFilter = 'today' | 'week' | 'month' | 'custom';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, editExpense, deleteExpense, settings } = usePOS();

  const currency = settings.currencySymbol || 'Rs.';

  // Filter state
  const [dateFilter, setDateFilter] = useState<ExpenseDateFilter>('today');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Custom date range: default to today's date
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Kitchen/Food Purchase');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpensePaymentMethod>('Cash');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formPaidBy, setFormPaidBy] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(todayStr);
  const [formReceiptRef, setFormReceiptRef] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form
  const resetForm = () => {
    setFormTitle('');
    setFormCategory('Kitchen/Food Purchase');
    setFormAmount('');
    setFormPaymentMethod('Cash');
    setFormPaidTo('');
    setFormPaidBy('');
    setFormNotes('');
    setFormDate(todayStr);
    setFormReceiptRef('');
    setFormError(null);
    setEditingExpense(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category as ExpenseCategory);
    setFormAmount(String(exp.amount));
    setFormPaymentMethod(exp.paymentMethod || 'Cash');
    setFormPaidTo(exp.paidTo || '');
    setFormPaidBy(exp.paidBy || '');
    setFormNotes(exp.notes || '');
    setFormDate(exp.date || todayStr);
    setFormReceiptRef(exp.receiptRef || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = formTitle.trim();
    if (!titleTrimmed) {
      setFormError('Please enter an expense title.');
      return;
    }

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!formDate) {
      setFormError('Please select a valid expense date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await editExpense(editingExpense.id, {
          title: titleTrimmed,
          category: formCategory,
          amount: parsedAmount,
          paymentMethod: formPaymentMethod,
          paidTo: formPaidTo.trim(),
          paidBy: formPaidBy.trim(),
          notes: formNotes.trim(),
          date: formDate,
          receiptRef: formReceiptRef.trim()
        });
        setActionNotice(`Expense "${titleTrimmed}" updated successfully.`);
      } else {
        await addExpense({
          title: titleTrimmed,
          category: formCategory,
          amount: parsedAmount,
          paymentMethod: formPaymentMethod,
          paidTo: formPaidTo.trim(),
          paidBy: formPaidBy.trim(),
          notes: formNotes.trim(),
          date: formDate,
          receiptRef: formReceiptRef.trim()
        });
        setActionNotice(`Expense of ${currency} ${parsedAmount.toFixed(2)} recorded successfully.`);
      }
      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setFormError(err?.message || 'Failed to save expense. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    setIsSubmitting(true);
    try {
      await deleteExpense(deletingExpense.id);
      setActionNotice(`Expense "${deletingExpense.title}" deleted.`);
      setDeletingExpense(null);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setActionNotice('Failed to delete expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered expenses based on Date, Category, and Search
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Date Filter
      const expDate = exp.date;
      if (expDate) {
        if (dateFilter === 'today') {
          if (expDate !== todayStr) return false;
        } else if (dateFilter === 'week') {
          const now = new Date();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          const d = new Date(expDate);
          if (d < oneWeekAgo || d > now) return false;
        } else if (dateFilter === 'month') {
          const now = new Date();
          const oneMonthAgo = new Date();
          oneMonthAgo.setDate(now.getDate() - 30);
          const d = new Date(expDate);
          if (d < oneMonthAgo || d > now) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate && expDate < customStartDate) return false;
          if (customEndDate && expDate > customEndDate) return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (exp.title || '').toLowerCase().includes(q);
        const paidToMatch = (exp.paidTo || '').toLowerCase().includes(q);
        const paidByMatch = (exp.paidBy || '').toLowerCase().includes(q);
        const notesMatch = (exp.notes || '').toLowerCase().includes(q);
        const refMatch = (exp.receiptRef || '').toLowerCase().includes(q);
        const catMatch = (exp.category || '').toLowerCase().includes(q);
        if (!titleMatch && !paidToMatch && !paidByMatch && !notesMatch && !refMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, dateFilter, todayStr, customStartDate, customEndDate, categoryFilter, searchQuery]);

  // Aggregate Metrics for filtered expenses
  const metrics = useMemo(() => {
    let total = 0;
    let cash = 0;
    let digital = 0;

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      total += amt;
      const method = (exp.paymentMethod || 'cash').toLowerCase();
      if (method === 'cash') {
        cash += amt;
      } else {
        digital += amt;
      }
    });

    return {
      total,
      cash,
      digital,
      count: filteredExpenses.length
    };
  }, [filteredExpenses]);

  // Badge color helper for categories
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Kitchen/Food Purchase':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Beverage Purchase':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'General Purchase':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Maintenance':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Electricity':
      case 'Water':
      case 'Internet/Telephone':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Staff Expense':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Transportation':
      case 'Packaging':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'Cleaning':
        return 'bg-lime-500/10 text-lime-400 border-lime-500/30';
      case 'IT/Office':
      case 'Marketing':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getPaymentMethodIcon = (method: ExpensePaymentMethod) => {
    switch (method) {
      case 'Cash':
        return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Bank':
        return <Building2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'Card':
        return <CreditCard className="w-3.5 h-3.5 text-purple-400" />;
      case 'QR':
        return <QrCode className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div id="expenses-view" className="space-y-6 text-slate-100">
      {/* Top Notification */}
      {actionNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#111827] via-[#161F30] to-[#111827] border border-slate-800 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Expense Management
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Record kitchen purchases, utilities, maintenance, and operational expenses in Firestore.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-record-expense"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-rose-400 font-mono">
              {currency} {metrics.total.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              For selected {dateFilter === 'custom' ? 'date range' : dateFilter}
            </div>
          </div>
        </div>

        {/* Cash Expenses */}
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cash Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white font-mono">
              {currency} {metrics.cash.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Paid in physical cash
            </div>
          </div>
        </div>

        {/* Digital / Bank Expenses */}
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Digital / Bank</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white font-mono">
              {currency} {metrics.digital.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Bank, Card &amp; QR payments
            </div>
          </div>
        </div>

        {/* Total Recorded Count */}
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Recorded Entries</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-400 font-mono">
              {metrics.count}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Real Firestore records
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#111827] p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Date range filter tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                dateFilter === 'today'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                dateFilter === 'week'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                dateFilter === 'month'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                dateFilter === 'custom'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Search bar and Category filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search expense, vendor, note..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-amber-500/50"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-800 flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-hidden focus:border-amber-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-hidden focus:border-amber-500/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Expenses History Table */}
      <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Expense History
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {filteredExpenses.length} records
            </span>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 border border-slate-700/50 flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-300">
              No Recorded Expenses
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No expenses match the current filter. Record any outgoing purchases or operational costs using the button above.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Paid To</th>
                  <th className="py-3 px-4">Paid By (Staff)</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {exp.date || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">
                        {exp.title}
                      </div>
                      {exp.receiptRef && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Ref: {exp.receiptRef}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                      {currency} {(Number(exp.amount) || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 font-semibold text-[11px]">
                        {getPaymentMethodIcon(exp.paymentMethod || 'Cash')}
                        <span>{exp.paymentMethod || 'Cash'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-[160px] truncate">
                      {exp.paidTo || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {exp.paidBy ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-200 text-[11px] font-medium">
                          <UserCheck className="w-3 h-3 text-amber-400" />
                          <span>{exp.paidBy}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                      {exp.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Expense Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Fresh Milk & Cheese Delivery, Generator Diesel"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Category & Amount in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Amount ({currency}) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Cash', 'Bank', 'Card', 'QR'] as ExpensePaymentMethod[]).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormPaymentMethod(method)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                        formPaymentMethod === method
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {getPaymentMethodIcon(method)}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid To / Vendor */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Paid To / Vendor
                </label>
                <input
                  type="text"
                  value={formPaidTo}
                  onChange={e => setFormPaidTo(e.target.value)}
                  placeholder="e.g. Local Dairy Supplier, Electric Authority, Vegetable Market"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Paid By (Staff Member) - Directly below Paid To / Vendor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Paid By (Staff Member)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Keep record of expenses used by staff</span>
                </div>
                <input
                  type="text"
                  value={formPaidBy}
                  onChange={e => setFormPaidBy(e.target.value)}
                  placeholder="e.g. Dilip Chaudhary, Ram Shrestha, Kitchen Chef, Sita Gurung"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
                {/* Staff Quick Selection Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-500">Quick select:</span>
                  {['Dilip Chaudhary', 'Ram Shrestha', 'Nischal Thapa', 'Sita Gurung', 'Kitchen Staff'].map(staffName => (
                    <button
                      key={staffName}
                      type="button"
                      onClick={() => setFormPaidBy(staffName)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer ${
                        formPaidBy === staffName
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {staffName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Receipt Reference in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Receipt / Reference # (Optional)
                  </label>
                  <input
                    type="text"
                    value={formReceiptRef}
                    onChange={e => setFormReceiptRef(e.target.value)}
                    placeholder="e.g. Bill #8821, Cheque #09123"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description / Note
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Additional context or petty cash breakdown..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Delete Expense Record?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete <span className="text-white font-bold">"{deletingExpense.title}"</span> ({currency} {deletingExpense.amount.toFixed(2)})? This action will remove the record from Firestore and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-500/20"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
