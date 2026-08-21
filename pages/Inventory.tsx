
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Save, 
  X, 
  Edit2, 
  Trash2, 
  Package, 
  Filter, 
  ScanLine,
  MapPin,
  Tag,
  Info,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Wand2
} from 'lucide-react';
import { Button, Input, Select, Card, toast } from '../components/UIComponents';
import { InventoryItem, StockStatus } from '../types';
import { exportToExcel } from '../components/exportUtils';
import { 
  getInventoryItems, 
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem 
} from '../db';

export const Inventory: React.FC = () => {
  // --- STATE ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const initialFormState: Partial<InventoryItem> = {
    barcode: '', 
    huid: '', 
    item_name: '', 
    category: 'Ring', 
    stone_type: '',
    gross_weight: 0, 
    net_weight: 0, 
    weight: 0, 
    metal_type: 'Gold', 
    purity: '22K', 
    hsn_code: '7113', 
    location: '',
    making_charges: 0, 
    gst_rate: 3, 
    price_per_gram: 0, 
    net_price: 0, 
    stock_status: 'in_stock', 
    remarks: '',
    quantity: 1
  };
  const [formData, setFormData] = useState(initialFormState);
  
  // Refs for shortcuts
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getInventoryItems();
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({ title: 'Error', description: 'Failed to load inventory items.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + N to Open Modal
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleOpenModal();
      }
      
      // Shortcuts active only when modal is open
      if (isModalOpen) {
        // Alt + B to focus Barcode
        if (e.altKey && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          barcodeInputRef.current?.focus();
        }
        // Ctrl + S to Save
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSave();
        }
        // Escape to Close
        if (e.key === 'Escape') {
            setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, formData]);

  // Focus barcode when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  // --- HANDLERS ---
  
  const handleInputChange = (field: keyof InventoryItem, value: any) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate Net Price
    if (['weight', 'gross_weight', 'net_weight', 'price_per_gram', 'making_charges', 'gst_rate', 'quantity'].includes(field)) {
      const w = Number(newData.net_weight || newData.weight || newData.gross_weight || 0);
      const rate = Number(newData.price_per_gram || 0);
      const making = Number(newData.making_charges || 0);
      const gst = Number(newData.gst_rate || 0);
      const qty = Number(newData.quantity || 1);
      
      const base = ((w * rate) + making) * qty;
      const total = base + (base * (gst / 100));
      newData.net_price = Math.round(total);
    }

    setFormData(newData);
  };

  const handleSave = async () => {
    const weightVal = Number(formData.net_weight || formData.weight || formData.gross_weight || 0);
    if (!formData.barcode || !formData.item_name || !weightVal) {
      toast({ title: 'Validation Error', description: 'Please fill required fields (Barcode, Name, Total Weight)', variant: 'destructive' });
      return;
    }

    try {
      const parsedQty = parseInt(String(formData.quantity), 10);
      const itemToSave = {
        ...formData,
        quantity: (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1,
        weight: weightVal,
        net_weight: weightVal,
        gross_weight: weightVal
      };

      if (editingId) {
        await updateInventoryItem(editingId, itemToSave);
        toast({ title: 'Item Updated', description: `${formData.item_name} has been updated.` });
      } else {
        await createInventoryItem(itemToSave);
        toast({ title: 'Item Saved', description: `${formData.item_name} added to inventory.` });
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormState);
      fetchData();
    } catch (error: any) {
      console.error('Error saving item:', error);
      if (error.message?.includes('items_barcode_key') || error.code === '23505') {
        toast({ 
          title: 'Duplicate Barcode Database Constraint', 
          description: 'Your Supabase database table has a UNIQUE constraint on barcodes. Please run this in your Supabase SQL Editor to allow duplicate barcodes: ALTER TABLE items DROP CONSTRAINT IF EXISTS items_barcode_key;', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Error', description: error.message || 'Failed to save item.', variant: 'destructive' });
      }
    }
  };

  const handlePrint = (item: InventoryItem) => {
    const itemWeight = item.net_weight || item.weight || item.gross_weight || 0;
    // Basic item details print with branding
    const printContent = `
      <html>
        <head>
          <title>Item Detail - ${item.barcode}</title>
          <style>
            @media print {
              @page { size: A5 portrait; margin: 0; }
              body { margin: 0; padding: 20mm; font-weight: bold !important; -webkit-print-color-adjust: exact; }
              * { font-weight: bold !important; }
            }
            body { font-family: sans-serif; padding: 40px; font-weight: bold; }
            .header { text-align: center; border-bottom: 4px solid black; margin-bottom: 30px; padding-bottom: 20px; display: flex; flex-direction: column; align-items: center; }
            .logo { width: 100px; height: 100px; object-fit: contain; margin-bottom: 10px; }
            .shop-name { font-size: 32px; font-weight: 900; margin: 0; }
            .sub-header { font-size: 14px; color: #444; margin-top: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 18px; }
            .label { color: #666; text-transform: uppercase; font-size: 12px; }
            .value { text-transform: uppercase; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #888; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" class="logo" />
            <h1 class="shop-name">MAYAKKA JEWELLERS</h1>
            <p class="sub-header">Inventory Record - ${item.barcode}</p>
          </div>
          <div class="row"><span class="label">Barcode:</span> <span class="value">${item.barcode}</span></div>
          <div class="row"><span class="label">Item Name:</span> <span class="value">${item.item_name}</span></div>
          <div class="row"><span class="label">HUID:</span> <span class="value">${item.huid || '-'}</span></div>
          <div class="row"><span class="label">Category:</span> <span class="value">${item.category}</span></div>
          <div class="row"><span class="label">Metal:</span> <span class="value">${item.metal_type} (${item.purity})</span></div>
          <div class="row"><span class="label">Total Weight:</span> <span class="value">${itemWeight.toFixed(3)}g</span></div>
          <div class="row"><span class="label">Quantity:</span> <span class="value">${item.quantity || 1}</span></div>
          <div class="row"><span class="label">Location:</span> <span class="value">${item.location || '-'}</span></div>
          <div class="footer">Luxury Redefined • Est 2024</div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
  };

  const generateAutoBarcode = () => {
    const randomCode = 'MJ' + Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, barcode: randomCode }));
    toast({ title: 'Barcode Generated', description: `Assigned auto barcode: ${randomCode}` });
  };

  const handleOpenModal = () => {
    setEditingId(null);
    const autoBarcode = 'MJ' + Math.floor(100000 + Math.random() * 900000).toString();
    setFormData({ ...initialFormState, barcode: autoBarcode, quantity: 1 });
    setIsModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteInventoryItem(id);
      toast({ title: 'Item Deleted', description: 'Inventory record removed.' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: error.message || 'Failed to delete item.', variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    if (!filteredItems || filteredItems.length === 0) {
      toast({ title: 'Export Warning', description: 'No items available to export.', variant: 'destructive' });
      return;
    }
    const exportData = filteredItems.map(item => ({
      Barcode: item.barcode,
      HUID: item.huid || '',
      Item_Name: item.item_name,
      Category: item.category || '',
      Weight_g: (item.net_weight || item.weight || item.gross_weight || 0).toFixed(3),
      Quantity_pcs: item.quantity || 1,
      Price_Per_Gram: item.price_per_gram || 0,
      Net_Price: item.net_price || 0,
      Location: item.location || '',
      Metal_Type: item.metal_type || 'Gold',
      Purity: item.purity || '22K (916)'
    }));
    exportToExcel(exportData, 'Inventory_Stock_Report');
    toast({ title: 'Excel Exported', description: `${exportData.length} inventory items downloaded to Excel.` });
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const CATEGORY_LIST = [
    'Ring',
    'Bangle',
    'Chain',
    'Haar',
    'Laccha',
    'Choker',
    'Japka',
    'Mangtila',
    'Motol',
    'Necklace',
    'Tops',
    'Bracelet',
    'Kada',
    'Baali',
    'Earring',
    'Pendent',
  ];

  // --- DERIVED STATE & METRICS ---  // 1. Calculate per-category breakdown metrics across ALL items
  const categoryMetrics = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalWeight: number }> = {};
    
    // Initialize standard categories
    CATEGORY_LIST.forEach(cat => {
      map[cat] = { count: 0, totalQty: 0, totalWeight: 0 };
    });

    items.forEach(item => {
      const cat = item.category || 'Other';
      if (!map[cat]) {
        map[cat] = { count: 0, totalQty: 0, totalWeight: 0 };
      }
      const qty = Number(item.quantity) || 1;
      const wt = Number(item.net_weight || item.weight || item.gross_weight || 0);

      map[cat].count += 1;
      map[cat].totalQty += qty;
      map[cat].totalWeight += wt * qty;
    });

    return map;
  }, [items]);

  // 2. Filter items by Search Term AND Selected Category
  const filteredItems = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return items.filter(item => {
      const matchesSearch = 
        item.item_name.toLowerCase().includes(lowerTerm) || 
        item.barcode.toLowerCase().includes(lowerTerm) ||
        (item.category && item.category.toLowerCase().includes(lowerTerm)) ||
        (item.huid && item.huid.toLowerCase().includes(lowerTerm));

      const matchesCat = selectedCategory === 'ALL' || (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [items, searchTerm, selectedCategory]);

  // 3. Metrics for currently displayed / filtered view
  const currentViewStats = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    let totalWeight = 0;

    filteredItems.forEach(item => {
      const qty = Number(item.quantity) || 1;
      const wt = Number(item.net_weight || item.weight || item.gross_weight || 0);

      totalItems += 1;
      totalQty += qty;
      totalWeight += wt * qty;
    });

    return { totalItems, totalQty, totalWeight };
  }, [filteredItems]);

  // --- RENDER ---

  return (
    <div className="h-full flex flex-col bg-white text-charcoal-900 relative overflow-hidden font-sans">
      
      {/* 1. HEADER & TOOLBAR */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex flex-wrap justify-between items-center gap-4 shadow-sm z-10">
         <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-charcoal-900 text-gold-500 flex items-center justify-center shadow-md">
                 <Package size={20} />
             </div>
             <div>
                 <h2 className="text-xl font-bold text-charcoal-900 tracking-tight leading-none">Inventory Management</h2>
                 <p className="text-xs text-gray-500 font-medium mt-1">
                    Total Items: <span className="font-mono font-bold text-charcoal-700">{items.length}</span>
                 </p>
             </div>
         </div>

         <div className="flex items-center gap-3 flex-wrap">
            {/* Category Filter Select */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-charcoal-900 text-xs font-bold rounded-md px-3 py-2 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all cursor-pointer"
                >
                  <option value="ALL">All Categories ({items.length})</option>
                  {CATEGORY_LIST.map(cat => {
                    const catCount = categoryMetrics[cat]?.count || 0;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({catCount})
                      </option>
                    );
                  })}
                </select>
            </div>

            {/* Category Breakdown Button */}
            <button
               onClick={() => setIsSummaryModalOpen(true)}
               className="bg-charcoal-800 hover:bg-charcoal-900 text-white px-3 py-2 rounded-md text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all shadow-sm"
               title="View Category Breakdown"
            >
               <Tag size={14} className="text-gold-500" /> Breakdown Summary
            </button>

            {/* Export to Excel Button */}
            <button
               onClick={handleExportExcel}
               className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-md text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
               title="Export Inventory to Excel / CSV"
            >
               <FileSpreadsheet size={14} className="text-white" /> Export Excel
            </button>

            {/* Search Input */}
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500" size={16} />
                <input 
                   type="text"
                   placeholder="Search inventory..."
                   className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-charcoal-900 placeholder-gray-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 shadow-sm transition-all text-sm"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            
            <Button onClick={handleOpenModal} className="bg-gradient-to-r from-gold-500 to-gold-600 shadow-lg hover:shadow-gold-500/20 gap-2 px-5 py-2 text-xs">
                <Plus size={16} /> Add New Item
            </Button>
         </div>
      </div>

      {/* 2. SUMMARY KPI BANNER (Live Category Weight & Count Breakdown) */}
      <div className="px-8 pt-4 pb-2 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50">
        <Card className="!p-3 border-l-4 border-l-gold-500 flex items-center justify-between shadow-sm bg-white">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Category</p>
              <h3 className="text-base font-bold text-charcoal-900 mt-0.5 flex items-center gap-2">
                 {selectedCategory === 'ALL' ? 'ALL CATEGORIES' : selectedCategory.toUpperCase()}
                 {selectedCategory !== 'ALL' && (
                    <button 
                       onClick={() => setSelectedCategory('ALL')} 
                       className="text-[10px] font-normal text-red-500 hover:underline ml-1"
                    >
                       Clear
                    </button>
                 )}
              </h3>
           </div>
           <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center text-gold-600">
             <Tag size={16} />
           </div>
        </Card>

        <Card className="!p-3 border-l-4 border-l-charcoal-700 flex items-center justify-between shadow-sm bg-white">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items Count</p>
              <h3 className="text-lg font-bold text-charcoal-900 mt-0.5">
                 {currentViewStats.totalItems} <span className="text-xs text-gray-500 font-normal">items</span>
              </h3>
           </div>
           <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-charcoal-700">
             <Package size={16} />
           </div>
        </Card>

        <Card className="!p-3 border-l-4 border-l-purple-600 flex items-center justify-between shadow-sm bg-white">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Quantity</p>
              <h3 className="text-lg font-mono font-bold text-purple-700 mt-0.5">
                 {currentViewStats.totalQty} <span className="text-xs font-sans font-medium text-gray-500">pcs</span>
              </h3>
           </div>
           <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
             <Package size={16} />
           </div>
        </Card>

        <Card className="!p-3 border-l-4 border-l-green-600 flex items-center justify-between shadow-sm bg-white">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Weight</p>
              <h3 className="text-lg font-mono font-bold text-green-700 mt-0.5">
                 {currentViewStats.totalWeight.toFixed(3)} <span className="text-xs font-sans font-medium text-gray-500">g</span>
              </h3>
           </div>
           <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-600">
             <Tag size={16} />
           </div>
        </Card>
      </div>

      {/* 3. TABLE SECTION */}
      <div className="flex-1 overflow-hidden flex flex-col p-8 pt-2 bg-gray-50/50">
         <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-charcoal-700 font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
                     <tr>
                        <th className="py-4 px-6">Barcode</th>
                        <th className="py-4 px-6">HUID</th>
                        <th className="py-4 px-6">Item Name</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6 text-right">Total Weight</th>
                        <th className="py-4 px-6 text-center">Qty</th>
                        <th className="py-4 px-6 text-right">Price/g</th>
                        <th className="py-4 px-6">Location</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {loading ? (
                        <tr>
                           <td colSpan={9} className="py-20 text-center text-gray-400">
                              <RefreshCw className="animate-spin mx-auto mb-2" size={24}/>
                              <span className="text-xs font-bold uppercase tracking-widest">Loading Inventory...</span>
                           </td>
                        </tr>
                     ) : filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-gold-50/10 transition-colors group">
                           <td className="py-3 px-6 font-mono font-medium text-charcoal-800">{item.barcode}</td>
                           <td className="py-3 px-6 font-mono text-xs text-gold-600 font-bold">{item.huid || '-'}</td>
                           <td className="py-3 px-6">
                              <span className="font-bold text-charcoal-900">{item.item_name}</span>
                              {item.stock_status === 'out_of_stock' && (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500" title="Out of Stock"/>
                              )}
                           </td>
                           <td className="py-3 px-6 text-gray-500 font-medium">
                              <span className="bg-gray-100 text-charcoal-800 text-xs px-2 py-0.5 rounded font-bold uppercase border border-gray-200">
                                 {item.category || '-'}
                              </span>
                           </td>
                           <td className="py-3 px-6 text-right font-mono font-bold text-charcoal-900">
                              {(item.net_weight || item.weight || item.gross_weight || 0).toFixed(3)} g
                           </td>
                           <td className="py-3 px-6 text-center font-mono font-bold text-gold-600">{item.quantity || 1}</td>
                           <td className="py-3 px-6 text-right font-mono text-gray-500">{item.price_per_gram?.toLocaleString() || '0'}</td>
                           <td className="py-3 px-6 text-xs uppercase text-gray-400 font-bold">{item.location}</td>
                           <td className="py-3 px-6 text-center">
                              <div className="flex items-center justify-center gap-3">
                                 <button 
                                    className="p-1.5 hover:bg-gold-50 rounded text-gold-600 transition-colors"
                                    title="Print Details"
                                    onClick={() => handlePrint(item)}
                                 >
                                    <Printer size={16} />
                                 </button>
                                 <button 
                                    className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                                    title="Edit Item"
                                    onClick={() => handleEdit(item)}
                                 >
                                    <Edit2 size={16} />
                                 </button>
                                 <button 
                                    className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors"
                                    title="Delete Item"
                                    onClick={() => handleDelete(item.id)}
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                     {!loading && filteredItems.length === 0 && (
                        <tr>
                           <td colSpan={9} className="py-20 text-center text-gray-400 italic">
                              No items found matching your criteria.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
            
            {/* Table Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-3 flex justify-between items-center text-xs text-gray-500">
               <span>Showing {filteredItems.length} records</span>
               <span className="flex items-center gap-2">
                   <span className="bg-white px-2 py-1 rounded border border-gray-200 font-mono">Alt + N</span> to Add Item
               </span>
            </div>
         </div>
      </div>

      {/* 4. CATEGORY BREAKDOWN SUMMARY MODAL */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden">
              
              <div className="bg-charcoal-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500 text-charcoal-900 flex items-center justify-center font-bold">
                       <Tag size={18}/>
                    </div>
                    <h3 className="font-sans font-bold text-lg tracking-wide">Category Weight & Stock Breakdown</h3>
                 </div>
                 <button onClick={() => setIsSummaryModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                    <X size={24}/>
                 </button>
              </div>

              <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
                 <table className="w-full text-left text-sm bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <thead className="bg-gray-100 border-b border-gray-200 text-charcoal-800 font-bold uppercase text-xs tracking-wider">
                       <tr>
                          <th className="py-3 px-5">Category</th>
                          <th className="py-3 px-5 text-center">Items Count</th>
                          <th className="py-3 px-5 text-center">Total Quantity (Pcs)</th>
                          <th className="py-3 px-5 text-right">Total Weight (g)</th>
                          <th className="py-3 px-5 text-center">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {CATEGORY_LIST.map(cat => {
                          const metric = categoryMetrics[cat] || { count: 0, totalQty: 0, totalWeight: 0 };
                          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                          return (
                             <tr key={cat} className={`hover:bg-gold-50/20 transition-colors ${isSelected ? 'bg-gold-50/40 font-bold' : ''}`}>
                                <td className="py-3 px-5 font-bold text-charcoal-900">
                                   {cat}
                                </td>
                                <td className="py-3 px-5 text-center font-mono">{metric.count}</td>
                                <td className="py-3 px-5 text-center font-mono font-bold text-gold-600">{metric.totalQty}</td>
                                <td className="py-3 px-5 text-right font-mono font-bold text-green-700">{metric.totalWeight.toFixed(3)} g</td>
                                <td className="py-3 px-5 text-center">
                                   <button
                                      onClick={() => {
                                         setSelectedCategory(cat);
                                         setIsSummaryModalOpen(false);
                                      }}
                                      className="px-3 py-1 bg-charcoal-900 hover:bg-gold-600 text-white hover:text-charcoal-900 rounded text-xs font-bold uppercase transition-all"
                                   >
                                      Filter {cat}
                                   </button>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                 <span>Showing all 15 categories</span>
                 <Button onClick={() => { setSelectedCategory('ALL'); setIsSummaryModalOpen(false); }} variant="outline" size="sm">
                    Reset Filter (Show All)
                 </Button>
              </div>

           </div>
        </div>
      )}

      {/* 3. ADD ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-6xl rounded-lg shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
              
              {/* Modal Header */}
              <div className="bg-charcoal-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500 text-charcoal-900 flex items-center justify-center font-bold">
                      {editingId ? <Edit2 size={20}/> : <Plus size={20}/>}
                    </div>
                    <h3 className="font-sans font-bold text-lg tracking-wide">{editingId ? 'Edit Item' : 'Add New Item'}</h3>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="bg-charcoal-800 px-2 py-1 rounded border border-charcoal-700">Alt + B : Scan</span>
                        <span className="bg-charcoal-800 px-2 py-1 rounded border border-charcoal-700">Ctrl + S : Save</span>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                      <X size={24}/>
                    </button>
                 </div>
              </div>

              {/* Modal Body: Command Center Grid */}
              <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* GROUP 1: IDENTITY */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-gold-600 uppercase tracking-widest border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                        <ScanLine size={14}/> Identity
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-7 relative">
                                    <Input 
                                        ref={barcodeInputRef}
                                        label="Barcode / SKU" 
                                        placeholder="Scan..." 
                                        isMonospaced 
                                        value={formData.barcode}
                                        onChange={e => handleInputChange('barcode', e.target.value)}
                                        icon={<ScanLine size={14}/>}
                                    />
                                </div>
                                <div className="col-span-5 flex items-end">
                                    <button
                                        type="button"
                                        onClick={generateAutoBarcode}
                                        className="w-full bg-gold-100 hover:bg-gold-200 text-gold-800 border border-gold-300 font-bold px-2 py-2.5 rounded text-xs flex items-center justify-center gap-1 transition-all"
                                        title="Auto Generate Barcode"
                                    >
                                        <Wand2 size={13} /> Auto Gen
                                    </button>
                                </div>
                            </div>
                            <Input 
                                label="HUID Number" 
                                placeholder="e.g. H123456" 
                                isMonospaced 
                                value={formData.huid}
                                onChange={e => handleInputChange('huid', e.target.value)}
                            />
                            <Input 
                                label="Item Name" 
                                placeholder="e.g. Diamond Necklace" 
                                value={formData.item_name}
                                onChange={e => handleInputChange('item_name', e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Category" 
                                    value={formData.category}
                                    onChange={e => handleInputChange('category', e.target.value)}
                                    options={[
                                        {value: 'Ring', label: 'Ring'},
                                        {value: 'Bangle', label: 'Bangle'},
                                        {value: 'Chain', label: 'Chain'},
                                        {value: 'Haar', label: 'Haar'},
                                        {value: 'Laccha', label: 'Laccha'},
                                        {value: 'Choker', label: 'Choker'},
                                        {value: 'Japka', label: 'Japka'},
                                        {value: 'Mangtila', label: 'Mangtila'},
                                        {value: 'Motol', label: 'Motol'},
                                        {value: 'Necklace', label: 'Necklace'},
                                        {value: 'Tops', label: 'Tops'},
                                        {value: 'Bracelet', label: 'Bracelet'},
                                        {value: 'Kada', label: 'Kada'},
                                        {value: 'Baali', label: 'Baali'},
                                        {value: 'Earring', label: 'Earring'},
                                        {value: 'Pendent', label: 'Pendent'},
                                    ]}
                                />
                                <Input 
                                    label="Stone Type" 
                                    placeholder="None" 
                                    value={formData.stone_type}
                                    onChange={e => handleInputChange('stone_type', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* GROUP 2: SPECIFICATIONS */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-gold-600 uppercase tracking-widest border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                        <Tag size={14}/> Specifications
                        </h3>
                        <div className="space-y-4">
                             <div>
                                 <Input 
                                     label="Total Weight (g)" 
                                     type="number" 
                                     isMonospaced 
                                     placeholder="0.000"
                                     value={formData.net_weight || formData.weight || formData.gross_weight || ''}
                                     onChange={e => {
                                         const val = parseFloat(e.target.value) || 0;
                                         handleInputChange('net_weight', val);
                                         handleInputChange('gross_weight', val);
                                         handleInputChange('weight', val);
                                     }}
                                 />
                             </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="HSN Code" 
                                    isMonospaced 
                                    value={formData.hsn_code}
                                    onChange={e => handleInputChange('hsn_code', e.target.value)}
                                />
                                <Input 
                                    label="Location / Tray" 
                                    placeholder="e.g. Counter 1, Tray A" 
                                    value={formData.location}
                                    onChange={e => handleInputChange('location', e.target.value)}
                                    icon={<MapPin size={14}/>}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Metal Type"
                                    value={formData.metal_type}
                                    onChange={e => handleInputChange('metal_type', e.target.value)}
                                    options={[
                                    {value: 'Gold', label: 'Gold'},
                                    {value: 'Silver', label: 'Silver'},
                                    {value: 'Platinum', label: 'Platinum'},
                                    {value: 'Rose Gold', label: 'Rose Gold'},
                                    ]}
                                />
                                <Select 
                                    label="Purity"
                                    value={formData.purity}
                                    onChange={e => handleInputChange('purity', e.target.value)}
                                    options={[
                                        {value: '24K (Pure)', label: '24K (Pure)'},
                                        {value: '22K (916)', label: '22K (916)'},
                                        {value: '18K (750)', label: '18K (750)'},
                                        {value: '14K (585)', label: '14K (585)'},
                                        {value: 'Silver (925)', label: 'Silver (925)'},
                                        {value: 'Silver (70)', label: 'Silver (70)'},
                                        {value: 'Selam', label: 'Selam'},
                                    ]}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Quantity" 
                                    type="number" 
                                    isMonospaced 
                                    value={formData.quantity === undefined || formData.quantity === null ? '' : formData.quantity}
                                    onChange={e => {
                                        const val = e.target.value;
                                        handleInputChange('quantity', val === '' ? '' : (parseInt(val, 10) || ''));
                                    }}
                                />
                                <Select 
                                    label="Status"
                                    value={formData.stock_status}
                                    onChange={e => handleInputChange('stock_status', e.target.value)}
                                    options={[
                                    {value: 'in_stock', label: 'In Stock'},
                                    {value: 'out_of_stock', label: 'Out of Stock'},
                                    {value: 'sold', label: 'Sold'},
                                    ]}
                                />
                            </div>
                            <Input 
                                label="Remarks" 
                                placeholder="Optional notes" 
                                value={formData.remarks}
                                onChange={e => handleInputChange('remarks', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Financials Hidden but values preserved in state for auto-calc if needed, 
                        though user said financials not needed. I will remove the UI section. */}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-gray-300 hover:bg-white">
                      Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg hover:shadow-gold-500/20 px-8">
                      <Save size={18} className="mr-2"/> {editingId ? 'Update Item' : 'Save Item'}
                  </Button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
};
