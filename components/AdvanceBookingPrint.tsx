
import React from 'react';

interface BookingItem {
  id: string;
  name: string;
  metalType: string;
  weight: number;
  purity: string;
  rate: number;
  makingCharges: number;
  lineTotal: number;
}

interface AdvanceBookingPrintProps {
  bookingNo: string;
  bookingDate: string;
  deliveryDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: BookingItem[];
  itemDescription?: string; // Added to support string descriptions from DB
  totalAmount: number;
  advanceAmount: number;
  balanceDue: number;
  notes?: string;
  isScreenPreview?: boolean;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

export const AdvanceBookingPrint: React.FC<AdvanceBookingPrintProps> = ({
  bookingNo,
  bookingDate,
  deliveryDate,
  customerName,
  customerPhone,
  customerAddress,
  items,
  itemDescription,
  totalAmount,
  advanceAmount,
  balanceDue,
  notes,
  isScreenPreview = false
}) => {
  return (
    <div className={`${isScreenPreview ? 'block w-[148mm] mx-auto shadow-2xl p-4 my-8' : 'hidden print:block w-[148mm] h-[210mm] mx-auto p-4'} bg-white text-charcoal-900 font-sans font-bold flex flex-col border-2 border-charcoal-900 box-border`}>
      <style>{`
        @media print {
          @page { margin: 0; size: A5 portrait; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; font-weight: bold !important; }
          .no-print { display: none !important; }
          * { font-weight: bold !important; }
        }
      `}</style>

      {/* HEADER - CENTERED */}
      <div className="flex flex-col items-center mb-1 border-b-2 border-charcoal-900 pb-1 relative">
        {/* LOGO - LARGER AND CENTERED */}
        <div className="w-28 h-28 relative flex items-center justify-center -mt-6">
           <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        
        <div className="text-center w-full -mt-2">
          <h1 className="font-serif text-3xl font-bold text-charcoal-900 tracking-tighter leading-none mb-1">MAYAKKA JEWELLERS</h1>
          <div className="text-[10px] text-charcoal-800 leading-tight font-bold space-y-0.5">
             <p>#312, Jumma Masjid Road, (O.P.H Road), Bengaluru – 560051</p>
             <p className="text-xs">Ph: 99009 54791, 94491 19542</p>
             <p className="text-[10px] mt-0.5 underline decoration-1">GSTIN: 29BBGPM2303C1Z4</p>
          </div>
        </div>

        <div className="absolute top-0 right-0">
           <div className="w-10 h-10">
              <img src="/BIS_PNG.png" alt="BIS Hallmark" className="max-w-full max-h-full object-contain" />
           </div>
        </div>
      </div>

      {/* INFO BAR */}
      <div className="flex justify-between items-center bg-charcoal-900 text-white px-3 py-1 mb-2 rounded-sm">
         <h3 className="text-xs font-bold tracking-widest uppercase">Order Booking Receipt</h3>
         <div className="flex gap-4 font-mono text-[10px]">
            <p>NO: {bookingNo}</p>
            <p>DATE: {formatDate(bookingDate)}</p>
         </div>
      </div>

      {/* CUSTOMER & DELIVERY INFO */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="border-l-2 border-gold-500/20 pl-2 py-0.5">
          <h3 className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-0.5 italic">Customer Details</h3>
          <div className="text-xs">
            <p className="font-bold font-serif text-charcoal-900 tracking-tight">{customerName}</p>
            <p className="font-mono text-gray-600 text-[9px]">{customerPhone}</p>
            {customerAddress && <p className="text-gray-500 text-[8px] truncate">{customerAddress}</p>}
          </div>
        </div>
        
        <div className="bg-gold-50 p-1.5 rounded border border-gold-100 flex flex-col items-end justify-center">
            <p className="text-[7px] font-bold text-gold-600 uppercase tracking-widest mb-0.5">Expected Delivery</p>
            <p className="font-mono text-[10px] font-bold text-charcoal-900">{formatDate(deliveryDate)}</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="flex-1 mb-4">
        <h3 className="text-[9px] font-bold text-charcoal-900 uppercase tracking-[0.2em] mb-3 border-b border-charcoal-900 pb-1">Order Requirements</h3>
        {items && items.length > 0 ? (
          <table className="w-full text-left text-[9px] border-collapse border border-charcoal-900">
            <thead>
              <tr className="bg-white">
                <th className="py-1 px-1 font-bold uppercase tracking-wider text-charcoal-900 w-8 border border-charcoal-900">Sn</th>
                <th className="py-1 px-1 font-bold uppercase tracking-wider text-charcoal-900 border border-charcoal-900">Description</th>
                <th className="py-1 px-1 font-bold uppercase tracking-wider text-charcoal-900 text-right border border-charcoal-900">Wt(g)</th>
                <th className="py-1 px-1 font-bold uppercase tracking-wider text-charcoal-900 text-right border border-charcoal-900">Rate</th>
                <th className="py-1 px-1 font-bold uppercase tracking-wider text-charcoal-900 text-right border border-charcoal-900">Total</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-1 px-1 text-charcoal-900 border border-charcoal-900">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="py-1 px-1 font-sans border border-charcoal-900">
                    <span className="font-bold text-charcoal-900 block tracking-tight uppercase text-[9px]">{item.name}</span>
                  </td>
                  <td className="py-1 px-1 text-right text-charcoal-900 border border-charcoal-900">{item.weight.toFixed(3)}</td>
                  <td className="py-1 px-1 text-right text-charcoal-900 border border-charcoal-900">{item.rate.toLocaleString()}</td>
                  <td className="py-1 px-1 text-right text-charcoal-900 font-bold border border-charcoal-900">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 bg-gray-50 rounded border border-gray-100">
            <p className="text-[10px] text-charcoal-800 font-medium leading-relaxed">
              {itemDescription || 'No detailed items listed.'}
            </p>
          </div>
        )}
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="grid grid-cols-3 gap-2 mb-6 text-center">
        <div className="bg-charcoal-900 text-white p-2 rounded-sm">
          <p className="text-[7px] uppercase font-bold text-gold-500 tracking-widest mb-1">Estimated Total</p>
          <p className="text-sm font-mono font-bold">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-2 rounded-sm">
          <p className="text-[7px] uppercase font-bold text-green-600 tracking-widest mb-1">Advance Paid</p>
          <p className="text-sm font-mono font-bold text-green-700">{formatCurrency(advanceAmount)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 p-2 rounded-sm border">
          <p className="text-[7px] uppercase font-bold text-red-600 tracking-widest mb-1">Balance Due</p>
          <p className="text-sm font-mono font-bold text-red-700">{formatCurrency(balanceDue)}</p>
        </div>
      </div>

      {/* NOTES */}
      {notes && (
        <div className="mb-6 p-2 bg-gray-50 rounded border border-gray-100">
           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer Notes / Instructions</p>
           <p className="text-[9px] text-charcoal-700 italic leading-relaxed">{notes}</p>
        </div>
      )}

      {/* FOOTER */}
      <div className="border-t border-charcoal-900 pt-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
             <div className="text-[7px] text-charcoal-900 leading-tight">
                <p className="font-bold uppercase mb-0.5">Note:</p>
                <p>This is an order booking receipt. Final invoice will be generated at the time of delivery.</p>
                <p>Prices are subject to metal rate fluctuations unless price is locked.</p>
             </div>
             <div className="text-[7px] text-charcoal-900 text-right leading-tight">
                <p className="font-bold uppercase mb-0.5">Status:</p>
                <p className="font-bold text-charcoal-900 uppercase">ORDER BOOKING CONFIRMED</p>
             </div>
          </div>

          <div className="flex justify-between items-end mt-4">
              <div className="text-center w-32 border-t border-charcoal-900 pt-1">
                 <p className="text-[8px] uppercase font-bold text-charcoal-900">Customer Signature</p>
              </div>
              <div className="text-center w-40 border-t border-charcoal-900 pt-1">
                 <p className="text-[9px] uppercase font-bold text-charcoal-900">For MAYAKKA JEWELLERS</p>
              </div>
          </div>
      </div>
      
      <div className="mt-4 text-center text-[8px] text-gray-300 uppercase tracking-[0.5em] font-light italic">
         Luxury Redefined • Est 2024
      </div>
    </div>
  );
};
