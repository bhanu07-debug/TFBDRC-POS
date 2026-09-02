import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Table } from '../../types';
import { X, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface TableTransferModalProps {
  fromTable: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TableTransferModal: React.FC<TableTransferModalProps> = ({
  fromTable,
  isOpen,
  onClose
}) => {
  const { tables, transferTable } = usePOS();
  const [targetTableNumber, setTargetTableNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !fromTable) return null;

  const availableTables = tables.filter(
    t => (t.tableNumber || t.number) !== (fromTable.tableNumber || fromTable.number) &&
         (t.status || '').toUpperCase() === 'AVAILABLE'
  );

  const handleTransfer = () => {
    if (!targetTableNumber) {
      setError('Please choose a destination table');
      return;
    }

    const ok = transferTable(fromTable.number, targetTableNumber);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1400);
    } else {
      setError('Failed to transfer table. Ensure target table is available.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Transfer Active Table
              </h3>
              <p className="text-[11px] text-gray-500">
                Shift current check & session to another table
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Table Shifted!</h4>
            <p className="text-xs text-gray-600">
              Orders moved from Table {fromTable.number} to Table {targetTableNumber}.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500 block">From Current Table:</span>
                <span className="font-bold text-amber-600 text-sm">
                  Table {fromTable.number < 10 ? '0' + fromTable.number : fromTable.number} ({fromTable.section})
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block">Running Bill:</span>
                <span className="font-mono font-bold text-gray-900 text-sm">₹{fromTable.totalBill || 0}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Select Empty Target Table:
              </label>
              {availableTables.length === 0 ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  No empty tables available to transfer.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableTables.map(tbl => (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        setTargetTableNumber(tbl.number);
                        setError(null);
                      }}
                      className={`p-2 rounded-xl text-center border transition ${
                        targetTableNumber === tbl.number
                          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="block font-mono text-xs font-bold">
                        T{tbl.number < 10 ? '0' + tbl.number : tbl.number}
                      </span>
                      <span className={`text-[9px] ${targetTableNumber === tbl.number ? 'text-amber-100' : 'text-gray-400'}`}>{tbl.capacity} Seats</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleTransfer}
              disabled={!targetTableNumber || availableTables.length === 0}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition"
            >
              Confirm Shift to Table {targetTableNumber || '...'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
